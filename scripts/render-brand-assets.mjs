import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const icon = await readFile(resolve(root, "src/app/icon.svg"));
const media = await Promise.all(["juicer", "coffee", "tissue"].map(async (name) => {
  const file = await readFile(resolve(root, `public/examples/${name}.png`));
  return `data:image/png;base64,${file.toString("base64")}`;
}));
const iconData = `data:image/svg+xml;base64,${icon.toString("base64")}`;
const social = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#f5f6f7"/>
  <image href="${iconData}" x="80" y="96" width="88" height="88"/>
  <text x="196" y="156" font-family="sans-serif" font-size="58" font-weight="600" fill="#232a27">ReelDesk</text>
  <text x="82" y="274" font-family="Microsoft YaHei,sans-serif" font-size="40" font-weight="600" fill="#232a27">电商视频工作台</text>
  <text x="82" y="330" font-family="sans-serif" font-size="24" fill="#67726b">Product video workspace</text>
  <text x="82" y="384" font-family="Microsoft YaHei,sans-serif" font-size="24" fill="#286349">商品素材 · 视频镜头 · 多语言成片</text>
  ${media.map((image, index) => `<image href="${image}" x="${724 + index * 138}" y="238" width="124" height="124"/>`).join("")}
  <path d="M80 502H1120" stroke="#dce2de"/>
  <text x="82" y="548" font-family="sans-serif" font-size="18" fill="#67726b">Production / Review / Export</text>
</svg>`);
const png = await sharp(social).png().toBuffer();
await writeFile(resolve(root, "src/app/opengraph-image.png"), png);
await writeFile(resolve(root, "src/app/twitter-image.png"), png);
await sharp(icon).resize(180, 180).png().toFile(resolve(root, "src/app/apple-icon.png"));
await sharp(icon).resize(512, 512).png().toFile(resolve(root, "electron/icon.png"));

const favicon = await sharp(icon).resize(256, 256).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(resolve(root, "src/app/favicon.ico"), Buffer.concat([header, favicon]));
console.log("Rendered ReelDesk social images and application icons.");
