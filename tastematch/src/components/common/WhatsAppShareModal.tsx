import { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Globe,
  ExternalLink,
  Phone,
  MessageSquare,
  Clock,
  Trash2,
} from 'lucide-react';
import {
  normalizePhoneNumber,
  buildWaNumberLink,
  buildWaMobileAppLink,
  buildWaWebLink,
  isMobileDevice,
  getRecentNumbers,
  saveRecentNumber,
  clearRecentNumbers,
  shareViaNativeSheet,
} from '@/lib/whatsappShare';
import { trackEvent } from '@/lib/analytics';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  planDeepLink?: string;
}

export default function WhatsAppShareModal({
  open,
  onClose,
  title,
  message,
  planDeepLink,
}: Props) {
  const [phoneInput, setPhoneInput] = useState('');
  const [rememberNumber, setRememberNumber] = useState(false);
  const [recentNumbers, setRecentNumbers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [hasNativeShare, setHasNativeShare] = useState(false);

  useEffect(() => {
    if (open) {
      setRecentNumbers(getRecentNumbers());
      setIsMobile(isMobileDevice());
      setHasNativeShare(typeof navigator !== 'undefined' && !!navigator.share);
      setCopied(false);
      setToastMessage(null);
    }
  }, [open]);

  if (!open) return null;

  const phoneNorm = normalizePhoneNumber(phoneInput);

  const handleNativeShare = async () => {
    trackEvent({ type: 'whatsapp_share_clicked', shareType: 'NativeSheet' });
    const res = await shareViaNativeSheet({
      title,
      text: message,
      url: planDeepLink,
    });
    if (res.success) {
      onClose();
    }
  };

  const handleSendToNumber = () => {
    if (!phoneNorm.isValid) return;
    trackEvent({ type: 'whatsapp_share_clicked', shareType: 'DirectNumber' });
    if (rememberNumber) {
      saveRecentNumber(phoneNorm.normalized);
      setRecentNumbers(getRecentNumbers());
    }
    const url = buildWaNumberLink(phoneNorm.normalized, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSelectRecent = (num: string) => {
    setPhoneInput(num);
  };

  const handleClearRecents = () => {
    clearRecentNumbers();
    setRecentNumbers([]);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setToastMessage('Copied. Paste it in any chat.');
      setTimeout(() => {
        setCopied(false);
        setToastMessage(null);
      }, 4000);
    } catch {
      // Fallback
      setCopied(true);
      setToastMessage('Copied. Paste it in any chat.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={18} />
            </div>
            <div>
              <h3
                id="wa-modal-title"
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Share via WhatsApp
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Faster routes to WhatsApp chats and groups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Toast Alert */}
          {toastMessage && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#10b981',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Check size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* 1. Primary Button: Native Share Sheet */}
          {hasNativeShare && (
            <div>
              <button
                type="button"
                onClick={handleNativeShare}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 10,
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Share2 size={16} />
                <span>Share (Open Phone Share Sheet)</span>
              </button>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                Opens your phone's share menu with WhatsApp, recent contacts and groups.
              </p>
            </div>
          )}

          {/* 2. Route: Send to a Number */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
              <Phone size={14} color="#10b981" />
              <span>Send directly to a phone number</span>
            </div>

            <div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel"
                  placeholder="e.g. 0803 123 4567 or +234..."
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    padding: '0 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={!phoneNorm.isValid}
                  onClick={handleSendToNumber}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 8,
                    background: phoneNorm.isValid ? '#10b981' : 'var(--border)',
                    color: phoneNorm.isValid ? '#ffffff' : 'var(--text-muted)',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: phoneNorm.isValid ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Send</span>
                </button>
              </div>

              {/* Normalised preview or error */}
              {phoneInput.trim() && (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  {phoneNorm.isValid ? (
                    <span style={{ color: '#10b981' }}>
                      Sending to normalised number: <strong>{phoneNorm.displayFormatted}</strong>
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>{phoneNorm.error}</span>
                  )}
                </div>
              )}
            </div>

            {/* Remember number checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={rememberNumber}
                onChange={(e) => setRememberNumber(e.target.checked)}
              />
              <span>Remember this number on this device (stored in local browser only)</span>
            </label>

            {/* Recent Numbers Chips */}
            {recentNumbers.length > 0 && (
              <div style={{ marginTop: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Recent Numbers:
                  </span>
                  <button
                    type="button"
                    onClick={handleClearRecents}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'underline',
                    }}
                  >
                    <Trash2 size={11} />
                    <span>Clear saved numbers</span>
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recentNumbers.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSelectRecent(num)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Clock size={11} color="var(--text-muted)" />
                      <span>+{num}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Route: Send to a Group or Any Chat */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
              <MessageSquare size={14} color="#10b981" />
              <span>Send to a group or any chat</span>
            </div>

            {isMobile ? (
              <div>
                <a
                  href={buildWaMobileAppLink(message)}
                  onClick={() => trackEvent({ type: 'whatsapp_share_clicked', shareType: 'MobileDeepLink' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 40,
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Smartphone size={15} color="#10b981" />
                  <span>Open WhatsApp (App Chat Picker)</span>
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a
                  href={buildWaWebLink(message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent({ type: 'whatsapp_share_clicked', shareType: 'WebLink' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 38,
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Globe size={15} color="#10b981" />
                  <span>Open in WhatsApp Web</span>
                </a>
                <a
                  href={buildWaMobileAppLink(message)}
                  onClick={() => trackEvent({ type: 'whatsapp_share_clicked', shareType: 'AppDeepLink' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    height: 38,
                    borderRadius: 8,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Smartphone size={14} />
                  <span>Open in WhatsApp Desktop App</span>
                </a>
              </div>
            )}
          </div>

          {/* 4. Route: Copy message fallback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={handleCopyMessage}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Message (Fallback)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
