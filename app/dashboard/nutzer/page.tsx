"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoggedInHeader from '../../components/logged-in-header';

export default function NutzerDashboardStart() {
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canCloseSidebar, setCanCloseSidebar] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const role = sessionStorage.getItem('userRole');
    const userIdRaw = sessionStorage.getItem('userId');
    if (!role || role !== 'nutzer') {
      window.location.href = '/';
      return;
    }
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId)) {
      setUserId(parsedUserId);
    }
    setUserName(sessionStorage.getItem('userName') || 'Reiter');
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = '/login';
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => {
          if (!canCloseSidebar) return;
          closeSidebar();
        }}
      />
      <aside className={`fixed left-0 top-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-8 flex flex-col`}>
        <div className="flex justify-between items-center mb-10 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={closeSidebar} className="text-slate-300 text-2xl">×</button></div>
        <nav className="space-y-6 flex-grow">
          <Link href="/" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</Link>
          <Link href="/suche" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</Link>
          <Link href="/dashboard/nutzer/profil" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</Link>
          <Link href="/merkliste" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</Link>
          <Link href="/nachrichten" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</Link>
          <Link href="/einstellungen" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</Link>
          <Link href="/kontakt" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</Link>
          <div className="h-px bg-slate-100 my-4" />
          <button onClick={handleLogout} className="w-full text-left text-xl font-black italic uppercase text-red-400 hover:text-red-600">Abmelden ➔</button>
        </nav>
      </aside>

      <LoggedInHeader
        userId={userId}
        role="nutzer"
        userName={userName}
        onOpenSidebar={openSidebar}
        onOpenProfile={openProfile}
        brandText="EquiConnect"
      />

      <main className="p-12 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Nutzer-Dashboard</h1>
            <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-widest">Verwalte hier deine Gesuche und Anfragen.</p>
          </div>
          <Link href="/inserieren" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase italic text-xs shadow-lg hover:scale-105 transition-all">
            + Neue Anzeige
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["Reitunterricht", "Beritt", "Therapeuten Reiter", "Therapeuten Pferde", "Hufbearbeitung"].map((kat) => (
            <button 
              key={kat} 
              onClick={() => router.push(`/suche?kategorie=${encodeURIComponent(kat)}`)}
              className="p-6 bg-white rounded-3xl border border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all font-black text-[9px] uppercase text-slate-400 hover:text-emerald-600 text-center"
            >
              {kat}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}