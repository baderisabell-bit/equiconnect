import Link from "next/link";

export default function WiderrufsbelehrungPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Equily</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Widerrufsbelehrung</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/widerrufsformular" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Widerrufsformular
            </Link>
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              AGB
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Widerrufsrecht für Verbraucher</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            (Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können.)
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Isabell Bader, Schwendener Straße 23, 87616 Marktoberdorf, Telefonnummer: +4915117903181, E-Mail-Adresse: widerruf@equily.de) mittels einer eindeutigen Erklärung über Ihren Entschluss informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sie können Ihr Widerrufsrecht auch online unter einer entsprechend bezeichneten Schaltfläche auf unserer Webseite ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Folgen des Widerrufs</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Das Widerrufsrecht erlischt bei digitalen Inhalten, wenn Sie ausdrücklich zugestimmt haben, dass wir mit der Vertragserfüllung vor Ablauf der Widerrufsfrist beginnen und Sie Ihre Kenntnis vom Erlöschen des Widerrufsrechts bestätigt haben.
          </p>
        </section>
      </main>
    </div>
  );
}
