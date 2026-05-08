"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BellRing, Shield, Sparkles, Megaphone, Users, CalendarCheck2, Trash2 } from "lucide-react";
import { adminDeleteUser, adminDeleteUserPosts, adminFindUserByIdentity, adminLogout } from "../actions";

type AdminUser = {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  role: string;
  birth_date?: string | null;
};

type AdminSection = {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/moderation",
    title: "Moderation",
    description: "Meldungen, Chats, Profile und Sanktionen verwalten.",
    icon: <Shield size={18} />,
  },
  {
    href: "/admin/verifizierung",
    title: "Verifizierung",
    description: "Profile prüfen und verifizierte Angaben freigeben.",
    icon: <BadgeCheck size={18} />,
  },
  {
    href: "/admin/kontakt",
    title: "Kontakt",
    description: "Support-Nachrichten und Tickets ansehen.",
    icon: <BellRing size={18} />,
  },
  {
    href: "/admin/werbung",
    title: "Werbung",
    description: "Anzeigen- und Marketingfreigaben prüfen.",
    icon: <Megaphone size={18} />,
  },
  {
    href: "/admin/abo",
    title: "Newsletter",
    description: "Abo-Gruppen, Empfänger und Preislisten verwalten.",
    icon: <Users size={18} />,
  },
  {
    href: "/admin/abo-management",
    title: "Abo-Management",
    description: "Gründungsmitglieder, Lebenszugriffe und Analytik.",
    icon: <Sparkles size={18} />,
  },
  {
    href: "/admin/early-access",
    title: "Early Access",
    description: "Frühzugriff-Statistiken und Aktivierungen ansehen.",
    icon: <CalendarCheck2 size={18} />,
  },
];

export default function AdminHomePage() {
  const [adminCode, setAdminCode] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchBirthDate, setSearchBirthDate] = useState('');
  const [searchedUser, setSearchedUser] = useState<AdminUser | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setAdminCode(sessionStorage.getItem('adminPanelCode') || '');
  }, []);

  const onLogout = async () => {
    sessionStorage.removeItem("adminPanelCode");
    await adminLogout();
    window.location.href = "/admin/login";
  };

  const searchUser = async () => {
    if (!adminCode.trim()) {
      alert('Bitte zuerst im Admin-Login anmelden.');
      return;
    }

    setSearchBusy(true);
    const res = await adminFindUserByIdentity({
      adminCode,
      firstName: searchFirstName,
      lastName: searchLastName,
      birthDate: searchBirthDate,
    } as any);
    setSearchBusy(false);

    if (!res.success) {
      alert(res.error || 'Nutzer konnte nicht gefunden werden.');
      return;
    }

    setSearchedUser((res.user || null) as AdminUser | null);
  };

  const deleteUser = async () => {
    if (!adminCode.trim() || !searchedUser) return;
    if (!confirm('Profil wirklich dauerhaft löschen?')) return;

    setDeleteBusy(true);
    const res = await adminDeleteUser({ adminCode, userId: searchedUser.id } as any);
    setDeleteBusy(false);

    if (!res.success) {
      alert(res.error || 'Löschen fehlgeschlagen.');
      return;
    }

    alert('Profil gelöscht.');
    setSearchedUser(null);
  };

  const deleteUserPosts = async () => {
    if (!adminCode.trim() || !searchedUser) return;
    if (!confirm('Alle Beiträge dieses Profils löschen?')) return;

    setDeleteBusy(true);
    const res = await adminDeleteUserPosts({ adminCode, userId: searchedUser.id } as any);
    setDeleteBusy(false);

    if (!res.success) {
      alert(res.error || 'Beiträge konnten nicht gelöscht werden.');
      return;
    }

    alert('Beiträge gelöscht.');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#f8fafc,_#eef8f2_45%,_#ffffff_100%)] text-slate-900">
      <main className="max-w-6xl mx-auto px-5 py-10 md:py-14 space-y-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 backdrop-blur p-8 md:p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">Admin Hub</p>
              <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-slate-900">Zentrale Administration</h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed">
                Von hier aus springst du direkt zu Moderation, Verifizierung, Kontakt, Werbung, Newsletter und Early Access.
                Der Bereich ist per Passwort geschuetzt.
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest"
            >
              Abmelden
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ADMIN_SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {section.icon}
                  </span>
                  <div>
                    <h2 className="text-lg font-black italic uppercase tracking-tight text-slate-900">{section.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[1.75rem] border border-red-100 bg-red-50 p-5 md:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-600 border border-red-100">
              <Trash2 size={18} />
            </span>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Löschfunktionen</p>
              <p className="text-sm text-red-950 leading-relaxed">
                Profile und Beiträge kannst du direkt hier suchen und löschen. Falls du mehr Details brauchst, ist die
                <Link href="/admin/moderation" className="font-black underline underline-offset-2"> Moderation</Link> weiterhin verfügbar.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={searchFirstName} onChange={(e) => setSearchFirstName(e.target.value)} placeholder="Vorname" className="p-3 rounded-xl border border-red-200 bg-white" />
            <input value={searchLastName} onChange={(e) => setSearchLastName(e.target.value)} placeholder="Nachname" className="p-3 rounded-xl border border-red-200 bg-white" />
            <input value={searchBirthDate} onChange={(e) => setSearchBirthDate(e.target.value)} type="date" className="p-3 rounded-xl border border-red-200 bg-white" />
            <button type="button" onClick={searchUser} disabled={searchBusy} className="px-4 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60">
              {searchBusy ? 'Suche...' : 'Nutzer suchen'}
            </button>
          </div>
          {searchedUser && (
            <div className="rounded-2xl border border-red-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-sm font-black uppercase text-slate-900">{searchedUser.vorname} {searchedUser.nachname}</p>
                <p className="text-[10px] font-black uppercase text-slate-500">{searchedUser.email} • {searchedUser.role}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={deleteUser} disabled={deleteBusy} className="px-4 py-3 rounded-xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-60">
                  {deleteBusy ? 'Lösche...' : 'Profil löschen'}
                </button>
                <button type="button" onClick={deleteUserPosts} disabled={deleteBusy} className="px-4 py-3 rounded-xl border border-red-200 bg-white text-red-700 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 disabled:opacity-60">
                  Beiträge löschen
                </button>
              </div>
              <p className="text-[11px] font-bold text-slate-500">Die Löschung läuft über dieselbe Serverlogik wie im Profilbereich.</p>
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <CalendarCheck2 size={18} className="mt-1 text-emerald-700" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Hinweis</p>
              <p className="mt-2 text-sm text-emerald-900 leading-relaxed">
                Das Passwort wird nur für die Admin-Sitzung verwendet. Bei Logout oder Ablauf musst du dich erneut anmelden.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}