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

    // Reconstruct the blob key from path segments
    const blobKey = pathSegments.join('/');

    const blobToken = String(process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    if (!blobToken) {
      return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 });
    }

    // Use Vercel Blob's download API endpoint
    // Format: https://blob.vercel-storage.com/download/[key]?token=[token]
    const blobUrl = `https://blob.vercel-storage.com/download/${encodeURIComponent(blobKey)}?token=${encodeURIComponent(blobToken)}`;

    const response = await fetch(blobUrl);

    if (!response.ok) {
      console.error(`Blob fetch failed: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Blob not found' },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Blob proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blob' },
      { status: 500 }
    );
  }
}


