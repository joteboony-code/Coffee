import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PosClient } from "@/app/(app)/pos/pos-client";

export default async function PosPage() {
  await requireSession(["OWNER", "STAFF"]);
  const [categories, settings, promotions] = await Promise.all([
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
    prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const promoLite = promotions.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    value: p.value,
    minSpend: p.minSpend,
    startsAt: p.startsAt?.toISOString() ?? null,
    endsAt: p.endsAt?.toISOString() ?? null,
    isActive: p.isActive,
  }));

  return (
    <main className="h-[calc(100dvh-70px)] overflow-hidden px-4 pt-3">
      <PosClient
        categories={categories}
        promptPayId={settings?.promptPayId ?? ""}
        promotions={promoLite}
        bahtPerPoint={settings?.bahtPerPoint ?? 25}
        pointValue={settings?.pointValue ?? 1}
      />
    </main>
  );
}
