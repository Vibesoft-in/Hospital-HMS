export function parseBoolean(value: any): boolean {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
}
