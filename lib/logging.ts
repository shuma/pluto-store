import "server-only";
// Allowlist error fields. Never serialize full provider errors (they may include images or headers).
export function logError(
  event: string,
  error: unknown,
  context: Record<string, string | boolean> = {},
) {
  const fields: Record<string, string | number | boolean> = {
    event,
    ...context,
  };
  if (error instanceof Error) fields.kind = error.name;
  if (error && typeof error === "object")
    for (const key of ["code", "status", "requestID"]) {
      if (key in error) {
        const value = Reflect.get(error, key);
        if (typeof value === "string" || typeof value === "number")
          fields[key] = value;
      }
    }
  console.error(JSON.stringify(fields));
}
