/**
 * VaiByte - Canvas Studio: Node Workflow Studio ("Connecting Dots")
 * Interactive visual DAG pipeline for Seedance 2.5 filmmaking:
 * - Connect typed dots across Image Plates, Video Clips, Vision Prompt Reader,
 *   Scene Directors, Film & Camera Movements, Official ByteDance Seedance 2.5 Codex,
 *   Live Synced ModelArk Render Nodes, and Zero-Mistake Next-Scene Continuity.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Play,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Film,
  Camera,
  BookOpen,
  Clapperboard,
  GitBranch,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Check,
  AlertCircle,
  ArrowRight,
  Download,
  Upload,
  FolderOpen,
  FileJson,
  Lock,
  Layers,
  Eye,
  Shield,
  SlidersHorizontal,
  Unlink,
  Workflow,
  ChevronRight,
} from 'lucide-react';
import {
  WorkflowNode,
  WorkflowNodeKind,
  WorkflowEdge,
  WorkflowPortType,
  NODE_PORT_DEFINITIONS,
  PORT_TYPE_COLORS,
  SCENE_DIRECTORS,
  CAMERA_MOVEMENTS,
  FILM_STOCK_LENSES,
  SEEDANCE_KNOWLEDGE_PATTERNS,
  WorkflowGraphSnapshot,
} from './canvasTypes';
import {
  seedanceLabService,
  ByteDanceModelsCatalogResponse,
  SeedanceHealthStatus,
  SEEDANCE_MODELS,
} from '../../services/seedanceLabService';
import { extractExactLastFrame, extractVideoKeyframes } from './videoFrameExtractor';

interface WorkflowNodeGraphProps {
  externalPaintedImageUrl?: string | null;
  onConsumePaintedImage?: () => void;
  onSendImagesToSeedanceSlide4?: (urls: string[]) => void;
  onStatusNotice?: (msg: string, isError?: boolean) => void;
}

const NODE_WIDTH = 292;
const PORT_START_Y = 66;
const PORT_ROW_H = 26;

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getDefaultNodeData(kind: WorkflowNodeKind): WorkflowNode['data'] {
  switch (kind) {
    case 'image_input':
      return { title: 'Image Plates (@Image)', imageUrls: [], imageRole: 'reference_image' };
    case 'video_input':
      return { title: 'Video Clip (@Video)', videoUrl: '', videoFrames: [], videoRole: 'reference_video' };
    case 'media_analyzer':
      return { title: 'Vision Prompt Reader', analyzerNotes: '' };
    case 'scene_director':
      return {
        title: 'Scene Director',
        directorId: SCENE_DIRECTORS[0].id,
        contrastRatio: SCENE_DIRECTORS[0].contrastRatio,
        directorNotes: '',
      };
    case 'camera_film_rig':
      return {
        title: 'Film & Camera Rig',
        cameraMovementId: CAMERA_MOVEMENTS[0].id,
        filmStockId: FILM_STOCK_LENSES[0].id,
        focalLengthMm: 35,
        cameraSpeed: 'Smooth Measured',
        cameraFixed: false,
      };
    case 'seedance_knowledge':
      return {
        title: 'Seedance 2.5 Codex',
        selectedKnowledgeIds: ['dual-branch-formula', 'single-vector-camera', 'active-physics-verbs'],
        customKnowledgeSnippet: '',
      };
    case 'seedance_render':
      return {
        title: 'Seedance 2.5 Render',
        modelKey: 'seedance_25_15s',
        customPrompt: '',
        aspectRatio: '16:9',
        durationSeconds: 15,
        resolution: '720P',
        soundEnabled: true,
        physicsPriority: true,
        contentRating: 'standard',
        renderStatus: 'idle',
        renderProgress: 0,
      };
    case 'next_scene_continuity':
      return {
        title: 'Next Scene Continuity',
        nextActionIntent: '',
        continuityChecklist: [
          'Frame-0 Exact Pose Match via @Image1 (first_frame)',
          'Locked Light Azimuth & Film Grain',
          'Smooth Camera Vector Handover',
        ],
      };
  }
}

function createCinemaMasterTemplate(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nImg: WorkflowNode = {
    id: 'node-img-1',
    kind: 'image_input',
    x: 60,
    y: 70,
    data: getDefaultNodeData('image_input'),
  };
  const nVid: WorkflowNode = {
    id: 'node-vid-1',
    kind: 'video_input',
    x: 60,
    y: 290,
    data: getDefaultNodeData('video_input'),
  };
  const nAnalyze: WorkflowNode = {
    id: 'node-analyzer-1',
    kind: 'media_analyzer',
    x: 410,
    y: 120,
    data: {
      ...getDefaultNodeData('media_analyzer'),
      analyzerNotes: 'Extract character identity, wardrobe fabric dynamics, key light azimuth, and camera path.',
    },
  };
  const nDirector: WorkflowNode = {
    id: 'node-director-1',
    kind: 'scene_director',
    x: 410,
    y: 355,
    data: getDefaultNodeData('scene_director'),
  };
  const nCam: WorkflowNode = {
    id: 'node-cam-1',
    kind: 'camera_film_rig',
    x: 750,
    y: 355,
    data: getDefaultNodeData('camera_film_rig'),
  };
  const nCodex: WorkflowNode = {
    id: 'node-codex-1',
    kind: 'seedance_knowledge',
    x: 410,
    y: 575,
    data: getDefaultNodeData('seedance_knowledge'),
  };
  const nRender: WorkflowNode = {
    id: 'node-render-1',
    kind: 'seedance_render',
    x: 760,
    y: 90,
    data: {
      ...getDefaultNodeData('seedance_render'),
      title: 'Scene 01 · Seedance 2.5',
      customPrompt:
        'Obsidian stone gallery in dramatic diagonal shaft of late-afternoon sunlight. Figure in heavyweight wool coat steps smoothly forward into frame as aerodynamic coat hems ripple @ 24fps.',
    },
  };
  const nNext: WorkflowNode = {
    id: 'node-next-1',
    kind: 'next_scene_continuity',
    x: 1130,
    y: 130,
    data: {
      ...getDefaultNodeData('next_scene_continuity'),
      nextActionIntent: 'Protagonist pauses at the threshold, turns toward backlit monolith as wind whips across rain-slicked floor.',
    },
  };
  const nRender2: WorkflowNode = {
    id: 'node-render-2',
    kind: 'seedance_render',
    x: 1490,
    y: 130,
    data: {
      ...getDefaultNodeData('seedance_render'),
      title: 'Scene 02 · Seamless Sequel',
    },
  };

  const edges: WorkflowEdge[] = [
    { id: 'e-1', fromNodeId: nImg.id, fromPortId: 'media_out', toNodeId: nAnalyze.id, toPortId: 'media_in', portType: 'media' },
    { id: 'e-2', fromNodeId: nVid.id, fromPortId: 'media_out', toNodeId: nAnalyze.id, toPortId: 'media_in', portType: 'media' },
    { id: 'e-3', fromNodeId: nDirector.id, fromPortId: 'director_out', toNodeId: nAnalyze.id, toPortId: 'director_in', portType: 'director' },
    { id: 'e-4', fromNodeId: nCam.id, fromPortId: 'camera_out', toNodeId: nAnalyze.id, toPortId: 'camera_in', portType: 'camera' },
    { id: 'e-5', fromNodeId: nAnalyze.id, fromPortId: 'media_pass', toNodeId: nRender.id, toPortId: 'media_in', portType: 'media' },
    { id: 'e-6', fromNodeId: nAnalyze.id, fromPortId: 'prompt_out', toNodeId: nRender.id, toPortId: 'prompt_in', portType: 'prompt' },
    { id: 'e-7', fromNodeId: nCodex.id, fromPortId: 'prompt_out', toNodeId: nRender.id, toPortId: 'prompt_in', portType: 'prompt' },
    { id: 'e-8', fromNodeId: nDirector.id, fromPortId: 'director_out', toNodeId: nRender.id, toPortId: 'director_in', portType: 'director' },
    { id: 'e-9', fromNodeId: nCam.id, fromPortId: 'camera_out', toNodeId: nRender.id, toPortId: 'camera_in', portType: 'camera' },
    { id: 'e-10', fromNodeId: nRender.id, fromPortId: 'scene_out', toNodeId: nNext.id, toPortId: 'scene_in', portType: 'scene' },
    { id: 'e-11', fromNodeId: nRender.id, fromPortId: 'media_out', toNodeId: nNext.id, toPortId: 'media_in', portType: 'media' },
    { id: 'e-12', fromNodeId: nDirector.id, fromPortId: 'director_out', toNodeId: nNext.id, toPortId: 'director_in', portType: 'director' },
    { id: 'e-13', fromNodeId: nCam.id, fromPortId: 'camera_out', toNodeId: nNext.id, toPortId: 'camera_in', portType: 'camera' },
    { id: 'e-14', fromNodeId: nNext.id, fromPortId: 'prompt_out', toNodeId: nRender2.id, toPortId: 'prompt_in', portType: 'prompt' },
    { id: 'e-15', fromNodeId: nNext.id, fromPortId: 'media_out', toNodeId: nRender2.id, toPortId: 'media_in', portType: 'media' },
  ];

  return {
    nodes: [nImg, nVid, nAnalyze, nDirector, nCam, nCodex, nRender, nNext, nRender2],
    edges,
  };
}

function getPortPosition(node: WorkflowNode, portId: string, side: 'input' | 'output'): { x: number; y: number } {
  const def = NODE_PORT_DEFINITIONS[node.kind];
  const list = side === 'input' ? def.inputs : def.outputs;
  const idx = Math.max(0, list.findIndex((p) => p.id === portId));
  return {
    x: side === 'input' ? node.x : node.x + NODE_WIDTH,
    y: node.y + PORT_START_Y + idx * PORT_ROW_H,
  };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(55, Math.abs(x2 - x1) * 0.52);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export const WorkflowNodeGraph: React.FC<WorkflowNodeGraphProps> = ({
  externalPaintedImageUrl,
  onConsumePaintedImage,
  onSendImagesToSeedanceSlide4,
  onStatusNotice,
}) => {
  const starter = useMemo(() => createCinemaMasterTemplate(), []);
  const [nodes, setNodes] = useState<WorkflowNode[]>(starter.nodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(starter.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-render-1');

  // Canvas viewport transform
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 24 });
  const [zoom, setZoom] = useState<number>(0.76);
  const [isSpaceHeld, setIsSpaceHeld] = useState<boolean>(false);

  // Live drag states
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ startClientX: number; startClientY: number; startNodeX: number; startNodeY: number } | null>(null);
  const panDragRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number } | null>(null);

  // Wire connection state (connecting dots)
  const [connectingWire, setConnectingWire] = useState<{
    fromNodeId: string;
    fromPortId: string;
    portType: WorkflowPortType;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  // Live API Sync state (ByteDance ModelArk /api/ai/models & /api/ai/health)
  const [catalog, setCatalog] = useState<ByteDanceModelsCatalogResponse | null>(null);
  const [health, setHealth] = useState<SeedanceHealthStatus | null>(null);
  const [isSyncingBackend, setIsSyncingBackend] = useState<boolean>(false);

  // Async per-node busy states
  const [busyNodeIds, setBusyNodeIds] = useState<Record<string, string>>({});
  const [rightPanelTab, setRightPanelTab] = useState<'inspector' | 'codex' | 'payload'>('inspector');
  const [isRightOpen, setIsRightOpen] = useState<boolean>(true);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState<boolean>(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const flowFileInputRef = useRef<HTMLInputElement | null>(null);
  const activePollsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const notify = useCallback(
    (msg: string, isError = false) => {
      onStatusNotice?.(msg, isError);
    },
    [onStatusNotice]
  );

  // Cleanup active polls on unmount
  useEffect(() => {
    return () => {
      activePollsRef.current.forEach((timer) => clearInterval(timer));
      activePollsRef.current.clear();
    };
  }, []);

  // Fetch synced ByteDance ModelArk backend models & health
  const syncWithByteDanceBackend = useCallback(async () => {
    setIsSyncingBackend(true);
    try {
      const [catRes, healthRes] = await Promise.all([
        seedanceLabService.getModelsCatalog(),
        seedanceLabService.getHealth(),
      ]);
      if (catRes) setCatalog(catRes);
      if (healthRes) setHealth(healthRes);
    } finally {
      setIsSyncingBackend(false);
    }
  }, []);

  useEffect(() => {
    syncWithByteDanceBackend();
  }, [syncWithByteDanceBackend]);

  // Receive painted storyboard frame pushed from Plate Painter tab
  useEffect(() => {
    if (!externalPaintedImageUrl) return;
    const targetImgNode = nodes.find((n) => n.kind === 'image_input');
    if (targetImgNode) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === targetImgNode.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  imageUrls: [...(n.data.imageUrls || []), externalPaintedImageUrl].slice(0, 30),
                },
              }
            : n
        )
      );
      setSelectedNodeId(targetImgNode.id);
    } else {
      const created: WorkflowNode = {
        id: uid('node-img'),
        kind: 'image_input',
        x: 80,
        y: 80,
        data: { ...getDefaultNodeData('image_input'), imageUrls: [externalPaintedImageUrl] },
      };
      setNodes((prev) => [...prev, created]);
      setSelectedNodeId(created.id);
    }
    notify('Canvas painted frame imported into Image Plate (@Image) node.');
    onConsumePaintedImage?.();
  }, [externalPaintedImageUrl, nodes, notify, onConsumePaintedImage]);

  // Spacebar pan listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const updateNodeData = useCallback((nodeId: string, patch: Partial<WorkflowNode['data']>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
    );
  }, []);

  // Convert screen coordinates to graph coordinates
  const screenToGraph = useCallback(
    (clientX: number, clientY: number) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Graph upstream resolution helper (gathers all connected data flowing into a node)
  const resolveUpstreamContext = useCallback(
    (targetNodeId: string, visited = new Set<string>()): {
      images: string[];
      videos: string[];
      videoFrames: string[];
      firstFrameUrl?: string;
      lastFrameUrl?: string;
      prompts: string[];
      director?: {
        name: string;
        contrastRatio: string;
        directive: string;
        treatment?: string;
        beatSheet?: string[];
      };
      camera?: {
        movementLabel: string;
        movementKeyword: string;
        filmStockSpec: string;
        focalLengthMm: number;
        speed: string;
        cameraFixed: boolean;
      };
      previousScene?: {
        nodeId: string;
        prompt: string;
        videoUrl?: string;
        lastFrameUrl?: string;
      };
    } => {
      if (visited.has(targetNodeId)) {
        return { images: [], videos: [], videoFrames: [], prompts: [] };
      }
      visited.add(targetNodeId);

      const incoming = edges.filter((e) => e.toNodeId === targetNodeId);
      const images: string[] = [];
      const videos: string[] = [];
      const videoFrames: string[] = [];
      let firstFrameUrl: string | undefined;
      let lastFrameUrl: string | undefined;
      const prompts: string[] = [];
      let director: ReturnType<typeof resolveUpstreamContext>['director'];
      let camera: ReturnType<typeof resolveUpstreamContext>['camera'];
      let previousScene: ReturnType<typeof resolveUpstreamContext>['previousScene'];

      for (const edge of incoming) {
        const src = nodes.find((n) => n.id === edge.fromNodeId);
        if (!src) continue;

        if (src.kind === 'image_input') {
          const urls = src.data.imageUrls || [];
          images.push(...urls);
          if (src.data.imageRole === 'first_frame' && urls[0] && !firstFrameUrl) firstFrameUrl = urls[0];
          if (src.data.imageRole === 'last_frame' && urls[0] && !lastFrameUrl) lastFrameUrl = urls[0];
        } else if (src.kind === 'video_input') {
          if (src.data.videoUrl) videos.push(src.data.videoUrl);
          if (src.data.videoFrames?.length) videoFrames.push(...src.data.videoFrames);
          if (src.data.videoExtractedLastFrameUrl && !firstFrameUrl) {
            firstFrameUrl = src.data.videoExtractedLastFrameUrl;
          }
        } else if (src.kind === 'media_analyzer') {
          const nested = resolveUpstreamContext(src.id, new Set(visited));
          images.push(...nested.images);
          videos.push(...nested.videos);
          videoFrames.push(...nested.videoFrames);
          if (!firstFrameUrl && nested.firstFrameUrl) firstFrameUrl = nested.firstFrameUrl;
          if (!lastFrameUrl && nested.lastFrameUrl) lastFrameUrl = nested.lastFrameUrl;
          if (edge.fromPortId === 'prompt_out' && src.data.analyzedPrompt?.trim()) {
            prompts.push(src.data.analyzedPrompt.trim());
          }
        } else if (src.kind === 'scene_director') {
          const profile =
            SCENE_DIRECTORS.find((d) => d.id === src.data.directorId) || SCENE_DIRECTORS[0];
          director = {
            name: profile.name,
            contrastRatio: src.data.contrastRatio || profile.contrastRatio,
            directive: [profile.promptDirective, src.data.directorNotes?.trim()].filter(Boolean).join(' '),
            treatment: src.data.directorTreatment,
            beatSheet: src.data.directorBeatSheet,
          };
        } else if (src.kind === 'camera_film_rig') {
          const move =
            CAMERA_MOVEMENTS.find((m) => m.id === src.data.cameraMovementId) || CAMERA_MOVEMENTS[0];
          const stock =
            FILM_STOCK_LENSES.find((f) => f.id === src.data.filmStockId) || FILM_STOCK_LENSES[0];
          camera = {
            movementLabel: move.label,
            movementKeyword: move.seedanceKeyword,
            filmStockSpec: stock.spec,
            focalLengthMm: src.data.focalLengthMm || 35,
            speed: src.data.cameraSpeed || move.speedDefault,
            cameraFixed: typeof src.data.cameraFixed === 'boolean' ? src.data.cameraFixed : move.cameraFixed,
          };
        } else if (src.kind === 'seedance_knowledge') {
          const ids = src.data.selectedKnowledgeIds || [];
          const snippets = SEEDANCE_KNOWLEDGE_PATTERNS.filter((p) => ids.includes(p.id)).map((p) => p.snippet);
          if (src.data.customKnowledgeSnippet?.trim()) snippets.push(src.data.customKnowledgeSnippet.trim());
          if (snippets.length > 0) prompts.push(snippets.join(' '));
        } else if (src.kind === 'seedance_render') {
          if (src.data.resultVideoUrl) videos.push(src.data.resultVideoUrl);
          if (src.data.resultLastFrameUrl) {
            images.push(src.data.resultLastFrameUrl);
            if (!firstFrameUrl) firstFrameUrl = src.data.resultLastFrameUrl;
          }
          const nested = resolveUpstreamContext(src.id, new Set(visited));
          const fallbackPrompt = src.data.customPrompt?.trim() || nested.prompts.join(' ');
          previousScene = {
            nodeId: src.id,
            prompt: fallbackPrompt,
            videoUrl: src.data.resultVideoUrl,
            lastFrameUrl: src.data.resultLastFrameUrl,
          };
        } else if (src.kind === 'next_scene_continuity') {
          if (src.data.capturedLastFrameUrl) {
            images.unshift(src.data.capturedLastFrameUrl);
            firstFrameUrl = src.data.capturedLastFrameUrl;
          }
          if (edge.fromPortId === 'prompt_out' && src.data.nextScenePrompt?.trim()) {
            prompts.push(src.data.nextScenePrompt.trim());
          }
        }
      }

      return {
        images: Array.from(new Set(images)).slice(0, 30),
        videos: Array.from(new Set(videos)),
        videoFrames: Array.from(new Set(videoFrames)).slice(0, 8),
        firstFrameUrl,
        lastFrameUrl,
        prompts,
        director,
        camera,
        previousScene,
      };
    },
    [edges, nodes]
  );

  // Build final ModelArk compiled request preview for a render node
  const compileRenderPayload = useCallback(
    (renderNode: WorkflowNode) => {
      const upstream = resolveUpstreamContext(renderNode.id);
      const userPrompt = renderNode.data.customPrompt?.trim() || '';
      const allPromptBlocks: string[] = [];

      if (userPrompt) allPromptBlocks.push(userPrompt);
      if (upstream.prompts.length > 0) allPromptBlocks.push(...upstream.prompts);
      if (upstream.director) {
        allPromptBlocks.push(
          upstream.director.treatment?.trim() ||
            `[Director: ${upstream.director.name} · ${upstream.director.contrastRatio}] ${upstream.director.directive}`
        );
        if (upstream.director.beatSheet?.length) {
          allPromptBlocks.push(upstream.director.beatSheet.join(' '));
        }
      }
      if (upstream.camera) {
        allPromptBlocks.push(
          `[Camera & Film Optics]: ${upstream.camera.focalLengthMm}mm lens on ${upstream.camera.filmStockSpec}. Camera Motion (${upstream.camera.speed}): ${upstream.camera.movementKeyword}.`
        );
      }

      const combinedPrompt = allPromptBlocks.filter(Boolean).join('\n\n').trim();
      const modelKey = renderNode.data.modelKey || 'seedance_25_15s';
      const syncedModelMeta = catalog?.models.find((m) => m.key === modelKey);

      return {
        model: modelKey,
        resolvedUpstreamModel: syncedModelMeta?.resolvedUpstreamModelId || SEEDANCE_MODELS[modelKey as keyof typeof SEEDANCE_MODELS]?.id || modelKey,
        prompt: combinedPrompt,
        aspect_ratio: renderNode.data.aspectRatio || '16:9',
        duration: renderNode.data.durationSeconds || 15,
        resolution: renderNode.data.resolution || '720P',
        sound_enabled: renderNode.data.soundEnabled !== false,
        camera_fixed: upstream.camera?.cameraFixed ?? false,
        physics_priority: renderNode.data.physicsPriority !== false,
        content_rating: renderNode.data.contentRating === '18+' ? '18+' : 'standard',
        reference_image_urls: upstream.images,
        image_url: upstream.firstFrameUrl || upstream.images[0],
        end_image_url: upstream.lastFrameUrl,
        video_url: upstream.videos[0],
        upstream,
      };
    },
    [resolveUpstreamContext, catalog]
  );

  // Action 1: Run Media Prompt Analyzer (Reads connected Images + Videos)
  const runMediaAnalyzer = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const upstream = resolveUpstreamContext(nodeId);
    if (upstream.images.length === 0 && upstream.videos.length === 0 && upstream.videoFrames.length === 0) {
      notify('Connect an Image Plate or Video Clip dot into Vision Prompt Reader first.', true);
      return;
    }

    setBusyNodeIds((p) => ({ ...p, [nodeId]: 'Reading frames & motion...' }));
    try {
      let framesToAnalyze = [...upstream.videoFrames];
      // If upstream video exists without sampled frames yet, try extracting client-side keyframes
      if (framesToAnalyze.length === 0 && upstream.videos[0]) {
        try {
          const extracted = await extractVideoKeyframes(upstream.videos[0], 4);
          framesToAnalyze = extracted.frames;
        } catch {
          // Will fall back to sending video URL directly to server
        }
      }

      const result = await seedanceLabService.analyzeMediaPrompt({
        images: upstream.images,
        videos: upstream.videos,
        videoFrames: framesToAnalyze,
        userNotes: node.data.analyzerNotes || '',
        directorStyle: upstream.director?.name || 'Chiaroscuro Noir Auteur',
        cameraMovement: upstream.camera?.movementLabel || 'Smooth Push-In (Dolly In)',
        durationSeconds: 15,
        physicsPriority: true,
      });

      updateNodeData(nodeId, {
        analyzedPrompt: result.analyzedPrompt,
        analyzedNegative: result.negativePrompt,
        detectedSubjects: result.detectedSubjects,
        environmentAndLighting: result.environmentAndLighting,
        cameraMotionAnalysis: result.cameraMotionAnalysis,
        physicsDynamics: result.physicsDynamics,
        continuityAnchors: result.continuityAnchors,
        analyzerEngine: result.engineUsed,
      });
      setSelectedNodeId(nodeId);
      notify('Analyzed image & video streams into Seedance 2.5 prompt.');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Media prompt analysis failed.', true);
    } finally {
      setBusyNodeIds((p) => {
        const next = { ...p };
        delete next[nodeId];
        return next;
      });
    }
  };

  // Action 2: Run Scene Director AI Treatment
  const runDirectorTreatment = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const profile = SCENE_DIRECTORS.find((d) => d.id === node.data.directorId) || SCENE_DIRECTORS[0];
    const upstream = resolveUpstreamContext(nodeId);
    setBusyNodeIds((p) => ({ ...p, [nodeId]: 'Directing beat sheet...' }));
    try {
      const res = await seedanceLabService.runSceneDirector({
        directorName: profile.name,
        directorManifesto: profile.promptDirective,
        sceneConcept: [node.data.directorNotes, ...upstream.prompts].filter(Boolean).join(' '),
        cameraMovement: upstream.camera?.movementLabel || 'Smooth Dolly Push-In',
        filmStock: upstream.camera?.filmStockSpec || FILM_STOCK_LENSES[0].label,
        contrastRatio: node.data.contrastRatio || profile.contrastRatio,
        durationSeconds: 15,
      });
      updateNodeData(nodeId, {
        directorTreatment: res.directorTreatment,
        directorBeatSheet: res.beatSheet,
      });
      setSelectedNodeId(nodeId);
      notify(`Scene Director breakdown generated (${profile.name}).`);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Scene Director failed.', true);
    } finally {
      setBusyNodeIds((p) => {
        const next = { ...p };
        delete next[nodeId];
        return next;
      });
    }
  };

  // Action 3: Generate Flawless Zero-Mistake Next Scene Continuity
  const runNextSceneContinuity = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const upstream = resolveUpstreamContext(nodeId);

    setBusyNodeIds((p) => ({ ...p, [nodeId]: 'Locking final frame & continuity...' }));
    try {
      let lockedLastFrameUrl =
        node.data.capturedLastFrameUrl ||
        upstream.previousScene?.lastFrameUrl ||
        upstream.firstFrameUrl ||
        upstream.images[0] ||
        '';

      // Extract exact last frame from upstream video if we don't have a frame URL yet
      const sourceVideoUrl = upstream.previousScene?.videoUrl || upstream.videos[0];
      if (!lockedLastFrameUrl && sourceVideoUrl) {
        const frameDataUrl = await extractExactLastFrame(sourceVideoUrl);
        lockedLastFrameUrl = await seedanceLabService.uploadMedia(
          frameDataUrl,
          `continuity_last_frame_${Date.now()}.jpg`
        );
      }

      if (!lockedLastFrameUrl) {
        throw new Error(
          'Connect a completed Scene Render or Image/Video dot with an extracted final frame first.'
        );
      }

      const result = await seedanceLabService.continueNextScene({
        previousPrompt: upstream.previousScene?.prompt || upstream.prompts.join(' '),
        lastFrameUrl: lockedLastFrameUrl,
        additionalRefUrls: upstream.images,
        nextActionIntent: node.data.nextActionIntent || '',
        directorStyle: upstream.director?.name || 'Continuous Long-Take Virtuoso',
        cameraMovement: upstream.camera?.movementLabel || 'Smooth Push-In (Dolly In)',
        filmStock: upstream.camera?.filmStockSpec || FILM_STOCK_LENSES[0].label,
        durationSeconds: 15,
        physicsPriority: true,
      });

      updateNodeData(nodeId, {
        capturedLastFrameUrl: lockedLastFrameUrl,
        nextScenePrompt: result.nextScenePrompt,
        continuityChecklist: result.continuityChecklist,
        continuityEngine: result.engineUsed,
      });
      setSelectedNodeId(nodeId);
      notify('Locked exact final frame & generated zero-mistake Next Scene prompt.');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Next Scene continuity generation failed.', true);
    } finally {
      setBusyNodeIds((p) => {
        const next = { ...p };
        delete next[nodeId];
        return next;
      });
    }
  };

  // Action 4: Execute Real ByteDance ModelArk Render from Seedance Render Node
  const runSeedanceRender = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const compiled = compileRenderPayload(node);
    if (!compiled.prompt.trim()) {
      notify('Write a prompt or connect upstream Prompt / Director / Analyzer nodes before rendering.', true);
      return;
    }

    // Clear existing poller if any
    const prevTimer = activePollsRef.current.get(nodeId);
    if (prevTimer) clearInterval(prevTimer);

    updateNodeData(nodeId, {
      renderStatus: 'submitting',
      renderProgress: 10,
      renderError: undefined,
    });

    try {
      const submission = await seedanceLabService.submitGeneration({
        model: compiled.model,
        prompt: compiled.prompt,
        aspect_ratio: compiled.aspect_ratio,
        duration: compiled.duration,
        resolution: compiled.resolution,
        sound_enabled: compiled.sound_enabled,
        camera_fixed: compiled.camera_fixed,
        physics_priority: compiled.physics_priority,
        content_rating: compiled.content_rating,
        reference_image_urls: compiled.reference_image_urls,
        image_url: compiled.image_url,
        end_image_url: compiled.end_image_url,
        video_url: compiled.video_url,
      });

      if (submission.immediateResultUrl) {
        updateNodeData(nodeId, {
          jobCode: submission.jobCode,
          upstreamModelUsed: submission.upstreamModel,
          renderStatus: 'completed',
          renderProgress: 100,
          resultVideoUrl: submission.immediateResultUrl,
        });
        notify('Seedance ModelArk synthesis completed.');
        return;
      }

      updateNodeData(nodeId, {
        jobCode: submission.jobCode,
        upstreamModelUsed: submission.upstreamModel,
        renderStatus: 'processing',
        renderProgress: 25,
      });

      const pollTimer = setInterval(async () => {
        try {
          const st = await seedanceLabService.pollJobStatus(submission.jobCode);
          if (st.status === 'completed' && st.resultUrl) {
            clearInterval(pollTimer);
            activePollsRef.current.delete(nodeId);
            updateNodeData(nodeId, {
              renderStatus: 'completed',
              renderProgress: 100,
              resultVideoUrl: st.resultUrl,
              resultLastFrameUrl: st.lastFrameUrl || undefined,
            });
            notify(`Scene render ${submission.jobCode} completed.`);
          } else if (st.status === 'failed') {
            clearInterval(pollTimer);
            activePollsRef.current.delete(nodeId);
            updateNodeData(nodeId, {
              renderStatus: 'failed',
              renderProgress: 0,
              renderError: st.error || 'Upstream ByteDance ModelArk failed.',
            });
            notify(st.error || 'Upstream ByteDance ModelArk failed.', true);
          } else {
            updateNodeData(nodeId, {
              renderStatus: 'processing',
              renderProgress: st.progress || 50,
            });
          }
        } catch {
          // Transient poll retry
        }
      }, 3200);

      activePollsRef.current.set(nodeId, pollTimer);
    } catch (err: unknown) {
      updateNodeData(nodeId, {
        renderStatus: 'failed',
        renderProgress: 0,
        renderError: err instanceof Error ? err.message : 'Generation request rejected.',
      });
      notify(err instanceof Error ? err.message : 'Generation submission failed.', true);
    }
  };

  // Helper: Spawn & auto-wire a chained Next Scene + Scene N+1 Render directly downstream
  const spawnChainedNextScene = async (fromRenderNodeId: string) => {
    const src = nodes.find((n) => n.id === fromRenderNodeId);
    if (!src) return;

    let lastFrameUrl = src.data.resultLastFrameUrl || '';
    if (!lastFrameUrl && src.data.resultVideoUrl) {
      try {
        const frameData = await extractExactLastFrame(src.data.resultVideoUrl);
        lastFrameUrl = await seedanceLabService.uploadMedia(frameData, `chain_frame_${Date.now()}.jpg`);
      } catch {
        // Proceed with Continuity node even if cross-origin prevents frame capture
      }
    }

    const nextContId = uid('node-next');
    const nextRenderId = uid('node-render');
    const nextContNode: WorkflowNode = {
      id: nextContId,
      kind: 'next_scene_continuity',
      x: src.x + 360,
      y: src.y,
      data: {
        ...getDefaultNodeData('next_scene_continuity'),
        capturedLastFrameUrl: lastFrameUrl || undefined,
        nextActionIntent: 'Continue seamlessly with sustained physical momentum and zero lighting shift.',
      },
    };
    const nextRenderNode: WorkflowNode = {
      id: nextRenderId,
      kind: 'seedance_render',
      x: src.x + 720,
      y: src.y,
      data: {
        ...getDefaultNodeData('seedance_render'),
        title: `Sequel · ${src.data.title || 'Scene'}`,
        aspectRatio: src.data.aspectRatio || '16:9',
        modelKey: src.data.modelKey || 'seedance_25_15s',
        physicsPriority: src.data.physicsPriority !== false,
        contentRating: src.data.contentRating || 'standard',
      },
    };

    const newEdges: WorkflowEdge[] = [
      { id: uid('edge'), fromNodeId: src.id, fromPortId: 'scene_out', toNodeId: nextContId, toPortId: 'scene_in', portType: 'scene' },
      { id: uid('edge'), fromNodeId: src.id, fromPortId: 'media_out', toNodeId: nextContId, toPortId: 'media_in', portType: 'media' },
      { id: uid('edge'), fromNodeId: nextContId, fromPortId: 'prompt_out', toNodeId: nextRenderId, toPortId: 'prompt_in', portType: 'prompt' },
      { id: uid('edge'), fromNodeId: nextContId, fromPortId: 'media_out', toNodeId: nextRenderId, toPortId: 'media_in', portType: 'media' },
    ];

    setNodes((prev) => [...prev, nextContNode, nextRenderNode]);
    setEdges((prev) => [...prev, ...newEdges]);
    setSelectedNodeId(nextContId);
    notify('Spawned & wired chained Next-Scene Continuity + Render nodes.');
  };

  // Upload images directly onto an image_input node
  const handleUploadImagesToNode = async (nodeId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const existing = node.data.imageUrls || [];
    const remaining = Math.max(0, 30 - existing.length);
    const chosen = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, remaining);
    if (chosen.length === 0) return;

    setBusyNodeIds((p) => ({ ...p, [nodeId]: 'Uploading plates...' }));
    try {
      const uploaded: string[] = [];
      for (const file of chosen) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const hosted = await seedanceLabService.uploadMedia(dataUrl, file.name);
        uploaded.push(hosted);
      }
      updateNodeData(nodeId, { imageUrls: [...existing, ...uploaded].slice(0, 30) });
      notify(`Uploaded ${uploaded.length} reference plate(s) to node.`);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Image upload failed.', true);
    } finally {
      setBusyNodeIds((p) => {
        const next = { ...p };
        delete next[nodeId];
        return next;
      });
    }
  };

  // Upload video directly onto a video_input node & auto-sample keyframes
  const handleUploadVideoToNode = async (nodeId: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith('video/')) return;
    setBusyNodeIds((p) => ({ ...p, [nodeId]: 'Uploading & sampling video...' }));
    try {
      const blobUrl = URL.createObjectURL(file);
      let sampledFrames: string[] = [];
      let lastFramePublicUrl: string | undefined;
      try {
        const extracted = await extractVideoKeyframes(blobUrl, 4);
        sampledFrames = extracted.frames;
        if (extracted.lastFrameDataUrl) {
          lastFramePublicUrl = await seedanceLabService.uploadMedia(
            extracted.lastFrameDataUrl,
            `video_last_frame_${Date.now()}.jpg`
          );
        }
      } catch {
        // Non-fatal
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const hostedVideoUrl = await seedanceLabService.uploadMedia(dataUrl, file.name);
      updateNodeData(nodeId, {
        videoUrl: hostedVideoUrl,
        videoFrames: sampledFrames,
        videoExtractedLastFrameUrl: lastFramePublicUrl,
      });
      notify(`Loaded video clip with ${sampledFrames.length} sampled keyframes for AI Vision Prompt Reading.`);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Video upload failed.', true);
    } finally {
      setBusyNodeIds((p) => {
        const next = { ...p };
        delete next[nodeId];
        return next;
      });
    }
  };

  // Pointer interactions on stage
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node-card="true"]') || target.closest('[data-graph-ui="true"]')) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    panDragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (panDragRef.current) {
      setPan({
        x: panDragRef.current.startPanX + (e.clientX - panDragRef.current.startClientX),
        y: panDragRef.current.startPanY + (e.clientY - panDragRef.current.startClientY),
      });
      return;
    }

    if (draggingNodeId && dragOffsetRef.current) {
      const dx = (e.clientX - dragOffsetRef.current.startClientX) / zoom;
      const dy = (e.clientY - dragOffsetRef.current.startClientY) / zoom;
      const nx = Math.round(dragOffsetRef.current.startNodeX + dx);
      const ny = Math.round(dragOffsetRef.current.startNodeY + dy);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: nx, y: ny } : n))
      );
      return;
    }

    if (connectingWire) {
      const pt = screenToGraph(e.clientX, e.clientY);
      setConnectingWire((prev) => (prev ? { ...prev, currX: pt.x, currY: pt.y } : null));
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    panDragRef.current = null;
    setDraggingNodeId(null);
    dragOffsetRef.current = null;
    if (connectingWire) {
      setConnectingWire(null);
    }
  };

  const completeWireToInputDot = (
    e: React.PointerEvent,
    targetNodeId: string,
    targetPortId: string,
    targetPortType: WorkflowPortType
  ) => {
    e.stopPropagation();
    if (!connectingWire) return;
    if (connectingWire.fromNodeId === targetNodeId) {
      setConnectingWire(null);
      return;
    }
    if (connectingWire.portType !== targetPortType) {
      notify(`Port mismatch: cannot connect ${connectingWire.portType} dot to ${targetPortType} dot.`, true);
      setConnectingWire(null);
      return;
    }

    const exists = edges.some(
      (ed) =>
        ed.fromNodeId === connectingWire.fromNodeId &&
        ed.fromPortId === connectingWire.fromPortId &&
        ed.toNodeId === targetNodeId &&
        ed.toPortId === targetPortId
    );
    if (!exists) {
      setEdges((prev) => [
        ...prev,
        {
          id: uid('edge'),
          fromNodeId: connectingWire.fromNodeId,
          fromPortId: connectingWire.fromPortId,
          toNodeId: targetNodeId,
          toPortId: targetPortId,
          portType: targetPortType,
        },
      ]);
    }
    setConnectingWire(null);
  };

  const addNodeAtCenter = (kind: WorkflowNodeKind) => {
    const rect = stageRef.current?.getBoundingClientRect();
    const cx = rect ? (rect.width / 2 - pan.x) / zoom - NODE_WIDTH / 2 : 300;
    const cy = rect ? (rect.height / 2 - pan.y) / zoom - 80 : 200;
    const created: WorkflowNode = {
      id: uid(`node-${kind}`),
      kind,
      x: Math.round(cx + (Math.random() - 0.5) * 80),
      y: Math.round(cy + (Math.random() - 0.5) * 60),
      data: getDefaultNodeData(kind),
    };
    setNodes((prev) => [...prev, created]);
    setSelectedNodeId(created.id);
    setIsAddMenuOpen(false);
    setIsRightOpen(true);
  };

  const deleteNode = (nodeId: string) => {
    const timer = activePollsRef.current.get(nodeId);
    if (timer) clearInterval(timer);
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((ed) => ed.fromNodeId !== nodeId && ed.toNodeId !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId('');
    }
  };

  const fitAllNodes = () => {
    if (nodes.length === 0 || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map((n) => n.x)) - 40;
    const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH)) + 40;
    const minY = Math.min(...nodes.map((n) => n.y)) - 40;
    const maxY = Math.max(...nodes.map((n) => n.y + 240)) + 40;
    const spanW = Math.max(400, maxX - minX);
    const spanH = Math.max(300, maxY - minY);
    const nextZoom = Math.max(0.32, Math.min(1.15, Math.min(rect.width / spanW, rect.height / spanH)));
    setZoom(Number(nextZoom.toFixed(2)));
    setPan({
      x: Math.round((rect.width - spanW * nextZoom) / 2 - minX * nextZoom),
      y: Math.round((rect.height - spanH * nextZoom) / 2 - minY * nextZoom),
    });
  };

  const exportWorkflowJson = () => {
    const snap: WorkflowGraphSnapshot = {
      version: 2,
      app: 'VaiByte Canvas Studio',
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaibyte_workflow_${Date.now()}.vaibyte-flow.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Saved node workflow (.vaibyte-flow.json).');
  };

  const importWorkflowJson = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error('Invalid VaiByte flow file.');
      }
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setSelectedNodeId(parsed.nodes[0]?.id || '');
      notify('Loaded VaiByte node workflow.');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Failed to load workflow file.', true);
    } finally {
      if (flowFileInputRef.current) flowFileInputRef.current.value = '';
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedRenderCompiled =
    selectedNode?.kind === 'seedance_render' ? compileRenderPayload(selectedNode) : null;

  const knowledge = catalog?.publishedKnowledge;

  return (
    <div className="relative flex-1 flex min-h-0 overflow-hidden bg-[#06070a]">
      {/* Left Toolbar: Add Nodes & Pipeline Templates */}
      <aside
        data-graph-ui="true"
        className="w-12 sm:w-52 bg-[#0b0d12] border-r border-white/[0.08] flex flex-col justify-between py-2.5 px-1.5 sm:px-2.5 shrink-0 z-10 overflow-y-auto no-scrollbar"
      >
        <div className="space-y-3">
          <div className="px-1.5 hidden sm:block">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">
              Node Palette
            </div>
            <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
              Drag dots to connect nodes left-to-right.
            </p>
          </div>

          <div className="space-y-1">
            {(Object.keys(NODE_PORT_DEFINITIONS) as WorkflowNodeKind[]).map((kind) => {
              const meta = NODE_PORT_DEFINITIONS[kind];
              const iconMap: Record<WorkflowNodeKind, React.ReactNode> = {
                image_input: <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
                video_input: <VideoIcon className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
                media_analyzer: <Eye className="w-3.5 h-3.5 text-white shrink-0" />,
                scene_director: <Clapperboard className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
                camera_film_rig: <Camera className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
                seedance_knowledge: <BookOpen className="w-3.5 h-3.5 text-white/80 shrink-0" />,
                seedance_render: <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
                next_scene_continuity: <GitBranch className="w-3.5 h-3.5 text-emerald-300 shrink-0" />,
              };
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addNodeAtCenter(kind)}
                  title={meta.subtitle}
                  className="w-full px-2 py-2 rounded-lg border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.08] hover:border-white/25 text-left flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {iconMap[kind]}
                  <div className="hidden sm:block min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-white truncate whitespace-nowrap">
                      {meta.label}
                    </div>
                  </div>
                  <Plus className="hidden sm:block w-3 h-3 text-white/40 shrink-0" />
                </button>
              );
            })}
          </div>

          <div className="hidden sm:block pt-2 border-t border-white/[0.08] space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/45 px-1">
              Quick Templates
            </div>
            <button
              type="button"
              onClick={() => {
                const tpl = createCinemaMasterTemplate();
                setNodes(tpl.nodes);
                setEdges(tpl.edges);
                setSelectedNodeId(tpl.nodes[6].id);
                setTimeout(fitAllNodes, 40);
                notify('Loaded Master Director + 2-Scene Continuity Pipeline.');
              }}
              className="w-full px-2.5 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] text-[11px] text-white/85 text-left cursor-pointer"
            >
              Reset Master Continuity Flow
            </button>
          </div>
        </div>

        {/* Live Backend Sync Card (Left bottom) */}
        <div className="hidden sm:block pt-2.5 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/50">
              ByteDance API
            </span>
            <button
              type="button"
              onClick={syncWithByteDanceBackend}
              disabled={isSyncingBackend}
              className="text-white/50 hover:text-white cursor-pointer"
              title="Re-sync /api/ai/models & /api/ai/health"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingBackend ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="p-2 rounded-lg border border-white/[0.08] bg-black/50 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between gap-1">
              <span className="text-white/45">Status</span>
              <span className={health?.upstreamConnected ? 'text-emerald-400' : 'text-amber-300'}>
                {health?.upstreamConnected
                  ? 'Connected'
                  : health?.serverKeyConfigured
                  ? 'Key Set'
                  : 'Key Needed'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-white/45">Model ID</span>
              <span className="text-white/85 truncate max-w-[110px]">
                {health?.activeSeedanceModel || 'seedance-2-5-260628'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-white/45">Catalog</span>
              <span className="text-white/85 tabular-nums">{catalog?.total_models ?? 9} Models</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Center Infinite Interactive Connecting-Dots Stage */}
      <div
        ref={stageRef}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.06 : -0.06;
            setZoom((z) => Math.max(0.28, Math.min(1.65, Number((z + delta).toFixed(2)))));
          }
        }}
        style={{
          touchAction: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: `${Math.round(24 * zoom)}px ${Math.round(24 * zoom)}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        className={`relative flex-1 overflow-hidden ${isSpaceHeld ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      >
        {/* Top Floating Controls Bar inside Stage */}
        <div
          data-graph-ui="true"
          className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-20"
        >
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0b0d12]/90 border border-white/[0.1] backdrop-blur-md pointer-events-auto">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.28, Number((z - 0.1).toFixed(2))))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono tabular-nums text-white/80 min-w-[46px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.65, Number((z + 0.1).toFixed(2))))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={fitAllNodes}
              className="h-7 px-2 rounded-lg text-[10px] font-mono text-white/75 hover:text-white hover:bg-white/[0.08] flex items-center gap-1 cursor-pointer whitespace-nowrap"
              title="Fit Entire Node Pipeline"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fit Graph</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen((v) => !v)}
              className="sm:hidden h-8 px-2.5 rounded-lg bg-[#0b0d12]/95 border border-white/15 text-[11px] font-mono text-white flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>

            <button
              type="button"
              onClick={() => flowFileInputRef.current?.click()}
              className="h-8 px-2.5 rounded-lg bg-[#0b0d12]/90 border border-white/[0.1] hover:bg-white/[0.08] text-[11px] font-mono text-white/80 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Load Flow</span>
            </button>
            <button
              type="button"
              onClick={exportWorkflowJson}
              className="h-8 px-2.5 rounded-lg bg-[#0b0d12]/90 border border-white/[0.1] hover:bg-white/[0.08] text-[11px] font-mono text-white/80 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Save Flow</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRightPanelTab('codex');
                setIsRightOpen(true);
              }}
              className="h-8 px-2.5 rounded-lg bg-[#0b0d12]/90 border border-white/[0.15] hover:bg-white/[0.1] text-[11px] font-mono text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Seedance 2.5 Codex</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRightOpen((v) => !v)}
              className="h-8 px-2.5 rounded-lg bg-white text-black font-mono text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isRightOpen ? 'Hide Inspector' : 'Inspector'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick Add Menu */}
        {isAddMenuOpen && (
          <div
            data-graph-ui="true"
            className="sm:hidden absolute top-14 right-3 w-60 rounded-xl bg-[#0b0d12] border border-white/15 p-2 space-y-1 z-30 shadow-2xl"
          >
            {(Object.keys(NODE_PORT_DEFINITIONS) as WorkflowNodeKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => addNodeAtCenter(kind)}
                className="w-full px-2.5 py-2 rounded-lg text-left text-xs text-white/85 hover:bg-white/10"
              >
                + {NODE_PORT_DEFINITIONS[kind].label}
              </button>
            ))}
          </div>
        )}

        {/* World-Transformed Layer containing Wires + Nodes */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* SVG Cubic Bezier Connecting Wires */}
          <svg
            width="6000"
            height="4000"
            viewBox="-1500 -1000 6000 4000"
            className="absolute -left-[1500px] -top-[1000px] overflow-visible pointer-events-none"
          >
            <g transform="translate(1500, 1000)">
              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
                const toNode = nodes.find((n) => n.id === edge.toNodeId);
                if (!fromNode || !toNode) return null;
                const p1 = getPortPosition(fromNode, edge.fromPortId, 'output');
                const p2 = getPortPosition(toNode, edge.toPortId, 'input');
                const strokeColor = PORT_TYPE_COLORS[edge.portType] || '#ffffff';
                const pathD = bezierPath(p1.x, p1.y, p2.x, p2.y);

                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer group">
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setEdges((prev) => prev.filter((item) => item.id !== edge.id));
                      }}
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={2.2}
                      strokeOpacity={0.72}
                      className="group-hover:stroke-red-400 transition-colors"
                    />
                  </g>
                );
              })}

              {/* Live In-Progress Drag Wire */}
              {connectingWire && (
                <path
                  d={bezierPath(
                    connectingWire.startX,
                    connectingWire.startY,
                    connectingWire.currX,
                    connectingWire.currY
                  )}
                  fill="none"
                  stroke={PORT_TYPE_COLORS[connectingWire.portType]}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                />
              )}
            </g>
          </svg>

          {/* Draggable Node Cards */}
          {nodes.map((node) => {
            const def = NODE_PORT_DEFINITIONS[node.kind];
            const isSelected = selectedNodeId === node.id;
            const busyMsg = busyNodeIds[node.id];
            const upstream = resolveUpstreamContext(node.id);
            const directorObj = SCENE_DIRECTORS.find((d) => d.id === node.data.directorId) || SCENE_DIRECTORS[0];
            const camObj = CAMERA_MOVEMENTS.find((m) => m.id === node.data.cameraMovementId) || CAMERA_MOVEMENTS[0];
            const stockObj = FILM_STOCK_LENSES.find((f) => f.id === node.data.filmStockId) || FILM_STOCK_LENSES[0];

            return (
              <div
                key={node.id}
                data-node-card="true"
                style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-no-drag="true"]')) return;
                  dragOffsetRef.current = {
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    startNodeX: node.x,
                    startNodeY: node.y,
                  };
                  setDraggingNodeId(node.id);
                }}
                className={`absolute rounded-xl bg-[#0d1017]/95 backdrop-blur-md border transition-colors pointer-events-auto shadow-2xl ${
                  isSelected ? 'border-white/70' : 'border-white/[0.12] hover:border-white/30'
                }`}
              >
                {/* Node Header */}
                <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">
                      {node.data.title || def.label}
                    </div>
                    <div className="text-[9px] font-mono text-white/45 truncate">
                      {def.label}
                    </div>
                  </div>
                  <button
                    type="button"
                    data-no-drag="true"
                    onClick={() => deleteNode(node.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-white/35 hover:text-red-400 hover:bg-white/[0.06] cursor-pointer shrink-0"
                    title="Delete node"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Ports Row Section (Left Input Dots · Right Output Dots) */}
                <div
                  className="relative py-2 px-3 space-y-1.5 border-b border-white/[0.06]"
                  style={{
                    minHeight:
                      Math.max(def.inputs.length, def.outputs.length, 1) * PORT_ROW_H + 10,
                  }}
                >
                  {def.inputs.map((inp, idx) => {
                    const dotColor = PORT_TYPE_COLORS[inp.type];
                    const hasEdge = edges.some(
                      (e) => e.toNodeId === node.id && e.toPortId === inp.id
                    );
                    return (
                      <div
                        key={inp.id}
                        style={{ top: 10 + idx * PORT_ROW_H }}
                        className="absolute left-0 flex items-center gap-1.5 -translate-x-1/2"
                      >
                        <button
                          type="button"
                          data-no-drag="true"
                          onPointerUp={(e) => completeWireToInputDot(e, node.id, inp.id, inp.type)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasEdge && !connectingWire) {
                              setEdges((prev) =>
                                prev.filter(
                                  (ed) => !(ed.toNodeId === node.id && ed.toPortId === inp.id)
                                )
                              );
                            }
                          }}
                          title={`${inp.label} (${inp.type}) — Drop wire here or click to unlink`}
                          style={{
                            borderColor: dotColor,
                            backgroundColor: hasEdge ? dotColor : '#090b10',
                          }}
                          className="w-3.5 h-3.5 rounded-full border-2 hover:scale-125 transition-transform cursor-crosshair"
                        />
                        <span className="text-[10px] font-mono text-white/65 pl-1 whitespace-nowrap">
                          {inp.label}
                        </span>
                      </div>
                    );
                  })}

                  {def.outputs.map((outp, idx) => {
                    const dotColor = PORT_TYPE_COLORS[outp.type];
                    return (
                      <div
                        key={outp.id}
                        style={{ top: 10 + idx * PORT_ROW_H }}
                        className="absolute right-0 flex items-center gap-1.5 translate-x-1/2"
                      >
                        <span className="text-[10px] font-mono text-white/65 pr-1 whitespace-nowrap">
                          {outp.label}
                        </span>
                        <button
                          type="button"
                          data-no-drag="true"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const pos = getPortPosition(node, outp.id, 'output');
                            setConnectingWire({
                              fromNodeId: node.id,
                              fromPortId: outp.id,
                              portType: outp.type,
                              startX: pos.x,
                              startY: pos.y,
                              currX: pos.x,
                              currY: pos.y,
                            });
                          }}
                          title={`Drag from ${outp.label} dot to connect`}
                          style={{ borderColor: dotColor, backgroundColor: dotColor }}
                          className="w-3.5 h-3.5 rounded-full border-2 border-white/20 hover:scale-125 transition-transform cursor-crosshair shadow"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Compact Node Summary + Primary Trigger Action */}
                <div data-no-drag="true" className="p-3 space-y-2 text-[11px]">
                  {busyMsg && (
                    <div className="px-2 py-1.5 rounded-lg bg-white/[0.08] border border-white/15 flex items-center gap-2 text-white">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="truncate font-mono text-[10px]">{busyMsg}</span>
                    </div>
                  )}

                  {node.kind === 'image_input' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/55">
                        <span>{(node.data.imageUrls || []).length} / 30 Plates</span>
                        <span className="uppercase">{node.data.imageRole || 'reference_image'}</span>
                      </div>
                      {(node.data.imageUrls || []).length > 0 && (
                        <div className="grid grid-cols-4 gap-1">
                          {(node.data.imageUrls || []).slice(0, 4).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Plate ${idx + 1}`}
                              className="w-full h-11 object-cover rounded border border-white/10"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      )}
                      <label className="w-full py-1.5 px-2 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-center text-[10px] font-mono text-white/85 block cursor-pointer">
                        + Upload Image(s)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleUploadImagesToNode(node.id, e.target.files)}
                        />
                      </label>
                    </div>
                  )}

                  {node.kind === 'video_input' && (
                    <div className="space-y-2">
                      {node.data.videoUrl ? (
                        <video
                          src={node.data.videoUrl}
                          muted
                          playsInline
                          controls
                          className="w-full h-24 rounded-lg bg-black object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-14 rounded-lg border border-dashed border-white/15 flex items-center justify-center text-[10px] font-mono text-white/40">
                          No video clip loaded
                        </div>
                      )}
                      <label className="w-full py-1.5 px-2 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-center text-[10px] font-mono text-white/85 block cursor-pointer">
                        + Upload Video Clip
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleUploadVideoToNode(node.id, e.target.files)}
                        />
                      </label>
                    </div>
                  )}

                  {node.kind === 'media_analyzer' && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-white/55">
                        Reads {upstream.images.length} image(s) · {upstream.videos.length} video(s)
                      </div>
                      {node.data.analyzedPrompt && (
                        <p className="text-[10px] text-white/75 line-clamp-3 leading-relaxed bg-black/40 p-2 rounded-lg border border-white/[0.08]">
                          {node.data.analyzedPrompt}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => runMediaAnalyzer(node.id)}
                        disabled={Boolean(busyMsg)}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-white text-black hover:bg-[#ECECE9] font-mono text-[10px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Read Image & Video → Prompt</span>
                      </button>
                    </div>
                  )}

                  {node.kind === 'scene_director' && (
                    <div className="space-y-2">
                      <div className="font-medium text-white truncate">{directorObj.name}</div>
                      <div className="text-[10px] font-mono text-white/50 truncate">
                        {directorObj.contrastRatio} · {directorObj.discipline}
                      </div>
                      <button
                        type="button"
                        onClick={() => runDirectorTreatment(node.id)}
                        disabled={Boolean(busyMsg)}
                        className="w-full py-1.5 px-2 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/[0.14] font-mono text-[10px] text-white flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Clapperboard className="w-3 h-3" />
                        <span>Direct Shot Breakdown</span>
                      </button>
                    </div>
                  )}

                  {node.kind === 'camera_film_rig' && (
                    <div className="space-y-1.5">
                      <div className="font-medium text-white truncate">{camObj.label}</div>
                      <div className="text-[10px] font-mono text-white/55 truncate">
                        {node.data.focalLengthMm || 35}mm · {stockObj.label.split('·')[0].trim()}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
                        <span className="text-white/45">camera_fixed</span>
                        <span className={node.data.cameraFixed ?? camObj.cameraFixed ? 'text-sky-400' : 'text-white/75'}>
                          {node.data.cameraFixed ?? camObj.cameraFixed ? 'TRUE (Locked)' : 'FALSE (Motion)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {node.kind === 'seedance_knowledge' && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-white/65 leading-snug">
                        Active ByteDance Seedance 2.5 Rules:{' '}
                        <span className="text-white font-mono">
                          {(node.data.selectedKnowledgeIds || []).length} enabled
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-white/45">
                        ModelArk v3 · Dual-Branch DiT
                      </div>
                    </div>
                  )}

                  {node.kind === 'seedance_render' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/60">
                        <span className="truncate">{node.data.modelKey || 'seedance_25_15s'}</span>
                        <span className="tabular-nums">
                          {node.data.aspectRatio || '16:9'} · {node.data.durationSeconds || 15}s
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                        <span>{node.data.contentRating === '18+' ? '18+ Mature' : 'Standard'}</span>
                        <span>{node.data.physicsPriority !== false ? 'Physics Priority' : 'Balanced'}</span>
                      </div>
                      {node.data.resultVideoUrl && (
                        <video
                          src={node.data.resultVideoUrl}
                          controls
                          playsInline
                          className="w-full h-28 rounded-lg bg-black object-cover border border-white/15"
                        />
                      )}
                      {node.data.renderError && (
                        <div className="p-1.5 rounded bg-red-950/50 border border-red-400/30 text-[10px] text-red-200 line-clamp-2">
                          {node.data.renderError}
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => runSeedanceRender(node.id)}
                          disabled={
                            node.data.renderStatus === 'submitting' ||
                            node.data.renderStatus === 'processing'
                          }
                          className="flex-1 py-1.5 px-2 rounded-lg bg-white text-black hover:bg-[#ECECE9] disabled:opacity-50 font-mono text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          {node.data.renderStatus === 'submitting' ||
                          node.data.renderStatus === 'processing' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>{node.data.renderProgress || 30}%</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Generate Video</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => spawnChainedNextScene(node.id)}
                          title="Spawn connected Next Scene Continuity + Sequel Render nodes"
                          className="px-2 py-1.5 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/[0.15] text-[10px] font-mono text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {node.kind === 'next_scene_continuity' && (
                    <div className="space-y-2">
                      {node.data.capturedLastFrameUrl ? (
                        <div className="relative">
                          <img
                            src={node.data.capturedLastFrameUrl}
                            alt="Locked First Frame"
                            className="w-full h-20 object-cover rounded-lg border border-emerald-400/40"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-300">
                            LOCKED FRAME-0
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-white/50 font-mono leading-snug">
                          Extracts final frame from Scene N and prevents zero-mistake continuity drift.
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => runNextSceneContinuity(node.id)}
                        disabled={Boolean(busyMsg)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white text-black hover:bg-[#ECECE9] font-mono text-[10px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>Build Zero-Mistake Next Scene</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Inspector / Seedance 2.5 Codex / Synced ModelArk Payload Drawer */}
      {isRightOpen && (
        <aside
          data-graph-ui="true"
          className="w-80 sm:w-96 bg-[#0b0d12] border-l border-white/[0.1] flex flex-col shrink-0 z-10 overflow-hidden"
        >
          {/* Drawer Tabs */}
          <div className="p-2 border-b border-white/[0.08] grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => setRightPanelTab('inspector')}
              className={`py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                rightPanelTab === 'inspector'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('codex')}
              className={`py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                rightPanelTab === 'codex'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Seedance Codex
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('payload')}
              className={`py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                rightPanelTab === 'payload'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              ModelArk API
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* TAB 1: NODE INSPECTOR */}
            {rightPanelTab === 'inspector' && (
              <>
                {!selectedNode ? (
                  <div className="py-12 text-center text-xs text-white/45 font-mono">
                    Select any node on the canvas to configure its parameters and wiring.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                        Node Title
                      </label>
                      <input
                        type="text"
                        value={selectedNode.data.title || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white/40"
                      />
                    </div>

                    {/* IMAGE INPUT INSPECTOR */}
                    {selectedNode.kind === 'image_input' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            ByteDance ModelArk Role
                          </label>
                          <select
                            value={selectedNode.data.imageRole || 'reference_image'}
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, {
                                imageRole: e.target.value as 'reference_image' | 'first_frame' | 'last_frame',
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-white/[0.12] text-xs text-white"
                          >
                            <option value="reference_image">reference_image (@Image1..30 Omni R2V)</option>
                            <option value="first_frame">first_frame (Exact Frame-0 Start Lock)</option>
                            <option value="last_frame">last_frame (End Keyframe Target)</option>
                          </select>
                        </div>

                        <label className="w-full py-2 px-3 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-center text-xs font-mono text-white block cursor-pointer">
                          Upload Reference Plates (Max 30)
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleUploadImagesToNode(selectedNode.id, e.target.files)}
                          />
                        </label>

                        {(selectedNode.data.imageUrls || []).length > 0 && (
                          <>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(selectedNode.data.imageUrls || []).map((url, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={url}
                                    alt={`@Image${idx + 1}`}
                                    className="w-full h-16 object-cover rounded border border-white/15"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute bottom-0.5 left-0.5 px-1 bg-black/80 text-[9px] font-mono text-white">
                                    @Image{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateNodeData(selectedNode.id, {
                                        imageUrls: (selectedNode.data.imageUrls || []).filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded bg-black/80 text-white/70 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            {onSendImagesToSeedanceSlide4 && (
                              <button
                                type="button"
                                onClick={() => onSendImagesToSeedanceSlide4(selectedNode.data.imageUrls || [])}
                                className="w-full py-2 px-3 rounded-lg border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Send Plates to Slide 4 Studio</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* VIDEO INPUT INSPECTOR */}
                    {selectedNode.kind === 'video_input' && (
                      <div className="space-y-3">
                        <label className="w-full py-2 px-3 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-center text-xs font-mono text-white block cursor-pointer">
                          Upload Video (MP4 / WebM / MOV)
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleUploadVideoToNode(selectedNode.id, e.target.files)}
                          />
                        </label>
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Or Paste Public HTTPS Video URL
                          </label>
                          <input
                            type="url"
                            value={selectedNode.data.videoUrl || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { videoUrl: e.target.value })}
                            placeholder="https://..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/[0.12] text-xs text-white"
                          />
                        </div>
                        {selectedNode.data.videoUrl && (
                          <button
                            type="button"
                            onClick={async () => {
                              setBusyNodeIds((p) => ({ ...p, [selectedNode.id]: 'Sampling frames...' }));
                              try {
                                const extracted = await extractVideoKeyframes(selectedNode.data.videoUrl!, 4);
                                const uploadedLast = extracted.lastFrameDataUrl
                                  ? await seedanceLabService.uploadMedia(
                                      extracted.lastFrameDataUrl,
                                      `vid_last_${Date.now()}.jpg`
                                    )
                                  : undefined;
                                updateNodeData(selectedNode.id, {
                                  videoFrames: extracted.frames,
                                  videoExtractedLastFrameUrl: uploadedLast,
                                });
                                notify(`Sampled ${extracted.frames.length} video keyframes & locked last frame.`);
                              } catch (err: unknown) {
                                notify(err instanceof Error ? err.message : 'Frame capture failed.', true);
                              } finally {
                                setBusyNodeIds((p) => {
                                  const next = { ...p };
                                  delete next[selectedNode.id];
                                  return next;
                                });
                              }
                            }}
                            className="w-full py-2 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-mono text-white cursor-pointer"
                          >
                            Extract Keyframes & Final Frame
                          </button>
                        )}
                      </div>
                    )}

                    {/* VISION PROMPT READER INSPECTOR */}
                    {selectedNode.kind === 'media_analyzer' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Analysis Guidance Notes
                          </label>
                          <textarea
                            rows={3}
                            value={selectedNode.data.analyzerNotes || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { analyzerNotes: e.target.value })}
                            placeholder="Focus on facial consistency, fabric flow, or specific camera action..."
                            className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white/40"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => runMediaAnalyzer(selectedNode.id)}
                          disabled={Boolean(busyNodeIds[selectedNode.id])}
                          className="w-full py-2 px-3 rounded-lg bg-white text-black hover:bg-[#ECECE9] font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Analyze Connected Media → Prompt</span>
                        </button>
                        {selectedNode.data.analyzedPrompt && (
                          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block">
                              Extracted Seedance 2.5 Prompt
                            </label>
                            <textarea
                              rows={6}
                              value={selectedNode.data.analyzedPrompt}
                              onChange={(e) =>
                                updateNodeData(selectedNode.id, { analyzedPrompt: e.target.value })
                              }
                              className="w-full px-2.5 py-2 rounded-lg bg-black/70 border border-white/[0.15] text-xs text-white leading-relaxed"
                            />
                            {selectedNode.data.detectedSubjects && (
                              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[11px] space-y-1">
                                <div className="font-mono text-[10px] text-white/45">DETECTED SUBJECTS</div>
                                <div className="text-white/80">{selectedNode.data.detectedSubjects}</div>
                                <div className="font-mono text-[10px] text-white/45 pt-1">CAMERA & PHYSICS</div>
                                <div className="text-white/80">{selectedNode.data.cameraMotionAnalysis} · {selectedNode.data.physicsDynamics}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SCENE DIRECTOR INSPECTOR */}
                    {selectedNode.kind === 'scene_director' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Scene Director Persona
                          </label>
                          <select
                            value={selectedNode.data.directorId || SCENE_DIRECTORS[0].id}
                            onChange={(e) => {
                              const found = SCENE_DIRECTORS.find((d) => d.id === e.target.value);
                              updateNodeData(selectedNode.id, {
                                directorId: e.target.value,
                                contrastRatio: found?.contrastRatio || '8:1',
                              });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                          >
                            {SCENE_DIRECTORS.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.contrastRatio})
                              </option>
                            ))}
                          </select>
                        </div>

                        {(() => {
                          const d =
                            SCENE_DIRECTORS.find((item) => item.id === selectedNode.data.directorId) ||
                            SCENE_DIRECTORS[0];
                          return (
                            <div className="p-2.5 rounded-lg bg-black/50 border border-white/[0.08] space-y-1 text-[11px]">
                              <div className="text-white font-medium">{d.discipline}</div>
                              <div className="text-white/60 leading-snug">{d.lightingDoctrine}</div>
                              <div className="text-[10px] font-mono text-white/45 pt-1">{d.pacingSignature}</div>
                            </div>
                          );
                        })()}

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Directorial Staging & Blocking Notes
                          </label>
                          <textarea
                            rows={3}
                            value={selectedNode.data.directorNotes || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { directorNotes: e.target.value })}
                            placeholder="Actor intention, emotional subtext, environmental cue..."
                            className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/[0.12] text-xs text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => runDirectorTreatment(selectedNode.id)}
                          disabled={Boolean(busyNodeIds[selectedNode.id])}
                          className="w-full py-2 px-3 rounded-lg bg-white text-black hover:bg-[#ECECE9] font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Clapperboard className="w-3.5 h-3.5" />
                          <span>Generate Director Treatment</span>
                        </button>

                        {selectedNode.data.directorTreatment && (
                          <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.1] space-y-2 text-[11px]">
                            <div className="text-white/85 leading-relaxed">
                              {selectedNode.data.directorTreatment}
                            </div>
                            {selectedNode.data.directorBeatSheet?.map((b, idx) => (
                              <div key={idx} className="text-[10px] font-mono text-white/60 border-t border-white/[0.06] pt-1">
                                {b}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* FILM & CAMERA MOVEMENT RIG INSPECTOR */}
                    {selectedNode.kind === 'camera_film_rig' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Seedance Camera Movement
                          </label>
                          <select
                            value={selectedNode.data.cameraMovementId || CAMERA_MOVEMENTS[0].id}
                            onChange={(e) => {
                              const found = CAMERA_MOVEMENTS.find((m) => m.id === e.target.value);
                              updateNodeData(selectedNode.id, {
                                cameraMovementId: e.target.value,
                                cameraSpeed: found?.speedDefault || 'Smooth',
                                cameraFixed: found?.cameraFixed ?? false,
                              });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                          >
                            {CAMERA_MOVEMENTS.map((m) => (
                              <option key={m.id} value={m.id}>
                                [{m.category}] {m.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Film Stock & Cinema Lens Package
                          </label>
                          <select
                            value={selectedNode.data.filmStockId || FILM_STOCK_LENSES[0].id}
                            onChange={(e) => updateNodeData(selectedNode.id, { filmStockId: e.target.value })}
                            className="w-full px-2.5 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                          >
                            {FILM_STOCK_LENSES.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-mono text-white/60 mb-1">
                            <span>Focal Length</span>
                            <span className="tabular-nums">{selectedNode.data.focalLengthMm || 35}mm</span>
                          </div>
                          <input
                            type="range"
                            min={14}
                            max={135}
                            value={selectedNode.data.focalLengthMm || 35}
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, { focalLengthMm: Number(e.target.value) })
                            }
                            className="w-full accent-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Motion Speed Modifier
                          </label>
                          <select
                            value={selectedNode.data.cameraSpeed || 'Slow Measured'}
                            onChange={(e) => updateNodeData(selectedNode.id, { cameraSpeed: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                          >
                            <option value="Imperceptible Drift">Imperceptible Drift</option>
                            <option value="Slow Measured">Slow & Measured</option>
                            <option value="Smooth Constant">Smooth Constant</option>
                            <option value="Dynamic Accelerated">Dynamic Accelerated</option>
                            <option value="Rapid Whip">Rapid / Whip</option>
                          </select>
                        </div>

                        <label className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.12] bg-black/50 cursor-pointer">
                          <div>
                            <div className="text-xs font-medium text-white">ModelArk `camera_fixed`</div>
                            <div className="text-[10px] text-white/50">Lock tripod coordinates strictly</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(selectedNode.data.cameraFixed)}
                            onChange={(e) => updateNodeData(selectedNode.id, { cameraFixed: e.target.checked })}
                            className="w-4 h-4 accent-white"
                          />
                        </label>
                      </div>
                    )}

                    {/* SEEDANCE KNOWLEDGE NODE INSPECTOR */}
                    {selectedNode.kind === 'seedance_knowledge' && (
                      <div className="space-y-2.5">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-white/45">
                          Inject Official ByteDance Directives
                        </div>
                        {SEEDANCE_KNOWLEDGE_PATTERNS.map((pat) => {
                          const active = (selectedNode.data.selectedKnowledgeIds || []).includes(pat.id);
                          return (
                            <label
                              key={pat.id}
                              className={`block p-2 rounded-lg border cursor-pointer transition-colors ${
                                active
                                  ? 'border-white/45 bg-white/[0.08]'
                                  : 'border-white/[0.08] bg-black/40 hover:border-white/25'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-white">{pat.title}</span>
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => {
                                    const curr = selectedNode.data.selectedKnowledgeIds || [];
                                    const next = active ? curr.filter((x) => x !== pat.id) : [...curr, pat.id];
                                    updateNodeData(selectedNode.id, { selectedKnowledgeIds: next });
                                  }}
                                  className="accent-white"
                                />
                              </div>
                              <p className="text-[10px] text-white/55 mt-1 leading-snug">{pat.summary}</p>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* SEEDANCE 2.5 MODELARK RENDER NODE INSPECTOR */}
                    {selectedNode.kind === 'seedance_render' && selectedRenderCompiled && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Synced ByteDance Endpoint Model
                          </label>
                          <select
                            value={selectedNode.data.modelKey || 'seedance_25_15s'}
                            onChange={(e) => {
                              const nextKey = e.target.value;
                              const catModel = catalog?.models.find((m) => m.key === nextKey);
                              updateNodeData(selectedNode.id, {
                                modelKey: nextKey,
                                durationSeconds: catModel?.defaultDurationSeconds || (nextKey.includes('30s') ? 30 : 15),
                              });
                            }}
                            className="w-full px-2.5 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                          >
                            {(catalog?.models.filter((m) => m.category !== 'Image Edit') || Object.values(SEEDANCE_MODELS).map((m) => ({ key: m.id, name: m.name, resolvedUpstreamModelId: m.id, defaultDurationSeconds: m.durationSeconds }))).map((m) => (
                              <option key={m.key} value={m.key}>
                                {m.name} [{m.resolvedUpstreamModelId}]
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-white/45 block mb-1">Aspect Ratio</label>
                            <select
                              value={selectedNode.data.aspectRatio || '16:9'}
                              onChange={(e) => updateNodeData(selectedNode.id, { aspectRatio: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                            >
                              {['16:9', '9:16', '21:9', '1:1', '4:3', '3:4', 'adaptive'].map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-white/45 block mb-1">Duration</label>
                            <select
                              value={selectedNode.data.durationSeconds || 15}
                              onChange={(e) =>
                                updateNodeData(selectedNode.id, { durationSeconds: Number(e.target.value) })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                            >
                              {[5, 10, 15, 20, 30].map((d) => (
                                <option key={d} value={d}>{d} Seconds</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-mono text-white/45 block mb-1">Content Switch</label>
                            <div className="grid grid-cols-2 p-0.5 rounded-lg bg-black border border-white/[0.12] text-[10px] font-mono">
                              <button
                                type="button"
                                onClick={() => updateNodeData(selectedNode.id, { contentRating: 'standard' })}
                                className={`py-1 rounded cursor-pointer ${
                                  selectedNode.data.contentRating !== '18+'
                                    ? 'bg-white text-black font-bold'
                                    : 'text-white/55'
                                }`}
                              >
                                No (Std)
                              </button>
                              <button
                                type="button"
                                onClick={() => updateNodeData(selectedNode.id, { contentRating: '18+' })}
                                className={`py-1 rounded cursor-pointer ${
                                  selectedNode.data.contentRating === '18+'
                                    ? 'bg-white text-black font-bold'
                                    : 'text-white/55'
                                }`}
                              >
                                18+
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-mono text-white/45 block mb-1">Physics Priority</label>
                            <button
                              type="button"
                              onClick={() =>
                                updateNodeData(selectedNode.id, {
                                  physicsPriority: !(selectedNode.data.physicsPriority !== false),
                                })
                              }
                              className={`w-full py-1.5 rounded-lg border text-[10px] font-mono cursor-pointer ${
                                selectedNode.data.physicsPriority !== false
                                  ? 'bg-white text-black border-white font-bold'
                                  : 'bg-black text-white/60 border-white/[0.15]'
                              }`}
                            >
                              {selectedNode.data.physicsPriority !== false ? 'Physics Priority ON' : 'Balanced'}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Scene Prompt Override / Additions
                          </label>
                          <textarea
                            rows={4}
                            value={selectedNode.data.customPrompt || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { customPrompt: e.target.value })}
                            placeholder="Write additional scene direction (merges with connected Analyzer, Director, Camera & Codex dots)..."
                            className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/[0.12] text-xs text-white"
                          />
                        </div>

                        <div className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] space-y-1 text-[10px] font-mono">
                          <div className="text-white/45">COMPILED UPSTREAM WIRES</div>
                          <div className="text-white/80">
                            Refs: {selectedRenderCompiled.reference_image_urls.length} / 30 · First Frame:{' '}
                            {selectedRenderCompiled.image_url ? 'Locked' : 'Auto'} · Video Ref:{' '}
                            {selectedRenderCompiled.video_url ? 'Yes' : 'No'}
                          </div>
                          <div className="text-white/60 line-clamp-3 font-sans">
                            {selectedRenderCompiled.prompt || 'Connect Prompt, Analyzer, or Director dots.'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => runSeedanceRender(selectedNode.id)}
                          disabled={
                            selectedNode.data.renderStatus === 'submitting' ||
                            selectedNode.data.renderStatus === 'processing'
                          }
                          className="w-full py-2.5 px-3 rounded-lg bg-white text-black hover:bg-[#ECECE9] font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Execute Seedance 2.5 API Render</span>
                        </button>
                      </div>
                    )}

                    {/* NEXT SCENE CONTINUITY INSPECTOR */}
                    {selectedNode.kind === 'next_scene_continuity' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block mb-1">
                            Next Scene Narrative Intent (Scene N+1)
                          </label>
                          <textarea
                            rows={3}
                            value={selectedNode.data.nextActionIntent || ''}
                            onChange={(e) =>
                              updateNodeData(selectedNode.id, { nextActionIntent: e.target.value })
                            }
                            placeholder="Describe what happens next while preserving exact lighting, wardrobe, and momentum..."
                            className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/[0.12] text-xs text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => runNextSceneContinuity(selectedNode.id)}
                          disabled={Boolean(busyNodeIds[selectedNode.id])}
                          className="w-full py-2 px-3 rounded-lg bg-white text-black hover:bg-[#ECECE9] font-mono text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>Lock Final Frame & Synthesize Next Scene</span>
                        </button>

                        {selectedNode.data.nextScenePrompt && (
                          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 block">
                              Zero-Mistake Continuation Prompt
                            </label>
                            <textarea
                              rows={5}
                              value={selectedNode.data.nextScenePrompt}
                              onChange={(e) =>
                                updateNodeData(selectedNode.id, { nextScenePrompt: e.target.value })
                              }
                              className="w-full px-2.5 py-2 rounded-lg bg-black/70 border border-white/[0.15] text-xs text-white leading-relaxed"
                            />
                            {selectedNode.data.continuityChecklist?.map((chk, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-300">
                                <Check className="w-3 h-3 shrink-0" />
                                <span>{chk}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: PUBLISHED BYTEDANCE SEEDANCE 2.5 CODEX */}
            {rightPanelTab === 'codex' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-black/60 border border-white/[0.1] space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Official Architecture
                  </div>
                  <div className="font-medium text-white">
                    {knowledge?.modelFamily || 'ByteDance / BytePlus Dreamina Seedance 2.5'}
                  </div>
                  <p className="text-[11px] text-white/65 leading-relaxed">
                    {knowledge?.architecture ||
                      'Dual-Branch Diffusion Transformer separating spatial asset fidelity from temporal complex physics motion.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/60 border border-white/[0.1] space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    ByteDance Official Prompt Formula
                  </div>
                  <div className="font-mono text-[11px] text-white/90 leading-relaxed">
                    {knowledge?.promptFormula ||
                      '[References (@Image1..N / @Video1)] -> [Subject & Action] -> [Environment & Lighting] -> [Camera Movement & Speed] -> [Film Stock & Style] -> [Audio & Constraints]'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Reference Tagging & Continuity Rules
                  </div>
                  {(knowledge?.referenceTaggingRules || SEEDANCE_KNOWLEDGE_PATTERNS.map((p) => p.summary)).map(
                    (rule, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.08] text-[11px] text-white/75 leading-relaxed"
                      >
                        {rule}
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Camera Movement & Physics Engineering
                  </div>
                  {(knowledge?.cameraMovementRules || []).map((rule, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.08] text-[11px] text-white/75 leading-relaxed"
                    >
                      {rule}
                    </div>
                  ))}
                  {(knowledge?.physicsAndContinuityRules || []).map((rule, i) => (
                    <div
                      key={`ph-${i}`}
                      className="p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.08] text-[11px] text-white/75 leading-relaxed"
                    >
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: LIVE SYNCED MODELARK API ENDPOINT INSPECTOR */}
            {rightPanelTab === 'payload' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-black/60 border border-white/[0.1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                      Synced ByteDance Backend
                    </span>
                    <button
                      type="button"
                      onClick={syncWithByteDanceBackend}
                      className="text-[10px] font-mono text-white/75 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingBackend ? 'animate-spin' : ''}`} />
                      <span>Sync Now</span>
                    </button>
                  </div>
                  <div className="font-mono text-[10px] text-white/80 break-all">
                    Base: {catalog?.baseUrl || 'https://ark.ap-southeast.bytepluses.com/api/v3'}
                  </div>
                  <div className="font-mono text-[10px] text-white/55">
                    POST /contents/generations/tasks · GET /tasks/{'{id}'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Available Backend Models ({catalog?.models.length || 0})
                  </div>
                  {(catalog?.models || []).map((m) => (
                    <div
                      key={m.key}
                      className="p-2 rounded-lg border border-white/[0.08] bg-white/[0.02] space-y-0.5 font-mono text-[10px]"
                    >
                      <div className="flex justify-between text-white font-semibold">
                        <span>{m.name}</span>
                        <span className={m.available ? 'text-emerald-400' : 'text-amber-300'}>
                          {m.available ? 'READY' : 'ENV KEY REQ'}
                        </span>
                      </div>
                      <div className="text-white/55">
                        Upstream: {m.resolvedUpstreamModelId} · Max Refs: {m.maxImages}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRenderCompiled && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                      Live Compiled Task JSON ({selectedNode?.data.title})
                    </div>
                    <pre className="p-2.5 rounded-lg bg-black border border-white/[0.1] text-[10px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                      {JSON.stringify(
                        {
                          model: selectedRenderCompiled.resolvedUpstreamModel,
                          ratio: selectedRenderCompiled.aspect_ratio,
                          duration: selectedRenderCompiled.duration,
                          resolution: selectedRenderCompiled.resolution,
                          generate_audio: selectedRenderCompiled.sound_enabled,
                          camera_fixed: selectedRenderCompiled.camera_fixed,
                          physics_priority: selectedRenderCompiled.physics_priority,
                          content_rating: selectedRenderCompiled.content_rating,
                          reference_images_count: selectedRenderCompiled.reference_image_urls.length,
                          has_first_frame: Boolean(selectedRenderCompiled.image_url),
                          has_reference_video: Boolean(selectedRenderCompiled.video_url),
                          prompt_preview: selectedRenderCompiled.prompt.slice(0, 260),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      <input
        ref={flowFileInputRef}
        type="file"
        accept=".json,.vaibyte-flow.json"
        className="hidden"
        onChange={(e) => importWorkflowJson(e.target.files)}
      />
    </div>
  );
};
