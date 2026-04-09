"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../actions';

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setDevHint('');
    setDevResetUrl('');

    const res = await requestPasswordReset(email);
    if (!res.success) {
      setError(res.error || 'Anfrage konnte nicht gesendet werden.');
      setLoading(false);
      return;
    }

    setMessage(res.message || 'Wenn ein Konto existiert, wurde ein Link erstellt.');
    if (res.devResetUrl) {
      setDevHint('Lokaler Testmodus: SMTP nicht erreichbar. Test-Link:');
      setDevResetUrl(res.devResetUrl);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 mb-4 italic text-center uppercase">
          Passwort wiederherstellen
        </h1>

        <p className="text-slate-500 text-center text-sm mb-6">
          Gib deine E-Mail ein. Du erhältst einen Link zum Zurücksetzen deines Passworts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold text-center border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[11px] font-bold text-center border border-emerald-100">
              {message}
            </div>
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail"
            className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 font-bold"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg uppercase italic"
          >
            {loading ? 'Sende...' : 'Reset-Link anfordern'}
          </button>
        </form>

        {devHint && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-center">
            <p className="text-[11px] text-amber-700 font-bold mb-1">{devHint}</p>
            {devResetUrl && (
              <a
                href={devResetUrl}
                className="text-[11px] text-blue-600 underline break-all"
              >
                {devResetUrl}
              </a>
            )}
          </div>
        )}

        <Link
          href="/login"
          className="mt-8 block w-full text-center text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-emerald-600"
        >
          Zurück zum Login
        </Link>
      </div>
    </div>
  );
}