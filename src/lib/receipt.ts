import { prisma } from "@/lib/prisma";

export async function nextReceiptNo(date = new Date()) {
  const bangkok = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");
  const prefix = `CF-${bangkok}-`;
  const latest = await prisma.sale.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });
  const current = latest ? Number(latest.receiptNo.slice(-4)) : 0;
  return `${prefix}${String(current + 1).padStart(4, "0")}`;
}
