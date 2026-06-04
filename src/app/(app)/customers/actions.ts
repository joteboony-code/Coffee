"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CustomerLite = {
  id: string;
  name: string;
  phone: string;
  points: number;
};

/** POS search — by phone or name. Returns lightweight rows. */
export async function searchCustomers(query: string): Promise<CustomerLite[]> {
  await requireSession(["OWNER", "STAFF"]);
  const q = query.trim();
  if (!q) return [];
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { phone: { contains: q } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { lastVisitAt: "desc" },
    take: 10,
    select: { id: true, name: true, phone: true, points: true },
  });
  return customers;
}

/** POS quick-add — returns the created/looked-up customer. */
export async function quickAddCustomer(name: string, phone: string): Promise<CustomerLite> {
  await requireSession(["OWNER", "STAFF"]);
  const cleanPhone = phone.trim();
  const cleanName = name.trim() || "ลูกค้า";
  if (!cleanPhone) throw new Error("กรุณากรอกเบอร์โทร");

  const existing = await prisma.customer.findUnique({ where: { phone: cleanPhone } });
  if (existing) {
    return { id: existing.id, name: existing.name, phone: existing.phone, points: existing.points };
  }
  const created = await prisma.customer.create({
    data: { name: cleanName, phone: cleanPhone },
    select: { id: true, name: true, phone: true, points: true },
  });
  revalidatePath("/customers");
  return created;
}

/** Full create/edit from /customers form (OWNER). */
export async function saveCustomer(formData: FormData) {
  await requireSession(["OWNER"]);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!name || !phone) throw new Error("กรุณากรอกชื่อและเบอร์โทร");

  if (id) {
    await prisma.customer.update({ where: { id }, data: { name, phone, note } });
  } else {
    await prisma.customer.create({ data: { name, phone, note } });
  }
  revalidatePath("/customers");
  redirect("/customers");
}

/** Manual point adjustment (OWNER). */
export async function adjustPoints(formData: FormData) {
  await requireSession(["OWNER"]);
  const customerId = String(formData.get("customerId") ?? "");
  const points = parseInt(String(formData.get("points") ?? "0"), 10) || 0;
  const note = String(formData.get("note") ?? "").trim();
  if (!customerId || points === 0) throw new Error("ข้อมูลไม่ถูกต้อง");

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.update({
      where: { id: customerId },
      data: { points: { increment: points } },
      select: { points: true },
    });
    const after = customer.points;
    await tx.customerPointMovement.create({
      data: {
        customerId,
        type: "ADJUST",
        points,
        beforePoints: after - points,
        afterPoints: after,
        note: note || "ปรับแต้มโดยเจ้าของร้าน",
      },
    });
  });
  revalidatePath(`/customers/${customerId}`);
}
