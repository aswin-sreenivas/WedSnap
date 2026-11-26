import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { BLOG_ARTICLES } from '../data/blogArticles';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/blog')!;
const CATEGORIES = ['All', ...Array.from(new Set(BLOG_ARTICLES.map((a) => a.category)))];

export function BlogIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filtered =
    selectedCategory === 'All'
      ? BLOG_ARTICLES
      : BLOG_ARTICLES.filter((a) => a.category === selectedCategory);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'The WedSnap Journal',
      description: seo.description,
      url: `${origin}/blog`,
      blogPost: BLOG_ARTICLES.map((a) => ({
        '@type': 'BlogPosting',
        headline: a.title,
        url: `${origin}/blog/${a.slug}`,
        datePublished: a.publishedAt,
        dateModified: a.updatedAt,
        author: {
          '@type': 'Person',
          name: a.authorName,
        },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/blog"
        robots={seo.robots}
        ogImage={seo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 sm:py-16 space-y-10">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium">Blog</span>
        </nav>

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E7E2D8] pb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D] mb-2">
              Wedding Photography &amp; AI Guides
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-[#1C1917] mb-3">
              {seo.h1}
            </h1>
            <p className="text-base text-[#57534E] leading-relaxed">
              Practical resources on finding yourself in wedding albums, sharing Google Drive galleries cleanly, and creating reception QR codes.
            </p>
          </div>

          {/* Interactive Filter Controls */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3F0EA] rounded-xl border border-[#E7E2D8]">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === category
                    ? 'bg-white text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article) => (
            <article
              key={article.slug}
              className="group bg-white border border-[#E7E2D8] rounded-2xl overflow-hidden flex flex-col hover:border-[#B8924A] transition-colors"
            >
              <Link to={`/blog/${article.slug}`} className="aspect-[16/10] bg-[#F3F0EA] overflow-hidden">
                <img
                  src={article.featuredImage}
                  alt={article.featuredImageAlt}
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={500}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
              </Link>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#78716C] mb-2">
                    {article.category} <span aria-hidden="true">·</span> {article.readingTime}{' '}
                    <span aria-hidden="true">·</span> {article.publishedAt}
                  </p>
                  <h2 className="text-2xl font-semibold text-[#1C1917] leading-snug mb-2">
                    <Link to={`/blog/${article.slug}`} className="hover:text-[#9A742D] transition-colors">
                      {article.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-[#57534E] leading-relaxed">{article.excerpt}</p>
                </div>

                <Link
                  to={`/blog/${article.slug}`}
                  className="mt-5 pt-3 border-t border-[#E7E2D8] text-xs font-medium text-[#1C1917] group-hover:text-[#9A742D] inline-flex items-center justify-between"
                >
                  <span>Read article</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
