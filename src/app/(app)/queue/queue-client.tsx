"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { startMaking, markReady, markServed, cancelQueue } from "@/app/(app)/queue/actions";

type QueueItem = {
  id: string;
  queueNo: string;
  queueStatus: "NEW" | "MAKING" | "READY" | "SERVED" | "CANCELLED";
  createdAt: string;
  queueStartedAt: string | null;
  queueReadyAt: string | null;
  note: string;
  cancelReason: string | null;
  items: {
    id: string;
    name: string;
    quantity: number;
    options: { groupName: string; optionName: string }[];
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "ใหม่",
  MAKING: "กำลังทำ",
  READY: "พร้อมส่ง",
  SERVED: "เสร็จแล้ว",
  CANCELLED: "ยกเลิก",
};

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-amber-100 text-amber-800 border-amber-300",
  MAKING: "bg-sky-100 text-sky-800 border-sky-300",
  READY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  SERVED: "bg-gray-100 text-gray-500 border-gray-200",
  CANCELLED: "bg-red-50 text-red-500 border-red-200",
};

const CARD_BORDER: Record<string, string> = {
  NEW: "border-amber-300 bg-amber-50",
  MAKING: "border-sky-300 bg-sky-50",
  READY: "border-emerald-400 bg-emerald-50",
  SERVED: "border-gray-200 bg-white opacity-60",
  CANCELLED: "border-red-200 bg-red-50 opacity-60",
};

type Filter = "active" | "all";

export function QueueClient({ queue }: { queue: QueueItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("active");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Auto-refresh every 15 s so new orders appear without manual action
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(id);
  }, [router]);

  const visible =
    filter === "active"
      ? queue.filter((q) => ["NEW", "MAKING", "READY"].includes(q.queueStatus))
      : queue;

  const activeCount = queue.filter((q) =>
    ["NEW", "MAKING", "READY"].includes(q.queueStatus),
  ).length;

  function act(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter("active")}
          className={`h-11 rounded-xl px-5 text-lg font-bold transition-colors ${
            filter === "active"
              ? "bg-[#4b3427] text-white"
              : "bg-white text-[#4b3427] hover:bg-[#f0e5d7]"
          }`}
        >
          แอคทีฟ
          {activeCount > 0 && (
            <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/30 text-sm">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`h-11 rounded-xl px-5 text-lg font-bold transition-colors ${
            filter === "all"
              ? "bg-[#4b3427] text-white"
              : "bg-white text-[#4b3427] hover:bg-[#f0e5d7]"
          }`}
        >
          ทั้งหมดวันนี้ ({queue.length})
        </button>
        {isPending && (
          <span className="text-sm text-[#74665a]">กำลังบันทึก…</span>
        )}
      </div>

      {/* Cards grid */}
      {visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-[#ded1be] p-12 text-center">
          <div>
            <p className="text-2xl font-bold text-[#74665a]">
              {filter === "active" ? "ไม่มีคิวที่รอดำเนินการ" : "ยังไม่มีคิววันนี้"}
            </p>
            <p className="mt-2 text-[#74665a]">
              {filter === "active" ? "เมื่อมีออร์เดอร์ใหม่จะปรากฏที่นี่" : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col rounded-2xl border-2 p-4 ${CARD_BORDER[item.queueStatus] ?? "border-[#ded1be] bg-white"}`}
            >
              {/* Queue number + status */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-5xl font-black tracking-tight text-[#241f1a]">
                  {item.queueNo}
                </span>
                <span className={`mt-1 rounded-xl border px-3 py-1 text-sm font-bold ${STATUS_COLOR[item.queueStatus] ?? ""}`}>
                  {STATUS_LABEL[item.queueStatus]}
                </span>
              </div>

              {/* Time */}
              <p className="mb-3 text-sm text-[#74665a]">
                {new Date(item.createdAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Bangkok",
                })}
                {item.queueStartedAt && (
                  <span className="ml-2">
                    · เริ่ม{" "}
                    {new Date(item.queueStartedAt).toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Bangkok",
                    })}
                  </span>
                )}
              </p>

              {/* Items */}
              <div className="flex-1 space-y-2 text-base">
                {item.items.map((si) => (
                  <div key={si.id}>
                    <p className="font-bold">
                      {si.quantity > 1 && (
                        <span className="mr-1 text-[#4b3427]">{si.quantity}×</span>
                      )}
                      {si.name}
                    </p>
                    {si.options.length > 0 && (
                      <p className="text-sm text-[#74665a]">
                        {si.options.map((o) => o.optionName).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
                {item.note && (
                  <p className="rounded-lg bg-white/60 px-2 py-1 text-sm italic text-[#74665a]">
                    &ldquo;{item.note}&rdquo;
                  </p>
                )}
                {item.cancelReason && (
                  <p className="text-sm text-red-600">เหตุผล: {item.cancelReason}</p>
                )}
              </div>

              {/* Action buttons */}
              {item.queueStatus === "NEW" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    disabled={isPending}
                    onClick={() => act(() => startMaking(item.id))}
                    className="h-12 rounded-xl bg-sky-500 text-base font-bold text-white disabled:opacity-50 hover:bg-sky-600"
                  >
                    เริ่มทำ
                  </button>
                  <button
                    onClick={() => { setCancelingId(item.id); setCancelReason(""); }}
                    className="h-12 rounded-xl bg-red-50 text-base font-bold text-red-600 hover:bg-red-100"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
              {item.queueStatus === "MAKING" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    disabled={isPending}
                    onClick={() => act(() => markReady(item.id))}
                    className="h-12 rounded-xl bg-emerald-500 text-base font-bold text-white disabled:opacity-50 hover:bg-emerald-600"
                  >
                    พร้อมส่ง
                  </button>
                  <button
                    onClick={() => { setCancelingId(item.id); setCancelReason(""); }}
                    className="h-12 rounded-xl bg-red-50 text-base font-bold text-red-600 hover:bg-red-100"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
              {item.queueStatus === "READY" && (
                <button
                  disabled={isPending}
                  onClick={() => act(() => markServed(item.id))}
                  className="mt-4 h-12 w-full rounded-xl bg-[#4b3427] text-base font-bold text-white disabled:opacity-50 hover:bg-[#3a2820]"
                >
                  ส่งเสร็จแล้ว ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel dialog */}
      {cancelingId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold">ยืนยันยกเลิกคิว</h3>
              <button onClick={() => setCancelingId(null)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0e5d7]">
                <X size={20} />
              </button>
            </div>
            <label className="mb-4 block">
              <span className="mb-2 block font-bold">เหตุผล (ถ้ามี)</span>
              <input
                autoFocus
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="เช่น ลูกค้ายกเลิก"
                className="h-12 w-full rounded-xl border-2 border-[#d8c8b5] px-4 text-lg outline-none focus:border-[#4b3427]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCancelingId(null)} className="h-12 rounded-xl bg-[#f0e5d7] font-bold text-[#4b3427]">
                ไม่ยกเลิก
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  const id = cancelingId;
                  setCancelingId(null);
                  act(() => cancelQueue(id, cancelReason));
                }}
                className="h-12 rounded-xl bg-red-600 font-bold text-white disabled:opacity-50 hover:bg-red-700"
              >
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
