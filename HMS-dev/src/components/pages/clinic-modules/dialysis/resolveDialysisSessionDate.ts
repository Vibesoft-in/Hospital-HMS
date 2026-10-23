import dayjs from "dayjs";

export interface IDialysisSessionDateFields {
  sessionDate?: string | null;
  createdAt?: string | null;
}

/** Prefer API `sessionDate`; fall back to `createdAt` when it is missing. */
export const resolveDialysisSessionDate = (
  session: IDialysisSessionDateFields | null | undefined
): string | undefined => {
  const sessionDate = session?.sessionDate?.trim();
  if (sessionDate) return sessionDate;
  const createdAt = session?.createdAt?.trim();
  return createdAt || undefined;
};

export const formatDialysisSessionDate = (
  session: IDialysisSessionDateFields | null | undefined,
  formatStr: string
): string => {
  const raw = resolveDialysisSessionDate(session);
  if (!raw) return "";
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format(formatStr) : "";
};
