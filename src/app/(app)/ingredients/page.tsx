import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { StockActionButtons } from "@/app/(app)/ingredients/ingredient-client";

export default async function IngredientsPage() {
  await requireSession(["OWNER"]);

  const ingredients = await prisma.ingredient.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">วัตถุดิบ</h1>
        <Link href="/ingredients/new" className="flex items-center gap-2 rounded-xl bg-[#4b3427] px-5 py-3 text-lg font-bold text-white hover:bg-[#3a2820]">
          <Plus size={20} /> เพิ่มวัตถุดิบ
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#ded1be] bg-white">
        <table className="w-full text-left text-base">
          <thead className="bg-[#f0e5d7] text-[#4b3427]">
            <tr>
              <th className="p-4 text-lg">ชื่อวัตถุดิบ</th>
              <th className="p-4 text-lg">หมวด</th>
              <th className="p-4 text-lg text-right">สต็อก</th>
              <th className="p-4 text-lg text-right">ต้นทุน/หน่วย</th>
              <th className="p-4 text-lg text-right">เตือน</th>
              <th className="p-4 text-lg">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#74665a]">ยังไม่มีวัตถุดิบ — กดเพิ่มวัตถุดิบ</td>
              </tr>
            )}
            {ingredients.map((ing) => {
              const stock = Number(ing.currentStock);
              const low = Number(ing.lowStockThreshold);
              const isNegative = stock < 0;
              const isLow = !isNegative && low > 0 && stock <= low;
              const rowBg = isNegative ? "bg-red-50" : isLow ? "bg-amber-50" : "";
              return (
                <tr key={ing.id} className={`border-t border-[#eadfce] ${rowBg}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{ing.name}</span>
                      {!ing.isActive && <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">ปิด</span>}
                      {isNegative && <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">ติดลบ</span>}
                      {isLow && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">ใกล้หมด</span>}
                    </div>
                  </td>
                  <td className="p-4 text-[#74665a]">{ing.category || "—"}</td>
                  <td className={`p-4 text-right font-bold text-lg ${isNegative ? "text-red-700" : isLow ? "text-amber-700" : ""}`}>
                    {stock.toFixed(2)} {ing.unit}
                  </td>
                  <td className="p-4 text-right text-[#74665a]">
                    {Number(ing.costPerUnit).toFixed(4)} บาท/{ing.unit}
                  </td>
                  <td className="p-4 text-right text-[#74665a]">
                    {low > 0 ? `${low} ${ing.unit}` : "—"}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StockActionButtons ingredient={{
                        id: ing.id, name: ing.name, unit: ing.unit,
                        currentStock: stock, costPerUnit: Number(ing.costPerUnit),
                      }} />
                      <Link href={`/ingredients/${ing.id}/edit`} className="h-9 rounded-lg bg-[#f0e5d7] px-3 text-sm font-bold text-[#4b3427] hover:bg-[#e5d5c0] flex items-center">
                        แก้ไข
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
