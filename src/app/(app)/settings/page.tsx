import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { updateShopSettings } from "@/app/actions";

export default async function SettingsPage() {
  await requireSession(["OWNER"]);
  const settings = await prisma.shopSetting.findUnique({ where: { id: "default" } });

  return (
    <main className="mx-auto max-w-2xl p-5">
      <h1 className="mb-5 text-3xl font-bold">ตั้งค่าร้าน</h1>
      <form
        action={updateShopSettings}
        className="space-y-5 rounded-2xl border border-[#ded1be] bg-white p-6"
      >
        <Field name="shopName" label="ชื่อร้าน" defaultValue={settings?.shopName ?? "Coffee POS"} />
        <Field name="address" label="ที่อยู่" defaultValue={settings?.address ?? ""} multiline />
        <Field name="phone" label="เบอร์โทร" defaultValue={settings?.phone ?? ""} />
        <Field name="promptPayId" label="พร้อมเพย์ / หมายเลขบัญชี" defaultValue={settings?.promptPayId ?? ""} />
        <Field
          name="receiptFooter"
          label="ข้อความท้ายใบเสร็จ"
          defaultValue={settings?.receiptFooter ?? "ขอบคุณที่อุดหนุน"}
        />
        <button
          type="submit"
          className="h-14 rounded-xl bg-[#4b3427] px-8 text-xl font-bold text-white hover:bg-[#3a2820]"
        >
          บันทึก
        </button>
      </form>
    </main>
  );
}

function Field({
  name,
  label,
  defaultValue,
  multiline = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-lg font-bold">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={3}
          className="w-full rounded-xl border-2 border-[#d8c8b5] p-4 text-lg outline-none focus:border-[#4b3427]"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          className="h-14 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]"
        />
      )}
    </label>
  );
}
