import Link from 'next/link';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">AGB</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Datenschutz
            </Link>
            <Link href="/cookies" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Cookies
            </Link>
            <Link href="/widerrufsbelehrung" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Widerrufsbelehrung
            </Link>
            <Link href="/zahlung-und-versand" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zahlung und Versand
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Geltungsbereich</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese Allgemeinen Geschäftsbedingungen gelten für Verträge über digitale Inhalte, Abonnements und die Nutzung der Plattform Equily.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Soweit nicht anders vereinbart, wird der Einbeziehung abweichender eigener Bedingungen widersprochen.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Vertragsschluss und Laufzeit</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bestellungen und Angebote werden per E-Mail bestätigt. Bei Abonnements gilt die im Angebot angegebene Laufzeit; danach verlängert sich der Vertrag, sofern nicht fristgerecht gekündigt wird.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Kündigungen sind in Textform oder über die bereitgestellte Kündigungsfunktion möglich.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Preise und Zahlung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die jeweils ausgewiesenen Preise sind Gesamtpreise. Verfügbare Zahlungsarten werden im Bestellprozess angezeigt.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Je nach Angebot stehen SEPA-Lastschrift und PayPal zur Verfügung.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Haftung und Recht</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Für Inhalte und Funktionen gelten die gesetzlichen Bestimmungen. Es gilt deutsches Recht unter Beachtung zwingender Verbraucherschutzvorschriften.
          </p>
        </section>
      </main>
    </div>
  );
}
