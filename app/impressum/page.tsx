import Link from 'next/link';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">EquiConnect</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Impressum</h1>
          </div>
          <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
            Zur Startseite
          </Link>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Wichtiger Hinweis</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die folgenden Angaben wurden auf Wunsch an den öffentlich auffindbaren Impressumsdaten von Isabell Bader ausgerichtet. Bitte prüfe vor Livegang selbst, ob diese Daten für equiconnect.site tatsächlich so verwendet werden sollen.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Angaben gemäß § 5 TMG</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            EquiConnect - Isabell Bader<br />
            Isabell Bader<br />
            Innerkoflerstrasse 40<br />
            81377 München<br />
            Deutschland
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Kontakt</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            E-Mail: baderisabell@gmail.com<br />
            Telefon: +49 (0) 151 17903181<br />
            Website: www.klassischbarocke-dressur.de
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
          <h2 className="text-xl font-black italic uppercase text-slate-900">Berufsbezeichnung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Reitlehrerin / Bereiterin mit Trainer C - klassisch-barocke Reiterei.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Verantwortlich für den Inhalt</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Isabell Bader<br />
            Innerkoflerstrasse 40<br />
            81377 München
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Haftung für Inhalte</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Eine Gewähr für Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird jedoch nicht übernommen.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Bildnachweise</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Private Aufnahmen<br />
            Foto: Christina Meyer
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Streitschlichtung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit. Falls du diesen Hinweis brauchst, ergänze hier den finalen Rechtstext nach deiner tatsächlichen Unternehmensform und Prüfung.
          </p>
        </section>
      </main>
    </div>
  );
}