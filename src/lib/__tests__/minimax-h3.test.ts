// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { MiniMaxH3Provider } from "@/lib/providers/minimax-h3";
import { estimateH3Cost } from "@/lib/h3-pricing";
import { ProviderError } from "@/lib/providers/base";

afterEach(() => vi.unstubAllGlobals());

const provider = () => new MiniMaxH3Provider({ name: "minimax-h3", apiKey: "test-key", baseUrl: "https://untrusted.example" });

describe("MiniMax H3 official API", () => {
  it("quotes five included images and charges only additional references", () => {
    expect(estimateH3Cost({ modelId: "MiniMax-H3", duration: 12, referenceImageUrls: Array(5).fill("image") }).totalUsd).toBe(0.96);
    expect(estimateH3Cost({ modelId: "MiniMax-H3-2K", duration: 5, referenceImageUrls: Array.from({ length: 7 }, (_, i) => `image-${i}`) }).totalUsd).toBe(0.73);
  });

  it("requires approval before any billable request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider().submitVideoTask({ modelId: "MiniMax-H3", mode: "image-to-video", prompt: "show the product", duration: 5, firstFrameUrl: "https://example.com/item.png" })).rejects.toMatchObject({ code: "COST_APPROVAL_REQUIRED" } satisfies Partial<ProviderError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the official endpoint and reference roles for multiple product images", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("/v2/video_generation");
      expect(init?.method).toBe("POST");
      return new Response(JSON.stringify({ task_id: "h3-task-1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await provider().submitVideoTask({
      modelId: "MiniMax-H3", mode: "image-to-video", prompt: "hands demonstrating the product", duration: 5,
      firstFrameUrl: "https://example.com/first.png",
      referenceImageUrls: ["https://example.com/first.png", "data:image/png;base64,abc"],
      extra: { approvedEstimateUsd: 0.4 },
    });
    expect(result.taskId).toBe("h3-task-1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.minimax.io/v2/video_generation");
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect((request.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({ model: "MiniMax-H3", resolution: "768P", duration: 5, ratio: "9:16" });
    expect(body.content.filter((item: { role?: string }) => item.role === "reference_image")).toHaveLength(2);
    expect(body).not.toHaveProperty("approvedEstimateUsd");
  });

  it("reads completed output and official usage for actual cost", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ task: {
      id: "h3-task-1", status: "succeeded", resolution: "768P", usage: { output_seconds: 5, input_image_count: 6 },
      content: { url: "https://cdn.example.com/video.mp4" },
    } }), { status: 200 })));
    const status = await provider().getTaskStatus("h3-task-1");
    expect(status.status).toBe("completed");
    expect(status.result).toMatchObject({ videoUrls: ["https://cdn.example.com/video.mp4"], extra: { actualCostUsd: 0.44 } });
  });

  it("rejects reference video inputs because their billable duration is not quoted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider().submitVideoTask({ modelId: "MiniMax-H3", mode: "video-to-video", prompt: "demo", duration: 5,
      referenceVideoUrls: ["https://example.com/clip.mp4"], extra: { approvedEstimateUsd: 1 },
    })).rejects.toMatchObject({ code: "INVALID_REFERENCE" } satisfies Partial<ProviderError>);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
