import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  getAllKnownSlugs,
  getArticleBySlug,
  getAvailableLanguagesForArticle,
  type SiteLang,
} from "../../../../lib/articles";

type PageProps = {
  params: Promise<{ lang: string; slug: string }> | { lang: string; slug: string };
};

const textByLang: Record<
  SiteLang,
  {
    notFound: string;
    fallback: string;
    availableLanguages: string;
    back: string;
  }
> = {
  id: {
    notFound: "Artikel tidak ditemukan",
    fallback: "Versi bahasa ini belum tersedia, jadi sementara ditampilkan versi Indonesia.",
    availableLanguages: "Bahasa tersedia",
    back: "Kembali ke daftar artikel",
  },
  en: {
    notFound: "Article not found",
    fallback: "This article is not available in this language yet, so the Indonesian version is shown temporarily.",
    availableLanguages: "Available languages",
    back: "Back to article list",
  },
  ar: {
    notFound: "\u0627\u0644\u0645\u0642\u0627\u0644 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f",
    fallback: "\u0647\u0630\u0647 \u0627\u0644\u0645\u0642\u0627\u0644\u0629 \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631\u0629 \u0628\u0647\u0630\u0647 \u0627\u0644\u0644\u063a\u0629 \u0628\u0639\u062f\u060c \u0644\u0630\u0644\u0643 \u0646\u0639\u0631\u0636 \u0627\u0644\u0646\u0633\u062e\u0629 \u0627\u0644\u0625\u0646\u062f\u0648\u0646\u064a\u0633\u064a\u0629 \u0645\u0624\u0642\u062a\u064b\u0627.",
    availableLanguages: "\u0627\u0644\u0644\u063a\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
    back: "\u0627\u0644\u0631\u062c\u0648\u0639 \u0625\u0644\u0649 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062a",
  },
};

function resolveLang(value: string): SiteLang {
  return SUPPORTED_LANGS.includes(value as SiteLang) ? (value as SiteLang) : DEFAULT_LANG;
}

function toPublicImagePath(thumbnail: string): string {
  const clean = String(thumbnail || "").replace(/^\/+/, "");
  return clean ? `/${clean}` : "";
}

function isPlaceholderTranslation(lang: SiteLang, content: string): boolean {
  if (lang === DEFAULT_LANG) {
    return false;
  }

  const normalized = content.trim();

  return (
    normalized.includes("## Translation in Progress") ||
    normalized.includes("This article is not fully available in English yet.") ||
    normalized.includes("## \u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0642\u064a\u062f \u0627\u0644\u0625\u0639\u062f\u0627\u062f") ||
    normalized.includes("\u0647\u0630\u0647 \u0627\u0644\u0645\u0642\u0627\u0644\u0629 \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631\u0629 \u0643\u0627\u0645\u0644\u0629 \u0628\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629")
  );
}

function getArticleByLangWithFallback(lang: SiteLang, slug: string) {
  const direct = getArticleBySlug(lang, slug);
  if (direct && !isPlaceholderTranslation(lang, direct.content)) {
    return { article: direct, fallback: false };
  }

  const fallbackArticle = getArticleBySlug(DEFAULT_LANG, slug);
  if (!fallbackArticle) {
    return { article: null, fallback: false };
  }

  return { article: fallbackArticle, fallback: true };
}

function extractPlainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(extractPlainText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractPlainText(node.props.children);
  }

  return "";
}

function splitQuoteSegments(node: ReactNode) {
  const arabicRegex = /[\u0600-\u06FF]/;
  const children = Children.toArray(node);

  const lines = children
    .flatMap((child) => {
      if (!isValidElement<{ children?: ReactNode }>(child)) {
        const text = extractPlainText(child).trim();
        return text ? [text] : [];
      }

      if (child.type === "br") {
        return [];
      }

      if (child.type === "p") {
        const text = extractPlainText(child.props.children).trim();
        return text ? [text] : [];
      }

      const text = extractPlainText(child.props.children).trim();
      return text ? [text] : [];
    })
    .filter(Boolean);

  return lines.map((line) => ({
    text: line,
    isArabic: arabicRegex.test(line),
  }));
}

