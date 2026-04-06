"use client";

import React from 'react';
import NotificationBell from './notification-bell';

type LoggedInHeaderProps = {
  userId: number | null;
  role: string | null;
  userName: string;
  onOpenSidebar: () => void;
  onOpenProfile?: () => void;
  brandText?: string;
};

function resolveProfileHref(userId: number | null, role: string | null) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (Number.isInteger(userId) && Number(userId) > 0) {
    return `/profil/${Number(userId)}`;
  }

  if (normalizedRole === 'nutzer' || normalizedRole === 'user' || normalizedRole === 'kunde') {
    return '/dashboard/nutzer/profil';
  }

  return '/login';
}

export default function LoggedInHeader({
  userId,
  role,
  userName,
  onOpenSidebar,
  onOpenProfile,
  brandText = 'EquiConnect'
}: LoggedInHeaderProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const initial = String(userName || 'P').trim().charAt(0).toUpperCase() || 'P';

  const openProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }
    window.location.href = resolveProfileHref(userId, role);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      window.location.href = '/suche';
      return;
    }
    window.location.href = `/suche?q=${encodeURIComponent(query)}`;
  };

  return (
    <header className="bg-white border-b px-8 py-5 flex items-center gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={onOpenSidebar} className="text-2xl">☰</button>
        <div className="flex flex-col">
          <span className="font-black text-emerald-600 text-xl italic uppercase leading-none">{brandText}</span>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-auto hidden md:flex items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Spezialisierung oder Ort suchen..."
          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-emerald-300 text-sm font-bold"
        />
        <button
          type="submit"
          className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500"
        >
          Suchen
        </button>
      </form>

      <div className="flex items-center gap-3 ml-auto">
        <NotificationBell userId={userId} />
        {role && (
          <button
            type="button"
            onClick={openProfile}
            aria-label="Profil öffnen"
            className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-black border-2 border-emerald-500 hover:scale-105 transition-transform"
          >
            {initial}
          </button>
        )}
      </div>
    </header>
  );
}
