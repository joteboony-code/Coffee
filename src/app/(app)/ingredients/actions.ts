"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Create / Update ─────────────────────────────────────────────────────────

export async function saveIngredient(formData: FormData) {
  await requireSession(["OWNER"]);

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const unit = String(formData.get("unit") ?? "g").trim();
  const costPerUnit = parseFloat(String(formData.get("costPerUnit") ?? "0")) || 0;
  const lowStockThreshold = parseFloat(String(formData.get("lowStockThreshold") ?? "0")) || 0;
  const isActive = formData.get("isActive") !== "false";
  const note = String(formData.get("note") ?? "").trim();

  if (!name) throw new Error("กรุณากรอกชื่อวัตถุดิบ");

  if (id) {
    await prisma.ingredient.update({
      where: { id },
      data: { name, category, unit, costPerUnit, lowStockThreshold, isActive, note },
    });
  } else {
    await prisma.ingredient.create({
      data: { name, category, unit, costPerUnit, lowStockThreshold, isActive, note, currentStock: 0 },
    });
  }

  revalidatePath("/ingredients");
  redirect("/ingredients");
}

// ─── Stock Movements ─────────────────────────────────────────────────────────

export async function receiveStock(formData: FormData) {
  await requireSession(["OWNER"]);

  const ingredientId = String(formData.get("ingredientId") ?? "");
  const qty = parseFloat(String(formData.get("quantity") ?? "0"));
  const costPerUnit = parseFloat(String(formData.get("costPerUnit") ?? "0"));
  const note = String(formData.get("note") ?? "").trim();

  if (!ingredientId || qty <= 0) throw new Error("ข้อมูลไม่ครบถ้วน");

  await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: {
        currentStock: { increment: qty },
        costPerUnit, // update cost per unit on receive
      },
      select: { currentStock: true, unit: true },
    });

    const afterStock = Number(ingredient.currentStock);
    const beforeStock = afterStock - qty;

    await tx.stockMovement.create({
      data: {
        ingredientId,
        type: "RECEIVE",
        quantity: qty,
        beforeStock,
        afterStock,
        unit: ingredient.unit,
        costPerUnit,
        totalCost: qty * costPerUnit,
        note,
      },
    });
  });

  revalidatePath("/ingredients");
  revalidatePath("/stock/movements");
}

export async function adjustStock(formData: FormData) {
  await requireSession(["OWNER"]);

  const ingredientId = String(formData.get("ingredientId") ?? "");
  const direction = String(formData.get("direction") ?? "add"); // "add" | "subtract"
  const qty = parseFloat(String(formData.get("quantity") ?? "0"));
  const note = String(formData.get("note") ?? "").trim();

  if (!ingredientId || qty <= 0) throw new Error("ข้อมูลไม่ครบถ้วน");

  const signedQty = direction === "subtract" ? -qty : qty;

  await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: { increment: signedQty } },
      select: { currentStock: true, unit: true, costPerUnit: true },
    });

    const afterStock = Number(ingredient.currentStock);
    const beforeStock = afterStock - signedQty;

    await tx.stockMovement.create({
      data: {
        ingredientId,
        type: "ADJUST",
        quantity: signedQty,
        beforeStock,
        afterStock,
        unit: ingredient.unit,
        costPerUnit: Number(ingredient.costPerUnit),
        totalCost: qty * Number(ingredient.costPerUnit),
        note: note || (direction === "subtract" ? "ปรับลดสต็อก" : "ปรับเพิ่มสต็อก"),
      },
    });
  });

  revalidatePath("/ingredients");
  revalidatePath("/stock/movements");
}

export async function recordWaste(formData: FormData) {
  await requireSession(["OWNER"]);

  const ingredientId = String(formData.get("ingredientId") ?? "");
  const qty = parseFloat(String(formData.get("quantity") ?? "0"));
  const note = String(formData.get("note") ?? "").trim();

  if (!ingredientId || qty <= 0) throw new Error("ข้อมูลไม่ครบถ้วน");

  await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: { decrement: qty } },
      select: { currentStock: true, unit: true, costPerUnit: true },
    });

    const afterStock = Number(ingredient.currentStock);
    const beforeStock = afterStock + qty;

    await tx.stockMovement.create({
      data: {
        ingredientId,
        type: "WASTE",
        quantity: -qty,
        beforeStock,
        afterStock,
        unit: ingredient.unit,
        costPerUnit: Number(ingredient.costPerUnit),
        totalCost: qty * Number(ingredient.costPerUnit),
        note: note || "บันทึกของเสีย",
      },
    });
  });

  revalidatePath("/ingredients");
  revalidatePath("/stock/movements");
}
