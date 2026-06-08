import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useNavigate } from 'react-router';

export default function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  const productLinks = [
    { label: t.footer_link_forecast, path: '/dashboard/forecast' },
    { label: t.footer_link_restock, path: '/dashboard/replenishment' },
    { label: t.footer_link_inventory, path: '/dashboard/inventory' },
    { label: t.footer_link_policy, path: '/dashboard/policy' },
    { label: t.footer_link_alert, path: '/dashboard/alerts' },
  ];

  const footerLinks = [
    { title: t.footer_cat_product, links: productLinks },
    { title: t.footer_cat_industry, links: [
      { label: t.footer_link_pharma, path: '/dashboard' },
      { label: t.footer_link_chain, path: '/dashboard' },
      { label: t.footer_link_hospital, path: '/dashboard' },
      { label: t.footer_link_procurement, path: '/dashboard/policy' },
      { label: t.footer_link_drg, path: '/dashboard/policy' },
    ]},
    { title: t.footer_cat_resources, links: [
      { label: t.footer_link_docs, path: '/dashboard' },
      { label: t.footer_link_api, path: '/dashboard' },
      { label: t.footer_link_changelog, path: '/dashboard' },
      { label: t.footer_link_security, path: '/dashboard' },
      { label: t.footer_link_status, path: '/dashboard' },
    ]},
    { title: t.footer_cat_company, links: [
      { label: t.footer_link_about, path: '/' },
      { label: t.footer_link_careers, path: '/' },
      { label: t.footer_link_news, path: '/' },
      { label: t.footer_link_partners, path: '/' },
      { label: t.footer_link_contact, path: '/' },
    ]},
  ];

  return (
    <footer
      id="footer"
      className="relative w-full pt-24 pb-12"
      style={{
        backgroundColor: '#0A0C10',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        zIndex: 10,
      }}
    >
      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 mb-20">
        <div
          className="relative rounded-sm p-10 md:p-16 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,85,255,0.08), rgba(0,217,192,0.05))',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 opacity-20"
            style={{
              background: 'radial-gradient(circle, #00D9C0 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ fontFamily: "'Space Grotesk', 'PingFang SC', sans-serif" }}
              >
                {t.footer_cta_title}
              </h3>
              <p className="text-sm" style={{ color: '#AEB9D2' }}>
                {t.footer_cta_subtitle}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.footer_email_placeholder}
                className="flex-1 md:w-64 px-5 py-3 rounded-sm text-sm outline-none transition-all duration-300 focus:ring-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-sm text-sm font-medium transition-all duration-300 hover:opacity-90 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #0055FF, #00D9C0)',
                  color: '#FFFFFF',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {submitted ? t.footer_submitted : t.footer_submit}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Links Grid */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0055FF, #00D9C0)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                PHARMALINK
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#AEB9D2' }}>
              {t.footer_slogan}
            </p>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: '#FFFFFF', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {group.title}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.path}
                      className="text-xs transition-colors duration-300 hover:text-white"
                      style={{ color: '#AEB9D2' }}
                      onClick={(e) => { e.preventDefault(); navigate(link.path); }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between pt-8 gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <p className="text-xs" style={{ color: '#AEB9D2' }}>
            {t.footer_copyright}
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs transition-colors duration-300 hover:text-white" style={{ color: '#AEB9D2' }} onClick={(e) => e.preventDefault()}>
              {t.footer_privacy}
            </a>
            <a href="#" className="text-xs transition-colors duration-300 hover:text-white" style={{ color: '#AEB9D2' }} onClick={(e) => e.preventDefault()}>
              {t.footer_terms}
            </a>
            <a href="#" className="text-xs transition-colors duration-300 hover:text-white" style={{ color: '#AEB9D2' }} onClick={(e) => e.preventDefault()}>
              {t.footer_icp}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
