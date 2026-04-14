import Link from 'next/link';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900 font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 sm:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Equily</p>
              <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tight text-slate-900">AGB</h1>
              <div className="flex flex-wrap gap-3">
                <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Datenschutz
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
          <h2 className="text-xl font-black italic uppercase text-slate-900">1. Geltungsbereich</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Plattform „Equily“ (im Folgenden „Plattform“). 
            </p>
          <p className="text-sm text-slate-600 leading-relaxed"> 
              Mit der Registrierung oder Nutzung der Plattform erklärst du dich mit diesen AGB einverstanden.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Leistungsbeschreibung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Equily ist eine Online-Plattform zur Vermittlung von Kontakten im Bereich Pferd, Training, Dienstleistungen und Jobs.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir stellen lediglich die technische Infrastruktur zur Verfügung.
          </p>
          <h3>Wichtig:</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
          Equily ist nicht Anbieter der angebotenen Leistungen und wird nicht Vertragspartei zwischen Nutzern.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Registrierung & Nutzerkonto</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Zugangsdaten sind vertraulich zu behandeln. Konten dürfen nicht missbräuchlich genutzt werden.
            Nutzerinnen und Nutzer sind verpflichtet, ihre Angaben korrekt und aktuell zu halten. 
            Nutzer müssen ihre Zugangsdaten vertraulich behandeln und sind für alle Aktivitäten über sein Konto selbst verantwortlich.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Inhalte der Nutzer</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Nutzer können eigene Inhalte (z. B. Profile, Anzeigen, Texte) veröffentlichen
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Für diese Inhalte sind ausschließlich die jeweiligen Nutzer verantwortlich
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Es ist verboten:
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            - falsche oder irreführende Angaben zu machen
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - rechtswidrige Inhalte zu veröffentlichen
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - andere Nutzer zu belästigen oder zu täuschen
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Haftung für Inhalte</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Equily übernimmt keine Haftung für Inhalte, die von Nutzern bereitgestellt werden.
            Wir behalten uns vor, Inhalte zu prüfen, zu bearbeiten oder zu löschen.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. Vermittlung & Verträge</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Die Plattform dient ausschließlich der Kontaktvermittlung
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Verträge kommen ausschließlich zwischen den Nutzern zustande
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wir übernehmen keine Gewähr für:
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            - das Zustandekommen von Kontakten
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - die Qualität von Angeboten
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - das Verhalten anderer Nutzer
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Sperrung & Löschung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wir behalten uns vor, Nutzerkonten zu sperren oder zu löschen, wenn:
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            - gegen diese AGB verstoßen wird
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - Missbrauch vorliegt
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Haftung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Haftung von Equily ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.
            Bei leichter Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">9. Verfügbarkeit</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit der Plattform, übernehmen jedoch keine Garantie dafür.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">10. Änderungen der AGB</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir behalten uns vor, diese AGB jederzeit anzupassen.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">10. Anwendbares Recht</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese AGB unterliegen dem deutschen Recht.
          </p>
        </section>

         <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">11. Preise und Abonnements</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Einige Funktionen der Plattform sind kostenpflichtig und werden im Rahmen eines Abonnements angeboten.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            Die Preise werden auf der Plattform angezeigt.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            Das Abonnement verlängert sich automatisch um die jeweils gewählte Laufzeit, sofern es nicht rechtzeitig gekündigt wird.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">12. Kündigung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Das Abonnement kann jederzeit bis zum Ende der jeweiligen Laufzeit gekündigt werden.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
           Nach Kündigung bleibt der Zugang bis zum Ablauf der Laufzeit bestehen.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            Bereits gezahlte Beträge werden nicht erstattet, sofern keine gesetzliche Verpflichtung besteht.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">13. Zahlungsarten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Die Zahlung erfolgt wahlweise per SEPA-Lastschrift oder über den Zahlungsdienstleister PayPal.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
          Bei Auswahl von PayPal erfolgt die Zahlungsabwicklung über PayPal (Europe) S.à r.l. et Cie, S.C.A.
          Es gelten die Nutzungsbedingungen von PayPal.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">14. SEPA-Lastschrift</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Bei Auswahl der SEPA-Lastschrift erteilt der Nutzer uns ein SEPA-Lastschriftmandat.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
          Der fällige Betrag wird zum angegebenen Zeitpunkt vom angegebenen Konto eingezogen.
            </p>
             <p className="text-sm text-slate-600 leading-relaxed">
          Der Nutzer ist verpflichtet, für ausreichende Kontodeckung zu sorgen.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">15. Zahlungsverzug</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Kommt der Nutzer in Zahlungsverzug, behalten wir uns vor, den Zugang zu kostenpflichtigen Funktionen einzuschränken oder zu sperren.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">16. Widerrufsrecht</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Verbraucher haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
          Die Widerrufsfrist beträgt 14 Tage ab Vertragsschluss.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
           Um das Widerrufsrecht auszuüben, muss der Nutzer uns mittels einer eindeutigen Erklärung (z. B. per E-Mail) über den Entschluss informieren.
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
          Wichtiger Hinweis:
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
          Bei digitalen Dienstleistungen erlischt das Widerrufsrecht vorzeitig, wenn: der Nutzer ausdrücklich zustimmt, dass wir mit der Ausführung der Dienstleistung vor Ablauf der Widerrufsfrist beginnen, und der Nutzer bestätigt, dass er dadurch sein Widerrufsrecht verliert.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">11. Stand</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Stand: 04.04.2026</p>
        </section>
          </section>
        </div>
      </main>
    </div>
  );
}
