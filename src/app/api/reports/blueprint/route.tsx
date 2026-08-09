import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { BlueprintDocument } from "@/lib/reports/pdf";
import { reportContext } from "@/lib/reports/data";
export const runtime = "nodejs";
export async function GET() { const ctx = await reportContext(); if (!ctx) return NextResponse.json({ error: "Authentication required" }, { status: 401 }); if (!ctx.results) return NextResponse.json({ error: "Complete your assessment first" }, { status: 404 }); const buffer = await renderToBuffer(<BlueprintDocument name={ctx.name} results={ctx.results} mode={ctx.mode} />); return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="compatibility-blueprint.pdf"', "Cache-Control": "no-store" } }); }
