"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Filter, Navigation, ChevronUp, ChevronDown, X, PanelRightOpen, PanelRightClose, Heart, Plus } from 'lucide-react';
import { ANGEBOT_KATEGORIEN, ZERTIFIKAT_KATEGORIEN } from './kategorien-daten';
import { addWishlistItem, getGroupsFeed, getSearchFeed, getStoredProfileData, getWaitlistOverviewForViewer, joinNetworkGroup, joinProWaitlist, sendConnectionRequest } from '../actions';
import NotificationBell from '../components/notification-bell';

type SuchEintrag = {
  id: string;
  userId: number | null;
  primaryOfferId: string | null;
  typ: 'experte' | 'nutzer';
  name: string;
  ort: string;
  plz?: string;
  distanzKm: number;
  rating: number;
  verifiedRatingCount: number;
  verifiziert: boolean;
  kategorien: string[];
  zertifikate: string[];
  angebotText: string;
  sucheText: string;
  angeboteCount: number;
  planKey: string;
  boostedUntil?: string | null;
  weeklyAdUntil?: string | null;
  visibilityScore: number;
  profilePostsCount: number;
  profilePostsText: string;
};

type GruppeEintrag = {
  id: number;
  name: string;
  description: string | null;
  founderName: string;
  memberCount: number;
};

const UMKREIS_OPTIONEN = [5, 10, 20, 50, 75, 100, 200] as const;

