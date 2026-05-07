"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, Heart, MapPin, Search, X } from "lucide-react";
import LoggedInHeader from "../components/logged-in-header";
import SearchMap from "../components/search-map";
import { ANGEBOT_KATEGORIEN } from "./kategorien-daten";
import { safeToFixed } from "../lib/num";
import { addWishlistItem, getSearchFeed, sendConnectionRequest } from "../actions";

type FilterType = "all" | "profile" | "groups" | "posts" | "offers";

type SearchEntry = {
  id: string;
  userId: number | null;
  typ: "experte" | "nutzer" | "beitrag" | "gruppe" | "angebot";
  name: string;
  ort: string;
  plz?: string;
  rating: number;
  kategorien: string[];
  angebotText: string;
  sucheText: string;
  lat?: number;
  lon?: number;
  imageUrl?: string;
};

type CategoryOption = {
  label: string;
  themen: string[];
};

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "profile", label: "Profile" },
  { value: "groups", label: "Gruppen" },
  { value: "posts", label: "Beiträge" },
  { value: "offers", label: "Anzeigen" },
];

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function displayText(value: string) {
  return String(value || "")
    .replace(/ae/g, "ä")
    .replace(/oe/g, "ö")
    .replace(/ue/g, "ü");
}

function buildCategoryOptions(): CategoryOption[] {
  return ANGEBOT_KATEGORIEN.map((category) => ({
    label: String(category.label || "").trim(),
    themen: Array.isArray(category.themen)
      ? category.themen.flatMap((entry) => {
          if (typeof entry === "string") return [entry];
          const base = [String(entry?.name || "").trim()].filter(Boolean);
          const subs = Array.isArray(entry?.subs) ? entry.subs.map((item) => String(item || "").trim()).filter(Boolean) : [];
          return [...base, ...subs];
        })
      : [],
  }));
}

function SuchseiteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryOptions = useMemo(buildCategoryOptions, []);

  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ortFilter, setOrtFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");

  const activeCategory = useMemo(() => categoryOptions.find((category) => category.label === selectedCategory) || null, [categoryOptions, selectedCategory]);
  const selectedThemeSet = useMemo(() => new Set(selectedThemes), [selectedThemes]);

  useEffect(() => {
    const rawUserId = sessionStorage.getItem("userId");
    const parsedUserId = rawUserId ? parseInt(rawUserId, 10) : NaN;
    setRole(sessionStorage.getItem("userRole"));
    setUserName(sessionStorage.getItem("userName") || "Profil");
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      setUserId(parsedUserId);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const ort = searchParams.get("ort") || "";
    const kategorie = searchParams.get("kategorie") || "";
    const thema = searchParams.get("thema") || "";

    if (q) setSearchTerm(q);
    if (ort) setOrtFilter(ort);
    if (kategorie) setSelectedCategory(kategorie);
    if (thema) setSelectedThemes([thema]);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getSearchFeed(userId, {
        kategorien: selectedCategory ? [selectedCategory] : [],
        themen: selectedThemes,
        zertifikate: [],
        ort: ortFilter,
        q: searchTerm,
      });

      if (!res.success) {
        setFeedError(String(res.error || "Suche konnte nicht geladen werden."));
        setEntries([]);
        setLoading(false);
        return;
      }

      setFeedError("");
      setEntries(Array.isArray(res.items) ? res.items : []);
      setLoading(false);
    };

    load();
  }, [ortFilter, searchTerm, selectedCategory, selectedThemes, userId]);

  const filteredEntries = useMemo(() => {
    const query = normalizeText(searchTerm);
    const locationQuery = normalizeText(ortFilter);
    const categoryQuery = normalizeText(selectedCategory);

    return entries.filter((entry) => {
      const entryText = normalizeText([
        entry.name,
        entry.ort,
        entry.plz || "",
        entry.angebotText,
        entry.sucheText,
        entry.kategorien.join(" "),
      ].join(" "));

      const matchesQuery = !query || entryText.includes(query);
      const matchesLocation = !locationQuery || normalizeText([entry.ort, entry.plz || ""].join(" ")).includes(locationQuery);
      const matchesCategory = !categoryQuery || entry.kategorien.some((item) => normalizeText(item).includes(categoryQuery));
      const matchesThemes = selectedThemes.length === 0 || selectedThemes.some((theme) => entryText.includes(normalizeText(theme)));
      const matchesType =
        filterType === "all" ||
        (filterType === "profile" && (entry.typ === "experte" || entry.typ === "nutzer")) ||
        (filterType === "groups" && entry.typ === "gruppe") ||
        (filterType === "posts" && entry.typ === "beitrag") ||
        (filterType === "offers" && entry.typ === "angebot");

      return matchesQuery && matchesLocation && matchesCategory && matchesThemes && matchesType;
    });
  }, [entries, filterType, ortFilter, searchTerm, selectedCategory, selectedThemes]);

  const mapEntries = useMemo(
    () => filteredEntries.filter((entry) => (entry.typ === "experte" || entry.typ === "nutzer" || entry.typ === "angebot") && Number.isFinite(entry.lat) && Number.isFinite(entry.lon)),
    [filteredEntries]
  );

  const addToWishlist = async (entry: SearchEntry) => {
    if (!userId) {
      alert("Bitte zuerst einloggen, um zur Merkliste hinzuzufügen.");
      return;
    }

    const res = await addWishlistItem(userId, {
      typ: "person",
      profilTyp: entry.typ,
      sourceId: `${entry.typ}-${entry.id}`,
      name: entry.name,
      ort: entry.ort,
      plz: entry.plz || "",
      kategorieText: entry.kategorien.join(", "),
      content: entry.typ === "angebot" ? entry.angebotText : entry.sucheText || entry.angebotText,
    });

    if (!res.success) {
      alert(res.error || "Merkliste konnte nicht gespeichert werden.");
      return;
    }

    alert(res.inserted ? "Zur Merkliste hinzugefügt." : "Bereits in der Merkliste.");
  };

  const connectToUser = async (entry: SearchEntry) => {
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

  const clearFilters = () => {
    setSearchTerm("");
    setOrtFilter("");
    setFilterType("all");
    setSelectedCategory("");
    setSelectedThemes([]);
  };

  const searchHeaderContent = (
    <div className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Suche nach Namen, Angebot oder Thema"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
        />
      </div>
      <div className="relative w-64">
        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={ortFilter}
          onChange={(event) => setOrtFilter(event.target.value)}
          placeholder="Ort oder PLZ"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
        />
      </div>
      <button
        type="button"
        onClick={clearFilters}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Filter size={14} /> Filter löschen
      </button>
    </div>
  );

  const themeOptions = activeCategory?.themen || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_55%,_#eef2f7_100%)] text-slate-900">
      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName || "Profil"}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        brandText="Suche"
        searchContent={searchHeaderContent}
      />

      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Menü schließen"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-[1px]"
          />
          <aside className="fixed left-0 top-0 z-[100] h-full w-72 border-r border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-widest text-slate-900">Menü</p>
              <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-full border border-slate-200 px-2 py-1 text-slate-500">
                <X size={14} />
              </button>
            </div>
            <nav className="space-y-3 text-sm font-black uppercase tracking-widest text-slate-700">
              <Link href="/" className="block">
                Startseite
              </Link>
              <Link href="/netzwerk" className="block">
                Netzwerk
              </Link>
              <Link href="/nachrichten" className="block">
                Nachrichten
              </Link>
              <Link href="/merkliste" className="block">
                Merkliste
              </Link>
              <button type="button" onClick={openProfile} className="block text-left">
                Mein Profil
              </button>
            </nav>
          </aside>
        </>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-start">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTypeDropdownOpen((prev) => !prev);
                  setCategoryDropdownOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700"
              >
                Typ: {FILTER_TYPES.find((type) => type.value === filterType)?.label} <ChevronDown size={16} />
              </button>
              {typeDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {FILTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setFilterType(type.value);
                        setTypeDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition ${filterType === type.value ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      <span>{type.label}</span>
                      {filterType === type.value ? <span>•</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryDropdownOpen((prev) => !prev);
                    setTypeDropdownOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700"
                >
                  Kategorie: {selectedCategory ? displayText(selectedCategory) : "Alle"} <ChevronDown size={16} />
                </button>

                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedThemes([]);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500"
                  >
                    Kategorie zurücksetzen
                  </button>
                )}
              </div>

              {categoryDropdownOpen && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((category) => {
                      const active = selectedCategory === category.label;
                      return (
                        <button
                          key={category.label}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(active ? "" : category.label);
                            setSelectedThemes([]);
                          }}
                          className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {displayText(category.label)}
                        </button>
                      );
                    })}
                  </div>

                  {activeCategory && themeOptions.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Unterkategorien</p>
                      <div className="flex flex-wrap gap-2">
                        {themeOptions.map((theme) => {
                          const active = selectedThemeSet.has(theme);
                          return (
                            <button
                              key={theme}
                              type="button"
                              onClick={() => {
                                setSelectedThemes((prev) => (prev.includes(theme) ? prev.filter((item) => item !== theme) : [...prev, theme]));
                              }}
                              className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${active ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                            >
                              {displayText(theme)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMap((prev) => !prev)}
              className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${showMap ? "border border-slate-900 bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
            >
              Karte {showMap ? "ausblenden" : "anzeigen"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {selectedCategory ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">{displayText(selectedCategory)}</span> : null}
            {selectedThemes.map((theme) => (
              <span key={theme} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                {displayText(theme)}
              </span>
            ))}
          </div>
        </section>

        {(feedError || loading) && (
          <div className={`rounded-2xl border p-4 text-sm ${feedError ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600"}`}>
            {feedError || "Lade Treffer..."}
          </div>
        )}

        <div className={showMap ? "grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]" : "block"}>
          <section className="space-y-4">
            {filteredEntries.length === 0 && !loading ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
                Keine Treffer gefunden. Bitte Suche, Ort oder Kategorien anpassen.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredEntries.map((entry) => (
                  <article key={entry.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    {entry.imageUrl ? (
                      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <img
                          src={entry.imageUrl}
                          alt={entry.name}
                          className="h-44 w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {entry.typ === "experte" ? "Experte" : entry.typ === "nutzer" ? "Nutzer" : entry.typ === "angebot" ? "Anzeige" : entry.typ === "gruppe" ? "Gruppe" : "Beitrag"}
                        </p>
                        <h3 className="mt-1 text-lg font-black italic uppercase text-slate-900">{displayText(entry.name)}</h3>
                        <p className="text-xs text-slate-500">
                          {displayText(entry.ort)}
                          {entry.plz ? ` · ${entry.plz}` : ""}
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{safeToFixed(entry.rating, 1)}</div>
                    </div>

                    <p className="mt-3 text-sm text-slate-600 line-clamp-3">
                      {displayText(entry.angebotText || entry.sucheText || "Keine Beschreibung verfügbar.")}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.kategorien.slice(0, 4).map((category) => (
                        <span key={`${entry.id}-${category}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                          {displayText(category)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(entry.typ === "experte" || entry.typ === "angebot") && entry.userId ? (
                        <button
                          type="button"
                          onClick={() => connectToUser(entry)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                        >
                          Vernetzen
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => addToWishlist(entry)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                      >
                        <Heart size={14} /> Merken
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {showMap && (
            <section className="xl:sticky xl:top-24">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Karte</p>
                    <h2 className="mt-1 text-lg font-black italic uppercase tracking-tight text-slate-900">Standorte der Treffer</h2>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {mapEntries.length} Marker
                  </span>
                </div>
                <SearchMap
                  className="h-[72vh] w-full rounded-[1.5rem] overflow-hidden"
                  entries={mapEntries}
                  onSelectEntry={(id: string) => {
                    const entry = filteredEntries.find((item) => item.id === id);
                    if (entry?.userId) {
                      router.push(`/profil/${entry.userId}`);
                    }
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Suchseite() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8 text-slate-500">
          Suche wird geladen...
        </div>
      }
    >
      <SuchseiteContent />
    </Suspense>
  );
}