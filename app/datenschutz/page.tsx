import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)] text-slate-900 font-sans">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-6 sm:p-8 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Equily</p>
              <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tight text-slate-900">Datenschutzerklärung</h1>
              <div className="flex flex-wrap gap-3">
                <Link href="/agb" className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                  Allgemeine Geschäftsbedingungen und Kundeninformationen
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
          <p className="text-sm text-slate-600 leading-relaxed">
            Soweit nachstehend keine anderen Angaben gemacht werden, ist die Bereitstellung Ihrer personenbezogenen Daten weder gesetzlich oder vertraglich vorgeschrieben, noch für einen Vertragsabschluss erforderlich. Sie sind zur Bereitstellung der Daten nicht verpflichtet. Eine Nichtbereitstellung hat keine Folgen. Dies gilt nur soweit bei den nachfolgenden Verarbeitungsvorgängen keine anderweitige Angabe gemacht wird.
            "Personenbezogene Daten" sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Server-Logfiles</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sie können unsere Webseiten besuchen, ohne Angaben zu Ihrer Person zu machen. 
            Bei jedem Zugriff auf unsere Website werden an uns oder unseren Webhoster / IT-Dienstleister Nutzungsdaten durch Ihren Internet Browser übermittelt und in Protokolldaten (sog. Server-Logfiles) gespeichert. Zu diesen gespeicherten Daten gehören z.B. der Name der aufgerufenen Seite, Datum und Uhrzeit des Abrufs, die IP-Adresse, die übertragene Datenmenge und der anfragende Provider.
            Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Gewährleistung eines störungsfreien Betriebs unserer Website sowie zur Verbesserung unseres Angebotes. 
           </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Kontakt</h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verantwortlicher</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Kontaktieren Sie uns auf Wunsch. Verantwortlicher für die Datenverarbeitung ist: Isabell Bader, Innerkoflerstraße 40, 81377 München Deutschland, 015117903181, info@equily.de
          </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Initiativ-Kontaktaufnahme des Kunden per E-Mail</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn Sie per E-Mail initiativ mit uns in Geschäftskontakt treten, erheben wir Ihre personenbezogenen Daten (Name, E-Mail-Adresse, Nachrichtentext) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient der Bearbeitung und Beantwortung Ihrer Kontaktanfrage.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn die Kontaktaufnahme der Durchführung vorvertraglichen Maßnahmen (bspw. Beratung bei Kaufinteresse, Angebotserstellung) dient oder einen bereits zwischen Ihnen und uns geschlossenen Vertrag betrifft, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO.
            Erfolgt die Kontaktaufnahme aus anderen Gründen, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Bearbeitung und Beantwortung Ihrer Anfrage. <strong>In diesem Fall haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser auf Art. 6 Abs. 1 lit. f DSGVO beruhenden Verarbeitungen Sie betreffender personenbezogener Daten zu widersprechen.</strong>
            Ihre E-Mail-Adresse nutzen wir nur zur Bearbeitung Ihrer Anfrage. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben.
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Erhebung und Verarbeitung bei Nutzung des Kontaktformulars</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bei der Nutzung des Kontaktformulars erheben wir Ihre personenbezogenen Daten (Name, E-Mail-Adresse, Nachrichtentext) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient dem Zweck der Kontaktaufnahme.
            Wenn die Kontaktaufnahme der Durchführung vorvertraglichen Maßnahmen (bspw. Beratung bei Kaufinteresse, Angebotserstellung) dient oder einen bereits zwischen Ihnen und uns geschlossenen Vertrag betrifft, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO.
            Erfolgt die Kontaktaufnahme aus anderen Gründen, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Bearbeitung und Beantwortung Ihrer Anfrage. <strong> In diesem Fall haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser auf Art. 6 Abs. 1 lit. f DSGVO beruhenden Verarbeitungen Sie betreffender personenbezogener Daten zu widersprechen.</strong>
            Ihre E-Mail-Adresse nutzen wir nur zur Bearbeitung Ihrer Anfrage. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben.
            </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Erhebung und Verarbeitung bei Nutzung des Widerrufsbuttons </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn Sie einen Vertrag über unsere Onlinepräsenz abgeschlossen haben, stellen wir Ihnen eine Widerrufsfunktion (Widerrufsbutton) zur Verfügung, über welche Sie Ihre Widerrufserklärung unmittelbar abgeben können. 
            Bei der Nutzung der Widerrufsfunktion erheben wir Ihre personenbezogenen Daten (Name, E-Mail-Adresse, Angabe zur Identifizierung des Vertrages oder Vertragsteils, den Sie widerrufen möchten sowie den Zeitpunkt (Datum und Uhrzeit) der Absendung der Widerrufserklärung) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient dem Zweck, Ihnen die gesetzlich vorgeschriebene Möglichkeit zum Widerruf Ihres Vertrages zur Verfügung zu stellen sowie der ordnungsgemäßen Bearbeitung Ihres Widerrufes. 
            Wenn die Kontaktaufnahme einen bereits zwischen Ihnen und uns geschlossenen Vertrag betrifft, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Ansonsten erfolgt die Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. c DSGVO, da wir gesetzlich dazu verpflichtet sind Ihnen eine Widerrufsfunktion auf unserer Onlinepräsenz zur Verfügung zu stellen. 
            Ihre E-Mail-Adresse nutzen wir nur zur Bearbeitung Ihrer Widerrufserklärung. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben. 
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Verarbeitung Ihrer personenbezogenen Daten dient dem Zweck, die gesetzlichen Anforderungen an die Gestaltung der Widerrufsfunktion rechtssicher zu erfüllen und erfolgt auf Grundlage des Art. 6 Abs. 1 lit. c DSGVO. Diese Datenverarbeitung erfolgt außerdem auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse Ihnen eine benutzerfreundliche Widerrufsmöglichkeit zur Verfügung stellen zu können. <strong>In diesem Fall haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser auf Art. 6 Abs. 1 lit. f DSGVO beruhenden Verarbeitungen Sie betreffender personenbezogener Daten zu widersprechen.</strong>
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Erhebung und Verarbeitung bei Nutzung des Kündigungsbuttons</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wenn Sie einen über unsere Onlinepräsenz abgeschlossenen Abonnement-Vertrag über die gesetzlich vorgeschriebene Kündigungsschaltfläche („Kündigungsbutton“) kündigen, verarbeiten wir dabei die von Ihnen in der Bestätigungsmaske eingegebenen Daten. Bei der Nutzung der Kündigungsschaltfläche erheben wir Ihre personenbezogenen Daten (Name, E-Mail-Adresse, gegebenenfalls Ihre Telefonnummer, Angaben zur Identifizierung des Vertrages, den Sie kündigen möchten sowie den Zeitpunkt (Datum und Uhrzeit) der Absendung der Kündigungserklärung) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient dem Zweck, Ihnen die gesetzlich vorgeschriebene Möglichkeit zur Kündigung Ihres Dauerschuldverhältnisses zur Verfügung zu stellen sowie der ordnungsgemäßen Bearbeitung Ihrer Kündigung. 
            Wenn die Kontaktaufnahme einen bereits zwischen Ihnen und uns geschlossenen Vertrag betrifft, erfolgt diese Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Ansonsten erfolgt die Datenverarbeitung auf Grundlage des Art. 6 Abs. 1 lit. c DSGVO, da wir gesetzlich dazu verpflichtet sind, Ihnen eine Kündigungsschaltfläche auf unserer Onlinepräsenz zur Verfügung zu stellen. 
            Ihre E-Mail-Adresse nutzen wir nur zur Bearbeitung Ihrer Kündigungserklärung. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben.           </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h3 className="text-xl font-black italic uppercase text-slate-900">Erhebung und Verarbeitung bei Zusendung von Bildern per Upload</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir stellen auf unserer Webseite eine Upload-Funktion für Bilddateien zur Verfügung. Es besteht so die Möglichkeit, Bilder an uns mittels verschlüsselter Datenübertragung zu senden. Mit Übermittlung Ihrer Bilder erheben wir ggf. Ihre personenbezogenen Daten (Abbildung einer identifizierbarer Personen) nur in dem von Ihnen zur Verfügung gestellten Umfang. Die Datenverarbeitung dient dem Zweck personalisierte Produkte zu erstellen. Das übersandte Bild dient hierbei als Vorlage für das Produkt und wird dafür verwendet (bspw. T-Shirt Druck). Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO und ist für die Erfüllung eines Vertrags mit Ihnen erforderlich.
            Eine Weitergabe Ihrer Daten erfolgt hierbei ggf. an Dienstleister, derer wir uns im Rahmen einer Auftragsverarbeitung bedienen. Eine Weitergabe an sonstige Dritte erfolgt nicht.
            Das von Ihnen übersandte Bild nutzen wir nur im Rahmen der Leistungserbringung. Ihre Daten werden anschließend unter Beachtung gesetzlicher Aufbewahrungsfristen gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben.        
          </p>
            </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Kundenkonto      Bestellungen  </h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Kundenkonto</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Bei der Eröffnung eines Kundenkontos erheben wir Ihre personenbezogenen Daten in dem dort angegebenen Umfang. Die Datenverarbeitung dient dem Zweck, Ihr Einkaufserlebnis zu verbessern und die Bestellabwicklung zu vereinfachen. Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. a DSGVO mit Ihrer Einwilligung. Sie können Ihre Einwilligung jederzeit durch Mitteilung an uns widerrufen, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird. Ihr Kundenkonto wird anschließend gelöscht.
          </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Erhebung, Verarbeitung und Weitergabe personenbezogener Daten bei Bestellungen</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Bei der Bestellung erheben und verarbeiten wir Ihre personenbezogenen Daten nur, soweit dies zur Erfüllung und Abwicklung Ihrer Bestellung sowie zur Bearbeitung Ihrer Anfragen erforderlich ist. Die Bereitstellung der Daten ist für den Vertragsschluss erforderlich. Eine Nichtbereitstellung hat zur Folge, dass kein Vertrag geschlossen werden kann. Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO und ist für die Erfüllung eines Vertrags mit Ihnen erforderlich. 
            Eine Weitergabe Ihrer  Daten erfolgt dabei beispielsweise an Versandunternehmen, Dropshipping- bzw. Fulfillment-Anbieter, Zahlungsdienstleister, Diensteanbieter für die Bestellabwicklung und IT-Dienstleister. In allen Fällen beachten wir strikt die gesetzlichen Vorgaben. Der Umfang der Datenübermittlung beschränkt sich auf ein Mindestmaß. 
           </p>
           </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Bewertungen       Werbung       </h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verwendung der E-Mail-Adresse für die Zusendung von Newslettern</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wir nutzen Ihre E-Mail-Adresse zur Übersendung von Informationen und Angeboten per Newsletter, sofern Sie dem ausdrücklich zugestimmt haben. Die Datenverarbeitung dient ausschließlich dem Zweck der werblichen Ansprache. Hierzu verarbeiten wir Ihre E-Mail-Adresse sowie ggf. weitere Daten, die Sie im Rahmen der Anmeldung zu unserem Newsletter freiwillig gemacht haben.
          Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. a DSGVO mit Ihrer Einwilligung. Sie können die Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird.
          Sie können dazu den Newsletter jederzeit unter Nutzung des entsprechenden Links im Newsletter oder durch Mitteilung an uns abbestellen. Ihre E-Mail-Adresse wird danach aus dem Verteiler entfernt. Trotz Entfernung aus dem Verteiler, können wir Ihre E-Mail-Adresse weiterhin in einer sog. Blacklist speichern, um zu verhindern, dass Sie in Zukunft Newsletter-E-Mails von uns erhalten. Diese Speicherung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem und Ihrem berechtigten Interesse, die erneute Verwendung Ihrer E-Mail-Adresse zur Übersendung unseres Newsletters zu verhindern. <strong>Sie haben das Recht aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser Verarbeitung Sie betreffender personenbezogener Daten zu widersprechen.</strong>          </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verwendung von Brevo (ehemals Sendinblue)</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Wir verwenden für den Newsletterversand den Dienst der Sendinblue GmbH (Köpenicker Straße 126, 10179 Berlin; “Brevo”) im Rahmen einer Auftragsverarbeitung.
          Wir geben die von Ihnen während der Newsletteranmeldung zur Verfügung gestellten Informationen (E-Mail Adresse, ggf. Vor- und Nachname) an Brevo weiter. Die Datenverarbeitung dient dem Zweck des Newsletterversands und dessen statistischer Auswertung.
          Um Newsletter-Kampagnen auszuwerten, enthalten die versendeten E-Mail-Newsletter eine 1x1 Pixel Grafik (Tracking Pixel) und/oder einen Tracking-Link. So können wir feststellen, ob Sie den Newsletter geöffnet haben und ob Sie ggf. integrierte Links angeklickt haben. In dem Zusammenhang können auch Ihre personenbezogenen Daten wie bspw. IP-Adresse, Browsertyp- und device sowie der Zeitpunkt des Öffnens erhoben werden. Aus diesen Daten können unter einem Pseudonym Nutzungsprofile erstellt werden. Die erhobenen Daten werden nicht dazu benutzt, Sie persönlich zu identifizieren. Die erhobenen Daten werden lediglich zur  statistischen Auswertung zur Verbesserung von Newsletter-Kampagnen genutzt.
          Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an einem zielgerichteten, werbewirksamen und benutzerfreundlichen Newslettersystem. <strong>Sie haben das Recht aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser Verarbeitungen Sie betreffender personenbezogener Daten zu widersprechen.</strong> Nähere Informationen sowie die Datenschutzerklärung von Brevo finden Sie unter: https://www.brevo.com/de/legal/privacypolicy/. 
          </p>
           </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Zahlungsdienstleister</h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verwendung von PayPal Check-Out</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
          Wir verwenden auf unserer Website den Zahlungsdienst PayPal Check-Out der PayPal (Europe) S.à.r.l. et Cie, S.C.A. (22-24 Boulevard Royal L-2449, Luxemburg; "PayPal"). Die Datenverarbeitung dient dem Zweck, Ihnen die Zahlung über den Zahlungsdienst anbieten zu können. Mit Auswahl und Nutzung von Zahlung via PayPal, Kreditkarte via PayPal, Lastschrift via PayPal oder „Später Bezahlen“ via PayPal werden die zur Zahlungsabwicklung erforderlichen Daten an PayPal übermittelt, um den Vertrag mit Ihnen mit der gewählten Zahlart erfüllen zu können. Diese Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
          Hierbei können Cookies gespeichert werden, die die Wiedererkennung Ihres Browsers ermöglichen. Die dadurch stattfindende Datenverarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an einem kundenorientierten Angebot von verschiedenen Zahlarten. <strong>Sie haben das Recht aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser Verarbeitung Sie betreffender personenbezogener Daten zu widersprechen.</strong>
          </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Kreditkarte via PayPal, Lastschrift via PayPal & „Später bezahlen“ via PayPal </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Bei einzelnen Zahlungsarten wie Kreditkarte via PayPal, Lastschrift via PayPal oder „Später bezahlen“ via PayPal behält sich PayPal das Recht vor, ggf. eine Bonitätsauskunft auf der Basis mathematisch-statistischer Verfahren unter Nutzung von Auskunfteien einzuholen. Hierzu übermittelt PayPal die zu einer Bonitätsprüfung benötigten personenbezogenen Daten an eine Auskunftei und verwendet die erhaltenen Informationen über die statistische Wahrscheinlichkeit eines Zahlungsausfalls für eine abgewogene Entscheidung über die Begründung, Durchführung oder Beendigung des Vertragsverhältnisses. Die Bonitätsauskunft kann Wahrscheinlichkeitswerte (Score-Werte) beinhalten, die auf Basis wissenschaftlich anerkannter mathematisch-statistischer Verfahren berechnet werden und in deren Berechnung unter anderem Anschriftendaten einfließen. Ihre schutzwürdigen Belange werden gemäß den gesetzlichen Bestimmungen berücksichtigt. Die Datenverarbeitung dient dem Zweck der Bonitätsprüfung für eine Vertragsanbahnung. Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse am Schutz vor Zahlungsausfall, wenn PayPal in Vorleistung geht. <strong>Sie haben das Recht aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen diese auf Art. 6 Abs. 1 lit. f DSGVO beruhende Verarbeitung Sie betreffender personenbezogener Daten durch Mitteilung an PayPal zu widersprechen.</strong>  Die Bereitstellung der Daten ist für den Vertragsschluss mit der von Ihnen gewünschten Zahlart erforderlich. Eine Nichtbereitstellung hat zur Folge, dass der Vertrag nicht mit der von Ihnen gewählten Zahlart geschlossen werden kann.
           </p>
           <h3 className="text-xl font-black italic uppercase text-slate-900">Drittanbieter </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Bei Bezahlung über die Zahlungsart eines Drittanbieters werden die zur Zahlungsabwicklung erforderlichen Daten an PayPal übermittelt. Diese Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Zur Durchführung dieser Zahlungsart werden die Daten ggf. sodann seitens PayPal an den jeweiligen Anbieter weitergegeben. Diese Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Lokale Drittanbieter können beispielsweise sein:
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
           - Apple Pay (Apple Distribution International Ltd., Hollyhill Industrial Estate, Hollyhill, Cork, Irland)
           </p>
            <p className="text-sm text-slate-600 leading-relaxed">
             - Google Pay (Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Irland)
            </p>
           <h3 className="text-xl font-black italic uppercase text-slate-900">Rechnungskauf via PayPal </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
           Bei Bezahlung über die Zahlungsart Rechnungskauf werden die zur Zahlungsabwicklung erforderlichen Daten zunächst an PayPal übermittelt. Zur Durchführung dieser Zahlungsart werden die Daten sodann seitens PayPal an die Ratepay GmbH (Franklinstraße 28-29, 10587 Berlin; "Ratepay") übermittelt um den Vertrag mit Ihnen mit der gewählten Zahlart erfüllen zu können. Diese Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. b DSGVO. Ratepay führt ggf. eine Bonitätsauskunft auf der Basis mathematisch-statistischer Verfahren (Wahrscheinlichkeits- bzw. Score - Werte) unter Nutzung von Auskunfteien durch nach bereits oben beschriebenen Ablauf. Die Datenverarbeitung dient dem Zweck der Bonitätsprüfung für eine Vertragsanbahnung. Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse am Schutz vor Zahlungsausfall, wenn Ratepay  in Vorleistung geht. Weitere Informationen zum Datenschutz und welche Auskunfteien Ratpay verwenden finden Sie unter https://www.ratepay.com/legal-payment-dataprivacy/ und https://www.ratepay.com/legal-payment-creditagencies/. 
           </p>
           <p className="text-sm text-slate-600 leading-relaxed">
            Nähere Informationen zur Datenverarbeitung bei Verwendung von PayPal finden Sie in der dazugehörigen Datenschutzerklärung unter https://www.paypal.com/de/webapps/mpp/ua/privacy-full.
           </p>
           </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Cookies</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die im Internetbrowser bzw. vom Internetbrowser auf dem Computersystem eines Nutzers gespeichert werden. Ruft ein Nutzer eine Website auf, so kann ein Cookie auf dem Betriebssystem des Nutzers gespeichert werden. Dieser Cookie enthält eine charakteristische Zeichenfolge, die eine eindeutige Identifizierung des Browsers beim erneuten Aufrufen der Website ermöglicht.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Cookies werden auf Ihrem Rechner gespeichert. Daher haben Sie die volle Kontrolle über die Verwendung von Cookies. Durch die Auswahl entsprechender technischer Einstellungen in Ihrem Internetbrowser können Sie vor dem Setzen von Cookies benachrichtigt werden und über die Annahme einzeln entscheiden sowie die Speicherung der Cookies und Übermittlung der enthaltenen Daten verhindern. Bereits gespeicherte Cookies können jederzeit gelöscht werden. Wir weisen Sie jedoch darauf hin, dass Sie dann gegebenenfalls nicht sämtliche Funktionen dieser Website vollumfänglich nutzen können.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Unter den nachstehenden Links können Sie sich informieren, wie Sie die Cookies bei den wichtigsten Browsern verwalten (u.a. auch deaktivieren) können:
            Chrome: https://support.google.com/accounts/answer/61416?hl=de
            Microsoft Edge: https://support.microsoft.com/de-de/microsoft-edge/cookies-in-microsoft-edge-lB6schen-63947406-40ac-c3b8-57b9-2a946a29ae09
            Mozilla Firefox: https://support.mozilla.org/de/kb/cookies-erlauben-und-ablehnen
            Safari: https://support.apple.com/de-de/guide/safari/manage-cookies-and-website-data-sfri11471/mac
          </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Technisch notwendige Cookies </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Soweit nachstehend in der Datenschutzerklärung keine anderen Angaben gemacht werden setzen wir nur diese technisch notwendigen Cookies zu dem Zweck ein, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen. Des Weiteren ermöglichen Cookies unseren Systemen, Ihren Browser auch nach einem Seitenwechsel zu erkennen und Ihnen Services anzubieten. Einige Funktionen unserer Internetseite können ohne den Einsatz von Cookies nicht angeboten werden. Für diese ist es erforderlich, dass der Browser auch nach einem Seitenwechsel wiedererkannt wird.          
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
           Die Nutzung von Cookies oder vergleichbarer Technologien erfolgt auf Grundlage des § 25 Abs. 2 TDDDG. Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem überwiegenden berechtigten Interesse an der Gewährleistung der optimalen Funktionalität der Website sowie einer nutzerfreundlichen und effektiven Gestaltung unseres Angebots. <strong>Sie haben das Recht aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit dieser Verarbeitung Sie betreffender personenbezogener Daten zu widersprechen.</strong>
           </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verwendung von Cookiebot</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir verwenden auf unserer Website das Consent-Management-Tool Cookiebot der Cybot A/S, Havnegade 39, 1058 Kopenhagen, Dänemark; “Cookiebot”).
            Das Tool ermöglicht es Ihnen, Einwilligungen in Datenverarbeitungen über die Website, insbesondere das Setzen von Cookies, zu erteilen sowie von Ihrem Widerrufsrecht für bereits erteilte Einwilligungen Gebrauch zu machen. Die Datenverarbeitung dient dem Zweck, erforderliche Einwilligungen in Datenverarbeitungen einzuholen sowie zu dokumentieren und damit gesetzliche Verpflichtungen einzuhalten.
            Hierzu können Cookies eingesetzt werden. Dabei können u. a. folgende Informationen erhoben und an Cookiebot übermittelt werden: anonymisierte IP-Adresse, Datum und Uhrzeit der Zustimmung, URL, von der die Zustimmung gesendet wurde, anonymer, zufälliger, verschlüsselter Key, Einwilligungsstatus. Eine Weitergabe dieser Daten an sonstige Dritte erfolgt nicht.
            Die Datenverarbeitung erfolgt zur Erfüllung einer rechtlichen Verpflichtung auf Grundlage des Art. 6 Abs. 1 lit. c DSGVO.
            Nähere Informationen zum Datenschutz bei Cookiebot finden Sie unter: https://www.cookiebot.com/de/privacy-policy/
          </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Analyse</h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verwendung von Google Analytics 4</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir verwenden auf unserer Website den Webanalysedienst Google Analytics der Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland; „Google“).
            Die Datenverarbeitung dient dem Zweck der Analyse dieser Website und ihrer Besucher sowie für Marketing- und Werbezwecke. Dazu wird Google im Auftrag des Betreibers dieser Website die gewonnenen Informationen benutzen, um Ihre Nutzung der Website auszuwerten, um Reports über die Websiteaktivitäten zusammenzustellen und um weitere, mit der Websitenutzung und der Internetnutzung verbundene Dienstleistungen gegenüber dem Websitebetreiber zu erbringen. 
            Dabei können u.a. folgende Informationen erhoben werden: IP-Adresse, Datum und Uhrzeit des Seitenaufrufs, Klickpfad, Informationen über den von Ihnen verwendeten Browser und das von Ihnen verwendete Device (Gerät), besuchte Seiten, Referrer-URL (Webseite, über die Sie unsere Webseite aufgerufen haben), Standortdaten, Kaufaktivitäten. Ihre Daten können von Google mit anderen Daten, wie beispielsweise Ihrem Suchverlauf, Ihren persönlichen Accounts, Ihren Nutzungsdaten anderer Geräte und allen anderen Daten, die Google zu Ihnen vorliegen hat, verknüpft werden.          
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die IP-Adresse wird von Google innerhalb von Mitgliedstaaten der Europäischen Union oder in anderen Vertragsstaaten des Abkommens über den Europäischen Wirtschaftsraum zuvor gekürzt.          
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Google verwendet Technologien wie Cookies, Webspeicher im Browser und Zählpixel, die eine Analyse der Benutzung der Website durch Sie ermöglichen. Die Nutzung von Cookies oder vergleichbarer Technologien erfolgt mit Ihrer Einwilligung auf Grundlage des § 25 Abs. 1 S. 1 TDDDG i.V.m. Art. 6 Abs. 1 lit. a DSGVO. 
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die Verarbeitung Ihrer personenbezogenen Daten erfolgt mit Ihrer Einwilligung auf Grundlage des Art. 6 Abs. 1 lit. a DSGVO. Sie können die Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir nutzen die erweiterte Implementierung des Einwilligungsmodus (Advanced Consent Mode). Hierbei werden auch bei nicht erteilter Einwilligung Nutzerdaten an Google in Form von “Pings” übermittelt. Diese Pings können u.a. folgende Informationen enthalten: IP-Adresse zum Ableiten des IP-Landes (eine Protokollierung der IP-Adresse findet nicht statt), Datum und Uhrzeit des Seitenaufrufs, URL der besuchten Seiten, User-Agent, Referrer-URL (Website, über die unsere Website aufgerufen wurde) oder Informationen über das Auslösen von Website-Ereignissen wie z.B. einer Conversion. Auf Grundlage dieser Informationen nimmt Google eine Modellierung von Nutzdaten vor, um eine umfassende Nutzungsanalyse trotz der Verweigerung der Einwilligung vornehmen zu können.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Die dadurch erzeugten Informationen über Ihre Benutzung dieser Website werden in der Regel an einen Server von Google in den USA übertragen und dort gespeichert. Für die USA ist ein Angemessenheitsbeschluss der EU-Kommission vorhanden, das Trans-Atlantic Data Privacy Framework (TADPF). Google hat sich nach dem TADPF zertifiziert und damit verpflichtet, europäische Datenschutzgrundsätze einzuhalten. Sowohl Google als auch staatliche US-Behörden haben Zugriff auf Ihre Daten.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nähere Informationen zu Nutzungsbedingungen und Datenschutz finden Sie unter https://policies.google.com/technologies/partner-sites unter https://policies.google.com/privacy?hl=de&gl=de und unter https://business.safety.google/privacy/.
            </p>
        </section>

          <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Plug-ins und Sonstiges</h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Verwendung von OpenStreetmap</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Wir verwenden auf unserer Website den Open-Source-Mapping-Dienst der OpenStreetMap Foundation (St John’s Innovation Centre, Cowley Road, Cambridge, CB4 0WS, United Kingdom; „OpenStreetmap“). Die Datenverarbeitung dient dem Zweck der visuellen Darstellung von geographischen Informationen und Landkarten um Ihnen unseren Standort darzustellen. 
            Hierbei können Cookies eingesetzt werden. Unter anderem können folgende Informationen erhoben und verarbeitet werden: Datum und Uhrzeit des Aufrufs, IP-Adresse sowie Informationen zu dem von Ihnen genutzten Browser und Gerät. Diese Informationen werden Ihrem persönlichen Benutzerkonto zugeordnet, falls Sie ein Benutzerkonto bei OpenStreetMap haben und beim Besuch der Webseite dort angemeldet sind. In dem Fall werden u.a. folgende zusätzliche Informationen erhoben und verarbeitet: User ID, E-Mail-Adresse, welche dem Benutzerkonto zugeordnet ist sowie vom Benutzer blockierte Inhalte.
            Ihre Daten werden dabei gegebenenfalls auch außerhalb der EU in die das Vereinigte Königreich übermittelt. Für das Vereinigte Königreich ist ein Angemessenheitsbeschluss der EU-Kommission vorhanden.
            Die Nutzung von Cookies oder vergleichbarer Technologien erfolgt mit Ihrer Einwilligung auf Grundlage des § 25 Abs. 1 S. 1 TDDDG i.V.m. Art. 6 Abs. 1 lit. a DSGVO. Die Verarbeitung Ihrer personenbezogenen Daten erfolgt mit Ihrer Einwilligung auf Grundlage des Art. 6 Abs. 1 lit. a DSGVO. Sie können die Einwilligung jederzeit widerrufen, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird. 
            Nähere Informationen zur Datenverarbeitung und zum Datenschutz finden Sie unter https://wiki.osmfoundation.org/wiki/Privacy_Policy?tid=331640695983.
            </p>
        </section>

        <section className="bg-white/85 backdrop-blur-xl border border-white/70 rounded-[2rem] p-6 sm:p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] space-y-5">
          <h2 className="text-xl font-black italic uppercase text-slate-900">Betroffenenrechte und Speicherdauer</h2>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Dauer der Speicherung</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nach vollständiger Vertragsabwicklung werden die Daten zunächst für die Dauer der Gewährleistungsfrist, danach unter Berücksichtigung gesetzlicher, insbesondere steuer- und handelsrechtlicher Aufbewahrungsfristen gespeichert und dann nach Fristablauf gelöscht, sofern Sie der weitergehenden Verarbeitung und Nutzung nicht zugestimmt haben.
            </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Rechte der betroffenen Person</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Ihnen stehen bei Vorliegen der gesetzlichen Voraussetzungen folgende Rechte nach Art. 15 bis 20 DSGVO zu: Recht auf Auskunft, auf Berichtigung, auf Löschung, auf Einschränkung der Verarbeitung, auf Datenübertragbarkeit.
          Außerdem steht Ihnen nach Art. 21 Abs. 1 DSGVO ein Widerspruchsrecht gegen die Verarbeitungen zu, die auf Art. 6 Abs. 1 f DSGVO beruhen, sowie gegen die Verarbeitung zum Zwecke von Direktwerbung.
          </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Beschwerderecht bei der Aufsichtsbehörde</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Sie haben gemäß Art. 77 DSGVO das Recht, sich bei der Aufsichtsbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten nicht rechtmäßig erfolgt.
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Eine Beschwerde können Sie unter anderem bei der für uns zuständigen Aufsichtsbehörde einlegen, die Sie unter folgenden Kontaktdaten erreichen:
            </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
            Promenade 18
            91522 Ansbach
            Tel.: +49 981 1800930
            Fax: +49 981 180093800
            E-Mail: poststelle@lda.bayern.de
            </p>
          <h3 className="text-xl font-black italic uppercase text-slate-900">Widerspruchsrecht</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Beruhen die hier aufgeführten personenbezogenen Datenverarbeitungen auf Grundlage unseres berechtigten Interesses nach Art. 6 Abs. 1 lit. f DSGVO, haben Sie das Recht aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit diesen Verarbeitungen mit Wirkung für die Zukunft zu widersprechen.
            Nach erfolgtem Widerspruch wird die Verarbeitung der betroffenen Daten beendet, es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die Ihren Interessen, Rechten und Freiheiten überwiegen, oder wenn die Verarbeitung der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen dient.
            </p>
        </section>

          </section>
        </div>
      </main>
    </div>
  );
}
