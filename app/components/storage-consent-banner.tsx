"use client";

import Link from 'next/link';

type StorageConsentBannerProps = {
  open: boolean;
  onAcceptAll: () => void;
  onNecessaryOnly: () => void;
};

export default function StorageConsentBanner(props: StorageConsentBannerProps) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Speicher-Hinweis</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase text-slate-900">Bevor du weiterklickst</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              EquiConnect nutzt notwendige Browser-Speicher für Login und Portal-Funktionen. Optionale Speicher helfen nur bei Komfortfunktionen wie gemerkten Chat-Ansichten und Direktstarts in Nachrichten.
            </p>
            <Link href="/cookies" className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">
              Mehr zu Cookies & Speicher
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              type="button"
              onClick={props.onNecessaryOnly}
              className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-emerald-300 hover:text-emerald-700"
            >
              Nur notwendige
            </button>
            <button
              type="button"
              onClick={props.onAcceptAll}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700"
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}