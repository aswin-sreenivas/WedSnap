import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Share2 } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { BLOG_ARTICLES, getBlogArticleBySlug } from '../data/blogArticles';
import { NotFoundPage } from './NotFoundPage';

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getBlogArticleBySlug(slug) : undefined;
  const [copied, setCopied] = useState(false);

  if (!article) {
    return <NotFoundPage />;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const articleUrl = `${origin}/blog/${article.slug}`;
  const absoluteImage = `${origin}${article.featuredImage}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.metaDescription,
      image: absoluteImage,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      author: {
        '@type': 'Person',
        name: article.authorName,
      },
      publisher: {
        '@type': 'Organization',
        name: 'WedSnap',
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/src/assets/images/wedsnap_app_icon_1795726533955.jpg`,
        },
      },
      mainEntityOfPage: articleUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
        { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
      ],
    },
  ];

  const related = article.relatedSlugs
    .map((s) => BLOG_ARTICLES.find((a) => a.slug === s))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const handleCopyShare = async () => {
    await navigator.clipboard.writeText(articleUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={article.metaTitle}
        description={article.metaDescription}
        path={`/blog/${article.slug}`}
        robots="index, follow"
        ogType="article"
        ogImage={article.featuredImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex flex-wrap items-center gap-2 mb-8">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/blog" className="hover:text-[#1C1917]">
            Blog
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium truncate">{article.title}</span>
        </nav>

        <article className="space-y-8">
          <header className="space-y-4">
            <p className="text-xs text-[#78716C]">
              {article.category} <span aria-hidden="true">·</span> {article.readingTime}{' '}
              <span aria-hidden="true">·</span> Published {article.publishedAt}{' '}
              <span aria-hidden="true">·</span> Updated {article.updatedAt}
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-tight">
              {article.title}
            </h1>
            <p className="text-base sm:text-lg text-[#57534E] leading-relaxed">
              {article.excerpt}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#E7E2D8]">
              <p className="text-xs text-[#57534E]">
                By <span className="font-medium text-[#1C1917]">{article.authorName}</span> ·{' '}
                {article.authorRole}
              </p>

              <div className="flex items-center gap-2 text-xs">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${articleUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] inline-flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => void handleCopyShare()}
                  className="px-3 py-1.5 border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA] inline-flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </header>

          <figure className="rounded-2xl overflow-hidden border border-[#E7E2D8] bg-[#F3F0EA] aspect-[16/9]">
            <img
              src={article.featuredImage}
              alt={article.featuredImageAlt}
              width={1200}
              height={675}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </figure>

          {/* Table of Contents */}
          {article.sections.length > 1 && (
            <nav
              aria-label="Table of contents"
              className="bg-white border border-[#E7E2D8] rounded-2xl p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#9A742D] mb-3">
                In This Guide
              </p>
              <ol className="space-y-2 text-sm text-[#57534E] list-decimal list-inside">
                {article.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="hover:text-[#1C1917] underline underline-offset-4"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Article Body Sections */}
          <div className="space-y-10">
            {article.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-4 scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-base text-[#44403C] leading-relaxed">
                    {p}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="space-y-2 pl-5 list-disc text-sm text-[#44403C]">
                    {section.bullets.map((b, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Internal Conversion Callout */}
          <aside className="bg-white border border-[#E7E2D8] rounded-2xl p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h2 className="text-2xl font-semibold text-[#1C1917] mb-1">
                Try WedSnap with your Google Drive wedding album
              </h2>
              <p className="text-sm text-[#57534E]">
                Connect a folder in minutes and share a privacy-first QR code with your guests.
              </p>
            </div>
            <Link
              to="/admin/login"
              className="px-5 py-2.5 bg-[#1C1917] text-white text-sm font-medium rounded-lg hover:bg-[#9A742D] transition-colors whitespace-nowrap shrink-0"
            >
              Open Organizer Studio
            </Link>
          </aside>
        </article>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="mt-14 pt-10 border-t border-[#E7E2D8] space-y-6">
            <h2 className="text-2xl font-semibold text-[#1C1917]">Related Articles</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  to={`/blog/${rel.slug}`}
                  className="bg-white border border-[#E7E2D8] rounded-2xl p-5 hover:border-[#B8924A] transition-colors"
                >
                  <p className="text-xs text-[#78716C] mb-1.5">
                    {rel.category} · {rel.readingTime}
                  </p>
                  <h3 className="font-display text-xl font-semibold text-[#1C1917] mb-1">
                    {rel.title}
                  </h3>
                  <p className="text-xs text-[#57534E] line-clamp-2">{rel.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All articles</span>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
