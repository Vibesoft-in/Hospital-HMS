/** Uses API `age`, `months`, `days` only — no client DOB calculation. E.g. `42 Y`, `2 M`, `14 D`. */
export const formatAgeForListing = (
  years?: number | null,
  months?: number | null,
  days?: number | null
): string | undefined => {
  const y = years != null ? Number(years) : undefined;
  if (y != null && Number.isFinite(y)) {
    if (y === 0) {
      const m = months != null ? Number(months) : 0;
      if (m > 0) return `${m} M`;
      if (days != null && Number.isFinite(Number(days))) return `${Number(days)} D`;
      return "0 Y";
    }
    return `${y} Y`;
  }

  const m = months != null ? Number(months) : 0;
  if (m > 0) return `${m} M`;
  if (days != null && Number.isFinite(Number(days)) && Number(days) > 0) {
    return `${Number(days)} D`;
  }
  return undefined;
};
