import React from 'react';
import { UserProfile } from '../types/social';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface StudioSectionProps {
  creators: Record<string, UserProfile>;
  onSelectStudio: (studio: UserProfile) => void;
}

export const StudioSection: React.FC<StudioSectionProps> = ({ creators, onSelectStudio }) => {
  const { t } = useLanguage();
  const studios = (Object.values(creators) as UserProfile[]).filter(
    (c) => c.role === 'STUDIO'
  );

  return (
    <section id="studios" className="relative w-full bg-[#050507] border-b border-white/10 py-20 md:py-32 px-4 sm:px-6 md:px-12 select-text">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-12 gap-6">
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              {t('navStudios')}
            </h2>
          </div>
        </div>

        {/* Real Studios List or Minimal Empty State */}
        {studios.length === 0 ? (
          <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
            {t('noStudiosYet')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {studios.map((studio) => (
              <div
                key={studio.id}
                onClick={() => onSelectStudio(studio)}
                className="group cursor-pointer border border-white/10 hover:border-white/30 transition-all p-8 flex flex-col justify-between bg-neutral-950/60"
              >
                <div>
                  <h3 className="text-2xl font-serif uppercase tracking-tight text-white group-hover:text-white/80 transition-colors">
                    {studio.displayName}
                  </h3>
                  <p className="text-xs font-mono text-white/40 mt-1">
                    @{studio.username}
                  </p>
                  {studio.bio && (
                    <p className="text-sm font-light text-neutral-300 mt-4 leading-relaxed">
                      {studio.bio}
                    </p>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/40">
                  <span>{studio.location || 'GLOBAL'}</span>
                  <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
