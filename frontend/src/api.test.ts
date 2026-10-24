import { afterEach, describe, it, expect, vi } from "vitest";
import { api, post, refreshCsrf, ApiError } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("Güvenli API istemcisi", () => {
  it("değiştiren isteklerde CSRF başlığını ve tekrar anahtarını iletir", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "test-token", headerName: "X-CSRF-TOKEN" }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 4 })));
    vi.stubGlobal("fetch", mock);
    await refreshCsrf();
    await post("/transfers", { amount: "100.00" }, "retry-key");
    const [path, options] = mock.mock.calls[1];
    expect(path).toBe("/api/transfers");
    expect(options.credentials).toBe("same-origin");
    expect(options.headers.get("X-CSRF-TOKEN")).toBe("test-token");
    expect(options.headers.get("Idempotency-Key")).toBe("retry-key");
    expect(JSON.parse(options.body).amount).toBe("100.00");
  });
  it("sunucunun alan hatalarını ve durumunu korur", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "INVALID_AMOUNT",
            message: "Tutar geçersiz",
            fieldErrors: { amount: "Geçersiz" },
          }),
          { status: 422 },
        ),
      ),
    );
    await expect(api("/accounts")).rejects.toMatchObject({
      status: 422,
      code: "INVALID_AMOUNT",
      fieldErrors: { amount: "Geçersiz" },
    });
  });
  it("oturum hatasında uygulamayı giriş ekranına yönlendirir", async () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );
    await expect(api("/accounts")).rejects.toBeInstanceOf(ApiError);
    expect(dispatch.mock.calls[0][0].type).toBe("session-expired");
  });
  it("mutation 403 ve me 401 durumunda oturumu kapatır, CSRF'yi temizler ve mutasyonu tekrarlamaz", async () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "old-token", headerName: "X-CSRF-TOKEN" }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: "FORBIDDEN", message: "CSRF başarısız" }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "fresh-token", headerName: "X-CSRF-TOKEN" }),
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", mock);
    await refreshCsrf();
    await expect(post("/auth/logout", {})).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Oturumunuz sona erdi. Lütfen yeniden giriş yapın.",
    });
    expect(mock.mock.calls.map(([path]) => path)).toEqual([
      "/api/auth/csrf",
      "/api/auth/logout",
      "/api/auth/me",
    ]);
    expect(mock.mock.calls[2][1]).toEqual({ credentials: "same-origin" });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].type).toBe("session-expired");
    await post("/auth/logout", {});
    expect(mock.mock.calls[3][0]).toBe("/api/auth/csrf");
    expect(mock.mock.calls[4][1].headers.get("X-CSRF-TOKEN")).toBe(
      "fresh-token",
    );
    expect(mock).toHaveBeenCalledTimes(5);
  });
  it("mutation 403 ve geçerli me 200 durumunda asıl yetki hatasını ve CSRF'yi korur", async () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ token: "valid-token", headerName: "X-CSRF-TOKEN" }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "FORBIDDEN",
            message: "Kendi talebinizi onaylayamazsınız",
            fieldErrors: { id: "Talep sahibi" },
          }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 4 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 5 })));
    vi.stubGlobal("fetch", mock);
    await refreshCsrf();
    await expect(
      post("/operations/transfers/4/approve", {}),
    ).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Kendi talebinizi onaylayamazsınız",
      fieldErrors: { id: "Talep sahibi" },
    });
    expect(mock.mock.calls.map(([path]) => path)).toEqual([
      "/api/auth/csrf",
      "/api/operations/transfers/4/approve",
      "/api/auth/me",
    ]);
    expect(dispatch).not.toHaveBeenCalled();
    await expect(post("/transfers", {})).resolves.toEqual({ id: 5 });
    expect(mock.mock.calls[3][0]).toBe("/api/transfers");
    expect(mock.mock.calls[3][1].headers.get("X-CSRF-TOKEN")).toBe(
      "valid-token",
    );
    expect(mock).toHaveBeenCalledTimes(4);
  });
});
