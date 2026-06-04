"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSession, requireSession, roleFromPin, setSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextReceiptNo } from "@/lib/receipt";
import { bangkokDate, formatQueueNo } from "@/lib/queue";
import {
  resolveItemNeeds,
  computeIngredientCost,
  getStockWarnings,
  deductIngredients,
  type IngredientNeed,
} from "@/lib/stock";
import type { PaymentMethod } from "@prisma/client";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const role = roleFromPin(pin);
  if (!role) redirect("/?error=pin");
  await setSession(role);
  redirect("/pos");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

// ─── Sale ─────────────────────────────────────────────────────────────────────

type SaleItemInput = {
  menuItemId: string;
  name: string;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  total: number;
  options: {
    modifierGroupId: string;
    modifierOptionId: string;
    groupName: string;
    optionName: string;
    priceDelta: number;
  }[];
};

type SalePayload = {
  paymentMethod: PaymentMethod;
  received?: number;
  items: SaleItemInput[];
  force?: boolean;
};

export type StockWarning = {
  ingredientName: string;
  unit: string;
  needed: number;
  available: number;
  shortage: number;
};

export type CreateSaleResult =
  | { ok: true; saleId: string; queueNo: string }
  | { ok: false; requiresConfirmation: true; warnings: StockWarning[] };

export async function createSale(payload: SalePayload): Promise<CreateSaleResult> {
  await requireSession(["OWNER", "STAFF"]);
  if (!payload.items.length) throw new Error("ไม่มีรายการในตะกร้า");

  const subtotal = payload.items.reduce((sum, item) => sum + item.total, 0);

  if (payload.paymentMethod === "CASH") {
    const received = payload.received ?? 0;
    if (received < subtotal) throw new Error("จำนวนเงินที่รับน้อยกว่ายอดรวม");
  }

  // ── Resolve ingredient needs per item ─────────────────────────────────────
  const itemNeedsMap: Map<string, IngredientNeed>[] = [];
  for (const item of payload.items) {
    const needs = await resolveItemNeeds(
      prisma,
      item.menuItemId,
      item.quantity,
      item.options.map((o) => o.modifierOptionId),
    );
    itemNeedsMap.push(needs);
  }

  // ── Stock check ───────────────────────────────────────────────────────────
  if (!payload.force) {
    const warnings = getStockWarnings(itemNeedsMap);
    if (warnings.length > 0) {
      return { ok: false, requiresConfirmation: true, warnings };
    }
  }

  // ── Build payment values ──────────────────────────────────────────────────
  const received = payload.paymentMethod === "CASH" ? (payload.received ?? 0) : undefined;
  const change = payload.paymentMethod === "CASH" ? (received ?? 0) - subtotal : undefined;
  const receiptNo = await nextReceiptNo();
  const queueDate = bangkokDate();

  // ── Create sale + deduct stock atomically ─────────────────────────────────
  const sale = await prisma.$transaction(async (tx) => {
    // Generate queue number inside the transaction (atomic, no reuse of cancelled)
    const latestQueue = await tx.sale.findFirst({
      where: { queueDate },
      orderBy: { queueNo: "desc" },
      select: { queueNo: true },
    });
    const queueSeq = latestQueue?.queueNo ? Number(latestQueue.queueNo.slice(1)) : 0;
    const queueNo = formatQueueNo(queueSeq + 1);

    const sale = await tx.sale.create({
      data: {
        receiptNo,
        paymentMethod: payload.paymentMethod,
        subtotal,
        total: subtotal,
        received,
        change,
        queueNo,
        queueDate,
        queueStatus: "NEW",
      },
    });

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      const needs = itemNeedsMap[i];
      const ingredientCost = computeIngredientCost(needs);

      const saleItem = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          basePrice: item.basePrice,
          unitPrice: item.unitPrice,
          total: item.total,
          ingredientCost,
          grossProfit: item.total - ingredientCost,
          options: {
            create: item.options.map((opt) => ({
              modifierGroupId: opt.modifierGroupId,
              modifierOptionId: opt.modifierOptionId,
              groupName: opt.groupName,
              optionName: opt.optionName,
              priceDelta: opt.priceDelta,
            })),
          },
        },
      });

      if (needs.size > 0) {
        await deductIngredients(tx, sale.id, saleItem.id, needs);
      }
    }

    return sale;
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/ingredients");
  revalidatePath("/queue");
  return { ok: true, saleId: sale.id, queueNo: sale.queueNo! };
}

// ─── Shop Settings ────────────────────────────────────────────────────────────

export async function updateShopSettings(formData: FormData) {
  await requireSession(["OWNER"]);
  await prisma.shopSetting.upsert({
    where: { id: "default" },
    update: {
      shopName: String(formData.get("shopName") ?? ""),
      address: String(formData.get("address") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      promptPayId: String(formData.get("promptPayId") ?? ""),
      receiptFooter: String(formData.get("receiptFooter") ?? ""),
    },
    create: {
      id: "default",
      shopName: String(formData.get("shopName") ?? "Coffee POS"),
      address: String(formData.get("address") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      promptPayId: String(formData.get("promptPayId") ?? ""),
      receiptFooter: String(formData.get("receiptFooter") ?? "ขอบคุณที่อุดหนุน"),
    },
  });
  revalidatePath("/settings");
}
