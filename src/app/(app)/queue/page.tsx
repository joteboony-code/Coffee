import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { bangkokDate } from "@/lib/queue";
import { QueueClient } from "@/app/(app)/queue/queue-client";

export const dynamic = "force-dynamic"; // always fresh

export default async function QueuePage() {
  await requireSession(["OWNER", "STAFF"]);

  const today = bangkokDate();

  const sales = await prisma.sale.findMany({
    where: { queueDate: today },
    orderBy: { queueNo: "asc" },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          options: {
            select: { groupName: true, optionName: true },
          },
        },
      },
    },
  });

  // Serialise for client (no Date objects)
  const queue = sales
    .filter((s) => s.queueNo !== null)
    .map((s) => ({
      id: s.id,
      queueNo: s.queueNo!,
      queueStatus: s.queueStatus as "NEW" | "MAKING" | "READY" | "SERVED" | "CANCELLED",
      createdAt: s.createdAt.toISOString(),
      queueStartedAt: s.queueStartedAt?.toISOString() ?? null,
      queueReadyAt: s.queueReadyAt?.toISOString() ?? null,
      note: s.note,
      cancelReason: s.cancelReason,
      items: s.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        options: i.options.map((o) => ({
          groupName: o.groupName,
          optionName: o.optionName,
        })),
      })),
    }));

  const activeCount = queue.filter((q) =>
    ["NEW", "MAKING", "READY"].includes(q.queueStatus),
  ).length;

  return (
    <main className="flex h-[calc(100dvh-70px)] flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">คิว</h1>
        <p className="text-lg text-[#74665a]">
          แอคทีฟ{" "}
          <span className="font-bold text-[#241f1a]">{activeCount}</span>
          {" "}/ วันนี้ {queue.length}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <QueueClient queue={queue} />
      </div>
    </main>
  );
}
