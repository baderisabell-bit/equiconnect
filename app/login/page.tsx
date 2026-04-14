"use client";

import React, { useState } from 'react';
import { loginUser } from '../actions';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await loginUser({ email, password });
      
      if (res.success && res.user) {
        // 1. Daten speichern
        sessionStorage.setItem('userId', res.user.id.toString());
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userName', res.user.name);
        sessionStorage.setItem('userRole', String(res.user.role || '').trim().toLowerCase());
        if (String(res.user.role || '').trim().toLowerCase() === 'experte') {
          sessionStorage.setItem('equiconnect-founding-info-pending', '1');
        }

        // 2. Nach Login immer auf die Startseite
        window.location.href = '/';
      } else {
        setError(res.error || "Login fehlgeschlagen");
      }
    } catch (err) {
      setError("Verbindung zum Server fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6 py-12 relative font-sans">
      
      {/* ZURÜCK BUTTON */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors font-bold text-xs uppercase tracking-widest"
      >
        <span className="text-lg">←</span> Zur Startseite
      </Link>

      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-emerald-600 italic tracking-tighter uppercase">EQUIPRO</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Willkommen zurück</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold uppercase text-center border border-red-100">
              {error}
            </div>
          )}

          <input 
            type="email" 
            placeholder="E-Mail" 
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 font-bold" 
          />
          <input 
            type="password" 
            placeholder="Passwort" 
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 font-bold" 
          />

          <div className="text-right">
            <Link href="/passwort-vergessen" className="text-[11px] font-bold text-slate-500 hover:text-emerald-600">
              Passwort vergessen?
            </Link>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg uppercase italic"
          >
            {loading ? 'Prüfe...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100">
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Noch kein Mitglied?</p>
          
          <div className="grid grid-cols-1 gap-3">
            <Link href="/registrieren/experte" className="group flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100 hover:bg-emerald-600 transition-all">
              <span className="text-emerald-700 font-bold text-xs group-hover:text-white transition-colors uppercase italic">➔ Als Profi starten</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Profi</span>
            </Link>

            <Link href="/registrieren/nutzer" className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-900 transition-all">
              <span className="text-slate-500 font-bold text-xs group-hover:text-white transition-colors uppercase italic">➔ Als Nutzer starten</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">Nutzer</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}