import React, { useState, useMemo } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Film, ArrowUpRight, Check, Share2 } from 'lucide-react';
import { CinemaProject, getLocalizedCinemaProject } from '../../data/cinemaProjectsData';
import { useLanguage } from '../../services/i18n';

interface CinemaProjectDossierModalProps {
  project: CinemaProject | null;
  onClose: () => void;
  onSelectProject?: (project: CinemaProject) => void;
  allProjects?: CinemaProject[];
}

export const CinemaProjectDossierModal: React.FC<CinemaProjectDossierModalProps> = ({
  project,
  onClose,
  onSelectProject,
  allProjects = [],
}) => {
  const { t, language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeStillIdx, setActiveStillIdx] = useState(0);
  const [isCopied, setIsCopied] = useState(false);

  const currentProject = useMemo(() => {
    if (!project) return null;
    return getLocalizedCinemaProject(project, language);
  }, [project, language]);

  if (!currentProject) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?project=${currentProject.id}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col overflow-y-auto select-text text-white animate-in fade-in duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white">
            VAIURE
          </span>
          <span className="text-xs text-white/50 font-sans">
            唯昱尔
          </span>
          <span className="text-white/20">/</span>
          <span className="text-xs font-mono uppercase tracking-widest text-white/60">
            {currentProject.code} · {currentProject.title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Copy Project Link"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? t('cinemaCopied') : t('cinemaShare')}</span>
          </button>

          <button
            onClick={onClose}
            aria-label="Close Case Study"
            className="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-12 py-10 sm:py-16 space-y-16">
        {/* Hero Media Display */}
        <div className="relative aspect-[16/9] w-full bg-neutral-950 overflow-hidden border border-white/10 shadow-2xl group">
          <img
            src={currentProject.stills[activeStillIdx] || currentProject.heroImage}
            alt={currentProject.title}
            className={`w-full h-full object-cover transition-all duration-700 filter contrast-[1.08] ${
              isPlaying ? 'scale-105' : 'scale-100'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

          {/* Interactive media controls bar */}
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs font-mono z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-full bg-white text-black font-semibold flex items-center gap-1.5 hover:bg-white/90 transition-all cursor-pointer active:scale-95"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? t('cinemaPauseMotion') : t('cinemaMotion')}</span>
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center gap-1.5 hover:border-white transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isMuted ? t('cinemaUnmuteAudio') : t('cinemaMutedAudio')}</span>
              </button>
            </div>

            <div className="text-white/60 tracking-wider">
              <span>{currentProject.runtime}</span>
              <span className="mx-2">·</span>
              <span>{currentProject.aspectRatio}</span>
            </div>
          </div>
        </div>

        {/* Project Header Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-white/10 pb-12">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 text-xs font-mono tracking-widest text-white/50 uppercase">
              <span>{currentProject.code}</span>
              <span>·</span>
              <span>{currentProject.discipline}</span>
              <span>·</span>
              <span>{currentProject.year}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white leading-tight">
              {currentProject.title}
            </h1>

            <p className="text-lg sm:text-xl font-light text-white/80 font-serif italic">
              {currentProject.subtitle}
            </p>

            <p className="text-sm sm:text-base text-neutral-300 font-sans leading-relaxed pt-2">
              {currentProject.synopsis}
            </p>
          </div>

          <div className="space-y-6 text-xs font-mono border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-10 pt-6 lg:pt-0">
            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">{t('cinemaCreativeDirection')}</span>
              <span className="text-white font-medium text-sm">{currentProject.creators}</span>
            </div>

            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">{t('cinemaCommissionAccession')}</span>
              <span className="text-white/80">{currentProject.clientOrCommission}</span>
            </div>

            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">{t('cinemaOutputFormat')}</span>
              <span className="text-white/80">{currentProject.technicalPipeline.resolution} · {currentProject.technicalPipeline.frameRate}</span>
            </div>

            <div>
              <span className="text-white/40 uppercase tracking-widest block mb-1">{t('cinemaSoundDesign')}</span>
              <span className="text-white/80">{currentProject.technicalPipeline.soundDesign}</span>
            </div>
          </div>
        </div>

        {/* Curatorial Statement */}
        <div className="space-y-6">
          <h2 className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
            {t('cinemaCuratorialStatement')}
          </h2>
          <blockquote className="text-base sm:text-xl font-light text-white/90 leading-relaxed font-sans border-l-2 border-white/30 pl-6 py-1">
            &ldquo;{currentProject.curatorialStatement}&rdquo;
          </blockquote>
        </div>

        {/* Technical Neural Pipeline Grid */}
        <div className="border border-white/10 bg-neutral-950 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-sm font-mono tracking-widest uppercase text-white font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/60" />
              <span>{t('cinemaTechnicalPipeline')}</span>
            </h3>
            <span className="text-xs font-mono text-white/40">{currentProject.technicalPipeline.engine}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs font-mono">
            <div>
              <span className="text-white/40 block mb-1">{t('cinemaNeuralModels')}</span>
              <ul className="space-y-1 text-white/80">
                {currentProject.technicalPipeline.neuralModels.map((m, i) => (
                  <li key={i}>· {m}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-white/40 block mb-1">{t('cinemaColorGrading')}</span>
              <p className="text-white/80">{currentProject.technicalPipeline.colorGrading}</p>
            </div>

            <div>
              <span className="text-white/40 block mb-1">{t('cinemaSoundDesign')}</span>
              <p className="text-white/80">{currentProject.credits.musicAndSound}</p>
            </div>
          </div>
        </div>

        {/* Archival Stills Gallery */}
        <div className="space-y-6">
          <h2 className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
            {t('cinemaArchivalStills')}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {currentProject.stills.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStillIdx(idx)}
                className={`relative aspect-[16/9] overflow-hidden border transition-all cursor-pointer ${
                  activeStillIdx === idx
                    ? 'border-white opacity-100 scale-[1.02]'
                    : 'border-white/15 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
              >
                <img src={img} alt={`Plate ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/60 px-1.5 py-0.5 text-white/80">
                  {t('cinemaPlate')} 0{idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Accolades & Exhibitions */}
        {currentProject.awardsAndExhibitions.length > 0 && (
          <div className="space-y-4 border-t border-white/10 pt-10">
            <h2 className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
              {t('cinemaAwards')}
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm font-mono text-neutral-300">
              {currentProject.awardsAndExhibitions.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-white/30">―</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Projects Strip */}
        {allProjects.length > 1 && (
          <div className="border-t border-white/10 pt-12 space-y-6">
            <h2 className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
              {t('cinemaExploreMore')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {allProjects
                .filter((p) => p.id !== currentProject.id)
                .slice(0, 4)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectProject?.(p);
                      setActiveStillIdx(0);
                    }}
                    className="text-left group cursor-pointer space-y-2"
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden border border-white/15 group-hover:border-white transition-colors bg-neutral-950">
                      <img
                        src={p.thumbnailImage}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="text-[11px] font-mono leading-tight">
                      <p className="font-bold text-white group-hover:text-white/80 uppercase truncate">{p.title}</p>
                      <p className="text-white/50 text-[10px] truncate">{p.subtitle}</p>
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
