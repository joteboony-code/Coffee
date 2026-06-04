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
                  include: {
                    options: { orderBy: { sortOrder: "asc" } },
                  },
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
    <main className="mx-auto max-w-[1400px] p-4">
      <PosClient categories={categories} promptPayId={settings?.promptPayId ?? ""} />
    </main>
  );
}
