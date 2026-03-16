import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_LANG, SUPPORTED_LANGS, getAllArticles, type SiteLang } from "../../../lib/articles";

type PageProps = {
  params: Promise<{ lang: string }> | { lang: string };
};

const pageMetaByLang: Record<SiteLang, { title: string; description: string; empty: string; read: string }> = {
  id: {
    title: "Daftar Artikel",
    description: "Kumpulan artikel terbaru seputar fiqh, hadis, dan pemikiran Islam.",
    empty: "Belum ada artikel untuk bahasa ini.",
    read: "Baca artikel",
  },
  en: {
    title: "Articles",
    description: "Latest Islamic articles on fiqh, hadith, and contemporary thought.",
    empty: "No articles found for this language.",
    read: "Read article",
  },
  ar: {
    title: "\u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062a",
    description: "\u0623\u062d\u062f\u062b \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062a \u0641\u064a \u0627\u0644\u0641\u0642\u0647 \u0648\u0627\u0644\u062d\u062f\u064a\u062b \u0648\u0627\u0644\u0641\u0643\u0631 \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064a.",
    empty: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0642\u0627\u0644\u0627\u062a \u0644\u0647\u0630\u0647 \u0627\u0644\u0644\u063a\u0629 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.",
    read: "\u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0642\u0627\u0644",
  },
};

function resolveLang(value: string): SiteLang {
  return SUPPORTED_LANGS.includes(value as SiteLang) ? (value as SiteLang) : DEFAULT_LANG;
}

function toPublicImagePath(thumbnail: string): string {
  const clean = String(thumbnail || "").replace(/^\/+/, "");
  return clean ? `/${clean}` : "";
}

export function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const resolvedLang = resolveLang(resolvedParams.lang);
  const meta = pageMetaByLang[resolvedLang];

  return {
    title: `${meta.title} | Portal Literasi Islam`,
    description: meta.description,
  };
}

export default async function ArticlesPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedLang = resolveLang(resolvedParams.lang);
  const articles = getAllArticles(resolvedLang);
  const isArabic = resolvedLang === "ar";
  const meta = pageMetaByLang[resolvedLang];

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        width: "100%",
        maxWidth: 1120,
        margin: "0 auto",
        padding: "24px 16px 40px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 8 }}>{meta.title}</h1>
        <p style={{ color: "#475569", margin: 0 }}>{meta.description}</p>
      </header>

      {articles.length === 0 ? (
        <p style={{ color: "#64748b" }}>{meta.empty}</p>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {articles.map((article) => (
            <article
              key={`${resolvedLang}-${article.slug}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                overflow: "hidden",
                background: "#fff",
                minWidth: 0,
              }}
            >
              {article.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={toPublicImagePath(article.thumbnail)}
                  alt={article.title}
                  style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }}
                />
              ) : null}

              <div style={{ padding: 14, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 8, wordBreak: "break-word" }}>
                  {article.category} - {article.subcategory}
                </p>
                <h2 style={{ fontSize: 18, marginBottom: 8, wordBreak: "break-word" }}>{article.title}</h2>
                <p style={{ fontSize: 14, color: "#334155", marginBottom: 10, wordBreak: "break-word" }}>
                  {article.excerpt}
                </p>
                <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{article.date}</p>

                <Link href={`/${resolvedLang}/article/${article.slug}`} style={{ color: "#2563eb", fontWeight: 600 }}>
                  {meta.read}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}