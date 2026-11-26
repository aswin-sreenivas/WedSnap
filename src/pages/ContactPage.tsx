import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, Send } from 'lucide-react';
import { PublicFooter } from '../components/PublicFooter';
import { SeoHead } from '../components/SeoHead';
import { TopNav } from '../components/TopNav';
import { PUBLIC_STATIC_ROUTES } from '../data/seoRoutes';
import { trackAnalyticsEvent } from '../lib/analytics';

const seo = PUBLIC_STATIC_ROUTES.find((r) => r.path === '/contact')!;

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Wedding Photographer');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: seo.title,
      description: seo.description,
      url: `${origin}/contact`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Contact', item: `${origin}/contact` },
      ],
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (name.trim().length < 2 || !email.includes('@') || message.trim().length < 10) {
      setErrorMsg('Please enter your name, a valid email address, and a message of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to submit message right now.');
      }
      setSubmitted(true);
      trackAnalyticsEvent('contact_form_submitted', { inquiry_role: role });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1C1917] flex flex-col">
      <SeoHead
        title={seo.title}
        description={seo.description}
        path="/contact"
        robots={seo.robots}
        ogImage={seo.ogImage}
        jsonLd={jsonLd}
      />
      <TopNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 sm:py-16 space-y-10">
        <nav aria-label="Breadcrumb" className="text-xs text-[#78716C] flex items-center gap-2">
          <Link to="/" className="hover:text-[#1C1917]">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#1C1917] font-medium">Contact</span>
        </nav>

        <div className="grid md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-5 space-y-4">
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A742D]">
              Support &amp; Partnerships
            </p>
            <h1 className="text-4xl font-semibold text-[#1C1917]">{seo.h1}</h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Need help connecting a Google Drive folder, setting up a multi-day Indian wedding gallery, or inquiring about studio partnerships? Send us a message.
            </p>
            <div className="pt-4 border-t border-[#E7E2D8] flex items-center gap-3 text-xs text-[#57534E]">
              <Mail className="w-4 h-4 text-[#9A742D] shrink-0" />
              <span>Typical response within 1 business day</span>
            </div>
          </div>

          <div className="md:col-span-7 bg-white border border-[#E7E2D8] rounded-2xl p-6 sm:p-8">
            {submitted ? (
              <div className="py-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#15803D] mx-auto" />
                <h2 className="text-2xl font-semibold text-[#1C1917]">Message received</h2>
                <p className="text-sm text-[#57534E] max-w-sm mx-auto">
                  Thank you for reaching out. Our team has recorded your inquiry and will reply via email shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setMessage('');
                  }}
                  className="mt-2 px-4 py-2 text-xs font-medium border border-[#D6D3CD] rounded-lg hover:bg-[#F3F0EA]"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label htmlFor="contact-name" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Priya Nair"
                    className="w-full h-11 px-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="studio@example.com"
                    className="w-full h-11 px-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
                  />
                </div>

                <div>
                  <label htmlFor="contact-role" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                    I am a
                  </label>
                  <select
                    id="contact-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-11 px-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
                  >
                    <option value="Wedding Photographer">Wedding Photographer / Studio</option>
                    <option value="Couple / Host">Bride, Groom, or Family Host</option>
                    <option value="Wedding Planner">Wedding Planner</option>
                    <option value="Guest / Privacy Request">Wedding Guest / Privacy Inquiry</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-[#1C1917] mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    required
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your upcoming celebration or studio workflow..."
                    className="w-full p-3.5 bg-[#FAF9F6] border border-[#D6D3CD] rounded-xl text-sm focus:outline-none focus:border-[#9A742D]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 px-5 bg-[#1C1917] text-white text-sm font-medium rounded-xl hover:bg-[#9A742D] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
