import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { baht, thaiDateTime } from "@/lib/format";
import { requireSession } from "@/lib/auth";
import { PrintButton } from "@/app/(app)/receipt/print-button";

const paymentLabel: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["OWNER", "STAFF"]);
  const { id } = await params;
  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { options: true } } },
    }),
    prisma.shopSetting.findUnique({ where: { id: "default" } }),
  ]);
  if (!sale) notFound();

  return (
    <main className="mx-auto max-w-xl p-5">
      {/* Action bar (hidden on print) */}
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/pos" className="rounded-xl bg-white px-5 py-3 text-lg font-bold text-[#4b3427] hover:bg-[#f0e5d7]">
          ← กลับขาย
        </Link>
        <div className="flex gap-2">
          <Link href="/queue" className="rounded-xl bg-[#f0e5d7] px-5 py-3 text-lg font-bold text-[#4b3427] hover:bg-[#e5d5c0]">
            คิว
          </Link>
          <Link href="/sales" className="rounded-xl bg-[#f0e5d7] px-5 py-3 text-lg font-bold text-[#4b3427] hover:bg-[#e5d5c0]">
            ประวัติ
          </Link>
          <PrintButton />
        </div>
      </div>

      <section className="rounded-2xl bg-white p-8 shadow-sm print:shadow-none">
        {/* Shop header */}
        <div className="mb-4 text-center">
          <h1 className="text-3xl font-bold">{settings?.shopName ?? "Coffee POS"}</h1>
          {settings?.address && <p className="mt-1 text-[#74665a]">{settings.address}</p>}
          {settings?.phone && <p className="text-[#74665a]">{settings.phone}</p>}
        </div>

        {/* Queue number — large and prominent */}
        {sale.queueNo && (
          <div className="mb-4 rounded-2xl bg-[#4b3427] py-4 text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-widest opacity-70">คิว</p>
            <p className="text-6xl font-black tracking-tight">{sale.queueNo}</p>
          </div>
        )}

        {/* Receipt info */}
        <div className="mb-5 space-y-1.5 border-y border-dashed border-[#c9b9a6] py-4 text-lg">
          <Row label="เลขที่" value={sale.receiptNo} bold />
          <Row label="วันเวลา" value={thaiDateTime(sale.createdAt)} />
          <Row label="ชำระโดย" value={paymentLabel[sale.paymentMethod] ?? sale.paymentMethod} />
        </div>

        {/* Items */}
        <div className="space-y-4">
          {sale.items.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between gap-4 text-lg font-bold">
                <span>{item.quantity} × {item.name}</span>
                <span className="shrink-0">{baht(item.total)}</span>
              </div>
              {item.options.length > 0 && (
                <p className="mt-1 text-[#74665a]">
                  {item.options.map((o) => `${o.groupName}: ${o.optionName}${o.priceDelta ? ` (+${o.priceDelta})` : ""}`).join(" / ")}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-6 space-y-2 border-t border-dashed border-[#c9b9a6] pt-4 text-xl">
          <Row label="ยอดรวม" value={baht(sale.total)} />
          {sale.paymentMethod === "CASH" && (
            <>
              <Row label="รับเงิน" value={baht(sale.received ?? 0)} />
              <Row label="เงินทอน" value={baht(sale.change ?? 0)} bold />
            </>
          )}
        </div>

        <p className="mt-8 text-center text-lg text-[#74665a]">{settings?.receiptFooter ?? "ขอบคุณที่อุดหนุน"}</p>
      </section>
    </main>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "font-bold" : ""}`}>
      <span className="text-[#74665a]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
