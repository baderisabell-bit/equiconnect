import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900 font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 sm:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">EquiConnect</p>
              <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tight text-slate-900">Cookies & Speicher</h1>
              <div className="flex flex-wrap gap-3">
                <Link href="/datenschutz" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Datenschutz
                </Link>
                <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  AGB
                </Link>
                <Link href="/" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Zur Startseite
                </Link>
              </div>
            </div>
          </aside>

          <section className="space-y-5 sm:space-y-6">
        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">1. Grundsatz</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            EquiConnect verwendet aktuell keine Werbe- oder Tracking-Cookies von Drittanbietern zu Marketingzwecken.
            Es werden jedoch notwendige und optionale Browser-Speicher genutzt, damit Login, Sicherheit, Bedienkomfort und einzelne Funktionen zuverlässig arbeiten.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Notwendige Speicher</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Für den Betrieb werden insbesondere notwendige Sitzungsdaten im Browser gespeichert, z. B. Benutzer-ID,
            Rollenstatus und Navigationszustände geschützter Bereiche. Ohne diese Daten sind Login-geschützte Bereiche
            wie Nachrichten, Dashboard oder Buchungsverwaltung nicht nutzbar.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Cookie- und Speicherbanner</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Beim ersten Besuch wird ein Speicherbanner angezeigt. Dort kannst du zwischen "Nur notwendige" und
            "Alle akzeptieren" wählen. Die Auswahl wird lokal gespeichert und kann in den Einstellungen jederzeit
            geändert werden.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Optionale Speicher (Komfort)</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Zusätzlich können optionale lokale Speicher genutzt werden, etwa für gemerkte Chat-Ziele oder Komfortzustände.
            Diese optionalen Daten werden nur verwendet, wenn du im Speicher-Banner „Alle akzeptieren“ auswählst.
            Bei „Nur notwendige“ werden optionale Daten nicht neu gespeichert und vorhandene optionale Daten werden entfernt.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Newsletter-Erinnerungsbanner</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Falls keine Newsletter-Einwilligung vorliegt, kann ein Erinnerungsbanner mit maximal wöchentlichem Abstand erscheinen.
            Der Hinweistext kann je nach Segment unterschiedlich sein (Experten, Experten-Abo, Experten-Pro-Abo,
            Nutzer, Nutzer-Abo). Bei Aktivierung wird die Einwilligung serverseitig gespeichert.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. Standort und Umkreis</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            In der Suche kann – nach deiner Browserfreigabe – der Gerätestandort genutzt werden, um Umkreisfilter anzuzeigen.
            Wenn du den Zugriff verweigerst, bleibt die Suche weiterhin nutzbar, jedoch ohne genaue Distanzermittlung auf Basis deines Geräts.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Kontrolle und Löschung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Du kannst Browser-Speicher jederzeit in deinen Browser-Einstellungen löschen.
            Außerdem kannst du deine Auswahl über den Speicher-Hinweis erneut festlegen.
            Beim Löschen gehen gespeicherte Komfortzustände verloren, funktionale Kerndaten werden beim nächsten Login neu aufgebaut.
          </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Stand</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Stand: 04.04.2026</p>
        </section>
          </section>
        </div>
      </main>
    </div>
  );
}
