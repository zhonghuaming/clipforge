import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    zai: Boolean(process.env.ZAI_API_KEY),
    minimax: Boolean(process.env.MINIMAX_API_KEY),
  }, { headers: { "Cache-Control": "no-store" } });
}
