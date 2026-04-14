"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ANGEBOT_KATEGORIEN } from '../suche/kategorien-daten';
import { getStoredProfileData, getUserPromotionSettings, saveExpertProfileData, trackInteractionShare, uploadNetworkMedia } from '../actions';
import { ChevronLeft, Eye, Heart, MapPin, Plus, Share2, Trash2 } from 'lucide-react';
import LoggedInHeader from '../components/logged-in-header';
import MediaDropzone from '../components/media-dropzone';

type PriceRow = {
  id: string;
  typ: 'einzel' | 'gruppe';
  betrag: string;
  leistung: string;
  anzahlLeistungen: string;
};

type AdItem = {
  id: string;
  titel: string;
  kategorie: string;
  modus: 'mobil' | 'vor_ort';
  mobilRadiusKm: string;
  beschreibung: string;
  titleImageUrl: string;
  mediaItems: Array<{ url: string; mediaType: 'image' | 'video' }>;
  preise: PriceRow[];
  billingType: 'einmal' | 'abo';
  sessionsPerAbo: string;
  singleSessionCancellationAllowed: boolean;
  maxCancellationsPerAbo: string;
  cancellationWindowHours: string;
  billingNotes: string;
  visibility: 'public' | 'draft';
  viewsCount: number;
  wishlistCount: number;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_PRICE_ROW = (): PriceRow => ({
  id: `price-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  typ: 'einzel',
  betrag: '',
  leistung: '',
  anzahlLeistungen: ''
});

const MOBIL_RADIUS_OPTIONS = ['5', '10', '15', '20', '25', '30', '40', '50'];

export default function InserierenPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerName, setViewerName] = useState('Profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasExpertProAccess, setHasExpertProAccess] = useState(false);
  const [profilMeta, setProfilMeta] = useState<{ name: string; ort: string; plz: string; kategorien: string[]; zertifikate: string[]; angebotText: string; profilData: Record<string, any> }>({
    name: '',
    ort: '',
    plz: '',
    kategorien: [],
    zertifikate: [],
    angebotText: '',
    profilData: {}
  });
  const [ads, setAds] = useState<AdItem[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<'public' | 'draft'>('public');
  const [formData, setFormData] = useState({
    titel: '',
    kategorie: '',
    modus: 'vor_ort' as 'mobil' | 'vor_ort',
    mobilRadiusKm: '',
    beschreibung: '',
    titleImageUrl: '',
    billingType: 'einmal' as 'einmal' | 'abo',
    sessionsPerAbo: '',
    singleSessionCancellationAllowed: false,
    maxCancellationsPerAbo: '',
    cancellationWindowHours: '',
    billingNotes: ''
  });
  const [mediaItems, setMediaItems] = useState<Array<{ url: string; mediaType: 'image' | 'video' }>>([]);
  const [preisRows, setPreisRows] = useState<PriceRow[]>([EMPTY_PRICE_ROW()]);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const verfuegbareKategorien = useMemo(() => {
    if (profilMeta.kategorien.length > 0) return profilMeta.kategorien;
    return ANGEBOT_KATEGORIEN.map((kat) => kat.label);
  }, [profilMeta.kategorien]);

  const gefilterteAds = useMemo(() => ads.filter((ad) => ad.visibility === visibilityFilter), [ads, visibilityFilter]);

  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem('userId');
      const roleRaw = String(sessionStorage.getItem('userRole') || '').trim().toLowerCase();
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
      setViewerRole(sessionStorage.getItem('userRole'));
      setViewerName(sessionStorage.getItem('userName') || 'Profil');

      if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
        window.location.href = '/login';
        return;
      }
      if (roleRaw !== 'experte') {
        window.location.href = `/profil/${parsedUserId}`;
        return;
      }

      setUserId(parsedUserId);

      const res = await getStoredProfileData(parsedUserId);
      if (!res.success || !res.data) {
        setError('Profil konnte nicht geladen werden.');
        setLoading(false);
        return;
      }

      const profilData = (res.data.profil_data && typeof res.data.profil_data === 'object') ? res.data.profil_data : {};
      const loadedAds = Array.isArray(profilData.angeboteAnzeigen)
        ? profilData.angeboteAnzeigen.map((item: any, idx: number) => ({
            id: String(item?.id || `ad-${idx}`),
            titel: String(item?.titel || '').trim(),
            kategorie: String(item?.kategorie || '').trim(),
            modus: item?.modus === 'mobil' ? 'mobil' : 'vor_ort',
            mobilRadiusKm: MOBIL_RADIUS_OPTIONS.includes(String(item?.mobilRadiusKm || '').trim()) ? String(item?.mobilRadiusKm).trim() : '',
            beschreibung: String(item?.beschreibung || '').trim(),
            titleImageUrl: String(item?.titleImageUrl || '').trim(),
            mediaItems: Array.isArray(item?.mediaItems)
              ? item.mediaItems
                  .map((media: any) => ({
                    url: String(media?.url || '').trim(),
                    mediaType: media?.mediaType === 'video' ? 'video' : 'image'
                  }))
                  .filter((media: { url: string }) => media.url)
              : [],
            preise: Array.isArray(item?.preise)
              ? item.preise.map((preis: any, priceIdx: number) => ({
                  id: String(preis?.id || `price-${idx}-${priceIdx}`),
                  typ: preis?.typ === 'gruppe' ? 'gruppe' : 'einzel',
                  betrag: String(preis?.betrag || '').trim(),
                  leistung: String(preis?.leistung || '').trim(),
                  anzahlLeistungen: String(preis?.anzahlLeistungen || '').trim()
                }))
              : [],
            billingType: String(item?.billingType || '').trim().toLowerCase() === 'abo' ? 'abo' : 'einmal',
            sessionsPerAbo: String(item?.sessionsPerAbo || '').trim(),
            singleSessionCancellationAllowed: Boolean(item?.singleSessionCancellationAllowed),
            maxCancellationsPerAbo: String(item?.maxCancellationsPerAbo || '').trim(),
            cancellationWindowHours: String(item?.cancellationWindowHours || '').trim(),
            billingNotes: String(item?.billingNotes || '').trim(),
            visibility: item?.visibility === 'draft' ? 'draft' : 'public',
            viewsCount: Math.max(0, Number(item?.viewsCount || 0)),
            wishlistCount: Math.max(0, Number(item?.wishlistCount || 0)),
            createdAt: String(item?.createdAt || new Date().toISOString()),
            updatedAt: String(item?.updatedAt || new Date().toISOString())
          }))
        : [];

      setAds(loadedAds);
      setProfilMeta({
        name: String(res.data.display_name || '').trim(),
        ort: String(res.data.ort || '').trim(),
        plz: String(res.data.plz || '').trim(),
        kategorien: Array.isArray(res.data.kategorien) ? res.data.kategorien : [],
        zertifikate: Array.isArray(res.data.zertifikate) ? res.data.zertifikate : [],
        angebotText: String(res.data.angebot_text || '').trim(),
        profilData
      });
      setFormData((prev) => ({ ...prev, kategorie: (Array.isArray(res.data.kategorien) && res.data.kategorien[0]) || verfuegbareKategorien[0] || '' }));

      const promotionRes = await getUserPromotionSettings(parsedUserId);
      const proAccess = Boolean(promotionRes.success && promotionRes.data?.plan_key === 'experte_pro');
      setHasExpertProAccess(proAccess);
      if (!proAccess) {
        setError('Eigene Werbung ist nur mit aktivem Experten-Pro-Abo verfügbar.');
      }
      setLoading(false);
    };

    init();
  }, []);

  const uploadMedia = async (file: File, target: 'title' | 'gallery') => {
    if (!userId) return;
    if (!hasExpertProAccess) {
      setError('Eigene Werbung ist nur mit aktivem Experten-Pro-Abo verfügbar.');
      return;
    }
    setSaving(true);
    setError('');
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    const res = await uploadNetworkMedia(userId, formDataUpload);
    setSaving(false);
    if (!res.success || !res.url) {
      setError(res.error || 'Upload fehlgeschlagen.');
      return;
    }

    if (target === 'title') {
      setFormData((prev) => ({ ...prev, titleImageUrl: String(res.url) }));
      setMessage('Titelbild hochgeladen.');
      return;
    }

    setMediaItems((prev) => [...prev, { url: String(res.url), mediaType: res.mediaType === 'video' ? 'video' : 'image' }]);
    setMessage('Medium hinzugefügt.');
  };

  const persistAds = async (nextAds: AdItem[]) => {
    if (!userId) return false;

    setSaving(true);
    setError('');
    setMessage('');

    const nextProfilData = {
      ...(profilMeta.profilData || {}),
      angeboteAnzeigen: nextAds
    };

    const res = await saveExpertProfileData(userId, {
      name: profilMeta.name,
      ort: profilMeta.ort,
      plz: profilMeta.plz,
      angebote: profilMeta.kategorien,
      zertifikate: profilMeta.zertifikate,
      angebotText: profilMeta.angebotText,
      ...nextProfilData
    });

    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Anzeige konnte nicht gespeichert werden.');
      return false;
    }

    setAds(nextAds);
    setProfilMeta((prev) => ({ ...prev, profilData: nextProfilData }));
    return true;
  };

  const createAd = async (visibility: 'public' | 'draft') => {
    if (!hasExpertProAccess) {
      setError('Eigene Werbung ist nur mit aktivem Experten-Pro-Abo verfügbar.');
      return;
    }
    if (!formData.titel.trim()) {
      setError('Bitte Titel eingeben.');
      return;
    }
    if (!formData.kategorie.trim()) {
      setError('Bitte Kategorie wählen.');
      return;
    }
    if (!formData.titleImageUrl.trim()) {
      setError('Bitte mindestens ein Titelbild hochladen.');
      return;
    }
    if (formData.modus === 'mobil' && !MOBIL_RADIUS_OPTIONS.includes(formData.mobilRadiusKm)) {
      setError('Bitte für Mobil einen gültigen Umkreis auswählen.');
      return;
    }
    const validPreisRows = preisRows.filter((row) => row.betrag.trim() && row.leistung.trim());
    if (validPreisRows.length === 0) {
      setError('Bitte mindestens eine vollständige Preiszeile anlegen.');
      return;
    }
    if (validPreisRows.some((row) => row.typ === 'gruppe' && !row.anzahlLeistungen.trim())) {
      setError('Bei Gruppenpreis bitte Anzahl an Leistungen angeben.');
      return;
    }
    if (formData.billingType === 'abo' && !String(formData.sessionsPerAbo || '').trim()) {
      setError('Bitte Anzahl der Leistungen im Abo angeben.');
      return;
    }
    if (formData.billingType === 'abo' && formData.singleSessionCancellationAllowed && !String(formData.maxCancellationsPerAbo || '').trim()) {
      setError('Bitte max. Rücktritte im Abo angeben.');
      return;
    }

    const now = new Date().toISOString();
    const nextAd: AdItem = {
      id: `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      titel: formData.titel.trim(),
      kategorie: formData.kategorie.trim(),
      modus: formData.modus,
      mobilRadiusKm: formData.modus === 'mobil' ? formData.mobilRadiusKm : '',
      beschreibung: formData.beschreibung.trim(),
      titleImageUrl: formData.titleImageUrl.trim(),
      mediaItems,
      preise: validPreisRows,
      billingType: formData.billingType,
      sessionsPerAbo: formData.billingType === 'abo' ? String(formData.sessionsPerAbo || '').trim() : '',
      singleSessionCancellationAllowed: formData.billingType === 'abo' ? Boolean(formData.singleSessionCancellationAllowed) : false,
      maxCancellationsPerAbo: formData.billingType === 'abo' && formData.singleSessionCancellationAllowed ? String(formData.maxCancellationsPerAbo || '').trim() : '',
      cancellationWindowHours: formData.billingType === 'abo' ? String(formData.cancellationWindowHours || '').trim() : '',
      billingNotes: String(formData.billingNotes || '').trim(),
      visibility,
      viewsCount: 0,
      wishlistCount: 0,
      createdAt: now,
      updatedAt: now
    };

    const ok = await persistAds([nextAd, ...ads]);
    if (!ok) return;

    setMessage(visibility === 'public' ? 'Anzeige wurde online geschaltet.' : 'Anzeige als Entwurf gespeichert.');
    setFormData({ titel: '', kategorie: verfuegbareKategorien[0] || '', modus: 'vor_ort', mobilRadiusKm: '', beschreibung: '', titleImageUrl: '', billingType: 'einmal', sessionsPerAbo: '', singleSessionCancellationAllowed: false, maxCancellationsPerAbo: '', cancellationWindowHours: '', billingNotes: '' });
    setMediaItems([]);
    setPreisRows([EMPTY_PRICE_ROW()]);
    setVisibilityFilter(visibility);
  };

  const startEditingAd = (ad: AdItem) => {
    setEditingAdId(ad.id);
    setFormData({
      titel: ad.titel || '',
      kategorie: ad.kategorie || (verfuegbareKategorien[0] || ''),
      modus: ad.modus,
      mobilRadiusKm: ad.mobilRadiusKm || '',
      beschreibung: ad.beschreibung || '',
      titleImageUrl: ad.titleImageUrl || '',
      billingType: ad.billingType || 'einmal',
      sessionsPerAbo: ad.sessionsPerAbo || '',
      singleSessionCancellationAllowed: Boolean(ad.singleSessionCancellationAllowed),
      maxCancellationsPerAbo: ad.maxCancellationsPerAbo || '',
      cancellationWindowHours: ad.cancellationWindowHours || '',
      billingNotes: ad.billingNotes || ''
    });
    setMediaItems(Array.isArray(ad.mediaItems) ? ad.mediaItems : []);
    setPreisRows(Array.isArray(ad.preise) && ad.preise.length > 0 ? ad.preise : [EMPTY_PRICE_ROW()]);
    setMessage('Anzeige zum Bearbeiten geladen.');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditingAd = () => {
    setEditingAdId(null);
    setFormData({ titel: '', kategorie: verfuegbareKategorien[0] || '', modus: 'vor_ort', mobilRadiusKm: '', beschreibung: '', titleImageUrl: '', billingType: 'einmal', sessionsPerAbo: '', singleSessionCancellationAllowed: false, maxCancellationsPerAbo: '', cancellationWindowHours: '', billingNotes: '' });
    setMediaItems([]);
    setPreisRows([EMPTY_PRICE_ROW()]);
    setMessage('Bearbeitung abgebrochen.');
    setError('');
  };

  const saveEditedAd = async () => {
    if (!editingAdId) return;
    if (!formData.titel.trim()) {
      setError('Bitte Titel eingeben.');
      return;
    }
    if (!formData.kategorie.trim()) {
      setError('Bitte Kategorie wählen.');
      return;
    }
    if (!formData.titleImageUrl.trim()) {
      setError('Bitte mindestens ein Titelbild hochladen.');
      return;
    }
    if (formData.modus === 'mobil' && !MOBIL_RADIUS_OPTIONS.includes(formData.mobilRadiusKm)) {
      setError('Bitte für Mobil einen gültigen Umkreis auswählen.');
      return;
    }

    const validPreisRows = preisRows.filter((row) => row.betrag.trim() && row.leistung.trim());
    if (validPreisRows.length === 0) {
      setError('Bitte mindestens eine vollständige Preiszeile anlegen.');
      return;
    }
    if (validPreisRows.some((row) => row.typ === 'gruppe' && !row.anzahlLeistungen.trim())) {
      setError('Bei Gruppenpreis bitte Anzahl an Leistungen angeben.');
      return;
    }
    if (formData.billingType === 'abo' && !String(formData.sessionsPerAbo || '').trim()) {
      setError('Bitte Anzahl der Leistungen im Abo angeben.');
      return;
    }
    if (formData.billingType === 'abo' && formData.singleSessionCancellationAllowed && !String(formData.maxCancellationsPerAbo || '').trim()) {
      setError('Bitte max. Rücktritte im Abo angeben.');
      return;
    }

    const nextAds = ads.map((ad) => {
      if (ad.id !== editingAdId) return ad;
      return {
        ...ad,
        titel: formData.titel.trim(),
        kategorie: formData.kategorie.trim(),
        modus: formData.modus,
        mobilRadiusKm: formData.modus === 'mobil' ? formData.mobilRadiusKm : '',
        beschreibung: formData.beschreibung.trim(),
        titleImageUrl: formData.titleImageUrl.trim(),
        mediaItems,
        preise: validPreisRows,
        billingType: formData.billingType,
        sessionsPerAbo: formData.billingType === 'abo' ? String(formData.sessionsPerAbo || '').trim() : '',
        singleSessionCancellationAllowed: formData.billingType === 'abo' ? Boolean(formData.singleSessionCancellationAllowed) : false,
        maxCancellationsPerAbo: formData.billingType === 'abo' && formData.singleSessionCancellationAllowed ? String(formData.maxCancellationsPerAbo || '').trim() : '',
        cancellationWindowHours: formData.billingType === 'abo' ? String(formData.cancellationWindowHours || '').trim() : '',
        billingNotes: String(formData.billingNotes || '').trim(),
        updatedAt: new Date().toISOString()
      };
    });

    const ok = await persistAds(nextAds);
    if (!ok) return;
    setMessage('Anzeige aktualisiert.');
    setEditingAdId(null);
    setFormData({ titel: '', kategorie: verfuegbareKategorien[0] || '', modus: 'vor_ort', mobilRadiusKm: '', beschreibung: '', titleImageUrl: '', billingType: 'einmal', sessionsPerAbo: '', singleSessionCancellationAllowed: false, maxCancellationsPerAbo: '', cancellationWindowHours: '', billingNotes: '' });
    setMediaItems([]);
    setPreisRows([EMPTY_PRICE_ROW()]);
  };

  const updateAdVisibility = async (adId: string, visibility: 'public' | 'draft') => {
    const nextAds = ads.map((ad) => (ad.id === adId ? { ...ad, visibility, updatedAt: new Date().toISOString() } : ad));
    const ok = await persistAds(nextAds);
    if (!ok) return;
    setMessage(visibility === 'public' ? 'Anzeige ist jetzt öffentlich sichtbar.' : 'Anzeige wurde als Entwurf markiert.');
  };

  const deleteAd = async (adId: string) => {
    if (!confirm('Anzeige wirklich löschen?')) return;
    const nextAds = ads.filter((ad) => ad.id !== adId);
    const ok = await persistAds(nextAds);
    if (!ok) return;
    setMessage('Anzeige gelöscht.');
  };

  const shareAdLink = async (adId: string) => {
    if (!userId) return;
    const safeAdId = String(adId || '').trim();
    if (!safeAdId) return;

    const url = `${window.location.origin}/anzeige/${userId}/${encodeURIComponent(safeAdId)}`;
    try {
      await navigator.clipboard.writeText(url);
      await trackInteractionShare({
        sourceType: 'anzeige',
        sourceId: safeAdId,
        ownerUserId: userId,
        sharedByUserId: userId,
        channel: 'link'
      });
      setMessage('Anzeige-Link kopiert.');
      setError('');
    } catch {
      window.prompt('Anzeige-Link manuell kopieren:', url);
    }
  };

  const handleTitleMediaFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    await uploadMedia(file, 'title');
  };

  const handleGalleryMediaFiles = async (files: File[]) => {
    for (const file of files.slice(0, Math.max(0, 8 - mediaItems.length))) {
      await uploadMedia(file, 'gallery');
    }
  };

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = '/login';
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = '/';
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-500">Lade Inserieren-Seite...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>

          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
        </nav>
        {userId && (
          <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
        )}
      </aside>

      <LoggedInHeader
        userId={userId}
        role={viewerRole}
        userName={viewerName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <section className="flex items-center justify-between gap-3">
          <Link href="/profil" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">
            <ChevronLeft size={16} /> Zurück zum Profil
          </Link>
          <h1 className="text-sm md:text-base font-black uppercase italic text-emerald-700 tracking-wider">Anzeige erstellen</h1>
        </section>

        {(message || error) && (
          <div className={`rounded-2xl border p-4 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {error || message}
          </div>
        )}

        {!hasExpertProAccess && (
          <section className="bg-white rounded-[2rem] border border-amber-100 p-8 shadow-sm space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Experten Pro erforderlich</p>
            <h2 className="text-2xl font-black italic uppercase text-slate-900">Eigene Werbung hochladen</h2>
            <p className="text-sm text-slate-600">Diese Funktion ist nur mit aktivem Experten-Pro-Abo sichtbar. Mit aktivem Pro kannst du Titelbild, weitere Medien und Anzeigeninhalte anlegen.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/abo" className="px-4 py-3 rounded-xl text-[10px] font-black uppercase bg-slate-900 text-white">Zum Abo</Link>
              <button type="button" onClick={openProfile} className="px-4 py-3 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-700">Zurück zum Profil</button>
            </div>
          </section>
        )}

        <section className={`${hasExpertProAccess ? 'bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6' : 'hidden'}`}>
          <div>
            <h1 className="text-2xl font-black italic uppercase text-slate-900">{editingAdId ? 'Anzeige bearbeiten' : 'Neue Anzeige'}</h1>
            <p className="text-xs text-slate-500 mt-1">Mindestens ein Titelbild ist Pflicht. Weitere Bilder/Videos sind optional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={formData.titel} onChange={(e) => setFormData((prev) => ({ ...prev, titel: e.target.value }))} placeholder="Titel" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" />
            <select value={formData.kategorie} onChange={(e) => setFormData((prev) => ({ ...prev, kategorie: e.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              {verfuegbareKategorien.map((kategorie) => (
                <option key={kategorie} value={kategorie}>{kategorie}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Einsatzmodus</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, modus: 'mobil' }))} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${formData.modus === 'mobil' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Mobil</button>
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, modus: 'vor_ort', mobilRadiusKm: '' }))} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${formData.modus === 'vor_ort' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Vor Ort</button>
            </div>
            {formData.modus === 'mobil' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Umkreis um Profilstandort</label>
                <select
                  value={formData.mobilRadiusKm}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mobilRadiusKm: e.target.value }))}
                  className="w-full md:w-64 rounded-xl border border-slate-200 bg-white p-3 text-sm"
                >
                  <option value="">Umkreis wählen</option>
                  {MOBIL_RADIUS_OPTIONS.map((radius) => (
                    <option key={radius} value={radius}>{radius} km</option>
                  ))}
                </select>
              </div>
            )}
            {formData.modus === 'vor_ort' && (
              <p className="text-xs text-slate-600 inline-flex items-center gap-2"><MapPin size={14} /> Adresse aus Profil: {profilMeta.plz} {profilMeta.ort || 'nicht hinterlegt'}</p>
            )}
          </div>

          <textarea value={formData.beschreibung} onChange={(e) => setFormData((prev) => ({ ...prev, beschreibung: e.target.value }))} rows={5} placeholder="Beschreibung" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" />

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Titelbild (Pflicht)</p>
            <MediaDropzone
              title="Titelbild hochladen"
              description="JPG, PNG, WebP oder GIF. Eine Datei reicht aus."
              accept="image/jpeg,image/png,image/webp,image/gif"
              buttonLabel="Datei auswählen"
              busyLabel="Lädt..."
              onFiles={handleTitleMediaFiles}
            />
            {formData.titleImageUrl && <img src={formData.titleImageUrl} alt="Titelbild" className="w-full max-w-sm h-40 object-cover rounded-xl border border-slate-200" />}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Weitere Medien (optional)</p>
            <MediaDropzone
              title="Bilder und Videos hinzufügen"
              description="Ziehe Medien hier hinein oder klicke, um Dateien auszuwählen."
              accept="image/*,video/*"
              multiple
              buttonLabel="Dateien auswählen"
              busyLabel="Lädt..."
              onFiles={handleGalleryMediaFiles}
            />
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {mediaItems.map((media, idx) => (
                  <div key={`${media.url}-${idx}`} className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    {media.mediaType === 'video' ? <video src={media.url} className="w-full h-24 object-cover" /> : <img src={media.url} alt="Medium" className="w-full h-24 object-cover" />}
                    <button type="button" onClick={() => setMediaItems((prev) => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-700 flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preise</p>
              <button type="button" onClick={() => setPreisRows((prev) => [...prev, EMPTY_PRICE_ROW()])} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase inline-flex items-center gap-1"><Plus size={13} /> Preiszeile</button>
            </div>

            {preisRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                <select value={row.typ} onChange={(e) => setPreisRows((prev) => prev.map((item) => item.id === row.id ? { ...item, typ: e.target.value === 'gruppe' ? 'gruppe' : 'einzel' } : item))} className="rounded-lg border border-slate-200 bg-white p-2 text-sm">
                  <option value="einzel">Einzelpreis</option>
                  <option value="gruppe">Gruppenpreis</option>
                </select>
                <input value={row.betrag} onChange={(e) => setPreisRows((prev) => prev.map((item) => item.id === row.id ? { ...item, betrag: e.target.value } : item))} placeholder="Betrag" className="rounded-lg border border-slate-200 bg-white p-2 text-sm" />
                <input value={row.leistung} onChange={(e) => setPreisRows((prev) => prev.map((item) => item.id === row.id ? { ...item, leistung: e.target.value } : item))} placeholder="Leistung (z.B. 60 Minuten)" className="rounded-lg border border-slate-200 bg-white p-2 text-sm md:col-span-2" />
                {row.typ === 'gruppe' ? (
                  <input value={row.anzahlLeistungen} onChange={(e) => setPreisRows((prev) => prev.map((item) => item.id === row.id ? { ...item, anzahlLeistungen: e.target.value } : item))} placeholder="Anzahl Leistungen" className="rounded-lg border border-slate-200 bg-white p-2 text-sm" />
                ) : (
                  <button type="button" onClick={() => setPreisRows((prev) => prev.filter((item) => item.id !== row.id))} className="px-2 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-black uppercase inline-flex items-center justify-center gap-1"><Trash2 size={12} /> Entfernen</button>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Konditionen für Rechnung</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Abrechnungsmodell</label>
                <select
                  value={formData.billingType}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    billingType: e.target.value === 'abo' ? 'abo' : 'einmal',
                    sessionsPerAbo: e.target.value === 'abo' ? prev.sessionsPerAbo : '',
                    singleSessionCancellationAllowed: e.target.value === 'abo' ? prev.singleSessionCancellationAllowed : false,
                    maxCancellationsPerAbo: e.target.value === 'abo' ? prev.maxCancellationsPerAbo : '',
                    cancellationWindowHours: e.target.value === 'abo' ? prev.cancellationWindowHours : '',
                  }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                >
                  <option value="einmal">Einmalzahlung</option>
                  <option value="abo">Abo</option>
                </select>
              </div>
              {formData.billingType === 'abo' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Leistungen im Abo</label>
                  <input
                    value={formData.sessionsPerAbo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sessionsPerAbo: e.target.value }))}
                    placeholder="z.B. 4"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                </div>
              )}
            </div>

            {formData.billingType === 'abo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rücktritt einzelner Leistung</label>
                  <select
                    value={formData.singleSessionCancellationAllowed ? 'ja' : 'nein'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, singleSessionCancellationAllowed: e.target.value === 'ja' }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  >
                    <option value="nein">Nein</option>
                    <option value="ja">Ja</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rücktrittsfrist (Stunden)</label>
                  <input
                    value={formData.cancellationWindowHours}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cancellationWindowHours: e.target.value }))}
                    placeholder="z.B. 24"
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  />
                </div>
                {formData.singleSessionCancellationAllowed && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max. Rücktritte im Abo</label>
                    <input
                      value={formData.maxCancellationsPerAbo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, maxCancellationsPerAbo: e.target.value }))}
                      placeholder="z.B. 1"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Konditionshinweis (optional)</label>
              <textarea
                value={formData.billingNotes}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingNotes: e.target.value }))}
                rows={2}
                placeholder="z.B. Monatsabo wird anteilig bei Rücktritt angepasst"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {editingAdId ? (
              <>
                <button type="button" onClick={saveEditedAd} disabled={saving} className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase disabled:opacity-60">Änderungen speichern</button>
                <button type="button" onClick={cancelEditingAd} disabled={saving} className="px-5 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase disabled:opacity-60">Abbrechen</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => createAd('draft')} disabled={saving} className="px-5 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-[10px] font-black uppercase disabled:opacity-60">Als Entwurf speichern</button>
                <button type="button" onClick={() => createAd('public')} disabled={saving} className="px-5 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase disabled:opacity-60">Online schalten</button>
              </>
            )}
          </div>
        </section>

        <section className={`${hasExpertProAccess ? 'bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-4' : 'hidden'}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-black uppercase italic text-slate-900">Bereits online geschaltet / Entwürfe</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setVisibilityFilter('public')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${visibilityFilter === 'public' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Öffentlich sichtbar</button>
              <button type="button" onClick={() => setVisibilityFilter('draft')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${visibilityFilter === 'draft' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Entwürfe</button>
            </div>
          </div>

          {gefilterteAds.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Anzeigen in diesem Bereich.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {gefilterteAds.map((ad) => (
                <article key={ad.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  {ad.titleImageUrl && <img src={ad.titleImageUrl} alt={ad.titel} className="w-full h-36 object-cover rounded-xl border border-slate-200" />}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{ad.kategorie || 'Kategorie offen'}</p>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${ad.visibility === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ad.visibility === 'public' ? 'Online' : 'Entwurf'}</span>
                  </div>
                  <h3 className="text-base font-black uppercase italic text-slate-900">{ad.titel}</h3>
                  {ad.modus === 'mobil' && ad.mobilRadiusKm ? (
                    <p className="text-xs text-slate-600 inline-flex items-center gap-2"><MapPin size={14} /> Mobil bis {ad.mobilRadiusKm} km um {profilMeta.plz} {profilMeta.ort || 'Profilstandort'}</p>
                  ) : (
                    <p className="text-xs text-slate-600 inline-flex items-center gap-2"><MapPin size={14} /> Vor Ort: {profilMeta.plz} {profilMeta.ort || 'nicht hinterlegt'}</p>
                  )}
                  <p className="text-sm text-slate-600 line-clamp-3">{ad.beschreibung || 'Keine Beschreibung.'}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-200 text-slate-700">
                      {ad.billingType === 'abo' ? 'Abo' : 'Einmalzahlung'}
                    </span>
                    {ad.billingType === 'abo' && ad.singleSessionCancellationAllowed && (
                      <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">
                        Rücktritt möglich
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="inline-flex items-center gap-1"><Eye size={13} /> {ad.viewsCount}</span>
                    <span className="inline-flex items-center gap-1"><Heart size={13} /> {ad.wishlistCount}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => startEditingAd(ad)} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 disabled:opacity-60">Bearbeiten</button>
                    {userId && <Link href={`/anzeige/${userId}/${ad.id}`} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700">Vorschau</Link>}
                    <button type="button" onClick={() => shareAdLink(ad.id)} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 inline-flex items-center gap-1 disabled:opacity-60"><Share2 size={12} /> Link teilen</button>
                    {ad.visibility === 'public' ? (
                      <button type="button" onClick={() => updateAdVisibility(ad.id, 'draft')} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200 bg-white text-slate-700 disabled:opacity-60">In Entwürfe</button>
                    ) : (
                      <button type="button" onClick={() => updateAdVisibility(ad.id, 'public')} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-60">Online schalten</button>
                    )}
                    <button type="button" onClick={() => deleteAd(ad.id)} disabled={saving} className="px-3 py-2 rounded-xl text-[10px] font-black uppercase border border-red-200 bg-red-50 text-red-700 disabled:opacity-60">Löschen</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}