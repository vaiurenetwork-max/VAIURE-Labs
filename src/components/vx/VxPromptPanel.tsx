import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  RefreshCw,
  Sparkles,
  Sliders,
  Code2,
  Terminal,
  Send,
  HelpCircle,
} from 'lucide-react';
import {
  VxReconstructionResult,
  VxAdvancedConfig,
  VxMidjourneyParams,
} from '../../types/vx';

interface VxPromptPanelProps {
  result: VxReconstructionResult | null;
  editedPrompt: string;
  onPromptChange: (newPrompt: string) => void;
  isAnalyzing: boolean;
  onGeneratePrompt: () => void;
  onRegeneratePrompt: () => void;
  onRefinePrompt: (instruction: string) => void;
  isRefining: boolean;
  advancedConfig: VxAdvancedConfig;
  onAdvancedConfigChange: (cfg: VxAdvancedConfig) => void;
  midjourneyParams: VxMidjourneyParams;
  activeModelLabel?: string;
}

export const VxPromptPanel: React.FC<VxPromptPanelProps> = ({
  result,
  editedPrompt,
  onPromptChange,
  isAnalyzing,
  onGeneratePrompt,
  onRegeneratePrompt,
  onRefinePrompt,
  isRefining,
  advancedConfig,
  onAdvancedConfigChange,
  midjourneyParams,
  activeModelLabel,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'json' | 'command'>('prompt');
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  const [showRefineModal, setShowRefineModal] = useState(false);

  // Compute live character and word counts
  const charCount = editedPrompt.length;
  const wordCount = editedPrompt.trim() ? editedPrompt.trim().split(/\s+/).length : 0;
  const approxTokens = Math.round(charCount / 4);

  // Full Midjourney command with current parameters
  const fullCommand = `/imagine prompt: ${editedPrompt} ${result?.parametersString || `--ar ${midjourneyParams.aspectRatio} --v 8.2 --style raw --s ${midjourneyParams.stylize}`}`.trim();

  const handleCopyPrompt = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportTxt = () => {
    const blob = new Blob([editedPrompt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vx-midjourney-v8.2-prompt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = result?.structuredJson || {
      engine: 'VX',
      target: 'Midjourney V8.2',
      prompt: editedPrompt,
      parameters: midjourneyParams,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vx-visual-reconstruction-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitRefine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementInput.trim() || isRefining) return;
    onRefinePrompt(refinementInput.trim());
    setRefinementInput('');
    setShowRefineModal(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f12] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/90 font-semibold">
            PANEL C · PROMPT SYNTHESIS & OUTPUT
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              activeTab === 'prompt'
                ? 'bg-white text-black font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            PROMPT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('command')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              activeTab === 'command'
                ? 'bg-white text-black font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            /IMAGINE
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              activeTab === 'json'
                ? 'bg-white text-black font-semibold'
                : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            JSON (B)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {/* Metric Strip */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 border border-white/[0.06] text-[10px] font-mono text-white/60">
          <div className="flex items-center gap-3">
            <span>
              CHARS: <strong className="text-white">{charCount}</strong>
            </span>
            <span>
              WORDS: <strong className="text-white">{wordCount}</strong>
            </span>
            <span>
              TOKENS ≈ <strong className="text-white">{approxTokens}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-medium truncate max-w-[130px]">
              {result?.modelUsed || activeModelLabel || 'Gemini 3.8'}
            </span>
            <span className="text-emerald-400">●</span>
            <span className="text-white/80">
              {result ? 'SYNTHESIZED' : 'READY'}
            </span>
          </div>
        </div>

        {/* View Switcher Container */}
        {activeTab === 'prompt' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
              <span>OUTPUT A · MIDJOURNEY V8.2 PROMPT (EDITABLE)</span>
              <span className="text-amber-300/80">14-STAGE DIRECTIVE SYNTHESIS</span>
            </div>

            <textarea
              rows={11}
              value={editedPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Run visual reconstruction to synthesize a detailed Midjourney V8.2 prompt, or type your baseline directives here..."
              className="w-full p-3.5 rounded-lg bg-black/60 border border-white/15 focus:border-white/50 text-white font-mono text-xs leading-relaxed resize-none transition-colors outline-none selection:bg-white/20 selection:text-white"
            />
          </div>
        )}

        {activeTab === 'command' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
              <span>DISCORD / WEB READY COMMAND</span>
              <span className="text-cyan-400">READY TO COPY & PASTE</span>
            </div>

            <div className="p-3.5 rounded-lg bg-black/70 border border-cyan-500/20 text-white font-mono text-xs leading-relaxed break-all select-all min-h-[180px]">
              <span className="text-cyan-300 font-bold">/imagine</span> prompt:{' '}
              <span className="text-white/90">{editedPrompt}</span>{' '}
              <span className="text-amber-300 font-medium">
                {result?.parametersString || `--ar ${midjourneyParams.aspectRatio} --v 8.2 --style raw --s ${midjourneyParams.stylize}`}
              </span>
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
              <span>OUTPUT B · STRUCTURED MACHINE-READABLE VISUAL ANALYSIS</span>
              <span className="text-emerald-400">JSON SCHEMA COMPLIANT</span>
            </div>

            <pre className="p-3.5 rounded-lg bg-black/80 border border-white/10 text-emerald-300 font-mono text-[10px] leading-snug overflow-x-auto max-h-[220px]">
              {JSON.stringify(
                result?.structuredJson || {
                  engine: 'VX',
                  target: 'Midjourney V8.2',
                  analysis: result?.analysis || 'Awaiting image analysis',
                  reconstruction: {
                    prompt: editedPrompt,
                    parameters: midjourneyParams,
                  },
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={onGeneratePrompt}
              className={`py-2.5 px-3 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isAnalyzing
                  ? 'bg-neutral-800 text-white/40 cursor-not-allowed border border-white/10'
                  : 'bg-white hover:bg-neutral-200 text-black shadow-white/10'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>SYNTHESIZING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>GENERATE PROMPT</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!editedPrompt}
              onClick={() => handleCopyPrompt(activeTab === 'command' ? fullCommand : editedPrompt)}
              className={`py-2.5 px-3 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border active:scale-95 ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>COPIED TO CLIPBOARD</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY PROMPT</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Actions (Regenerate, Refine, Export TXT, Export JSON) */}
          <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
            <button
              type="button"
              disabled={isAnalyzing || !result}
              onClick={onRegeneratePrompt}
              className="py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Regenerate prompt with varied photographic phrasing"
            >
              <RefreshCw className="w-3 h-3" />
              <span>REGEN</span>
            </button>

            <button
              type="button"
              disabled={!editedPrompt}
              onClick={() => setShowRefineModal(true)}
              className="py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Refine prompt with specific user directives"
            >
              <Send className="w-3 h-3 text-cyan-400" />
              <span>REFINE</span>
            </button>

            <button
              type="button"
              disabled={!editedPrompt}
              onClick={handleExportTxt}
              className="py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export prompt as TXT file"
            >
              <Download className="w-3 h-3" />
              <span>TXT</span>
            </button>

            <button
              type="button"
              disabled={!result}
              onClick={handleExportJson}
              className="py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export structured JSON"
            >
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Section 7: Expandable Advanced Prompt Configuration */}
        <div className="pt-2 border-t border-white/[0.07] space-y-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-[10px] font-mono text-white/70 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-3 h-3 text-amber-300" />
              ADVANCED CONFIGURATION ({showAdvanced ? 'EXPANDED' : 'COLLAPSED'})
            </span>
            <span className="text-white/40">{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="p-3.5 rounded-lg bg-black/40 border border-white/[0.08] space-y-3 font-mono text-[10px]">
              {/* Analysis Depth & Prompt Detail */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-white/50 uppercase block mb-1">
                    ANALYSIS DEPTH
                  </label>
                  <select
                    value={advancedConfig.analysisDepth}
                    onChange={(e) =>
                      onAdvancedConfigChange({
                        ...advancedConfig,
                        analysisDepth: e.target.value as any,
                      })
                    }
                    className="w-full py-1 px-2 rounded bg-white/[0.05] border border-white/10 text-white outline-none cursor-pointer"
                  >
                    <option value="standard" className="bg-neutral-900">Standard</option>
                    <option value="deep" className="bg-neutral-900">Deep</option>
                    <option value="maximum" className="bg-neutral-900">Maximum</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-white/50 uppercase block mb-1">
                    PROMPT DETAIL
                  </label>
                  <select
                    value={advancedConfig.promptDetail}
                    onChange={(e) =>
                      onAdvancedConfigChange({
                        ...advancedConfig,
                        promptDetail: e.target.value as any,
                      })
                    }
                    className="w-full py-1 px-2 rounded bg-white/[0.05] border border-white/10 text-white outline-none cursor-pointer"
                  >
                    <option value="balanced" className="bg-neutral-900">Balanced</option>
                    <option value="detailed" className="bg-neutral-900">Detailed</option>
                    <option value="extreme" className="bg-neutral-900">Extremely Detailed</option>
                  </select>
                </div>
              </div>

              {/* Preservation Priority Sliders */}
              <div className="space-y-2 pt-1 border-t border-white/[0.05]">
                {[
                  {
                    key: 'realismPreference' as const,
                    label: 'REALISM PREFERENCE',
                    val: advancedConfig.realismPreference,
                  },
                  {
                    key: 'lightingPreservation' as const,
                    label: 'LIGHTING PRESERVATION',
                    val: advancedConfig.lightingPreservation,
                  },
                  {
                    key: 'compositionPreservation' as const,
                    label: 'COMPOSITION PRESERVATION',
                    val: advancedConfig.compositionPreservation,
                  },
                  {
                    key: 'subjectDetailPreservation' as const,
                    label: 'SUBJECT FIDELITY',
                    val: advancedConfig.subjectDetailPreservation,
                  },
                  {
                    key: 'cameraAccuracyPriority' as const,
                    label: 'CAMERA OPTICS ACCURACY',
                    val: advancedConfig.cameraAccuracyPriority,
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-[9px] text-white/60">
                      <span>{item.label}</span>
                      <span className="text-white font-medium">{item.val}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={item.val}
                      onChange={(e) =>
                        onAdvancedConfigChange({
                          ...advancedConfig,
                          [item.key]: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-white h-1 bg-white/20 rounded cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Dedicated Custom Directives Field */}
              <div className="pt-2 border-t border-white/[0.05] space-y-1">
                <label className="text-[9px] text-white/50 uppercase block">
                  DEDICATED DIRECTIVES FIELD (CUSTOM INSTRUCTIONS)
                </label>
                <textarea
                  rows={2}
                  value={advancedConfig.customInstructions}
                  onChange={(e) =>
                    onAdvancedConfigChange({
                      ...advancedConfig,
                      customInstructions: e.target.value,
                    })
                  }
                  placeholder='e.g., "Preserve the original facial proportions and exact camera framing. Do not change the background architecture."'
                  className="w-full p-2 rounded bg-black/50 border border-white/10 text-white font-mono text-[10px] leading-relaxed resize-none outline-none focus:border-white/40"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refine Prompt Modal */}
      {showRefineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <form
            onSubmit={handleSubmitRefine}
            className="w-full max-w-md bg-[#111317] border border-white/20 rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                  REFINE SYNTHESIZED PROMPT
                </h4>
                <p className="text-[10px] text-white/50 font-mono">
                  Input specific corrections or emphasize optical characteristics
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRefineModal(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-sm"
              >
                ×
              </button>
            </div>

            <textarea
              rows={4}
              required
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="e.g., Increase emphasis on shallow depth of field, soften key light on cheekbone, and specify high-thread Italian wool fabric."
              className="w-full p-3 rounded-lg bg-black/60 border border-white/15 text-white font-mono text-xs outline-none focus:border-white/50 resize-none"
            />

            <div className="flex justify-end gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowRefineModal(false)}
                className="px-3 py-1.5 rounded text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={isRefining || !refinementInput.trim()}
                className="px-4 py-1.5 rounded bg-white text-black font-semibold hover:bg-neutral-200 transition-colors cursor-pointer disabled:opacity-40"
              >
                {isRefining ? 'REFINING...' : 'APPLY REFINEMENT'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
