import Link from 'next/link';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900 font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 sm:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Equily</p>
              <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tight text-slate-900">Allgemeine Geschäftsbedingungen und Kundeninformationen</h1>
              <div className="flex flex-wrap gap-3">
                <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Datenschutzerklärung
                </Link>
                <Link href="/cookies" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Cookies & Speicher
                </Link>
                <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Zur Startseite
                </Link>
              </div>
            </div>
          </aside>

          <section className="space-y-5 sm:space-y-6">
        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">I. Allgemeine Geschäftsbedingungen</h2>
          <h3>§ 1 Grundlegende Bestimmungen</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(1)</strong> Die nachstehenden Geschäftsbedingungen gelten für Verträge, die Sie mit uns als Anbieter <strong>(Isabell Bader)</strong> über die Internetseite www.equily.de schließen. Soweit nicht anders vereinbart, wird der Einbeziehung gegebenenfalls von Ihnen verwendeter eigener Bedingungen widersprochen.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed"> 
              <strong>(2)</strong> Verbraucher im Sinne der nachstehenden Regelungen ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen beruflichen Tätigkeit zugerechnet werden kann. Unternehmer ist jede natürliche oder juristische Person oder eine rechtsfähige Personengesellschaft, die bei Abschluss eines Rechtsgeschäfts in Ausübung ihrer selbständigen beruflichen oder gewerblichen Tätigkeit handelt.
              </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 2 Zustandekommen des Vertrages</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(1)</strong> Gegenstand des Vertrages ist der Verkauf von digitalen Inhalten (Daten, die in digitaler Form erstellt und bereitgestellt werden).
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(2)</strong> Ihre Anfragen zur Erstellung eines Angebotes sind für Sie unverbindlich. Wir unterbreiten Ihnen hierzu ein verbindliches Angebot in Textform (z.B. per E-Mail), welches Sie innerhalb von 5 Tagen (soweit im jeweiligen Angebot keine andere Frist ausgewiesen ist) annehmen können.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
          <strong>(3)</strong> Die Abwicklung der Bestellung und Übermittlung aller im Zusammenhang mit dem Vertragsschluss erforderlichen Informationen erfolgt per E-Mail zum Teil automatisiert. Sie haben deshalb sicherzustellen, dass die von Ihnen bei uns hinterlegte E-Mail-Adresse zutreffend ist, der Empfang der E-Mails technisch sichergestellt und insbesondere nicht durch SPAM-Filter verhindert wird.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 3 Nutzungslizenz bei digitalen Inhalten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(1)</strong> Die angebotenen digitalen Inhalte sind urheberrechtlich geschützt. Sie erhalten zu jedem bei uns erworbenen digitalen Inhalt eine Nutzungslizenz durch den jeweiligen Lizenzgeber. Art und Umfang der Nutzungslizenz ergeben sich aus den im jeweiligen Angebot genannten Lizenzbestimmungen.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(2)</strong> Soweit im jeweiligen Angebot nichts anderes angegeben ist, erhalten Sie eine einfache Nutzungslizenz. Diese umfasst ein nicht ausschließliches, zeitlich auf die im Angebot angegebene Nutzungsdauer beschränktes Recht zur Nutzung, insbesondere die Erlaubnis, eine Kopie des digitalen Inhaltes für Ihren persönlichen Gebrauch auf Ihrem Computer bzw. sonstigem elektronischen Gerät abzuspeichern und/oder auszudrucken. 
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            Sie sind nicht berechtigt, die vertragsgegenständlichen digitalen Inhalte oder Teile davon zu vermieten oder weder entgeltlich noch unentgeltlich unterlizenzieren, öffentlich wiedergeben oder in sonstiger Weise zugänglich zu machen oder sonst Dritten zur Verfügung stellen.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 4 Vertragslaufzeit / Kündigung bei Abonnement-Verträgen</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(1)</strong> Der zwischen Ihnen und uns geschlossene Abonnement-Vertrag hat die im jeweiligen Angebot ausgewiesene Laufzeit, nachfolgend "Grundlaufzeit" genannt. Eine Grundlaufzeit von mehr als 2 Jahren kann nicht vereinbart werden.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(2)</strong> Wird der Abonnement-Vertrag nicht einen Monat vor Ablauf der Grundlaufzeit (soweit im jeweiligen Angebot keine kürzere Frist geregelt ist) von einer der Parteien gekündigt, verlängert er sich stillschweigend auf unbestimmte Zeit.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Das verlängerte Vertragsverhältnis kann jederzeit mit einer Frist von einem Monat (soweit im jeweiligen Angebot keine kürzere Frist geregelt ist) gekündigt werden.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(3)</strong> Das Recht zur fristlosen Kündigung aus wichtigem Grund bleibt hiervon unberührt.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(4)</strong> Jede Kündigung muss entweder in Textform (z.B. E-Mail) oder über die auf unserer Internetpräsenz eingebundene Kündigungsschaltfläche (“Verträge hier kündigen” oder ähnliche Bezeichnung) erklärt und übermittelt werden.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 5 Besondere Vereinbarungen zu angebotenen Zahlungsarten</h2>
          <h3>(1) SEPA-Lastschrift </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei Zahlung per SEPA-Lastschrift ermächtigen Sie uns durch Erteilung eines entsprechenden SEPA-Mandats, den Rechnungsbetrag vom angegebenen Konto einzuziehen. 
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Der Einzug der Lastschrift erfolgt innerhalb von 5-7 Tagen nach Vertragsschluss.
            Die Frist für die Übermittlung der Vorabankündigung (Pre-Notification) wird auf 5 Tage vor dem Fälligkeitsdatum verkürzt. Sie sind verpflichtet für die ausreichende Deckung des Kontos zum Fälligkeitsdatum zu sorgen. Im Falle einer Rücklastschrift aufgrund Ihres Verschuldens haben Sie die anfallende Bankgebühr zu tragen.
            </p>
          <h3>(2) Zahlung über "PayPal" / "PayPal Checkout"</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei Auswahl einer Zahlungsart, die über "PayPal" / "PayPal Checkout" angeboten wird, erfolgt die Zahlungsabwicklung über den Zahlungsdienstleister PayPal (Europe) S.à.r.l. et Cie, S.C.A. (22-24 Boulevard Royal L-2449, Luxemburg; "PayPal"). Die einzelnen Zahlungsarten über "PayPal" werden Ihnen unter einer entsprechend bezeichneten Schaltfläche auf unserer Internetpräsenz sowie im Online-Bestellvorgang angezeigt. Für die Zahlungsabwicklung kann sich "PayPal" weiterer Zahlungsdienste bedienen; soweit hierfür besondere Zahlungsbedingungen gelten, werden Sie auf diese gesondert hingewiesen. Nähere Informationen zu "PayPal" finden Sie unter https://www.paypal.com/de/webapps/mpp/ua/legalhub-full.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 6 Zurückbehaltungsrecht</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ein Zurückbehaltungsrecht können Sie nur ausüben, soweit es sich um Forderungen aus demselben Vertragsverhältnis handelt.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 7 Gewährleistung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           <strong>(1)</strong> Es bestehen die gesetzlichen Mängelhaftungsrechte.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(2)</strong> Soweit ein Merkmal des digitalen Inhalts von den objektiven Anforderungen abweicht, gilt die Abweichung nur dann als vereinbart, wenn Sie vor Abgabe der Vertragserklärung durch uns über selbige in Kenntnis gesetzt wurden und die Abweichung ausdrücklich und gesondert zwischen den Vertragsparteien vereinbart wurde.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(3)</strong> Soweit Sie Unternehmer sind, gilt abweichend von den vorstehenden Gewährleistungsregelungen:
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
           a) Als Beschaffenheit des digitalen Inhalts gelten nur unsere eigenen Angaben und die Produktbeschreibung des Herstellers als vereinbart, nicht jedoch sonstige Werbung, öffentliche Anpreisungen und Äußerungen des Herstellers.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            b) Bei Mängeln leisten wir nach unserer Wahl Gewähr durch Nachbesserung oder Nachlieferung. Schlägt die Mangelbeseitigung fehl, können Sie nach Ihrer Wahl Minderung verlangen oder vom Vertrag zurücktreten. Die Mängelbeseitigung gilt nach erfolglosem zweiten Versuch als fehlgeschlagen, wenn sich nicht insbesondere aus der Art des digitalen Inhalts oder des Mangels oder den sonstigen Umständen etwas anderes ergibt.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            c) Die Gewährleistungsfrist beträgt ein Jahr ab Ablieferung des digitalen Inhalts. Die Fristverkürzung gilt nicht:
              - für uns zurechenbare schuldhaft verursachte Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit und bei vorsätzlich oder grob fahrlässig verursachten sonstigen Schäden;
              - soweit wir den Mangel arglistig verschwiegen oder eine Garantie für die Beschaffenheit des digitalen Inhalts übernommen haben;
              - bei Sachen, die entsprechend ihrer üblichen Verwendungsweise für ein Bauwerk verwendet worden sind und dessen Mangelhaftigkeit verursacht haben;
              - bei gesetzlichen Rückgriffsansprüchen, die Sie im Zusammenhang mit Mängelrechten gegen uns haben.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">§ 8 Rechtswahl</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(1)</strong> Es gilt deutsches Recht. Bei Verbrauchern gilt diese Rechtswahl nur, soweit hierdurch der durch zwingende Bestimmungen des Rechts des Staates des gewöhnlichen Aufenthaltes des Verbrauchers gewährte Schutz nicht entzogen wird (Günstigkeitsprinzip).
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>(2)</strong> Die Bestimmungen des UN-Kaufrechts finden ausdrücklich keine Anwendung.
            </p>
        </section>
      </section>
    

      <section className="space-y-5 sm:space-y-6">
        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">II. Kundeninformationen</h2>
          <h3>1. Identität des Verkäufers</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Isabell Bader
            Schwendener Straße 23
            87616 Marktoberdorf
            Deutschland
            Telefon: +4915117903181
            E-Mail: info@equily.de
            </p>
          <p className="text-sm text-slate-600 leading-relaxed"> 
              Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teilzunehmen.
              </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Informationen zum Zustandekommen des Vertrages</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Die technischen Schritte zum Vertragsschluss, der Vertragsschluss selbst und die Korrekturmöglichkeiten erfolgen nach Maßgabe der Regelungen "Zustandekommen des Vertrages" unserer Allgemeinen Geschäftsbedingungen (Teil I.).
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Vertragssprache, Vertragstextspeicherung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            3.1. Vertragssprache ist deutsch .
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            3.2. Der vollständige Vertragstext wird von uns nicht gespeichert. Vor Absenden der Bestellung  können die Vertragsdaten über die Druckfunktion des Browsers ausgedruckt oder elektronisch gesichert werden. Nach Zugang der Bestellung bei uns werden die Bestelldaten, die gesetzlich vorgeschriebenen Informationen bei Fernabsatzverträgen und die Allgemeinen Geschäftsbedingungen nochmals per E-Mail an Sie übersandt.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            3.3. Bei Angebotsanfragen außerhalb des Online-Warenkorbsystems erhalten Sie alle Vertragsdaten im Rahmen eines verbindlichen Angebotes in Textform übersandt, z.B. per E-Mail, welche Sie ausdrucken oder elektronisch sichern können.
            </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Wesentliche Merkmale der Ware oder Dienstleistung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die wesentlichen Merkmale der Ware und/oder Dienstleistung finden sich im jeweiligen Angebot.
          </p>
        </section>

         <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Preise und Zahlungsmodalitäten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           5.1. Die in den jeweiligen Angeboten angeführten Preise sowie die Versandkosten stellen Gesamtpreise dar. Sie beinhalten alle Preisbestandteile einschließlich aller anfallenden Steuern.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
           5.2. Es fallen keine Versandkosten an.
           </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            5.3. Die Ihnen zur Verfügung stehenden Zahlungsarten sind unter einer entsprechend bezeichneten Schaltfläche auf unserer Internetpräsenz oder im jeweiligen Angebot ausgewiesen.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            5.4. Soweit bei den einzelnen Zahlungsarten nicht anders angegeben, sind die Zahlungsansprüche aus dem geschlossenen Vertrag sofort zur Zahlung fällig.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. Bereitstellung </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           6.1. Die Bedingungen für die Bereitstellung, den Bereitstellungstermin sowie gegebenenfalls bestehenden Bereitstellungsbeschränkungen finden sich unter einer entsprechend bezeichneten Schaltfläche auf unserer Internetpräsenz oder im jeweiligen Angebot.
           </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Gesetzliches Mängelhaftungsrecht</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Die Mängelhaftung richtet sich nach der Regelung "Gewährleistung" in unseren Allgemeinen Geschäftsbedingungen (Teil I).
           </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Vertragslaufzeit / Kündigung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Informationen zur Laufzeit des Vertrages sowie den Kündigungsbedingungen finden Sie in der Regelung "Vertragslaufzeit / Kündigung bei Abonnement-Verträgen" in unseren Allgemeinen Geschäftsbedingungen (Teil I) sowie im jeweiligen Angebot.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
          Diese AGB und Kundeninformationen wurden von den auf IT-Recht spezialisierten Juristen des Händlerbundes erstellt und werden permanent auf Rechtskonformität geprüft. Die Händlerbund Management AG garantiert für die Rechtssicherheit der Texte und haftet im Falle von Abmahnungen. Nähere Informationen dazu finden Sie unter: https://www.haendlerbund.de/de/leistungen/rechtssicherheit/agb-service.
          </p>
        </section>
          </section>
        </div>
      </main>
    </div>
  );
}
