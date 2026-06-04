import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht, startOfBangkokDay, thaiDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireSession(["OWNER"]);

  const todayStart = startOfBangkokDay();
  const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1, -7, 0, 0));

  const [todaySales, monthSales, saleItems, lowStock, negStock] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: todayStart }, status: "COMPLETED" }, include: { items: true } }),
    prisma.sale.findMany({ where: { createdAt: { gte: monthStart }, status: "COMPLETED" }, include: { items: true } }),
    prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: monthStart }, status: "COMPLETED" } },
      select: { name: true, quantity: true, total: true, ingredientCost: true, grossProfit: true },
    }),
    prisma.ingredient.findMany({ where: { isActive: true, currentStock: { gt: 0 } } })
      .then((rows) => rows.filter((i) => Number(i.lowStockThreshold) > 0 && Number(i.currentStock) <= Number(i.lowStockThreshold))),
    prisma.ingredient.findMany({ where: { isActive: true, currentStock: { lt: 0 } } }),
  ]);

  const sum = (arr: { total: number }[]) => arr.reduce((s, x) => s + x.total, 0);
  const todayRevenue = sum(todaySales);
  const monthRevenue = sum(monthSales);

  const todayCost = todaySales.reduce((s, x) => s + x.items.reduce((a, i) => a + Number(i.ingredientCost), 0), 0);
  const todayProfit = todaySales.reduce((s, x) => s + x.items.reduce((a, i) => a + Number(i.grossProfit), 0), 0);

  const payment = (arr: typeof todaySales, m: string) => arr.filter((s) => s.paymentMethod === m).reduce((a, s) => a + s.total, 0);

  // Menu aggregation (month)
  const menuMap = new Map<string, { name: string; qty: number; sales: number; cost: number; profit: number }>();
  for (const it of saleItems) {
    const ex = menuMap.get(it.name) ?? { name: it.name, qty: 0, sales: 0, cost: 0, profit: 0 };
    ex.qty += it.quantity;
    ex.sales += it.total;
    ex.cost += Number(it.ingredientCost);
    ex.profit += Number(it.grossProfit);
    menuMap.set(it.name, ex);
  }
  const menus = [...menuMap.values()].sort((a, b) => b.qty - a.qty);
  const bestSellers = menus.slice(0, 5);
  const worstSellers = [...menus].sort((a, b) => a.qty - b.qty).slice(0, 5);

  // Queue counts today
  const queueServed = todaySales.filter((s) => s.queueStatus === "SERVED").length;

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">รายงาน</h1>
        <Link href="/backup" className="rounded-xl bg-[#f0e5d7] px-5 py-3 text-lg font-bold text-[#4b3427] hover:bg-[#e5d5c0]">ส่งออกข้อมูล →</Link>
      </div>

      {/* Today */}
      <h2 className="mb-3 text-2xl font-bold">วันนี้ · {thaiDate(new Date())}</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="ยอดขาย" value={baht(todayRevenue)} large />
        <Stat label="กำไรขั้นต้น" value={`฿${todayProfit.toFixed(2)}`} large color="emerald" />
        <Stat label="ต้นทุนวัตถุดิบ" value={`฿${todayCost.toFixed(2)}`} color="amber" />
        <Stat label="จำนวนบิล" value={String(todaySales.length)} />
        <Stat label="เงินสด" value={baht(payment(todaySales, "CASH"))} />
        <Stat label="โอน" value={baht(payment(todaySales, "TRANSFER"))} />
        <Stat label="พร้อมเพย์" value={baht(payment(todaySales, "PROMPTPAY"))} />
        <Stat label="คิวเสร็จแล้ว" value={`${queueServed}/${todaySales.length}`} />
      </div>

      {/* Month */}
      <h2 className="mb-3 text-2xl font-bold">เดือนนี้</h2>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="ยอดขายเดือนนี้" value={baht(monthRevenue)} large />
        <Stat label="จำนวนบิล" value={String(monthSales.length)} />
        <Stat label="เงินสด" value={baht(payment(monthSales, "CASH"))} />
        <Stat label="โอน + พร้อมเพย์" value={baht(payment(monthSales, "TRANSFER") + payment(monthSales, "PROMPTPAY"))} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Best sellers */}
        <RankCard title="เมนูขายดี (เดือนนี้)" rows={bestSellers} />
        {/* Worst sellers */}
        <RankCard title="เมนูขายน้อย (เดือนนี้)" rows={worstSellers} />
      </div>

      {/* Menu profit report */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#ded1be] bg-white">
        <h2 className="border-b border-[#eadfce] px-5 py-4 text-2xl font-bold">รายงานกำไรต่อเมนู (เดือนนี้)</h2>
        <table className="w-full text-left text-base">
          <thead className="bg-[#f0e5d7] text-[#4b3427]">
            <tr>
              <th className="p-4">เมนู</th>
              <th className="p-4 text-right">ขายได้</th>
              <th className="p-4 text-right">ยอดขาย</th>
              <th className="p-4 text-right">ต้นทุน</th>
              <th className="p-4 text-right">กำไร</th>
            </tr>
          </thead>
          <tbody>
            {menus.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-[#74665a]">ยังไม่มีข้อมูล</td></tr>}
            {menus.map((m) => (
              <tr key={m.name} className="border-t border-[#eadfce]">
                <td className="p-4 font-bold">{m.name}</td>
                <td className="p-4 text-right">{m.qty}</td>
                <td className="p-4 text-right">{baht(m.sales)}</td>
                <td className="p-4 text-right text-amber-700">฿{m.cost.toFixed(2)}</td>
                <td className="p-4 text-right font-bold text-emerald-700">฿{m.profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Stock alerts */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#ded1be] bg-white p-5">
          <h2 className="mb-3 text-xl font-bold text-amber-700">วัตถุดิบใกล้หมด ({lowStock.length})</h2>
          {lowStock.length === 0 ? <p className="text-[#74665a]">ไม่มี</p> : (
            <div className="space-y-1">
              {lowStock.map((i) => (
                <div key={i.id} className="flex justify-between"><span>{i.name}</span><span className="font-bold text-amber-700">{Number(i.currentStock).toFixed(2)} {i.unit}</span></div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-[#ded1be] bg-white p-5">
          <h2 className="mb-3 text-xl font-bold text-red-700">วัตถุดิบติดลบ ({negStock.length})</h2>
          {negStock.length === 0 ? <p className="text-[#74665a]">ไม่มี</p> : (
            <div className="space-y-1">
              {negStock.map((i) => (
                <div key={i.id} className="flex justify-between"><span>{i.name}</span><span className="font-bold text-red-700">{Number(i.currentStock).toFixed(2)} {i.unit}</span></div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, large = false, color = "default" }: { label: string; value: string; large?: boolean; color?: "default" | "emerald" | "amber" }) {
  const c = color === "emerald" ? "text-emerald-700" : color === "amber" ? "text-amber-700" : "text-[#241f1a]";
  return (
    <div className="rounded-2xl border border-[#ded1be] bg-white p-5">
      <p className="text-sm text-[#74665a]">{label}</p>
      <p className={`mt-1 font-bold ${large ? "text-3xl" : "text-2xl"} ${c}`}>{value}</p>
    </div>
  );
}

function RankCard({ title, rows }: { title: string; rows: { name: string; qty: number; sales: number }[] }) {
  return (
    <section className="rounded-2xl border border-[#ded1be] bg-white">
      <h2 className="border-b border-[#eadfce] px-5 py-4 text-xl font-bold">{title}</h2>
      <div className="divide-y divide-[#eadfce]">
        {rows.length === 0 && <p className="p-5 text-[#74665a]">ยังไม่มีข้อมูล</p>}
        {rows.map((m, idx) => (
          <div key={m.name} className="flex items-center justify-between px-5 py-3">
            <span className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0e5d7] text-sm font-bold text-[#4b3427]">{idx + 1}</span>
              <span className="font-bold">{m.name}</span>
            </span>
            <span className="text-[#74665a]">{m.qty} แก้ว · {baht(m.sales)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
