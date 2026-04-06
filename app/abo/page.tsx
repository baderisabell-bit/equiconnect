"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getUserSubscriptionSettings, upsertUserSubscriptionSettings } from "../actions";

type UserRole = "experte" | "nutzer";
type PaymentMethod = "sepa" | "paypal";

type PlanConfig = {
  key: string;
  label: string;
  audience: string;
  benefits: string[];
  baseCents: number;
  paypalFeeCents: number;
  providerCommissionBps: number;
  customerDiscountBps: number;
  visibilityLabel: string;
  groupHostingEnabled: boolean;
  calendarBookingEnabled: boolean;
  horseLimit: number | null;
  teamLimit: number | null;
  offerPreviewHours: number;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

function AboPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<UserRole>("nutzer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availablePlans, setAvailablePlans] = useState<PlanConfig[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState("");
  const [aboBlockedUntil, setAboBlockedUntil] = useState<string | null>(null);
  const [aboBlockedReason, setAboBlockedReason] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("sepa");
  const [sepaAccountHolder, setSepaAccountHolder] = useState("");
  const [sepaIban, setSepaIban] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  useEffect(() => {
    const sessionUserId = sessionStorage.getItem("userId");
    const sessionRole = sessionStorage.getItem("userRole");
    const queryRole = searchParams.get("role");

    const parsedUserId = sessionUserId ? parseInt(sessionUserId, 10) : NaN;
    if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
      router.push("/login");
      return;
    }

    const resolvedRole = String(queryRole || sessionRole || "nutzer").trim().toLowerCase() === "experte" ? "experte" : "nutzer";

    setUserId(parsedUserId);
    setRole(resolvedRole);

    const load = async () => {
      setLoading(true);
      const res = await getUserSubscriptionSettings(parsedUserId);
      if (res.success && res.data) {
        setRole(String(res.data.role || resolvedRole) === "experte" ? "experte" : "nutzer");
        setAvailablePlans(Array.isArray(res.data.available_plans) ? res.data.available_plans : []);
        setSelectedPlanKey(String(res.data.plan_key || ""));
        setPaymentMethod(res.data.payment_method === "paypal" ? "paypal" : "sepa");
        setSepaAccountHolder(String(res.data.sepa_account_holder || ""));
        setSepaIban(String(res.data.sepa_iban || ""));
        setPaypalEmail(String(res.data.paypal_email || ""));
        setAboBlockedUntil(res.data.abo_blocked_until ? String(res.data.abo_blocked_until) : null);
        setAboBlockedReason(res.data.abo_blocked_reason ? String(res.data.abo_blocked_reason) : null);
      }
      setLoading(false);
    };

    load();
  }, [router, searchParams]);

  const selectedPlan = useMemo(() => {
    return availablePlans.find((plan) => plan.key === selectedPlanKey) || availablePlans[0] || null;
  }, [availablePlans, selectedPlanKey]);

  const isPaidPlan = Boolean(selectedPlan && selectedPlan.baseCents > 0);
  const aboBlocked = Boolean(aboBlockedUntil);

  const monthlyPriceCents = useMemo(() => {
    if (!selectedPlan) return 0;
    return paymentMethod === "paypal" ? selectedPlan.baseCents + selectedPlan.paypalFeeCents : selectedPlan.baseCents;
  }, [paymentMethod, selectedPlan]);

  const handleSave = async () => {
    if (!userId || !selectedPlan) return;
    if (aboBlocked) {
      setError(`Abo-Änderungen sind bis ${new Date(String(aboBlockedUntil)).toLocaleDateString("de-DE")} gesperrt.`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const res = await upsertUserSubscriptionSettings({
      userId,
      role,
      planKey: selectedPlan.key,
      paymentMethod,
      sepaAccountHolder,
      sepaIban,
      paypalEmail,
    });

    setSaving(false);

    if (!res.success) {
      setError(res.error || "Abo konnte nicht gespeichert werden.");
      return;
    }

    const savedMonthlyPrice = "monthlyPriceCents" in res ? Number(res.monthlyPriceCents || 0) : 0;
    const savedPlanLabel = "planLabel" in res ? String(res.planLabel || selectedPlan.label) : selectedPlan.label;
    const savedPaymentMethod = "paymentMethod" in res && res.paymentMethod === "paypal" ? "paypal" : "sepa";
    setSuccess(
      savedMonthlyPrice > 0
        ? `Abo aktiv: ${savedPlanLabel} mit ${savedPaymentMethod === "sepa" ? "SEPA" : "PayPal"} (${formatEuro(savedMonthlyPrice)} / Monat)`
        : `Aktiv: ${savedPlanLabel} ohne Monatsgebühr`
    );

    if (onboarding) {
      window.setTimeout(() => {
        router.push("/einstellungen");
      }, 900);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Abo wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-4xl mx-auto px-5 py-10 space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Abo</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">
                {onboarding ? "Abo nach Registrierung" : "Abo & Zahlung"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Buchen sie sich zusätzliche Sichtbarkeit um einenn schnelleren Erfolg auf EquiConnect zu haben. Alle Vorteile im Überblick:
              </p>
              <p className="mt-2 text-sm font-bold text-slate-700">
                Monatlich kuendigbar. Ohne Kuendigung verlaengert sich das Abo nach 30 Tagen automatisch.
              </p>
            </div>
            {!onboarding && (
              <Link href="/einstellungen" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                Zurück zu Einstellungen
              </Link>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Gruendungsmitglieder</p>
              <p className="mt-2 text-sm font-bold text-slate-800">
                Die ersten 150 Mitglieder erhalten dauerhaft Rabatt und die ersten 4 Monate kostenlos.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Website im Aufbau</p>
              <p className="mt-2 text-sm text-slate-700">
                EquiConnect wird aktuell weiter ausgebaut, damit die Plattform bestmoeglich zu euren Wuenschen passt.
                Fehler und Verbesserungsvorschläge bitte über das <Link href="/kontakt" className="font-black text-amber-700 hover:underline">Kontaktformular</Link> teilen.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePlans.map((plan) => {
              const active = selectedPlanKey === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setSelectedPlanKey(plan.key)}
                  className={`text-left rounded-2xl border p-5 transition ${active ? "border-emerald-500 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white"}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{plan.baseCents > 0 ? "Mit Abo" : "Ohne Abo"}</p>
                  <h2 className="mt-2 text-xl font-black italic uppercase text-slate-900">{plan.label}</h2>
                  <p className="mt-1 text-sm text-slate-600">{plan.audience}</p>
                  <p className="mt-3 text-sm font-black text-emerald-700">
                    SEPA: {formatEuro(plan.baseCents)}{plan.baseCents > 0 ? " / Monat" : ""}
                    {plan.paypalFeeCents > 0 ? ` · PayPal: ${formatEuro(plan.baseCents + plan.paypalFeeCents)} / Monat` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      Sichtbarkeit: {plan.visibilityLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-4 overflow-x-auto">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vergleich</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Abo-Tabelle</h2>
            <p className="mt-2 text-sm text-slate-600">Leistungen und Konditionen im direkten Vergleich.</p>
          </div>

          <table className="min-w-[1180px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Kategorie</th>
                <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Experte ohne Abo</th>
                <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Experten Abo (19,99)</th>
                <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Experten Pro Abo (34,99)</th>
                <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer ohne Abo</th>
                <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer mit Abo (7,99)</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Verifikation", "-", "+", "+", "-", "+"],
                ["Zusätzliche Sichtbarkeit", "-", "Automatisches Startseiten-Marketing im 1. Monat", "Priorisierte Sichtbarkeit", "-", "Priorisierte Nachrichten + 24h früher"],
                ["Suche hochschieben", "-", "-", "-", "-", "1x kostenlos pro Suche, danach 0,50 €"],
                ["Anzeige hochschieben", "-", "1x kostenlos pro Anzeige, danach 0,50 €", "1x kostenlos pro Anzeige, danach 0,50 €", "-", "-"],
                ["Schüler / Kunden", "-", "-", "Kundenverwaltung, Rechnungen & Kalender", "-", "-"],
                ["Anzeigen", "2 pro Monat", "unlimitiert", "unlimitiert", "2 pro Monat", "unlimitiert"],
                ["Beiträge", "4 pro Monat", "unlimitiert", "unlimitiert", "4 pro Monat", "unlimitiert"],
                ["Startseitenwerbung", "nein", "nein", "+", "nein", "nein"],
                ["Unterstützung", "-", "Tipps zur besseren Sichtbarkeit", "Premium Support & Tipps", "-", "-"],
                ["Gruppen", "kein Hosting", "Hosting + Moderation 72h", "Hosting + Moderation 72h", "-", "Beiträge innerhalb 72h"],
                ["Pferde", "2 Pferde", "Unbegrenzt", "Unbegrenzt", "2 Pferde", "Unbegrenzt"],
              ].map((row) => (
                <tr key={row[0]}>
                  <td className="p-3 border border-slate-200 font-black text-slate-800 uppercase text-[11px]">{row[0]}</td>
                  <td className="p-3 border border-slate-200 text-slate-700">{row[1]}</td>
                  <td className="p-3 border border-slate-200 text-slate-700">{row[2]}</td>
                  <td className="p-3 border border-slate-200 text-slate-700">{row[3]}</td>
                  <td className="p-3 border border-slate-200 text-slate-700">{row[4]}</td>
                  <td className="p-3 border border-slate-200 text-slate-700">{row[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {selectedPlan && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Leistungen</p>
              <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">{selectedPlan.label}</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedPlan.benefits.map((benefit) => (
                <span key={benefit} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-700">
                  {benefit}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Profil-Limits</p>
                <p className="mt-2 font-bold text-slate-800">Pferde: {selectedPlan.horseLimit === null ? "unbegrenzt" : selectedPlan.horseLimit}</p>
                <p className="font-bold text-slate-800">Teammitglieder: {selectedPlan.teamLimit === null ? "unbegrenzt" : selectedPlan.teamLimit}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Weitere Rechte</p>
                <p className="mt-2 font-bold text-slate-800">Gruppen-Hosting: {selectedPlan.groupHostingEnabled ? "ja" : "nein"}</p>
                {selectedPlan.offerPreviewHours > 0 && <p className="font-bold text-slate-800">Früherer Angebotszugriff: {selectedPlan.offerPreviewHours}h</p>}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Zahlungsart</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">
              {isPaidPlan ? "SEPA oder PayPal" : "Kostenloser Tarif"}
            </h2>
          </div>

          {isPaidPlan ? (
            <>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("sepa")}
                  className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${paymentMethod === "sepa" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  SEPA Lastschrift
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest ${paymentMethod === "paypal" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}
                >
                  PayPal (mit Gebühr)
                </button>
              </div>

              {paymentMethod === "sepa" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={sepaAccountHolder}
                    onChange={(e) => setSepaAccountHolder(e.target.value)}
                    placeholder="Kontoinhaber"
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
                  />
                  <input
                    type="text"
                    value={sepaIban}
                    onChange={(e) => setSepaIban(e.target.value.toUpperCase())}
                    placeholder="IBAN"
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="PayPal E-Mail"
                    className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-800">Für diesen Tarif sind keine Zahlungsdaten nötig.</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monatlicher Preis</p>
            <p className="text-xl font-black italic uppercase text-slate-900">{formatEuro(monthlyPriceCents)}</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-black uppercase tracking-widest text-[10px]">Verlängerung</p>
            <p className="mt-2 font-bold">Monatlich kuendigbar. Falls nicht gekuendigt wird, wird das Abo in 30 Tagen erneut abgebucht.</p>
          </div>

          {aboBlocked && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <p className="font-black uppercase tracking-widest text-[10px]">Abo gesperrt</p>
              <p className="mt-2 font-bold">Abo-Änderungen sind bis {new Date(String(aboBlockedUntil)).toLocaleDateString("de-DE")} gesperrt.</p>
              {aboBlockedReason && <p className="mt-1">Grund: {aboBlockedReason}</p>}
            </div>
          )}

          {error && <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">{error}</p>}
          {success && <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">{success}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || aboBlocked}
              className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Speichere..." : onboarding ? "Tarif speichern" : "Tarif aktualisieren"}
            </button>
            {onboarding && (
              <button
                type="button"
                onClick={() => router.push("/einstellungen")}
                className="px-6 py-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600"
              >
                Später in Einstellungen
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AboPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Abo wird geladen...</p>
        </div>
      }
    >
      <AboPageContent />
    </Suspense>
  );
}
