export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; details?: unknown }
    | null;
  if (!response.ok) {
    const message =
      payload?.error ??
      (response.status === 401
        ? "Your session expired. Reload the page."
        : "Something went wrong. Try again.");
    throw new Error(message);
  }
  return payload as T;
}
