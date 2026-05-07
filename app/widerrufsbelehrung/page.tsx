import Link from "next/link";

export default function WiderrufsbelehrungPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-5">
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">Widerrufsrecht für den Verkauf von digitalen Inhalten </h1>
        <h2 className="text-xl font-black italic uppercase text-slate-900">Widerrufsrecht für Verbraucher</h2>
        <p className="text-sm text-slate-600">
          (Verbraucher ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können.)
          </p>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Widerrufsbelehrung</h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Widerrufsrecht</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
            Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.            
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns <strong> (Isabell Bader, Schwendener Straße 23, 87616 Marktoberdorf, Telefonnummer: +4915117903181, E-Mail-Adresse: widerruf@equily.de) </strong> mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
            </p>
        <p className="text-sm text-slate-600 leading-relaxed">
           Sie können Ihr Widerrufsrecht auch online unter einer entsprechend bezeichneten Schaltfläche ("Vertrag widerrufen" oder ähnliche Bezeichnung) auf unserer Webseite (www.equily.de) ausüben. Wenn Sie diese Online-Funktion nutzen, übermitteln wir Ihnen auf einem dauerhaften Datenträger (z.B. durch eine E-Mail) unverzüglich eine Eingangsbestätigung mit Informationen zum Inhalt der Widerrufserklärung sowie dem Datum und der Uhrzeit ihres Eingangs.
            </p>
        <p className="text-sm text-slate-600 leading-relaxed">
           Sie können das Muster-Widerrufsformular oder eine andere eindeutige Erklärung auch auf unserer Webseite (www.equily.de) elektronisch ausfüllen und übermitteln. Machen Sie von dieser Möglichkeit Gebrauch, so werden wir Ihnen unverzüglich (z.B. per E-Mail) eine Bestätigung über den Eingang eines solchen Widerrufs übermitteln.
            </p>
        <p className="text-sm text-slate-600 leading-relaxed">
           Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
           </p>
        </section>



        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Folgen des Widerrufs</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
            </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Über PayPal Checkout:</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
             -  Zahlung per PayPal
             </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Erlöschensgründe</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Das Widerrufsrecht erlischt bei einem Vertrag über die Bereitstellung von nicht auf einem körperlichen Datenträger befindlichen digitalen Inhalten, der den Verbraucher zur Zahlung eines Preises verpflichtet, wenn der Verbraucher:
           </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            1. ausdrücklich zugestimmt hat, dass der Unternehmer mit der Vertragserfüllung vor Ablauf der Widerrufsfrist beginnt und
           </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            2. seine Kenntnis davon bestätigt hat, dass durch seine Zustimmung mit Beginn der Vertragserfüllung sein Widerrufsrecht erlischt und
             </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            3. der Unternehmer dem Verbraucher eine Bestätigung des Vertrags, innerhalb einer angemessenen Frist nach Vertragsschluss, spätestens jedoch bei Bereitstellung der nicht auf einem körperlichen Datenträger befindlichen digitalen Inhalte, auf einem dauerhaften Datenträger zur Verfügung gestellt hat:
            </p>
           <p className="text-sm text-slate-600 leading-relaxed">
           - in der der Vertragsinhalt wiedergegeben ist und
            - auf der festgehalten ist, dass der Verbraucher vor Vertragserfüllung ausdrücklich zugestimmt hat, dass der Unternehmer mit der Vertragserfüllung vor Ablauf der Widerrufsfrist beginnt, und seine Kenntnis davon bestätigt hat, dass er durch seine Zustimmung mit Beginn der Vertragserfüllung sein Widerrufsrecht verliert.
           </p>
        </section>

      </div>
    </main>
  );
}
