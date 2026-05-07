import Link from "next/link";

export default function WiderrufsformularPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Widerruf</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Widerrufsformular</h1>
          <p className="mt-2 text-sm text-slate-600">
            Nutze dieses Formular, um den Widerruf deines Abos oder einer kostenpflichtigen Leistung zu übermitteln.
          </p>
        </div>

        <form className="space-y-4">
          <input type="text" placeholder="Vor- und Nachname" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
          <input type="email" placeholder="E-Mail-Adresse" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
          <input type="text" placeholder="Vertrags-/Bestellnummer (optional)" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
          <textarea placeholder="Hiermit widerrufe ich..." className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />

          <p className="text-xs text-slate-600">
            Mit Absenden erklärst du den Widerruf. Details findest du in der <Link href="/widerrufsbelehrung" className="font-black underline">Wiederrufsbelehrung</Link>.
          </p>

          <button type="button" className="rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800">
            Widerruf absenden
          </button>
        </form>
      </div>
    </main>
  );
}
