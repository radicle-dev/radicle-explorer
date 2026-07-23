// Compact relative time (e.g. "3h", "5d", "2mo") matching the desktop
// patch timeline. Explorer API timestamps are in seconds.
export function formatTimeShort(
  timestamp: number,
  current = Date.now(),
): string {
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = (365 * DAY) / 12;
  const YEAR = 365 * DAY;

  const elapsed = current - timestamp * 1000;
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < MONTH) return `${Math.floor(elapsed / DAY)}d`;
  if (elapsed < YEAR) return `${Math.floor(elapsed / MONTH)}mo`;
  return `${Math.floor(elapsed / YEAR)}y`;
}
