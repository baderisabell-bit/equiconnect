import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { del, put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

function getDatabaseUrl() {
  return String(
    process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NO_SSL ||
      ''
  ).trim();
}

async function checkDatabase() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return { ok: false, error: 'No database URL configured.' };
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: resolveDbSslConfig(databaseUrl),
  });

  try {
    await pool.query('select 1');
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: String(error?.message || 'Database check failed.') };
  } finally {
    await pool.end();
  }
}

async function checkBlob() {
  const blobToken = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
  if (!blobToken) {
    return { ok: false, error: 'BLOB_READ_WRITE_TOKEN missing.' };
  }

  const blobPath = `healthchecks/ping-${Date.now()}.txt`;
  try {
    const blob = await put(blobPath, 'ok', {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'text/plain',
    });

    await del(blob.url);
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: String(error?.message || 'Blob check failed.') };
  }
}

function isAuthorized(request: Request) {
  const expected = String(process.env.HEALTHCHECK_SECRET || '').trim();
  if (!expected) return true;

  const provided = String(request.headers.get('x-healthcheck-secret') || '').trim();
  return provided.length > 0 && provided === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [db, blob] = await Promise.all([checkDatabase(), checkBlob()]);
  const ok = db.ok && blob.ok;

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      checks: {
        database: db,
        blob,
      },
    },
    { status: ok ? 200 : 503 }
  );
}