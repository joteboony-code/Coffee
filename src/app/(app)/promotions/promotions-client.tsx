"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Power, Trash2, X } from "lucide-react";
import { savePromotion, togglePromotion, deletePromotion } from "@/app/(app)/promotions/actions";
import { PROMO_TYPE_LABEL } from "@/lib/promo";

type Promo = {
  id: string;
  name: string;
  type: "FIXED_AMOUNT" | "PERCENT" | "BUY_X_GET_Y" | "HAPPY_HOUR";
  value: number;
  minSpend: number;
  isActive: boolean;
  note: string;
};

export function PromotionsClient({ promotions }: { promotions: Promo[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Promo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refresh() { router.refresh(); }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">โปรโมชั่น</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-[#4b3427] px-5 py-3 text-lg font-bold text-white hover:bg-[#3a2820]">
          <Plus size={20} /> เพิ่มโปรโมชั่น
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {promotions.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-[#ded1be] p-8 text-center text-[#74665a]">ยังไม่มีโปรโมชั่น</p>
        )}
        {promotions.map((p) => (
          <div key={p.id} className={`rounded-2xl border-2 p-5 ${p.isActive ? "border-emerald-300 bg-white" : "border-[#ded1be] bg-[#faf7f4] opacity-70"}`}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-xl font-bold">{p.name}</h3>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {p.isActive ? "เปิด" : "ปิด"}
              </span>
            </div>
            <p className="text-[#74665a]">{PROMO_TYPE_LABEL[p.type]}</p>
            <p className="mt-1 text-2xl font-bold text-[#4b3427]">
              {p.type === "PERCENT" ? `${p.value}%` : `${p.value} บาท`}
            </p>
            {p.minSpend > 0 && <p className="mt-1 text-sm text-[#74665a]">ขั้นต่ำ {p.minSpend} บาท</p>}
            {p.note && <p className="mt-2 text-sm text-[#74665a]">{p.note}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setEditing(p); setShowForm(true); }} className="h-10 flex-1 rounded-xl bg-[#f0e5d7] text-sm font-bold text-[#4b3427]">แก้ไข</button>
              <button onClick={() => startTransition(async () => { await togglePromotion(p.id, !p.isActive); refresh(); })}
                className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700" title={p.isActive ? "ปิด" : "เปิด"}>
                <Power size={16} />
              </button>
              <button onClick={() => { if (confirm(`ลบโปรโมชั่น "${p.name}"?`)) startTransition(async () => { await deletePromotion(p.id); refresh(); }); }}
                className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold">{editing ? "แก้ไขโปรโมชั่น" : "เพิ่มโปรโมชั่น"}</h3>
              <button onClick={() => setShowForm(false)} className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0e5d7]"><X size={20} /></button>
            </div>
            <form action={async (fd) => { await savePromotion(fd); setShowForm(false); refresh(); }} className="space-y-4">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <Field name="name" label="ชื่อโปรโมชั่น" required defaultValue={editing?.name} />
              <label className="block">
                <span className="mb-2 block text-lg font-bold">ประเภท</span>
                <select name="type" defaultValue={editing?.type ?? "FIXED_AMOUNT"} className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]">
                  <option value="FIXED_AMOUNT">ลดเป็นจำนวนเงิน (บาท)</option>
                  <option value="PERCENT">ลดเป็นเปอร์เซ็นต์ (%)</option>
                </select>
              </label>
              <Field name="value" label="มูลค่า (บาท หรือ %)" type="number" required defaultValue={String(editing?.value ?? 0)} />
              <Field name="minSpend" label="ยอดซื้อขั้นต่ำ (บาท)" type="number" defaultValue={String(editing?.minSpend ?? 0)} />
              <Field name="note" label="หมายเหตุ" defaultValue={editing?.note} />
              <label className="flex items-center gap-3 text-lg">
                <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-6 w-6 rounded" />
                <span className="font-bold">เปิดใช้งาน</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="h-14 flex-1 rounded-xl bg-[#f0e5d7] text-lg font-bold text-[#4b3427]">ยกเลิก</button>
                <button type="submit" disabled={isPending} className="h-14 flex-1 rounded-xl bg-[#4b3427] text-lg font-bold text-white disabled:opacity-50">บันทึก</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function Field({ name, label, type = "text", required, defaultValue }: {
  name: string; label: string; type?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold">{label}{required ? " *" : ""}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""}
        className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]" />
    </label>
  );
}
