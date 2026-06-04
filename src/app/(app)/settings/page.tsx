import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { updateShopSettings } from "@/app/actions";

export default async function SettingsPage() {
  await requireSession(["OWNER"]);
  const settings = await prisma.shopSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="mx-auto max-w-2xl p-5">
      <h1 className="mb-5 text-3xl font-bold">ตั้งค่าร้าน</h1>
      <form action={updateShopSettings} className="space-y-6">
        {/* Shop info */}
        <section className="space-y-5 rounded-2xl border border-[#ded1be] bg-white p-6">
          <h2 className="text-xl font-bold">ข้อมูลร้าน</h2>
          <Field name="shopName" label="ชื่อร้าน" defaultValue={settings?.shopName ?? "Coffee POS"} />
          <Field name="address" label="ที่อยู่" defaultValue={settings?.address ?? ""} multiline />
          <Field name="phone" label="เบอร์โทร" defaultValue={settings?.phone ?? ""} />
          <Field name="promptPayId" label="พร้อมเพย์ / หมายเลขบัญชี" defaultValue={settings?.promptPayId ?? ""} />
          <Field name="receiptFooter" label="ข้อความท้ายใบเสร็จ" defaultValue={settings?.receiptFooter ?? "ขอบคุณที่อุดหนุน"} />
        </section>

        {/* Loyalty */}
        <section className="space-y-5 rounded-2xl border border-[#ded1be] bg-white p-6">
          <h2 className="text-xl font-bold">ระบบสะสมแต้ม</h2>
          <Field name="bahtPerPoint" label="ใช้จ่ายกี่บาท ได้ 1 แต้ม" type="number" defaultValue={String(settings?.bahtPerPoint ?? 25)} />
          <Field name="pointValue" label="1 แต้ม มีค่าเท่ากับกี่บาท (เมื่อแลก)" type="number" defaultValue={String(settings?.pointValue ?? 1)} />
        </section>

        {/* Stock policy */}
        <section className="space-y-4 rounded-2xl border border-[#ded1be] bg-white p-6">
          <h2 className="text-xl font-bold">นโยบายสต็อก</h2>
          <label className="flex items-center gap-3 text-lg">
            <input type="checkbox" name="allowNegativeStock" defaultChecked={settings?.allowNegativeStock ?? true} className="h-6 w-6 rounded" />
            <span className="font-bold">อนุญาตให้สต็อกติดลบ (ยืนยันก่อนขาย)</span>
          </label>
          <p className="text-sm text-[#74665a]">ถ้าปิด ระบบจะไม่ให้ขายเมื่อวัตถุดิบไม่พอ</p>
        </section>

        {/* PIN note */}
        <section className="rounded-2xl border border-[#ded1be] bg-[#f7f2ea] p-6">
          <h2 className="mb-2 text-xl font-bold">รหัส PIN</h2>
          <p className="text-[#74665a]">
            รหัส PIN ของเจ้าของร้าน (OWNER) และพนักงาน (STAFF) ตั้งค่าผ่านตัวแปรสภาพแวดล้อม
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-sm">OWNER_PIN</code> และ
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-sm">STAFF_PIN</code>
            บน Vercel เพื่อความปลอดภัย
          </p>
        </section>

        <button type="submit" className="h-14 w-full rounded-xl bg-[#4b3427] text-xl font-bold text-white hover:bg-[#3a2820]">บันทึก</button>
      </form>
    </main>
  );
}

function Field({ name, label, defaultValue, multiline = false, type = "text" }: {
  name: string; label: string; defaultValue: string; multiline?: boolean; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold">{label}</span>
      {multiline ? (
        <textarea name={name} defaultValue={defaultValue} rows={3} className="w-full rounded-xl border-2 border-[#d8c8b5] p-4 text-lg outline-none focus:border-[#4b3427]" />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue} className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]" />
      )}
    </label>
  );
}
