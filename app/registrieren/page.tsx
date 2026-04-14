"use client";

import React from 'react';
import Link from 'next/link';

export default function RegistrierungAuswahl() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
      {/* Logo Bereich */}
      <div className="mb-10 text-center">
        <Link href="/" className="font-bold text-emerald-700 text-2xl italic">Equily</Link>
        <h1 className="text-lg text-gray-600 mt-2 font-medium">Wie möchtest du starten?</h1>
      </div>

      <div className="max-w-3xl w-full grid md:grid-cols-2 gap-6">
        
        {/* KARTE 1: DER NUTZER (Reiter) */}
        <div className="group bg-white p-6 rounded-[2rem] shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all h-full flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[11px] font-bold uppercase tracking-widest mb-5 group-hover:scale-110 transition-transform">
            Nutzer
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Ich suche Hilfe</h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Finde erstklassige Reitlehrer, Bereiter oder Therapeuten in deiner Nähe. Verwalte deine Termine und merke dir deine Favoriten.
          </p>
          <ul className="text-[13px] text-gray-400 space-y-1.5 mb-6 text-left w-full">
            <li className="flex items-center gap-2">- Eigene Profilseite</li>
            <li className="flex items-center gap-2">- Experten-Vergleich</li>
            <li className="flex items-center gap-2">- Termin-Anfragen</li>
          </ul>
          
          {/* NUR HIER IST DER LINK */}
          <Link href="/registrieren/nutzer" className="w-full mt-auto">
            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-100">
              Als Nutzer registrieren
            </button>
          </Link>
        </div>

        {/* KARTE 2: DER ANBIETER (Profi) */}
        <div className="group bg-white p-6 rounded-[2rem] shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all h-full flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Gewerblich
          </div>

          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-[11px] font-bold uppercase tracking-widest mb-5 group-hover:scale-110 transition-transform">
            Experte
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Ich biete Leistung</h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Präsentiere dein Gewerbe als Profi-Anbieter. Gewinne neue Kunden, verwalte dein Angebot und zeige deine Qualifikationen.
          </p>
          <ul className="text-[13px] text-gray-400 space-y-1.5 mb-6 text-left w-full">
            <li className="flex items-center gap-2">- Eigene Profilseite</li>
            <li className="flex items-center gap-2">- Marketing</li>
            <li className="flex items-center gap-2">- Verifizierung</li>
          </ul>

          {/* LINK FÜR PROFI */}
          <Link href="/registrieren/experte" className="w-full mt-auto">
            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-100">
              Als Experte registrieren
            </button>
          </Link>
        </div>

      </div>

      <p className="mt-10 text-gray-400 text-[13px]">
        Hast du schon ein Konto? <Link href="/login" className="text-emerald-600 font-bold hover:underline">Hier einloggen</Link>
      </p>
    </div>
  );
}