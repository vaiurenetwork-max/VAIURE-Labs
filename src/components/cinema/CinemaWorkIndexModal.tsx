import React, { useState } from 'react';
import { X, Grid, List, ArrowUpRight } from 'lucide-react';
import { CinemaProject } from '../../data/cinemaProjectsData';
import { useLanguage } from '../../services/i18n';

interface CinemaWorkIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: CinemaProject[];
  onSelectProject: (project: CinemaProject) => void;
}

export const CinemaWorkIndexModal: React.FC<CinemaWorkIndexModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSelectProject,
}) => {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (!isOpen) return null;

  const categories = ['ALL', 'MOTION', 'FASHION', 'FILM', 'TEXTILE'];

  const filteredProjects = projects.filter((p) => {
    if (activeCategory === 'ALL') return true;
    return (
      p.discipline.toUpperCase().includes(activeCategory) ||
      p.campaignType.toUpperCase().includes(activeCategory)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col overflow-y-auto select-text text-white animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white">
            VAIURE
          </span>
          <span className="text-xs text-white/50 font-sans">
            唯昱尔
          </span>
          <span className="text-white/20">/</span>
          <span className="text-xs font-mono uppercase tracking-widest text-white/70">
            {t('cinemaCompleteWorkIndex')} ({projects.length})
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center border border-white/20 p-0.5 rounded">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Work Index"
            className="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 py-10 space-y-10">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-6 text-xs font-mono">
          <span className="text-white/40 uppercase tracking-widest mr-2">{t('cinemaDiscipline')}:</span>
          {[
            { key: 'ALL', label: t('cinemaAll') },
            { key: 'MOTION', label: t('cinemaTagMotion') },
            { key: 'FASHION', label: t('cinemaTagFashion') },
            { key: 'FILM', label: t('cinemaTagFilm') },
            { key: 'TEXTILE', label: t('cinemaTagTextile') },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 uppercase transition-all cursor-pointer ${
                activeCategory === cat.key
                  ? 'border-b-2 border-white text-white font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              · {cat.label}
            </button>
          ))}
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p);
                  onClose();
                }}
                className="group cursor-pointer space-y-3"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-950 border border-white/15 group-hover:border-white transition-all relative">
                  <img
                    src={p.thumbnailImage}
                    alt={p.title}
                    className="w-full h-full object-cover filter contrast-[1.05] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 text-[9px] font-mono uppercase tracking-wider text-white">
                    {p.code}
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-white/50 text-[10px] tracking-widest uppercase">
                    <span>{p.discipline}</span>
                    <span>{p.year}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white uppercase group-hover:text-white/80 transition-colors flex items-center justify-between">
                    <span>{p.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>

                  <p className="text-white/60 text-[11px] font-serif italic truncate">{p.subtitle}</p>
                  <p className="text-white/40 text-[10px] truncate">{p.creators}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="border border-white/10 divide-y divide-white/10 font-mono text-xs">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p);
                  onClose();
                }}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-white/40 font-mono text-xs w-6">{p.code}</span>
                  <div className="w-16 h-10 overflow-hidden border border-white/15 flex-shrink-0 bg-neutral-950">
                    <img src={p.thumbnailImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white uppercase group-hover:text-white/80 text-sm">
                      {p.title}
                    </h4>
                    <p className="text-white/50 text-[11px] font-serif italic">{p.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[11px] text-white/60 sm:text-right">
                  <span className="hidden md:inline">{p.creators}</span>
                  <span className="text-white/40">{p.discipline}</span>
                  <span>{p.year}</span>
                  <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
