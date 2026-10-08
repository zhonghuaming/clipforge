export interface H3QuoteInput {
  modelId: string;
  duration?: number;
  referenceImageUrls?: string[];
  firstFrameUrl?: string;
  lastFrameUrl?: string;
}

export function estimateH3Cost(options: H3QuoteInput) {
  const seconds = Math.max(4, Math.min(15, Math.round(options.duration ?? 5)));
  const resolution = options.modelId === "MiniMax-H3-2K" ? "2K" : "768P";
  const imageRefs = options.referenceImageUrls?.length
    ? [...new Set([...(options.firstFrameUrl ? [options.firstFrameUrl] : []), ...options.referenceImageUrls])].slice(0, 9)
    : [options.firstFrameUrl, options.lastFrameUrl].filter(Boolean);
  const images = imageRefs.length;
  const totalUsd = Math.round((seconds * (resolution === "2K" ? 0.13 : 0.08) + Math.max(0, images - 5) * 0.04) * 100) / 100;
  return { seconds, resolution, images, totalUsd };
}
