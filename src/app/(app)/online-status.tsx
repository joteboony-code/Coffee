"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export function OnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <span
      title={online ? "ออนไลน์" : "ออฟไลน์ — ยังบันทึกการขายขึ้นระบบไม่ได้"}
      className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold ${
        online ? "bg-emerald-50 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {online ? <Wifi size={15} /> : <WifiOff size={15} />}
      <span className="hidden md:inline">{online ? "ออนไลน์" : "ออฟไลน์"}</span>
    </span>
  );
}
