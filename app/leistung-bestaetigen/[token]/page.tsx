'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  getBookingSwipeConfirmationByToken,
  confirmBookingSwipe,
} from '@/app/actions-bridge';

type ConfirmationData = {
  booking_id: number;
  confirmation_status: string;
  expires_at: string;
  confirmed_at: string | null;
  booking_status: string;
  booking_date: string;
  service_title: string;
  total_cents: number;
  customer_total_cents: number;
  protection_fee_cents: number;
  final_fee_bps: number;
  protection_model: string;
  currency: string;
  student_name: string | null;
  expert_name: string | null;
  expired: boolean;
};

export default function BookingSwipeConfirmPage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;

  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [data, setData] = useState<ConfirmationData | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const formatEuro = (cents: number) => {
    return (Number(cents || 0) / 100).toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
    });
  };

  const maxX = useMemo(() => {
    const width = trackRef.current?.offsetWidth || 320;
    return Math.max(1, width - 56);
  }, [trackRef.current?.offsetWidth]);

  const progress = Math.max(0, Math.min(1, dragX / maxX));

  const loadData = useCallback(async () => {
    if (!token) {
      setError('Bestätigungslink ist ungültig.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getBookingSwipeConfirmationByToken(token);
    if (!result.success) {
      setError(result.error || 'Link konnte nicht geladen werden.');
      setLoading(false);
      return;
    }
    setData(result.confirmation as ConfirmationData);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clampDrag = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - 28;
    setDragX(Math.max(0, Math.min(maxX, x)));
  }, [maxX]);

  const finalizeSwipe = useCallback(async () => {
    if (!token) return;

    if (progress < 0.92) {
      setDragX(0);
      setDragging(false);
      return;
    }

    setConfirming(true);
    const result = await confirmBookingSwipe(token);
    setConfirming(false);

    if (!result.success) {
      setError(result.error || 'Bestätigung fehlgeschlagen.');
      setDragX(0);
      setDragging(false);
      await loadData();
      return;
    }

    setSuccess(result.alreadyConfirmed ? 'Leistung war bereits bestätigt.' : 'Leistung erfolgreich bestätigt.');
    setDragging(false);
    setDragX(maxX);
    await loadData();
  }, [token, progress, maxX, loadData]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    clampDrag(e.clientX);
  }, [dragging, clampDrag]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging || e.touches.length === 0) return;
    clampDrag(e.touches[0].clientX);
  }, [dragging, clampDrag]);

  const onRelease = useCallback(() => {
    if (!dragging) return;
    finalizeSwipe();
  }, [dragging, finalizeSwipe]);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onRelease);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onRelease);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onRelease);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onRelease);
    };
  }, [onMouseMove, onTouchMove, onRelease]);

  const isConfirmed = data?.confirmation_status === 'confirmed' || data?.booking_status === 'bestaetigt' || Boolean(success);
  const isExpired = Boolean(data?.expired) && !isConfirmed;

  return (
    <main className='min-h-screen bg-slate-100 flex items-center justify-center p-4'>
      <section className='w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5'>
        <header className='text-center space-y-1'>
          <p className='text-[11px] uppercase tracking-[0.2em] font-black text-slate-400'>Leistungsbestätigung</p>
          <h1 className='text-2xl font-black text-slate-900'>Swipe zur Bestätigung</h1>
        </header>

        {loading ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='w-8 h-8 animate-spin text-slate-400' />
          </div>
        ) : error ? (
          <div className='alert alert-error text-sm'>
            <AlertCircle size={16} /> {error}
          </div>
        ) : data ? (
          <>
            <div className='rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-1'>
              <p className='text-xs text-slate-500'>Leistung</p>
              <p className='font-bold text-slate-800'>{data.service_title}</p>
              <p className='text-sm text-slate-600'>
                {new Date(data.booking_date).toLocaleDateString('de-DE')} · {formatEuro(data.total_cents)}
              </p>
              <p className='text-xs font-bold uppercase tracking-widest text-emerald-700'>
                Schutzaufschlag: {formatEuro(data.protection_fee_cents || 0)} · Endpreis: {formatEuro(data.customer_total_cents || data.total_cents)}
              </p>
              <p className='text-xs text-slate-400'>
                Schüler: {data.student_name || '-'} · Experte: {data.expert_name || '-'}
              </p>
            </div>

            {isConfirmed ? (
              <div className='alert alert-success text-sm'>
                <CheckCircle2 size={16} /> {success || 'Leistung bereits bestätigt.'}
              </div>
            ) : isExpired ? (
              <div className='alert alert-warning text-sm'>
                <AlertCircle size={16} /> Dieser Link ist abgelaufen. Bitte neuen Link anfordern.
              </div>
            ) : (
              <div className='space-y-2'>
                <div
                  ref={trackRef}
                  className='relative h-14 rounded-full bg-slate-200 overflow-hidden select-none'
                  style={{ touchAction: 'none' }}
                >
                  <div
                    className='absolute left-0 top-0 h-full bg-emerald-500 transition-all duration-150'
                    style={{ width: `${Math.max(56, (progress * 100))}%` }}
                  />
                  <p className='absolute inset-0 flex items-center justify-center text-xs font-black uppercase tracking-widest text-slate-700 pointer-events-none'>
                    Nach rechts ziehen zum Bestätigen
                  </p>
                  <button
                    type='button'
                    className='absolute top-1 h-12 w-12 rounded-full bg-white shadow-md border border-slate-200 cursor-grab active:cursor-grabbing flex items-center justify-center font-black text-emerald-600'
                    style={{ left: `${dragX + 4}px` }}
                    disabled={confirming}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                  >
                    {confirming ? <Loader2 className='w-4 h-4 animate-spin' /> : '>'}
                  </button>
                </div>
                <p className='text-[11px] text-slate-500'>
                  Mit dem Swipe bestätigst du, dass die Reitstunde stattgefunden hat und der geschützte Betrag freigegeben werden darf.
                </p>
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
