import React, { useState, useMemo } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ArrowRight,
  Cpu,
  Check,
  Share2,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  StudioDepartment,
  SEEDANCE_PIPELINE_STAGES,
  getLocalizedStudioDepartment,
} from '../../data/hybridStudioData';
import { useLanguage } from '../../services/i18n';

interface CinemaProjectDossierModalProps {
  department: StudioDepartment | null;
  onClose: () => void;
  onSelectDepartment?: (department: StudioDepartment) => void;
  allDepartments?: StudioDepartment[];
  onGoToLabs?: () => void;
}

export const CinemaProjectDossierModal: React.FC<CinemaProjectDossierModalProps> = ({
  department,
  onClose,
  onSelectDepartment,
  allDepartments = [],
  onGoToLabs,
}) => {
  const { language } = useLanguage();
  const [isMotionActive, setIsMotionActive] = useState(false);
  const [activePlateIdx, setActivePlateIdx] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  const currentDept = useMemo(() => {
    if (!department) return null;
    return getLocalizedStudioDepartment(department, language);
  }, [department, language]);

  if (!currentDept) return null;

  const activePlate =
    currentDept.galleryPlates[activePlateIdx] || {
      image: currentDept.heroImage,
      caption: currentDept.subtitle,
    };

  const linkedStages = SEEDANCE_PIPELINE_STAGES.filter((s) =>
    currentDept.pipelineStageIds.includes(s.id)
  );

  const relatedDepartments = allDepartments.filter((d) =>
    currentDept.connectedZones.includes(d.id)
  );

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?studioZone=${currentDept.id}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050507]/96 backdrop-blur-2xl flex flex-col overflow-y-auto select-text text-[#ECECE9] animate-in fade-in duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#050507]/90 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white shrink-0">
            VAIURE
          </span>
          <span className="text-xs text-white/50 font-sans shrink-0">
            唯昱尔
          </span>
          <span className="text-white/20 shrink-0">/</span>
          <span className="text-xs font-mono uppercase tracking-widest text-white/65 truncate">
            {currentDept.code} · {currentDept.title}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
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
              <span>Seedance 2.5 Lab</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer px-2 py-1"
            title="Copy Department Blueprint Link"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? 'COPIED' : 'SHARE'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Department Dossier"
            className="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-12 py-10 sm:py-14 space-y-14">
        {/* Hero Architectural Plate */}
        <div className="relative aspect-[16/9] w-full bg-[#09090D] overflow-hidden border border-white/15 shadow-2xl">
          <img
            src={activePlate.image}
            alt={currentDept.title}
            className={`w-full h-full object-cover transition-transform duration-[4000ms] ease-out contrast-[1.06] ${
              isMotionActive ? 'scale-[1.06]' : 'scale-100'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />

          <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
            <div className="space-y-1 max-w-2xl">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400 block">
                {currentDept.zoneLabel}
              </span>
              <p className="text-xs sm:text-sm font-sans text-white/90">
                {activePlate.caption}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsMotionActive((prev) => !prev)}
              className="self-start sm:self-auto px-3 py-1.5 bg-black/70 backdrop-blur-md border border-white/20 hover:border-white text-white text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {isMotionActive ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isMotionActive ? 'Reset Framing' : 'Architectural Zoom'}</span>
            </button>
          </div>
        </div>

        {/* Department Identity & Specs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-white/10 pb-12">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono tracking-widest text-white/55 uppercase">
              <span>{currentDept.code}</span>
              <span>·</span>
              <span>{currentDept.categoryLabel}</span>
              <span>·</span>
              <span className="text-blue-400">SEEDANCE 2.5 READY</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white leading-tight">
              {currentDept.title}
            </h1>

            <p className="text-base sm:text-xl font-light text-white/80 font-serif italic">
              {currentDept.subtitle}
            </p>

            <p className="text-sm sm:text-base text-neutral-300 font-sans leading-relaxed pt-2">
              {currentDept.overview}
            </p>
          </div>

          <div className="space-y-5 text-xs font-mono border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-10 pt-6 lg:pt-0">
            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">Lead Operations</span>
              <span className="text-white font-medium text-sm">{currentDept.leadRole}</span>
            </div>

            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">Spatial Footprint</span>
              <span className="text-white/85">{currentDept.footprint}</span>
            </div>

            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">Lighting & Architecture</span>
              <span className="text-white/85">{currentDept.lightingSpec}</span>
            </div>

            {linkedStages.length > 0 && (
              <div>
                <span className="text-white/40 uppercase tracking-widest block mb-1">Seedance 2.5 Stage</span>
                <span className="text-blue-400 font-medium">
                  {linkedStages.map((s) => `${s.step} · ${s.label}`).join(' / ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Architectural & Seedance Integration Specs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-white/10 bg-[#0B0B10] p-6 sm:p-7 space-y-3">
            <h2 className="text-xs font-mono tracking-[0.2em] uppercase text-white/45 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-white/60" />
              <span>Architectural Design</span>
            </h2>
            <p className="text-sm font-sans text-neutral-300 leading-relaxed">
              {currentDept.architecturalNote}
            </p>
          </div>

          <div className="border border-blue-500/25 bg-[#0A0D16] p-6 sm:p-7 space-y-3">
            <h2 className="text-xs font-mono tracking-[0.2em] uppercase text-blue-400 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>Seedance 2.5 Integration</span>
            </h2>
            <p className="text-sm font-sans text-neutral-200 leading-relaxed">
              {currentDept.seedanceIntegration}
            </p>
          </div>
        </div>

        {/* Hardware & Conceptual Outputs */}
        <div className="border border-white/10 bg-[#09090D] p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-mono">
          <div className="space-y-3">
            <h3 className="text-white/45 uppercase tracking-widest border-b border-white/10 pb-2">
              Production Infrastructure & Rigs
            </h3>
            <ul className="space-y-2 text-white/85">
              {currentDept.equipmentHighlights.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-400 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-white/45 uppercase tracking-widest border-b border-white/10 pb-2">
              Pipeline Deliverables
            </h3>
            <ul className="space-y-2 text-white/85">
              {currentDept.workflowOutputs.map((out, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-white/40 shrink-0">0{i + 1}</span>
                  <span>{out}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Interconnected Perspectives */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono tracking-[0.25em] text-white/45 uppercase">
            Facility Perspectives & Adjacent Views
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentDept.galleryPlates.map((plate, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePlateIdx(idx)}
                className={`relative aspect-[16/9] overflow-hidden border text-left transition-all cursor-pointer ${
                  activePlateIdx === idx
                    ? 'border-white opacity-100'
                    : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
              >
                <img src={plate.image} alt={plate.caption} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/75 px-2 py-0.5 text-white/90">
                  VIEW 0{idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Connected Studio Departments */}
        {relatedDepartments.length > 0 && (
          <div className="border-t border-white/10 pt-10 space-y-6">
            <h2 className="text-xs font-mono tracking-[0.25em] text-white/45 uppercase">
              Connected Studio Departments
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedDepartments.map((dept) => (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    onSelectDepartment?.(dept);
                    setActivePlateIdx(0);
                  }}
                  className="text-left group cursor-pointer space-y-2 border border-white/10 hover:border-white/40 p-3 bg-[#08080B] transition-colors"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-950">
                    <img
                      src={dept.thumbnailImage}
                      alt={dept.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="text-[11px] font-mono leading-tight flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-blue-400">{dept.code}</p>
                      <p className="font-bold text-white uppercase truncate">{dept.title}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
