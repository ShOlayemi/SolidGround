import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ComparisonDocument } from "@/lib/reports/pdf";
import { comparisonContext } from "@/lib/reports/data";
export const runtime = "nodejs";
export async function GET(request: Request) { const pairingId = new URL(request.url).searchParams.get("pairingId"); if (!pairingId) return NextResponse.json({ error: "pairingId is required" }, { status: 400 }); const ctx = await comparisonContext(pairingId); if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 }); if (!ctx.pairing) return NextResponse.json({ error: "Completed pairing not found" }, { status: 404 }); const p = ctx.pairing; const buffer = await renderToBuffer(<ComparisonDocument inviterName={p.inviterName} inviteeName={p.inviteeName} alignment={p.alignment} report={p.report} />); return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="partner-comparison.pdf"', "Cache-Control": "no-store" } }); }
