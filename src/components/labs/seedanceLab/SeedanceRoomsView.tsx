/**
 * VAIURE — SEEDANCE LAB MULTIPLAYER CALL: LIVE ROOMS
 * Lists ONLY real persisted DB rooms (ZERO static demo rooms).
 * Full multi-peer WebRTC audio/video mesh signaling via /ws, invite codes,
 * lock/unlock controls, mute/remove moderation, and creator close controls.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PhoneCall,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  PhoneOff,
  Plus,
  Copy,
  Check,
  RefreshCw,
  X,
  AlertCircle,
  Shield,
} from 'lucide-react';
import {
  LiveCallParticipant,
  LiveCallRoom,
  LiveCallRoomVisibility,
} from '../../../types/seedancePlatform';
import { UserProfile } from '../../../types/social';
import {
  liveRoomsService,
  RTC_CONFIG,
  SeedanceRealtimeSocket,
} from '../../../services/seedanceWorkspaceService';

interface SeedanceRoomsViewProps {
  currentUser?: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onRequireAuth?: () => void;
}

const RemotePeerTile: React.FC<{
  participant: LiveCallParticipant;
  stream?: MediaStream;
  isSelf: boolean;
  isCreator: boolean;
  canModerate: boolean;
  onMuteToggle?: () => void;
  onRemove?: () => void;
}> = ({ participant, stream, isSelf, isCreator, canModerate, onMuteToggle, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="rounded-2xl border border-white/[0.14] bg-[#0a0a0d] overflow-hidden flex flex-col justify-between relative aspect-video">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="w-full h-full object-cover bg-black"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black/80">
          <div className="w-12 h-12 rounded-full border border-white/25 bg-white/[0.06] flex items-center justify-center font-serif text-lg uppercase">
            {(participant.displayName || participant.username || 'U').slice(0, 2)}
          </div>
          <span className="text-[11px] font-mono text-white/50">
            {isSelf ? 'Camera off / Audio standby' : 'Waiting for peer WebRTC media...'}
          </span>
        </div>
      )}

      {/* Top Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 rounded bg-black/80 border border-white/15 text-[10px] font-mono text-white flex items-center gap-1.5">
          <span>@{participant.username}</span>
          {participant.role === 'CREATOR' && (
            <span className="px-1 rounded bg-white text-black font-bold text-[9px]">HOST</span>
          )}
          {isSelf && <span className="text-white/60">(YOU)</span>}
        </span>

        <div className="flex items-center gap-1">
          <span className="p-1.5 rounded bg-black/80 border border-white/15">
            {participant.audioEnabled && !participant.mutedByHost ? (
              <Mic className="w-3 h-3 text-white" />
            ) : (
              <MicOff className="w-3 h-3 text-white/45" />
            )}
          </span>
          <span className="p-1.5 rounded bg-black/80 border border-white/15">
            {participant.videoEnabled ? (
              <Video className="w-3 h-3 text-white" />
            ) : (
              <VideoOff className="w-3 h-3 text-white/45" />
            )}
          </span>
        </div>
      </div>

      {/* Bottom Creator Moderation Actions */}
      {canModerate && !isSelf && !isCreator && (
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
          {onMuteToggle && (
            <button
              type="button"
              onClick={onMuteToggle}
              className="px-2 py-1 rounded bg-black/85 border border-white/20 hover:bg-white hover:text-black text-[10px] font-mono uppercase cursor-pointer"
            >
              {participant.mutedByHost ? 'Unmute' : 'Mute'}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded bg-black/85 border border-white/20 hover:bg-white hover:text-black cursor-pointer"
              title="Remove participant"
            >
              <UserMinus className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const SeedanceRoomsView: React.FC<SeedanceRoomsViewProps> = ({
  currentUser,
  isAuthenticated,
  isAdmin = false,
  onRequireAuth,
}) => {
  const [rooms, setRooms] = useState<LiveCallRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<LiveCallRoom | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'public' | 'mine'>('all');
  const [inviteCodeJoin, setInviteCodeJoin] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Create room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomVis, setRoomVis] = useState<LiveCallRoomVisibility>('PUBLIC');
  const [roomSeats, setRoomSeats] = useState<number>(8);
  const [creating, setCreating] = useState(false);

  // Active call state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [inviteTarget, setInviteTarget] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const socketRef = useRef<SeedanceRealtimeSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await liveRoomsService.listRooms();
      setRooms(res.rooms || []);
    } catch (err: any) {
      setNotice(err?.message || 'Unable to load multiplayer call rooms.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const cleanupCall = useCallback(() => {
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // ignore
      }
    });
    peersRef.current.clear();
    setRemoteStreams({});

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    if (socketRef.current) {
      socketRef.current.send({ type: 'room:leave' });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  const createPeerConnection = useCallback(
    (peerUid: string, roomId: string, sock: SeedanceRealtimeSocket) => {
      const existing = peersRef.current.get(peerUid);
      if (existing) existing.close();

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(peerUid, pc);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (evt) => {
        if (evt.streams[0]) {
          setRemoteStreams((prev) => ({ ...prev, [peerUid]: evt.streams[0] }));
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sock.send({
            type: 'room:webrtc-ice',
            roomId,
            targetUserId: peerUid,
            candidate: e.candidate,
          });
        }
      };

      return pc;
    },
    []
  );

  const connectIntoRoom = async (room: LiveCallRoom, inviteCode?: string) => {
    cleanupCall();

    // Acquire real camera/mic with graceful fallback
    let captured: MediaStream | null = null;
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        captured = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      }
    } catch {
      try {
        captured = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setVideoOn(false);
        setNotice('Camera unavailable; joined multiplayer call with audio microphone.');
      } catch {
        setAudioOn(false);
        setVideoOn(false);
        setNotice('Camera and microphone permissions denied or unavailable; joined in listen-only mode.');
      }
    }

    localStreamRef.current = captured;
    setLocalStream(captured);
    setActiveRoom(room);

    const sock = new SeedanceRealtimeSocket();
    socketRef.current = sock;

    sock.subscribe(async (evt) => {
      if (evt.type === 'room:joined' && evt.room) {
        setActiveRoom(evt.room);
      } else if (evt.type === 'room:participants-sync') {
        setActiveRoom((prev) =>
          prev
            ? {
                ...prev,
                participants: evt.participants || prev.participants,
                locked: typeof evt.locked === 'boolean' ? evt.locked : prev.locked,
              }
            : prev
        );
      } else if (evt.type === 'room:peer-joined' && evt.userId) {
        if (evt.participants) {
          setActiveRoom((prev) => (prev ? { ...prev, participants: evt.participants } : prev));
        }
        // Existing peers initiate WebRTC offer to newly joined peer
        if (evt.userId !== currentUser?.id) {
          const pc = createPeerConnection(evt.userId, room.id, sock);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sock.send({
            type: 'room:webrtc-offer',
            roomId: room.id,
            targetUserId: evt.userId,
            sdp: offer,
          });
        }
      } else if (evt.type === 'room:peer-left' && evt.userId) {
        const pc = peersRef.current.get(evt.userId);
        if (pc) pc.close();
        peersRef.current.delete(evt.userId);
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[evt.userId];
          return next;
        });
        if (evt.participants) {
          setActiveRoom((prev) => (prev ? { ...prev, participants: evt.participants } : prev));
        }
      } else if (evt.type === 'room:webrtc-offer' && evt.fromUserId && evt.sdp) {
        const pc = createPeerConnection(evt.fromUserId, room.id, sock);
        await pc.setRemoteDescription(new RTCSessionDescription(evt.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.send({
          type: 'room:webrtc-answer',
          roomId: room.id,
          targetUserId: evt.fromUserId,
          sdp: answer,
        });
      } else if (evt.type === 'room:webrtc-answer' && evt.fromUserId && evt.sdp) {
        const pc = peersRef.current.get(evt.fromUserId);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(evt.sdp));
      } else if (evt.type === 'room:webrtc-ice' && evt.fromUserId && evt.candidate) {
        const pc = peersRef.current.get(evt.fromUserId);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(evt.candidate)).catch(() => {});
      } else if (evt.type === 'room:muted-by-host') {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setAudioOn(false);
        setNotice('Your microphone was muted by the room creator.');
      } else if (evt.type === 'room:removed') {
        setNotice('You were removed from the call room by the creator.');
        cleanupCall();
        setActiveRoom(null);
        loadRooms();
      } else if (evt.type === 'room:closed') {
        setNotice('Room was closed by the creator.');
        cleanupCall();
        setActiveRoom(null);
        loadRooms();
      }
    });

    const connected = await sock.connect({
      username: currentUser?.username,
      displayName: currentUser?.displayName,
    });
    if (connected) {
      sock.send({
        type: 'room:join',
        roomId: room.id,
        inviteCode,
      });
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!roomName.trim()) return;
    setCreating(true);
    setNotice(null);
    try {
      const res = await liveRoomsService.createRoom({
        name: roomName.trim(),
        description: roomDesc.trim(),
        visibility: roomVis,
        maxParticipants: roomSeats,
      });
      setShowCreateModal(false);
      setRoomName('');
      setRoomDesc('');
      await connectIntoRoom(res.room, res.room.inviteCode);
      loadRooms();
    } catch (err: any) {
      setNotice(err?.message || 'Could not create call room.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (payload: { roomId?: string; inviteCode?: string }) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setNotice(null);
    try {
      const res = await liveRoomsService.joinRoom(payload);
      await connectIntoRoom(res.room, payload.inviteCode);
      setInviteCodeJoin('');
    } catch (err: any) {
      setNotice(err?.message || 'Unable to join call room.');
    }
  };

  const toggleAudio = () => {
    const next = !audioOn;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
    }
    setAudioOn(next);
    socketRef.current?.send({
      type: 'room:media-state',
      audioEnabled: next,
      videoEnabled: videoOn,
    });
  };

  const toggleVideo = () => {
    const next = !videoOn;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = next));
    }
    setVideoOn(next);
    socketRef.current?.send({
      type: 'room:media-state',
      audioEnabled: audioOn,
      videoEnabled: next,
    });
  };

  const handleRoomModerate = async (
    action: 'mute_participant' | 'unmute_participant' | 'remove_participant' | 'lock' | 'unlock' | 'close',
    targetUserId?: string
  ) => {
    if (!activeRoom) return;
    try {
      const res = await liveRoomsService.moderateRoom(activeRoom.id, action, targetUserId);
      if (action === 'close') {
        cleanupCall();
        setActiveRoom(null);
        loadRooms();
      } else {
        setActiveRoom(res.room);
      }
    } catch (err: any) {
      setNotice(err?.message || 'Moderation command failed.');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !inviteTarget.trim()) return;
    try {
      const res = await liveRoomsService.inviteUser(activeRoom.id, inviteTarget.trim());
      setActiveRoom(res.room);
      setInviteTarget('');
      setNotice(`Invited "${inviteTarget.trim()}" to the room.`);
    } catch (err: any) {
      setNotice(err?.message || 'Invite failed.');
    }
  };

  // ============================================================================
  // ACTIVE MULTIPLAYER CALL WORKSPACE
  // ============================================================================
  if (activeRoom) {
    const canModerate = activeRoom.creatorUserId === currentUser?.id || isAdmin;
    return (
      <div className="w-full h-full overflow-hidden bg-black text-white flex flex-col select-text">
        {/* Call Header */}
        <div className="p-4 sm:px-6 border-b border-white/[0.12] bg-[#060608] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-white text-black font-mono text-[10px] font-bold uppercase">
                LIVE CALL
              </span>
              <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] font-mono uppercase text-white/75">
                {activeRoom.visibility}
              </span>
              {activeRoom.locked && (
                <span className="px-2 py-0.5 rounded border border-white/25 bg-white/[0.08] text-[10px] font-mono uppercase flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
              <h2 className="text-base font-serif font-medium text-white">{activeRoom.name}</h2>
            </div>
            <div className="text-[11px] font-mono text-white/50 flex flex-wrap items-center gap-3">
              <span>
                {activeRoom.participants.length} / {activeRoom.maxParticipants} Participants
              </span>
              {activeRoom.inviteCode && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeRoom.inviteCode!);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 1800);
                  }}
                  className="text-white/80 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>Invite Code: {activeRoom.inviteCode}</span>
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer ${
                audioOn
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-white/20 bg-white/[0.04] text-white/70'
              }`}
            >
              {audioOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{audioOn ? 'Mic ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center gap-1.5 cursor-pointer ${
                videoOn
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-white/20 bg-white/[0.04] text-white/70'
              }`}
            >
              {videoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>{videoOn ? 'Cam ON' : 'Cam OFF'}</span>
            </button>

            {canModerate && (
              <>
                <button
                  type="button"
                  onClick={() => handleRoomModerate(activeRoom.locked ? 'unlock' : 'lock')}
                  className="px-3 py-2 rounded-lg border border-white/20 bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  {activeRoom.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{activeRoom.locked ? 'Unlock' : 'Lock'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoomModerate('close')}
                  className="px-3 py-2 rounded-lg border border-white/25 bg-white/[0.08] hover:bg-white hover:text-black text-xs font-mono uppercase cursor-pointer"
                >
                  Close Room
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                cleanupCall();
                setActiveRoom(null);
                loadRooms();
              }}
              className="px-3.5 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mx-4 mt-3 p-3 rounded-xl border border-white/20 bg-white/[0.05] text-xs font-mono text-white/85 flex items-center justify-between">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Participant Grid + Creator Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeRoom.participants.map((p) => {
              const isSelf = p.userId === currentUser?.id;
              return (
                <RemotePeerTile
                  key={p.userId}
                  participant={p}
                  stream={isSelf ? localStream || undefined : remoteStreams[p.userId]}
                  isSelf={isSelf}
                  isCreator={p.userId === activeRoom.creatorUserId}
                  canModerate={canModerate}
                  onMuteToggle={() =>
                    handleRoomModerate(
                      p.mutedByHost ? 'unmute_participant' : 'mute_participant',
                      p.userId
                    )
                  }
                  onRemove={() => handleRoomModerate('remove_participant', p.userId)}
                />
              );
            })}
          </div>

          {canModerate && (
            <form
              onSubmit={handleSendInvite}
              className="max-w-lg p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-white/75 shrink-0">
                <UserPlus className="w-4 h-4" />
                <span>Invite Collaborator:</span>
              </div>
              <input
                type="text"
                value={inviteTarget}
                onChange={(e) => setInviteTarget(e.target.value)}
                placeholder="Username, email, or UID"
                className="flex-1 px-3 py-2 rounded-lg border border-white/[0.14] bg-black text-white placeholder-white/35 text-xs font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer shrink-0"
              >
                Invite
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MULTIPLAYER CALL ROOMS DIRECTORY (REAL DB ROOMS ONLY)
  // ============================================================================
  const filteredRooms = rooms.filter((r) => {
    if (filterMode === 'public') return r.visibility === 'PUBLIC';
    if (filterMode === 'mine') {
      return (
        r.creatorUserId === currentUser?.id ||
        r.participants.some((p) => p.userId === currentUser?.id)
      );
    }
    return true;
  });

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        {/* Header */}
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono">
                Multiplayer Call — Live Rooms
              </h1>
            </div>
            <p className="text-xs text-white/60">
              Real-time WebRTC voice & video rooms created by users. Public, Private, or Invite-Only with creator moderation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inviteCodeJoin}
                onChange={(e) => setInviteCodeJoin(e.target.value)}
                placeholder="Enter Invite Code..."
                className="px-3 py-2 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35 text-xs font-mono w-40"
              />
              <button
                type="button"
                disabled={!inviteCodeJoin.trim()}
                onClick={() => handleJoinRoom({ inviteCode: inviteCodeJoin.trim() })}
                className="px-3 py-2 rounded-lg border border-white/[0.2] bg-white/[0.06] hover:bg-white hover:text-black text-xs font-mono uppercase cursor-pointer disabled:opacity-40"
              >
                Join Code
              </button>
            </div>

            <button
              type="button"
              onClick={loadRooms}
              disabled={loading}
              className="px-3 py-2 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
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
                setShowCreateModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Live Room</span>
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

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {[
            { id: 'all', label: `All Active Rooms (${rooms.length})` },
            { id: 'public', label: 'Public Rooms' },
            { id: 'mine', label: 'My / Hosted Rooms' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                filterMode === tab.id
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-white/[0.1] bg-white/[0.03] text-white/65 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length === 0 ? (
          <section className="p-12 rounded-2xl border border-white/[0.1] bg-white/[0.025] text-center space-y-3">
            <Users className="w-8 h-8 text-white/30 mx-auto" />
            <h2 className="text-base font-medium text-white">No Active Call Rooms</h2>
            <p className="text-xs text-white/55 max-w-md mx-auto">
              Only real live call rooms created by authenticated members are listed here. Create a public, private, or invite-only room to collaborate in real time.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  onRequireAuth?.();
                  return;
                }
                setShowCreateModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
            >
              Create First Live Room
            </button>
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-white text-black font-bold uppercase">
                      {r.participants.length} / {r.maxParticipants} IN CALL
                    </span>
                    <span className="px-2 py-0.5 rounded border border-white/20 text-white/75">
                      {r.visibility} {r.locked ? '· LOCKED' : ''}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{r.name}</h3>
                  {r.description && <p className="text-xs text-white/60 line-clamp-2">{r.description}</p>}
                  <div className="text-[11px] font-mono text-white/50">
                    Creator: @{r.creatorUsername}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleJoinRoom({ roomId: r.id, inviteCode: r.inviteCode })}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
                >
                  Join Live Call
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRoom}
            className="w-full max-w-md rounded-2xl border border-white/20 bg-[#08080a] p-6 space-y-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider font-semibold">
                Create Multiplayer Call Room
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Room Name (e.g. Scene 04 Director Review)"
                className="w-full p-2.5 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35"
              />
              <textarea
                value={roomDesc}
                onChange={(e) => setRoomDesc(e.target.value)}
                rows={2}
                placeholder="Session purpose (optional)"
                className="w-full p-2.5 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35"
              />

              <div className="grid grid-cols-3 gap-1.5 font-mono">
                {(['PUBLIC', 'PRIVATE', 'INVITE_ONLY'] as LiveCallRoomVisibility[]).map((vis) => (
                  <button
                    key={vis}
                    type="button"
                    onClick={() => setRoomVis(vis)}
                    className={`p-2 rounded-lg border text-[10px] cursor-pointer ${
                      roomVis === vis
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/15 bg-white/[0.04] text-white/70'
                    }`}
                  >
                    {vis.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/60">Max Participants:</span>
                <input
                  type="number"
                  min={2}
                  max={25}
                  value={roomSeats}
                  onChange={(e) => setRoomSeats(Number(e.target.value) || 8)}
                  className="w-20 p-1.5 rounded border border-white/20 bg-black text-white text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
            >
              {creating ? 'Creating Room...' : 'Launch Room & Join Call'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
