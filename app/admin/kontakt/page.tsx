"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { getContactMessages } from "../../actions";

type ContactMessage = {
  id: number;
  ticket_code: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  send_status: string;
  send_error: string | null;
  created_at: string;
  sent_at: string | null;
};

export default function AdminKontaktPage() {
  const [adminCode, setAdminCode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    const storedCode = sessionStorage.getItem("adminPanelCode") || "";
    if (!storedCode) {
      setLoading(false);
      return;
    }

    setAdminCode(storedCode);

    const autoLogin = async () => {
      const res = await getContactMessages(storedCode);
      if (res.success && Array.isArray(res.items)) {
        setAuthorized(true);
        setItems(res.items as ContactMessage[]);
        if (res.items.length > 0) {
          const first = res.items[0] as ContactMessage;
          setActiveId(first.id);
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

    const res = await getContactMessages(adminCode);
    if (!res.success) {
      setAuthorized(false);
      setAuthError(res.error || "Code ungültig.");
      setLoading(false);
      return;
    }

    setAuthorized(true);
    setItems((res.items || []) as ContactMessage[]);
    if (Array.isArray(res.items) && res.items.length > 0) {
      const first = res.items[0] as ContactMessage;
      setActiveId(first.id);
    }
    sessionStorage.setItem("adminPanelCode", adminCode);
    setLoading(false);
  };

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId]
  );

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("de-DE");
  };

  const statusBadgeClass = (status: string) => {
    if (status === "sent") return "bg-emerald-100 text-emerald-700";
    if (status === "failed") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-10">
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Lade Kontakt-Tickets...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 md:p-12 font-sans text-slate-900">
        <div className="max-w-xl mx-auto bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 space-y-6">
          <h1 className="text-2xl font-black uppercase italic text-slate-900">Admin Kontakt & FAQ</h1>
          <p className="text-sm font-bold text-slate-500">Bitte Admin-Code eingeben.</p>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300">
              Admin-Zentrale
            </Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Verifizierung
            </Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">
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
          <h1 className="text-3xl font-black uppercase italic text-slate-900">Admin Kontakt-Tickets</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
            Eingegangene Kontaktanfragen mit Versandstatus
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300">
              Admin-Zentrale
            </Link>
            <Link href="/admin/verifizierung" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Verifizierung
            </Link>
            <Link href="/admin/kontakt" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white">
              Kontakt-Tickets
            </Link>
            <Link href="/admin/moderation" className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:border-emerald-300">
              Moderation
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
          <aside className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 md:p-5 h-fit max-h-[75vh] overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 mb-3">Tickets</p>
            <div className="space-y-2">
              {items.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isActive ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-100 hover:border-emerald-100"
                    }`}
                  >
                    <p className="text-sm font-black uppercase italic text-slate-900 truncate">
                      {item.ticket_code || `Ticket #${item.id}`}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 truncate">
                      {item.subject}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-slate-500 truncate">{item.email}</p>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${statusBadgeClass(item.send_status)}`}>
                        {item.send_status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
            {!activeItem ? (
              <p className="text-sm font-bold text-slate-400">Keine Tickets vorhanden.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-slate-900">
                      {activeItem.ticket_code || `Ticket #${activeItem.id}`}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      {activeItem.subject}
                    </p>
                  </div>
                  <span className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${statusBadgeClass(activeItem.send_status)}`}>
                    {activeItem.send_status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Absender</p>
                    <p className="mt-2 text-sm font-black text-slate-800">{activeItem.name}</p>
                    <p className="mt-1 text-sm font-bold text-slate-600 inline-flex items-center gap-2">
                      <Mail size={14} /> {activeItem.email}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zeitpunkte</p>
                    <p className="text-sm font-bold text-slate-700 inline-flex items-center gap-2">
                      <Clock3 size={14} /> Eingang: {formatDate(activeItem.created_at)}
                    </p>
                    <p className="text-sm font-bold text-slate-700 inline-flex items-center gap-2">
                      <CheckCircle2 size={14} /> Versand: {formatDate(activeItem.sent_at)}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-100 bg-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Nachricht</p>
                  <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{activeItem.message}</p>
                </div>

                {activeItem.send_error && (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1 inline-flex items-center gap-2">
                      <AlertCircle size={14} /> Versandfehler
                    </p>
                    <p className="text-sm font-bold text-red-700">{activeItem.send_error}</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
