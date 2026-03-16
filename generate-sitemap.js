import fs from "node:fs";
import path from "node:path";

const baseUrl = "https://islamic-portal.vercel.app";
const contentRoot = path.join(process.cwd(), "content", "articles");
const langs = ["id", "en", "ar"];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readFrontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*\"?([^\\n\"]+)\"?`, "m"));
  return match ? match[1].trim() : "";
}

function collectUrls() {
  const urls = [];

  urls.push(`
<url>
  <loc>${baseUrl}/</loc>
  <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>1.0</priority>
</url>`);

  for (const lang of langs) {
    const langDir = path.join(contentRoot, lang);
    if (!fs.existsSync(langDir)) continue;

    const files = fs.readdirSync(langDir).filter((file) => file.endsWith(".md"));

    for (const file of files) {
      const fullPath = path.join(langDir, file);
      const source = fs.readFileSync(fullPath, "utf8");

      const slug = readFrontmatterValue(source, "slug") || file.replace(/\.md$/, "");
      const createdAt = readFrontmatterValue(source, "createdAt") || readFrontmatterValue(source, "date") || new Date().toISOString().split("T")[0];
      const url = escapeXml(`${baseUrl}/${lang}/article/${slug}`);

      urls.push(`
<url>
  <loc>${url}</loc>
  <lastmod>${createdAt}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`);
    }
  }

  return urls;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${collectUrls().join("\n")}
</urlset>`;

fs.writeFileSync(path.join(process.cwd(), "sitemap.xml"), sitemap, "utf8");
console.log("Sitemap berhasil dibuat dari Markdown.");