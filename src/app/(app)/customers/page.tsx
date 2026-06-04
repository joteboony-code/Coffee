import Link from "next/link";
import { Plus, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { baht, thaiDate } from "@/lib/format";

export default async function CustomersPage() {
  await requireSession(["OWNER"]);
  const customers = await prisma.customer.findMany({
    orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <main className="mx-auto max-w-[1400px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">ลูกค้า / สมาชิก</h1>
        <Link href="/customers/new" className="flex items-center gap-2 rounded-xl bg-[#4b3427] px-5 py-3 text-lg font-bold text-white hover:bg-[#3a2820]">
          <Plus size={20} /> เพิ่มลูกค้า
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#ded1be] bg-white">
        <table className="w-full text-left text-base">
          <thead className="bg-[#f0e5d7] text-[#4b3427]">
            <tr>
              <th className="p-4 text-lg">ชื่อ</th>
              <th className="p-4 text-lg">เบอร์โทร</th>
              <th className="p-4 text-lg text-right">แต้ม</th>
              <th className="p-4 text-lg text-right">ยอดซื้อรวม</th>
              <th className="p-4 text-lg text-right">จำนวนครั้ง</th>
              <th className="p-4 text-lg">มาล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-[#74665a]">ยังไม่มีลูกค้า</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-[#eadfce] hover:bg-[#faf7f4]">
                <td className="p-4">
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-2 font-bold text-[#2f6f4e] hover:underline">
                    <User size={16} /> {c.name}
                  </Link>
                </td>
                <td className="p-4 text-[#74665a]">{c.phone}</td>
                <td className="p-4 text-right font-bold text-[#4b3427]">{c.points}</td>
                <td className="p-4 text-right">{baht(c.totalSpend)}</td>
                <td className="p-4 text-right">{c.totalOrders}</td>
                <td className="p-4 text-[#74665a]">{c.lastVisitAt ? thaiDate(c.lastVisitAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
