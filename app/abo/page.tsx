"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  completeGoCardlessRedirectFlow,
  createGoCardlessRedirectFlow,
  getUserSubscriptionSettings,
  upsertUserSubscriptionSettings,
} from "../actions";
import LoggedInHeader from "../components/logged-in-header";

type UserRole = "experte" | "nutzer";
type PaymentMethod = "sepa" | "paypal";

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_NUTZER_PLAN_ID = "P-4BA70283NU461601BNHOTAWQ";
const PAYPAL_NUTZER_CONTAINER_ID = "paypal-button-container-P-4BA70283NU461601BNHOTAWQ";
const PAYPAL_EXPERTE_BASIS_PLAN_ID = "P-1JB670593D6797842NHOTCVA";
const PAYPAL_EXPERTE_BASIS_CONTAINER_ID = "paypal-button-container-P-1JB670593D6797842NHOTCVA";
const PAYPAL_EXPERTE_PRO_PLAN_ID = "P-34J38897KA4374429NHOTDKA";
const PAYPAL_EXPERTE_PRO_CONTAINER_ID = "paypal-button-container-P-34J38897KA4374429NHOTDKA";
const PAYPAL_ANZEIGE_OBEN_ANHEFTEN_PLAN_ID = "P-4M379332PY811324WNH5ZKSI";
const PAYPAL_ANZEIGE_OBEN_ANHEFTEN_CONTAINER_ID = "paypal-button-container-P-4M379332PY811324WNH5ZKSI";
const PAYPAL_SUCHE_PRIORISIEREN_PLAN_ID = "EU3R4N5Z7ZGFQ";
const PAYPAL_ANZEIGE_PRIORISIEREN_PLAN_ID = "5KMKM4JBJYEDE";
const PAYPAL_CLIENT_ID = "AQpOYVsQ7pTH581EA9cjCORev9yOA-UWt6JpWJlGktk_z1sR16dUg012DaZtlozZgXldKHhOp3CQaGXR";

const GOCARDLESS_NUTZER_PLUS_CHECKOUT_URL = "https://pay.gocardless.com/BRT0004YCE006FB";
const GOCARDLESS_EXPERTE_ABO_CHECKOUT_URL = "https://pay.gocardless.com/BRT0004YCE006FB";
const GOCARDLESS_EXPERTE_PRO_CHECKOUT_URL = "https://pay.gocardless.com/BRT0004YCE9XBTE";
const GOCARDLESS_EXPERTE_ABO_FOUNDER_CHECKOUT_URL = "https://pay.gocardless.com/BRT00050XX73395";
const GOCARDLESS_EXPERTE_PRO_FOUNDER_CHECKOUT_URL = "https://pay.gocardless.com/BRT00050XXTQ371";
const GOCARDLESS_STARTSEITE_WERBUNG_URL = "https://pay.gocardless.com/BRT01KQZBEE90VR95HFMCPJQWXV55";
const GOCARDLESS_ANZEIGE_OBEN_ANHEFTEN_URL = "https://pay.gocardless.com/BRT01KQZBPS5PZGYKFACYF82Z6BTA";
const GOCARDLESS_ANZEIGE_PRIORISIEREN_URL = "https://pay.gocardless.com/BRT01KQZCSP35V53C0DDNNRM0EVB1";
const GOCARDLESS_SUCHE_PRIORISIEREN_URL = "https://pay.gocardless.com/BRT01KQZCRD1EQRZNYJRP5PQ8M052";

