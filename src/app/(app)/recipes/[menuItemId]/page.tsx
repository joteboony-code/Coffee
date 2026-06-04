import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { RecipeEditor } from "@/app/(app)/recipes/[menuItemId]/recipe-editor";

export default async function RecipeDetailPage({ params }: { params: Promise<{ menuItemId: string }> }) {
  await requireSession(["OWNER"]);
  const { menuItemId } = await params;

  const [menuItem, ingredients] = await Promise.all([
    prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
        modifierGroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            modifierGroup: {
              include: {
                options: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    optionRecipeItems: {
                      include: { ingredient: true },
                    },
                  },
                },
              },
            },
          },
        },
        recipes: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: {
            items: {
              include: { ingredient: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    }),
    prisma.ingredient.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, costPerUnit: true },
    }),
  ]);

  if (!menuItem) notFound();

  // Flatten all modifier options for the new-recipe form
  const allOptions = menuItem.modifierGroups.flatMap((mg) =>
    mg.modifierGroup.options.map((o) => ({
      id: o.id,
      name: o.name,
      groupName: mg.modifierGroup.name,
      groupId: mg.modifierGroup.id,
    })),
  );

  // Flatten modifier options (with existing optionRecipeItems) for option extras section
  const modifierOptions = menuItem.modifierGroups.flatMap((mg) =>
    mg.modifierGroup.options.map((o) => ({
      id: o.id,
      name: o.name,
      groupName: mg.modifierGroup.name,
      priceDelta: o.priceDelta,
      optionRecipeItems: o.optionRecipeItems.map((ori) => ({
        id: ori.id,
        ingredientId: ori.ingredientId,
        ingredientName: ori.ingredient.name,
        quantity: Number(ori.quantity),
        unit: ori.unit,
        costPerUnit: Number(ori.ingredient.costPerUnit),
      })),
    })),
  );

  const serializedRecipes = menuItem.recipes.map((r) => ({
    id: r.id,
    name: r.name,
    isDefault: r.isDefault,
    drinkTypeOptionId: r.drinkTypeOptionId,
    sizeOptionId: r.sizeOptionId,
    items: r.items.map((ri) => ({
      id: ri.id,
      ingredientId: ri.ingredientId,
      ingredientName: ri.ingredient.name,
      quantity: Number(ri.quantity),
      unit: ri.unit,
      costPerUnit: Number(ri.ingredient.costPerUnit),
    })),
  }));

  const serializedIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    costPerUnit: Number(i.costPerUnit),
  }));

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-5 flex items-center gap-4">
        <Link href="/recipes" className="text-lg font-semibold text-[#74665a] hover:text-[#4b3427]">← สูตร</Link>
        <div>
          <h1 className="text-3xl font-bold">{menuItem.name}</h1>
          <p className="text-lg text-[#74665a]">{menuItem.category.name}</p>
        </div>
      </div>

      <RecipeEditor
        menuItemId={menuItemId}
        recipes={serializedRecipes}
        ingredients={serializedIngredients}
        allOptions={allOptions}
        modifierOptions={modifierOptions}
      />
    </main>
  );
}
