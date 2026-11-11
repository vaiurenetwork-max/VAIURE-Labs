import React, { useState } from 'react';
import { X, Copy, Check, Users, Shield, Link, Key } from 'lucide-react';
import { CollaborativeRoom, ParticipantRole } from '../../../types/collaborativeRooms';

interface InviteCollaboratorModalProps {
  isOpen: boolean;
  room: CollaborativeRoom | null;
  onClose: () => void;
}

export const InviteCollaboratorModal: React.FC<InviteCollaboratorModalProps> = ({
  isOpen,
  room,
  onClose,
}) => {
  const [role, setRole] = useState<ParticipantRole>('EDITOR');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !room) return null;

  const inviteUrl = `${window.location.origin}#room=${room.id}&code=${room.inviteCode}&role=${role}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0D0D14] border border-white/15 rounded-xl shadow-2xl p-6 space-y-5 text-[#ECECE9] animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display text-base font-bold uppercase tracking-tight text-white">
              Invite Collaborators
            </h3>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <div className="text-white/80 font-bold uppercase text-[11px]">{room.name}</div>
            <div className="text-white/50 text-[10px]">Invite collaborators to edit the SharedWorks canvas in real time.</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-[11px]">Default Role for Invitees</label>
            <div className="grid grid-cols-3 gap-2">
              {(['EDITOR', 'VIEWER', 'ADMIN'] as ParticipantRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-1.5 px-2 rounded border text-center transition-colors cursor-pointer ${
                    role === r
                      ? 'border-white bg-white/15 text-white font-bold'
                      : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-[11px]">Invite Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 bg-black/60 border border-white/15 rounded px-2.5 py-1.5 text-[11px] font-mono text-white/70 select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded bg-white text-black font-bold hover:bg-neutral-200 transition-colors flex items-center gap-1 shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded bg-white/[0.03] border border-white/10 flex items-center justify-between text-[10px]">
            <span className="text-white/50">Room Invite Code:</span>
            <span className="font-mono text-emerald-400 font-bold tracking-widest">{room.inviteCode}</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
