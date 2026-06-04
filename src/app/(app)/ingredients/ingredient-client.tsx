"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { receiveStock, adjustStock, recordWaste } from "@/app/(app)/ingredients/actions";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  costPerUnit: number;
};

type DialogType = "receive" | "adjust" | "waste" | null;

export function StockActionButtons({ ingredient }: { ingredient: Ingredient }) {
  const [dialog, setDialog] = useState<DialogType>(null);

  return (
    <>
      <div className="flex gap-2">
        <ActionBtn color="green" onClick={() => setDialog("receive")}>รับเข้า</ActionBtn>
        <ActionBtn color="blue" onClick={() => setDialog("adjust")}>ปรับ</ActionBtn>
        <ActionBtn color="red" onClick={() => setDialog("waste")}>ของเสีย</ActionBtn>
      </div>

      {dialog === "receive" && (
        <Dialog title={`รับวัตถุดิบ — ${ingredient.name}`} onClose={() => setDialog(null)}>
          <form action={async (fd) => { await receiveStock(fd); setDialog(null); }}>
            <input type="hidden" name="ingredientId" value={ingredient.id} />
            <Field label={`จำนวน (${ingredient.unit})`} name="quantity" type="number" min="0.01" step="0.01" required />
            <Field label="ราคาต้นทุนต่อหน่วย (บาท)" name="costPerUnit" type="number" min="0" step="0.0001" defaultValue={String(ingredient.costPerUnit)} />
            <Field label="หมายเหตุ" name="note" />
            <SubmitRow onClose={() => setDialog(null)} label="บันทึกรับเข้า" color="green" />
          </form>
        </Dialog>
      )}

      {dialog === "adjust" && (
        <Dialog title={`ปรับสต็อก — ${ingredient.name}`} onClose={() => setDialog(null)}>
          <form action={async (fd) => { await adjustStock(fd); setDialog(null); }}>
            <input type="hidden" name="ingredientId" value={ingredient.id} />
            <label className="mb-3 block">
              <span className="mb-1 block text-base font-bold">ประเภท</span>
              <select name="direction" className="h-12 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]">
                <option value="add">เพิ่มสต็อก</option>
                <option value="subtract">ลดสต็อก</option>
              </select>
            </label>
            <Field label={`จำนวน (${ingredient.unit})`} name="quantity" type="number" min="0.01" step="0.01" required />
            <Field label="หมายเหตุ" name="note" />
            <SubmitRow onClose={() => setDialog(null)} label="บันทึกปรับ" color="blue" />
          </form>
        </Dialog>
      )}

      {dialog === "waste" && (
        <Dialog title={`บันทึกของเสีย — ${ingredient.name}`} onClose={() => setDialog(null)}>
          <form action={async (fd) => { await recordWaste(fd); setDialog(null); }}>
            <input type="hidden" name="ingredientId" value={ingredient.id} />
            <Field label={`จำนวน (${ingredient.unit})`} name="quantity" type="number" min="0.01" step="0.01" required />
            <Field label="หมายเหตุ" name="note" />
            <SubmitRow onClose={() => setDialog(null)} label="บันทึกของเสีย" color="red" />
          </form>
        </Dialog>
      )}
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function ActionBtn({ onClick, color, children }: { onClick: () => void; color: "green" | "blue" | "red"; children: React.ReactNode }) {
  const cls = {
    green: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    blue: "bg-sky-50 text-sky-700 hover:bg-sky-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
  }[color];
  return (
    <button onClick={onClick} className={`h-9 rounded-lg px-3 text-sm font-bold ${cls}`}>{children}</button>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-2xl font-bold">{title}</h3>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0e5d7] text-[#4b3427]"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", min, step, required, defaultValue }: {
  label: string; name: string; type?: string; min?: string; step?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-base font-bold">{label}</span>
      <input
        name={name} type={type} min={min} step={step} required={required} defaultValue={defaultValue}
        className="h-12 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]"
      />
    </label>
  );
}

function SubmitRow({ onClose, label, color }: { onClose: () => void; label: string; color: "green" | "blue" | "red" }) {
  const cls = { green: "bg-emerald-600 hover:bg-emerald-700", blue: "bg-sky-600 hover:bg-sky-700", red: "bg-red-600 hover:bg-red-700" }[color];
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button type="button" onClick={onClose} className="h-12 rounded-xl bg-[#f0e5d7] font-bold text-[#4b3427]">ยกเลิก</button>
      <button type="submit" className={`h-12 rounded-xl font-bold text-white ${cls}`}>{label}</button>
    </div>
  );
}
