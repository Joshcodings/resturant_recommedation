import { MOOD_PRESETS, type MoodPreset } from '@/config/presets';
import { Sparkles } from 'lucide-react';

import type { CityCapabilities } from '@/lib/capabilities';

interface Props {
  activePreset: MoodPreset | null;
  onSelectPreset: (preset: MoodPreset | null) => void;
  onSurpriseMe: () => void;
  caps?: CityCapabilities;
}

export default function PresetChips({ activePreset, onSelectPreset, onSurpriseMe, caps }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 16,
      }}
    >
      {MOOD_PRESETS.map(p => {
        const isActive = activePreset?.id === p.id;
        
        let missingCap = '';
        if (p.requiredCapabilities) {
          for (const req of p.requiredCapabilities) {
            if (caps && !caps[req]) {
              if (req === 'hasRatings') missingCap = 'Rating data is not available';
              else if (req === 'hasPrices') missingCap = 'Price data is not available';
              else if (req === 'hasBooking') missingCap = 'Table booking info is not available';
              else missingCap = 'Required data is not available';
              break;
            }
          }
        }
        
        const isDisabled = !!missingCap;

        return (
          <button
            key={p.id}
            disabled={isDisabled}
            title={missingCap || undefined}
            onClick={() => onSelectPreset(isActive ? null : p)}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 999,
              border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--accent-ink)' : 'var(--text)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 150ms cubic-bezier(0.2,0.8,0.2,1)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        );
      })}

      {/* Surprise me chip */}
      <button
        onClick={onSurpriseMe}
        style={{
          height: 36,
          padding: '0 16px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text)',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 150ms cubic-bezier(0.2,0.8,0.2,1)',
          whiteSpace: 'nowrap',
        }}
      >
        <Sparkles size={14} strokeWidth={1.5} color="var(--accent-deep)" />
        <span>Surprise me</span>
      </button>
    </div>
  );
}
