import type { PrismaClient } from "@prisma/client";

export type IngredientNeed = {
  ingredientId: string;
  name: string;
  unit: string;
  quantity: number; // total quantity needed (already × item qty)
  costPerUnit: number;
  currentStock: number;
};

export type StockWarning = {
  ingredientName: string;
  unit: string;
  needed: number;
  available: number;
  shortage: number;
};

// Type for a Prisma transaction client (subset of PrismaClient)
type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Resolve ingredient needs for a single sale item.
 * Finds the best-matching recipe, then adds any modifier option extras.
 */
export async function resolveItemNeeds(
  db: PrismaClient | Tx,
  menuItemId: string,
  saleItemQty: number,
  selectedOptionIds: string[],
): Promise<Map<string, IngredientNeed>> {
  const needs = new Map<string, IngredientNeed>();
  const selectedSet = new Set(selectedOptionIds);

  function addNeed(
    ingredientId: string,
    name: string,
    unit: string,
    qty: number,
    costPerUnit: number,
    currentStock: number,
  ) {
    const existing = needs.get(ingredientId);
    if (existing) {
      existing.quantity += qty;
    } else {
      needs.set(ingredientId, { ingredientId, name, unit, quantity: qty, costPerUnit, currentStock });
    }
  }

  // ── 1. Find best matching recipe ─────────────────────────────────────────
  const recipes = await db.recipe.findMany({
    where: { menuItemId, isActive: true },
    include: { items: { include: { ingredient: true } } },
  });

  function scoreRecipe(r: (typeof recipes)[0]): number {
    const drinkOk = r.drinkTypeOptionId === null || selectedSet.has(r.drinkTypeOptionId);
    const sizeOk = r.sizeOptionId === null || selectedSet.has(r.sizeOptionId);
    if (!drinkOk || !sizeOk) return -1;
    // More specific = higher score
    let score = r.isDefault ? 0 : 10;
    if (r.drinkTypeOptionId !== null) score += 2;
    if (r.sizeOptionId !== null) score += 1;
    return score;
  }

  const bestRecipe = recipes
    .map((r) => ({ recipe: r, score: scoreRecipe(r) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.recipe;

  if (bestRecipe) {
    for (const item of bestRecipe.items) {
      addNeed(
        item.ingredientId,
        item.ingredient.name,
        item.unit,
        Number(item.quantity) * saleItemQty,
        Number(item.ingredient.costPerUnit),
        Number(item.ingredient.currentStock),
      );
    }
  }

  // ── 2. Add option extras ─────────────────────────────────────────────────
  if (selectedOptionIds.length > 0) {
    const optionItems = await db.optionRecipeItem.findMany({
      where: { modifierOptionId: { in: selectedOptionIds } },
      include: { ingredient: true },
    });
    for (const item of optionItems) {
      addNeed(
        item.ingredientId,
        item.ingredient.name,
        item.unit,
        Number(item.quantity) * saleItemQty,
        Number(item.ingredient.costPerUnit),
        Number(item.ingredient.currentStock),
      );
    }
  }

  return needs;
}

/** Sum ingredient cost from a needs map. */
export function computeIngredientCost(needs: Map<string, IngredientNeed>): number {
  let total = 0;
  for (const n of needs.values()) total += n.quantity * n.costPerUnit;
  return total;
}

/** Return warnings for ingredients below their required quantity. */
export function getStockWarnings(needsMaps: Map<string, IngredientNeed>[]): StockWarning[] {
  // Aggregate across all items
  const agg = new Map<string, IngredientNeed>();
  for (const needs of needsMaps) {
    for (const [id, need] of needs) {
      const ex = agg.get(id);
      if (ex) {
        ex.quantity += need.quantity;
      } else {
        agg.set(id, { ...need });
      }
    }
  }

  const warnings: StockWarning[] = [];
  for (const need of agg.values()) {
    if (need.currentStock < need.quantity) {
      warnings.push({
        ingredientName: need.name,
        unit: need.unit,
        needed: Math.round(need.quantity * 100) / 100,
        available: Math.round(need.currentStock * 100) / 100,
        shortage: Math.round((need.quantity - need.currentStock) * 100) / 100,
      });
    }
  }
  return warnings;
}

/**
 * Deduct ingredients inside a Prisma transaction.
 * Creates StockMovement records for each deduction.
 * Returns the total ingredient cost deducted.
 */
export async function deductIngredients(
  tx: Tx,
  saleId: string,
  saleItemId: string,
  needs: Map<string, IngredientNeed>,
): Promise<number> {
  let totalCost = 0;

  for (const need of needs.values()) {
    if (need.quantity === 0) continue;
    const cost = need.quantity * need.costPerUnit;
    totalCost += cost;

    // Update stock (may go negative – allowed in v1.2)
    const updated = await tx.ingredient.update({
      where: { id: need.ingredientId },
      data: { currentStock: { decrement: need.quantity } },
      select: { currentStock: true },
    });

    const afterStock = Number(updated.currentStock);
    const beforeStock = afterStock + need.quantity;

    await tx.stockMovement.create({
      data: {
        ingredientId: need.ingredientId,
        type: "SALE",
        quantity: -need.quantity, // negative = deduction
        beforeStock,
        afterStock,
        unit: need.unit,
        costPerUnit: need.costPerUnit,
        totalCost: cost,
        saleId,
        saleItemId,
      },
    });
  }

  return totalCost;
}
