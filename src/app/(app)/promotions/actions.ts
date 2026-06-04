"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PromotionType } from "@prisma/client";

export async function savePromotion(formData: FormData) {
  await requireSession(["OWNER"]);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "FIXED_AMOUNT") as PromotionType;
  const value = parseInt(String(formData.get("value") ?? "0"), 10) || 0;
  const minSpend = parseInt(String(formData.get("minSpend") ?? "0"), 10) || 0;
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const note = String(formData.get("note") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "").trim();
  const endsAtRaw = String(formData.get("endsAt") ?? "").trim();

  if (!name) throw new Error("กรุณากรอกชื่อโปรโมชั่น");

  const data = {
    name,
    type,
    value,
    minSpend,
    isActive,
    note,
    startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
    endsAt: endsAtRaw ? new Date(endsAtRaw) : null,
  };

  if (id) {
    await prisma.promotion.update({ where: { id }, data });
  } else {
    await prisma.promotion.create({ data });
  }
  revalidatePath("/promotions");
  revalidatePath("/pos");
}

export async function togglePromotion(id: string, isActive: boolean) {
  await requireSession(["OWNER"]);
  await prisma.promotion.update({ where: { id }, data: { isActive } });
  revalidatePath("/promotions");
  revalidatePath("/pos");
}

export async function deletePromotion(id: string) {
  await requireSession(["OWNER"]);
  // Detach from any sales first (SetNull is automatic via FK, but be explicit)
  await prisma.promotion.delete({ where: { id } });
  revalidatePath("/promotions");
  revalidatePath("/pos");
}
