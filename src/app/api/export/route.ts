import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

// GET /api/export?type=sales&format=csv  (OWNER only)
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (session.role !== "OWNER") return NextResponse.json({ error: "เฉพาะเจ้าของร้าน" }, { status: 403 });

  const type = request.nextUrl.searchParams.get("type") ?? "sales";
  const stamp = new Date().toISOString().slice(0, 10);

  function csvResponse(filename: string, csv: string) {
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  switch (type) {
    case "sales": {
      const sales = await prisma.sale.findMany({ orderBy: { createdAt: "desc" } });
      const rows = sales.map((s) => ({
        receiptNo: s.receiptNo,
        queueNo: s.queueNo ?? "",
        status: s.status,
        paymentMethod: s.paymentMethod,
        subtotal: s.subtotal,
        discountAmount: s.discountAmount,
        total: s.total,
        received: s.received ?? "",
        change: s.change ?? "",
        cashierRole: s.cashierRole,
        customerId: s.customerId ?? "",
        pointsEarned: s.pointsEarned,
        pointsRedeemed: s.pointsRedeemed,
        createdAt: s.createdAt.toISOString(),
      }));
      return csvResponse(`sales_${stamp}.csv`, toCsv(rows));
    }
    case "sale-items": {
      const items = await prisma.saleItem.findMany({
        include: { sale: { select: { receiptNo: true, createdAt: true } }, options: true },
        orderBy: { id: "desc" },
        take: 5000,
      });
      const rows = items.map((i) => ({
        receiptNo: i.sale.receiptNo,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
        ingredientCost: Number(i.ingredientCost),
        grossProfit: Number(i.grossProfit),
        options: i.options.map((o) => `${o.groupName}:${o.optionName}`).join(" | "),
        createdAt: i.sale.createdAt.toISOString(),
      }));
      return csvResponse(`sale_items_${stamp}.csv`, toCsv(rows));
    }
    case "stock-movements": {
      const moves = await prisma.stockMovement.findMany({
        include: { ingredient: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      const rows = moves.map((m) => ({
        ingredient: m.ingredient.name,
        type: m.type,
        quantity: Number(m.quantity),
        beforeStock: Number(m.beforeStock),
        afterStock: Number(m.afterStock),
        unit: m.unit,
        costPerUnit: Number(m.costPerUnit),
        totalCost: Number(m.totalCost),
        saleId: m.saleId ?? "",
        staffName: m.staffName,
        note: m.note,
        createdAt: m.createdAt.toISOString(),
      }));
      return csvResponse(`stock_movements_${stamp}.csv`, toCsv(rows));
    }
    case "customers": {
      const customers = await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
      const rows = customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        points: c.points,
        totalSpend: c.totalSpend,
        totalOrders: c.totalOrders,
        lastVisitAt: c.lastVisitAt?.toISOString() ?? "",
        note: c.note,
        createdAt: c.createdAt.toISOString(),
      }));
      return csvResponse(`customers_${stamp}.csv`, toCsv(rows));
    }
    case "backup": {
      const [
        settings, categories, menuItems, modifierGroups, modifierOptions,
        sales, saleItems, saleItemOptions, ingredients, recipes, recipeItems,
        optionRecipeItems, stockMovements, customers, pointMovements, promotions,
      ] = await Promise.all([
        prisma.shopSetting.findMany(),
        prisma.category.findMany(),
        prisma.menuItem.findMany(),
        prisma.modifierGroup.findMany(),
        prisma.modifierOption.findMany(),
        prisma.sale.findMany(),
        prisma.saleItem.findMany(),
        prisma.saleItemOption.findMany(),
        prisma.ingredient.findMany(),
        prisma.recipe.findMany(),
        prisma.recipeItem.findMany(),
        prisma.optionRecipeItem.findMany(),
        prisma.stockMovement.findMany(),
        prisma.customer.findMany(),
        prisma.customerPointMovement.findMany(),
        prisma.promotion.findMany(),
      ]);
      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.3",
        data: {
          settings, categories, menuItems, modifierGroups, modifierOptions,
          sales, saleItems, saleItemOptions, ingredients, recipes, recipeItems,
          optionRecipeItems, stockMovements, customers, pointMovements, promotions,
        },
      };
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="coffee_pos_backup_${stamp}.json"`,
        },
      });
    }
    default:
      return NextResponse.json({ error: "ไม่รู้จักประเภทข้อมูล" }, { status: 400 });
  }
}
