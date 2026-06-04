/** Bangkok YYYYMMDD string for today — used as the queue partition key */
export function bangkokDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");
}

/** Format a queue number sequence integer → "A001" */
export function formatQueueNo(seq: number): string {
  return `A${String(seq).padStart(3, "0")}`;
}
