export function calculateGrowthRate(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "0%";
  if (previous === 0) return "+100%";

  const rate = ((current - previous) / previous) * 100;
  const sign = rate >= 0 ? "+" : "";

  return `${sign}${rate.toFixed(2)}%`;
}
