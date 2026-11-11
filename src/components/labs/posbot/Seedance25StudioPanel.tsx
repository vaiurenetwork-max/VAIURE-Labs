/**
 * Specialized Seedance 2.5 Video Studio Panel
 * Supports:
 * - seedance_25_15s (4 Generate, 15s, max 8,000 chars, up to 9 ref images)
 * - seedance_25_30s (7 Generate, 30s, max 8,000 chars, up to 9 ref images)
 * - seedance_25_15s_r2v (4 Generate, 15s R2V, max 8,000 chars, up to 9 ref images)
 * - seedance_25_30s_r2v (7 Generate, 30s R2V, max 8,000 chars, up to 9 ref images)
 * Plus Quick / Cinematic / Precision prompt modes, Multi-Shot Storyboard with duration
 * validation, Character Consistency Lock, and Vehicle/Object LHD/RHD Continuity Lock.
 */

import React, { useState, useMemo } from 'react';
import {
  Film,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Car,
  Users,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Upload,
  Copy,
  Check,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  PosBotCatalogModel,
  SeedancePromptMode,
  SeedanceShotItem,
  SeedanceCharacterProfile,
  SeedanceVehicleConstraint,
} from './posbotTypes';

interface Seedance25StudioPanelProps {
  models: PosBotCatalogModel[];
  characters: SeedanceCharacterProfile[];
  vehicleConstraint: SeedanceVehicleConstraint;
  onUpdateVehicleConstraint: (updated: SeedanceVehicleConstraint) => void;
  savedReferenceUrls: string[];
  balanceGenerate: number | null;
  isSubmitting: boolean;
  onSubmitGenerate: (payload: Record<string, unknown>) => Promise<void>;
  onUploadLocalMedia: (file: File) => Promise<string | null>;
}

const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];

const SHOT_SIZES = [
  'Extreme Wide Shot (EWS)',
  'Wide Establishing Shot (WS)',
  'Medium Tracking Shot (MS)',
  'Medium Close-Up (MCU)',
  'Intense Close-Up (CU)',
  'Over-the-Shoulder (OTS)',
  'Cockpit POV / Interior Shot',
  'Low-Angle Hero Shot',
];

const CAMERA_MOVEMENTS = [
  'Smooth gimbal tracking forward',
  'Dynamic Russian-arm lateral pursuit',
  'Slow push-in dolly',
  '360-degree orbital pan',
  'Handheld visceral motion',
  'Locked-off anamorphic tripod',
  'Crane sweep from road level to aerial',
  'Whip-pan transition',
];

