"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, FileText, ArrowLeft } from "lucide-react";
import LoggedInHeader from "@/app/components/logged-in-header";
import { getStoredProfileData, updatePrivateSettingsData, upsertUserSubscriptionSettings } from "@/app/actions";

type PaymentMethod = "paypal" | "sepa";

type ProfileSnapshot = {
  vorname: string;
  nachname: string;
  strasse: string;
  plz: string;
  ort: string;
};

const PLAN_FALLBACKS: Record<string, { label: string; priceCents: number; billingSuffix: string; gocardlessUrl?: string }> = {
  premium: { label: "Premium", priceCents: 599, billingSuffix: "/Monat" },
  basis: { label: "Basis", priceCents: 0, billingSuffix: "kostenfrei" },
  experte_basic: { label: "Experte Basic", priceCents: 990, billingSuffix: "/Monat", gocardlessUrl: "https://pay.gocardless.com/billing/static-dummy-link" },
  experte_plus: { label: "Experte Plus", priceCents: 1990, billingSuffix: "/Monat", gocardlessUrl: "https://pay.gocardless.com/billing/static-dummy-link" },
  free: { label: "Kostenlos", priceCents: 0, billingSuffix: "kostenfrei" },
};

export default function CheckoutPage() {
  const router = useRouter();
  const [planKey, setPlanKey] = useState("premium");
  const [planLabel, setPlanLabel] = useState(PLAN_FALLBACKS.premium.label);
  const [priceCents, setPriceCents] = useState(PLAN_FALLBACKS.premium.priceCents);
  const [billingSuffix, setBillingSuffix] = useState(PLAN_FALLBACKS.premium.billingSuffix);
  const [gocardlessUrl, setGocardlessUrl] = useState("https://pay.gocardless.com/billing/static-dummy-link");

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string>("nutzer");
  const [userName, setUserName] = useState("Kunde");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("paypal");
  const [prepared, setPrepared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<ProfileSnapshot>({ vorname: "", nachname: "", strasse: "", plz: "", ort: "" });
  const [acceptedWithdrawal, setAcceptedWithdrawal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [paypalError, setPaypalError] = useState("");

  useEffect(() => {
    const storedUserId = sessionStorage.getItem("userId");
    const parsedUserId = storedUserId ? parseInt(storedUserId, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      setUserId(parsedUserId);
    }
    const storedRole = sessionStorage.getItem("role");
    if (storedRole) {
      setRole(storedRole);
    }
    const storedName = sessionStorage.getItem("userName");
    if (storedName) {
      setUserName(storedName);
    }

    const params = new URLSearchParams(window.location.search);
    const nextPlanKey = params.get("planKey") || "premium";
    setPlanKey(nextPlanKey);
    setPlanLabel(params.get("planLabel") || PLAN_FALLBACKS[nextPlanKey]?.label || "Abo");
    setPriceCents(Number(params.get("priceCents") || PLAN_FALLBACKS[nextPlanKey]?.priceCents || 0));
    setBillingSuffix(params.get("billingSuffix") || PLAN_FALLBACKS[nextPlanKey]?.billingSuffix || "/Monat");
    setGocardlessUrl(PLAN_FALLBACKS[nextPlanKey]?.gocardlessUrl || "https://pay.gocardless.com/billing/static-dummy-link");
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const storedProfile = await getStoredProfileData(userId);
        if (!active) {
          return;
        }
        const data = storedProfile?.data || {};
        setProfile({
          vorname: String(data.vorname || data.firstName || data.first_name || "").trim(),
          nachname: String(data.nachname || data.lastName || data.last_name || "").trim(),
          strasse: String(data.privatStrasse || data.street || data.addressStreet || "").trim(),
          plz: String(data.privatPlz || data.zip || data.addressZip || "").trim(),
          ort: String(data.privatOrt || data.city || data.addressCity || "").trim(),
        });
      } catch {
        if (active) {
          setErrorMessage("Deine Profildaten konnten nicht geladen werden.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (paymentMethod !== "paypal" || !prepared || !userId) {
      return;
    }

    setPaypalError("");
  }, [paymentMethod, prepared, userId]);

  const saveProfileData = async () => {
    if (!userId) {
      throw new Error("Nicht eingeloggt");
    }
    await updatePrivateSettingsData({
      userId,
      vorname: profile.vorname,
      nachname: profile.nachname,
      privatStrasse: profile.strasse,
      privatPlz: profile.plz,
      privatOrt: profile.ort,
    });
  };

  const canProceed = profile.vorname.trim() && profile.nachname.trim() && profile.strasse.trim() && profile.plz.trim() && profile.ort.trim() && acceptedWithdrawal && acceptedTerms && acceptedPrivacy;

  const handlePrepareOrder = async () => {
    setErrorMessage("");
    setStatusMessage("");
    if (!canProceed) {
      setErrorMessage("Bitte fülle die Pflichtfelder aus und bestätige alle Kästchen.");
      return;
    }

    setSaving(true);
    try {
      await saveProfileData();
      setPrepared(true);
      setStatusMessage("Daten geprüft. Wähle jetzt PayPal oder SEPA.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Die Daten konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  };

  const handlePaypalApprove = async () => {
    if (!userId) {
      return;
    }
    setSaving(true);
    setErrorMessage("");
    try {
      await upsertUserSubscriptionSettings({ userId, role, paymentMethod: "paypal", planKey });
      router.push("/abo?success=1");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "PayPal konnte nicht abgeschlossen werden.");
    } finally {
      setSaving(false);
    }
  };

  const handleSepaRedirect = async () => {
    if (!userId) {
      return;
    }
    setSaving(true);
    setErrorMessage("");
    try {
      await upsertUserSubscriptionSettings({ userId, role, paymentMethod: "sepa", planKey });
      window.location.href = gocardlessUrl;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "SEPA konnte nicht vorbereitet werden.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <LoggedInHeader
        userId={userId}
        role={role === "experte" ? "experte" : "nutzer"}
        userName={userName}
        onOpenSidebar={() => router.back()}
        onOpenProfile={() => {
          if (userId && userId > 0) {
            window.location.href = `/profil/${userId}`;
            return;
          }
          window.location.href = "/login";
        }}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <button type="button" onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} />
          Zurück zum Abo
        </button>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Checkout</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">{planLabel}</h1>
              <p className="mt-2 text-sm text-slate-500">Produkt und Preis werden vor der Zahlung noch einmal bestätigt.</p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Auswahl</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-slate-900">{planLabel}</p>
                  <p className="text-sm text-slate-500">{billingSuffix}</p>
                </div>
                <p className="text-3xl font-black text-slate-900">{(priceCents / 100).toFixed(2).replace(".", ",")} €</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-700">
                Vorname
                <input value={profile.vorname} onChange={(e) => setProfile((current) => ({ ...current, vorname: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700">
                Nachname
                <input value={profile.nachname} onChange={(e) => setProfile((current) => ({ ...current, nachname: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700 md:col-span-2">
                Rechnungsadresse
                <input value={profile.strasse} onChange={(e) => setProfile((current) => ({ ...current, strasse: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" placeholder="Straße und Hausnummer" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700">
                PLZ
                <input value={profile.plz} onChange={(e) => setProfile((current) => ({ ...current, plz: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700">
                Ort
                <input value={profile.ort} onChange={(e) => setProfile((current) => ({ ...current, ort: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-slate-400" />
              </label>
            </div>

            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <label className="flex gap-3">
                <input type="checkbox" checked={acceptedWithdrawal} onChange={(e) => setAcceptedWithdrawal(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>Ich bestätige die Widerrufsbelehrung.</span>
              </label>
              <label className="flex gap-3">
                <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>Ich akzeptiere die AGB.</span>
              </label>
              <label className="flex gap-3">
                <input type="checkbox" checked={acceptedPrivacy} onChange={(e) => setAcceptedPrivacy(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>Ich akzeptiere die Datenschutzbestimmungen.</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={handlePrepareOrder} disabled={saving} className="rounded-full bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-slate-800 disabled:opacity-60">
                {saving ? "Prüfe..." : "Jetzt kostenpflichtig bestellen"}
              </button>
              {statusMessage && <p className="self-center text-sm font-medium text-emerald-700">{statusMessage}</p>}
              {errorMessage && <p className="self-center text-sm font-medium text-red-600">{errorMessage}</p>}
            </div>
          </div>

          <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Zahlungsmethode</p>
              <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">PayPal oder SEPA</h2>
              <p className="mt-2 text-sm text-slate-500">Erst nach dem Bestellen aktivieren wir die Zahlart.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setPaymentMethod("paypal")} className={`rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${paymentMethod === "paypal" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>
                PayPal
              </button>
              <button type="button" onClick={() => setPaymentMethod("sepa")} className={`rounded-full border px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] ${paymentMethod === "sepa" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600"}`}>
                SEPA
              </button>
            </div>

            {!prepared ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Bitte zuerst die Pflichtangaben bestätigen.
              </div>
            ) : paymentMethod === "paypal" ? (
              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <CreditCard size={16} />
                  PayPal-Zahlung
                </div>
                <p className="text-sm text-slate-600">Die PayPal-Abwicklung wird nach der Bestellbestätigung gestartet.</p>
                {paypalError && <p className="text-sm text-red-600">{paypalError}</p>}
                <button type="button" onClick={() => void handlePaypalApprove()} disabled={saving} className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-slate-800 disabled:opacity-60">
                  Mit PayPal fortfahren
                </button>
              </div>
            ) : (
              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <ShieldCheck size={16} />
                  SEPA über GoCardless
                </div>
                <p className="text-sm text-slate-600">Du wirst nach der Bestätigung zu GoCardless weitergeleitet.</p>
                <a href={gocardlessUrl} onClick={(event) => {
                  event.preventDefault();
                  void handleSepaRedirect();
                }} className="inline-flex rounded-full bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-emerald-700">
                  Zu GoCardless
                </a>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <FileText size={16} />
                Zusammenfassung
              </div>
              <p className="mt-3">{userName}</p>
              <p>{profile.vorname} {profile.nachname}</p>
              <p>{profile.strasse}</p>
              <p>{profile.plz} {profile.ort}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
