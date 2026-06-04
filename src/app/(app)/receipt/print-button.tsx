"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-xl bg-[#4b3427] px-5 py-3 text-lg font-bold text-white"
    >
      <Printer size={20} />
      พิมพ์
    </button>
  );
}
