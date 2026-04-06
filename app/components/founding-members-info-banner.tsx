"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "equiconnect-founding-info-dismissed";

export default function FoundingMembersInfoBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (!dismissed) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[115] px-4 pb-4">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-200 bg-emerald-50 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Gruendungsmitglieder</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase text-slate-900">Die ersten 150 Mitglieder sichern sich dauerhaft Rabatt</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              Die ersten 4 Monate sind kostenlos. Danach bleibt fuer Gruendungsmitglieder ein dauerhafter Rabatt aktiv.
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Die Website ist im Aufbau. Teile Fehler und Verbesserungsvorschlaege gern ueber unser
              <Link href="/kontakt" className="ml-1 font-black text-emerald-700 hover:underline">Kontaktformular</Link>,
              damit wir EquiConnect genau auf eure Wuensche zuschneiden koennen.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link
              href="/abo"
              className="px-5 py-3 rounded-xl bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800 text-center"
            >
              Zum Abo
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-5 py-3 rounded-xl border border-emerald-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-emerald-300"
            >
              Ausblenden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