type PlanConfig = {
  key: string;
  label: string;
  audience: string;
  benefits: string[];
  baseCents: number;
  foundingMemberCents?: number | null;
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

type ComparisonRow = {
  label: string;
  values: string[];
};

type AddonCheckoutLink = {
  label: string;
  price: string;
  method: string;
  billingLabel: string;
  href: string;
  note?: string;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

const EXPERT_PLAN_DEFAULTS: PlanConfig[] = [
  {
    key: "free",
    label: "Kostenlos",
    audience: "Basiszugang für den Einstieg",
    benefits: ["Beiträge: 4 pro Monat", "Anzeigen: 2 pro Monat", "FAQ-Rückmeldung: nicht bevorzugt"],
    baseCents: 0,
    foundingMemberCents: 0,
    paypalFeeCents: 0,
    providerCommissionBps: 0,
    customerDiscountBps: 0,
    visibilityLabel: "leer",
    groupHostingEnabled: false,
    calendarBookingEnabled: false,
    horseLimit: 2,
    teamLimit: 1,
    offerPreviewHours: 0,
  },
  {
    key: "experte_abo",
    label: "Basic",
    audience: "Erhöhte Sichtbarkeit im Feed und in der Suche",
    benefits: [
      "Erhöhte Sichtbarkeit im Feed und in der Suche",
      "72h als Newcomer auf der Startseite",
      "Laufende Anzeigen 1x im Monat hochbringen",
      "Gruppenhosting inklusive",
      "Beiträge: 4 pro Monat",
      "Anzeigen: 2 pro Monat",
    ],
    baseCents: 990,
    foundingMemberCents: 800,
    paypalFeeCents: 0,
    providerCommissionBps: 0,
    customerDiscountBps: 0,
    visibilityLabel: "Erhöhte Sichtbarkeit + Newcomer 72h",
    groupHostingEnabled: true,
    calendarBookingEnabled: true,
    horseLimit: null,
    teamLimit: null,
    offerPreviewHours: 72,
  },
  {
    key: "experte_pro",
    label: "Premium",
    audience: "Automatisierte Rechnungen für Kunden",
    benefits: [
      "Automatisierte Rechnungen für Kunden",
      "Erhöhte Sichtbarkeit im Feed und in der Suche",
      "7 Tage als Newcomer auf der Startseite",
      "Laufende Anzeigen 3x im Monat hochbringen",
      "Gruppenhosting inklusive",
      "Beiträge: unbegrenzt",
      "Anzeigen: unbegrenzt",
    ],
    baseCents: 1990,
    foundingMemberCents: 1600,
    paypalFeeCents: 0,
    providerCommissionBps: 0,
    customerDiscountBps: 0,
    visibilityLabel: "Erhöhte Sichtbarkeit + Newcomer 7 Tage",
    groupHostingEnabled: true,
    calendarBookingEnabled: true,
    horseLimit: null,
    teamLimit: null,
    offerPreviewHours: 168,
  },
];

const USER_PLAN_DEFAULTS: PlanConfig[] = [
  {
    key: "free",
    label: "Kostenlos",
    audience: "Kostenloser Start",
    benefits: ["Nachrichten an Experten/Anbieter", "Beiträge: 4 pro Monat", "Anzeigen: 2 pro Monat", "FAQ-Rückmeldung: nicht bevorzugt"],
    baseCents: 0,
    foundingMemberCents: 0,
    paypalFeeCents: 0,
    providerCommissionBps: 0,
    customerDiscountBps: 0,
    visibilityLabel: "leer",
    groupHostingEnabled: false,
    calendarBookingEnabled: false,
    horseLimit: 2,
    teamLimit: 0,
    offerPreviewHours: 0,
  },
  {
    key: "nutzer_plus",
    label: "Premium",
    audience: "Erhöhte Sichtbarkeit und priorisierte Nachrichten",
    benefits: [
      "Erhöhte Sichtbarkeit im Feed und in der Suche",
      "Deine Anzeige an einen Experten/Anbieter wird priorisiert im Postfach angezeigt",
      "Laufende Suchen 1x im Monat wieder nach oben setzen",
      "Gruppenhosting inklusive",
      "Beiträge: unbegrenzt",
      "Anzeigen: unbegrenzt",
    ],
    baseCents: 599,
    foundingMemberCents: 599,
    paypalFeeCents: 0,
    providerCommissionBps: 0,
    customerDiscountBps: 0,
    visibilityLabel: "Erhöhte Sichtbarkeit + priorisierte Nachrichten",
    groupHostingEnabled: true,
    calendarBookingEnabled: false,
    horseLimit: 2,
    teamLimit: 0,
    offerPreviewHours: 24,
  },
];

const EXPERT_COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Automatisierte Rechnungen für Kunden", values: ["", "", "ja"] },
  { label: "Zusätzliche Sichtbarkeit des Profils", values: ["", "Erhöhte Sichtbarkeit im Feed und in der Suche + 72h als Newcomer auf der Startseite", "Erhöhte Sichtbarkeit im Feed und in der Suche + 7 Tage als Newcomer auf der Startseite"] },
  { label: "Laufende Anzeigen wieder nach oben bringen", values: ["", "1x im Monat inklusive, danach 1,49 €/Anzeige", "3x im Monat inklusive, danach 1,49 €/Anzeige"] },
  { label: "Gruppenhosting", values: ["", "Ja - private oder öffentliche Gruppe für Trainer und Reitschüler", "Ja - private oder öffentliche Gruppe für Trainer und Reitschüler"] },
  { label: "Beiträge", values: ["4 pro Monat", "unbegrenzt", "unbegrenzt"] },
  { label: "Anzeigen", values: ["2 pro Monat", "unbegrenzt", "unbegrenzt"] },
  { label: "FAQ Rückmeldung", values: ["nicht bevorzugt", "Innerhalb 72 Stunden", "Innerhalb 72 Stunden"] },
];

const USER_COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Erhöhte Sichtbarkeit", values: ["", "Erhöhte Sichtbarkeit im Feed und in der Suche"] },
  { label: "Nachrichten an Experten/Anbieter", values: ["Deine Anzeige an einen Experten/Anbieter wird priorisiert im Postfach angezeigt", "Deine Anzeige an einen Experten/Anbieter wird priorisiert im Postfach angezeigt"] },
  { label: "Laufende Suchen wieder an den Anfang setzen", values: ["1x im Monat inklusive, dann 1,49 €/Suche", "1x im Monat inklusive, dann 1,49 €/Suche"] },
  { label: "Gruppenhosting", values: ["Ja", "Ja"] },
  { label: "Beiträge", values: ["4 pro Monat", "unbegrenzt"] },
  { label: "Anzeigen", values: ["2 pro Monat", "unbegrenzt"] },
  { label: "FAQ Rückmeldung", values: ["nicht bevorzugt", "Innerhalb 72 Stunden"] },
];

