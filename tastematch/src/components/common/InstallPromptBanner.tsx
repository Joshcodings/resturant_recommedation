import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Increment visit count once per browser session
    try {
      const sessionLogged = sessionStorage.getItem('tm_session_logged');
      let visits = parseInt(localStorage.getItem('tm_visit_count') || '0', 10);
      if (!sessionLogged) {
        sessionStorage.setItem('tm_session_logged', '1');
        visits += 1;
        localStorage.setItem('tm_visit_count', String(visits));
      }

      // Check if user previously dismissed or already installed
      const dismissed = sessionStorage.getItem('tm_install_dismissed');
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

      // 2. Capture install prompt event
      const handler = (e: Event) => {
        e.preventDefault();
        const promptEvent = e as BeforeInstallPromptEvent;
        setDeferredPrompt(promptEvent);
        if (visits >= 2 && !dismissed && !isStandalone) {
          setShowBanner(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handler);

      // If already captured and visits >= 2
      if (visits >= 2 && !dismissed && !isStandalone && (window as unknown as { __tmDeferredPrompt?: BeforeInstallPromptEvent }).__tmDeferredPrompt) {
        setDeferredPrompt((window as unknown as { __tmDeferredPrompt?: BeforeInstallPromptEvent }).__tmDeferredPrompt || null);
        setShowBanner(true);
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    } catch {
      // Graceful fallback in environments without localStorage
    }
  }, []);

  if (!showBanner || !deferredPrompt) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        trackEvent({ type: 'install_prompt_accepted' });
        setShowBanner(false);
      }
    } catch {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('tm_install_dismissed', '1');
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="banner"
      aria-label="Install TasteMatch Application"
      style={{
        position: 'sticky',
        top: 64,
        zIndex: 25,
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Download size={16} style={{ color: 'var(--accent-deep)' }} />
        </div>
        <div>
          <span style={{ fontWeight: 600 }}>Install TasteMatch:</span>{' '}
          <span style={{ color: 'var(--text-muted)' }}>
            Add to your home screen for quick access and offline menus.
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            background: 'var(--accent)',
            color: 'var(--accent-ink)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Install App
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
