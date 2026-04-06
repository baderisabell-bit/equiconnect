"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarCheck2, CheckCheck, Info, MessageCircleMore, ShieldAlert } from 'lucide-react';
import { getUserNotifications, markAllUserNotificationsRead, markUserNotificationRead } from '../actions';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  href: string | null;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

type NotificationBellProps = {
  userId: number | null;
};

export default function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      setLoading(true);
      const res = await getUserNotifications(userId);
      if (res.success) {
        setItems((res.items || []) as NotificationItem[]);
        setUnreadCount(Number(res.unreadCount || 0));
      }
      setLoading(false);
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 45000);
    return () => window.clearInterval(intervalId);
  }, [userId]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!userId) return null;

  const openNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markUserNotificationRead({ userId, notificationId: item.id });
      setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, is_read: true, read_at: new Date().toISOString() } : entry));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  };

  const markAllRead = async () => {
    const res = await markAllUserNotificationsRead(userId);
    if (!res.success) return;
    setItems((prev) => prev.map((entry) => ({ ...entry, is_read: true, read_at: entry.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeMeta = (type: string) => {
    const normalized = String(type || '').toLowerCase();
    if (normalized === 'booking') {
      return {
        label: 'Buchung',
        chipClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        Icon: CalendarCheck2,
      };
    }
    if (normalized === 'message') {
      return {
        label: 'Nachricht',
        chipClass: 'bg-sky-50 text-sky-700 border border-sky-200',
        Icon: MessageCircleMore,
      };
    }
    if (normalized === 'admin' || normalized === 'support') {
      return {
        label: 'Hinweis',
        chipClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        Icon: ShieldAlert,
      };
    }
    return {
      label: 'Info',
      chipClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      Icon: Info,
    };
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Benachrichtigungen öffnen"
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-12 h-12 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-700 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-2rem)] rounded-[2rem] border border-slate-200 bg-white shadow-2xl overflow-hidden z-[80]">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Benachrichtigungen</p>
              <p className="text-sm font-black uppercase italic text-slate-900">{unreadCount} ungelesen</p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-700"
            >
              <CheckCheck size={14} />
              Alles gelesen
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="px-5 py-6 text-sm font-bold text-slate-400">Benachrichtigungen werden geladen...</div>
            ) : items.length === 0 ? (
              <div className="px-5 py-6 text-sm font-bold text-slate-400">Noch keine In-App-Benachrichtigungen vorhanden.</div>
            ) : (
              items.map((item) => {
                const typeMeta = getTypeMeta(item.notification_type);
                const TypeIcon = typeMeta.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors ${item.is_read ? 'bg-white' : 'bg-emerald-50/60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${typeMeta.chipClass}`}>
                            <TypeIcon size={12} />
                            {typeMeta.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.message}</p>
                      </div>
                      {!item.is_read ? <span className="mt-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> : null}
                    </div>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{formatDate(item.created_at)}</p>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push('/benachrichtigungen');
              }}
              className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
            >
              Alle Benachrichtigungen anzeigen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}