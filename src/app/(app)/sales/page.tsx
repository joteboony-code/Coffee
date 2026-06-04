import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht, thaiDateTime } from "@/lib/format";

const paymentLabel: Record<string, string> = {
  CASH: "เงินสด",
  TRANSFER: "โอน",
  PROMPTPAY: "พร้อมเพย์",
};

const statusLabel: Record<string, string> = {
  COMPLETED: "สำเร็จ",
  CANCELLED: "ยกเลิก",
  REFUNDED: "คืนเงิน",
};

export default async function SalesPage() {
  await requireSession(["OWNER", "STAFF"]);
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true },
  });

  const total = sales
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">ประวัติการขาย</h1>
        <p className="text-lg text-[#74665a]">
          {sales.length} รายการ · รวม{" "}
          <span className="font-bold text-[#241f1a]">{baht(total)}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#ded1be] bg-white">
        <table className="w-full text-left text-lg">
          <thead className="bg-[#f0e5d7] text-[#4b3427]">
            <tr>
              <th className="p-4">ใบเสร็จ</th>
              <th className="p-4">วันเวลา</th>
              <th className="p-4 text-center">รายการ</th>
              <th className="p-4">ชำระ</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4 text-right">ยอด</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#74665a]">
                  ยังไม่มีรายการ
                </td>
              </tr>
            )}
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t border-[#eadfce] hover:bg-[#faf7f4]">
                <td className="p-4">
                  <Link href={`/receipt/${sale.id}`} className="font-bold text-[#2f6f4e] hover:underline">
                    {sale.receiptNo}
                  </Link>
                </td>
                <td className="p-4 text-[#74665a]">{thaiDateTime(sale.createdAt)}</td>
                <td className="p-4 text-center">
                  {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                </td>
                <td className="p-4">{paymentLabel[sale.paymentMethod] ?? sale.paymentMethod}</td>
                <td className="p-4">
                  <span
                    className={`rounded-lg px-2 py-1 text-sm font-bold ${
                      sale.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {statusLabel[sale.status] ?? sale.status}
                  </span>
                </td>
                <td className="p-4 text-right font-bold">{baht(sale.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
