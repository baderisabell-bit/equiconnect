"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Trash2, Check } from "lucide-react";
import {
  adminGetAboAnalytics,
  adminGetFoundingMembersAnalytics,
  adminGetLifetimeAccessList,
  adminMarkAsFoundingMember,
  adminRevokeFoundingMember,
  adminGrantLifetimeFreeAccess,
  adminRevokeLifetimeFreeAccess,
  adminSearchSubscriptionUsers
} from "../../actions";

type Tab = "analytics" | "founding-members" | "lifetime-access" | "bulk-actions";

type AboAnalytics = {
  experteAboCount: number;
  experteProCount: number;
  nutzerPlusCount: number;
  foundingMembersCount: number;
  lifetimeFreeAccessCount: number;
  foundingMembersFreeCount: number;
  foundingMembersExpiredCount: number;
};

type FoundingMember = {
  id: number;
  email: string;
  name: string;
  planKey: string;
  foundingMemberFreeUntil: string | null;
  lifetimeDiscountPercent: number;
  isActive: boolean;
};

type LifetimeAccessUser = {
  id: number;
  email: string;
  name: string;
  planKey: string;
  status: string;
  grantedAt: string;
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
  subscription_updated_at: string | null;
};

export default function AdminAboManagementPage() {
  const adminCode = "";
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Analytics
  const [analytics, setAnalytics] = useState<AboAnalytics | null>(null);

  // Founding Members
  const [foundingMembers, setFoundingMembers] = useState<FoundingMember[]>([]);
  const [foundingMembersLoading, setFoundingMembersLoading] = useState(false);

  // Lifetime Access
  const [lifetimeAccessUsers, setLifetimeAccessUsers] = useState<LifetimeAccessUser[]>([]);
  const [lifetimeAccessLoading, setLifetimeAccessLoading] = useState(false);

  // Bulk Actions
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkRole, setBulkRole] = useState<"all" | "experte" | "nutzer">("experte");
  const [bulkUsers, setBulkUsers] = useState<SubscriptionUserRow[]>([]);
  const [bulkUsersLoading, setBulkUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<"founding" | "lifetime" | "">("founding");
  const [bulkLifetimePlanKey, setBulkLifetimePlanKey] = useState<"auto" | "experte_abo" | "experte_pro" | "nutzer_plus">("auto");
  const [bulkActionBusy, setBulkActionBusy] = useState(false);

  // Add single user
  const [addSingleUserId, setAddSingleUserId] = useState("");
  const [lifetimePlanKey, setLifetimePlanKey] = useState<"auto" | "experte_abo" | "experte_pro" | "nutzer_plus">("auto");
  const [singleUserActionBusy, setSingleUserActionBusy] = useState(false);

  const loadAnalytics = async () => {
    setError("");
    const res = await adminGetAboAnalytics(adminCode);

    if (!res.success) {
      setError(res.error || "Analytik konnte nicht geladen werden.");
      setAnalytics(null);
      return;
    }

    setAnalytics((res as any).data);
  };

  const loadFoundingMembers = async (code: string) => {
    setFoundingMembersLoading(true);
    setError("");
    const res = await adminGetFoundingMembersAnalytics(code, 200);
    setFoundingMembersLoading(false);

    if (!res.success) {
      setError(res.error || "Gründungsmitglieder konnten nicht geladen werden.");
      setFoundingMembers([]);
      return;
    }

    setFoundingMembers((res as any).members || []);
  };

  const loadLifetimeAccessUsers = async (code: string) => {
    setLifetimeAccessLoading(true);
    setError("");
    const res = await adminGetLifetimeAccessList(code, 200);
    setLifetimeAccessLoading(false);

    if (!res.success) {
      setError(res.error || "Lebenszugriff-Liste konnte nicht geladen werden.");
      setLifetimeAccessUsers([]);
      return;
    }

    setLifetimeAccessUsers((res as any).users || []);
  };

  const loadBulkUsers = async (code: string) => {
    setBulkUsersLoading(true);
    setError("");
    const res = await adminSearchSubscriptionUsers({
      adminCode: code,
      search: bulkSearch,
      role: bulkRole,
      customPriceFilter: "all",
      limit: 150,
    });
    setBulkUsersLoading(false);

    if (!res.success) {
      setError((res as any).error || "Nutzer konnten nicht geladen werden.");
      setBulkUsers([]);
      return;
    }

    const rows = Array.isArray((res as any).users) ? ((res as any).users as SubscriptionUserRow[]) : [];
    setBulkUsers(rows);
    setSelectedUserIds((prev) => prev.filter((id) => rows.some((item) => Number(item.id) === Number(id))));
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const markSingleUserAsFoundingMember = async () => {
    const userId = Number(addSingleUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      setError("Bitte gültige User-ID eingeben.");
      return;
    }

    setSingleUserActionBusy(true);
    setError("");
    setMessage("");

    const res = await adminMarkAsFoundingMember(adminCode, userId, 30);
    setSingleUserActionBusy(false);

    if (!res.success) {
      setError(res.error || "Fehler beim Markieren.");
      return;
    }

    setMessage(res.message || "Nutzer als Gründungsmitglied markiert.");
    setAddSingleUserId("");
    await loadFoundingMembers(adminCode);
    await loadAnalytics();
  };

  const grantLifetimeAccessToSingleUser = async () => {
    const userId = Number(addSingleUserId);
    if (!Number.isInteger(userId) || userId <= 0) {
      setError("Bitte gültige User-ID eingeben.");
      return;
    }

    setSingleUserActionBusy(true);
    setError("");
    setMessage("");

    const res = await adminGrantLifetimeFreeAccess(
      adminCode,
      userId,
      lifetimePlanKey === "auto" ? null : lifetimePlanKey
    );
    setSingleUserActionBusy(false);

    if (!res.success) {
      setError(res.error || "Fehler beim Gewähren des Zugriffs.");
      return;
    }

    setMessage(res.message || "Lebenszeit-Zugriff gewährt.");
    setAddSingleUserId("");
    await loadLifetimeAccessUsers(adminCode);
    await loadAnalytics();
  };

  const revokeFoundingMemberMultiple = async () => {
    if (selectedUserIds.length === 0) {
      setError("Bitte mindestens einen Nutzer auswählen.");
      return;
    }

    const proceed = window.confirm(
      `Gründungsmitglied-Status von ${selectedUserIds.length} Nutzern entfernen?`
    );
    if (!proceed) return;

    setBulkActionBusy(true);
    setError("");
    setMessage("");

    let ok = 0;
    let failed = 0;
    for (const userId of selectedUserIds) {
      const res = await adminRevokeFoundingMember(adminCode, userId);
      if (res.success) ok += 1;
      else failed += 1;
    }

    setBulkActionBusy(false);
    setMessage(`Abgeschlossen: ${ok} erfolgreich, ${failed} fehlgeschlagen.`);
    setSelectedUserIds([]);
    await loadFoundingMembers(adminCode);
    await loadAnalytics();
  };

  const revokeLifetimeAccessMultiple = async () => {
    if (selectedUserIds.length === 0) {
      setError("Bitte mindestens einen Nutzer auswählen.");
      return;
    }

    const proceed = window.confirm(
      `Lebenszugriff von ${selectedUserIds.length} Nutzern entfernen?`
    );
    if (!proceed) return;

    setBulkActionBusy(true);
    setError("");
    setMessage("");

    let ok = 0;
    let failed = 0;
    for (const userId of selectedUserIds) {
      const res = await adminRevokeLifetimeFreeAccess(adminCode, userId);
      if (res.success) ok += 1;
      else failed += 1;
    }

    setBulkActionBusy(false);
    setMessage(`Abgeschlossen: ${ok} erfolgreich, ${failed} fehlgeschlagen.`);
    setSelectedUserIds([]);
    await loadLifetimeAccessUsers(adminCode);
    await loadAnalytics();
  };

  const grantLifetimeAccessMultiple = async () => {
    if (selectedUserIds.length === 0) {
      setError("Bitte mindestens einen Nutzer auswählen.");
      return;
    }

    const proceed = window.confirm(
      `Lebenszugriff für ${selectedUserIds.length} Nutzer gewähren?`
    );
    if (!proceed) return;

    setBulkActionBusy(true);
    setError("");
    setMessage("");

    let ok = 0;
    let failed = 0;
    for (const userId of selectedUserIds) {
      const res = await adminGrantLifetimeFreeAccess(
        adminCode,
        userId,
        bulkLifetimePlanKey === "auto" ? null : bulkLifetimePlanKey
      );
      if (res.success) ok += 1;
      else failed += 1;
    }

    setBulkActionBusy(false);
    setMessage(`Abgeschlossen: ${ok} erfolgreich, ${failed} fehlgeschlagen.`);
    setSelectedUserIds([]);
    await loadLifetimeAccessUsers(adminCode);
    await loadAnalytics();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black italic uppercase text-slate-900">Abo-Verwaltung</h1>
            <p className="text-sm text-slate-500 mt-1">Gründungsmitglieder & Lebenszugriff-Management</p>
          </div>
          <Link href="/admin" className="px-4 py-2 rounded-xl bg-slate-100 text-[10px] font-black uppercase text-slate-700 border border-slate-200">
            ← Zurück zu Admin
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-2">
          {(["analytics", "founding-members", "lifetime-access", "bulk-actions"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setError("");
                setMessage("");
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition ${
                activeTab === tab
                  ? "bg-slate-900 text-white border-slate-900 border"
                  : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tab === "analytics" && "📊 Analytik"}
              {tab === "founding-members" && "🌟 Gründungsmitglieder"}
              {tab === "lifetime-access" && "♾️ Lebenszugriff"}
              {tab === "bulk-actions" && "⚙️ Bulk-Aktionen"}
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm font-bold text-red-700">{error}</div>}
        {message && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm font-bold text-emerald-700">{message}</div>}

        {/* Analytics Tab */}
        {activeTab === "analytics" && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aktive Abos</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Experten Abo:</span>
                    <span className="text-2xl font-black text-slate-900">{analytics.experteAboCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Experten Premium Abo:</span>
                    <span className="text-2xl font-black text-slate-900">{analytics.experteProCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Nutzer Plus Abo:</span>
                    <span className="text-2xl font-black text-slate-900">{analytics.nutzerPlusCount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Spezielle Staus</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Gründungsmitglieder:</span>
                    <span className="text-2xl font-black text-amber-700">{analytics.foundingMembersCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Lebenszugriff:</span>
                    <span className="text-2xl font-black text-emerald-700">{analytics.lifetimeFreeAccessCount}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-3">
                    <div>🕐 Davon noch kostenlos: {analytics.foundingMembersFreeCount}</div>
                    <div>⏳ Davon abgelaufen: {analytics.foundingMembersExpiredCount}</div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab("founding-members");
                loadFoundingMembers(adminCode);
              }}
              className="w-full px-6 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] hover:bg-slate-800 transition"
            >
              Zu Gründungsmitgliedern →
            </button>
          </div>
        )}

        {/* Founding Members Tab */}
        {activeTab === "founding-members" && (
          <div className="space-y-6">
            {/* Add Single User */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer als Gründungsmitglied hinzufügen</p>
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">User-ID</label>
                  <input
                    type="number"
                    value={addSingleUserId}
                    onChange={(e) => setAddSingleUserId(e.target.value)}
                    placeholder="User ID eingeben"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </div>
                <button
                  onClick={markSingleUserAsFoundingMember}
                  disabled={singleUserActionBusy}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-black uppercase text-[10px] disabled:opacity-60 inline-flex items-center gap-1"
                >
                  <Plus size={14} /> Hinzufügen
                </button>
              </div>
            </div>

            {/* List */}
            {foundingMembersLoading ? (
              <p className="text-sm text-slate-500">Wird geladen...</p>
            ) : foundingMembers.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Gründungsmitglieder.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Email</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Name</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Plan</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Kostenlos bis</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Rabatt</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foundingMembers.map((member) => (
                        <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{member.email}</td>
                          <td className="px-4 py-3 text-slate-600">{member.name}</td>
                          <td className="px-4 py-3 text-slate-600">{member.planKey}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {member.foundingMemberFreeUntil
                              ? new Date(member.foundingMemberFreeUntil).toLocaleDateString("de-DE")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-700">{member.lifetimeDiscountPercent}%</td>
                          <td className="px-4 py-3">
                            {member.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded">
                                <Check size={12} /> Aktiv
                              </span>
                            ) : (
                              <span className="text-slate-500">Abgelaufen</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lifetime Access Tab */}
        {activeTab === "lifetime-access" && (
          <div className="space-y-6">
            {/* Add Single User */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer mit Lebenszugriff hinzufügen</p>
              <div className="flex items-end gap-2">
                <div className="flex-grow">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">User-ID</label>
                  <input
                    type="number"
                    value={addSingleUserId}
                    onChange={(e) => setAddSingleUserId(e.target.value)}
                    placeholder="User ID eingeben"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  />
                </div>
                <div className="min-w-[220px]">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600 mb-1">Abo-Plan</label>
                  <select
                    value={lifetimePlanKey}
                    onChange={(e) => setLifetimePlanKey(e.target.value as "auto" | "experte_abo" | "experte_pro" | "nutzer_plus")}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="auto">Automatisch nach Rolle</option>
                    <option value="experte_abo">Experten Abo</option>
                    <option value="experte_pro">Experten Premium Abo</option>
                    <option value="nutzer_plus">Nutzer Plus Abo</option>
                  </select>
                </div>
                <button
                  onClick={grantLifetimeAccessToSingleUser}
                  disabled={singleUserActionBusy}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black uppercase text-[10px] disabled:opacity-60 inline-flex items-center gap-1"
                >
                  <Plus size={14} /> Gewähren
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Tipp: Für Experten kann hier direkt das Premium-Abo gewählt werden.
              </p>
            </div>

            {/* List */}
            {lifetimeAccessLoading ? (
              <p className="text-sm text-slate-500">Wird geladen...</p>
            ) : lifetimeAccessUsers.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Nutzer mit Lebenszugriff.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Email</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Name</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Plan</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Status</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Gewährt am</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lifetimeAccessUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{user.email}</td>
                          <td className="px-4 py-3 text-slate-600">{user.name}</td>
                          <td className="px-4 py-3 text-slate-600">{user.planKey}</td>
                          <td className="px-4 py-3 text-slate-600">{user.status}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(user.grantedAt).toLocaleDateString("de-DE")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions Tab */}
        {activeTab === "bulk-actions" && (
          <div className="space-y-6">
            {/* Search & Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nutzer suchen & filtern</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  placeholder="Email oder Name"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                />
                <select
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="all">Alle</option>
                  <option value="experte">Experte</option>
                  <option value="nutzer">Nutzer</option>
                </select>
                <button
                  onClick={() => loadBulkUsers(adminCode)}
                  disabled={bulkUsersLoading}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] disabled:opacity-60"
                >
                  {bulkUsersLoading ? "Lädt..." : "Suchen"}
                </button>
              </div>
            </div>

            {/* Bulk Actions Controls */}
            {bulkUsers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-slate-700">
                    <strong>{selectedUserIds.length}</strong> von <strong>{bulkUsers.length}</strong> ausgewählt
                  </p>
                  <button
                    onClick={() => {
                      if (selectedUserIds.length === bulkUsers.length) {
                        setSelectedUserIds([]);
                      } else {
                        setSelectedUserIds(bulkUsers.map((u) => u.id));
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase text-slate-700 border border-slate-200"
                  >
                    {selectedUserIds.length === bulkUsers.length ? "Alle abwählen" : "Alle wählen"}
                  </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-bold"
                  >
                    <option value="">— Aktion wählen —</option>
                    <option value="founding">Als Gründungsmitglied markieren</option>
                    <option value="lifetime">Lebenszugriff gewähren</option>
                  </select>

                  {bulkAction === "lifetime" && (
                    <select
                      value={bulkLifetimePlanKey}
                      onChange={(e) => setBulkLifetimePlanKey(e.target.value as "auto" | "experte_abo" | "experte_pro" | "nutzer_plus")}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-bold"
                    >
                      <option value="auto">Plan: Automatisch nach Rolle</option>
                      <option value="experte_abo">Plan: Experten Abo</option>
                      <option value="experte_pro">Plan: Experten Premium Abo</option>
                      <option value="nutzer_plus">Plan: Nutzer Plus Abo</option>
                    </select>
                  )}

                  <button
                    onClick={() => {
                      if (bulkAction === "founding") revokeFoundingMemberMultiple();
                      else if (bulkAction === "lifetime") grantLifetimeAccessMultiple();
                    }}
                    disabled={bulkActionBusy || !bulkAction || selectedUserIds.length === 0}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] disabled:opacity-60"
                  >
                    {bulkActionBusy ? "Lädt..." : "Aktion eintragen"}
                  </button>
                </div>
              </div>
            )}

            {/* Users List */}
            {bulkUsersLoading ? (
              <p className="text-sm text-slate-500">Wird geladen...</p>
            ) : bulkUsers.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Nutzer gefunden. Suche durchführen.</p>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.length === bulkUsers.length && bulkUsers.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds(bulkUsers.map((u) => u.id));
                              } else {
                                setSelectedUserIds([]);
                              }
                            }}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Email</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Name</th>
                        <th className="px-4 py-2 font-black uppercase tracking-widest text-slate-600">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={() => {
                                setSelectedUserIds((prev) =>
                                  prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                                );
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-700">{user.email}</td>
                          <td className="px-4 py-3 text-slate-600">{user.display_name}</td>
                          <td className="px-4 py-3 text-slate-600">{user.plan_key}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
