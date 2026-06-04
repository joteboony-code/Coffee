"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearSession, requireSession, roleFromPin, setSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextReceiptNo } from "@/lib/receipt";
import { bangkokDate, formatQueueNo } from "@/lib/queue";
import { isPromoEligible, promoDiscount, type PromoLite } from "@/lib/promo";
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
  customerId?: string | null;
  promotionId?: string | null;
  redeemPoints?: number;
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
  const session = await requireSession(["OWNER", "STAFF"]);
  if (!payload.items.length) throw new Error("ไม่มีรายการในตะกร้า");

  const subtotal = payload.items.reduce((sum, item) => sum + item.total, 0);

  // ── Load settings + customer + promotion (server-side validation) ─────────
  const [settings, customer, promotion] = await Promise.all([
    prisma.shopSetting.findUnique({ where: { id: "default" } }),
    payload.customerId ? prisma.customer.findUnique({ where: { id: payload.customerId } }) : null,
    payload.promotionId ? prisma.promotion.findUnique({ where: { id: payload.promotionId } }) : null,
  ]);

  const bahtPerPoint = settings?.bahtPerPoint ?? 25;
  const pointValue = settings?.pointValue ?? 1;

  // ── Promotion discount (re-validated server-side) ─────────────────────────
  let promoDisc = 0;
  let discountType: string | null = null;
  let discountValue = 0;
  let validPromotionId: string | null = null;
  if (promotion) {
    const lite: PromoLite = {
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      value: promotion.value,
      minSpend: promotion.minSpend,
      startsAt: promotion.startsAt?.toISOString() ?? null,
      endsAt: promotion.endsAt?.toISOString() ?? null,
      isActive: promotion.isActive,
    };
    if (isPromoEligible(lite, subtotal)) {
      promoDisc = promoDiscount(lite, subtotal);
      discountType = promotion.type;
      discountValue = promotion.value;
      validPromotionId = promotion.id;
    }
  }

  // ── Points redemption ─────────────────────────────────────────────────────
  let redeemPoints = Math.max(0, Math.floor(payload.redeemPoints ?? 0));
  if (!customer) redeemPoints = 0;
  if (customer) redeemPoints = Math.min(redeemPoints, customer.points);
  const remainingAfterPromo = Math.max(0, subtotal - promoDisc);
  let pointsDisc = redeemPoints * pointValue;
  if (pointsDisc > remainingAfterPromo) {
    pointsDisc = remainingAfterPromo;
    redeemPoints = pointValue > 0 ? Math.ceil(pointsDisc / pointValue) : 0;
  }
  if (redeemPoints > 0 && !discountType) discountType = "POINTS";

  const discountAmount = promoDisc + pointsDisc;
  const total = Math.max(0, subtotal - discountAmount);

  // ── Cash validation against final total ───────────────────────────────────
  if (payload.paymentMethod === "CASH") {
    const received = payload.received ?? 0;
    if (received < total) throw new Error("จำนวนเงินที่รับน้อยกว่ายอดรวม");
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

  // ── Stock check (skippable with force, respecting policy) ─────────────────
  const allowNegative = settings?.allowNegativeStock ?? true;
  if (!payload.force) {
    const warnings = getStockWarnings(itemNeedsMap);
    if (warnings.length > 0) {
      if (!allowNegative) {
        throw new Error("วัตถุดิบไม่เพียงพอ และร้านตั้งค่าไม่อนุญาตให้สต็อกติดลบ");
      }
      return { ok: false, requiresConfirmation: true, warnings };
    }
  }

  const received = payload.paymentMethod === "CASH" ? (payload.received ?? 0) : undefined;
  const change = payload.paymentMethod === "CASH" ? (received ?? 0) - total : undefined;
  const receiptNo = await nextReceiptNo();
  const queueDate = bangkokDate();
  const pointsEarned = customer ? Math.floor(total / bahtPerPoint) : 0;

  // ── Atomic: sale + stock deduction + loyalty ──────────────────────────────
  const sale = await prisma.$transaction(async (tx) => {
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
        discountType,
        discountValue,
        discountAmount,
        promotionId: validPromotionId,
        total,
        received,
        change,
        cashierRole: session.role,
        customerId: customer?.id ?? null,
        pointsEarned,
        pointsRedeemed: redeemPoints,
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

    // ── Loyalty updates ─────────────────────────────────────────────────────
    if (customer) {
      let pts = customer.points;
      if (redeemPoints > 0) {
        const before = pts;
        pts -= redeemPoints;
        await tx.customerPointMovement.create({
          data: {
            customerId: customer.id,
            saleId: sale.id,
            type: "REDEEM",
            points: -redeemPoints,
            beforePoints: before,
            afterPoints: pts,
            note: `แลกแต้มเป็นส่วนลด ${pointsDisc} บาท`,
          },
        });
      }
      if (pointsEarned > 0) {
        const before = pts;
        pts += pointsEarned;
        await tx.customerPointMovement.create({
          data: {
            customerId: customer.id,
            saleId: sale.id,
            type: "EARN",
            points: pointsEarned,
            beforePoints: before,
            afterPoints: pts,
            note: `ได้รับแต้มจากยอดซื้อ ${total} บาท`,
          },
        });
      }
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          points: pts,
          totalSpend: { increment: total },
          totalOrders: { increment: 1 },
          lastVisitAt: new Date(),
        },
      });
    }

    return sale;
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/ingredients");
  revalidatePath("/queue");
  if (customer) revalidatePath(`/customers/${customer.id}`);
  return { ok: true, saleId: sale.id, queueNo: sale.queueNo! };
}

// ─── Shop Settings ────────────────────────────────────────────────────────────

export async function updateShopSettings(formData: FormData) {
  await requireSession(["OWNER"]);
  const base = {
    shopName: String(formData.get("shopName") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    promptPayId: String(formData.get("promptPayId") ?? ""),
    receiptFooter: String(formData.get("receiptFooter") ?? ""),
    bahtPerPoint: Math.max(1, parseInt(String(formData.get("bahtPerPoint") ?? "25"), 10) || 25),
    pointValue: Math.max(1, parseInt(String(formData.get("pointValue") ?? "1"), 10) || 1),
    allowNegativeStock: formData.get("allowNegativeStock") === "on" || formData.get("allowNegativeStock") === "true",
  };
  await prisma.shopSetting.upsert({
    where: { id: "default" },
    update: base,
    create: { id: "default", ...base },
  });
  revalidatePath("/settings");
  revalidatePath("/pos");
}
