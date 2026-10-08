export const SERVER_MANAGED_KEY = "server-managed";
export const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";

export function resolveZaiKey(baseUrl: string, apiKey: string): string {
  if (apiKey !== SERVER_MANAGED_KEY) return apiKey;
  if (baseUrl.replace(/\/$/, "") !== ZAI_BASE_URL) throw new Error("Server-managed GLM requires the official Z.AI endpoint");
  if (!process.env.ZAI_API_KEY) throw new Error("ZAI_API_KEY is not configured in .env.local");
  return process.env.ZAI_API_KEY;
}

export function resolveMiniMaxKey(apiKey: string): string {
  if (apiKey !== SERVER_MANAGED_KEY) return apiKey;
  if (!process.env.MINIMAX_API_KEY) throw new Error("MINIMAX_API_KEY is not configured in .env.local");
  return process.env.MINIMAX_API_KEY;
}
