import Link from "next/link";

export default function WiderrufsbelehrungPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Rechtliches</p>
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">Wiederrufsbelehrung</h1>
        <p className="text-sm text-slate-600">
          Diese Seite stellt die Informationen zur Widerrufsbelehrung bereit. Bei Fragen nutze bitte das <Link href="/widerrufsformular" className="font-black underline">Widerrufsformular</Link>.
        </p>
      </div>
    </main>
  );
}
