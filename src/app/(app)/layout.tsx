import Link from "next/link";
import { BarChart3, ChefHat, ClipboardList, Coffee, History, LogOut, Package, Settings, Utensils } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(["OWNER", "STAFF"]);
  const isOwner = session.role === "OWNER";

  const nav = [
    { href: "/pos",         label: "ขาย",    icon: Coffee,         show: true },
    { href: "/queue",       label: "คิว",    icon: ClipboardList,  show: true },       // visible to all
    { href: "/sales",       label: "ประวัติ", icon: History,        show: true },
    { href: "/dashboard",   label: "วันนี้",  icon: BarChart3,      show: isOwner },
    { href: "/menu",        label: "เมนู",   icon: Utensils,       show: isOwner },
    { href: "/recipes",     label: "สูตร",   icon: ChefHat,        show: isOwner },
    { href: "/ingredients", label: "วัตถุดิบ",icon: Package,        show: isOwner },
    { href: "/settings",    label: "ตั้งค่า", icon: Settings,       show: isOwner },
  ];

  return (
    <div className="min-h-screen bg-[#f7f2ea]">
      <header className="no-print sticky top-0 z-20 border-b border-[#ded1be] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <Link href="/pos" className="flex items-center gap-2 text-xl font-bold text-[#4b3427]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#4b3427] text-white">
              <Coffee size={20} />
            </span>
            Coffee POS
          </Link>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {nav.filter((item) => item.show).map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className="flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#4b3427] hover:bg-[#f0e5d7] whitespace-nowrap">
                  <Icon size={17} />{item.label}
                </Link>
              );
            })}
            <form action={logoutAction}>
              <button type="submit" aria-label="ออกจากระบบ"
                className="grid h-10 w-10 place-items-center rounded-xl text-[#74665a] hover:bg-[#f0e5d7]">
                <LogOut size={19} />
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
