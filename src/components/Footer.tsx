import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { db, doc, setDoc } from '../lib/firebase';
import { useLanguage } from '../services/i18n';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenSubmit: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenSubmit }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setIsSubscribing(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const subKey = cleanEmail.replace(/[^a-z0-9]/g, '_');
      await setDoc(
        doc(db, 'newsletterSubscribers', subKey),
        {
          email: cleanEmail,
          subscribedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSubscribed(true);
    } catch (err) {
      console.warn('Newsletter subscribe note:', err);
      // Still set subscribed if network was offline
      setSubscribed(true);
    } finally {
      setIsSubscribing(false);
    }
  };

  const navItems = [
    { id: 'social-feed', label: t('explore') },
    { id: 'fashion', label: t('navFashion') },
    { id: 'film', label: t('navFilm') },
    { id: 'artists', label: t('navCreators') },
    { id: 'studios', label: t('navStudios') },
    { id: 'submit-section', label: t('submitWork'), action: onOpenSubmit },
  ];

  const socialLinks = [
    { label: 'INSTAGRAM', href: 'https://instagram.com' },
    { label: 'TIKTOK', href: 'https://tiktok.com' },
    { label: 'YOUTUBE', href: 'https://youtube.com' },
    { label: 'X', href: 'https://x.com' },
    { label: 'PINTEREST', href: 'https://pinterest.com' },
  ];

  return (
    <footer className="relative w-full bg-[#030305] text-white pt-20 md:pt-32 pb-32 sm:pb-36 md:pb-12 px-4 sm:px-6 md:px-12 select-text border-t border-white/10">
      <div className="max-w-[1440px] mx-auto">
        {/* Massive Monumental Headline */}
        <div className="border-b border-white/10 pb-16 md:pb-24">
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-serif font-light text-white tracking-tight uppercase leading-[0.9]">
            VAIURE <span className="font-sans text-3xl sm:text-5xl md:text-6xl font-light text-white/80 lowercase tracking-widest">唯昱尔</span><br />
            <span className="italic font-serif font-normal text-white/90">{t('curatorialArchive')}</span>
          </h2>
        </div>

        {/* 4-Zone Footer Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 py-16 border-b border-white/10">
          {/* Col 1: Brand & Philosophy */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight uppercase font-display block">
                VAIURE
              </span>
              <span className="text-xs font-light text-white/60 font-sans tracking-wider">
                唯昱尔
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-light max-w-sm leading-relaxed">
              {t('footerAbout')}
            </p>
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
              {t('footerLocation')}
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="lg:col-span-3 space-y-3">
            <span className="text-xs font-mono tracking-widest text-white/40 uppercase block mb-4">
              {t('indexNav')}
            </span>
            <nav className="flex flex-col space-y-2 text-xs tracking-widest uppercase font-mono">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      onNavigate(item.id);
                    }
                  }}
                  className="text-left text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Col 3: Social Dispatches */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs font-mono tracking-widest text-white/40 uppercase block mb-4">
              {t('channels')}
            </span>
            <div className="flex flex-col space-y-2 text-xs tracking-widest uppercase font-mono">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Col 4: Newsletter "ENTER THE ARCHIVE" */}
          <div className="lg:col-span-3 space-y-4">
            <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
              {t('dispatch')}
            </span>
            <h4 className="text-lg font-serif font-light uppercase text-white">
              {t('enterTheArchive')}
            </h4>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              {t('dispatchDesc')}
            </p>

            {subscribed ? (
              <div className="p-3 border border-white/20 bg-neutral-900 text-xs font-mono text-white/80 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{t('subscribedSuccess')}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex border border-white/20 focus-within:border-white transition-colors bg-neutral-950">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('yourEmail')}
                    className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none uppercase font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-mono tracking-wider text-white hover:text-neutral-300 transition-colors uppercase border-l border-white/20 flex items-center cursor-pointer"
                    aria-label="Subscribe to archive"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar Legal & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-white/40 gap-4">
          <div>
            © 2026–2035 VAIURE 唯昱尔. {t('allRightsReserved')}
          </div>
          <div className="flex items-center gap-6">
            <span>{t('termsOfAccession')}</span>
            <span>{t('privacyProtocol')}</span>
            <span>{t('curatorialCode')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
