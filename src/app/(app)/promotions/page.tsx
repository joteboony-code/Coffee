import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PromotionsClient } from "@/app/(app)/promotions/promotions-client";

export default async function PromotionsPage() {
  await requireSession(["OWNER"]);
  const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <PromotionsClient
        promotions={promotions.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          value: p.value,
          minSpend: p.minSpend,
          isActive: p.isActive,
          note: p.note,
        }))}
      />
    </main>
  );
}
