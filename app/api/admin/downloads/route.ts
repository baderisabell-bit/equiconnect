import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFile } from 'fs/promises';
import path from 'path';

const ADMIN_AUTH_COOKIE = 'admin_panel_auth';

async function verifyAdminAuth(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;
    const expectedPassword = String(process.env.ADMIN_PANEL_CODE || '').trim();
    
    if (!expectedPassword) return false;
    return adminCookie === expectedPassword;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const isAdmin = await verifyAdminAuth();
    if (!isAdmin) {
      console.warn('⚠️ Unauthorized admin file access attempt');
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Extract file path from URL
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json(
        { error: 'No file path provided' },
        { status: 400 }
      );
    }

    // Security: Only allow access to admin folders
    if (!filePath.includes('admin/certificates') && !filePath.includes('admin/verification')) {
      console.warn('⚠️ Unauthorized file path access attempt:', filePath);
      return NextResponse.json(
        { error: 'Access denied. Only admin folders allowed.' },
        { status: 403 }
      );
    }

    // Construct safe file path - admin files are stored in .uploads directory
    let uploadDir: string;
    if (filePath.includes('admin/certificates') || filePath.includes('admin/verification')) {
      // Admin files are in .uploads for privacy
      uploadDir = path.join(process.cwd(), '.uploads');
    } else {
      // Public files
      uploadDir = path.join(process.cwd(), 'public', 'uploads');
    }
    const requestedFile = path.join(uploadDir, filePath.replace(/^uploads\//, ''));

    // Prevent path traversal attacks
    if (!requestedFile.startsWith(uploadDir)) {
      console.warn('⚠️ Path traversal attempt:', filePath);
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Read and return file
    const fileBuffer = await readFile(requestedFile);
    const mimeType = getMimeType(requestedFile);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${path.basename(requestedFile)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'File not found or access denied' },
      { status: 404 }
    );
  }
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
