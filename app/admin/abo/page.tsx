"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  adminGetSubscriptionInvoicePdf,
  adminUpdateSubscriptionInvoiceStatus,
  adminGetSubscriptionPriceHistory,
  adminSearchSubscriptionUsers,
  adminGenerateSubscriptionInvoices,
  adminGetSubscriptionInvoices,
  adminGetNewsletterRecipients,
  adminGetNewsletterSegmentsOverview,
  adminUpdateUserSubscriptionCustomPrice,
  adminFinalizeSubscriptionCancellation,
  adminPreviewNewsletterSegmentSync,
  adminSyncNewsletterSegmentToBrevo
} from "../../actions";

type SegmentKey = "experten_abo" | "experten_pro_abo" | "experten" | "nutzer" | "nutzer_abo";

type SegmentItem = {
  segment: SegmentKey;
  label: string;
  count: number;
};

type Recipient = {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  role: string;
  plan_key: string;
  newsletter_updated_at: string;
};

type DryRunData = {
  listId: number;
  hasBrevoApiKey: boolean;
  canSyncNow: boolean;
  totals: {
    totalRows: number;
    validEmails: number;
    uniqueValidEmails: number;
    duplicateEmails: number;
    invalidEmails: number;
  };
  invalidEmailSamples: string[];
};

type SubscriptionUserRow = {
  id: number;
  email: string;
  vorname: string;
  nachname: string;
  display_name: string;
  role: "experte" | "nutzer";
  plan_key: string;
  subscription_status: string;
  payment_method: "sepa" | "paypal";
  monthly_price_cents: number | null;
  custom_monthly_price_cents: number | null;
  custom_price_note: string | null;
  custom_price_set_at: string | null;
  started_at: string | null;
  next_charge_at: string | null;
  cancel_requested_at: string | null;
  cancel_effective_at: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  intro_period_ends_at: string | null;
  subscription_updated_at: string | null;
};

type SubscriptionPriceHistoryEntry = {
  id: number;
  user_id: number;
  action: string;
  previous_custom_monthly_price_cents: number | null;
  new_custom_monthly_price_cents: number | null;
  previous_effective_monthly_price_cents: number | null;
  new_effective_monthly_price_cents: number | null;
  note: string | null;
  changed_by: string | null;
  created_at: string;
  email: string;
  display_name: string;
};

type SubscriptionInvoiceAdminRow = {
  id: number;
  user_id: number;
  invoice_month: string;
  invoice_number: string;
  due_at: string;
  amount_cents: number;
  status: string;
  payment_method: string;
  plan_label: string;
  email: string;
  display_name: string;
};

