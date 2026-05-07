export default function ZahlungUndVersandPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-3">
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">Zahlung und Versand</h1>
        <p className="text-sm text-slate-600">Es gelten folgende Bedingungen:</p>
      </div>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Bereitstellung von digitalen Inhalten:</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Die Bereitstellung der Inhalte erfolgt nur innerhalb von Deutschland
            Für digitale Inhalte (Daten, die in digitaler Form erstellt und bereitgestellt werden) fallen keine Versandkosten an.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Digitale Inhalte werden Ihnen in Ihrem Kundenaccount bereitgestellt. 
            Die Bereitstellung erfolgt innerhalb von 24 Stunden nach Vertragsschluss (bei vereinbarter Vorauszahlung nach dem Zeitpunkt Ihrer Zahlungsanweisung).
            Über die Bereitstellung werden Sie auch per E-Mail informiert.
            </p>
        </section>
        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Akzeptierte Zahlungsmöglichkeiten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           -  Zahlung per SEPA-Lastschrift
            -  Sofortüberweisung von GoCardless
            </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Über PayPal Checkout:</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
             -  Zahlung per PayPal
             </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Weitere Einzelheiten zur Zahlung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei Zahlung per SEPA-Lastschrift ermächtigen Sie uns durch Erteilung eines entsprechenden SEPA-Mandats, den Rechnungsbetrag vom angegebenen Konto einzuziehen.
            Sie erhalten eine Vorabankündigung (Pre-Notification) mindestens 5 Tage vor dem Datum des Lastschrifteinzugs. Beachten Sie bitte, dass Sie verpflichtet sind für die ausreichende Deckung des Kontos zum angekündigten Datum zu sorgen.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei Fragen finden Sie unsere Kontaktdaten im Impressum.
          </p>
        </section>

    </main>
  );
}
