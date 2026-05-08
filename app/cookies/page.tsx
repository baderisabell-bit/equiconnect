import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Cookies & Speicher</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Datenschutz</Link>
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">AGB</Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Zur Startseite</Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Grundsatz</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Equily verwendet notwendige und optionale Browser-Speicher, damit Login, Sicherheit und Bedienkomfort zuverlässig arbeiten.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Notwendige Speicher</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Für den Betrieb werden beispielsweise Sitzungsdaten, Rollenstatus und Navigationszustände geschützter Bereiche im Browser gespeichert.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Optionale Speicher</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Optionale Daten wie Komfortzustände werden nur verwendet, wenn du im Speicher-Banner „Alle akzeptieren“ auswählst.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Kontrolle und Löschung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Du kannst Browser-Speicher jederzeit in deinen Browsereinstellungen löschen und deine Auswahl erneut festlegen.</p>
        </section>
      </main>
    </div>
  );
}
