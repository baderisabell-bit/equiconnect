import Link from "next/link";

export default function WiderrufsformularPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Widerrufsformular</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/widerrufsbelehrung" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Widerrufsbelehrung
            </Link>
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              AGB
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.
          </p>

          <form className="space-y-4">
            <input type="text" placeholder="Vor- und Nachname" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
            <input type="email" placeholder="E-Mail-Adresse" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
            <input type="text" placeholder="Vertrags-/Bestellnummer (optional)" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />
            <textarea placeholder="Hiermit widerrufe ich..." className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none" />

            <p className="text-xs text-slate-600">
              Mit Absenden erklärst du den Widerruf. Details findest du in der <Link href="/widerrufsbelehrung" className="font-black underline">Widerrufsbelehrung</Link>.
            </p>

            <button type="button" className="rounded-xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800">
              Widerruf absenden
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
