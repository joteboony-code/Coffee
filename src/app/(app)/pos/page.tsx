import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PosClient } from "@/app/(app)/pos/pos-client";

export default async function PosPage() {
  await requireSession(["OWNER", "STAFF"]);
  const [categories, settings] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          include: {
            modifierGroups: {
              orderBy: { sortOrder: "asc" },
              include: {
                modifierGroup: {
                  include: { options: { orderBy: { sortOrder: "asc" } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.shopSetting.findUnique({ where: { id: "default" } }),
  ]);

  return (
    // 100dvh = true viewport on Safari (accounts for dynamic browser chrome)
    // Subtract nav height (70px) + page padding (px-4 pt-3 = 16+12 = 28px → use 16px top pad)
    <main className="h-[calc(100dvh-70px)] overflow-hidden px-4 pt-3">
      <PosClient categories={categories} promptPayId={settings?.promptPayId ?? ""} />
    </main>
  );
}