export const Seedance25StudioPanel: React.FC<Seedance25StudioPanelProps> = ({
  models,
  characters,
  vehicleConstraint,
  onUpdateVehicleConstraint,
  savedReferenceUrls,
  balanceGenerate,
  isSubmitting,
  onSubmitGenerate,
  onUploadLocalMedia,
}) => {
  const seedanceModels = useMemo(() => {
    const list = models.filter((m) => m.key.startsWith('seedance_'));
    return list.sort((a, b) => {
      if (a.isSeedance25 && !b.isSeedance25) return -1;
      if (!a.isSeedance25 && b.isSeedance25) return 1;
      return a.key.localeCompare(b.key);
    });
  }, [models]);

  const [selectedModelKey, setSelectedModelKey] = useState<string>('seedance_25_15s');
  const activeModel =
    seedanceModels.find((m) => m.key === selectedModelKey) || seedanceModels[0];

  const targetDurationSec: 15 | 30 = activeModel?.seedanceDurationSeconds || 15;
  const maxRefImages = activeModel?.maxImages || 9;

  // Prompt mode: quick | cinematic | precision
  const [promptMode, setPromptMode] = useState<SeedancePromptMode>('precision');

  // Core narrative concept
  const [coreConcept, setCoreConcept] = useState<string>(
    'High-speed nocturnal mountain pass pursuit through rain-slicked Tokyo turnpikes with neon reflections and authentic anamorphic lens flares.'
  );

  // Cinematic directives
  const [cinematicLens, setCinematicLens] = useState<string>(
    '35mm Panavision C-Series Anamorphic, T2.0 shallow depth of field'
  );
  const [cinematicLighting, setCinematicLighting] = useState<string>(
    'Sodium-vapor tunnel amber contrasting with cyan rain reflections, volumetric tire mist'
  );
  const [cinematicColorGrade, setCinematicColorGrade] = useState<string>(
    'Kodak Vision3 500T 5219 film stock, deep shadow density, rich halation'
  );
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');

  // Selected Character Consistency IDs
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(() =>
    characters.slice(0, 1).map((c) => c.id)
  );

  // Reference Image URLs (up to 9)
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [newRefUrlInput, setNewRefUrlInput] = useState<string>('');
  const [isUploadingRef, setIsUploadingRef] = useState<boolean>(false);

  // Multi-Shot Storyboard
  const [shots, setShots] = useState<SeedanceShotItem[]>([
    {
      id: 'sd-shot-1',
      shotNumber: 1,
      startSec: 0,
      endSec: 5,
      shotSize: 'Low-Angle Hero Shot',
      cameraMovement: 'Dynamic Russian-arm lateral pursuit',
      subjectAction:
        'The vehicle accelerates out of a rain-drenched tollgate; @Character_1 shifts gears decisively inside the illuminated cabin.',
      lightingAndAtmosphere: 'Strobing overhead toll lights, heavy rain spray off rear diffuser',
      audioCue: 'High-revving flat-six exhaust note echoing against concrete walls',
    },
    {
      id: 'sd-shot-2',
      shotNumber: 2,
      startSec: 5,
      endSec: 10,
      shotSize: 'Cockpit POV / Interior Shot',
      cameraMovement: 'Smooth gimbal tracking forward',
      subjectAction:
        'Interior cabin view showing @Character_1 gripping the steering wheel and checking the side mirror as headlights flash behind.',
      lightingAndAtmosphere: 'Dashboard telemetry glow across driver visor',
      audioCue: 'Crisp downshift blips and tire grip over wet expansion joints',
    },
    {
      id: 'sd-shot-3',
      shotNumber: 3,
      startSec: 10,
      endSec: 15,
      shotSize: 'Wide Establishing Shot (WS)',
      cameraMovement: 'Crane sweep from road level to aerial',
      subjectAction:
        'The car carves cleanly through an elevated hairpin curve overlooking the glittering city skyline.',
      lightingAndAtmosphere: 'Anamorphic tail-light streaks cutting through mist',
      audioCue: 'Full-throttle crescendo fading into atmospheric wind',
    },
  ]);

  // Manual prompt override toggle
  const [useManualOverride, setUseManualOverride] = useState<boolean>(false);
  const [manualPromptText, setManualPromptText] = useState<string>('');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Auto-redistribute shot durations when switching between 15s and 30s
  const handleAutoBalanceDurations = (totalSec: number = targetDurationSec) => {
    if (shots.length === 0) return;
    const step = Number((totalSec / shots.length).toFixed(1));
    let cursor = 0;
    const balanced = shots.map((shot, idx) => {
      const start = Number(cursor.toFixed(1));
      const end = idx === shots.length - 1 ? totalSec : Number((cursor + step).toFixed(1));
      cursor = end;
      return {
        ...shot,
        shotNumber: idx + 1,
        startSec: start,
        endSec: end,
      };
    });
    setShots(balanced);
  };

  const totalStoryboardDuration = useMemo(() => {
    if (shots.length === 0) return 0;
    return shots.reduce((acc, s) => acc + Math.max(0, s.endSec - s.startSec), 0);
  }, [shots]);

  const durationMismatch = Math.abs(totalStoryboardDuration - targetDurationSec) > 0.5;

  // Compile structured Seedance 2.5 prompt
  const compiledPrompt = useMemo(() => {
    if (promptMode === 'quick') {
      return `${coreConcept.trim()} [Format: ${aspectRatio}, Duration: ${targetDurationSec}s]`.trim();
    }

    const lines: string[] = [];
    lines.push(`[SEEDANCE 2.5 PRODUCTION DIRECTIVE — ${targetDurationSec}S MASTER SEQUENCE]`);
    lines.push(`Core Concept: ${coreConcept.trim()}`);
    lines.push(
      `Cinematography: ${cinematicLens} | Lighting: ${cinematicLighting} | Grade: ${cinematicColorGrade}`
    );

    if (promptMode === 'precision') {
      // Character consistency block
      const activeChars = characters.filter((c) => selectedCharacterIds.includes(c.id));
      if (activeChars.length > 0) {
        lines.push('');
        lines.push('[CHARACTER IDENTITY & WARDROBE CONTINUITY LOCK]:');
        activeChars.forEach((ch, idx) => {
          lines.push(
            `- ${ch.roleTag} (${ch.name}): ${ch.appearance}. Wardrobe: ${ch.wardrobe}. Accessories: ${ch.accessories}.${
              referenceUrls[idx] ? ` (Matched to Reference Image #${idx + 1})` : ''
            }`
          );
        });
      }

      // Vehicle & Object consistency block (LHD / RHD strict lock)
      if (vehicleConstraint.enabled) {
        lines.push('');
        lines.push('[VEHICLE & OBJECT CONTINUITY LOCK — STRICT GEOMETRY]:');
        lines.push(`- Vehicle Model: ${vehicleConstraint.vehicleName}`);
        lines.push(`- Driving Configuration: ${vehicleConstraint.drivingSide}`);
        lines.push(`- Steering Wheel Position: ${vehicleConstraint.steeringWheelSide} (NEVER mirror or flip cabin side)`);
        lines.push(`- Driver Position: ${vehicleConstraint.driverPosition}`);
        lines.push(`- Passenger Position: ${vehicleConstraint.passengerPosition}`);
        lines.push(`- Exterior Body & Paint: ${vehicleConstraint.exteriorPaintAndBody}`);
        lines.push(`- Wheels & Calipers: ${vehicleConstraint.wheelAndTrimDetails}`);
        lines.push(`- Interior Cabin Trim: ${vehicleConstraint.interiorCabinDetails}`);
      }

      // Multi-shot temporal storyboard
      if (shots.length > 0) {
        lines.push('');
        lines.push(`[MULTI-SHOT TEMPORAL STORYBOARD (${totalStoryboardDuration.toFixed(1)}s / ${targetDurationSec}s)]:`);
        shots.forEach((s, idx) => {
          lines.push(
            `Shot ${idx + 1} [${s.startSec}s - ${s.endSec}s] (${s.shotSize}, ${s.cameraMovement}): ${s.subjectAction} | Lighting: ${s.lightingAndAtmosphere}${
              s.audioCue ? ` | Audio/Foley: ${s.audioCue}` : ''
            }`
          );
        });
      }
    }

    return lines.join('\n').slice(0, 8000);
  }, [
    promptMode,
    coreConcept,
    aspectRatio,
    targetDurationSec,
    cinematicLens,
    cinematicLighting,
    cinematicColorGrade,
    characters,
    selectedCharacterIds,
    vehicleConstraint,
    shots,
    totalStoryboardDuration,
    referenceUrls,
  ]);

  const effectivePrompt = useManualOverride ? manualPromptText : compiledPrompt;
  const promptLength = effectivePrompt.length;
  const maxPromptLength = activeModel?.maxPromptLength || 8000;

  const handleAddShot = () => {
    const lastEnd = shots.length > 0 ? shots[shots.length - 1].endSec : 0;
    const nextStart = Math.min(lastEnd, targetDurationSec);
    const nextEnd = Math.min(targetDurationSec, nextStart + 5);
    const nextShot: SeedanceShotItem = {
      id: `sd-shot-${Date.now()}`,
      shotNumber: shots.length + 1,
      startSec: nextStart,
      endSec: nextEnd > nextStart ? nextEnd : targetDurationSec,
      shotSize: 'Medium Tracking Shot (MS)',
      cameraMovement: 'Smooth gimbal tracking forward',
      subjectAction: 'Describe subject movement, facial expression, and camera blocking.',
      lightingAndAtmosphere: 'Consistent scene key lighting and atmospheric haze',
      audioCue: 'Ambient soundscape and synchronized foley',
    };
    setShots([...shots, nextShot]);
  };

  const handleRemoveShot = (id: string) => {
    if (shots.length <= 1) return;
    const filtered = shots
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, shotNumber: i + 1 }));
    setShots(filtered);
  };

  const handleMoveShot = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= shots.length) return;
    const copy = [...shots];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    setShots(copy.map((s, i) => ({ ...s, shotNumber: i + 1 })));
  };

  const handleAddRefUrl = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setLocalError('Reference image URL must start with http:// or https://');
      return;
    }
    if (referenceUrls.length >= maxRefImages) {
      setLocalError(`Maximum ${maxRefImages} reference images allowed for ${activeModel?.name}.`);
      return;
    }
    if (!referenceUrls.includes(trimmed)) {
      setReferenceUrls([...referenceUrls, trimmed]);
    }
    setNewRefUrlInput('');
    setLocalError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRef(true);
    setLocalError(null);
    try {
      const uploadedUrl = await onUploadLocalMedia(file);
      if (uploadedUrl) {
        if (referenceUrls.length < maxRefImages) {
          setReferenceUrls((prev) => [...prev, uploadedUrl]);
        }
      }
    } finally {
      setIsUploadingRef(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setLocalError(null);

    if (effectivePrompt.trim().length < 3) {
      setLocalError('Prompt must be at least 3 characters long.');
      return;
    }
    if (effectivePrompt.length > maxPromptLength) {
      setLocalError(`Prompt exceeds maximum length of ${maxPromptLength} characters.`);
      return;
    }
    if (activeModel?.isR2V && referenceUrls.length === 0) {
      setLocalError(
        `${activeModel.name} is a Reference-to-Video (R2V) model and requires at least 1 public reference image URL.`
      );
      return;
    }

    const payload: Record<string, unknown> = {
      model: activeModel.key,
      prompt: effectivePrompt.trim(),
      aspect_ratio: aspectRatio,
    };

    if (referenceUrls.length > 0) {
      payload.reference_image_urls = referenceUrls;
      payload.image_urls = referenceUrls;
      payload.image_url = referenceUrls[0];
    }

    await onSubmitGenerate(payload);
  };

  const insufficientBalance =
    balanceGenerate !== null && activeModel && balanceGenerate < activeModel.cost_generate;

  return (
    <div className="space-y-5">
      {/* HEADER BANNER */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500 text-black font-mono text-[10px] font-bold uppercase tracking-wider">
              Flagship Production Engine
            </span>
            <span className="font-mono text-xs text-cyan-300">
              Seedance 2.5 Multi-Shot & R2V Continuity Studio
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Temporal Storyboard, Identity Lock & Vehicle LHD/RHD Continuity
          </h3>
          <p className="text-xs text-white/65 max-w-3xl">
            Supports up to 8,000-character multi-shot directives and up to 9 simultaneous reference
            images for strict character wardrobe and left/right-hand-drive cabin continuity.
          </p>
        </div>

        {/* PROMPT MODE SWITCHER */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10 self-start">
          {(
            [
              { id: 'quick', label: 'Quick Mode' },
              { id: 'cinematic', label: 'Cinematic' },
              { id: 'precision', label: 'Precision Storyboard' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setPromptMode(mode.id)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                promptMode === mode.id
                  ? 'bg-cyan-400 text-black font-bold shadow'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODEL SELECTOR CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {seedanceModels.map((m) => {
          const isSelected = m.key === activeModel?.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setSelectedModelKey(m.key);
                if (m.seedanceDurationSeconds) {
                  handleAutoBalanceDurations(m.seedanceDurationSeconds);
                }
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                    {m.name}
                    {m.isSeedance25 && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 text-[9px]">
                        2.5
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-white/45 mt-0.5">{m.key}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                  {m.cost_generate} Gen
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-white/55 pt-1 border-t border-white/5">
                <span>{m.isR2V ? 'Ref-to-Video (R2V)' : 'T2V / I2V'}</span>
                <span>Max {m.maxImages || 1} Refs</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* MAIN TWO-COLUMN PRODUCTION GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT COLUMN (7 COLS): CONCEPT, STORYBOARD, CHARACTER & VEHICLE LOCKS */}
        <div className="xl:col-span-7 space-y-4">
          {/* 1. CORE SCENE NARRATIVE & ASPECT RATIO */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                1. Master Scene Concept & Aspect Ratio
              </label>
              <div className="flex items-center gap-1.5">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAspectRatio(ar)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                      aspectRatio === ar
                        ? 'bg-cyan-400 text-black font-bold'
                        : 'bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={coreConcept}
              onChange={(e) => setCoreConcept(e.target.value)}
              rows={2}
              placeholder="Describe the overarching sequence concept, environment, and dramatic tension..."
              className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
            />

            {promptMode !== 'quick' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block font-mono text-[10px] text-white/55 mb-1">
                    Lens & Optical Profile
                  </label>
                  <input
                    type="text"
                    value={cinematicLens}
                    onChange={(e) => setCinematicLens(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-white/55 mb-1">
                    Key Lighting & Atmosphere
                  </label>
                  <input
                    type="text"
                    value={cinematicLighting}
                    onChange={(e) => setCinematicLighting(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] text-white/55 mb-1">
                    Film Stock & Color Grade
                  </label>
                  <input
                    type="text"
                    value={cinematicColorGrade}
                    onChange={(e) => setCinematicColorGrade(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. MULTI-SHOT STORYBOARD BUILDER (SHOWN IN PRECISION MODE) */}
          {promptMode === 'precision' && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                    2. Multi-Shot Temporal Storyboard ({shots.length} Shots)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                      durationMismatch
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    Total: {totalStoryboardDuration.toFixed(1)}s / {targetDurationSec}s
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoBalanceDurations(targetDurationSec)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-mono text-cyan-300 cursor-pointer"
                  >
                    Auto-Fit {targetDurationSec}s
                  </button>
                  <button
                    type="button"
                    onClick={handleAddShot}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-[11px] font-mono text-cyan-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Shot
                  </button>
                </div>
              </div>

              {durationMismatch && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-200">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    Shot durations sum to {totalStoryboardDuration.toFixed(1)}s, while{' '}
                    {activeModel?.name} renders a {targetDurationSec}s sequence.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoBalanceDurations(targetDurationSec)}
                    className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Fix Timing
                  </button>
                </div>
              )}

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {shots.map((shot, idx) => (
                  <div
                    key={shot.id}
                    className="p-3 rounded-xl bg-black/45 border border-white/10 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold">
                          Shot {idx + 1}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-white/70">
                          <input
                            type="number"
                            min={0}
                            max={targetDurationSec}
                            step={0.5}
                            value={shot.startSec}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setShots((prev) =>
                                prev.map((s) => (s.id === shot.id ? { ...s, startSec: val } : s))
                              );
                            }}
                            className="w-14 rounded bg-white/5 border border-white/15 px-1.5 py-0.5 text-center text-white"
                          />
                          <span>s to</span>
                          <input
                            type="number"
                            min={0}
                            max={targetDurationSec}
                            step={0.5}
                            value={shot.endSec}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setShots((prev) =>
                                prev.map((s) => (s.id === shot.id ? { ...s, endSec: val } : s))
                              );
                            }}
                            className="w-14 rounded bg-white/5 border border-white/15 px-1.5 py-0.5 text-center text-white"
                          />
                          <span>s</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveShot(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-white/45 hover:text-white disabled:opacity-25 cursor-pointer"
                          title="Move Shot Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveShot(idx, 1)}
                          disabled={idx === shots.length - 1}
                          className="p-1 text-white/45 hover:text-white disabled:opacity-25 cursor-pointer"
                          title="Move Shot Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveShot(shot.id)}
                          disabled={shots.length <= 1}
                          className="p-1 text-rose-400/70 hover:text-rose-400 disabled:opacity-25 cursor-pointer"
                          title="Delete Shot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={shot.shotSize}
                        onChange={(e) =>
                          setShots((prev) =>
                            prev.map((s) =>
                              s.id === shot.id ? { ...s, shotSize: e.target.value } : s
                            )
                          )
                        }
                        className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
                      >
                        {SHOT_SIZES.map((sz) => (
                          <option key={sz} value={sz} className="bg-[#0B0C10]">
                            {sz}
                          </option>
                        ))}
                      </select>

                      <select
                        value={shot.cameraMovement}
                        onChange={(e) =>
                          setShots((prev) =>
                            prev.map((s) =>
                              s.id === shot.id ? { ...s, cameraMovement: e.target.value } : s
                            )
                          )
                        }
                        className="rounded bg-white/5 border border-white/10 px-2 py-1 text-xs text-white"
                      >
                        {CAMERA_MOVEMENTS.map((mv) => (
                          <option key={mv} value={mv} className="bg-[#0B0C10]">
                            {mv}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      rows={2}
                      value={shot.subjectAction}
                      onChange={(e) =>
                        setShots((prev) =>
                          prev.map((s) =>
                            s.id === shot.id ? { ...s, subjectAction: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Subject blocking & action in this shot..."
                      className="w-full rounded bg-black/50 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. VEHICLE & OBJECT CONTINUITY LOCK (LHD / RHD / CABIN / EXTERIOR) */}
          {promptMode === 'precision' && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-400" />
                  <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                    3. Vehicle & Object Geometry Continuity Lock (LHD / RHD)
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-mono text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleConstraint.enabled}
                    onChange={(e) =>
                      onUpdateVehicleConstraint({
                        ...vehicleConstraint,
                        enabled: e.target.checked,
                      })
                    }
                    className="accent-cyan-400"
                  />
                  Enable Strict Vehicle Lock
                </label>
              </div>

              {vehicleConstraint.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Vehicle Make / Model
                    </label>
                    <input
                      type="text"
                      value={vehicleConstraint.vehicleName}
                      onChange={(e) =>
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          vehicleName: e.target.value,
                        })
                      }
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Driving Side (LHD vs RHD)
                    </label>
                    <select
                      value={vehicleConstraint.drivingSide}
                      onChange={(e) => {
                        const isRhd = e.target.value.startsWith('RHD');
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          drivingSide: e.target.value as SeedanceVehicleConstraint['drivingSide'],
                          steeringWheelSide: isRhd ? 'Right Cabin Side' : 'Left Cabin Side',
                          driverPosition: isRhd
                            ? 'Front-right bucket seat (Driver strictly on right side)'
                            : 'Front-left bucket seat (Driver strictly on left side)',
                          passengerPosition: isRhd
                            ? 'Front-left bucket seat (Passenger strictly on left side)'
                            : 'Front-right bucket seat (Passenger strictly on right side)',
                        });
                      }}
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="LHD (Left-Hand Drive)" className="bg-[#0B0C10]">
                        LHD (Left-Hand Drive — Steering on Left)
                      </option>
                      <option value="RHD (Right-Hand Drive)" className="bg-[#0B0C10]">
                        RHD (Right-Hand Drive — Steering on Right)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Driver Seat Position
                    </label>
                    <input
                      type="text"
                      value={vehicleConstraint.driverPosition}
                      onChange={(e) =>
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          driverPosition: e.target.value,
                        })
                      }
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Passenger Seat Position
                    </label>
                    <input
                      type="text"
                      value={vehicleConstraint.passengerPosition}
                      onChange={(e) =>
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          passengerPosition: e.target.value,
                        })
                      }
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Exterior Paint & Aero Body Details
                    </label>
                    <input
                      type="text"
                      value={vehicleConstraint.exteriorPaintAndBody}
                      onChange={(e) =>
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          exteriorPaintAndBody: e.target.value,
                        })
                      }
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Wheels, Rims & Brake Calipers
                    </label>
                    <input
                      type="text"
                      value={vehicleConstraint.wheelAndTrimDetails}
                      onChange={(e) =>
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          wheelAndTrimDetails: e.target.value,
                        })
                      }
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-mono text-[10px] text-white/55 mb-1">
                      Interior Cabin & Dashboard Details
                    </label>
                    <input
                      type="text"
                      value={vehicleConstraint.interiorCabinDetails}
                      onChange={(e) =>
                        onUpdateVehicleConstraint({
                          ...vehicleConstraint,
                          interiorCabinDetails: e.target.value,
                        })
                      }
                      className="w-full rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. CHARACTER CONTINUITY LOCK */}
          {promptMode === 'precision' && (
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-white font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  4. Character Identity & Wardrobe Continuity Lock
                </span>
                <span className="font-mono text-[10px] text-white/45">
                  {selectedCharacterIds.length} Active in Sequence
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {characters.map((ch) => {
                  const checked = selectedCharacterIds.includes(ch.id);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => {
                        setSelectedCharacterIds((prev) =>
                          checked ? prev.filter((id) => id !== ch.id) : [...prev, ch.id]
                        );
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        checked
                          ? 'bg-purple-500/15 border-purple-400/60'
                          : 'bg-black/30 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {ch.referenceImageUrl && (
                        <img
                          src={ch.referenceImageUrl}
                          alt={ch.name}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/15"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-white truncate">
                            {ch.name}
                          </span>
                          <span className="text-[10px] font-mono text-purple-300">
                            {ch.roleTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">
                          {ch.wardrobe}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): MULTI-IMAGE REFERENCES (UP TO 9) + COMPILED PROMPT + SUBMIT */}
        <div className="xl:col-span-5 space-y-4">
          {/* REFERENCE IMAGES (UP TO 9) */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                Reference Images ({referenceUrls.length} / {maxRefImages})
              </span>
              {activeModel?.isR2V && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold">
                  Required for R2V
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                value={newRefUrlInput}
                onChange={(e) => setNewRefUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRefUrl(newRefUrlInput);
                  }
                }}
                placeholder="Paste public https:// reference image URL..."
                className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => handleAddRefUrl(newRefUrlInput)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold cursor-pointer shrink-0"
              >
                Add URL
              </button>
              <label className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-mono flex items-center gap-1 cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingRef ? '...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick-Add from Saved Continuity Library */}
            {savedReferenceUrls.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="font-mono text-[10px] text-white/45 shrink-0">Quick Add:</span>
                {savedReferenceUrls.slice(0, 5).map((url, idx) => (
                  <button
                    key={url + idx}
                    type="button"
                    onClick={() => handleAddRefUrl(url)}
                    className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono text-cyan-300 shrink-0 cursor-pointer"
                  >
                    + Ref #{idx + 1}
                  </button>
                ))}
              </div>
            )}

            {referenceUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {referenceUrls.map((url, idx) => (
                  <div
                    key={url + idx}
                    className="relative group rounded-lg overflow-hidden border border-white/15 bg-black/50 aspect-video"
                  >
                    <img
                      src={url}
                      alt={`Ref ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-2">
                      <span className="font-mono text-[10px] text-cyan-300 font-bold">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReferenceUrls(referenceUrls.filter((_, i) => i !== idx))
                        }
                        className="p-1 rounded bg-rose-500/80 text-white cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-black/30 border border-dashed border-white/10 text-center text-[11px] text-white/45 font-mono">
                No reference images attached yet (up to {maxRefImages} public URLs supported).
              </div>
            )}
          </div>

          {/* COMPILED PROMPT & SUBMISSION CARD */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  Compiled Seedance 2.5 Prompt
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-mono text-white/65 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useManualOverride}
                    onChange={(e) => {
                      const next = e.target.checked;
                      if (next && !manualPromptText) {
                        setManualPromptText(compiledPrompt);
                      }
                      setUseManualOverride(next);
                    }}
                    className="accent-cyan-400"
                  />
                  Manual Edit
                </label>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(effectivePrompt);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 1800);
                  }}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-[11px] font-mono text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              readOnly={!useManualOverride}
              value={effectivePrompt}
              onChange={(e) => setManualPromptText(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 font-mono text-[11px] leading-relaxed focus:outline-none ${
                useManualOverride
                  ? 'bg-black/70 border-cyan-400/50 text-white'
                  : 'bg-black/40 border-white/10 text-white/85'
              }`}
            />

            <div className="flex items-center justify-between text-[11px] font-mono">
              <span
                className={
                  promptLength > maxPromptLength ? 'text-rose-400 font-bold' : 'text-white/55'
                }
              >
                {promptLength.toLocaleString()} / {maxPromptLength.toLocaleString()} chars
              </span>
              <span className="text-amber-300 font-bold">
                Cost: {activeModel?.cost_generate ?? 4} Generate (Rp{' '}
                {(activeModel?.cost_idr ?? 1600).toLocaleString()})
              </span>
            </div>

            {localError && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            {insufficientBalance && (
              <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Current live balance ({balanceGenerate} Gen) is lower than model cost (
                  {activeModel?.cost_generate} Gen).
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={isSubmitting || promptLength > maxPromptLength}
              onClick={handleSubmit}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-40 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Wand2 className="w-4 h-4" />
              {isSubmitting
                ? 'Submitting to PosBot API...'
                : `Generate with ${activeModel?.name} (${activeModel?.cost_generate} Gen)`}
            </button>

            <div className="flex items-center justify-between text-[10px] font-mono text-white/45 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                100% Auto-Refund on Upstream Failure
              </span>
              <span>Polls /api/ai/jobs/:code every 6s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
