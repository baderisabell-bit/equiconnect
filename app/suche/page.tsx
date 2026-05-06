"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Heart, MapPin, Search, X } from "lucide-react";
import NotificationBell from "../components/notification-bell";
import { safeToFixed } from '../lib/num';
import { addWishlistItem, getSearchFeed, sendConnectionRequest } from "../actions";

type SuchEintrag = {
  id: string;
  userId: number | null;
  typ: "experte" | "nutzer";
  name: string;
  ort: string;
  plz?: string;
  rating: number;
  kategorien: string[];
  angebotText: string;
  sucheText: string;
};

export default function Suchseite() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suchbegriff, setSuchbegriff] = useState("");
  const [ortFilter, setOrtFilter] = useState("");
  const [selectedKategorien, setSelectedKategorien] = useState<string[]>([]);
  const [eintraege, setEintraege] = useState<SuchEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");

  useEffect(() => {
    const rawUserId = sessionStorage.getItem("userId");
    const parsedUserId = rawUserId ? parseInt(rawUserId, 10) : NaN;
    setRole(sessionStorage.getItem("userRole"));
    setUserName(sessionStorage.getItem("userName") || "Profil");
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      setUserId(parsedUserId);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kat = params.get("kategorie");
    if (kat) setSelectedKategorien([kat]);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getSearchFeed(userId, {
        kategorien: selectedKategorien,
        themen: [],
        zertifikate: [],
        ort: ortFilter,
        q: suchbegriff,
      });

      if (!res.success) {
        setFeedError(String(res.error || "Suche konnte nicht geladen werden."));
        setEintraege([]);
        setLoading(false);
        return;
      }

      setFeedError("");
      setEintraege(Array.isArray(res.items) ? res.items : []);
      setLoading(false);
    };

    load();
  }, [ortFilter, selectedKategorien, suchbegriff, userId]);

  const filteredEntries = useMemo(() => {
    return eintraege.filter((entry) => {
      const query = suchbegriff.trim().toLowerCase();
      const location = ortFilter.trim().toLowerCase();
      const matchesQuery = !query || [entry.name, entry.angebotText, entry.sucheText].join(" ").toLowerCase().includes(query);
      const matchesOrt = !location || [entry.ort, entry.plz || ""].join(" ").toLowerCase().includes(location);
      const matchesKat = selectedKategorien.length === 0 || selectedKategorien.some((kat) => entry.kategorien.includes(kat));
      return matchesQuery && matchesOrt && matchesKat;
    });
  }, [eintraege, ortFilter, selectedKategorien, suchbegriff]);

  const addToWishlist = async (entry: SuchEintrag) => {
    if (!userId) {
      alert("Bitte zuerst einloggen, um zur Merkliste hinzuzufügen.");
      return;
    }

    const res = await addWishlistItem(userId, {
      typ: "person",
      profilTyp: entry.typ,
      sourceId: `person-${entry.id}`,
      name: entry.name,
      ort: entry.ort,
      plz: entry.plz || "",
      kategorieText: entry.kategorien.join(", "),
      content: entry.typ === "experte" ? entry.angebotText : entry.sucheText,
    });

    if (!res.success) {
      alert(res.error || "Merkliste konnte nicht gespeichert werden.");
      return;
    }

    alert(res.inserted ? "Zur Merkliste hinzugefügt." : "Bereits in der Merkliste.");
  };

  const connectToUser = async (entry: SuchEintrag) => {
    if (!userId || !entry.userId || entry.userId === userId) return;
    const res = await sendConnectionRequest({ requesterId: userId, targetUserId: entry.userId });
    if (!res.success) {
      alert(res.error || "Vernetzungsanfrage fehlgeschlagen.");
      return;
    }
    alert(res.status === "accepted" ? "Ihr seid jetzt vernetzt." : "Vernetzungsanfrage gesendet.");
  };

  const openProfile = () => {
    if (userId && userId > 0) {
      window.location.href = `/profil/${userId}`;
      return;
    }
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
          >
            Menü
          </button>
          <Link href="/" className="text-sm font-black uppercase italic tracking-wider text-emerald-700">
            Suche
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell userId={userId} />
            <button
              type="button"
              onClick={openProfile}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-black"
            >
              {userName?.[0] || "P"}
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Menü schließen"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30"
        />
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={suchbegriff}
                onChange={(e) => setSuchbegriff(e.target.value)}
                placeholder="Suche nach Namen, Angebot oder Thema"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={ortFilter}
                onChange={(e) => setOrtFilter(e.target.value)}
                placeholder="Ort oder PLZ"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSuchbegriff("");
                setOrtFilter("");
                setSelectedKategorien([]);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700"
            >
              <Filter size={14} /> Filter löschen
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Pferd", "Reiten", "Training", "Therapie"].map((kat) => {
              const active = selectedKategorien.includes(kat);
              return (
                <button
                  key={kat}
                  type="button"
                  onClick={() => setSelectedKategorien((prev) => (active ? prev.filter((item) => item !== kat) : [...prev, kat]))}
                  className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {kat}
                </button>
              );
            })}
          </div>
        </section>

        {(feedError || loading) && (
          <div className={`rounded-2xl border p-4 text-sm ${feedError ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}>
            {feedError || "Lade Treffer..."}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{entry.typ === "experte" ? "Experte" : "Nutzer"}</p>
                  <h3 className="mt-1 text-lg font-black italic uppercase text-slate-900">{entry.name}</h3>
                  <p className="text-xs text-slate-500">{entry.ort}{entry.plz ? ` · ${entry.plz}` : ""}</p>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{safeToFixed(entry.rating, 1)}</div>
              </div>

              <p className="text-sm text-slate-600 line-clamp-3">{entry.angebotText || entry.sucheText || "Keine Beschreibung verfügbar."}</p>

              <div className="flex flex-wrap gap-2">
                {entry.kategorien.slice(0, 3).map((kat) => (
                  <span key={`${entry.id}-${kat}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                    {kat}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="button" onClick={() => addToWishlist(entry)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
                  <Heart size={12} /> Merken
                </button>
                {entry.userId && entry.userId !== userId && (
                  <button type="button" onClick={() => connectToUser(entry)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    Vernetzen
                  </button>
                )}
                {entry.userId && (
                  <Link href={`/profil/${entry.userId}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
                    Profil
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>

      {sidebarOpen && (
        <aside className="fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-8 flex items-center justify-between">
            <p className="text-sm font-black uppercase tracking-widest text-slate-900">Menü</p>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-full border border-slate-200 px-2 py-1 text-slate-500">
              <X size={14} />
            </button>
          </div>
          <nav className="space-y-3 text-sm font-black uppercase tracking-widest text-slate-700">
            <Link href="/" className="block">Startseite</Link>
            <Link href="/netzwerk" className="block">Netzwerk</Link>
            <Link href="/nachrichten" className="block">Nachrichten</Link>
            <Link href="/merkliste" className="block">Merkliste</Link>
            <button type="button" onClick={openProfile} className="block text-left">Mein Profil</button>
          </nav>
        </aside>
      )}
    </div>
  );
}