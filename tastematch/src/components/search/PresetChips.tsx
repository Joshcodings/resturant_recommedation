import { MOOD_PRESETS, type MoodPreset } from '@/config/presets';
import { Sparkles } from 'lucide-react';

interface Props {
  activePreset: MoodPreset | null;
  onSelectPreset: (preset: MoodPreset | null) => void;
  onSurpriseMe: () => void;
}

export default function PresetChips({ activePreset, onSelectPreset, onSurpriseMe }: Props) {
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
        return (
          <button
            key={p.id}
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
              cursor: 'pointer',
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
