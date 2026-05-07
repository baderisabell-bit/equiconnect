"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoggedInHeader from '../../components/logged-in-header';

export default function NutzerDashboardStart() {
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {sidebarOpen && (
        <>
          <button type="button" aria-label="Menü schließen" onClick={closeSidebar} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" />
          <aside className="fixed left-0 top-0 z-[70] h-full w-72 bg-white shadow-2xl transition-transform duration-300 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">
              MENÜ
              <button onClick={closeSidebar} className="text-slate-300 text-xl leading-none">×</button>
            </div>
            <nav className="space-y-5 flex-grow">
              <Link href="/" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</Link>
              <Link href="/dashboard/nutzer" className="block text-left text-lg font-black italic uppercase text-emerald-600">Dashboard</Link>
              <button type="button" onClick={openProfile} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
              <Link href="/suche" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</Link>
              <Link href="/netzwerk" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</Link>
              <Link href="/nachrichten" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</Link>
              <Link href="/merkliste" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</Link>
              <Link href="/einstellungen" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</Link>
              <Link href="/kontakt" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</Link>
            </nav>
            <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
          </aside>
        </>
      )}

      <LoggedInHeader
        userId={userId}
        role="nutzer"
        userName={userName}
        onOpenSidebar={openSidebar}
        onOpenProfile={openProfile}
        brandText="Equily"
      />

      <main className="p-12 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-black italic uppercase text-slate-900 leading-none">Dashboard</h1>
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