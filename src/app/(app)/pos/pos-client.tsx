"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { AlertTriangle, Minus, Plus, Trash2, User, X, Tag } from "lucide-react";
import { createSale } from "@/app/actions";
import type { StockWarning } from "@/app/actions";
import { searchCustomers, quickAddCustomer, type CustomerLite } from "@/app/(app)/customers/actions";
import { isPromoEligible, promoDiscount, type PromoLite } from "@/lib/promo";
import { baht } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModifierOption = { id: string; name: string; priceDelta: number; modifierGroupId: string };
type ModifierGroup = { id: string; name: string; type: "SINGLE" | "MULTIPLE"; isRequired: boolean; options: ModifierOption[] };
type MenuItem = { id: string; name: string; price: number; modifierGroups: { modifierGroup: ModifierGroup }[] };
type Category = { id: string; name: string; items: MenuItem[] };
type CartOption = { modifierGroupId: string; modifierOptionId: string; groupName: string; optionName: string; priceDelta: number };
type CartItem = { key: string; menuItemId: string; name: string; quantity: number; basePrice: number; unitPrice: number; total: number; options: CartOption[] };
type PaymentMethod = "CASH" | "TRANSFER" | "PROMPTPAY";

const QUICK_AMOUNTS = [20, 50, 100, 500, 1000];

// ─── Component ────────────────────────────────────────────────────────────────

