/**
 * VAIURE Studio — Audio & Dialogue Workspace
 * Dialogue lines, atmospheric acoustic room tone, and cinematic score tracks
 * connected to PosBot v1 AI Voice (google_tts), AI Music, and Lip-Sync engines.
 */

import React, { useState, useRef } from 'react';
import {
  Music,
  Plus,
  Play,
  Pause,
  Volume2,
  Mic,
  Video,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { StudioProject } from '../../../types/studio';

interface AudioWorkspaceProps {
  project: StudioProject;
}

interface AudioTrackItem {
  id: string;
  title: string;
  category: string;
  duration: number;
  audioUrl: string;
  isVideo?: boolean;
}

const GOOGLE_TTS_VOICES = [
  'Kore',
  'Puck',
  'Charon',
  'Fenrir',
  'Aoede',
  'Leda',
  'Orus',
  'Zephyr',
];

const MUSIC_MODELS = [
  { id: 'suno_v6', label: 'Suno v6 (Full Track)' },
  { id: 'suno_v6_wild', label: 'Suno v6 Wild' },
  { id: 'suno_v6_mini', label: 'Suno v6 Mini' },
  { id: 'lyria_35', label: 'Google Lyria 3.5' },
  { id: 'minimax_music_3', label: 'MiniMax Music 3' },
  { id: 'mureka_95', label: 'Mureka 9.5' },
  { id: 'sonauto_3', label: 'Sonauto 3' },
  { id: 'acestep_15', label: 'ACE-Step 1.5' },
];

const LIPSYNC_MODELS = [
  { id: 'minimax_lipsync', label: 'MiniMax LipSync' },
  { id: 'ltx_lipsync', label: 'LTX Studio LipSync' },
];

export const AudioWorkspace: React.FC<AudioWorkspaceProps> = ({ project }) => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tracks, setTracks] = useState<AudioTrackItem[]>([
    {
      id: 'audio-1',
      title: 'Volcanic Basalt Room Tone & Water Echoes',
      category: 'Atmospheric Foley',
      duration: 32,
      audioUrl: 'https://cdn.freesound.org/previews/316/316847_3226777-lq.mp3',
    },
    {
      id: 'audio-2',
      title: 'Subterranean Low-Frequency Drone (C minor)',
      category: 'Ambient Score',
      duration: 45,
      audioUrl: 'https://cdn.freesound.org/previews/316/316847_3226777-lq.mp3',
    },
    {
      id: 'audio-3',
      title: 'Elena Voss — "The vault hasn’t been breached in 200 years"',
      category: 'Dialogue ADR',
      duration: 4,
      audioUrl: 'https://cdn.freesound.org/previews/316/316847_3226777-lq.mp3',
    },
  ]);

  // Synthesis Studio state
  const [synthMode, setSynthMode] = useState<'voice' | 'music' | 'lipsync'>('voice');
  const [prompt, setPrompt] = useState('');
  const [voiceName, setVoiceName] = useState('Kore');
  const [musicModel, setMusicModel] = useState('suno_v6');
  const [lyrics, setLyrics] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [lipsyncModel, setLipsyncModel] = useState('minimax_lipsync');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrlInput, setAudioUrlInput] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const togglePlay = (track: AudioTrackItem) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.play().catch(() => {});
      setPlayingTrackId(track.id);
    }
  };

  const handleSynthesize = async () => {
    setErrorMessage(null);
    setStatusMessage('Submitting to PosBot Audio Engine...');
    setIsGenerating(true);

    try {
      let payload: Record<string, unknown> = {};
      let titleLabel = '';
      let categoryLabel = '';

      if (synthMode === 'voice') {
        if (!prompt.trim()) {
          throw new Error('Enter dialogue script text to synthesize.');
        }
        payload = {
          model: 'google_tts',
          prompt: prompt.trim(),
          voice: voiceName,
        };
        titleLabel = `${voiceName} — "${prompt.trim().slice(0, 48)}"`;
        categoryLabel = 'Dialogue ADR (Google TTS)';
      } else if (synthMode === 'music') {
        if (!prompt.trim()) {
          throw new Error('Enter a musical style or score prompt.');
        }
        payload = {
          model: musicModel,
          prompt: prompt.trim(),
          lyrics: lyrics.trim() || undefined,
          instrumental,
        };
        titleLabel = `${prompt.trim().slice(0, 48)}`;
        categoryLabel = `AI Score (${musicModel})`;
      } else {
        if (!videoUrl.trim() || !audioUrlInput.trim()) {
          throw new Error('Both Video URL and Audio URL are required for Lip-Sync.');
        }
        payload = {
          model: lipsyncModel,
          video_url: videoUrl.trim(),
          audio_url: audioUrlInput.trim(),
        };
        titleLabel = `Lip-Sync Render (${lipsyncModel})`;
        categoryLabel = 'Lip-Sync Composite';
      }

      const submitRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const submitData = await submitRes.json();

      if (!submitRes.ok || (!submitData.ok && !submitData.success)) {
        throw new Error(submitData.error || 'Audio generation submission failed.');
      }

      const jobCode: string | undefined = submitData.job_code || submitData.jobCode;
      let finalUrl: string | undefined = submitData.result_url || submitData.outputUrl;

      if (!finalUrl && jobCode) {
        for (let attempt = 1; attempt <= 60; attempt++) {
          setStatusMessage(`Synthesizing Job ${jobCode} (Poll #${attempt})...`);
          await new Promise((r) => setTimeout(r, 2500));
          const pollRes = await fetch(`/api/ai/jobs/${encodeURIComponent(jobCode)}`);
          const pollData = await pollRes.json();
          const out = pollData.result_url || pollData.outputUrl;
          if (pollData.status === 'completed' && out) {
            finalUrl = out;
            break;
          }
          if (pollData.status === 'failed') {
            throw new Error(pollData.error_message || pollData.error || `Job ${jobCode} failed.`);
          }
        }
      }

      if (!finalUrl) {
        throw new Error('No output URL returned from audio engine.');
      }

      const newTrack: AudioTrackItem = {
        id: `audio-${Date.now()}`,
        title: titleLabel,
        category: categoryLabel,
        duration: synthMode === 'voice' ? 8 : 30,
        audioUrl: finalUrl,
        isVideo: synthMode === 'lipsync',
      };

      setTracks((prev) => [newTrack, ...prev]);
      setStatusMessage('Audio synthesis completed and added to library.');
      setPrompt('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Audio synthesis failed.');
      setStatusMessage(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070B] overflow-y-auto p-4 sm:p-8 select-none no-scrollbar">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingTrackId(null)}
        className="hidden"
      />
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/50">
              SOUND DESIGN & ACOUSTICS
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-white">
              Audio & Dialogue Library
            </h1>
            <p className="text-xs font-mono text-white/60 mt-1">
              Manage dialogue takes, room tone ambiances, spatial acoustic foley, and AI synthesis for {project.title}.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#0A0A0F] border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setSynthMode('voice')}
              className={`px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                synthMode === 'voice'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Mic className="w-3 h-3" />
              ADR Voice
            </button>
            <button
              onClick={() => setSynthMode('music')}
              className={`px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                synthMode === 'music'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Music className="w-3 h-3" />
              AI Score
            </button>
            <button
              onClick={() => setSynthMode('lipsync')}
              className={`px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                synthMode === 'lipsync'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Video className="w-3 h-3" />
              Lip-Sync
            </button>
          </div>
        </div>

        {/* PosBot Audio / Music / Lip-Sync Synthesis Console */}
        <div className="p-4 rounded-xl border border-white/10 bg-[#0A0A0F] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
              {synthMode === 'voice'
                ? 'Google TTS ADR Dialogue Synthesizer'
                : synthMode === 'music'
                ? 'Cinematic Score & Foley Generator'
                : 'Character Lip-Sync Alignment'}
            </span>
            <span className="text-[10px] font-mono text-white/40">
              PosBot v1 Audio Pipeline
            </span>
          </div>

          {synthMode === 'voice' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                  Dialogue Script Line
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='e.g. "The vault hasn’t been breached in 200 years."'
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                  Voice Profile
                </label>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  {GOOGLE_TTS_VOICES.map((v) => (
                    <option key={v} value={v} className="bg-[#0A0A0F]">
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {synthMode === 'music' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                    Musical Style / Acoustic Prompt
                  </label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Subterranean low-frequency analog synth drone in C minor, dark cinematic pulse"
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                    Music Engine
                  </label>
                  <select
                    value={musicModel}
                    onChange={(e) => setMusicModel(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                  >
                    {MUSIC_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#0A0A0F]">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <input
                  type="text"
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Optional lyrics or vocal cues (leave blank for score)"
                  className="w-full sm:flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <label className="flex items-center gap-2 text-xs font-mono text-white/70 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={instrumental}
                    onChange={(e) => setInstrumental(e.target.checked)}
                    className="rounded border-white/20 bg-black text-cyan-400"
                  />
                  Instrumental Only
                </label>
              </div>
            </div>
          )}

          {synthMode === 'lipsync' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                  Source Video URL
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://.../shot.mp4"
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                  Dialogue Audio URL
                </label>
                <input
                  type="url"
                  value={audioUrlInput}
                  onChange={(e) => setAudioUrlInput(e.target.value)}
                  placeholder="https://.../dialogue.mp3"
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                  Lip-Sync Engine
                </label>
                <select
                  value={lipsyncModel}
                  onChange={(e) => setLipsyncModel(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  {LIPSYNC_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#0A0A0F]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] font-mono">
              {errorMessage && (
                <span className="text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorMessage}
                </span>
              )}
              {!errorMessage && statusMessage && (
                <span className="text-cyan-300 flex items-center gap-1.5">
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {statusMessage}
                </span>
              )}
            </div>

            <button
              onClick={handleSynthesize}
              disabled={isGenerating}
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-cyan-300 disabled:opacity-50 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Synthesize Track
                </>
              )}
            </button>
          </div>
        </div>

        {/* Track Library List */}
        <div className="space-y-3">
          {tracks.map((track) => {
            const isPlaying = playingTrackId === track.id;
            return (
              <div
                key={track.id}
                className="p-4 rounded-xl border border-white/10 bg-[#0A0A0F] hover:border-white/20 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePlay(track)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                  </button>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-white">{track.title}</h4>
                    <span className="text-[10px] font-mono text-cyan-400">{track.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-white/50">
                  <span>{track.duration}s</span>
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Track A1</span>
                  </div>
                  <a
                    href={track.audioUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title="Download Audio"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
