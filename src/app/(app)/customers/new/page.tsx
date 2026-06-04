import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { saveCustomer } from "@/app/(app)/customers/actions";

export default async function NewCustomerPage() {
  await requireSession(["OWNER"]);
  return (
    <main className="mx-auto max-w-2xl p-5">
      <div className="mb-5 flex items-center gap-4">
        <Link href="/customers" className="text-lg font-semibold text-[#74665a] hover:text-[#4b3427]">← ลูกค้า</Link>
        <h1 className="text-3xl font-bold">เพิ่มลูกค้าใหม่</h1>
      </div>
      <form action={saveCustomer} className="space-y-4 rounded-2xl border border-[#ded1be] bg-white p-6">
        <Field name="name" label="ชื่อ" required />
        <Field name="phone" label="เบอร์โทร" required />
        <Field name="note" label="หมายเหตุ" />
        <div className="flex gap-3 pt-2">
          <Link href="/customers" className="flex h-14 items-center justify-center rounded-xl bg-[#f0e5d7] px-6 text-lg font-bold text-[#4b3427]">ยกเลิก</Link>
          <button type="submit" className="h-14 flex-1 rounded-xl bg-[#4b3427] text-xl font-bold text-white hover:bg-[#3a2820]">บันทึก</button>
        </div>
      </form>
    </main>
  );
}

function Field({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold">{label}{required ? " *" : ""}</span>
      <input name={name} required={required} className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]" />
    </label>
  );
}
