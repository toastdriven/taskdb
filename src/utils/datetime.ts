/**
 * Return an RFC 3339 datetime string with local UTC offset and millisecond
 * precision.
 *
 * @param date Optional date to format. Defaults to current date/time.
 * @returns RFC 3339 timestamp string.
 * @example makeRfc3339() // "2026-05-14T18:26:13.246-05:00"
 */
export function makeRfc3339(date: Date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset(); // positive = east of UTC
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHH = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const offsetMM = String(absMinutes % 60).padStart(2, "0");

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${sign}${offsetHH}:${offsetMM}`;
}
