import { NextResponse } from "next/server";
import { runSubscriptionInvoiceAutomation } from "../../../../actions";

export const dynamic = "force-dynamic";

function extractBearerToken(headerValue: string | null) {
  const raw = String(headerValue || "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
}

export async function GET(request: Request) {
  try {
    const expectedToken = String(process.env.SUBSCRIPTION_INVOICE_CRON_TOKEN || process.env.CRON_SECRET || "").trim();
    if (!expectedToken) {
      return NextResponse.json({ success: false, error: "Cron token not configured." }, { status: 500 });
    }

    const url = new URL(request.url);
    const tokenFromQuery = String(url.searchParams.get("token") || "").trim();
    const tokenFromBearer = extractBearerToken(request.headers.get("authorization"));
    const providedToken = tokenFromBearer || tokenFromQuery;

    const throughMonth = String(url.searchParams.get("throughMonth") || "").trim();

    const result = await runSubscriptionInvoiceAutomation({
      token: providedToken,
      throughMonth: throughMonth || undefined,
      limitUsers: 3000,
    });

    if (!result.success) {
      const unauthorized = String((result as any).error || "").toLowerCase().includes("token") || String((result as any).error || "").toLowerCase().includes("unauthorized");
      return NextResponse.json(result, { status: unauthorized ? 401 : 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Cron execution failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
