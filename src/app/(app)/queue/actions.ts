"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function startMaking(saleId: string) {
  await requireSession(["OWNER", "STAFF"]);
  await prisma.sale.update({
    where: { id: saleId },
    data: { queueStatus: "MAKING", queueStartedAt: new Date() },
  });
  revalidatePath("/queue");
}

export async function markReady(saleId: string) {
  await requireSession(["OWNER", "STAFF"]);
  await prisma.sale.update({
    where: { id: saleId },
    data: { queueStatus: "READY", queueReadyAt: new Date() },
  });
  revalidatePath("/queue");
}

export async function markServed(saleId: string) {
  await requireSession(["OWNER", "STAFF"]);
  await prisma.sale.update({
    where: { id: saleId },
    data: { queueStatus: "SERVED", queueServedAt: new Date() },
  });
  revalidatePath("/queue");
}

export async function cancelQueue(saleId: string, reason: string) {
  await requireSession(["OWNER", "STAFF"]);
  await prisma.sale.update({
    where: { id: saleId },
    data: { queueStatus: "CANCELLED", cancelReason: reason || "ยกเลิกโดยพนักงาน" },
  });
  revalidatePath("/queue");
}
