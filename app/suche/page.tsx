"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Filter, Heart, MapPin, Search, X, ChevronDown, ChevronUp } from "lucide-react";
import NotificationBell from "../components/notification-bell";
import SearchMap from "../components/search-map";
import { ANGEBOT_KATEGORIEN } from "./kategorien-daten";
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

const DISTANCE_OPTIONS = [5, 10, 20, 35, 50, 100, 200];

export default function Suchseite() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapSidebarOpen, setMapSidebarOpen] = useState(false);
  const [suchbegriff, setSuchbegriff] = useState("");
  const [ortFilter, setOrtFilter] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [distanceCoords, setDistanceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedKategorien, setSelectedKategorien] = useState<string[]>([]);
  const [selectedSubkategorien, setSelectedSubkategorien] = useState<string[]>([]);
  const [priceRangeMin, setPriceRangeMin] = useState<number | null>(null);
  const [priceRangeMax, setPriceRangeMax] = useState<number | null>(null);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>([]);
  const [profileTypeFilter, setProfileTypeFilter] = useState<'all' | 'experte' | 'nutzer'>('all');
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
        themen: selectedSubkategorien,
        zertifikate: selectedCertificates,
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
  }, [ortFilter, selectedKategorien, selectedSubkategorien, selectedCertificates, suchbegriff, userId]);

  const filteredEntries = useMemo(() => {
    return eintraege.filter((entry) => {
      const query = suchbegriff.trim().toLowerCase();
      const location = ortFilter.trim().toLowerCase();
      const matchesQuery = !query || [entry.name, entry.angebotText, entry.sucheText].join(" ").toLowerCase().includes(query);
      const matchesOrt = !location || [entry.ort, entry.plz || ""].join(" ").toLowerCase().includes(location);
      const matchesKat = selectedKategorien.length === 0 || selectedKategorien.some((kat) => entry.kategorien.includes(kat));
      const matchesType = profileTypeFilter === 'all' || entry.typ === profileTypeFilter;
      return matchesQuery && matchesOrt && matchesKat && matchesType;
    });
  }, [eintraege, ortFilter, selectedKategorien, profileTypeFilter, suchbegriff]);

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

  const resetFilters = () => {
    setSuchbegriff("");
    setOrtFilter("");
    setSelectedKategorien([]);
    setSelectedSubkategorien([]);
    setDistanceFilter(null);
    setDistanceCoords(null);
    setPriceRangeMin(null);
    setPriceRangeMax(null);
    setSelectedCertificates([]);
    setProfileTypeFilter('all');
  };

  const availableSubkategorien = useMemo(() => {
    if (selectedKategorien.length === 0) return [];
    const firstKat = ANGEBOT_KATEGORIEN.find(c => c.label === selectedKategorien[0]);
    return firstKat?.themen?.map((t: any) => typeof t === 'string' ? t : t.label) || [];
  }, [selectedKategorien]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
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

      <main className="mx-auto w-full max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Search Bar */}
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
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700"
                >
                  <Filter size={14} /> Filter löschen
                </button>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Kategorien</p>
                <div className="flex flex-wrap gap-2">
                  {ANGEBOT_KATEGORIEN.map((c) => {
                    const kat = String(c.label || "");
                    const active = selectedKategorien.includes(kat);
                    return (
                      <button
                        key={kat}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setSelectedKategorien(prev => prev.filter(item => item !== kat));
                            setSelectedSubkategorien([]);
                          } else {
                            setSelectedKategorien([kat]);
                            setSelectedSubkategorien([]);
                          }
                        }}
                        className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                      >
                        {kat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subcategories */}
              {availableSubkategorien.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Themen</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSubkategorien.map((subkat: string) => {
                      const active = selectedSubkategorien.includes(subkat);
                      return (
                        <button
                          key={subkat}
                          type="button"
                          onClick={() => setSelectedSubkategorien(prev => active ? prev.filter(s => s !== subkat) : [...prev, subkat])}
                          className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                        >
                          {subkat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Profile Type Filter */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Profiltyp</p>
                <div className="flex gap-2">
                  {(['all', 'experte', 'nutzer'] as const).map((type) => {
                    const active = profileTypeFilter === type;
                    const label = type === 'all' ? 'Alle' : type === 'experte' ? 'Experten' : 'Nutzer';
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setProfileTypeFilter(type)}
                        className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Results */}
            {(feedError || loading) && (
              <div className={`rounded-2xl border p-4 text-sm ${feedError ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}>
                {feedError || "Lade Treffer..."}
              </div>
            )}

            <section className="grid gap-4 md:grid-cols-2">
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

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => addToWishlist(entry)}
                      className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                    >
                      <Heart size={12} className="inline mr-1" /> Speichern
                    </button>
                    <button
                      onClick={() => router.push(`/profil/${entry.userId}`)}
                      className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800"
                    >
                      Profil
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </div>

          {/* Right Sidebar with Map and Filters */}
          <div className="space-y-4">
            {/* Collapsible Map */}
            <button
              type="button"
              onClick={() => setMapSidebarOpen(!mapSidebarOpen)}
              className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black uppercase text-slate-700 hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <MapPin size={14} /> Karte
              </span>
              {mapSidebarOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {mapSidebarOpen && (
              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="h-48 rounded-xl overflow-hidden border border-slate-200">
                  <SearchMap
                    initial={null}
                    onChange={(pos: { lat: number; lng: number } | null) => {
                      if (!pos) return;
                      setDistanceCoords(pos);
                      setOrtFilter(`${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Umkreis (km)</p>
                  <div className="flex flex-wrap gap-2">
                    {DISTANCE_OPTIONS.map((dist) => {
                      const active = distanceFilter === dist;
                      return (
                        <button
                          key={dist}
                          type="button"
                          onClick={() => setDistanceFilter(active ? null : dist)}
                          className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                        >
                          {dist}km
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Filters Panel */}
            <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Weitere Filter</h3>

              {/* Price Range */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Preis (€)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRangeMin || ""}
                    onChange={(e) => setPriceRangeMin(e.target.value ? parseInt(e.target.value) : null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRangeMax || ""}
                    onChange={(e) => setPriceRangeMax(e.target.value ? parseInt(e.target.value) : null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                  />
                </div>
              </div>

              {/* Certificates */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Zertifikate</p>
                <div className="flex flex-wrap gap-1">
                  {['Reitunterricht', 'Beritt', 'Therapien'].map((cert) => {
                    const active = selectedCertificates.includes(cert);
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => setSelectedCertificates(prev => active ? prev.filter(c => c !== cert) : [...prev, cert])}
                        className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                      >
                        {cert}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
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
