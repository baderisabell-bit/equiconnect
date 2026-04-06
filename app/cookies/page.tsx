import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">EquiConnect</p>
            <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tight text-slate-900">Cookies & Speicher</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Datenschutz
            </Link>
            <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              AGB
            </Link>
            <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
              Zur Startseite
            </Link>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">1. Grundsatz</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            EquiConnect verwendet aktuell keine Werbe- oder Tracking-Cookies von Drittanbietern zu Marketingzwecken.
            Es werden jedoch notwendige und optionale Browser-Speicher genutzt, damit Login, Sicherheit, Bedienkomfort und einzelne Funktionen zuverlässig arbeiten.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Notwendige Speicher</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Für den Betrieb werden insbesondere notwendige Sitzungsdaten im Browser gespeichert, z. B. Benutzer-ID,
            Rollenstatus und Navigationszustände geschützter Bereiche. Ohne diese Daten sind Login-geschützte Bereiche
            wie Nachrichten, Dashboard oder Buchungsverwaltung nicht nutzbar.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Cookie- und Speicherbanner</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Beim ersten Besuch wird ein Speicherbanner angezeigt. Dort kannst du zwischen "Nur notwendige" und
            "Alle akzeptieren" wählen. Die Auswahl wird lokal gespeichert und kann in den Einstellungen jederzeit
            geändert werden.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Optionale Speicher (Komfort)</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Zusätzlich können optionale lokale Speicher genutzt werden, etwa für gemerkte Chat-Ziele oder Komfortzustände.
            Diese optionalen Daten werden nur verwendet, wenn du im Speicher-Banner „Alle akzeptieren“ auswählst.
            Bei „Nur notwendige“ werden optionale Daten nicht neu gespeichert und vorhandene optionale Daten werden entfernt.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Newsletter-Erinnerungsbanner</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Falls keine Newsletter-Einwilligung vorliegt, kann ein Erinnerungsbanner mit maximal wöchentlichem Abstand erscheinen.
            Der Hinweistext kann je nach Segment unterschiedlich sein (Experten, Experten-Abo, Experten-Pro-Abo,
            Nutzer, Nutzer-Abo). Bei Aktivierung wird die Einwilligung serverseitig gespeichert.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. Standort und Umkreis</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            In der Suche kann – nach deiner Browserfreigabe – der Gerätestandort genutzt werden, um Umkreisfilter anzuzeigen.
            Wenn du den Zugriff verweigerst, bleibt die Suche weiterhin nutzbar, jedoch ohne genaue Distanzermittlung auf Basis deines Geräts.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Kontrolle und Löschung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Du kannst Browser-Speicher jederzeit in deinen Browser-Einstellungen löschen.
            Außerdem kannst du deine Auswahl über den Speicher-Hinweis erneut festlegen.
            Beim Löschen gehen gespeicherte Komfortzustände verloren, funktionale Kerndaten werden beim nächsten Login neu aufgebaut.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Stand</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Stand: 04.04.2026</p>
        </section>
      </main>
    </div>
  );
}
