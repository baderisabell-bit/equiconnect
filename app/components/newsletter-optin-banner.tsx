"use client";

import Link from "next/link";

type NewsletterOptInBannerProps = {
  open: boolean;
  title: string;
  body: string;
  onSubscribe: () => void;
  onDismiss: () => void;
};

export default function NewsletterOptInBanner(props: NewsletterOptInBannerProps) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[115] px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-amber-200 bg-[#f6efe4] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Newsletter</p>
            <h2 className="mt-2 text-2xl font-black italic uppercase text-slate-900">{props.title}</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">{props.body}</p>
            <Link href="/datenschutz" className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-800">
              Mehr zu Datenschutz & Kommunikation
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              type="button"
              onClick={props.onDismiss}
              className="px-5 py-3 rounded-xl border border-amber-200 bg-white/60 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:border-amber-300 hover:text-amber-800"
            >
              Später erinnern
            </button>
            <button
              type="button"
              onClick={props.onSubscribe}
              className="px-5 py-3 rounded-xl bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-800"
            >
              Newsletter aktivieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
