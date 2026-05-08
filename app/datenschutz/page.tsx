import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Datenschutzerklärung</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">AGB</Link>
            <Link href="/cookies" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Cookies</Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Zur Startseite</Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Allgemeine Hinweise</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Wir behandeln personenbezogene Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Soweit nachstehend keine anderen Angaben gemacht werden, ist die Bereitstellung Ihrer personenbezogenen Daten weder gesetzlich noch vertraglich vorgeschrieben.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Verantwortlicher und Kontakt</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Verantwortlicher ist Isabell Bader, Schwendenerstraße 23, 87616 Marktoberdorf, Deutschland, Telefon: +4915117903181, E-Mail: info@equily.de.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Bei Kontaktaufnahme per E-Mail oder Kontaktformular verarbeiten wir Ihre Angaben zur Bearbeitung Ihrer Anfrage auf Basis von Art. 6 Abs. 1 lit. b oder f DSGVO.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Server-Logfiles und Cookies</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Beim Aufruf der Website werden technische Nutzungsdaten in Server-Logfiles gespeichert. Zusätzlich verwenden wir notwendige Cookies und ein Consent-Tool zur Dokumentation von Einwilligungen.</p>
          <p className="text-sm text-slate-600 leading-relaxed">Optionale Speicher und Analyse-Tools werden nur mit Einwilligung oder auf Grundlage berechtigter Interessen eingesetzt.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Betroffenenrechte</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Außerdem haben Sie ein Beschwerderecht bei der zuständigen Aufsichtsbehörde.</p>
        </section>
      </main>
    </div>
  );
}
