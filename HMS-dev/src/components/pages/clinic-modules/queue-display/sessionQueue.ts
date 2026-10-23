export type ISessionSlot = string | null;

export const parseSessionSlot = (value: unknown): ISessionSlot => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseCurrentSessionSlot = (data: Record<string, unknown>): ISessionSlot =>
  parseSessionSlot(data.currentSessionSlot ?? data.sessionSlot);

export const shouldShowVisitOnScreen = (
  visitSlot: ISessionSlot | undefined,
  currentSlot: ISessionSlot | undefined
): boolean => {
  const isSlotless = !visitSlot;
  const isCurrentSlot = Boolean(currentSlot && visitSlot === currentSlot);
  return isSlotless || isCurrentSlot;
};

export const getSessionSlotBadge = (visitSlot: ISessionSlot | undefined): string =>
  visitSlot?.trim() || "All Day";

export type IQueueSortBy = "token" | "time";

export const parseQueueSortBy = (
  value: unknown,
  fallback: IQueueSortBy = "token"
): IQueueSortBy => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "time") return "time";
  if (normalized === "token") return "token";
  return fallback;
};

export const sortDisplayQueue = <T extends { visitType?: string; visitTime?: string; tokenNumber?: number }>(
  queue: T[],
  queueSortBy: IQueueSortBy = "token"
): T[] => {
  return [...queue].sort((a, b) => {
    const aEmergency = (a.visitType ?? "").toLowerCase() === "emergency";
    const bEmergency = (b.visitType ?? "").toLowerCase() === "emergency";
    if (aEmergency && !bEmergency) return -1;
    if (!aEmergency && bEmergency) return 1;

    if (queueSortBy === "time") {
      if (a.visitTime && b.visitTime) {
        return a.visitTime.localeCompare(b.visitTime);
      }
      if (a.visitTime && !b.visitTime) return -1;
      if (!a.visitTime && b.visitTime) return 1;
    }

    return (a.tokenNumber ?? 0) - (b.tokenNumber ?? 0);
  });
};

export const getDeletedVisitId = (data: Record<string, unknown>): string => {
  const visit = data.visit as Record<string, unknown> | undefined;
  return (
    (typeof data.visitId === "string" ? data.visitId : "") ||
    (typeof visit?.visitId === "string" ? visit.visitId : "") ||
    (typeof visit?._id === "string" ? visit._id : "")
  );
};
