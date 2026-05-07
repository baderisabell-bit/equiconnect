import Link from 'next/link';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Impressum</h1>
          </div>
          <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
            Zur Startseite
          </Link>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Gesetzliche Anbieterkennung: </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Isabell Bader<br />
            Equily<br />
            Schwendenerstraße 23<br />
            87616 Marktoberdorf<br />
            Deutschland<br />
            Telefon: +4915117903181<br />
            E-Mail: info@equily.de<br />
            Kontaktformular: info@equily.de, Email: info@equily.de, Interne Nachrichten
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Inhaltlich Verantwortlicher gemäß § 18 Abs. 2 MStV:</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Frau Isabell Bader<br />
            Innerkoflerstraße 40<br />
            81377 München<br />
            Deutschland
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Unternehmensform</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Rechtsform: Kleingewerbe / Einzelunternehmen<br />
            Umsatzsteuer: Es wird gemäß § 19 UStG keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">zuständige Aufsichtsbehörde für audiovisuelle Mediendienste:</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bayerische Landeszentrale für neue Medien (BLM)<br />
            Heinrich-Lübke-Str. 27<br />
            81737 München<br />
            Internet: https://www.blm.de/
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Verantwortlich für den Inhalt</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teilzunehmen.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Eine Gewähr für Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird jedoch nicht übernommen.
          </p>
        </section>
      </main>
    </div>
  );
}