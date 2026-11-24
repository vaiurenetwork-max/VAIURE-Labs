/**
 * VAIURE — SEEDANCE LAB LIVESTREAMING WORKSPACE
 * Strictly displays real DB-backed livestreams ONLY (zero fake/sample broadcasts).
 * Real WebRTC broadcaster/viewer signaling + live WebSocket chat + host/admin moderation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Radio,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Users,
  Send,
  Lock,
  Shield,
  Ban,
  VolumeX,
  Volume2,
  RefreshCw,
  X,
  AlertCircle,
  PowerOff,
  Gift,
} from 'lucide-react';
import {
  LivestreamChatMessage,
  LivestreamSession,
  LivestreamVisibility,
  VirtualGiftTransaction,
} from '../../../types/seedancePlatform';
import { UserProfile } from '../../../types/social';
import {
  livestreamService,
  RTC_CONFIG,
  SeedanceRealtimeSocket,
} from '../../../services/seedanceWorkspaceService';
import { GiftAnimationOverlay, VirtualGiftModal } from './community/VirtualGiftModal';

interface SeedanceLivestreamViewProps {
  currentUser?: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  currentCredits?: number;
  onRequireAuth?: () => void;
  onOpenCredits?: () => void;
  onRefreshBalance?: () => void;
  initialGroupContext?: {
    groupId: string;
    groupName: string;
    groupVisibility: 'PUBLIC' | 'PRIVATE';
    streamIdToJoin?: string;
  } | null;
  onClearGroupContext?: () => void;
}

export const SeedanceLivestreamView: React.FC<SeedanceLivestreamViewProps> = ({
  currentUser,
  isAuthenticated,
  isAdmin = false,
  currentCredits = 0,
  onRequireAuth,
  onOpenCredits,
  onRefreshBalance,
  initialGroupContext,
  onClearGroupContext,
}) => {
  const [streams, setStreams] = useState<LivestreamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStream, setActiveStream] = useState<LivestreamSession | null>(null);
  const [isHostMode, setIsHostMode] = useState(false);
  const [messages, setMessages] = useState<LivestreamChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // Start stream modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState<LivestreamVisibility>(
    initialGroupContext?.groupVisibility || 'PUBLIC'
  );
  const [newAccessCode, setNewAccessCode] = useState('');
  const [sourceMode, setSourceMode] = useState<'camera' | 'screen'>('camera');
  const [isStarting, setIsStarting] = useState(false);

  // Virtual Gift modal + real-time celebration overlay inside livestream
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [liveGiftAnim, setLiveGiftAnim] = useState<VirtualGiftTransaction | null>(null);

  // Private join access prompt
  const [pendingPrivateStream, setPendingPrivateStream] = useState<LivestreamSession | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Broadcaster local track controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [viewerMuted, setViewerMuted] = useState(false);

  const socketRef = useRef<SeedanceRealtimeSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const handledGroupContextKeyRef = useRef<string | null>(null);

  const loadStreams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await livestreamService.listStreams(initialGroupContext?.groupId);
      setStreams(res.streams || []);
    } catch (err: any) {
      setNotice(err?.message || 'Unable to load livestreams.');
    } finally {
      setLoading(false);
    }
  }, [initialGroupContext?.groupId]);

  useEffect(() => {
    loadStreams();
  }, [loadStreams]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!initialGroupContext) {
      handledGroupContextKeyRef.current = null;
      return;
    }
    setNewVisibility(initialGroupContext.groupVisibility);
  }, [initialGroupContext]);

  const cleanupMediaAndPeers = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // ignore
      }
    });
    peerConnectionsRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (videoElRef.current) {
      videoElRef.current.srcObject = null;
    }
    if (socketRef.current) {
      socketRef.current.send({ type: 'stream:leave' });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupMediaAndPeers();
    };
  }, [cleanupMediaAndPeers]);

  const createPeerForViewer = useCallback(
    async (viewerUid: string, streamId: string) => {
      if (!socketRef.current) return;
      const existing = peerConnectionsRef.current.get(viewerUid);
      if (existing) existing.close();

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current.set(viewerUid, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.send({
            type: 'stream:webrtc-ice',
            streamId,
            targetUserId: viewerUid,
            candidate: e.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.send({
        type: 'stream:webrtc-offer',
        streamId,
        targetUserId: viewerUid,
        sdp: offer,
      });
    },
    []
  );

  const attachSocketListeners = useCallback(
    (sock: SeedanceRealtimeSocket, stream: LivestreamSession, hostFlag: boolean) => {
      sock.subscribe(async (evt) => {
        if (evt.type === 'stream:joined' && evt.stream) {
          setActiveStream(evt.stream);
          if (Array.isArray(evt.messages)) setMessages(evt.messages);
        } else if (evt.type === 'stream:presence') {
          setActiveStream((prev) =>
            prev
              ? {
                  ...prev,
                  viewerCount: evt.viewerCount ?? prev.viewerCount,
                  viewers: evt.viewers ?? prev.viewers,
                  hasPublisherStream:
                    typeof evt.hasPublisherStream === 'boolean'
                      ? evt.hasPublisherStream
                      : prev.hasPublisherStream,
                }
              : prev
          );
        } else if (evt.type === 'stream:publisher-state') {
          setActiveStream((prev) =>
            prev ? { ...prev, hasPublisherStream: Boolean(evt.hasPublisherStream) } : prev
          );
          if (!evt.hasPublisherStream && !hostFlag) {
            setMediaNotice('Broadcaster media stream is currently offline or paused.');
          } else {
            setMediaNotice(null);
          }
        } else if (evt.type === 'stream:chat' && evt.message) {
          setMessages((prev) => [...prev, evt.message]);
        } else if (evt.type === 'stream:gift' && evt.transaction) {
          setLiveGiftAnim(evt.transaction);
        } else if (evt.type === 'stream:muted') {
          setViewerMuted(Boolean(evt.muted));
          setNotice(evt.muted ? 'Your chat privileges were muted by host.' : 'Host unmuted your chat.');
        } else if (evt.type === 'stream:kicked') {
          setNotice(evt.reason || 'Removed from livestream by moderator.');
          cleanupMediaAndPeers();
          setActiveStream(null);
          setIsHostMode(false);
          loadStreams();
        } else if (evt.type === 'stream:ended') {
          setNotice('This livestream broadcast has ended.');
          cleanupMediaAndPeers();
          setActiveStream(null);
          setIsHostMode(false);
          loadStreams();
        } else if (evt.type === 'stream:error') {
          setNotice(evt.error || 'Livestream notice.');
        } else if (evt.type === 'stream:viewer-ready' && hostFlag && evt.viewerUserId) {
          await createPeerForViewer(evt.viewerUserId, stream.id);
        } else if (evt.type === 'stream:webrtc-offer' && !hostFlag && evt.sdp && evt.fromUserId) {
          const pc = new RTCPeerConnection(RTC_CONFIG);
          peerConnectionsRef.current.set(evt.fromUserId, pc);
          pc.ontrack = (trackEvt) => {
            if (videoElRef.current && trackEvt.streams[0]) {
              videoElRef.current.srcObject = trackEvt.streams[0];
              setMediaNotice(null);
            }
          };
          pc.onicecandidate = (e) => {
            if (e.candidate) {
              sock.send({
                type: 'stream:webrtc-ice',
                streamId: stream.id,
                targetUserId: evt.fromUserId,
                candidate: e.candidate,
              });
            }
          };
          await pc.setRemoteDescription(new RTCSessionDescription(evt.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sock.send({
            type: 'stream:webrtc-answer',
            streamId: stream.id,
            targetUserId: evt.fromUserId,
            sdp: answer,
          });
        } else if (evt.type === 'stream:webrtc-answer' && hostFlag && evt.sdp && evt.fromUserId) {
          const pc = peerConnectionsRef.current.get(evt.fromUserId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(evt.sdp));
          }
        } else if (evt.type === 'stream:webrtc-ice' && evt.candidate && evt.fromUserId) {
          const pc = peerConnectionsRef.current.get(evt.fromUserId);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(evt.candidate)).catch(() => {});
          }
        }
      });
    },
    [cleanupMediaAndPeers, createPeerForViewer, loadStreams]
  );

  const handleStartBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!newTitle.trim()) return;

    setIsStarting(true);
    setNotice(null);
    setMediaNotice(null);

    try {
      // Acquire real camera/mic or screen capture stream
      let mediaStream: MediaStream | null = null;
      try {
        if (sourceMode === 'screen' && navigator.mediaDevices?.getDisplayMedia) {
          mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } else if (navigator.mediaDevices?.getUserMedia) {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } else {
          setMediaNotice('Browser media capture API is unavailable in this context.');
        }
      } catch (mediaErr: any) {
        setMediaNotice(
          mediaErr?.message ||
            'Camera/microphone capture unavailable or denied. Broadcast room created in metadata-standby mode.'
        );
      }

      const res = await livestreamService.startStream({
        title: newTitle.trim(),
        description: newDesc.trim(),
        visibility:
          initialGroupContext?.groupVisibility === 'PRIVATE' ? 'PRIVATE' : newVisibility,
        accessCode:
          initialGroupContext?.groupVisibility !== 'PRIVATE' && newVisibility === 'PRIVATE'
            ? newAccessCode.trim()
            : undefined,
        groupId: initialGroupContext?.groupId,
        postToGroup: true,
      });

      cleanupMediaAndPeers();
      localStreamRef.current = mediaStream;
      setIsHostMode(true);
      setActiveStream(res.stream);
      setShowStartModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewAccessCode('');

      setTimeout(() => {
        if (videoElRef.current && mediaStream) {
          videoElRef.current.srcObject = mediaStream;
        }
      }, 60);

      const sock = new SeedanceRealtimeSocket();
      socketRef.current = sock;
      attachSocketListeners(sock, res.stream, true);
      const ok = await sock.connect({
        username: currentUser?.username,
        displayName: currentUser?.displayName,
      });
      if (ok) {
        sock.send({
          type: 'stream:join',
          streamId: res.stream.id,
          asBroadcaster: true,
        });
        sock.send({
          type: 'stream:publisher-state',
          streamId: res.stream.id,
          hasPublisherStream: Boolean(mediaStream),
        });
      }
      loadStreams();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to launch livestream.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleJoinAsViewer = async (stream: LivestreamSession, code?: string) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (stream.hasAccessCode && !code && stream.hostUserId !== currentUser?.id) {
      setPendingPrivateStream(stream);
      return;
    }
    setNotice(null);
    setMediaNotice(null);
    try {
      const res = await livestreamService.joinStream(stream.id, code);
      cleanupMediaAndPeers();
      setPendingPrivateStream(null);
      setJoinCodeInput('');
      setIsHostMode(res.stream.hostUserId === currentUser?.id);
      setActiveStream(res.stream);
      setMessages(res.messages || []);
      if (!res.stream.hasPublisherStream) {
        setMediaNotice('Connected to broadcast chat. Waiting for host video stream feed...');
      }

      const sock = new SeedanceRealtimeSocket();
      socketRef.current = sock;
      attachSocketListeners(sock, res.stream, res.stream.hostUserId === currentUser?.id);
      const ok = await sock.connect({
        username: currentUser?.username,
        displayName: currentUser?.displayName,
      });
      if (ok) {
        sock.send({
          type: 'stream:join',
          streamId: res.stream.id,
          accessCode: code,
          asBroadcaster: false,
        });
      }
    } catch (err: any) {
      setNotice(err?.message || 'Unable to join livestream.');
    }
  };

  useEffect(() => {
    if (!initialGroupContext || loading || activeStream) return;
    const contextKey = `${initialGroupContext.groupId}:${initialGroupContext.streamIdToJoin || 'launch'}`;
    if (handledGroupContextKeyRef.current === contextKey) return;

    if (initialGroupContext.streamIdToJoin) {
      const match = streams.find((s) => s.id === initialGroupContext.streamIdToJoin);
      if (match) {
        handledGroupContextKeyRef.current = contextKey;
        handleJoinAsViewer(match);
      }
    } else {
      handledGroupContextKeyRef.current = contextKey;
      if (!isAuthenticated) {
        onRequireAuth?.();
      } else {
        setShowStartModal(true);
      }
    }
  });

  const handleLeaveOrEndStream = async () => {
    if (!activeStream) return;
    if (isHostMode || isAdmin) {
      try {
        await livestreamService.endStream(activeStream.id);
      } catch (err: any) {
        setNotice(err?.message || 'Failed to end stream.');
      }
    }
    cleanupMediaAndPeers();
    setActiveStream(null);
    setIsHostMode(false);
    setMessages([]);
    loadStreams();
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current || !activeStream) return;
    socketRef.current.send({
      type: 'stream:chat',
      streamId: activeStream.id,
      text: chatInput.trim(),
    });
    setChatInput('');
  };

  const handleModerate = async (targetUserId: string, action: 'mute' | 'unmute' | 'ban') => {
    if (!activeStream) return;
    try {
      const res = await livestreamService.moderateViewer(activeStream.id, targetUserId, action);
      setActiveStream(res.stream);
    } catch (err: any) {
      setNotice(err?.message || 'Moderation action failed.');
    }
  };

  const toggleBroadcasterTrack = (kind: 'audio' | 'video') => {
    if (!localStreamRef.current) return;
    if (kind === 'audio') {
      const next = !micEnabled;
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
      setMicEnabled(next);
    } else {
      const next = !camEnabled;
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
      setCamEnabled(next);
    }
  };

  // ============================================================================
  // ACTIVE STREAM PLAYER + CHAT + MODERATION WORKSPACE
  // ============================================================================
  if (activeStream) {
    const canModerate = isHostMode || isAdmin || activeStream.hostUserId === currentUser?.id;
    return (
      <div className="w-full h-full overflow-hidden bg-black text-white flex flex-col lg:flex-row select-text">
        <GiftAnimationOverlay giftTx={liveGiftAnim} onDismiss={() => setLiveGiftAnim(null)} />

        {/* Stage Player */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white text-black font-mono text-[10px] font-bold uppercase flex items-center gap-1">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
                <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] font-mono uppercase text-white/75">
                  {activeStream.visibility}
                </span>
                {activeStream.groupName && (
                  <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] font-mono uppercase text-white/75">
                    {activeStream.groupName}
                  </span>
                )}
                <h2 className="text-base sm:text-lg font-serif font-medium text-white">
                  {activeStream.title}
                </h2>
              </div>
              <p className="text-xs text-white/55 font-mono">
                Host: @{activeStream.hostUsername} · {activeStream.viewerCount} Live Viewers
              </p>
            </div>

            <div className="flex items-center gap-2">
              {currentUser?.id !== activeStream.hostUserId && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      onRequireAuth?.();
                      return;
                    }
                    setShowGiftModal(true);
                  }}
                  className="px-3.5 py-2 rounded-lg border border-white/25 bg-white/[0.06] hover:bg-white hover:text-black font-mono text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Send Gift</span>
                </button>
              )}

              {isHostMode && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleBroadcasterTrack('audio')}
                    className="p-2 rounded-lg border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] cursor-pointer"
                    title={micEnabled ? 'Mute mic' : 'Unmute mic'}
                  >
                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-white/45" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBroadcasterTrack('video')}
                    className="p-2 rounded-lg border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] cursor-pointer"
                    title={camEnabled ? 'Disable camera' : 'Enable camera'}
                  >
                    {camEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-white/45" />}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleLeaveOrEndStream}
                className="px-4 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>{canModerate ? 'End Stream' : 'Leave Stream'}</span>
              </button>
            </div>
          </div>

          {/* WebRTC Video Viewport */}
          <div className="w-full aspect-video rounded-2xl border border-white/[0.15] bg-[#08080a] overflow-hidden relative flex items-center justify-center">
            <video
              ref={videoElRef}
              autoPlay
              playsInline
              muted={isHostMode}
              controls={!isHostMode}
              className="w-full h-full object-contain bg-black"
            />
            {(!activeStream.hasPublisherStream && !localStreamRef.current) || mediaNotice ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/75 space-y-2 pointer-events-none">
                <VideoOff className="w-8 h-8 text-white/40" />
                <div className="text-sm font-medium text-white">Broadcast Stream Standby</div>
                <p className="text-xs text-white/60 max-w-md font-mono">
                  {mediaNotice || 'Waiting for broadcaster WebRTC video/audio stream.'}
                </p>
              </div>
            ) : null}
          </div>

          {notice && (
            <div className="p-3 rounded-xl border border-white/20 bg-white/[0.05] text-xs font-mono text-white/85">
              {notice}
            </div>
          )}

          {/* Live Viewers & Host Moderation Panel */}
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-wider text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Live Viewers ({activeStream.viewers?.length || 0})
              </span>
              {canModerate && (
                <span className="text-[10px] text-white/50 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Host Moderation Active
                </span>
              )}
            </div>

            {!activeStream.viewers || activeStream.viewers.length === 0 ? (
              <p className="text-xs text-white/45 font-mono">No connected viewers yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeStream.viewers.map((v) => (
                  <div
                    key={v.userId}
                    className="p-2.5 rounded-xl border border-white/[0.08] bg-black/50 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{v.displayName}</div>
                      <div className="text-[10px] font-mono text-white/45">
                        @{v.username} {v.isMuted ? '· MUTED' : ''}
                      </div>
                    </div>
                    {canModerate && v.userId !== activeStream.hostUserId && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleModerate(v.userId, v.isMuted ? 'unmute' : 'mute')
                          }
                          className="p-1.5 rounded border border-white/15 hover:bg-white hover:text-black text-white/75 cursor-pointer"
                          title={v.isMuted ? 'Unmute chat' : 'Mute chat'}
                        >
                          {v.isMuted ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModerate(v.userId, 'ban')}
                          className="p-1.5 rounded border border-white/15 hover:bg-white hover:text-black text-white/75 cursor-pointer"
                          title="Kick & Ban viewer"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Chat Sidebar */}
        <aside className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-white/[0.12] bg-[#060608] flex flex-col max-h-[45vh] lg:max-h-full shrink-0">
          <div className="p-4 border-b border-white/[0.1] text-xs font-mono uppercase tracking-wider font-semibold">
            Live Stream Chat
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-white/40 font-mono py-8">
                Chat is live. Say hello to the broadcast.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                    <span className="text-white font-semibold">
                      @{m.username}{' '}
                      {m.isHost && (
                        <span className="px-1 rounded bg-white text-black text-[9px] ml-1">HOST</span>
                      )}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-white/85 mt-1 break-words">{m.text}</p>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} className="p-3 border-t border-white/[0.1] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={viewerMuted}
              placeholder={viewerMuted ? 'Muted by host...' : 'Send live chat message...'}
              className="flex-1 px-3 py-2 rounded-lg border border-white/[0.14] bg-black text-white placeholder-white/35 text-xs focus:outline-none focus:border-white disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={viewerMuted || !chatInput.trim()}
              className="px-3 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>

        <VirtualGiftModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          recipientId={activeStream.hostUserId}
          recipientUsername={activeStream.hostUsername}
          recipientDisplayName={activeStream.hostDisplayName}
          groupId={activeStream.groupId}
          livestreamId={activeStream.id}
          currentCredits={currentCredits}
          isAuthenticated={isAuthenticated}
          onRequireAuth={onRequireAuth}
          onOpenCredits={onOpenCredits}
          onGiftSent={(tx) => {
            setLiveGiftAnim(tx);
            onRefreshBalance?.();
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // LIVESTREAM DIRECTORY (REAL ACTIVE DB BROADCASTS ONLY)
  // ============================================================================
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono">
                {initialGroupContext
                  ? `Group Livestreams · ${initialGroupContext.groupName}`
                  : 'Seedance Lab Livestreams'}
              </h1>
              {initialGroupContext && onClearGroupContext && (
                <button
                  type="button"
                  onClick={onClearGroupContext}
                  className="px-2 py-0.5 rounded border border-white/20 text-[10px] font-mono text-white/70 hover:text-white cursor-pointer"
                >
                  Show All Streams
                </button>
              )}
            </div>
            <p className="text-xs text-white/60">
              Real-time creator broadcasts, live camera/screen sessions, WebSocket chat, virtual gifts, and host moderation. Zero simulated streams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadStreams}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  onRequireAuth?.();
                  return;
                }
                setShowStartModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Start Livestream</span>
            </button>
          </div>
        </section>

        {notice && (
          <div className="p-4 rounded-xl border border-white/20 bg-white/[0.05] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/50 hover:text-white font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {streams.length === 0 ? (
          <section className="p-12 rounded-2xl border border-white/[0.1] bg-white/[0.025] text-center space-y-3">
            <Radio className="w-8 h-8 text-white/30 mx-auto" />
            <h2 className="text-base font-medium text-white">No Active Livestreams Right Now</h2>
            <p className="text-xs text-white/55 max-w-md mx-auto">
              Only verified real broadcasts started by creators appear here. Start a public or private session to broadcast your Seedance workflow live.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  onRequireAuth?.();
                  return;
                }
                setShowStartModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
            >
              Launch First Broadcast
            </button>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-white text-black font-bold uppercase">
                      LIVE · {s.viewerCount} VIEWING
                    </span>
                    <span className="px-2 py-0.5 rounded border border-white/20 text-white/75 flex items-center gap-1">
                      {s.visibility === 'PRIVATE' && <Lock className="w-2.5 h-2.5" />}
                      {s.visibility}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{s.title}</h3>
                  {s.description && <p className="text-xs text-white/60 line-clamp-2">{s.description}</p>}
                  <div className="text-[11px] font-mono text-white/50">
                    Host: @{s.hostUsername} · Started {new Date(s.startedAt).toLocaleTimeString()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoinAsViewer(s)}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
                >
                  {s.visibility === 'PRIVATE' ? 'Enter Access Code & Watch' : 'Watch Live Stream'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Livestream Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleStartBroadcast}
            className="w-full max-w-md rounded-2xl border border-white/20 bg-[#08080a] p-6 space-y-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider font-semibold">
                Start Live Broadcast
              </h2>
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Stream Title (e.g. Seedance 2.5 Scene Lighting Breakdown)"
                className="w-full p-2.5 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35"
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                placeholder="Description (optional)"
                className="w-full p-2.5 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35"
              />

              <div className="grid grid-cols-2 gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setSourceMode('camera')}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
                    sourceMode === 'camera'
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/15 bg-white/[0.04] text-white/70'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Camera + Mic
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('screen')}
                  className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
                    sourceMode === 'screen'
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/15 bg-white/[0.04] text-white/70'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Screen Share
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono">
                {(['PUBLIC', 'PRIVATE'] as LivestreamVisibility[]).map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => setNewVisibility(vis)}
                    className={`p-2 rounded-lg border cursor-pointer ${
                      newVisibility === vis
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/15 bg-white/[0.04] text-white/70'
                    }`}
                  >
                    {vis}
                  </button>
                ))}
              </div>

              {newVisibility === 'PRIVATE' && (
                <input
                  type="text"
                  required
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  placeholder="Private stream access code"
                  className="w-full p-2.5 rounded-lg border border-white/[0.15] bg-black text-white font-mono"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isStarting}
              className="w-full py-3 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
            >
              {isStarting ? 'Initializing Broadcast...' : 'Go Live Now'}
            </button>
          </form>
        </div>
      )}

      {/* Private Stream Access Code Prompt */}
      {pendingPrivateStream && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#08080a] p-6 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-semibold">Private Broadcast</span>
              <button
                type="button"
                onClick={() => setPendingPrivateStream(null)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/65">
              Enter the host access code to watch "{pendingPrivateStream.title}".
            </p>
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value)}
              placeholder="Access Code"
              className="w-full p-2.5 rounded-lg border border-white/20 bg-black text-white font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => handleJoinAsViewer(pendingPrivateStream, joinCodeInput)}
              className="w-full py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
            >
              Verify & Watch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
