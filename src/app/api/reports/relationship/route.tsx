import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { BlueprintDocument } from "@/lib/reports/pdf";
import { reportContext } from "@/lib/reports/data";
import { getAIInsights } from "@/lib/ai/actions";
export const runtime = "nodejs";
export async function GET() { const ctx = await reportContext(); if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 }); if (!ctx.results || !ctx.sessionId) return NextResponse.json({ error: "Complete your assessment first" }, { status: 404 }); const insightResult = await getAIInsights(ctx.sessionId); const buffer = await renderToBuffer(<BlueprintDocument name={ctx.name} results={ctx.results} insights={insightResult.insights ?? null} relationship mode={ctx.mode} />); return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="relationship-blueprint.pdf"', "Cache-Control": "no-store" } }); }
