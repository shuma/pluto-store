export async function send<T = Record<string, unknown>>(
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}
export const post = <T = Record<string, unknown>>(url: string, body: unknown) =>
  send<T>("POST", url, body);
