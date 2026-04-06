"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminLogin } from "../../actions";

function AdminLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/admin";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    const res = await adminLogin(password);
    setBusy(false);

    if (!res.success) {
      setError(res.error || "Anmeldung fehlgeschlagen.");
      return;
    }

    sessionStorage.setItem("adminPanelCode", password.trim());
    router.push(nextPath);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-5 mt-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Admin-Bereich</p>
          <h1 className="mt-2 text-2xl font-black italic uppercase text-slate-900">Passwort eingeben</h1>
          <p className="mt-2 text-sm text-slate-500">Geschuetzter Zugang zur Administration.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin-Passwort"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-400"
          />

          {error && <p className="text-sm font-bold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-6 py-3 rounded-xl bg-slate-900 text-white font-bold uppercase text-[10px] disabled:opacity-60"
          >
            {busy ? "Pruefe Passwort..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-5 mt-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Admin-Bereich wird geladen...</p>
          </div>
        </div>
      }
    >
      <AdminLoginPageContent />
    </Suspense>
  );
}
