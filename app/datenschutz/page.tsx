import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">EquiConnect</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Datenschutz</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              AGB
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
          <h2 className="text-xl font-black italic uppercase text-slate-900">1. Hinweis</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese Datenschutzhinweise beschreiben die Verarbeitung personenbezogener Daten bei Nutzung von EquiConnect.
            Die Inhalte sind als strukturierte Produktgrundlage formuliert und sollten vor Livebetrieb rechtlich final geprüft werden.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Verantwortliche Stelle</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Verantwortlich für die Datenverarbeitung ist EquiConnect – Isabell Bader.
            Maßgeblich sind die Kontaktdaten im Impressum.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Verarbeitete Datenkategorien</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Verarbeitet werden insbesondere Registrierungs- und Profildaten, Kommunikationsdaten (Nachrichten, Benachrichtigungen),
            Buchungs- und Rechnungsdaten, Abo- und Zahlungsdaten, Netzwerk- und Gruppeninteraktionen, Moderations- und Meldedaten,
            sowie technisch notwendige Sitzungs- und Speicherdaten.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Zwecke der Verarbeitung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Verarbeitung erfolgt zur Bereitstellung der Plattformfunktionen (Suche, Profile, Nachrichten, Buchung, Rechnungsübersicht),
            zur Durchsetzung von Sicherheits- und Moderationsregeln, zur Verwaltung von Abonnements und Premiumfunktionen,
            sowie zur technischen Stabilität und Verbesserung der Nutzererfahrung.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Premium- und Sichtbarkeitsfunktionen</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Für Abo-Modelle (z. B. Experten-Pro, Nutzer-Plus), Frühzugriff, Sichtbarkeits- und Kalenderfunktionen werden plan- und nutzungsbezogene Daten verarbeitet.
            Dazu gehören insbesondere Planstatus, Laufzeiten, Berechtigungen, Buchungsfreigaben und damit verbundene Benachrichtigungen.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. Standort und Distanz</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            In der Suche kann optional der Gerätestandort verwendet werden, wenn du dies im Browser erlaubst.
            Ohne Freigabe bleibt die Suche nutzbar; Umkreisfunktionen arbeiten dann eingeschränkt oder auf Basis manueller Ortsangaben.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Empfänger und Dienstleister</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Daten können an technisch notwendige Auftragsverarbeiter übermittelt werden, etwa Hosting-, Datenbank-, E-Mail- oder Zahlungsdienste.
            Eine Weitergabe erfolgt nur im Rahmen der gesetzlichen Vorgaben und soweit für den Plattformbetrieb erforderlich.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Newsletter und Segmentierung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Newsletter-Einwilligungen werden getrennt gespeichert und können jederzeit geändert werden.
            Für den Versand können zielgruppenspezifische Segmente genutzt werden (Experten, Experten-Abo, Experten-Pro-Abo,
            Nutzer, Nutzer-Abo). Wenn keine Einwilligung vorliegt, kann ein Hinweisbanner in maximal wöchentlichem Abstand
            angezeigt werden.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">9. Speicherfristen</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Personenbezogene Daten werden nur so lange gespeichert, wie dies für die genannten Zwecke erforderlich ist
            oder gesetzliche Aufbewahrungspflichten bestehen. Danach erfolgt Löschung oder Anonymisierung.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">10. Deine Rechte</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Du hast im gesetzlichen Rahmen insbesondere das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">11. Browser-Speicher</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Details zu notwendigen und optionalen Browser-Speichern findest du auf der Seite Cookies & Speicher.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">12. Stand</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Stand: 04.04.2026</p>
        </section>
      </main>
    </div>
  );
}
