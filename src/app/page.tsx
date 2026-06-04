import { redirect } from "next/navigation";
import { Coffee } from "lucide-react";
import { getSession } from "@/lib/auth";
import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/pos");
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] p-6">
      <section className="w-full max-w-sm rounded-2xl border border-[#ded1be] bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#4b3427] text-white">
            <Coffee size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Coffee POS</h1>
            <p className="mt-1 text-lg text-[#74665a]">เข้าสู่ระบบด้วย PIN</p>
          </div>
        </div>

        <form action={loginAction} className="space-y-5">
          <input
            autoFocus
            name="pin"
            inputMode="numeric"
            type="password"
            maxLength={8}
            className="h-16 w-full rounded-xl border-2 border-[#d8c8b5] px-5 text-center text-4xl tracking-[0.5em] outline-none focus:border-[#4b3427]"
            aria-label="PIN"
          />
          {params.error === "pin" && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-lg font-semibold text-red-700">
              PIN ไม่ถูกต้อง กรุณาลองใหม่
            </p>
          )}
          <button
            type="submit"
            className="h-16 w-full rounded-xl bg-[#4b3427] text-2xl font-bold text-white active:bg-[#3a2820]"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </section>
    </main>
  );
}
