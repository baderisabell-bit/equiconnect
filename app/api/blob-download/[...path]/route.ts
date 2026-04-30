import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'Path not specified' }, { status: 400 });
    }

    // Reconstruct the blob path from segments
    const blobPath = pathSegments.join('/');
    console.log('Downloading blob:', blobPath);

    const blobToken = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    // Build the Vercel Blob download URL with token
    // Format: https://blob.vercel-storage.com/download/[path]?token=[token]
    const downloadUrl = `https://blob.vercel-storage.com/download/${encodeURIComponent(blobPath)}?token=${encodeURIComponent(blobToken)}`;
    
    console.log('Fetching from Vercel Blob...');
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      console.error(`Blob download failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to download: ${response.statusText}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = buffer.byteLength;

    console.log(`Downloaded blob successfully: ${contentLength} bytes`);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(contentLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Blob download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download blob' },
      { status: 500 }
    );
  }
}