const isSonstigesFreitextToken = (value: string) => {
  const normalized = value.toLowerCase();
  return normalized.includes('freitext') || normalized.includes('sonstiges:');
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
  const [selectedThemen, setSelectedThemen] = useState<string[]>([]);
  const [selectedZertifikate, setSelectedZertifikate] = useState<string[]>([]);
  const [umkreisKm, setUmkreisKm] = useState<number | null>(null);
  const [typFilter, setTypFilter] = useState<'alle' | 'experte' | 'nutzer' | 'gruppe'>('experte');
  const [inhaltFilter, setInhaltFilter] = useState<'' | 'profile' | 'angebote' | 'suchen' | 'beitraege' | 'gruppen'>('profile');
  const [gruppen, setGruppen] = useState<GruppeEintrag[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<number>>(new Set());
  const [eintraege, setEintraege] = useState<SuchEintrag[]>([]);
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});
  const [waitlistJoined, setWaitlistJoined] = useState<Record<string, boolean>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(true);
  const [openFilterBereich, setOpenFilterBereich] = useState<string | null>(null);
  const [openPanels, setOpenPanels] = useState({
    fokus: false,
    angebote: false,
    zertifikate: false
  });
  const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'unavailable'>('idle');
  const [viewerHasEarlyAccess, setViewerHasEarlyAccess] = useState(false);
    const [feedError, setFeedError] = useState('');
  const [mapCoordsByLocation, setMapCoordsByLocation] = useState<Record<string, { x: number; y: number; exact: boolean }>>({});
  const [activeMapPinKey, setActiveMapPinKey] = useState<string | null>(null);
  const normalizedRole = String(role || '').trim().toLowerCase();
  const isExpertRole = Boolean(normalizedRole) && !['nutzer', 'user', 'kunde'].includes(normalizedRole);

  const MAP_BOUNDS = {
    west: 5.5,
    south: 47.0,
    east: 15.5,
    north: 55.5,
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const hashToCoord = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const x = 8 + (hash % 84);
    const y = 8 + ((Math.floor(hash / 97)) % 84);
    return { x, y };
  };

  const latLonToPercent = (lat: number, lon: number) => {
    const x = ((lon - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
    const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
    return {
      x: clamp(x, 4, 96),
      y: clamp(y, 6, 94),
    };
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kat = params.get('kategorie');
    if (kat) setSelectedKategorien([kat]);
  }, []);

  useEffect(() => {
    const savedRole = sessionStorage.getItem('userRole');
    const savedName = sessionStorage.getItem('userName');
    const savedUserId = parseInt(sessionStorage.getItem('userId') || '', 10);
    setRole(savedRole);
    setUserName(savedName);
    setUserId(Number.isNaN(savedUserId) ? null : savedUserId);

    if (!Number.isNaN(savedUserId) && savedUserId > 0) {
      getStoredProfileData(savedUserId).then((profileRes) => {
        if (profileRes.success && profileRes.data?.role) {
          const resolvedRole = String(profileRes.data.role).trim().toLowerCase();
          setRole(resolvedRole);
          sessionStorage.setItem('userRole', resolvedRole);
        }

        if (profileRes.success && profileRes.data) {
          const prefillOrt = [String(profileRes.data.plz || '').trim(), String(profileRes.data.ort || '').trim()].filter(Boolean).join(' ').trim();
          if (prefillOrt) {
            setOrtFilter((prev) => (prev.trim() ? prev : prefillOrt));
            setLocationStatus('granted');
          } else {
            setLocationStatus('unavailable');
          }
        } else {
          setLocationStatus('unavailable');
        }
      }).catch(() => {
        // Keep the session role if the profile lookup fails.
        setLocationStatus('unavailable');
      });
    } else {
      setLocationStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    const loadDbFeed = async () => {
      const userIdRaw = sessionStorage.getItem('userId');
      const viewerUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;

      const res = await getSearchFeed(!Number.isNaN(viewerUserId) ? viewerUserId : null);
      if (!res.success) {
        setFeedError(String(res.error || 'Suche konnte nicht geladen werden.'));
        return;
      }
      if (!Array.isArray(res.items) || res.items.length === 0) {
        setFeedError('Aktuell wurden keine Profile gefunden.');
        return;
      }

      setFeedError('');

      setViewerHasEarlyAccess(Boolean(res.viewerHasEarlyAccess));

      const mapped: SuchEintrag[] = res.items.map((row: any, idx: number) => {
        const profilData = row.profil_data && typeof row.profil_data === 'object' ? row.profil_data : {};
        const angeboteAnzeigen = Array.isArray(profilData.angeboteAnzeigen)
          ? profilData.angeboteAnzeigen
              .map((item: any) => ({
                id: String(item?.id || '').trim(),
                titel: String(item?.titel || '').trim(),
                kategorie: String(item?.kategorie || '').trim(),
                beschreibung: String(item?.beschreibung || '').trim(),
                preise: Array.isArray(item?.preise)
                  ? item.preise
                    .map((preis: any) => `${String(preis?.label || preis?.typ || '').trim()} ${String(preis?.preis || preis?.betrag || '').trim()} ${String(preis?.einheit || preis?.leistung || '').trim()}`.trim())
                      .filter((preis: string) => preis.length > 0)
                  : []
              }))
                .filter((item: { id: string; titel: string; kategorie: string; beschreibung: string; preise: string[] }) => item.id || item.titel || item.kategorie || item.beschreibung || item.preise.length > 0)
          : [];

        const angeboteSuchtext = angeboteAnzeigen
          .map((item: { titel: string; kategorie: string; beschreibung: string; preise: string[] }) => [item.kategorie, item.titel, item.beschreibung, ...item.preise].filter(Boolean).join(' '))
          .join(' | ')
          .trim();

        const mergedKategorien = [
          ...(Array.isArray(row.kategorien) ? row.kategorien : []),
          ...angeboteAnzeigen.map((item: { kategorie: string }) => item.kategorie).filter(Boolean)
        ].filter((item: string, index: number, arr: string[]) => arr.indexOf(item) === index);

        const gesucheText = row.gesuche && typeof row.gesuche === 'object'
          ? Object.entries(row.gesuche)
              .map(([kat, val]: any) => `${kat}: ${val?.titel || ''} ${val?.inhalt || ''}`.trim())
              .join(' | ')
          : '';

        const angebotTextMerged = [row.angebot_text || '', angeboteSuchtext].filter(Boolean).join(' | ').trim();

        return {
          id: `db-${row.user_id}`,
          userId: Number.isInteger(row.user_id) ? row.user_id : null,
          primaryOfferId: angeboteAnzeigen.find((item: { id: string }) => item.id)?.id || null,
          typ: row.role === 'experte' ? 'experte' : 'nutzer',
          name: row.display_name || `${row.vorname || ''} ${row.nachname || ''}`.trim() || `Profil ${row.user_id}`,
          ort: row.ort || 'Unbekannt',
          plz: row.plz || '',
          distanzKm: 5 + ((idx * 17) % 195),
          rating: row.role === 'experte' ? Number(row.verified_rating_avg || 0) : 0,
          verifiedRatingCount: row.role === 'experte' ? Number(row.verified_rating_count || 0) : 0,
          verifiziert: Boolean(row.verifiziert),
          kategorien: mergedKategorien,
          zertifikate: Array.isArray(row.zertifikate) ? row.zertifikate : [],
          angebotText: angebotTextMerged,
          sucheText: row.suche_text || gesucheText || '',
          angeboteCount: angeboteAnzeigen.length,
          planKey: String(row.plan_key || '').trim(),
          boostedUntil: row.active_boost_until || null,
          weeklyAdUntil: row.active_weekly_ad_until || null,
          visibilityScore: Number(row.visibility_score || 0),
          profilePostsCount: Number(row.profile_posts_count || 0),
          profilePostsText: String(row.profile_posts_text || '').trim()
        };
      });

      setEintraege(mapped);

      if (!Number.isNaN(viewerUserId) && viewerUserId > 0) {
        const waitlistRes = await getWaitlistOverviewForViewer(viewerUserId);
        if (waitlistRes.success) {
          setWaitlistCounts(waitlistRes.counts || {});
          setWaitlistJoined(waitlistRes.joined || {});
        }
      }

      const gruppenRes = await getGroupsFeed();
      if (gruppenRes.success && Array.isArray(gruppenRes.groups)) {
        setGruppen(gruppenRes.groups.map((g: any) => ({
          id: Number(g.id),
          name: String(g.name || '').trim(),
          description: g.description ? String(g.description).trim() : null,
          founderName: String(g.founder_name || '').trim(),
          memberCount: Number(g.member_count) || 0
        })));
      }
    };

    loadDbFeed();
  }, []);

  const joinWaitlist = async (eintrag: SuchEintrag) => {
    if (eintrag.typ !== 'experte' || !eintrag.userId) return;

    const userIdRaw = sessionStorage.getItem('userId');
    if (!userIdRaw) {
      alert('Bitte zuerst einloggen, um dich auf die Warteliste zu setzen.');
      return;
    }

    const interestedUserId = parseInt(userIdRaw, 10);
    if (Number.isNaN(interestedUserId)) {
      alert('Session ungültig. Bitte erneut einloggen.');
      return;
    }

    const providerKey = String(eintrag.userId);
    if (waitlistJoined[providerKey]) {
      alert('Du bist bereits auf der Warteliste.');
      return;
    }

    const res = await joinProWaitlist({
      providerUserId: eintrag.userId,
      interestedUserId,
      sourceType: 'profil',
      sourceRef: eintrag.id
    });

    if (!res.success) {
      alert(res.error || 'Warteliste konnte nicht aktualisiert werden.');
      return;
    }

    setWaitlistJoined((prev) => ({ ...prev, [providerKey]: true }));
    setWaitlistCounts((prev) => ({ ...prev, [providerKey]: res.waitlistCount || (prev[providerKey] || 0) + 1 }));
    alert(res.inserted ? 'Auf Warteliste gesetzt. Buchung wurde angelegt.' : 'Bereits auf der Warteliste.');
  };

  const toggleMultiSelect = (current: string[], value: string, setFn: React.Dispatch<React.SetStateAction<string[]>>) => {
    setFn(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const toggleKategorie = (kategorie: string) => {
    setSelectedKategorien((prev) => {
      const isActive = prev.includes(kategorie);
      if (isActive) {
        const themenAusKategorie = ANGEBOT_KATEGORIEN.find((k) => k.label === kategorie)?.themen ?? [];
        const normalized = themenAusKategorie.flatMap((thema) => {
          if (typeof thema === 'string') return [thema];
          if (!thema.subs) return [thema.name];
          return [thema.name, ...thema.subs.map((sub) => `${thema.name}: ${sub}`)];
        });
        setSelectedThemen((themenPrev) => themenPrev.filter((thema) => !normalized.includes(thema)));
      }
      return isActive ? prev.filter((item) => item !== kategorie) : [...prev, kategorie];
    });
  };

  const toggleThema = (kategorie: string, thema: string) => {
    if (!selectedKategorien.includes(kategorie)) {
      setSelectedKategorien((prev) => [...prev, kategorie]);
    }
    setSelectedThemen((prev) => prev.includes(thema) ? prev.filter((item) => item !== thema) : [...prev, thema]);
  };

  const stringMatch = (source: string[], query: string) => {
    const normalizedQuery = query.toLowerCase();
    return source.some((text) => text.toLowerCase().includes(normalizedQuery));
  };

  const togglePanel = (panel: 'fokus' | 'angebote' | 'zertifikate') => {
    setOpenPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const gefilterteEintraege = eintraege.filter((eintrag) => {
    if (inhaltFilter === 'gruppen' || typFilter === 'gruppe') return false;
    const profileTypFilter = inhaltFilter === 'profile' && (typFilter === 'experte' || typFilter === 'nutzer') ? typFilter : 'alle';
    const passtTyp = profileTypFilter === 'alle' || eintrag.typ === profileTypFilter;
    const passtInhalt =
      inhaltFilter === '' ||
      inhaltFilter === 'profile' ||
      (inhaltFilter === 'angebote' ? eintrag.typ === 'experte' :
        inhaltFilter === 'suchen' ? eintrag.typ === 'nutzer' :
        inhaltFilter === 'beitraege' ? eintrag.profilePostsCount > 0 :
        true);
    const suchfelder = [
      eintrag.name,
      eintrag.ort,
      eintrag.plz || '',
      ...eintrag.kategorien,
      ...eintrag.zertifikate,
      eintrag.angebotText,
      eintrag.sucheText,
      eintrag.profilePostsText
    ];

    const passtKategorie = selectedKategorien.length === 0 || selectedKategorien.some((kat) => stringMatch(suchfelder, kat));
    const passtThema = selectedThemen.length === 0 || selectedThemen.some((thema) => stringMatch(suchfelder, thema));

    const ortText = `${eintrag.plz || ''} ${eintrag.ort}`.toLowerCase();
    const ignoreOrtFilterForPosts = inhaltFilter === 'beitraege';
    const passtOrt = ignoreOrtFilterForPosts || !ortFilter.trim() || ortText.includes(ortFilter.trim().toLowerCase());
    const passtZertifikate =
      selectedZertifikate.length === 0 ||
      (eintrag.typ === 'experte' && selectedZertifikate.some((z) => stringMatch(suchfelder, z)));
    const passtUmkreis = umkreisKm === null || eintrag.distanzKm <= umkreisKm;

    const query = suchbegriff.trim().toLowerCase();
    const textIndex = suchfelder.join(' ').toLowerCase();
    const passtText = !query || textIndex.includes(query);

    return passtTyp && passtInhalt && passtKategorie && passtThema && passtOrt && passtZertifikate && passtUmkreis && passtText;
  });

  const mapPins = useMemo(() => {
    const grouped = new Map<string, {
      key: string;
      locationKey: string;
      title: string;
      profileHref: string;
      offerHref: string;
      hasOffer: boolean;
      count: number;
    }>();

    gefilterteEintraege
      .filter((eintrag) => eintrag.typ === 'experte' && eintrag.userId && Number(eintrag.userId) > 0)
      .forEach((eintrag) => {
        const locationKey = `${String(eintrag.plz || '').trim()}|${String(eintrag.ort || '').trim().toLowerCase()}`;
        if (!locationKey.trim()) return;

        const profileHref = `/profil/${eintrag.userId}`;
        const offerHref = eintrag.primaryOfferId
          ? `/anzeige/${eintrag.userId}/${encodeURIComponent(eintrag.primaryOfferId)}`
          : profileHref;

        const existing = grouped.get(locationKey);
        if (!existing) {
          grouped.set(locationKey, {
            key: `ort-${locationKey}`,
            locationKey,
            title: `${eintrag.plz ? `${eintrag.plz} ` : ''}${eintrag.ort}`.trim() || eintrag.name,
            profileHref,
            offerHref,
            hasOffer: Boolean(eintrag.primaryOfferId),
            count: 1,
          });
        } else {
          grouped.set(locationKey, {
            ...existing,
            count: existing.count + 1,
            hasOffer: existing.hasOffer || Boolean(eintrag.primaryOfferId),
          });
        }
      });

    return Array.from(grouped.values());
  }, [gefilterteEintraege, inhaltFilter]);

  useEffect(() => {
    const missingKeys = Array.from(new Set(mapPins.map((pin) => pin.locationKey))).filter((key) => !mapCoordsByLocation[key]);
    if (missingKeys.length === 0) return;

    setMapCoordsByLocation((prev) => {
      const next = { ...prev };
      missingKeys.forEach((key) => {
        if (!next[key]) {
          const fallback = hashToCoord(key);
          next[key] = { x: fallback.x, y: fallback.y, exact: false };
        }
      });
      return next;
    });

    const controller = new AbortController();

    const resolveCoords = async () => {
      const updates: Record<string, { x: number; y: number; exact: boolean }> = {};

      await Promise.all(
        missingKeys.map(async (key) => {
          const [plz, ort] = key.split('|');
          const query = [plz, ort, 'Deutschland'].filter(Boolean).join(' ').trim();
          if (!query) return;

          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=de&limit=1&q=${encodeURIComponent(query)}`,
              { signal: controller.signal }
            );
            if (!response.ok) return;
            const items = await response.json();
            if (!Array.isArray(items) || items.length === 0) return;
            const lat = Number(items[0]?.lat);
            const lon = Number(items[0]?.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
            const pos = latLonToPercent(lat, lon);
            updates[key] = { x: pos.x, y: pos.y, exact: true };
          } catch {
            // Fallback positions stay active when geocoding fails.
          }
        })
      );

      if (Object.keys(updates).length > 0) {
        setMapCoordsByLocation((prev) => ({ ...prev, ...updates }));
      }
    };

    resolveCoords();
    return () => controller.abort();
  }, [mapPins, mapCoordsByLocation]);

  const addToWishlist = async (typ: 'person' | 'anzeige', eintrag: SuchEintrag) => {
    const userIdRaw = sessionStorage.getItem('userId');
    if (!userIdRaw) {
      alert('Bitte zuerst einloggen, um zur Merkliste hinzuzufügen.');
      return;
    }

    const userId = parseInt(userIdRaw, 10);
    if (Number.isNaN(userId)) {
      alert('Session ungültig. Bitte erneut einloggen.');
      return;
    }

    const content = typ === 'person'
      ? (eintrag.typ === 'experte' ? 'Expertenprofil' : 'Nutzerprofil')
      : (eintrag.typ === 'experte' ? eintrag.angebotText : eintrag.sucheText);

    const dbRes = await addWishlistItem(userId, {
      typ,
      profilTyp: eintrag.typ,
      sourceId: `${typ}-${eintrag.id}`,
      name: eintrag.name,
      ort: eintrag.ort,
      plz: eintrag.plz || '',
      kategorieText: eintrag.kategorien.join(', '),
      content
    });

    if (!dbRes.success) {
      alert(dbRes.error || 'Merkliste konnte nicht gespeichert werden.');
      return;
    }

    alert(dbRes.inserted ? 'Zur Merkliste hinzugefügt.' : 'Bereits in der Merkliste.');
  };

  const connectToUser = async (eintrag: SuchEintrag) => {
    if (!userId) {
      alert('Bitte zuerst einloggen, um dich zu vernetzen.');
      return;
    }
    if (!eintrag.userId) {
      alert('Dieses Profil kann aktuell nicht vernetzt werden.');
      return;
    }
    if (eintrag.userId === userId) {
      alert('Du kannst dich nicht mit dir selbst vernetzen.');
      return;
    }

    const res = await sendConnectionRequest({ requesterId: userId, targetUserId: eintrag.userId });
    if (!res.success) {
      alert(res.error || 'Vernetzungsanfrage fehlgeschlagen.');
      return;
    }

    if (res.status === 'accepted') {
      alert('Ihr seid jetzt vernetzt.');
      return;
    }

    alert('Vernetzungsanfrage gesendet.');
  };

  const clearAllFilters = () => {
    setSelectedKategorien([]);
    setSelectedThemen([]);
    setSelectedZertifikate([]);
    setTypFilter('alle');
    setInhaltFilter('');
    setSuchbegriff('');
    setOrtFilter('');
    setUmkreisKm(null);
  };

  const joinGroup = async (group: GruppeEintrag) => {
    if (!userId) {
      alert('Bitte zuerst einloggen, um einer Gruppe beizutreten.');
      return;
    }
    if (joinedGroupIds.has(group.id)) {
      alert('Du bist bereits Mitglied dieser Gruppe.');
      return;
    }
    const res = await joinNetworkGroup({ groupId: group.id, userId });
    if (!res.success) {
      alert(res.error || 'Beitritt fehlgeschlagen.');
      return;
    }
    setJoinedGroupIds((prev) => new Set([...prev, group.id]));
    setGruppen((prev) => prev.map((g) => g.id === group.id ? { ...g, memberCount: g.memberCount + 1 } : g));
  };

  const gefilterteGruppen = gruppen.filter((gruppe) => {
    if (!(inhaltFilter === '' || inhaltFilter === 'gruppen')) return false;
    const query = suchbegriff.trim().toLowerCase();
    if (!query) return true;
    return (
      gruppe.name.toLowerCase().includes(query) ||
      (gruppe.description || '').toLowerCase().includes(query) ||
      gruppe.founderName.toLowerCase().includes(query)
    );
  });

  const openProfileTarget = (eintrag: SuchEintrag, target: 'profil' | 'beitraege' | 'anzeigen') => {
    if (!eintrag.userId) {
      alert('Profil kann aktuell nicht geöffnet werden.');
      return;
    }

    if (target === 'anzeigen' && eintrag.userId && eintrag.primaryOfferId) {
      router.push(`/anzeige/${eintrag.userId}/${encodeURIComponent(eintrag.primaryOfferId)}`);
      return;
    }

    const hash = target === 'profil' ? '' : `#${target}`;
    router.push(`/profil/${eintrag.userId}${hash}`);
  };

  const openEintragCard = (eintrag: SuchEintrag) => {
    const openAnzeige = inhaltFilter === 'angebote' && eintrag.typ === 'experte' && Boolean(eintrag.primaryOfferId);
    openProfileTarget(eintrag, openAnzeige ? 'anzeigen' : 'profil');
  };

  const toggleCardWishlist = async (eintrag: SuchEintrag) => {
    const isAnzeigeMode = inhaltFilter === 'angebote' && eintrag.typ === 'experte' && Boolean(eintrag.primaryOfferId);
    await addToWishlist(isAnzeigeMode ? 'anzeige' : 'person', eintrag);
  };

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      router.push(`/profil/${parsedUserId}`);
      return;
    }
    router.push('/login');
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  const filterPanel = (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => togglePanel('fokus')}
          className="w-full px-4 py-4 flex items-center justify-between bg-slate-50"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fokus</p>
          {openPanels.fokus ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openPanels.fokus && (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[{ key: 'profile', title: 'Profile', text: 'Personen finden' }, { key: 'angebote', title: 'Angebote', text: 'Leistungen sehen' }, { key: 'suchen', title: 'Suchen', text: 'Gesuche sehen' }, { key: 'beitraege', title: 'Beiträge', text: 'Profilbeiträge finden' }].map((item) => (
                <div
                  key={item.key}
                  className={`rounded-xl border p-2 ${inhaltFilter === item.key ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                >
                  <p className="text-[9px] font-black uppercase text-slate-700">{item.title}</p>
                  <p className="text-[8px] font-bold uppercase text-slate-400 mt-1">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setInhaltFilter(''); setTypFilter('alle'); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${inhaltFilter === '' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                Nichts ausgewählt
              </button>
              <button
                type="button"
                onClick={() => { setInhaltFilter('profile'); if (typFilter === 'gruppe') setTypFilter('alle'); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${inhaltFilter === 'profile' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setInhaltFilter('gruppen');
                  setTypFilter('gruppe');
                }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${inhaltFilter === 'gruppen' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                Gruppen
              </button>
              <button
                type="button"
                onClick={() => { setInhaltFilter('angebote'); setTypFilter('alle'); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${inhaltFilter === 'angebote' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                Angebote
              </button>
              <button
                type="button"
                onClick={() => { setInhaltFilter('suchen'); setTypFilter('alle'); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${inhaltFilter === 'suchen' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                Suchen
              </button>
              <button
                type="button"
                onClick={() => { setInhaltFilter('beitraege'); setTypFilter('alle'); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${inhaltFilter === 'beitraege' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
              >
                Beiträge
              </button>
            </div>

            {inhaltFilter === 'profile' && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Profiltyp (optional)</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTypFilter('alle')}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${typFilter === 'alle' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Alle Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypFilter('experte')}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${typFilter === 'experte' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Experten
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypFilter('nutzer')}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${typFilter === 'nutzer' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    Nutzer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => togglePanel('angebote')}
          className="w-full px-4 py-4 flex items-center justify-between bg-slate-50"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kategorien</p>
          {openPanels.angebote ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openPanels.angebote && (
          <div className="p-4">
            <div className="space-y-3">
          {ANGEBOT_KATEGORIEN.map((kategorie) => {
            const aktiv = selectedKategorien.includes(kategorie.label);
            return (
              <div key={kategorie.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                <button
                  type="button"
                  onClick={() => toggleKategorie(kategorie.label)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left border transition-all ${aktiv ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                  <span className="text-sm mr-2 font-black">{kategorie.label.slice(0, 1)}</span>
                  <span className="flex-1 text-[10px] font-black uppercase tracking-tight">{kategorie.label}</span>
                  <span className="text-[9px] font-black uppercase">{aktiv ? 'Aktiv' : 'Wählen'}</span>
                </button>

                {aktiv && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kategorie.themen.map((thema, idx) => {
                      if (typeof thema === 'string') {
                        return (
                          <button
                            key={`${kategorie.label}-${thema}-${idx}`}
                            type="button"
                            onClick={() => toggleThema(kategorie.label, thema)}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${selectedThemen.includes(thema) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                          >
                            {thema}
                          </button>
                        );
                      }

                      const hauptToken = thema.name;
                      const hauptAktiv = selectedThemen.includes(hauptToken);

                      return (
                        <div key={`${kategorie.label}-${thema.name}-${idx}`} className="w-full rounded-xl border border-slate-200 bg-white p-2">
                          <button
                            type="button"
                            onClick={() => toggleThema(kategorie.label, hauptToken)}
                            className={`w-full px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${hauptAktiv ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                          >
                            {thema.name}
                          </button>

                          {thema.subs && hauptAktiv && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {thema.subs.map((sub) => {
                                const subToken = `${thema.name}: ${sub}`;
                                const subAktiv = selectedThemen.includes(subToken);
                                return (
                                  <button
                                    key={subToken}
                                    type="button"
                                    onClick={() => toggleThema(kategorie.label, subToken)}
                                    className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase border transition-all ${subAktiv ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                  >
                                    {sub}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => togglePanel('zertifikate')}
          className="w-full px-4 py-4 flex items-center justify-between bg-slate-50"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Zertifikate</p>
          {openPanels.zertifikate ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {openPanels.zertifikate && (
          <div className="p-4">
            <div className="space-y-2">
          {Object.entries(ZERTIFIKAT_KATEGORIEN).map(([bereich, content]) => {
            const offen = openFilterBereich === bereich;
            return (
              <div key={bereich} className="rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFilterBereich(offen ? null : bereich)}
                  className={`w-full px-4 py-3 flex justify-between items-center ${offen ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'}`}
                >
                  <span className="text-[10px] font-black uppercase italic tracking-tight text-left">{bereich}</span>
                  {offen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {offen && (
                  <div className="p-3 bg-white space-y-3 max-h-[320px] overflow-y-auto">
                    {Array.isArray(content) && content.map((item) => {
                      if (item === 'Sonstiges' || isSonstigesFreitextToken(item)) return null;
                      const aktiv = selectedZertifikate.includes(item);
                      return (
                        <button
                          key={`${bereich}-${item}`}
                          type="button"
                          onClick={() => toggleMultiSelect(selectedZertifikate, item, setSelectedZertifikate)}
                          className={`mr-2 mb-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase border ${aktiv ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                          {item}
                        </button>
                      );
                    })}

                    {!Array.isArray(content) && typeof content === 'object' && content !== null && Object.entries(content).map(([subCat, items]) => {
                      if (subCat === 'Sonstiges') return null;
                      return (
                      <div key={`${bereich}-${subCat}`} className="rounded-lg border border-slate-100 p-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-2">{subCat}</p>

                        {Array.isArray(items) && (
                          <div className="flex flex-wrap gap-2">
                            {items.map((item) => {
                              if (String(item) === 'Sonstiges' || isSonstigesFreitextToken(String(item))) return null;
                              const token = `${subCat}: ${item}`;
                              const aktiv = selectedZertifikate.includes(token);
                              return (
                                <button
                                  key={`${bereich}-${subCat}-${item}`}
                                  type="button"
                                  onClick={() => toggleMultiSelect(selectedZertifikate, token, setSelectedZertifikate)}
                                  className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase border ${aktiv ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {items && typeof items === 'object' && !Array.isArray(items) && (
                          <div className="flex flex-wrap gap-2">
                            {Object.values(items).map((value) => {
                              if (typeof value !== 'string') return null;
                              if (isSonstigesFreitextToken(value)) return null;
                              const token = `${subCat}: ${value}`;
                              const aktiv = selectedZertifikate.includes(token);
                              return (
                                <button
                                  key={`${bereich}-${subCat}-${value}`}
                                  type="button"
                                  onClick={() => toggleMultiSelect(selectedZertifikate, token, setSelectedZertifikate)}
                                  className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase border ${aktiv ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {items === null && (
                          <button
                            type="button"
                            onClick={() => toggleMultiSelect(selectedZertifikate, subCat, setSelectedZertifikate)}
                            className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase border ${selectedZertifikate.includes(subCat) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                          >
                            {subCat}
                          </button>
                        )}
                      </div>
                    );})}
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Umkreis</p>
        {locationStatus === 'unavailable' && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">
              Profil-Standort nicht verfügbar
            </p>
            <p className="text-[9px] font-medium text-amber-600 mt-1 leading-relaxed">
              Bitte Ort/PLZ im Profil hinterlegen oder das Ortsfeld manuell ausfüllen.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUmkreisKm(null)}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${umkreisKm === null ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
          >
            Alle
          </button>
          {UMKREIS_OPTIONEN.map((km) => (
            <button
              key={`radius-${km}`}
              type="button"
              onClick={() => setUmkreisKm(km)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${umkreisKm === km ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Filter zurücksetzen
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/dashboard/rechnungen'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Rechnungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/netzwerk'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/nachrichten'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/merkliste'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/einstellungen'); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push('/kontakt'); }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Kontakt & FAQ</button>
        </nav>
        {role && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <header className="bg-white border-b z-20 shadow-sm">
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors">
              <div className="w-6 h-0.5 bg-slate-900 mb-1.5" />
              <div className="w-4 h-0.5 bg-slate-900" />
            </button>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="bg-slate-900 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2"
            >
              <Filter size={14} /> Filter
            </button>
            <div className="hidden xl:block pl-2 pr-4 border-r border-slate-100">
              <span className="font-black text-emerald-600 text-xl tracking-tighter italic uppercase">Equily</span>
            </div>
          </div>

          <div className="flex-1 flex gap-2 min-w-0">
            <div className="flex-1 relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Suche oder Angebot (z.B. Dressur, Beritt, Jungpferd)" 
                value={suchbegriff}
                onChange={(e) => setSuchbegriff(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-emerald-200 outline-none font-bold transition-all text-xs"
              />
            </div>
            <div className="flex-1 relative group max-w-[200px]">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Ort / PLZ" 
                value={ortFilter}
                onChange={(e) => setOrtFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-emerald-200 outline-none font-bold transition-all text-xs"
              />
            </div>
            <div className="w-[118px] relative">
              <select
                value={umkreisKm ?? ''}
                onChange={(e) => setUmkreisKm(e.target.value ? Number(e.target.value) : null)}
                title={locationStatus === 'unavailable' ? 'Profil-Standort nicht hinterlegt' : undefined}
                className="w-full px-3 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-emerald-200 outline-none font-black text-[10px] uppercase tracking-widest text-slate-600"
              >
                <option value="">Alle km</option>
                {UMKREIS_OPTIONEN.map((km) => (
                  <option key={km} value={km}>{km} km</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMapOpen((prev) => !prev)}
              className="hidden lg:flex bg-white border border-slate-200 px-4 py-3 rounded-xl font-black uppercase text-[10px] items-center gap-2 text-slate-700 hover:border-emerald-300"
            >
              {mapOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              Karte
            </button>
            <button
              type="button"
              onClick={() => setMobileMapOpen(true)}
              className="lg:hidden bg-white border border-slate-200 px-3 py-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 text-slate-700"
            >
              <MapPin size={14} /> Karte
            </button>

            {role ? (
              <>
                <NotificationBell userId={userId} />
                <button
                  type="button"
                  onClick={openProfile}
                  aria-label="Profil öffnen"
                  className="w-11 h-11 bg-slate-900 rounded-full flex items-center justify-center text-white font-black border-4 border-emerald-500 shadow-lg hover:scale-105 transition-transform"
                >
                  {userName?.[0] || 'P'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase"
              >
                Einloggen
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow flex overflow-hidden">
        <section className={`overflow-y-auto p-4 bg-slate-50/50 space-y-4 ${mapOpen ? 'w-full lg:basis-[60%] lg:shrink-0' : 'flex-1'}`}>
          <div className="flex justify-between items-center mb-3 px-1">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Ergebnisse</h2>
              <p className="text-base font-black italic uppercase text-slate-900">Treffer ({gefilterteEintraege.length + gefilterteGruppen.length})</p>
            </div>
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
              {selectedKategorien.length > 0 ? `${selectedKategorien.length} Kategorien` : 'Alle Kategorien'}
            </div>
          </div>

          {viewerHasEarlyAccess && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="text-emerald-600 font-black mt-0.5">🕐</span>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">24h Frühzugriff aktiv</p>
                  <p className="text-[9px] font-medium text-emerald-600 mt-0.5 leading-relaxed">Du siehst neue Angebote 24 Stunden früher als andere Nutzer.</p>
                </div>
              </div>
            </div>
          )}

          {feedError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {feedError}
            </div>
          )}

          <div className={mapOpen ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
          {gefilterteEintraege.map((eintrag) => {
            const hasBoost = Boolean(eintrag.boostedUntil && new Date(eintrag.boostedUntil).getTime() > Date.now());
            const hasWeeklyAd = Boolean(eintrag.weeklyAdUntil && new Date(eintrag.weeklyAdUntil).getTime() > Date.now());

            return (
            <div
              key={eintrag.id}
              role="button"
              tabIndex={0}
              onClick={() => openEintragCard(eintrag)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openEintragCard(eintrag);
                }
              }}
              className={`bg-white rounded-[2rem] p-5 border shadow-sm hover:shadow-xl transition-all group cursor-pointer relative overflow-hidden h-full ${hasBoost ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-100 hover:border-emerald-100'}`}
            >
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-full sm:w-28 h-28 bg-slate-100 rounded-[1.25rem] flex-shrink-0 overflow-hidden relative">
                   <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-3xl italic">E</div>
                   <div className="absolute top-2 left-2 bg-emerald-500 text-white p-1 rounded-md shadow-lg">
                      <ShieldCheck size={14} />
                   </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      {eintrag.verifiziert ? <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest px-2 py-1 bg-emerald-50 rounded-lg">Verifiziert</span> : null}
                      {hasBoost ? <span className="text-[8px] font-black uppercase text-white tracking-widest px-2 py-1 bg-emerald-600 rounded-lg">Hochgeschoben</span> : null}
                      {hasWeeklyAd ? <span className="text-[8px] font-black uppercase text-violet-700 tracking-widest px-2 py-1 bg-violet-100 rounded-lg">Startseitenwerbung</span> : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleCardWishlist(eintrag);
                        }}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 flex items-center justify-center"
                        title={inhaltFilter === 'angebote' ? 'Anzeige merken' : 'Profil merken'}
                        aria-label={inhaltFilter === 'angebote' ? 'Anzeige merken' : 'Profil merken'}
                      >
                        <Heart size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void connectToUser(eintrag);
                        }}
                        className="w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 flex items-center justify-center"
                        title="Vernetzen"
                        aria-label="Vernetzen"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-black italic uppercase text-slate-900 mt-2 group-hover:text-emerald-600 transition-colors leading-none">{eintrag.name}</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tight mt-1 flex items-center gap-1">
                    <span className="text-emerald-600">●</span> {eintrag.kategorien.join(' • ')}
                  </p>

                  <p className="text-[10px] mt-2 font-medium text-slate-600 leading-relaxed">
                    {eintrag.typ === 'experte'
                      ? `Angebot: ${eintrag.angebotText || 'Ohne Details'}`
                      : `Suche: ${eintrag.sucheText}`}
                  </p>
                  {eintrag.typ === 'experte' && eintrag.angeboteCount > 0 && (
                    <p className="text-[9px] mt-1 font-black uppercase tracking-widest text-emerald-700">
                      {eintrag.angeboteCount} Anzeige(n) verfügbar
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {eintrag.kategorien.map((kat) => (
                      <span key={`${eintrag.id}-${kat}`} className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                        {kat}
                      </span>
                    ))}
                    {eintrag.typ === 'experte' && eintrag.zertifikate.filter((zertifikat) => !isSonstigesFreitextToken(zertifikat)).slice(0, 4).map((zertifikat) => (
                      <span key={`${eintrag.id}-${zertifikat}`} className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                        {zertifikat}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-5 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                      <MapPin size={14} className="text-emerald-500" /> {eintrag.plz ? `${eintrag.plz} ` : ''}{eintrag.ort}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                      <Navigation size={14} className="text-slate-300" /> {locationStatus === 'unavailable' ? `${eintrag.distanzKm} km (ohne Profil-Standort)` : `${eintrag.distanzKm} km entfernt`}
                    </div>
                    {hasBoost && eintrag.boostedUntil ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
                        <span>▲</span> Aktiv bis {new Date(eintrag.boostedUntil).toLocaleDateString('de-DE')}
                      </div>
                    ) : null}
                    {eintrag.typ === 'experte' && eintrag.userId && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                        <span className="text-emerald-600">●</span> Warteliste: {waitlistCounts[String(eintrag.userId)] || 0}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3" onClick={(event) => event.stopPropagation()}>
                    {eintrag.profilePostsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => openProfileTarget(eintrag, 'beitraege')}
                        className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        Vollständigen Beitrag öffnen
                      </button>
                    )}
                    {eintrag.typ === 'experte' && eintrag.angeboteCount > 0 && eintrag.primaryOfferId && (
                      <button
                        type="button"
                        onClick={() => openProfileTarget(eintrag, 'anzeigen')}
                        className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        Zur Anzeige
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );})}
          </div>

          {gefilterteEintraege.length === 0 && gefilterteGruppen.length === 0 && (
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 text-center">
              <p className="text-sm font-black uppercase text-slate-500">Keine Treffer für diese Filter gefunden</p>
            </div>
          )}

          {gefilterteGruppen.length > 0 && (
            <>
              {typFilter !== 'gruppe' && gefilterteEintraege.length > 0 && (
                <div className="px-1 pt-2 pb-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gruppen</p>
                </div>
              )}
              {gefilterteGruppen.map((gruppe) => {
                const isJoined = joinedGroupIds.has(gruppe.id);
                return (
                  <div key={`gruppe-${gruppe.id}`} className="bg-white rounded-[2rem] p-5 border border-violet-100 shadow-sm hover:shadow-xl hover:border-violet-200 transition-all cursor-pointer relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-5">
                      <div className="w-full sm:w-28 h-28 bg-violet-50 rounded-[1.25rem] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        <span className="text-4xl font-black italic text-violet-300">{gruppe.name.slice(0, 1).toUpperCase()}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[8px] font-black uppercase text-violet-600 tracking-widest px-2 py-1 bg-violet-50 rounded-lg">Gruppe</span>
                          <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest px-2 py-1 bg-slate-50 rounded-lg">{gruppe.memberCount} Mitglied{gruppe.memberCount !== 1 ? 'er' : ''}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/netzwerk/gruppen/${gruppe.id}`)}
                          className="text-left"
                        >
                          <h3 className="text-xl font-black italic uppercase text-slate-900 mt-2 hover:text-violet-600 transition-colors leading-none">{gruppe.name}</h3>
                        </button>
                        {gruppe.description && (
                          <p className="text-[10px] mt-2 font-medium text-slate-600 leading-relaxed line-clamp-2">{gruppe.description}</p>
                        )}
                        <p className="text-[9px] mt-2 font-black uppercase tracking-widest text-slate-400">Gegründet von {gruppe.founderName}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/netzwerk/gruppen/${gruppe.id}`)}
                            className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest bg-white border border-violet-200 text-violet-700 hover:bg-violet-50"
                          >
                            Gruppe öffnen
                          </button>
                          <button
                            type="button"
                            onClick={() => joinGroup(gruppe)}
                            disabled={isJoined}
                            className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-colors disabled:opacity-60 ${isJoined ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-violet-600 border-violet-600 text-white hover:bg-violet-500'}`}
                          >
                            {isJoined ? 'Bereits beigetreten' : 'Beitreten'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>

        {mapOpen && (
          <section className="hidden lg:block flex-1 bg-slate-200 relative">
            <iframe
              title="Karte"
              className="absolute inset-0 w-full h-full [filter:grayscale(88%)_brightness(1.08)_contrast(0.82)_saturate(0.55)]"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=5.5%2C47.0%2C15.5%2C55.5&layer=mapnik"
            />

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/30 via-white/5 to-slate-900/5" />

            <div className="absolute inset-0 z-[2] pointer-events-none">
              {mapPins.map((pin) => {
                const coords = mapCoordsByLocation[pin.locationKey] || (() => {
                  const fallback = hashToCoord(pin.locationKey);
                  return { x: fallback.x, y: fallback.y, exact: false };
                })();
                const isActive = activeMapPinKey === pin.key;
                const defaultHref = inhaltFilter === 'angebote' ? pin.offerHref : pin.profileHref;

                return (
                  <div key={pin.key} style={{ left: `${coords.x}%`, top: `${coords.y}%` }} className="absolute -translate-x-1/2 -translate-y-full">
                    <button
                      type="button"
                      onClick={() => setActiveMapPinKey((prev) => (prev === pin.key ? null : pin.key))}
                      title={`${pin.title} (${pin.count})`}
                      className={`pointer-events-auto h-9 min-w-9 px-2 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-500'}`}
                    >
                      <MapPin size={14} />
                      {pin.count > 1 ? <span className="ml-1 text-[9px] font-black">{pin.count}</span> : null}
                    </button>

                    {isActive && (
                      <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-24 w-52 rounded-xl border border-slate-200 bg-white shadow-xl p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">{pin.title}</p>
                        <p className="text-[9px] text-slate-500 mt-1">{pin.count} Expert{pin.count === 1 ? '' : 'en'} an diesem Ort</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMapPinKey(null);
                              router.push(pin.profileHref);
                            }}
                            className="flex-1 px-2 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-widest"
                          >
                            Profil
                          </button>
                          {pin.hasOffer && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMapPinKey(null);
                                router.push(pin.offerHref);
                              }}
                              className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest"
                            >
                              Anzeige
                            </button>
                          )}
                        </div>
                        {!pin.hasOffer && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMapPinKey(null);
                              router.push(defaultHref);
                            }}
                            className="mt-2 w-full px-2 py-2 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest"
                          >
                            Öffnen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {activeMapPinKey && (
              <button
                type="button"
                aria-label="Karten-Popup schließen"
                onClick={() => setActiveMapPinKey(null)}
                className="absolute inset-0 z-[1] pointer-events-auto"
              />
            )}

            {/* Entfernt: Banner mit "Alle Entfernungen • X Pins" */}
          </section>
        )}

      </main>

      {mobileMapOpen && (
        <div className="fixed inset-0 z-80 lg:hidden">
          <button
            type="button"
            aria-label="Karte schließen"
            onClick={() => {
              setActiveMapPinKey(null);
              setMobileMapOpen(false);
            }}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute left-0 right-0 bottom-0 h-[72vh] bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Karte</p>
              <button
                type="button"
                onClick={() => {
                  setActiveMapPinKey(null);
                  setMobileMapOpen(false);
                }}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="relative h-[calc(72vh-52px)] bg-slate-200">
              <iframe
                title="Mobile Karte"
                className="absolute inset-0 w-full h-full [filter:grayscale(88%)_brightness(1.08)_contrast(0.82)_saturate(0.55)]"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=5.5%2C47.0%2C15.5%2C55.5&layer=mapnik"
              />

              <div className="absolute inset-0 z-[2] pointer-events-none">
                {mapPins.map((pin) => {
                  const coords = mapCoordsByLocation[pin.locationKey] || (() => {
                    const fallback = hashToCoord(pin.locationKey);
                    return { x: fallback.x, y: fallback.y, exact: false };
                  })();
                  const isActive = activeMapPinKey === pin.key;
                  const defaultHref = inhaltFilter === 'angebote' ? pin.offerHref : pin.profileHref;

                  return (
                    <div key={`mobile-${pin.key}`} style={{ left: `${coords.x}%`, top: `${coords.y}%` }} className="absolute -translate-x-1/2 -translate-y-full">
                      <button
                        type="button"
                        onClick={() => setActiveMapPinKey((prev) => (prev === pin.key ? null : pin.key))}
                        title={`${pin.title} (${pin.count})`}
                        className={`pointer-events-auto h-9 min-w-9 px-2 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-500'}`}
                      >
                        <MapPin size={14} />
                        {pin.count > 1 ? <span className="ml-1 text-[9px] font-black">{pin.count}</span> : null}
                      </button>

                      {isActive && (
                        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-24 w-52 rounded-xl border border-slate-200 bg-white shadow-xl p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">{pin.title}</p>
                          <p className="text-[9px] text-slate-500 mt-1">{pin.count} Expert{pin.count === 1 ? '' : 'en'} an diesem Ort</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMapPinKey(null);
                                setMobileMapOpen(false);
                                router.push(pin.profileHref);
                              }}
                              className="flex-1 px-2 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-widest"
                            >
                              Profil
                            </button>
                            {pin.hasOffer && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMapPinKey(null);
                                  setMobileMapOpen(false);
                                  router.push(pin.offerHref);
                                }}
                                className="flex-1 px-2 py-2 rounded-lg border border-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-widest"
                              >
                                Anzeige
                              </button>
                            )}
                          </div>
                          {!pin.hasOffer && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMapPinKey(null);
                                setMobileMapOpen(false);
                                router.push(defaultHref);
                              }}
                              className="mt-2 w-full px-2 py-2 rounded-lg bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest"
                            >
                              Öffnen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {mobileFilterOpen && (
        <div className="fixed inset-0 z-80">
          <button
            type="button"
            aria-label="Filter schließen"
            onClick={() => setMobileFilterOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute left-0 top-0 h-full w-[92%] max-w-md bg-slate-50 border-r border-slate-200 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filter</p>
                <p className="text-sm font-black italic uppercase text-slate-900">Suche anpassen</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 pb-24">
              {filterPanel}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldCheck({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}