export default function AdminAboPage() {
  const [adminCode, setAdminCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [activeSegment, setActiveSegment] = useState<SegmentKey>("experten");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [syncingBrevo, setSyncingBrevo] = useState(false);
  const [dryRunningBrevo, setDryRunningBrevo] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [dryRunMessage, setDryRunMessage] = useState("");
  const [dryRunData, setDryRunData] = useState<DryRunData | null>(null);
  const [subSearch, setSubSearch] = useState("");
  const [subRoleFilter, setSubRoleFilter] = useState<"all" | "experte" | "nutzer">("all");
  const [subCustomFilter, setSubCustomFilter] = useState<"all" | "with_custom" | "without_custom">("all");
  const [issueFilterMode, setIssueFilterMode] = useState<"all" | "issues" | "overdue-cancellations">("all");
  const [subscriptionUsers, setSubscriptionUsers] = useState<SubscriptionUserRow[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [selectedSubscriptionUserIds, setSelectedSubscriptionUserIds] = useState<number[]>([]);
  const [customPriceEuro, setCustomPriceEuro] = useState("");
  const [customPriceNote, setCustomPriceNote] = useState("");
  const [customPriceMessage, setCustomPriceMessage] = useState("");
  const [customPriceBusy, setCustomPriceBusy] = useState(false);
  const [inlinePriceByUserId, setInlinePriceByUserId] = useState<Record<number, string>>({});
  const [inlineNoteByUserId, setInlineNoteByUserId] = useState<Record<number, string>>({});
  const [inlineBusyUserId, setInlineBusyUserId] = useState<number | null>(null);
  const [finalizeBusyUserId, setFinalizeBusyUserId] = useState<number | null>(null);
  const [historyEntries, setHistoryEntries] = useState<SubscriptionPriceHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<SubscriptionInvoiceAdminRow[]>([]);
  const [subscriptionInvoiceSearch, setSubscriptionInvoiceSearch] = useState("");
  const [subscriptionInvoiceMessage, setSubscriptionInvoiceMessage] = useState("");
  const [subscriptionInvoiceLoading, setSubscriptionInvoiceLoading] = useState(false);
  const [subscriptionInvoiceGenBusy, setSubscriptionInvoiceGenBusy] = useState(false);
  const [subscriptionInvoiceActionBusyId, setSubscriptionInvoiceActionBusyId] = useState<number | null>(null);

  const loadSegments = async (code: string) => {
    setLoading(true);
    const res = await adminGetNewsletterSegmentsOverview(code);

    if (!res.success) {
      setAuthorized(false);
      setAuthError(res.error || "Code ungültig.");
      setSegments([]);
      setRecipients([]);
      setLoading(false);
      return;
    }

    const items = (res.items || []) as SegmentItem[];
    setSegments(items);
    setAuthorized(true);
    setAuthError("");
    setLoading(false);
  };

  const loadRecipients = async (code: string, segment: SegmentKey) => {
    setLoading(true);
    const res = await adminGetNewsletterRecipients(code, segment);
    if (!res.success) {
      setAuthError(res.error || "Empfänger konnten nicht geladen werden.");
      setRecipients([]);
      setLoading(false);
      return;
    }
    setRecipients((res.recipients || []) as Recipient[]);
    setLoading(false);
  };

  const loadSubscriptionUsers = async (
    code: string,
    searchValue?: string,
    roleValue?: "all" | "experte" | "nutzer",
    customFilterValue?: "all" | "with_custom" | "without_custom"
  ) => {
    setSubscriptionLoading(true);
    const res = await adminSearchSubscriptionUsers({
      adminCode: code,
      search: searchValue ?? subSearch,
      role: roleValue ?? subRoleFilter,
      customPriceFilter: customFilterValue ?? subCustomFilter,
      limit: 80,
    });

    if (!res.success) {
      setCustomPriceMessage((res as any).error || "Abo-Nutzer konnten nicht geladen werden.");
      setSubscriptionUsers([]);
      setSubscriptionLoading(false);
      return;
    }

    const rows = Array.isArray((res as any).users) ? ((res as any).users as SubscriptionUserRow[]) : [];
    setSubscriptionUsers(rows);
    setSelectedSubscriptionUserIds((prev) => prev.filter((id) => rows.some((item) => Number(item.id) === Number(id))));
    setSubscriptionLoading(false);
  };

  const loadPriceHistory = async (code: string, targetUserId?: number) => {
    setHistoryLoading(true);
    const res = await adminGetSubscriptionPriceHistory({
      adminCode: code,
      userId: targetUserId,
      limit: 80,
    });

    if (!res.success) {
      setHistoryEntries([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryEntries(Array.isArray((res as any).entries) ? ((res as any).entries as SubscriptionPriceHistoryEntry[]) : []);
    setHistoryLoading(false);
  };

  const loadSubscriptionInvoices = async (code: string, searchValue?: string) => {
    setSubscriptionInvoiceLoading(true);
    const res = await adminGetSubscriptionInvoices({
      adminCode: code,
      search: searchValue ?? subscriptionInvoiceSearch,
      limit: 120,
    });

    if (!res.success) {
      setSubscriptionInvoices([]);
      setSubscriptionInvoiceMessage((res as any).error || "Abo-Rechnungen konnten nicht geladen werden.");
      setSubscriptionInvoiceLoading(false);
      return;
    }

    setSubscriptionInvoices(Array.isArray((res as any).items) ? ((res as any).items as SubscriptionInvoiceAdminRow[]) : []);
    setSubscriptionInvoiceLoading(false);
  };

  useEffect(() => {
    const storedCode = sessionStorage.getItem("adminPanelCode") || "";
    if (!storedCode) return;
    setAdminCode(storedCode);
    loadSegments(storedCode);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadRecipients(adminCode, activeSegment);
  }, [authorized, activeSegment]);

  useEffect(() => {
    if (!authorized) return;
    loadSubscriptionUsers(adminCode);
    loadPriceHistory(adminCode);
    loadSubscriptionInvoices(adminCode);
  }, [authorized]);

  const generateSubscriptionInvoices = async () => {
    const proceed = window.confirm("Abo-Rechnungen jetzt für alle aktiven Abonnenten automatisch erzeugen?");
    if (!proceed) return;

    setSubscriptionInvoiceGenBusy(true);
    const res = await adminGenerateSubscriptionInvoices({
      adminCode,
      limitUsers: 2000,
    });
    setSubscriptionInvoiceGenBusy(false);

    if (!res.success) {
      setSubscriptionInvoiceMessage((res as any).error || "Abo-Rechnungserstellung fehlgeschlagen.");
      return;
    }

    const processedUsers = Number((res as any).processedUsers || 0);
    const createdInvoices = Number((res as any).createdInvoices || 0);
    setSubscriptionInvoiceMessage(`Automatiklauf abgeschlossen: ${createdInvoices} neue Abo-Rechnungen bei ${processedUsers} Abonnenten.`);
    await loadSubscriptionInvoices(adminCode);
  };

  const downloadSubscriptionInvoicePdf = async (invoiceId: number) => {
    setSubscriptionInvoiceActionBusyId(invoiceId);
    const res = await adminGetSubscriptionInvoicePdf({ adminCode, invoiceId });
    setSubscriptionInvoiceActionBusyId(null);
    if (!res.success || !(res as any).base64) {
      setSubscriptionInvoiceMessage((res as any).error || 'PDF konnte nicht geladen werden.');
      return;
    }

    const byteChars = atob(String((res as any).base64));
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i += 1) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: String((res as any).mimeType || 'application/pdf') });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = String((res as any).fileName || `abo-rechnung-${invoiceId}.pdf`);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const setSubscriptionInvoiceStatus = async (invoiceId: number, status: 'offen' | 'bezahlt') => {
    setSubscriptionInvoiceActionBusyId(invoiceId);
    const res = await adminUpdateSubscriptionInvoiceStatus({
      adminCode,
      invoiceId,
      status,
      note: `Status per Admin gesetzt: ${status}`,
    });
    setSubscriptionInvoiceActionBusyId(null);

    if (!res.success) {
      setSubscriptionInvoiceMessage((res as any).error || 'Status konnte nicht gespeichert werden.');
      return;
    }

    setSubscriptionInvoiceMessage(`Rechnungsstatus auf ${status} gesetzt.`);
    await loadSubscriptionInvoices(adminCode);
  };

  const authorize = async () => {
    setAuthError("");
    await loadSegments(adminCode);
    sessionStorage.setItem("adminPanelCode", adminCode);
  };

  const toggleSubscriptionUser = (userId: number) => {
    setSelectedSubscriptionUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((item) => item !== userId);
      return [...prev, userId];
    });
  };

  const toggleSelectAllVisibleSubscriptionUsers = () => {
    const visibleIds = displayedSubscriptionUsers.map((item) => Number(item.id));
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSubscriptionUserIds.includes(id));
    if (allSelected) {
      setSelectedSubscriptionUserIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedSubscriptionUserIds(Array.from(new Set([...selectedSubscriptionUserIds, ...visibleIds])));
  };

  const applyCustomPriceToSelectedUsers = async () => {
    if (selectedSubscriptionUserIds.length === 0) {
      setCustomPriceMessage("Bitte mindestens einen Nutzer auswählen.");
      return;
    }

    const parsed = Number(String(customPriceEuro || "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setCustomPriceMessage("Bitte einen gültigen Preis in EUR eingeben (z. B. 14,90).");
      return;
    }

    const customCents = Math.round(parsed * 100);
    const proceed = window.confirm(`Custom-Preis ${parsed.toFixed(2)} EUR für ${selectedSubscriptionUserIds.length} Nutzer speichern?`);
    if (!proceed) return;

    setCustomPriceBusy(true);
    setCustomPriceMessage("");

    let ok = 0;
    let failed = 0;
    for (const userId of selectedSubscriptionUserIds) {
      const res = await adminUpdateUserSubscriptionCustomPrice({
        adminCode,
        userId,
        customMonthlyPriceCents: customCents,
        note: customPriceNote,
      });

      if (res.success) ok += 1;
      else failed += 1;
    }

    setCustomPriceBusy(false);
    setCustomPriceMessage(`Preisupdate abgeschlossen: ${ok} erfolgreich, ${failed} fehlgeschlagen.`);
    await loadSubscriptionUsers(adminCode);
    await loadPriceHistory(adminCode);
  };

  const clearCustomPriceForSelectedUsers = async () => {
    if (selectedSubscriptionUserIds.length === 0) {
      setCustomPriceMessage("Bitte mindestens einen Nutzer auswählen.");
      return;
    }

    const proceed = window.confirm(`Custom-Preis für ${selectedSubscriptionUserIds.length} Nutzer entfernen und Standardpreis wiederherstellen?`);
    if (!proceed) return;

    setCustomPriceBusy(true);
    setCustomPriceMessage("");

    let ok = 0;
    let failed = 0;
    for (const userId of selectedSubscriptionUserIds) {
      const res = await adminUpdateUserSubscriptionCustomPrice({
        adminCode,
        userId,
        customMonthlyPriceCents: null,
      });
      if (res.success) ok += 1;
      else failed += 1;
    }

    setCustomPriceBusy(false);
    setCustomPriceMessage(`Rücksetzung abgeschlossen: ${ok} erfolgreich, ${failed} fehlgeschlagen.`);
    await loadSubscriptionUsers(adminCode);
    await loadPriceHistory(adminCode);
  };

  const applyInlineCustomPrice = async (userId: number) => {
    const rawValue = String(inlinePriceByUserId[userId] || "").trim();
    const parsed = Number(rawValue.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setCustomPriceMessage(`Bitte gültigen Preis für Nutzer ${userId} eingeben.`);
      return;
    }

    const cents = Math.round(parsed * 100);
    setInlineBusyUserId(userId);
    const res = await adminUpdateUserSubscriptionCustomPrice({
      adminCode,
      userId,
      customMonthlyPriceCents: cents,
      note: String(inlineNoteByUserId[userId] || "").trim(),
    });
    setInlineBusyUserId(null);

    if (!res.success) {
      setCustomPriceMessage((res as any).error || `Preis für Nutzer ${userId} konnte nicht gespeichert werden.`);
      return;
    }

    setCustomPriceMessage(`Preis für Nutzer ${userId} gespeichert.`);
    await loadSubscriptionUsers(adminCode);
    await loadPriceHistory(adminCode, userId);
  };

  const clearInlineCustomPrice = async (userId: number) => {
    setInlineBusyUserId(userId);
    const res = await adminUpdateUserSubscriptionCustomPrice({
      adminCode,
      userId,
      customMonthlyPriceCents: null,
      note: String(inlineNoteByUserId[userId] || "").trim(),
    });
    setInlineBusyUserId(null);

    if (!res.success) {
      setCustomPriceMessage((res as any).error || `Preis für Nutzer ${userId} konnte nicht zurückgesetzt werden.`);
      return;
    }

    setCustomPriceMessage(`Preis für Nutzer ${userId} auf Standard zurückgesetzt.`);
    await loadSubscriptionUsers(adminCode);
    await loadPriceHistory(adminCode, userId);
  };

  const finalizeCancellationNow = async (user: SubscriptionUserRow) => {
    const confirmed = window.confirm(`Kündigung für Nutzer ${user.id} jetzt finalisieren und auf Free-Tarif zurücksetzen?`);
    if (!confirmed) return;

    setFinalizeBusyUserId(user.id);
    const res = await adminFinalizeSubscriptionCancellation({
      adminCode,
      userId: user.id,
      note: user.cancel_reason || 'Admin-Finalisierung',
    });
    setFinalizeBusyUserId(null);

    if (!res.success) {
      setCustomPriceMessage((res as any).error || `Kündigung für Nutzer ${user.id} konnte nicht finalisiert werden.`);
      return;
    }

    setCustomPriceMessage(`Kündigung für Nutzer ${user.id} wurde finalisiert.`);
    await loadSubscriptionUsers(adminCode);
    await loadPriceHistory(adminCode, user.id);
  };

  const syncToBrevo = async () => {
    const proceed = window.confirm(`Segment ${selectedLabel} jetzt an Brevo senden?`);
    if (!proceed) return;

    setSyncingBrevo(true);
    setSyncMessage("");
    const res = await adminSyncNewsletterSegmentToBrevo({
      adminCode,
      segment: activeSegment,
    });
    setSyncingBrevo(false);

    if (!res.success && !(res as any).partial) {
      setSyncMessage((res as any).error || "Brevo-Synchronisierung fehlgeschlagen.");
      return;
    }

    const synced = Number((res as any).synced || 0);
    const failed = Number((res as any).failed || 0);
    const listId = Number((res as any).listId || 0);
    setSyncMessage(`Brevo Sync abgeschlossen: ${synced} erfolgreich, ${failed} fehlgeschlagen (Liste ${listId}).`);
  };

  const runDryPreview = async () => {
    setDryRunningBrevo(true);
    setDryRunMessage("");
    setDryRunData(null);

    const res = await adminPreviewNewsletterSegmentSync({
      adminCode,
      segment: activeSegment,
    });

    setDryRunningBrevo(false);
    if (!res.success) {
      setDryRunMessage((res as any).error || "Dry-Run fehlgeschlagen.");
      return;
    }

    const totals = (res as any).totals || {};
    const listId = Number((res as any).listId || 0);
    const hasApiKey = Boolean((res as any).hasBrevoApiKey);
    const canSyncNow = Boolean((res as any).canSyncNow);
    const invalidSamples = Array.isArray((res as any).invalidEmailSamples) ? (res as any).invalidEmailSamples : [];

    setDryRunData({
      listId,
      hasBrevoApiKey: hasApiKey,
      canSyncNow,
      totals: {
        totalRows: Number(totals.totalRows || 0),
        validEmails: Number(totals.validEmails || 0),
        uniqueValidEmails: Number(totals.uniqueValidEmails || 0),
        duplicateEmails: Number(totals.duplicateEmails || 0),
        invalidEmails: Number(totals.invalidEmails || 0),
      },
      invalidEmailSamples: invalidSamples,
    });
    setDryRunMessage("Dry-Run erfolgreich ausgeführt.");
  };

  const emailList = useMemo(() => {
    const unique = Array.from(new Set(recipients.map((item) => String(item.email || "").trim().toLowerCase()).filter(Boolean)));
    return unique.join(", ");
  }, [recipients]);

  const downloadCsv = () => {
    const header = ["id", "vorname", "nachname", "email", "role", "plan_key", "newsletter_updated_at"];
    const escapeValue = (value: unknown) => {
      const text = String(value ?? "");
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = recipients.map((item) => [
      item.id,
      item.vorname,
      item.nachname,
      item.email,
      item.role,
      item.plan_key,
      item.newsletter_updated_at,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeValue(cell)).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `newsletter-${activeSegment}-${datePart}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const downloadBrevoCsv = () => {
    const header = ["EMAIL", "FIRSTNAME", "LASTNAME"];
    const escapeValue = (value: unknown) => {
      const text = String(value ?? "").trim();
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = recipients
      .map((item) => [
        String(item.email || "").trim().toLowerCase(),
        String(item.vorname || "").trim(),
        String(item.nachname || "").trim(),
      ])
      .filter((row) => row[0]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeValue(cell)).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `brevo-newsletter-${activeSegment}-${datePart}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const selectedLabel = segments.find((item) => item.segment === activeSegment)?.label || "Segment";
  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("de-DE");
  };

  const getIntroStatus = (item: SubscriptionUserRow) => {
    if (!item.intro_period_ends_at) return "-";
    const end = new Date(item.intro_period_ends_at);
    if (!Number.isFinite(end.getTime())) return "-";
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return "2 Monate beendet";
    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return `noch ${daysLeft} Tage`;
  };

  const getSubscriptionIssueFlags = (item: SubscriptionUserRow) => {
    const effectiveCents =
      item.custom_monthly_price_cents !== null && item.custom_monthly_price_cents !== undefined
        ? Number(item.custom_monthly_price_cents)
        : (item.monthly_price_cents === null || item.monthly_price_cents === undefined ? 0 : Number(item.monthly_price_cents));
    const hasTimingIssue = effectiveCents > 0 && !item.next_charge_at;
    const cancelPendingWithoutDate = item.subscription_status === "cancel_pending" && !item.cancel_effective_at;
    const cancelEffectivePast = item.subscription_status === "cancel_pending" && item.cancel_effective_at
      ? new Date(item.cancel_effective_at).getTime() < Date.now()
      : false;
    return { hasTimingIssue, cancelPendingWithoutDate, cancelEffectivePast };
  };

  const displayedSubscriptionUsers = useMemo(() => {
    if (issueFilterMode === "all") return subscriptionUsers;
    return subscriptionUsers.filter((item) => {
      const flags = getSubscriptionIssueFlags(item);
      if (issueFilterMode === "overdue-cancellations") {
        return flags.cancelEffectivePast;
      }
      return flags.hasTimingIssue || flags.cancelPendingWithoutDate || flags.cancelEffectivePast;
    });
  }, [issueFilterMode, subscriptionUsers]);

  const dryRunStatus =
    dryRunData === null
      ? "idle"
      : !dryRunData.hasBrevoApiKey || dryRunData.listId <= 0
        ? "red"
        : dryRunData.totals.invalidEmails > 0
          ? "yellow"
          : "green";
  const activeSubscriptionFilterText = `Rolle: ${subRoleFilter === "all" ? "Alle" : subRoleFilter === "experte" ? "Experten" : "Nutzer"} · Custom-Preis: ${subCustomFilter === "all" ? "Alle" : subCustomFilter === "with_custom" ? "Nur aktiv" : "Nur nicht aktiv"} · Ansicht: ${issueFilterMode === "all" ? "Alle" : issueFilterMode === "issues" ? "Nur Problemfälle" : "Nur überfällige Kündigungen"}`;

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 md:p-12">
        <div className="max-w-xl mx-auto bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-black uppercase italic text-slate-900">Newsletter-Management</h1>
          <p className="text-sm font-bold text-slate-500">Bitte Admin-Code eingeben.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">Admin-Zentrale</Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Verifizierung</Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Kontakt</Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Moderation</Link>
            <Link href="/admin/werbung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Werbung</Link>
            <Link href="/admin/abo" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">Newsletter</Link>
          </div>
          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="Admin-Code"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-300"
          />
          {authError && <p className="text-sm font-bold text-red-500">{authError}</p>}
          <button type="button" onClick={authorize} className="w-full px-6 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest">
            Zugriff prüfen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-12 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-black uppercase italic text-slate-900">Newsletter-Management</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">5 Segmente: Experten Abo, Experten Pro Abo, Experten, Nutzer, Nutzer Abo</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700">Admin-Zentrale</Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Verifizierung</Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Kontakt</Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Moderation</Link>
            <Link href="/admin/werbung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600">Werbung</Link>
            <Link href="/admin/abo" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">Newsletter</Link>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Segmente</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {segments.map((item) => (
              <button
                key={item.segment}
                type="button"
                onClick={() => setActiveSegment(item.segment)}
                className={`text-left rounded-xl border p-3 ${activeSegment === item.segment ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"}`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-black italic text-slate-900">{item.count}</p>
                <p className="text-[10px] uppercase text-slate-500">Abonnenten</p>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black uppercase italic text-slate-900">{selectedLabel}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Empfängerliste für Versand</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runDryPreview}
                disabled={dryRunningBrevo}
                className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {dryRunningBrevo ? "Dry-Run..." : "Brevo Dry-Run"}
              </button>
              <button
                type="button"
                onClick={syncToBrevo}
                disabled={syncingBrevo}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {syncingBrevo ? "Sende an Brevo..." : "Zu Brevo senden"}
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
              >
                CSV exportieren
              </button>
              <button
                type="button"
                onClick={downloadBrevoCsv}
                className="px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest"
              >
                Brevo CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(emailList);
                  alert("E-Mail-Liste kopiert.");
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
              >
                E-Mails kopieren
              </button>
            </div>
          </div>

          {authError && <p className="text-sm font-bold text-red-600">{authError}</p>}
          {syncMessage && <p className="text-sm font-bold text-emerald-700">{syncMessage}</p>}
          {dryRunMessage && <p className="text-sm font-bold text-amber-700">{dryRunMessage}</p>}
          {loading ? <p className="text-sm text-slate-500">Lade Empfänger...</p> : null}

          {dryRunData && (
            <div
              className={`rounded-2xl border p-4 space-y-3 ${dryRunStatus === "green" ? "border-emerald-300 bg-emerald-50" : dryRunStatus === "yellow" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Dry-Run Ergebnis</p>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${dryRunStatus === "green" ? "bg-emerald-200 text-emerald-800" : dryRunStatus === "yellow" ? "bg-amber-200 text-amber-800" : "bg-red-200 text-red-800"}`}>
                  {dryRunStatus === "green" ? "Grün: Versand bereit" : dryRunStatus === "yellow" ? "Gelb: Daten prüfen" : "Rot: Konfiguration fehlt"}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Zeilen</p>
                  <p className="text-lg font-black text-slate-900">{dryRunData.totals.totalRows}</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Eindeutig gültig</p>
                  <p className="text-lg font-black text-slate-900">{dryRunData.totals.uniqueValidEmails}</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Duplikate</p>
                  <p className="text-lg font-black text-slate-900">{dryRunData.totals.duplicateEmails}</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Ungültig</p>
                  <p className="text-lg font-black text-slate-900">{dryRunData.totals.invalidEmails}</p>
                </div>
                <div className="rounded-xl border border-white/70 bg-white/70 p-3">
                  <p className="text-[10px] uppercase text-slate-500">Brevo Liste</p>
                  <p className="text-lg font-black text-slate-900">{dryRunData.listId > 0 ? dryRunData.listId : "-"}</p>
                </div>
              </div>

              <p className="text-xs text-slate-700">
                API-Key: <span className="font-black">{dryRunData.hasBrevoApiKey ? "ok" : "fehlt"}</span> ·
                Sendefähig: <span className="font-black">{dryRunData.canSyncNow ? "ja" : "nein"}</span>
              </p>

              {dryRunData.invalidEmailSamples.length > 0 && (
                <p className="text-xs text-slate-700">
                  Beispiele ungültiger E-Mails: {dryRunData.invalidEmailSamples.join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">E-Mail</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Rolle</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Plan</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Opt-in</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((item) => (
                  <tr key={`recipient-${item.id}`} className="border-t border-slate-100">
                    <td className="p-3 text-slate-800">{item.vorname} {item.nachname}</td>
                    <td className="p-3 text-slate-700">{item.email}</td>
                    <td className="p-3 text-slate-700 uppercase">{item.role}</td>
                    <td className="p-3 text-slate-700 uppercase">{item.plan_key}</td>
                    <td className="p-3 text-slate-500">{new Date(item.newsletter_updated_at).toLocaleDateString("de-DE")}</td>
                  </tr>
                ))}
                {recipients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">Keine Empfänger in diesem Segment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black uppercase italic text-slate-900">Individuelle Abo-Preise</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer auswählen und Custom-Preis setzen</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={subRoleFilter}
                onChange={(e) => {
                  const nextRole = (e.target.value as "all" | "experte" | "nutzer") || "all";
                  setSubRoleFilter(nextRole);
                  loadSubscriptionUsers(adminCode, subSearch, nextRole, subCustomFilter);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold"
              >
                <option value="all">Alle Rollen</option>
                <option value="experte">Experten</option>
                <option value="nutzer">Nutzer</option>
              </select>
              <select
                value={subCustomFilter}
                onChange={(e) => {
                  const next = (e.target.value as "all" | "with_custom" | "without_custom") || "all";
                  setSubCustomFilter(next);
                  loadSubscriptionUsers(adminCode, subSearch, subRoleFilter, next);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold"
              >
                <option value="all">Custom-Preis: Alle</option>
                <option value="with_custom">Custom-Preis: Nur aktiv</option>
                <option value="without_custom">Custom-Preis: Nur nicht aktiv</option>
              </select>
              <input
                type="text"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Suche nach Name, E-Mail oder ID"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm min-w-[220px]"
              />
              <button
                type="button"
                onClick={() => loadSubscriptionUsers(adminCode)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
              >
                Laden
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Custom-Preis (EUR / Monat)</label>
              <input
                type="text"
                value={customPriceEuro}
                onChange={(e) => setCustomPriceEuro(e.target.value)}
                placeholder="z. B. 14,90"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Notiz (optional)</label>
              <input
                type="text"
                value={customPriceNote}
                onChange={(e) => setCustomPriceNote(e.target.value)}
                placeholder="Grund der Anpassung"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700"
              />
            </div>
            <div className="md:col-span-1 flex flex-col gap-2 justify-end">
              <button
                type="button"
                onClick={applyCustomPriceToSelectedUsers}
                disabled={customPriceBusy}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {customPriceBusy ? "Speichere..." : "Preis setzen"}
              </button>
              <button
                type="button"
                onClick={clearCustomPriceForSelectedUsers}
                disabled={customPriceBusy}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                Preis zurücksetzen
              </button>
            </div>
          </div>

          {customPriceMessage ? <p className="text-sm font-bold text-slate-700">{customPriceMessage}</p> : null}
          {subscriptionLoading ? <p className="text-sm text-slate-500">Lade Abo-Nutzer...</p> : null}

          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{activeSubscriptionFilterText}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <p>{selectedSubscriptionUserIds.length} Nutzer ausgewählt</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIssueFilterMode((prev) => (prev === "issues" ? "all" : "issues"))}
                className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${issueFilterMode === "issues" ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {issueFilterMode === "issues" ? "Alle Fälle" : "Nur Problemfälle"}
              </button>
              <button
                type="button"
                onClick={() => setIssueFilterMode((prev) => (prev === "overdue-cancellations" ? "all" : "overdue-cancellations"))}
                className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${issueFilterMode === "overdue-cancellations" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {issueFilterMode === "overdue-cancellations" ? "Alle Fälle" : "Nur überfällige Kündigungen"}
              </button>
              <button
                type="button"
                onClick={toggleSelectAllVisibleSubscriptionUsers}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
              >
                Sichtbare alle markieren
              </button>
            </div>
          </div>

          <div className="overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Auswahl</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">E-Mail</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Rolle / Plan</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Monatspreis</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Abo-Zeitplan</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">2-Monate / Kündigung</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Custom</th>
                  <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Inline-Aktion</th>
                </tr>
              </thead>
              <tbody>
                {displayedSubscriptionUsers.map((item) => {
                  const selected = selectedSubscriptionUserIds.includes(Number(item.id));
                  const effectiveCents =
                    item.custom_monthly_price_cents !== null && item.custom_monthly_price_cents !== undefined
                      ? Number(item.custom_monthly_price_cents)
                      : (item.monthly_price_cents === null || item.monthly_price_cents === undefined ? 0 : Number(item.monthly_price_cents));
                  const effectivePrice = (effectiveCents / 100).toFixed(2).replace(".", ",");
                  const { hasTimingIssue, cancelPendingWithoutDate, cancelEffectivePast } = getSubscriptionIssueFlags(item);

                  return (
                    <tr key={`sub-user-${item.id}`} className="border-t border-slate-100">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSubscriptionUser(Number(item.id))}
                        />
                      </td>
                      <td className="p-3 text-slate-800">
                        <p className="font-bold">{item.display_name || `${item.vorname || ""} ${item.nachname || ""}`.trim() || `User #${item.id}`}</p>
                        <p className="text-xs text-slate-500">ID: {item.id}</p>
                      </td>
                      <td className="p-3 text-slate-700">{item.email}</td>
                      <td className="p-3 text-slate-700 uppercase">{item.role} / {item.plan_key}</td>
                      <td className="p-3 text-slate-700">{effectivePrice} EUR</td>
                      <td className="p-3 text-slate-600">
                        <p className="text-xs"><span className="font-bold">Abschluss:</span> {formatDateTime(item.started_at)}</p>
                        <p className="text-xs"><span className="font-bold">Nächster Einzug:</span> {formatDateTime(item.next_charge_at)}</p>
                      </td>
                      <td className="p-3 text-slate-600">
                        <p className="text-xs"><span className="font-bold">2 Monate bis:</span> {formatDateTime(item.intro_period_ends_at)}</p>
                        <p className="text-xs"><span className="font-bold">Status:</span> {getIntroStatus(item)}</p>
                        {item.cancel_requested_at && (
                          <p className="text-xs text-amber-700 font-bold">Kündigung angefordert: {formatDateTime(item.cancel_requested_at)}</p>
                        )}
                        {item.cancel_effective_at && (
                          <p className="text-xs text-amber-700">Wirksam zum: {formatDateTime(item.cancel_effective_at)}</p>
                        )}
                        {item.cancel_reason && (
                          <p className="text-xs text-slate-500">Grund: {item.cancel_reason}</p>
                        )}
                        {item.cancelled_at && (
                          <p className="text-xs text-red-700 font-bold">Beendet am: {formatDateTime(item.cancelled_at)}</p>
                        )}
                        {hasTimingIssue && (
                          <p className="text-xs text-red-700 font-bold">Warnung: Kein nächster Einzug gesetzt.</p>
                        )}
                        {cancelPendingWithoutDate && (
                          <p className="text-xs text-red-700 font-bold">Warnung: Kündigung ohne Wirksamkeitsdatum.</p>
                        )}
                        {cancelEffectivePast && (
                          <p className="text-xs text-red-700 font-bold">Warnung: Kündigung überfällig, aber Status noch aktiv.</p>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {item.custom_monthly_price_cents !== null && item.custom_monthly_price_cents !== undefined ? (
                          <span className="inline-block px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">Aktiv</span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold">Nein</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <input
                            type="text"
                            value={inlinePriceByUserId[item.id] ?? ""}
                            onChange={(e) => setInlinePriceByUserId((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="EUR, z. B. 12,90"
                            className="px-2 py-1 rounded-lg border border-slate-300 text-xs"
                          />
                          <input
                            type="text"
                            value={inlineNoteByUserId[item.id] ?? ""}
                            onChange={(e) => setInlineNoteByUserId((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Notiz"
                            className="px-2 py-1 rounded-lg border border-slate-300 text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => applyInlineCustomPrice(item.id)}
                              disabled={inlineBusyUserId === item.id}
                              className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                            >
                              Setzen
                            </button>
                            <button
                              type="button"
                              onClick={() => clearInlineCustomPrice(item.id)}
                              disabled={inlineBusyUserId === item.id}
                              className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => loadPriceHistory(adminCode, item.id)}
                              className="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest"
                            >
                              Verlauf
                            </button>
                            {cancelEffectivePast && (
                              <button
                                type="button"
                                onClick={() => finalizeCancellationNow(item)}
                                disabled={finalizeBusyUserId === item.id}
                                className="px-2 py-1 rounded-lg border border-red-300 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                              >
                                {finalizeBusyUserId === item.id ? "Finalisiere..." : "Kündigung finalisieren"}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayedSubscriptionUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500">Keine Abo-Nutzer für die aktuellen Filter gefunden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Abo-Rechnungsautomatik</h3>
                <p className="text-xs text-slate-500">Erzeugt Rechnungen automatisch für alle aktiven Abonnenten und macht sie in Profilen abrufbar.</p>
              </div>
              <button
                type="button"
                onClick={generateSubscriptionInvoices}
                disabled={subscriptionInvoiceGenBusy}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {subscriptionInvoiceGenBusy ? "Erzeuge..." : "Abo-Rechnungen erzeugen"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={subscriptionInvoiceSearch}
                onChange={(e) => setSubscriptionInvoiceSearch(e.target.value)}
                placeholder="Suche nach Nutzer, E-Mail, Rechnung oder Monat"
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm min-w-[240px]"
              />
              <button
                type="button"
                onClick={() => loadSubscriptionInvoices(adminCode)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
              >
                Liste aktualisieren
              </button>
            </div>

            {subscriptionInvoiceMessage ? <p className="text-sm font-bold text-slate-700">{subscriptionInvoiceMessage}</p> : null}
            {subscriptionInvoiceLoading ? <p className="text-sm text-slate-500">Lade Abo-Rechnungen...</p> : null}

            <div className="overflow-auto border border-slate-200 rounded-xl bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Rechnung</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Plan / Monat</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Fällig</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Betrag</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptionInvoices.map((item) => (
                    <tr key={`sub-invoice-${item.id}`} className="border-t border-slate-100">
                      <td className="p-3 text-slate-700">
                        <p className="font-bold">{item.display_name || `User #${item.user_id}`}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </td>
                      <td className="p-3 text-slate-700">{item.invoice_number}</td>
                      <td className="p-3 text-slate-700">{item.plan_label} · {item.invoice_month}</td>
                      <td className="p-3 text-slate-600">{formatDateTime(item.due_at)}</td>
                      <td className="p-3 text-slate-700">{(Number(item.amount_cents || 0) / 100).toFixed(2).replace('.', ',')} EUR</td>
                      <td className="p-3 text-slate-700 uppercase">{item.status}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => downloadSubscriptionInvoicePdf(item.id)}
                            disabled={subscriptionInvoiceActionBusyId === item.id}
                            className="px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            PDF
                          </button>
                          {item.status !== 'bezahlt' ? (
                            <button
                              type="button"
                              onClick={() => setSubscriptionInvoiceStatus(item.id, 'bezahlt')}
                              disabled={subscriptionInvoiceActionBusyId === item.id}
                              className="px-2 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                            >
                              Als bezahlt
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSubscriptionInvoiceStatus(item.id, 'offen')}
                              disabled={subscriptionInvoiceActionBusyId === item.id}
                              className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                            >
                              Als offen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subscriptionInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">Noch keine Abo-Rechnungen gefunden.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Preisverlauf</h3>
              <button
                type="button"
                onClick={() => loadPriceHistory(adminCode)}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
              >
                Aktualisieren
              </button>
            </div>
            {historyLoading ? <p className="text-sm text-slate-500">Lade Verlauf...</p> : null}
            <div className="overflow-auto border border-slate-200 rounded-xl">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Zeit</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Aktion</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Preis alt -&gt; neu</th>
                    <th className="text-left p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Notiz</th>
                  </tr>
                </thead>
                <tbody>
                  {historyEntries.map((entry) => {
                    const oldPrice =
                      entry.previous_effective_monthly_price_cents === null || entry.previous_effective_monthly_price_cents === undefined
                        ? "-"
                        : `${(Number(entry.previous_effective_monthly_price_cents) / 100).toFixed(2).replace(".", ",")} EUR`;
                    const newPrice =
                      entry.new_effective_monthly_price_cents === null || entry.new_effective_monthly_price_cents === undefined
                        ? "-"
                        : `${(Number(entry.new_effective_monthly_price_cents) / 100).toFixed(2).replace(".", ",")} EUR`;

                    return (
                      <tr key={`price-history-${entry.id}`} className="border-t border-slate-100">
                        <td className="p-3 text-slate-600">{new Date(entry.created_at).toLocaleString("de-DE")}</td>
                        <td className="p-3 text-slate-700">{entry.display_name || entry.email} (#{entry.user_id})</td>
                        <td className="p-3 text-slate-700">{entry.action}</td>
                        <td className="p-3 text-slate-700">{oldPrice} -&gt; {newPrice}</td>
                        <td className="p-3 text-slate-600">{entry.note || "-"}</td>
                      </tr>
                    );
                  })}
                  {historyEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">Noch keine Preis-Aenderungen vorhanden.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}