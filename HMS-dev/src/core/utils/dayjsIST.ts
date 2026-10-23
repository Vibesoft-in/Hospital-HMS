import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const IST_TIMEZONE = "Asia/Kolkata";

/** Format an ISO 8601 instant (e.g. API `createdAt`) in Asia/Kolkata (IST). */
export const formatInstantInIST = (
  iso: string | null | undefined,
  formatStr: string
): string => {
  if (!iso?.trim()) return "";
  const d = dayjs.utc(iso);
  if (!d.isValid()) return "";
  return d.tz(IST_TIMEZONE).format(formatStr);
};

/** Current calendar date in Asia/Kolkata (`YYYY-MM-DD`), for API filters. */
export const todayISODateInIST = (): string =>
  dayjs().tz(IST_TIMEZONE).format("YYYY-MM-DD");

export const getDayNameInIST = (
  date: dayjs.Dayjs | string | Date | null | undefined
): string => {
  if (!date) return "";
  const base = dayjs.isDayjs(date) ? date : dayjs(date);
  return base.tz(IST_TIMEZONE).format("dddd");
};

