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
  searchContent?: React.ReactNode;
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
  brandText = 'Equily',
  searchContent,
}: LoggedInHeaderProps) {
  const initial = String(userName || 'P').trim().charAt(0).toUpperCase() || 'P';

  const openProfile = () => {
    if (onOpenProfile) {
      onOpenProfile();
      return;
    }
    window.location.href = resolveProfileHref(userId, role);
  };

  return (
    <header className="bg-white border-b px-4 md:px-8 py-4 md:py-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onOpenSidebar} className="text-2xl">☰</button>
          <div className="flex flex-col">
            <span className="font-black text-emerald-600 text-xl italic uppercase leading-none">{brandText}</span>
          </div>
        </div>

        <div className="flex-1 max-w-4xl mx-auto hidden md:flex items-center gap-2">
          {searchContent || null}
        </div>

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
      </div>

      {searchContent ? (
        <div className="mt-3 flex flex-col gap-2 md:hidden">
          {searchContent}
        </div>
      ) : null}
    </header>
  );
}