export function PosClient({
  categories,
  promptPayId,
  promotions,
  bahtPerPoint,
  pointValue,
}: {
  categories: Category[];
  promptPayId: string;
  promotions: PromoLite[];
  bahtPerPoint: number;
  pointValue: number;
}) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [received, setReceived] = useState("");
  const [qrCode, setQrCode] = useState({ payload: "", dataUrl: "" });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);
  const [pendingPayload, setPendingPayload] = useState<Parameters<typeof createSale>[0] | null>(null);

  // Customer / discount
  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const items = categories.find((c) => c.id === activeCategory)?.items ?? [];
  const subtotal = cart.reduce((sum, i) => sum + i.total, 0);

  // ── Discount calculation (mirrors server) ────────────────────────────────
  const selectedPromo = promotions.find((p) => p.id === promotionId) ?? null;
  const promoDisc = selectedPromo && isPromoEligible(selectedPromo, subtotal) ? promoDiscount(selectedPromo, subtotal) : 0;
  const remainingAfterPromo = Math.max(0, subtotal - promoDisc);
  let pointsDisc = Math.max(0, redeemPoints) * pointValue;
  if (pointsDisc > remainingAfterPromo) pointsDisc = remainingAfterPromo;
  const discountAmount = promoDisc + pointsDisc;
  const total = Math.max(0, subtotal - discountAmount);

  const receivedAmount = Number(received || 0);
  const change = paymentMethod === "CASH" && receivedAmount >= total ? receivedAmount - total : 0;
  const canPay = cart.length > 0 && !isPending && (paymentMethod !== "CASH" || (receivedAmount >= total && total >= 0 && subtotal > 0));

  const groups = selectedItem?.modifierGroups.map((e) => e.modifierGroup) ?? [];
  const selectedUnitPrice = selectedItem
    ? selectedItem.price + groups.reduce((s, g) => {
        const ids = selectedOptions[g.id] ?? [];
        return s + g.options.filter((o) => ids.includes(o.id)).reduce((ss, o) => ss + o.priceDelta, 0);
      }, 0)
    : 0;

  const qrPayload = paymentMethod === "CASH" || total <= 0
    ? "" : `${paymentMethod === "PROMPTPAY" ? "PROMPTPAY" : "TRANSFER"}:${promptPayId}:${total}`;

  useEffect(() => {
    if (!qrPayload) return;
    QRCode.toDataURL(qrPayload, { width: 200, margin: 1, color: { dark: "#241f1a", light: "#ffffff" } })
      .then((dataUrl) => setQrCode({ payload: qrPayload, dataUrl }));
  }, [qrPayload]);

  function openItem(item: MenuItem) {
    const defaults: Record<string, string[]> = {};
    for (const e of item.modifierGroups) {
      const g = e.modifierGroup;
      if (g.type === "SINGLE" && g.options[0]) defaults[g.id] = [g.options[0].id];
    }
    setSelectedItem(item);
    setSelectedOptions(defaults);
    setError("");
  }

  function toggleOption(group: ModifierGroup, optionId: string) {
    setSelectedOptions((cur) => {
      if (group.type === "SINGLE") return { ...cur, [group.id]: [optionId] };
      const ex = cur[group.id] ?? [];
      return { ...cur, [group.id]: ex.includes(optionId) ? ex.filter((id) => id !== optionId) : [...ex, optionId] };
    });
  }

  function addSelectedItem() {
    if (!selectedItem) return;
    const missing = groups.find((g) => g.isRequired && !(selectedOptions[g.id]?.length));
    if (missing) { setError(`กรุณาเลือก${missing.name}`); return; }
    const options: CartOption[] = groups.flatMap((g) =>
      g.options.filter((o) => (selectedOptions[g.id] ?? []).includes(o.id))
        .map((o) => ({ modifierGroupId: g.id, modifierOptionId: o.id, groupName: g.name, optionName: o.name, priceDelta: o.priceDelta })),
    );
    const key = `${selectedItem.id}:${options.map((o) => o.modifierOptionId).sort().join(",")}`;
    setCart((cur) => {
      const ex = cur.find((i) => i.key === key);
      if (ex) return cur.map((i) => i.key === key ? { ...i, quantity: i.quantity + 1, total: i.unitPrice * (i.quantity + 1) } : i);
      return [...cur, { key, menuItemId: selectedItem.id, name: selectedItem.name, quantity: 1, basePrice: selectedItem.price, unitPrice: selectedUnitPrice, total: selectedUnitPrice, options }];
    });
    setSelectedItem(null);
    setError("");
  }

  function adjustQty(key: string, delta: number) {
    setCart((cur) => cur.map((i) => i.key !== key ? i : { ...i, quantity: i.quantity + delta, total: i.unitPrice * (i.quantity + delta) }).filter((i) => i.quantity > 0));
  }

  function resetExtras() {
    setCustomer(null);
    setPromotionId(null);
    setRedeemPoints(0);
  }

  function appendReceived(digit: string) {
    setReceived((prev) => {
      if (digit === "C") return "";
      if (digit === "⌫") return prev.slice(0, -1);
      if (prev === "0") return digit;
      return prev + digit;
    });
  }

  function buildPayload(force = false): Parameters<typeof createSale>[0] {
    return {
      paymentMethod,
      received: paymentMethod === "CASH" ? receivedAmount : undefined,
      force,
      customerId: customer?.id ?? null,
      promotionId: promotionId,
      redeemPoints,
      items: cart.map((i) => ({ menuItemId: i.menuItemId, name: i.name, quantity: i.quantity, basePrice: i.basePrice, unitPrice: i.unitPrice, total: i.total, options: i.options })),
    };
  }

  function finishSale(saleId: string) {
    setCart([]); setReceived(""); resetExtras(); setPendingPayload(null);
    router.push(`/receipt/${saleId}`);
  }

  function submitSale(force = false) {
    setError("");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("ออฟไลน์อยู่ ยังไม่สามารถบันทึกการขายขึ้นระบบได้ (ตะกร้ายังอยู่)");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createSale(buildPayload(force));
        if (!result.ok) { setPendingPayload(buildPayload(true)); setStockWarnings(result.warnings); return; }
        finishSale(result.saleId);
      } catch (err) { setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"); }
    });
  }

  function confirmForceSale() {
    if (!pendingPayload) return;
    setStockWarnings([]);
    startTransition(async () => {
      try {
        const result = await createSale(pendingPayload);
        if (!result.ok) { setError("ไม่สามารถบันทึกได้"); return; }
        finishSale(result.saleId);
      } catch (err) { setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ"); }
    });
  }

  const maxRedeemable = customer ? Math.min(customer.points, pointValue > 0 ? Math.ceil(remainingAfterPromo / pointValue) : 0) : 0;
  const estPointsEarned = customer ? Math.floor(total / bahtPerPoint) : 0;

  return (
    <div className="grid h-full grid-cols-[1fr_360px] gap-3 overflow-hidden">

      {/* ── LEFT: Categories + Menu grid ───────────────────────────────── */}
      <section className="flex h-full flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`h-12 shrink-0 rounded-xl px-5 text-lg font-bold transition-colors ${activeCategory === cat.id ? "bg-[#4b3427] text-white" : "bg-white text-[#4b3427] hover:bg-[#f0e5d7]"}`}>
              {cat.name}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-4">
            {items.map((item) => (
              <button key={item.id} onClick={() => openItem(item)}
                className="flex h-24 flex-col justify-between rounded-xl border border-[#ded1be] bg-white p-3 text-left shadow-sm active:scale-[0.98] active:bg-[#f7f2ea]">
                <span className="text-lg font-bold leading-tight text-[#241f1a]">{item.name}</span>
                <span className="text-base font-semibold text-[#846449]">{baht(item.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── RIGHT: Cart + Payment ───────────────────────────────────────── */}
      <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-[#ded1be] bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-[#eadfce] px-4 py-3">
          <h2 className="text-xl font-bold">ตะกร้า</h2>
          {cart.length > 0 && (
            <button onClick={() => { setCart([]); resetExtras(); }} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              <Trash2 size={13} /> ล้าง
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-base text-[#74665a]">ยังไม่มีรายการ</p>
          ) : cart.map((item) => (
            <div key={item.key} className="rounded-xl bg-[#f7f2ea] p-2.5">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-tight">{item.name}</p>
                  {item.options.length > 0 && <p className="mt-0.5 text-xs text-[#74665a]">{item.options.map((o) => o.optionName).join(" · ")}</p>}
                </div>
                <button onClick={() => adjustQty(item.key, -item.quantity)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-red-500"><Trash2 size={14} /></button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button onClick={() => adjustQty(item.key, -1)} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#4b3427]"><Minus size={16} /></button>
                  <span className="w-7 text-center text-lg font-bold">{item.quantity}</span>
                  <button onClick={() => adjustQty(item.key, 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#4b3427]"><Plus size={16} /></button>
                </div>
                <span className="text-lg font-bold">{baht(item.total)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Payment section */}
        <div className="shrink-0 space-y-2 border-t border-[#eadfce] p-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>

          {/* Customer + discount row */}
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => setShowCustomerModal(true)}
              title={customer && estPointsEarned > 0 ? `จะได้รับ ${estPointsEarned} แต้ม` : undefined}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold ${customer ? "bg-[#4b3427] text-white" : "bg-[#f0e5d7] text-[#4b3427]"}`}>
              <User size={15} />{customer ? `${customer.name}${estPointsEarned > 0 ? ` (+${estPointsEarned})` : ""}` : "ลูกค้า"}
            </button>
            <button onClick={() => setShowCustomerModal(true)}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold ${discountAmount > 0 ? "bg-emerald-600 text-white" : "bg-[#f0e5d7] text-[#4b3427]"}`}>
              <Tag size={15} />{discountAmount > 0 ? `-${baht(discountAmount)}` : "ส่วนลด"}
            </button>
          </div>

          {/* Totals */}
          {discountAmount > 0 ? (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-sm text-[#74665a]">
                <span>ยอดรวม</span><span>{baht(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-emerald-700">
                <span>ส่วนลด</span><span>-{baht(discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">สุทธิ</span>
                <span className="text-2xl font-bold text-[#4b3427]">{baht(total)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">รวม</span>
              <span className="text-2xl font-bold text-[#4b3427]">{baht(total)}</span>
            </div>
          )}

          {/* Payment method */}
          <div className="grid grid-cols-3 gap-1.5">
            {(["CASH", "TRANSFER", "PROMPTPAY"] as const).map((method) => (
              <button key={method} onClick={() => setPaymentMethod(method)}
                className={`h-10 rounded-xl text-sm font-bold transition-colors ${paymentMethod === method ? "bg-[#4b3427] text-white" : "bg-[#f0e5d7] text-[#4b3427] hover:bg-[#e5d5c0]"}`}>
                {method === "CASH" ? "เงินสด" : method === "TRANSFER" ? "โอน" : "พร้อมเพย์"}
              </button>
            ))}
          </div>

          {paymentMethod === "CASH" ? (
            <div className="space-y-2">
              <div className="flex h-11 items-center justify-between rounded-xl border-2 border-[#d8c8b5] bg-[#f7f2ea] px-3">
                <span className="text-sm text-[#74665a]">รับเงิน</span>
                <span className="text-xl font-bold">{received ? baht(Number(received)) : "—"}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {QUICK_AMOUNTS.map((amount) => (
                  <button key={amount} onClick={() => setReceived(String(amount))} className="h-8 rounded-lg bg-[#f0e5d7] text-xs font-bold text-[#4b3427] hover:bg-[#e5d5c0]">{amount}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {["1","2","3","4","5","6","7","8","9","C","0","⌫"].map((key) => (
                  <button key={key} onClick={() => appendReceived(key)}
                    className={`h-10 rounded-xl text-lg font-bold transition-colors ${key === "C" ? "bg-red-50 text-red-600 hover:bg-red-100" : key === "⌫" ? "bg-[#f0e5d7] text-[#4b3427] hover:bg-[#e5d5c0]" : "bg-[#f7f2ea] text-[#241f1a] hover:bg-[#f0e5d7]"}`}>
                    {key}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                <span className="text-base font-bold text-emerald-800">เงินทอน</span>
                <span className="text-xl font-bold text-emerald-700">{baht(change)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#f7f2ea] p-3 text-center">
              {qrCode.payload === qrPayload && qrCode.dataUrl
                ? <Image src={qrCode.dataUrl} alt="QR" width={160} height={160} unoptimized className="mx-auto" />
                : <div className="mx-auto h-[160px] w-[160px] rounded-lg bg-[#e8ddd0]" />}
              <p className="mt-2 text-lg font-bold">ยอดชำระ {baht(total)}</p>
              <p className="text-xs text-[#74665a]">{paymentMethod === "PROMPTPAY" ? `พร้อมเพย์: ${promptPayId}` : "โอนตามบัญชีร้าน"}</p>
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">{error}</p>}

          <button disabled={!canPay} onClick={() => submitSale(false)}
            className="h-14 w-full rounded-xl text-xl font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[#c5b9b0] enabled:bg-[#2f6f4e] enabled:active:bg-[#245940]">
            {isPending ? "กำลังบันทึก..." : "ชำระเงิน"}
          </button>
        </div>
      </aside>

      {/* ── Modifier modal ─────────────────────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
          <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedItem.name}</h3>
                <p className="text-lg font-semibold text-[#846449]">{baht(selectedUnitPrice)}</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f0e5d7] text-[#4b3427]"><X size={20} /></button>
            </div>
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-lg font-bold">
                    {group.name}{group.isRequired ? <span className="ml-1 text-red-500">*</span> : null}
                    <span className="ml-2 text-sm font-normal text-[#74665a]">{group.type === "SINGLE" ? "เลือก 1" : "เลือกได้หลาย"}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {group.options.map((option) => {
                      const active = (selectedOptions[group.id] ?? []).includes(option.id);
                      return (
                        <button key={option.id} onClick={() => toggleOption(group, option.id)}
                          className={`min-h-12 rounded-xl border-2 px-3 py-2 text-base font-bold transition-colors ${active ? "border-[#4b3427] bg-[#4b3427] text-white" : "border-[#ded1be] bg-[#f7f2ea] hover:border-[#4b3427]"}`}>
                          {option.name}{option.priceDelta ? <span className="block text-xs font-semibold opacity-80">+{option.priceDelta}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700">{error}</p>}
            <button onClick={addSelectedItem} className="mt-4 h-14 w-full rounded-xl bg-[#4b3427] text-xl font-bold text-white active:bg-[#3a2820]">เพิ่มลงตะกร้า</button>
          </section>
        </div>
      )}

      {/* ── Customer + Discount modal ──────────────────────────────────── */}
      {showCustomerModal && (
        <CustomerDiscountModal
          subtotal={subtotal}
          promotions={promotions}
          pointValue={pointValue}
          customer={customer}
          promotionId={promotionId}
          redeemPoints={redeemPoints}
          maxRedeemable={maxRedeemable}
          onSetCustomer={setCustomer}
          onSetPromotion={setPromotionId}
          onSetRedeemPoints={setRedeemPoints}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* ── Stock warning dialog ────────────────────────────────────────── */}
      {stockWarnings.length > 0 && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-5">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={26} /></div>
              <div>
                <h3 className="text-2xl font-bold">วัตถุดิบไม่เพียงพอ</h3>
                <p className="text-[#74665a]">ยืนยันเพื่อขายต่อ (สต็อกจะติดลบ)</p>
              </div>
            </div>
            <div className="mb-5 overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
              <table className="w-full text-left text-base">
                <thead><tr className="border-b border-amber-200 text-amber-800"><th className="p-3">วัตถุดิบ</th><th className="p-3 text-right">ต้องการ</th><th className="p-3 text-right">มีอยู่</th><th className="p-3 text-right">ขาด</th></tr></thead>
                <tbody>
                  {stockWarnings.map((w) => (
                    <tr key={w.ingredientName} className="border-t border-amber-100">
                      <td className="p-3 font-bold">{w.ingredientName}</td>
                      <td className="p-3 text-right">{w.needed} {w.unit}</td>
                      <td className="p-3 text-right text-amber-700">{w.available} {w.unit}</td>
                      <td className="p-3 text-right font-bold text-red-600">-{w.shortage} {w.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setStockWarnings([]); setPendingPayload(null); }} className="h-14 rounded-xl bg-[#f0e5d7] text-lg font-bold text-[#4b3427]">ยกเลิก</button>
              <button disabled={isPending} onClick={confirmForceSale} className="h-14 rounded-xl bg-amber-500 text-lg font-bold text-white disabled:opacity-50 hover:bg-amber-600">
                {isPending ? "กำลังบันทึก..." : "ยืนยัน ขายต่อ"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Customer + Discount Modal ──────────────────────────────────────────────────

function CustomerDiscountModal({
  subtotal, promotions, pointValue, customer, promotionId, redeemPoints, maxRedeemable,
  onSetCustomer, onSetPromotion, onSetRedeemPoints, onClose,
}: {
  subtotal: number;
  promotions: PromoLite[];
  pointValue: number;
  customer: CustomerLite | null;
  promotionId: string | null;
  redeemPoints: number;
  maxRedeemable: number;
  onSetCustomer: (c: CustomerLite | null) => void;
  onSetPromotion: (id: string | null) => void;
  onSetRedeemPoints: (n: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [err, setErr] = useState("");

  async function doSearch() {
    setSearching(true); setErr("");
    try { setResults(await searchCustomers(query)); }
    catch { setErr("ค้นหาไม่สำเร็จ"); }
    finally { setSearching(false); }
  }

  async function doAdd() {
    setErr("");
    try {
      const c = await quickAddCustomer(addName, addPhone);
      onSetCustomer(c);
      setAddName(""); setAddPhone("");
    } catch (e) { setErr(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ"); }
  }

  const eligiblePromos = promotions.filter((p) => isPromoEligible(p, subtotal));

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-bold">ลูกค้า & ส่วนลด</h3>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0e5d7] text-[#4b3427]"><X size={20} /></button>
        </div>

        {/* Customer */}
        <div className="mb-5">
          <p className="mb-2 text-lg font-bold">ลูกค้า</p>
          {customer ? (
            <div className="flex items-center justify-between rounded-xl bg-[#f0e5d7] p-3">
              <div>
                <p className="font-bold">{customer.name}</p>
                <p className="text-sm text-[#74665a]">{customer.phone} · {customer.points} แต้ม</p>
              </div>
              <button onClick={() => { onSetCustomer(null); onSetRedeemPoints(0); }} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-red-600">นำออก</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
                  placeholder="ค้นหาเบอร์โทร / ชื่อ" className="h-11 flex-1 rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]" />
                <button onClick={doSearch} className="h-11 rounded-xl bg-[#4b3427] px-4 text-sm font-bold text-white">{searching ? "..." : "ค้นหา"}</button>
              </div>
              {results.length > 0 && (
                <div className="mt-2 space-y-1">
                  {results.map((c) => (
                    <button key={c.id} onClick={() => { onSetCustomer(c); setResults([]); }}
                      className="flex w-full items-center justify-between rounded-xl bg-[#f7f2ea] p-3 text-left hover:bg-[#f0e5d7]">
                      <span className="font-bold">{c.name}</span>
                      <span className="text-sm text-[#74665a]">{c.phone} · {c.points} แต้ม</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-xl border border-dashed border-[#ded1be] p-3">
                <p className="mb-2 text-sm font-bold text-[#74665a]">เพิ่มลูกค้าใหม่</p>
                <div className="flex gap-2">
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="ชื่อ" className="h-10 flex-1 rounded-xl border-2 border-[#d8c8b5] px-3 text-sm outline-none focus:border-[#4b3427]" />
                  <input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} inputMode="tel" placeholder="เบอร์โทร" className="h-10 flex-1 rounded-xl border-2 border-[#d8c8b5] px-3 text-sm outline-none focus:border-[#4b3427]" />
                  <button onClick={doAdd} className="h-10 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white">เพิ่ม</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Points redemption */}
        {customer && customer.points > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-lg font-bold">แลกแต้ม <span className="text-sm font-normal text-[#74665a]">(1 แต้ม = {pointValue} บาท)</span></p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={maxRedeemable} value={redeemPoints || ""} onChange={(e) => onSetRedeemPoints(Math.max(0, Math.min(maxRedeemable, parseInt(e.target.value || "0", 10))))}
                placeholder="0" className="h-11 flex-1 rounded-xl border-2 border-[#d8c8b5] px-3 text-base outline-none focus:border-[#4b3427]" />
              <button onClick={() => onSetRedeemPoints(maxRedeemable)} className="h-11 rounded-xl bg-[#f0e5d7] px-4 text-sm font-bold text-[#4b3427]">สูงสุด ({maxRedeemable})</button>
            </div>
          </div>
        )}

        {/* Promotions */}
        <div className="mb-5">
          <p className="mb-2 text-lg font-bold">โปรโมชั่น</p>
          {eligiblePromos.length === 0 ? (
            <p className="rounded-xl bg-[#f7f2ea] p-3 text-sm text-[#74665a]">ไม่มีโปรโมชั่นที่ใช้ได้กับยอดนี้</p>
          ) : (
            <div className="space-y-1">
              <button onClick={() => onSetPromotion(null)}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-left ${!promotionId ? "bg-[#4b3427] text-white" : "bg-[#f7f2ea]"}`}>
                <span className="font-bold">ไม่ใช้โปรโมชั่น</span>
              </button>
              {eligiblePromos.map((p) => (
                <button key={p.id} onClick={() => onSetPromotion(p.id)}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left ${promotionId === p.id ? "bg-emerald-600 text-white" : "bg-[#f7f2ea] hover:bg-[#f0e5d7]"}`}>
                  <span className="font-bold">{p.name}</span>
                  <span className="text-sm">{p.type === "PERCENT" ? `${p.value}%` : `${p.value} บาท`}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {err && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">{err}</p>}

        <button onClick={onClose} className="h-14 w-full rounded-xl bg-[#4b3427] text-xl font-bold text-white">เสร็จสิ้น</button>
      </section>
    </div>
  );
}
