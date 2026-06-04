"use client";

import { useState } from "react";
import { ChefHat, Plus, Trash2, X } from "lucide-react";
import {
  createRecipe,
  deleteRecipe,
  upsertRecipeItem,
  deleteRecipeItem,
  upsertOptionRecipeItem,
  deleteOptionRecipeItem,
} from "@/app/(app)/recipes/actions";

type RecipeItemData = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
};

type RecipeData = {
  id: string;
  name: string;
  isDefault: boolean;
  drinkTypeOptionId: string | null;
  sizeOptionId: string | null;
  items: RecipeItemData[];
};

type OptionData = {
  id: string;
  name: string;
  groupName: string;
  groupId: string;
};

type ModifierOptionData = {
  id: string;
  name: string;
  groupName: string;
  priceDelta: number;
  optionRecipeItems: RecipeItemData[];
};

type IngredientRef = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
};

function recipeCost(items: RecipeItemData[]) {
  return items.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);
}

function recipeLabel(recipe: RecipeData, allOptions: OptionData[]) {
  if (recipe.isDefault) return "สูตรเริ่มต้น";
  const labels: string[] = [];
  if (recipe.drinkTypeOptionId) {
    const o = allOptions.find((o) => o.id === recipe.drinkTypeOptionId);
    if (o) labels.push(o.name);
  }
  if (recipe.sizeOptionId) {
    const o = allOptions.find((o) => o.id === recipe.sizeOptionId);
    if (o) labels.push(o.name);
  }
  return labels.length ? labels.join(" · ") : recipe.name || "ไม่มีชื่อ";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function RecipeEditor({
  menuItemId,
  recipes,
  ingredients,
  allOptions,
  modifierOptions,
}: {
  menuItemId: string;
  recipes: RecipeData[];
  ingredients: IngredientRef[];
  allOptions: OptionData[];
  modifierOptions: ModifierOptionData[];
}) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    recipes[0]?.id ?? null,
  );
  const [showNewRecipeForm, setShowNewRecipeForm] = useState(recipes.length === 0);
  const [showAddIngredient, setShowAddIngredient] = useState(false);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) ?? null;

  return (
    <div className="grid grid-cols-[320px_1fr] gap-5">
      {/* ── Left: Recipe list ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">สูตรทั้งหมด</h2>
        {recipes.map((recipe) => {
          const cost = recipeCost(recipe.items);
          const active = recipe.id === selectedRecipeId;
          return (
            <button
              key={recipe.id}
              onClick={() => { setSelectedRecipeId(recipe.id); setShowAddIngredient(false); }}
              className={`w-full rounded-2xl border-2 p-4 text-left transition-colors ${
                active ? "border-[#4b3427] bg-[#f0e5d7]" : "border-[#ded1be] bg-white hover:border-[#4b3427]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">{recipeLabel(recipe, allOptions)}</p>
                  {recipe.isDefault && <span className="text-xs text-[#74665a]">สูตรเริ่มต้น</span>}
                </div>
                <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                  {recipe.items.length} รายการ
                </span>
              </div>
              {cost > 0 && (
                <p className="mt-1 text-sm text-[#74665a]">ต้นทุน ≈ ฿{cost.toFixed(2)}</p>
              )}
            </button>
          );
        })}

        <button
          onClick={() => setShowNewRecipeForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ded1be] py-3 text-base font-bold text-[#74665a] hover:border-[#4b3427] hover:text-[#4b3427]"
        >
          <Plus size={18} /> เพิ่มสูตรใหม่
        </button>

        {showNewRecipeForm && (
          <NewRecipeForm
            menuItemId={menuItemId}
            allOptions={allOptions}
            onClose={() => setShowNewRecipeForm(false)}
          />
        )}
      </div>

      {/* ── Right: Recipe detail ──────────────────────────────────────── */}
      <div className="space-y-5">
        {!selectedRecipe ? (
          <div className="rounded-2xl border border-dashed border-[#ded1be] p-12 text-center">
            <ChefHat size={40} className="mx-auto mb-4 text-[#c9b9a6]" />
            <p className="text-xl text-[#74665a]">เลือกสูตรจากรายการซ้าย หรือสร้างสูตรใหม่</p>
          </div>
        ) : (
          <RecipeDetail
            menuItemId={menuItemId}
            recipe={selectedRecipe}
            ingredients={ingredients}
            allOptions={allOptions}
            showAddIngredient={showAddIngredient}
            setShowAddIngredient={setShowAddIngredient}
            onDeleted={() => setSelectedRecipeId(null)}
          />
        )}

        {/* Option Extras section */}
        {modifierOptions.some((o) => o.priceDelta > 0 || o.optionRecipeItems.length > 0) && (
          <OptionExtrasSection
            menuItemId={menuItemId}
            modifierOptions={modifierOptions}
            ingredients={ingredients}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NewRecipeForm({
  menuItemId,
  allOptions,
  onClose,
}: {
  menuItemId: string;
  allOptions: OptionData[];
  onClose: () => void;
}) {
  const [isDefault, setIsDefault] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-[#4b3427] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-bold">สร้างสูตรใหม่</p>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <form action={async (fd) => { await createRecipe(fd); onClose(); }} className="space-y-3">
        <input type="hidden" name="menuItemId" value={menuItemId} />
        <input type="hidden" name="isDefault" value={String(isDefault)} />

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-5 w-5 rounded" />
          <span className="font-semibold">สูตรเริ่มต้น (ใช้เมื่อไม่ตรงสูตรอื่น)</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">ชื่อสูตร (ถ้ามี)</span>
          <input name="name" className="h-11 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]" />
        </label>

        {!isDefault && (
          <>
            <SelectField name="drinkTypeOptionId" label="ตัวเลือกประเภทเครื่องดื่ม" options={allOptions} />
            <SelectField name="sizeOptionId" label="ตัวเลือกขนาด" options={allOptions} />
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl bg-[#f0e5d7] text-sm font-bold text-[#4b3427]">ยกเลิก</button>
          <button type="submit" className="h-11 rounded-xl bg-[#4b3427] text-sm font-bold text-white">สร้างสูตร</button>
        </div>
      </form>
    </div>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: OptionData[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <select name={name} className="h-11 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]">
        <option value="">— ไม่ระบุ —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.groupName}: {o.name}</option>
        ))}
      </select>
    </label>
  );
}

function RecipeDetail({
  menuItemId,
  recipe,
  ingredients,
  allOptions,
  showAddIngredient,
  setShowAddIngredient,
  onDeleted,
}: {
  menuItemId: string;
  recipe: RecipeData;
  ingredients: IngredientRef[];
  allOptions: OptionData[];
  showAddIngredient: boolean;
  setShowAddIngredient: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const cost = recipeCost(recipe.items);

  return (
    <section className="rounded-2xl border border-[#ded1be] bg-white">
      <div className="flex items-center justify-between border-b border-[#eadfce] px-5 py-4">
        <div>
          <h3 className="text-2xl font-bold">{recipeLabel(recipe, allOptions)}</h3>
          {cost > 0 && <p className="text-[#74665a]">ต้นทุน ≈ ฿{cost.toFixed(2)}</p>}
        </div>
        <form action={async (fd) => { await deleteRecipe(fd); onDeleted(); }}>
          <input type="hidden" name="recipeId" value={recipe.id} />
          <input type="hidden" name="menuItemId" value={menuItemId} />
          <button type="submit" className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100">
            <Trash2 size={15} /> ลบสูตร
          </button>
        </form>
      </div>

      {/* Ingredient list */}
      <div className="p-4 space-y-2">
        {recipe.items.length === 0 ? (
          <p className="py-4 text-center text-[#74665a]">ยังไม่มีวัตถุดิบ</p>
        ) : (
          recipe.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[#f7f2ea] px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold">{item.ingredientName}</p>
                <p className="text-sm text-[#74665a]">
                  {item.quantity} {item.unit} · ฿{(item.quantity * item.costPerUnit).toFixed(2)}
                </p>
              </div>
              <form action={deleteRecipeItem}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="menuItemId" value={menuItemId} />
                <button type="submit" className="grid h-9 w-9 place-items-center rounded-lg bg-white text-red-500 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          ))
        )}

        {showAddIngredient ? (
          <AddIngredientForm
            recipeId={recipe.id}
            menuItemId={menuItemId}
            ingredients={ingredients}
            onClose={() => setShowAddIngredient(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddIngredient(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#ded1be] py-3 text-base font-bold text-[#74665a] hover:border-[#4b3427] hover:text-[#4b3427]"
          >
            <Plus size={18} /> เพิ่มวัตถุดิบ
          </button>
        )}
      </div>
    </section>
  );
}

function AddIngredientForm({
  recipeId,
  menuItemId,
  ingredients,
  onClose,
}: {
  recipeId: string;
  menuItemId: string;
  ingredients: IngredientRef[];
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState(ingredients[0]?.id ?? "");
  const selectedIng = ingredients.find((i) => i.id === selectedId);

  return (
    <form action={async (fd) => { await upsertRecipeItem(fd); onClose(); }} className="rounded-xl border-2 border-[#4b3427] bg-white p-4 space-y-3">
      <input type="hidden" name="recipeId" value={recipeId} />
      <input type="hidden" name="menuItemId" value={menuItemId} />
      {selectedIng && <input type="hidden" name="unit" value={selectedIng.unit} />}

      <label className="block">
        <span className="mb-1 block text-sm font-bold">วัตถุดิบ</span>
        <select name="ingredientId" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
          className="h-11 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]">
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-bold">จำนวน ({selectedIng?.unit ?? ""})</span>
        <input name="quantity" type="number" min="0.01" step="0.01" required
          className="h-11 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]" />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onClose} className="h-11 rounded-xl bg-[#f0e5d7] text-sm font-bold text-[#4b3427]">ยกเลิก</button>
        <button type="submit" className="h-11 rounded-xl bg-[#4b3427] text-sm font-bold text-white">เพิ่ม</button>
      </div>
    </form>
  );
}

// ─── Option Extras ────────────────────────────────────────────────────────────

function OptionExtrasSection({
  menuItemId,
  modifierOptions,
  ingredients,
}: {
  menuItemId: string;
  modifierOptions: ModifierOptionData[];
  ingredients: IngredientRef[];
}) {
  return (
    <section className="rounded-2xl border border-[#ded1be] bg-white">
      <div className="border-b border-[#eadfce] px-5 py-4">
        <h3 className="text-2xl font-bold">วัตถุดิบเพิ่มเติมจากตัวเลือก</h3>
        <p className="text-[#74665a]">เช่น เพิ่มช็อต → ใช้เมล็ดกาแฟเพิ่ม</p>
      </div>
      <div className="divide-y divide-[#eadfce]">
        {modifierOptions.map((option) => (
          <OptionExtraRow
            key={option.id}
            menuItemId={menuItemId}
            option={option}
            ingredients={ingredients}
          />
        ))}
      </div>
    </section>
  );
}

function OptionExtraRow({
  menuItemId,
  option,
  ingredients,
}: {
  menuItemId: string;
  option: ModifierOptionData;
  ingredients: IngredientRef[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedId, setSelectedId] = useState(ingredients[0]?.id ?? "");
  const selectedIng = ingredients.find((i) => i.id === selectedId);

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex-1">
          <p className="font-bold">{option.name}</p>
          <p className="text-sm text-[#74665a]">{option.groupName}</p>
        </div>
      </div>

      <div className="space-y-2 pl-1">
        {option.optionRecipeItems.map((ori) => (
          <div key={ori.id} className="flex items-center gap-3 rounded-xl bg-[#f7f2ea] px-4 py-3">
            <div className="flex-1">
              <p className="font-bold text-sm">{ori.ingredientName}</p>
              <p className="text-xs text-[#74665a]">{ori.quantity} {ori.unit} · ฿{(ori.quantity * ori.costPerUnit).toFixed(2)}</p>
            </div>
            <form action={deleteOptionRecipeItem}>
              <input type="hidden" name="id" value={ori.id} />
              <input type="hidden" name="menuItemId" value={menuItemId} />
              <button type="submit" className="grid h-8 w-8 place-items-center rounded-lg bg-white text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </form>
          </div>
        ))}

        {showAdd ? (
          <form action={async (fd) => { await upsertOptionRecipeItem(fd); setShowAdd(false); }} className="rounded-xl border-2 border-[#4b3427] bg-white p-3 space-y-2">
            <input type="hidden" name="modifierOptionId" value={option.id} />
            <input type="hidden" name="menuItemId" value={menuItemId} />
            {selectedIng && <input type="hidden" name="unit" value={selectedIng.unit} />}
            <select name="ingredientId" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
              className="h-10 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-sm outline-none focus:border-[#4b3427]">
              {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
            <input name="quantity" type="number" min="0.01" step="0.01" required placeholder={`จำนวน (${selectedIng?.unit})`}
              className="h-10 w-full rounded-xl border-2 border-[#d8c8b5] px-3 text-sm outline-none focus:border-[#4b3427]" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="h-9 rounded-xl bg-[#f0e5d7] text-sm font-bold text-[#4b3427]">ยกเลิก</button>
              <button type="submit" className="h-9 rounded-xl bg-[#4b3427] text-sm font-bold text-white">เพิ่ม</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 rounded-xl border border-dashed border-[#ded1be] px-3 py-2 text-xs font-bold text-[#74665a] hover:border-[#4b3427] hover:text-[#4b3427]">
            <Plus size={13} /> เพิ่มวัตถุดิบ
          </button>
        )}
      </div>
    </div>
  );
}
