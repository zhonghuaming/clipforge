import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { publishMetrics, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { aggregateByStyle, aggregateByHook, metricsForMarket, recommendCommerceContent } from "@/lib/performance-insights";

/**
 * GET /api/insights/styles — aggregate publish metrics across all projects to determine which style sells best and which hook mechanism converts best.
 * Results are sorted by conversion rate (orders/views) descending, for use in the export page/dashboard and to feed back into script/hook generation.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const projectId = req.nextUrl.searchParams.get("projectId");
  const [project] = projectId ? await db.select().from(projects).where(eq(projects.id, projectId)) : [];
  const requestedMarket = req.nextUrl.searchParams.get("market");
  const requestedLanguage = req.nextUrl.searchParams.get("language");
  const market = requestedMarket && /^[A-Z]{2}$/.test(requestedMarket) ? requestedMarket : project?.targetMarket;
  const language = requestedLanguage && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(requestedLanguage) ? requestedLanguage : project?.targetLanguage;
  const allRows = await db.select().from(publishMetrics);
  const rows = projectId
    ? market && language ? metricsForMarket(allRows, market, language) : []
    : allRows;
  const records = rows.map((r) => ({
    style: r.style,
    hookId: r.hookId ?? undefined,
    views: r.views,
    clicks: r.clicks,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    orders: r.orders,
  }));
  const recommendation = recommendCommerceContent(records);
  const rank = <T extends { conversionRate: number; clickThroughRate: number; samples: number }>(groups: T[]) =>
    recommendation.objective === "clicks" ? groups.sort((a, b) => b.clickThroughRate - a.clickThroughRate || b.samples - a.samples) : groups;
  return NextResponse.json({
    insights: rank(aggregateByStyle(records)),
    hookInsights: rank(aggregateByHook(records)),
    recommendation,
    market: market ?? null,
    language: language ?? null,
    total: rows.length,
  });
}
