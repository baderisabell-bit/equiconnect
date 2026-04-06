"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResolvedUserRole, submitKontaktForm } from '../actions';
import LoggedInHeader from '../components/logged-in-header';

export default function KontaktUndFaqPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canCloseSidebar, setCanCloseSidebar] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('Profil');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [betreff, setBetreff] = useState('');
  const [nachricht, setNachricht] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketCode, setTicketCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const currentRole = sessionStorage.getItem('userRole');
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    setRole(currentRole);
    setUserName(sessionStorage.getItem('userName') || (currentRole === 'experte' ? 'Experte' : 'Nutzer'));
    if (!Number.isNaN(parsedId) && parsedId > 0) {
      setUserId(parsedId);
      getResolvedUserRole(parsedId).then((roleRes) => {
        if (roleRes.success && roleRes.role) {
          setRole(roleRes.role);
          sessionStorage.setItem('userRole', roleRes.role);
        }
      }).catch(() => {
        // Keep the session role when resolving fails.
      });
    }
  }, []);

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = '/login';
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  const openSidebar = () => {
    setSidebarOpen(true);
    setCanCloseSidebar(false);
    window.setTimeout(() => {
      setCanCloseSidebar(true);
    }, 180);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setCanCloseSidebar(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(false);
    setTicketCode('');
    setError('');
    setSending(true);

    const res = await submitKontaktForm({
      name,
      email,
      subject: betreff,
      message: nachricht,
      website
    });

    setSending(false);

    if (!res.success) {
      setError(res.error || 'E-Mail konnte nicht versendet werden.');
      return;
    }

    setSubmitted(true);
    setTicketCode(res.ticketCode || '');
    setName('');
    setEmail('');
    setBetreff('');
    setNachricht('');
    setWebsite('');
  };

  const normalizedRole = String(role || '').trim().toLowerCase();
  const isExpertRole = normalizedRole === 'experte';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => {
          if (!canCloseSidebar) return;
          closeSidebar();
        }}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={closeSidebar} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          {role && <button type="button" onClick={() => { closeSidebar(); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>}
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/dashboard/rechnungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Rechnungen</button>
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/suche'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/netzwerk'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>}
          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>}

          {role && <button type="button" onClick={() => { closeSidebar(); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>}
          <button type="button" onClick={() => { closeSidebar(); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Kontakt & FAQ</button>
        </nav>
        {role && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName}
        onOpenSidebar={openSidebar}
        onOpenProfile={openProfile}
      />
          
      <main className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <section className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kontakt & FAQ</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Schreib uns eine Nachricht</h1>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Hier kannst du uns direkt per E-Mail kontaktieren. Die FAQ-Bereiche ergänzen wir als nächstes.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dein Name"
                required
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Deine E-Mail"
                required
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
              />
            </div>

            <input
              type="text"
              value={betreff}
              onChange={(e) => setBetreff(e.target.value)}
              placeholder="Betreff"
              required
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />

            <textarea
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              placeholder="Deine Nachricht"
              required
              rows={8}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-emerald-300 resize-none"
            />

            <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
              <label htmlFor="kontakt-website">Website</label>
              <input
                id="kontakt-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full md:w-auto px-8 py-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500"
            >
              {sending ? 'Wird gesendet...' : 'Nachricht senden'}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-red-600">
              {error}
            </p>
          )}

          {submitted && (
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-emerald-700">
              Danke, deine Nachricht wurde versendet{ticketCode ? ` (Ticket: ${ticketCode})` : ''}. Wir melden uns in der Regel innerhalb von 24 Stunden.
            </p>
          )}
        </section>

        <aside className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">FAQ (demnächst)</h2>
          <div className="mt-4 space-y-3">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-700">Wie erstelle ich ein Profil?</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Wird in der FAQ-Sektion bald ergänzt.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-700">Wie läuft die Verifizierung ab?</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Wird in der FAQ-Sektion bald ergänzt.</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-700">Wie kontaktiere ich Support?</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Nutze aktuell einfach das Kontaktformular links.</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
