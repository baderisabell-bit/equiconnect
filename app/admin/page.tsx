"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BellRing, Shield, Sparkles, Megaphone, Users, CalendarCheck2 } from "lucide-react";
import { adminLogout } from "../actions";

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
  const onLogout = async () => {
    sessionStorage.removeItem("adminPanelCode");
    await adminLogout();
    window.location.href = "/admin/login";
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

        <section className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <CalendarCheck2 size={18} className="mt-1 text-emerald-700" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Hinweis</p>
              <p className="mt-2 text-sm text-emerald-900 leading-relaxed">
                Das Passwort wird nur fuer die Admin-Sitzung verwendet. Bei Logout oder Ablauf musst du dich erneut anmelden.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}