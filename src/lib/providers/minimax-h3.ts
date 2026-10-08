import { BaseProvider, ProviderError } from "./base";
import type { ImageResult, MediaType, Model, ProviderConfig, TaskStatus, VideoOptions, VideoResult } from "./types";
import { estimateH3Cost } from "@/lib/h3-pricing";

export const MINIMAX_H3_BASE_URL = "https://api.minimax.io";

type H3Content =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string }; role: "first_frame" | "last_frame" | "reference_image" }
  | { type: "video_url"; video_url: { url: string }; role: "reference_video" }
  | { type: "audio_url"; audio_url: { url: string }; role: "reference_audio" };

interface H3TaskResponse {
  task_id?: string;
  task?: {
    id: string;
    status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    model?: string;
    content?: { url?: string };
    resolution?: "768P" | "2K";
    duration?: number;
    usage?: { output_seconds?: number; input_image_count?: number };
    error?: { message?: string; code?: string };
  };
}

export class MiniMaxH3Provider extends BaseProvider {
  readonly name = "minimax-h3";
  readonly displayName = "MiniMax H3 Official";

  constructor(config: ProviderConfig) {
    super({ ...config, baseUrl: MINIMAX_H3_BASE_URL, timeout: 60_000 });
  }

  async generateImage(): Promise<ImageResult> {
    throw new ProviderError("MiniMax H3 only generates video", "UNSUPPORTED_MODE", this.name);
  }

  async submitVideoTask(options: VideoOptions): Promise<{ taskId: string; modelId: string }> {
    if (!options.prompt?.trim() || options.prompt.length > 7000) {
      throw new ProviderError("Prompt must contain 1-7000 characters", "INVALID_PROMPT", this.name);
    }
    if (!["MiniMax-H3", "MiniMax-H3-2K"].includes(options.modelId)) {
      throw new ProviderError("Unsupported MiniMax H3 model", "INVALID_MODEL", this.name);
    }
    const quote = estimateH3Cost(options);
    if (!Number.isInteger(options.duration) || options.duration! < 4 || options.duration! > 15) {
      throw new ProviderError("MiniMax H3 duration must be 4-15 seconds", "INVALID_DURATION", this.name);
    }
    const refs = options.referenceImageUrls ?? [];
    if (options.referenceVideoUrls?.length) {
      throw new ProviderError("Reference videos are not supported by this cost-controlled H3 workflow", "INVALID_REFERENCE", this.name);
    }
    if (refs.length > 9 || (options.referenceAudioUrls?.length ?? 0) > 3) {
      throw new ProviderError("MiniMax H3 reference limit exceeded", "INVALID_REFERENCE", this.name);
    }
    if (refs.some((url) => !url.startsWith("https://") && !url.startsWith("data:image/"))) {
      throw new ProviderError("Reference images need HTTPS or image data URLs", "INVALID_REFERENCE", this.name);
    }
    if ([options.firstFrameUrl, options.lastFrameUrl].some((url) => url && !url.startsWith("https://") && !url.startsWith("data:image/"))) {
      throw new ProviderError("Keyframes need HTTPS or image data URLs", "INVALID_REFERENCE", this.name);
    }
    const content: H3Content[] = [{ type: "text", text: options.prompt.trim() }];
    const referenceMode = refs.length > 0 || Boolean(options.referenceVideoUrls?.length || options.referenceAudioUrls?.length);
    if (referenceMode) {
      const imageRefs = [...new Set([...(options.firstFrameUrl ? [options.firstFrameUrl] : []), ...refs])].slice(0, 9);
      for (const url of imageRefs) content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
      for (const url of options.referenceAudioUrls ?? []) content.push({ type: "audio_url", audio_url: { url }, role: "reference_audio" });
    } else {
      if (options.firstFrameUrl) content.push({ type: "image_url", image_url: { url: options.firstFrameUrl }, role: "first_frame" });
      if (options.lastFrameUrl) content.push({ type: "image_url", image_url: { url: options.lastFrameUrl }, role: "last_frame" });
    }
    const approved = Number(options.extra?.approvedEstimateUsd);
    if (!Number.isFinite(approved) || approved + 0.001 < quote.totalUsd) {
      throw new ProviderError(`Cost approval required: estimated $${quote.totalUsd.toFixed(2)}`, "COST_APPROVAL_REQUIRED", this.name);
    }
    const body = {
      model: "MiniMax-H3",
      content,
      resolution: quote.resolution,
      duration: quote.seconds,
      ratio: referenceMode ? "9:16" : options.firstFrameUrl || options.lastFrameUrl ? "adaptive" : "9:16",
    };
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > 64 * 1024 * 1024) {
      throw new ProviderError("MiniMax H3 request exceeds 64 MB; use smaller images", "INVALID_REFERENCE", this.name);
    }
    const created = await this.request<H3TaskResponse>("/v2/video_generation", {
      method: "POST",
      body,
    });
    if (!created.task_id) throw new ProviderError("MiniMax H3 returned no task ID", "NO_TASK_ID", this.name);
    return { taskId: created.task_id, modelId: options.modelId };
  }

  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const { taskId } = await this.submitVideoTask(options);
    const status = await this.waitForTask(taskId);
    return this.requireResult(status.result) as VideoResult;
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(taskId)) throw new ProviderError("Invalid task ID", "INVALID_TASK_ID", this.name);
    const data = await this.request<H3TaskResponse>(`/v2/query/video_generation/${taskId}`);
    if (!data.task) throw new ProviderError("MiniMax H3 returned no task", "NO_TASK", this.name);
    const status = data.task.status === "succeeded" ? "completed"
      : data.task.status === "queued" ? "pending"
      : data.task.status === "running" ? "processing" : data.task.status;
    return {
      taskId,
      status,
      ...(status === "completed" && data.task.content?.url ? { result: {
        taskId, videoUrls: [data.task.content.url], modelId: data.task.model ?? "MiniMax-H3", hasAudio: true,
        ...(data.task.usage?.output_seconds != null && data.task.resolution ? { extra: {
          actualCostUsd: Math.round((data.task.usage.output_seconds * (data.task.resolution === "2K" ? 0.13 : 0.08)
            + Math.max(0, (data.task.usage.input_image_count ?? 0) - 5) * 0.04) * 100) / 100,
        } } : {}),
      } satisfies VideoResult } : {}),
      ...(data.task.error?.message ? { error: data.task.error.message, errorCode: data.task.error.code } : {}),
    };
  }

  async listModels(mediaType?: MediaType): Promise<Model[]> {
    if (mediaType === "image") return [];
    return [
      { id: "MiniMax-H3", name: "MiniMax H3 768P (official)", description: "$0.08/s; first 5 images included", modes: ["text-to-video", "image-to-video"], mediaType: "video", provider: this.name, supportsAudio: false },
      { id: "MiniMax-H3-2K", name: "MiniMax H3 2K (official)", description: "$0.13/s; first 5 images included", modes: ["text-to-video", "image-to-video"], mediaType: "video", provider: this.name, supportsAudio: false },
    ];
  }
}
