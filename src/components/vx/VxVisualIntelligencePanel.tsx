import React, { useState } from 'react';
import {
  Brain,
  Camera,
  Sun,
  Palette,
  Maximize,
  UserCheck,
  Building,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import {
  VxVisualAnalysis,
  VxConfidenceReport,
} from '../../types/vx';

interface VxVisualIntelligencePanelProps {
  analysis: VxVisualAnalysis | null;
  confidence: VxConfidenceReport | null;
  isAnalyzing: boolean;
  onRunRefinement?: () => void;
}

type TabKey =
  | 'subject'
  | 'environment'
  | 'lighting'
  | 'camera'
  | 'color'
  | 'materials'
  | 'composition'
  | 'artDirection'
  | 'validation';

export const VxVisualIntelligencePanel: React.FC<VxVisualIntelligencePanelProps> = ({
  analysis,
  confidence,
  isAnalyzing,
  onRunRefinement,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('subject');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'subject', label: '01 SUBJECT', icon: UserCheck },
    { key: 'environment', label: '02 ENVIRONMENT', icon: Building },
    { key: 'lighting', label: '03 LIGHTING', icon: Sun },
    { key: 'camera', label: '04 CAMERA & OPTICS', icon: Camera },
    { key: 'color', label: '05 COLOR SCIENCE', icon: Palette },
    { key: 'materials', label: '06 MATERIALS & TEXTURE', icon: Sparkles },
    { key: 'composition', label: '07 COMPOSITION & GEOMETRY', icon: Maximize },
    { key: 'artDirection', label: '08 ART DIRECTION', icon: Brain },
    { key: 'validation', label: 'VALIDATION REPORT', icon: ShieldCheck },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0f12] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/90 font-semibold">
            PANEL B · VISUAL INTELLIGENCE & DECOMPOSITION
          </span>
        </div>

        {analysis ? (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] uppercase tracking-wider">
              8/8 CATEGORIES DECODED
            </span>
            {confidence && (
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white font-mono text-[9px]">
                {confidence.overallScore}% FIDELITY
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-mono text-white/40">
            {isAnalyzing ? 'MULTIMODAL REASONING...' : 'AWAITING IMAGE INPUT'}
          </span>
        )}
      </div>

      {/* Category Navigation Bar */}
      <div className="px-2 py-1.5 border-b border-white/[0.06] bg-black/20 flex items-center gap-1 overflow-x-auto shrink-0 select-none scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const isSpecial = tab.key === 'validation';
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? isSpecial
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'bg-white text-black font-semibold shadow-sm'
                  : isSpecial
                  ? 'text-amber-300/80 hover:text-amber-200 hover:bg-amber-400/10'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isAnalyzing ? (
          /* Sophisticated Animated Scanning State */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full border-2 border-cyan-400/80 border-t-transparent animate-spin flex items-center justify-center">
                <Brain className="w-7 h-7 text-cyan-300" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold font-mono text-white uppercase tracking-wider mb-1">
                Decomposing Visual Grammar
              </h4>
              <p className="text-xs text-white/50 font-mono max-w-sm">
                Executing 5-stage multimodal pipeline: isolating spatial layers, estimating focal distance, sampling color science, and validating physical lighting vectors.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left font-mono text-[10px] text-white/60 bg-black/40 p-3 rounded-lg border border-white/10 w-full max-w-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Spatial Geometry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Optical Characteristics</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Color Science & Grading</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span>Micro-Texture Vectors</span>
              </div>
            </div>
          </div>
        ) : !analysis ? (
          /* Empty Idle State */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-white/40 font-mono">
            <Brain className="w-10 h-10 stroke-[1.2] opacity-40 mb-1" />
            <p className="text-xs max-w-sm">
              Upload an image in Panel A and click "Run Visual Reconstruction" to inspect its complete 8-category visual anatomy.
            </p>
            <div className="text-[10px] text-white/30 border border-white/10 rounded px-3 py-1.5 bg-white/[0.01]">
              Visual accuracy prioritized over creative interpretation
            </div>
          </div>
        ) : (
          /* Tab Contents */
          <div className="space-y-4">
            {/* TAB 1: SUBJECT */}
            {activeTab === 'subject' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-3">
                  <h5 className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center justify-between">
                    <span>MAIN SUBJECT IDENTIFICATION</span>
                    <span className="text-[9px] text-white/40 font-normal">
                      COUNT: {analysis.subject.visibleCount || '1'}
                    </span>
                  </h5>
                  <p className="text-xs text-white/90 leading-relaxed font-sans">
                    {analysis.subject.mainSubject}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      POSITIONING & PROPORTIONS
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.subject.positioning}
                    </p>
                    {analysis.subject.bodyProportions && (
                      <p className="text-[11px] text-white/60 pt-1">
                        {analysis.subject.bodyProportions}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      POSE & GESTURE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.subject.poseAndGesture}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      EXPRESSION & EYE DIRECTION
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.subject.facialExpression || 'Neutral composition'} ·{' '}
                      {analysis.subject.eyeDirection || 'Direct gaze'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      PHYSICAL RELATIONSHIPS
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.subject.physicalRelationships || 'Isolated subject presence'}
                    </p>
                  </div>
                </div>

                {/* Clothing & Accessories */}
                <div className="p-3.5 rounded-lg bg-black/30 border border-white/[0.08] space-y-1.5">
                  <span className="text-[9px] font-mono text-white/40 uppercase block">
                    CLOTHING & ACCESSORIES SPECIFICATION
                  </span>
                  <p className="text-xs text-white/85 leading-relaxed font-mono">
                    {analysis.subject.clothingAndAccessories}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: ENVIRONMENT */}
            {activeTab === 'environment' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                      ENVIRONMENT CLASSIFICATION
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 font-mono text-[9px] uppercase">
                      {analysis.environment.classification}
                    </span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-sans">
                    {analysis.environment.backgroundComposition}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      ARCHITECTURAL STRUCTURE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.environment.architecturalStructure || 'Non-architectural setting'}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      SPATIAL DEPTH & SEPARATION
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.environment.spatialDepth}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1 col-span-1 md:col-span-2">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      LAYER SEPARATION (FOREGROUND / MIDGROUND / BACKGROUND)
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.environment.layerSeparation}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      ATMOSPHERE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.environment.atmosphere}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      ENVIRONMENTAL OBJECTS
                    </span>
                    <p className="text-xs text-white/85">
                      {(analysis.environment.environmentalObjects || []).join(', ') || 'Minimal background props'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LIGHTING */}
            {activeTab === 'lighting' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                      PRIMARY LIGHT SOURCE & DIRECTION
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[9px] uppercase">
                      {analysis.lighting.sourceType || 'NATURAL'}
                    </span>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed font-sans">
                    {analysis.lighting.primaryLightSource}
                  </p>
                  <p className="text-[11px] font-mono text-white/60">
                    Vector: {analysis.lighting.direction} · Intensity: {analysis.lighting.intensity}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      COLOR TEMPERATURE
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.lighting.temperature}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      SHADOW BEHAVIOR & SOFTNESS
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.lighting.shadowDirection} · {analysis.lighting.shadowSoftness}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      SPECULAR HIGHLIGHTS
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.lighting.specularHighlights}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      AMBIENT ILLUMINATION
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.lighting.ambientIllumination}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CAMERA & PHOTOGRAPHIC */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-semibold block">
                    OPTICAL CONFIGURATION & SHOT TYPE
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-[9px] text-white/40 block">FOCAL LENGTH</span>
                      <span className="text-white font-medium">{analysis.camera.focalLengthEstimation}</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-[9px] text-white/40 block">SHOT TYPE</span>
                      <span className="text-white font-medium">{analysis.camera.shotType}</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-[9px] text-white/40 block">DEPTH OF FIELD</span>
                      <span className="text-white font-medium">{analysis.camera.depthOfField}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      PERSPECTIVE & ANGLE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.camera.perspective}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      CAMERA HEIGHT & DISTANCE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.camera.approximateHeight} · {analysis.camera.distanceToSubject}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      LENS CHARACTERISTICS
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.camera.lensCharacteristics}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      BACKGROUND COMPRESSION & MOTION
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.camera.backgroundCompression} · {analysis.camera.motionBlur || 'None (crisp shutter)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: COLOR SCIENCE */}
            {activeTab === 'color' && (
              <div className="space-y-4">
                {/* Dominant Color Swatches Bar */}
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold block">
                    DOMINANT CHROMATIC PALETTE (CLICK HEX TO COPY)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {(analysis.color.dominantPalette || []).map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCopyHex(c.hex)}
                        className="group p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/30 transition-all cursor-pointer flex flex-col items-center text-center space-y-1.5"
                      >
                        <div
                          className="w-full h-8 rounded-md shadow-inner border border-white/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[10px] font-mono font-bold text-white flex items-center gap-1">
                          {c.hex.toUpperCase()}
                          {copiedHex === c.hex ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60" />
                          )}
                        </span>
                        <span className="text-[9px] font-mono text-white/50 truncate w-full">
                          {c.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      COLOR TEMPERATURE & SATURATION
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.color.colorTemperature} · {analysis.color.saturation}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      CONTRAST DISTRIBUTION & TONAL RESPONSE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.color.contrastDistribution} · {analysis.color.tonalResponse}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      HIGHLIGHTS & SHADOW COLOR
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.color.highlightCharacteristics} · Shadow: {analysis.color.shadowColor}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      FILM COLOR GRADING & LUT
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.color.filmColorGrading}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: MATERIALS & TEXTURES */}
            {activeTab === 'materials' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-semibold block">
                    MATERIAL SPECIFICATION & SURFACE PROPERTIES
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[9px] text-white/40 block uppercase">FABRIC STRUCTURE</span>
                      <p className="text-white/90 text-xs mt-1">{analysis.materials.fabricStructure}</p>
                    </div>
                    <div className="p-2.5 rounded bg-white/[0.02] border border-white/[0.06]">
                      <span className="text-[9px] text-white/40 block uppercase">SKIN & HAIR TEXTURE</span>
                      <p className="text-white/90 text-xs mt-1">
                        {analysis.materials.skinTexture} · {analysis.materials.hairCharacteristics}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      REFLECTIVE & METALLIC PROPERTIES
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.materials.reflectiveMaterials} · {analysis.materials.metallicReflections}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      SURFACE ROUGHNESS & PATINA
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.materials.surfaceRoughness}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1 col-span-1 md:col-span-2">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      OPTICAL MICRO-DETAILS
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.materials.microDetails}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: COMPOSITION */}
            {activeTab === 'composition' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-semibold block">
                    VISUAL GEOMETRY & ALIGNMENT
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-[9px] text-white/40 block">RULE OF THIRDS</span>
                      <span className="text-white font-medium">{analysis.composition.ruleOfThirds}</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-[9px] text-white/40 block">BALANCE</span>
                      <span className="text-white font-medium">{analysis.composition.balance}</span>
                    </div>
                    <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-[9px] text-white/40 block">SYMMETRY</span>
                      <span className="text-white font-medium">{analysis.composition.symmetryOrAsymmetry}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      VISUAL HIERARCHY
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.composition.visualHierarchy}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      LEADING LINES & NEGATIVE SPACE
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.composition.leadingLines} · {analysis.composition.negativeSpace}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1 col-span-1 md:col-span-2">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      OBJECT PROPORTIONS & BOUNDARIES
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.composition.objectProportions} · Boundaries: {analysis.composition.croppingBoundaries}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: ART DIRECTION */}
            {activeTab === 'artDirection' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-rose-300 font-semibold block">
                    PHOTOGRAPHIC GENRE & VISUAL IDENTITY
                  </span>
                  <p className="text-xs text-white/90 leading-relaxed font-sans">
                    {analysis.artDirection.photographicGenre} — {analysis.artDirection.visualIdentity}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      EDITORIAL CHARACTERISTICS
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.artDirection.editorialCharacteristics}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      CINEMATIC REFERENCES (TECHNICAL)
                    </span>
                    <p className="text-xs text-white/85">
                      {analysis.artDirection.cinematicReferences}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      REALISM LEVEL
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.artDirection.realismLevel}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-1">
                    <span className="text-[9px] font-mono text-white/40 uppercase block">
                      PRODUCTION QUALITY & TREATMENT
                    </span>
                    <p className="text-xs text-white/85 font-mono">
                      {analysis.artDirection.productionQuality} · {analysis.artDirection.artisticTreatment}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: VALIDATION REPORT */}
            {activeTab === 'validation' && confidence && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-black/40 border border-amber-400/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-300">
                        RECONSTRUCTION CONFIDENCE AUDIT
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold">
                      OVERALL {confidence.overallScore}%
                    </span>
                  </div>

                  <p className="text-xs text-white/60 font-mono">
                    Qualitative second-pass evaluation comparing synthesized prompt against original image evidence.
                  </p>
                </div>

                {/* Accuracy Metrics Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                  {[
                    { label: 'SUBJECT ACCURACY', score: confidence.subjectAccuracy },
                    { label: 'COMPOSITION ACCURACY', score: confidence.compositionAccuracy },
                    { label: 'LIGHTING ACCURACY', score: confidence.lightingAccuracy },
                    { label: 'ENVIRONMENT ACCURACY', score: confidence.environmentAccuracy },
                    { label: 'COLOR ACCURACY', score: confidence.colorAccuracy },
                    { label: 'TEXTURE ACCURACY', score: confidence.textureAccuracy },
                    { label: 'CAMERA ACCURACY', score: confidence.cameraAccuracy },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="p-2.5 rounded bg-black/30 border border-white/[0.08] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-white/70">
                        <span className="text-[9px]">{metric.label}</span>
                        <span className="font-bold text-white">{metric.score}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation Notes & Hallucination Check */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/[0.08] space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>UNSUPPORTED ELEMENTS CHECK</span>
                  </div>
                  <p className="text-xs text-white/85 font-mono">
                    {confidence.unsupportedElementsCheck}
                  </p>

                  {confidence.validationNotes?.length > 0 && (
                    <ul className="text-[11px] text-white/60 space-y-1 list-disc pl-4 pt-1 font-mono">
                      {confidence.validationNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Missing Details Notice (if any) */}
                {confidence.missingDetails && confidence.missingDetails.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="font-semibold">POSSIBLE MISSING DETAILS DETECTED</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-200/80">
                      {confidence.missingDetails.map((det, idx) => (
                        <li key={idx}>{det}</li>
                      ))}
                    </ul>
                    {onRunRefinement && (
                      <button
                        type="button"
                        onClick={onRunRefinement}
                        className="mt-2 px-3 py-1.5 rounded bg-amber-400 text-black text-xs font-semibold hover:bg-amber-300 transition-colors cursor-pointer"
                      >
                        RUN REFINEMENT PASS NOW
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
