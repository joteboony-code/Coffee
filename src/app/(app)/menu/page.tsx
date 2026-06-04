import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht } from "@/lib/format";

export default async function MenuPage() {
  await requireSession(["OWNER"]);
  const [categories, groups] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: { orderBy: { name: "asc" } },
      },
    }),
    prisma.modifierGroup.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <h1 className="mb-5 text-3xl font-bold">จัดการเมนู</h1>
      <div className="grid grid-cols-[1fr_380px] gap-5">
        {/* Categories & Items */}
        <div className="space-y-4">
          {categories.map((category) => (
            <section key={category.id} className="rounded-2xl border border-[#ded1be] bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <span
                  className={`rounded-lg px-3 py-1 text-sm font-bold ${
                    category.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#f0e5d7] text-[#74665a]"
                  }`}
                >
                  {category.isActive ? "แสดง" : "ซ่อน"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {category.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-xl p-4 text-lg ${
                      item.isActive ? "bg-[#f7f2ea]" : "bg-gray-50 opacity-60"
                    }`}
                  >
                    <span className="font-bold">{item.name}</span>
                    <span className="font-semibold text-[#846449]">{baht(item.price)}</span>
                  </div>
                ))}
                {category.items.length === 0 && (
                  <p className="col-span-2 text-[#74665a]">ยังไม่มีเมนู</p>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Modifier groups */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">ตัวเลือก</h2>
          {groups.map((group) => (
            <section key={group.id} className="rounded-2xl border border-[#ded1be] bg-white p-5">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-xl font-bold">{group.name}</h3>
                {group.isRequired && (
                  <span className="rounded-lg bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                    จำเป็น
                  </span>
                )}
              </div>
              <p className="mb-3 text-sm text-[#74665a]">
                {group.type === "SINGLE" ? "เลือกได้ 1 รายการ" : "เลือกได้หลายรายการ"}
              </p>
              <div className="space-y-2">
                {group.options.map((option) => (
                  <div key={option.id} className="flex justify-between rounded-xl bg-[#f7f2ea] px-4 py-2">
                    <span>{option.name}</span>
                    <span className="font-semibold text-[#846449]">
                      {option.priceDelta ? `+${option.priceDelta}` : "฿0"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
