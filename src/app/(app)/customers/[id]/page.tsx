import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht, thaiDateTime } from "@/lib/format";
import { adjustPoints } from "@/app/(app)/customers/actions";

const pointTypeLabel: Record<string, string> = { EARN: "ได้รับ", REDEEM: "ใช้", ADJUST: "ปรับ" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["OWNER"]);
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: { orderBy: { createdAt: "desc" }, take: 30, include: { items: true } },
      pointMovements: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!customer) notFound();

  return (
    <main className="mx-auto max-w-[1200px] p-5">
      <div className="mb-5 flex items-center gap-4">
        <Link href="/customers" className="text-lg font-semibold text-[#74665a] hover:text-[#4b3427]">← ลูกค้า</Link>
        <h1 className="text-3xl font-bold">{customer.name}</h1>
      </div>

      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="แต้มสะสม" value={String(customer.points)} highlight />
        <Stat label="ยอดซื้อรวม" value={baht(customer.totalSpend)} />
        <Stat label="จำนวนครั้ง" value={String(customer.totalOrders)} />
        <Stat label="เบอร์โทร" value={customer.phone} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Purchase history */}
        <section className="rounded-2xl border border-[#ded1be] bg-white">
          <h2 className="border-b border-[#eadfce] px-5 py-4 text-xl font-bold">ประวัติการซื้อ</h2>
          <div className="divide-y divide-[#eadfce]">
            {customer.sales.length === 0 && <p className="p-5 text-[#74665a]">ยังไม่มีการซื้อ</p>}
            {customer.sales.map((s) => (
              <Link key={s.id} href={`/receipt/${s.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-[#faf7f4]">
                <div>
                  <p className="font-bold text-[#2f6f4e]">{s.receiptNo}</p>
                  <p className="text-sm text-[#74665a]">{thaiDateTime(s.createdAt)} · {s.items.reduce((a, i) => a + i.quantity, 0)} รายการ</p>
                </div>
                <span className="font-bold">{baht(s.total)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Point history + manual adjust */}
        <section className="rounded-2xl border border-[#ded1be] bg-white">
          <h2 className="border-b border-[#eadfce] px-5 py-4 text-xl font-bold">ประวัติแต้ม</h2>
          <form action={adjustPoints} className="flex flex-wrap items-end gap-2 border-b border-[#eadfce] p-4">
            <input type="hidden" name="customerId" value={customer.id} />
            <label className="flex-1">
              <span className="mb-1 block text-sm font-bold">ปรับแต้ม (+/-)</span>
              <input name="points" type="number" required placeholder="เช่น 10 หรือ -5" className="h-11 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]" />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-sm font-bold">หมายเหตุ</span>
              <input name="note" className="h-11 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]" />
            </label>
            <button type="submit" className="h-11 rounded-xl bg-[#4b3427] px-5 text-sm font-bold text-white">ปรับ</button>
          </form>
          <div className="divide-y divide-[#eadfce]">
            {customer.pointMovements.length === 0 && <p className="p-5 text-[#74665a]">ยังไม่มีประวัติแต้ม</p>}
            {customer.pointMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-bold">{pointTypeLabel[m.type] ?? m.type}</p>
                  <p className="text-sm text-[#74665a]">{thaiDateTime(m.createdAt)}{m.note ? ` · ${m.note}` : ""}</p>
                </div>
                <span className={`text-lg font-bold ${m.points >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {m.points >= 0 ? "+" : ""}{m.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-[#ded1be] bg-white p-5">
      <p className="text-sm text-[#74665a]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-[#4b3427]" : ""}`}>{value}</p>
    </div>
  );
}
