"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { getVerificationProfiles, updateVerificationStatus } from "../../actions";

type VerificationProfile = {
  user_id: number;
  role: string;
  vorname: string;
  nachname: string;
  email: string;
  verifiziert: boolean;
  display_name: string | null;
  zertifikate: string[] | null;
  profil_data: any;
  updated_at: string;
};

export default function AdminVerifizierungPage() {
  const [adminCode, setAdminCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [items, setItems] = useState<VerificationProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [accountVerified, setAccountVerified] = useState(false);
  const [verifiedCertificates, setVerifiedCertificates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedCode = sessionStorage.getItem("adminPanelCode") || "";
    if (!storedCode) {
      setLoading(false);
      return;
    }

    setAdminCode(storedCode);

    const autoLogin = async () => {
      const res = await getVerificationProfiles(storedCode);
      if (res.success && Array.isArray(res.items)) {
        setAuthorized(true);
        setItems(res.items as VerificationProfile[]);
        if (res.items.length > 0) {
          const first = res.items[0] as VerificationProfile;
          setActiveUserId(first.user_id);
        }
      } else {
        sessionStorage.removeItem("adminPanelCode");
      }
      setLoading(false);
    };

    autoLogin();
  }, []);

  const handleAuthorize = async () => {
    setLoading(true);
    setAuthError("");
    const res = await getVerificationProfiles(adminCode);
    if (!res.success) {
      setLoading(false);
      setAuthorized(false);
      setAuthError(res.error || "Code ungültig.");
      return;
    }

    setAuthorized(true);
    setItems((res.items || []) as VerificationProfile[]);
    if (Array.isArray(res.items) && res.items.length > 0) {
      const first = res.items[0] as VerificationProfile;
      setActiveUserId(first.user_id);
    }
    sessionStorage.setItem("adminPanelCode", adminCode);
    setLoading(false);
  };

  const activeItem = useMemo(
    () => items.find((item) => item.user_id === activeUserId) || null,
    [items, activeUserId]
  );

  useEffect(() => {
    if (!activeItem) return;
    setAccountVerified(Boolean(activeItem.verifiziert));

    const fromProfileData = Array.isArray(activeItem.profil_data?.verifizierteZertifikate)
      ? activeItem.profil_data.verifizierteZertifikate
      : [];
    setVerifiedCertificates(fromProfileData);
  }, [activeItem]);

  const certificates = useMemo(() => {
    if (!activeItem || !Array.isArray(activeItem.zertifikate)) return [];
    return activeItem.zertifikate;
  }, [activeItem]);

  const toggleCertificate = (value: string) => {
    setVerifiedCertificates((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const saveVerification = async () => {
    if (!activeItem) return;
    setSaving(true);
    const res = await updateVerificationStatus({
      adminCode,
      userId: activeItem.user_id,
      accountVerified,
      verifiedCertificates,
    });
    setSaving(false);

    if (!res.success) {
      alert(res.error || "Konnte nicht gespeichert werden.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.user_id === activeItem.user_id
          ? {
              ...item,
              verifiziert: accountVerified,
              profil_data: {
                ...(item.profil_data || {}),
                verifizierteZertifikate: verifiedCertificates,
              },
            }
          : item
      )
    );

    alert("Verifizierungsstatus gespeichert.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade Verifizierungen...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans text-slate-900">
        <div className="max-w-xl mx-auto bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-black uppercase italic text-slate-900">Admin Verifizierung</h1>
          <p className="text-sm font-bold text-slate-500">Bitte Admin-Code eingeben.</p>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300">
              Admin-Zentrale
            </Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">
              Verifizierung
            </Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Kontakt-Tickets
            </Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Moderation
            </Link>
          </div>

          <input
            type="password"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            placeholder="Admin-Code"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-300"
          />

          {authError && <p className="text-sm font-bold text-red-500">{authError}</p>}

          <button
            type="button"
            onClick={handleAuthorize}
            className="w-full px-6 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500"
          >
            Zugriff prüfen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-black uppercase italic text-slate-900">Admin Verifizierung</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
            Ausweisstatus und Zertifikat-Badges pro Nutzer setzen
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300">
              Admin-Zentrale
            </Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">
              Verifizierung
            </Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Kontakt-Tickets
            </Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Moderation
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
          <aside className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-5 h-fit max-h-[75vh] overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 mb-3">Profile</p>
            <div className="space-y-2">
              {items.map((item) => {
                const isActive = item.user_id === activeUserId;
                const label = item.display_name || `${item.vorname || ""} ${item.nachname || ""}`.trim() || `User ${item.user_id}`;
                return (
                  <button
                    type="button"
                    key={item.user_id}
                    onClick={() => setActiveUserId(item.user_id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isActive ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100 hover:border-emerald-100"
                    }`}
                  >
                    <p className="text-sm font-black uppercase italic text-slate-900 truncate">{label}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{item.role} • #{item.user_id}</p>
                    <p className="text-[10px] font-bold text-slate-500 truncate mt-1">{item.email}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 space-y-8">
            {!activeItem ? (
              <p className="text-sm font-bold text-slate-400">Kein Profil ausgewählt.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-slate-900">
                      {activeItem.display_name || `${activeItem.vorname || ""} ${activeItem.nachname || ""}`.trim() || `User ${activeItem.user_id}`}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      {activeItem.role} • {activeItem.email}
                    </p>
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${accountVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {accountVerified ? "Ausweis verifiziert" : "Ausweis in Prüfung"}
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 space-y-4">
                  <label className="inline-flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={accountVerified}
                      onChange={(e) => setAccountVerified(e.target.checked)}
                      className="w-5 h-5 accent-emerald-600"
                    />
                    <span className="text-sm font-black uppercase tracking-widest text-slate-700 inline-flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" /> Ausweis-Verifizierung freigeben
                    </span>
                  </label>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Zertifikat-Badges</h3>
                  {certificates.length === 0 ? (
                    <p className="text-sm font-bold text-slate-400">Keine Zertifikate im Profil gefunden.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {certificates.map((cert) => {
                        const active = verifiedCertificates.includes(cert);
                        return (
                          <button
                            type="button"
                            key={cert}
                            onClick={() => toggleCertificate(cert)}
                            className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${
                              active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-white text-slate-500 border-slate-200"
                            }`}
                          >
                            <CheckCircle2 size={14} className={active ? "text-emerald-600" : "text-slate-300"} />
                            {cert}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={saveVerification}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {saving ? "Speichert..." : "Verifizierung speichern"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
