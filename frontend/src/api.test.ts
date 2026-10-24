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
      vi
        .fn()
        .mockResolvedValue(
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
});
