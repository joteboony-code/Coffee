import Link from "next/link";
import { ChefHat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht } from "@/lib/format";

export default async function RecipesPage() {
  await requireSession(["OWNER"]);

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { name: "asc" },
        include: {
          recipes: {
            where: { isActive: true },
            include: { items: { include: { ingredient: true } } },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-5 flex items-center gap-3">
        <ChefHat size={32} className="text-[#4b3427]" />
        <h1 className="text-3xl font-bold">สูตรเครื่องดื่ม</h1>
      </div>
      <p className="mb-6 text-lg text-[#74665a]">กำหนดวัตถุดิบสำหรับแต่ละเมนู เพื่อคำนวณต้นทุนและหักสต็อกอัตโนมัติ</p>

      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-3 text-2xl font-bold text-[#4b3427]">{cat.name}</h2>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {cat.items.map((item) => {
                const recipeCount = item.recipes.length;
                const baseCost = recipeCount > 0
                  ? item.recipes[0].items.reduce(
                      (sum, ri) => sum + Number(ri.quantity) * Number(ri.ingredient.costPerUnit), 0
                    )
                  : null;

                return (
                  <Link
                    key={item.id}
                    href={`/recipes/${item.id}`}
                    className="flex items-start justify-between rounded-2xl border border-[#ded1be] bg-white p-5 shadow-sm hover:border-[#4b3427] hover:bg-[#f7f2ea]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold">{item.name}</p>
                      <p className="mt-1 text-lg text-[#846449]">{baht(item.price)}</p>
                      {baseCost !== null ? (
                        <p className="mt-2 text-sm text-[#74665a]">
                          ต้นทุน ≈ <span className="font-semibold text-[#241f1a]">฿{baseCost.toFixed(2)}</span>
                          {" · "}กำไร ≈ <span className="font-semibold text-emerald-700">฿{(item.price - baseCost).toFixed(2)}</span>
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-amber-600 font-semibold">ยังไม่มีสูตร</p>
                      )}
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <span className={`inline-block rounded-xl px-3 py-1 text-sm font-bold ${
                        recipeCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {recipeCount > 0 ? `${recipeCount} สูตร` : "ไม่มีสูตร"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
