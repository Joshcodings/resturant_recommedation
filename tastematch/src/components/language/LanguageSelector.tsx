/**
 * src/components/language/LanguageSelector.tsx
 * ============================================
 * Lightweight language / dialect switcher in the top bar.
 * Explicitly displays "(draft — needs native-speaker review)" on all
 * Nigerian language options per Hard Rule 7.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { SupportedLocale } from '@/config/i18nDrafts';

export const LanguageSelector: React.FC = () => {
  const { locale, setLocale, languages, currentLanguage, isDraft } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Language selector: ${currentLanguage.label}${isDraft ? ' (draft)' : ''}`}
        aria-expanded={isOpen}
        data-testid="language-selector-button"
        style={{
          height: 40,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: isDraft ? 'rgba(234, 179, 8, 0.12)' : 'var(--surface-2)',
          border: isDraft ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid var(--border)',
          borderRadius: 8,
          color: isDraft ? '#d97706' : 'var(--text)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
          transition: 'all 150ms ease',
        }}
      >
        <Globe size={15} strokeWidth={1.7} />
        <span style={{ maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentLanguage.label}
        </span>
        {isDraft && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 4px',
              borderRadius: 4,
              background: 'rgba(234, 179, 8, 0.25)',
              color: '#b45309',
              fontWeight: 700,
            }}
          >
            draft
          </span>
        )}
        <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 320,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
            zIndex: 60,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              padding: '6px 10px 8px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              Select Language
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Nigeria & Global
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 300, overflowY: 'auto' }}>
            {languages.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  onClick={() => {
                    setLocale(lang.code as SupportedLocale);
                    setIsOpen(false);
                  }}
                  data-testid={`language-option-${lang.code}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 120ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? 'var(--accent-deep)' : 'var(--text)',
                        }}
                      >
                        {lang.label}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        ({lang.nativeLabel})
                      </span>
                    </div>
                    {isSelected && <Check size={14} style={{ color: 'var(--accent-deep)' }} />}
                  </div>

                  {lang.isDraft && lang.sublabel && (
                    <span
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color: '#d97706',
                        fontStyle: 'italic',
                      }}
                    >
                      {lang.sublabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 4,
              padding: '8px 10px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface-2)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: '15px' }}>
              All Nigerian regional languages are provisional drafts and explicitly labeled <strong>(draft — needs native-speaker review)</strong>.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
