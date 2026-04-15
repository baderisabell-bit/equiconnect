"use server";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

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

// Datenbank-Verbindung
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

let extraSchemaReady = false;
const PASSWORD_RESET_WINDOW_MINUTES = 15;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_COOLDOWN_SECONDS = 30;
const CONTACT_MAX_ATTEMPTS = 3;
const CONTACT_WINDOW_MINUTES = 30;
const CONTACT_COOLDOWN_SECONDS = 30;
const SEARCH_BOOST_DURATION_DAYS = 7;
const WEEKLY_AD_DURATION_DAYS = 30;
const ADMIN_AUTH_COOKIE = 'admin_panel_auth';

function isAdminAuthorized(adminCode: string) {
  const expected = String(process.env.ADMIN_PANEL_CODE || '').trim();
  const provided = String(adminCode || '').trim();
  if (!expected) return false;
  return provided.length > 0 && provided === expected;
}

async function isAdminAuthorizedWithCookie(adminCode: string) {
  if (isAdminAuthorized(adminCode)) return true;
  const expected = String(process.env.ADMIN_PANEL_CODE || '').trim();
  if (!expected) return false;
  const cookieStore = await cookies();
  const fromCookie = String(cookieStore.get(ADMIN_AUTH_COOKIE)?.value || '').trim();
  return fromCookie.length > 0 && fromCookie === expected;
}

export async function adminLogin(password: string) {
  try {
    const expected = String(process.env.ADMIN_PANEL_CODE || '').trim();
    const provided = String(password || '').trim();

    if (!expected) {
      return { success: false, error: 'Admin-Passwort ist nicht konfiguriert (ADMIN_PANEL_CODE fehlt).' };
    }
    if (!provided) {
      return { success: false, error: 'Bitte Passwort eingeben.' };
    }
    if (provided !== expected) {
      return { success: false, error: 'Falsches Passwort.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_AUTH_COOKIE, expected, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Login fehlgeschlagen.' };
  }
}

export async function adminLogout() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_AUTH_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Logout fehlgeschlagen.' };
  }
}

function getPublicAppUrl() {
  const configuredUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (configuredUrl) return configuredUrl;
  return process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '';
}

function getGoCardlessApiBase() {
  const mode = String(process.env.GOCARDLESS_ENV || process.env.GO_CARDLESS_ENV || 'sandbox').trim().toLowerCase();
  return mode === 'live' ? 'https://api.gocardless.com' : 'https://api-sandbox.gocardless.com';
}

function getGoCardlessAccessToken() {
  return String(process.env.GOCARDLESS_ACCESS_TOKEN || process.env.GO_CARDLESS_ACCESS_TOKEN || '').trim();
}

function normalizeGoCardlessError(payload: any, fallback: string) {
  const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : null;
  const message = String(firstError?.message || '').trim();
  const reason = String(firstError?.reason || '').trim();
  const field = String(firstError?.field || '').trim();
  if (message && reason && field) return `${message} (${field}: ${reason})`;
  if (message && reason) return `${message} (${reason})`;
  if (message) return message;
  return fallback;
}

function resolveMailConfig() {
  const brevoUser = String(process.env.BREVO_SMTP_LOGIN || process.env.BREVO_LOGIN || '').trim();
  const brevoPass = String(process.env.BREVO_SMTP_KEY || process.env.BREVO_KEY || '').trim();

  const host = String(process.env.SMTP_HOST || '').trim() || (brevoUser && brevoPass ? 'smtp-relay.brevo.com' : '');
  const portRaw = String(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || '587').trim();
  const port = Number(portRaw || 587);
  const user = String(process.env.SMTP_USER || '').trim() || brevoUser;
  const pass = String(process.env.SMTP_PASS || '').trim() || brevoPass;
  const from = String(process.env.SMTP_FROM || process.env.BREVO_SMTP_FROM || '').trim() || user;

  if (!host || !Number.isFinite(port) || !user || !pass || !from) {
    throw new Error('Mailversand ist nicht konfiguriert. Bitte SMTP_* oder Brevo-Variablen (BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, optional BREVO_SMTP_FROM/PORT) setzen.');
  }

  return { host, port, user, pass, from };
}

function createMailTransport() {
  const nodemailer = require('nodemailer');
  const { host, port, user, pass, from } = resolveMailConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
  return { transporter, from, user };
}

function resolveBrevoTemplateConfig() {
  const apiKey = String(process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY || process.env.BREVO_KEY || '').trim();
  const userTemplateId = Number(process.env.BREVO_WELCOME_USER_TEMPLATE_ID || process.env.BREVO_WELCOME_TEMPLATE_ID || 0);
  const expertTemplateId = Number(process.env.BREVO_WELCOME_EXPERT_TEMPLATE_ID || process.env.BREVO_WELCOME_TEMPLATE_ID || 0);
  const resetTemplateId = Number(process.env.BREVO_PASSWORD_RESET_TEMPLATE_ID || 0);
  const contactTemplateId = Number(process.env.BREVO_CONTACT_CONFIRMATION_TEMPLATE_ID || 0);

  return {
    apiKey,
    userTemplateId: Number.isFinite(userTemplateId) && userTemplateId > 0 ? Math.trunc(userTemplateId) : 0,
    expertTemplateId: Number.isFinite(expertTemplateId) && expertTemplateId > 0 ? Math.trunc(expertTemplateId) : 0,
    resetTemplateId: Number.isFinite(resetTemplateId) && resetTemplateId > 0 ? Math.trunc(resetTemplateId) : 0,
    contactTemplateId: Number.isFinite(contactTemplateId) && contactTemplateId > 0 ? Math.trunc(contactTemplateId) : 0,
  };
}

function normalizeBirthDateInput(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

async function syncBrevoContactAttributes(payload: {
  email: string;
  firstName: string;
  lastName?: string;
  birthDate?: string | null;
}) {
  const { apiKey } = resolveBrevoTemplateConfig();
  if (!apiKey) return;

  const safeEmail = String(payload.email || '').trim().toLowerCase();
  if (!safeEmail) return;

  const attributes: Record<string, string> = {
    FIRSTNAME: String(payload.firstName || '').trim(),
    LASTNAME: String(payload.lastName || '').trim(),
  };

  const birthDate = normalizeBirthDateInput(payload.birthDate);
  if (birthDate) {
    attributes.BIRTHDATE = birthDate;
    attributes.DATE_OF_BIRTH = birthDate;
    attributes.BIRTH_DATE = birthDate;
  }

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: safeEmail,
      attributes,
      updateEnabled: true,
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Brevo Kontakt-Synchronisierung fehlgeschlagen (${response.status}): ${details}`);
  }
}

async function sendBrevoTemplateEmail(payload: {
  to: string;
  templateId: number;
  params: Record<string, string | number | boolean | null | undefined>;
}) {
  const { apiKey } = resolveBrevoTemplateConfig();
  if (!apiKey) {
    throw new Error('BREVO_API_KEY ist nicht gesetzt.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      to: [{ email: payload.to }],
      templateId: payload.templateId,
      params: payload.params
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Brevo Template Versand fehlgeschlagen (${response.status}): ${details}`);
  }
}

async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const { resetTemplateId } = resolveBrevoTemplateConfig();

  if (resetTemplateId > 0) {
    const userRes = await pool.query(
      'SELECT vorname FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [String(email || '').trim().toLowerCase()]
    );
    const firstName = String(userRes.rows[0]?.vorname || '').trim() || 'du';

    await sendBrevoTemplateEmail({
      to: email,
      templateId: resetTemplateId,
      params: {
        FIRSTNAME: firstName,
        EMAIL: String(email || '').trim().toLowerCase(),
        RESET_URL: resetUrl,
        reset_url: resetUrl,
        TOKEN_LINK: resetUrl
      }
    });
    return;
  }

  const { transporter, from } = createMailTransport();

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Passwort zurücksetzen',
      text: `Du hast eine Passwort-Zurücksetzung angefordert.\n\nÖffne diesen Link: ${resetUrl}\n\nDer Link ist 60 Minuten gültig.`,
      html: `
      <p>Du hast eine Passwort-Zurücksetzung angefordert.</p>
      <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>
      <p>Der Link ist 60 Minuten gültig.</p>
    `
  });
}

async function sendWelcomeEmail(email: string, vorname: string, role: string) {
  const isExperte = role === 'experte';
  const safeVorname = String(vorname || '').trim() || 'du';
  const safeEmail = String(email || '').trim().toLowerCase();
  const { userTemplateId, expertTemplateId } = resolveBrevoTemplateConfig();

  if (userTemplateId > 0 || expertTemplateId > 0) {
    const templateId = isExperte ? expertTemplateId : userTemplateId;
    if (!templateId) {
      throw new Error(isExperte
        ? 'BREVO_WELCOME_EXPERT_TEMPLATE_ID ist nicht gesetzt.'
        : 'BREVO_WELCOME_USER_TEMPLATE_ID ist nicht gesetzt.');
    }

    await sendBrevoTemplateEmail({
      to: safeEmail,
      templateId,
      params: {
        FIRSTNAME: safeVorname,
        EMAIL: safeEmail,
        email: safeEmail,
        firstName: safeVorname,
        vorname: safeVorname
      }
    });
    return;
  }

  const { transporter, from } = createMailTransport();

  const subject = isExperte
    ? `Willkommen bei Equily, ${safeVorname} - Expertenprofil aktiv`
    : `Willkommen bei Equily, ${safeVorname} - Nutzerkonto aktiv`;

  const text = isExperte
    ? `Hallo ${safeVorname},\n\nToller Start! Dein Experten-Profil wurde erfolgreich angelegt.\n\nDein Login: ${safeEmail}\n\nDein Profil wird nun von unserem Team geprüft. Sobald du freigeschaltet bist, kannst du dein Angebot veröffentlichen und Kunden gewinnen.\n\nBis dahin kannst du dein Profil bereits vollständig ausfüllen und dein Angebot beschreiben.\n\nViele Grüße,\nDas Equily-Team`
    : `Hallo ${safeVorname},\n\nSchön, dass du dabei bist! Dein Nutzerkonto ist jetzt aktiv.\n\nDein Login: ${safeEmail}\n\nDu kannst ab sofort qualifizierte Experten in deiner Nähe finden, Termine buchen und dein Netzwerk aufbauen.\n\nViele Grüße,\nDas Equily-Team`;

  const html = isExperte
    ? `
      <p>Hallo ${safeVorname},</p>
      <p><strong>Toller Start!</strong> Dein Experten-Profil wurde erfolgreich angelegt.</p>
      <p><strong>Dein Login:</strong> ${safeEmail}</p>
      <p>Dein Profil wird nun von unserem Team geprüft. Sobald du freigeschaltet bist, kannst du dein Angebot veröffentlichen und Kunden gewinnen.</p>
      <p>Bis dahin kannst du dein Profil bereits vollständig ausfüllen und dein Angebot beschreiben.</p>
      <p>Viele Grüße,<br/>Das Equily-Team</p>
    `
    : `
      <p>Hallo ${safeVorname},</p>
      <p><strong>Schön, dass du dabei bist!</strong> Dein Nutzerkonto ist jetzt aktiv.</p>
      <p><strong>Dein Login:</strong> ${safeEmail}</p>
      <p>Du kannst ab sofort qualifizierte Experten in deiner Nähe finden, Termine buchen und dein Netzwerk aufbauen.</p>
      <p>Viele Grüße,<br/>Das Equily-Team</p>
    `;

  await transporter.sendMail({ from, to: email, subject, text, html });
}

async function sendAccountSetupEmail(email: string, setupUrl: string) {
  const { transporter, from } = createMailTransport();

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Dein Zugang zu Equily',
    text: `Für dich wurde ein Kundenkonto vorbereitet. Öffne diesen Link, um dein Passwort festzulegen und dein Konto zu aktivieren: ${setupUrl}\n\nDer Link ist 7 Tage gültig.`,
    html: `
      <p>Für dich wurde ein Kundenkonto vorbereitet.</p>
      <p><a href="${setupUrl}">Konto aktivieren und Passwort festlegen</a></p>
      <p>Der Link ist 7 Tage gültig.</p>
    `
  });
}

async function sendKontaktEmail(payload: { name: string; email: string; subject: string; message: string; ticketCode: string; sourceLabel: string }) {
  const { contactTemplateId } = resolveBrevoTemplateConfig();

  if (contactTemplateId > 0) {
    const { name, email, subject, message, ticketCode, sourceLabel } = payload;
    const firstName = String(name || '').trim().split(/\s+/)[0] || 'du';

    await sendBrevoTemplateEmail({
      to: email,
      templateId: contactTemplateId,
      params: {
        FIRSTNAME: firstName,
        EMAIL: email,
        NAME: name,
        SUBJECT: subject,
        MESSAGE: message,
        SOURCE: sourceLabel,
        SOURCE_LABEL: sourceLabel,
        TICKETCODE: ticketCode,
        ticketCode,
        ticket_code: ticketCode
      }
    });
    return;
  }

  const { transporter, from, user } = createMailTransport();
  const to = process.env.CONTACT_TO_EMAIL || user;

  if (!to) {
    throw new Error('Kontakt-Empfänger ist nicht konfiguriert (CONTACT_TO_EMAIL).');
  }

  const { name, email, subject, message, ticketCode, sourceLabel } = payload;

  await transporter.sendMail({
    from,
    to,
    replyTo: email,
    subject: `[Kontaktformular | ${sourceLabel}] ${subject} (${ticketCode})`,
    text: `Neue Kontaktanfrage\n\nQuelle: ${sourceLabel}\nTicket: ${ticketCode}\nName: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
    html: `
      <p><strong>Neue Kontaktanfrage</strong></p>
      <p><strong>Quelle:</strong> ${sourceLabel}</p>
      <p><strong>Ticket:</strong> ${ticketCode}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>E-Mail:</strong> ${email}</p>
      <p><strong>Nachricht:</strong></p>
      <p>${String(message).replace(/\n/g, '<br/>')}</p>
    `
  });
}

async function createUserNotification(client: Pool | any, payload: {
  userId: number;
  title: string;
  message: string;
  href?: string | null;
  notificationType?: string | null;
}) {
  await client.query(
    `INSERT INTO user_notifications (user_id, title, message, href, notification_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      payload.userId,
      payload.title,
      payload.message,
      payload.href || null,
      payload.notificationType || 'info'
    ]
  );
}

function resolveContactSourceLabel(roleHint: string, status: string, planKey: string) {
  const role = String(roleHint || '').trim().toLowerCase();
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedPlanKey = String(planKey || '').trim().toLowerCase();

  if (role === 'nutzer') {
    if (normalizedStatus === 'active' && normalizedPlanKey === 'nutzer_plus') return { sourceKey: 'nutzer_abo', sourceLabel: 'Nutzer Abo' };
    return { sourceKey: 'nutzer', sourceLabel: 'Nutzer' };
  }

  if (role === 'experte') {
    if (normalizedStatus === 'active' && normalizedPlanKey === 'experte_pro') return { sourceKey: 'experte_premium_abo', sourceLabel: 'Experte Premium Abo' };
    if (normalizedStatus === 'active' && normalizedPlanKey === 'experte_abo') return { sourceKey: 'experte_abo', sourceLabel: 'Experte Abo' };
    return { sourceKey: 'experte', sourceLabel: 'Experte' };
  }

  return { sourceKey: 'guest', sourceLabel: 'Nicht eingeloggt' };
}

async function resolveContactSource(payload: { sourceUserId?: number | null; sourceRole?: string | null }) {
  const rawUserId = Number(payload.sourceUserId || 0);
  const roleHint = String(payload.sourceRole || '').trim().toLowerCase();

  if (!Number.isInteger(rawUserId) || rawUserId <= 0) {
    return { userId: null, sourceRole: 'guest', sourceKey: 'guest', sourceLabel: 'Nicht eingeloggt', sourcePlanKey: null };
  }

  try {
    const res = await getUserSubscriptionSettings(rawUserId);
    if (res.success && res.data) {
      const role = normalizeSubscriptionRole(String(res.data.role || roleHint || 'nutzer'));
      const planKey = String(res.data.plan_key || '').trim().toLowerCase();
      const status = String(res.data.status || '').trim().toLowerCase();
      const source = resolveContactSourceLabel(role, status, planKey);
      return {
        userId: rawUserId,
        sourceRole: role,
        sourceKey: source.sourceKey,
        sourceLabel: source.sourceLabel,
        sourcePlanKey: planKey || null,
      };
    }
  } catch {
    // fall back to the session hint below
  }

  const fallbackRole = roleHint === 'experte' ? 'experte' : roleHint === 'nutzer' ? 'nutzer' : 'guest';
  const source = resolveContactSourceLabel(fallbackRole, '', '');
  return {
    userId: rawUserId,
    sourceRole: fallbackRole,
    sourceKey: source.sourceKey,
    sourceLabel: source.sourceLabel,
    sourcePlanKey: null,
  };
}

export async function submitKontaktForm(payload: { name: string; email: string; subject: string; message: string; website?: string; sourceUserId?: number | null; sourceRole?: string | null }) {
  try {
    await ensureExtraSchema();

    // Honeypot: Bots fuellen oft unsichtbare Felder aus.
    if (String(payload?.website || '').trim().length > 0) {
      return { success: true };
    }

    const name = String(payload?.name || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const subject = String(payload?.subject || '').trim();
    const message = String(payload?.message || '').trim();

    if (!name || !email || !subject || !message) {
      return { success: false, error: 'Bitte alle Felder ausfüllen.' };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
    }

    await pool.query(
      `DELETE FROM contact_form_attempts
       WHERE created_at < NOW() - INTERVAL '1 day'`
    );

    const attemptsRes = await pool.query(
      `SELECT COUNT(*)::INT AS count,
              MAX(created_at) AS last_attempt
       FROM contact_form_attempts
       WHERE email = $1
         AND created_at > NOW() - INTERVAL '${CONTACT_WINDOW_MINUTES} minutes'`,
      [email]
    );

    const attemptCount = attemptsRes.rows[0]?.count || 0;
    const lastAttempt = attemptsRes.rows[0]?.last_attempt
      ? new Date(attemptsRes.rows[0].last_attempt)
      : null;

    const cooldownMs = CONTACT_COOLDOWN_SECONDS * 1000;
    const inCooldown = lastAttempt ? Date.now() - lastAttempt.getTime() < cooldownMs : false;

    await pool.query(
      `INSERT INTO contact_form_attempts (email) VALUES ($1)`,
      [email]
    );

    if (attemptCount >= CONTACT_MAX_ATTEMPTS || inCooldown) {
      return { success: false, error: 'Bitte warte kurz, bevor du erneut sendest.' };
    }

    const source = await resolveContactSource({ sourceUserId: payload.sourceUserId, sourceRole: payload.sourceRole });

    const insertRes = await pool.query(
      `INSERT INTO contact_form_messages (name, email, subject, message, send_status, user_id, source_role, source_key, source_label)
       VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7, $8)
       RETURNING id`,
      [name, email, subject, message, source.userId, source.sourceRole, source.sourceKey, source.sourceLabel]
    );

    const messageId = insertRes.rows[0]?.id;
    const ticketCode = `K-${new Date().getFullYear()}-${String(messageId).padStart(6, '0')}`;

    await pool.query(
      `UPDATE contact_form_messages
       SET ticket_code = $1
       WHERE id = $2`,
      [ticketCode, messageId]
    );

    try {
      await sendKontaktEmail({ name, email, subject, message, ticketCode, sourceLabel: source.sourceLabel });
      await pool.query(
        `UPDATE contact_form_messages
         SET send_status = 'sent', sent_at = NOW(), send_error = NULL
         WHERE id = $1`,
        [messageId]
      );
      return { success: true, ticketCode };
    } catch (mailError: any) {
      await pool.query(
        `UPDATE contact_form_messages
         SET send_status = 'failed', send_error = $2
         WHERE id = $1`,
        [messageId, String(mailError?.message || 'E-Mail konnte nicht versendet werden.')]
      );
      return { success: false, error: 'E-Mail konnte nicht versendet werden.', ticketCode };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'E-Mail konnte nicht versendet werden.' };
  }
}

async function ensureExtraSchema() {
  if (extraSchemaReady) return;

  // Create visibility_promotions if it doesn't exist - FIRST, before any ALTER/UPDATE
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visibility_promotions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scope TEXT DEFAULT 'angebote',
        label TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (_) {
    // Table might already exist
  }

  // Add/repair scope column
  try {
    await pool.query(`ALTER TABLE visibility_promotions ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'angebote'`);
  } catch (_) {
    // Column might already exist
  }

  if (extraSchemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      display_name TEXT,
      ort TEXT,
      plz TEXT,
      kategorien TEXT[] DEFAULT ARRAY[]::TEXT[],
      zertifikate TEXT[] DEFAULT ARRAY[]::TEXT[],
      angebot_text TEXT,
      suche_text TEXT,
      gesuche JSONB,
      profil_data JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birth_date DATE;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS vorname TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS nachname TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'nutzer';
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ort TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS plz TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS unternehmensname TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      profile_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      name TEXT NOT NULL,
      ort TEXT,
      plz TEXT,
      kategorie_text TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, item_type, source_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_attempts (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email_created
    ON password_reset_attempts(email, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_form_attempts (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contact_form_attempts_email_created
    ON contact_form_attempts(email, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_form_messages (
      id SERIAL PRIMARY KEY,
      ticket_code TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      send_status TEXT NOT NULL DEFAULT 'queued',
      send_error TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      source_role TEXT,
      source_key TEXT,
      source_label TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      sent_at TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE contact_form_messages
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE contact_form_messages
    ADD COLUMN IF NOT EXISTS source_role TEXT;
  `);

  await pool.query(`
    ALTER TABLE contact_form_messages
    ADD COLUMN IF NOT EXISTS source_key TEXT;
  `);

  await pool.query(`
    ALTER TABLE contact_form_messages
    ADD COLUMN IF NOT EXISTS source_label TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_contact_form_messages_email_created
    ON contact_form_messages(email, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_type TEXT,
      provider_name TEXT,
      booking_date TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'offen',
      location TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_bookings_user_id_created
    ON user_bookings(user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expert_student_bookings (
      id SERIAL PRIMARY KEY,
      expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_date DATE NOT NULL,
      service_title TEXT NOT NULL,
      duration_minutes INTEGER,
      quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
      unit_price_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'offen',
      notes TEXT,
      billed_month DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expert_student_bookings_expert_date
    ON expert_student_bookings(expert_id, booking_date DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expert_student_bookings_student
    ON expert_student_bookings(student_id, booking_date DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expert_calendar_slots (
      id SERIAL PRIMARY KEY,
      expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      release_month TEXT,
      slot_start TIMESTAMP NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      service_title TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      location TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      booked_booking_id INTEGER REFERENCES expert_student_bookings(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expert_calendar_slots_expert_student
    ON expert_calendar_slots(expert_id, student_id, slot_start DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expert_calendar_slots_student_status
    ON expert_calendar_slots(student_id, status, slot_start ASC);
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS protection_fee_cents INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS customer_total_cents INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS expert_payout_cents INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS provider_commission_bps INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS customer_discount_bps INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS final_fee_bps INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS protection_model TEXT NOT NULL DEFAULT 'standard';
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS expert_plan_key TEXT;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS customer_plan_key TEXT;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS source_offer_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE expert_student_bookings
    ADD COLUMN IF NOT EXISTS paid_method TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_bookings
    ADD COLUMN IF NOT EXISTS waitlist_entry_id INTEGER;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      href TEXT,
      notification_type TEXT NOT NULL DEFAULT 'info',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      read_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
    ON user_notifications(user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pro_waitlist_entries (
      id SERIAL PRIMARY KEY,
      provider_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      interested_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'profil',
      source_ref TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (provider_user_id, interested_user_id, source_type, source_ref)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pro_waitlist_provider
    ON pro_waitlist_entries(provider_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pro_waitlist_interested
    ON pro_waitlist_entries(interested_user_id, created_at DESC);
  `);

  await pool.query(`
    ALTER TABLE pro_waitlist_entries
    ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE pro_waitlist_entries
    ADD COLUMN IF NOT EXISTS expert_category TEXT;
  `);

  await pool.query(`
    ALTER TABLE pro_waitlist_entries
    ADD COLUMN IF NOT EXISTS expert_notes TEXT;
  `);

  await pool.query(`
    ALTER TABLE pro_waitlist_entries
    ADD COLUMN IF NOT EXISTS confirmed_booking_date TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE pro_waitlist_entries
    ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'warteliste';
  `);

  await pool.query(`
    ALTER TABLE pro_waitlist_entries
    ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_connections (
      id SERIAL PRIMARY KEY,
      requester_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      responded_at TIMESTAMP,
      UNIQUE (requester_user_id, addressee_user_id),
      CHECK (requester_user_id <> addressee_user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_connections_addressee_status
    ON social_connections(addressee_user_id, status, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_connections_requester_status
    ON social_connections(requester_user_id, status, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_groups (
      id SERIAL PRIMARY KEY,
      founder_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_group_members (
      group_id INTEGER NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id SERIAL PRIMARY KEY,
      author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES social_groups(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      hashtags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS post_target TEXT NOT NULL DEFAULT 'profile';
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS moderation_deadline TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS moderated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  `);

  await pool.query(`
    ALTER TABLE social_posts
    ADD COLUMN IF NOT EXISTS shared_post_id INTEGER REFERENCES social_posts(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_posts_created
    ON social_posts(created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_post_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      comment_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_comments_post
    ON social_post_comments(post_id, created_at ASC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_post_views (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      viewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (post_id > 0),
      CHECK (viewer_user_id > 0)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_views_post_created
    ON social_post_views(post_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_views_viewer_created
    ON social_post_views(viewer_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_post_saves (
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (post_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_post_likes (
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (post_id, user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_likes_user
    ON social_post_likes(user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_saved_post_groups (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, name)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_post_save_group_links (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES social_saved_post_groups(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id, group_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_save_group_links_user_group
    ON social_post_save_group_links(user_id, group_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_saves_user
    ON social_post_saves(user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS social_post_reports (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
      reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (post_id, reporter_user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_social_post_reports_post
    ON social_post_reports(post_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_reports (
      id SERIAL PRIMARY KEY,
      profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (profile_user_id, reporter_user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_profile_reports_profile
    ON profile_reports(profile_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_moderation_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      warning_count INTEGER NOT NULL DEFAULT 0,
      suspension_count INTEGER NOT NULL DEFAULT 0,
      last_suspension_end TIMESTAMP,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sanctions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      severity TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'global',
      reason TEXT NOT NULL,
      starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
      ends_at TIMESTAMP NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_sanctions_user_active
    ON user_sanctions(user_id, is_active, ends_at DESC);
  `);

  try {
    await pool.query(`
      ALTER TABLE user_sanctions
      ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'global';
    `);
  } catch (_) {
    // Best-effort for legacy schemas.
  }

  try {
    await pool.query(`
      UPDATE user_sanctions
      SET scope = 'global'
      WHERE scope IS NULL OR LENGTH(TRIM(scope)) = 0;
    `);
  } catch (_) {
    // Ignore if scope column cannot be read in this deployment.
  }

  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sanctions_user_scope_active
      ON user_sanctions(user_id, scope, is_active, ends_at DESC);
    `);
  } catch (_) {
    // Optional index; must not block request handling.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_reports (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'normal',
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'confirmed',
      review_note TEXT,
      false_accusation BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_reports_reported_created
    ON chat_reports(reported_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS animal_welfare_cases (
      id SERIAL PRIMARY KEY,
      chat_report_id INTEGER REFERENCES chat_reports(id) ON DELETE SET NULL,
      accused_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      video_url TEXT,
      accused_statement TEXT,
      status TEXT NOT NULL DEFAULT 'voting',
      vote_end_at TIMESTAMP NOT NULL,
      public_note TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      resolved_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_animal_welfare_cases_status_vote_end
    ON animal_welfare_cases(status, vote_end_at ASC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS animal_welfare_votes (
      case_id INTEGER NOT NULL REFERENCES animal_welfare_cases(id) ON DELETE CASCADE,
      voter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (case_id, voter_user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_ratings (
      id SERIAL PRIMARY KEY,
      rater_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rated_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating SMALLINT NOT NULL,
      comment TEXT,
      offer_id TEXT,
      offer_title TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (rater_user_id, rated_user_id),
      CHECK (rating >= 1 AND rating <= 5),
      CHECK (rater_user_id <> rated_user_id)
    );
  `);

  await pool.query(`
    ALTER TABLE user_ratings
    ADD COLUMN IF NOT EXISTS offer_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_ratings
    ADD COLUMN IF NOT EXISTS offer_title TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_ratings
    ADD COLUMN IF NOT EXISTS is_verified_booking BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE user_ratings
    ADD COLUMN IF NOT EXISTS verified_booking_id INTEGER REFERENCES expert_student_bookings(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_ratings_rated
    ON user_ratings(rated_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_ratings_verified
    ON user_ratings(rated_user_id, is_verified_booking, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_public_notices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notice_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_public BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_moderation_public_notices_public
    ON moderation_public_notices(is_public, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_views (
      id SERIAL PRIMARY KEY,
      profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      viewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (profile_user_id <> viewer_user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_profile_views_profile_created
    ON profile_views(profile_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_created
    ON profile_views(viewer_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_offer_views (
      id SERIAL PRIMARY KEY,
      profile_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      offer_id TEXT NOT NULL,
      viewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (profile_user_id <> viewer_user_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_profile_offer_views_profile_offer_created
    ON profile_offer_views(profile_user_id, offer_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_profile_offer_views_viewer_created
    ON profile_offer_views(viewer_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS interaction_share_events (
      id SERIAL PRIMARY KEY,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel TEXT NOT NULL DEFAULT 'link',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_interaction_share_events_owner
    ON interaction_share_events(owner_user_id, source_type, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_interaction_share_events_source
    ON interaction_share_events(source_type, source_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_advertising_views (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER NOT NULL REFERENCES user_advertising_submissions(id) ON DELETE CASCADE,
      viewer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (submission_id > 0),
      CHECK (viewer_user_id > 0)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_advertising_views_submission_created
    ON user_advertising_views(submission_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_advertising_views_viewer_created
    ON user_advertising_views(viewer_user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expert_invoice_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      steuernummer TEXT DEFAULT '',
      ust_idnr TEXT DEFAULT '',
      kontoname TEXT DEFAULT '',
      iban TEXT DEFAULT '',
      bic TEXT DEFAULT '',
      bankname TEXT DEFAULT '',
      tel TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      is_kleinunternehmer BOOLEAN DEFAULT TRUE,
      mwst_satz NUMERIC(5,2) DEFAULT 19.0,
      invoice_prefix TEXT DEFAULT 'RE',
      invoice_counter INTEGER DEFAULT 1,
      template_id INTEGER DEFAULT 1,
      brand_color TEXT DEFAULT '#10b981',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE student_billing_info
    ADD COLUMN IF NOT EXISTS billing_strasse TEXT DEFAULT '';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_service_plans (
      id SERIAL PRIMARY KEY,
      expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_type TEXT NOT NULL DEFAULT 'einzelstunde',
      service_title TEXT NOT NULL DEFAULT 'Reitstunde',
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      monthly_price_cents INTEGER,
      sessions_per_month INTEGER NOT NULL DEFAULT 4,
      cancellation_hours INTEGER NOT NULL DEFAULT 24,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (expert_id, student_id)
    );
  `);

  await pool.query(`
    ALTER TABLE student_service_plans
    ADD COLUMN IF NOT EXISTS cancellation_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  `);

  await pool.query(`
    ALTER TABLE student_service_plans
    ADD COLUMN IF NOT EXISTS max_cancellations_per_month INTEGER NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE student_service_plans
    ADD COLUMN IF NOT EXISTS require_confirmation_each_booking BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_abo_cancellations (
      id SERIAL PRIMARY KEY,
      expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cancelled_month TEXT NOT NULL,
      cancelled_date DATE NOT NULL,
      reason TEXT,
      is_within_window BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_student_abo_cancellations_month
    ON student_abo_cancellations(expert_id, student_id, cancelled_month);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_booking_confirmations (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL UNIQUE REFERENCES expert_student_bookings(id) ON DELETE CASCADE,
      expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMP NOT NULL,
      confirmed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_student_booking_confirmations_token
    ON student_booking_confirmations(token);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_student_booking_confirmations_student
    ON student_booking_confirmations(student_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'nutzer',
      plan_key TEXT NOT NULL DEFAULT 'nutzer_free',
      payment_method TEXT NOT NULL DEFAULT 'sepa',
      monthly_price_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      sepa_account_holder TEXT,
      sepa_iban TEXT,
      paypal_email TEXT,
      paypal_fee_cents INTEGER NOT NULL DEFAULT 0,
      homepage_marketing_until TIMESTAMP,
      started_at TIMESTAMP,
      next_charge_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS homepage_marketing_until TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_redirect_flow_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_customer_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_customer_bank_account_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_mandate_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_mandate_status TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_connected_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS gocardless_last_error TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
    ON user_subscriptions(status, updated_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscription_invoices (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      plan_key TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      invoice_month TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      due_at TIMESTAMP NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      status TEXT NOT NULL DEFAULT 'offen',
      source TEXT NOT NULL DEFAULT 'subscription-cycle',
      notes TEXT,
      emailed_at TIMESTAMP,
      paid_notified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, invoice_month)
    );
  `);

  await pool.query(`
    ALTER TABLE user_subscription_invoices
    ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscription_invoices
    ADD COLUMN IF NOT EXISTS paid_notified_at TIMESTAMP;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscription_invoices_user_due
    ON user_subscription_invoices(user_id, due_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscription_invoices_month
    ON user_subscription_invoices(invoice_month DESC, due_at DESC);
  `);

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visibility_promotions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        scope TEXT NOT NULL,
        label TEXT NOT NULL,
        charge_cents INTEGER NOT NULL DEFAULT 0,
        included BOOLEAN NOT NULL DEFAULT FALSE,
        payment_method TEXT,
        plan_key TEXT,
        starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ends_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (_) {
    // Never block app flows (profile/search) on optional promotion table setup.
  }

  try {
    await pool.query(`
      ALTER TABLE visibility_promotions
      ADD COLUMN IF NOT EXISTS scope TEXT;
    `);
  } catch (_) {
    // Ignore: some deployments have restricted ALTER permissions.
  }

  try {
    await pool.query(`
      UPDATE visibility_promotions
      SET scope = 'angebote'
      WHERE scope IS NULL OR LENGTH(TRIM(scope)) = 0;
    `);
  } catch (_) {
    // Ignore if scope still cannot be read on this DB instance.
  }

  try {
    await pool.query(`
      ALTER TABLE visibility_promotions
      ALTER COLUMN scope SET DEFAULT 'angebote';
    `);
  } catch (_) {
    // Best-effort only.
  }

  try {
    await pool.query(`
      ALTER TABLE visibility_promotions
      ALTER COLUMN scope SET NOT NULL;
    `);
  } catch (_) {
    // Best-effort only.
  }

  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visibility_promotions_user_scope_end
      ON visibility_promotions(user_id, scope, ends_at DESC);
    `);
  } catch (_) {
    // Index creation is optional and must not block runtime actions.
  }

  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visibility_promotions_scope_end
      ON visibility_promotions(scope, ends_at DESC);
    `);
  } catch (_) {
    // Index creation is optional and must not block runtime actions.
  }

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS early_access_granted_until TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS is_founding_member BOOLEAN DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS founding_member_free_until TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS lifetime_free_access BOOLEAN DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS lifetime_discount_percent INTEGER DEFAULT 0;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_founding_member
    ON user_subscriptions(is_founding_member, plan_key)
    WHERE is_founding_member = TRUE;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS custom_monthly_price_cents INTEGER;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS custom_price_note TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS custom_price_set_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS cancel_effective_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
  `);

  await pool.query(`
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscription_price_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      previous_custom_monthly_price_cents INTEGER,
      new_custom_monthly_price_cents INTEGER,
      previous_effective_monthly_price_cents INTEGER,
      new_effective_monthly_price_cents INTEGER,
      note TEXT,
      changed_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_subscription_price_history_user
    ON user_subscription_price_history(user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expert_calendar_availability (
      id SERIAL PRIMARY KEY,
      expert_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 60,
      service_title TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      location TEXT,
      notes TEXT,
      repeat_until TIMESTAMP NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expert_calendar_availability_expert_dow
    ON expert_calendar_availability(expert_id, day_of_week, active DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_advertising_submissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      plan_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      media_url TEXT NOT NULL,
      target_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_advertising_submissions_user
    ON user_advertising_submissions(user_id, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_advertising_submissions_status
    ON user_advertising_submissions(status, created_at DESC);
  `);

  await pool.query(`
    ALTER TABLE user_advertising_submissions
    ADD COLUMN IF NOT EXISTS placement_slot TEXT NOT NULL DEFAULT 'none';
  `);

  await pool.query(`
    ALTER TABLE user_advertising_submissions
    ADD COLUMN IF NOT EXISTS placement_order INTEGER NOT NULL DEFAULT 100;
  `);

  await pool.query(`
    ALTER TABLE user_advertising_submissions
    ADD COLUMN IF NOT EXISTS placement_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE user_advertising_submissions
    ADD COLUMN IF NOT EXISTS visible_from TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE user_advertising_submissions
    ADD COLUMN IF NOT EXISTS visible_until TIMESTAMP;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_advertising_submissions_placement
    ON user_advertising_submissions(status, placement_slot, placement_enabled, placement_order);
  `);

  // Migration guard: keep only one active (pending/approved) ad per expert.
  await pool.query(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id
               ORDER BY
                 CASE WHEN status = 'approved' THEN 0 ELSE 1 END,
                 updated_at DESC,
                 created_at DESC,
                 id DESC
             ) AS rn
      FROM user_advertising_submissions
      WHERE status IN ('pending', 'approved')
    )
    UPDATE user_advertising_submissions s
    SET status = 'rejected',
        admin_note = CASE
          WHEN COALESCE(TRIM(s.admin_note), '') = '' THEN 'Automatisch deaktiviert: Nur eine aktive Werbung pro Experte erlaubt.'
          ELSE s.admin_note
        END,
        placement_slot = 'none',
        placement_enabled = FALSE,
        reviewed_at = COALESCE(s.reviewed_at, NOW()),
        updated_at = NOW()
    FROM ranked r
    WHERE s.id = r.id
      AND r.rn > 1;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_advertising_one_active_per_user
    ON user_advertising_submissions(user_id)
    WHERE status IN ('pending', 'approved');
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_newsletter_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      opted_in BOOLEAN NOT NULL DEFAULT FALSE,
      source TEXT NOT NULL DEFAULT 'unknown',
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_user_newsletter_settings_optin
    ON user_newsletter_settings(opted_in, updated_at DESC);
  `);

  extraSchemaReady = true;
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

type SubscriptionRole = 'experte' | 'nutzer';
type SubscriptionPaymentMethod = 'sepa' | 'paypal';
type SubscriptionPlanKey = 'experte_free' | 'experte_abo' | 'experte_pro' | 'nutzer_free' | 'nutzer_plus';
type VisibilityPromotionScope = 'angebote' | 'suchen' | 'wochenwerbung';
type AdvertisingPlacementSlot = 'none' | 'startseite_top' | 'startseite_sidebar';
type NewsletterSegment = 'experten_abo' | 'experten_pro_abo' | 'experten' | 'nutzer' | 'nutzer_abo';

const NEWSLETTER_SEGMENT_LABELS: Record<NewsletterSegment, string> = {
  experten_abo: 'Experten Abo',
  experten_pro_abo: 'Experten Pro Abo',
  experten: 'Experten',
  nutzer: 'Nutzer',
  nutzer_abo: 'Nutzer Abo',
};

const NEWSLETTER_SEGMENTS: NewsletterSegment[] = [
  'experten_abo',
  'experten_pro_abo',
  'experten',
  'nutzer',
  'nutzer_abo',
];

const NEWSLETTER_BANNER_TEXTS: Record<NewsletterSegment, { title: string; body: string }> = {
  experten: {
    title: 'Werde sichtbar. Bleib präsent',
    body: 'Erhalte wertvolle Impulse rund um Reichweite, Kundengewinnung und Positionierung als Reitlehrer.',
  },
  experten_abo: {
    title: 'Mehr Reichweite beginnt mit dem richtigen Wissen',
    body: 'Tipps, Strategien und Updates, die dich dabei unterstützen, gezielt die richtigen Kunden zu erreichen.',
  },
  experten_pro_abo: {
    title: 'Sichtbarkeit gezielt steigern',
    body: 'Erhalte exklusive Tipps und Strategien für effektive Werbung, mehr Reichweite und eine klare Positionierung.',
  },
  nutzer: {
    title: 'Bleib auf dem Laufenden',
    body: 'Finde passende Reitlehrer, Angebote und wertvolle Impulse für dein Training – direkt in dein Postfach.',
  },
  nutzer_abo: {
    title: 'Mehr Wissen. Mehr Möglichkeiten',
    body: 'Erhalte exklusive Tipps, neue Angebote und passende Verbindungen – abgestimmt auf dich und dein Training.',
  },
};

type SubscriptionPlanDefinition = {
  key: SubscriptionPlanKey;
  role: SubscriptionRole;
  label: string;
  audience: string;
  baseCents: number;
  paypalFeeCents: number;
  providerCommissionBps: number;
  customerDiscountBps: number;
  visibilityLabel: string;
  standardBoostPriceCents: number;
  includedBoostsPerAd: number;
  followupBoostPriceCents: number;
  adsScope: 'with-ads' | 'startpage-only';
  ownWeeklyAdPriceCents: number;
  horseLimit: number | null;
  teamLimit: number | null;
  homepageBoostDays: number;
  supportTips: boolean;
  groupHostingEnabled: boolean;
  unlimitedGroupPosts: boolean;
  groupModerationHours: number;
  calendarBookingEnabled: boolean;
  offerPreviewHours: number;
  benefits: string[];
};

const SUBSCRIPTION_PLAN_CATALOG: Record<SubscriptionPlanKey, SubscriptionPlanDefinition> = {
  experte_free: {
    key: 'experte_free',
    role: 'experte',
    label: 'Experte ohne Abo',
    audience: 'Grundtarif für Experten ohne Monatsabo',
    baseCents: 0,
    paypalFeeCents: 0,
    providerCommissionBps: 1000,
    customerDiscountBps: 0,
    visibilityLabel: 'Sichtbarkeit durch eigene Aktivitaet',
    standardBoostPriceCents: 199,
    includedBoostsPerAd: 0,
    followupBoostPriceCents: 199,
    adsScope: 'with-ads',
    ownWeeklyAdPriceCents: 0,
    horseLimit: 2,
    teamLimit: 2,
    homepageBoostDays: 0,
    supportTips: false,
    groupHostingEnabled: false,
    unlimitedGroupPosts: false,
    groupModerationHours: 48,
    calendarBookingEnabled: false,
    offerPreviewHours: 0,
    benefits: [
      'Werbung innerhalb des Portals aktiv'
    ]
  },
  experte_abo: {
    key: 'experte_abo',
    role: 'experte',
    label: 'Experten Abo',
    audience: 'Monatsabo für Experten',
    baseCents: 1999,
    paypalFeeCents: 200,
    providerCommissionBps: 500,
    customerDiscountBps: 0,
    visibilityLabel: 'Erster Monat Startseite, danach Aktivitaet',
    standardBoostPriceCents: 0,
    includedBoostsPerAd: 1,
    followupBoostPriceCents: 50,
    adsScope: 'startpage-only',
    ownWeeklyAdPriceCents: 299,
    horseLimit: null,
    teamLimit: null,
    homepageBoostDays: 30,
    supportTips: true,
    groupHostingEnabled: true,
    unlimitedGroupPosts: true,
    groupModerationHours: 72,
    calendarBookingEnabled: false,
    offerPreviewHours: 0,
    benefits: [
      'Buchen über Equily (Kaufschutz und automatisierte Rechnungen auch für bereits bestehende Kunden)',
      'Reduzierter Schutzaufschlag auf Buchungen',
      'Im ersten Monat Marketing auf der Startseite',
      '1x Anzeige hochschieben inklusive, danach 0,50 Euro',
      'Gruppen-Hosting und unbegrenzte Gruppenbeitraege',
      'Schulpferde und Teammitglieder unbegrenzt'
    ]
  },
  experte_pro: {
    key: 'experte_pro',
    role: 'experte',
    label: 'Experten Pro Abo',
    audience: 'Premium-Monatsabo für Experten',
    baseCents: 3499,
    paypalFeeCents: 200,
    providerCommissionBps: 500,
    customerDiscountBps: 0,
    visibilityLabel: 'Priorisierte Sichtbarkeit + persoenliche Werbung',
    standardBoostPriceCents: 0,
    includedBoostsPerAd: 1,
    followupBoostPriceCents: 50,
    adsScope: 'startpage-only',
    ownWeeklyAdPriceCents: 299,
    horseLimit: null,
    teamLimit: null,
    homepageBoostDays: 30,
    supportTips: true,
    groupHostingEnabled: true,
    unlimitedGroupPosts: true,
    groupModerationHours: 72,
    calendarBookingEnabled: false,
    offerPreviewHours: 0,
    benefits: [
      'Alle Leistungen aus dem Experten Abo',
      'Buchen über Equily (Kaufschutz und automatisierte Rechnungen)',
      'Persönliche Werbung schalten',
      'Eigene Werbung für 2,99 Euro pro Woche'
    ]
  },
  nutzer_free: {
    key: 'nutzer_free',
    role: 'nutzer',
    label: 'Nutzer ohne Abo',
    audience: 'Grundtarif für Nutzer ohne Monatsabo',
    baseCents: 0,
    paypalFeeCents: 0,
    providerCommissionBps: 0,
    customerDiscountBps: 0,
    visibilityLabel: 'Sichtbarkeit durch eigene Aktivitaet',
    standardBoostPriceCents: 0,
    includedBoostsPerAd: 0,
    followupBoostPriceCents: 0,
    adsScope: 'with-ads',
    ownWeeklyAdPriceCents: 0,
    horseLimit: 2,
    teamLimit: null,
    homepageBoostDays: 0,
    supportTips: false,
    groupHostingEnabled: false,
    unlimitedGroupPosts: false,
    groupModerationHours: 48,
    calendarBookingEnabled: false,
    offerPreviewHours: 0,
    benefits: [
      'Sichtbarkeit über Aktivität im Netzwerk',
      'Werbung innerhalb des Portals aktiv'
    ]
  },
  nutzer_plus: {
    key: 'nutzer_plus',
    role: 'nutzer',
    label: 'Nutzer mit Abo',
    audience: 'Monatsabo für Nutzer',
    baseCents: 799,
    paypalFeeCents: 100,
    providerCommissionBps: 0,
    customerDiscountBps: 200,
    visibilityLabel: 'Wird oben angezeigt',
    standardBoostPriceCents: 0,
    includedBoostsPerAd: 1,
    followupBoostPriceCents: 50,
    adsScope: 'startpage-only',
    ownWeeklyAdPriceCents: 0,
    horseLimit: null,
    teamLimit: null,
    homepageBoostDays: 0,
    supportTips: false,
    groupHostingEnabled: false,
    unlimitedGroupPosts: false,
    groupModerationHours: 72,
    calendarBookingEnabled: false,
    offerPreviewHours: 24,
    benefits: [
      'Reduzierter Schutzaufschlag',
      '24h frueherer Zugriff auf neue Angebote',
      '1x Suchenanzeige hochschieben inklusive, danach 0,50 Euro',
      'Bevorzugte Sichtbarkeit und nur Startseiten-Werbung'
    ]
  }
};

function normalizeSubscriptionRole(role: string | null | undefined): SubscriptionRole {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'experte' ? 'experte' : 'nutzer';
}

function getDefaultPlanKeyForRole(role: SubscriptionRole): SubscriptionPlanKey {
  return role === 'experte' ? 'experte_free' : 'nutzer_free';
}

async function setUserNewsletterOptIn(userId: number, optedIn: boolean, source: string) {
  const safeUserId = Number(userId);
  if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
    throw new Error('Ungueltige Nutzer-ID.');
  }

  await pool.query(
    `INSERT INTO user_newsletter_settings (user_id, opted_in, source, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       opted_in = EXCLUDED.opted_in,
       source = EXCLUDED.source,
       updated_at = NOW()`,
    [safeUserId, optedIn, String(source || 'unknown').slice(0, 80)]
  );
}

function getNewsletterSegmentFilterSql(segment: NewsletterSegment) {
  if (segment === 'experten') {
    return `u.role = 'experte'`;
  }
  if (segment === 'experten_abo') {
    return `u.role = 'experte' AND us.status = 'active' AND COALESCE(us.plan_key, 'experte_free') <> 'experte_free'`;
  }
  if (segment === 'experten_pro_abo') {
    return `u.role = 'experte' AND us.status = 'active' AND COALESCE(us.plan_key, '') = 'experte_pro'`;
  }
  if (segment === 'nutzer') {
    return `u.role = 'nutzer'`;
  }
  return `u.role = 'nutzer' AND us.status = 'active' AND COALESCE(us.plan_key, '') = 'nutzer_plus'`;
}

export async function updateUserNewsletterPreference(payload: { userId: number; optedIn: boolean; source?: string }) {
  try {
    await ensureExtraSchema();
    await setUserNewsletterOptIn(payload.userId, Boolean(payload.optedIn), payload.source || 'settings');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Newsletter-Einstellung konnte nicht gespeichert werden.' };
  }
}

export async function adminGetNewsletterSegmentsOverview(adminCode: string) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', items: [] };
    }

    const items: Array<{ segment: NewsletterSegment; label: string; count: number }> = [];
    for (const segment of NEWSLETTER_SEGMENTS) {
      const whereSql = getNewsletterSegmentFilterSql(segment);
      const res = await pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM users u
         LEFT JOIN user_subscriptions us ON us.user_id = u.id
         JOIN user_newsletter_settings ns ON ns.user_id = u.id
         WHERE ns.opted_in = TRUE
           AND ${whereSql}`
      );

      items.push({
        segment,
        label: NEWSLETTER_SEGMENT_LABELS[segment],
        count: Number(res.rows[0]?.count || 0),
      });
    }

    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message || 'Newsletter-Segmente konnten nicht geladen werden.', items: [] };
  }
}

export async function adminGetNewsletterRecipients(adminCode: string, segment: NewsletterSegment) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', recipients: [] };
    }

    const validSegment: NewsletterSegment = NEWSLETTER_SEGMENTS.includes(segment) ? segment : 'nutzer';
    const whereSql = getNewsletterSegmentFilterSql(validSegment);

    const res = await pool.query(
      `SELECT u.id,
              u.vorname,
              u.nachname,
              LOWER(TRIM(u.email)) AS email,
              u.role,
              COALESCE(us.plan_key, CASE WHEN u.role = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
              ns.updated_at AS newsletter_updated_at
       FROM users u
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       JOIN user_newsletter_settings ns ON ns.user_id = u.id
       WHERE ns.opted_in = TRUE
         AND ${whereSql}
       ORDER BY ns.updated_at DESC, u.id DESC
       LIMIT 5000`
    );

    return {
      success: true,
      segment: validSegment,
      label: NEWSLETTER_SEGMENT_LABELS[validSegment],
      recipients: res.rows || [],
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Newsletter-Empfaenger konnten nicht geladen werden.', recipients: [] };
  }
}

function resolveBrevoNewsletterListId(segment: NewsletterSegment) {
  const raw =
    segment === 'experten_abo'
      ? process.env.BREVO_NEWSLETTER_LIST_EXPERTEN_ABO
      : segment === 'experten_pro_abo'
        ? process.env.BREVO_NEWSLETTER_LIST_EXPERTEN_PRO_ABO
        : segment === 'experten'
          ? process.env.BREVO_NEWSLETTER_LIST_EXPERTEN
          : segment === 'nutzer'
            ? process.env.BREVO_NEWSLETTER_LIST_NUTZER
            : process.env.BREVO_NEWSLETTER_LIST_NUTZER_ABO;

  const parsed = Number(String(raw || '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

export async function adminSyncNewsletterSegmentToBrevo(payload: {
  adminCode: string;
  segment: NewsletterSegment;
}) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const { apiKey } = resolveBrevoTemplateConfig();
    if (!apiKey) {
      return { success: false, error: 'BREVO_API_KEY ist nicht gesetzt.' };
    }

    const segment: NewsletterSegment = NEWSLETTER_SEGMENTS.includes(payload.segment) ? payload.segment : 'nutzer';
    const listId = resolveBrevoNewsletterListId(segment);
    if (!listId) {
      return {
        success: false,
        error: `Brevo Listen-ID fehlt fuer Segment ${NEWSLETTER_SEGMENT_LABELS[segment]}. Bitte Umgebungsvariable setzen.`,
      };
    }

    const recipientsRes = await adminGetNewsletterRecipients(payload.adminCode, segment);
    if (!recipientsRes.success) {
      return { success: false, error: recipientsRes.error || 'Empfaenger konnten nicht geladen werden.' };
    }

    const recipients = Array.isArray((recipientsRes as any).recipients) ? (recipientsRes as any).recipients : [];
    const uniqueRecipients = Array.from(
      new Map(
        recipients
          .map((item: any) => {
            const email = String(item.email || '').trim().toLowerCase();
            if (!email) return null;
            return [email, { email, vorname: String(item.vorname || '').trim(), nachname: String(item.nachname || '').trim() }];
          })
          .filter(Boolean) as Array<[string, { email: string; vorname: string; nachname: string }]>
      ).values()
    );

    if (uniqueRecipients.length === 0) {
      return { success: true, synced: 0, failed: 0, listId, segment, label: NEWSLETTER_SEGMENT_LABELS[segment] };
    }

    const failures: Array<{ email: string; status: number; message: string }> = [];
    let synced = 0;
    const chunkSize = 20;

    for (let i = 0; i < uniqueRecipients.length; i += chunkSize) {
      const chunk = uniqueRecipients.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (recipient) => {
          const response = await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
              'api-key': apiKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              email: recipient.email,
              attributes: {
                FIRSTNAME: recipient.vorname,
                LASTNAME: recipient.nachname,
              },
              listIds: [listId],
              updateEnabled: true,
            }),
          });

          if (!response.ok) {
            const details = await response.text().catch(() => '');
            return {
              ok: false,
              email: recipient.email,
              status: response.status,
              message: details.slice(0, 400),
            };
          }
          return { ok: true, email: recipient.email };
        })
      );

      for (const result of results) {
        if ((result as any).ok) {
          synced += 1;
        } else {
          failures.push({
            email: (result as any).email,
            status: Number((result as any).status || 0),
            message: String((result as any).message || 'Brevo-Fehler'),
          });
        }
      }
    }

    return {
      success: failures.length === 0,
      partial: failures.length > 0,
      synced,
      failed: failures.length,
      listId,
      segment,
      label: NEWSLETTER_SEGMENT_LABELS[segment],
      failures: failures.slice(0, 25),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Brevo-Synchronisierung fehlgeschlagen.' };
  }
}

export async function adminPreviewNewsletterSegmentSync(payload: {
  adminCode: string;
  segment: NewsletterSegment;
}) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const segment: NewsletterSegment = NEWSLETTER_SEGMENTS.includes(payload.segment) ? payload.segment : 'nutzer';
    const listId = resolveBrevoNewsletterListId(segment);
    const { apiKey } = resolveBrevoTemplateConfig();

    const recipientsRes = await adminGetNewsletterRecipients(payload.adminCode, segment);
    if (!recipientsRes.success) {
      return { success: false, error: recipientsRes.error || 'Empfaenger konnten nicht geladen werden.' };
    }

    const recipients = Array.isArray((recipientsRes as any).recipients) ? (recipientsRes as any).recipients : [];
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const normalizedEmails: string[] = recipients
      .map((item: any) => String(item.email || '').trim().toLowerCase())
      .filter(Boolean);

    const invalidEmails: string[] = [];
    const validEmails: string[] = [];
    for (const email of normalizedEmails) {
      if (emailPattern.test(email)) {
        validEmails.push(email);
      } else {
        invalidEmails.push(email);
      }
    }
    const uniqueValidEmails = Array.from(new Set(validEmails));
    const duplicateCount = Math.max(0, validEmails.length - uniqueValidEmails.length);

    return {
      success: true,
      dryRun: true,
      segment,
      label: NEWSLETTER_SEGMENT_LABELS[segment],
      listId,
      hasBrevoApiKey: Boolean(apiKey),
      canSyncNow: Boolean(apiKey) && listId > 0,
      totals: {
        totalRows: recipients.length,
        validEmails: validEmails.length,
        uniqueValidEmails: uniqueValidEmails.length,
        duplicateEmails: duplicateCount,
        invalidEmails: invalidEmails.length,
      },
      invalidEmailSamples: invalidEmails.slice(0, 10),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Dry-Run konnte nicht ausgeführt werden.' };
  }
}

export async function getNewsletterBannerContext(userId: number) {
  try {
    await ensureExtraSchema();

    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return {
        success: false,
        error: 'Ungueltige Nutzer-ID.',
        shouldShow: false,
      };
    }

    const res = await pool.query(
      `SELECT u.role,
              COALESCE(us.plan_key, CASE WHEN u.role = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
              COALESCE(ns.opted_in, FALSE) AS opted_in
       FROM users u
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       LEFT JOIN user_newsletter_settings ns ON ns.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [safeUserId]
    );

    const row = res.rows[0];
    if (!row) {
      return {
        success: false,
        error: 'Nutzer nicht gefunden.',
        shouldShow: false,
      };
    }

    const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
    const planKey = normalizeSubscriptionPlanKey(role, String(row.plan_key || ''));
    const optedIn = Boolean(row.opted_in);

    let segment: NewsletterSegment = 'nutzer';
    if (role === 'experte' && planKey === 'experte_pro') {
      segment = 'experten_pro_abo';
    } else if (role === 'experte' && planKey !== 'experte_free') {
      segment = 'experten_abo';
    } else if (role === 'experte') {
      segment = 'experten';
    } else if (planKey === 'nutzer_plus') {
      segment = 'nutzer_abo';
    }

    const banner = NEWSLETTER_BANNER_TEXTS[segment];

    return {
      success: true,
      shouldShow: !optedIn,
      optedIn,
      segment,
      label: NEWSLETTER_SEGMENT_LABELS[segment],
      title: banner.title,
      body: banner.body,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Newsletter-Status konnte nicht geladen werden.',
      shouldShow: false,
    };
  }
}

function normalizeSubscriptionPlanKey(role: SubscriptionRole, planKey: string | null | undefined): SubscriptionPlanKey {
  const normalized = String(planKey || '').trim().toLowerCase();
  const fallback = getDefaultPlanKeyForRole(role);
  if (!normalized) return fallback;

  const plan = SUBSCRIPTION_PLAN_CATALOG[normalized as SubscriptionPlanKey];
  if (!plan || plan.role !== role) return fallback;
  return normalized as SubscriptionPlanKey;
}

function getSubscriptionPlanDefinition(role: SubscriptionRole, planKey: string | null | undefined) {
  const resolvedKey = normalizeSubscriptionPlanKey(role, planKey);
  return SUBSCRIPTION_PLAN_CATALOG[resolvedKey];
}

function getSubscriptionPricing(role: SubscriptionRole, paymentMethod: SubscriptionPaymentMethod, planKey?: string | null) {
  const plan = getSubscriptionPlanDefinition(role, planKey);
  return {
    planKey: plan.key,
    planLabel: plan.label,
    baseCents: plan.baseCents,
    paypalFeeCents: plan.paypalFeeCents,
    monthlyPriceCents: paymentMethod === 'paypal' ? plan.baseCents + plan.paypalFeeCents : plan.baseCents,
    features: plan,
  };
}

function getAvailableSubscriptionPlans(role: SubscriptionRole) {
  return Object.values(SUBSCRIPTION_PLAN_CATALOG)
    .filter((plan) => plan.role === role)
    .map((plan) => ({
      ...plan,
      monthlyPriceCents: plan.baseCents,
      monthlyPricePaypalCents: plan.baseCents + plan.paypalFeeCents,
    }));
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toInvoiceMonth(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}`;
}

function addMonthsWithCalendarDay(date: Date, months: number) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonthDate = new Date(year, month + months, 1, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  const daysInTargetMonth = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
  targetMonthDate.setDate(Math.min(day, daysInTargetMonth));
  return targetMonthDate;
}

function buildSubscriptionInvoiceNumber(userId: number, dueDate: Date, planKey: string) {
  const planCode = String(planKey || '').trim().toUpperCase() || 'PLAN';
  return `ABO-${dueDate.getFullYear()}${pad2(dueDate.getMonth() + 1)}-${String(userId).padStart(6, '0')}-${planCode}`;
}

function escapePdfText(value: string) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function formatMoneyCentsForInvoice(cents: number) {
  const value = Number(cents || 0) / 100;
  return `${value.toFixed(2).replace('.', ',')} EUR`;
}

function getSubscriptionInvoicePaymentText(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'bezahlt') {
    return 'Diese Rechnung wurde bereits beglichen.';
  }
  return 'Diese Rechnung ist noch zu begleichen.';
}

function buildSimplePdfBuffer(lines: string[]) {
  const contentRows = lines.slice(0, 52).map((line) => `(${escapePdfText(line)}) Tj`).join(' T*\n');
  const stream = `BT\n/F1 11 Tf\n50 780 Td\n14 TL\n${contentRows}\nET`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function buildSubscriptionInvoicePdf(invoice: {
  invoice_number: string;
  invoice_month: string;
  due_at: string;
  period_start: string;
  period_end: string;
  amount_cents: number;
  status: string;
  payment_method: string;
  plan_label: string;
  email: string;
  name: string;
}) {
  const lines = [
    'Equily - Abo Rechnung',
    '',
    `Rechnungsnummer: ${invoice.invoice_number}`,
    `Rechnungsmonat: ${invoice.invoice_month}`,
    `Leistungszeitraum: ${invoice.period_start} bis ${invoice.period_end}`,
    `Faellig am: ${new Date(invoice.due_at).toLocaleDateString('de-DE')}`,
    `Status: ${invoice.status}`,
    getSubscriptionInvoicePaymentText(invoice.status),
    '',
    `Kunde: ${invoice.name}`,
    `E-Mail: ${invoice.email}`,
    '',
    `Plan: ${invoice.plan_label}`,
    `Zahlungsart: ${invoice.payment_method === 'paypal' ? 'PayPal' : 'SEPA'}`,
    `Betrag: ${formatMoneyCentsForInvoice(invoice.amount_cents)}`,
    '',
    'Vielen Dank fuer dein Vertrauen in Equily.',
    `Erstellt am: ${new Date().toLocaleDateString('de-DE')}`,
  ];

  return buildSimplePdfBuffer(lines);
}

async function sendSubscriptionInvoiceCreatedEmail(payload: {
  toEmail: string;
  firstName: string;
  invoiceNumber: string;
  invoiceMonth: string;
  dueAtIso: string;
  planLabel: string;
  amountCents: number;
  paymentMethod: 'sepa' | 'paypal';
  pdfBuffer: Buffer;
}) {
  const recipient = String(payload.toEmail || '').trim().toLowerCase();
  if (!recipient || !recipient.includes('@')) return;

  const { transporter, from } = createMailTransport();
  const safeFirstName = String(payload.firstName || '').trim() || 'du';

  const subject = `Deine Equily Abo-Rechnung ${payload.invoiceNumber}`;
  const text = [
    `Hallo ${safeFirstName},`,
    '',
    'deine neue Abo-Rechnung wurde automatisch erstellt.',
    `Rechnungsnummer: ${payload.invoiceNumber}`,
    `Monat: ${payload.invoiceMonth}`,
    `Plan: ${payload.planLabel}`,
    `Betrag: ${formatMoneyCentsForInvoice(payload.amountCents)}`,
    `Faellig am: ${new Date(payload.dueAtIso).toLocaleDateString('de-DE')}`,
    `Zahlungsart: ${payload.paymentMethod === 'paypal' ? 'PayPal' : 'SEPA'}`,
    '',
    'Die Rechnung findest du im Anhang als PDF und in deinem Profilbereich unter Rechnungen.',
    '',
    'Viele Gruesse',
    'Dein Equily Team',
  ].join('\n');

  const html = `
    <p>Hallo ${safeFirstName},</p>
    <p>deine neue <strong>Abo-Rechnung</strong> wurde automatisch erstellt.</p>
    <p>
      <strong>Rechnungsnummer:</strong> ${payload.invoiceNumber}<br/>
      <strong>Monat:</strong> ${payload.invoiceMonth}<br/>
      <strong>Plan:</strong> ${payload.planLabel}<br/>
      <strong>Betrag:</strong> ${formatMoneyCentsForInvoice(payload.amountCents)}<br/>
      <strong>Faellig am:</strong> ${new Date(payload.dueAtIso).toLocaleDateString('de-DE')}<br/>
      <strong>Zahlungsart:</strong> ${payload.paymentMethod === 'paypal' ? 'PayPal' : 'SEPA'}
    </p>
    <p>Die Rechnung findest du im Anhang als PDF und in deinem Profilbereich unter Rechnungen.</p>
    <p>Viele Gruesse<br/>Dein Equily Team</p>
  `;

  await transporter.sendMail({
    from,
    to: recipient,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `${payload.invoiceNumber}.pdf`,
        content: payload.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

async function sendSubscriptionInvoicePaidEmail(payload: {
  toEmail: string;
  firstName: string;
  invoiceNumber: string;
  invoiceMonth: string;
  planLabel: string;
  amountCents: number;
}) {
  const recipient = String(payload.toEmail || '').trim().toLowerCase();
  if (!recipient || !recipient.includes('@')) return;

  const { transporter, from } = createMailTransport();
  const safeFirstName = String(payload.firstName || '').trim() || 'du';

  const subject = `Zahlung bestätigt: ${payload.invoiceNumber}`;
  const text = [
    `Hallo ${safeFirstName},`,
    '',
    'deine Zahlung wurde erfolgreich verbucht.',
    `Rechnungsnummer: ${payload.invoiceNumber}`,
    `Monat: ${payload.invoiceMonth}`,
    `Plan: ${payload.planLabel}`,
    `Betrag: ${formatMoneyCentsForInvoice(payload.amountCents)}`,
    '',
    'Vielen Dank!',
    'Dein Equily Team',
  ].join('\n');

  const html = `
    <p>Hallo ${safeFirstName},</p>
    <p>deine Zahlung wurde erfolgreich verbucht.</p>
    <p>
      <strong>Rechnungsnummer:</strong> ${payload.invoiceNumber}<br/>
      <strong>Monat:</strong> ${payload.invoiceMonth}<br/>
      <strong>Plan:</strong> ${payload.planLabel}<br/>
      <strong>Betrag:</strong> ${formatMoneyCentsForInvoice(payload.amountCents)}
    </p>
    <p>Vielen Dank!<br/>Dein Equily Team</p>
  `;

  await transporter.sendMail({
    from,
    to: recipient,
    subject,
    text,
    html,
  });
}

function getVisibilityPromotionLabel(scope: VisibilityPromotionScope) {
  if (scope === 'angebote') return 'Angebot hochschieben';
  if (scope === 'suchen') return 'Suche hochschieben';
  return 'Startseitenwerbung';
}

function getVisibilityPromotionDurationDays(scope: VisibilityPromotionScope) {
  return scope === 'wochenwerbung' ? WEEKLY_AD_DURATION_DAYS : SEARCH_BOOST_DURATION_DAYS;
}

function getVisibilityPromotionScopeForRole(role: SubscriptionRole): VisibilityPromotionScope {
  return role === 'experte' ? 'angebote' : 'suchen';
}

function isVisibilityPromotionScopeAllowed(role: SubscriptionRole, scope: VisibilityPromotionScope) {
  if (scope === 'wochenwerbung') return role === 'experte';
  return scope === getVisibilityPromotionScopeForRole(role);
}

function getVisibilityPriorityScore(params: {
  role: string | null | undefined;
  planKey: string | null | undefined;
  activeBoostUntil: string | Date | null | undefined;
}) {
  const role = normalizeSubscriptionRole(params.role);
  const planKey = String(params.planKey || '').trim().toLowerCase();
  const activeBoostUntil = params.activeBoostUntil ? new Date(params.activeBoostUntil).getTime() : Number.NaN;
  const hasActiveBoost = Number.isFinite(activeBoostUntil) && activeBoostUntil > Date.now();

  if (hasActiveBoost) return 300;
  if (role === 'nutzer' && planKey === 'nutzer_plus') return 180;
  if (role === 'experte' && planKey === 'experte_pro') return 120;
  return 0;
}

function computeProtectionQuote(totalCents: number, expertPlan: SubscriptionPlanDefinition, customerPlan: SubscriptionPlanDefinition) {
  const providerCommissionBps = expertPlan.providerCommissionBps;
  const customerDiscountBps = customerPlan.customerDiscountBps;
  const finalFeeBps = Math.max(0, providerCommissionBps - customerDiscountBps);
  const protectionFeeCents = Math.max(0, Math.round(totalCents * finalFeeBps / 10000));
  const customerTotalCents = totalCents + protectionFeeCents;

  return {
    providerCommissionBps,
    customerDiscountBps,
    finalFeeBps,
    protectionFeeCents,
    customerTotalCents,
    expertPayoutCents: totalCents,
    protectionModel: 'buyer-seller-protection-confirmed',
  };
}

async function getUserPlanDefinition(userId: number, roleHint?: string | null) {
  await ensureUserSubscriptionRow(userId, roleHint);
  const safeUserId = Number(userId);
  const res = await pool.query(
    `SELECT role, plan_key
     FROM user_subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [safeUserId]
  );
  const role = normalizeSubscriptionRole(roleHint || res.rows[0]?.role);
  return getSubscriptionPlanDefinition(role, res.rows[0]?.plan_key);
}

const FREE_MONTHLY_POST_LIMIT = 4;
const FREE_MONTHLY_OFFER_LIMIT = 2;

function isPaidPlan(plan: SubscriptionPlanDefinition) {
  return Number(plan.baseCents || 0) > 0;
}

function getMonthKeyFromDateInput(value: any): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getCurrentUtcMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function enforceMonthlyOfferLimit(userId: number, roleHint: SubscriptionRole, payload: any) {
  const incomingOffers = Array.isArray(payload?.angeboteAnzeigen) ? payload.angeboteAnzeigen : null;
  if (!incomingOffers) return;

  const plan = await getUserPlanDefinition(userId, roleHint);
  if (isPaidPlan(plan)) return;

  const profileRes = await pool.query(
    `SELECT profil_data
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  const existingProfilData = profileRes.rows[0]?.profil_data || {};
  const existingOffers = Array.isArray(existingProfilData?.angeboteAnzeigen) ? existingProfilData.angeboteAnzeigen : [];
  const existingIds = new Set(
    existingOffers
      .map((offer: any) => String(offer?.id || '').trim())
      .filter(Boolean)
  );

  const currentMonthKey = getCurrentUtcMonthKey();
  const existingMonthCreates = existingOffers.filter((offer: any) => {
    const monthKey = getMonthKeyFromDateInput(offer?.createdAt);
    return monthKey === currentMonthKey;
  }).length;

  const newOfferCreates = incomingOffers
    .filter((offer: any) => {
      const offerId = String(offer?.id || '').trim();
      return offerId && !existingIds.has(offerId);
    })
    .length;

  if (existingMonthCreates + newOfferCreates > FREE_MONTHLY_OFFER_LIMIT) {
    throw new Error(`Ohne Abo sind maximal ${FREE_MONTHLY_OFFER_LIMIT} Anzeigen pro Monat moeglich.`);
  }
}

async function ensureUserSubscriptionRow(userId: number, roleHint?: string | null) {
  await ensureExtraSchema();

  const safeUserId = Number(userId);
  if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
    throw new Error('Ungueltige Nutzer-ID.');
  }

  const roleRes = await pool.query('SELECT role FROM users WHERE id = $1 LIMIT 1', [safeUserId]);
  const dbRole = roleRes.rows[0]?.role;
  const role = normalizeSubscriptionRole(roleHint || dbRole);
  const pricing = getSubscriptionPricing(role, 'sepa', getDefaultPlanKeyForRole(role));

  await pool.query(
    `INSERT INTO user_subscriptions (
      user_id,
      role,
      plan_key,
      payment_method,
      monthly_price_cents,
      status,
      paypal_fee_cents,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, 'sepa', $4, 'pending', $5, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING`,
    [safeUserId, role, pricing.planKey, pricing.monthlyPriceCents, pricing.paypalFeeCents]
  );

  await pool.query(
    `UPDATE user_subscriptions
     SET role = $2,
         plan_key = CASE
           WHEN lifetime_free_access = TRUE AND $2 = 'experte' AND plan_key = 'experte_free' THEN 'experte_abo'
           WHEN lifetime_free_access = TRUE AND $2 = 'nutzer' AND plan_key = 'nutzer_free' THEN 'nutzer_plus'
           WHEN $2 = 'experte' AND plan_key NOT LIKE 'experte_%' THEN 'experte_free'
           WHEN $2 = 'nutzer' AND plan_key NOT LIKE 'nutzer_%' THEN 'nutzer_free'
           ELSE plan_key
         END,
         status = CASE
           WHEN lifetime_free_access = TRUE THEN 'active'
           ELSE status
         END,
         next_charge_at = CASE
           WHEN lifetime_free_access = TRUE THEN NULL
           ELSE next_charge_at
         END,
         updated_at = NOW()
     WHERE user_id = $1`,
    [safeUserId, role]
  );
}

export async function getUserSubscriptionSettings(userId: number) {
  try {
    await ensureUserSubscriptionRow(userId);

    const safeUserId = Number(userId);
    const aboSanction = await getActiveSanction(safeUserId, ['abo']);
    const result = await pool.query(
      `SELECT user_id,
              role,
              plan_key,
              payment_method,
              monthly_price_cents,
              status,
              sepa_account_holder,
              sepa_iban,
              paypal_email,
              paypal_fee_cents,
              gocardless_redirect_flow_id,
              gocardless_customer_id,
              gocardless_customer_bank_account_id,
              gocardless_mandate_id,
              gocardless_mandate_status,
              gocardless_connected_at,
              gocardless_last_error,
              custom_monthly_price_cents,
              custom_price_note,
              custom_price_set_at,
              cancel_requested_at,
              cancel_effective_at,
              cancel_reason,
              cancelled_at,
              homepage_marketing_until,
              started_at,
              next_charge_at,
              is_founding_member,
              founding_member_free_until,
              lifetime_free_access,
              lifetime_discount_percent,
              updated_at
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [safeUserId]
    );

    const row = result.rows[0];
    if (!row) {
      return { success: false, error: 'Abo konnte nicht geladen werden.', data: null };
    }

    const normalizedRole = normalizeSubscriptionRole(row.role);
    const pricing = getSubscriptionPricing(normalizedRole, row.payment_method === 'paypal' ? 'paypal' : 'sepa', row.plan_key);
    
    // Berechne effektive Preislogik mit Gründungsmitglied/Lebenszeit-Rabatt
    let effectiveMonthlyPriceCents = row.custom_monthly_price_cents === null || row.custom_monthly_price_cents === undefined
      ? (row.monthly_price_cents === null || row.monthly_price_cents === undefined ? pricing.monthlyPriceCents : Number(row.monthly_price_cents))
      : Number(row.custom_monthly_price_cents);

    // Lifetime Free Access: Immer kostenlos
    if (row.lifetime_free_access === true) {
      effectiveMonthlyPriceCents = 0;
    }
    // Gründungsmitglied mit ausstehender kostenloser Phase
    else if (row.is_founding_member === true && row.founding_member_free_until && new Date(row.founding_member_free_until) > new Date()) {
      effectiveMonthlyPriceCents = 0;
    }
    // Gründungsmitglied nach kostenloser Phase:
    // - experte_abo: 30% Rabatt auf Experten-Abo-Basispreis
    // - experte_pro: 30% Rabatt auf Experten-Abo-Anteil + 20% Rabatt auf Premium-Aufpreis
    else if (row.is_founding_member === true && row.lifetime_discount_percent && row.lifetime_discount_percent > 0) {
      const discountPercent = Number(row.lifetime_discount_percent) || 0;

      if (String(row.plan_key || '').trim().toLowerCase() === 'experte_pro') {
        const experteAboPricing = getSubscriptionPricing('experte', row.payment_method === 'paypal' ? 'paypal' : 'sepa', 'experte_abo');
        const experteProPricing = getSubscriptionPricing('experte', row.payment_method === 'paypal' ? 'paypal' : 'sepa', 'experte_pro');

        const aboPart = Number(experteAboPricing.monthlyPriceCents || 0);
        const premiumAddOn = Math.max(0, Number(experteProPricing.monthlyPriceCents || 0) - aboPart);

        const discountedAboPart = Math.round(aboPart * (1 - discountPercent / 100));
        const discountedPremiumAddOn = Math.round(premiumAddOn * 0.8);
        effectiveMonthlyPriceCents = discountedAboPart + discountedPremiumAddOn;
      } else {
        const baseCents = pricing.monthlyPriceCents;
        effectiveMonthlyPriceCents = Math.round(baseCents * (1 - discountPercent / 100));
      }
    }

    return {
      success: true,
      data: {
        ...row,
        role: normalizedRole,
        payment_method: row.payment_method === 'paypal' ? 'paypal' : 'sepa',
        plan_key: pricing.planKey,
        plan_label: pricing.planLabel,
        base_price_cents: pricing.baseCents,
        paypal_fee_cents: pricing.paypalFeeCents,
        monthly_price_cents: effectiveMonthlyPriceCents,
        custom_monthly_price_cents: row.custom_monthly_price_cents === null || row.custom_monthly_price_cents === undefined ? null : Number(row.custom_monthly_price_cents),
        custom_price_note: row.custom_price_note || null,
        custom_price_set_at: row.custom_price_set_at || null,
        cancel_requested_at: row.cancel_requested_at || null,
        cancel_effective_at: row.cancel_effective_at || null,
        cancel_reason: row.cancel_reason || null,
        cancelled_at: row.cancelled_at || null,
        is_founding_member: Boolean(row.is_founding_member),
        founding_member_free_until: row.founding_member_free_until || null,
        lifetime_free_access: Boolean(row.lifetime_free_access),
        lifetime_discount_percent: Number(row.lifetime_discount_percent || 0),
        gocardless_redirect_flow_id: row.gocardless_redirect_flow_id || null,
        gocardless_customer_id: row.gocardless_customer_id || null,
        gocardless_customer_bank_account_id: row.gocardless_customer_bank_account_id || null,
        gocardless_mandate_id: row.gocardless_mandate_id || null,
        gocardless_mandate_status: row.gocardless_mandate_status || null,
        gocardless_connected_at: row.gocardless_connected_at || null,
        gocardless_last_error: row.gocardless_last_error || null,
        abo_blocked: Boolean(aboSanction),
        abo_blocked_until: aboSanction?.ends_at || null,
        abo_blocked_reason: aboSanction?.reason || null,
        features: pricing.features,
        available_plans: getAvailableSubscriptionPlans(normalizedRole),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo konnte nicht geladen werden.', data: null };
  }
}

export async function upsertUserSubscriptionSettings(payload: {
  userId: number;
  role?: string | null;
  planKey?: string | null;
  paymentMethod: SubscriptionPaymentMethod;
  sepaAccountHolder?: string;
  sepaIban?: string;
  paypalEmail?: string;
}) {
  try {
    await ensureUserSubscriptionRow(payload.userId, payload.role);

    const safeUserId = Number(payload.userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const aboSanction = await getActiveSanction(safeUserId, ['abo']);
    if (aboSanction) {
      return {
        success: false,
        error: `Abo-Änderungen sind bis ${new Date(aboSanction.ends_at).toLocaleDateString('de-DE')} gesperrt.`
      };
    }

    const paymentMethod: SubscriptionPaymentMethod = payload.paymentMethod === 'paypal' ? 'paypal' : 'sepa';
    const currentRes = await pool.query('SELECT role, gocardless_mandate_id FROM user_subscriptions WHERE user_id = $1 LIMIT 1', [safeUserId]);
    const role = normalizeSubscriptionRole(payload.role || currentRes.rows[0]?.role);
    const hasGoCardlessMandate = String(currentRes.rows[0]?.gocardless_mandate_id || '').trim().length > 0;
    const pricing = getSubscriptionPricing(role, paymentMethod, payload.planKey);

    const sepaAccountHolder = String(payload.sepaAccountHolder || '').trim();
    const rawIban = String(payload.sepaIban || '').toUpperCase();
    const sepaIban = rawIban.replace(/\s+/g, '');
    const paypalEmail = String(payload.paypalEmail || '').trim().toLowerCase();
    const isPaidPlan = pricing.baseCents > 0;

    if (isPaidPlan && paymentMethod === 'sepa' && !hasGoCardlessMandate) {
      if (!sepaAccountHolder) {
        return { success: false, error: 'Bitte Kontoinhaber fuer SEPA angeben oder GoCardless verbinden.' };
      }
      if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(sepaIban)) {
        return { success: false, error: 'Bitte eine gueltige IBAN angeben oder GoCardless verbinden.' };
      }
    }

    if (isPaidPlan && paymentMethod === 'paypal' && !paypalEmail.includes('@')) {
      return { success: false, error: 'Bitte eine gueltige PayPal-E-Mail angeben.' };
    }

    const currentPlanRes = await pool.query(
      `SELECT plan_key, homepage_marketing_until
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [safeUserId]
    );
    const previousPlanKey = String(currentPlanRes.rows[0]?.plan_key || '');
    const activateHomepageBoost = pricing.features.homepageBoostDays > 0 && previousPlanKey !== pricing.planKey;

    await pool.query(
      `UPDATE user_subscriptions
       SET role = $2,
           plan_key = $3,
           payment_method = $4,
           monthly_price_cents = COALESCE(custom_monthly_price_cents, $5),
           status = 'active',
           cancel_requested_at = NULL,
           cancel_effective_at = NULL,
           cancel_reason = NULL,
           cancelled_at = NULL,
           sepa_account_holder = $6,
           sepa_iban = $7,
           paypal_email = $8,
           paypal_fee_cents = $9,
           homepage_marketing_until = CASE
             WHEN $10::timestamp IS NOT NULL THEN $10::timestamp
             WHEN COALESCE(custom_monthly_price_cents, $5) = 0 THEN NULL
             ELSE homepage_marketing_until
           END,
           started_at = COALESCE(started_at, NOW()),
           next_charge_at = CASE
             WHEN COALESCE(custom_monthly_price_cents, $5) = 0 THEN NULL
             ELSE GREATEST(COALESCE(next_charge_at, NOW()), NOW() + INTERVAL '2 months')
           END,
           updated_at = NOW()
       WHERE user_id = $1`,
      [
        safeUserId,
        role,
        pricing.planKey,
        paymentMethod,
        pricing.monthlyPriceCents,
        paymentMethod === 'sepa' ? sepaAccountHolder : null,
        paymentMethod === 'sepa' ? sepaIban : null,
        paymentMethod === 'paypal' ? paypalEmail : null,
        pricing.paypalFeeCents,
        activateHomepageBoost ? new Date(Date.now() + pricing.features.homepageBoostDays * 24 * 60 * 60 * 1000).toISOString() : null,
      ]
    );

    await grantEarlyAccessForUser(safeUserId);

    // Automatisch als Gründungsmitglied markieren, wenn zu experte_abo/experte_pro wechselt
    if ((pricing.planKey === 'experte_abo' || pricing.planKey === 'experte_pro') && role === 'experte') {
      await checkAndMarkFoundingMemberIfEligible(safeUserId);
    }

    const newsletterRes = await pool.query(
      `SELECT opted_in
       FROM user_newsletter_settings
       WHERE user_id = $1
       LIMIT 1`,
      [safeUserId]
    );
    if (newsletterRes.rows.length > 0) {
      await setUserNewsletterOptIn(safeUserId, Boolean(newsletterRes.rows[0]?.opted_in), 'plan-update');
    }

    return {
      success: true,
      planLabel: pricing.planLabel,
      planKey: pricing.planKey,
      monthlyPriceCents: pricing.monthlyPriceCents,
      paymentMethod,
      role,
      features: pricing.features,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo konnte nicht gespeichert werden.' };
  }
}

async function ensureSubscriptionInvoicesForUserInternal(userId: number, throughDateInput?: Date) {
  await ensureExtraSchema();
  await ensureUserSubscriptionRow(userId);

  const safeUserId = Number(userId);
  if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
    return { success: false, error: 'Ungueltige Nutzer-ID.', createdCount: 0 };
  }

  const subRes = await pool.query(
    `SELECT user_id,
            role,
            plan_key,
            payment_method,
            status,
            monthly_price_cents,
            custom_monthly_price_cents,
            started_at,
            created_at,
            updated_at,
            cancel_effective_at
     FROM user_subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [safeUserId]
  );

  const row = subRes.rows[0];
  if (!row) return { success: true, createdCount: 0 };

  const profileRes = await pool.query(
    `SELECT email, vorname, nachname
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [safeUserId]
  );
  const profile = profileRes.rows[0] || {};
  const recipientEmail = String(profile.email || '').trim().toLowerCase();
  const recipientName = String(profile.vorname || '').trim() || String(profile.nachname || '').trim() || 'du';

  const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
  const plan = getSubscriptionPlanDefinition(role, String(row.plan_key || ''));
  const status = String(row.status || '').trim().toLowerCase();
  const effectiveMonthlyCents =
    row.custom_monthly_price_cents !== null && row.custom_monthly_price_cents !== undefined
      ? Number(row.custom_monthly_price_cents)
      : Number(row.monthly_price_cents || 0);

  if (effectiveMonthlyCents <= 0) return { success: true, createdCount: 0 };
  if (status !== 'active' && status !== 'cancel_pending') return { success: true, createdCount: 0 };

  const startedAt = new Date(row.started_at || row.created_at || row.updated_at || Date.now());
  if (!Number.isFinite(startedAt.getTime())) return { success: true, createdCount: 0 };

  const firstDueAt = addMonthsWithCalendarDay(startedAt, 2);
  let throughDate = throughDateInput && Number.isFinite(throughDateInput.getTime()) ? new Date(throughDateInput) : new Date();

  const cancelEffectiveAt = row.cancel_effective_at ? new Date(row.cancel_effective_at) : null;
  if (cancelEffectiveAt && Number.isFinite(cancelEffectiveAt.getTime()) && cancelEffectiveAt.getTime() <= throughDate.getTime()) {
    throughDate = new Date(cancelEffectiveAt.getTime() - 1);
  }

  if (firstDueAt.getTime() > throughDate.getTime()) {
    return { success: true, createdCount: 0 };
  }

  let cursor = new Date(firstDueAt);
  let createdCount = 0;
  let safety = 0;

  while (cursor.getTime() <= throughDate.getTime() && safety < 72) {
    safety += 1;

    const invoiceMonth = toInvoiceMonth(cursor);
    const periodStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const periodEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const invoiceNumber = buildSubscriptionInvoiceNumber(safeUserId, cursor, plan.key);

    const insertRes = await pool.query(
      `INSERT INTO user_subscription_invoices
        (user_id, role, plan_key, payment_method, invoice_month, invoice_number, period_start, period_end, due_at, amount_cents, currency, status, source, notes)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9::timestamp, $10, 'EUR', 'offen', 'subscription-cycle', $11)
       ON CONFLICT (user_id, invoice_month) DO NOTHING
       RETURNING id`,
      [
        safeUserId,
        role,
        plan.key,
        String(row.payment_method || 'sepa').trim().toLowerCase() === 'paypal' ? 'paypal' : 'sepa',
        invoiceMonth,
        invoiceNumber,
        `${periodStart.getFullYear()}-${pad2(periodStart.getMonth() + 1)}-${pad2(periodStart.getDate())}`,
        `${periodEnd.getFullYear()}-${pad2(periodEnd.getMonth() + 1)}-${pad2(periodEnd.getDate())}`,
        cursor.toISOString(),
        effectiveMonthlyCents,
        `Automatisch erzeugt für ${plan.label}`,
      ]
    );

    if (insertRes.rows[0]) createdCount += 1;

    if (insertRes.rows[0] && recipientEmail.includes('@')) {
      try {
        const createdInvoiceId = Number(insertRes.rows[0]?.id || 0);
        const invoiceDataForPdf = {
          invoice_number: invoiceNumber,
          invoice_month: invoiceMonth,
          due_at: cursor.toISOString(),
          period_start: `${periodStart.getFullYear()}-${pad2(periodStart.getMonth() + 1)}-${pad2(periodStart.getDate())}`,
          period_end: `${periodEnd.getFullYear()}-${pad2(periodEnd.getMonth() + 1)}-${pad2(periodEnd.getDate())}`,
          amount_cents: effectiveMonthlyCents,
          status: 'offen',
          payment_method: String(row.payment_method || 'sepa').trim().toLowerCase() === 'paypal' ? 'paypal' : 'sepa',
          plan_label: plan.label,
          email: recipientEmail,
          name: recipientName,
        };

        const pdfBuffer = buildSubscriptionInvoicePdf(invoiceDataForPdf);
        await sendSubscriptionInvoiceCreatedEmail({
          toEmail: recipientEmail,
          firstName: recipientName,
          invoiceNumber,
          invoiceMonth,
          dueAtIso: cursor.toISOString(),
          planLabel: plan.label,
          amountCents: effectiveMonthlyCents,
          paymentMethod: invoiceDataForPdf.payment_method as 'sepa' | 'paypal',
          pdfBuffer,
        });

        if (Number.isInteger(createdInvoiceId) && createdInvoiceId > 0) {
          await pool.query(
            `UPDATE user_subscription_invoices
             SET emailed_at = COALESCE(emailed_at, NOW()),
                 updated_at = NOW()
             WHERE id = $1`,
            [createdInvoiceId]
          );
        }
      } catch {
        // Mail errors must not block invoice generation.
      }
    }

    cursor = addMonthsWithCalendarDay(cursor, 1);
  }

  return { success: true, createdCount };
}

export async function getOwnSubscriptionInvoices(userId: number, limit = 24) {
  try {
    await ensureExtraSchema();
    const safeUserId = Number(userId);
    const safeLimit = Math.max(1, Math.min(120, Number(limit) || 24));
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.', items: [] };
    }

    await ensureSubscriptionInvoicesForUserInternal(safeUserId);

    const result = await pool.query(
      `SELECT id,
              user_id,
              role,
              plan_key,
              payment_method,
              invoice_month,
              invoice_number,
              period_start,
              period_end,
              due_at,
              amount_cents,
              currency,
              status,
              source,
              notes,
              created_at,
              updated_at
       FROM user_subscription_invoices
       WHERE user_id = $1
       ORDER BY due_at DESC, id DESC
       LIMIT $2`,
      [safeUserId, safeLimit]
    );

    const items = (result.rows || []).map((row: any) => {
      const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
      const plan = getSubscriptionPlanDefinition(role, String(row.plan_key || ''));
      return {
        ...row,
        plan_label: plan.label,
      };
    });

    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo-Rechnungen konnten nicht geladen werden.', items: [] };
  }
}

export async function adminGenerateSubscriptionInvoices(payload: {
  adminCode: string;
  userId?: number;
  throughMonth?: string;
  limitUsers?: number;
}) {
  try {
    await ensureExtraSchema();

    const authorized = await isAdminAuthorizedWithCookie(payload.adminCode);
    if (!authorized) return { success: false, error: 'Nicht autorisiert.' };

    const throughMonth = String(payload.throughMonth || '').trim();
    let throughDate: Date | undefined;
    if (throughMonth) {
      if (!/^\d{4}-\d{2}$/.test(throughMonth)) {
        return { success: false, error: 'Ungueltiges Monatsformat fuer throughMonth (YYYY-MM).' };
      }
      const [year, month] = throughMonth.split('-').map((value) => Number(value));
      throughDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const singleUserId = Number(payload.userId);
    if (Number.isInteger(singleUserId) && singleUserId > 0) {
      const singleRes = await ensureSubscriptionInvoicesForUserInternal(singleUserId, throughDate);
      if (!singleRes.success) return { success: false, error: singleRes.error || 'Rechnungserstellung fehlgeschlagen.' };
      return { success: true, processedUsers: 1, createdInvoices: singleRes.createdCount || 0 };
    }

    const safeLimitUsers = Math.max(1, Math.min(5000, Number(payload.limitUsers) || 1200));
    const usersRes = await pool.query(
      `SELECT user_id
       FROM user_subscriptions
       WHERE status IN ('active', 'cancel_pending')
         AND COALESCE(custom_monthly_price_cents, monthly_price_cents, 0) > 0
       ORDER BY updated_at DESC
       LIMIT $1`,
      [safeLimitUsers]
    );

    let createdInvoices = 0;
    for (const row of usersRes.rows || []) {
      const userId = Number(row.user_id);
      if (!Number.isInteger(userId) || userId <= 0) continue;
      const res = await ensureSubscriptionInvoicesForUserInternal(userId, throughDate);
      if (res.success) createdInvoices += Number(res.createdCount || 0);
    }

    return {
      success: true,
      processedUsers: (usersRes.rows || []).length,
      createdInvoices,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo-Rechnungen konnten nicht erstellt werden.' };
  }
}

export async function runSubscriptionInvoiceAutomation(payload: {
  token: string;
  throughMonth?: string;
  userId?: number;
  limitUsers?: number;
}) {
  try {
    await ensureExtraSchema();

    const expectedToken = String(process.env.SUBSCRIPTION_INVOICE_CRON_TOKEN || process.env.CRON_SECRET || '').trim();
    const providedToken = String(payload.token || '').trim();
    if (!expectedToken) {
      return { success: false, error: 'Cron token ist nicht konfiguriert.' };
    }
    if (!providedToken || providedToken !== expectedToken) {
      return { success: false, error: 'Cron token ungültig.' };
    }

    const throughMonth = String(payload.throughMonth || '').trim();
    let throughDate: Date | undefined;
    if (throughMonth) {
      if (!/^\d{4}-\d{2}$/.test(throughMonth)) {
        return { success: false, error: 'Ungueltiges Monatsformat fuer throughMonth (YYYY-MM).' };
      }
      const [year, month] = throughMonth.split('-').map((value) => Number(value));
      throughDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    const singleUserId = Number(payload.userId);
    if (Number.isInteger(singleUserId) && singleUserId > 0) {
      const singleRes = await ensureSubscriptionInvoicesForUserInternal(singleUserId, throughDate);
      if (!singleRes.success) {
        return { success: false, error: singleRes.error || 'Rechnungserstellung fehlgeschlagen.' };
      }
      return { success: true, processedUsers: 1, createdInvoices: singleRes.createdCount || 0 };
    }

    const safeLimitUsers = Math.max(1, Math.min(10000, Number(payload.limitUsers) || 3000));
    const usersRes = await pool.query(
      `SELECT user_id
       FROM user_subscriptions
       WHERE status IN ('active', 'cancel_pending')
         AND COALESCE(custom_monthly_price_cents, monthly_price_cents, 0) > 0
       ORDER BY updated_at DESC
       LIMIT $1`,
      [safeLimitUsers]
    );

    let createdInvoices = 0;
    for (const row of usersRes.rows || []) {
      const userId = Number(row.user_id);
      if (!Number.isInteger(userId) || userId <= 0) continue;
      const res = await ensureSubscriptionInvoicesForUserInternal(userId, throughDate);
      if (res.success) createdInvoices += Number(res.createdCount || 0);
    }

    return {
      success: true,
      processedUsers: (usersRes.rows || []).length,
      createdInvoices,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo-Automation fehlgeschlagen.' };
  }
}

export async function adminGetSubscriptionInvoices(payload: {
  adminCode: string;
  search?: string;
  limit?: number;
}) {
  try {
    await ensureExtraSchema();

    const authorized = await isAdminAuthorizedWithCookie(payload.adminCode);
    if (!authorized) return { success: false, error: 'Nicht autorisiert.', items: [] };

    const search = String(payload.search || '').trim().toLowerCase();
    const safeLimit = Math.max(1, Math.min(400, Number(payload.limit) || 120));

    const result = await pool.query(
      `SELECT usi.id,
              usi.user_id,
              usi.role,
              usi.plan_key,
              usi.payment_method,
              usi.invoice_month,
              usi.invoice_number,
              usi.period_start,
              usi.period_end,
              usi.due_at,
              usi.amount_cents,
              usi.currency,
              usi.status,
              usi.source,
              usi.notes,
              usi.created_at,
              usi.updated_at,
              u.email,
              u.vorname,
              u.nachname,
              up.display_name
       FROM user_subscription_invoices usi
       JOIN users u ON u.id = usi.user_id
       LEFT JOIN user_profiles up ON up.user_id = usi.user_id
       WHERE ($1 = ''
              OR LOWER(u.email) LIKE $2
              OR LOWER(COALESCE(up.display_name, '')) LIKE $2
              OR LOWER(COALESCE(u.vorname, '') || ' ' || COALESCE(u.nachname, '')) LIKE $2
              OR LOWER(usi.invoice_number) LIKE $2
              OR LOWER(usi.invoice_month) LIKE $2)
       ORDER BY usi.due_at DESC, usi.id DESC
       LIMIT $3`,
      [search, `%${search}%`, safeLimit]
    );

    const items = (result.rows || []).map((row: any) => {
      const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
      const plan = getSubscriptionPlanDefinition(role, String(row.plan_key || ''));
      return {
        ...row,
        plan_label: plan.label,
      };
    });

    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo-Rechnungen konnten nicht geladen werden.', items: [] };
  }
}

async function getSubscriptionInvoiceById(invoiceId: number) {
  const safeInvoiceId = Number(invoiceId);
  if (!Number.isInteger(safeInvoiceId) || safeInvoiceId <= 0) return null;

  const result = await pool.query(
    `SELECT usi.id,
            usi.user_id,
            usi.role,
            usi.plan_key,
            usi.payment_method,
            usi.invoice_month,
            usi.invoice_number,
            usi.period_start,
            usi.period_end,
            usi.due_at,
            usi.amount_cents,
            usi.status,
            usi.paid_notified_at,
            u.email,
            u.vorname,
            u.nachname,
            up.display_name
     FROM user_subscription_invoices usi
     JOIN users u ON u.id = usi.user_id
     LEFT JOIN user_profiles up ON up.user_id = usi.user_id
     WHERE usi.id = $1
     LIMIT 1`,
    [safeInvoiceId]
  );

  const row = result.rows[0];
  if (!row) return null;
  const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
  const plan = getSubscriptionPlanDefinition(role, String(row.plan_key || ''));

  return {
    ...row,
    plan_label: plan.label,
    name: String(row.display_name || '').trim() || `${String(row.vorname || '').trim()} ${String(row.nachname || '').trim()}`.trim() || `User #${row.user_id}`,
  };
}

export async function getOwnSubscriptionInvoicePdf(payload: { userId: number; invoiceId: number }) {
  try {
    await ensureExtraSchema();
    const safeUserId = Number(payload.userId);
    const safeInvoiceId = Number(payload.invoiceId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }
    if (!Number.isInteger(safeInvoiceId) || safeInvoiceId <= 0) {
      return { success: false, error: 'Ungueltige Rechnungs-ID.' };
    }

    const invoice = await getSubscriptionInvoiceById(safeInvoiceId);
    if (!invoice || Number(invoice.user_id) !== safeUserId) {
      return { success: false, error: 'Rechnung nicht gefunden.' };
    }

    const pdfBuffer = buildSubscriptionInvoicePdf({
      invoice_number: String(invoice.invoice_number || ''),
      invoice_month: String(invoice.invoice_month || ''),
      due_at: String(invoice.due_at || ''),
      period_start: String(invoice.period_start || ''),
      period_end: String(invoice.period_end || ''),
      amount_cents: Number(invoice.amount_cents || 0),
      status: String(invoice.status || 'offen'),
      payment_method: String(invoice.payment_method || 'sepa'),
      plan_label: String(invoice.plan_label || ''),
      email: String(invoice.email || ''),
      name: String(invoice.name || ''),
    });

    return {
      success: true,
      fileName: `${String(invoice.invoice_number || 'abo-rechnung')}.pdf`,
      mimeType: 'application/pdf',
      base64: pdfBuffer.toString('base64'),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'PDF konnte nicht erstellt werden.' };
  }
}

export async function adminGetSubscriptionInvoicePdf(payload: { adminCode: string; invoiceId: number }) {
  try {
    await ensureExtraSchema();
    const authorized = await isAdminAuthorizedWithCookie(payload.adminCode);
    if (!authorized) return { success: false, error: 'Nicht autorisiert.' };

    const safeInvoiceId = Number(payload.invoiceId);
    if (!Number.isInteger(safeInvoiceId) || safeInvoiceId <= 0) {
      return { success: false, error: 'Ungueltige Rechnungs-ID.' };
    }

    const invoice = await getSubscriptionInvoiceById(safeInvoiceId);
    if (!invoice) return { success: false, error: 'Rechnung nicht gefunden.' };

    const pdfBuffer = buildSubscriptionInvoicePdf({
      invoice_number: String(invoice.invoice_number || ''),
      invoice_month: String(invoice.invoice_month || ''),
      due_at: String(invoice.due_at || ''),
      period_start: String(invoice.period_start || ''),
      period_end: String(invoice.period_end || ''),
      amount_cents: Number(invoice.amount_cents || 0),
      status: String(invoice.status || 'offen'),
      payment_method: String(invoice.payment_method || 'sepa'),
      plan_label: String(invoice.plan_label || ''),
      email: String(invoice.email || ''),
      name: String(invoice.name || ''),
    });

    return {
      success: true,
      fileName: `${String(invoice.invoice_number || 'abo-rechnung')}.pdf`,
      mimeType: 'application/pdf',
      base64: pdfBuffer.toString('base64'),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'PDF konnte nicht erstellt werden.' };
  }
}

export async function adminUpdateSubscriptionInvoiceStatus(payload: {
  adminCode: string;
  invoiceId: number;
  status: 'offen' | 'bezahlt';
  note?: string;
}) {
  try {
    await ensureExtraSchema();
    const authorized = await isAdminAuthorizedWithCookie(payload.adminCode);
    if (!authorized) return { success: false, error: 'Nicht autorisiert.' };

    const safeInvoiceId = Number(payload.invoiceId);
    if (!Number.isInteger(safeInvoiceId) || safeInvoiceId <= 0) {
      return { success: false, error: 'Ungueltige Rechnungs-ID.' };
    }

    const nextStatus = String(payload.status || '').trim().toLowerCase();
    if (nextStatus !== 'offen' && nextStatus !== 'bezahlt') {
      return { success: false, error: 'Ungueltiger Status.' };
    }

    const before = await getSubscriptionInvoiceById(safeInvoiceId);
    if (!before) {
      return { success: false, error: 'Rechnung nicht gefunden.' };
    }

    const note = String(payload.note || '').trim();
    await pool.query(
      `UPDATE user_subscription_invoices
       SET status = $2,
           paid_notified_at = CASE
             WHEN $2 = 'offen' THEN NULL
             WHEN $2 = 'bezahlt' THEN COALESCE(paid_notified_at, NOW())
             ELSE paid_notified_at
           END,
           notes = CASE
             WHEN $3 = '' THEN notes
             WHEN notes IS NULL OR notes = '' THEN $3
             ELSE CONCAT(notes, E'\n', $3)
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [safeInvoiceId, nextStatus, note]
    );

    if (
      nextStatus === 'bezahlt' &&
      String(before.status || '').trim().toLowerCase() !== 'bezahlt' &&
      !before.paid_notified_at
    ) {
      try {
        await sendSubscriptionInvoicePaidEmail({
          toEmail: String(before.email || '').trim().toLowerCase(),
          firstName: String(before.vorname || '').trim() || String(before.name || '').trim() || 'du',
          invoiceNumber: String(before.invoice_number || ''),
          invoiceMonth: String(before.invoice_month || ''),
          planLabel: String(before.plan_label || ''),
          amountCents: Number(before.amount_cents || 0),
        });
      } catch {
        // Do not block status update on mail errors.
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Rechnungsstatus konnte nicht aktualisiert werden.' };
  }
}

export async function createGoCardlessRedirectFlow(userId: number) {
  try {
    await ensureUserSubscriptionRow(userId);
    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const token = getGoCardlessAccessToken();
    if (!token) {
      return { success: false, error: 'GoCardless ist nicht konfiguriert (GOCARDLESS_ACCESS_TOKEN fehlt).' };
    }

    const appUrl = getPublicAppUrl();
    if (!appUrl) {
      return { success: false, error: 'NEXT_PUBLIC_APP_URL fehlt. GoCardless-Rueckleitung nicht moeglich.' };
    }

    const userRes = await pool.query(
      `SELECT email, vorname, nachname FROM users WHERE id = $1 LIMIT 1`,
      [safeUserId]
    );

    const row = userRes.rows[0] || {};
    const email = String(row.email || '').trim().toLowerCase();
    const givenName = String(row.vorname || '').trim();
    const familyName = String(row.nachname || '').trim();
    const sessionToken = crypto.randomUUID();

    const response = await fetch(`${getGoCardlessApiBase()}/redirect_flows`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'GoCardless-Version': '2015-07-06',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        redirect_flows: {
          description: `Equily Abo Nutzer ${safeUserId}`,
          session_token: sessionToken,
          success_redirect_url: `${appUrl}/abo?gocardless=success`,
          prefilled_customer: {
            email,
            given_name: givenName || undefined,
            family_name: familyName || undefined,
          },
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const normalizedError = normalizeGoCardlessError(payload, 'GoCardless-Verbindung konnte nicht gestartet werden.');
      await pool.query(
        `UPDATE user_subscriptions
         SET gocardless_last_error = $2,
             updated_at = NOW()
         WHERE user_id = $1`,
        [safeUserId, normalizedError]
      );
      return { success: false, error: normalizedError };
    }

    const redirectFlow = payload?.redirect_flows || {};
    const flowId = String(redirectFlow.id || '').trim();
    const redirectUrl = String(redirectFlow.redirect_url || '').trim();

    if (!flowId || !redirectUrl) {
      return { success: false, error: 'GoCardless lieferte keine gueltige Redirect-URL.' };
    }

    await pool.query(
      `UPDATE user_subscriptions
       SET gocardless_redirect_flow_id = $2,
           gocardless_last_error = NULL,
           updated_at = NOW()
       WHERE user_id = $1`,
      [safeUserId, flowId]
    );

    return { success: true, redirectUrl, flowId, sessionToken };
  } catch (error: any) {
    return { success: false, error: error.message || 'GoCardless-Verbindung konnte nicht gestartet werden.' };
  }
}

export async function completeGoCardlessRedirectFlow(userId: number, redirectFlowId: string, sessionToken: string) {
  try {
    await ensureUserSubscriptionRow(userId);
    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const flowId = String(redirectFlowId || '').trim();
    const session = String(sessionToken || '').trim();
    if (!flowId || !session) {
      return { success: false, error: 'GoCardless-Rueckgabedaten fehlen.' };
    }

    const token = getGoCardlessAccessToken();
    if (!token) {
      return { success: false, error: 'GoCardless ist nicht konfiguriert (GOCARDLESS_ACCESS_TOKEN fehlt).' };
    }

    const response = await fetch(`${getGoCardlessApiBase()}/redirect_flows/${encodeURIComponent(flowId)}/actions/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'GoCardless-Version': '2015-07-06',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        data: {
          session_token: session,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const normalizedError = normalizeGoCardlessError(payload, 'GoCardless-Verbindung konnte nicht abgeschlossen werden.');
      await pool.query(
        `UPDATE user_subscriptions
         SET gocardless_last_error = $2,
             updated_at = NOW()
         WHERE user_id = $1`,
        [safeUserId, normalizedError]
      );
      return { success: false, error: normalizedError };
    }

    const redirectFlow = payload?.redirect_flows || {};
    const mandateId = String(redirectFlow?.links?.mandate || '').trim();
    const customerId = String(redirectFlow?.links?.customer || '').trim();
    const customerBankAccountId = String(redirectFlow?.links?.customer_bank_account || '').trim();

    if (!mandateId) {
      return { success: false, error: 'GoCardless hat kein Mandat zurueckgegeben.' };
    }

    await pool.query(
      `UPDATE user_subscriptions
       SET payment_method = 'sepa',
           status = 'active',
           gocardless_redirect_flow_id = $2,
           gocardless_customer_id = $3,
           gocardless_customer_bank_account_id = $4,
           gocardless_mandate_id = $5,
           gocardless_mandate_status = 'submitted',
           gocardless_connected_at = NOW(),
           gocardless_last_error = NULL,
           updated_at = NOW()
       WHERE user_id = $1`,
      [safeUserId, flowId, customerId || null, customerBankAccountId || null, mandateId]
    );

    return {
      success: true,
      mandateId,
      customerId: customerId || null,
      customerBankAccountId: customerBankAccountId || null,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'GoCardless-Verbindung konnte nicht abgeschlossen werden.' };
  }
}

async function grantEarlyAccessForUser(userId: number) {
  try {
    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) return;

    const subscriptionRes = await pool.query(
      `SELECT plan_key FROM user_subscriptions WHERE user_id = $1 LIMIT 1`,
      [safeUserId]
    );

    const planKey = String(subscriptionRes.rows[0]?.plan_key || 'nutzer_free').toLowerCase();
    const plan = SUBSCRIPTION_PLAN_CATALOG[planKey as SubscriptionPlanKey];
    
    if (!plan || plan.offerPreviewHours <= 0) return;

    const earlyAccessUntil = new Date(Date.now() + plan.offerPreviewHours * 60 * 60 * 1000);
    
    await pool.query(
      `UPDATE user_subscriptions
       SET early_access_granted_until = $2
       WHERE user_id = $1`,
      [safeUserId, earlyAccessUntil.toISOString()]
    );
  } catch (error: any) {
    // Silently fail - early access is optional feature
  }
}

async function getVisibilityPromotionCycleStart(userId: number) {
  const safeUserId = Number(userId);
  const res = await pool.query(
    `SELECT started_at, next_charge_at
     FROM user_subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [safeUserId]
  );

  const startedAt = res.rows[0]?.started_at ? new Date(res.rows[0].started_at) : null;
  const nextChargeAt = res.rows[0]?.next_charge_at ? new Date(res.rows[0].next_charge_at) : null;

  if (nextChargeAt && Number.isFinite(nextChargeAt.getTime())) {
    const cycleStart = new Date(nextChargeAt);
    cycleStart.setMonth(cycleStart.getMonth() - 1);
    return cycleStart;
  }
  if (startedAt && Number.isFinite(startedAt.getTime())) {
    return startedAt;
  }
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

async function getVisibilityPromotionUsageCount(userId: number, scope: VisibilityPromotionScope) {
  try {
    const cycleStart = await getVisibilityPromotionCycleStart(userId);
    // Query without scope - if the column doesn't exist, we'll catch the error
    try {
      const scopeRes = await pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM visibility_promotions
         WHERE user_id = $1
           AND scope = $2
           AND created_at >= $3`,
        [userId, scope, cycleStart.toISOString()]
      );
      return Number(scopeRes.rows[0]?.count || 0);
    } catch (scopeErr: any) {
      // If scope column doesn't exist, count all promotions for this user in cycle
      const fallbackRes = await pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM visibility_promotions
         WHERE user_id = $1
           AND created_at >= $2`,
        [userId, cycleStart.toISOString()]
      );
      return Number(fallbackRes.rows[0]?.count || 0);
    }
  } catch (_) {
    return 0;
  }
}

async function getVisibilityPromotionActiveUntil(userId: number, scope: VisibilityPromotionScope) {
  try {
    // Query with scope - if it doesn't exist, fallback
    try {
      const scopeRes = await pool.query(
        `SELECT MAX(ends_at) AS active_until
         FROM visibility_promotions
         WHERE user_id = $1
           AND scope = $2
           AND ends_at > NOW()`,
        [userId, scope]
      );
      return scopeRes.rows[0]?.active_until || null;
    } catch (scopeErr: any) {
      // If scope column doesn't exist, get latest active promotion for this user
      const fallbackRes = await pool.query(
        `SELECT MAX(ends_at) AS active_until
         FROM visibility_promotions
         WHERE user_id = $1
           AND ends_at > NOW()`,
        [userId]
      );
      return fallbackRes.rows[0]?.active_until || null;
    }
  } catch (_) {
    return null;
  }
}

async function getVisibilityPromotionOption(userId: number, roleHint?: string | null, scopeHint?: VisibilityPromotionScope) {
  await ensureUserSubscriptionRow(userId, roleHint);
  const safeUserId = Number(userId);
  const subscriptionRes = await getUserSubscriptionSettings(safeUserId);
  if (!subscriptionRes.success || !subscriptionRes.data) {
    throw new Error(subscriptionRes.error || 'Marketingdaten konnten nicht geladen werden.');
  }

  const subscription = subscriptionRes.data as any;
  const role = normalizeSubscriptionRole(roleHint || subscription.role);
  const scope = scopeHint || getVisibilityPromotionScopeForRole(role);
  if (!isVisibilityPromotionScopeAllowed(role, scope)) {
    throw new Error('Diese Marketingaktion ist fuer den aktuellen Tarif nicht verfuegbar.');
  }

  const profileRes = await getStoredProfileData(safeUserId);
  const profilData = profileRes.success && profileRes.data?.profil_data && typeof profileRes.data.profil_data === 'object'
    ? profileRes.data.profil_data
    : {};
  const gesuche = profileRes.success && profileRes.data?.gesuche && typeof profileRes.data.gesuche === 'object'
    ? profileRes.data.gesuche
    : {};

  const hasOfferContent =
    String(profileRes.data?.angebot_text || '').trim().length > 0 ||
    (Array.isArray(profilData.angeboteAnzeigen) && profilData.angeboteAnzeigen.length > 0);
  const hasSearchContent =
    String(profileRes.data?.suche_text || '').trim().length > 0 ||
    Object.keys(gesuche || {}).length > 0;

  const usageCount = await getVisibilityPromotionUsageCount(safeUserId, scope);
  const activeUntil = await getVisibilityPromotionActiveUntil(safeUserId, scope);
  const planKey = String(subscription.plan_key || '').trim().toLowerCase();
  const hasLifetimeAccess = Boolean(subscription.lifetime_free_access);
  const isExpertAboPlan = role === 'experte' && (
    (planKey.startsWith('experte_') && planKey !== 'experte_free')
    || planKey.startsWith('experten_')
  );
  const isExpertPremiumPlan = role === 'experte' && (planKey === 'experte_pro' || hasLifetimeAccess);
  let includedAvailable = scope !== 'wochenwerbung' && subscription.features?.includedBoostsPerAd > usageCount;

  let chargeCents = 0;
  let allowed = true;
  let reason = '';

  if (scope === 'wochenwerbung') {
    chargeCents = Number(subscription.features?.ownWeeklyAdPriceCents || 0);
    if (hasLifetimeAccess && chargeCents <= 0) {
      chargeCents = 0;
    }
    if (role !== 'experte' || !isExpertPremiumPlan || (!hasLifetimeAccess && chargeCents <= 0)) {
      allowed = false;
      reason = 'Startseitenwerbung ist nur fuer Experten mit Premium-Abo verfuegbar.';
    }
    if (!hasOfferContent) {
      allowed = false;
      reason = 'Lege zuerst ein Angebot oder Profiltext fuer dein Expertenprofil an.';
    }
  } else {
    if (scope === 'suchen' && role === 'nutzer' && planKey !== 'nutzer_plus') {
      allowed = false;
      reason = 'Suchenanzeige hochschieben ist nur mit Nutzer-Abo moeglich.';
    }

    if (scope === 'angebote' && role === 'experte') {
      if (!isExpertAboPlan) {
        allowed = false;
        reason = 'Anzeige hochschieben ist nur mit aktivem Experten-Abo moeglich.';
      }
      includedAvailable = usageCount === 0;
      chargeCents = usageCount === 0 ? 0 : 50;
    } else {
      chargeCents = includedAvailable
        ? 0
        : usageCount === 0
          ? Number(subscription.features?.standardBoostPriceCents || 0)
          : Number(subscription.features?.followupBoostPriceCents || 0);
    }

    if (scope === 'angebote' && !hasOfferContent) {
      allowed = false;
      reason = 'Lege zuerst ein Angebot fuer dein Profil an.';
    }
    if (scope === 'suchen' && !hasSearchContent) {
      allowed = false;
      reason = 'Lege zuerst mindestens ein Gesuch an.';
    }
  }

  return {
    scope,
    role,
    label: getVisibilityPromotionLabel(scope),
    durationDays: getVisibilityPromotionDurationDays(scope),
    chargeCents,
    allowed,
    reason,
    includedAvailable,
    usageCount,
    activeUntil,
    paymentMethod: subscription.payment_method,
    planKey: subscription.plan_key,
    planLabel: subscription.plan_label,
    features: subscription.features,
  };
}

export async function getUserPromotionSettings(userId: number) {
  try {
    await ensureExtraSchema();
    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.', data: null };
    }

    const subscriptionRes = await getUserSubscriptionSettings(safeUserId);
    if (!subscriptionRes.success || !subscriptionRes.data) {
      return { success: false, error: subscriptionRes.error || 'Marketingdaten konnten nicht geladen werden.', data: null };
    }

    const subscription = subscriptionRes.data as any;
    const role = normalizeSubscriptionRole(subscription.role);
    const scopes: VisibilityPromotionScope[] = [getVisibilityPromotionScopeForRole(role)];
    if (role === 'experte' && (Number(subscription.features?.ownWeeklyAdPriceCents || 0) > 0 || Boolean(subscription.lifetime_free_access))) {
      scopes.push('wochenwerbung');
    }

    const optionsSettled = await Promise.allSettled(
      scopes.map((scope) => getVisibilityPromotionOption(safeUserId, role, scope))
    );
    const options = optionsSettled
      .filter((entry): entry is PromiseFulfilledResult<any> => entry.status === 'fulfilled')
      .map((entry) => entry.value);

    return {
      success: true,
      data: {
        role,
        plan_key: subscription.plan_key,
        plan_label: subscription.plan_label,
        payment_method: subscription.payment_method,
        lifetime_free_access: Boolean(subscription.lifetime_free_access),
        options,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Marketingdaten konnten nicht geladen werden.', data: null };
  }
}

export async function purchaseVisibilityPromotion(payload: { userId: number; scope: VisibilityPromotionScope }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const scope = payload.scope === 'wochenwerbung' ? 'wochenwerbung' : payload.scope === 'suchen' ? 'suchen' : 'angebote';

    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const option = await getVisibilityPromotionOption(userId, null, scope);
    if (!option.allowed) {
      return { success: false, error: option.reason || 'Diese Marketingaktion ist aktuell nicht moeglich.' };
    }

    const activeUntil = option.activeUntil ? new Date(option.activeUntil) : null;
    const startsAt = activeUntil && Number.isFinite(activeUntil.getTime()) && activeUntil.getTime() > Date.now()
      ? activeUntil
      : new Date();
    const endsAt = new Date(startsAt.getTime() + option.durationDays * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO visibility_promotions (
         user_id, role, scope, label, charge_cents, included, payment_method, plan_key, starts_at, ends_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        userId,
        option.role,
        option.scope,
        option.label,
        option.chargeCents,
        option.includedAvailable,
        option.paymentMethod,
        option.planKey,
        startsAt.toISOString(),
        endsAt.toISOString(),
      ]
    );

    return {
      success: true,
      scope: option.scope,
      label: option.label,
      chargeCents: option.chargeCents,
      included: option.includedAvailable,
      paymentMethod: option.paymentMethod,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Marketingaktion konnte nicht gebucht werden.' };
  }
}

export async function requestPasswordReset(email: string) {
  try {
    await ensureExtraSchema();

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: 'Bitte E-Mail angeben.' };
    }

    // Cleanup old attempts to keep table compact.
    await pool.query(
      `DELETE FROM password_reset_attempts
       WHERE created_at < NOW() - INTERVAL '1 day'`
    );

    const attemptsRes = await pool.query(
      `SELECT COUNT(*)::INT AS count,
              MAX(created_at) AS last_attempt
       FROM password_reset_attempts
       WHERE email = $1
         AND created_at > NOW() - INTERVAL '${PASSWORD_RESET_WINDOW_MINUTES} minutes'`,
      [normalizedEmail]
    );

    const attemptCount = attemptsRes.rows[0]?.count || 0;
    const lastAttempt = attemptsRes.rows[0]?.last_attempt
      ? new Date(attemptsRes.rows[0].last_attempt)
      : null;

    const cooldownMs = PASSWORD_RESET_COOLDOWN_SECONDS * 1000;
    const inCooldown = lastAttempt ? Date.now() - lastAttempt.getTime() < cooldownMs : false;

    await pool.query(
      `INSERT INTO password_reset_attempts (email) VALUES ($1)`,
      [normalizedEmail]
    );

    if (attemptCount >= PASSWORD_RESET_MAX_ATTEMPTS || inCooldown) {
      return { success: true, message: 'Wenn ein Konto existiert, wurde ein Link erstellt.' };
    }

    const userRes = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    // No user enumeration: always return success.
    if (userRes.rows.length === 0) {
      return { success: true, message: 'Wenn ein Konto existiert, wurde ein Link erstellt.' };
    }

    const userId = userRes.rows[0].id;

    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW() OR used_at IS NOT NULL',
      [userId]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '60 minutes')`,
      [userId, tokenHash]
    );

    const appUrl = getPublicAppUrl();
    const path = `/passwort-zuruecksetzen?token=${rawToken}`;
    const resetUrl = appUrl ? `${appUrl}${path}` : path;

    try {
      await sendPasswordResetEmail(normalizedEmail, resetUrl);
    } catch (mailError) {
      // Development fallback: keep feature testable without SMTP.
      if (process.env.NODE_ENV !== 'production') {
        return {
          success: true,
          message: 'SMTP nicht konfiguriert. Nutze lokal den Test-Link.',
          devResetUrl: resetUrl
        };
      }
      return { success: false, error: 'E-Mail konnte nicht versendet werden.' };
    }

    if (process.env.NODE_ENV !== 'production') {
      return {
        success: true,
        message: 'Wenn ein Konto existiert, wurde ein Link erstellt.',
        devResetUrl: resetUrl
      };
    }

    return {
      success: true,
      message: 'Wenn ein Konto existiert, wurde ein Link erstellt.'
    };
  } catch (error: any) {
    console.error('requestPasswordReset error:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    return { success: false, error: 'Passwort-Reset ist derzeit nicht verfügbar. Bitte versuche es in wenigen Minuten erneut.' };
  }
}

export async function validatePasswordResetToken(token: string) {
  try {
    await ensureExtraSchema();
    const rawToken = (token || '').trim();
    if (!rawToken) return { success: true, valid: false };

    const tokenHash = hashResetToken(rawToken);
    const res = await pool.query(
      `SELECT id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    return { success: true, valid: res.rows.length > 0 };
  } catch (error: any) {
    return { success: false, valid: false, error: error.message || 'Server-Fehler' };
  }
}

export async function resetPasswordWithToken(payload: { token: string; password: string; confirmPassword: string }) {
  const { token, password, confirmPassword } = payload;

  if (!password || password.length < 8) {
    return { success: false, error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Die Passwörter stimmen nicht überein.' };
  }

  const rawToken = (token || '').trim();
  if (!rawToken) {
    return { success: false, error: 'Ungültiger Link.' };
  }

  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const tokenHash = hashResetToken(rawToken);
    await client.query('BEGIN');

    const tokenRes = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Link ist ungültig oder abgelaufen.' };
    }

    const tokenRow = tokenRes.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, tokenRow.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenRow.id]);

    await client.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

// --- REGISTRIERUNG ---
export async function registerUser(formData: any) {
  try {
    await ensureExtraSchema();
    const { 
      vorname, nachname, email, password, confirmPassword, role,
      stallName, stallStrasse, stallPlz, stallOrt,
      website, bio, privatStrasse, privatPlz, privatOrt,
      lizenzen, custom_lizenzen 
    } = formData;
    const birthDate = normalizeBirthDateInput(formData?.birthDate || formData?.geburtsdatum);

    // 1. Validierung
    if (!password || password.length < 8) {
      return { success: false, error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
    }
    if (password !== confirmPassword) {
      return { success: false, error: "Die Passwörter stimmen nicht überein." };
    }

    // 2. Passwort hashen
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. In Datenbank speichern
    const query = `
      INSERT INTO users (
        vorname, nachname, email, password, birth_date, role, 
        stall_name, stall_strasse, stall_plz, stall_ort,
        website, bio, privat_strasse, privat_plz, privat_ort,
        lizenzen, custom_lizenzen, verifiziert
      ) 
      VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id;
    `;

    const values = [
      vorname, nachname, email, hashedPassword, birthDate, role,
      stallName || null, stallStrasse || null, stallPlz || null, stallOrt || null,
      website || null, bio || null, privatStrasse || null, privatPlz || null, privatOrt || null,
      lizenzen || [], // Speichert das Array der gewählten Kategorien
      custom_lizenzen || null, // Speichert den Freitext-Vorschlag
      false // Verifiziert ist am Anfang immer "nein"
    ];

  const result = await pool.query(query, values);
  const createdUserId = result.rows[0].id;
  await ensureUserSubscriptionRow(createdUserId, role);
  const wantsNewsletter = Boolean(formData?.newsletter || formData?.newsletterExperte);
  await setUserNewsletterOptIn(createdUserId, wantsNewsletter, 'registration');

  if (birthDate) {
    await pool.query(
      `UPDATE users SET birth_date = $2::date WHERE id = $1`,
      [createdUserId, birthDate]
    );
  }

  try {
    await syncBrevoContactAttributes({
      email,
      firstName: String(vorname || '').trim() || 'du',
      lastName: String(nachname || '').trim(),
      birthDate,
    });
  } catch (_) {
    // Brevo-Sync ist nicht fatal für die Registrierung
  }

  // Willkommens-E-Mail senden (nicht-fatal)
  try {
    await sendWelcomeEmail(email, vorname, role);
  } catch (_) {
    // Ignorieren – Registrierung trotzdem erfolgreich
  }

  return { success: true, userId: createdUserId };

  } catch (error: any) {
    console.error("Registrierungs-Fehler:", error.message);
    if (error.code === '23505') {
      return { success: false, error: "Diese E-Mail Adresse ist bereits vergeben." };
    }
    return { success: false, error: "Datenbankfehler: " + error.message };
  }
}

// --- LOGIN ---
export async function loginUser(credentials: any) { 
  try {
    await ensureExtraSchema();

    const email = String(credentials?.email || '').trim().toLowerCase();
    const password = String(credentials?.password || '');
    if (!email || !password) return { success: false, error: "Bitte Daten eingeben." };

    const query = "SELECT id, vorname, nachname, role, password FROM users WHERE LOWER(email) = $1";
    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) return { success: false, error: "Nutzer nicht gefunden" };

    const user = result.rows[0];
    const storedPassword = String(user.password || '');
    if (!storedPassword) {
      return { success: false, error: "Für dieses Konto ist kein Passwort hinterlegt." };
    }

    const isMatch = await bcrypt.compare(password, storedPassword);
    
    if (isMatch) {
      return { 
        success: true, 
        user: { id: user.id, name: `${user.vorname} ${user.nachname}`, role: user.role } 
      };
    }
    return { success: false, error: "Falsches Passwort" };
  } catch (error: any) {
    console.error('loginUser error:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    const code = String(error?.code || '');
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return { success: false, error: 'Server-Fehler: Datenbankverbindung fehlgeschlagen.' };
    }
    return { success: false, error: "Server-Fehler" };
  }
}

export async function getResolvedUserRole(userId: number) {
  try {
    await ensureExtraSchema();
    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.', role: null as string | null };
    }

    const result = await pool.query(
      `SELECT
         u.role AS user_role,
         p.role AS profile_role,
         p.angebot_text,
         p.zertifikate,
         p.profil_data
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [safeUserId]
    );

    const row = result.rows[0];
    if (!row) {
      return { success: false, error: 'Nutzer nicht gefunden.', role: null as string | null };
    }

    const userRole = String(row.user_role || '').trim().toLowerCase();
    const profileRole = String(row.profile_role || '').trim().toLowerCase();
    const profilData = row.profil_data && typeof row.profil_data === 'object' ? row.profil_data : {};
    const hasExpertSignals =
      userRole === 'experte' ||
      profileRole === 'experte' ||
      String(row.angebot_text || '').trim().length > 0 ||
      (Array.isArray(row.zertifikate) && row.zertifikate.length > 0) ||
      Array.isArray(profilData?.angebote) ||
      Array.isArray(profilData?.angeboteAnzeigen) ||
      String(profilData?.gewerbeAdresse || '').trim().length > 0 ||
      String(profilData?.ustId || '').trim().length > 0 ||
      String(profilData?.website || '').trim().length > 0;

    const resolvedRole = hasExpertSignals ? 'experte' : 'nutzer';

    if (resolvedRole === 'experte' && userRole !== 'experte') {
      await pool.query(`UPDATE users SET role = 'experte' WHERE id = $1`, [safeUserId]);
    }

    if (resolvedRole === 'experte' && profileRole && profileRole !== 'experte') {
      await pool.query(`UPDATE user_profiles SET role = 'experte', updated_at = NOW() WHERE user_id = $1`, [safeUserId]);
    }

    return { success: true, role: resolvedRole };
  } catch (error: any) {
    return { success: false, error: error.message || 'Rolle konnte nicht geladen werden.', role: null as string | null };
  }
}

// --- ANZEIGEN LADEN ---
export async function holeAlleAnzeigen() {
  try {
    const query = `
      SELECT a.id, a.titel, a.inhalt, a.preis, a.kategorie_id,
             u.vorname || ' ' || u.nachname as experte_name, 
             COALESCE(u.stall_ort, u.privat_ort) as experte_ort, u.id as experte_id
      FROM anzeigen a JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) { return []; }
}

// --- PROFIL DATEN ---
export async function getProfilDaten(email: string) {
  try {
    const query = "SELECT * FROM users WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) { return null; }
}

// --- CHATS & NACHRICHTEN ---
export async function holeMeineChats(userId: number) {
  try {
    const query = `
      SELECT c.id as chat_id, u.vorname || ' ' || u.nachname as partner_name, u.id as partner_id,
             (SELECT nachricht FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as letzte_nachricht,
             (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as zeit
      FROM chats c JOIN users u ON (u.id = c.user_one OR u.id = c.user_two)
      WHERE (c.user_one = $1 OR c.user_two = $1) AND u.id != $1
      ORDER BY zeit DESC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) { return []; }
}

export async function sendeNachricht(chatId: number, senderId: number, text: string) {
  try {
    await ensureExtraSchema();
    const senderSanction = await getActiveSanction(Number(senderId), ['chat']);
    if (senderSanction) {
      return {
        success: false,
        error: `Du bist bis ${new Date(senderSanction.ends_at).toLocaleDateString('de-DE')} gesperrt.`
      };
    }

    const membership = await pool.query(
      `SELECT user_one, user_two
       FROM chats
       WHERE id = $1
       LIMIT 1`,
      [chatId]
    );

    if (membership.rows.length === 0) {
      return { success: false, error: 'Chat nicht gefunden.' };
    }

    const row = membership.rows[0];
    const userOne = Number(row.user_one);
    const userTwo = Number(row.user_two);
    const sender = Number(senderId);
    const receiver = sender === userOne ? userTwo : sender === userTwo ? userOne : null;

    if (!receiver) {
      return { success: false, error: 'Du bist kein Teilnehmer dieses Chats.' };
    }

    const allowed = await canUsersMessageInternal(sender, receiver);
    if (!allowed) {
      return { success: false, error: 'Nachrichten sind erst nach angenommener Vernetzung möglich.' };
    }

    const query = "INSERT INTO messages (chat_id, sender_id, nachricht) VALUES ($1, $2, $3) RETURNING *";
    const result = await pool.query(query, [chatId, senderId, text]);
    return { success: true, message: result.rows[0] };
  } catch (error: any) { return { success: false, error: error?.message || 'Nachricht konnte nicht gesendet werden.' }; }
}

async function canUsersMessageInternal(userA: number, userB: number) {
  if (!Number.isInteger(userA) || !Number.isInteger(userB) || userA <= 0 || userB <= 0) return false;
  if (userA === userB) return true;

  const connRes = await pool.query(
    `SELECT 1
     FROM social_connections
     WHERE status = 'accepted'
       AND (
         (requester_user_id = $1 AND addressee_user_id = $2)
         OR
         (requester_user_id = $2 AND addressee_user_id = $1)
       )
     LIMIT 1`,
    [userA, userB]
  );

  return connRes.rows.length > 0;
}

async function getActiveSanction(userId: number, scopes: string[] = []) {
  await pool.query(
    `UPDATE user_sanctions
     SET is_active = FALSE
     WHERE user_id = $1
       AND is_active = TRUE
       AND ends_at <= NOW()`,
    [userId]
  );

  const scopeList = Array.isArray(scopes) ? scopes.map((scope) => String(scope || '').trim()).filter(Boolean) : [];
  try {
    const res = await pool.query(
      `SELECT id, reason, severity, scope, starts_at, ends_at
       FROM user_sanctions
       WHERE user_id = $1
         AND is_active = TRUE
         AND ends_at > NOW()
         AND (scope = 'global' OR scope = ANY($2::text[]))
       ORDER BY ends_at DESC
       LIMIT 1`,
      [userId, scopeList]
    );
    return res.rows[0] || null;
  } catch (_) {
    const fallbackRes = await pool.query(
      `SELECT id, reason, severity, starts_at, ends_at
       FROM user_sanctions
       WHERE user_id = $1
         AND is_active = TRUE
         AND ends_at > NOW()
       ORDER BY ends_at DESC
       LIMIT 1`,
      [userId]
    );
    const row = fallbackRes.rows[0] || null;
    if (!row) return null;
    return { ...row, scope: 'global' };
  }
}

async function addSanction(client: Pool | any, payload: {
  userId: number;
  source: string;
  severity: 'normal' | 'strong' | 'animal_abuse';
  reason: string;
  months?: number;
  durationDays?: number;
  scope?: 'global' | 'chat' | 'groups' | 'abo';
}) {
  const endsAt = new Date();
  if (Number.isFinite(payload.durationDays) && Number(payload.durationDays || 0) > 0) {
    endsAt.setDate(endsAt.getDate() + Number(payload.durationDays || 0));
  } else {
    endsAt.setMonth(endsAt.getMonth() + Number(payload.months || 0));
  }

  const scope = payload.scope || 'global';

  await client.query(
    `INSERT INTO user_sanctions (user_id, source, severity, scope, reason, starts_at, ends_at, is_active)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, TRUE)`,
    [payload.userId, payload.source, payload.severity, scope, payload.reason, endsAt.toISOString()]
  );

  await client.query(
    `INSERT INTO user_moderation_state (user_id, warning_count, suspension_count, last_suspension_end, updated_at)
     VALUES ($1, 0, 1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       suspension_count = user_moderation_state.suspension_count + 1,
       last_suspension_end = $2,
       updated_at = NOW()`,
    [payload.userId, endsAt.toISOString()]
  );

  await createUserNotification(client, {
    userId: payload.userId,
    title: `Konto vorübergehend gesperrt (${payload.months} Monate)`,
    message: payload.reason,
    href: '/',
    notificationType: 'warning'
  });

  return endsAt;
}

async function applyNoTolerancePolicy(client: Pool | any, payload: {
  reportedUserId: number;
  severity: 'normal' | 'strong' | 'animal_abuse';
  reason: string;
  sourceRef: string;
}) {
  const stateRes = await client.query(
    `SELECT warning_count, suspension_count
     FROM user_moderation_state
     WHERE user_id = $1
     LIMIT 1
     FOR UPDATE`,
    [payload.reportedUserId]
  );

  let warningCount = Number(stateRes.rows[0]?.warning_count || 0);
  const suspensionCount = Number(stateRes.rows[0]?.suspension_count || 0);

  if (payload.severity === 'strong') {
    const endsAt = await addSanction(client, {
      userId: payload.reportedUserId,
      source: payload.sourceRef,
      severity: payload.severity,
      reason: `Schwerer Verstoß im Chat: ${payload.reason}`,
      months: 3
    });
    return { action: 'suspended_3m', endsAt };
  }

  if (payload.severity === 'normal' && suspensionCount > 0) {
    const endsAt = await addSanction(client, {
      userId: payload.reportedUserId,
      source: payload.sourceRef,
      severity: payload.severity,
      reason: `Wiederholter Verstoß nach vorheriger Sperre: ${payload.reason}`,
      months: 3
    });
    return { action: 'suspended_repeat_3m', endsAt };
  }

  warningCount += 1;
  if (warningCount >= 3) {
    const endsAt = await addSanction(client, {
      userId: payload.reportedUserId,
      source: payload.sourceRef,
      severity: payload.severity,
      reason: `3. Verwarnung im Chat: ${payload.reason}`,
      months: 3
    });

    await client.query(
      `UPDATE user_moderation_state
       SET warning_count = 0,
           updated_at = NOW()
       WHERE user_id = $1`,
      [payload.reportedUserId]
    );

    return { action: 'suspended_3m_after_3_warnings', endsAt };
  }

  await client.query(
    `INSERT INTO user_moderation_state (user_id, warning_count, suspension_count, updated_at)
     VALUES ($1, $2, 0, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       warning_count = $2,
       updated_at = NOW()`,
    [payload.reportedUserId, warningCount]
  );

  await createUserNotification(client, {
    userId: payload.reportedUserId,
    title: `Verwarnung ${warningCount}/3`,
    message: `Es wurde ein Verstoß gemeldet: ${payload.reason}`,
    href: '/nachrichten',
    notificationType: 'warning'
  });

  return { action: 'warning', warningCount };
}

async function resolveExpiredAnimalWelfareCases() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const casesRes = await client.query(
      `SELECT id, accused_user_id, title
       FROM animal_welfare_cases
       WHERE status = 'voting'
         AND vote_end_at <= NOW()
       FOR UPDATE`
    );

    for (const item of casesRes.rows) {
      const voteRes = await client.query(
        `SELECT
            COUNT(*) FILTER (WHERE vote = 'yes')::INT AS yes_count,
            COUNT(*) FILTER (WHERE vote = 'no')::INT AS no_count
         FROM animal_welfare_votes
         WHERE case_id = $1`,
        [item.id]
      );

      const yesCount = Number(voteRes.rows[0]?.yes_count || 0);
      const noCount = Number(voteRes.rows[0]?.no_count || 0);

      if (yesCount > noCount && yesCount > 0) {
        const endsAt = await addSanction(client, {
          userId: Number(item.accused_user_id),
          source: `animal-case-${item.id}`,
          severity: 'animal_abuse',
          reason: `Community-Entscheidung (Tierwohlfall): ${item.title}`,
          months: 6
        });

        await client.query(
          `UPDATE animal_welfare_cases
           SET status = 'suspended',
               resolved_at = NOW(),
               public_note = $2
           WHERE id = $1`,
          [item.id, `Community-Entscheidung: Sperre bis ${endsAt.toLocaleDateString('de-DE')}.`]
        );
      } else {
        await client.query(
          `UPDATE animal_welfare_cases
           SET status = 'cleared',
               resolved_at = NOW(),
               public_note = 'Vorwurf konnte nicht bestätigt werden.'
           WHERE id = $1`,
          [item.id]
        );

        await createUserNotification(client, {
          userId: Number(item.accused_user_id),
          title: 'Tierwohl-Vorwurf nicht bestätigt',
          message: 'Der Fall wurde als unbegründet markiert.',
          href: '/',
          notificationType: 'info'
        });
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}

export async function canUsersMessage(userA: number, userB: number) {
  try {
    await ensureExtraSchema();
    const allowed = await canUsersMessageInternal(Number(userA), Number(userB));
    return { success: true, allowed };
  } catch (error: any) {
    return { success: false, allowed: false, error: error.message || 'Server-Fehler' };
  }
}

export async function createOrGetConnectedChat(payload: { requesterId: number; targetUserId: number }) {
  try {
    await ensureExtraSchema();

    const requesterId = Number(payload.requesterId);
    const targetUserId = Number(payload.targetUserId);

    if (!Number.isInteger(requesterId) || requesterId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (requesterId === targetUserId) {
      return { success: false, error: 'Kein Chat mit dir selbst möglich.' };
    }

    const requesterSanction = await getActiveSanction(requesterId, ['chat']);
    if (requesterSanction) {
      return {
        success: false,
        error: `Du bist bis ${new Date(requesterSanction.ends_at).toLocaleDateString('de-DE')} gesperrt.`
      };
    }

    const allowed = await canUsersMessageInternal(requesterId, targetUserId);
    if (!allowed) {
      return { success: false, error: 'Vor dem Schreiben ist eine angenommene Vernetzungsanfrage erforderlich.' };
    }

    const existing = await pool.query(
      `SELECT id
       FROM chats
       WHERE (user_one = $1 AND user_two = $2)
          OR (user_one = $2 AND user_two = $1)
       ORDER BY id DESC
       LIMIT 1`,
      [requesterId, targetUserId]
    );

    if (existing.rows.length > 0) {
      return { success: true, chatId: existing.rows[0].id, created: false };
    }

    const created = await pool.query(
      `INSERT INTO chats (user_one, user_two)
       VALUES ($1, $2)
       RETURNING id`,
      [requesterId, targetUserId]
    );

    return { success: true, chatId: created.rows[0].id, created: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function uploadUrkunde(userId: number, formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: "Keine Datei gefunden" };

    // 1. Datei in Daten umwandeln
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Speicherort festlegen (public/uploads)
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    
    // Ordner erstellen, falls er nicht existiert
    await mkdir(uploadDir, { recursive: true });

    // Dateiname sicher machen (User-ID + Originalname)
    const fileName = `${userId}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);

    // 3. Datei schreiben
    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/${fileName}`;

    // 4. Pfad in der Datenbank speichern
    await pool.query(
      "UPDATE users SET urkunden_url = $1 WHERE id = $2",
      [publicUrl, userId]
    );

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Upload-Fehler:", error);
    return { success: false, error: error.message };
  }
}

export async function createBookingSwipeConfirmation(payload: {
  expertId: number;
  studentId: number;
  bookingId: number;
  expiresHours?: number;
}) {
  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const bookingId = Number(payload.bookingId);
    const expiresHours = Math.max(1, Math.min(72, Number(payload.expiresHours) || 48));

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungueltige Experten-ID.' };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: 'Ungueltige Schueler-ID.' };
    }
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return { success: false, error: 'Ungueltige Buchungs-ID.' };
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
      return { success: false, error: 'Buchung nicht gefunden.' };
    }
    if (String(booking.status) === 'storniert' || String(booking.status) === 'abgerechnet') {
      return { success: false, error: 'Fuer diese Buchung kann keine Bestaetigung mehr erstellt werden.' };
    }

    const token = crypto.randomBytes(24).toString('hex');
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
    const confirmUrl = appUrl
      ? `${appUrl}/leistung-bestaetigen/${token}`
      : `/leistung-bestaetigen/${token}`;

    return { success: true, token, confirmUrl, expiresAt };
  } catch (error: any) {
    return { success: false, error: error.message || 'Bestaetigungslink konnte nicht erstellt werden.' };
  }
}

export async function getBookingSwipeConfirmationByToken(token: string) {
  try {
    await ensureExtraSchema();
    const safeToken = String(token || '').trim();
    if (!safeToken) {
      return { success: false, error: 'Token fehlt.' };
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
      return { success: false, error: 'Link ungueltig oder nicht gefunden.' };
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
    return { success: false, error: error.message || 'Bestaetigungsdaten konnten nicht geladen werden.' };
  }
}

export async function confirmBookingSwipe(token: string) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();
    const safeToken = String(token || '').trim();
    if (!safeToken) {
      return { success: false, error: 'Token fehlt.' };
    }

    await client.query('BEGIN');

    const confRes = await client.query(
      `SELECT id, booking_id, status, expires_at, confirmed_at
       FROM student_booking_confirmations
       WHERE token = $1
       FOR UPDATE`,
      [safeToken]
    );

    const conf = confRes.rows[0];
    if (!conf) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Link ungueltig oder abgelaufen.' };
    }

    if (String(conf.status) === 'confirmed') {
      await client.query('COMMIT');
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
      await client.query('COMMIT');
      return { success: false, error: 'Link ist abgelaufen.' };
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
      await client.query('ROLLBACK');
      return { success: false, error: 'Buchung nicht gefunden.' };
    }
    if (String(booking.status) === 'storniert' || String(booking.status) === 'abgerechnet') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Buchung kann nicht mehr bestaetigt werden.' };
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

    await client.query('COMMIT');
    return { success: true, alreadyConfirmed: false, bookingId: conf.booking_id };
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // noop
    }
    return { success: false, error: error.message || 'Swipe-Bestaetigung fehlgeschlagen.' };
  } finally {
    client.release();
  }
}

export async function getPendingSwipeConfirmationsForStudent(studentId: number, limit = 20) {
  try {
    await ensureExtraSchema();

    const sId = Number(studentId);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    if (!Number.isInteger(sId) || sId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.', items: [] };
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
              esb.customer_total_cents,
              esb.protection_fee_cents,
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
      confirm_url: appUrl
        ? `${appUrl}/leistung-bestaetigen/${row.token}`
        : `/leistung-bestaetigen/${row.token}`,
    }));

    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message || 'Bestaetigungslinks konnten nicht geladen werden.', items: [] };
  }
}

export async function closeMonthlyConfirmedBookings(payload: {
  expertId: number;
  studentId: number;
  month: string;
}) {
  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const month = String(payload.month || '').trim();

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungueltige Experten-ID.' };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: 'Ungueltige Schueler-ID.' };
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Ungueltiges Monatsformat.' };
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
    return { success: false, error: error.message || 'Monatsabschluss fehlgeschlagen.' };
  }
}

// --- PROFIL DATEN (ERWEITERT) ---
export async function saveUserProfileData(userId: number, payload: any) {
  try {
    await ensureExtraSchema();
    await ensureUserSubscriptionRow(userId, 'nutzer');
    await enforceMonthlyOfferLimit(userId, 'nutzer', payload);
    const birthDate = normalizeBirthDateInput(payload?.birthDate || payload?.geburtsdatum);
    const { birthDate: _ignoredBirthDate, geburtsdatum: _ignoredGeburtsdatum, email: _ignoredEmail, ...profilePayload } = payload || {};
    if (typeof payload?.newsletter === 'boolean') {
      await setUserNewsletterOptIn(userId, Boolean(payload.newsletter), 'profile-nutzer');
    }
    if (birthDate) {
      await pool.query(`UPDATE users SET birth_date = $2::date WHERE id = $1`, [userId, birthDate]);
    }
    if (String(payload?.email || '').trim()) {
      try {
        await syncBrevoContactAttributes({
          email: String(payload.email || '').trim(),
          firstName: String(payload.vorname || '').trim() || 'du',
          lastName: String(payload.nachname || '').trim(),
          birthDate,
        });
      } catch {
        // Brevo-Sync ist nicht fatal
      }
    }
    const plan = await getUserPlanDefinition(userId, 'nutzer');
    const horseLimit = typeof plan.horseLimit === 'number' ? plan.horseLimit : null;
    const normalizedPayload = {
      ...profilePayload,
      pferde: Array.isArray(payload?.pferde) && horseLimit !== null ? payload.pferde.slice(0, horseLimit) : payload?.pferde,
    };
    const query = `
      INSERT INTO user_profiles (
        user_id, role, display_name, ort, plz,
        kategorien, zertifikate, suche_text, gesuche, profil_data, updated_at
      )
      VALUES ($1, 'nutzer', $2, $3, $4, $5, ARRAY[]::TEXT[], $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        role = 'nutzer',
        display_name = EXCLUDED.display_name,
        ort = EXCLUDED.ort,
        plz = EXCLUDED.plz,
        kategorien = EXCLUDED.kategorien,
        suche_text = EXCLUDED.suche_text,
        gesuche = EXCLUDED.gesuche,
        profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || COALESCE(EXCLUDED.profil_data, '{}'::jsonb),
        updated_at = NOW();
    `;

    await pool.query(query, [
      userId,
      normalizedPayload.profilName || `${normalizedPayload.vorname || ''} ${normalizedPayload.nachname || ''}`.trim(),
      normalizedPayload.ort || normalizedPayload.privatOrt || null,
      normalizedPayload.plz || normalizedPayload.privatPlz || null,
      normalizedPayload.kategorien || [],
      normalizedPayload.sucheText || null,
      JSON.stringify(normalizedPayload.gesuche || {}),
      JSON.stringify(normalizedPayload || {})
    ]);

    const fallbackName = String(normalizedPayload.profilName || '').trim();
    const derivedNameParts = fallbackName ? fallbackName.split(/\s+/).filter(Boolean) : [];
    const derivedVorname = derivedNameParts.length > 0 ? derivedNameParts[0] : '';
    const derivedNachname = derivedNameParts.length > 1 ? derivedNameParts.slice(1).join(' ') : '';
    const nextVorname = String(normalizedPayload.vorname || '').trim() || derivedVorname;
    const nextNachname = String(normalizedPayload.nachname || '').trim() || derivedNachname;
    const nextOrt = String(normalizedPayload.ort || normalizedPayload.privatOrt || '').trim();
    const nextPlz = String(normalizedPayload.plz || normalizedPayload.privatPlz || '').trim();

    await pool.query(
      `UPDATE users
       SET vorname = COALESCE(NULLIF($2, ''), vorname),
           nachname = COALESCE(NULLIF($3, ''), nachname),
           ort = COALESCE(NULLIF($4, ''), ort),
           plz = COALESCE(NULLIF($5, ''), plz)
       WHERE id = $1`,
      [userId, nextVorname, nextNachname, nextOrt, nextPlz]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveExpertProfileData(userId: number, payload: any) {
  try {
    await ensureExtraSchema();
    await ensureUserSubscriptionRow(userId, 'experte');
    await enforceMonthlyOfferLimit(userId, 'experte', payload);
    const birthDate = normalizeBirthDateInput(payload?.birthDate || payload?.geburtsdatum);
    const { birthDate: _ignoredBirthDate, geburtsdatum: _ignoredGeburtsdatum, email: _ignoredEmail, ...profilePayload } = payload || {};
    if (typeof payload?.newsletterExperte === 'boolean') {
      await setUserNewsletterOptIn(userId, Boolean(payload.newsletterExperte), 'profile-experte');
    }
    if (birthDate) {
      await pool.query(`UPDATE users SET birth_date = $2::date WHERE id = $1`, [userId, birthDate]);
    }
    if (String(payload?.email || '').trim()) {
      try {
        await syncBrevoContactAttributes({
          email: String(payload.email || '').trim(),
          firstName: String(payload.vorname || '').trim() || 'du',
          lastName: String(payload.nachname || '').trim(),
          birthDate,
        });
      } catch {
        // Brevo-Sync ist nicht fatal
      }
    }
    const plan = await getUserPlanDefinition(userId, 'experte');
    const horseLimit = typeof plan.horseLimit === 'number' ? plan.horseLimit : null;
    const teamLimit = typeof plan.teamLimit === 'number' ? plan.teamLimit : null;

    const normalizedPayload = {
      ...profilePayload,
      pferde: Array.isArray(payload?.pferde) && horseLimit !== null ? payload.pferde.slice(0, horseLimit) : payload?.pferde,
      unserTeam: Array.isArray(payload?.unserTeam) && teamLimit !== null ? payload.unserTeam.slice(0, teamLimit) : payload?.unserTeam,
    };
    await pool.query(
      `UPDATE users
       SET role = 'experte'
       WHERE id = $1`,
      [userId]
    );

    const query = `
      INSERT INTO user_profiles (
        user_id, role, display_name, ort, plz,
        kategorien, zertifikate, angebot_text, profil_data, updated_at
      )
      VALUES ($1, 'experte', $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        role = 'experte',
        display_name = EXCLUDED.display_name,
        ort = EXCLUDED.ort,
        plz = EXCLUDED.plz,
        kategorien = EXCLUDED.kategorien,
        zertifikate = EXCLUDED.zertifikate,
        angebot_text = EXCLUDED.angebot_text,
        profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || COALESCE(EXCLUDED.profil_data, '{}'::jsonb),
        updated_at = NOW();
    `;

    await pool.query(query, [
      userId,
      normalizedPayload.name || null,
      normalizedPayload.ort || null,
      normalizedPayload.plz || null,
      normalizedPayload.angebote || [],
      normalizedPayload.zertifikate || [],
      normalizedPayload.angebotText || null,
      JSON.stringify(normalizedPayload || {})
    ]);

    const fullName = String(normalizedPayload.name || '').trim();
    const nameParts = fullName ? fullName.split(/\s+/).filter(Boolean) : [];
    const nextVorname = nameParts.length > 0 ? nameParts[0] : '';
    const nextNachname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const nextOrt = String(normalizedPayload.ort || '').trim();
    const nextPlz = String(normalizedPayload.plz || '').trim();

    await pool.query(
      `UPDATE users
       SET vorname = COALESCE(NULLIF($2, ''), vorname),
           nachname = COALESCE(NULLIF($3, ''), nachname),
           ort = COALESCE(NULLIF($4, ''), ort),
           plz = COALESCE(NULLIF($5, ''), plz)
       WHERE id = $1`,
      [userId, nextVorname, nextNachname, nextOrt, nextPlz]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStoredProfileData(userId: number) {
  try {
    await ensureExtraSchema();
    const safeUserId = Number(userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', data: null };
    }

    const result = await pool.query(
      `SELECT p.*, u.verifiziert AS user_verifiziert
       FROM user_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1
       LIMIT 1`,
      [safeUserId]
    );

    let row = result.rows[0] || null;

    // Backward-compatible fallback: older accounts may exist in users but not yet in user_profiles.
    if (!row) {
      const userRes = await pool.query(
        `SELECT id,
                role,
                vorname,
                nachname,
                verifiziert
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [safeUserId]
      );

      const userRow = userRes.rows[0] || null;
      if (!userRow) {
        return { success: true, data: null };
      }

      const fallbackRole = String(userRow.role || '').trim().toLowerCase() === 'experte' ? 'experte' : 'nutzer';
      const fallbackDisplayName = String(`${userRow.vorname || ''} ${userRow.nachname || ''}`)
        .trim() || `Profil ${safeUserId}`;
      const fallbackOrt = '';
      const fallbackPlz = '';

      await pool.query(
        `INSERT INTO user_profiles (user_id, role, display_name, ort, plz, profil_data, updated_at)
         VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [safeUserId, fallbackRole, fallbackDisplayName || null, fallbackOrt || null, fallbackPlz || null]
      );

      const reloadRes = await pool.query(
        `SELECT p.*, u.verifiziert AS user_verifiziert
         FROM user_profiles p
         JOIN users u ON u.id = p.user_id
         WHERE p.user_id = $1
         LIMIT 1`,
        [safeUserId]
      );
      row = reloadRes.rows[0] || null;

      if (!row) {
        return {
          success: true,
          data: {
            user_id: safeUserId,
            role: fallbackRole,
            display_name: fallbackDisplayName,
            ort: fallbackOrt,
            plz: fallbackPlz,
            kategorien: [],
            zertifikate: [],
            angebot_text: '',
            suche_text: '',
            profil_data: {},
            user_verifiziert: Boolean(userRow.verifiziert)
          }
        };
      }
    }

    const roleRes = await getResolvedUserRole(safeUserId);
    return {
      success: true,
      data: {
        ...row,
        role: roleRes.success && roleRes.role ? roleRes.role : row.role
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

export async function getPublicProfileMeta(payload: { profileUserId: number; viewerUserId?: number | null }) {
  try {
    await ensureExtraSchema();
    const profileUserId = Number(payload.profileUserId);
    const viewerUserId = Number(payload.viewerUserId || 0);
    const safeViewerId = Number.isInteger(viewerUserId) && viewerUserId > 0 ? viewerUserId : 0;

    if (!Number.isInteger(profileUserId) || profileUserId <= 0) {
      return {
        success: false,
        error: 'Ungültige Nutzer-ID.',
        stats: {
          followerCount: 0,
          followingCount: 0,
          groupHostCount: 0,
          groupMemberCount: 0,
          ratingAvg: 0,
          ratingCount: 0
        },
        ratings: [],
        connection: null
      };
    }

    const [followerRes, followingRes, groupHostRes, groupMemberRes, ratingStatsRes, ratingsRes, connectionRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM social_connections
         WHERE addressee_user_id = $1 AND status = 'accepted'`,
        [profileUserId]
      ),
      pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM social_connections
         WHERE requester_user_id = $1 AND status = 'accepted'`,
        [profileUserId]
      ),
      pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM social_groups
         WHERE founder_user_id = $1`,
        [profileUserId]
      ),
      pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM social_group_members
         WHERE user_id = $1`,
        [profileUserId]
      ),
      pool.query(
        `SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2) AS rating_avg,
                COUNT(*)::INT AS rating_count
         FROM user_ratings
         WHERE rated_user_id = $1
           AND is_verified_booking = TRUE`,
        [profileUserId]
      ),
      pool.query(
        `SELECT r.rating,
                r.comment,
                r.offer_id,
                r.offer_title,
                r.is_verified_booking,
                r.created_at,
                u.vorname,
                u.nachname
         FROM user_ratings r
         JOIN users u ON u.id = r.rater_user_id
         WHERE r.rated_user_id = $1
         ORDER BY r.created_at DESC
         LIMIT 6`,
        [profileUserId]
      ),
      safeViewerId > 0 && safeViewerId !== profileUserId
        ? pool.query(
            `SELECT id, status, requester_user_id, addressee_user_id
             FROM social_connections
             WHERE (requester_user_id = $1 AND addressee_user_id = $2)
                OR (requester_user_id = $2 AND addressee_user_id = $1)
             LIMIT 1`,
            [safeViewerId, profileUserId]
          )
        : Promise.resolve({ rows: [] as any[] })
    ]);

    const stats = {
      followerCount: Number(followerRes.rows[0]?.count || 0),
      followingCount: Number(followingRes.rows[0]?.count || 0),
      groupHostCount: Number(groupHostRes.rows[0]?.count || 0),
      groupMemberCount: Number(groupMemberRes.rows[0]?.count || 0),
      ratingAvg: Number(ratingStatsRes.rows[0]?.rating_avg || 0),
      ratingCount: Number(ratingStatsRes.rows[0]?.rating_count || 0)
    };

    return {
      success: true,
      stats,
      ratings: ratingsRes.rows,
      connection: connectionRes.rows[0] || null
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Server-Fehler',
      stats: {
        followerCount: 0,
        followingCount: 0,
        groupHostCount: 0,
        groupMemberCount: 0,
        ratingAvg: 0,
        ratingCount: 0
      },
      ratings: [],
      connection: null
    };
  }
}

export async function getPublicOfferDetails(payload: { profileUserId: number; offerId: string; viewerUserId?: number | null }) {
  try {
    await ensureExtraSchema();

    const profileUserId = Number(payload.profileUserId);
    const offerId = String(payload.offerId || '').trim();
    const viewerUserId = Number(payload.viewerUserId || 0);
    const safeViewerId = Number.isInteger(viewerUserId) && viewerUserId > 0 ? viewerUserId : 0;

    if (!Number.isInteger(profileUserId) || profileUserId <= 0 || !offerId) {
      return { success: false, error: 'Ungültige Daten.', data: null };
    }

    const profileRes = await pool.query(
      `SELECT p.user_id,
              p.role,
              p.display_name,
              p.ort,
              p.plz,
              p.profil_data,
              u.vorname,
              u.nachname,
              u.verifiziert
       FROM user_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1
       LIMIT 1`,
      [profileUserId]
    );

    if (profileRes.rows.length === 0) {
      return { success: false, error: 'Profil nicht gefunden.', data: null };
    }

    const row = profileRes.rows[0];
    const profilData = row.profil_data && typeof row.profil_data === 'object' ? row.profil_data : {};
    const rawOffers = Array.isArray(profilData?.angeboteAnzeigen) ? profilData.angeboteAnzeigen : [];

    const matchedOffer = rawOffers.find((item: any) => String(item?.id || '').trim() === offerId);
    if (!matchedOffer) {
      return { success: false, error: 'Anzeige nicht gefunden.', data: null };
    }

    const visibility = matchedOffer?.visibility === 'draft' ? 'draft' : 'public';
    if (visibility !== 'public' && safeViewerId !== profileUserId) {
      return { success: false, error: 'Anzeige nicht öffentlich verfügbar.', data: null };
    }

    const ratingStatsRes = await pool.query(
      `SELECT COALESCE(AVG(rating), 0)::FLOAT AS avg_rating,
              COUNT(*)::INT AS rating_count
       FROM user_ratings
       WHERE rated_user_id = $1
         AND offer_id = $2`,
      [profileUserId, offerId]
    );

    const ratingsRes = await pool.query(
      `SELECT r.rating,
              r.comment,
              r.is_verified_booking,
              r.created_at,
              u.vorname,
              u.nachname
       FROM user_ratings r
       JOIN users u ON u.id = r.rater_user_id
       WHERE r.rated_user_id = $1
         AND r.offer_id = $2
       ORDER BY r.created_at DESC
       LIMIT 60`,
      [profileUserId, offerId]
    );

    const prices = Array.isArray(matchedOffer?.preise)
      ? matchedOffer.preise
          .map((preis: any) => ({
            label: String(preis?.label || preis?.typ || '').trim(),
            preis: String(preis?.preis || preis?.betrag || '').trim(),
            einheit: String(preis?.einheit || preis?.leistung || '').trim(),
          }))
          .filter((preis: { label: string; preis: string; einheit: string }) => preis.label || preis.preis || preis.einheit)
      : [];

    const mediaItems = Array.isArray(matchedOffer?.mediaItems)
      ? matchedOffer.mediaItems
          .map((item: any) => ({
            url: String(item?.url || '').trim(),
            mediaType: String(item?.mediaType || '').trim() === 'video' ? 'video' : 'image',
          }))
          .filter((item: { url: string; mediaType: 'image' | 'video' }) => item.url)
      : [];

    const billingType = String(matchedOffer?.billingType || '').trim().toLowerCase() === 'abo' ? 'abo' : 'einmal';
    const sessionsPerAboRaw = Number(matchedOffer?.sessionsPerAbo || 0);
    const sessionsPerAbo = Number.isFinite(sessionsPerAboRaw) && sessionsPerAboRaw > 0
      ? Math.round(sessionsPerAboRaw)
      : null;
    const cancellationAllowed = Boolean(matchedOffer?.singleSessionCancellationAllowed);
    const cancellationMaxRaw = Number(matchedOffer?.maxCancellationsPerAbo || 0);
    const maxCancellationsPerAbo = Number.isFinite(cancellationMaxRaw) && cancellationMaxRaw >= 0
      ? Math.round(cancellationMaxRaw)
      : 0;
    const cancellationWindowHoursRaw = Number(matchedOffer?.cancellationWindowHours || 0);
    const cancellationWindowHours = Number.isFinite(cancellationWindowHoursRaw) && cancellationWindowHoursRaw >= 0
      ? Math.round(cancellationWindowHoursRaw)
      : 0;
    const billingNotes = String(matchedOffer?.billingNotes || '').trim();

    return {
      success: true,
      data: {
        profileUserId,
        profileName: String(row.display_name || `${row.vorname || ''} ${row.nachname || ''}`).trim() || `Profil ${profileUserId}`,
        ort: String(row.ort || '').trim(),
        plz: String(row.plz || '').trim(),
        verifiziert: Boolean(row.verifiziert),
        offer: {
          id: offerId,
          titel: String(matchedOffer?.titel || '').trim(),
          kategorie: String(matchedOffer?.kategorie || '').trim(),
          beschreibung: String(matchedOffer?.beschreibung || '').trim(),
          titleImageUrl: String(matchedOffer?.titleImageUrl || '').trim(),
          mediaItems,
          visibility,
          prices,
          conditions: {
            billingType,
            sessionsPerAbo,
            singleSessionCancellationAllowed: billingType === 'abo' ? cancellationAllowed : false,
            maxCancellationsPerAbo: billingType === 'abo' && cancellationAllowed ? maxCancellationsPerAbo : 0,
            cancellationWindowHours: billingType === 'abo' ? cancellationWindowHours : 0,
            billingNotes,
          },
        },
        ratings: ratingsRes.rows,
        ratingAvg: Number(ratingStatsRes.rows[0]?.avg_rating || 0),
        ratingCount: Number(ratingStatsRes.rows[0]?.rating_count || 0),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', data: null };
  }
}

export async function setProfileVisibility(payload: { userId: number; isPublic: boolean }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const isPublic = Boolean(payload.isPublic);

    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    await pool.query(
      `INSERT INTO user_profiles (user_id, role, profil_data, updated_at)
       SELECT u.id, u.role, jsonb_build_object('isPublicProfile', $2::boolean), NOW()
       FROM users u
       WHERE u.id = $1
       ON CONFLICT (user_id)
       DO UPDATE SET
         profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || jsonb_build_object('isPublicProfile', $2::boolean),
         updated_at = NOW()`,
      [userId, isPublic]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getSearchFeed(viewerUserId?: number | null) {
  try {
    await ensureExtraSchema();

    // CRITICAL: Attempt scope column repair BEFORE building the query that uses it
    try {
      await pool.query(`ALTER TABLE visibility_promotions ADD COLUMN IF NOT EXISTS scope TEXT`);
      await pool.query(`UPDATE visibility_promotions SET scope = COALESCE(scope, 'angebote') WHERE scope IS NULL OR scope = ''`);
    } catch (_) {
      // Silently ignore - table might not exist or repair already done
    }

    let viewerHasEarlyAccess = false;
    if (viewerUserId && Number.isInteger(viewerUserId) && viewerUserId > 0) {
      const viewerRes = await pool.query(
        `SELECT early_access_granted_until FROM user_subscriptions WHERE user_id = $1 LIMIT 1`,
        [viewerUserId]
      );
      const viewerData = viewerRes.rows[0];
      if (viewerData?.early_access_granted_until) {
        viewerHasEarlyAccess = new Date(viewerData.early_access_granted_until).getTime() > Date.now();
      }
    }

    const earlyAccessWhereClause = viewerHasEarlyAccess
      ? '' // If user has early access, show all profiles
      : `AND (
           promo.active_boost_until IS NOT NULL
           OR p.updated_at < NOW() - INTERVAL '24 hours'
         )`; // Otherwise only show profiles with boost or > 24h old

    const buildSearchFeedQuery = (applyEarlyAccessFilter: boolean) => `
      SELECT p.user_id,
             CASE
               WHEN LOWER(COALESCE(u.role, '')) = 'experte'
                 OR LOWER(COALESCE(p.role, '')) = 'experte'
                 OR LENGTH(TRIM(COALESCE(p.angebot_text, ''))) > 0
                 OR COALESCE(array_length(p.zertifikate, 1), 0) > 0
                 OR LENGTH(TRIM(COALESCE(p.profil_data->>'gewerbeAdresse', ''))) > 0
                 OR LENGTH(TRIM(COALESCE(p.profil_data->>'ustId', ''))) > 0
                 OR LENGTH(TRIM(COALESCE(p.profil_data->>'website', ''))) > 0
                 OR COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(p.profil_data->'angeboteAnzeigen') = 'array' THEN p.profil_data->'angeboteAnzeigen' ELSE '[]'::jsonb END), 0) > 0
               THEN 'experte'
               ELSE 'nutzer'
             END AS role,
             p.display_name,
             p.ort,
             p.plz,
             p.kategorien,
             p.zertifikate,
             p.angebot_text,
             p.suche_text,
             p.profil_data,
             p.gesuche,
             u.verifiziert,
             u.vorname,
             u.nachname,
             COALESCE(us.plan_key, CASE WHEN LOWER(COALESCE(u.role, '')) = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
             NULL::TIMESTAMP AS active_boost_until,
             NULL::TIMESTAMP AS active_weekly_ad_until,
             COALESCE(posts_agg.profile_posts_count, 0) AS profile_posts_count,
             COALESCE(posts_agg.profile_posts_text, '') AS profile_posts_text,
             COALESCE(rating_agg.verified_rating_avg, 0) AS verified_rating_avg,
             COALESCE(rating_agg.verified_rating_count, 0) AS verified_rating_count,
             CASE
               WHEN COALESCE(us.plan_key, '') = 'nutzer_plus' THEN 180
               WHEN COALESCE(us.plan_key, '') = 'experte_pro' THEN 120
               ELSE 0
             END AS visibility_score
      FROM user_profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::INT AS profile_posts_count,
               STRING_AGG(COALESCE(sp.title, '') || ' ' || COALESCE(sp.content, '') || ' ' || COALESCE(array_to_string(sp.hashtags, ' '), ''), ' | ') AS profile_posts_text
        FROM social_posts sp
        WHERE sp.author_user_id = p.user_id
          AND sp.group_id IS NULL
          AND sp.moderation_status = 'approved'
      ) posts_agg ON TRUE
      LEFT JOIN LATERAL (
        SELECT COALESCE(AVG(r.rating), 0)::FLOAT AS verified_rating_avg,
               COUNT(*)::INT AS verified_rating_count
        FROM user_ratings r
        WHERE r.rated_user_id = p.user_id
          AND r.is_verified_booking = TRUE
      ) rating_agg ON TRUE
      WHERE p.user_id IS NOT NULL
      ORDER BY visibility_score DESC,
               p.updated_at DESC;
    `;

    try {
      let result = await pool.query(buildSearchFeedQuery(true));
      if (result.rows.length === 0 && !viewerHasEarlyAccess) {
        result = await pool.query(buildSearchFeedQuery(false));
      }

      if (result.rows.length > 0) {
        return { success: true, items: result.rows, viewerHasEarlyAccess };
      }
    } catch (_err) {
      // Main query failed, fall through to fallback
    }

    const fallbackRes = await pool.query(
      `SELECT u.id AS user_id,
              CASE
                WHEN LOWER(COALESCE(u.role, '')) = 'experte' THEN 'experte'
                ELSE 'nutzer'
              END AS role,
              NULL::TEXT AS display_name,
              NULL::TEXT AS ort,
              NULL::TEXT AS plz,
              ARRAY[]::TEXT[] AS kategorien,
              ARRAY[]::TEXT[] AS zertifikate,
              NULL::TEXT AS angebot_text,
              NULL::TEXT AS suche_text,
              '{}'::jsonb AS profil_data,
              '{}'::jsonb AS gesuche,
              u.verifiziert,
              u.vorname,
              u.nachname,
              COALESCE(us.plan_key, CASE WHEN LOWER(COALESCE(u.role, '')) = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
              NULL::TIMESTAMP AS active_boost_until,
              NULL::TIMESTAMP AS active_weekly_ad_until,
              COALESCE(posts_agg.profile_posts_count, 0) AS profile_posts_count,
              COALESCE(posts_agg.profile_posts_text, '') AS profile_posts_text,
              COALESCE(rating_agg.verified_rating_avg, 0) AS verified_rating_avg,
              COALESCE(rating_agg.verified_rating_count, 0) AS verified_rating_count,
              CASE
                WHEN COALESCE(us.plan_key, '') = 'nutzer_plus' THEN 180
                WHEN COALESCE(us.plan_key, '') = 'experte_pro' THEN 120
                ELSE 0
              END AS visibility_score
       FROM users u
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::INT AS profile_posts_count,
                STRING_AGG(COALESCE(sp.title, '') || ' ' || COALESCE(sp.content, '') || ' ' || COALESCE(array_to_string(sp.hashtags, ' '), ''), ' | ') AS profile_posts_text
         FROM social_posts sp
         WHERE sp.author_user_id = u.id
           AND sp.group_id IS NULL
           AND sp.moderation_status = 'approved'
       ) posts_agg ON TRUE
       LEFT JOIN LATERAL (
         SELECT COALESCE(AVG(r.rating), 0)::FLOAT AS verified_rating_avg,
                COUNT(*)::INT AS verified_rating_count
         FROM user_ratings r
         WHERE r.rated_user_id = u.id
           AND r.is_verified_booking = TRUE
       ) rating_agg ON TRUE
       WHERE u.id IS NOT NULL
       ORDER BY visibility_score DESC, u.id DESC`
    );

    return { success: true, items: fallbackRes.rows, viewerHasEarlyAccess };
  } catch (error: any) {
    return { success: false, error: error.message, items: [], viewerHasEarlyAccess: false };
  }
}

// --- MERKLISTE ---
export async function addWishlistItem(userId: number, item: any) {
  try {
    await ensureExtraSchema();
    const query = `
      INSERT INTO wishlist_items (
        user_id, item_type, profile_type, source_id,
        name, ort, plz, kategorie_text, content
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, item_type, source_id)
      DO NOTHING
      RETURNING id;
    `;

    const res = await pool.query(query, [
      userId,
      item.typ,
      item.profilTyp,
      item.sourceId,
      item.name,
      item.ort || null,
      item.plz || null,
      item.kategorieText || null,
      item.content || null
    ]);

    return { success: true, inserted: (res.rowCount ?? 0) > 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWishlistItems(userId: number) {
  try {
    await ensureExtraSchema();
    const result = await pool.query(
      `SELECT id, item_type as typ, profile_type as "profilTyp", source_id as "sourceId", name, ort, plz,
              kategorie_text as "kategorieText", content, created_at as "createdAt"
       FROM wishlist_items
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return { success: true, items: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message, items: [] };
  }
}

export async function removeWishlistItem(userId: number, itemId: number) {
  try {
    await ensureExtraSchema();
    await pool.query('DELETE FROM wishlist_items WHERE user_id = $1 AND id = $2', [userId, itemId]);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- ADMIN: VERIFIZIERUNG ---
export async function getVerificationProfiles(adminCode: string) {
  try {
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', items: [] };
    }

    await ensureExtraSchema();
    const result = await pool.query(
      `SELECT u.id AS user_id,
              u.role,
              u.vorname,
              u.nachname,
              u.email,
              u.verifiziert,
              p.display_name,
              p.zertifikate,
              p.profil_data,
              p.updated_at
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       ORDER BY COALESCE(p.updated_at, NOW()) DESC, u.id DESC`
    );

    return { success: true, items: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message, items: [] };
  }
}

export async function updateVerificationStatus(payload: {
  adminCode: string;
  userId: number;
  accountVerified: boolean;
  verifiedCertificates: string[];
}) {
  try {
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    await ensureExtraSchema();

    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    const verifiedCertificates = Array.isArray(payload.verifiedCertificates)
      ? payload.verifiedCertificates.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
      : [];

    await pool.query('UPDATE users SET verifiziert = $1 WHERE id = $2', [payload.accountVerified, userId]);

    await pool.query(
      `UPDATE user_profiles
       SET profil_data = COALESCE(profil_data, '{}'::jsonb) || jsonb_build_object('verifizierteZertifikate', $1::text[]),
           updated_at = NOW()
       WHERE user_id = $2`,
      [verifiedCertificates, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getContactMessages(adminCode: string) {
  try {
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', items: [] };
    }

    await ensureExtraSchema();
    const result = await pool.query(
      `SELECT id,
              ticket_code,
              name,
              email,
              subject,
              message,
              send_status,
              send_error,
              user_id,
              source_role,
              source_key,
              source_label,
              created_at,
              sent_at
       FROM contact_form_messages
       ORDER BY created_at DESC
       LIMIT 300`
    );

    return { success: true, items: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message, items: [] };
  }
}

export async function getPrivateSettingsData(userId: number) {
  try {
    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', data: null };
    }

    const result = await pool.query(
      `SELECT id,
              vorname,
              nachname,
              email,
              birth_date,
              privat_strasse,
              privat_plz,
              privat_ort,
              unternehmensname,
              role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    return { success: true, data: result.rows[0] || null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', data: null };
  }
}

export async function updatePrivateSettingsData(payload: {
  userId: number;
  vorname: string;
  nachname: string;
  email: string;
  unternehmensname?: string;
  birthDate?: string | null;
  privatStrasse?: string;
  privatPlz?: string;
  privatOrt?: string;
  passwordConfirmation?: string;
}) {
  try {
    const id = Number(payload.userId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    // If password is provided, verify it
    if (payload.passwordConfirmation) {
      const userResult = await pool.query(
        `SELECT password FROM users WHERE id = $1`,
        [id]
      );

      if (!userResult.rows[0]) {
        return { success: false, error: 'Benutzer nicht gefunden.' };
      }

      const passwordHash = userResult.rows[0].password;
      const passwordMatches = await bcrypt.compare(payload.passwordConfirmation, passwordHash);

      if (!passwordMatches) {
        return { success: false, error: 'Passwort ist falsch. Bitte versuche es erneut.' };
      }
    }

    const vorname = String(payload.vorname || '').trim();
    const nachname = String(payload.nachname || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const unternehmensname = String(payload.unternehmensname || '').trim();
    const birthDate = normalizeBirthDateInput(payload.birthDate);
    const privatStrasse = String(payload.privatStrasse || '').trim();
    const privatPlz = String(payload.privatPlz || '').trim();
    const privatOrt = String(payload.privatOrt || '').trim();

    if (!vorname || !nachname || !email) {
      return { success: false, error: 'Vorname, Nachname und E-Mail sind Pflichtfelder.' };
    }

    if (!email.includes('@')) {
      return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
    }

    await pool.query(
      `UPDATE users
       SET vorname = $1,
           nachname = $2,
           email = $3,
           birth_date = COALESCE($4::date, birth_date),
           privat_strasse = $5,
           privat_plz = $6,
           privat_ort = $7,
           unternehmensname = $8
       WHERE id = $9`,
      [vorname, nachname, email, birthDate, privatStrasse || null, privatPlz || null, privatOrt || null, unternehmensname || null, id]
    );

    try {
      await syncBrevoContactAttributes({
        email,
        firstName: vorname || 'du',
        lastName: nachname,
        birthDate,
      });
    } catch {
      // Brevo-Sync ist nicht kritisch für das Speichern der privaten Daten.
    }

    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') {
      return { success: false, error: 'Diese E-Mail-Adresse ist bereits vergeben.' };
    }
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function deleteOwnAccount(payload: { userId: number; confirmation: string; currentPassword: string }) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const id = Number(payload.userId);
    const confirmation = String(payload.confirmation || '').trim().toUpperCase();
    const currentPassword = String(payload.currentPassword || '');

    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    if (confirmation !== 'LOESCHEN') {
      return { success: false, error: 'Bitte zur Bestätigung exakt LOESCHEN eingeben.' };
    }

    if (!currentPassword || currentPassword.length < 1) {
      return { success: false, error: 'Bitte aktuelles Passwort eingeben.' };
    }

    await client.query('BEGIN');

    const existsRes = await client.query('SELECT id, password FROM users WHERE id = $1 LIMIT 1', [id]);
    if (existsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Konto nicht gefunden.' };
    }

    const storedPasswordHash = String(existsRes.rows[0]?.password || '');
    if (!storedPasswordHash) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Passwortprüfung nicht möglich.' };
    }

    const passwordMatch = await bcrypt.compare(currentPassword, storedPasswordHash);
    if (!passwordMatch) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Aktuelles Passwort ist nicht korrekt.' };
    }

    await client.query('DELETE FROM users WHERE id = $1', [id]);
    await client.query('COMMIT');

    return { success: true };
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    return { success: false, error: error.message || 'Konto konnte nicht gelöscht werden.' };
  } finally {
    client.release();
  }
}

export async function getUserBookings(userId: number) {
  try {
    await ensureExtraSchema();

    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', items: [] };
    }

    const result = await pool.query(
      `SELECT id,
              booking_type,
              provider_name,
              booking_date,
              status,
              location,
              notes,
              created_at
       FROM user_bookings
       WHERE user_id = $1
       ORDER BY COALESCE(booking_date, created_at) DESC`,
      [id]
    );

    return { success: true, items: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', items: [] };
  }
}

export async function getUserNotifications(userId: number, limit = 12) {
  try {
    await ensureExtraSchema();

    const id = Number(userId);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 12));
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', items: [], unreadCount: 0 };
    }

    const result = await pool.query(
      `SELECT id,
              title,
              message,
              href,
              notification_type,
              is_read,
              created_at,
              read_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [id, safeLimit]
    );

    const unreadRes = await pool.query(
      `SELECT COUNT(*)::INT AS count
       FROM user_notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [id]
    );

    return { success: true, items: result.rows, unreadCount: unreadRes.rows[0]?.count || 0 };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', items: [], unreadCount: 0 };
  }
}

export async function markUserNotificationRead(payload: { userId: number; notificationId: number }) {
  try {
    await ensureExtraSchema();

    const userId = Number(payload.userId);
    const notificationId = Number(payload.notificationId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return { success: false, error: 'Ungültige Benachrichtigungs-ID.' };
    }

    await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function markAllUserNotificationsRead(userId: number) {
  try {
    await ensureExtraSchema();

    const id = Number(userId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    await pool.query(
      `UPDATE user_notifications
       SET is_read = TRUE,
           read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1 AND is_read = FALSE`,
      [id]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function joinProWaitlist(payload: {
  providerUserId: number;
  interestedUserId: number;
  sourceType?: string;
  sourceRef?: string;
}) {
  try {
    await ensureExtraSchema();

    const providerUserId = Number(payload.providerUserId);
    const interestedUserId = Number(payload.interestedUserId);
    const sourceType = String(payload.sourceType || 'profil').trim() || 'profil';
    const sourceRef = payload.sourceRef == null ? null : String(payload.sourceRef);

    if (!Number.isInteger(providerUserId) || providerUserId <= 0) {
      return { success: false, error: 'Ungültige Anbieter-ID.' };
    }
    if (!Number.isInteger(interestedUserId) || interestedUserId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (providerUserId === interestedUserId) {
      return { success: false, error: 'Du kannst dich nicht selbst auf die Warteliste setzen.' };
    }

    const providerRes = await pool.query(
      'SELECT id, vorname, nachname, role, stall_ort, privat_ort FROM users WHERE id = $1 LIMIT 1',
      [providerUserId]
    );

    if (providerRes.rows.length === 0 || providerRes.rows[0].role !== 'experte') {
      return { success: false, error: 'Anbieter nicht gefunden.' };
    }

    const insertRes = await pool.query(
      `INSERT INTO pro_waitlist_entries (provider_user_id, interested_user_id, source_type, source_ref)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider_user_id, interested_user_id, source_type, source_ref)
       DO NOTHING
       RETURNING id`,
      [providerUserId, interestedUserId, sourceType, sourceRef]
    );

    const inserted = (insertRes.rowCount ?? 0) > 0;

    if (inserted) {
      const waitlistEntryId = insertRes.rows[0]?.id;
      const providerName = `${providerRes.rows[0].vorname || ''} ${providerRes.rows[0].nachname || ''}`.trim() || `Experte ${providerUserId}`;
      const providerOrt = providerRes.rows[0].stall_ort || providerRes.rows[0].privat_ort || null;

      await pool.query(
        `INSERT INTO user_bookings (user_id, booking_type, provider_name, booking_date, status, location, notes, waitlist_entry_id)
         VALUES ($1, 'Warteliste', $2, NULL, 'warteliste', $3, $4, $5)`,
        [
          interestedUserId,
          providerName,
          providerOrt,
          sourceRef ? `Automatisch aus Warteliste (${sourceRef}) erstellt.` : 'Automatisch aus Warteliste erstellt.',
          waitlistEntryId || null
        ]
      );
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::INT AS count
       FROM pro_waitlist_entries
       WHERE provider_user_id = $1`,
      [providerUserId]
    );

    return {
      success: true,
      inserted,
      waitlistCount: countRes.rows[0]?.count || 0
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getWaitlistOverviewForViewer(viewerUserId: number) {
  try {
    await ensureExtraSchema();

    const id = Number(viewerUserId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: true, counts: {}, joined: {} };
    }

    const countsRes = await pool.query(
      `SELECT provider_user_id, COUNT(*)::INT AS count
       FROM pro_waitlist_entries
       GROUP BY provider_user_id`
    );

    const joinedRes = await pool.query(
      `SELECT provider_user_id
       FROM pro_waitlist_entries
       WHERE interested_user_id = $1`,
      [id]
    );

    const counts: Record<string, number> = {};
    for (const row of countsRes.rows) {
      counts[String(row.provider_user_id)] = row.count;
    }

    const joined: Record<string, boolean> = {};
    for (const row of joinedRes.rows) {
      joined[String(row.provider_user_id)] = true;
    }

    return { success: true, counts, joined };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', counts: {}, joined: {} };
  }
}

export async function getProviderWaitlist(providerUserId: number) {
  try {
    await ensureExtraSchema();

    const id = Number(providerUserId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Anbieter-ID.', items: [] };
    }

    const result = await pool.query(
      `SELECT w.id,
              w.provider_user_id,
              w.interested_user_id,
              w.source_type,
              w.source_ref,
              w.created_at,
              w.priority,
              w.expert_category,
              w.expert_notes,
              w.confirmed_booking_date,
              w.booking_status,
              w.notified_at,
              u.vorname,
              u.nachname,
              u.email,
              u.privat_ort,
              u.privat_plz
       FROM pro_waitlist_entries w
       JOIN users u ON u.id = w.interested_user_id
       WHERE w.provider_user_id = $1
       ORDER BY w.priority DESC, w.created_at ASC`,
      [id]
    );

    return { success: true, items: result.rows };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', items: [] };
  }
}

export async function updateProviderWaitlistEntry(payload: {
  providerUserId: number;
  entryId: number;
  priority: number;
  expertCategory?: string;
  expertNotes?: string;
  confirmedBookingDate?: string | null;
}) {
  try {
    await ensureExtraSchema();

    const providerUserId = Number(payload.providerUserId);
    const entryId = Number(payload.entryId);
    const priority = Number(payload.priority || 0);
    const expertCategory = String(payload.expertCategory || '').trim();
    const expertNotes = String(payload.expertNotes || '').trim();
    const confirmedBookingDate = payload.confirmedBookingDate ? String(payload.confirmedBookingDate).trim() : null;

    if (!Number.isInteger(providerUserId) || providerUserId <= 0) {
      return { success: false, error: 'Ungültige Anbieter-ID.' };
    }
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return { success: false, error: 'Ungültige Wartelisten-ID.' };
    }

    await pool.query(
      `UPDATE pro_waitlist_entries
       SET priority = $1,
           expert_category = $2,
           expert_notes = $3,
           confirmed_booking_date = $4
       WHERE id = $5 AND provider_user_id = $6`,
      [priority, expertCategory || null, expertNotes || null, confirmedBookingDate || null, entryId, providerUserId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function confirmProviderWaitlistBooking(payload: {
  providerUserId: number;
  entryId: number;
}) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const providerUserId = Number(payload.providerUserId);
    const entryId = Number(payload.entryId);

    if (!Number.isInteger(providerUserId) || providerUserId <= 0) {
      return { success: false, error: 'Ungültige Anbieter-ID.' };
    }
    if (!Number.isInteger(entryId) || entryId <= 0) {
      return { success: false, error: 'Ungültige Wartelisten-ID.' };
    }

    await client.query('BEGIN');

    const entryRes = await client.query(
      `SELECT w.id,
              w.interested_user_id,
              w.confirmed_booking_date,
              w.expert_category,
              w.expert_notes,
              w.booking_status,
              u.vorname AS user_vorname,
              u.email AS user_email,
              p.vorname AS provider_vorname,
              p.nachname AS provider_nachname
       FROM pro_waitlist_entries w
       JOIN users u ON u.id = w.interested_user_id
       JOIN users p ON p.id = w.provider_user_id
       WHERE w.id = $1 AND w.provider_user_id = $2
       LIMIT 1
       FOR UPDATE`,
      [entryId, providerUserId]
    );

    if (entryRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Wartelisten-Eintrag nicht gefunden.' };
    }

    const entry = entryRes.rows[0];
    if (entry.booking_status === 'bestaetigt') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Dieser Eintrag wurde bereits bestätigt.' };
    }

    const confirmedDate = entry.confirmed_booking_date ? new Date(entry.confirmed_booking_date) : null;
    if (!confirmedDate || Number.isNaN(confirmedDate.getTime())) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Bitte zuerst ein Datum für die feste Buchung hinterlegen.' };
    }

    const providerName = `${entry.provider_vorname || ''} ${entry.provider_nachname || ''}`.trim() || `Experte ${providerUserId}`;

    const bookingUpdateRes = await client.query(
      `UPDATE user_bookings
       SET booking_type = COALESCE(NULLIF($1, ''), booking_type),
           booking_date = $2,
           status = 'bestaetigt',
           notes = $3,
           waitlist_entry_id = $4
       WHERE id = (
         SELECT id
         FROM user_bookings
         WHERE user_id = $5
           AND (
             waitlist_entry_id = $4
             OR (
               waitlist_entry_id IS NULL
               AND provider_name = $6
               AND status = 'warteliste'
             )
           )
         ORDER BY created_at DESC
         LIMIT 1
       )
       RETURNING id`,
      [
        entry.expert_category || 'Feste Buchung',
        confirmedDate.toISOString(),
        entry.expert_notes || null,
        entryId,
        entry.interested_user_id,
        providerName
      ]
    );

    if (bookingUpdateRes.rows.length === 0) {
      await client.query(
        `INSERT INTO user_bookings (user_id, booking_type, provider_name, booking_date, status, location, notes, waitlist_entry_id)
         VALUES ($1, $2, $3, $4, 'bestaetigt', NULL, $5, $6)`,
        [
          entry.interested_user_id,
          entry.expert_category || 'Feste Buchung',
          providerName,
          confirmedDate.toISOString(),
          entry.expert_notes || null,
          entryId
        ]
      );
    }

    await client.query(
      `UPDATE pro_waitlist_entries
       SET booking_status = 'bestaetigt'
       WHERE id = $1 AND provider_user_id = $2`,
      [entryId, providerUserId]
    );

    await createUserNotification(client, {
      userId: entry.interested_user_id,
      title: 'Feste Buchung bestätigt',
      message: `${providerName} hat deine Wartelisten-Anfrage bestätigt. Termin ab ${confirmedDate.toLocaleDateString('de-DE')}.`,
      href: '/einstellungen',
      notificationType: 'booking'
    });

    await client.query('COMMIT');

    await pool.query(
      `UPDATE pro_waitlist_entries
       SET notified_at = NOW()
       WHERE id = $1 AND provider_user_id = $2`,
      [entryId, providerUserId]
    );

    return { success: true, notified: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

function normalizeHashtags(raw: string) {
  const tags = String(raw || '')
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean)
    .map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 12);
}

async function autoPublishExpiredGroupPosts() {
  await pool.query(
    `UPDATE social_posts
     SET moderation_status = 'approved',
         moderated_at = NOW(),
         moderated_by_user_id = NULL,
         rejection_reason = NULL
     WHERE moderation_status = 'pending'
       AND group_id IS NOT NULL
       AND moderation_deadline IS NOT NULL
       AND moderation_deadline < NOW()`
  );
}

async function isGroupOwner(userId: number, groupId: number) {
  const res = await pool.query(
    `SELECT 1
     FROM social_group_members
     WHERE user_id = $1 AND group_id = $2 AND role = 'owner'
     LIMIT 1`,
    [userId, groupId]
  );
  return res.rows.length > 0;
}

async function canUserAccessPost(userId: number, postId: number) {
  const res = await pool.query(
    `SELECT p.id,
            p.author_user_id,
            p.group_id,
            p.moderation_status,
            EXISTS (
              SELECT 1
              FROM social_group_members gm
              WHERE gm.group_id = p.group_id
                AND gm.user_id = $1
            ) AS is_group_member,
            EXISTS (
              SELECT 1
              FROM social_group_members gm
              WHERE gm.group_id = p.group_id
                AND gm.user_id = $1
                AND gm.role = 'owner'
            ) AS is_group_owner
     FROM social_posts p
     WHERE p.id = $2
     LIMIT 1`,
    [userId, postId]
  );

  if (res.rows.length === 0) {
    return { exists: false, allowed: false, row: null };
  }

  const row = res.rows[0];
  const isAuthor = Number(row.author_user_id) === userId;
  const isOwner = Boolean(row.is_group_owner);
  const isMember = Boolean(row.is_group_member);
  const isPublicProfilePost = !row.group_id;
  const approved = row.moderation_status === 'approved';

  const allowed = isAuthor || isOwner || (approved && (isPublicProfilePost || isMember));
  return { exists: true, allowed, row };
}

export async function getNetworkOverview(userId: number) {
  try {
    await ensureExtraSchema();
    const viewerId = Number(userId);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', incoming: [], outgoing: [], connections: [], discover: [] };
    }

    const [incomingRes, outgoingRes, connectionsRes, discoverRes] = await Promise.all([
      pool.query(
        `SELECT c.id,
                c.requester_user_id,
                u.vorname,
                u.nachname,
                u.role,
                c.created_at
         FROM social_connections c
         JOIN users u ON u.id = c.requester_user_id
         WHERE c.addressee_user_id = $1 AND c.status = 'pending'
         ORDER BY c.created_at DESC`,
        [viewerId]
      ),
      pool.query(
        `SELECT c.id,
                c.addressee_user_id,
                u.vorname,
                u.nachname,
                u.role,
                c.created_at
         FROM social_connections c
         JOIN users u ON u.id = c.addressee_user_id
         WHERE c.requester_user_id = $1 AND c.status = 'pending'
         ORDER BY c.created_at DESC`,
        [viewerId]
      ),
      pool.query(
        `SELECT c.id,
                CASE
                  WHEN c.requester_user_id = $1 THEN c.addressee_user_id
                  ELSE c.requester_user_id
                END AS partner_user_id,
                u.vorname,
                u.nachname,
                u.role,
                c.responded_at
         FROM social_connections c
         JOIN users u ON u.id = CASE WHEN c.requester_user_id = $1 THEN c.addressee_user_id ELSE c.requester_user_id END
         WHERE (c.requester_user_id = $1 OR c.addressee_user_id = $1)
           AND c.status = 'accepted'
         ORDER BY c.responded_at DESC NULLS LAST`,
        [viewerId]
      ),
      pool.query(
        `SELECT *
         FROM (
           SELECT u.id,
                  u.vorname,
                  u.nachname,
                  u.role,
                  p.display_name,
                  COALESCE(p.ort, u.privat_ort, u.stall_ort) AS ort,
                  COALESCE(conn.status, 'none') AS connection_status,
                  conn.requester_user_id,
                  (
                    (
                      SELECT COUNT(*)::INT
                      FROM unnest(COALESCE(p.kategorien, ARRAY[]::TEXT[])) candidate_kat
                      INNER JOIN unnest(COALESCE(vp.kategorien, ARRAY[]::TEXT[])) viewer_kat
                        ON candidate_kat = viewer_kat
                    ) * 10
                    + CASE
                        WHEN COALESCE(p.ort, u.privat_ort, u.stall_ort) IS NOT NULL
                         AND COALESCE(vp.ort, vu.privat_ort, vu.stall_ort) IS NOT NULL
                         AND lower(COALESCE(p.ort, u.privat_ort, u.stall_ort)) = lower(COALESCE(vp.ort, vu.privat_ort, vu.stall_ort))
                        THEN 3
                        ELSE 0
                      END
                    + CASE WHEN u.role = vu.role THEN 1 ELSE 0 END
                  ) AS suggestion_score
           FROM users u
           LEFT JOIN user_profiles p ON p.user_id = u.id
           LEFT JOIN social_connections conn
             ON (conn.requester_user_id = $1 AND conn.addressee_user_id = u.id)
             OR (conn.requester_user_id = u.id AND conn.addressee_user_id = $1)
           LEFT JOIN users vu ON vu.id = $1
           LEFT JOIN user_profiles vp ON vp.user_id = $1
           WHERE u.id <> $1
         ) ranked
         ORDER BY ranked.suggestion_score DESC, ranked.id DESC
         LIMIT 30`,
        [viewerId]
      )
    ]);

    return {
      success: true,
      incoming: incomingRes.rows,
      outgoing: outgoingRes.rows,
      connections: connectionsRes.rows,
      discover: discoverRes.rows
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', incoming: [], outgoing: [], connections: [], discover: [] };
  }
}

export async function sendConnectionRequest(payload: { requesterId: number; targetUserId: number }) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const requesterId = Number(payload.requesterId);
    const targetUserId = Number(payload.targetUserId);
    if (!Number.isInteger(requesterId) || requesterId <= 0 || !Number.isInteger(targetUserId) || targetUserId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (requesterId === targetUserId) {
      return { success: false, error: 'Du kannst dich nicht selbst vernetzen.' };
    }

    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, requester_user_id, addressee_user_id, status
       FROM social_connections
       WHERE (requester_user_id = $1 AND addressee_user_id = $2)
          OR (requester_user_id = $2 AND addressee_user_id = $1)
       LIMIT 1
       FOR UPDATE`,
      [requesterId, targetUserId]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.status === 'accepted') {
        await client.query('ROLLBACK');
        return { success: true, status: 'accepted', autoAccepted: false };
      }

      if (row.status === 'pending' && Number(row.requester_user_id) === targetUserId) {
        await client.query(
          `UPDATE social_connections
           SET status = 'accepted', responded_at = NOW()
           WHERE id = $1`,
          [row.id]
        );

        await createUserNotification(client, {
          userId: targetUserId,
          title: 'Vernetzung akzeptiert',
          message: 'Deine Vernetzungsanfrage wurde angenommen.',
          href: '/netzwerk',
          notificationType: 'info'
        });

        await client.query('COMMIT');
        return { success: true, status: 'accepted', autoAccepted: true };
      }

      await client.query('ROLLBACK');
      return { success: true, status: row.status, autoAccepted: false };
    }

    await client.query(
      `INSERT INTO social_connections (requester_user_id, addressee_user_id, status)
       VALUES ($1, $2, 'pending')`,
      [requesterId, targetUserId]
    );

    await createUserNotification(client, {
      userId: targetUserId,
      title: 'Neue Vernetzungsanfrage',
      message: 'Du hast eine neue Vernetzungsanfrage erhalten.',
      href: '/netzwerk',
      notificationType: 'info'
    });

    await client.query('COMMIT');
    return { success: true, status: 'pending', autoAccepted: false };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function respondToConnectionRequest(payload: { requestId: number; responderId: number; accept: boolean }) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const requestId = Number(payload.requestId);
    const responderId = Number(payload.responderId);
    if (!Number.isInteger(requestId) || requestId <= 0 || !Number.isInteger(responderId) || responderId <= 0) {
      return { success: false, error: 'Ungültige Anfrage.' };
    }

    await client.query('BEGIN');
    const requestRes = await client.query(
      `SELECT id, requester_user_id, addressee_user_id, status
       FROM social_connections
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [requestId]
    );

    if (requestRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Anfrage nicht gefunden.' };
    }

    const request = requestRes.rows[0];
    if (Number(request.addressee_user_id) !== responderId) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Nicht berechtigt.' };
    }

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return { success: true, status: request.status };
    }

    const nextStatus = payload.accept ? 'accepted' : 'rejected';
    await client.query(
      `UPDATE social_connections
       SET status = $2, responded_at = NOW()
       WHERE id = $1`,
      [requestId, nextStatus]
    );

    await createUserNotification(client, {
      userId: Number(request.requester_user_id),
      title: payload.accept ? 'Vernetzung akzeptiert' : 'Vernetzung abgelehnt',
      message: payload.accept ? 'Deine Vernetzungsanfrage wurde angenommen.' : 'Deine Vernetzungsanfrage wurde abgelehnt.',
      href: '/netzwerk',
      notificationType: 'info'
    });

    await client.query('COMMIT');
    return { success: true, status: nextStatus };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function createNetworkGroup(payload: { founderUserId: number; name: string; description?: string }) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const founderUserId = Number(payload.founderUserId);
    const name = String(payload.name || '').trim();
    const description = String(payload.description || '').trim();

    if (!Number.isInteger(founderUserId) || founderUserId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (!name) {
      return { success: false, error: 'Bitte Gruppennamen eingeben.' };
    }

    const activeSanction = await getActiveSanction(founderUserId, ['groups']);
    if (activeSanction) {
      return { success: false, error: `Du bist bis ${new Date(activeSanction.ends_at).toLocaleDateString('de-DE')} vom Gruppen-Hosting ausgeschlossen.` };
    }

    const founderPlan = await getUserPlanDefinition(founderUserId);
    if (founderPlan.key !== 'experte_pro') {
      return { success: false, error: 'Gruppen-Hosting ist nur fuer Experten mit aktivem Abo verfuegbar.' };
    }

    await client.query('BEGIN');
    const groupRes = await client.query(
      `INSERT INTO social_groups (founder_user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [founderUserId, name, description || null]
    );

    const groupId = groupRes.rows[0].id;
    await client.query(
      `INSERT INTO social_group_members (group_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, founderUserId]
    );

    await client.query('COMMIT');
    return { success: true, groupId };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function getNetworkGroups(userId: number) {
  try {
    await ensureExtraSchema();
    const viewerId = Number(userId);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, groups: [], error: 'Ungültige Nutzer-ID.' };
    }

    const res = await pool.query(
      `SELECT g.id,
              g.name,
              g.description,
              g.created_at,
              EXISTS (
                SELECT 1
                FROM social_group_members gm
                WHERE gm.group_id = g.id AND gm.user_id = $1
              ) AS is_member,
              (
                SELECT COUNT(*)::INT
                FROM social_group_members gm2
                WHERE gm2.group_id = g.id
              ) AS member_count
       FROM social_groups g
       ORDER BY g.created_at DESC`,
      [viewerId]
    );

    return { success: true, groups: res.rows };
  } catch (error: any) {
    return { success: false, groups: [], error: error.message || 'Server-Fehler' };
  }
}

export async function getGroupsFeed() {
  try {
    await ensureExtraSchema();
    const res = await pool.query(
      `SELECT g.id,
              g.name,
              g.description,
              g.founder_user_id,
              g.created_at,
              COALESCE(p.display_name, u.vorname || ' ' || u.nachname) AS founder_name,
              (
                SELECT COUNT(*)::INT
                FROM social_group_members gm
                WHERE gm.group_id = g.id
              ) AS member_count
       FROM social_groups g
       JOIN users u ON u.id = g.founder_user_id
       LEFT JOIN user_profiles p ON p.user_id = g.founder_user_id
       ORDER BY g.created_at DESC`
    );
    return { success: true, groups: res.rows };
  } catch (error: any) {
    return { success: false, groups: [], error: error.message || 'Server-Fehler' };
  }
}

export async function joinNetworkGroup(payload: { groupId: number; userId: number }) {
  try {
    await ensureExtraSchema();
    const groupId = Number(payload.groupId);
    const userId = Number(payload.userId);
    if (!Number.isInteger(groupId) || groupId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    const activeSanction = await getActiveSanction(userId, ['groups']);
    if (activeSanction) {
      return { success: false, error: `Du bist bis ${new Date(activeSanction.ends_at).toLocaleDateString('de-DE')} von Gruppen ausgeschlossen.` };
    }

    await pool.query(
      `INSERT INTO social_group_members (group_id, user_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function uploadNetworkMedia(userId: number, formData: FormData) {
  try {
    await ensureExtraSchema();
    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'Keine Datei gefunden.' };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public/uploads/network');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${validUserId}-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const mime = String(file.type || '').toLowerCase();
    const mediaType = mime.startsWith('video/') ? 'video' : 'image';
    return { success: true, url: `/uploads/network/${fileName}`, mediaType };
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload fehlgeschlagen.' };
  }
}

export async function createNetworkPost(payload: {
  userId: number;
  title: string;
  content: string;
  hashtags?: string;
  mediaItems?: Array<{ url: string; mediaType: 'image' | 'video' }>;
  groupId?: number | null;
  postTarget?: 'profile' | 'group';
}) {
  try {
    await ensureExtraSchema();

    const userId = Number(payload.userId);
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();
    const hashtags = normalizeHashtags(payload.hashtags || '');
    const hashtagLine = hashtags.length > 0 ? hashtags.map((tag) => `#${tag}`).join(' ') : '';
    const contentWithHashtags = hashtagLine ? `${content}\n\n${hashtagLine}` : content;
    const postTarget = payload.postTarget === 'group' ? 'group' : 'profile';
    const groupId = postTarget === 'group' && payload.groupId ? Number(payload.groupId) : null;
    const mediaItems = Array.isArray(payload.mediaItems)
      ? payload.mediaItems
          .filter((item) => item && typeof item.url === 'string' && item.url.trim())
          .map((item) => ({
            url: String(item.url).trim(),
            mediaType: item.mediaType === 'video' ? 'video' : 'image'
          }))
          .slice(0, 8)
      : [];

    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (!title) {
      return { success: false, error: 'Bitte Titel eingeben.' };
    }
    if (!content) {
      return { success: false, error: 'Bitte Inhalt eingeben.' };
    }

    if (postTarget === 'group') {
      const activeSanction = await getActiveSanction(userId, ['groups']);
      if (activeSanction) {
        return { success: false, error: `Du bist bis ${new Date(activeSanction.ends_at).toLocaleDateString('de-DE')} von Gruppenbeiträgen ausgeschlossen.` };
      }
    }

    if (postTarget === 'group' && (!groupId || !Number.isInteger(groupId) || groupId <= 0)) {
      return { success: false, error: 'Bitte eine Gruppe auswählen.' };
    }

    if (groupId && Number.isInteger(groupId) && groupId > 0) {
      const memberRes = await pool.query(
        `SELECT 1
         FROM social_group_members
         WHERE group_id = $1 AND user_id = $2
         LIMIT 1`,
        [groupId, userId]
      );
      if (memberRes.rows.length === 0) {
        return { success: false, error: 'Du musst Mitglied der Gruppe sein, um dort zu posten.' };
      }
    }

    const authorPlan = await getUserPlanDefinition(userId);

    if (!isPaidPlan(authorPlan)) {
      const monthlyPostCountRes = await pool.query(
        `SELECT COUNT(*)::INT AS count
         FROM social_posts
         WHERE author_user_id = $1
           AND created_at >= date_trunc('month', NOW())`,
        [userId]
      );
      const monthlyCount = Number(monthlyPostCountRes.rows[0]?.count || 0);
      if (monthlyCount >= FREE_MONTHLY_POST_LIMIT) {
        return { success: false, error: `Ohne Abo sind maximal ${FREE_MONTHLY_POST_LIMIT} Beitraege pro Monat moeglich.` };
      }
    }

    const moderationStatus = groupId ? 'pending' : 'approved';
    const moderationHours = groupId ? Math.max(24, Number(authorPlan.groupModerationHours || 48)) : 0;
    const moderationDeadline = groupId ? new Date(Date.now() + moderationHours * 60 * 60 * 1000).toISOString() : null;

    const insertRes = await pool.query(
      `INSERT INTO social_posts (
         author_user_id,
         group_id,
         title,
         content,
         hashtags,
         media_items,
         post_target,
         moderation_status,
         moderation_deadline
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        groupId,
        title,
        contentWithHashtags,
        hashtags,
        JSON.stringify(mediaItems),
        postTarget,
        moderationStatus,
        moderationDeadline
      ]
    );

    if (groupId) {
      const ownersRes = await pool.query(
        `SELECT user_id
         FROM social_group_members
         WHERE group_id = $1 AND role = 'owner' AND user_id <> $2`,
        [groupId, userId]
      );

      await Promise.all(
        ownersRes.rows.map((owner) =>
          createUserNotification(pool, {
            userId: Number(owner.user_id),
            title: 'Neuer Gruppenbeitrag wartet auf Freigabe',
            message: `Bitte innerhalb von ${moderationHours} Stunden moderieren. Danach wird der Beitrag automatisch veröffentlicht.`,
            href: '/netzwerk',
            notificationType: 'info'
          })
        )
      );
    }

    return { success: true, postId: insertRes.rows[0].id, moderationStatus };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getGroupModerationQueue(userId: number) {
  try {
    await ensureExtraSchema();
    await autoPublishExpiredGroupPosts();

    const viewerId = Number(userId);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, items: [], error: 'Ungültige Nutzer-ID.' };
    }

    const res = await pool.query(
      `SELECT p.id,
              p.title,
              p.content,
              p.created_at,
              p.moderation_deadline,
              p.hashtags,
              p.group_id,
              g.name AS group_name,
              u.vorname,
              u.nachname,
              u.role
       FROM social_posts p
       JOIN users u ON u.id = p.author_user_id
       JOIN social_groups g ON g.id = p.group_id
       WHERE p.group_id IS NOT NULL
         AND p.moderation_status = 'pending'
         AND EXISTS (
           SELECT 1
           FROM social_group_members gm
           WHERE gm.group_id = p.group_id
             AND gm.user_id = $1
             AND gm.role = 'owner'
         )
       ORDER BY p.created_at ASC`,
      [viewerId]
    );

    return { success: true, items: res.rows };
  } catch (error: any) {
    return { success: false, items: [], error: error.message || 'Server-Fehler' };
  }
}

export async function moderateGroupPost(payload: {
  postId: number;
  moderatorUserId: number;
  decision: 'approved' | 'rejected';
  rejectionReason?: string;
}) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const postId = Number(payload.postId);
    const moderatorUserId = Number(payload.moderatorUserId);
    const decision = payload.decision === 'rejected' ? 'rejected' : 'approved';
    const rejectionReason = String(payload.rejectionReason || '').trim();

    if (!Number.isInteger(postId) || postId <= 0 || !Number.isInteger(moderatorUserId) || moderatorUserId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (decision === 'rejected' && rejectionReason.length < 5) {
      return { success: false, error: 'Bitte bei Ablehnung einen Grund angeben.' };
    }

    await client.query('BEGIN');
    await autoPublishExpiredGroupPosts();

    const postRes = await client.query(
      `SELECT id, group_id, author_user_id, moderation_status, moderation_deadline
       FROM social_posts
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [postId]
    );

    if (postRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Beitrag nicht gefunden.' };
    }

    const post = postRes.rows[0];
    if (!post.group_id) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Nur Gruppenbeiträge können moderiert werden.' };
    }

    const ownerCheck = await client.query(
      `SELECT 1
       FROM social_group_members
       WHERE group_id = $1 AND user_id = $2 AND role = 'owner'
       LIMIT 1`,
      [post.group_id, moderatorUserId]
    );

    if (ownerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Nicht berechtigt.' };
    }

    if (String(post.moderation_status) !== 'pending') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Beitrag wurde bereits moderiert.' };
    }

    await client.query(
      `UPDATE social_posts
       SET moderation_status = $2,
           moderated_by_user_id = $3,
           moderated_at = NOW(),
           rejection_reason = $4
       WHERE id = $1`,
      [postId, decision, moderatorUserId, decision === 'rejected' ? rejectionReason : null]
    );

    await createUserNotification(client, {
      userId: Number(post.author_user_id),
      title: decision === 'approved' ? 'Gruppenbeitrag freigegeben' : 'Gruppenbeitrag abgelehnt',
      message: decision === 'approved' ? 'Dein Gruppenbeitrag wurde freigegeben.' : `Dein Gruppenbeitrag wurde abgelehnt: ${rejectionReason}`,
      href: '/netzwerk',
      notificationType: 'info'
    });

    await client.query('COMMIT');
    const deadlineExceeded = post.moderation_deadline ? new Date(post.moderation_deadline).getTime() < Date.now() : false;
    return { success: true, status: decision, deadlineExceeded };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function addNetworkPostComment(payload: { userId: number; postId: number; comment: string }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);
    const comment = String(payload.comment || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (comment.length < 2) {
      return { success: false, error: 'Kommentar ist zu kurz.' };
    }

    const access = await canUserAccessPost(userId, postId);
    if (!access.exists || !access.allowed) {
      return { success: false, error: 'Keine Berechtigung für diesen Beitrag.' };
    }

    await pool.query(
      `INSERT INTO social_post_comments (post_id, user_id, comment_text)
       VALUES ($1, $2, $3)`,
      [postId, userId, comment]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getNetworkPostComments(payload: { userId: number; postId: number; limit?: number }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);
    const limit = Math.min(Math.max(Number(payload.limit) || 20, 1), 100);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, items: [], error: 'Ungültige Daten.' };
    }

    const access = await canUserAccessPost(userId, postId);
    if (!access.exists || !access.allowed) {
      return { success: false, items: [], error: 'Keine Berechtigung für diesen Beitrag.' };
    }

    const res = await pool.query(
      `SELECT c.id,
              c.post_id,
              c.user_id,
              c.comment_text,
              c.created_at,
              u.vorname,
              u.nachname
       FROM social_post_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2`,
      [postId, limit]
    );

    return { success: true, items: res.rows };
  } catch (error: any) {
    return { success: false, items: [], error: error.message || 'Server-Fehler' };
  }
}

export async function toggleNetworkPostLike(payload: { userId: number; postId: number }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    const access = await canUserAccessPost(userId, postId);
    if (!access.exists || !access.allowed) {
      return { success: false, error: 'Keine Berechtigung für diesen Beitrag.' };
    }

    const existing = await pool.query(
      `SELECT 1 FROM social_post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId]
    );

    if (existing.rows.length > 0) {
      await pool.query(`DELETE FROM social_post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      const countRes = await pool.query(`SELECT COUNT(*)::INT AS total FROM social_post_likes WHERE post_id = $1`, [postId]);
      return { success: true, liked: false, likeCount: Number(countRes.rows[0]?.total || 0) };
    }

    await pool.query(
      `INSERT INTO social_post_likes (post_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [postId, userId]
    );

    const countRes = await pool.query(`SELECT COUNT(*)::INT AS total FROM social_post_likes WHERE post_id = $1`, [postId]);
    return { success: true, liked: true, likeCount: Number(countRes.rows[0]?.total || 0) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getNetworkPostSaveGroups(userId: number) {
  try {
    await ensureExtraSchema();
    const viewerId = Number(userId);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', groups: [] };
    }

    const res = await pool.query(
      `SELECT g.id,
              g.name,
              g.created_at,
              COALESCE(stats.post_count, 0)::INT AS post_count
       FROM social_saved_post_groups g
       LEFT JOIN (
         SELECT group_id, COUNT(*)::INT AS post_count
         FROM social_post_save_group_links
         WHERE user_id = $1
         GROUP BY group_id
       ) stats ON stats.group_id = g.id
       WHERE g.user_id = $1
       ORDER BY g.created_at DESC`,
      [viewerId]
    );

    return { success: true, groups: res.rows };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gruppen konnten nicht geladen werden.', groups: [] };
  }
}

export async function createNetworkPostSaveGroup(payload: { userId: number; name: string }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const name = String(payload.name || '').trim();
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }
    if (name.length < 2) {
      return { success: false, error: 'Gruppenname ist zu kurz.' };
    }

    const res = await pool.query(
      `INSERT INTO social_saved_post_groups (user_id, name)
       VALUES ($1, $2)
       ON CONFLICT (user_id, name)
       DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      [userId, name]
    );

    return { success: true, group: res.rows[0] || null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gruppe konnte nicht erstellt werden.' };
  }
}

export async function renameNetworkPostSaveGroup(payload: { userId: number; groupId: number; name: string }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const groupId = Number(payload.groupId);
    const name = String(payload.name || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(groupId) || groupId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (name.length < 2) {
      return { success: false, error: 'Gruppenname ist zu kurz.' };
    }

    const res = await pool.query(
      `UPDATE social_saved_post_groups
       SET name = $3
       WHERE id = $1 AND user_id = $2
       RETURNING id, name`,
      [groupId, userId, name]
    );

    if (res.rows.length === 0) {
      return { success: false, error: 'Gruppe nicht gefunden.' };
    }

    return { success: true, group: res.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gruppe konnte nicht umbenannt werden.' };
  }
}

export async function deleteNetworkPostSaveGroup(payload: { userId: number; groupId: number }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const groupId = Number(payload.groupId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(groupId) || groupId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    await pool.query(
      `DELETE FROM social_saved_post_groups
       WHERE id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gruppe konnte nicht gelöscht werden.' };
  }
}

export async function toggleNetworkPostSave(payload: { userId: number; postId: number; groupNames?: string[] }) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);
    const groupNames = Array.isArray(payload.groupNames)
      ? Array.from(new Set(payload.groupNames.map((name) => String(name || '').trim()).filter(Boolean))).slice(0, 12)
      : [];

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    const access = await canUserAccessPost(userId, postId);
    if (!access.exists || !access.allowed) {
      return { success: false, error: 'Keine Berechtigung für diesen Beitrag.' };
    }

    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT 1 FROM social_post_saves WHERE post_id = $1 AND user_id = $2 LIMIT 1`,
      [postId, userId]
    );

    if (existing.rows.length > 0 && groupNames.length === 0) {
      await client.query(`DELETE FROM social_post_save_group_links WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      await client.query(`DELETE FROM social_post_saves WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      const countRes = await client.query(`SELECT COUNT(*)::INT AS total FROM social_post_saves WHERE post_id = $1`, [postId]);
      await client.query('COMMIT');
      return { success: true, saved: false, saveCount: Number(countRes.rows[0]?.total || 0), assignedGroups: [] };
    }

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO social_post_saves (post_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userId]
      );
    }

    let assignedGroups: Array<{ id: number; name: string }> = [];
    if (groupNames.length > 0) {
      for (const name of groupNames) {
        const groupRes = await client.query(
          `INSERT INTO social_saved_post_groups (user_id, name)
           VALUES ($1, $2)
           ON CONFLICT (user_id, name)
           DO UPDATE SET name = EXCLUDED.name
           RETURNING id, name`,
          [userId, name]
        );
        const group = groupRes.rows[0];
        if (!group) continue;

        assignedGroups.push({ id: Number(group.id), name: String(group.name || '').trim() });
      }

      await client.query(`DELETE FROM social_post_save_group_links WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      for (const group of assignedGroups) {
        await client.query(
          `INSERT INTO social_post_save_group_links (user_id, post_id, group_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, post_id, group_id) DO NOTHING`,
          [userId, postId, group.id]
        );
      }
    }

    const countRes = await client.query(`SELECT COUNT(*)::INT AS total FROM social_post_saves WHERE post_id = $1`, [postId]);
    await client.query('COMMIT');
    return { success: true, saved: true, saveCount: Number(countRes.rows[0]?.total || 0), assignedGroups };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function reportNetworkPost(payload: { userId: number; postId: number; reason: string }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);
    const reason = String(payload.reason || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (reason.length < 5) {
      return { success: false, error: 'Bitte einen aussagekräftigen Meldegrund eingeben.' };
    }

    const access = await canUserAccessPost(userId, postId);
    if (!access.exists || !access.allowed) {
      return { success: false, error: 'Keine Berechtigung für diesen Beitrag.' };
    }

    await pool.query(
      `INSERT INTO social_post_reports (post_id, reporter_user_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, reporter_user_id)
       DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW(), status = 'open'`,
      [postId, userId, reason]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function reportPublicProfile(payload: { reporterUserId: number; profileUserId: number; reason: string }) {
  try {
    await ensureExtraSchema();
    const reporterUserId = Number(payload.reporterUserId);
    const profileUserId = Number(payload.profileUserId);
    const reason = String(payload.reason || '').trim();

    if (!Number.isInteger(reporterUserId) || reporterUserId <= 0 || !Number.isInteger(profileUserId) || profileUserId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (reporterUserId === profileUserId) {
      return { success: false, error: 'Eigenmeldungen sind nicht möglich.' };
    }
    if (reason.length < 5) {
      return { success: false, error: 'Bitte einen aussagekräftigen Meldegrund eingeben.' };
    }

    await pool.query(
      `INSERT INTO profile_reports (profile_user_id, reporter_user_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (profile_user_id, reporter_user_id)
       DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW(), status = 'open'`,
      [profileUserId, reporterUserId, reason]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getChatTranscriptForModeration(payload: { adminCode: string; reportId: number }) {
  try {
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', messages: [] };
    }

    await ensureExtraSchema();
    const reportId = Number(payload.reportId);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return { success: false, error: 'Ungültige Meldungs-ID.', messages: [] };
    }

    const reportRes = await pool.query(
      `SELECT chat_id
       FROM chat_reports
       WHERE id = $1
       LIMIT 1`,
      [reportId]
    );

    if (reportRes.rows.length === 0) {
      return { success: false, error: 'Meldung nicht gefunden.', messages: [] };
    }

    const chatId = Number(reportRes.rows[0].chat_id);
    const messagesRes = await pool.query(
      `SELECT m.id,
              m.sender_id,
              m.nachricht,
              m.created_at,
              u.vorname,
              u.nachname
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC
       LIMIT 250`,
      [chatId]
    );

    return { success: true, chatId, messages: messagesRes.rows };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', messages: [] };
  }
}

export async function adminFindUserByIdentity(adminCode: string, payload: { firstName: string; lastName: string; birthDate: string }) {
  try {
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', user: null };
    }

    await ensureExtraSchema();
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const birthDate = normalizeBirthDateInput(payload.birthDate);

    if (!firstName || !lastName || !birthDate) {
      return { success: false, error: 'Bitte Name und Geburtsdatum vollständig angeben.', user: null };
    }

    const res = await pool.query(
      `SELECT id, vorname, nachname, birth_date, email, role
       FROM users
       WHERE LOWER(TRIM(vorname)) = LOWER(TRIM($1))
         AND LOWER(TRIM(nachname)) = LOWER(TRIM($2))
         AND birth_date = $3::date
       LIMIT 1`,
      [firstName, lastName, birthDate]
    );

    return { success: true, user: res.rows[0] || null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', user: null };
  }
}

export async function adminApplyUserSanction(payload: {
  adminCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  action: 'warn' | 'global_block' | 'group_block' | 'abo_block' | 'temporary_block';
  durationDays?: number;
  reason: string;
}) {
  const client = await pool.connect();
  try {
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    await ensureExtraSchema();
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const birthDate = normalizeBirthDateInput(payload.birthDate);
    const reason = String(payload.reason || '').trim();
    const action = payload.action;
    const durationDays = Math.max(1, Math.min(3650, Number(payload.durationDays || 30)));

    if (!firstName || !lastName || !birthDate) {
      return { success: false, error: 'Bitte Name und Geburtsdatum vollständig angeben.' };
    }
    if (reason.length < 5) {
      return { success: false, error: 'Bitte einen Begründungstext angeben.' };
    }

    const userRes = await pool.query(
      `SELECT id, vorname, nachname
       FROM users
       WHERE LOWER(TRIM(vorname)) = LOWER(TRIM($1))
         AND LOWER(TRIM(nachname)) = LOWER(TRIM($2))
         AND birth_date = $3::date
       LIMIT 1`,
      [firstName, lastName, birthDate]
    );

    if (userRes.rows.length === 0) {
      return { success: false, error: 'Kein Nutzer mit diesen Daten gefunden.' };
    }

    const userId = Number(userRes.rows[0].id);

    await client.query('BEGIN');

    if (action === 'warn') {
      await client.query(
        `INSERT INTO user_moderation_state (user_id, warning_count, suspension_count, updated_at)
         VALUES ($1, COALESCE((SELECT warning_count FROM user_moderation_state WHERE user_id = $1), 0) + 1, COALESCE((SELECT suspension_count FROM user_moderation_state WHERE user_id = $1), 0), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           warning_count = user_moderation_state.warning_count + 1,
           updated_at = NOW()`,
        [userId]
      );

      await createUserNotification(client, {
        userId,
        title: 'Ermahnung erhalten',
        message: reason,
        href: '/einstellungen',
        notificationType: 'warning'
      });
    } else {
      const scope = action === 'group_block' ? 'groups' : action === 'abo_block' ? 'abo' : 'global';
      await addSanction(client, {
        userId,
        source: 'admin-panel',
        severity: 'strong',
        scope,
        reason,
        durationDays: action === 'temporary_block' ? durationDays : 3650,
        months: undefined
      });
    }

    await client.query('COMMIT');
    return { success: true, userId, action };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function shareNetworkPost(payload: { userId: number; postId: number; content?: string }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);
    const content = String(payload.content || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    const access = await canUserAccessPost(userId, postId);
    if (!access.exists || !access.allowed) {
      return { success: false, error: 'Keine Berechtigung für diesen Beitrag.' };
    }

    const sourceRes = await pool.query(
      `SELECT title, content
       FROM social_posts
       WHERE id = $1
       LIMIT 1`,
      [postId]
    );

    if (sourceRes.rows.length === 0) {
      return { success: false, error: 'Originalbeitrag nicht gefunden.' };
    }

    const source = sourceRes.rows[0];
    const shareTitle = `Geteilt: ${String(source.title || 'Beitrag').slice(0, 90)}`;
    const shareContent = content || `Interessanter Beitrag: ${String(source.content || '').slice(0, 400)}`;

    await pool.query(
      `INSERT INTO social_posts (
         author_user_id,
         group_id,
         title,
         content,
         hashtags,
         media_items,
         post_target,
         moderation_status,
         shared_post_id
       )
       VALUES ($1, NULL, $2, $3, ARRAY[]::TEXT[], '[]'::jsonb, 'profile', 'approved', $4)`,
      [userId, shareTitle, shareContent, postId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getProfilePosts(viewerUserId: number, profileUserId: number, limit = 20) {
  try {
    await ensureExtraSchema();
    await autoPublishExpiredGroupPosts();

    const viewerId = Number(viewerUserId);
    const profileId = Number(profileUserId);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 80);
    if (!Number.isInteger(profileId) || profileId <= 0 || !Number.isInteger(viewerId) || viewerId < 0) {
      return { success: false, posts: [], error: 'Ungültige Nutzer-ID.' };
    }

    const res = await pool.query(
      `SELECT p.id,
              p.author_user_id,
              p.group_id,
              p.title,
              p.content,
              p.hashtags,
              p.media_items,
              p.post_target,
              p.moderation_status,
              p.rejection_reason,
              p.created_at,
              u.vorname,
              u.nachname,
              u.role,
              COALESCE(sc.comment_count, 0) AS comment_count,
              COALESCE(ss.save_count, 0) AS save_count,
              COALESCE(sl.like_count, 0) AS like_count,
              EXISTS (
                SELECT 1
                FROM social_post_likes splv
                WHERE splv.post_id = p.id
                  AND splv.user_id = $1
              ) AS liked_by_viewer
       FROM social_posts p
       JOIN users u ON u.id = p.author_user_id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS comment_count
         FROM social_post_comments
         GROUP BY post_id
       ) sc ON sc.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS save_count
         FROM social_post_saves
         GROUP BY post_id
       ) ss ON ss.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS like_count
         FROM social_post_likes
         GROUP BY post_id
       ) sl ON sl.post_id = p.id
       WHERE p.author_user_id = $2
         AND p.group_id IS NULL
         AND (
           p.moderation_status = 'approved'
           OR p.author_user_id = $1
         )
       ORDER BY p.created_at DESC
       LIMIT $3`,
      [viewerId, profileId, safeLimit]
    );

    if (viewerId > 0) {
      await trackSocialPostViews({
        viewerUserId: viewerId,
        postIds: res.rows.map((row: any) => Number(row.id)).filter((postId: number) => Number.isInteger(postId) && postId > 0)
      });
    }

    return { success: true, posts: res.rows };
  } catch (error: any) {
    return { success: false, posts: [], error: error.message || 'Server-Fehler' };
  }
}

export async function getNetworkFeed(userId: number, limit = 40) {
  try {
    await ensureExtraSchema();
    await autoPublishExpiredGroupPosts();
    const viewerId = Number(userId);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, posts: [], error: 'Ungültige Nutzer-ID.' };
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const res = await pool.query(
      `SELECT p.id,
              p.author_user_id,
              p.group_id,
              p.title,
              p.content,
              p.hashtags,
              p.media_items,
              p.post_target,
              p.moderation_status,
              p.moderation_deadline,
              p.rejection_reason,
              p.shared_post_id,
              p.created_at,
              u.vorname,
              u.nachname,
              u.role,
              g.name AS group_name,
              COALESCE(sc.comment_count, 0) AS comment_count,
              COALESCE(ss.save_count, 0) AS save_count,
              COALESCE(sl.like_count, 0) AS like_count,
              COALESCE(sr.report_count, 0) AS report_count,
              EXISTS (
                SELECT 1
                FROM social_post_saves ssv
                WHERE ssv.post_id = p.id
                  AND ssv.user_id = $1
              ) AS saved_by_viewer,
              EXISTS (
                SELECT 1
                FROM social_post_likes splv
                WHERE splv.post_id = p.id
                  AND splv.user_id = $1
              ) AS liked_by_viewer,
              COALESCE(viewer_save_groups.group_names, ARRAY[]::TEXT[]) AS save_group_names,
              (
                CASE
                  WHEN p.author_user_id = $1 THEN 100
                  WHEN EXISTS (
                    SELECT 1
                    FROM social_connections scn
                    WHERE scn.status = 'accepted'
                      AND (
                        (scn.requester_user_id = $1 AND scn.addressee_user_id = p.author_user_id)
                        OR
                        (scn.addressee_user_id = $1 AND scn.requester_user_id = p.author_user_id)
                      )
                  ) THEN 24
                  ELSE 0
                END
                + COALESCE(author_interactions.interaction_score, 0)
                + COALESCE(topic_overlap.topic_score, 0)
              ) AS relevance_score,
              EXISTS (
                SELECT 1
                FROM social_group_members gm_owner
                WHERE gm_owner.group_id = p.group_id
                  AND gm_owner.user_id = $1
                  AND gm_owner.role = 'owner'
              ) AS can_moderate,
              su.vorname AS shared_author_vorname,
              su.nachname AS shared_author_nachname,
              sp.title AS shared_title
       FROM social_posts p
       JOIN users u ON u.id = p.author_user_id
       LEFT JOIN social_groups g ON g.id = p.group_id
       LEFT JOIN social_posts sp ON sp.id = p.shared_post_id
       LEFT JOIN users su ON su.id = sp.author_user_id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS comment_count
         FROM social_post_comments
         GROUP BY post_id
       ) sc ON sc.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS save_count
         FROM social_post_saves
         GROUP BY post_id
       ) ss ON ss.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS like_count
         FROM social_post_likes
         GROUP BY post_id
       ) sl ON sl.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS report_count
         FROM social_post_reports
         GROUP BY post_id
       ) sr ON sr.post_id = p.id
       LEFT JOIN LATERAL (
         SELECT ARRAY_AGG(g.name ORDER BY g.name)::TEXT[] AS group_names
         FROM social_post_save_group_links l
         JOIN social_saved_post_groups g ON g.id = l.group_id
         WHERE l.user_id = $1
           AND l.post_id = p.id
       ) viewer_save_groups ON TRUE
       LEFT JOIN LATERAL (
         SELECT (
           COALESCE((
             SELECT COUNT(*)::INT * 3
             FROM social_post_likes il
             JOIN social_posts ip ON ip.id = il.post_id
             WHERE il.user_id = $1
               AND ip.author_user_id = p.author_user_id
               AND il.created_at >= NOW() - INTERVAL '120 days'
           ), 0)
           + COALESCE((
             SELECT COUNT(*)::INT * 2
             FROM social_post_saves isv
             JOIN social_posts ip ON ip.id = isv.post_id
             WHERE isv.user_id = $1
               AND ip.author_user_id = p.author_user_id
               AND isv.created_at >= NOW() - INTERVAL '120 days'
           ), 0)
           + COALESCE((
             SELECT COUNT(*)::INT
             FROM social_post_comments ic
             JOIN social_posts ip ON ip.id = ic.post_id
             WHERE ic.user_id = $1
               AND ip.author_user_id = p.author_user_id
               AND ic.created_at >= NOW() - INTERVAL '120 days'
           ), 0)
         )::INT AS interaction_score
       ) author_interactions ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::INT AS topic_score
         FROM (
           SELECT DISTINCT lower(tag) AS tag
           FROM (
             SELECT UNNEST(COALESCE(ip.hashtags, ARRAY[]::TEXT[])) AS tag
             FROM social_post_likes il
             JOIN social_posts ip ON ip.id = il.post_id
             WHERE il.user_id = $1
               AND il.created_at >= NOW() - INTERVAL '180 days'
             UNION ALL
             SELECT UNNEST(COALESCE(ip.hashtags, ARRAY[]::TEXT[])) AS tag
             FROM social_post_saves isv
             JOIN social_posts ip ON ip.id = isv.post_id
             WHERE isv.user_id = $1
               AND isv.created_at >= NOW() - INTERVAL '180 days'
             UNION ALL
             SELECT UNNEST(COALESCE(ip.hashtags, ARRAY[]::TEXT[])) AS tag
             FROM social_post_comments ic
             JOIN social_posts ip ON ip.id = ic.post_id
             WHERE ic.user_id = $1
               AND ic.created_at >= NOW() - INTERVAL '180 days'
           ) tags
           WHERE tag IS NOT NULL AND tag <> ''
         ) pref
         WHERE pref.tag = ANY(COALESCE(p.hashtags, ARRAY[]::TEXT[]))
       ) topic_overlap ON TRUE
       WHERE (
         p.author_user_id = $1
         OR (
           p.moderation_status = 'approved'
           AND (
             p.group_id IS NULL
             OR EXISTS (
               SELECT 1
               FROM social_group_members gm
               WHERE gm.group_id = p.group_id
                 AND gm.user_id = $1
             )
           )
         )
         OR (
           p.group_id IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM social_group_members gm_owner
             WHERE gm_owner.group_id = p.group_id
               AND gm_owner.user_id = $1
               AND gm_owner.role = 'owner'
           )
         )
       )
       ORDER BY relevance_score DESC,
                COALESCE(sl.like_count, 0) DESC,
                COALESCE(sc.comment_count, 0) DESC,
                p.created_at DESC
       LIMIT $2`,
      [viewerId, safeLimit]
    );

    await trackSocialPostViews({
      viewerUserId: viewerId,
      postIds: res.rows.map((row: any) => Number(row.id)).filter((postId: number) => Number.isInteger(postId) && postId > 0)
    });

    return { success: true, posts: res.rows };
  } catch (error: any) {
    return { success: false, posts: [], error: error.message || 'Server-Fehler' };
  }
}

export async function getSavedNetworkPosts(userId: number, limit = 80) {
  try {
    await ensureExtraSchema();
    await autoPublishExpiredGroupPosts();

    const viewerId = Number(userId);
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 120);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, posts: [], error: 'Ungültige Nutzer-ID.' };
    }

    const res = await pool.query(
      `SELECT p.id,
              p.author_user_id,
              p.group_id,
              p.title,
              p.content,
              p.hashtags,
              p.media_items,
              p.post_target,
              p.moderation_status,
              p.moderation_deadline,
              p.rejection_reason,
              p.shared_post_id,
              p.created_at,
              u.vorname,
              u.nachname,
              u.role,
              g.name AS group_name,
              COALESCE(sc.comment_count, 0) AS comment_count,
              COALESCE(ss.save_count, 0) AS save_count,
              COALESCE(sl.like_count, 0) AS like_count,
              COALESCE(sr.report_count, 0) AS report_count,
              TRUE AS saved_by_viewer,
              EXISTS (
                SELECT 1
                FROM social_post_likes splv
                WHERE splv.post_id = p.id
                  AND splv.user_id = $1
              ) AS liked_by_viewer,
              COALESCE(viewer_save_groups.group_names, ARRAY[]::TEXT[]) AS save_group_names,
              EXISTS (
                SELECT 1
                FROM social_group_members gm_owner
                WHERE gm_owner.group_id = p.group_id
                  AND gm_owner.user_id = $1
                  AND gm_owner.role = 'owner'
              ) AS can_moderate,
              su.vorname AS shared_author_vorname,
              su.nachname AS shared_author_nachname,
              sp.title AS shared_title,
              sv.created_at AS saved_at
       FROM social_post_saves sv
       JOIN social_posts p ON p.id = sv.post_id
       JOIN users u ON u.id = p.author_user_id
       LEFT JOIN social_groups g ON g.id = p.group_id
       LEFT JOIN social_posts sp ON sp.id = p.shared_post_id
       LEFT JOIN users su ON su.id = sp.author_user_id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS comment_count
         FROM social_post_comments
         GROUP BY post_id
       ) sc ON sc.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS save_count
         FROM social_post_saves
         GROUP BY post_id
       ) ss ON ss.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS like_count
         FROM social_post_likes
         GROUP BY post_id
       ) sl ON sl.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS report_count
         FROM social_post_reports
         GROUP BY post_id
       ) sr ON sr.post_id = p.id
       LEFT JOIN LATERAL (
         SELECT ARRAY_AGG(g.name ORDER BY g.name)::TEXT[] AS group_names
         FROM social_post_save_group_links l
         JOIN social_saved_post_groups g ON g.id = l.group_id
         WHERE l.user_id = $1
           AND l.post_id = p.id
       ) viewer_save_groups ON TRUE
       WHERE sv.user_id = $1
         AND (
           p.author_user_id = $1
           OR (
             p.moderation_status = 'approved'
             AND (
               p.group_id IS NULL
               OR EXISTS (
                 SELECT 1
                 FROM social_group_members gm
                 WHERE gm.group_id = p.group_id
                   AND gm.user_id = $1
               )
             )
           )
           OR (
             p.group_id IS NOT NULL
             AND EXISTS (
               SELECT 1
               FROM social_group_members gm_owner
               WHERE gm_owner.group_id = p.group_id
                 AND gm_owner.user_id = $1
                 AND gm_owner.role = 'owner'
             )
           )
         )
       ORDER BY sv.created_at DESC
       LIMIT $2`,
      [viewerId, safeLimit]
    );

    await trackSocialPostViews({
      viewerUserId: viewerId,
      postIds: res.rows.map((row: any) => Number(row.id)).filter((postId: number) => Number.isInteger(postId) && postId > 0)
    });

    return { success: true, posts: res.rows };
  } catch (error: any) {
    return { success: false, posts: [], error: error.message || 'Server-Fehler' };
  }
}

export async function reportChatConversation(payload: {
  chatId: number;
  reporterUserId: number;
  reportedUserId: number;
  reason: string;
  severity: 'normal' | 'strong' | 'animal_abuse';
}) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const chatId = Number(payload.chatId);
    const reporterUserId = Number(payload.reporterUserId);
    const reportedUserId = Number(payload.reportedUserId);
    const reason = String(payload.reason || '').trim();
    const severity = payload.severity === 'animal_abuse' ? 'animal_abuse' : payload.severity === 'strong' ? 'strong' : 'normal';

    if (!Number.isInteger(chatId) || chatId <= 0 || !Number.isInteger(reporterUserId) || reporterUserId <= 0 || !Number.isInteger(reportedUserId) || reportedUserId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (reporterUserId === reportedUserId) {
      return { success: false, error: 'Selbstmeldung ist nicht möglich.' };
    }
    if (reason.length < 5) {
      return { success: false, error: 'Bitte einen nachvollziehbaren Meldegrund angeben.' };
    }

    const membership = await client.query(
      `SELECT user_one, user_two
       FROM chats
       WHERE id = $1
       LIMIT 1`,
      [chatId]
    );
    if (membership.rows.length === 0) {
      return { success: false, error: 'Chat nicht gefunden.' };
    }

    const row = membership.rows[0];
    const memberIds = [Number(row.user_one), Number(row.user_two)];
    if (!memberIds.includes(reporterUserId) || !memberIds.includes(reportedUserId)) {
      return { success: false, error: 'Meldung nur zwischen Chat-Teilnehmern möglich.' };
    }

    await client.query('BEGIN');

    const reportRes = await client.query(
      `INSERT INTO chat_reports (
         chat_id,
         reporter_user_id,
         reported_user_id,
         reason,
         severity,
         category,
         status,
         created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', NOW())
       RETURNING id`,
      [chatId, reporterUserId, reportedUserId, reason, severity, severity === 'animal_abuse' ? 'animal_abuse' : 'general']
    );

    const reportId = Number(reportRes.rows[0].id);

    let result: any;
    if (severity === 'animal_abuse') {
      const voteEnd = new Date();
      voteEnd.setDate(voteEnd.getDate() + 7);

      const caseRes = await client.query(
        `INSERT INTO animal_welfare_cases (
           chat_report_id,
           accused_user_id,
           reporter_user_id,
           title,
           description,
           status,
           vote_end_at
         )
         VALUES ($1, $2, $3, $4, $5, 'voting', $6)
         RETURNING id`,
        [reportId, reportedUserId, reporterUserId, 'Tierwohl-Vorwurf aus Chat-Meldung', reason, voteEnd.toISOString()]
      );

      await createUserNotification(client, {
        userId: reportedUserId,
        title: 'Tierwohl-Fall in öffentlicher Abstimmung',
        message: 'Du kannst auf der Startseite ein Statement zum Fall abgeben.',
        href: '/',
        notificationType: 'warning'
      });

      result = { action: 'animal_case_opened', caseId: Number(caseRes.rows[0].id), voteEnd };
    } else {
      result = await applyNoTolerancePolicy(client, {
        reportedUserId,
        severity,
        reason,
        sourceRef: `chat-report-${reportId}`
      });
    }

    await client.query('COMMIT');
    return { success: true, reportId, result };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function submitAnimalWelfareStatement(payload: { userId: number; caseId: number; statement: string }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const caseId = Number(payload.caseId);
    const statement = String(payload.statement || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(caseId) || caseId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (statement.length < 10) {
      return { success: false, error: 'Statement bitte etwas ausführlicher verfassen.' };
    }

    const updated = await pool.query(
      `UPDATE animal_welfare_cases
       SET accused_statement = $3
       WHERE id = $1
         AND accused_user_id = $2
         AND status = 'voting'
       RETURNING id`,
      [caseId, userId, statement]
    );

    if (updated.rows.length === 0) {
      return { success: false, error: 'Statement aktuell nicht möglich.' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function submitAnimalWelfareVote(payload: { userId: number; caseId: number; vote: 'yes' | 'no' }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const caseId = Number(payload.caseId);
    const vote = payload.vote === 'yes' ? 'yes' : 'no';

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(caseId) || caseId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    const caseRes = await pool.query(
      `SELECT id
       FROM animal_welfare_cases
       WHERE id = $1
         AND status = 'voting'
         AND vote_end_at > NOW()
       LIMIT 1`,
      [caseId]
    );
    if (caseRes.rows.length === 0) {
      return { success: false, error: 'Abstimmung ist beendet oder Fall nicht aktiv.' };
    }

    await pool.query(
      `INSERT INTO animal_welfare_votes (case_id, voter_user_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (case_id, voter_user_id)
       DO UPDATE SET vote = EXCLUDED.vote, created_at = NOW()`,
      [caseId, userId, vote]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function rateUser(payload: { raterUserId: number; ratedUserId: number; rating: number; comment?: string; offerId?: string; offerTitle?: string }) {
  try {
    await ensureExtraSchema();
    const raterUserId = Number(payload.raterUserId);
    const ratedUserId = Number(payload.ratedUserId);
    const rating = Math.max(1, Math.min(5, Number(payload.rating) || 0));
    const comment = String(payload.comment || '').trim();
    const offerId = String(payload.offerId || '').trim();
    const offerTitleInput = String(payload.offerTitle || '').trim();

    if (!Number.isInteger(raterUserId) || raterUserId <= 0 || !Number.isInteger(ratedUserId) || ratedUserId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (raterUserId === ratedUserId) {
      return { success: false, error: 'Selbstbewertung ist nicht erlaubt.' };
    }

    const ratedProfileRes = await pool.query(
      `SELECT u.role,
              p.profil_data
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [ratedUserId]
    );

    if (ratedProfileRes.rows.length === 0) {
      return { success: false, error: 'Profil nicht gefunden.' };
    }

    const ratedRole = String(ratedProfileRes.rows[0]?.role || '').trim().toLowerCase();
    const ratedProfilData = ratedProfileRes.rows[0]?.profil_data && typeof ratedProfileRes.rows[0]?.profil_data === 'object'
      ? ratedProfileRes.rows[0].profil_data
      : {};
    const offeredItems = Array.isArray(ratedProfilData?.angeboteAnzeigen) ? ratedProfilData.angeboteAnzeigen : [];

    let resolvedOfferId: string | null = null;
    let resolvedOfferTitle: string | null = null;
    let isVerifiedBooking = false;
    let verifiedBookingId: number | null = null;

    if (ratedRole === 'experte') {
      if (offeredItems.length === 0) {
        return { success: false, error: 'Bewertung ist erst möglich, wenn ein Angebot veröffentlicht wurde.' };
      }
      if (!offerId) {
        return { success: false, error: 'Bitte das wahrgenommene Angebot auswählen.' };
      }

      const matchedOffer = offeredItems.find((item: any) => String(item?.id || '').trim() === offerId);
      if (!matchedOffer) {
        return { success: false, error: 'Das ausgewählte Angebot ist ungültig.' };
      }

      resolvedOfferId = offerId;
      resolvedOfferTitle = String(matchedOffer?.titel || matchedOffer?.kategorie || '').trim() || offerTitleInput || 'Angebot';

      const verifiedBookingRes = await pool.query(
        `SELECT id
         FROM expert_student_bookings
         WHERE expert_id = $1
           AND student_id = $2
           AND status IN ('bestaetigt', 'abgerechnet')
           AND COALESCE(customer_total_cents, total_cents, 0) > 0
           AND (
             source_offer_id = $3
             OR (source_offer_id IS NULL AND LOWER(TRIM(service_title)) = LOWER(TRIM($4)))
           )
         ORDER BY booking_date DESC, created_at DESC
         LIMIT 1`,
        [ratedUserId, raterUserId, resolvedOfferId, resolvedOfferTitle || '']
      );

      if (verifiedBookingRes.rows.length > 0) {
        isVerifiedBooking = true;
        verifiedBookingId = Number(verifiedBookingRes.rows[0]?.id || 0) || null;
      }
    }

    await pool.query(
      `INSERT INTO user_ratings (rater_user_id, rated_user_id, rating, comment, offer_id, offer_title, is_verified_booking, verified_booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (rater_user_id, rated_user_id)
       DO UPDATE SET rating = EXCLUDED.rating,
                     comment = EXCLUDED.comment,
                     offer_id = EXCLUDED.offer_id,
                     offer_title = EXCLUDED.offer_title,
                     is_verified_booking = EXCLUDED.is_verified_booking,
                     verified_booking_id = EXCLUDED.verified_booking_id,
                     created_at = NOW()`,
      [raterUserId, ratedUserId, rating, comment || null, resolvedOfferId, resolvedOfferTitle, isVerifiedBooking, verifiedBookingId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function adminGrantEarlyAccess(payload: {
  adminCode: string;
  userId: number;
  hoursToAdd?: number;
}) {
  try {
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht authentifiziert.' };
    }

    await ensureExtraSchema();

    const uId = Number(payload.userId);
    if (!Number.isInteger(uId) || uId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    const hours = Math.max(1, Math.min(720, Number(payload.hoursToAdd || 24)));
    const earlyAccessUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

    await pool.query(
      `UPDATE user_subscriptions SET early_access_granted_until = $2 WHERE user_id = $1`,
      [uId, earlyAccessUntil.toISOString()]
    );

    await createUserNotification(pool, {
      userId: uId,
      title: 'Früher Zugriff aktiviert',
      message: `Du hast ${hours}h Frühzugriff auf neue Angebote erhalten.`,
      href: '/suche',
      notificationType: 'admin_grant',
    });

    return {
      success: true,
      message: `Frühzugriff bis ${earlyAccessUntil.toLocaleString('de-DE')} gewährt.`,
      expiresAt: earlyAccessUntil.toISOString(),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Fehler beim Gewähren des Frühzugriffs.' };
  }
}

export async function adminRevokeEarlyAccess(payload: {
  adminCode: string;
  userId: number;
}) {
  try {
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht authentifiziert.' };
    }

    await ensureExtraSchema();

    const uId = Number(payload.userId);
    if (!Number.isInteger(uId) || uId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    await pool.query(
      `UPDATE user_subscriptions SET early_access_granted_until = NULL WHERE user_id = $1`,
      [uId]
    );

    return {
      success: true,
      message: 'Frühzugriff widerrufen.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Fehler beim Widerrufen des Frühzugriffs.' };
  }
}

export async function getEarlyAccessAnalytics(adminCode: string) {
  try {
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht authentifiziert.', data: null };
    }

    await ensureExtraSchema();

    // Count by plan and early access status
    const planRes = await pool.query(
      `SELECT
         plan_key,
         COUNT(*) FILTER (WHERE early_access_granted_until > NOW())::INT AS active_early_access,
         COUNT(*)::INT AS total_users,
         COUNT(*) FILTER (WHERE early_access_granted_until IS NOT NULL)::INT AS ever_granted
       FROM user_subscriptions
       GROUP BY plan_key
       ORDER BY plan_key ASC`
    );

    // Find soonest expiries
    const expiryRes = await pool.query(
      `SELECT
         user_id,
         early_access_granted_until,
         plan_key,
         us.role
       FROM user_subscriptions us
       WHERE early_access_granted_until IS NOT NULL
         AND early_access_granted_until > NOW()
       ORDER BY early_access_granted_until ASC
       LIMIT 10`
    );

    return {
      success: true,
      data: {
        byPlan: planRes.rows || [],
        soonestExpiries: expiryRes.rows || [],
        totalActiveEarlyAccess: (planRes.rows || []).reduce((sum: number, row: any) => sum + (row.active_early_access || 0), 0),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Fehler beim Laden der Analysen.', data: null };
  }
}

export async function getHomeHubData(viewerUserId?: number | null) {
  try {
    await ensureExtraSchema();
    await resolveExpiredAnimalWelfareCases();

    const viewerId = Number(viewerUserId);
    const hasViewer = Number.isInteger(viewerId) && viewerId > 0;

    const newcomersRes = await pool.query(
      `SELECT u.id,
              u.vorname,
              u.nachname,
              u.role,
              u.verifiziert,
              p.display_name,
              COALESCE(p.ort, u.privat_ort, u.stall_ort) AS ort
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.role = 'experte'
       ORDER BY u.id DESC
       LIMIT 10`
    );

    let viewerOrt = '';
    let viewerOrtDisplay: string | null = null;
    if (hasViewer) {
      const viewerLocationRes = await pool.query(
        `SELECT LOWER(TRIM(COALESCE(p.ort, u.privat_ort, u.stall_ort, ''))) AS viewer_ort,
                NULLIF(TRIM(COALESCE(p.ort, u.privat_ort, u.stall_ort, '')), '') AS viewer_ort_display
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [viewerId]
      );
      viewerOrt = String(viewerLocationRes.rows[0]?.viewer_ort || '').trim();
      viewerOrtDisplay = viewerLocationRes.rows[0]?.viewer_ort_display || null;
    }

    const topTenRes = await pool.query(
      `SELECT u.id,
              u.vorname,
              u.nachname,
              u.role,
              u.verifiziert,
              p.display_name,
              COALESCE(p.ort, u.privat_ort, u.stall_ort) AS ort,
              CASE WHEN us.homepage_marketing_until IS NOT NULL AND us.homepage_marketing_until > NOW() THEN TRUE ELSE FALSE END AS homepage_promoted,
              CASE
                WHEN $1 <> '' AND LOWER(TRIM(COALESCE(p.ort, u.privat_ort, u.stall_ort, ''))) = $1 THEN 'Gleicher Ort'
                WHEN LOWER(TRIM(COALESCE(p.ort, u.privat_ort, u.stall_ort, ''))) <> '' THEN 'Nahe Region'
                ELSE 'Ort unbekannt'
              END AS nearby_reason,
              CASE
                WHEN us.homepage_marketing_until IS NOT NULL AND us.homepage_marketing_until > NOW() THEN 5
                WHEN $1 <> '' AND LOWER(TRIM(COALESCE(p.ort, u.privat_ort, u.stall_ort, ''))) = $1 THEN 3
                WHEN LOWER(TRIM(COALESCE(p.ort, u.privat_ort, u.stall_ort, ''))) <> '' THEN 1
                ELSE 0
              END AS nearby_score
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       WHERE u.role = 'experte'
         AND ($2 = 0 OR u.id <> $2)
       ORDER BY nearby_score DESC,
                u.verifiziert DESC,
                u.id DESC
       LIMIT 10`,
      [viewerOrt, hasViewer ? viewerId : 0]
    );

    let weeklyAdsRes;
    try {
      weeklyAdsRes = await pool.query(
        `SELECT u.id,
                u.vorname,
                u.nachname,
                u.verifiziert,
                p.display_name,
                COALESCE(p.ort, u.privat_ort, u.stall_ort) AS ort,
                vp.label,
                vp.ends_at,
                COALESCE(NULLIF(TRIM(p.angebot_text), ''), NULLIF(TRIM(p.profil_data->>'freitextBeschreibung'), ''), 'Expertenprofil mit Startseitenwerbung') AS teaser
         FROM visibility_promotions vp
         JOIN users u ON u.id = vp.user_id
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE vp.scope = 'wochenwerbung'
           AND vp.ends_at > NOW()
         ORDER BY vp.ends_at DESC, u.verifiziert DESC, u.id DESC
         LIMIT 6`
      );
    } catch (_) {
      weeklyAdsRes = { rows: [] as any[] };
    }

    const managedAdsRes = await pool.query(
      `SELECT s.id,
              s.title,
              s.description,
              s.media_url,
              s.target_url,
              s.placement_slot,
              s.placement_order,
              s.visible_from,
              s.visible_until,
              s.reviewed_at,
              u.vorname,
              u.nachname,
              u.verifiziert,
              p.display_name
       FROM user_advertising_submissions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE s.status = 'approved'
         AND s.placement_enabled = TRUE
         AND s.placement_slot <> 'none'
         AND (s.visible_from IS NULL OR s.visible_from <= NOW())
         AND (s.visible_until IS NULL OR s.visible_until >= NOW())
       ORDER BY
         CASE s.placement_slot
           WHEN 'startseite_top' THEN 0
           WHEN 'startseite_sidebar' THEN 1
           ELSE 9
         END ASC,
         s.placement_order ASC,
         s.reviewed_at DESC,
         s.created_at DESC
       LIMIT 20`
    );

    const welfareRes = await pool.query(
      `SELECT c.id,
              c.accused_user_id,
              c.title,
              c.description,
              c.video_url,
              c.accused_statement,
              c.status,
              c.vote_end_at,
              c.public_note,
              c.created_at,
              au.vorname AS accused_vorname,
              au.nachname AS accused_nachname,
              COALESCE(v.yes_count, 0) AS yes_count,
              COALESCE(v.no_count, 0) AS no_count,
              CASE WHEN $1 > 0 THEN EXISTS (
                SELECT 1 FROM animal_welfare_votes av
                WHERE av.case_id = c.id AND av.voter_user_id = $1
              ) ELSE FALSE END AS voted_by_viewer
       FROM animal_welfare_cases c
       JOIN users au ON au.id = c.accused_user_id
       LEFT JOIN (
         SELECT case_id,
                COUNT(*) FILTER (WHERE vote = 'yes')::INT AS yes_count,
                COUNT(*) FILTER (WHERE vote = 'no')::INT AS no_count
         FROM animal_welfare_votes
         GROUP BY case_id
       ) v ON v.case_id = c.id
       WHERE c.status IN ('voting', 'suspended', 'cleared')
       ORDER BY
         CASE c.status WHEN 'voting' THEN 0 WHEN 'suspended' THEN 1 ELSE 2 END,
         c.created_at DESC
       LIMIT 12`,
      [hasViewer ? viewerId : 0]
    );

    return {
      success: true,
      viewerOrt: viewerOrtDisplay,
      newcomers: newcomersRes.rows,
      topTen: topTenRes.rows,
      weeklyAds: weeklyAdsRes.rows,
      managedAds: managedAdsRes.rows,
      wallOfShame: welfareRes.rows
    };
  } catch (error: any) {
    return { success: false, viewerOrt: null, newcomers: [], topTen: [], weeklyAds: [], managedAds: [], wallOfShame: [], error: error.message || 'Server-Fehler' };
  }
}

export async function reviewAnimalWelfareCase(payload: {
  adminCode: string;
  caseId: number;
  outcome: 'suspend' | 'clear';
  note?: string;
}) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const caseId = Number(payload.caseId);
    const outcome = payload.outcome === 'suspend' ? 'suspend' : 'clear';
    const note = String(payload.note || '').trim();

    await client.query('BEGIN');

    const caseRes = await client.query(
      `SELECT id, accused_user_id, title, status
       FROM animal_welfare_cases
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [caseId]
    );
    if (caseRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Fall nicht gefunden.' };
    }

    const item = caseRes.rows[0];
    if (String(item.status) !== 'voting') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Fall wurde bereits entschieden.' };
    }

    if (outcome === 'suspend') {
      const endsAt = await addSanction(client, {
        userId: Number(item.accused_user_id),
        source: `animal-case-${item.id}`,
        severity: 'animal_abuse',
        reason: `Admin-Entscheidung Tierwohlfall: ${item.title}${note ? ` - ${note}` : ''}`,
        months: 6
      });

      await client.query(
        `UPDATE animal_welfare_cases
         SET status = 'suspended',
             resolved_at = NOW(),
             public_note = $2
         WHERE id = $1`,
        [caseId, `Entscheidung: 6 Monate Sperre bis ${endsAt.toLocaleDateString('de-DE')}.`]
      );
    } else {
      await client.query(
        `UPDATE animal_welfare_cases
         SET status = 'cleared',
             resolved_at = NOW(),
             public_note = $2
         WHERE id = $1`,
        [caseId, `Vorwurf wurde nicht bestätigt.${note ? ` ${note}` : ''}`]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function getModerationDashboard(adminCode: string) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', reports: [], profileReports: [], cases: [], sanctions: [] };
    }

    await resolveExpiredAnimalWelfareCases();

    const [reportsRes, profileReportsRes, casesRes, sanctionsRes] = await Promise.all([
      pool.query(
        `SELECT r.id,
                r.chat_id,
                r.reporter_user_id,
                r.reported_user_id,
                r.reason,
                r.severity,
                r.status,
                r.false_accusation,
                r.review_note,
                r.created_at,
                rp.vorname AS reporter_vorname,
                rp.nachname AS reporter_nachname,
                ru.vorname AS reported_vorname,
                ru.nachname AS reported_nachname
         FROM chat_reports r
         JOIN users rp ON rp.id = r.reporter_user_id
         JOIN users ru ON ru.id = r.reported_user_id
         ORDER BY r.created_at DESC
         LIMIT 200`
      ),
      pool.query(
        `SELECT r.id,
             r.profile_user_id,
             r.reporter_user_id,
             r.reason,
             r.status,
             r.created_at,
             rp.vorname AS reporter_vorname,
             rp.nachname AS reporter_nachname,
             ru.vorname AS reported_vorname,
             ru.nachname AS reported_nachname,
             ru.birth_date AS reported_birth_date
        FROM profile_reports r
        JOIN users rp ON rp.id = r.reporter_user_id
        JOIN users ru ON ru.id = r.profile_user_id
        ORDER BY r.created_at DESC
        LIMIT 200`
      ),
      pool.query(
        `SELECT c.id,
                c.accused_user_id,
                c.title,
                c.description,
                c.status,
                c.vote_end_at,
                c.public_note,
                c.created_at,
                u.vorname,
                u.nachname,
                COALESCE(v.yes_count, 0) AS yes_count,
                COALESCE(v.no_count, 0) AS no_count
         FROM animal_welfare_cases c
         JOIN users u ON u.id = c.accused_user_id
         LEFT JOIN (
           SELECT case_id,
                  COUNT(*) FILTER (WHERE vote = 'yes')::INT AS yes_count,
                  COUNT(*) FILTER (WHERE vote = 'no')::INT AS no_count
           FROM animal_welfare_votes
           GROUP BY case_id
         ) v ON v.case_id = c.id
         ORDER BY c.created_at DESC
         LIMIT 120`
      ),
      pool.query(
        `SELECT s.id,
                s.user_id,
                s.source,
                s.severity,
                s.scope,
                s.reason,
                s.starts_at,
                s.ends_at,
                s.is_active,
                u.vorname,
                u.nachname
         FROM user_sanctions s
         JOIN users u ON u.id = s.user_id
         ORDER BY s.created_at DESC
         LIMIT 200`
      )
    ]);

    return {
      success: true,
      reports: reportsRes.rows,
      profileReports: profileReportsRes.rows,
      cases: casesRes.rows,
      sanctions: sanctionsRes.rows
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler', reports: [], profileReports: [], cases: [], sanctions: [] };
  }
}

export async function reviewChatReport(payload: {
  adminCode: string;
  reportId: number;
  markFalseAccusation: boolean;
  reviewNote?: string;
}) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const reportId = Number(payload.reportId);
    const markFalseAccusation = Boolean(payload.markFalseAccusation);
    const reviewNote = String(payload.reviewNote || '').trim();

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return { success: false, error: 'Ungültige Report-ID.' };
    }

    await client.query('BEGIN');
    const reportRes = await client.query(
      `SELECT id, reporter_user_id, reported_user_id, status
       FROM chat_reports
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [reportId]
    );

    if (reportRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Meldung nicht gefunden.' };
    }

    const report = reportRes.rows[0];

    if (markFalseAccusation) {
      await client.query(
        `UPDATE chat_reports
         SET status = 'cleared',
             false_accusation = TRUE,
             review_note = $2,
             resolved_at = NOW()
         WHERE id = $1`,
        [reportId, reviewNote || 'Vorwurf nicht bestätigt.']
      );

      await createUserNotification(client, {
        userId: Number(report.reported_user_id),
        title: 'Vorwurf nicht bestätigt',
        message: 'Eine Meldung wurde als unbegründet eingestuft.',
        href: '/',
        notificationType: 'info'
      });

      await createUserNotification(client, {
        userId: Number(report.reporter_user_id),
        title: 'Meldung abgeschlossen',
        message: 'Die gemeldete Angelegenheit wurde als unbegründet bewertet.',
        href: '/nachrichten',
        notificationType: 'info'
      });
    } else {
      await client.query(
        `UPDATE chat_reports
         SET status = 'confirmed',
             false_accusation = FALSE,
             review_note = $2,
             resolved_at = NOW()
         WHERE id = $1`,
        [reportId, reviewNote || null]
      );
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Server-Fehler' };
  } finally {
    client.release();
  }
}

export async function uploadProfileHorseImage(userId: number, role: 'nutzer' | 'experte', formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'Keine Datei gefunden.' };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Nur JPG, PNG, WEBP oder GIF sind erlaubt.' };
    }

    if (file.size > 8 * 1024 * 1024) {
      return { success: false, error: 'Datei zu groß (max. 8MB).' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'horse-profiles');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${role}-${userId}-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    return { success: true, url: `/uploads/horse-profiles/${fileName}` };
  } catch (error: any) {
    return { success: false, error: error.message || 'Bild konnte nicht hochgeladen werden.' };
  }
}

export async function uploadProfilbild(userId: number, formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'Keine Datei gefunden.' };

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Nur JPG, PNG, WEBP oder GIF sind erlaubt.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Datei zu groß (max. 5MB).' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profilbilder');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `profilbild-${userId}-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);
    const publicUrl = `/uploads/profilbilder/${fileName}`;

    // Direkt ins profil_data schreiben
    await pool.query(
      `INSERT INTO user_profiles (user_id, role, profil_data, updated_at)
       VALUES ($1, 'experte', jsonb_build_object('profilbild_url', $2::text), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || jsonb_build_object('profilbild_url', $2::text),
           updated_at = NOW()`,
      [userId, publicUrl]
    );

    return { success: true, url: publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message || 'Bild konnte nicht hochgeladen werden.' };
  }
}

export async function trackProfileVisit(viewerUserId: number, profileUserId: number) {
  try {
    await ensureExtraSchema();
    const viewerId = Number(viewerUserId);
    const profileId = Number(profileUserId);

    if (!Number.isInteger(viewerId) || viewerId <= 0 || !Number.isInteger(profileId) || profileId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    if (viewerId === profileId) {
      return { success: true, skipped: true };
    }

    const existingRecent = await pool.query(
      `SELECT id
       FROM profile_views
       WHERE profile_user_id = $1
         AND viewer_user_id = $2
         AND created_at >= NOW() - INTERVAL '12 hours'
       LIMIT 1`,
      [profileId, viewerId]
    );

    if (existingRecent.rows.length > 0) {
      return { success: true, skipped: true };
    }

    await pool.query(
      `INSERT INTO profile_views (profile_user_id, viewer_user_id)
       VALUES ($1, $2)`,
      [profileId, viewerId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Profilaufruf konnte nicht gespeichert werden.' };
  }
}

const parseOfferIdsFromSourceRows = (rows: Array<{ source_id: string }>, profileUserId: number) => {
  const prefix = `offer:${profileUserId}:`;
  return rows
    .map((row) => String(row?.source_id || ''))
    .filter((sourceId) => sourceId.startsWith(prefix))
    .map((sourceId) => sourceId.slice(prefix.length))
    .filter((offerId) => offerId.trim().length > 0);
};

async function syncOfferWishlistCountInProfile(profileUserId: number, offerId: string, wishlistCount: number) {
  const profileRes = await pool.query(
    `SELECT profil_data
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [profileUserId]
  );

  const profilData = profileRes.rows[0]?.profil_data || {};
  const rawOffers = Array.isArray(profilData?.angeboteAnzeigen) ? profilData.angeboteAnzeigen : [];
  if (rawOffers.length === 0) return;

  let changed = false;
  const nextOffers = rawOffers.map((offer: any) => {
    if (String(offer?.id || '') !== offerId) return offer;
    changed = true;
    return {
      ...offer,
      wishlistCount: Number.isFinite(wishlistCount) ? Math.max(0, wishlistCount) : 0,
      updatedAt: new Date().toISOString()
    };
  });

  if (!changed) return;

  await pool.query(
    `UPDATE user_profiles
     SET profil_data = COALESCE(profil_data, '{}'::jsonb) || jsonb_build_object('angeboteAnzeigen', $2::jsonb),
         updated_at = NOW()
     WHERE user_id = $1`,
    [profileUserId, JSON.stringify(nextOffers)]
  );
}

async function syncOfferViewCountsInProfile(profileUserId: number, countsByOfferId: Record<string, number>) {
  const offerIds = Object.keys(countsByOfferId);
  if (offerIds.length === 0) return;

  const profileRes = await pool.query(
    `SELECT profil_data
     FROM user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [profileUserId]
  );

  const profilData = profileRes.rows[0]?.profil_data || {};
  const rawOffers = Array.isArray(profilData?.angeboteAnzeigen) ? profilData.angeboteAnzeigen : [];
  if (rawOffers.length === 0) return;

  let changed = false;
  const nextOffers = rawOffers.map((offer: any) => {
    const offerId = String(offer?.id || '').trim();
    if (!offerId || !(offerId in countsByOfferId)) return offer;
    changed = true;
    return {
      ...offer,
      viewsCount: Math.max(0, Number(countsByOfferId[offerId] || 0)),
      updatedAt: new Date().toISOString()
    };
  });

  if (!changed) return;

  await pool.query(
    `UPDATE user_profiles
     SET profil_data = COALESCE(profil_data, '{}'::jsonb) || jsonb_build_object('angeboteAnzeigen', $2::jsonb),
         updated_at = NOW()
     WHERE user_id = $1`,
    [profileUserId, JSON.stringify(nextOffers)]
  );
}

export async function getWishlistedOfferIds(viewerUserId: number, profileUserId: number) {
  try {
    await ensureExtraSchema();
    const viewerId = Number(viewerUserId);
    const profileId = Number(profileUserId);
    if (!Number.isInteger(viewerId) || viewerId <= 0 || !Number.isInteger(profileId) || profileId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', offerIds: [] as string[] };
    }

    const res = await pool.query(
      `SELECT source_id
       FROM wishlist_items
       WHERE user_id = $1
         AND item_type = 'anzeige'
         AND source_id LIKE $2`,
      [viewerId, `offer:${profileId}:%`]
    );

    const offerIds = parseOfferIdsFromSourceRows(res.rows as Array<{ source_id: string }>, profileId);
    return { success: true, offerIds };
  } catch (error: any) {
    return { success: false, error: error.message || 'Merkliste konnte nicht geladen werden.', offerIds: [] as string[] };
  }
}

export async function toggleProfileOfferWishlist(payload: {
  viewerUserId: number;
  profileUserId: number;
  offerId: string;
  offerTitle?: string;
  offerCategory?: string;
  offerDescription?: string;
  profileOrt?: string;
  profilePlz?: string;
  enable?: boolean;
}) {
  let client: any = null;
  try {
    await ensureExtraSchema();
    const viewerId = Number(payload.viewerUserId);
    const profileId = Number(payload.profileUserId);
    const offerId = String(payload.offerId || '').trim();
    const sourceId = `offer:${profileId}:${offerId}`;
    const forceEnable = payload.enable === true;
    const forceDisable = payload.enable === false;

    if (!Number.isInteger(viewerId) || viewerId <= 0 || !Number.isInteger(profileId) || profileId <= 0 || !offerId) {
      return { success: false, error: 'Ungültige Eingabe.' };
    }
    if (viewerId === profileId) {
      return { success: false, error: 'Eigene Anzeige kann nicht gemerkt werden.' };
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Serialize toggle requests for one viewer+offer pair to avoid race conditions on fast repeated clicks.
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('offer_wishlist_toggle'), hashtext($1))`,
      [`${viewerId}:${sourceId}`]
    );

    const existingRes = await client.query(
      `SELECT id
       FROM wishlist_items
       WHERE user_id = $1
         AND item_type = 'anzeige'
         AND source_id = $2
       LIMIT 1`,
      [viewerId, sourceId]
    );

    const alreadyWishlisted = existingRes.rows.length > 0;
    const shouldEnable = forceEnable || (!forceDisable && !alreadyWishlisted);

    if (shouldEnable && !alreadyWishlisted) {
      await client.query(
        `INSERT INTO wishlist_items (
          user_id, item_type, profile_type, source_id, name, ort, plz, kategorie_text, content
        )
        VALUES ($1, 'anzeige', 'experte', $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, item_type, source_id)
        DO NOTHING`,
        [
          viewerId,
          sourceId,
          String(payload.offerTitle || 'Angebot').trim() || 'Angebot',
          String(payload.profileOrt || '').trim() || null,
          String(payload.profilePlz || '').trim() || null,
          String(payload.offerCategory || '').trim() || null,
          String(payload.offerDescription || '').trim() || null
        ]
      );
    }

    if (!shouldEnable && alreadyWishlisted) {
      await client.query(
        `DELETE FROM wishlist_items
         WHERE user_id = $1
           AND item_type = 'anzeige'
           AND source_id = $2`,
        [viewerId, sourceId]
      );
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::INT AS total
       FROM wishlist_items
       WHERE item_type = 'anzeige'
         AND source_id = $1`,
      [sourceId]
    );

    await client.query('COMMIT');

    const wishlistCount = Math.max(0, Number(countRes.rows[0]?.total || 0));
    await syncOfferWishlistCountInProfile(profileId, offerId, wishlistCount);

    return {
      success: true,
      wishlisted: shouldEnable,
      wishlistCount
    };
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Rollback best effort.
      }
    }
    return { success: false, error: error.message || 'Merkliste konnte nicht aktualisiert werden.' };
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function trackProfileOfferViews(payload: {
  viewerUserId: number;
  profileUserId: number;
  offerIds: string[];
}) {
  try {
    await ensureExtraSchema();
    const viewerId = Number(payload.viewerUserId);
    const profileId = Number(payload.profileUserId);
    const offerIds = Array.from(new Set((Array.isArray(payload.offerIds) ? payload.offerIds : []).map((id) => String(id || '').trim()).filter(Boolean)));

    if (!Number.isInteger(viewerId) || viewerId <= 0 || !Number.isInteger(profileId) || profileId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.', countsByOfferId: {} as Record<string, number> };
    }
    if (viewerId === profileId || offerIds.length === 0) {
      return { success: true, skipped: true, countsByOfferId: {} as Record<string, number> };
    }

    await pool.query(
      `INSERT INTO profile_offer_views (profile_user_id, offer_id, viewer_user_id)
       SELECT $1, offer_id, $2
       FROM UNNEST($3::text[]) AS offer_id
       WHERE NOT EXISTS (
         SELECT 1
         FROM profile_offer_views pov
         WHERE pov.profile_user_id = $1
           AND pov.viewer_user_id = $2
           AND pov.offer_id = offer_id
           AND pov.created_at >= NOW() - INTERVAL '12 hours'
       )`,
      [profileId, viewerId, offerIds]
    );

    const countsRes = await pool.query(
      `SELECT offer_id, COUNT(*)::INT AS views_count
       FROM profile_offer_views
       WHERE profile_user_id = $1
         AND offer_id = ANY($2::text[])
       GROUP BY offer_id`,
      [profileId, offerIds]
    );

    const countsByOfferId = offerIds.reduce<Record<string, number>>((acc, offerId) => {
      acc[offerId] = 0;
      return acc;
    }, {});

    for (const row of countsRes.rows as Array<{ offer_id: string; views_count: number }>) {
      const key = String(row.offer_id || '').trim();
      if (!key) continue;
      countsByOfferId[key] = Math.max(0, Number(row.views_count || 0));
    }

    await syncOfferViewCountsInProfile(profileId, countsByOfferId);

    return { success: true, countsByOfferId };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Anzeigen-Aufrufe konnten nicht gespeichert werden.',
      countsByOfferId: {} as Record<string, number>
    };
  }
}

export async function getProfileAnalytics(userId: number) {
  try {
    await ensureExtraSchema();
    const ownerId = Number(userId);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return { success: false, error: 'Ungültige Nutzer-ID.' };
    }

    const [viewTotals, chatTotals, msgTotals, postTotals] = await Promise.all([
      pool.query(
        `SELECT
            COUNT(*)::INT AS profile_views_total,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::INT AS profile_views_30d,
            COUNT(DISTINCT viewer_user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::INT AS unique_visitors_30d
         FROM profile_views
         WHERE profile_user_id = $1`,
        [ownerId]
      ),
      pool.query(
        `SELECT
            COUNT(*)::INT AS chats_total,
            COUNT(DISTINCT CASE WHEN user_one = $1 THEN user_two ELSE user_one END)::INT AS unique_chat_partners
         FROM chats
         WHERE user_one = $1 OR user_two = $1`,
        [ownerId]
      ),
      pool.query(
        `SELECT
            COUNT(*) FILTER (WHERE m.sender_id = $1)::INT AS outgoing_messages_total,
            COUNT(*) FILTER (WHERE m.sender_id <> $1)::INT AS incoming_messages_total,
            COUNT(*) FILTER (WHERE m.sender_id = $1 AND m.created_at >= NOW() - INTERVAL '30 days')::INT AS outgoing_messages_30d,
            COUNT(*) FILTER (WHERE m.sender_id <> $1 AND m.created_at >= NOW() - INTERVAL '30 days')::INT AS incoming_messages_30d
         FROM chats c
         JOIN messages m ON m.chat_id = c.id
         WHERE c.user_one = $1 OR c.user_two = $1`,
        [ownerId]
      ),
      pool.query(
        `SELECT COUNT(*)::INT AS profile_posts_total
         FROM social_posts
         WHERE author_user_id = $1
           AND group_id IS NULL`,
        [ownerId]
      )
    ]);

    return {
      success: true,
      data: {
        profileViewsTotal: Number(viewTotals.rows[0]?.profile_views_total || 0),
        profileViews30d: Number(viewTotals.rows[0]?.profile_views_30d || 0),
        uniqueVisitors30d: Number(viewTotals.rows[0]?.unique_visitors_30d || 0),
        chatsTotal: Number(chatTotals.rows[0]?.chats_total || 0),
        uniqueChatPartners: Number(chatTotals.rows[0]?.unique_chat_partners || 0),
        outgoingMessagesTotal: Number(msgTotals.rows[0]?.outgoing_messages_total || 0),
        incomingMessagesTotal: Number(msgTotals.rows[0]?.incoming_messages_total || 0),
        outgoingMessages30d: Number(msgTotals.rows[0]?.outgoing_messages_30d || 0),
        incomingMessages30d: Number(msgTotals.rows[0]?.incoming_messages_30d || 0),
        profilePostsTotal: Number(postTotals.rows[0]?.profile_posts_total || 0)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Analyse konnte nicht geladen werden.' };
  }
}

// ============================================================================
// ABRECHNUNGSSYSTEM - Phase 1: Kundenverwaltung
// ============================================================================

export async function getMyStudents(expertId: number) {
  try {
    const result = await pool.query(
      `SELECT 
        es.id,
        es.student_id,
        u.email,
        up.display_name,
        up.ort,
        up.plz,
        es.added_at,
        es.active,
        sbi.billing_name,
        sbi.billing_email,
        sbi.payment_method,
        sbi.billing_cycle_day,
        CASE
          WHEN up.profil_data ? 'manual_customer' THEN LOWER(COALESCE(up.profil_data->>'manual_customer', 'false')) IN ('true', '1', 'yes')
          ELSE FALSE
        END AS is_manual_customer
      FROM expert_students es
      LEFT JOIN users u ON es.student_id = u.id
      LEFT JOIN user_profiles up ON es.student_id = up.user_id
      LEFT JOIN student_billing_info sbi ON es.expert_id = sbi.expert_id AND es.student_id = sbi.student_id
      WHERE es.expert_id = $1 AND es.active = TRUE
      ORDER BY es.added_at DESC`,
      [expertId]
    );
    
    return {
      success: true,
      students: result.rows || []
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Schüler konnten nicht geladen werden.' };
  }
}

export async function addStudent(expertId: number, studentId: number, billingData?: {
  billing_name?: string;
  billing_email?: string;
  billing_phone?: string;
  payment_method?: string;
  billing_cycle_day?: number;
}) {
  try {
    // Prüfe, ob die Beziehung bereits existiert
    const existing = await pool.query(
      'SELECT id FROM expert_students WHERE expert_id = $1 AND student_id = $2',
      [expertId, studentId]
    );

    if (existing.rows.length > 0) {
      // Reactivate if deactivated
      await pool.query(
        'UPDATE expert_students SET active = TRUE WHERE expert_id = $1 AND student_id = $2',
        [expertId, studentId]
      );
    } else {
      // Create new relationship
      await pool.query(
        'INSERT INTO expert_students (expert_id, student_id) VALUES ($1, $2)',
        [expertId, studentId]
      );
    }

    // Add/update billing info if provided
    if (billingData) {
      const existingBilling = await pool.query(
        'SELECT id FROM student_billing_info WHERE expert_id = $1 AND student_id = $2',
        [expertId, studentId]
      );

      const updates = {
        billing_name: billingData.billing_name || null,
        billing_email: billingData.billing_email || null,
        billing_phone: billingData.billing_phone || null,
        payment_method: billingData.payment_method || 'invoice',
        billing_cycle_day: billingData.billing_cycle_day || 1
      };

      if (existingBilling.rows.length > 0) {
        await pool.query(
          `UPDATE student_billing_info 
           SET billing_name = $1, billing_email = $2, billing_phone = $3, 
               payment_method = $4, billing_cycle_day = $5, updated_at = NOW()
           WHERE expert_id = $6 AND student_id = $7`,
          [updates.billing_name, updates.billing_email, updates.billing_phone, 
           updates.payment_method, updates.billing_cycle_day, expertId, studentId]
        );
      } else {
        await pool.query(
          `INSERT INTO student_billing_info 
           (expert_id, student_id, billing_name, billing_email, billing_phone, payment_method, billing_cycle_day)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [expertId, studentId, updates.billing_name, updates.billing_email, updates.billing_phone,
           updates.payment_method, updates.billing_cycle_day]
        );
      }
    }

    return { success: true, message: 'Schüler hinzugefügt.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Schüler konnte nicht hinzugefügt werden.' };
  }
}

export async function createInvitedStudentAccount(payload: {
  expertId: number;
  vorname: string;
  nachname: string;
  email: string;
  billingPhone?: string;
  billingCycleDay?: number;
}) {
  const client = await pool.connect();

  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const vorname = String(payload.vorname || '').trim();
    const nachname = String(payload.nachname || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const billingPhone = String(payload.billingPhone || '').trim();
    const billingCycleDay = Math.max(1, Math.min(31, Number(payload.billingCycleDay) || 1));

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!vorname || !nachname) {
      return { success: false, error: 'Vor- und Nachname sind erforderlich.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Bitte eine gültige E-Mail-Adresse eingeben.' };
    }

    await client.query('BEGIN');

    const existingUserRes = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );

    if (existingUserRes.rows[0]) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Diese E-Mail existiert bereits. Bitte nutze dafür "Bestehendes Konto".' };
    }

    const tempPassword = crypto.randomBytes(18).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userInsertRes = await client.query(
      `INSERT INTO users (vorname, nachname, email, password, role, verifiziert)
       VALUES ($1, $2, $3, $4, 'nutzer', FALSE)
       RETURNING id`,
      [vorname, nachname, email, hashedPassword]
    );

    const studentId = Number(userInsertRes.rows[0]?.id || 0);

    await client.query(
      `INSERT INTO user_profiles (user_id, role, display_name, updated_at)
       VALUES ($1, 'nutzer', $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         role = 'nutzer',
         display_name = EXCLUDED.display_name,
         updated_at = NOW()`,
      [studentId, `${vorname} ${nachname}`.trim()]
    );

    await client.query(
      `INSERT INTO expert_students (expert_id, student_id, active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (expert_id, student_id) DO UPDATE SET
         active = TRUE`,
      [expertId, studentId]
    );

    await client.query(
      `INSERT INTO student_billing_info (
         expert_id, student_id, billing_name, billing_email, billing_phone, payment_method, billing_cycle_day, notes
       )
       VALUES ($1, $2, $3, $4, $5, 'invoice', $6, $7)
       ON CONFLICT (expert_id, student_id) DO UPDATE SET
         billing_name = EXCLUDED.billing_name,
         billing_email = EXCLUDED.billing_email,
         billing_phone = EXCLUDED.billing_phone,
         payment_method = EXCLUDED.payment_method,
         billing_cycle_day = EXCLUDED.billing_cycle_day,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [
        expertId,
        studentId,
        `${vorname} ${nachname}`.trim(),
        email,
        billingPhone || null,
        billingCycleDay,
        JSON.stringify({
          inviteEmail: email,
          inviteSentAt: new Date().toISOString(),
          inviteState: 'pending-setup'
        })
      ]
    );

    await client.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at < NOW() OR used_at IS NOT NULL',
      [studentId]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);

    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [studentId, tokenHash]
    );

    const appUrl = getPublicAppUrl();
    const path = `/passwort-zuruecksetzen?token=${rawToken}`;
    const inviteUrl = appUrl ? `${appUrl}${path}` : path;

    await client.query('COMMIT');

    let mailSent = false;
    let mailMessage = 'Einladungslink erstellt.';

    try {
      await sendAccountSetupEmail(email, inviteUrl);
      mailSent = true;
      mailMessage = 'Einladungslink wurde per E-Mail verschickt.';
    } catch (mailError: any) {
      mailMessage = mailError?.message || 'E-Mail konnte nicht versendet werden. Nutze den Link manuell.';
    }

    return {
      success: true,
      studentId,
      inviteUrl,
      mailSent,
      message: mailMessage
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Einladung konnte nicht erstellt werden.' };
  } finally {
    client.release();
  }
}

export async function createManualStudentAccount(payload: {
  expertId: number;
  fullName: string;
  billingEmail?: string;
  billingPhone?: string;
  billingAddress?: string;
  billingCycleDay?: number;
}) {
  const client = await pool.connect();

  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const fullName = String(payload.fullName || '').trim();
    const billingEmail = String(payload.billingEmail || '').trim().toLowerCase();
    const billingPhone = String(payload.billingPhone || '').trim();
    const billingAddress = String(payload.billingAddress || '').trim();
    const billingCycleDay = Math.max(1, Math.min(31, Number(payload.billingCycleDay) || 1));

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!fullName) {
      return { success: false, error: 'Name ist erforderlich.' };
    }

    await client.query('BEGIN');

    const generatedEmail = `manual-${expertId}-${Date.now()}-${Math.floor(Math.random() * 100000)}@local.equiconnect`;
    const tempPassword = crypto.randomBytes(18).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const vorname = nameParts[0] || fullName;
    const nachname = nameParts.slice(1).join(' ') || '(Kunde)';

    const userInsertRes = await client.query(
      `INSERT INTO users (vorname, nachname, email, password, role, verifiziert)
       VALUES ($1, $2, $3, $4, 'nutzer', FALSE)
       RETURNING id`,
      [vorname, nachname, generatedEmail, hashedPassword]
    );

    const studentId = Number(userInsertRes.rows[0]?.id || 0);

    await client.query(
      `INSERT INTO user_profiles (user_id, role, display_name, profil_data, updated_at)
       VALUES ($1, 'nutzer', $2, $3::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         role = 'nutzer',
         display_name = EXCLUDED.display_name,
         profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || EXCLUDED.profil_data,
         updated_at = NOW()`,
      [
        studentId,
        fullName,
        JSON.stringify({
          manual_customer: true,
          manual_created_by_expert_id: expertId,
          manual_created_at: new Date().toISOString()
        })
      ]
    );

    await client.query(
      `INSERT INTO expert_students (expert_id, student_id, active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (expert_id, student_id) DO UPDATE SET
         active = TRUE`,
      [expertId, studentId]
    );

    await client.query(
      `INSERT INTO student_billing_info (
         expert_id, student_id, billing_name, billing_email, billing_phone, billing_strasse, payment_method, billing_cycle_day, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'invoice', $7, $8)
       ON CONFLICT (expert_id, student_id) DO UPDATE SET
         billing_name = EXCLUDED.billing_name,
         billing_email = EXCLUDED.billing_email,
         billing_phone = EXCLUDED.billing_phone,
         billing_strasse = EXCLUDED.billing_strasse,
         payment_method = EXCLUDED.payment_method,
         billing_cycle_day = EXCLUDED.billing_cycle_day,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [
        expertId,
        studentId,
        fullName,
        billingEmail || null,
        billingPhone || null,
        billingAddress || null,
        billingCycleDay,
        JSON.stringify({
          manualCustomer: true,
          generatedLoginEmail: generatedEmail
        })
      ]
    );

    await client.query('COMMIT');

    return { success: true, studentId };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message || 'Manueller Kunde konnte nicht erstellt werden.' };
  } finally {
    client.release();
  }
}

export async function getExpertOfferOptions(expertId: number) {
  try {
    await ensureExtraSchema();

    const id = Number(expertId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.', offers: [] };
    }

    const result = await pool.query(
      `SELECT profil_data
       FROM user_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [id]
    );

    const profilData = result.rows[0]?.profil_data || {};
    const rawOffers = Array.isArray(profilData?.angeboteAnzeigen) ? profilData.angeboteAnzeigen : [];

    const parsePriceToEuro = (raw: any) => {
      const normalized = String(raw || '')
        .replace(',', '.')
        .replace(/[^0-9.\-]/g, '');
      const amount = Number(normalized);
      return Number.isFinite(amount) ? amount : null;
    };

    const offers = rawOffers
      .flatMap((offer: any) => {
        const offerId = String(offer?.id || '').trim() || `offer-${Math.random().toString(16).slice(2, 8)}`;
        const title = String(offer?.titel || '').trim();
        const category = String(offer?.kategorie || '').trim();
        const durationMinutes = Number.isInteger(offer?.durationMinutes)
          ? Number(offer.durationMinutes)
          : null;
        const prices = Array.isArray(offer?.preise) ? offer.preise : [];

        const mapped = prices
          .map((price: any, idx: number) => {
            const amountEuro = parsePriceToEuro(price?.preis ?? price?.betrag);
            if (amountEuro === null || amountEuro < 0) return null;
            const typRaw = String(price?.typ || '').trim().toLowerCase();
            const typLabel = typRaw === 'gruppe' ? 'Gruppenpreis' : typRaw === 'einzel' ? 'Einzelpreis' : '';
            const leistungLabel = String(price?.leistung || '').trim();
            const label = String(price?.label || typLabel || leistungLabel || '').trim() || `Preis ${idx + 1}`;

            const rowDurationMinutes = Number.isInteger(price?.durationMinutes)
              ? Number(price.durationMinutes)
              : null;

            return {
              key: `${offerId}::${idx}`,
              offerId,
              title: title || 'Angebot',
              category,
              priceLabel: label,
              unitPriceEuro: amountEuro,
              durationMinutes: rowDurationMinutes ?? durationMinutes
            };
          })
          .filter(Boolean);

        if (mapped.length > 0) return mapped;

        const fallbackPrice = parsePriceToEuro(offer?.preis ?? offer?.betrag);
        if (fallbackPrice !== null && fallbackPrice >= 0) {
          return [
            {
              key: `${offerId}::fallback`,
              offerId,
              title: title || 'Angebot',
              category,
              priceLabel: 'Standard',
              unitPriceEuro: fallbackPrice,
              durationMinutes
            }
          ];
        }

        return [];
      })
      .filter(Boolean);

    return { success: true, offers };
  } catch (error: any) {
    return { success: false, error: error.message || 'Angebote konnten nicht geladen werden.', offers: [] };
  }
}

export async function removeStudent(expertId: number, studentId: number) {
  try {
    await pool.query(
      'UPDATE expert_students SET active = FALSE WHERE expert_id = $1 AND student_id = $2',
      [expertId, studentId]
    );
    
    return { success: true, message: 'Schüler entfernt.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Schüler konnte nicht entfernt werden.' };
  }
}

export async function searchStudentUsers(expertId: number, searchTerm: string, limit = 10) {
  try {
    // Suche nach E-Mail oder Name, ausschließlich bereits hinzugefügten
    const result = await pool.query(
      `SELECT DISTINCT
        u.id,
        u.email,
        up.display_name,
        up.ort,
        up.plz
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE (u.email ILIKE $1 OR up.display_name ILIKE $1)
        AND u.role = 'nutzer'
        AND u.id NOT IN (
          SELECT student_id FROM expert_students WHERE expert_id = $2 AND active = TRUE
        )
      ORDER BY 
        CASE WHEN u.email ILIKE $1 THEN 0 ELSE 1 END,
        up.display_name ASC
      LIMIT $3`,
      [`%${searchTerm}%`, expertId, limit]
    );

    return {
      success: true,
      users: result.rows || []
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Suche fehlgeschlagen.' };
  }
}

export async function getBillingInfo(expertId: number, studentId: number) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM student_billing_info
       WHERE expert_id = $1 AND student_id = $2`,
      [expertId, studentId]
    );

    return {
      success: true,
      billingInfo: result.rows[0] || null
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abrechnungsinformationen konnten nicht geladen werden.' };
  }
}

export async function updateBillingInfo(expertId: number, studentId: number, billingData: {
  billing_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_strasse?: string;
  iban?: string;
  payment_method?: string;
  billing_cycle_day?: number;
  notes?: any;
}) {
  try {
    const {
      billing_name,
      billing_email,
      billing_phone,
      billing_strasse,
      iban,
      payment_method,
      billing_cycle_day,
      notes
    } = billingData;

    // Ensure the expert_students relationship exists
    const existing = await pool.query(
      'SELECT id FROM expert_students WHERE expert_id = $1 AND student_id = $2',
      [expertId, studentId]
    );

    if (!existing.rows[0]) {
      return { success: false, error: 'Schüler nicht gefunden.' };
    }

    // Check if billing info exists
    const existingBilling = await pool.query(
      'SELECT id FROM student_billing_info WHERE expert_id = $1 AND student_id = $2',
      [expertId, studentId]
    );

    if (existingBilling.rows[0]) {
      await pool.query(
        `UPDATE student_billing_info 
         SET billing_name = COALESCE($1, billing_name),
             billing_email = COALESCE($2, billing_email),
             billing_phone = COALESCE($3, billing_phone),
             billing_strasse = COALESCE($4, billing_strasse),
             iban = COALESCE($5, iban),
             payment_method = COALESCE($6, payment_method),
             billing_cycle_day = COALESCE($7, billing_cycle_day),
             notes = COALESCE($8, notes),
             updated_at = NOW()
         WHERE expert_id = $9 AND student_id = $10`,
        [billing_name, billing_email, billing_phone, billing_strasse, iban, payment_method, billing_cycle_day, JSON.stringify(notes || {}), expertId, studentId]
      );
    } else {
      await pool.query(
        `INSERT INTO student_billing_info 
         (expert_id, student_id, billing_name, billing_email, billing_phone, billing_strasse, iban, payment_method, billing_cycle_day, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [expertId, studentId, billing_name, billing_email, billing_phone, billing_strasse || '', iban, payment_method || 'invoice', billing_cycle_day || 1, JSON.stringify(notes || {})]
      );
    }

    return { success: true, message: 'Abrechnungsinformationen gespeichert.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abrechnungsinformationen konnten nicht gespeichert werden.' };
  }
}

// ============================================================================
// ABRECHNUNGSSYSTEM - Phase 2: Buchungen
// ============================================================================

export async function getStudentBookings(expertId: number, studentId: number, limit = 50, month?: string) {
  try {
    await ensureExtraSchema();

    const safeExpertId = Number(expertId);
    const safeStudentId = Number(studentId);
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const monthFilter = String(month || '').trim();

    if (!Number.isInteger(safeExpertId) || safeExpertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.', bookings: [] };
    }
    if (!Number.isInteger(safeStudentId) || safeStudentId <= 0) {
      return { success: false, error: 'Ungültige Schüler-ID.', bookings: [] };
    }

    const relationRes = await pool.query(
      `SELECT id
       FROM expert_students
       WHERE expert_id = $1 AND student_id = $2 AND active = TRUE
       LIMIT 1`,
      [safeExpertId, safeStudentId]
    );

    if (!relationRes.rows[0]) {
      return { success: false, error: 'Schüler gehört nicht zu deinem Kundenstamm.', bookings: [] };
    }

    const useMonthFilter = /^\d{4}-\d{2}$/.test(monthFilter);
    const result = useMonthFilter
      ? await pool.query(
          `SELECT id,
                  expert_id,
                  student_id,
                  booking_date,
                  service_title,
                  duration_minutes,
                  quantity,
                  unit_price_cents,
                  total_cents,
                  currency,
                  status,
                  paid_at,
                  paid_method,
                  notes,
                  billed_month,
                  created_at,
                  updated_at
           FROM expert_student_bookings
           WHERE expert_id = $1
             AND student_id = $2
             AND to_char(booking_date, 'YYYY-MM') = $3
           ORDER BY booking_date DESC, created_at DESC
           LIMIT $4`,
          [safeExpertId, safeStudentId, monthFilter, safeLimit]
        )
      : await pool.query(
          `SELECT id,
                  expert_id,
                  student_id,
                  booking_date,
                  service_title,
                  duration_minutes,
                  quantity,
                  unit_price_cents,
                  total_cents,
                  currency,
                  status,
                  paid_at,
                  paid_method,
                  notes,
                  billed_month,
                  created_at,
                  updated_at
           FROM expert_student_bookings
           WHERE expert_id = $1 AND student_id = $2
           ORDER BY booking_date DESC, created_at DESC
           LIMIT $3`,
          [safeExpertId, safeStudentId, safeLimit]
        );

    return { success: true, bookings: result.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Buchungen konnten nicht geladen werden.', bookings: [] };
  }
}

export async function createStudentBooking(payload: {
  expertId: number;
  studentId: number;
  bookingDate: string;
  serviceTitle: string;
  durationMinutes?: number;
  quantity?: number;
  unitPriceEuro: number;
  sourceOfferId?: string;
  notes?: string;
  status?: 'offen' | 'bestaetigt' | 'abgerechnet' | 'storniert';
}) {
  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const bookingDate = String(payload.bookingDate || '').trim();
    const serviceTitle = String(payload.serviceTitle || '').trim();
    const durationMinutes = payload.durationMinutes ? Number(payload.durationMinutes) : null;
    const quantity = payload.quantity ? Number(payload.quantity) : 1;
    const unitPriceEuro = Number(payload.unitPriceEuro);
    const sourceOfferId = String(payload.sourceOfferId || '').trim();
    const notes = String(payload.notes || '').trim();
    const status = String(payload.status || 'offen').trim().toLowerCase();

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: 'Ungültige Schüler-ID.' };
    }
    if (!bookingDate) {
      return { success: false, error: 'Buchungsdatum fehlt.' };
    }
    if (!serviceTitle) {
      return { success: false, error: 'Leistungstitel fehlt.' };
    }
    if (!Number.isFinite(unitPriceEuro) || unitPriceEuro < 0) {
      return { success: false, error: 'Preis ist ungültig.' };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: 'Menge ist ungültig.' };
    }
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) {
      return { success: false, error: 'Dauer muss eine positive ganze Zahl sein.' };
    }

    const allowedStatus = ['offen', 'bestaetigt', 'abgerechnet', 'storniert'];
    if (!allowedStatus.includes(status)) {
      return { success: false, error: 'Status ist ungültig.' };
    }

    const relationRes = await pool.query(
      `SELECT id
       FROM expert_students
       WHERE expert_id = $1 AND student_id = $2 AND active = TRUE
       LIMIT 1`,
      [expertId, studentId]
    );

    if (!relationRes.rows[0]) {
      return { success: false, error: 'Schüler gehört nicht zu deinem Kundenstamm.' };
    }

    const unitPriceCents = Math.round(unitPriceEuro * 100);
    const totalCents = Math.round(unitPriceCents * quantity);
    const expertPlan = await getUserPlanDefinition(expertId, 'experte');
    const customerPlan = await getUserPlanDefinition(studentId, 'nutzer');
    const protection = computeProtectionQuote(totalCents, expertPlan, customerPlan);

    const insertRes = await pool.query(
      `INSERT INTO expert_student_bookings
        (expert_id, student_id, booking_date, service_title, duration_minutes, quantity, unit_price_cents, total_cents,
         protection_fee_cents, customer_total_cents, expert_payout_cents,
         provider_commission_bps, customer_discount_bps, final_fee_bps, protection_model,
         expert_plan_key, customer_plan_key, source_offer_id, status, notes)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING id`,
      [
        expertId,
        studentId,
        bookingDate,
        serviceTitle,
        durationMinutes,
        quantity,
        unitPriceCents,
        totalCents,
        protection.protectionFeeCents,
        protection.customerTotalCents,
        protection.expertPayoutCents,
        protection.providerCommissionBps,
        protection.customerDiscountBps,
        protection.finalFeeBps,
        protection.protectionModel,
        expertPlan.key,
        customerPlan.key,
        sourceOfferId || null,
        status,
        notes || null
      ]
    );

    return { success: true, bookingId: insertRes.rows[0]?.id || null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Buchung konnte nicht erstellt werden.' };
  }
}

export async function ensureRecurringStudentBooking(payload: {
  expertId: number;
  studentId: number;
  month: string;
  serviceTitle: string;
  durationMinutes?: number | null;
  quantity?: number;
  unitPriceEuro: number;
  cycleDay?: number;
  sourceOfferId?: string;
  sourcePriceLabel?: string;
}) {
  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const month = String(payload.month || '').trim();
    const serviceTitle = String(payload.serviceTitle || '').trim();
    const quantity = Number(payload.quantity || 1);
    const unitPriceEuro = Number(payload.unitPriceEuro);
    const durationMinutes = payload.durationMinutes === null || payload.durationMinutes === undefined
      ? null
      : Number(payload.durationMinutes);
    const sourceOfferId = String(payload.sourceOfferId || '').trim();
    const sourcePriceLabel = String(payload.sourcePriceLabel || '').trim();
    const cycleDay = Math.max(1, Math.min(31, Number(payload.cycleDay) || 1));

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: 'Ungültige Schüler-ID.' };
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Ungültiges Monatsformat.' };
    }
    if (!serviceTitle) {
      return { success: false, error: 'Leistungstitel fehlt.' };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, error: 'Ungültige Menge.' };
    }
    if (!Number.isFinite(unitPriceEuro) || unitPriceEuro < 0) {
      return { success: false, error: 'Ungültiger Preis.' };
    }

    const relationRes = await pool.query(
      `SELECT id
       FROM expert_students
       WHERE expert_id = $1 AND student_id = $2 AND active = TRUE
       LIMIT 1`,
      [expertId, studentId]
    );

    if (!relationRes.rows[0]) {
      return { success: false, error: 'Schüler gehört nicht zu deinem Kundenstamm.' };
    }

    const recurringSignature = `[AUTO-INVOICE:${month}:${sourceOfferId || serviceTitle}:${sourcePriceLabel || 'default'}]`;
    const existingRes = await pool.query(
      `SELECT id
       FROM expert_student_bookings
       WHERE expert_id = $1
         AND student_id = $2
         AND to_char(booking_date, 'YYYY-MM') = $3
         AND notes LIKE $4
       LIMIT 1`,
      [expertId, studentId, month, `${recurringSignature}%`]
    );

    if (existingRes.rows[0]) {
      return { success: true, created: false, bookingId: existingRes.rows[0].id };
    }

    const [year, monthNumber] = month.split('-').map((item) => Number(item));
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const bookingDay = Math.min(daysInMonth, cycleDay);
    const bookingDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(bookingDay).padStart(2, '0')}`;

    const result = await createStudentBooking({
      expertId,
      studentId,
      bookingDate,
      serviceTitle,
      durationMinutes: durationMinutes ?? undefined,
      quantity,
      unitPriceEuro,
      sourceOfferId: sourceOfferId || undefined,
      status: 'offen',
      notes: `${recurringSignature}\nAutomatisch aus wiederkehrendem Angebot erstellt.`
    });

    if (!result.success) {
      return result;
    }

    return { success: true, created: true, bookingId: result.bookingId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Wiederkehrende Buchung konnte nicht erstellt werden.' };
  }
}

export async function updateStudentBookingStatus(payload: {
  expertId: number;
  studentId: number;
  bookingId: number;
  status: 'offen' | 'bestaetigt' | 'abgerechnet' | 'storniert';
}) {
  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const bookingId = Number(payload.bookingId);
    const status = String(payload.status || '').trim().toLowerCase();

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: 'Ungültige Schüler-ID.' };
    }
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return { success: false, error: 'Ungültige Buchungs-ID.' };
    }

    const allowedStatus = ['offen', 'bestaetigt', 'abgerechnet', 'storniert'];
    if (!allowedStatus.includes(status)) {
      return { success: false, error: 'Status ist ungültig.' };
    }

    const result = await pool.query(
      `UPDATE expert_student_bookings
       SET status = $1,
           billed_month = CASE
             WHEN $1 = 'abgerechnet' THEN date_trunc('month', booking_date)::date
             ELSE billed_month
           END,
           updated_at = NOW()
       WHERE id = $2
         AND expert_id = $3
         AND student_id = $4
       RETURNING id`,
      [status, bookingId, expertId, studentId]
    );

    if (!result.rows[0]) {
      return { success: false, error: 'Buchung nicht gefunden.' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Buchungsstatus konnte nicht aktualisiert werden.' };
  }
}

export async function updateStudentBookingPayment(payload: {
  expertId: number;
  studentId: number;
  bookingId: number;
  paid: boolean;
  paymentMethod?: 'bar' | 'ueberweisung' | 'paypal';
}) {
  try {
    await ensureExtraSchema();

    const expertId = Number(payload.expertId);
    const studentId = Number(payload.studentId);
    const bookingId = Number(payload.bookingId);
    const paid = payload.paid === true;
    const paymentMethod = String(payload.paymentMethod || '').trim().toLowerCase();

    if (!Number.isInteger(expertId) || expertId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return { success: false, error: 'Ungültige Schüler-ID.' };
    }
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return { success: false, error: 'Ungültige Buchungs-ID.' };
    }

    const allowedMethods = ['', 'bar', 'ueberweisung', 'paypal'];
    if (!allowedMethods.includes(paymentMethod)) {
      return { success: false, error: 'Zahlungsart ist ungültig.' };
    }

    const result = await pool.query(
      `UPDATE expert_student_bookings
       SET paid_at = CASE WHEN $1::boolean THEN NOW() ELSE NULL END,
           paid_method = CASE WHEN $1::boolean THEN NULLIF($2, '') ELSE NULL END,
           status = CASE
             WHEN $1::boolean AND status != 'storniert' THEN 'abgerechnet'
             WHEN NOT $1::boolean AND status = 'abgerechnet' THEN 'offen'
             ELSE status
           END,
           billed_month = CASE
             WHEN $1::boolean AND status != 'storniert' THEN date_trunc('month', booking_date)::date
             WHEN NOT $1::boolean THEN NULL
             ELSE billed_month
           END,
           updated_at = NOW()
       WHERE id = $3
         AND expert_id = $4
         AND student_id = $5
       RETURNING id, status, paid_at, paid_method`,
      [paid, paymentMethod, bookingId, expertId, studentId]
    );

    if (!result.rows[0]) {
      return { success: false, error: 'Buchung nicht gefunden.' };
    }

    return { success: true, booking: result.rows[0] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Zahlungsstatus konnte nicht aktualisiert werden.' };
  }
}

export async function getMonthlyOverviewForExpert(expertId: number, month: string) {
  try {
    await ensureExtraSchema();

    const id = Number(expertId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Ungültiges Monatsformat.' };
    }

    const result = await pool.query(
      `SELECT
         es.student_id,
         up.display_name,
         up.email,
         COUNT(esb.id)::int AS booking_count,
         COALESCE(SUM(CASE WHEN esb.status NOT IN ('abgerechnet', 'storniert') THEN esb.total_cents ELSE 0 END), 0)::int AS open_cents,
         COALESCE(SUM(CASE WHEN esb.status = 'abgerechnet' THEN esb.total_cents ELSE 0 END), 0)::int AS billed_cents,
         COALESCE(SUM(CASE WHEN esb.status != 'storniert' THEN esb.total_cents ELSE 0 END), 0)::int AS total_cents
       FROM expert_students es
       JOIN user_profiles up ON up.id = es.student_id
       LEFT JOIN expert_student_bookings esb
         ON esb.expert_id = $1
         AND esb.student_id = es.student_id
         AND to_char(esb.booking_date, 'YYYY-MM') = $2
       WHERE es.expert_id = $1
         AND es.active = TRUE
       GROUP BY es.student_id, up.display_name, up.email
       ORDER BY total_cents DESC, up.display_name`,
      [id, month]
    );

    const grandTotal = result.rows.reduce((acc: number, r: any) => acc + Number(r.total_cents || 0), 0);
    const grandOpen = result.rows.reduce((acc: number, r: any) => acc + Number(r.open_cents || 0), 0);
    const grandBilled = result.rows.reduce((acc: number, r: any) => acc + Number(r.billed_cents || 0), 0);

    return {
      success: true,
      overview: result.rows,
      grandTotal,
      grandOpen,
      grandBilled
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Monatsuebersicht konnte nicht geladen werden.' };
  }
}

// ============================================================================
// RECHNUNGSSTELLUNG - Phase 3
// ============================================================================

export async function getInvoiceSettings(expertId: number) {
  try {
    await ensureExtraSchema();
    const id = Number(expertId);
    if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'Ungültige ID.' };
    const result = await pool.query(
      `SELECT * FROM expert_invoice_settings WHERE user_id = $1`,
      [id]
    );
    return { success: true, settings: result.rows[0] || null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveInvoiceSettings(expertId: number, payload: {
  steuernummer?: string;
  ust_idnr?: string;
  kontoname?: string;
  iban?: string;
  bic?: string;
  bankname?: string;
  tel?: string;
  logo_url?: string;
  is_kleinunternehmer?: boolean;
  mwst_satz?: number;
  invoice_prefix?: string;
  template_id?: number;
  brand_color?: string;
}) {
  try {
    await ensureExtraSchema();
    const id = Number(expertId);
    if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'Ungültige ID.' };

    await pool.query(
      `INSERT INTO expert_invoice_settings
         (user_id, steuernummer, ust_idnr, kontoname, iban, bic, bankname, tel,
          logo_url, is_kleinunternehmer, mwst_satz, invoice_prefix, template_id, brand_color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (user_id) DO UPDATE SET
         steuernummer = EXCLUDED.steuernummer,
         ust_idnr = EXCLUDED.ust_idnr,
         kontoname = EXCLUDED.kontoname,
         iban = EXCLUDED.iban,
         bic = EXCLUDED.bic,
         bankname = EXCLUDED.bankname,
         tel = EXCLUDED.tel,
         logo_url = EXCLUDED.logo_url,
         is_kleinunternehmer = EXCLUDED.is_kleinunternehmer,
         mwst_satz = EXCLUDED.mwst_satz,
         invoice_prefix = EXCLUDED.invoice_prefix,
         template_id = EXCLUDED.template_id,
         brand_color = EXCLUDED.brand_color,
         updated_at = NOW()`,
      [
        id,
        (payload.steuernummer ?? '').trim(),
        (payload.ust_idnr ?? '').trim(),
        (payload.kontoname ?? '').trim(),
        (payload.iban ?? '').trim().toUpperCase(),
        (payload.bic ?? '').trim().toUpperCase(),
        (payload.bankname ?? '').trim(),
        (payload.tel ?? '').trim(),
        (payload.logo_url ?? '').trim(),
        payload.is_kleinunternehmer ?? true,
        payload.mwst_satz ?? 19.0,
        (payload.invoice_prefix ?? 'RE').trim().toUpperCase(),
        payload.template_id ?? 1,
        (payload.brand_color ?? '#10b981').trim()
      ]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInvoiceData(expertId: number, studentId: number, month: string) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const sId = Number(studentId);

    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungültige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungültige Schüler-ID.' };
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return { success: false, error: 'Ungültiges Monatsformat.' };

    try {
      await createMonthlyAboBookingFromPlan(eId, sId, month);
    } catch {
      // Invoice preview must continue even if recurring generation fails.
    }

    const [expertRes, studentRes, bookingsRes] = await Promise.all([
      pool.query(
        `SELECT u.vorname, u.nachname, u.email,
                u.stall_name, u.stall_strasse,
                up.plz AS stall_plz, up.ort AS stall_ort,
                up.profil_data,
                eis.steuernummer, eis.ust_idnr, eis.kontoname,
                eis.iban, eis.bic, eis.bankname, eis.tel, eis.logo_url,
                eis.is_kleinunternehmer, eis.mwst_satz,
                eis.invoice_prefix, eis.invoice_counter,
                eis.template_id, eis.brand_color
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN expert_invoice_settings eis ON eis.user_id = u.id
         WHERE u.id = $1`,
        [eId]
      ),
      pool.query(
        `SELECT u.vorname, u.nachname, u.email,
                up.plz, up.ort,
                sbi.billing_name, sbi.billing_email, sbi.billing_phone,
                sbi.billing_strasse,
                sbi.iban AS student_iban,
                sbi.payment_method
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         LEFT JOIN student_billing_info sbi
           ON sbi.expert_id = $1 AND sbi.student_id = u.id
         WHERE u.id = $2`,
        [eId, sId]
      ),
      pool.query(
        `SELECT id, booking_date, service_title, duration_minutes,
          quantity, unit_price_cents, total_cents, customer_total_cents,
                protection_fee_cents, expert_payout_cents,
                provider_commission_bps, customer_discount_bps, final_fee_bps,
          protection_model, currency, status, notes, source_offer_id
         FROM expert_student_bookings
         WHERE expert_id = $1
           AND student_id = $2
           AND to_char(booking_date, 'YYYY-MM') = $3
           AND status != 'storniert'
         ORDER BY booking_date ASC, id ASC`,
        [eId, sId, month]
      )
    ]);

    if (!expertRes.rows[0]) return { success: false, error: 'Experte nicht gefunden.' };
    if (!studentRes.rows[0]) return { success: false, error: 'Schüler nicht gefunden.' };

    const expert = expertRes.rows[0];
    const rawOffers = Array.isArray((expert?.profil_data as any)?.angeboteAnzeigen)
      ? (expert.profil_data as any).angeboteAnzeigen
      : [];
    const offerById = new Map<string, any>(
      rawOffers
        .map((item: any) => [String(item?.id || '').trim(), item] as const)
        .filter(([id]) => id.length > 0)
    );

    const prefix = ((expert.invoice_prefix as string) || 'RE').trim().toUpperCase();
    const counter = Number(expert.invoice_counter || 1);
    const year = month.slice(0, 4);
    const invoiceNumber = `${prefix}-${year}-${String(counter).padStart(4, '0')}`;
    const bookings = (bookingsRes.rows || []).map((booking: any) => ({
      ...booking,
      unit_price_euro: Number(booking.unit_price_cents || 0) / 100,
      total_euro: Number(booking.total_cents || 0) / 100,
      source_offer_id: booking.source_offer_id || null,
      offer_conditions_text: (() => {
        const sourceOfferId = String(booking.source_offer_id || '').trim();
        if (!sourceOfferId) return null;
        const offer = offerById.get(sourceOfferId);
        if (!offer) return null;

        const billingType = String(offer?.billingType || '').trim().toLowerCase() === 'abo' ? 'Abo' : 'Einmalzahlung';
        const sessionsPerAbo = String(offer?.sessionsPerAbo || '').trim();
        const cancellationAllowed = Boolean(offer?.singleSessionCancellationAllowed);
        const maxCancellations = String(offer?.maxCancellationsPerAbo || '').trim();
        const cancellationWindowHours = String(offer?.cancellationWindowHours || '').trim();

        const parts: string[] = [`Abrechnung: ${billingType}`];
        if (billingType === 'Abo' && sessionsPerAbo) {
          parts.push(`Leistungen im Abo: ${sessionsPerAbo}`);
        }
        if (billingType === 'Abo') {
          parts.push(`Ruecktritt einzelner Leistung: ${cancellationAllowed ? 'Ja' : 'Nein'}`);
          if (cancellationAllowed && maxCancellations) {
            parts.push(`Max. Ruecktritte: ${maxCancellations}`);
          }
          if (cancellationWindowHours) {
            parts.push(`Ruecktrittsfrist: ${cancellationWindowHours}h`);
          }
        }
        return parts.join(' | ');
      })(),
    }));
    const subtotalCents = bookings.reduce((sum: number, booking: any) => sum + Number(booking.total_cents || 0), 0);
    const protectionFeeCents = bookings.reduce((sum: number, booking: any) => sum + Number(booking.protection_fee_cents || 0), 0);
    const customerTotalCents = bookings.reduce((sum: number, booking: any) => sum + Number(booking.customer_total_cents || booking.total_cents || 0), 0);
    const expertPayoutCents = bookings.reduce((sum: number, booking: any) => sum + Number(booking.expert_payout_cents || booking.total_cents || 0), 0);

    return {
      success: true,
      expert,
      student: studentRes.rows[0],
      bookings,
      totals: {
        subtotal_cents: subtotalCents,
        protection_fee_cents: protectionFeeCents,
        customer_total_cents: customerTotalCents,
        expert_payout_cents: expertPayoutCents,
      },
      invoiceNumber,
      month
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInvoiceArchiveData(expertId: number) {
  try {
    await ensureExtraSchema();

    const id = Number(expertId);
    if (!Number.isInteger(id) || id <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.', items: [] };
    }

    const result = await pool.query(
      `WITH invoice_base AS (
         SELECT
           esb.student_id,
           to_char(esb.booking_date, 'YYYY-MM') AS invoice_month,
           EXTRACT(YEAR FROM esb.booking_date)::INT AS invoice_year,
           EXTRACT(MONTH FROM esb.booking_date)::INT AS invoice_month_number,
           esb.booking_date,
           esb.created_at,
           esb.total_cents,
           esb.protection_fee_cents,
           esb.customer_total_cents,
           esb.expert_payout_cents,
           esb.service_title,
           COALESCE(sbi.billing_name, up.display_name, CONCAT(u.vorname, ' ', u.nachname), CONCAT('Kunde ', esb.student_id::text)) AS customer_name,
           COALESCE(sbi.billing_email, u.email) AS customer_email
         FROM expert_student_bookings esb
         LEFT JOIN users u ON u.id = esb.student_id
         LEFT JOIN user_profiles up ON up.user_id = esb.student_id
         LEFT JOIN student_billing_info sbi
           ON sbi.expert_id = esb.expert_id AND sbi.student_id = esb.student_id
         WHERE esb.expert_id = $1
           AND esb.status != 'storniert'
       )
       SELECT
         student_id,
         customer_name,
         customer_email,
         invoice_month,
         invoice_year,
         invoice_month_number,
         COUNT(*)::INT AS booking_count,
         SUM(total_cents)::INT AS subtotal_cents,
         SUM(protection_fee_cents)::INT AS protection_fee_cents,
         SUM(customer_total_cents)::INT AS customer_total_cents,
         SUM(expert_payout_cents)::INT AS expert_payout_cents,
         MIN(booking_date) AS first_booking_date,
         MAX(booking_date) AS last_booking_date,
         MAX(created_at) AS last_created_at,
         ARRAY_REMOVE(ARRAY_AGG(service_title ORDER BY booking_date DESC, created_at DESC), NULL) AS service_titles
       FROM invoice_base
       GROUP BY student_id, customer_name, customer_email, invoice_month, invoice_year, invoice_month_number
       ORDER BY invoice_year DESC, invoice_month_number DESC, customer_name ASC` ,
      [id]
    );

    return { success: true, items: result.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Rechnungsarchiv konnte nicht geladen werden.', items: [] };
  }
}

export async function incrementInvoiceCounter(expertId: number) {
  try {
    await ensureExtraSchema();
    const id = Number(expertId);
    if (!Number.isInteger(id) || id <= 0) return { success: false, error: 'Ungültige ID.' };
    await pool.query(
      `INSERT INTO expert_invoice_settings (user_id, invoice_counter)
       VALUES ($1, 2)
       ON CONFLICT (user_id) DO UPDATE SET
         invoice_counter = expert_invoice_settings.invoice_counter + 1,
         updated_at = NOW()`,
      [id]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStudentServicePlan(expertId: number, studentId: number) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const sId = Number(studentId);
    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };

    const result = await pool.query(
      'SELECT * FROM student_service_plans WHERE expert_id = $1 AND student_id = $2 AND active = TRUE LIMIT 1',
      [eId, sId]
    );
    return { success: true, plan: result.rows[0] || null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abrechnungsplan konnte nicht geladen werden.' };
  }
}

export async function saveStudentServicePlan(
  expertId: number,
  studentId: number,
  plan: {
    plan_type: 'abo' | 'einzelstunde';
    service_title: string;
    duration_minutes: number;
    unit_price_cents: number;
    monthly_price_cents: number | null;
    sessions_per_month: number;
    cancellation_hours: number;
    cancellation_enabled?: boolean;
    max_cancellations_per_month?: number;
    require_confirmation_each_booking?: boolean;
  }
) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const sId = Number(studentId);
    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };

    const relationRes = await pool.query(
      `SELECT id FROM expert_students
       WHERE expert_id = $1 AND student_id = $2 AND active = TRUE
       LIMIT 1`,
      [eId, sId]
    );
    if (!relationRes.rows[0]) return { success: false, error: 'Schueler gehoert nicht zu deinem Kundenstamm.' };

    const safePlanType = plan.plan_type === 'abo' ? 'abo' : 'einzelstunde';
    const safeTitle = String(plan.service_title || '').trim() || 'Reitstunde';
    const safeDuration = Math.max(1, Number(plan.duration_minutes) || 60);
    const safeUnitCents = Math.max(0, Math.round(Number(plan.unit_price_cents) || 0));
    const safeMonthlyCents =
      plan.monthly_price_cents === null || plan.monthly_price_cents === undefined
        ? null
        : Math.max(0, Math.round(Number(plan.monthly_price_cents) || 0));
    const safeSessions = Math.max(1, Math.round(Number(plan.sessions_per_month) || 1));
    const safeCancelHours = Math.max(0, Math.round(Number(plan.cancellation_hours) || 0));
    const safeCancellationEnabled = safePlanType === 'abo' ? plan.cancellation_enabled !== false : false;
    const requestedMaxCancellationRaw = plan.max_cancellations_per_month;
    const safeMaxCancellations =
      safePlanType === 'abo' && safeCancellationEnabled
        ? Math.min(
            safeSessions,
            requestedMaxCancellationRaw === null || requestedMaxCancellationRaw === undefined
              ? safeSessions
              : Math.max(0, Math.round(Number(requestedMaxCancellationRaw) || 0))
          )
        : 0;
    const safeRequireBookingConfirmation = plan.require_confirmation_each_booking === true;

    await pool.query(
      `INSERT INTO student_service_plans
        (expert_id, student_id, plan_type, service_title, duration_minutes, unit_price_cents, monthly_price_cents, sessions_per_month, cancellation_hours, cancellation_enabled, max_cancellations_per_month, require_confirmation_each_booking, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE)
       ON CONFLICT (expert_id, student_id) DO UPDATE SET
         plan_type = EXCLUDED.plan_type,
         service_title = EXCLUDED.service_title,
         duration_minutes = EXCLUDED.duration_minutes,
         unit_price_cents = EXCLUDED.unit_price_cents,
         monthly_price_cents = EXCLUDED.monthly_price_cents,
         sessions_per_month = EXCLUDED.sessions_per_month,
         cancellation_hours = EXCLUDED.cancellation_hours,
         cancellation_enabled = EXCLUDED.cancellation_enabled,
         max_cancellations_per_month = EXCLUDED.max_cancellations_per_month,
         require_confirmation_each_booking = EXCLUDED.require_confirmation_each_booking,
         active = TRUE,
         updated_at = NOW()`,
      [
        eId,
        sId,
        safePlanType,
        safeTitle,
        safeDuration,
        safeUnitCents,
        safeMonthlyCents,
        safeSessions,
        safeCancelHours,
        safeCancellationEnabled,
        safeMaxCancellations,
        safeRequireBookingConfirmation,
      ]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abrechnungsplan konnte nicht gespeichert werden.' };
  }
}

export async function getAboCancellations(expertId: number, studentId: number, month: string) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const sId = Number(studentId);
    const safeMonth = String(month || '').trim();
    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };
    if (!safeMonth || !/^\d{4}-\d{2}$/.test(safeMonth)) return { success: false, error: 'Ungueltiges Monatsformat.' };

    const result = await pool.query(
      `SELECT id, expert_id, student_id, cancelled_month, cancelled_date, reason, is_within_window, created_at
       FROM student_abo_cancellations
       WHERE expert_id = $1 AND student_id = $2 AND cancelled_month = $3
       ORDER BY cancelled_date ASC, id ASC`,
      [eId, sId, safeMonth]
    );

    return { success: true, cancellations: result.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Stornierungen konnten nicht geladen werden.', cancellations: [] };
  }
}

export async function addAboCancellation(payload: {
  expertId: number;
  studentId: number;
  month: string;
  cancelledDate: string;
  reason?: string;
  isWithinWindow?: boolean;
}) {
  try {
    await ensureExtraSchema();
    const eId = Number(payload.expertId);
    const sId = Number(payload.studentId);
    const safeMonth = String(payload.month || '').trim();
    const safeDate = String(payload.cancelledDate || '').trim();
    const safeReason = String(payload.reason || '').trim();
    const within = payload.isWithinWindow !== false;

    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };
    if (!safeMonth || !/^\d{4}-\d{2}$/.test(safeMonth)) return { success: false, error: 'Ungueltiges Monatsformat.' };
    if (!safeDate || !/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) return { success: false, error: 'Ungueltiges Datumsformat.' };

    const insertRes = await pool.query(
      `INSERT INTO student_abo_cancellations
        (expert_id, student_id, cancelled_month, cancelled_date, reason, is_within_window)
       VALUES ($1, $2, $3, $4::date, $5, $6)
       RETURNING id`,
      [eId, sId, safeMonth, safeDate, safeReason || null, within]
    );

    return { success: true, id: insertRes.rows[0]?.id || null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Stornierung konnte nicht gespeichert werden.' };
  }
}

export async function removeAboCancellation(expertId: number, cancellationId: number) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const cId = Number(cancellationId);
    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(cId) || cId <= 0) return { success: false, error: 'Ungueltige Stornierungsid.' };

    await pool.query(
      'DELETE FROM student_abo_cancellations WHERE id = $1 AND expert_id = $2',
      [cId, eId]
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function setAboCancellationCountForMonth(payload: {
  expertId: number;
  studentId: number;
  month: string;
  count: number;
}) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();

    const eId = Number(payload.expertId);
    const sId = Number(payload.studentId);
    const safeMonth = String(payload.month || '').trim();
    const requestedCount = Math.max(0, Math.round(Number(payload.count) || 0));

    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };
    if (!safeMonth || !/^\d{4}-\d{2}$/.test(safeMonth)) return { success: false, error: 'Ungueltiges Monatsformat.' };

    const planRes = await client.query(
      `SELECT plan_type, sessions_per_month, cancellation_enabled, max_cancellations_per_month
       FROM student_service_plans
       WHERE expert_id = $1 AND student_id = $2 AND active = TRUE
       LIMIT 1`,
      [eId, sId]
    );

    const plan = planRes.rows[0];
    if (!plan || String(plan.plan_type) !== 'abo') {
      return { success: false, error: 'Kein aktiver Abo-Plan gefunden.' };
    }
    if (plan.cancellation_enabled === false) {
      return { success: false, error: 'Ruecktritte sind fuer diesen Plan deaktiviert.' };
    }

    const sessionsPerMonth = Math.max(1, Number(plan.sessions_per_month) || 1);
    const configuredLimit = Math.max(0, Number(plan.max_cancellations_per_month) || 0);
    const effectiveLimit = configuredLimit > 0 ? configuredLimit : sessionsPerMonth;
    const maxAllowed = Math.min(sessionsPerMonth, effectiveLimit);
    const targetCount = Math.min(requestedCount, maxAllowed);

    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT id, cancelled_date
       FROM student_abo_cancellations
       WHERE expert_id = $1
         AND student_id = $2
         AND cancelled_month = $3
         AND is_within_window = TRUE
       ORDER BY cancelled_date ASC, id ASC`,
      [eId, sId, safeMonth]
    );

    const existing = existingRes.rows || [];
    if (existing.length > targetCount) {
      const idsToDelete = existing.slice(targetCount).map((row: any) => Number(row.id)).filter((id: number) => Number.isInteger(id) && id > 0);
      if (idsToDelete.length > 0) {
        await client.query(
          `DELETE FROM student_abo_cancellations
           WHERE expert_id = $1
             AND student_id = $2
             AND id = ANY($3::int[])`,
          [eId, sId, idsToDelete]
        );
      }
    } else if (existing.length < targetCount) {
      const [yearRaw, monthRaw] = safeMonth.split('-').map((part) => Number(part));
      const year = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
      const monthNumber = Number.isFinite(monthRaw) ? monthRaw : 1;
      const daysInMonth = new Date(year, monthNumber, 0).getDate();

      for (let idx = existing.length; idx < targetCount; idx += 1) {
        const day = Math.min(daysInMonth, idx + 1);
        const cancelledDate = `${safeMonth}-${String(day).padStart(2, '0')}`;
        await client.query(
          `INSERT INTO student_abo_cancellations
            (expert_id, student_id, cancelled_month, cancelled_date, reason, is_within_window)
           VALUES ($1, $2, $3, $4::date, $5, TRUE)`,
          [eId, sId, safeMonth, cancelledDate, 'Ruecktritt laut Planvorgabe']
        );
      }
    }

    await client.query('COMMIT');
    return { success: true, count: targetCount };
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // noop
    }
    return { success: false, error: error.message || 'Ruecktrittsanzahl konnte nicht gespeichert werden.' };
  } finally {
    client.release();
  }
}

export async function createMonthlyAboBookingFromPlan(expertId: number, studentId: number, month: string) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const sId = Number(studentId);
    const safeMonth = String(month || '').trim();

    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };
    if (!safeMonth || !/^\d{4}-\d{2}$/.test(safeMonth)) return { success: false, error: 'Ungueltiges Monatsformat.' };

    const planRes = await pool.query(
      'SELECT * FROM student_service_plans WHERE expert_id = $1 AND student_id = $2 AND active = TRUE LIMIT 1',
      [eId, sId]
    );
    if (!planRes.rows[0]) return { success: false, error: 'Kein Abrechnungsplan gefunden. Bitte zuerst einen Plan speichern.' };

    const plan = planRes.rows[0];
    if (plan.plan_type !== 'abo') return { success: false, error: 'Dieser Plan ist kein Monatsabo.' };

    const cancelRes = await pool.query(
      `SELECT COUNT(*)::int AS free_count FROM student_abo_cancellations
       WHERE expert_id = $1 AND student_id = $2 AND cancelled_month = $3 AND is_within_window = TRUE`,
      [eId, sId, safeMonth]
    );

    const rawCancellations = Number(cancelRes.rows[0]?.free_count || 0);
    const sessionsPerMonth = Number(plan.sessions_per_month) || 4;
    const cancellationsEnabled = plan.cancellation_enabled !== false;
    const maxCancellationsPerMonth = Math.max(0, Number(plan.max_cancellations_per_month) || 0);
    const effectiveMaxCancellations = maxCancellationsPerMonth > 0 ? maxCancellationsPerMonth : sessionsPerMonth;
    const freeCancellations = cancellationsEnabled ? Math.min(rawCancellations, effectiveMaxCancellations, sessionsPerMonth) : 0;
    const billableSessions = Math.max(0, sessionsPerMonth - freeCancellations);

    let unitPriceEuro: number;
    let quantity: number;

    if (plan.monthly_price_cents !== null && plan.monthly_price_cents !== undefined) {
      const monthlyCents = Number(plan.monthly_price_cents);
      if (billableSessions === 0 || sessionsPerMonth === 0) {
        unitPriceEuro = 0;
        quantity = 1;
      } else {
        const ratio = billableSessions / sessionsPerMonth;
        unitPriceEuro = Math.round(monthlyCents * ratio) / 100;
        quantity = 1;
      }
    } else {
      unitPriceEuro = Number(plan.unit_price_cents) / 100;
      quantity = billableSessions || 1;
    }

    return await ensureRecurringStudentBooking({
      expertId: eId,
      studentId: sId,
      month: safeMonth,
      serviceTitle: String(plan.service_title || 'Monatsabo'),
      durationMinutes: plan.duration_minutes ?? undefined,
      quantity,
      unitPriceEuro,
      cycleDay: 1,
      sourceOfferId: 'abo',
      sourcePriceLabel: `${sessionsPerMonth}x-${freeCancellations}cancel`,
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getExpertCalendarSlotsForExpert(expertId: number, studentId: number, month?: string) {
  try {
    await ensureExtraSchema();
    const eId = Number(expertId);
    const sId = Number(studentId);
    const safeMonth = String(month || '').trim();

    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.', items: [], calendarEnabled: false };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.', items: [], calendarEnabled: false };

    const plan = await getUserPlanDefinition(eId, 'experte');
    const result = await pool.query(
      `SELECT id,
              release_month,
              slot_start,
              duration_minutes,
              service_title,
              unit_price_cents,
              location,
              notes,
              status,
              booked_booking_id,
              created_at,
              updated_at
       FROM expert_calendar_slots
       WHERE expert_id = $1
         AND student_id = $2
         AND ($3 = '' OR release_month = $3 OR to_char(slot_start, 'YYYY-MM') = $3)
       ORDER BY slot_start ASC, id ASC`,
      [eId, sId, safeMonth]
    );

    return {
      success: true,
      calendarEnabled: Boolean(plan.calendarBookingEnabled),
      planLabel: plan.label,
      items: result.rows || [],
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Kalenderslots konnten nicht geladen werden.', items: [], calendarEnabled: false };
  }
}

export async function setExpertWeeklyAvailability(payload: {
  expertId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  serviceTitle: string;
  unitPriceEuro?: number;
  location?: string;
  notes?: string;
  repeatUntil: string;
}) {
  try {
    await ensureExtraSchema();

    const eId = Number(payload.expertId);
    if (!Number.isInteger(eId) || eId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.' };
    }

    const dayOfWeek = Number(payload.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { success: false, error: 'Ungültiger Wochentag (0-6).' };
    }

    const startTime = String(payload.startTime || '').trim();
    const endTime = String(payload.endTime || '').trim();
    if (!startTime || !endTime) {
      return { success: false, error: 'Bitte Start- und Endzeit angeben.' };
    }

    const serviceTitle = String(payload.serviceTitle || '').trim();
    if (!serviceTitle) {
      return { success: false, error: 'Bitte Servicetitel angeben.' };
    }

    const unitPriceCents = Math.round((Number(payload.unitPriceEuro || 0) || 0) * 100);
    const slotDurationMinutes = Number(payload.slotDurationMinutes || 60);
    const location = String(payload.location || '').trim() || null;
    const notes = String(payload.notes || '').trim() || null;
    const repeatUntil = String(payload.repeatUntil || '').trim();

    if (!repeatUntil) {
      return { success: false, error: 'Bitte Gültigkeitsdatum angeben.' };
    }

    const result = await pool.query(
      `INSERT INTO expert_calendar_availability
       (expert_id, day_of_week, start_time, end_time, slot_duration_minutes, service_title, unit_price_cents, location, notes, repeat_until, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW(), NOW())
       RETURNING id`,
      [eId, dayOfWeek, startTime, endTime, slotDurationMinutes, serviceTitle, unitPriceCents, location, notes, repeatUntil]
    );

    await generateCalendarSlotsFromAvailability(eId);

    return {
      success: true,
      availabilityId: result.rows[0]?.id,
      message: 'Wöchentliche Verfügbarkeit gespeichert. Slots werden generiert.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Verfügbarkeit konnte nicht gespeichert werden.' };
  }
}

export async function getExpertWeeklyAvailability(expertId: number) {
  try {
    await ensureExtraSchema();

    const eId = Number(expertId);
    if (!Number.isInteger(eId) || eId <= 0) {
      return { success: false, error: 'Ungültige Experten-ID.', items: [] };
    }

    const result = await pool.query(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, service_title, unit_price_cents, location, notes, repeat_until, active, created_at
       FROM expert_calendar_availability
       WHERE expert_id = $1
       ORDER BY day_of_week ASC, start_time ASC`,
      [eId]
    );

    return {
      success: true,
      items: (result.rows || []).map((row: any) => ({
        id: row.id,
        dayOfWeek: row.day_of_week,
        dayName: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][row.day_of_week] || 'Unbekannt',
        startTime: row.start_time,
        endTime: row.end_time,
        slotDurationMinutes: row.slot_duration_minutes,
        serviceTitle: row.service_title,
        unitPriceCents: row.unit_price_cents,
        location: row.location,
        notes: row.notes,
        repeatUntil: row.repeat_until,
        active: row.active,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Verfügbarkeit konnte nicht geladen werden.', items: [] };
  }
}

export async function deleteExpertWeeklyAvailability(availabilityId: number) {
  try {
    await ensureExtraSchema();

    const aId = Number(availabilityId);
    if (!Number.isInteger(aId) || aId <= 0) {
      return { success: false, error: 'Ungültige Verfügbarkeits-ID.' };
    }

    await pool.query(
      `UPDATE expert_calendar_availability SET active = FALSE, updated_at = NOW() WHERE id = $1`,
      [aId]
    );

    return { success: true, message: 'Wöchentliche Verfügbarkeit deaktiviert.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Verfügbarkeit konnte nicht gelöscht werden.' };
  }
}

async function generateCalendarSlotsFromAvailability(expertId: number, forWeeks: number = 12) {
  try {
    await ensureExtraSchema();

    const eId = Number(expertId);
    if (!Number.isInteger(eId) || eId <= 0) return;

    const availRes = await pool.query(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, service_title, unit_price_cents, location, notes, repeat_until
       FROM expert_calendar_availability
       WHERE expert_id = $1 AND active = TRUE AND repeat_until > NOW()
       ORDER BY day_of_week ASC, start_time ASC`,
      [eId]
    );

    if (!availRes.rows || availRes.rows.length === 0) return;

    const slotsToInsert: any[] = [];
    const now = new Date();
    const endDate = new Date(now.getTime() + forWeeks * 7 * 24 * 60 * 60 * 1000);

    for (const avail of availRes.rows) {
      const targetDayOfWeek = Number(avail.day_of_week);
      const durationMins = Number(avail.slot_duration_minutes || 60);
      const [startHour, startMin] = String(avail.start_time).split(':').map(Number);
      const [endHour, endMin] = String(avail.end_time).split(':').map(Number);
      const repeatUntil = new Date(avail.repeat_until);

      // Find next occurrence of this day of week
      let current = new Date(now);
      const daysDiff = (targetDayOfWeek - current.getUTCDay() + 7) % 7;
      if (daysDiff > 0 || daysDiff === 0 && current.getUTCHours() * 60 + current.getUTCMinutes() >= startHour * 60 + startMin) {
        current = new Date(current.getTime() + daysDiff * 24 * 60 * 60 * 1000);
      } else if (daysDiff === 0) {
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      }

      // Generate slots for all future occurrences within repeat_until
      while (current <= repeatUntil && current <= endDate) {
        const slotStart = new Date(current);
        slotStart.setUTCHours(startHour, startMin, 0, 0);

        if (slotStart > repeatUntil) break;

        slotsToInsert.push({
          expertId: eId,
          studentId: null, // For weekly patterns, no specific student pre-assigned
          releaseMonth: slotStart.toISOString().substring(0, 7),
          slotStart: slotStart.toISOString(),
          durationMinutes: durationMins,
          serviceTitle: avail.service_title,
          unitPriceCents: avail.unit_price_cents,
          location: avail.location,
          notes: avail.notes,
          status: 'open',
        });

        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    // Bulk insert slots (avoid duplicates)
    if (slotsToInsert.length > 0) {
      for (const slot of slotsToInsert) {
        await pool.query(
          `INSERT INTO expert_calendar_slots
           (expert_id, student_id, release_month, slot_start, duration_minutes, service_title, unit_price_cents, location, notes, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [slot.expertId, slot.studentId, slot.releaseMonth, slot.slotStart, slot.durationMinutes, slot.serviceTitle, slot.unitPriceCents, slot.location, slot.notes, slot.status]
        );
      }
    }
  } catch (error: any) {
    // Silently fail on slot generation
  }
}

export async function releaseExpertCalendarSlot(payload: {
  expertId: number;
  studentId: number;
  releaseMonth?: string;
  slotStart: string;
  durationMinutes?: number;
  serviceTitle?: string;
  unitPriceEuro?: number;
  location?: string;
  notes?: string;
}) {
  try {
    await ensureExtraSchema();
    const eId = Number(payload.expertId);
    const sId = Number(payload.studentId);
    const releaseMonth = String(payload.releaseMonth || '').trim();
    const slotStart = String(payload.slotStart || '').trim();
    const durationMinutes = Math.max(15, Number(payload.durationMinutes) || 60);
    const serviceTitle = String(payload.serviceTitle || '').trim();
    const unitPriceEuro = Number(payload.unitPriceEuro || 0);
    const location = String(payload.location || '').trim();
    const notes = String(payload.notes || '').trim();

    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Schueler-ID.' };
    if (!slotStart) return { success: false, error: 'Bitte einen Termin waehlen.' };

    const plan = await getUserPlanDefinition(eId, 'experte');
    if (!plan.calendarBookingEnabled) {
      return { success: false, error: 'Kalenderbuchung ist nur im Experten-Abo verfuegbar.' };
    }

    const relationRes = await pool.query(
      `SELECT id FROM expert_students WHERE expert_id = $1 AND student_id = $2 AND active = TRUE LIMIT 1`,
      [eId, sId]
    );
    if (!relationRes.rows[0]) {
      return { success: false, error: 'Schueler gehoert nicht zu deinem Kundenstamm.' };
    }

    const planRes = await getStudentServicePlan(eId, sId);
    const storedPlan = planRes.success ? (planRes as any).plan : null;
    const fallbackTitle = String(storedPlan?.service_title || '').trim();
    const fallbackUnitPriceEuro = Number(storedPlan?.unit_price_cents || 0) / 100;
    const parsedStart = new Date(slotStart);

    if (!Number.isFinite(parsedStart.getTime())) {
      return { success: false, error: 'Termin ist ungueltig.' };
    }

    const effectiveTitle = serviceTitle || fallbackTitle || 'Kalendertermin';
    const effectivePriceEuro = Number.isFinite(unitPriceEuro) && unitPriceEuro >= 0 ? unitPriceEuro : fallbackUnitPriceEuro;

    const insertRes = await pool.query(
      `INSERT INTO expert_calendar_slots (
         expert_id, student_id, release_month, slot_start, duration_minutes, service_title, unit_price_cents, location, notes, status, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', NOW())
       RETURNING id, slot_start`,
      [
        eId,
        sId,
        releaseMonth || null,
        parsedStart.toISOString(),
        durationMinutes,
        effectiveTitle,
        Math.max(0, Math.round(effectivePriceEuro * 100)),
        location || null,
        notes || null,
      ]
    );

    await createUserNotification(pool, {
      userId: sId,
      title: 'Neuer Kalendertermin freigegeben',
      message: `${plan.label}: Dein Experte hat einen buchbaren Termin am ${parsedStart.toLocaleString('de-DE')} freigegeben.`,
      href: '/einstellungen',
      notificationType: 'calendar'
    });

    return { success: true, slotId: insertRes.rows[0]?.id || null, slotStart: insertRes.rows[0]?.slot_start || parsedStart.toISOString() };
  } catch (error: any) {
    return { success: false, error: error.message || 'Kalendertermin konnte nicht freigegeben werden.' };
  }
}

export async function cancelExpertCalendarSlot(payload: { expertId: number; slotId: number }) {
  try {
    await ensureExtraSchema();
    const eId = Number(payload.expertId);
    const slotId = Number(payload.slotId);
    if (!Number.isInteger(eId) || eId <= 0) return { success: false, error: 'Ungueltige Experten-ID.' };
    if (!Number.isInteger(slotId) || slotId <= 0) return { success: false, error: 'Ungueltiger Termin.' };

    const res = await pool.query(
      `UPDATE expert_calendar_slots
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND expert_id = $2 AND status = 'open'
       RETURNING student_id, slot_start`,
      [slotId, eId]
    );

    if (!res.rows[0]) {
      return { success: false, error: 'Termin konnte nicht mehr storniert werden.' };
    }

    await createUserNotification(pool, {
      userId: Number(res.rows[0].student_id),
      title: 'Kalendertermin zurueckgezogen',
      message: `Ein freigegebener Termin am ${new Date(res.rows[0].slot_start).toLocaleString('de-DE')} wurde wieder zurueckgezogen.`,
      href: '/einstellungen',
      notificationType: 'calendar'
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Termin konnte nicht storniert werden.' };
  }
}

export async function getAvailableCalendarSlotsForStudent(studentId: number) {
  try {
    await ensureExtraSchema();
    const sId = Number(studentId);
    if (!Number.isInteger(sId) || sId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.', items: [] };
    }

    const result = await pool.query(
      `SELECT ecs.id,
              ecs.expert_id,
              ecs.student_id,
              ecs.release_month,
              ecs.slot_start,
              ecs.duration_minutes,
              ecs.service_title,
              ecs.unit_price_cents,
              ecs.location,
              ecs.notes,
              ecs.status,
              COALESCE(up.display_name, TRIM(CONCAT(u.vorname, ' ', u.nachname)), 'Experte') AS expert_name
       FROM expert_calendar_slots ecs
       JOIN users u ON u.id = ecs.expert_id
       LEFT JOIN user_profiles up ON up.user_id = ecs.expert_id
       JOIN user_subscriptions us ON us.user_id = ecs.expert_id
       WHERE ecs.student_id = $1
         AND ecs.status = 'open'
         AND ecs.slot_start >= NOW()
         AND us.plan_key = 'experte_pro'
       ORDER BY ecs.slot_start ASC, ecs.id ASC`,
      [sId]
    );

    return { success: true, items: result.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Freigegebene Termine konnten nicht geladen werden.', items: [] };
  }
}

export async function bookExpertCalendarSlot(payload: { studentId: number; slotId: number }) {
  const client = await pool.connect();
  try {
    await ensureExtraSchema();
    const sId = Number(payload.studentId);
    const slotId = Number(payload.slotId);

    if (!Number.isInteger(sId) || sId <= 0) return { success: false, error: 'Ungueltige Nutzer-ID.' };
    if (!Number.isInteger(slotId) || slotId <= 0) return { success: false, error: 'Ungueltiger Termin.' };

    await client.query('BEGIN');

    const slotRes = await client.query(
      `SELECT ecs.id,
              ecs.expert_id,
              ecs.student_id,
              ecs.slot_start,
              ecs.duration_minutes,
              ecs.service_title,
              ecs.unit_price_cents,
              ecs.location,
              ecs.notes,
              ecs.status,
              COALESCE(up.display_name, TRIM(CONCAT(u.vorname, ' ', u.nachname)), 'Experte') AS expert_name
       FROM expert_calendar_slots ecs
       JOIN users u ON u.id = ecs.expert_id
       LEFT JOIN user_profiles up ON up.user_id = ecs.expert_id
       WHERE ecs.id = $1
       FOR UPDATE`,
      [slotId]
    );

    const slot = slotRes.rows[0];
    if (!slot) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Termin nicht gefunden.' };
    }
    if (Number(slot.student_id) !== sId) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Dieser Termin ist nicht fuer dich freigegeben.' };
    }
    if (String(slot.status) !== 'open') {
      await client.query('ROLLBACK');
      return { success: false, error: 'Dieser Termin wurde bereits vergeben oder storniert.' };
    }

    const slotStart = new Date(slot.slot_start);
    if (!Number.isFinite(slotStart.getTime()) || slotStart.getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Dieser Termin liegt nicht mehr in der Zukunft.' };
    }

    const expertPlan = await getUserPlanDefinition(Number(slot.expert_id), 'experte');
    if (!expertPlan.calendarBookingEnabled) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Die Kalenderbuchung ist fuer diesen Experten nicht mehr aktiv.' };
    }
    const customerPlan = await getUserPlanDefinition(sId, 'nutzer');
    const unitPriceCents = Math.max(0, Number(slot.unit_price_cents || 0));
    const totalCents = unitPriceCents;
    const protection = computeProtectionQuote(totalCents, expertPlan, customerPlan);
    const bookingDate = slotStart.toISOString().slice(0, 10);
    const slotNote = [
      slot.notes ? String(slot.notes).trim() : '',
      `Kalenderbuchung am ${slotStart.toLocaleString('de-DE')}`,
      slot.location ? `Ort: ${slot.location}` : ''
    ].filter(Boolean).join('\n');

    const insertBookingRes = await client.query(
      `INSERT INTO expert_student_bookings
        (expert_id, student_id, booking_date, service_title, duration_minutes, quantity, unit_price_cents, total_cents,
         protection_fee_cents, customer_total_cents, expert_payout_cents,
         provider_commission_bps, customer_discount_bps, final_fee_bps, protection_model,
         expert_plan_key, customer_plan_key, status, notes)
       VALUES ($1, $2, $3::date, $4, $5, 1, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'offen', $17)
       RETURNING id`,
      [
        Number(slot.expert_id),
        sId,
        bookingDate,
        String(slot.service_title || 'Kalendertermin'),
        Number(slot.duration_minutes || 60),
        unitPriceCents,
        totalCents,
        protection.protectionFeeCents,
        protection.customerTotalCents,
        protection.expertPayoutCents,
        protection.providerCommissionBps,
        protection.customerDiscountBps,
        protection.finalFeeBps,
        protection.protectionModel,
        expertPlan.key,
        customerPlan.key,
        slotNote || null,
      ]
    );

    const bookingId = Number(insertBookingRes.rows[0]?.id || 0);

    await client.query(
      `INSERT INTO user_bookings (user_id, booking_type, provider_name, booking_date, status, location, notes)
       VALUES ($1, $2, $3, $4, 'offen', $5, $6)`,
      [
        sId,
        String(slot.service_title || 'Kalendertermin'),
        String(slot.expert_name || 'Experte'),
        slotStart.toISOString(),
        slot.location || null,
        slotNote || null,
      ]
    );

    await client.query(
      `UPDATE expert_calendar_slots
       SET status = 'booked',
           booked_booking_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [slotId, bookingId]
    );

    await createUserNotification(client, {
      userId: Number(slot.expert_id),
      title: 'Kalendertermin gebucht',
      message: `Ein freigegebener Termin am ${slotStart.toLocaleString('de-DE')} wurde von deinem Kunden gebucht.`,
      href: '/dashboard/experte/schueler',
      notificationType: 'calendar'
    });
    await createUserNotification(client, {
      userId: sId,
      title: 'Termin erfolgreich gebucht',
      message: `Dein Termin am ${slotStart.toLocaleString('de-DE')} wurde verbindlich eingetragen.`,
      href: '/einstellungen',
      notificationType: 'calendar'
    });

    await client.query('COMMIT');
    return { success: true, bookingId, slotStart: slotStart.toISOString() };
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // noop
    }
    return { success: false, error: error.message || 'Termin konnte nicht gebucht werden.' };
  } finally {
    client.release();
  }
}

export async function uploadGalerieMedia(userId: number, formData: FormData) {
  try {
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'Keine Datei gefunden.' };

    const mime = String(file.type || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    if (!isImage && !isVideo) {
      return { success: false, error: 'Nur Bilder und Videos sind erlaubt.' };
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      return { success: false, error: 'Bild ist zu gross (max. 10 MB).' };
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      return { success: false, error: 'Video ist zu gross (max. 80 MB).' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public/uploads/galerie');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${validUserId}-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const mediaType = isVideo ? 'video' : 'image';
    return { success: true, url: `/uploads/galerie/${fileName}`, mediaType };
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload fehlgeschlagen.' };
  }
}

export async function saveGalerieItems(userId: number, items: Array<{ type: string; url: string }>) {
  try {
    await ensureExtraSchema();
    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const safeItems = items
      .filter((item) => item && typeof item.url === 'string' && item.url.trim())
      .slice(0, 20)
      .map((item) => ({
        type: item.type === 'video' ? 'video' : 'image',
        url: String(item.url).trim()
      }));

    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, role, profil_data, updated_at)
       SELECT u.id, u.role, jsonb_build_object('galerie', $2::jsonb), NOW()
       FROM users u
       WHERE u.id = $1
       ON CONFLICT (user_id) DO UPDATE
       SET profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || jsonb_build_object('galerie', $2::jsonb),
           updated_at = NOW()
       RETURNING user_id`,
      [validUserId, JSON.stringify(safeItems)]
    );

    if (result.rowCount === 0) {
      return { success: false, error: 'Nutzerprofil nicht gefunden.' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Speichern fehlgeschlagen.' };
  }
}

export async function adminToggleUserWhitelist(adminCode: string, targetUserId: number) {
  if (!isAdminAuthorized(adminCode)) return { success: false, error: "Nicht autorisiert" };

  try {
    const res = await pool.query(
      `UPDATE users SET is_whitelisted = NOT is_whitelisted WHERE id = $1 RETURNING is_whitelisted`,
      [targetUserId]
    );
    return { success: true, newState: res.rows[0].is_whitelisted };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminFindUserByEmail(adminCode: string, email: string) {
  if (!isAdminAuthorized(adminCode)) return { success: false, error: "Nicht autorisiert" };

  const res = await pool.query(
    `SELECT id, email, vorname, nachname, role, created_at, is_whitelisted FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return { success: true, user: res.rows[0] || null };
}
// ... (dein bestehender Code) ...

/**
 * Ergänzung für ensureExtraSchema()
 * Diese Tabelle speichert die aktiven Abos und Zahlungsdaten
 */
async function ensureSubscriptionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_key TEXT NOT NULL DEFAULT 'free',
      payment_method TEXT DEFAULT 'sepa',
      sepa_iban TEXT,
      paypal_email TEXT,
      status TEXT DEFAULT 'active',
      next_billing_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Sicherstellen, dass die Spalte is_whitelisted in users existiert (für Admin/VIP)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN DEFAULT FALSE;
  `);
}

/**
 * Holt Abo-Details inkl. Preisberechnung (Early Bird / VIP)
 */
export async function getSubscriptionDetails(userId: number) {
  try {
    await ensureExtraSchema();
    await ensureSubscriptionTable();

    // Nutzerdaten für Rolle und Erstellungsdatum holen
    const userRes = await pool.query(
      `SELECT role, created_at, is_whitelisted FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rowCount === 0) return { success: false, error: "Nutzer nicht gefunden" };
    
    const user = userRes.rows[0];
    const isExperte = user.role === 'experte';
    const isVIP = !!user.is_whitelisted;

    // Aktuelles Abo laden
    const subRes = await pool.query(
      `SELECT * FROM user_subscriptions WHERE user_id = $1`,
      [userId]
    );
    const currentSub = subRes.rows[0] || { plan_key: isExperte ? 'free' : 'nutzer_standard' };

    // Preislogik: Registrierung vor 01. Mai 2026 = Early Bird
    const EARLY_BIRD_DEADLINE = new Date("2026-05-01T00:00:00Z");
    const isEarlyBird = new Date(user.created_at) < EARLY_BIRD_DEADLINE;

    // Pläne definieren
    const plans = isExperte ? [
      {
        key: "experte_standard",
        name: isEarlyBird ? "Experte Standard (Early Bird)" : "Experte Standard",
        priceCents: isVIP ? 0 : (isEarlyBird ? 1900 : 2900),
        commission: "5%",
        features: ["Eigenes Profil", "Kalender-Tool", "Buchungssystem"]
      },
      {
        key: "experte_premium",
        name: "Experte Premium",
        priceCents: isVIP ? 0 : 4900,
        commission: "0%",
        features: ["Alle Standard Features", "Support-Priorität", "Exklusive Sichtbarkeit"]
      }
    ] : [
      {
        key: "nutzer_standard",
        name: "Basis (Kostenlos)",
        priceCents: 0,
        features: ["Experten finden", "Bewertungen schreiben", "Merkliste"]
      }
    ];

    return { success: true, data: { plans, currentSub, isVIP, isEarlyBird } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Abo speichern oder aktualisieren
 */
export async function updateSubscription(userId: number, formData: any) {
  try {
    const aboSanction = await getActiveSanction(Number(userId), ['abo']);
    if (aboSanction) {
      return {
        success: false,
        error: `Abo-Änderungen sind bis ${new Date(aboSanction.ends_at).toLocaleDateString('de-DE')} gesperrt.`
      };
    }

    const { planKey, paymentMethod, iban, paypalEmail } = formData;
    
    await pool.query(
      `INSERT INTO user_subscriptions 
        (user_id, plan_key, payment_method, sepa_iban, paypal_email, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         plan_key = EXCLUDED.plan_key,
         payment_method = EXCLUDED.payment_method,
         sepa_iban = EXCLUDED.sepa_iban,
         paypal_email = EXCLUDED.paypal_email,
         updated_at = NOW()`,
      [userId, planKey, paymentMethod, iban, paypalEmail]
    );

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function adminToggleVip(adminCode: string, targetUserId: number) {
  if (!isAdminAuthorized(adminCode)) return { success: false, error: "Nicht autorisiert." };

  try {
    const res = await pool.query(
      `UPDATE users SET is_whitelisted = NOT COALESCE(is_whitelisted, false) 
       WHERE id = $1 RETURNING is_whitelisted`,
      [targetUserId]
    );
    return { success: true, isVip: res.rows[0].is_whitelisted };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Teammitglieder für Experten
 */
export async function getExpertTeamMembers(expertId: number) {
  try {
    const result = await pool.query(
      `SELECT
        etm.id,
        etm.name,
        etm.role,
        etm.description,
        etm.member_user_id,
        u.email,
        up.display_name as user_display_name,
        etm.created_at
      FROM expert_team_members etm
      LEFT JOIN users u ON etm.member_user_id = u.id
      LEFT JOIN user_profiles up ON etm.member_user_id = up.user_id
      WHERE etm.expert_id = $1
      ORDER BY etm.created_at DESC`,
      [expertId]
    );

    return {
      success: true,
      teamMembers: result.rows || []
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Teammitglieder konnten nicht geladen werden.' };
  }
}

export async function addExpertTeamMember(expertId: number, payload: {
  name: string;
  role?: string;
  description?: string;
  memberUserId?: number;
}) {
  try {
    const { name, role, description, memberUserId } = payload;
    let resolvedName = String(name || '').trim();

    // Wenn memberUserId angegeben, prüfe ob der User existiert
    if (memberUserId) {
      const userCheck = await pool.query(
        `SELECT u.id,
                COALESCE(NULLIF(TRIM(up.display_name), ''), NULLIF(TRIM(u.vorname || ' ' || u.nachname), ''), NULLIF(TRIM(u.email), '')) AS resolved_name
         FROM users u
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE u.id = $1`,
        [memberUserId]
      );
      if (userCheck.rows.length === 0) {
        return { success: false, error: 'Der angegebene Benutzer existiert nicht.' };
      }

      if (!resolvedName) {
        resolvedName = String(userCheck.rows[0]?.resolved_name || '').trim();
      }
    }

    if (!resolvedName) {
      return { success: false, error: 'Bitte ein vorhandenes Profil verlinken oder einen Namen angeben.' };
    }

    const result = await pool.query(
      `INSERT INTO expert_team_members (expert_id, member_user_id, name, role, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [expertId, memberUserId || null, resolvedName, role || null, description || null]
    );

    return {
      success: true,
      teamMemberId: result.rows[0].id
    };
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: 'Dieser Benutzer ist bereits als Teammitglied hinzugefügt.' };
    }
    return { success: false, error: error.message || 'Teammitglied konnte nicht hinzugefügt werden.' };
  }
}

export async function updateExpertTeamMember(expertId: number, teamMemberId: number, payload: {
  name?: string;
  role?: string;
  description?: string;
}) {
  try {
    const { name, role, description } = payload;

    await pool.query(
      `UPDATE expert_team_members
       SET name = COALESCE($1, name),
           role = $2,
           description = $3,
           updated_at = NOW()
       WHERE id = $4 AND expert_id = $5`,
      [name, role, description, teamMemberId, expertId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Teammitglied konnte nicht aktualisiert werden.' };
  }
}

export async function removeExpertTeamMember(expertId: number, teamMemberId: number) {
  try {
    await pool.query(
      'DELETE FROM expert_team_members WHERE id = $1 AND expert_id = $2',
      [teamMemberId, expertId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Teammitglied konnte nicht entfernt werden.' };
  }
}

/**
 * Pferde für Experten
 */
export async function getExpertHorses(expertId: number) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        breed,
        age,
        notes,
        image_url,
        created_at
      FROM expert_horses
      WHERE expert_id = $1
      ORDER BY created_at DESC`,
      [expertId]
    );

    return {
      success: true,
      horses: result.rows || []
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Pferde konnten nicht geladen werden.' };
  }
}

export async function addExpertHorse(expertId: number, payload: {
  name: string;
  breed?: string;
  age?: number;
  notes?: string;
  imageUrl?: string;
}) {
  try {
    const { name, breed, age, notes, imageUrl } = payload;

    const result = await pool.query(
      `INSERT INTO expert_horses (expert_id, name, breed, age, notes, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [expertId, name, breed || null, age || null, notes || null, imageUrl || null]
    );

    return {
      success: true,
      horseId: result.rows[0].id
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Pferd konnte nicht hinzugefügt werden.' };
  }
}

export async function updateExpertHorse(expertId: number, horseId: number, payload: {
  name?: string;
  breed?: string;
  age?: number;
  notes?: string;
  imageUrl?: string;
}) {
  try {
    const { name, breed, age, notes, imageUrl } = payload;

    await pool.query(
      `UPDATE expert_horses
       SET name = COALESCE($1, name),
           breed = $2,
           age = $3,
           notes = $4,
           image_url = $5,
           updated_at = NOW()
       WHERE id = $6 AND expert_id = $7`,
      [name, breed, age, notes, imageUrl, horseId, expertId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Pferd konnte nicht aktualisiert werden.' };
  }
}

export async function removeExpertHorse(expertId: number, horseId: number) {
  try {
    await pool.query(
      'DELETE FROM expert_horses WHERE id = $1 AND expert_id = $2',
      [horseId, expertId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Pferd konnte nicht entfernt werden.' };
  }
}

export async function updateProfilePost(payload: {
  userId: number;
  postId: number;
  title: string;
  content: string;
}) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }
    if (!title) {
      return { success: false, error: 'Bitte Titel eingeben.' };
    }
    if (!content) {
      return { success: false, error: 'Bitte Inhalt eingeben.' };
    }

    const result = await pool.query(
      `UPDATE social_posts
       SET title = $1,
           content = $2,
           updated_at = NOW()
       WHERE id = $3
         AND author_user_id = $4
         AND group_id IS NULL
       RETURNING id`,
      [title, content, postId, userId]
    );

    if (result.rowCount === 0) {
      return { success: false, error: 'Beitrag nicht gefunden oder keine Berechtigung.' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function removeProfilePost(payload: { userId: number; postId: number }) {
  try {
    await ensureExtraSchema();
    const userId = Number(payload.userId);
    const postId = Number(payload.postId);

    if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(postId) || postId <= 0) {
      return { success: false, error: 'Ungültige Daten.' };
    }

    const result = await pool.query(
      `DELETE FROM social_posts
       WHERE id = $1
         AND author_user_id = $2
         AND group_id IS NULL
       RETURNING id`,
      [postId, userId]
    );

    if (result.rowCount === 0) {
      return { success: false, error: 'Beitrag nicht gefunden oder keine Berechtigung.' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Server-Fehler' };
  }
}

export async function getBookmarkedNetworkPosts(userId: number, limit = 120) {
  try {
    await ensureExtraSchema();
    await autoPublishExpiredGroupPosts();

    const viewerId = Number(userId);
    const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 200);
    if (!Number.isInteger(viewerId) || viewerId <= 0) {
      return { success: false, posts: [], error: 'Ungültige Nutzer-ID.' };
    }

        const res = await pool.query(
          `WITH bookmark_events AS (
        SELECT s.post_id,
          s.created_at,
          TRUE AS is_saved,
          FALSE AS is_liked
        FROM social_post_saves s
        WHERE s.user_id = $1

        UNION ALL

        SELECT l.post_id,
          l.created_at,
          FALSE AS is_saved,
          TRUE AS is_liked
        FROM social_post_likes l
        WHERE l.user_id = $1
      ),
      bookmarks AS (
        SELECT post_id,
          MAX(created_at) AS created_at,
          BOOL_OR(is_saved) AS is_saved,
          BOOL_OR(is_liked) AS is_liked,
          CASE
            WHEN BOOL_OR(is_saved) AND BOOL_OR(is_liked) THEN 'saved_liked'
            WHEN BOOL_OR(is_saved) THEN 'saved'
            ELSE 'liked'
          END AS bookmark_type
        FROM bookmark_events
        GROUP BY post_id
      )
       SELECT p.id,
              p.author_user_id,
              p.group_id,
              p.title,
              p.content,
              p.hashtags,
              p.media_items,
              p.post_target,
              p.moderation_status,
              p.moderation_deadline,
              p.rejection_reason,
              p.shared_post_id,
              p.created_at,
              u.vorname,
              u.nachname,
              u.role,
              g.name AS group_name,
              COALESCE(sc.comment_count, 0) AS comment_count,
              COALESCE(ss.save_count, 0) AS save_count,
              COALESCE(sl.like_count, 0) AS like_count,
              EXISTS (
                SELECT 1
                FROM social_post_likes splv
                WHERE splv.post_id = p.id
                  AND splv.user_id = $1
              ) AS liked_by_viewer,
              b.is_saved AS saved_by_viewer,
              b.created_at AS saved_at,
              b.bookmark_type
       FROM bookmarks b
       JOIN social_posts p ON p.id = b.post_id
       JOIN users u ON u.id = p.author_user_id
       LEFT JOIN social_groups g ON g.id = p.group_id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS comment_count
         FROM social_post_comments
         GROUP BY post_id
       ) sc ON sc.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS save_count
         FROM social_post_saves
         GROUP BY post_id
       ) ss ON ss.post_id = p.id
       LEFT JOIN (
         SELECT post_id, COUNT(*)::INT AS like_count
         FROM social_post_likes
         GROUP BY post_id
       ) sl ON sl.post_id = p.id
       WHERE (
         p.author_user_id = $1
         OR (
           p.moderation_status = 'approved'
           AND (
             p.group_id IS NULL
             OR EXISTS (
               SELECT 1
               FROM social_group_members gm
               WHERE gm.group_id = p.group_id
                 AND gm.user_id = $1
             )
           )
         )
         OR (
           p.group_id IS NOT NULL
           AND EXISTS (
             SELECT 1
             FROM social_group_members gm_owner
             WHERE gm_owner.group_id = p.group_id
               AND gm_owner.user_id = $1
               AND gm_owner.role = 'owner'
           )
         )
       )
       ORDER BY b.created_at DESC
       LIMIT $2`,
      [viewerId, safeLimit]
    );

    return { success: true, posts: res.rows };
  } catch (error: any) {
    return { success: false, posts: [], error: error.message || 'Server-Fehler' };
  }
}

export async function uploadProfileImage(userId: number, formData: FormData) {
  try {
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'Keine Datei gefunden.' };

    const mime = String(file.type || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    if (!isImage) {
      return { success: false, error: 'Nur Bilder sind erlaubt.' };
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return { success: false, error: 'Bild ist zu gross (max. 10 MB).' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'public/uploads/profile');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${validUserId}-profileimage-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return { success: true, url: `/uploads/profile/${fileName}` };
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload fehlgeschlagen.' };
  }
}

export async function persistProfileImageUrl(userId: number, imageUrl: string) {
  try {
    await ensureExtraSchema();

    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const safeUrl = String(imageUrl || '').trim();
    if (!safeUrl) {
      return { success: false, error: 'Ungueltige Bild-URL.' };
    }

    const userRes = await pool.query(
      `SELECT role FROM users WHERE id = $1 LIMIT 1`,
      [validUserId]
    );
    const role = String(userRes.rows[0]?.role || '').trim().toLowerCase() === 'experte' ? 'experte' : 'nutzer';

    await pool.query(
      `INSERT INTO user_profiles (user_id, role, profil_data, updated_at)
       VALUES ($1, $2, jsonb_build_object('profilbild_url', $3::text), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         profil_data = COALESCE(user_profiles.profil_data, '{}'::jsonb) || jsonb_build_object('profilbild_url', $3::text),
         updated_at = NOW()`,
      [validUserId, role, safeUrl]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Profilbild konnte nicht gespeichert werden.' };
  }
}

export async function uploadOwnAdvertisingMedia(userId: number, formData: FormData) {
  try {
    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'Keine Datei gefunden.' };

    const mime = String(file.type || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    if (!isImage) {
      return { success: false, error: 'Nur Bilder sind fuer Werbeanzeigen erlaubt.' };
    }

    if (file.size > 12 * 1024 * 1024) {
      return { success: false, error: 'Bild ist zu gross (max. 12 MB).' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ads');
    await mkdir(uploadDir, { recursive: true });

    const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const fileName = `${validUserId}-${Date.now()}-${safeName}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return { success: true, url: `/uploads/ads/${fileName}` };
  } catch (error: any) {
    return { success: false, error: error.message || 'Werbebild konnte nicht hochgeladen werden.' };
  }
}

export async function submitOwnAdvertising(payload: {
  userId: number;
  title: string;
  description?: string;
  mediaUrl: string;
  targetUrl?: string;
}) {
  try {
    await ensureExtraSchema();
    await ensureUserSubscriptionRow(payload.userId);

    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();
    const mediaUrl = String(payload.mediaUrl || '').trim();
    const targetUrl = String(payload.targetUrl || '').trim();

    if (title.length < 3) {
      return { success: false, error: 'Titel ist zu kurz.' };
    }
    if (!mediaUrl) {
      return { success: false, error: 'Bitte ein Werbebild hochladen.' };
    }
    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      return { success: false, error: 'Ziel-URL muss mit http:// oder https:// beginnen.' };
    }

    const userRes = await pool.query(
      `SELECT role FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const role = String(userRes.rows[0]?.role || '').trim().toLowerCase();
    if (role !== 'experte') {
      return { success: false, error: 'Eigene Werbung ist aktuell nur fuer Experten verfuegbar.' };
    }

    const subRes = await pool.query(
      `SELECT plan_key, lifetime_free_access FROM user_subscriptions WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const planKey = String(subRes.rows[0]?.plan_key || '').trim().toLowerCase();
    const hasLifetimeAccess = Boolean(subRes.rows[0]?.lifetime_free_access);
    if (planKey !== 'experte_pro' && !hasLifetimeAccess) {
      return { success: false, error: 'Eigene Werbung ist nur mit Experten Pro Abo moeglich.' };
    }

    const activeSubmissionRes = await pool.query(
      `SELECT id, status
       FROM user_advertising_submissions
       WHERE user_id = $1
         AND status IN ('pending', 'approved')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (activeSubmissionRes.rows.length > 0) {
      const existingStatus = String(activeSubmissionRes.rows[0]?.status || 'pending');
      return {
        success: false,
        error: existingStatus === 'approved'
          ? 'Du hast bereits eine freigegebene Werbung. Pro Experte ist nur eine Werbung erlaubt.'
          : 'Du hast bereits eine offene Werbeeinreichung. Pro Experte ist nur eine Werbung erlaubt.'
      };
    }

    const insertRes = await pool.query(
      `INSERT INTO user_advertising_submissions (
         user_id, role, plan_key, title, description, media_url, target_url, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
       RETURNING id, status, created_at`,
      [userId, role, planKey, title, description || null, mediaUrl, targetUrl || null]
    );

    return { success: true, submission: insertRes.rows[0] || null };
  } catch (error: any) {
    if (String(error?.message || '').includes('idx_user_advertising_one_active_per_user')) {
      return { success: false, error: 'Pro Experte ist nur eine aktive Werbung erlaubt.' };
    }
    return { success: false, error: error.message || 'Werbung konnte nicht eingereicht werden.' };
  }
}

export async function getOwnAdvertisingSubmissions(userId: number) {
  try {
    await ensureExtraSchema();
    const validUserId = Number(userId);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.', items: [] };
    }

    const res = await pool.query(
      `SELECT id, title, description, media_url, target_url, status, admin_note, reviewed_at, created_at,
              placement_slot, placement_order, placement_enabled, visible_from, visible_until
       FROM user_advertising_submissions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 60`,
      [validUserId]
    );

    return { success: true, items: res.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Werbeeinreichungen konnten nicht geladen werden.', items: [] };
  }
}

export async function adminGetAdvertisingSubmissions(adminCode: string, status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', items: [] };
    }

    const useFilter = status !== 'all';
    const res = await pool.query(
      `SELECT s.id,
              s.user_id,
              s.role,
              s.plan_key,
              s.title,
              s.description,
              s.media_url,
              s.target_url,
              s.status,
              s.admin_note,
              s.reviewed_at,
              s.created_at,
              s.placement_slot,
              s.placement_order,
              s.placement_enabled,
              s.visible_from,
              s.visible_until,
              u.vorname,
              u.nachname,
              u.email
       FROM user_advertising_submissions s
       JOIN users u ON u.id = s.user_id
       WHERE ($1::TEXT = 'all' OR s.status = $1)
       ORDER BY CASE WHEN s.status = 'pending' THEN 0 ELSE 1 END, s.created_at DESC
       LIMIT 200`,
      [useFilter ? status : 'all']
    );

    return { success: true, items: res.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Werbeeinreichungen konnten nicht geladen werden.', items: [] };
  }
}

export async function adminReviewAdvertisingSubmission(payload: {
  adminCode: string;
  submissionId: number;
  decision: 'approved' | 'rejected';
  note?: string;
  reviewerUserId?: number | null;
  placementSlot?: AdvertisingPlacementSlot;
  placementOrder?: number;
  placementEnabled?: boolean;
  visibleFrom?: string | null;
  visibleUntil?: string | null;
}) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const submissionId = Number(payload.submissionId);
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return { success: false, error: 'Ungueltige Einreichung.' };
    }

    const decision = payload.decision === 'approved' ? 'approved' : 'rejected';
    const note = String(payload.note || '').trim();
    const rawReviewerUserId = Number(payload.reviewerUserId);
    const safeReviewerUserId = Number.isInteger(rawReviewerUserId) && rawReviewerUserId > 0 ? rawReviewerUserId : null;
    const allowedSlots: AdvertisingPlacementSlot[] = ['none', 'startseite_top', 'startseite_sidebar'];
    const rawSlot = String(payload.placementSlot || 'none').trim() as AdvertisingPlacementSlot;
    const placementSlot = allowedSlots.includes(rawSlot) ? rawSlot : 'none';
    const rawOrder = Number(payload.placementOrder);
    const placementOrder = Number.isFinite(rawOrder) ? Math.max(1, Math.min(999, Math.trunc(rawOrder))) : 100;
    const placementEnabled = payload.placementEnabled === true && decision === 'approved' && placementSlot !== 'none';

    const parseDate = (value?: string | null) => {
      const text = String(value || '').trim();
      if (!text) return null;
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    };
    const visibleFrom = parseDate(payload.visibleFrom);
    const visibleUntil = parseDate(payload.visibleUntil);
    if (visibleFrom && visibleUntil && visibleFrom.getTime() > visibleUntil.getTime()) {
      return { success: false, error: 'Sichtbar-von darf nicht nach Sichtbar-bis liegen.' };
    }

    const targetRes = await pool.query(
      `SELECT user_id
       FROM user_advertising_submissions
       WHERE id = $1
       LIMIT 1`,
      [submissionId]
    );
    const targetUserId = Number(targetRes.rows[0]?.user_id || 0);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return { success: false, error: 'Einreichung wurde nicht gefunden.' };
    }

    if (decision === 'approved') {
      await pool.query(
        `UPDATE user_advertising_submissions
         SET status = 'rejected',
             admin_note = CASE
               WHEN COALESCE(TRIM(admin_note), '') = '' THEN 'Durch neue Freigabe ersetzt (eine Werbung pro Experte).'
               ELSE admin_note
             END,
             placement_slot = 'none',
             placement_enabled = FALSE,
             updated_at = NOW()
         WHERE user_id = $1
           AND id <> $2
           AND status IN ('pending', 'approved')`,
        [targetUserId, submissionId]
      );
    }

    await pool.query(
      `UPDATE user_advertising_submissions
       SET status = $2,
           admin_note = $3,
           reviewed_by = $4,
           placement_slot = $5,
           placement_order = $6,
           placement_enabled = $7,
           visible_from = $8,
           visible_until = $9,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [submissionId, decision, note || null, safeReviewerUserId, placementSlot, placementOrder, placementEnabled, visibleFrom, visibleUntil]
    );

    return { success: true, status: decision };
  } catch (error: any) {
    return { success: false, error: error.message || 'Moderation konnte nicht gespeichert werden.' };
  }
}

export async function adminSetAdvertisingPlacement(payload: {
  adminCode: string;
  submissionId: number;
  placementSlot: AdvertisingPlacementSlot;
  placementOrder?: number;
  placementEnabled?: boolean;
  visibleFrom?: string | null;
  visibleUntil?: string | null;
  note?: string;
}) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const submissionId = Number(payload.submissionId);
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return { success: false, error: 'Ungueltige Einreichung.' };
    }

    const allowedSlots: AdvertisingPlacementSlot[] = ['none', 'startseite_top', 'startseite_sidebar'];
    const requestedSlot = String(payload.placementSlot || 'none').trim() as AdvertisingPlacementSlot;
    const placementSlot = allowedSlots.includes(requestedSlot) ? requestedSlot : 'none';

    const rawOrder = Number(payload.placementOrder);
    const placementOrder = Number.isFinite(rawOrder) ? Math.max(1, Math.min(999, Math.trunc(rawOrder))) : 100;
    const placementEnabled = payload.placementEnabled === true && placementSlot !== 'none';

    const parseDate = (value?: string | null) => {
      const text = String(value || '').trim();
      if (!text) return null;
      const date = new Date(text);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    };
    const visibleFrom = parseDate(payload.visibleFrom);
    const visibleUntil = parseDate(payload.visibleUntil);
    if (visibleFrom && visibleUntil && visibleFrom.getTime() > visibleUntil.getTime()) {
      return { success: false, error: 'Sichtbar-von darf nicht nach Sichtbar-bis liegen.' };
    }

    const currentRes = await pool.query(
      `SELECT status FROM user_advertising_submissions WHERE id = $1 LIMIT 1`,
      [submissionId]
    );
    const currentStatus = String(currentRes.rows[0]?.status || '');
    if (currentStatus !== 'approved') {
      return { success: false, error: 'Platzierung kann nur fuer freigegebene Werbung gesetzt werden.' };
    }

    const note = String(payload.note || '').trim();

    await pool.query(
      `UPDATE user_advertising_submissions
       SET placement_slot = $2,
           placement_order = $3,
           placement_enabled = $4,
           visible_from = $5,
           visible_until = $6,
           admin_note = CASE WHEN $7::TEXT <> '' THEN $7 ELSE admin_note END,
           updated_at = NOW()
       WHERE id = $1`,
      [submissionId, placementSlot, placementOrder, placementEnabled, visibleFrom, visibleUntil, note]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Platzierung konnte nicht gespeichert werden.' };
  }
}

export async function adminSearchSubscriptionUsers(payload: {
  adminCode: string;
  search?: string;
  role?: 'all' | 'experte' | 'nutzer';
  customPriceFilter?: 'all' | 'with_custom' | 'without_custom';
  customPriceOnly?: boolean;
  limit?: number;
}) {
  try {
    await ensureExtraSchema();
    if (!(await isAdminAuthorizedWithCookie(payload.adminCode))) {
      return { success: false, error: 'Nicht autorisiert.', users: [] };
    }

    const role = payload.role === 'experte' || payload.role === 'nutzer' ? payload.role : 'all';
    const customPriceFilter =
      payload.customPriceFilter === 'with_custom' || payload.customPriceFilter === 'without_custom'
        ? payload.customPriceFilter
        : (payload.customPriceOnly ? 'with_custom' : 'all');
    const rawSearch = String(payload.search || '').trim();
    const search = rawSearch.toLowerCase();
    const safeLimit = Math.min(200, Math.max(10, Number(payload.limit) || 60));

    const roleWhere = role === 'all' ? '' : `AND u.role = '${role}'`;
    const customPriceWhere =
      customPriceFilter === 'with_custom'
        ? 'AND us.custom_monthly_price_cents IS NOT NULL'
        : customPriceFilter === 'without_custom'
          ? 'AND us.custom_monthly_price_cents IS NULL'
          : '';
    const hasSearch = search.length > 0;
    const numericSearch = Number(search);
    const isIdSearch = Number.isInteger(numericSearch) && numericSearch > 0;

    const searchWhere = hasSearch
      ? `AND (
          LOWER(COALESCE(u.email, '')) LIKE $1
          OR LOWER(COALESCE(u.vorname, '')) LIKE $1
          OR LOWER(COALESCE(u.nachname, '')) LIKE $1
          OR LOWER(COALESCE(up.display_name, '')) LIKE $1
          ${isIdSearch ? 'OR u.id = $2' : ''}
        )`
      : '';

    const queryParams: any[] = [];
    if (hasSearch) {
      queryParams.push(`%${search}%`);
      if (isIdSearch) queryParams.push(numericSearch);
    }
    queryParams.push(safeLimit);

    const limitPlaceholder = `$${queryParams.length}`;

    const res = await pool.query(
      `SELECT u.id,
              LOWER(TRIM(u.email)) AS email,
              u.vorname,
              u.nachname,
              COALESCE(NULLIF(TRIM(up.display_name), ''), NULLIF(TRIM(u.vorname || ' ' || u.nachname), ''), LOWER(TRIM(u.email))) AS display_name,
              u.role,
              COALESCE(us.plan_key, CASE WHEN u.role = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
              COALESCE(us.status, 'pending') AS subscription_status,
              COALESCE(us.payment_method, 'sepa') AS payment_method,
              us.monthly_price_cents,
              us.custom_monthly_price_cents,
              us.custom_price_note,
              us.custom_price_set_at,
              us.started_at,
              us.next_charge_at,
              us.cancel_requested_at,
              us.cancel_effective_at,
              us.cancel_reason,
              us.cancelled_at,
              CASE
                WHEN us.started_at IS NULL THEN NULL
                ELSE us.started_at + INTERVAL '2 months'
              END AS intro_period_ends_at,
              us.updated_at AS subscription_updated_at
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       WHERE 1=1
         ${roleWhere}
         ${customPriceWhere}
         ${searchWhere}
       ORDER BY COALESCE(us.updated_at, u.created_at) DESC, u.id DESC
       LIMIT ${limitPlaceholder}`,
      queryParams
    );

    return { success: true, users: res.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo-Nutzer konnten nicht geladen werden.', users: [] };
  }
}

export async function adminUpdateUserSubscriptionCustomPrice(payload: {
  adminCode: string;
  userId: number;
  customMonthlyPriceCents: number | null;
  note?: string;
}) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const safeUserId = Number(payload.userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    await ensureUserSubscriptionRow(safeUserId);

    const beforeRes = await pool.query(
      `SELECT role, plan_key, payment_method, monthly_price_cents, custom_monthly_price_cents
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [safeUserId]
    );

    const beforeRow = beforeRes.rows[0] || {};
    const previousEffectiveCents =
      beforeRow.custom_monthly_price_cents === null || beforeRow.custom_monthly_price_cents === undefined
        ? Number(beforeRow.monthly_price_cents || 0)
        : Number(beforeRow.custom_monthly_price_cents);
    const previousCustomCents =
      beforeRow.custom_monthly_price_cents === null || beforeRow.custom_monthly_price_cents === undefined
        ? null
        : Number(beforeRow.custom_monthly_price_cents);

    const note = String(payload.note || '').trim().slice(0, 240);
    const hasCustom = payload.customMonthlyPriceCents !== null && payload.customMonthlyPriceCents !== undefined;
    const customCents = hasCustom ? Math.max(0, Math.round(Number(payload.customMonthlyPriceCents) || 0)) : null;

    if (customCents !== null && customCents > 200000) {
      return { success: false, error: 'Custom-Preis ist zu hoch (maximal 2000,00 EUR).' };
    }

    if (customCents === null) {
      const currentRes = await pool.query(
        `SELECT role, plan_key, payment_method
         FROM user_subscriptions
         WHERE user_id = $1
         LIMIT 1`,
        [safeUserId]
      );

      const row = currentRes.rows[0] || {};
      const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
      const paymentMethod: SubscriptionPaymentMethod = String(row.payment_method || '').trim().toLowerCase() === 'paypal' ? 'paypal' : 'sepa';
      const pricing = getSubscriptionPricing(role, paymentMethod, String(row.plan_key || ''));

      await pool.query(
        `UPDATE user_subscriptions
         SET custom_monthly_price_cents = NULL,
             custom_price_note = NULL,
             custom_price_set_at = NULL,
             monthly_price_cents = $2,
             paypal_fee_cents = $3,
             updated_at = NOW()
         WHERE user_id = $1`,
        [safeUserId, pricing.monthlyPriceCents, pricing.paypalFeeCents]
      );

      await pool.query(
        `INSERT INTO user_subscription_price_history (
          user_id,
          action,
          previous_custom_monthly_price_cents,
          new_custom_monthly_price_cents,
          previous_effective_monthly_price_cents,
          new_effective_monthly_price_cents,
          note,
          changed_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin-panel')`,
        [
          safeUserId,
          'clear_custom_price',
          previousCustomCents,
          null,
          previousEffectiveCents,
          pricing.monthlyPriceCents,
          note || null,
        ]
      );

      return {
        success: true,
        userId: safeUserId,
        customMonthlyPriceCents: null,
        effectiveMonthlyPriceCents: pricing.monthlyPriceCents,
        cleared: true,
      };
    }

    await pool.query(
      `UPDATE user_subscriptions
       SET custom_monthly_price_cents = $2,
           custom_price_note = $3,
           custom_price_set_at = NOW(),
           monthly_price_cents = $2,
           updated_at = NOW()
       WHERE user_id = $1`,
      [safeUserId, customCents, note || null]
    );

    await pool.query(
      `INSERT INTO user_subscription_price_history (
        user_id,
        action,
        previous_custom_monthly_price_cents,
        new_custom_monthly_price_cents,
        previous_effective_monthly_price_cents,
        new_effective_monthly_price_cents,
        note,
        changed_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin-panel')`,
      [
        safeUserId,
        'set_custom_price',
        previousCustomCents,
        customCents,
        previousEffectiveCents,
        customCents,
        note || null,
      ]
    );

    return {
      success: true,
      userId: safeUserId,
      customMonthlyPriceCents: customCents,
      effectiveMonthlyPriceCents: customCents,
      cleared: false,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Abo-Preis konnte nicht angepasst werden.' };
  }
}

export async function adminGetSubscriptionPriceHistory(payload: {
  adminCode: string;
  userId?: number;
  limit?: number;
}) {
  try {
    await ensureExtraSchema();
    if (!isAdminAuthorized(payload.adminCode)) {
      return { success: false, error: 'Nicht autorisiert.', entries: [] };
    }

    const safeLimit = Math.min(300, Math.max(10, Number(payload.limit) || 60));
    const safeUserId = Number(payload.userId || 0);
    const hasUserFilter = Number.isInteger(safeUserId) && safeUserId > 0;

    const params: any[] = [];
    let where = '';
    if (hasUserFilter) {
      where = 'WHERE h.user_id = $1';
      params.push(safeUserId);
    }
    params.push(safeLimit);
    const limitPlaceholder = `$${params.length}`;

    const res = await pool.query(
      `SELECT h.id,
              h.user_id,
              h.action,
              h.previous_custom_monthly_price_cents,
              h.new_custom_monthly_price_cents,
              h.previous_effective_monthly_price_cents,
              h.new_effective_monthly_price_cents,
              h.note,
              h.changed_by,
              h.created_at,
              LOWER(TRIM(u.email)) AS email,
              COALESCE(NULLIF(TRIM(up.display_name), ''), NULLIF(TRIM(u.vorname || ' ' || u.nachname), ''), LOWER(TRIM(u.email))) AS display_name
       FROM user_subscription_price_history h
       JOIN users u ON u.id = h.user_id
       LEFT JOIN user_profiles up ON up.user_id = h.user_id
       ${where}
       ORDER BY h.created_at DESC, h.id DESC
       LIMIT ${limitPlaceholder}`,
      params
    );

    return { success: true, entries: res.rows || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Preisverlauf konnte nicht geladen werden.', entries: [] };
  }
}

export async function adminFinalizeSubscriptionCancellation(payload: {
  adminCode: string;
  userId: number;
  note?: string;
}) {
  try {
    await ensureExtraSchema();
    if (!(await isAdminAuthorizedWithCookie(payload.adminCode))) {
      return { success: false, error: 'Nicht autorisiert.' };
    }

    const safeUserId = Number(payload.userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    await ensureUserSubscriptionRow(safeUserId);

    const currentRes = await pool.query(
      `SELECT role, payment_method, status, plan_key, cancel_effective_at
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [safeUserId]
    );

    const row = currentRes.rows[0] || {};
    const cancelEffectiveAt = row.cancel_effective_at ? new Date(row.cancel_effective_at) : null;
    if (cancelEffectiveAt && Number.isFinite(cancelEffectiveAt.getTime()) && Date.now() < cancelEffectiveAt.getTime()) {
      return {
        success: false,
        error: `Abo bleibt bis zum Ende aktiv. Finalisierung erst ab ${cancelEffectiveAt.toLocaleString('de-DE')} moeglich.`
      };
    }
    const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
    const paymentMethod: SubscriptionPaymentMethod = String(row.payment_method || '').trim().toLowerCase() === 'paypal' ? 'paypal' : 'sepa';
    const freePlanKey = getDefaultPlanKeyForRole(role);
    const freePricing = getSubscriptionPricing(role, paymentMethod, freePlanKey);

    await pool.query(
      `UPDATE user_subscriptions
       SET plan_key = $2,
           status = 'active',
           monthly_price_cents = $3,
           paypal_fee_cents = $4,
           custom_monthly_price_cents = NULL,
           custom_price_note = NULL,
           custom_price_set_at = NULL,
           next_charge_at = NULL,
           cancel_requested_at = COALESCE(cancel_requested_at, NOW()),
           cancel_effective_at = COALESCE(cancel_effective_at, NOW()),
           cancel_reason = CASE WHEN $5::TEXT <> '' THEN $5 ELSE cancel_reason END,
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1`,
      [safeUserId, freePlanKey, freePricing.monthlyPriceCents, freePricing.paypalFeeCents, String(payload.note || '').trim()]
    );

    return {
      success: true,
      userId: safeUserId,
      newPlanKey: freePlanKey,
      message: `Kuendigung fuer Nutzer ${safeUserId} wurde finalisiert.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Kuendigung konnte nicht finalisiert werden.' };
  }
}

export async function trackInteractionShare(payload: {
  sourceType: 'beitrag' | 'anzeige' | 'profil';
  sourceId: string;
  ownerUserId: number;
  sharedByUserId: number;
  channel?: 'link' | 'native';
}) {
  try {
    await ensureExtraSchema();
    const sourceType = payload.sourceType === 'beitrag' || payload.sourceType === 'anzeige' ? payload.sourceType : 'profil';
    const sourceId = String(payload.sourceId || '').trim();
    const ownerUserId = Number(payload.ownerUserId);
    const sharedByUserId = Number(payload.sharedByUserId);
    const channel = payload.channel === 'native' ? 'native' : 'link';

    if (!sourceId) {
      return { success: false, error: 'Ungueltige Quelle.' };
    }
    if (!Number.isInteger(ownerUserId) || ownerUserId <= 0 || !Number.isInteger(sharedByUserId) || sharedByUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }
    await pool.query(
      `INSERT INTO interaction_share_events (source_type, source_id, owner_user_id, shared_by_user_id, channel)
       VALUES ($1, $2, $3, $4, $5)`,
      [sourceType, sourceId, ownerUserId, sharedByUserId, channel]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Share konnte nicht gespeichert werden.' };
  }
}

export async function trackAdvertisingViews(payload: { viewerUserId: number; submissionIds: number[] }) {
  try {
    await ensureExtraSchema();
    const viewerUserId = Number(payload.viewerUserId);
    const submissionIds = Array.from(new Set((Array.isArray(payload.submissionIds) ? payload.submissionIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)));

    if (!Number.isInteger(viewerUserId) || viewerUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }
    if (submissionIds.length === 0) {
      return { success: true, inserted: 0 };
    }

    const insertRes = await pool.query(
      `INSERT INTO user_advertising_views (submission_id, viewer_user_id)
       SELECT s.id, $1
       FROM user_advertising_submissions s
       WHERE s.id = ANY($2::INT[])
         AND s.user_id <> $1
         AND NOT EXISTS (
           SELECT 1
           FROM user_advertising_views v
           WHERE v.submission_id = s.id
             AND v.viewer_user_id = $1
             AND v.created_at >= NOW() - INTERVAL '12 hours'
         )`,
      [viewerUserId, submissionIds]
    );

    return { success: true, inserted: Number(insertRes.rowCount || 0) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Werbeaufrufe konnten nicht gespeichert werden.' };
  }
}

export async function trackSocialPostViews(payload: { viewerUserId: number; postIds: number[] }) {
  try {
    await ensureExtraSchema();
    const viewerUserId = Number(payload.viewerUserId);
    const postIds = Array.from(new Set((Array.isArray(payload.postIds) ? payload.postIds : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)));

    if (!Number.isInteger(viewerUserId) || viewerUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }
    if (postIds.length === 0) {
      return { success: true, inserted: 0 };
    }

    const insertRes = await pool.query(
      `INSERT INTO social_post_views (post_id, viewer_user_id)
       SELECT p.id, $1
       FROM social_posts p
       WHERE p.id = ANY($2::INT[])
         AND p.author_user_id <> $1
         AND NOT EXISTS (
           SELECT 1
           FROM social_post_views v
           WHERE v.post_id = p.id
             AND v.viewer_user_id = $1
             AND v.created_at >= NOW() - INTERVAL '12 hours'
         )`,
      [viewerUserId, postIds]
    );

    return { success: true, inserted: Number(insertRes.rowCount || 0) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Beitragsaufrufe konnten nicht gespeichert werden.' };
  }
}

export async function getSubscriptionAnalytics(userId: number) {
  try {
    await ensureExtraSchema();
    const ownerId = Number(userId);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const subscriptionRes = await pool.query(
      `SELECT u.role,
              u.created_at AS joined_at,
              COALESCE(us.plan_key, CASE WHEN LOWER(COALESCE(u.role, '')) = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
              COALESCE(us.status, 'pending') AS status
       FROM users u
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [ownerId]
    );

    if (subscriptionRes.rows.length === 0) {
      return { success: false, error: 'Nutzer nicht gefunden.' };
    }

    const role = normalizeSubscriptionRole(subscriptionRes.rows[0]?.role);
    const planKey = String(subscriptionRes.rows[0]?.plan_key || '').trim().toLowerCase();
    const status = String(subscriptionRes.rows[0]?.status || '').trim().toLowerCase();

    const eligibleExpertPlans = new Set(['experte_pro', 'experte_abo', 'experte_premium', 'experten_premium_abo']);
    const eligibleUserPlans = new Set(['nutzer_plus', 'nutzer_abo']);
    const isEligible = status === 'active' && (
      (role === 'experte' && (eligibleExpertPlans.has(planKey) || planKey.startsWith('experte_')))
      || (role === 'nutzer' && (eligibleUserPlans.has(planKey) || planKey.startsWith('nutzer_') && planKey !== 'nutzer_free'))
    );

    if (!isEligible) {
      return { success: false, error: 'Analytics ist nur fuer aktive Abo-Nutzer verfuegbar.' };
    }

    const postStatsPromise = pool.query(
      `WITH own_posts AS (
         SELECT id
         FROM social_posts
         WHERE author_user_id = $1
           AND group_id IS NULL
       )
       SELECT
         (SELECT COUNT(*)::INT FROM own_posts) AS post_count,
         (SELECT COUNT(*)::INT FROM social_post_saves s JOIN own_posts p ON p.id = s.post_id) AS saves_total,
         (SELECT COUNT(*)::INT FROM social_post_likes l JOIN own_posts p ON p.id = l.post_id) AS likes_total,
         (SELECT COUNT(*)::INT FROM social_post_comments c JOIN own_posts p ON p.id = c.post_id) AS comments_total,
         (SELECT COUNT(*)::INT FROM social_posts sp JOIN own_posts p ON p.id = sp.shared_post_id) AS repost_shares_total`,
      [ownerId]
    );

    const postLinkSharesPromise = pool.query(
      `SELECT COUNT(*)::INT AS total
       FROM interaction_share_events
       WHERE owner_user_id = $1
         AND source_type = 'beitrag'`,
      [ownerId]
    );

    const adStatsPromise = pool.query(
      `SELECT
         (SELECT COUNT(*)::INT
          FROM profile_offer_views
          WHERE profile_user_id = $1) AS views_total,
         (SELECT COUNT(*)::INT
          FROM wishlist_items
          WHERE item_type = 'anzeige'
            AND source_id LIKE $2) AS saves_total`,
      [ownerId, `offer:${ownerId}:%`]
    );

    const adMessageStatsPromise = pool.query(
      `SELECT COUNT(*) FILTER (WHERE m.sender_id <> $1)::INT AS incoming_messages_total
       FROM chats c
       JOIN messages m ON m.chat_id = c.id
       WHERE c.user_one = $1 OR c.user_two = $1`,
      [ownerId]
    );

    const adShareStatsPromise = pool.query(
      `SELECT COUNT(*)::INT AS total
       FROM interaction_share_events
       WHERE owner_user_id = $1
         AND source_type = 'anzeige'`,
      [ownerId]
    );

    const profileStatsPromise = pool.query(
      `SELECT
         (SELECT COUNT(*)::INT FROM profile_views WHERE profile_user_id = $1) AS visitors_total,
         (SELECT COUNT(*)::INT
          FROM wishlist_items
          WHERE item_type IN ('person', 'profil')
            AND (
              source_id = $2
              OR source_id = $3
              OR source_id = $4
              OR source_id LIKE $5
              OR source_id LIKE $6
            )) AS saved_total`,
      [ownerId, `person-${ownerId}`, `profil-${ownerId}`, `profile:${ownerId}`, `person:${ownerId}%`, `profil:${ownerId}%`]
    );

    const profileShareStatsPromise = pool.query(
      `SELECT COUNT(*)::INT AS total
       FROM interaction_share_events
       WHERE owner_user_id = $1
         AND source_type = 'profil'`,
      [ownerId]
    );

    const advertisingVisitorStatsPromise = pool.query(
      `SELECT COUNT(*)::INT AS visitors_total
       FROM user_advertising_views v
       JOIN user_advertising_submissions s ON s.id = v.submission_id
       WHERE s.user_id = $1`,
      [ownerId]
    );

    const [
      postStats,
      postLinkShares,
      adStats,
      adMessages,
      adShares,
      profileStats,
      profileShares,
      adVisitors
    ] = await Promise.all([
      postStatsPromise,
      postLinkSharesPromise,
      adStatsPromise,
      adMessageStatsPromise,
      adShareStatsPromise,
      profileStatsPromise,
      profileShareStatsPromise,
      advertisingVisitorStatsPromise
    ]);

    const planDefinition = getSubscriptionPlanDefinition(role, planKey);

    return {
      success: true,
      data: {
        role,
        planKey,
        planLabel: planDefinition.label,
        beitraege: {
          anzahl: Number(postStats.rows[0]?.post_count || 0),
          merkliste: Number(postStats.rows[0]?.saves_total || 0),
          likes: Number(postStats.rows[0]?.likes_total || 0),
          kommentare: Number(postStats.rows[0]?.comments_total || 0),
          geteilt: Number(postStats.rows[0]?.repost_shares_total || 0) + Number(postLinkShares.rows[0]?.total || 0)
        },
        anzeigen: {
          besucher: Number(adStats.rows[0]?.views_total || 0),
          merkliste: Number(adStats.rows[0]?.saves_total || 0),
          nachrichten: Number(adMessages.rows[0]?.incoming_messages_total || 0),
          geteilt: Number(adShares.rows[0]?.total || 0)
        },
        profil: {
          besucher: Number(profileStats.rows[0]?.visitors_total || 0),
          gemerkt: Number(profileStats.rows[0]?.saved_total || 0),
          geteilt: Number(profileShares.rows[0]?.total || 0)
        },
        werbung: {
          besucher: Number(adVisitors.rows[0]?.visitors_total || 0)
        }
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Analytics konnte nicht geladen werden.' };
  }
}

export async function getExpertDashboardAnalytics(userId: number) {
  try {
    await ensureExtraSchema();
    const ownerId = Number(userId);
    if (!Number.isInteger(ownerId) || ownerId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const subscriptionRes = await pool.query(
      `SELECT u.role,
              COALESCE(us.plan_key, CASE WHEN LOWER(COALESCE(u.role, '')) = 'experte' THEN 'experte_free' ELSE 'nutzer_free' END) AS plan_key,
              COALESCE(us.status, 'pending') AS status
       FROM users u
       LEFT JOIN user_subscriptions us ON us.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [ownerId]
    );

    if (subscriptionRes.rows.length === 0) {
      return { success: false, error: 'Nutzer nicht gefunden.' };
    }

    const role = normalizeSubscriptionRole(subscriptionRes.rows[0]?.role);
    if (role !== 'experte') {
      return { success: false, error: 'Das Experten-Dashboard ist nur fuer Experten verfuegbar.' };
    }

    const planKey = String(subscriptionRes.rows[0]?.plan_key || '').trim().toLowerCase();
    const subscriptionStatus = String(subscriptionRes.rows[0]?.status || '').trim().toLowerCase();
    const planDefinition = getSubscriptionPlanDefinition(role, planKey);
    const adAnalyticsEnabled = planKey === 'experte_pro' && subscriptionStatus === 'active';
    const joinedAtRaw = subscriptionRes.rows[0]?.joined_at;
    const joinedAt = joinedAtRaw ? new Date(joinedAtRaw) : new Date();
    const safeJoinedAt = Number.isNaN(joinedAt.getTime()) ? new Date() : joinedAt;

    const profileAnalyticsPromise = getProfileAnalytics(ownerId);

    const profileSummaryPromise = pool.query(
      `SELECT
         (SELECT COUNT(*)::INT FROM profile_views WHERE profile_user_id = $1) AS views_total,
         (SELECT COUNT(*)::INT FROM profile_views WHERE profile_user_id = $1 AND created_at >= NOW() - INTERVAL '30 days') AS views_30d,
         (SELECT COUNT(DISTINCT viewer_user_id)::INT FROM profile_views WHERE profile_user_id = $1 AND created_at >= NOW() - INTERVAL '30 days') AS unique_visitors_30d,
         (SELECT COUNT(*)::INT
          FROM wishlist_items
          WHERE user_id = $1
            AND item_type IN ('person', 'profil')
            AND (
              source_id = $2
              OR source_id = $3
              OR source_id = $4
              OR source_id LIKE $5
              OR source_id LIKE $6
            )) AS wishlist_total,
         (SELECT COUNT(*)::INT
          FROM interaction_share_events
          WHERE owner_user_id = $1
            AND source_type = 'profil') AS link_redirects_total`,
      [ownerId, `person-${ownerId}`, `profil-${ownerId}`, `profile:${ownerId}`, `person:${ownerId}%`, `profil:${ownerId}%`]
    );

    const postSummaryPromise = pool.query(
      `WITH own_posts AS (
         SELECT id, group_id, shared_post_id
         FROM social_posts
         WHERE author_user_id = $1
       ),
       profile_posts AS (
         SELECT id FROM own_posts WHERE group_id IS NULL
       ),
       group_posts AS (
         SELECT id FROM own_posts WHERE group_id IS NOT NULL
       )
       SELECT
         (SELECT COUNT(*)::INT FROM own_posts) AS post_total,
         (SELECT COUNT(*)::INT FROM profile_posts) AS profile_post_total,
         (SELECT COUNT(*)::INT FROM group_posts) AS group_post_total,
         (SELECT COUNT(*)::INT FROM social_post_views v JOIN own_posts p ON p.id = v.post_id) AS views_total,
         (SELECT COUNT(*)::INT FROM social_post_views v JOIN own_posts p ON p.id = v.post_id AND v.created_at >= NOW() - INTERVAL '30 days') AS views_30d,
         (SELECT COUNT(*)::INT FROM social_post_comments c JOIN profile_posts p ON p.id = c.post_id) AS comments_total,
         (SELECT COUNT(*)::INT FROM social_post_comments c JOIN group_posts p ON p.id = c.post_id) AS group_replies_total,
         (SELECT COUNT(*)::INT FROM social_post_likes l JOIN own_posts p ON p.id = l.post_id) AS likes_total,
         (SELECT COUNT(*)::INT FROM social_posts sp JOIN own_posts p ON p.id = sp.shared_post_id) AS shares_total,
         (SELECT COUNT(*)::INT FROM interaction_share_events
          WHERE owner_user_id = $1
            AND source_type = 'beitrag') AS link_redirects_total`,
      [ownerId]
    );

    const adSummaryPromise = pool.query(
      `SELECT
         (SELECT COUNT(*)::INT FROM user_advertising_submissions WHERE user_id = $1 AND status = 'approved') AS bookings_total,
         (SELECT COUNT(*)::INT
          FROM user_advertising_views v
          JOIN user_advertising_submissions s ON s.id = v.submission_id
          WHERE s.user_id = $1) AS views_total,
         (SELECT COUNT(*)::INT
          FROM user_advertising_views v
          JOIN user_advertising_submissions s ON s.id = v.submission_id
          WHERE s.user_id = $1
            AND v.created_at >= NOW() - INTERVAL '30 days') AS views_30d,
         (SELECT COUNT(*)::INT
          FROM wishlist_items
          WHERE item_type = 'anzeige'
            AND source_id LIKE $2) AS wishlist_total,
         (SELECT COUNT(*)::INT
          FROM interaction_share_events
          WHERE owner_user_id = $1
            AND source_type = 'anzeige') AS link_redirects_total,
         (SELECT COUNT(*)::INT FROM user_ratings WHERE rated_user_id = $1) AS ratings_total,
         (SELECT COUNT(*)::INT
          FROM user_ratings
          WHERE rated_user_id = $1
            AND COALESCE(NULLIF(TRIM(comment), ''), '') <> '') AS rating_comments_total,
         (SELECT COUNT(*)::INT
          FROM chats c
          JOIN messages m ON m.chat_id = c.id
          WHERE (c.user_one = $1 OR c.user_two = $1)
            AND m.sender_id <> $1) AS incoming_messages_total`,
      [ownerId, `offer:${ownerId}:%`]
    );

    const chartPromise = pool.query(
      `WITH days AS (
         SELECT generate_series(date_trunc('day', $2::timestamptz), date_trunc('day', NOW()), INTERVAL '1 day') AS day_start
       ),
       own_posts AS (
         SELECT id
         FROM social_posts
         WHERE author_user_id = $1
       ),
       profile_daily AS (
         SELECT date_trunc('day', created_at) AS day_start, COUNT(*)::INT AS total
         FROM profile_views
         WHERE profile_user_id = $1
         GROUP BY 1
       ),
       ad_daily AS (
         SELECT date_trunc('day', v.created_at) AS day_start, COUNT(*)::INT AS total
         FROM user_advertising_views v
         JOIN user_advertising_submissions s ON s.id = v.submission_id
         WHERE s.user_id = $1
         GROUP BY 1
       ),
       post_daily AS (
         SELECT date_trunc('day', v.created_at) AS day_start, COUNT(*)::INT AS total
         FROM social_post_views v
         JOIN own_posts p ON p.id = v.post_id
         GROUP BY 1
       ),
       link_daily AS (
         SELECT date_trunc('day', created_at) AS day_start, COUNT(*)::INT AS total
         FROM interaction_share_events
         WHERE owner_user_id = $1
         GROUP BY 1
       )
       SELECT
         to_char(d.day_start, 'YYYY-MM-DD') AS day_key,
         to_char(d.day_start, 'DD.MM.YY') AS day_label,
         COALESCE(p.total, 0) AS profile_views,
         COALESCE(a.total, 0) AS ad_views,
         COALESCE(po.total, 0) AS post_views,
         COALESCE(l.total, 0) AS link_redirects
       FROM days d
       LEFT JOIN profile_daily p ON p.day_start = d.day_start
       LEFT JOIN ad_daily a ON a.day_start = d.day_start
       LEFT JOIN post_daily po ON po.day_start = d.day_start
       LEFT JOIN link_daily l ON l.day_start = d.day_start
       ORDER BY d.day_start ASC`,
      [ownerId, safeJoinedAt.toISOString()]
    );

    const [profileAnalyticsRes, profileSummaryRes, postSummaryRes, adSummaryRes, chartRes] = await Promise.all([
      profileAnalyticsPromise,
      profileSummaryPromise,
      postSummaryPromise,
      adSummaryPromise,
      chartPromise
    ]);

    if (!profileAnalyticsRes.success || !profileAnalyticsRes.data) {
      return { success: false, error: profileAnalyticsRes.error || 'Profil-Analysen konnten nicht geladen werden.' };
    }

    const profileData = profileAnalyticsRes.data;
    const profileSummary = profileSummaryRes.rows[0] || {};
    const postSummary = postSummaryRes.rows[0] || {};
    const adSummary = adSummaryRes.rows[0] || {};

    return {
      success: true,
      data: {
        role,
        planKey,
        planLabel: planDefinition.label,
        adAnalyticsEnabled,
        joinedAt: safeJoinedAt.toISOString(),
        profile: {
          viewsTotal: Number(profileSummary.views_total || profileData.profileViewsTotal || 0),
          views30d: Number(profileSummary.views_30d || profileData.profileViews30d || 0),
          uniqueVisitors30d: Number(profileSummary.unique_visitors_30d || profileData.uniqueVisitors30d || 0),
          chatsTotal: Number(profileData.chatsTotal || 0),
          uniqueChatPartners: Number(profileData.uniqueChatPartners || 0),
          outgoingMessagesTotal: Number(profileData.outgoingMessagesTotal || 0),
          incomingMessagesTotal: Number(profileData.incomingMessagesTotal || 0),
          outgoingMessages30d: Number(profileData.outgoingMessages30d || 0),
          incomingMessages30d: Number(profileData.incomingMessages30d || 0),
          wishlistTotal: Number(profileSummary.wishlist_total || 0),
          linkRedirectsTotal: Number(profileSummary.link_redirects_total || 0),
          postsTotal: Number(profileData.profilePostsTotal || 0)
        },
        posts: {
          total: Number(postSummary.post_total || 0),
          profileTotal: Number(postSummary.profile_post_total || 0),
          groupTotal: Number(postSummary.group_post_total || 0),
          viewsTotal: Number(postSummary.views_total || 0),
          views30d: Number(postSummary.views_30d || 0),
          commentsTotal: Number(postSummary.comments_total || 0),
          repliesTotal: Number(postSummary.group_replies_total || 0),
          likesTotal: Number(postSummary.likes_total || 0),
          sharesTotal: Number(postSummary.shares_total || 0),
          linkRedirectsTotal: Number(postSummary.link_redirects_total || 0)
        },
        ads: {
          bookingsTotal: adAnalyticsEnabled ? Number(adSummary.bookings_total || 0) : 0,
          viewsTotal: adAnalyticsEnabled ? Number(adSummary.views_total || 0) : 0,
          views30d: adAnalyticsEnabled ? Number(adSummary.views_30d || 0) : 0,
          wishlistTotal: adAnalyticsEnabled ? Number(adSummary.wishlist_total || 0) : 0,
          linkRedirectsTotal: adAnalyticsEnabled ? Number(adSummary.link_redirects_total || 0) : 0,
          ratingsTotal: adAnalyticsEnabled ? Number(adSummary.ratings_total || 0) : 0,
          ratingCommentsTotal: adAnalyticsEnabled ? Number(adSummary.rating_comments_total || 0) : 0,
          incomingMessagesTotal: adAnalyticsEnabled ? Number(adSummary.incoming_messages_total || 0) : 0
        },
        chart: (chartRes.rows || []).map((row: any) => ({
          dayKey: String(row.day_key || ''),
          dayLabel: String(row.day_label || ''),
          profileViews: Number(row.profile_views || 0),
          adViews: adAnalyticsEnabled ? Number(row.ad_views || 0) : 0,
          postViews: Number(row.post_views || 0),
          linkRedirects: Number(row.link_redirects || 0)
        }))
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Experten-Dashboard konnte nicht geladen werden.' };
  }
}

// ============================================
// ADMIN ABO-VERWALTUNG (Gründungsmitglieder & Lebenszeit-Zugriff)
// ============================================

export async function adminGetAboAnalytics(adminCode: string) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    const res = await pool.query(`
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE plan_key = 'experte_abo'), 0) as experte_abo_count,
        COALESCE(COUNT(*) FILTER (WHERE plan_key = 'experte_pro'), 0) as experte_pro_count,
        COALESCE(COUNT(*) FILTER (WHERE plan_key = 'nutzer_plus'), 0) as nutzer_plus_count,
        COALESCE(COUNT(*) FILTER (WHERE is_founding_member = TRUE), 0) as founding_members_count,
        COALESCE(COUNT(*) FILTER (WHERE lifetime_free_access = TRUE), 0) as lifetime_free_access_count,
        COALESCE(COUNT(*) FILTER (WHERE is_founding_member = TRUE AND founding_member_free_until > NOW()), 0) as founding_members_free_until_count,
        COALESCE(COUNT(*) FILTER (WHERE is_founding_member = TRUE AND founding_member_free_until <= NOW()), 0) as founding_members_expired_count
      FROM user_subscriptions
      WHERE status = 'active'
    `);

    const row = res.rows[0] || {};
    return {
      success: true,
      data: {
        experteAboCount: Number(row.experte_abo_count || 0),
        experteProCount: Number(row.experte_pro_count || 0),
        nutzerPlusCount: Number(row.nutzer_plus_count || 0),
        foundingMembersCount: Number(row.founding_members_count || 0),
        lifetimeFreeAccessCount: Number(row.lifetime_free_access_count || 0),
        foundingMembersFreeCount: Number(row.founding_members_free_until_count || 0),
        foundingMembersExpiredCount: Number(row.founding_members_expired_count || 0)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminGetFoundingMembersAnalytics(adminCode: string, limit: number = 100) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    const res = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.vorname,
        u.nachname,
        us.plan_key,
        us.is_founding_member,
        us.founding_member_free_until,
        us.lifetime_discount_percent,
        us.created_at as subscription_created_at,
        us.updated_at as subscription_updated_at
      FROM user_subscriptions us
      JOIN users u ON u.id = us.user_id
      WHERE us.is_founding_member = TRUE
      ORDER BY us.founding_member_free_until DESC NULLS LAST
      LIMIT $1
    `, [limit]);

    return {
      success: true,
      members: res.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: `${row.vorname || ''} ${row.nachname || ''}`.trim(),
        planKey: row.plan_key,
        foundingMemberFreeUntil: row.founding_member_free_until,
        lifetimeDiscountPercent: row.lifetime_discount_percent,
        isActive: row.founding_member_free_until ? new Date(row.founding_member_free_until) > new Date() : false
      }))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminGetLifetimeAccessList(adminCode: string, limit: number = 100) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    const res = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.vorname,
        u.nachname,
        us.plan_key,
        us.lifetime_free_access,
        us.status,
        us.created_at as subscription_created_at,
        us.updated_at as subscription_updated_at
      FROM user_subscriptions us
      JOIN users u ON u.id = us.user_id
      WHERE us.lifetime_free_access = TRUE
      ORDER BY us.updated_at DESC
      LIMIT $1
    `, [limit]);

    return {
      success: true,
      users: res.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: `${row.vorname || ''} ${row.nachname || ''}`.trim(),
        planKey: row.plan_key,
        status: row.status,
        grantedAt: row.subscription_updated_at
      }))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminMarkAsFoundingMember(adminCode: string, userId: number, lifetimeDiscountPercent: number = 30) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    const now = new Date();
    const foundingMemberFreeUntil = new Date(now.getTime() + 2 * 30 * 24 * 60 * 60 * 1000); // 2 Monate

    await pool.query(`
      UPDATE user_subscriptions
      SET
        is_founding_member = TRUE,
        founding_member_free_until = $2,
        lifetime_discount_percent = $3,
        updated_at = NOW()
      WHERE user_id = $1
    `, [userId, foundingMemberFreeUntil.toISOString(), lifetimeDiscountPercent]);

    return { success: true, message: `Nutzer ${userId} als Gründungsmitglied markiert.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminRevokeFoundingMember(adminCode: string, userId: number) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    await pool.query(`
      UPDATE user_subscriptions
      SET
        is_founding_member = FALSE,
        founding_member_free_until = NULL,
        lifetime_discount_percent = 0,
        updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    return { success: true, message: `Gründungsmitglied-Status von Nutzer ${userId} entfernt.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminGrantLifetimeFreeAccess(
  adminCode: string,
  userId: number,
  preferredPlanKey?: string | null
) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    await ensureUserSubscriptionRow(userId);

    const currentRes = await pool.query(
      `SELECT role, plan_key
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    const row = currentRes.rows[0] || {};
    const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
    const currentPlanKey = String(row.plan_key || '').trim().toLowerCase();
    const requestedPlanKey = String(preferredPlanKey || '').trim().toLowerCase();
    const allowedPlanKeys = role === 'experte'
      ? new Set(['experte_abo', 'experte_pro'])
      : new Set(['nutzer_plus']);

    // If user is still on free tier, move to default paid tier so premium access is active immediately.
    let nextPlanKey = role === 'experte'
      ? (currentPlanKey === 'experte_free' || !currentPlanKey ? 'experte_abo' : currentPlanKey)
      : (currentPlanKey === 'nutzer_free' || !currentPlanKey ? 'nutzer_plus' : currentPlanKey);

    if (requestedPlanKey) {
      if (!allowedPlanKeys.has(requestedPlanKey)) {
        return {
          success: false,
          error: role === 'experte'
            ? 'Für Experten sind nur experte_abo oder experte_pro als Lebenszugriff möglich.'
            : 'Für Nutzer ist nur nutzer_plus als Lebenszugriff möglich.'
        };
      }
      nextPlanKey = requestedPlanKey;
    }

    await pool.query(`
      UPDATE user_subscriptions
      SET
        plan_key = $2,
        status = 'active',
        lifetime_free_access = TRUE,
        started_at = COALESCE(started_at, NOW()),
        next_charge_at = NULL,
        updated_at = NOW()
      WHERE user_id = $1
    `, [userId, nextPlanKey]);

    return {
      success: true,
      message: `Lebenszeit-Freien-Zugriff für Nutzer ${userId} gewährt (Plan: ${nextPlanKey}).`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function adminRevokeLifetimeFreeAccess(adminCode: string, userId: number) {
  await ensureExtraSchema();
  if (!(await isAdminAuthorizedWithCookie(adminCode))) return { success: false, error: 'Admin-Code ungültig.' };
  try {
    await pool.query(`
      UPDATE user_subscriptions
      SET
        lifetime_free_access = FALSE,
        updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    return { success: true, message: `Lebenszeit-Freien-Zugriff für Nutzer ${userId} entfernt.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Automatische Gründungsmitglied-Markierung für erste 100 Experten-Abo-Kunden
export async function checkAndMarkFoundingMemberIfEligible(userId: number) {
  try {
    // Prüfe, ob Nutzer bereits Gründungsmitglied ist
    const existingRes = await pool.query(`
      SELECT is_founding_member FROM user_subscriptions
      WHERE user_id = $1 AND is_founding_member = TRUE
      LIMIT 1
    `, [userId]);

    if (existingRes.rows.length > 0) {
      return { alreadyMarked: true };
    }

    // Zähle aktive Experten mit Abo (experte_abo oder experte_pro)
    const countRes = await pool.query(`
      SELECT COUNT(*) as count FROM user_subscriptions
      WHERE role = 'experte'
      AND plan_key IN ('experte_abo', 'experte_pro')
      AND is_founding_member = TRUE
    `);

    const foundingMemberCount = Number(countRes.rows[0]?.count || 0);

    // Wenn noch nicht 100 Gründungsmitglieder, markiere diesen Nutzer
    if (foundingMemberCount < 100) {
      const now = new Date();
      const foundingMemberFreeUntil = new Date(now.getTime() + 2 * 30 * 24 * 60 * 60 * 1000); // 2 Monate

      await pool.query(`
        UPDATE user_subscriptions
        SET
          is_founding_member = TRUE,
          founding_member_free_until = $2,
          lifetime_discount_percent = 30,
          updated_at = NOW()
        WHERE user_id = $1
      `, [userId, foundingMemberFreeUntil.toISOString()]);

      return {
        success: true,
        wasMarked: true,
        foundingMemberNumber: foundingMemberCount + 1,
        freeUntil: foundingMemberFreeUntil
      };
    }

    return {
      success: true,
      wasMarked: false,
      reason: 'Die ersten 100 Gründungsmitglieder sind bereits markiert.'
    };
  } catch (error: any) {
    console.error('Error checking/marking founding member:', error);
    return { success: false, error: error.message };
  }
}

export async function requestOwnSubscriptionCancellation(payload: {
  userId: number;
  reason?: string;
}) {
  try {
    await ensureUserSubscriptionRow(payload.userId);

    const safeUserId = Number(payload.userId);
    if (!Number.isInteger(safeUserId) || safeUserId <= 0) {
      return { success: false, error: 'Ungueltige Nutzer-ID.' };
    }

    const rowRes = await pool.query(
      `SELECT role,
              plan_key,
              payment_method,
              status,
              monthly_price_cents,
              custom_monthly_price_cents,
              next_charge_at,
              cancel_effective_at
       FROM user_subscriptions
       WHERE user_id = $1
       LIMIT 1`,
      [safeUserId]
    );

    const row = rowRes.rows[0] || {};
    const role = normalizeSubscriptionRole(String(row.role || 'nutzer'));
    const paymentMethod: SubscriptionPaymentMethod = String(row.payment_method || '').trim().toLowerCase() === 'paypal' ? 'paypal' : 'sepa';
    const pricing = getSubscriptionPricing(role, paymentMethod, String(row.plan_key || ''));
    const effectiveMonthlyPriceCents = row.custom_monthly_price_cents === null || row.custom_monthly_price_cents === undefined
      ? Number(row.monthly_price_cents ?? pricing.monthlyPriceCents)
      : Number(row.custom_monthly_price_cents);

    if (!Number.isFinite(effectiveMonthlyPriceCents) || effectiveMonthlyPriceCents <= 0) {
      return { success: false, error: 'Es ist aktuell kein kostenpflichtiges Abo aktiv.' };
    }

    const currentStatus = String(row.status || '').trim().toLowerCase();
    if (currentStatus === 'cancel_pending' && row.cancel_effective_at) {
      return { success: true, alreadyRequested: true, effectiveAt: row.cancel_effective_at };
    }

    const nextChargeAtValue = row.next_charge_at ? new Date(row.next_charge_at) : null;
    if (!nextChargeAtValue || !Number.isFinite(nextChargeAtValue.getTime())) {
      return { success: false, error: 'Der naechste Abbuchungstermin fehlt. Bitte Support kontaktieren.' };
    }

    const deadline = new Date(nextChargeAtValue);
    deadline.setDate(deadline.getDate() - 3);

    const now = new Date();
    if (now.getTime() > deadline.getTime()) {
      return {
        success: false,
        error: `Kuendigung zu spaet. Sie muss spaetestens bis ${deadline.toLocaleString('de-DE')} eingehen.`
      };
    }

    const reason = String(payload.reason || '').trim().slice(0, 240);
    await pool.query(
      `UPDATE user_subscriptions
       SET status = 'cancel_pending',
           cancel_requested_at = NOW(),
           cancel_effective_at = next_charge_at,
           cancel_reason = $2,
           updated_at = NOW()
       WHERE user_id = $1`,
      [safeUserId, reason || null]
    );

    return {
      success: true,
      effectiveAt: nextChargeAtValue.toISOString(),
      deadlineAt: deadline.toISOString(),
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Kuendigung konnte nicht gespeichert werden.' };
  }
}