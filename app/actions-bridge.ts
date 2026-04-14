"use server";

import crypto from "crypto";
import { Pool } from "pg";

const databaseUrl =
  String(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();

function resolveDbSslConfig(connectionString: string) {
  const sslFlag = String(process.env.DB_SSL || process.env.PGSSLMODE || '').trim().toLowerCase();
  const sslDisabled = sslFlag === 'disable' || sslFlag === 'false' || sslFlag === '0' || sslFlag === 'off';
  if (sslDisabled) return undefined;

  const sslEnabledByEnv = sslFlag === 'require' || sslFlag === 'true' || sslFlag === '1' || sslFlag === 'on';

  let sslEnabledByUrl = false;
  if (connectionString) {
    try {
      const parsed = new URL(connectionString);
      const sslMode = String(parsed.searchParams.get('sslmode') || '').trim().toLowerCase();
      sslEnabledByUrl = sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full';
    } catch {
      sslEnabledByUrl = false;
    }
  }

  const useSsl = sslEnabledByEnv || sslEnabledByUrl || process.env.NODE_ENV === 'production';
  return useSsl ? { rejectUnauthorized: false } : undefined;
}

const localDbPort = Number(process.env.DB_PORT || process.env.PGPORT || 5432);

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: resolveDbSslConfig(databaseUrl),
    })
  : new Pool({
      user: String(process.env.DB_USER || process.env.PGUSER || "postgres"),
      host: String(process.env.DB_HOST || process.env.PGHOST || "127.0.0.1"),
      database: String(process.env.DB_NAME || process.env.PGDATABASE || "equipro"),
      password: String(process.env.DB_PASSWORD || process.env.PGPASSWORD || ""),
      port: Number.isFinite(localDbPort) ? localDbPort : 5432,
      ssl: resolveDbSslConfig(''),
    });

function getPublicAppUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
}

