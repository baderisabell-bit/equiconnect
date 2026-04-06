'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Plus, X, TrendingUp } from 'lucide-react';
import { adminGrantEarlyAccess, adminRevokeEarlyAccess, getEarlyAccessAnalytics } from '../../actions';

export default function AdminEarlyAccessPage() {
  const router = useRouter();
  const [adminCode, setAdminCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Grant form
  const [grantUserId, setGrantUserId] = useState('');
  const [grantHours, setGrantHours] = useState('24');
  const [grantMessage, setGrantMessage] = useState('');
  const [grantError, setGrantError] = useState('');

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsError, setAnalyticsError] = useState('');

  const handleAuthenticate = () => {
    if (!adminCode.trim()) {
      setAnalyticsError('Bitte Admin-Code eingeben.');
      return;
    }
    setIsAuthenticated(true);
    loadAnalytics();
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getEarlyAccessAnalytics(adminCode);
      if (res.success) {
        setAnalytics(res.data);
        setAnalyticsError('');
      } else {
        setAnalyticsError(res.error || 'Analysen konnten nicht geladen werden.');
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      setAnalyticsError('Fehler beim Laden der Analysen.');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantEarlyAccess = async () => {
    try {
      if (!grantUserId.trim()) {
        setGrantError('Bitte Nutzer-ID eingeben.');
        return;
      }

      setLoading(true);
      const res = await adminGrantEarlyAccess({
        adminCode,
        userId: parseInt(grantUserId, 10),
        hoursToAdd: parseInt(grantHours, 10) || 24,
      });

      if (res.success) {
        setGrantMessage(res.message || 'Frühzugriff gewährt.');
        setGrantUserId('');
        setGrantError('');
        setTimeout(() => setGrantMessage(''), 3000);
        loadAnalytics();
      } else {
        setGrantError(res.error || 'Fehler beim Gewähren.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeEarlyAccess = async (userId: number) => {
    try {
      if (!window.confirm(`Frühzugriff für Nutzer ${userId} widerrufen?`)) return;

      setLoading(true);
      const res = await adminRevokeEarlyAccess({
        adminCode,
        userId,
      });

      if (res.success) {
        setGrantMessage(res.message || 'Frühzugriff widerrufen.');
        setTimeout(() => setGrantMessage(''), 3000);
        loadAnalytics();
      } else {
        setGrantError(res.error || 'Fehler beim Widerrufen.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Lock size={24} className="text-slate-900" />
            <h1 className="text-2xl font-black italic uppercase text-slate-900">Admin Panel</h1>
          </div>

          <p className="text-sm text-slate-600 mb-6">24h Frühzugriff Verwaltung</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-2">Admin-Code</label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Gib den Admin-Code ein"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none bg-white"
              />
            </div>

            {analyticsError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-black uppercase text-red-700">{analyticsError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black uppercase"
            >
              Zur Admin-Zentrale
            </button>

            <button
              type="button"
              onClick={handleAuthenticate}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Wird geladen...' : 'Authentifizieren'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black italic uppercase text-slate-900">Frühzugriff Verwaltung</h1>
            <p className="text-sm text-slate-600 mt-1">24-Stunden-Zugriff auf neue Angebote</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-1.5 text-xs font-black uppercase border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Abmelden
          </button>
        </div>

        {/* Grant Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
            <Plus size={16} /> Frühzugriff gewähren
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-2">Nutzer-ID</label>
              <input
                type="number"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                placeholder="z.B. 123"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-2">Stunden</label>
              <input
                type="number"
                value={grantHours}
                onChange={(e) => setGrantHours(e.target.value)}
                min="1"
                max="720"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGrantEarlyAccess}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Wird verarbeitet...' : 'Gewähren'}
              </button>
            </div>
          </div>

          {grantError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <X size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">{grantError}</p>
            </div>
          )}

          {grantMessage && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs font-semibold text-emerald-700">{grantMessage}</p>
            </div>
          )}
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-black uppercase text-slate-500 mb-1 flex items-center gap-2">
                  <TrendingUp size={14} /> Aktiv
                </p>
                <p className="text-3xl font-black text-slate-900">{analytics.totalActiveEarlyAccess || 0}</p>
              </div>

              {(analytics.byPlan || []).map((plan: any) => (
                <div key={plan.plan_key} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <p className="text-xs font-black uppercase text-slate-500 mb-1">{plan.plan_key}</p>
                  <p className="text-2xl font-black text-emerald-600">{plan.active_early_access || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">von {plan.total_users || 0}</p>
                </div>
              ))}
            </div>

            {analytics.soonestExpiries && analytics.soonestExpiries.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">
                  Nächste Abläufe
                </h3>

                <div className="space-y-2">
                  {analytics.soonestExpiries.map((item: any) => {
                    const expiresAt = new Date(item.early_access_granted_until);
                    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)));
                    return (
                      <div key={item.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-xs font-black uppercase text-slate-900">
                            Nutzer {item.user_id}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.plan_key} • {hoursLeft}h verbleibend
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeEarlyAccess(item.user_id)}
                          className="px-3 py-1.5 text-xs font-black uppercase border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                        >
                          Widerrufen
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
