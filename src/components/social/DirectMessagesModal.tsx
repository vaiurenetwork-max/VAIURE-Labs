import React, { useState, useEffect, useRef } from 'react';
import { Conversation, UserProfile, ChatMessage } from '../../types/social';
import {
  X,
  Send,
  Briefcase,
  Check,
  CheckCheck,
  ArrowRight,
  Shield,
  Clock,
  Sparkles,
  ArrowLeft,
  Search,
  MessageSquare,
  UserPlus,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  AtSign,
  AlertCircle,
} from 'lucide-react';
import {
  getConversationId,
  subscribeToConversationMessages,
  markConversationMessagesRead,
  isUserActive,
  uploadMediaToFirebaseStorage,
} from '../../services/firestoreSocialService';

interface DirectMessagesModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  conversations: Conversation[];
  creators?: Record<string, UserProfile>;
  activeRecipient?: UserProfile | null;
  initialCollabMode?: boolean;
  onClose: () => void;
  onSendMessage: (
    convId: string,
    text: string,
    isCollab?: boolean,
    collabDetails?: ChatMessage['collabDetails'],
    sharedPostId?: string,
    sharedPostTitle?: string,
    explicitRecipient?: UserProfile
  ) => void;
  onOpenUserProfile?: (username: string) => void;
}

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  currentUser,
  conversations,
  creators = {},
  activeRecipient,
  initialCollabMode = false,
  onClose,
  onSendMessage,
  onOpenUserProfile,
}) => {
  // Compute initial conversation ID deterministically
  const getInitialConvId = () => {
    if (activeRecipient && currentUser.id && activeRecipient.id) {
      return getConversationId(currentUser.id, activeRecipient.id);
    }
    if (activeRecipient) {
      const existing = conversations.find(
        (c) => c.participant.username === activeRecipient.username
      );
      if (existing) return existing.id;
    }
    return conversations[0]?.id || '';
  };

  const [selectedConvId, setSelectedConvId] = useState<string>(getInitialConvId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(initialCollabMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(activeRecipient || null);

  // Attachment upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachedMediaUrl, setAttachedMediaUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [collabForm, setCollabForm] = useState({
    projectTitle: '',
    budget: '',
    timeline: '',
    scope: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Sync recipient and active conversation when activeRecipient changes
  useEffect(() => {
    if (activeRecipient && currentUser.id && activeRecipient.id) {
      const targetId = getConversationId(currentUser.id, activeRecipient.id);
      setSelectedConvId(targetId);
      setSelectedRecipient(activeRecipient);
      setIsCollabModalOpen(initialCollabMode);
    }
  }, [activeRecipient, currentUser.id, initialCollabMode]);

  // Subscribe to real-time messages for selected conversation
  useEffect(() => {
    if (!isOpen || !selectedConvId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const unsubscribe = subscribeToConversationMessages(selectedConvId, (liveMessages) => {
      setMessages(liveMessages);
      setIsLoadingMessages(false);

      // Automatically mark incoming messages as read
      if (currentUser?.id) {
        markConversationMessagesRead(selectedConvId, currentUser.id).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, selectedConvId, currentUser?.id]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Focus input when conversation is opened
  useEffect(() => {
    if (isOpen && selectedConvId) {
      setTimeout(() => chatInputRef.current?.focus(), 150);
    }
  }, [isOpen, selectedConvId]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCollabModalOpen) {
          setIsCollabModalOpen(false);
        } else if (isNewChatModalOpen) {
          setIsNewChatModalOpen(false);
        } else if (selectedConvId && window.innerWidth < 768) {
          setSelectedConvId('');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCollabModalOpen, isNewChatModalOpen, selectedConvId, onClose]);

  if (!isOpen) return null;

  // Active conversation metadata
  const currentConv = conversations.find((c) => c.id === selectedConvId);
  const activeChatPartner =
    selectedRecipient ||
    currentConv?.participant ||
    (activeRecipient && activeRecipient.username ? activeRecipient : null);

  const partnerIsOnline = isUserActive(activeChatPartner);

  // Filter conversations for left list
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = conv.participant.displayName?.toLowerCase().includes(q);
    const userMatch = conv.participant.username?.toLowerCase().includes(q);
    const textMatch = conv.lastMessage?.text?.toLowerCase().includes(q);
    return nameMatch || userMatch || textMatch;
  });

  // Candidate users for New Conversation
  const creatorsList: UserProfile[] = (Object.values(creators || {}) as UserProfile[]).filter(
    (c) => Boolean(c && c.id && c.id !== currentUser.id && c.username !== currentUser.username)
  );

  const filteredNewRecipients = creatorsList.filter((c: UserProfile) => {
    if (!newChatSearch.trim()) return true;
    const q = newChatSearch.toLowerCase();
    return (
      c.displayName?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q)
    );
  });

  const handleSelectNewRecipient = (recipient: UserProfile) => {
    if (!currentUser.id || !recipient.id) return;
    const convId = getConversationId(currentUser.id, recipient.id);
    setSelectedRecipient(recipient);
    setSelectedConvId(convId);
    setIsNewChatModalOpen(false);
    setNewChatSearch('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds 15MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const res = await uploadMediaToFirebaseStorage(
        file,
        currentUser.id,
        'messages',
        (pct) => setUploadProgress(pct)
      );
      setAttachedMediaUrl(res.url);
    } catch (err: any) {
      console.warn('Image upload error in DM:', err);
      setUploadError('Could not upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend && !attachedMediaUrl) return;
    if (!selectedConvId || !activeChatPartner) return;

    onSendMessage(
      selectedConvId,
      textToSend || (attachedMediaUrl ? 'Attached image dispatch' : ''),
      false,
      undefined,
      undefined,
      undefined,
      activeChatPartner
    );

    setInputText('');
    setAttachedMediaUrl(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleCollabSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabForm.projectTitle.trim() || !selectedConvId || !activeChatPartner) return;

    onSendMessage(
      selectedConvId,
      `COLLABORATION PROPOSAL: ${collabForm.projectTitle.toUpperCase()}`,
      true,
      collabForm,
      undefined,
      undefined,
      activeChatPartner
    );

    setIsCollabModalOpen(false);
    setCollabForm({ projectTitle: '', budget: '', timeline: '', scope: '' });
  };

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl overflow-hidden p-2 sm:p-4 md:p-8 select-text">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Responsive DM Workspace Shell */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl h-[92vh] sm:h-[86vh] bg-[#09090b] border border-white/15 text-white shadow-2xl overflow-hidden flex flex-col md:flex-row rounded-none sm:rounded-sm animate-in fade-in zoom-in-95 duration-200"
      >
        {/* ======================================================== */}
        {/* LEFT CONVERSATIONS COLUMN / ROSTER                       */}
        {/* ======================================================== */}
        <div
          className={`w-full md:w-80 lg:w-88 border-r border-white/10 flex flex-col bg-[#070709] shrink-0 transition-all ${
            selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Roster Header */}
          <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/50">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-widest text-white/90 uppercase font-semibold">
                DISPATCHES
              </span>
              <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                // {conversations.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                title="New Direct Message"
                aria-label="New Message"
                className="w-7 h-7 rounded-sm flex items-center justify-center text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClose}
                aria-label="Close"
                className="md:hidden w-7 h-7 rounded-sm flex items-center justify-center text-white/60 hover:text-white bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Search in Roster */}
          <div className="px-3 py-2.5 border-b border-white/5 bg-black/30">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-sm pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-white/40 hover:text-white text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <MessageSquare className="w-6 h-6 text-white/20 mx-auto" />
                <p className="font-mono text-[11px] text-white/40 uppercase tracking-widest">
                  {searchQuery ? 'NO MATCHING CONVERSATIONS' : 'NO ACTIVE CONVERSATIONS'}
                </p>
                <p className="text-xs text-white/30 font-light leading-relaxed">
                  Start a direct dispatch with creators or propose collaboration.
                </p>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black font-mono text-[10px] uppercase font-bold tracking-wider hover:bg-neutral-200 transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>START DISPATCH</span>
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === selectedConvId;
                const online = isUserActive(conv.participant);
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      setSelectedRecipient(conv.participant);
                    }}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative select-none ${
                      isActive
                        ? 'bg-white/10 border-l-2 border-white'
                        : 'hover:bg-white/[0.04] border-l-2 border-transparent'
                    }`}
                  >
                    {/* User Avatar with Presence */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/15 shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-xs text-white/70">
                      {conv.participant.avatar ? (
                        <img
                          src={conv.participant.avatar}
                          alt={conv.participant.displayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover filter grayscale"
                        />
                      ) : (
                        <span>
                          {conv.participant.username
                            ? conv.participant.username.slice(0, 2).toUpperCase()
                            : 'VA'}
                        </span>
                      )}
                      {online && (
                        <span
                          title="Active now"
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black"
                        />
                      )}
                    </div>

                    {/* Metadata & Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-serif uppercase tracking-tight text-white font-medium truncate">
                          {conv.participant.displayName || conv.participant.username}
                        </span>
                        <span className="text-[9px] font-mono text-white/40 shrink-0">
                          {formatMessageTime(conv.lastMessage?.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[11px] text-neutral-400 truncate font-light leading-snug">
                          {conv.lastMessage?.isCollabRequest
                            ? '★ Formal Collaboration Proposal'
                            : conv.lastMessage?.text || 'No dispatches yet'}
                        </p>

                        {conv.unreadCount > 0 && (
                          <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-black font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom user quick switch / status footer */}
          <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-[10px] font-mono text-white/40">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">@{currentUser.username} (Connected)</span>
            </div>
            <span className="uppercase text-[9px] text-white/30 shrink-0">E2E DISPATCH</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT ACTIVE CHAT WORKSPACE                              */}
        {/* ======================================================== */}
        <div
          className={`flex-1 flex flex-col bg-[#09090b] min-w-0 h-full ${
            !selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConvId && activeChatPartner ? (
            <>
              {/* Header with Partner Info, Back Button, Collab Brief & Close */}
              <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-neutral-950/95 shrink-0 gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {/* Mobile Back Button to Return to Conversations List */}
                  <button
                    onClick={() => setSelectedConvId('')}
                    aria-label="Back to conversations list"
                    title="Return to messages list"
                    className="md:hidden w-8 h-8 rounded-sm flex items-center justify-center text-white/70 hover:text-white bg-white/[0.06] border border-white/10 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Avatar */}
                  <div
                    onClick={() => {
                      if (activeChatPartner.username && onOpenUserProfile) {
                        onOpenUserProfile(activeChatPartner.username);
                      }
                    }}
                    className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-xs text-white/70 cursor-pointer hover:border-white transition-colors"
                  >
                    {activeChatPartner.avatar ? (
                      <img
                        src={activeChatPartner.avatar}
                        alt={activeChatPartner.displayName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover filter grayscale"
                      />
                    ) : (
                      <span>
                        {activeChatPartner.username
                          ? activeChatPartner.username.slice(0, 2).toUpperCase()
                          : 'VA'}
                      </span>
                    )}
                    {partnerIsOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                    )}
                  </div>

                  {/* Name & Active State */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 truncate">
                      <h3
                        onClick={() => {
                          if (activeChatPartner.username && onOpenUserProfile) {
                            onOpenUserProfile(activeChatPartner.username);
                          }
                        }}
                        className="text-xs sm:text-sm font-serif uppercase tracking-tight text-white font-medium truncate cursor-pointer hover:underline"
                      >
                        {activeChatPartner.displayName || activeChatPartner.username}
                      </h3>
                      {partnerIsOnline ? (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 uppercase tracking-widest shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono text-white/35 uppercase tracking-widest shrink-0">
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-white/40 block truncate">
                      @{activeChatPartner.username}
                      {activeChatPartner.role ? ` · ${activeChatPartner.role}` : ''}
                    </span>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsCollabModalOpen(true)}
                    title="Send Formal Collaboration Proposal"
                    className="px-2.5 sm:px-3 py-1.5 bg-neutral-900 border border-white/20 hover:border-white text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-white/70" />
                    <span className="hidden sm:inline">COLLAB BRIEF</span>
                  </button>

                  <button
                    onClick={onClose}
                    aria-label="Close Chat"
                    title="Close"
                    className="text-white/60 hover:text-white p-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Real-Time Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 bg-[#09090b]/90">
                {/* Session Header Badge */}
                <div className="text-center py-1">
                  <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-white/35 uppercase bg-black/60 px-3 py-1 border border-white/5 inline-block">
                    VAIURE ATELIER DISPATCH // REAL-TIME CHANNEL
                  </span>
                </div>

                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-16 text-white/40 font-mono text-xs tracking-widest uppercase">
                    <Clock className="w-4 h-4 animate-spin mr-2" />
                    SYNCHRONIZING SECURE MESSAGES...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <Sparkles className="w-6 h-6 text-white/25 mx-auto" />
                    <p className="font-mono text-xs text-white/45 uppercase tracking-widest">
                      NO DISPATCHES RECORDED YET
                    </p>
                    <p className="text-xs text-white/30 font-light max-w-sm mx-auto">
                      Send a message below or submit a formal collaboration brief to begin creative exchange.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isRead = Boolean(msg.readAt);

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/15 shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-[9px] text-white/70 mb-1">
                            {activeChatPartner.avatar ? (
                              <img
                                src={activeChatPartner.avatar}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover filter grayscale"
                              />
                            ) : (
                              <span>
                                {activeChatPartner.username
                                  ? activeChatPartner.username.slice(0, 2).toUpperCase()
                                  : 'VA'}
                              </span>
                            )}
                          </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-md space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`p-3 sm:p-3.5 text-xs font-light leading-relaxed border ${
                              isMe
                                ? 'bg-neutral-900 border-white/25 text-white'
                                : 'bg-[#0f0f13] border-white/15 text-neutral-200'
                            }`}
                          >
                            {/* Message text */}
                            {msg.text && (
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            )}

                            {/* Image attachment */}
                            {msg.imageUrl && (
                              <div className="mt-2.5 rounded-sm overflow-hidden border border-white/20 max-w-xs">
                                <img
                                  src={msg.imageUrl}
                                  alt="Attached dispatch"
                                  className="w-full max-h-60 object-cover"
                                />
                              </div>
                            )}

                            {/* Collaboration Proposal Dossier Attachment */}
                            {msg.isCollabRequest && msg.collabDetails && (
                              <div className="mt-3 p-3.5 border border-white/25 bg-black/90 space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                                  <Briefcase className="w-3.5 h-3.5" />
                                  <span>OFFICIAL COLLABORATION DOSSIER</span>
                                </div>
                                <h4 className="text-sm font-serif uppercase tracking-tight text-white font-medium">
                                  {msg.collabDetails.projectTitle}
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/60 pt-2 border-t border-white/10">
                                  <div>
                                    <span className="text-white/30 block text-[8px]">ESTIMATED BUDGET:</span>
                                    <span>{msg.collabDetails.budget || 'Open / Mutual'}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/30 block text-[8px]">TIMELINE:</span>
                                    <span>{msg.collabDetails.timeline || 'Flexible'}</span>
                                  </div>
                                </div>
                                {msg.collabDetails.scope && (
                                  <p className="text-[11px] text-neutral-400 font-sans pt-1">
                                    {msg.collabDetails.scope}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Shared Archival Post Link Attachment */}
                            {msg.sharedPostId && (
                              <div className="mt-2.5 p-2.5 border border-white/15 bg-black/60 flex items-center justify-between text-[11px] font-mono text-white/80">
                                <span className="truncate">
                                  REF: {msg.sharedPostTitle || 'Archival Post'}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-2 text-white/50" />
                              </div>
                            )}
                          </div>

                          {/* Timestamp & Delivery Receipt */}
                          <div
                            className={`flex items-center gap-1.5 px-1 text-[9px] font-mono text-white/35 ${
                              isMe ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe && (
                              <span title={isRead ? 'Read by recipient' : 'Delivered'}>
                                {isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                                ) : (
                                  <Check className="w-3 h-3 text-white/40 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-neutral-950 shrink-0">
                {/* Upload indicator / preview */}
                {attachedMediaUrl && (
                  <div className="mb-2 px-3 py-1.5 bg-neutral-900 border border-white/15 flex items-center justify-between text-xs font-mono text-white/80">
                    <span className="truncate">📎 Media attached ready to dispatch</span>
                    <button
                      onClick={() => setAttachedMediaUrl(null)}
                      className="text-white/40 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isUploading && (
                  <div className="mb-2 px-3 py-1 bg-neutral-900 border border-white/10 text-[10px] font-mono text-white/60">
                    Uploading media... {uploadProgress}%
                  </div>
                )}

                {uploadError && (
                  <div className="mb-2 px-3 py-1 bg-red-950/40 border border-red-500/30 text-[10px] font-mono text-red-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    aria-label="Attach image"
                    title="Attach image"
                    className="w-9 h-9 shrink-0 rounded-sm bg-neutral-900 border border-white/15 hover:border-white text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a direct message (Enter to send)..."
                    className="flex-1 bg-neutral-900 border border-white/15 px-3 sm:px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors font-sans"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !attachedMediaUrl}
                    aria-label="Send message"
                    className="px-3.5 sm:px-4 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors font-mono text-xs font-semibold uppercase disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">SEND</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty Chat State on Desktop when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 text-white">
              <div className="w-12 h-12 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.03]">
                <MessageSquare className="w-5 h-5 text-white/40" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-mono text-xs text-white/70 uppercase tracking-widest">
                  SELECT OR INITIATE A DISPATCH
                </h4>
                <p className="text-xs text-white/30 font-light max-w-sm">
                  Choose an ongoing discussion from the list or start a direct conversation with creators.
                </p>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-4 py-2 bg-white text-black font-mono text-xs uppercase font-bold tracking-wider hover:bg-neutral-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>NEW DISPATCH</span>
              </button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* NEW DISPATCH DIRECTORY MODAL                             */}
        {/* ======================================================== */}
        {isNewChatModalOpen && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-text">
            <div className="relative w-full max-w-md bg-[#09090b] border border-white/20 p-5 space-y-4 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-white/80" />
                  <span className="text-xs font-mono tracking-widest uppercase font-semibold">
                    INITIATE DISPATCH // CREATORS
                  </span>
                </div>
                <button
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Creator Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Search creators by username, display name, or role..."
                  className="w-full bg-neutral-900 border border-white/15 pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-mono"
                  autoFocus
                />
              </div>

              {/* Creators Directory List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-white/5 border border-white/10 bg-black/40">
                {filteredNewRecipients.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono text-white/40 uppercase">
                    NO MATCHING CREATORS FOUND
                  </div>
                ) : (
                  filteredNewRecipients.map((recip) => (
                    <div
                      key={recip.id}
                      onClick={() => handleSelectNewRecipient(recip)}
                      className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 bg-neutral-900 flex items-center justify-center font-mono text-[10px] text-white/70 shrink-0">
                          {recip.avatar ? (
                            <img
                              src={recip.avatar}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover filter grayscale"
                            />
                          ) : (
                            <span>{recip.username ? recip.username.slice(0, 2).toUpperCase() : 'VA'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-serif uppercase tracking-tight text-white group-hover:text-white truncate">
                            {recip.displayName || recip.username}
                          </p>
                          <p className="text-[10px] font-mono text-white/40 truncate">
                            @{recip.username} · {recip.role || 'CREATOR'}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors shrink-0 ml-2" />
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-4 py-1.5 border border-white/15 text-xs font-mono uppercase text-white/60 hover:text-white cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* COLLABORATION PROPOSAL BRIEF MODAL                       */}
        {/* ======================================================== */}
        {isCollabModalOpen && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-text">
            <div className="relative w-full max-w-lg bg-[#09090b] border border-white/20 p-5 sm:p-6 space-y-5 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono tracking-widest text-white uppercase font-semibold">
                    PROPOSE FORMAL COLLABORATION
                  </span>
                </div>
                <button
                  onClick={() => setIsCollabModalOpen(false)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeChatPartner && (
                <div className="px-3 py-2 bg-white/[0.03] border border-white/10 flex items-center gap-2 text-xs font-mono text-white/70">
                  <span className="text-white/40">RECIPIENT:</span>
                  <span className="text-white font-semibold">@{activeChatPartner.username}</span>
                  <span className="text-white/40">({activeChatPartner.displayName})</span>
                </div>
              )}

              <form onSubmit={handleCollabSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
                    PROJECT TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={collabForm.projectTitle}
                    onChange={(e) =>
                      setCollabForm({ ...collabForm, projectTitle: e.target.value })
                    }
                    placeholder="e.g. Neo-Baroque AI Runway Direction"
                    className="w-full bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
                      ESTIMATED BUDGET
                    </label>
                    <input
                      type="text"
                      value={collabForm.budget}
                      onChange={(e) =>
                        setCollabForm({ ...collabForm, budget: e.target.value })
                      }
                      placeholder="e.g. $5,000 USD / Split"
                      className="w-full bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
                      TIMELINE
                    </label>
                    <input
                      type="text"
                      value={collabForm.timeline}
                      onChange={(e) =>
                        setCollabForm({ ...collabForm, timeline: e.target.value })
                      }
                      placeholder="e.g. 3-4 Weeks"
                      className="w-full bg-neutral-900 border border-white/15 px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
                    SCOPE & DELIVERABLES
                  </label>
                  <textarea
                    rows={3}
                    value={collabForm.scope}
                    onChange={(e) =>
                      setCollabForm({ ...collabForm, scope: e.target.value })
                    }
                    placeholder="Describe specific generative tools, styles, aesthetic parameters..."
                    className="w-full bg-neutral-900 border border-white/15 p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-sans resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCollabModalOpen(false)}
                    className="px-4 py-2 border border-white/15 text-xs font-mono uppercase text-white/60 hover:text-white cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-white text-black text-xs font-mono font-bold uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    DISPATCH PROPOSAL
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
