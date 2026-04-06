"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { validatePasswordResetToken, resetPasswordWithToken } from '../actions';

export default function PasswortZuruecksetzenPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setChecking(false);
      return;
    }

    const checkToken = async () => {
      setChecking(true);
      const res = await validatePasswordResetToken(token);
      setTokenValid(Boolean(res.success && res.valid));
      setChecking(false);
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const res = await resetPasswordWithToken({ token, password, confirmPassword });

    if (!res.success) {
      setError(res.error || 'Passwort konnte nicht aktualisiert werden.');
      setLoading(false);
      return;
    }

    setSuccess('Passwort erfolgreich geändert. Du wirst zum Login weitergeleitet.');
    setTimeout(() => router.push('/login'), 1400);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <h1 className="text-2xl font-black text-slate-800 mb-4 italic text-center uppercase">
          Neues Passwort setzen
        </h1>

        {checking ? (
          <p className="text-center text-sm text-slate-500">Link wird geprüft...</p>
        ) : !tokenValid ? (
          <>
            <p className="text-center text-sm text-red-600 mb-6">
              Der Link ist ungültig oder abgelaufen.
            </p>
            <Link
              href="/passwort-vergessen"
              className="block w-full text-center bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-emerald-600 transition-all"
            >
              Neuen Link anfordern
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[11px] font-bold text-center border border-emerald-100">
                {success}
              </div>
            )}

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Neues Passwort"
              className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 font-bold"
            />

            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort bestätigen"
              className="w-full p-5 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700 font-bold"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black hover:bg-emerald-600 transition-all shadow-lg uppercase italic"
            >
              {loading ? 'Speichere...' : 'Passwort speichern'}
            </button>
          </form>
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
