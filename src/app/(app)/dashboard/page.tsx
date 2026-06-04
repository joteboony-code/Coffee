import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht, startOfBangkokDay, thaiDate } from "@/lib/format";
import { bangkokDate } from "@/lib/queue";

export default async function DashboardPage() {
  await requireSession(["OWNER"]);

  const start = startOfBangkokDay();

  const [sales, lowStockIngredients, negativeStockIngredients, queueToday, queuePending] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: start }, status: "COMPLETED" },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ingredient.findMany({
      where: {
        isActive: true,
        currentStock: { gt: 0 },
      },
      orderBy: { currentStock: "asc" },
    }).then((ings) => ings.filter((i) => Number(i.lowStockThreshold) > 0 && Number(i.currentStock) <= Number(i.lowStockThreshold))),
    prisma.ingredient.findMany({
      where: { isActive: true, currentStock: { lt: 0 } },
      orderBy: { currentStock: "asc" },
    }),
    prisma.sale.count({ where: { queueDate: bangkokDate() } }),
    prisma.sale.count({ where: { queueDate: bangkokDate(), queueStatus: { in: ["NEW", "MAKING", "READY"] } } }),
  ]);

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cups = sales.reduce((sum, s) => sum + s.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  const ingredientCost = sales.reduce(
    (sum, s) => sum + s.items.reduce((ss, i) => ss + Number(i.ingredientCost), 0),
    0,
  );
  const grossProfit = sales.reduce(
    (sum, s) => sum + s.items.reduce((ss, i) => ss + Number(i.grossProfit), 0),
    0,
  );

  const byPayment = {
    CASH: sales.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum + s.total, 0),
    TRANSFER: sales.filter((s) => s.paymentMethod === "TRANSFER").reduce((sum, s) => sum + s.total, 0),
    PROMPTPAY: sales.filter((s) => s.paymentMethod === "PROMPTPAY").reduce((sum, s) => sum + s.total, 0),
  };

  // Best sellers today
  const menuMap = new Map<string, number>();
  for (const s of sales) {
    for (const i of s.items) menuMap.set(i.name, (menuMap.get(i.name) ?? 0) + i.quantity);
  }
  const bestSellers = [...menuMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const hasStockAlerts = lowStockIngredients.length > 0 || negativeStockIngredients.length > 0;

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-5">
        <h1 className="text-3xl font-bold">ภาพรวมวันนี้</h1>
        <p className="mt-1 text-lg text-[#74665a]">{thaiDate(new Date())}</p>
      </div>

      {/* Revenue metrics */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric label="ยอดขายรวม" value={baht(revenue)} large />
        <Metric label="กำไรขั้นต้น" value={`฿${grossProfit.toFixed(2)}`} large color="emerald" />
        <Metric label="จำนวนบิล" value={String(sales.length)} large />
        <Metric label="จำนวนรายการ" value={String(cups)} large />
      </div>

      {/* Queue stats */}
      <section className="mt-5 rounded-2xl border border-[#ded1be] bg-white p-5">
        <h2 className="mb-4 text-2xl font-bold">สถานะคิว</h2>
        <div className="grid grid-cols-2 gap-4">
          <Metric label="คิวทั้งหมดวันนี้" value={String(queueToday)} color={queueToday > 0 ? "default" : "default"} />
          <Metric label="คิวรอดำเนินการ" value={String(queuePending)} color={queuePending > 0 ? "amber" : "default"} />
        </div>
      </section>

      {/* Cost breakdown */}
      <section className="mt-5 rounded-2xl border border-[#ded1be] bg-white p-5">
        <h2 className="mb-4 text-2xl font-bold">แยกตามวิธีชำระเงิน</h2>
        <div className="grid grid-cols-3 gap-4">
          <Metric label="เงินสด" value={baht(byPayment.CASH)} />
          <Metric label="โอนเงิน" value={baht(byPayment.TRANSFER)} />
          <Metric label="พร้อมเพย์" value={baht(byPayment.PROMPTPAY)} />
        </div>
      </section>

      {/* Ingredient cost */}
      <section className="mt-5 rounded-2xl border border-[#ded1be] bg-white p-5">
        <h2 className="mb-4 text-2xl font-bold">ต้นทุนวัตถุดิบ</h2>
        <div className="grid grid-cols-3 gap-4">
          <Metric label="ต้นทุนวัตถุดิบ" value={`฿${ingredientCost.toFixed(2)}`} color="amber" />
          <Metric label="กำไรขั้นต้น" value={`฿${grossProfit.toFixed(2)}`} color="emerald" />
          <Metric label="มาร์จิ้น" value={revenue > 0 ? `${((grossProfit / revenue) * 100).toFixed(1)}%` : "—"} color="emerald" />
        </div>
      </section>

      {/* Stock alerts */}
      {hasStockAlerts && (
        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-600" />
            <h2 className="text-2xl font-bold text-amber-800">แจ้งเตือนสต็อก</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {negativeStockIngredients.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-white p-4">
                <p className="mb-2 font-bold text-red-700">สต็อกติดลบ ({negativeStockIngredients.length} รายการ)</p>
                <div className="space-y-1">
                  {negativeStockIngredients.map((i) => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span>{i.name}</span>
                      <span className="font-bold text-red-700">{Number(i.currentStock).toFixed(2)} {i.unit}</span>
                    </div>
                  ))}
                </div>
                <Link href="/ingredients" className="mt-3 block text-sm font-bold text-red-700 hover:underline">จัดการวัตถุดิบ →</Link>
              </div>
            )}
            {lowStockIngredients.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="mb-2 font-bold text-amber-700">ใกล้หมด ({lowStockIngredients.length} รายการ)</p>
                <div className="space-y-1">
                  {lowStockIngredients.map((i) => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span>{i.name}</span>
                      <span className="font-bold text-amber-700">{Number(i.currentStock).toFixed(2)} / {Number(i.lowStockThreshold).toFixed(2)} {i.unit}</span>
                    </div>
                  ))}
                </div>
                <Link href="/ingredients" className="mt-3 block text-sm font-bold text-amber-700 hover:underline">จัดการวัตถุดิบ →</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Best sellers today */}
      {bestSellers.length > 0 && (
        <section className="mt-5 rounded-2xl border border-[#ded1be] bg-white">
          <h2 className="border-b border-[#eadfce] px-5 py-4 text-2xl font-bold">เมนูขายดีวันนี้</h2>
          <div className="divide-y divide-[#eadfce]">
            {bestSellers.map(([name, qty], idx) => (
              <div key={name} className="flex items-center justify-between px-5 py-3 text-lg">
                <span className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0e5d7] text-sm font-bold text-[#4b3427]">{idx + 1}</span>
                  <span className="font-bold">{name}</span>
                </span>
                <span className="font-bold text-[#74665a]">{qty} แก้ว</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sales */}
      {sales.length > 0 && (
        <section className="mt-5 rounded-2xl border border-[#ded1be] bg-white">
          <h2 className="border-b border-[#eadfce] px-5 py-4 text-2xl font-bold">รายการล่าสุด</h2>
          <div className="divide-y divide-[#eadfce]">
            {sales.slice(0, 10).map((sale) => {
              const saleIngCost = sale.items.reduce((s, i) => s + Number(i.ingredientCost), 0);
              const saleProfit = sale.items.reduce((s, i) => s + Number(i.grossProfit), 0);
              return (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3 text-base">
                  <span className="font-bold text-[#2f6f4e] w-36 shrink-0">{sale.receiptNo}</span>
                  <span className="text-[#74665a] flex-1">{sale.items.reduce((s, i) => s + i.quantity, 0)} รายการ</span>
                  <span className="text-[#74665a] w-24 text-right text-sm">ต้นทุน ฿{saleIngCost.toFixed(2)}</span>
                  <span className="w-24 text-right font-bold text-emerald-700">+฿{saleProfit.toFixed(2)}</span>
                  <span className="w-24 text-right font-bold">{baht(sale.total)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function Metric({
  label, value, large = false, color = "default",
}: {
  label: string; value: string; large?: boolean; color?: "default" | "emerald" | "amber";
}) {
  const valueClass =
    color === "emerald" ? "text-emerald-700" :
    color === "amber" ? "text-amber-700" :
    "text-[#241f1a]";
  return (
    <div className="rounded-2xl border border-[#ded1be] bg-white p-5">
      <p className="text-lg text-[#74665a]">{label}</p>
      <p className={`mt-2 font-bold ${large ? "text-4xl" : "text-2xl"} ${valueClass}`}>{value}</p>
    </div>
  );
}
