import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { requireSession } from "@/lib/auth";

export default async function BackupPage() {
  await requireSession(["OWNER"]);

  const csvExports = [
    { type: "sales", label: "ยอดขาย (Sales)", desc: "รายการบิลทั้งหมด" },
    { type: "sale-items", label: "รายการสินค้าที่ขาย", desc: "แต่ละเมนูในบิล + ต้นทุน/กำไร" },
    { type: "stock-movements", label: "ความเคลื่อนไหวสต็อก", desc: "รับเข้า/ขาย/ปรับ/ของเสีย" },
    { type: "customers", label: "ลูกค้า / สมาชิก", desc: "ข้อมูลลูกค้า + แต้ม" },
  ];

  return (
    <main className="mx-auto max-w-3xl p-5">
      <div className="mb-6 flex items-center gap-3">
        <Download size={30} className="text-[#4b3427]" />
        <h1 className="text-3xl font-bold">สำรองข้อมูล / ส่งออก</h1>
      </div>

      {/* CSV exports */}
      <section className="mb-6 rounded-2xl border border-[#ded1be] bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet size={22} className="text-emerald-600" />
          <h2 className="text-2xl font-bold">ส่งออก CSV</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {csvExports.map((x) => (
            <a key={x.type} href={`/api/export?type=${x.type}`} download
              className="flex items-center justify-between rounded-xl border border-[#ded1be] bg-[#f7f2ea] p-4 hover:border-[#4b3427] hover:bg-[#f0e5d7]">
              <div>
                <p className="font-bold">{x.label}</p>
                <p className="text-sm text-[#74665a]">{x.desc}</p>
              </div>
              <Download size={20} className="text-[#4b3427]" />
            </a>
          ))}
        </div>
      </section>

      {/* JSON backup */}
      <section className="rounded-2xl border border-[#ded1be] bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <FileJson size={22} className="text-sky-600" />
          <h2 className="text-2xl font-bold">สำรองข้อมูลทั้งหมด (JSON)</h2>
        </div>
        <p className="mb-4 text-[#74665a]">
          ดาวน์โหลดข้อมูลทั้งหมด: ตั้งค่าร้าน, หมวดหมู่, เมนู, ตัวเลือก, การขาย, วัตถุดิบ, สูตร,
          ความเคลื่อนไหวสต็อก, ลูกค้า และโปรโมชั่น เก็บไว้เป็นไฟล์สำรอง
        </p>
        <a href="/api/export?type=backup" download
          className="inline-flex items-center gap-2 rounded-xl bg-[#4b3427] px-6 py-3 text-lg font-bold text-white hover:bg-[#3a2820]">
          <Download size={20} /> ดาวน์โหลดไฟล์สำรอง JSON
        </a>
        <p className="mt-4 text-sm text-[#74665a]">
          หมายเหตุ: ขณะนี้รองรับการส่งออก/สำรองเท่านั้น ยังไม่รองรับการกู้คืน (restore) เพื่อความปลอดภัยของข้อมูล
        </p>
      </section>
    </main>
  );
}
