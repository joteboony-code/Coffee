"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Recipe CRUD ─────────────────────────────────────────────────────────────

export async function createRecipe(formData: FormData) {
  await requireSession(["OWNER"]);

  const menuItemId = String(formData.get("menuItemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const drinkTypeOptionId = String(formData.get("drinkTypeOptionId") ?? "").trim() || null;
  const sizeOptionId = String(formData.get("sizeOptionId") ?? "").trim() || null;
  const isDefault = formData.get("isDefault") === "true";

  if (!menuItemId) throw new Error("ไม่พบเมนู");

  await prisma.recipe.create({
    data: { menuItemId, name, drinkTypeOptionId, sizeOptionId, isDefault },
  });

  revalidatePath(`/recipes/${menuItemId}`);
}

export async function deleteRecipe(formData: FormData) {
  await requireSession(["OWNER"]);
  const recipeId = String(formData.get("recipeId") ?? "");
  const menuItemId = String(formData.get("menuItemId") ?? "");
  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath(`/recipes/${menuItemId}`);
}

// ─── RecipeItem CRUD ──────────────────────────────────────────────────────────

export async function upsertRecipeItem(formData: FormData) {
  await requireSession(["OWNER"]);

  const recipeId = String(formData.get("recipeId") ?? "");
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const quantity = parseFloat(String(formData.get("quantity") ?? "0"));
  const unit = String(formData.get("unit") ?? "");
  const menuItemId = String(formData.get("menuItemId") ?? "");

  if (!recipeId || !ingredientId || quantity <= 0) throw new Error("ข้อมูลไม่ครบถ้วน");

  await prisma.recipeItem.upsert({
    where: { recipeId_ingredientId: { recipeId, ingredientId } },
    update: { quantity, unit },
    create: { recipeId, ingredientId, quantity, unit },
  });

  revalidatePath(`/recipes/${menuItemId}`);
}

export async function deleteRecipeItem(formData: FormData) {
  await requireSession(["OWNER"]);
  const id = String(formData.get("id") ?? "");
  const menuItemId = String(formData.get("menuItemId") ?? "");
  await prisma.recipeItem.delete({ where: { id } });
  revalidatePath(`/recipes/${menuItemId}`);
}

// ─── OptionRecipeItem CRUD ────────────────────────────────────────────────────

export async function upsertOptionRecipeItem(formData: FormData) {
  await requireSession(["OWNER"]);

  const modifierOptionId = String(formData.get("modifierOptionId") ?? "");
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const quantity = parseFloat(String(formData.get("quantity") ?? "0"));
  const unit = String(formData.get("unit") ?? "");
  const menuItemId = String(formData.get("menuItemId") ?? "");

  if (!modifierOptionId || !ingredientId || quantity <= 0) throw new Error("ข้อมูลไม่ครบถ้วน");

  await prisma.optionRecipeItem.upsert({
    where: { modifierOptionId_ingredientId: { modifierOptionId, ingredientId } },
    update: { quantity, unit },
    create: { modifierOptionId, ingredientId, quantity, unit },
  });

  revalidatePath(`/recipes/${menuItemId}`);
}

export async function deleteOptionRecipeItem(formData: FormData) {
  await requireSession(["OWNER"]);
  const id = String(formData.get("id") ?? "");
  const menuItemId = String(formData.get("menuItemId") ?? "");
  await prisma.optionRecipeItem.delete({ where: { id } });
  revalidatePath(`/recipes/${menuItemId}`);
}
