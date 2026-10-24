let csrf: { token: string; headerName: string } | undefined;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function refreshCsrf() {
  const response = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
  });
  if (!response.ok)
    throw new Error("Güvenli bağlantı kurulamadı. Lütfen yeniden deneyin.");
  csrf = await response.json();
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method || "GET";
  if (method !== "GET" && !csrf) await refreshCsrf();
  const headers = new Headers(options.headers);
  if (method !== "GET" && csrf) headers.set(csrf.headerName, csrf.token);
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new Error(
      "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip yeniden deneyin.",
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me"
    )
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      response.status,
      error.code || "REQUEST_FAILED",
      error.message ||
        {
          401: "Oturumunuz sona erdi. Lütfen yeniden giriş yapın.",
          403: "Bu işlem için yetkiniz bulunmuyor.",
          409: "İşlem güncel durumla çakışıyor. Sayfayı yenileyin.",
          422: "İşlem bilgilerini kontrol edin.",
        }[response.status] ||
        "İşlem tamamlanamadı.",
      error.fieldErrors,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export function post<T>(path: string, body: unknown, key?: string) {
  return api<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: JSON.stringify(body),
  });
}
