import React from 'react';
import { ArtistProfile } from '../../data/ivntriData';
import { X, ExternalLink } from 'lucide-react';

interface ArtistProfileModalProps {
  artist: ArtistProfile | null;
  onClose: () => void;
}

export const ArtistProfileModal: React.FC<ArtistProfileModalProps> = ({ artist, onClose }) => {
  if (!artist) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg overflow-y-auto p-4 sm:p-6 md:p-12 select-text">
      <div className="relative w-full max-w-4xl bg-[#09090b] border border-white/15 my-auto text-white shadow-2xl overflow-hidden">
        {/* Sticky Close Bar */}
        <div className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-white/50 uppercase">
            FELLOW PROFILE // {artist.name.toUpperCase()}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Profile"
            className="text-white/60 hover:text-white p-1 transition-colors flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase"
          >
            <span>CLOSE</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-10 md:p-12 space-y-10">
          {/* Top Hero: Portrait + Monograph Bio */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5 aspect-[3/4] overflow-hidden bg-neutral-900 border border-white/10">
              <img
                src={artist.portrait}
                alt={artist.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter grayscale contrast-[1.15]"
              />
            </div>

            <div className="md:col-span-7 space-y-5">
              <div>
                <span className="text-xs font-mono tracking-widest text-white/50 uppercase block mb-1">
                  {artist.discipline} · {artist.location.toUpperCase()}
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-light uppercase tracking-tight">
                  {artist.name}
                </h1>
              </div>

              {/* Manifesto Quote Box */}
              <div className="p-4 border-l-2 border-white bg-neutral-950/80">
                <p className="text-sm font-serif italic text-neutral-200 leading-relaxed">
                  "{artist.manifestoQuote}"
                </p>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                {artist.bio}
              </p>

              {/* Social / External Links */}
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-white/70">
                {artist.socialLinks.website && (
                  <a
                    href={artist.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white flex items-center gap-1 border-b border-white/20 pb-0.5"
                  >
                    <span>WEBSITE</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {artist.socialLinks.instagram && (
                  <a
                    href={artist.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white flex items-center gap-1 border-b border-white/20 pb-0.5"
                  >
                    <span>INSTAGRAM</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {artist.socialLinks.x && (
                  <a
                    href={artist.socialLinks.x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white flex items-center gap-1 border-b border-white/20 pb-0.5"
                  >
                    <span>X</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Exhibition History & Selected Works */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-8">
            <div>
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase mb-4">
                CURATED EXHIBITIONS & SCREENINGS
              </h3>
              <ul className="space-y-3 text-xs text-neutral-300 font-sans">
                {artist.exhibitions.map((ex, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="font-mono text-white/40 text-[10px] mt-0.5">0{i + 1}.</span>
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase mb-4">
                ARCHIVED WORKS ON VAIURE 唯昱尔
              </h3>
              <div className="border border-white/10 p-4 bg-black/60 space-y-2">
                <span className="text-[10px] font-mono text-white/40 uppercase">FEATURED DOSSIER</span>
                <p className="text-sm font-serif font-light text-white uppercase">
                  {artist.featuredWorkTitle}
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-white/60 border-t border-white/10">
                  <span>CATALOGUED: {artist.selectedWorksCount} PIECES</span>
                  <span className="text-white hover:underline cursor-pointer">BROWSE MONOGRAPH →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
