import React, { useState, useRef } from 'react';
import { UserProfile } from '../../types/social';
import { X, Camera, Loader2, Check, AlertCircle } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSave: (updates: {
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar?: string;
  }) => Promise<void>;
  onOpenChangeUsername?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSave,
  onOpenChangeUsername,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.displayName || '');
      setBio(currentUser.bio || '');
      setLocation(currentUser.location || '');
      setWebsite(currentUser.website || '');
      setAvatarPreview(currentUser.avatar || '');
      setAvatarFile(null);
      setError(null);
      setSuccessNotice(false);
      setIsSaving(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported for avatar.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Avatar file must be less than 20MB.');
      return;
    }

    setError(null);
    setAvatarFile(file);

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    // Upload directly to backend avatar optimizer
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await fetch(`/api/users/${encodeURIComponent(currentUser.id)}/avatar`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser.id,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.avatarUrl) {
          setAvatarPreview(data.avatarUrl);
        }
      }
    } catch (_uploadErr) {
      // Local preview remains
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!displayName.trim()) {
      setError('Display name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        avatar: avatarPreview,
      });

      setSuccessNotice(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile changes. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-text"
    >
      <div className="relative w-full max-w-lg bg-[#0a0a0d] border border-white/15 text-white shadow-2xl rounded-sm flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Top Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <h2
            id="edit-profile-title"
            className="text-sm font-serif uppercase tracking-tight text-white font-medium"
          >
            Edit profile
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close edit profile"
            className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          {/* Avatar Photo Section */}
          <div className="flex items-center gap-4 p-3.5 border border-white/10 bg-white/[0.02]">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-neutral-900 shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover filter grayscale"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-sm text-white/50">
                  {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'VA'}
                </div>
              )}

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-serif uppercase tracking-tight text-white truncate">
                {currentUser.displayName || currentUser.username}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isSaving}
                className="mt-1 text-xs font-mono tracking-wider text-white/80 hover:text-white uppercase underline cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3 h-3" />
                <span>Change photo</span>
              </button>
            </div>
          </div>

          {/* Username (Handle) Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                Username
              </label>
              {onOpenChangeUsername && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChangeUsername();
                  }}
                  className="text-[10px] font-mono tracking-wider text-emerald-400 hover:text-emerald-300 underline uppercase cursor-pointer"
                >
                  Change handle
                </button>
              )}
            </div>
            <input
              type="text"
              disabled
              value={`@${currentUser.username}`}
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 text-xs font-mono text-white/60 cursor-not-allowed select-none"
            />
          </div>

          {/* Display Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-display-name"
              className="text-[10px] font-mono tracking-widest text-white/40 uppercase block"
            >
              Display name
            </label>
            <input
              id="edit-display-name"
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public name"
              required
              className="w-full px-3 py-2 bg-transparent border border-white/20 hover:border-white/40 focus:border-white focus:outline-none text-xs font-sans text-white transition-colors"
            />
          </div>

          {/* Bio Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-bio"
                className="text-[10px] font-mono tracking-widest text-white/40 uppercase"
              >
                Bio
              </label>
              <span className="text-[9px] font-mono text-white/30 tabular-nums">
                {bio.length}/300
              </span>
            </div>
            <textarea
              id="edit-bio"
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short biography or creative statement"
              className="w-full px-3 py-2 bg-transparent border border-white/20 hover:border-white/40 focus:border-white focus:outline-none text-xs font-sans text-neutral-200 leading-relaxed transition-colors resize-none"
            />
          </div>

          {/* Location Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-location"
              className="text-[10px] font-mono tracking-widest text-white/40 uppercase block"
            >
              Location
            </label>
            <input
              id="edit-location"
              type="text"
              maxLength={100}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Paris / Tokyo / New York"
              className="w-full px-3 py-2 bg-transparent border border-white/20 hover:border-white/40 focus:border-white focus:outline-none text-xs font-mono text-white transition-colors"
            />
          </div>

          {/* Website Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-website"
              className="text-[10px] font-mono tracking-widest text-white/40 uppercase block"
            >
              Website
            </label>
            <input
              id="edit-website"
              type="url"
              maxLength={150}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-transparent border border-white/20 hover:border-white/40 focus:border-white focus:outline-none text-xs font-mono text-white transition-colors"
            />
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-white/20 hover:border-white/40 text-xs font-mono tracking-wider uppercase text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploadingAvatar}
              className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono tracking-wider uppercase font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
