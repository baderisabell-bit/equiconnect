import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900 font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 sm:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">EquiConnect</p>
              <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tight text-slate-900">Datenschutz</h1>
              <div className="flex flex-wrap gap-3">
                <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  AGB
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
          <h2 className="text-xl font-black italic uppercase text-slate-900">1. Allgemeine Hinweise</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Der Schutz deiner persönlichen Daten ist uns wichtig. Wir behandeln deine Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO).
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">2. Verantwortliche Stelle</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Verantwortlich für die Datenverarbeitung ist EquiConnect – Isabell Bader.
            Innerkoflerstraße 40, 81377 München, Deutschland
            E-Mail: info@equiconnect.site
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">3. Erhebung und Speicherung personenbezogener Daten</h2>
          <h3> a) Beim Besuch der Website</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Beim Aufruf der Website werden automatisch Informationen erfasst:
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - IP-Adresse
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Browser
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Datum und Uhrzeit
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - aufgerufene Seiten
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Zweck:
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            - Sicherstellung des Betriebs
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - technische Sicherheit
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
           Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
          </p>
          <h3> b) Bei Registrierung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei Erstellung eines Accounts verarbeiten wir:
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Name / Benutzername
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - E-Mail-Adresse
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Adresse
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Profilinformationen (z. B. Standort, Beschreibung, Angebote)
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Zweck:
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            - Bereitstellung der Plattform
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
            - Vermittlung zwischen Nutzern
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
           Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
          </p>
          <h3> c) Öffentliche Profile</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Von dir bereitgestellte Profilinformationen können öffentlich sichtbar sein und von anderen Nutzern eingesehen werden.
          </p>
          <h3> d) Kommunikation zwischen Nutzern</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn über die Plattform Kontakt aufgenommen wird, können Inhalte gespeichert werden, um die Funktion bereitzustellen.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">4. Cookies</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Unsere Plattform verwendet Cookies
          </p>
          <h3>Technisch notwendige Cookies</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese sind erforderlich für:
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Login-Funktionen
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - grundlegende Website-Funktionen
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Weitere Cookies werden nur mit deiner Einwilligung verwendet.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">5. Hosting und Content Delivery</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Unsere Website wird bei folgendem Anbieter bereitgestellt:
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Vercel (Deployment und Hosting)
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - GitHub (Codeverwaltung)
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Cloudflare (DNS und Content Delivery Network)
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Strato (Domainregistrierung)
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Diese Anbieter verarbeiten technische Daten (z. B. IP-Adressen), um den Betrieb der Website sicherzustellen.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">6. E-Mail-Kommunikation</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Für den Versand von E-Mails nutzen wir Brevo.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Dabei werden E-Mail-Adressen und ggf. weitere Kommunikationsdaten verarbeitet.
          </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">7. Speicherdaten</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Deine Daten werden nur so lange gespeichert, wie es für die jeweiligen Zwecke erforderlich ist.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">8. Deine Rechte</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Du hast das Recht auf:
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - Auskunft
            - Berichtigung
            - Löschung
            - Einschränkung der Verarbeitung
            - Datenübertragbarkeit
            - Wirruf der Einwilligung
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">9. Zahlungsabwicklung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Zur Abwicklung von Zahlungen nutzen wir folgende Zahlungsarten:
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - SEPA-Lastschrift (direkt über uns)7
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            - PayPal
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei Zahlung über PayPal werden personenbezogene Daten (z. B. Name, E-Mail-Adresse, Zahlungsinformationen) an PayPal übermittelt.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Es gelten die Datenschutzbestimmungen von PayPal.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">10. Beschwerderecht</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">11. Datensicherheit</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir verwenden geeignete technische und organisatorische Maßnahmen, um deine Daten zu schützen.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">12. Änderungen dieser Datenschutzerklärung</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wir behalten uns vor, diese Datenschutzerklärung anzupassen.
          </p>
        </section>

            <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">12. Stand</h2>
          <p className="text-sm text-slate-600 leading-relaxed">Stand: 04.04.2026</p>
        </section>
          </section>
        </div>
      </main>
    </div>
  );
}
