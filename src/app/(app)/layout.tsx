import Link from "next/link";
import {
  BarChart3, ChefHat, ClipboardList, Coffee, Download, FileBarChart,
  History, LogOut, Package, Settings, Tag, Users, Utensils,
} from "lucide-react";
import { logoutAction } from "@/app/actions";
import { requireSession } from "@/lib/auth";
import { OnlineStatus } from "@/app/(app)/online-status";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["OWNER", "STAFF"]);
  const isOwner = session.role === "OWNER";

  const nav = [
    { href: "/pos",         label: "ขาย",      icon: Coffee,        show: true },
    { href: "/queue",       label: "คิว",      icon: ClipboardList, show: true },
    { href: "/sales",       label: "ประวัติ",   icon: History,       show: true },
    { href: "/dashboard",   label: "วันนี้",    icon: BarChart3,     show: isOwner },
    { href: "/reports",     label: "รายงาน",   icon: FileBarChart,  show: isOwner },
    { href: "/menu",        label: "เมนู",     icon: Utensils,      show: isOwner },
    { href: "/recipes",     label: "สูตร",     icon: ChefHat,       show: isOwner },
    { href: "/ingredients", label: "วัตถุดิบ",  icon: Package,       show: isOwner },
    { href: "/customers",   label: "ลูกค้า",    icon: Users,         show: isOwner },
    { href: "/promotions",  label: "โปรโมชั่น", icon: Tag,           show: isOwner },
    { href: "/backup",      label: "สำรอง",    icon: Download,      show: isOwner },
    { href: "/settings",    label: "ตั้งค่า",   icon: Settings,      show: isOwner },
  ];

  return (
    <div className="min-h-screen bg-[#f7f2ea]">
      <header className="no-print sticky top-0 z-20 border-b border-[#ded1be] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2 px-3 py-2">
          <Link href="/pos" className="flex shrink-0 items-center gap-2 text-lg font-bold text-[#4b3427]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#4b3427] text-white">
              <Coffee size={18} />
            </span>
            <span className="hidden sm:inline">Coffee POS</span>
          </Link>
          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {nav.filter((item) => item.show).map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-[#4b3427] hover:bg-[#f0e5d7]">
                  <Icon size={16} />{item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <OnlineStatus />
            <form action={logoutAction}>
              <button type="submit" aria-label="ออกจากระบบ"
                className="grid h-10 w-10 place-items-center rounded-xl text-[#74665a] hover:bg-[#f0e5d7]">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
