"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../components/logged-in-header";
import { getInvoiceData, getMyStudents, getOwnSubscriptionInvoicePdf, getOwnSubscriptionInvoices, getUserBookings } from "../../actions";

type BookingItem = {
  id: number;
  booking_type: string | null;
  provider_name: string | null;
  booking_date: string | null;
  status: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  source_offer_id?: string | null;
};

type ExpertStudent = {
  student_id: number;
  display_name: string | null;
  email: string | null;
};

type InvoiceBooking = {
  id: number;
  booking_date: string | null;
  service_title: string | null;
  duration_minutes: number | null;
  quantity: number | null;
  unit_price_cents: number | null;
  total_cents: number | null;
  customer_total_cents?: number | null;
  expert_payout_cents?: number | null;
  status: string | null;
  notes: string | null;
  source_offer_id?: string | null;
  offer_conditions_text?: string | null;
  unit_price_euro?: number;
  total_euro?: number;
};

type SubscriptionInvoiceItem = {
  id: number;
  invoice_month: string;
  invoice_number: string;
  due_at: string;
  amount_cents: number;
  status: string;
  payment_method: string;
  plan_label: string;
};

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const currentMonthParts = () => {
  const date = new Date();
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
  };
};

const MONTH_OPTIONS = [
  { value: "01", label: "Januar" },
  { value: "02", label: "Februar" },
  { value: "03", label: "März" },
  { value: "04", label: "April" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Dezember" },
];

const formatDate = (value: string | null | undefined) => {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("de-DE");
};

const formatMoney = (cents: number | null | undefined) => {
  const value = Number(cents || 0) / 100;
  return `${value.toFixed(2).replace(".", ",")} €`;
};

const formatTitle = (value: string | null | undefined) => {
  const title = String(value || "").trim();
  return title.length > 0 ? title : "Buchung";
};

export default function RechnungenPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<"experte" | "nutzer" | "unknown">("unknown");
  const [userName, setUserName] = useState("Profil");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [expertStudents, setExpertStudents] = useState<ExpertStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState(currentMonth());
  const [invoiceYear, setInvoiceYear] = useState(currentMonthParts().year);
  const [invoiceMonthPart, setInvoiceMonthPart] = useState(currentMonthParts().month);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<BookingItem[]>([]);
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<SubscriptionInvoiceItem[]>([]);
  const [downloadingSubscriptionInvoiceId, setDownloadingSubscriptionInvoiceId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | "equi" | "other">("all");

  const invoiceYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => String(currentYear - 3 + index));
  }, []);

  useEffect(() => {
    if (!invoiceYear || !invoiceMonthPart) return;
    setInvoiceMonth(`${invoiceYear}-${invoiceMonthPart}`);
  }, [invoiceMonthPart, invoiceYear]);

  useEffect(() => {
    const rawUserId = sessionStorage.getItem("userId");
    const rawRole = sessionStorage.getItem("userRole");
    const rawName = sessionStorage.getItem("userName") || "Profil";

    const parsedUserId = rawUserId ? parseInt(rawUserId, 10) : NaN;
    if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
      router.push("/login");
      return;
    }

    const normalizedRole = String(rawRole || "").trim().toLowerCase();
    const nextRole: "experte" | "nutzer" | "unknown" = normalizedRole === "experte" ? "experte" : (normalizedRole === "nutzer" || normalizedRole === "user" || normalizedRole === "kunde" ? "nutzer" : "unknown");
    if (nextRole === "unknown") {
      router.push("/login");
      return;
    }

    setUserId(parsedUserId);
    setRole(nextRole);
    setUserName(rawName);
  }, [router]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setMessage("");

      if (role === "experte") {
        const [subInvoicesRes, studentsRes] = await Promise.all([
          getOwnSubscriptionInvoices(userId, 36),
          getMyStudents(userId),
        ]);

        if (subInvoicesRes.success) {
          setSubscriptionInvoices(((subInvoicesRes as any).items || []) as SubscriptionInvoiceItem[]);
        } else {
          setSubscriptionInvoices([]);
        }

        if (studentsRes.success) {
          const nextStudents = ((studentsRes as any).students || []) as ExpertStudent[];
          setExpertStudents(nextStudents);
          setSelectedStudentId((prev) => prev || nextStudents[0]?.student_id || null);
        } else {
          setMessage(studentsRes.error || "Kunden konnten nicht geladen werden.");
        }
      } else {
        const [subInvoicesRes, bookingsRes] = await Promise.all([
          getOwnSubscriptionInvoices(userId, 36),
          getUserBookings(userId),
        ]);

        if (subInvoicesRes.success) {
          setSubscriptionInvoices(((subInvoicesRes as any).items || []) as SubscriptionInvoiceItem[]);
        } else {
          setSubscriptionInvoices([]);
        }

        if (bookingsRes.success) {
          setUserBookings(((bookingsRes as any).items || []) as BookingItem[]);
        } else {
          setMessage(bookingsRes.error || "Buchungen konnten nicht geladen werden.");
        }
      }

      setLoading(false);
    };

    load();
  }, [role, userId]);

  useEffect(() => {
    const loadExpertInvoice = async () => {
      if (!userId || role !== "experte" || !selectedStudentId) {
        setInvoiceData(null);
        setBusy(false);
        return;
      }
      setBusy(true);
      const res = await getInvoiceData(userId, selectedStudentId, invoiceMonth);
      setBusy(false);
      if (res.success) {
        setInvoiceData(res);
        setMessage("");
      } else {
        setInvoiceData(null);
        setMessage(res.error || "Rechnung konnte nicht geladen werden.");
      }
    };

    loadExpertInvoice();
  }, [invoiceMonth, role, selectedStudentId, userId]);

  const openProfile = () => {
    if (!userId) {
      router.push("/login");
      return;
    }
    router.push(`/profil/${userId}`);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const dashboardHref = role === "experte" ? "/dashboard/experte" : "/dashboard/nutzer";
  const invoicesHref = "/dashboard/rechnungen";
  const isExpert = role === "experte";

  const userBookingGroups = useMemo(() => {
    const normalized = userBookings.map((booking) => {
      const bookingType = String(booking.booking_type || "").trim();
      const providerName = String(booking.provider_name || "").trim();
      const combined = `${bookingType} ${providerName}`.toLowerCase();
      const isEquiConnect = combined.includes("equi") || combined.includes("kalender") || combined.includes("warteliste") || combined.includes("buchung");
      return { ...booking, isEquiConnect };
    });

    return {
      equiConnect: normalized.filter((booking) => booking.isEquiConnect),
      other: normalized.filter((booking) => !booking.isEquiConnect),
    };
  }, [userBookings]);

  const expertBookingGroups = useMemo(() => {
    const bookings = ((invoiceData?.bookings || []) as InvoiceBooking[]).map((booking) => ({
      ...booking,
      source_offer_id: booking.source_offer_id || null,
      offer_conditions_text: booking.offer_conditions_text || null,
      unit_price_euro: Number(booking.unit_price_cents || 0) / 100,
      total_euro: Number(booking.total_cents || 0) / 100,
    }));

    const equiConnect = bookings.filter((booking) => Boolean(booking.source_offer_id) || String(booking.notes || "").includes("[AUTO-INVOICE"));
    const other = bookings.filter((booking) => !equiConnect.includes(booking));

    return { equiConnect, other };
  }, [invoiceData]);

  const printCurrentView = () => window.print();

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-500">Rechnungen werden geladen...</div>;
  }

  const categoryButton = (key: "all" | "equi" | "other", label: string, count: number) => {
    const active = activeCategory === key;
    return (
      <button
        type="button"
        onClick={() => setActiveCategory(key)}
        className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
      >
        {label} ({count})
      </button>
    );
  };

  const renderUserBookingCard = (booking: BookingItem & { isEquiConnect?: boolean }) => (
    <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{booking.isEquiConnect ? "Equily" : "Weitere Buchungen"}</p>
          <h3 className="mt-2 text-lg font-black uppercase italic text-slate-900">{formatTitle(booking.booking_type)}</h3>
          <p className="mt-1 text-sm text-slate-600">{booking.provider_name || "–"}</p>
        </div>
        <button type="button" onClick={printCurrentView} className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white print:hidden">
          Als PDF drucken
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>Datum: <span className="font-black text-slate-900">{formatDate(booking.booking_date || booking.created_at)}</span></p>
        <p>Status: <span className="font-black text-slate-900">{formatTitle(booking.status)}</span></p>
        <p>Ort: <span className="font-black text-slate-900">{booking.location || "–"}</span></p>
        <p>Quelle: <span className="font-black text-slate-900">{booking.isEquiConnect ? "Plattform" : "Sonstiges"}</span></p>
      </div>
      {booking.notes && <p className="mt-4 text-sm text-slate-500 whitespace-pre-line">{booking.notes}</p>}
    </article>
  );

  const renderSubscriptionInvoiceCard = (invoice: SubscriptionInvoiceItem) => (
    <article key={`sub-invoice-${invoice.id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Abo-Rechnung</p>
          <h3 className="mt-2 text-lg font-black uppercase italic text-slate-900">{invoice.plan_label || "Abonnement"}</h3>
          <p className="mt-1 text-sm text-slate-600">{invoice.invoice_number || invoice.invoice_month}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={async () => {
              if (!userId) return;
              setDownloadingSubscriptionInvoiceId(invoice.id);
              const res = await getOwnSubscriptionInvoicePdf({ userId, invoiceId: invoice.id });
              setDownloadingSubscriptionInvoiceId(null);
              if (!res.success || !(res as any).base64) {
                setMessage((res as any).error || "PDF konnte nicht geladen werden.");
                return;
              }
              const byteChars = atob(String((res as any).base64));
              const bytes = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i += 1) bytes[i] = byteChars.charCodeAt(i);
              const blob = new Blob([bytes], { type: String((res as any).mimeType || "application/pdf") });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = String((res as any).fileName || `abo-rechnung-${invoice.id}.pdf`);
              document.body.appendChild(anchor);
              anchor.click();
              document.body.removeChild(anchor);
              URL.revokeObjectURL(url);
            }}
            disabled={downloadingSubscriptionInvoiceId === invoice.id}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"
          >
            {downloadingSubscriptionInvoiceId === invoice.id ? "Lade PDF..." : "PDF herunterladen"}
          </button>
          <button type="button" onClick={printCurrentView} className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">
            Drucken
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>Monat: <span className="font-black text-slate-900">{invoice.invoice_month}</span></p>
        <p>Betrag: <span className="font-black text-slate-900">{formatMoney(invoice.amount_cents)}</span></p>
        <p>Fällig am: <span className="font-black text-slate-900">{formatDate(invoice.due_at)}</span></p>
        <p>Status: <span className="font-black text-slate-900">{formatTitle(invoice.status)}</span></p>
      </div>
      <p className="mt-3 text-sm text-slate-700 font-bold">
        {String(invoice.status || "").toLowerCase() === "bezahlt"
          ? "Diese Rechnung wurde schon beglichen."
          : "Diese Rechnung ist noch zu begleichen."}
      </p>
    </article>
  );

  const renderInvoiceBookingCard = (booking: InvoiceBooking) => (
    <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">{booking.source_offer_id ? "Equily" : "Weitere Buchungen"}</p>
          <h3 className="mt-2 text-lg font-black uppercase italic text-slate-900">{formatTitle(booking.service_title)}</h3>
          <p className="mt-1 text-sm text-slate-600">{formatDate(booking.booking_date)}</p>
        </div>
        <button type="button" onClick={printCurrentView} className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white print:hidden">
          Als PDF drucken
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>Menge: <span className="font-black text-slate-900">{booking.quantity || 1}</span></p>
        <p>Dauer: <span className="font-black text-slate-900">{booking.duration_minutes || 0} Min.</span></p>
        <p>Einzelpreis: <span className="font-black text-slate-900">{formatMoney(booking.unit_price_cents)}</span></p>
        <p>Gesamt: <span className="font-black text-slate-900">{formatMoney(booking.total_cents)}</span></p>
      </div>
      {booking.offer_conditions_text && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-pre-line">{booking.offer_conditions_text}</p>}
      {booking.notes && <p className="mt-4 text-sm text-slate-500 whitespace-pre-line">{booking.notes}</p>}
    </article>
  );

  const renderUserContent = () => {
    const groups = userBookingGroups;
    const filtered = activeCategory === "equi"
      ? groups.equiConnect
      : activeCategory === "other"
        ? groups.other
        : [...groups.equiConnect, ...groups.other];

    return (
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Abo-Abrechnung</p>
          <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Deine Abo-Rechnungen</h2>
          <p className="mt-2 text-sm text-slate-600">Automatisch erzeugte Monatsrechnungen aus deinem aktiven Abo.</p>
          {subscriptionInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Noch keine Abo-Rechnungen vorhanden.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {subscriptionInvoices.slice(0, 12).map((invoice) => renderSubscriptionInvoiceCard(invoice))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Deine Buchungen</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Rechnungen & Buchungen</h1>
          <p className="mt-2 text-sm text-slate-600">Hier findest du deine Equi-Connect-Buchungen und weitere Buchungen getrennt nach Kategorie. Über den Druck-Button kannst du die aktuelle Ansicht als PDF speichern.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {categoryButton("all", "Alle", groups.equiConnect.length + groups.other.length)}
            {categoryButton("equi", "Equily", groups.equiConnect.length)}
            {categoryButton("other", "Weitere Buchungen", groups.other.length)}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Keine Buchungen in dieser Kategorie gefunden.</div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((booking) => renderUserBookingCard(booking))}
          </div>
        )}
      </section>
    );
  };

  const renderExpertContent = () => {
    const selectedStudent = expertStudents.find((student) => student.student_id === selectedStudentId) || null;
    const groups = expertBookingGroups;
    const filtered = activeCategory === "equi"
      ? groups.equiConnect
      : activeCategory === "other"
        ? groups.other
        : [...groups.equiConnect, ...groups.other];

    return (
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Eigene Abo-Abrechnung</p>
          <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Abo-Rechnungen</h2>
          <p className="mt-2 text-sm text-slate-600">Auch dein eigenes Plattform-Abo wird hier automatisch aufgeführt.</p>
          {subscriptionInvoices.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Noch keine Abo-Rechnungen vorhanden.</p>
          ) : (
            <div className="mt-4 grid gap-4">
              {subscriptionInvoices.slice(0, 8).map((invoice) => renderSubscriptionInvoiceCard(invoice))}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Experten-Rechnungen</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase tracking-tight text-slate-900">Rechnungen für Kunden</h1>
          <p className="mt-2 text-sm text-slate-600">Wähle Kunde, Monat und Jahr, um Rechnungen gezielt zu filtern und als PDF zu drucken.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
            <select value={selectedStudentId ?? ""} onChange={(e) => setSelectedStudentId(e.target.value ? parseInt(e.target.value, 10) : null)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-emerald-300">
              {expertStudents.map((student) => (
                <option key={student.student_id} value={student.student_id}>{student.display_name || student.email || `Kunde ${student.student_id}`}</option>
              ))}
            </select>
            <select
              value={invoiceMonthPart}
              onChange={(e) => setInvoiceMonthPart(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-emerald-300"
            >
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <select
              value={invoiceYear}
              onChange={(e) => setInvoiceYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-emerald-300"
            >
              {invoiceYearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button type="button" onClick={printCurrentView} className="rounded-xl bg-slate-900 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white print:hidden">Drucken / PDF</button>
          </div>
        </div>

        {!selectedStudent ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Keine Kunden verfügbar.</div>
        ) : busy ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Rechnung wird geladen...</div>
        ) : !invoiceData ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Rechnung konnte nicht geladen werden.</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">{selectedStudent.display_name || selectedStudent.email || "Kunde"}</p>
              <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">{invoiceMonth}</h2>
              <p className="mt-2 text-sm text-slate-600">{invoiceData.invoiceNumber || "Rechnungsnummer folgt"}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {categoryButton("all", "Alle Positionen", groups.equiConnect.length + groups.other.length)}
              {categoryButton("equi", "Equily", groups.equiConnect.length)}
              {categoryButton("other", "Weitere Buchungen", groups.other.length)}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Keine Positionen in dieser Kategorie vorhanden.</div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((booking) => renderInvoiceBookingCard(booking))}
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push(dashboardHref); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Dashboard</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push(invoicesHref); }} className="block text-left text-lg font-black italic uppercase text-emerald-600">Rechnungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/suche"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/netzwerk"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/merkliste"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/nachrichten"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/einstellungen"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); router.push("/kontakt"); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role}
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        brandText="Equily"
      />

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-8">
        <aside className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm h-fit xl:sticky xl:top-8 space-y-3 print:hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Navigation</p>
          <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700">Rechnungen</div>
          <Link href={dashboardHref} className="block px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Dashboard</Link>
          <Link href={invoicesHref} className="block px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Rechnungen</Link>
          <button type="button" onClick={openProfile} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300">Mein Profil</button>
        </aside>

        <section className="space-y-8">
          {message && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{message}</div>}
          {isExpert ? renderExpertContent() : renderUserContent()}
        </section>
      </main>
    </div>
  );
}
