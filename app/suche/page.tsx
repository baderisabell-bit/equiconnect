"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Heart, MapPin, Search, X, Menu } from "lucide-react";
import NotificationBell from "../components/notification-bell";
import SearchMap from "../components/search-map";
import { ANGEBOT_KATEGORIEN } from "./kategorien-daten";
import { getSearchFeed, addWishlistItem, sendConnectionRequest } from "../actions";

type SuchEintrag = {
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
};

type FilterType = "profile" | "groups" | "posts" | "offers" | "all";

const FILTER_TYPES: { value: FilterType; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "profile", label: "Profile" },
  { value: "groups", label: "Gruppen" },
  { value: "posts", label: "Beiträge" },
  { value: "offers", label: "Anzeigen" },
];

export default function SearchPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [category, setCategory] = useState("");
  const [distance, setDistance] = useState(50);
  const [showMap, setShowMap] = useState(true);
  const [eintraege, setEintraege] = useState<SuchEintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Initialize user session
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

  // Handle URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const cat = params.get("kategorie");
    if (q) setSearchTerm(q);
    if (cat) setCategory(cat);
  }, []);

  // Fetch search results
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getSearchFeed(userId, {
        kategorien: category ? [category] : [],
        themen: [],
        zertifikate: [],
        ort: "",
        q: searchTerm,
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
  }, [category, searchTerm, userId]);

  // Filter entries by type
  const filteredEntries = useMemo(() => {
    return eintraege.filter((entry) => {
      if (filterType === "profile" && entry.typ !== "experte" && entry.typ !== "nutzer") return false;
      if (filterType === "groups" && entry.typ !== "gruppe") return false;
      if (filterType === "posts" && entry.typ !== "beitrag") return false;
      if (filterType === "offers" && entry.typ !== "angebot") return false;
      return true;
    });
  }, [eintraege, filterType]);

  // Entries for map display (only profiles and offers, not posts/groups)
  const mapEntries = useMemo(() => {
    return filteredEntries.filter((entry) => (entry.typ === "experte" || entry.typ === "nutzer" || entry.typ === "angebot") && entry.lat && entry.lon);
  }, [filteredEntries]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchTerm.trim();
    if (query) {
      router.push(`/suche?q=${encodeURIComponent(query)}`);
    }
  };

  const handleAddToWishlist = async (entry: SuchEintrag) => {
    if (!userId) {
      alert("Bitte zuerst einloggen.");
      return;
    }

    await addWishlistItem(userId, {
      typ: "person",
      targetUserId: entry.userId || 0,
      targetName: entry.name,
    });
  };

  const handleConnect = async (entry: SuchEintrag) => {
    if (!userId || !entry.userId) {
      alert("Bitte zuerst einloggen.");
      return;
    }

    await sendConnectionRequest({
      requesterId: userId,
      targetUserId: entry.userId,
    });
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const categoryOptions = useMemo(() => {
    const labels = ANGEBOT_KATEGORIEN.map((c) => c.label);
    return labels;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl p-8 flex flex-col">
            <div className="flex justify-between items-center mb-10 text-emerald-600 font-black">
              MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button>
            </div>
            <nav className="space-y-6 flex-grow">
              <Link href="/" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</Link>
              <Link href="/suche" className="block text-xl font-black italic uppercase text-emerald-600">Suche</Link>
              <Link href="/netzwerk" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</Link>
              <Link href="/nachrichten" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</Link>
              <Link href="/merkliste" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</Link>
              <Link href="/einstellungen" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</Link>
              <Link href="/kontakt" className="block text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</Link>
            </nav>
            <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500">
              Abmelden
            </button>
          </aside>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="px-8 py-5 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50">
            <Menu size={24} className="text-slate-900" />
          </button>
          <div className="flex flex-col">
            <span className="font-black text-emerald-600 text-2xl italic uppercase">Equily</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Suche</span>
          </div>
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto hidden md:flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Spezialisierung oder Ort..."
              className="w-full px-4 py-3 bg-slate-50 rounded-xl border outline-none focus:border-emerald-300"
            />
            <button type="submit" className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black">
              Suchen
            </button>
          </form>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell userId={userId} />
            <button className="w-10 h-10 bg-slate-900 rounded-full text-white font-black border-2 border-emerald-500">
              {userName?.[0]}
            </button>
          </div>
        </div>

        {/* Filter Header */}
        <div className="border-t bg-white px-8 py-4 flex items-center gap-4 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white flex items-center gap-2 font-bold text-sm"
            >
              Typ: {FILTER_TYPES.find((t) => t.value === filterType)?.label} <ChevronDown size={16} />
            </button>
            {typeDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 bg-white border shadow-lg rounded-xl z-50">
                {FILTER_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setFilterType(type.value);
                      setTypeDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-slate-50"
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white flex items-center gap-2 font-bold text-sm"
            >
              Kategorie: {category || "Alle"} <ChevronDown size={16} />
            </button>
            {categoryDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 bg-white border shadow-lg rounded-xl z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setCategory("");
                    setCategoryDropdownOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-slate-50"
                >
                  Alle
                </button>
                {categoryOptions.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setCategoryDropdownOpen(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-slate-50"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-bold">Entfernung: {distance}km</label>
            <input
              type="range"
              min="1"
              max="100"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-32"
            />
          </div>

          <button
            onClick={() => setShowMap(!showMap)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${showMap ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white"}`}
          >
            Karte {showMap ? "▼" : "▶"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Results List */}
        <div className={`${showMap ? "w-full lg:w-1/2" : "w-full"} overflow-y-auto p-8 space-y-4`}>
          {loading ? (
            <p className="text-slate-500">Lädt...</p>
          ) : feedError ? (
            <p className="text-red-600">{feedError}</p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-slate-500">Keine Ergebnisse gefunden.</p>
          ) : (
            filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{entry.name}</h3>
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <MapPin size={14} /> {entry.ort}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddToWishlist(entry)}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-red-50"
                  >
                    <Heart size={16} className="text-slate-600 hover:text-red-500" />
                  </button>
                </div>
                {entry.kategorien.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entry.kategorien.map((kat) => (
                      <span key={kat} className="px-2 py-1 rounded-lg bg-emerald-50 text-[10px] font-black uppercase text-emerald-700">
                        {kat}
                      </span>
                    ))}
                  </div>
                )}
                {entry.angebotText && <p className="text-sm text-slate-600">{entry.angebotText}</p>}
                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/profil/${entry.userId}`}
                    className="px-3 py-2 rounded-lg text-[10px] font-black uppercase border border-emerald-300 bg-emerald-50 text-emerald-700"
                  >
                    Profil öffnen
                  </Link>
                  <button
                    onClick={() => handleConnect(entry)}
                    className="px-3 py-2 rounded-lg text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-50"
                  >
                    Nachricht
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Map Sidebar */}
        {showMap && (
          <div className="hidden lg:block w-1/2 border-l bg-white overflow-hidden">
            <SearchMap
              entries={mapEntries}
              searchTerm={searchTerm}
              onSelectEntry={(id: string) => {
                const entry = filteredEntries.find((e) => e.id === id);
                if (entry?.userId) {
                  router.push(`/profil/${entry.userId}`);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile Map Modal */}
      {showMap && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 flex items-end">
          <div className="w-full h-3/4 bg-white rounded-t-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-black text-lg">Karte</h2>
              <button onClick={() => setShowMap(false)} className="text-slate-500">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1">
              <SearchMap
                entries={mapEntries}
                searchTerm={searchTerm}
                onSelectEntry={(id: string) => {
                  const entry = filteredEntries.find((e) => e.id === id);
                  if (entry?.userId) {
                    setShowMap(false);
                    router.push(`/profil/${entry.userId}`);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
