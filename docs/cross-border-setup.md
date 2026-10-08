# ReelDesk cross-border TikTok workflow

This fork runs locally and uses the existing ClipForge project, asset, composition, and export workflow.

## Configure

Use Node.js 20+ and pnpm 10+. Create `.env.local` in the repository root with fresh service keys:

```dotenv
ZAI_API_KEY=your-new-zai-key
MINIMAX_API_KEY=your-minimax-key
```

`.env.local` is ignored by Git. The browser stores only the `server-managed` marker for these services. Restart the dev server after changing the file.
Product images and prompts are sent to Z.AI and MiniMax when their online APIs are used.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Next.js. In Settings, confirm that Z.AI and MiniMax show as configured. The default text model is GLM-5.3; product image analysis uses GLM-5.3-Flash. The default video model is MiniMax H3 768P through the official API. MiniMax Speech is the default paid voice provider.
Set a MiniMax voice ID that supports the target language and use the voice preview before rendering. Unsupported languages or TTS failures stop cross-border composition instead of silently changing voices.

## Produce and publish

1. Create a product project, upload product photos, and enter a two-letter market and a language tag such as `US` / `en-US` or `MX` / `es-MX`.
2. Review the generated script before creating assets. Product photos remain available as exact-image shots; H3 can animate them using up to nine image references.
3. Confirm the estimated H3 charge for each paid clip. The app records the estimate and, when the API reports usage, its calculated actual cost. A failed or unknown task can be resumed from the saved task ID without resubmitting.
4. Review each H3 clip on the production page and select the approved candidate. Only selected clips enter the composition.
5. Check audio, captions, price, and product appearance before exporting the TikTok video and posting copy. Upload and attach products manually in TikTok.
6. Enter views, clicks, and orders after publication. Recommendations compare only records from the same market and language. With too little data, the app stays in exploration mode.

MiniMax H3 estimates use the public list prices of $0.08 per output second at 768P or $0.13 at 2K; the first five reference images are included and additional images are $0.04 each. These are estimates, not a billing statement. MiniMax Speech and Z.AI charges are separate. Neither TikTok account publishing nor native TikTok Shop product attachment is connected in this version.
