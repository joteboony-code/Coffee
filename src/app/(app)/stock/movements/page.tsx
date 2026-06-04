import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { thaiDateTime } from "@/lib/format";

const typeLabel: Record<string, string> = {
  RECEIVE: "รับเข้า",
  SALE: "ขาย",
  ADJUST: "ปรับ",
  WASTE: "ของเสีย",
  REFUND: "คืน",
};

const typeBadge: Record<string, string> = {
  RECEIVE: "bg-emerald-50 text-emerald-700",
  SALE: "bg-sky-50 text-sky-700",
  ADJUST: "bg-amber-50 text-amber-700",
  WASTE: "bg-red-50 text-red-700",
  REFUND: "bg-purple-50 text-purple-700",
};

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ ingredientId?: string; type?: string }>;
}) {
  await requireSession(["OWNER"]);
  const params = await searchParams;

  const [movements, ingredients] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        ...(params.ingredientId ? { ingredientId: params.ingredientId } : {}),
        ...(params.type ? { type: params.type as "RECEIVE" | "SALE" | "ADJUST" | "WASTE" | "REFUND" } : {}),
      },
      include: { ingredient: { select: { name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <h1 className="mb-5 text-3xl font-bold">ความเคลื่อนไหวสต็อก</h1>

      {/* Filters */}
      <form method="GET" className="mb-5 flex flex-wrap gap-3">
        <select name="ingredientId" defaultValue={params.ingredientId ?? ""}
          className="h-12 rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]">
          <option value="">— วัตถุดิบทั้งหมด —</option>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        <select name="type" defaultValue={params.type ?? ""}
          className="h-12 rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]">
          <option value="">— ประเภททั้งหมด —</option>
          {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="h-12 rounded-xl bg-[#4b3427] px-6 text-lg font-bold text-white">กรอง</button>
        <a href="/stock/movements" className="flex h-12 items-center rounded-xl bg-[#f0e5d7] px-5 text-lg font-bold text-[#4b3427]">ล้าง</a>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[#ded1be] bg-white">
        <table className="w-full text-left text-base">
          <thead className="bg-[#f0e5d7] text-[#4b3427]">
            <tr>
              <th className="p-4">วันเวลา</th>
              <th className="p-4">วัตถุดิบ</th>
              <th className="p-4">ประเภท</th>
              <th className="p-4 text-right">จำนวน</th>
              <th className="p-4 text-right">ก่อน</th>
              <th className="p-4 text-right">หลัง</th>
              <th className="p-4 text-right">ต้นทุน</th>
              <th className="p-4">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-[#74665a]">ยังไม่มีรายการ</td></tr>
            )}
            {movements.map((m) => {
              const qty = Number(m.quantity);
              const isPos = qty >= 0;
              return (
                <tr key={m.id} className="border-t border-[#eadfce] hover:bg-[#faf7f4]">
                  <td className="p-4 text-[#74665a] whitespace-nowrap">{thaiDateTime(m.createdAt)}</td>
                  <td className="p-4 font-bold">{m.ingredient.name}</td>
                  <td className="p-4">
                    <span className={`rounded-lg px-2 py-1 text-sm font-bold ${typeBadge[m.type] ?? ""}`}>
                      {typeLabel[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className={`p-4 text-right font-bold ${isPos ? "text-emerald-700" : "text-red-700"}`}>
                    {isPos ? "+" : ""}{qty.toFixed(2)} {m.unit}
                  </td>
                  <td className="p-4 text-right text-[#74665a]">{Number(m.beforeStock).toFixed(2)}</td>
                  <td className="p-4 text-right text-[#74665a]">{Number(m.afterStock).toFixed(2)}</td>
                  <td className="p-4 text-right text-[#74665a]">
                    {Number(m.totalCost) > 0 ? `฿${Number(m.totalCost).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-4 text-[#74665a] max-w-[160px] truncate">{m.note || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
