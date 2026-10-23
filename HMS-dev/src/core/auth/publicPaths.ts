/** Public routes — no auth cookie required (server + client). */
export const PUBLIC_PATH_PREFIXES: string[] = [
  "/",
  "/login",
  "/error-404",
  "/error-500",
  "/coming-soon",
  "/under-maintenance",
  "/pq",
  "/xq",
  "/qd",
  "/qd-all",
  "/jjm-signage",
];

export const matchesPathPrefix = (pathname: string, prefix: string): boolean => {
  if (!pathname || !prefix) return false;
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
