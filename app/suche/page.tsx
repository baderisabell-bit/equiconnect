"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, MapPin, Search, MessageSquare, User, Star, X } from "lucide-react";
import LoggedInHeader from "../components/logged-in-header";
import SearchMap from "../components/search-map";
import { ANGEBOT_KATEGORIEN } from "./kategorien-daten";
import { safeToFixed } from "../lib/num";
import { addWishlistItem, getSearchFeed, rateUser, sendConnectionRequest } from "../actions";

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

// Detail Modal Component
function DetailModal({ entry, onClose, userId }: { entry: SearchEntry | null; onClose: () => void; userId: number | null }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [comments, setComments] = useState<Array<{ user: string; text: string; likes: number }>>([]);
  const [newComment, setNewComment] = useState("");
  const [currentRating, setCurrentRating] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setCurrentRating(Number(entry?.rating || 0));
  }, [entry]);

  if (!entry) return null;

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    if (userId) {
      void addWishlistItem(userId, entry.id);
    }
  };

  const handleSendMessage = () => {
    if (entry.userId) {
      router.push(`/nachrichten?userId=${entry.userId}`);
    }
  };

  const handleOpenProfile = () => {
    if (entry.userId) {
      router.push(`/profil/${entry.userId}`);
    }
  };


  const handleConnect = () => {
    if (entry.userId && userId) {
      void sendConnectionRequest({ requesterId: userId, targetUserId: entry.userId });
    }
  };
  const handleAddComment = () => {
    if (newComment.trim()) {
      setComments([...comments, { user: "Du", text: newComment, likes: 0 }]);
      setNewComment("");
    }
  };

  const handleRating = async (stars: number) => {
    setCurrentRating(stars);
    if (entry.userId && userId) {
      await rateUser({ raterUserId: userId, ratedUserId: entry.userId, rating: stars });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-black italic uppercase text-slate-900">{displayText(entry.name)}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image */}
          {entry.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <img src={entry.imageUrl} alt={entry.name} className="w-full h-64 object-cover" />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {entry.typ === "experte" ? "Experte" : entry.typ === "nutzer" ? "Nutzer" : entry.typ === "angebot" ? "Anzeige" : entry.typ === "gruppe" ? "Gruppe" : "Beitrag"}
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{displayText(entry.ort)}{entry.plz ? ` · ${entry.plz}` : ""}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => void handleRating(star)} className={`text-lg ${star <= Math.round(currentRating) ? "text-yellow-400" : "text-slate-200"}`}>
                    ★
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-slate-700">({safeToFixed(currentRating, 1)})</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-700">{displayText(entry.angebotText || entry.sucheText || "Keine Beschreibung verfügbar.")}</p>
          </div>

          {/* Categories */}
          {entry.kategorien.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.kategorien.map((cat) => (
                <span key={cat} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600">
                  {displayText(cat)}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={handleWishlist}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-black uppercase text-[10px] tracking-widest transition ${
                isWishlisted ? "bg-red-100 text-red-600 border border-red-200" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Heart size={14} /> Merken
            </button>

            {entry.userId && (
              <>
                <button
                  onClick={handleSendMessage}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-black uppercase text-[10px] text-slate-700 tracking-widest hover:bg-slate-50 transition"
                >
                  <MessageSquare size={14} /> Nachricht
                </button>

                {entry.typ !== "gruppe" && entry.typ !== "beitrag" && (
                  <>
                    <button
                      onClick={handleOpenProfile}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-black uppercase text-[10px] text-slate-700 tracking-widest hover:bg-slate-50 transition"
                    >
                      <User size={14} /> Profil
                    </button>

                    {entry.typ === "experte" && (
                      <button
                        onClick={handleConnect}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition"
                      >
                        Vernetzen
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Comments Section (für Beiträge) */}
          {entry.typ === "beitrag" && (
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <h3 className="font-black uppercase text-slate-900">Kommentare</h3>

              {/* Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Kommentar schreiben..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-slate-400"
                  onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button onClick={handleAddComment} className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-black text-[10px] hover:bg-emerald-700">
                  Senden
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment, i) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-slate-900">{comment.user}</p>
                      <button className="text-slate-400 hover:text-red-600">
                        <Heart size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{comment.text}</p>
                    <p className="text-xs text-slate-400 mt-2">{comment.likes} Likes</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuchseiteContent() {
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
  const [selectedEntry, setSelectedEntry] = useState<SearchEntry | null>(null);

  const activeCategory = useMemo(() => categoryOptions.find((category) => category.label === selectedCategory) || null, [categoryOptions, selectedCategory]);
  const selectedThemeSet = useMemo(() => new Set(selectedThemes), [selectedThemes]);

  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem("userId");
      const roleRaw = sessionStorage.getItem("role");
      const name = sessionStorage.getItem("userName");
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : null;
      setUserId(parsedUserId);
      setRole(roleRaw);
      setUserName(name);
      setLoading(false);

      const res = await getSearchFeed(parsedUserId, {});
      if (res.success) {
        setEntries(res.data || res.items || res.feed || []);
      } else {
        setFeedError("Feed konnte nicht geladen werden");
      }
    };
    init();
  }, []);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (filterType !== "all") {
      const typeMap: Record<FilterType, string[]> = {
        all: [],
        profile: ["experte", "nutzer"],
        groups: ["gruppe"],
        posts: ["beitrag"],
        offers: ["angebot"],
      };
      result = result.filter((entry) => typeMap[filterType].includes(entry.typ));
    }

    if (searchTerm) {
      const normalized = normalizeText(searchTerm);
      result = result.filter((entry) => normalizeText(entry.name).includes(normalized) || normalizeText(entry.sucheText).includes(normalized));
    }

    if (ortFilter) {
      const normalized = normalizeText(ortFilter);
      result = result.filter((entry) => normalizeText(entry.ort).includes(normalized));
    }

    if (selectedThemes.length > 0) {
      result = result.filter((entry) => entry.kategorien.some((cat) => selectedThemeSet.has(cat)));
    }

    return result;
  }, [entries, filterType, searchTerm, ortFilter, selectedThemes, selectedThemeSet]);

  const mapEntries = useMemo(() => filteredEntries.filter((e) => e.lat && e.lon), [filteredEntries]);

  const openProfile = () => {
    if (userId && userId > 0) {
      window.location.href = `/profil/${userId}`;
      return;
    }
    window.location.href = "/login";
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const clearFilters = () => {
    setSearchTerm("");
    setOrtFilter("");
    setSelectedCategory("");
    setSelectedThemes([]);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {sidebarOpen && (
        <>
          <button type="button" aria-label="Menü schließen" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" />
          <aside className="fixed left-0 top-0 z-[70] h-full w-72 bg-white shadow-2xl transition-transform duration-300 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">
              MENÜ
              <button onClick={() => setSidebarOpen(false)} className="text-slate-300 text-xl leading-none">
                ×
              </button>
            </div>
            <nav className="space-y-5 flex-grow">
              <Link href="/" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Startseite
              </Link>
              {role === "experte" ? (
                <Link href="/dashboard/experte" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                  Dashboard
                </Link>
              ) : null}
              <button type="button" onClick={openProfile} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Mein Profil
              </button>
              {role === "experte" ? (
                <Link href="/dashboard/experte/schueler" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                  Schüler &amp; Kunden
                </Link>
              ) : null}
              <Link href="/suche" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Suche
              </Link>
              <Link href="/netzwerk" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Netzwerk
              </Link>
              <Link href="/nachrichten" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Nachrichten
              </Link>
              <Link href="/merkliste" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Merkliste
              </Link>
              <Link href="/einstellungen" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Einstellungen
              </Link>
              <Link href="/kontakt" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">
                Kontakt &amp; FAQ
              </Link>
            </nav>
            <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
              Abmelden
            </button>
          </aside>
        </>
      )}

      <LoggedInHeader
        userId={userId}
        role={role === "experte" ? "experte" : "nutzer"}
        userName={userName || "Gast"}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        searchContent={
          <>
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, Kategorie, Stichwort..."
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
              />
            </div>
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <MapPin size={16} className="text-slate-400" />
              <input
                type="text"
                value={ortFilter}
                onChange={(e) => setOrtFilter(e.target.value)}
                placeholder="Ort oder PLZ"
                className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
              />
            </div>
          </>
        }
      />

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Filter Header */}
        <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3 pt-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {FILTER_TYPES.find((t) => t.value === filterType)?.label} <ChevronDown size={14} />
              </button>
              {typeDropdownOpen && (
                <div className="absolute top-12 left-0 z-20 rounded-2xl border border-slate-200 bg-white shadow-lg">
                  {FILTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setFilterType(type.value);
                        setTypeDropdownOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50"
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {selectedCategory || "Kategorien"} <ChevronDown size={14} />
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-12 left-0 z-20 max-h-64 w-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <button
                    onClick={() => {
                      setSelectedCategory("");
                      setSelectedThemes([]);
                      setCategoryDropdownOpen(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50"
                  >
                    Alle
                  </button>
                  {categoryOptions.map((category) => (
                    <button key={category.label} onClick={() => { setSelectedCategory(category.label); setCategoryDropdownOpen(false); }} className="block w-full px-4 py-2 text-left text-sm font-bold hover:bg-slate-50">
                      {category.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={clearFilters} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
              Filter zurücksetzen
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition ${showMap ? "border border-slate-900 bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700"}`}
          >
            Karte {showMap ? "verbergen" : "anzeigen"}
          </button>
        </div>

        {/* Results */}
        <div className={showMap ? "grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]" : "block"}>
          <section className="space-y-4">
            {filteredEntries.length === 0 && !loading ? (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
                Keine Treffer gefunden. Bitte Suche, Ort oder Kategorien anpassen.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredEntries.map((entry) => (
                  <article
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                  >
                    {entry.imageUrl ? (
                      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        <img src={entry.imageUrl} alt={entry.name} className="h-44 w-full object-cover" loading="lazy" />
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

                    <p className="mt-3 text-sm text-slate-600 line-clamp-3">{displayText(entry.angebotText || entry.sucheText || "Keine Beschreibung verfügbar.")}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.kategorien.slice(0, 4).map((category) => (
                        <span key={`${entry.id}-${category}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">
                          {displayText(category)}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 pointer-events-none opacity-60">
                      <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
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
                    if (entry) {
                      setSelectedEntry(entry);
                    }
                  }}
                />
              </div>
            </section>
          )}
        </div>
      </main>

      <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} userId={userId} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8">Suche wird geladen...</div>}>
      <SuchseiteContent />
    </Suspense>
  );
}
