const normalizeVisitType = (visitType?: string): string =>
  (visitType ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export const getTokenPrefixFromVisitType = (visitType?: string): string => {
  const normalized = normalizeVisitType(visitType);

  if (normalized === "emergency") return "E";
  if (normalized === "mr") return "M";
  if (
    normalized === "follow-up-report" ||
    normalized === "follow up report" ||
    normalized === "followup-report" ||
    normalized === "followup report"
  ) {
    return "FR";
  }
  if (
    normalized === "follow-up" ||
    normalized === "follow up" ||
    normalized === "followup"
  ) {
    return "F";
  }
  if (normalized === "new" || normalized === "opd") return "O";

  return "O";
};

export const formatTokenWithVisitPrefix = (
  tokenNo: string | number | null | undefined,
  visitType?: string
): string => {
  const token = String(tokenNo ?? "").trim();
  if (!token || token === "—" || token.toLowerCase() === "n/a") return "N/A";
  const prefix = getTokenPrefixFromVisitType(visitType);
  return `${prefix}-${token}`;
};
