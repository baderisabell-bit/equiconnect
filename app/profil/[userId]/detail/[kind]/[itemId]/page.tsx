"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowLeftCircle,
  ArrowRightCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  PencilLine,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import LoggedInHeader from '../../../../../components/logged-in-header';
import MediaDropzone from '../../../../../components/media-dropzone';
import { ANGEBOT_KATEGORIEN } from '../../../../../suche/kategorien-daten';
import {
  createNetworkPost,
  getPublicOfferDetails,
  getProfilePosts,
  getStoredProfileData,
  removeProfilePost,
  saveExpertProfileData,
  updateProfilePost,
  uploadNetworkMedia,
} from '../../../../../actions';

const MAX_MEDIA_ITEMS = 8;

type DetailKind = 'angebote' | 'beitraege';
type MediaItem = { type: 'image' | 'video'; url: string };

type OfferItem = {
  id: string;
  titel: string;
  kategorie: string;
  beschreibung: string;
  titleImageUrl?: string;
  mediaItems?: MediaItem[];
  visibility?: 'public' | 'draft';
  preise?: any[];
  [key: string]: any;
};

type PostItem = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  media_items: MediaItem[];
};

function clampKind(value: string | string[] | undefined): DetailKind {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'beitraege' ? 'beitraege' : 'angebote';
}

function normalizeMediaItem(item: any): MediaItem | null {
  const url = String(item?.url || '').trim();
  if (!url) return null;
  return {
    type: String(item?.mediaType || item?.type || 'image') === 'video' ? 'video' : 'image',
    url,
  };
}

function getDisplayName(profileRow: any, fallback = 'Profil') {
  const displayName = String(profileRow?.display_name || '').trim();
  if (displayName) return displayName;

  const vorname = String(profileRow?.vorname || '').trim();
  const nachname = String(profileRow?.nachname || '').trim();
  const combined = `${vorname} ${nachname}`.trim();
  if (combined) return combined;

  return fallback;
}

