import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Menu,
  ChevronDown,
  Layers,
  Info,
  CheckCircle2,
  AlertCircle,
  Cpu,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  VxImageFile,
  VxModelId,
  VxModelOption,
  VxReconstructionMode,
  VxMidjourneyParams,
  VxAdvancedConfig,
  VxReconstructionResult,
  VX_SUPPORTED_MODELS,
} from '../../types/vx';
import {
  analyzeAndReconstructImage,
  refineVxPrompt,
  fetchVxModels,
} from '../../services/vxService';
import { VxImageInputPanel } from './VxImageInputPanel';
import { VxVisualIntelligencePanel } from './VxVisualIntelligencePanel';
import { VxPromptPanel } from './VxPromptPanel';
import { VxCoOpModal } from './VxCoOpModal';
import { UserProfile } from '../../types/social';

interface VxSlideProps {
  onOpenMenu: () => void;
  onBackToHero: () => void;
  onGoToSlideFour: () => void;
  onGoToSlideFive: () => void;
  selectedModelId?: VxModelId;
  onSelectModel?: (modelId: VxModelId) => void;
  currentUser?: UserProfile | null;
}

export const VxSlide: React.FC<VxSlideProps> = ({
  onOpenMenu,
  onBackToHero,
  onGoToSlideFour,
  onGoToSlideFive,
  selectedModelId: externalModelId,
  onSelectModel,
  currentUser,
}) => {
  // Model & Mode State (Real-time selectable backend: Gemini 3, Gemini 3.1, Gemini 3.8, Gemini 4 Argon)
  const [internalModelId, setInternalModelId] = useState<VxModelId>(externalModelId || 'gemini-3.8');
  const selectedModelId = externalModelId || internalModelId;

  const handleSelectModelId = (id: VxModelId) => {
    setInternalModelId(id);
    if (onSelectModel) {
      onSelectModel(id);
    }
  };

  const [selectedMode, setSelectedMode] = useState<VxReconstructionMode>('mode_a_exact');
  const [modelsList, setModelsList] = useState<VxModelOption[]>(VX_SUPPORTED_MODELS);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Active Image & Reference Slots
  const [primaryImage, setPrimaryImage] = useState<VxImageFile | null>(null);
  const [referenceImages, setReferenceImages] = useState<VxImageFile[]>([]);

  // Midjourney V8.2 Parameters
  const [midjourneyParams, setMidjourneyParams] = useState<VxMidjourneyParams>({
    aspectRatio: '16:9',
    stylize: 250,
    chaos: 0,
    quality: 1,
    raw: true,
    version: '8.2',
  });

  // Advanced Configuration
  const [advancedConfig, setAdvancedConfig] = useState<VxAdvancedConfig>({
    analysisDepth: 'maximum',
    promptDetail: 'detailed',
    realismPreference: 95,
    lightingPreservation: 95,
    compositionPreservation: 95,
    backgroundDetailPreservation: 95,
    subjectDetailPreservation: 95,
    cameraAccuracyPriority: 95,
    textureAccuracyPriority: 95,
    customInstructions: '',
  });

  // Pipeline Execution State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [reconstructionResult, setReconstructionResult] = useState<VxReconstructionResult | null>(null);
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeMobilePanel, setActiveMobilePanel] = useState<'input' | 'intelligence' | 'output'>('input');
  const [isCoOpModalOpen, setIsCoOpModalOpen] = useState(false);

  // Load models from backend registry on mount
  useEffect(() => {
    fetchVxModels().then((mods) => {
      if (mods && mods.length > 0) {
        setModelsList(mods);
      }
    });
  }, []);

  const activeModelOption =
    modelsList.find((m) => m.id === selectedModelId) || modelsList[1] || VX_SUPPORTED_MODELS[1];

  // Trigger main visual reconstruction pipeline
  const handleTriggerAnalysis = async () => {
    if (!primaryImage) {
      setErrorMessage('Please upload or select a target image in Panel A first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = await analyzeAndReconstructImage({
        image: primaryImage.dataUrl,
        references: referenceImages.map((r) => r.dataUrl),
        modelId: selectedModelId,
        mode: selectedMode,
        midjourneyParams,
        advancedConfig,
      });

      setReconstructionResult(result);
      setEditedPrompt(result.prompt);
      // Auto-switch mobile view to visual intelligence
      setActiveMobilePanel('intelligence');
    } catch (err: any) {
      console.error('Reconstruction failed:', err);
      setErrorMessage(err.message || 'Visual reconstruction failed. Please verify API configuration.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Regenerate prompt with alternate phrasing
  const handleRegeneratePrompt = () => {
    handleTriggerAnalysis();
  };

  // Refine existing prompt with directive
  const handleRefinePrompt = async (instruction: string) => {
    if (!editedPrompt) return;
    setIsRefining(true);
    setErrorMessage(null);

    try {
      const res = await refineVxPrompt({
        currentPrompt: editedPrompt,
        refinementInstruction: instruction,
        analysis: reconstructionResult?.analysis,
        parameters: midjourneyParams,
        modelId: selectedModelId,
      });

      setEditedPrompt(res.refinedPrompt);
      if (reconstructionResult) {
        setReconstructionResult({
          ...reconstructionResult,
          prompt: res.refinedPrompt,
          fullMidjourneyCommand: res.fullMidjourneyCommand,
        });
      }
    } catch (err: any) {
      console.error('Refine failed:', err);
      setErrorMessage(err.message || 'Refinement failed.');
    } finally {
      setIsRefining(false);
    }
  };

  // Fork a community prompt from the Co-Op Matrix
  const handleForkPrompt = (forkedPrompt: string, fullCommand: string) => {
    setEditedPrompt(forkedPrompt);
    if (reconstructionResult) {
      setReconstructionResult({
        ...reconstructionResult,
        prompt: forkedPrompt,
        fullMidjourneyCommand: fullCommand,
      });
    }
    setActiveMobilePanel('output');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080a] text-white flex flex-col font-sans select-text">
      {/* =========================================================================
          TOP CONTROL BAR & HEADER
         ========================================================================= */}
      <header className="px-4 py-2.5 bg-[#0a0c0f]/95 border-b border-white/[0.08] backdrop-blur-xl flex items-center justify-between shrink-0 z-30">
        {/* Brand & Slide Indicator */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-8 h-8 rounded-full border border-white/10 hover:border-white/30 bg-white/[0.04] flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Open Slide Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-serif text-sm tracking-[0.2em] uppercase font-bold text-white">
              VAIURE LABS
            </span>
            <span className="text-white/30 font-mono text-xs">/</span>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black font-mono font-black text-[10px] tracking-widest uppercase">
                VX
              </span>
              <span className="text-[11px] font-mono text-white/90 hidden sm:inline tracking-wider uppercase">
                VISUAL RECONSTRUCTION ENGINE
              </span>
            </div>
          </div>
        </div>

        {/* Center: Generation Mode Switcher */}
        <div className="hidden xl:flex items-center gap-1 p-1 rounded-lg bg-black/60 border border-white/[0.08] text-[10px] font-mono">
          {[
            { id: 'mode_a_exact' as const, label: 'MODE A · EXACT' },
            { id: 'mode_b_photographic' as const, label: 'MODE B · PHOTOGRAPHIC' },
            { id: 'mode_c_editorial' as const, label: 'MODE C · EDITORIAL' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMode(m.id)}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                selectedMode === m.id
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Real-Time Model Backend Switcher Menu (Gemini 3, Gemini 3.1, Gemini 3.8, Gemini 4 Argon) */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-black/70 border border-white/10 text-[10px] font-mono shadow-inner">
          <span className="text-[9px] text-white/50 uppercase px-1.5 hidden sm:flex items-center gap-1 font-semibold">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">BACKEND:</span>
          </span>
          {[
            { id: 'gemini-3' as const, label: 'Gemini 3', badge: 'VISION' },
            { id: 'gemini-3.1' as const, label: 'Gemini 3.1', badge: 'LITE' },
            { id: 'gemini-3.8' as const, label: 'Gemini 3.8', badge: 'RECOMMENDED' },
            { id: 'gemini-4-argon' as const, label: 'Gemini 4 Argon', badge: 'FLAGSHIP' },
          ].map((m) => {
            const isSelected = selectedModelId === m.id || (selectedModelId === 'gemini-3.8-flash' && m.id === 'gemini-3.8');
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectModelId(m.id)}
                className={`px-2 md:px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                }`}
                title={`Switch backend model to ${m.label} (Real-time active)`}
              >
                <span>{m.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Model Selector Dropdown & Slide Navigation Jumps */}
        <div className="flex items-center gap-2">
          {/* Gemini Model Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white text-[11px] font-mono tracking-wider transition-all cursor-pointer"
              title="View model profiles and capabilities"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white/90 truncate max-w-[110px] hidden sm:inline">
                {activeModelOption.label}
              </span>
              <ChevronDown className="w-3 h-3 text-white/50" />
            </button>

            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-72 rounded-xl bg-[#111317] border border-white/20 shadow-2xl p-2 z-50 font-mono text-xs space-y-1">
                <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-white/40 border-b border-white/[0.06] mb-1 flex items-center justify-between">
                  <span>REAL-TIME BACKEND ENGINE</span>
                  <span className="text-emerald-400">ACTIVE</span>
                </div>
                {modelsList.map((m) => {
                  const isSelected = selectedModelId === m.id || (selectedModelId === 'gemini-3.8-flash' && m.id === 'gemini-3.8');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        handleSelectModelId(m.id);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full p-2 rounded-lg text-left transition-all cursor-pointer flex flex-col ${
                        isSelected
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{m.label}</span>
                        <span
                          className={`text-[8px] px-1 rounded uppercase ${
                            isSelected
                              ? 'bg-black/20 text-black'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] mt-0.5 line-clamp-1 ${
                          isSelected ? 'text-black/70' : 'text-white/40'
                        }`}
                      >
                        {m.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Co-Op Prompt Matrix Trigger */}
          <button
            type="button"
            onClick={() => setIsCoOpModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-[11px] font-mono tracking-wider transition-all cursor-pointer"
            title="Open Co-Op Prompt Matrix & Community Reconstructions"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold hidden sm:inline">CO-OP MATRIX</span>
          </button>

          {/* Quick Slide Navigation Jumper */}
          <div className="hidden lg:flex items-center gap-1 border-l border-white/10 pl-2 text-[9px] font-mono uppercase text-white/60">
            <button
              type="button"
              onClick={onBackToHero}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              00 HERO
            </button>
            <button
              type="button"
              onClick={onGoToSlideFour}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              04 STUDIO
            </button>
            <button
              type="button"
              onClick={onGoToSlideFive}
              className="px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              05 FU LABS
            </button>
          </div>
        </div>
      </header>

      {/* Global Error Notice Bar if any */}
      {errorMessage && (
        <div className="px-4 py-2 bg-red-950/80 border-b border-red-500/30 text-red-200 text-xs font-mono flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white cursor-pointer px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile Panel Tabs Switcher (Visible on small screens < 1024px) */}
      <div className="lg:hidden flex border-b border-white/[0.08] bg-[#0c0e12] shrink-0 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveMobilePanel('input')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeMobilePanel === 'input'
              ? 'text-white border-b-2 border-white font-bold bg-white/[0.04]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          INPUT
        </button>
        <button
          type="button"
          onClick={() => setActiveMobilePanel('intelligence')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeMobilePanel === 'intelligence'
              ? 'text-white border-b-2 border-white font-bold bg-white/[0.04]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          INTELLIGENCE
        </button>
        <button
          type="button"
          onClick={() => setActiveMobilePanel('output')}
          className={`flex-1 py-2 text-center transition-colors ${
            activeMobilePanel === 'output'
              ? 'text-white border-b-2 border-white font-bold bg-white/[0.04]'
              : 'text-white/50 hover:text-white'
          }`}
        >
          OUTPUT
        </button>
      </div>

      {/* =========================================================================
          MAIN 3-PANEL WORKSPACE GRID
          Desktop: 3 responsive columns
          Mobile: Controlled by activeMobilePanel
         ========================================================================= */}
      <main className="flex-1 overflow-hidden p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* PANEL A: LEFT — IMAGE INPUT (~28% width / col-span-3 or 4) */}
        <section
          className={`h-full min-h-0 lg:col-span-3 xl:col-span-3 ${
            activeMobilePanel === 'input' ? 'block' : 'hidden lg:block'
          }`}
        >
          <VxImageInputPanel
            primaryImage={primaryImage}
            referenceImages={referenceImages}
            onPrimaryImageChange={setPrimaryImage}
            onReferenceImagesChange={setReferenceImages}
            midjourneyParams={midjourneyParams}
            onParamsChange={setMidjourneyParams}
            isAnalyzing={isAnalyzing}
            onTriggerAnalysis={handleTriggerAnalysis}
            activeModelLabel={activeModelOption.label}
          />
        </section>

        {/* PANEL B: CENTER — VISUAL INTELLIGENCE & DECOMPOSITION (~44% width / col-span-5) */}
        <section
          className={`h-full min-h-0 lg:col-span-5 xl:col-span-5 ${
            activeMobilePanel === 'intelligence' ? 'block' : 'hidden lg:block'
          }`}
        >
          <VxVisualIntelligencePanel
            analysis={reconstructionResult?.analysis || null}
            confidence={reconstructionResult?.confidence || null}
            isAnalyzing={isAnalyzing}
            onRunRefinement={() => {
              setActiveMobilePanel('output');
            }}
          />
        </section>

        {/* PANEL C: RIGHT — PROMPT SYNTHESIS & REFINEMENT (~28% width / col-span-4) */}
        <section
          className={`h-full min-h-0 lg:col-span-4 xl:col-span-4 ${
            activeMobilePanel === 'output' ? 'block' : 'hidden lg:block'
          }`}
        >
          <VxPromptPanel
            result={reconstructionResult}
            editedPrompt={editedPrompt}
            onPromptChange={setEditedPrompt}
            isAnalyzing={isAnalyzing}
            onGeneratePrompt={handleTriggerAnalysis}
            onRegeneratePrompt={handleRegeneratePrompt}
            onRefinePrompt={handleRefinePrompt}
            isRefining={isRefining}
            advancedConfig={advancedConfig}
            onAdvancedConfigChange={setAdvancedConfig}
            midjourneyParams={midjourneyParams}
            activeModelLabel={activeModelOption.label}
          />
        </section>
      </main>

      {/* VX Co-Op Prompt Matrix Modal */}
      <VxCoOpModal
        isOpen={isCoOpModalOpen}
        onClose={() => setIsCoOpModalOpen(false)}
        currentUser={currentUser || null}
        currentPrompt={editedPrompt || reconstructionResult?.prompt || ''}
        currentFullCommand={reconstructionResult?.fullMidjourneyCommand || ''}
        currentModelId={selectedModelId}
        currentModelLabel={activeModelOption.label}
        currentMode={selectedMode}
        currentConfidenceScore={reconstructionResult?.confidence?.overallScore}
        currentAspectRatio={midjourneyParams.aspectRatio}
        currentStylize={midjourneyParams.stylize}
        onForkPrompt={handleForkPrompt}
      />
    </div>
  );
};
