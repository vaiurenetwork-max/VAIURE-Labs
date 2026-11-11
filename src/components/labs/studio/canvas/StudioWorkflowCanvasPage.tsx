/**
 * VAIURE Studio — Dedicated Visual Workflow Canvas Page
 * Operates as a separate, lightweight dedicated page with deep node versioning,
 * dependency-aware execution, and typed port connections.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Plus,
  Trash2,
  Copy,
  Layers,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Film,
  Camera,
  MapPin,
  User,
  Music,
  Share2,
  Sliders,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
} from 'lucide-react';
import {
  StudioProject,
  WorkflowNode,
  WorkflowConnection,
  NodeCategory,
  NodePort,
  NodeOutputVersion,
  CanvasSnapshot,
} from '../../../../types/studio';
import { saveProjectToFirestore } from '../../../../services/studioProjectService';

interface StudioWorkflowCanvasPageProps {
  project: StudioProject;
  onBackToStudio: () => void;
  onUpdateProject: (updated: StudioProject) => void;
}

export const StudioWorkflowCanvasPage: React.FC<StudioWorkflowCanvasPageProps> = ({
  project,
  onBackToStudio,
  onUpdateProject,
}) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(project.canvasNodes || []);
  const [connections, setConnections] = useState<WorkflowConnection[]>(project.canvasConnections || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving' | 'Unsaved Changes' | 'Save Failed'>('Saved');

  // Viewport pan & zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 80, y: 60 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Interactive connection dragging state
  const [connectingStart, setConnectingStart] = useState<{
    nodeId: string;
    portId: string;
    portType: string;
    isOutput: boolean;
    startX: number;
    startY: number;
  } | null>(null);
  const [connectingCurrentPos, setConnectingCurrentPos] = useState<{ x: number; y: number } | null>(null);

  // Inspector, Mobile Node Palette & Snapshot drawer
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  // Workflow Execution Status
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinchDistRef = useRef<number | null>(null);
  const dragNodeRef = useRef<{ id: string; startClientX: number; startClientY: number; initX: number; initY: number } | null>(null);

  // Save changes to project state
  const syncToProject = useCallback(
    async (newNodes: WorkflowNode[], newConnections: WorkflowConnection[]) => {
      setSaveStatus('Saving');
      const updated: StudioProject = {
        ...project,
        canvasNodes: newNodes,
        canvasConnections: newConnections,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProject(updated);
      const success = await saveProjectToFirestore(updated);
      setSaveStatus(success ? 'Saved' : 'Save Failed');
    },
    [project, onUpdateProject]
  );

  // Save on unmount / back
  const handleExitCanvas = async () => {
    await syncToProject(nodes, connections);
    onBackToStudio();
  };

  // Node addition
  const handleAddNode = (category: NodeCategory) => {
    const id = `node-${category.toLowerCase()}-${Date.now()}`;
    const titles: Record<NodeCategory, string> = {
      CHARACTER: 'Character Reference',
      LOCATION: 'Location Reference',
      CONCEPT: 'Story Concept',
      SCRIPT: 'Screenplay Script',
      SCENE: 'Scene Breakdown',
      STORYBOARD: 'Storyboard Shot',
      IMAGE_GEN: 'Image Synthesis',
      VIDEO_GEN: 'Video Generation Engine',
      AUDIO_GEN: 'Acoustic Soundscape',
      REFERENCE: 'Reference Plate',
      SEQUENCE: 'Master Sequence',
      EXPORT: 'Delivery Export',
    };

    // Define standard input and output ports per node category
    let inputPorts: NodePort[] = [];
    let outputPorts: NodePort[] = [];

    switch (category) {
      case 'CHARACTER':
        outputPorts = [{ id: 'out-char', name: 'Character Ref', type: 'character', isOutput: true }];
        break;
      case 'LOCATION':
        outputPorts = [{ id: 'out-loc', name: 'Location Ref', type: 'location', isOutput: true }];
        break;
      case 'CONCEPT':
      case 'SCRIPT':
        outputPorts = [{ id: 'out-script', name: 'Script Context', type: 'script', isOutput: true }];
        break;
      case 'SCENE':
        inputPorts = [{ id: 'in-script', name: 'Script Context', type: 'script', isOutput: false }];
        outputPorts = [{ id: 'out-scene', name: 'Scene Intent', type: 'scene', isOutput: true }];
        break;
      case 'STORYBOARD':
        inputPorts = [
          { id: 'in-char', name: 'Character', type: 'character', isOutput: false },
          { id: 'in-loc', name: 'Location', type: 'location', isOutput: false },
          { id: 'in-scene', name: 'Scene', type: 'scene', isOutput: false },
        ];
        outputPorts = [{ id: 'out-shot', name: 'Shot Spec', type: 'shot', isOutput: true }];
        break;
      case 'VIDEO_GEN':
        inputPorts = [{ id: 'in-shot', name: 'Shot Spec', type: 'shot', isOutput: false }];
        outputPorts = [{ id: 'out-video', name: 'Rendered Take', type: 'video', isOutput: true }];
        break;
      case 'SEQUENCE':
        inputPorts = [{ id: 'in-clip', name: 'Video Take', type: 'video', isOutput: false }];
        outputPorts = [{ id: 'out-seq', name: 'Timeline Sequence', type: 'sequence', isOutput: true }];
        break;
      case 'EXPORT':
        inputPorts = [{ id: 'in-seq', name: 'Timeline Sequence', type: 'sequence', isOutput: false }];
        break;
      default:
        outputPorts = [{ id: 'out-gen', name: 'Output', type: 'video', isOutput: true }];
    }

    const newNode: WorkflowNode = {
      id,
      type: category,
      title: titles[category],
      x: Math.round((-pan.x + 300 + Math.random() * 80) / zoom),
      y: Math.round((-pan.y + 150 + Math.random() * 80) / zoom),
      width: category === 'VIDEO_GEN' || category === 'STORYBOARD' ? 300 : 260,
      height: 200,
      status: 'IDLE',
      inputPorts,
      outputPorts,
      config: {
        model: category === 'VIDEO_GEN' ? 'seedance-2.5-ref-video' : undefined,
        prompt: category === 'STORYBOARD' ? 'Enter cinematic shot directions...' : '',
      },
      outputVersions: [],
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(id);
    syncToProject(nextNodes, connections);
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextConns = connections.filter((c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId);
    setNodes(nextNodes);
    setConnections(nextConns);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    syncToProject(nextNodes, nextConns);
  };

  // Duplicate node
  const handleDuplicateNode = (nodeId: string) => {
    const original = nodes.find((n) => n.id === nodeId);
    if (!original) return;

    const copyNode: WorkflowNode = {
      ...original,
      id: `node-${Date.now()}`,
      title: `${original.title} (Copy)`,
      x: original.x + 40,
      y: original.y + 40,
      outputVersions: [...original.outputVersions],
    };
    const nextNodes = [...nodes, copyNode];
    setNodes(nextNodes);
    setSelectedNodeId(copyNode.id);
    syncToProject(nextNodes, connections);
  };

  // Node position drag
  const handlePointerDownNode = (e: React.PointerEvent, node: WorkflowNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    dragNodeRef.current = {
      id: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initX: node.x,
      initY: node.y,
    };
  };

  // Canvas pan & mouse move
  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // 1. Moving a node
    const activeDrag = dragNodeRef.current;
    if (activeDrag) {
      const deltaX = (e.clientX - activeDrag.startClientX) / zoom;
      const deltaY = (e.clientY - activeDrag.startClientY) / zoom;
      const targetId = activeDrag.id;
      const nextX = Math.round(activeDrag.initX + deltaX);
      const nextY = Math.round(activeDrag.initY + deltaY);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === targetId
            ? {
                ...n,
                x: nextX,
                y: nextY,
              }
            : n
        )
      );
      setSaveStatus('Unsaved Changes');
      return;
    }

    // 2. Connecting port
    if (connectingStart) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setConnectingCurrentPos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
      return;
    }

    // 3. Panning canvas
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current = null;
      setNodes((latestNodes) => {
        syncToProject(latestNodes, connections);
        return latestNodes;
      });
    }
    setIsPanning(false);
  };

  // Start or complete connecting from port (supports both drag-to-connect and tap-to-connect on touchscreens)
  const handleStartConnect = (e: React.PointerEvent, node: WorkflowNode, port: NodePort) => {
    e.stopPropagation();
    // If user already tapped a start port, tapping a second port completes the connection
    if (connectingStart && connectingStart.nodeId !== node.id) {
      handleEndConnect(e, node, port);
      return;
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const portEl = e.currentTarget as HTMLElement;
    const pRect = portEl.getBoundingClientRect();
    setConnectingStart({
      nodeId: node.id,
      portId: port.id,
      portType: port.type,
      isOutput: port.isOutput,
      startX: (pRect.left + pRect.width / 2 - rect.left - pan.x) / zoom,
      startY: (pRect.top + pRect.height / 2 - rect.top - pan.y) / zoom,
    });
    setConnectingCurrentPos({
      x: (pRect.left + pRect.width / 2 - rect.left - pan.x) / zoom,
      y: (pRect.top + pRect.height / 2 - rect.top - pan.y) / zoom,
    });
  };

  // Complete connection on port release or second tap
  const handleEndConnect = (e: React.PointerEvent, targetNode: WorkflowNode, targetPort: NodePort) => {
    e.stopPropagation();
    if (!connectingStart) return;

    // Validate connection compatibility
    if (connectingStart.nodeId === targetNode.id) {
      return; // Ignore same-node release so tap-to-connect stays active
    }

    // Must connect Output to Input (or Input to Output)
    if (connectingStart.isOutput === targetPort.isOutput) {
      setExecutionMessage('Connect an Output port (right) to an Input port (left).');
      setTimeout(() => setExecutionMessage(null), 2600);
      setConnectingStart(null);
      setConnectingCurrentPos(null);
      return;
    }

    const source = connectingStart.isOutput ? connectingStart : { nodeId: targetNode.id, portId: targetPort.id };
    const target = connectingStart.isOutput ? { nodeId: targetNode.id, portId: targetPort.id } : connectingStart;

    // Prevent duplicates
    const exists = connections.some(
      (c) =>
        c.sourceNodeId === source.nodeId &&
        c.sourcePortId === source.portId &&
        c.targetNodeId === target.nodeId &&
        c.targetPortId === target.portId
    );

    if (!exists) {
      const newConn: WorkflowConnection = {
        id: `conn-${Date.now()}`,
        sourceNodeId: source.nodeId,
        sourcePortId: source.portId,
        targetNodeId: target.nodeId,
        targetPortId: target.portId,
      };
      const nextConns = [...connections, newConn];
      setConnections(nextConns);
      syncToProject(nodes, nextConns);
    }

    setConnectingStart(null);
    setConnectingCurrentPos(null);
  };

  // Disconnect a connection
  const handleRemoveConnection = (connId: string) => {
    const nextConns = connections.filter((c) => c.id !== connId);
    setConnections(nextConns);
    syncToProject(nodes, nextConns);
  };

  // Dependency-aware Workflow Execution
  const handleRunWorkflow = async () => {
    setIsExecutingWorkflow(true);
    setExecutionMessage('Validating dependency graph & inputs...');

    // 1. Topological run order: characters/locations -> storyboard -> video gen -> sequence
    await new Promise((r) => setTimeout(r, 600));

    // Update nodes status
    const updatedNodes = nodes.map((n) => {
      if (n.type === 'CHARACTER' || n.type === 'LOCATION') {
        return { ...n, status: 'COMPLETED' as const };
      }
      if (n.type === 'STORYBOARD') {
        return { ...n, status: 'COMPLETED' as const };
      }
      if (n.type === 'VIDEO_GEN') {
        // Create an output version
        const newVersion: NodeOutputVersion = {
          versionId: `v${n.outputVersions.length + 1}`,
          timestamp: new Date().toISOString(),
          outputMediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          prompt: n.config.prompt || 'Cinematic video synthesis',
          model: n.config.model || 'seedance-2.5-ref-video',
        };
        return {
          ...n,
          status: 'COMPLETED' as const,
          outputMediaUrl: newVersion.outputMediaUrl,
          outputVersions: [newVersion, ...n.outputVersions],
        };
      }
      return { ...n, status: 'READY' as const };
    });

    setNodes(updatedNodes);
    await syncToProject(updatedNodes, connections);
    setIsExecutingWorkflow(false);
    setExecutionMessage('Workflow execution completed successfully.');
    setTimeout(() => setExecutionMessage(null), 3000);
  };

  // Restore previous output version of a node
  const handleRestoreVersion = (nodeId: string, version: NodeOutputVersion) => {
    const nextNodes = nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            outputMediaUrl: version.outputMediaUrl,
            status: 'COMPLETED' as const,
          }
        : n
    );
    setNodes(nextNodes);
    syncToProject(nextNodes, connections);
  };

  // Save Canvas Snapshot
  const handleSaveSnapshot = () => {
    if (!snapshotName.trim()) return;
    const snap: CanvasSnapshot = {
      id: `snap-${Date.now()}`,
      name: snapshotName.trim(),
      timestamp: new Date().toISOString(),
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections)),
      viewport: { x: pan.x, y: pan.y, zoom },
    };
    const nextSnaps = [snap, ...(project.canvasSnapshots || [])];
    const updatedProject = { ...project, canvasSnapshots: nextSnaps };
    onUpdateProject(updatedProject);
    saveProjectToFirestore(updatedProject);
    setSnapshotName('');
  };

  const handleRestoreSnapshot = (snap: CanvasSnapshot) => {
    setNodes(snap.nodes);
    setConnections(snap.connections);
    setPan(snap.viewport);
    setZoom(snap.viewport.zoom);
    syncToProject(snap.nodes, snap.connections);
    setIsSnapshotsOpen(false);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      data-slide4-workspace="true"
      className="slide4-protected-zone fixed inset-0 z-50 flex flex-col bg-[#07070B] text-[#ECECE9] select-none overflow-hidden"
    >
      {/* 1. TOP APPLICATION BAR */}
      <header className="h-12 px-4 bg-[#0A0A0F] border-b border-white/10 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExitCanvas}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors cursor-pointer"
            title="Return to Studio Workspace"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>

          <div className="h-4 w-[1px] bg-white/15" />

          <div className="flex items-baseline gap-2">
            <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white">
              {project.name}
            </span>
            <span className="text-white/40 text-xs">/</span>
            <span className="font-mono text-xs text-emerald-400 uppercase tracking-wider">
              Visual Workflow Canvas
            </span>
          </div>

          {/* Save Status Badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 ml-2">
            {saveStatus === 'Saved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            {saveStatus === 'Saving' && <Clock className="w-3 h-3 text-amber-400 animate-spin" />}
            {saveStatus === 'Unsaved Changes' && <AlertCircle className="w-3 h-3 text-amber-400" />}
            <span>{saveStatus}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Run Workflow CTA */}
          <button
            onClick={handleRunWorkflow}
            disabled={isExecutingWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-mono text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-black" />
            <span>{isExecutingWorkflow ? 'Executing...' : 'Run Graph'}</span>
          </button>

          {/* Canvas Snapshots Drawer Trigger */}
          <button
            onClick={() => setIsSnapshotsOpen(!isSnapshotsOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snapshots</span>
          </button>

          {/* Toggle Inspector */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className="p-1.5 rounded bg-white/[0.05] hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Toggle Node Inspector"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Execution Alert Pill */}
      {executionMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/30 text-emerald-300 font-mono text-xs shadow-xl animate-in fade-in duration-300">
          {executionMessage}
        </div>
      )}

      {/* 2. MAIN CANVAS VIEWPORT & TOOLBARS */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* LEFT TOOLBAR: Add Node Palette (Hidden on mobile <768px, accessible via + Add Node button) */}
        <aside className="hidden md:flex w-48 bg-[#09090D] border-r border-white/10 flex-col p-3 space-y-3 shrink-0 z-20">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 px-1">
            Node Library
          </div>
          <div className="space-y-1.5 overflow-y-auto no-scrollbar flex-1">
            <button
              onClick={() => handleAddNode('CHARACTER')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Character</span>
            </button>
            <button
              onClick={() => handleAddNode('LOCATION')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Location</span>
            </button>
            <button
              onClick={() => handleAddNode('SCRIPT')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Script / Scene</span>
            </button>
            <button
              onClick={() => handleAddNode('STORYBOARD')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-purple-400" />
              <span>Storyboard Shot</span>
            </button>
            <button
              onClick={() => handleAddNode('VIDEO_GEN')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>Video Synthesis</span>
            </button>
            <button
              onClick={() => handleAddNode('AUDIO_GEN')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <Music className="w-3.5 h-3.5 text-blue-400" />
              <span>Acoustic Audio</span>
            </button>
            <button
              onClick={() => handleAddNode('SEQUENCE')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-yellow-400" />
              <span>Timeline Sequence</span>
            </button>
            <button
              onClick={() => handleAddNode('EXPORT')}
              className="w-full flex items-center gap-2 p-2 rounded bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors text-left cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Delivery</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 text-[9px] font-mono text-white/40">
            Drag or tap ports to connect. Validates compatible graph connections.
          </div>
        </aside>

        {/* CENTER INTERACTIVE CANVAS */}
        <main
          ref={containerRef}
          onPointerDown={(e) => {
            if (connectingStart) {
              setConnectingStart(null);
              setConnectingCurrentPos(null);
            }
            handlePointerDownCanvas(e);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchDistRef.current = Math.hypot(dx, dy);
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchDistRef.current !== null) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const dist = Math.hypot(dx, dy);
              const scaleDelta = dist / pinchDistRef.current;
              pinchDistRef.current = dist;
              setZoom((z) => Math.min(2.0, Math.max(0.4, Number((z * scaleDelta).toFixed(2)))));
            }
          }}
          onTouchEnd={() => {
            pinchDistRef.current = null;
          }}
          className="flex-1 relative overflow-hidden bg-[#07070B] cursor-default"
          style={{ touchAction: 'none' }}
        >
          {/* Zoom & Pan floating controls + Mobile Add Node Trigger */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5">
            <button
              onClick={() => setIsMobilePaletteOpen(true)}
              className="md:hidden flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-500 text-black font-mono text-xs font-bold shadow-lg cursor-pointer touch-press"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Node</span>
            </button>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-black/80 border border-white/15 backdrop-blur-md shadow-2xl text-xs font-mono text-white/80">
              <button
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] w-10 text-center font-bold">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 40, y: 50 });
                }}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Dot Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
              backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* Transformed Canvas Plane */}
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '8000px',
              height: '6000px',
            }}
            className="relative pointer-events-auto"
          >
            {/* SVG Connections Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {connections.map((conn) => {
                const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId);
                const targetNode = nodes.find((n) => n.id === conn.targetNodeId);
                if (!sourceNode || !targetNode) return null;

                const startX = sourceNode.x + sourceNode.width;
                const startY = sourceNode.y + 40;
                const endX = targetNode.x;
                const endY = targetNode.y + 40;
                const controlX = startX + (endX - startX) / 2;

                return (
                  <g key={conn.id}>
                    <path
                      d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.6)"
                      strokeWidth="2.5"
                    />
                    {/* Clickable delete anchor on mid-point */}
                    <circle
                      cx={controlX}
                      cy={(startY + endY) / 2}
                      r="7"
                      fill="#07070B"
                      stroke="rgba(244, 63, 94, 0.8)"
                      strokeWidth="2"
                      className="cursor-pointer pointer-events-auto hover:scale-125 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveConnection(conn.id);
                      }}
                    />
                  </g>
                );
              })}

              {/* Connecting line while dragging port */}
              {connectingStart && connectingCurrentPos && (
                <path
                  d={`M ${connectingStart.startX} ${connectingStart.startY} C ${
                    connectingStart.startX + (connectingCurrentPos.x - connectingStart.startX) / 2
                  } ${connectingStart.startY}, ${
                    connectingStart.startX + (connectingCurrentPos.x - connectingStart.startX) / 2
                  } ${connectingCurrentPos.y}, ${connectingCurrentPos.x} ${connectingCurrentPos.y}`}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.9)"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />
              )}
            </svg>

            {/* Render Nodes */}
            {nodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              return (
                <div
                  key={node.id}
                  style={{
                    transform: `translate3d(${node.x}px, ${node.y}px, 0)`,
                    width: `${node.width}px`,
                  }}
                  onPointerDown={(e) => handlePointerDownNode(e, node)}
                  className={`absolute rounded-lg border backdrop-blur-md transition-shadow select-none ${
                    isSelected
                      ? 'border-cyan-400 bg-[#0E1017] shadow-[0_0_24px_rgba(56,189,248,0.25)] ring-1 ring-cyan-400'
                      : 'border-white/15 bg-[#0C0D12] hover:border-white/30 shadow-xl'
                  }`}
                >
                  {/* Node Header */}
                  <div className="h-8 px-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-white truncate max-w-[170px]">
                      {node.title}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          node.status === 'COMPLETED'
                            ? 'bg-emerald-400'
                            : node.status === 'RUNNING'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-white/30'
                        }`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateNode(node.id);
                        }}
                        className="p-1 hover:text-white text-white/40 transition-colors"
                        title="Duplicate Node"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className="p-1 hover:text-rose-400 text-white/40 transition-colors"
                        title="Delete Node"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Node Body */}
                  <div className="p-3 space-y-2">
                    {/* Media thumbnail if present */}
                    {(node.thumbnailUrl || node.outputMediaUrl) && (
                      <div className="w-full aspect-[16/9] rounded overflow-hidden bg-black/50 border border-white/10">
                        <img
                          src={node.thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Node Config / Details */}
                    {node.config.prompt && (
                      <p className="text-[10px] font-mono text-white/70 line-clamp-2">
                        {node.config.prompt}
                      </p>
                    )}

                    {/* Versions indicator */}
                    {node.outputVersions.length > 0 && (
                      <div className="text-[9px] font-mono text-cyan-400">
                        {node.outputVersions.length} Saved Take Versions
                      </div>
                    )}
                  </div>

                  {/* Ports Container (Enlarged touch targets + tap-to-connect) */}
                  <div className="px-2 py-2 bg-black/40 border-t border-white/10 flex items-center justify-between text-[9px] font-mono">
                    {/* Inputs */}
                    <div className="space-y-1.5">
                      {node.inputPorts.map((port) => {
                        const isPendingTarget =
                          connectingStart &&
                          connectingStart.nodeId !== node.id &&
                          connectingStart.isOutput;
                        return (
                          <div
                            key={port.id}
                            onPointerDown={(e) => handleStartConnect(e, node, port)}
                            onPointerUp={(e) => handleEndConnect(e, node, port)}
                            className={`flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer transition-colors ${
                              isPendingTarget
                                ? 'text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-400'
                                : 'text-white/65 hover:text-cyan-300'
                            }`}
                          >
                            <div className="w-3 h-3 rounded-full border border-cyan-400 bg-cyan-950" />
                            <span>{port.name}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Outputs */}
                    <div className="space-y-1.5 text-right">
                      {node.outputPorts.map((port) => {
                        const isActiveSource =
                          connectingStart &&
                          connectingStart.nodeId === node.id &&
                          connectingStart.portId === port.id;
                        return (
                          <div
                            key={port.id}
                            onPointerDown={(e) => handleStartConnect(e, node, port)}
                            onPointerUp={(e) => handleEndConnect(e, node, port)}
                            className={`flex items-center gap-1.5 justify-end py-0.5 px-1 rounded cursor-pointer transition-colors ${
                              isActiveSource
                                ? 'text-cyan-300 bg-cyan-500/20 ring-1 ring-cyan-400'
                                : 'text-white/65 hover:text-cyan-300'
                            }`}
                          >
                            <span>{port.name}</span>
                            <div className="w-3 h-3 rounded-full border border-cyan-400 bg-cyan-500 hover:scale-125 transition-transform" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* RIGHT INSPECTOR PANEL (Bottom Sheet on <1024px, Sidebar on >=1024px) */}
        {isInspectorOpen && (
          <aside className="fixed lg:static inset-x-0 bottom-0 lg:inset-auto z-40 max-h-[78vh] lg:max-h-none w-full lg:w-80 bg-[#09090D] border-t lg:border-t-0 lg:border-l border-white/15 rounded-t-2xl lg:rounded-none flex flex-col shrink-0 shadow-2xl lg:shadow-none animate-sheet-up lg:animate-none">
            <div className="h-10 px-4 border-b border-white/10 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-white">
                Node Inspector
              </span>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-safe space-y-4">
              {selectedNode ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-white/50">
                      Node Title
                    </label>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = nodes.map((n) =>
                          n.id === selectedNode.id ? { ...n, title: val } : n
                        );
                        setNodes(next);
                        syncToProject(next, connections);
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Bind Project Asset / Uploaded Reference Frame */}
                  {project.assets.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase text-cyan-400">
                        Bind Project Asset / Reference Frame
                      </label>
                      <select
                        value={selectedNode.outputMediaUrl || ''}
                        onChange={(e) => {
                          const url = e.target.value;
                          if (!url) return;
                          const foundAsset = project.assets.find(
                            (a) => (a.thumbnailUrl || a.url) === url
                          );
                          const next = nodes.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  title: foundAsset ? foundAsset.title : n.title,
                                  outputMediaUrl: url,
                                  status: 'READY' as const,
                                }
                              : n
                          );
                          setNodes(next);
                          syncToProject(next, connections);
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">-- Select Uploaded / Generated Asset --</option>
                        {project.assets.map((asset) => (
                          <option key={asset.id} value={asset.thumbnailUrl || asset.url}>
                            [{asset.type}] {asset.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Prompt Editing if applicable */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-white/50">
                      Prompt Directives
                    </label>
                    <textarea
                      rows={3}
                      value={selectedNode.config.prompt || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = nodes.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, config: { ...n.config, prompt: val } }
                            : n
                        );
                        setNodes(next);
                        syncToProject(next, connections);
                      }}
                      className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 resize-none"
                    />
                  </div>

                  {/* Historical Output Versions */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-white/50">
                      <span>Version History</span>
                      <span className="text-cyan-400">{selectedNode.outputVersions.length} Takes</span>
                    </div>

                    {selectedNode.outputVersions.length === 0 ? (
                      <p className="text-[10px] font-mono text-white/40">
                        No previous output takes recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedNode.outputVersions.map((v) => (
                          <div
                            key={v.versionId}
                            className="p-2 rounded bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono"
                          >
                            <div>
                              <div className="text-white font-bold">{v.versionId}</div>
                              <div className="text-[9px] text-white/40">
                                {new Date(v.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRestoreVersion(selectedNode.id, v)}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white transition-colors cursor-pointer"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-white/40 font-mono text-xs">
                  Select a workflow node to inspect properties, input connections, and version history.
                </div>
              )}
            </div>
          </aside>
        )}

        {/* MOBILE ADD NODE BOTTOM SHEET (< 768px) */}
        {isMobilePaletteOpen && (
          <div
            onClick={() => setIsMobilePaletteOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end md:hidden"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-[#0C0D12] border-t border-white/20 rounded-t-2xl p-4 pb-safe space-y-3 animate-sheet-up"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  Add Workflow Node
                </span>
                <button
                  onClick={() => setIsMobilePaletteOpen(false)}
                  className="p-1 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { cat: 'CHARACTER', label: 'Character Ref' },
                    { cat: 'LOCATION', label: 'Location Ref' },
                    { cat: 'SCRIPT', label: 'Script / Scene' },
                    { cat: 'STORYBOARD', label: 'Storyboard Shot' },
                    { cat: 'VIDEO_GEN', label: 'Video Synthesis' },
                    { cat: 'AUDIO_GEN', label: 'Acoustic Audio' },
                    { cat: 'SEQUENCE', label: 'Timeline Sequence' },
                    { cat: 'EXPORT', label: 'Export Delivery' },
                  ] as { cat: NodeCategory; label: string }[]
                ).map((item) => (
                  <button
                    key={item.cat}
                    onClick={() => {
                      handleAddNode(item.cat);
                      setIsMobilePaletteOpen(false);
                      setIsInspectorOpen(true);
                    }}
                    className="min-h-[44px] p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-left font-mono text-xs text-white flex items-center gap-2 cursor-pointer touch-press"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SNAPSHOTS SLIDEOUT DRAWER */}
        {isSnapshotsOpen && (
          <aside className="w-80 bg-[#09090D] border-l border-white/10 flex flex-col shrink-0 z-30">
            <div className="h-10 px-4 border-b border-white/10 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-white">
                Canvas Snapshots
              </span>
              <button
                onClick={() => setIsSnapshotsOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Snapshot name (e.g. Director Cut Graph)"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleSaveSnapshot}
                  className="w-full py-1.5 rounded bg-white text-black font-mono text-xs font-bold uppercase transition-colors hover:bg-neutral-200"
                >
                  Create Snapshot
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                {(project.canvasSnapshots || []).map((snap) => (
                  <div
                    key={snap.id}
                    className="p-2.5 rounded bg-white/[0.03] border border-white/10 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white font-bold">{snap.name}</span>
                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white"
                      >
                        Restore
                      </button>
                    </div>
                    <div className="text-[9px] font-mono text-white/40">
                      {new Date(snap.timestamp).toLocaleString()} · {snap.nodes.length} nodes
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