const EXPERT_ADDON_CHECKOUT_LINKS: AddonCheckoutLink[] = [
  {
    label: "Individuelle Werbung auf der Startseite für 14 Tage",
    price: "14,99 €",
    method: "GoCardless",
    billingLabel: "alle 14 Tage",
    href: GOCARDLESS_STARTSEITE_WERBUNG_URL,
    note: "Startseiten Werbung",
  },
  {
    label: "Anzeigen oben anheften",
    price: "5,99 €/Monat",
    method: "GoCardless",
    billingLabel: "monatlich",
    href: GOCARDLESS_ANZEIGE_OBEN_ANHEFTEN_URL,
    note: "Anzeige oben anheften",
  },
];

const USER_ADDON_CHECKOUT_LINKS: AddonCheckoutLink[] = [
  {
    label: "Anzeigen oben anheften",
    price: "5,99 €/Monat",
    method: "GoCardless",
    billingLabel: "monatlich",
    href: GOCARDLESS_ANZEIGE_OBEN_ANHEFTEN_URL,
    note: "Anzeige oben anheften",
  },
];

function AboPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<UserRole>("nutzer");
  const [userName, setUserName] = useState("Profil");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availablePlans, setAvailablePlans] = useState<PlanConfig[]>([]);
  const [selectedPlanKey, setSelectedPlanKey] = useState("");
  const [aboBlockedUntil, setAboBlockedUntil] = useState<string | null>(null);
  const [aboBlockedReason, setAboBlockedReason] = useState<string | null>(null);
  const [goCardlessBusy, setGoCardlessBusy] = useState(false);
  const [goCardlessHandled, setGoCardlessHandled] = useState(false);
  const [goCardlessMandateId, setGoCardlessMandateId] = useState<string | null>(null);
  const [goCardlessConnectedAt, setGoCardlessConnectedAt] = useState<string | null>(null);
  const [goCardlessLastError, setGoCardlessLastError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("sepa");
  const [sepaAccountHolder, setSepaAccountHolder] = useState("");
  const [sepaIban, setSepaIban] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalSubscriptionId, setPaypalSubscriptionId] = useState("");
  const [paypalButtonError, setPaypalButtonError] = useState("");

  useEffect(() => {
    const sessionUserId = sessionStorage.getItem("userId");
    const sessionRole = sessionStorage.getItem("userRole");
    const sessionUserName = sessionStorage.getItem("userName") || "Profil";
    const queryRole = searchParams.get("role");

    const parsedUserId = sessionUserId ? parseInt(sessionUserId, 10) : NaN;
    if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
      router.push("/login");
      return;
    }

    const resolvedRole = String(queryRole || sessionRole || "nutzer").trim().toLowerCase() === "experte" ? "experte" : "nutzer";

    setUserId(parsedUserId);
    setRole(resolvedRole);
    setUserName(sessionUserName);

    const load = async () => {
      setLoading(true);
      const res = await getUserSubscriptionSettings(parsedUserId);
      if (res.success && res.data) {
        setRole(String(res.data.role || resolvedRole) === "experte" ? "experte" : "nutzer");
        const fallbackPlans = String(res.data.role || resolvedRole) === "experte" ? EXPERT_PLAN_DEFAULTS : USER_PLAN_DEFAULTS;
        setAvailablePlans(Array.isArray(res.data.available_plans) && res.data.available_plans.length > 0 ? res.data.available_plans : fallbackPlans);
        setSelectedPlanKey(String(res.data.plan_key || fallbackPlans[0]?.key || ""));
        setPaymentMethod(res.data.payment_method === "paypal" ? "paypal" : "sepa");
        setSepaAccountHolder(String(res.data.sepa_account_holder || ""));
        setSepaIban(String(res.data.sepa_iban || ""));
        setPaypalEmail(String(res.data.paypal_email || ""));
        setAboBlockedUntil(res.data.abo_blocked_until ? String(res.data.abo_blocked_until) : null);
        setAboBlockedReason(res.data.abo_blocked_reason ? String(res.data.abo_blocked_reason) : null);
        setGoCardlessMandateId(res.data.gocardless_mandate_id ? String(res.data.gocardless_mandate_id) : null);
        setGoCardlessConnectedAt(res.data.gocardless_connected_at ? String(res.data.gocardless_connected_at) : null);
        setGoCardlessLastError(res.data.gocardless_last_error ? String(res.data.gocardless_last_error) : null);
      }
      setLoading(false);
    };

    load();
  }, [router, searchParams]);

  useEffect(() => {
    if (!userId || goCardlessHandled) return;

    const flowState = String(searchParams.get("gocardless") || "").trim().toLowerCase();
    if (flowState !== "success") return;

    const redirectFlowId = String(searchParams.get("redirect_flow_id") || "").trim();
    const sessionToken = String(searchParams.get("session_token") || "").trim();

    setGoCardlessHandled(true);

    if (!redirectFlowId || !sessionToken) {
      setError("GoCardless-Rückgabe unvollständig. Bitte erneut verbinden.");
      return;
    }

    const completeFlow = async () => {
      setGoCardlessBusy(true);
      setError("");
      const completeRes = await completeGoCardlessRedirectFlow(userId, redirectFlowId, sessionToken);
      if (!completeRes.success) {
        setGoCardlessBusy(false);
        setError(completeRes.error || "GoCardless konnte nicht abgeschlossen werden.");
        return;
      }

      const reloadRes = await getUserSubscriptionSettings(userId);
      if (reloadRes.success && reloadRes.data) {
        setPaymentMethod(reloadRes.data.payment_method === "paypal" ? "paypal" : "sepa");
        setSepaAccountHolder(String(reloadRes.data.sepa_account_holder || ""));
        setSepaIban(String(reloadRes.data.sepa_iban || ""));
        setPaypalEmail(String(reloadRes.data.paypal_email || ""));
        setGoCardlessMandateId(reloadRes.data.gocardless_mandate_id ? String(reloadRes.data.gocardless_mandate_id) : null);
        setGoCardlessConnectedAt(reloadRes.data.gocardless_connected_at ? String(reloadRes.data.gocardless_connected_at) : null);
        setGoCardlessLastError(reloadRes.data.gocardless_last_error ? String(reloadRes.data.gocardless_last_error) : null);
      }

      setGoCardlessBusy(false);
      setSuccess("GoCardless erfolgreich verbunden. SEPA-Mandat ist aktiv.");
    };

    completeFlow();
  }, [goCardlessHandled, searchParams, userId]);

  const selectedPlan = useMemo(() => {
    return availablePlans.find((plan) => plan.key === selectedPlanKey) || availablePlans[0] || null;
  }, [availablePlans, selectedPlanKey]);

  const plansToRender = useMemo(() => {
    if (availablePlans.length > 0) return availablePlans;
    return role === "experte" ? EXPERT_PLAN_DEFAULTS : USER_PLAN_DEFAULTS;
  }, [availablePlans, role]);

  const isPaidPlan = Boolean(selectedPlan && selectedPlan.baseCents > 0);
  const aboBlocked = Boolean(aboBlockedUntil);

  const monthlyPriceCents = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.baseCents;
  }, [selectedPlan]);

  const paypalPlanConfig = useMemo(() => {
    if (!selectedPlan) return null;
    if (selectedPlan.key === "nutzer_plus") {
      return { planId: PAYPAL_NUTZER_PLAN_ID, containerId: PAYPAL_NUTZER_CONTAINER_ID };
    }
    if (selectedPlan.key === "experte_abo") {
      return { planId: PAYPAL_EXPERTE_BASIS_PLAN_ID, containerId: PAYPAL_EXPERTE_BASIS_CONTAINER_ID };
    }
    if (selectedPlan.key === "experte_pro") {
      return { planId: PAYPAL_EXPERTE_PRO_PLAN_ID, containerId: PAYPAL_EXPERTE_PRO_CONTAINER_ID };
    }
    return null;
  }, [selectedPlan]);

  const addonLinks = useMemo(() => {
    return role === "experte" ? EXPERT_ADDON_CHECKOUT_LINKS : USER_ADDON_CHECKOUT_LINKS;
  }, [role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (paymentMethod !== "paypal") return;
    if (!paypalPlanConfig) return;

    let cancelled = false;

    const renderButtons = () => {
      if (cancelled) return;
      const paypal = window.paypal;
      if (!paypal || typeof paypal.Buttons !== "function") {
        setPaypalButtonError("PayPal konnte nicht geladen werden.");
        return;
      }

      const container = document.getElementById(paypalPlanConfig.containerId);
      if (!container) return;
      container.innerHTML = "";

      paypal
        .Buttons({
          style: {
            shape: "rect",
            color: "blue",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: function (_data: any, actions: any) {
            const startTime = new Date();
            startTime.setMonth(startTime.getMonth() + 2);
            return actions.subscription.create({
              plan_id: paypalPlanConfig.planId,
              start_time: startTime.toISOString(),
            });
          },
          onApprove: function (data: any) {
            const subscriptionId = String(data?.subscriptionID || "").trim();
            setPaypalSubscriptionId(subscriptionId);
            setError("");
            setSuccess(subscriptionId ? `PayPal-Abo erfolgreich erstellt (${subscriptionId}). Bitte Tarif jetzt speichern.` : "PayPal-Abo erfolgreich erstellt. Bitte Tarif jetzt speichern.");
          },
          onError: function () {
            setPaypalButtonError("PayPal Checkout ist fehlgeschlagen. Bitte erneut versuchen.");
          },
        })
        .render(`#${paypalPlanConfig.containerId}`)
        .catch(() => {
          setPaypalButtonError("PayPal Checkout konnte nicht initialisiert werden.");
        });
    };

    const existingScript = document.querySelector('script[data-paypal-user-abo="1"]') as HTMLScriptElement | null;
    if (existingScript) {
      if (window.paypal) renderButtons();
      else {
        existingScript.addEventListener("load", renderButtons, { once: true });
      }
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&vault=true&intent=subscription`;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.setAttribute("data-paypal-user-abo", "1");
    script.async = true;
    script.onload = renderButtons;
    script.onerror = () => {
      if (cancelled) return;
      setPaypalButtonError("PayPal SDK konnte nicht geladen werden.");
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [paymentMethod, selectedPlan]);

  const handleSave = async () => {
    if (!userId || !selectedPlan) return;
    if (aboBlocked) {
      setError(`Abo-Änderungen sind bis ${new Date(String(aboBlockedUntil)).toLocaleDateString("de-DE")} gesperrt.`);
      return;
    }
    if (paymentMethod === "paypal" && !paypalPlanConfig) {
      setError("PayPal ist für diesen Tarif aktuell noch nicht verfügbar.");
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

  const handleConnectGoCardless = async () => {
    if (!userId) return;

    setGoCardlessBusy(true);
    setError("");
    setSuccess("");

    const res = await createGoCardlessRedirectFlow(userId);
    if (!res.success || !res.redirectUrl) {
      setGoCardlessBusy(false);
      setError(res.error || "GoCardless-Verbindung konnte nicht gestartet werden.");
      return;
    }

    window.location.href = String(res.redirectUrl);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("userRole");
      sessionStorage.removeItem("userName");
    } catch {
      // ignore session cleanup issues
    }
    router.push("/login");
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
      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30"
        />
      )}

      {sidebarOpen && (
        <aside className="fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-widest text-slate-900">Menü</p>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-full border border-slate-200 px-2 py-1 text-slate-500">
              ×
            </button>
          </div>
          <nav className="space-y-3 text-sm font-black uppercase tracking-widest text-slate-700">
            <Link href="/" className="block">Startseite</Link>
            <Link href="/suche" className="block">Suche</Link>
            <Link href="/netzwerk" className="block">Netzwerk</Link>
            <Link href="/nachrichten" className="block">Nachrichten</Link>
            <Link href="/merkliste" className="block">Merkliste</Link>
            <Link href="/einstellungen" className="block">Einstellungen</Link>
            <Link href="/kontakt" className="block">Kontakt & FAQ</Link>
            <button type="button" onClick={handleLogout} className="block text-left text-slate-400">Abmelden</button>
          </nav>
        </aside>
      )}

      <main className="max-w-4xl mx-auto px-5 py-10 space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Abo</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">
                {onboarding ? "Abo nach Registrierung" : "Abo & Zahlung"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Buchen Sie sich zusätzliche Sichtbarkeit, um einen schnelleren Erfolg auf Equily zu haben. Alle Vorteile im Überblick:
              </p>
              <p className="mt-2 text-sm font-bold text-slate-700">
                Monatlich kündigbar. Ohne Kündigung verlängert sich das Abo monatlich zum gleichen Kalendertag.
              </p>
            </div>
            {!onboarding && (
              <Link href="/einstellungen" className="px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">
                Zurück zu Einstellungen
              </Link>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Website im Aufbau</p>
            <p className="mt-2 text-sm text-slate-700">
              Equily wird aktuell weiter ausgebaut, damit die Plattform bestmöglich zu euren Wünschen passt.
              Fehler und Verbesserungsvorschläge bitte über das <Link href="/kontakt" className="font-black text-amber-700 hover:underline">Kontaktformular</Link> teilen.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {plansToRender.map((plan) => {
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
                  <p className="mt-2 text-sm font-black uppercase tracking-widest text-slate-900">
                    {formatEuro(plan.baseCents)}{plan.baseCents > 0 ? " / Monat" : ""}
                    {plan.foundingMemberCents !== undefined && plan.foundingMemberCents !== null && plan.foundingMemberCents > 0 ? ` · Gründungsmitglieder: ${formatEuro(plan.foundingMemberCents)} / Monat` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{plan.audience}</p>
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

        {selectedPlan && (
          <section className="rounded-[2rem] border border-slate-900 bg-slate-950 p-8 text-white shadow-xl space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Bestellung</p>
                <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight">Ausgewähltes Abo</h2>
                <p className="mt-2 text-sm text-slate-300">Immer nur ein Abo aktiv. Zusätze werden separat gebucht.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Preis</p>
                <p className="mt-1 text-3xl font-black italic">{formatEuro(monthlyPriceCents)}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{selectedPlan.baseCents > 0 ? "monatlich" : "kostenfrei"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Gewählt</p>
                <p className="mt-2 text-xl font-black italic uppercase">{selectedPlan.label}</p>
                <p className="mt-1 text-slate-300">{selectedPlan.audience}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Abrechnungsart</p>
                <p className="mt-2 text-xl font-black italic uppercase">{selectedPlan.baseCents > 0 ? "monatlich" : "einmalig"}</p>
                <p className="mt-1 text-slate-300">Abo und Zusatzprodukte werden getrennt geführt.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Zahlung</p>
                <p className="mt-2 text-xl font-black italic uppercase">SEPA oder PayPal</p>
                <p className="mt-1 text-slate-300">Nur eine Zahlungsart gleichzeitig auswählbar.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || aboBlocked}
                className="rounded-xl bg-emerald-500 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-emerald-400 disabled:opacity-60"
              >
                {saving ? "Bestelle..." : selectedPlan.baseCents > 0 ? "Kostenpflichtig bestellen" : "Kostenlos übernehmen"}
              </button>
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                {selectedPlan.baseCents > 0 ? "Vor dem Kauf Zahlungsart wählen" : "Keine Zahlungsdaten nötig"}
              </span>
            </div>
          </section>
        )}

        {role === "experte" && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-4 overflow-x-auto">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vergleich</p>
              <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Abo-Tabelle für Experten</h2>
              <p className="mt-2 text-sm text-slate-600">Kostenlos, Basic und Premium im direkten Vergleich.</p>
            </div>

            <table className="min-w-[1100px] w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Kategorie</th>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Kostenlos</th>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Basic</th>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Premium</th>
                </tr>
              </thead>
              <tbody>
                {EXPERT_COMPARISON_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="p-3 border border-slate-200 font-black text-slate-800 uppercase text-[11px]">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${index}`} className="p-3 border border-slate-200 text-slate-700 align-top">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {role === "nutzer" && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-4 overflow-x-auto">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Vergleich</p>
              <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Abo-Tabelle für Nutzer</h2>
              <p className="mt-2 text-sm text-slate-600">Kostenlos und Premium im direkten Vergleich.</p>
            </div>

            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Kategorie</th>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Kostenlos</th>
                  <th className="p-3 border border-slate-200 bg-slate-100 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="block">Premium</span>
                    <span className="block mt-1 text-[9px] font-medium normal-case tracking-normal text-slate-500">5,99 €/Monat</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {USER_COMPARISON_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="p-3 border border-slate-200 font-black text-slate-800 uppercase text-[11px]">{row.label}</td>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${index}`} className="p-3 border border-slate-200 text-slate-700 align-top">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}


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

            {aboBlocked && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-black uppercase tracking-widest text-[10px]">Abo gesperrt</p>
                <p className="mt-2 font-bold">Abo-Änderungen sind bis {new Date(String(aboBlockedUntil)).toLocaleDateString("de-DE")} gesperrt.</p>
                {aboBlockedReason && <p className="mt-1">Grund: {aboBlockedReason}</p>}
              </div>
            )}

            {error && <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">{error}</p>}
            {success && <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">{success}</p>}

            <div className="pt-2 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Zahlungsart</p>
                <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">
                  {isPaidPlan ? "Zahlungslogik am Ende" : "Kostenloser Tarif"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {isPaidPlan
                    ? "Wähle hier am Seitenende direkt deine Zahlungsart und speichere den Tarif ohne Umweg."
                    : "Für kostenlose Tarife ist kein zusätzlicher Checkout nötig."}
                </p>
              </div>

              {isPaidPlan && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("sepa")}
                      className={`rounded-xl border px-4 py-3 text-left ${paymentMethod === "sepa" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">SEPA</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">Lastschrift</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("paypal")}
                      className={`rounded-xl border px-4 py-3 text-left ${paymentMethod === "paypal" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">PayPal</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">Abo-Zahlung</p>
                    </button>
                  </div>

                  {paymentMethod === "sepa" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={sepaAccountHolder}
                        onChange={(e) => setSepaAccountHolder(e.target.value)}
                        placeholder="Kontoinhaber"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                      />
                      <input
                        type="text"
                        value={sepaIban}
                        onChange={(e) => setSepaIban(e.target.value)}
                        placeholder="IBAN"
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleConnectGoCardless}
                        disabled={goCardlessBusy}
                        className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {goCardlessBusy ? "Verbinde..." : goCardlessMandateId ? "SEPA neu verbinden" : "SEPA über GoCardless verbinden"}
                      </button>
                    </div>
                  )}

                  {paymentMethod === "paypal" && (
                    <div className="space-y-3">
                      <input
                        type="email"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        placeholder="PayPal E-Mail"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                      />
                      {paypalPlanConfig && <div id={paypalPlanConfig.containerId} className="min-h-[48px]" />}
                      {paypalButtonError && <p className="text-[11px] font-bold text-red-600">{paypalButtonError}</p>}
                      {paypalSubscriptionId && <p className="text-[11px] font-bold text-emerald-700">PayPal-Abo erstellt: {paypalSubscriptionId}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || aboBlocked}
                  className="px-8 py-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Speichere..." : isPaidPlan ? "Jetzt kostenpflichtig speichern" : "Kostenlos übernehmen"}
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
            </div>
          </section>
        )}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Zusätze</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Separat buchbare Extras</h2>
            <p className="mt-2 text-sm text-slate-600">Extras werden in einem eigenen Vorgang gebucht und laufen getrennt vom Abo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addonLinks.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{item.billingLabel}</p>
                <h3 className="mt-2 text-lg font-black italic uppercase text-slate-900">{item.label}</h3>
                <p className="mt-2 text-sm font-bold text-slate-900">{item.price}</p>
                <p className="mt-1 text-xs text-slate-500">{item.note || item.method}</p>
                <div className="mt-4 inline-flex rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Zahlungsart wählst du unten im Tarifbereich.
                </div>
              </div>
            ))}
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
