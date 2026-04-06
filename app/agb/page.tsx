import Link from 'next/link';

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">EquiConnect</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">AGB</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Datenschutz
            </Link>
            <Link href="/cookies" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Cookies & Speicher
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Hinweis</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese AGB bilden die Grundlage für die Nutzung von EquiConnect.
            Sie ersetzen keine individuelle Rechtsberatung und sollten vor Livebetrieb rechtlich final geprüft werden.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">1. Geltungsbereich</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese Bedingungen gelten für alle registrierten Nutzerinnen und Nutzer sowie Expertinnen und Experten,
            die EquiConnect verwenden.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Leistungen der Plattform</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            EquiConnect stellt u. a. Profilseiten, Suche, Netzwerk, Nachrichten, Merkliste,
            Buchungs- und Rechnungsfunktionen, Kalenderfunktionen, Benachrichtigungen sowie Moderationsmechanismen bereit.
            Ein bestimmter wirtschaftlicher oder vermittlungsbezogener Erfolg wird nicht geschuldet.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Konto, Zugang und Sicherheit</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Zugangsdaten sind vertraulich zu behandeln. Konten dürfen nicht missbräuchlich genutzt werden.
            Nutzerinnen und Nutzer sind verpflichtet, ihre Angaben korrekt und aktuell zu halten.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Abonnements und Premiumfunktionen</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bestimmte Funktionen sind an aktive Abos gebunden, z. B. Experten-Pro oder Nutzer-Plus.
            Dazu können je nach Plan unter anderem erweiterte Sichtbarkeit, Frühzugriff, Kalenderfunktionen,
            Kundenverwaltung oder besondere Gruppenfunktionen zählen.
            Ohne aktives Premium-Abo können entsprechende Funktionen eingeschränkt oder gesperrt sein.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Newsletter und Kommunikation</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Newsletter sind optional und können jederzeit aktiviert oder deaktiviert werden. Wenn keine Zustimmung vorliegt,
            kann ein Hinweisbanner in maximal wöchentlichem Abstand erscheinen. Inhalte können je nach Rolle und Tarif
            segmentiert sein (Experten, Experten-Abo, Experten-Pro-Abo, Nutzer, Nutzer-Abo).
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. Buchung, Kalender und Rechnungsbezug</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Buchungs- und Kalendereinträge dienen der strukturierten Organisation zwischen Expertinnen/Experten und Kundschaft.
            Freigaben, Slot-Buchungen und Rechnungsbezüge erfolgen auf Basis der im System hinterlegten Daten.
            Vertragliche Leistungspflichten zwischen Parteien entstehen außerhalb der Plattform gemäß individueller Vereinbarung.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Inhalte, Community und Moderation</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Inhalte müssen rechtmäßig, sachlich und respektvoll sein.
            Bei Verstößen kann EquiConnect Inhalte einschränken, entfernen, markieren oder Konten zeitweise bzw. dauerhaft sperren.
            Für Gruppen, Meldungen und Moderationsverfahren gelten ergänzende interne Richtlinien.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Haftung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            EquiConnect haftet im gesetzlichen Rahmen.
            Für nutzergenerierte Inhalte, Angaben oder Absprachen zwischen Nutzenden sind die jeweiligen Parteien selbst verantwortlich.
            Bei leichter Fahrlässigkeit ist die Haftung auf typische, vorhersehbare Schäden begrenzt, soweit gesetzlich zulässig.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">9. Verfügbarkeit und Änderungen</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Funktionen können aus technischen, sicherheitsrelevanten oder rechtlichen Gründen angepasst,
            erweitert, eingeschränkt oder eingestellt werden.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">10. Kündigung und Kontolöschung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nutzerinnen und Nutzer können ihr Konto kündigen und Löschung beantragen.
            Gesetzliche Aufbewahrungspflichten sowie berechtigte Sicherheits- oder Missbrauchsinteressen bleiben unberührt.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">11. Stand</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Stand: 04.04.2026</p>
        </section>
      </main>
    </div>
  );
}
