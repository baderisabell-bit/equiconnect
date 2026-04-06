"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { getPublicOfferDetails } from "../../../actions";

type OfferPrice = {
  label: string;
  preis: string;
  einheit: string;
};

type OfferRating = {
  rating: number;
  comment: string | null;
  is_verified_booking?: boolean;
  created_at: string;
  vorname: string;
  nachname: string;
};

type OfferDetails = {
  profileUserId: number;
  profileName: string;
  ort: string;
  plz: string;
  verifiziert: boolean;
  offer: {
    id: string;
    titel: string;
    kategorie: string;
    beschreibung: string;
    titleImageUrl: string;
    visibility: "public" | "draft";
    prices: OfferPrice[];
  };
  ratings: OfferRating[];
  ratingAvg: number;
  ratingCount: number;
};

export default function OfferDetailPage() {
  const params = useParams<{ userId: string; offerId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<OfferDetails | null>(null);

  const profileUserId = useMemo(() => Number(params.userId), [params.userId]);
  const offerId = useMemo(() => String(params.offerId || "").trim(), [params.offerId]);
  const verifiedRatingCount = useMemo(
    () => details?.ratings.filter((item) => Boolean(item.is_verified_booking)).length || 0,
    [details]
  );

  useEffect(() => {
    const load = async () => {
      if (!Number.isInteger(profileUserId) || profileUserId <= 0 || !offerId) {
        setError("Ungültige Anzeige-URL.");
        setLoading(false);
        return;
      }

      const viewerRaw = sessionStorage.getItem("userId");
      const viewerUserId = viewerRaw ? parseInt(viewerRaw, 10) : 0;

      const res = await getPublicOfferDetails({
        profileUserId,
        offerId,
        viewerUserId: Number.isInteger(viewerUserId) && viewerUserId > 0 ? viewerUserId : null,
      });

      if (!res.success || !res.data) {
        setError(res.error || "Anzeige konnte nicht geladen werden.");
        setLoading(false);
        return;
      }

      setDetails(res.data as OfferDetails);
      setLoading(false);
    };

    load();
  }, [offerId, profileUserId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Anzeige wird geladen...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 space-y-4">
        <p className="text-sm font-black uppercase text-red-600">{error || "Anzeige nicht gefunden."}</p>
        <Link href="/suche" className="inline-flex px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700">
          Zur Suche
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <p className="font-black text-emerald-600 text-xl italic uppercase leading-none">EquiConnect</p>
          <div className="flex items-center gap-2">
            <Link href="/suche" className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700">
              Suche
            </Link>
            <Link href={`/profil/${details.profileUserId}`} className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Profil
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Anzeige</p>
              <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">{details.offer.titel || "Anzeige"}</h1>
              {details.offer.kategorie && <p className="mt-2 text-sm font-black uppercase tracking-widest text-emerald-700">{details.offer.kategorie}</p>}
            </div>
            <div className="flex items-center gap-2 text-amber-500">
              <Star size={16} fill="currentColor" />
              <p className="text-sm font-black text-slate-900">{details.ratingAvg.toFixed(1)} ({details.ratingCount})</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Link href={`/profil/${details.profileUserId}`} className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              Anbieterprofil: {details.profileName}
            </Link>
            {(details.plz || details.ort) && (
              <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                <MapPin size={12} /> {details.plz} {details.ort}
              </span>
            )}
          </div>

          {details.offer.titleImageUrl && (
            <img src={details.offer.titleImageUrl} alt={details.offer.titel || "Anzeige"} className="w-full h-72 rounded-2xl object-cover border border-slate-200" />
          )}

          {details.offer.beschreibung && (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{details.offer.beschreibung}</p>
          )}

          {details.offer.prices.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preisübersicht</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {details.offer.prices.map((preis, idx) => (
                  <div key={`${details.offer.id}-price-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{preis.label || "Preis"}</p>
                    <p className="text-sm font-black text-slate-900 mt-1">{preis.preis || "-"} {preis.einheit || ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Bewertungen</p>
            <h2 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-900">Aktuelle Bewertungen</h2>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              In dieser Detailansicht werden alle Bewertungen gezeigt ({verifiedRatingCount} verifiziert, {Math.max(0, details.ratings.length - verifiedRatingCount)} unbestätigt).
            </p>
          </div>

          {details.ratings.length === 0 ? (
            <p className="text-sm text-slate-500">Für diese Anzeige liegen noch keine Bewertungen vor.</p>
          ) : (
            <div className="space-y-3">
              {details.ratings.map((item, idx) => (
                <article key={`${details.offer.id}-rating-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.vorname} {item.nachname}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{item.rating.toFixed(1)} ★</p>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${item.is_verified_booking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {item.is_verified_booking ? 'Verifiziert' : 'Nicht verifiziert'}
                      </span>
                    </div>
                  </div>
                  {item.comment && <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.comment}</p>}
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(item.created_at).toLocaleString("de-DE")}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