export async function createBookingSwipeConfirmation(payload: {
  expertId: number;
  studentId: number;
  bookingId: number;
  expiresHours?: number;
}) {
  try {
    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const bookingId = Number(payload.bookingId);
    const expiresHours = Math.max(1, Math.min(72, Number(payload.expiresHours) || 48));

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: "Ungueltige Experten-ID." };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: "Ungueltige Schueler-ID." };
    }
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return { success: false, error: "Ungueltige Buchungs-ID." };
    }

    const bookingRes = await pool.query(
      `SELECT id, status
       FROM expert_student_bookings
       WHERE id = $1 AND expert_id = $2 AND student_id = $3
       LIMIT 1`,
      [bookingId, expertId, studentId]
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      return { success: false, error: "Buchung nicht gefunden." };
    }
    if (String(booking.status) === "storniert" || String(booking.status) === "abgerechnet") {
      return { success: false, error: "Fuer diese Buchung kann keine Bestaetigung mehr erstellt werden." };
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO student_booking_confirmations
        (booking_id, expert_id, student_id, token, status, expires_at)
       VALUES ($1, $2, $3, $4, 'pending', $5::timestamp)
       ON CONFLICT (booking_id) DO UPDATE SET
         token = EXCLUDED.token,
         status = 'pending',
         expires_at = EXCLUDED.expires_at,
         confirmed_at = NULL,
         updated_at = NOW()`,
      [bookingId, expertId, studentId, token, expiresAt]
    );

    const appUrl = getPublicAppUrl();
    const confirmUrl = appUrl ? `${appUrl}/leistung-bestaetigen/${token}` : `/leistung-bestaetigen/${token}`;

    return { success: true, token, confirmUrl, expiresAt };
  } catch (error: any) {
    return { success: false, error: error.message || "Bestaetigungslink konnte nicht erstellt werden." };
  }
}

export async function getBookingSwipeConfirmationByToken(token: string) {
  try {
    const safeToken = String(token || "").trim();
    if (!safeToken) {
      return { success: false, error: "Token fehlt." };
    }

    const result = await pool.query(
      `SELECT sbc.id,
              sbc.booking_id,
              sbc.status AS confirmation_status,
              sbc.expires_at,
              sbc.confirmed_at,
              esb.status AS booking_status,
              esb.booking_date,
              esb.service_title,
              esb.total_cents,
              esb.customer_total_cents,
              esb.protection_fee_cents,
              esb.final_fee_bps,
              esb.protection_model,
              esb.currency,
              up_student.display_name AS student_name,
              up_expert.display_name AS expert_name
       FROM student_booking_confirmations sbc
       JOIN expert_student_bookings esb ON esb.id = sbc.booking_id
       LEFT JOIN user_profiles up_student ON up_student.user_id = sbc.student_id
       LEFT JOIN user_profiles up_expert ON up_expert.user_id = sbc.expert_id
       WHERE sbc.token = $1
       LIMIT 1`,
      [safeToken]
    );

    const row = result.rows[0];
    if (!row) {
      return { success: false, error: "Link ungueltig oder nicht gefunden." };
    }

    const now = Date.now();
    const expiresAt = new Date(row.expires_at).getTime();
    const expired = Number.isFinite(expiresAt) ? now > expiresAt : true;

    return {
      success: true,
      confirmation: {
        ...row,
        expired,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Bestaetigungsdaten konnten nicht geladen werden." };
  }
}

export async function confirmBookingSwipe(token: string) {
  const client = await pool.connect();
  try {
    const safeToken = String(token || "").trim();
    if (!safeToken) {
      return { success: false, error: "Token fehlt." };
    }

    await client.query("BEGIN");

    const confRes = await client.query(
      `SELECT id, booking_id, status, expires_at, confirmed_at
       FROM student_booking_confirmations
       WHERE token = $1
       FOR UPDATE`,
      [safeToken]
    );

    const conf = confRes.rows[0];
    if (!conf) {
      await client.query("ROLLBACK");
      return { success: false, error: "Link ungueltig oder abgelaufen." };
    }

    if (String(conf.status) === "confirmed") {
      await client.query("COMMIT");
      return { success: true, alreadyConfirmed: true, bookingId: conf.booking_id };
    }

    const expiresAtMs = new Date(conf.expires_at).getTime();
    if (!Number.isFinite(expiresAtMs) || Date.now() > expiresAtMs) {
      await client.query(
        `UPDATE student_booking_confirmations
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [conf.id]
      );
      await client.query("COMMIT");
      return { success: false, error: "Link ist abgelaufen." };
    }

    const bookingRes = await client.query(
      `SELECT id, status
       FROM expert_student_bookings
       WHERE id = $1
       FOR UPDATE`,
      [conf.booking_id]
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return { success: false, error: "Buchung nicht gefunden." };
    }
    if (String(booking.status) === "storniert" || String(booking.status) === "abgerechnet") {
      await client.query("ROLLBACK");
      return { success: false, error: "Buchung kann nicht mehr bestaetigt werden." };
    }

    await client.query(
      `UPDATE expert_student_bookings
       SET status = 'bestaetigt',
           updated_at = NOW()
       WHERE id = $1`,
      [conf.booking_id]
    );

    await client.query(
      `UPDATE student_booking_confirmations
       SET status = 'confirmed',
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [conf.id]
    );

    await client.query("COMMIT");
    return { success: true, alreadyConfirmed: false, bookingId: conf.booking_id };
  } catch (error: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // noop
    }
    return { success: false, error: error.message || "Swipe-Bestaetigung fehlgeschlagen." };
  } finally {
    client.release();
  }
}

export async function getPendingSwipeConfirmationsForStudent(studentId: number, limit = 20) {
  try {
    const sId = Number(studentId);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    if (!Number.isInteger(sId) || sId <= 0) {
      return { success: false, error: "Ungueltige Nutzer-ID.", items: [] };
    }

    const result = await pool.query(
      `SELECT sbc.id,
              sbc.booking_id,
              sbc.token,
              sbc.expires_at,
              sbc.created_at,
              esb.booking_date,
              esb.service_title,
              esb.total_cents,
              esb.currency,
              esb.status AS booking_status,
              up_expert.display_name AS expert_name
       FROM student_booking_confirmations sbc
       JOIN expert_student_bookings esb ON esb.id = sbc.booking_id
       LEFT JOIN user_profiles up_expert ON up_expert.user_id = sbc.expert_id
       WHERE sbc.student_id = $1
         AND sbc.status = 'pending'
         AND sbc.expires_at > NOW()
         AND esb.status NOT IN ('storniert', 'abgerechnet')
       ORDER BY esb.booking_date DESC, sbc.created_at DESC
       LIMIT $2`,
      [sId, safeLimit]
    );

    const appUrl = getPublicAppUrl();
    const items = (result.rows || []).map((row: any) => ({
      ...row,
      confirm_url: appUrl ? `${appUrl}/leistung-bestaetigen/${row.token}` : `/leistung-bestaetigen/${row.token}`,
    }));

    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message || "Bestaetigungslinks konnten nicht geladen werden.", items: [] };
  }
}

export async function closeMonthlyConfirmedBookings(payload: {
  expertId: number;
  studentId: number;
  month: string;
}) {
  try {
    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const month = String(payload.month || "").trim();

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: "Ungueltige Experten-ID." };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: "Ungueltige Schueler-ID." };
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: "Ungueltiges Monatsformat." };
    }

    const result = await pool.query(
      `UPDATE expert_student_bookings
       SET status = 'abgerechnet',
           billed_month = date_trunc('month', booking_date)::date,
           updated_at = NOW()
       WHERE expert_id = $1
         AND student_id = $2
         AND to_char(booking_date, 'YYYY-MM') = $3
         AND status = 'bestaetigt'
       RETURNING id`,
      [expertId, studentId, month]
    );

    return { success: true, updatedCount: result.rows.length };
  } catch (error: any) {
    return { success: false, error: error.message || "Monatsabschluss fehlgeschlagen." };
  }
}