export function generateStaticParams() {
  const slugs = getAllKnownSlugs();
  return SUPPORTED_LANGS.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const resolvedLang = resolveLang(resolvedParams.lang);
  const loaded = getArticleByLangWithFallback(resolvedLang, resolvedParams.slug);

  if (!loaded.article) {
    return { title: textByLang[resolvedLang].notFound };
  }

  const available = getAvailableLanguagesForArticle(resolvedParams.slug);
  const languages = Object.fromEntries(available.map((lang) => [lang, `/${lang}/article/${resolvedParams.slug}`]));

  return {
    title: `${loaded.article.title} | Portal Literasi Islam`,
    description: loaded.article.excerpt,
    alternates: {
      canonical: `/${resolvedLang}/article/${resolvedParams.slug}`,
      languages,
    },
    openGraph: {
      title: loaded.article.title,
      description: loaded.article.excerpt,
      type: "article",
      images: loaded.article.thumbnail ? [toPublicImagePath(loaded.article.thumbnail)] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedLang = resolveLang(resolvedParams.lang);
  const loaded = getArticleByLangWithFallback(resolvedLang, resolvedParams.slug);

  if (!loaded.article) {
    notFound();
  }

  const isArabic = resolvedLang === "ar";
  const text = textByLang[resolvedLang];
  const available = getAvailableLanguagesForArticle(resolvedParams.slug);

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        width: "100%",
        maxWidth: 920,
        margin: "0 auto",
        padding: "24px 16px 40px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {loaded.fallback ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            background: "#fef3c7",
            color: "#78350f",
            border: "1px solid #fcd34d",
          }}
        >
          {text.fallback}
        </div>
      ) : null}

      <header style={{ marginBottom: 18, textAlign: isArabic ? "right" : "left" }}>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          {loaded.article.category} - {loaded.article.subcategory}
        </p>
        <h1 style={{ margin: "8px 0", wordBreak: "break-word" }}>{loaded.article.title}</h1>
        <p style={{ color: "#475569", fontSize: 14, margin: 0 }}>
          {loaded.article.author} - {loaded.article.date}
        </p>
      </header>

      {loaded.article.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={toPublicImagePath(loaded.article.thumbnail)}
          alt={loaded.article.title}
          style={{ width: "100%", height: "auto", borderRadius: 12, marginBottom: 18, display: "block" }}
        />
      ) : null}

      <article style={{ lineHeight: 1.8, overflowWrap: "anywhere", textAlign: isArabic ? "right" : "left" }}>
        <ReactMarkdown
          components={{
            blockquote({ children }) {
              const segments = splitQuoteSegments(children);

              if (!segments.length) {
                return <blockquote>{children}</blockquote>;
              }

              return (
                <blockquote
                  style={{
                    margin: "22px 0",
                    padding: "18px 20px",
                    background: "rgba(37, 99, 235, 0.06)",
                    borderLeft: "4px solid #2563eb",
                    borderRadius: 14,
                  }}
                >
                  {segments.map((segment, index) => (
                    <div
                      key={`${segment.isArabic ? "ar" : "tr"}-${index}`}
                      style={
                        segment.isArabic
                          ? {
                              direction: "rtl",
                              textAlign: "right",
                              fontFamily: '"Amiri", "Scheherazade New", serif',
                              fontSize: "1.35em",
                              lineHeight: 1.9,
                              color: "#0f172a",
                              marginTop: index === 0 ? 0 : 12,
                            }
                          : {
                              direction: "ltr",
                              textAlign: "left",
                              fontStyle: "italic",
                              lineHeight: 1.8,
                              color: "#475569",
                              marginTop: 12,
                              whiteSpace: "pre-line",
                            }
                      }
                    >
                      {segment.text}
                    </div>
                  ))}
                </blockquote>
              );
            },
          }}
        >
          {loaded.article.content}
        </ReactMarkdown>
      </article>

      <section style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
        <p style={{ marginBottom: 8, color: "#475569", fontSize: 14 }}>{text.availableLanguages}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {available.map((lang) => (
            <Link key={lang} href={`/${lang}/article/${resolvedParams.slug}`} style={{ color: "#2563eb", fontWeight: 600 }}>
              {lang.toUpperCase()}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <Link href={`/${resolvedLang}/articles`} style={{ color: "#2563eb", fontWeight: 600 }}>
          {text.back}
        </Link>
      </section>
    </main>
  );
}

