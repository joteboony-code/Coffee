import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { saveIngredient } from "@/app/(app)/ingredients/actions";

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession(["OWNER"]);
  const { id } = await params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) notFound();

  const ing = {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    unit: ingredient.unit,
    costPerUnit: Number(ingredient.costPerUnit),
    lowStockThreshold: Number(ingredient.lowStockThreshold),
    isActive: ingredient.isActive,
    note: ingredient.note,
  };

  return (
    <main className="mx-auto max-w-2xl p-5">
      <div className="mb-5 flex items-center gap-4">
        <Link href="/ingredients" className="text-lg font-semibold text-[#74665a] hover:text-[#4b3427]">← วัตถุดิบ</Link>
        <h1 className="text-3xl font-bold">แก้ไข — {ingredient.name}</h1>
      </div>
      <form action={saveIngredient} className="space-y-4 rounded-2xl border border-[#ded1be] bg-white p-6">
        <input type="hidden" name="id" value={ing.id} />
        <Field name="name" label="ชื่อวัตถุดิบ" required defaultValue={ing.name} />
        <Field name="category" label="หมวดหมู่" defaultValue={ing.category} />
        <label className="block">
          <span className="mb-2 block text-lg font-bold">หน่วย</span>
          <select name="unit" defaultValue={ing.unit} className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]">
            <option value="g">กรัม (g)</option>
            <option value="ml">มิลลิลิตร (ml)</option>
            <option value="pcs">ชิ้น (pcs)</option>
            <option value="kg">กิโลกรัม (kg)</option>
            <option value="l">ลิตร (l)</option>
          </select>
        </label>
        <Field name="costPerUnit" label="ต้นทุนต่อหน่วย (บาท)" type="number" min="0" step="0.0001" defaultValue={String(ing.costPerUnit)} />
        <Field name="lowStockThreshold" label="แจ้งเตือนเมื่อสต็อกต่ำกว่า" type="number" min="0" step="0.01" defaultValue={String(ing.lowStockThreshold)} />
        <Field name="note" label="หมายเหตุ" defaultValue={ing.note} />
        <label className="flex items-center gap-3 text-lg">
          <input type="checkbox" name="isActive" value="true" defaultChecked={ing.isActive} className="h-6 w-6 rounded" />
          <span className="font-bold">เปิดใช้งาน</span>
        </label>
        <div className="flex gap-3 pt-2">
          <Link href="/ingredients" className="flex h-14 items-center justify-center rounded-xl bg-[#f0e5d7] px-6 text-lg font-bold text-[#4b3427]">ยกเลิก</Link>
          <button type="submit" className="h-14 flex-1 rounded-xl bg-[#4b3427] text-xl font-bold text-white hover:bg-[#3a2820]">บันทึก</button>
        </div>
      </form>
    </main>
  );
}

function Field({ name, label, type = "text", min, step, required, defaultValue }: {
  name: string; label: string; type?: string; min?: string; step?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold">{label}{required ? " *" : ""}</span>
      <input name={name} type={type} min={min} step={step} required={required} defaultValue={defaultValue ?? ""}
        className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]" />
    </label>
  );
}
