// يُقرأ وقت البناء عبر NEXT_PUBLIC_API_BASE_URL؛ القيمة الافتراضية للتطوير المحلي فقط.
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
const apiOrigin = apiBaseUrl.replace(/\/api$/, "");

const TOKEN_STORAGE_KEY = "ams_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // بيئات بدون localStorage (مثل المعاينة الخاصة) تبقى تعمل بدون حفظ الجلسة.
  }
}

export function clearStoredToken() {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // نفس الملاحظة أعلاه.
  }
}

export function resolveApiFileUrl(fileUrl: string) {
  // المرفقات المرفوعة تُخزن كمسار نسبي يُخدم من الـ backend مباشرة.
  return fileUrl.startsWith("/uploads/") ? `${apiOrigin}${fileUrl}` : fileUrl;
}

/**
 * غلاف موحّد فوق fetch يرفق رمز الدخول تلقائياً، ويعيد المستخدم لصفحة الدخول
 * عند انتهاء صلاحية الجلسة أو رفضها من الخادم.
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearStoredToken();

    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  return response;
}
