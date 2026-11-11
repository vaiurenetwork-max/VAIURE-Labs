import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '../../services/i18n';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'pill' | 'select' | 'menu';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentOption = languages.find((l) => l.code === language) || languages[0];

  if (variant === 'pill') {
    return (
      <div className={`flex items-center border border-white/20 p-0.5 rounded-full bg-black/60 backdrop-blur-sm ${className}`}>
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider transition-all cursor-pointer ${
              language === l.code
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span className="uppercase">{l.code}</span>
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'select') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="bg-black/80 border border-white/20 hover:border-white/40 text-white text-xs font-mono uppercase px-3 py-1.5 rounded-lg focus:outline-none focus:border-white cursor-pointer transition-colors"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code} className="bg-[#0c0c10] text-white">
              {l.nativeName} ({l.code.toUpperCase()})
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase px-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-white/40" />
            <span>LOCALE</span>
          </div>
          <span className="text-[8px] text-white/30 font-mono tracking-wider">{currentOption.code.toUpperCase()}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {languages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`py-1.5 px-1.5 text-center rounded-md border text-xs font-mono transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'border-white/80 bg-white text-black font-semibold shadow-sm'
                    : 'border-white/[0.08] bg-black/25 text-white/60 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="text-xs leading-none mb-0.5">{l.flag}</div>
                <div className="text-[10px] font-sans font-medium truncate w-full">{l.nativeName}</div>
                <div className="text-[8px] font-mono opacity-40 uppercase">{l.code}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default 'compact' dropdown
  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/20 hover:border-white/50 text-[11px] font-mono uppercase tracking-wider text-white/90 hover:text-white transition-all bg-white/5 hover:bg-white/15 cursor-pointer shadow-sm"
        title={`Language: ${currentOption.name}`}
      >
        <span className="text-xs leading-none">{currentOption.flag}</span>
        <span className="font-semibold">{currentOption.code.toUpperCase()}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#121217] border border-white/20 rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[9px] font-mono tracking-widest text-white/40 uppercase border-b border-white/10 mb-1 flex items-center justify-between">
            <span>LANGUAGE / 语言</span>
            <Globe className="w-3 h-3 text-white/40" />
          </div>
          {languages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer ${
                  isSelected
                    ? 'text-white font-medium bg-white/15'
                    : 'text-white/75 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm leading-none">{l.flag}</span>
                  <div>
                    <div className="font-sans text-xs leading-tight">{l.nativeName}</div>
                    <div className="font-mono text-[9px] text-white/40 uppercase">{l.name} ({l.code})</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