export default function ProfileDetailPage() {
  const params = useParams<{ userId: string; kind: string; itemId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const profileUserId = Number(Array.isArray(params.userId) ? params.userId[0] : params.userId);
  const kind = clampKind(params.kind);
  const itemId = String(Array.isArray(params.itemId) ? params.itemId[0] : params.itemId || '').trim();
  const mode = String(searchParams.get('mode') || '').trim();
  const isEditMode = mode === 'edit' || itemId === 'new';

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [viewerUserId, setViewerUserId] = useState(0);
  const [profileRow, setProfileRow] = useState<any | null>(null);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [offerDetail, setOfferDetail] = useState<any | null>(null);
  const [postForm, setPostForm] = useState({ title: '', content: '' });
  const [postMediaItems, setPostMediaItems] = useState<MediaItem[]>([]);
  const [offerForm, setOfferForm] = useState({
    titel: '',
    kategorie: '',
    thema: '',
    beschreibung: '',
    titleImageUrl: '',
    mediaItems: [] as MediaItem[],
  });
  const [busy, setBusy] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const mainPanelRef = useRef<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerUserId, setHeaderUserId] = useState<number | null>(null);
  const [headerRole, setHeaderRole] = useState<string | null>(null);
  const [headerUserName, setHeaderUserName] = useState('Profil');

  useEffect(() => {
    const storedId = Number(sessionStorage.getItem('userId') || 0);
    if (!Number.isNaN(storedId) && storedId > 0) {
      setViewerUserId(storedId);
      setHeaderUserId(storedId);
    }
    const storedRole = sessionStorage.getItem('userRole') || null;
    const storedName = sessionStorage.getItem('userName') || 'Profil';
    setHeaderRole(storedRole);
    setHeaderUserName(storedName);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      setMessage('');

      const profileRes = await getStoredProfileData(profileUserId);
      if (!active) return;

      if (!profileRes.success || !profileRes.data) {
        setError(profileRes.error || 'Profil konnte nicht geladen werden.');
        setLoading(false);
        return;
      }

      const row = profileRes.data;
      setProfileRow(row);

      if (kind === 'angebote') {
        const rawOffers = Array.isArray(row?.profil_data?.angeboteAnzeigen) ? row.profil_data.angeboteAnzeigen : [];
        const mappedOffers = rawOffers
          .map((item: any, index: number) => ({
            id: String(item?.id || `angebot-${index}`),
            titel: String(item?.titel || '').trim(),
            kategorie: String(item?.kategorie || '').trim(),
            beschreibung: String(item?.beschreibung || '').trim(),
            titleImageUrl: String(item?.titleImageUrl || '').trim(),
            mediaItems: Array.isArray(item?.mediaItems)
              ? item.mediaItems.map(normalizeMediaItem).filter(Boolean)
              : [],
            visibility: item?.visibility === 'draft' ? 'draft' : 'public',
            preise: Array.isArray(item?.preise) ? item.preise : [],
            ...item,
          }))
          .filter((item: OfferItem) => item.titel || item.kategorie || item.beschreibung || item.titleImageUrl || (Array.isArray(item.mediaItems) && item.mediaItems.length > 0));

        setOffers(mappedOffers);

        if (itemId !== 'new') {
          const detailRes = await getPublicOfferDetails({
            profileUserId,
            offerId: itemId,
            viewerUserId: viewerUserId > 0 ? viewerUserId : null,
          });
          if (!active) return;
          if (detailRes.success && detailRes.data?.offer) {
            setOfferDetail(detailRes.data.offer);
          } else {
            setOfferDetail(mappedOffers.find((item: OfferItem) => String(item.id) === itemId) || null);
          }
        } else {
          setOfferDetail(null);
        }
      }

      if (kind === 'beitraege') {
        const postsRes = await getProfilePosts(viewerUserId, profileUserId, 120);
        if (!active) return;
        if (postsRes.success && Array.isArray(postsRes.posts)) {
          const mappedPosts = postsRes.posts.map((post: any) => ({
            id: Number(post.id),
            title: String(post.title || '').trim(),
            content: String(post.content || '').trim(),
            created_at: String(post.created_at || ''),
            media_items: Array.isArray(post.media_items)
              ? post.media_items.map(normalizeMediaItem).filter(Boolean)
              : [],
          }));
          setPosts(mappedPosts);
        } else {
          setPosts([]);
        }
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [kind, itemId, profileUserId, viewerUserId]);

  const profileName = useMemo(() => getDisplayName(profileRow), [profileRow]);
  const isOwnProfile = viewerUserId > 0 && viewerUserId === profileUserId;
  const profileRole = String(profileRow?.role || '').trim();
  const isExpertProfile = profileRole === 'experte';

  const offerItems = useMemo(() => offers, [offers]);
  const postItems = useMemo(() => posts, [posts]);
  const currentIndex = useMemo(() => {
    if (kind === 'angebote') {
      return offerItems.findIndex((item) => String(item.id) === itemId);
    }
    return postItems.findIndex((item) => String(item.id) === itemId);
  }, [itemId, kind, offerItems, postItems]);

  const currentOffer = offerDetail || (kind === 'angebote' && itemId !== 'new' ? offerItems.find((item) => String(item.id) === itemId) : null);
  const currentPost = kind === 'beitraege' && itemId !== 'new' ? postItems.find((item) => String(item.id) === itemId) || null : null;
  const canNavigate = currentIndex >= 0;
  const previousItem = canNavigate ? (kind === 'angebote' ? offerItems[currentIndex - 1] : postItems[currentIndex - 1]) : null;
  const nextItem = canNavigate ? (kind === 'angebote' ? offerItems[currentIndex + 1] : postItems[currentIndex + 1]) : null;

  useEffect(() => {
    if (!isEditMode) {
      setPostForm({ title: '', content: '' });
      setPostMediaItems([]);
      setOfferForm({ titel: '', kategorie: '', thema: '', beschreibung: '', titleImageUrl: '', mediaItems: [] });
      return;
    }

    if (kind === 'beitraege') {
      if (itemId === 'new') {
        setPostForm({ title: '', content: '' });
        setPostMediaItems([]);
        return;
      }

      const post = postItems.find((entry) => String(entry.id) === itemId);
      if (post) {
        setPostForm({ title: post.title, content: post.content });
        setPostMediaItems(post.media_items || []);
      }
      return;
    }

    if (kind === 'angebote') {
      if (itemId === 'new') {
        setOfferForm({ titel: '', kategorie: '', thema: '', beschreibung: '', titleImageUrl: '', mediaItems: [] });
        return;
      }

      const offer = currentOffer;
      if (offer) {
        setOfferForm({
          titel: String(offer.titel || ''),
          kategorie: String(offer.kategorie || ''),
          thema: String(offer.thema || offer.unterkategorie || ''),
          beschreibung: String(offer.beschreibung || ''),
          titleImageUrl: String(offer.titleImageUrl || ''),
          mediaItems: Array.isArray(offer.mediaItems) ? offer.mediaItems.filter(Boolean) : [],
        });
      }
    }
  }, [currentOffer, currentPost, isEditMode, itemId, kind, postItems]);

  const navigateToItem = (target: any) => {
    if (!target) return;
    if (kind === 'angebote') {
      router.push(`/profil/${profileUserId}/detail/angebote/${encodeURIComponent(String(target.id))}`);
      return;
    }
    router.push(`/profil/${profileUserId}/detail/beitraege/${encodeURIComponent(String(target.id))}`);
  };

  const navigatePrevious = () => navigateToItem(previousItem);
  const navigateNext = () => navigateToItem(nextItem);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchStart(null);

    if (Math.abs(deltaY) < 60 || Math.abs(deltaY) < Math.abs(deltaX)) return;
    if (deltaY < 0) {
      navigateNext();
      return;
    }
    navigatePrevious();
  };

  const openMessageComposer = () => {
    if (!profileRow) return;
    const target = encodeURIComponent(profileName);
    const path = `/nachrichten?target=${target}&targetUserId=${profileUserId}&targetType=${kind === 'angebote' ? 'anzeige' : 'person'}`;
    router.push(path);
  };

  const handlePostMediaUpload = async (files: File[]) => {
    if (!viewerUserId || !profileRow || files.length === 0) return;
    setBusy(true);
    setError('');
    const nextItems = [...postMediaItems];
    for (const file of files.slice(0, Math.max(0, MAX_MEDIA_ITEMS - postMediaItems.length))) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await uploadNetworkMedia(profileUserId, formData);
      if (uploadRes.success && uploadRes.url) {
        nextItems.push({
          type: uploadRes.mediaType === 'video' ? 'video' : 'image',
          url: String(uploadRes.url),
        });
      }
    }
    setPostMediaItems(nextItems.slice(0, MAX_MEDIA_ITEMS));
    setBusy(false);
  };

  const handleOfferMediaUpload = async (files: File[], target: 'title' | 'gallery') => {
    if (!viewerUserId || !profileRow || files.length === 0) return;
    setBusy(true);
    setError('');

    const uploaded: MediaItem[] = [];
    for (const file of files.slice(0, MAX_MEDIA_ITEMS)) {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await uploadNetworkMedia(profileUserId, formData);
      if (uploadRes.success && uploadRes.url) {
        uploaded.push({
          type: uploadRes.mediaType === 'video' ? 'video' : 'image',
          url: String(uploadRes.url),
        });
      }
    }

    if (uploaded.length > 0) {
      setOfferForm((prev) => {
        if (target === 'title') {
          const firstImage = uploaded.find((item) => item.type === 'image');
          if (firstImage) {
            return { ...prev, titleImageUrl: firstImage.url };
          }
          return prev;
        }

        return {
          ...prev,
          mediaItems: [...prev.mediaItems, ...uploaded].slice(0, MAX_MEDIA_ITEMS),
        };
      });
    }

    setBusy(false);
  };

  const offerCategoryOptions = useMemo(() => {
    const labels = ANGEBOT_KATEGORIEN.map((category) => category.label);
    const currentCategory = String(offerForm.kategorie || currentOffer?.kategorie || '').trim();
    if (currentCategory && !labels.includes(currentCategory)) {
      return [...labels, currentCategory];
    }
    return labels;
  }, [currentOffer?.kategorie, offerForm.kategorie]);

  const handleSavePost = async () => {
    if (!profileRow || !viewerUserId || !isOwnProfile) return;
    const title = String(postForm.title || '').trim();
    const content = String(postForm.content || '').trim();
    if (!title || !content) {
      setError('Bitte Titel und Inhalt ausfuellen.');
      return;
    }

    setBusy(true);
    setError('');

    if (itemId === 'new') {
      const res = await createNetworkPost({
        userId: profileUserId,
        title,
        content,
        mediaItems: postMediaItems.map((item) => ({ url: item.url, mediaType: item.type })),
        postTarget: 'profile',
      });

      setBusy(false);
      if (!res.success) {
        setError(res.error || 'Beitrag konnte nicht erstellt werden.');
        return;
      }

      const newPostId = Number((res as any).postId || 0);
      if (Number.isInteger(newPostId) && newPostId > 0) {
        router.replace(`/profil/${profileUserId}/detail/beitraege/${newPostId}`);
      } else {
        router.push(`/profil/${profileUserId}`);
      }
      return;
    }

    const postId = Number(itemId);
    const res = await updateProfilePost({
      userId: profileUserId,
      postId,
      title,
      content,
    });

    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Beitrag konnte nicht gespeichert werden.');
      return;
    }

    router.replace(`/profil/${profileUserId}/detail/beitraege/${postId}`);
    setMessage('Beitrag gespeichert.');
  };

  const handleDeletePost = async () => {
    if (!profileRow || !viewerUserId || !isOwnProfile || itemId === 'new') return;
    if (!confirm('Beitrag wirklich loeschen?')) return;

    setBusy(true);
    const res = await removeProfilePost({ userId: profileUserId, postId: Number(itemId) });
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Beitrag konnte nicht geloescht werden.');
      return;
    }
    router.push(`/profil/${profileUserId}`);
  };

  const handleSaveOffer = async () => {
    if (!profileRow || !viewerUserId || !isOwnProfile || !isExpertProfile) return;

    const titel = String(offerForm.titel || '').trim();
    const kategorie = String(offerForm.kategorie || '').trim();
    const thema = String(offerForm.thema || '').trim();
    const beschreibung = String(offerForm.beschreibung || '').trim();
    if (!titel) {
      setError('Bitte einen Titel für die Anzeige eingeben.');
      return;
    }
    if (!kategorie) {
      setError('Bitte eine Kategorie auswählen.');
      return;
    }

    setBusy(true);
    setError('');

    const rawOffers = Array.isArray(profileRow?.profil_data?.angeboteAnzeigen) ? [...profileRow.profil_data.angeboteAnzeigen] : [];
    const currentId = itemId === 'new' ? `angebot-${Date.now()}` : itemId;
    const nextOffer = {
      ...(rawOffers.find((entry: any) => String(entry?.id || '') === itemId) || {}),
      id: currentId,
      titel,
      kategorie,
      thema,
      beschreibung,
      titleImageUrl: String(offerForm.titleImageUrl || '').trim(),
      mediaItems: offerForm.mediaItems.map((item) => ({
        url: String(item.url || '').trim(),
        mediaType: item.type === 'video' ? 'video' : 'image',
      })).filter((entry) => entry.url),
      preise: Array.isArray((rawOffers.find((entry: any) => String(entry?.id || '') === itemId) || {})?.preise)
        ? (rawOffers.find((entry: any) => String(entry?.id || '') === itemId) || {}).preise
        : [],
      visibility: itemId === 'new' ? 'draft' : ((rawOffers.find((entry: any) => String(entry?.id || '') === itemId) || {})?.visibility === 'draft' ? 'draft' : 'public'),
    };

    const nextOffers = itemId === 'new'
      ? [nextOffer, ...rawOffers]
      : rawOffers.map((entry: any) => (String(entry?.id || '') === itemId ? nextOffer : entry));

    const res = await saveExpertProfileData(profileUserId, {
      ...(profileRow?.profil_data || {}),
      name: getDisplayName(profileRow),
      ort: String(profileRow?.ort || '').trim(),
      plz: String(profileRow?.plz || '').trim(),
      kategorien: Array.isArray(profileRow?.kategorien) ? profileRow.kategorien : [],
      zertifikate: Array.isArray(profileRow?.zertifikate) ? profileRow.zertifikate : [],
      angebotText: String(profileRow?.angebot_text || '').trim(),
      angeboteAnzeigen: nextOffers,
    });

    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Anzeige konnte nicht gespeichert werden.');
      return;
    }

    if (itemId === 'new') {
      router.replace(`/profil/${profileUserId}/detail/angebote/${encodeURIComponent(String(currentId))}`);
    } else {
      router.replace(`/profil/${profileUserId}/detail/angebote/${encodeURIComponent(String(currentId))}`);
    }
    setMessage('Anzeige gespeichert.');
  };

  const handleDeleteOffer = async () => {
    if (!profileRow || !viewerUserId || !isOwnProfile || !isExpertProfile || itemId === 'new') return;
    if (!confirm('Anzeige wirklich loeschen?')) return;

    setBusy(true);
    const rawOffers = Array.isArray(profileRow?.profil_data?.angeboteAnzeigen) ? [...profileRow.profil_data.angeboteAnzeigen] : [];
    const nextOffers = rawOffers.filter((entry: any) => String(entry?.id || '') !== itemId);
    const res = await saveExpertProfileData(profileUserId, {
      ...(profileRow?.profil_data || {}),
      name: getDisplayName(profileRow),
      ort: String(profileRow?.ort || '').trim(),
      plz: String(profileRow?.plz || '').trim(),
      kategorien: Array.isArray(profileRow?.kategorien) ? profileRow.kategorien : [],
      zertifikate: Array.isArray(profileRow?.zertifikate) ? profileRow.zertifikate : [],
      angebotText: String(profileRow?.angebot_text || '').trim(),
      angeboteAnzeigen: nextOffers,
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error || 'Anzeige konnte nicht geloescht werden.');
      return;
    }
    router.push(`/profil/${profileUserId}`);
  };

  const renderMediaItem = (item: MediaItem, key: string) => (
    <div key={key} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-square">
      {item.type === 'image' ? (
        <img src={String(item.url).trim()} alt="Medieninhalt" className="w-full h-full object-cover" />
      ) : (
        <video src={String(item.url).trim()} className="w-full h-full object-cover" controls playsInline />
      )}
    </div>
  );

  const headerTitle = kind === 'angebote' ? 'Anzeige' : 'Beitrag';
  const headerSubline = kind === 'angebote'
    ? isEditMode ? 'Anzeige bearbeiten oder neu anlegen' : 'Alle Details zur Anzeige'
    : isEditMode ? 'Beitrag bearbeiten oder neu anlegen' : 'Alle Details zum Beitrag';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#eef5f1_100%)] text-slate-900">
      <LoggedInHeader
        userId={headerUserId}
        role={headerRole}
        userName={headerUserName}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSidebarOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-full max-w-sm bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Navigation</p>
                <h2 className="mt-2 text-2xl font-black italic uppercase text-slate-900">{profileName}</h2>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-3">
              <Link href={`/profil/${profileUserId}`} className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase text-slate-700">
                Profil öffnen
              </Link>
              <Link href="/nachrichten" className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black uppercase text-slate-700">
                Nachrichten
              </Link>
            </div>
          </aside>
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push(`/profil/${profileUserId}`)}
        className="fixed left-4 top-24 z-40 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-lg backdrop-blur md:top-28"
      >
        <ArrowLeft size={16} /> Zurueck
      </button>

      {previousItem && (
        <button
          type="button"
          onClick={navigatePrevious}
          className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 md:flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-xl backdrop-blur hover:bg-white"
          title="Vorheriger Eintrag"
        >
          <ArrowLeftCircle size={26} />
        </button>
      )}

      {nextItem && (
        <button
          type="button"
          onClick={navigateNext}
          className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 md:flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-xl backdrop-blur hover:bg-white"
          title="Naechster Eintrag"
        >
          <ArrowRightCircle size={26} />
        </button>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:pt-28">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-col gap-6 border-b border-slate-100 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">{profileName}</p>
              <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 md:text-5xl">
                {itemId === 'new' ? `Neue ${headerTitle}` : `${headerTitle} ansehen`}
              </h1>
              <p className="max-w-2xl text-sm font-medium text-slate-600">{headerSubline}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isOwnProfile && profileRow && (
                <button
                  type="button"
                  onClick={openMessageComposer}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
                >
                  <MessageSquare size={14} /> Nachricht schreiben
                </button>
              )}
              {canNavigate && (
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>{currentIndex + 1}</span>
                  <span>/</span>
                  <span>{kind === 'angebote' ? offerItems.length : postItems.length}</span>
                </div>
              )}
            </div>
          </div>

          {message && (
            <div className="mx-6 mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="px-6 py-12 text-sm font-medium text-slate-500">Wird geladen...</div>
          ) : (
            <div
              ref={mainPanelRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="touch-pan-y px-6 py-6"
            >
              {isEditMode && isOwnProfile && kind === 'beitraege' && (
                <section className="mb-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{itemId === 'new' ? 'Neuer Beitrag' : 'Beitrag bearbeiten'}</p>
                      <h2 className="mt-2 text-xl font-black uppercase text-slate-900">Inhalt und Medien</h2>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <PencilLine size={14} />
                      {itemId === 'new' ? 'Entwurf' : 'Bearbeitungsmodus'}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      value={postForm.title}
                      onChange={(e) => setPostForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Titel"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                    />
                    <textarea
                      value={postForm.content}
                      onChange={(e) => setPostForm((prev) => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      placeholder="Inhalt"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                    />
                    <MediaDropzone
                      title="Beitragsmedien"
                      description="Bilder oder Videos hochladen. Maximal 8 Dateien."
                      accept="image/*,video/*"
                      multiple
                      disabled={busy}
                      buttonLabel="Medien auswaehlen"
                      busyLabel="Lade Medien..."
                      onFiles={handlePostMediaUpload}
                    />
                    {postMediaItems.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {postMediaItems.map((item, index) => (
                          <div key={`${item.url}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-square">
                            {item.type === 'image' ? (
                              <img src={String(item.url).trim()} alt="Beitragsmedium" className="w-full h-full object-cover" />
                            ) : (
                              <video src={String(item.url).trim()} className="w-full h-full object-cover" controls playsInline />
                            )}
                            <button
                              type="button"
                              onClick={() => setPostMediaItems((prev) => prev.filter((_, mediaIndex) => mediaIndex !== index))}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSavePost}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
                      >
                        <Save size={14} /> Speichern
                      </button>
                      {itemId !== 'new' && (
                        <button
                          type="button"
                          onClick={handleDeletePost}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-60"
                        >
                          <Trash2 size={14} /> Loeschen
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {isEditMode && isOwnProfile && kind === 'angebote' && isExpertProfile && (
                <section className="mb-8 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{itemId === 'new' ? 'Neue Anzeige' : 'Anzeige bearbeiten'}</p>
                      <h2 className="mt-2 text-xl font-black uppercase text-slate-900">Anzeigendetails</h2>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <Edit3 size={14} />
                      {itemId === 'new' ? 'Neu' : 'Bearbeitung'}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      value={offerForm.titel}
                      onChange={(e) => setOfferForm((prev) => ({ ...prev, titel: e.target.value }))}
                      placeholder="Titel"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                    />
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Kategorie</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {String(offerForm.kategorie || '').trim() || 'Bitte auswählen'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {offerCategoryOptions.map((label) => {
                          const active = String(offerForm.kategorie || '').trim() === label;
                          return (
                            <button
                              key={`offer-category-${label}`}
                              type="button"
                              onClick={() => setOfferForm((prev) => ({ ...prev, kategorie: label }))}
                              className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest border ${active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700'}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {String(offerForm.kategorie || '').trim() && (
                        <div className="mt-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Themen</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(ANGEBOT_KATEGORIEN.find((c) => c.label === String(offerForm.kategorie).trim())?.themen || []).map((themaLabel: any) => {
                              const label = typeof themaLabel === 'string' ? themaLabel : String(themaLabel.label || themaLabel.name || themaLabel);
                              const active = String(offerForm.thema || '').trim() === String(label).trim();
                              return (
                                <button
                                  key={`offer-thema-${label}`}
                                  type="button"
                                  onClick={() => setOfferForm((prev) => ({ ...prev, thema: label }))}
                                  className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest border ${active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700'}`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {String(offerForm.kategorie || '').trim() && !ANGEBOT_KATEGORIEN.some((category) => category.label === String(offerForm.kategorie || '').trim()) && (
                        <p className="text-[10px] font-medium text-amber-700">
                          Diese Kategorie stammt aus einem älteren Eintrag und bleibt zur Kompatibilität erhalten.
                        </p>
                      )}
                    </div>
                    <textarea
                      value={offerForm.beschreibung}
                      onChange={(e) => setOfferForm((prev) => ({ ...prev, beschreibung: e.target.value }))}
                      rows={6}
                      placeholder="Beschreibung"
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm"
                    />
                    <MediaDropzone
                      title="Titelbild hochladen"
                      description="Ein Bild fuer die Anzeige auswaehlen."
                      accept="image/*"
                      buttonLabel="Titelbild auswaehlen"
                      busyLabel="Lade Titelbild..."
                      disabled={busy}
                      onFiles={(files) => handleOfferMediaUpload(files, 'title')}
                    />
                    <MediaDropzone
                      title="Weitere Medien"
                      description="Bilder oder Videos hinzufuegen. Maximal 8 Medien."
                      accept="image/*,video/*"
                      multiple
                      buttonLabel="Medien auswaehlen"
                      busyLabel="Lade Medien..."
                      disabled={busy}
                      onFiles={(files) => handleOfferMediaUpload(files, 'gallery')}
                    />
                    {offerForm.titleImageUrl && (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <img src={offerForm.titleImageUrl} alt="Titelbild" className="h-56 w-full object-cover" />
                      </div>
                    )}
                    {offerForm.mediaItems.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {offerForm.mediaItems.map((item, index) => (
                          <div key={`${item.url}-${index}`} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-square">
                            {item.type === 'image' ? (
                              <img src={String(item.url).trim()} alt="Anzeigenmedium" className="w-full h-full object-cover" />
                            ) : (
                              <video src={String(item.url).trim()} className="w-full h-full object-cover" controls playsInline />
                            )}
                            <button
                              type="button"
                              onClick={() => setOfferForm((prev) => ({ ...prev, mediaItems: prev.mediaItems.filter((_, mediaIndex) => mediaIndex !== index) }))}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveOffer}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
                      >
                        <Save size={14} /> Speichern
                      </button>
                      {itemId !== 'new' && (
                        <button
                          type="button"
                          onClick={handleDeleteOffer}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-700 disabled:opacity-60"
                        >
                          <Trash2 size={14} /> Loeschen
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {kind === 'angebote' ? (
                currentOffer || itemId === 'new' ? (
                  <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
                    <section className="space-y-6">
                      <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                        <div className="relative">
                          {String((currentOffer as any)?.titleImageUrl || '').trim() ? (
                            <img src={String((currentOffer as any)?.titleImageUrl).trim()} alt={String((currentOffer as any)?.titel || 'Anzeige')} className="h-72 w-full object-cover md:h-[28rem]" />
                          ) : (
                            <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-slate-400 md:h-[28rem]">
                              <ImageIcon size={56} />
                            </div>
                          )}
                          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">{itemId === 'new' ? 'Entwurf' : 'Anzeige'}</span>
                            {(currentOffer as any)?.visibility === 'draft' && itemId !== 'new' && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">Entwurf</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-5 p-6 md:p-8">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{profileName}</p>
                            <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 md:text-5xl">{String((currentOffer as any)?.titel || offerForm.titel || 'Neue Anzeige')}</h2>
                            {String((currentOffer as any)?.kategorie || offerForm.kategorie || '').trim() && (
                              <p className="text-sm font-black uppercase tracking-widest text-emerald-700">{String((currentOffer as any)?.kategorie || offerForm.kategorie)}</p>
                            )}
                          </div>

                          {String((currentOffer as any)?.beschreibung || offerForm.beschreibung || '').trim() && (
                            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">{String((currentOffer as any)?.beschreibung || offerForm.beschreibung)}</p>
                          )}

                          {Array.isArray((currentOffer as any)?.mediaItems) && (currentOffer as any).mediaItems.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                              {(currentOffer as any).mediaItems.map((item: MediaItem, index: number) => renderMediaItem(item, `${item.url}-${index}`))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {!isOwnProfile && profileRow && (
                              <button
                                type="button"
                                onClick={openMessageComposer}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                              >
                                <MessageSquare size={14} /> Nachricht schreiben
                              </button>
                            )}
                            {isOwnProfile && isExpertProfile && itemId !== 'new' && (
                              <button
                                type="button"
                                onClick={() => router.replace(`/profil/${profileUserId}/detail/angebote/${encodeURIComponent(String(itemId))}?mode=edit`)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700"
                              >
                                <PencilLine size={14} /> Bearbeiten
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    </section>

                    <aside className="space-y-5">
                      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Navigation</p>
                        <div className="mt-4 space-y-3">
                          {previousItem ? (
                            <button
                              type="button"
                              onClick={navigatePrevious}
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                            >
                              <span>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Vorherige Anzeige</span>
                                <span className="mt-1 block text-sm font-black uppercase text-slate-900">{kind === 'angebote' ? String((previousItem as OfferItem).titel || (previousItem as OfferItem).kategorie || 'Anzeige') : String((previousItem as PostItem).title || 'Beitrag')}</span>
                              </span>
                              <ChevronUp size={18} className="text-slate-500" />
                            </button>
                          ) : null}
                          {nextItem ? (
                            <button
                              type="button"
                              onClick={navigateNext}
                              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                            >
                              <span>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Naechste Anzeige</span>
                                <span className="mt-1 block text-sm font-black uppercase text-slate-900">{kind === 'angebote' ? String((nextItem as OfferItem).titel || (nextItem as OfferItem).kategorie || 'Anzeige') : String((nextItem as PostItem).title || 'Beitrag')}</span>
                              </span>
                              <ChevronDown size={18} className="text-slate-500" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </aside>
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-600">Anzeige nicht gefunden.</div>
                )
              ) : currentPost || itemId === 'new' ? (
                <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
                  <section className="space-y-6">
                    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                      <div className="relative">
                        {postMediaItems.length > 0 || (currentPost && currentPost.media_items.length > 0) ? (
                          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                            {(currentPost ? currentPost.media_items : postMediaItems).map((item, index) => renderMediaItem(item, `${item.url}-${index}`))}
                          </div>
                        ) : (
                          <div className="flex h-72 w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-slate-400 md:h-[28rem]">
                            <Eye size={56} />
                          </div>
                        )}
                        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">{itemId === 'new' ? 'Entwurf' : 'Beitrag'}</span>
                        </div>
                      </div>

                      <div className="space-y-5 p-6 md:p-8">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{profileName}</p>
                          <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 md:text-5xl">{postForm.title || currentPost?.title || 'Neuer Beitrag'}</h2>
                          {currentPost?.created_at && itemId !== 'new' && (
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{new Date(currentPost.created_at).toLocaleString('de-DE')}</p>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">{postForm.content || currentPost?.content || 'Noch kein Inhalt hinterlegt.'}</p>

                        <div className="flex flex-wrap gap-2">
                          {!isOwnProfile && profileRow && (
                            <button
                              type="button"
                              onClick={openMessageComposer}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
                            >
                              <MessageSquare size={14} /> Nachricht schreiben
                            </button>
                          )}
                          {isOwnProfile && itemId !== 'new' && (
                            <button
                              type="button"
                              onClick={() => router.replace(`/profil/${profileUserId}/detail/beitraege/${encodeURIComponent(String(itemId))}?mode=edit`)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700"
                            >
                              <PencilLine size={14} /> Bearbeiten
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  </section>

                  <aside className="space-y-5">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Navigation</p>
                      <div className="mt-4 space-y-3">
                        {previousItem ? (
                          <button
                            type="button"
                            onClick={navigatePrevious}
                            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                          >
                            <span>
                              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Vorheriger Beitrag</span>
                              <span className="mt-1 block text-sm font-black uppercase text-slate-900">{String(previousItem.title || 'Beitrag')}</span>
                            </span>
                            <ChevronUp size={18} className="text-slate-500" />
                          </button>
                        ) : null}
                        {nextItem ? (
                          <button
                            type="button"
                            onClick={navigateNext}
                            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left"
                          >
                            <span>
                              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Naechster Beitrag</span>
                              <span className="mt-1 block text-sm font-black uppercase text-slate-900">{String(nextItem.title || 'Beitrag')}</span>
                            </span>
                            <ChevronDown size={18} className="text-slate-500" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-600">Beitrag nicht gefunden.</div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
