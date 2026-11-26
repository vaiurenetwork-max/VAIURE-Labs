import React, { useState } from 'react';
import { X, Grid, List, ArrowUpRight, Sparkles } from 'lucide-react';
import {
  StudioDepartment,
  SEEDANCE_PIPELINE_STAGES,
} from '../../data/hybridStudioData';

interface CinemaWorkIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: StudioDepartment[];
  onSelectDepartment: (department: StudioDepartment) => void;
  onGoToLabs?: () => void;
}

export const CinemaWorkIndexModal: React.FC<CinemaWorkIndexModalProps> = ({
  isOpen,
  onClose,
  departments,
  onSelectDepartment,
  onGoToLabs,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (!isOpen) return null;

  const categories = [
    { key: 'ALL', label: 'ALL DEPARTMENTS' },
    { key: 'COMMAND', label: 'COMMAND' },
    { key: 'STAGE', label: 'VIRTUAL STAGE' },
    { key: 'GENERATION', label: 'AI VIDEO' },
    { key: 'POST', label: 'POST-PRODUCTION' },
    { key: 'CAPTURE', label: 'CHARACTER' },
    { key: 'INFRA', label: 'INFRASTRUCTURE' },
  ];

  const filteredDepartments = departments.filter((dept) => {
    if (activeCategory === 'ALL') return true;
    return dept.category === activeCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#050507]/96 backdrop-blur-2xl flex flex-col overflow-y-auto select-text text-[#ECECE9] animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#050507]/90 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white shrink-0">
            VAIURE
          </span>
          <span className="text-xs text-white/50 font-sans shrink-0">
            唯昱尔
          </span>
          <span className="text-white/20 shrink-0">/</span>
          <span className="text-xs font-mono uppercase tracking-widest text-white/75 truncate">
            AI HYBRID STUDIO ARCHITECTURE ({departments.length} DEPARTMENTS)
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {onGoToLabs && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToLabs();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-white/90 text-[11px] font-mono uppercase tracking-wider font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Seedance 2.5 Studio</span>
            </button>
          )}

          <div className="hidden sm:flex items-center border border-white/20 p-0.5 rounded-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              }`}
              title="Architectural Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              }`}
              title="Architectural List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Studio Blueprint"
            className="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-12 py-10 space-y-10">
        {/* End-to-End Seedance 2.5 Production Pipeline */}
        <section className="border border-white/10 bg-[#09090E] p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-blue-400 font-semibold">
              SEEDANCE 2.5 END-TO-END PRODUCTION PIPELINE
            </span>
            <span className="text-[11px] font-mono text-white/45">
              Click any stage to open corresponding department blueprint
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {SEEDANCE_PIPELINE_STAGES.map((stage, idx) => {
              const matchedDept = departments.find((d) => d.id === stage.departmentId);
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    if (matchedDept) {
                      onSelectDepartment(matchedDept);
                      onClose();
                    }
                  }}
                  className="text-left p-3 border border-white/10 bg-black/40 hover:border-blue-400/60 hover:bg-blue-950/20 transition-all cursor-pointer group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/45">
                    <span>STAGE {stage.step}</span>
                    {idx < SEEDANCE_PIPELINE_STAGES.length - 1 && (
                      <span className="hidden lg:inline text-white/25">→</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-mono font-bold uppercase text-white group-hover:text-blue-300 transition-colors">
                      {stage.label}
                    </div>
                    <p className="text-[11px] font-sans text-white/55 leading-snug line-clamp-2">
                      {stage.summary}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Department Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-5 text-xs font-mono">
          <span className="text-white/40 uppercase tracking-widest mr-2">FACILITY ZONES:</span>
          {categories.map((cat) => (
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
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => {
                  onSelectDepartment(dept);
                  onClose();
                }}
                className="group cursor-pointer space-y-3"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-950 border border-white/15 group-hover:border-white transition-all relative">
                  <img
                    src={dept.thumbnailImage}
                    alt={dept.title}
                    className="w-full h-full object-cover contrast-[1.06] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[9px] font-mono uppercase tracking-wider text-white">
                    {dept.code}
                  </div>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-blue-400/90 text-[10px] tracking-widest uppercase">
                    <span>{dept.zoneLabel}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white uppercase group-hover:text-white/80 transition-colors flex items-center justify-between">
                    <span>{dept.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>

                  <p className="text-white/65 text-[11px] font-serif italic line-clamp-2">{dept.subtitle}</p>
                  <p className="text-white/40 text-[10px] truncate">{dept.footprint}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="border border-white/10 divide-y divide-white/10 font-mono text-xs">
            {filteredDepartments.map((dept) => (
              <div
                key={dept.id}
                onClick={() => {
                  onSelectDepartment(dept);
                  onClose();
                }}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-blue-400 font-mono text-xs shrink-0">{dept.departmentLetter}</span>
                  <div className="w-20 h-11 overflow-hidden border border-white/15 flex-shrink-0 bg-neutral-950">
                    <img src={dept.thumbnailImage} alt={dept.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white uppercase group-hover:text-white/80 text-sm truncate">
                      {dept.title}
                    </h4>
                    <p className="text-white/55 text-[11px] font-serif italic truncate">{dept.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-[11px] text-white/60 sm:text-right shrink-0">
                  <span className="hidden md:inline">{dept.footprint}</span>
                  <span className="text-white/45">{dept.categoryLabel}</span>
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
