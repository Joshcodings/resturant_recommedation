import type { RestaurantParsed } from '@/types/restaurant';

export type PaymentFilterType = 'cash' | 'cards' | 'mobile_payment';

export interface PaymentOption {
  id: PaymentFilterType;
  label: string;
  icon: string;
  check: (r: RestaurantParsed) => boolean;
}

export const PAYMENT_FILTERS: PaymentOption[] = [
  {
    id: 'cash',
    label: 'Accepts cash',
    icon: '💵',
    check: r => Boolean(r.payment_methods?.cash),
  },
  {
    id: 'cards',
    label: 'Cards',
    icon: '💳',
    check: r => Boolean(
      r.payment_methods?.cards ||
      r.payment_methods?.debit_cards ||
      r.payment_methods?.credit_cards ||
      r.payment_methods?.mastercard ||
      r.payment_methods?.visa
    ),
  },
  {
    id: 'mobile_payment',
    label: 'Mobile payment',
    icon: '📱',
    check: r => Boolean(
      r.payment_methods?.mobile_payment ||
      r.payment_methods?.bank_transfer ||
      r.payment_methods?.pos
    ),
  },
];

interface Props {
  cityRestaurants: RestaurantParsed[];
  selectedPayment: PaymentFilterType | null;
  onSelectPayment: (type: PaymentFilterType | null) => void;
}

export default function PaymentChips({
  cityRestaurants,
  selectedPayment,
  onSelectPayment,
}: Props) {
  // Only show chips if at least one place in the city lists any payment method
  const hasPaymentData = cityRestaurants.some(
    r => r.payment_methods && Object.keys(r.payment_methods).length > 0
  );

  if (!hasPaymentData) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 6,
      }}
      role="group"
      aria-label="Filter by payment method"
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-muted)',
          fontFamily: 'Inter, system-ui, sans-serif',
          marginRight: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Pay:
      </span>

      {PAYMENT_FILTERS.map(item => {
        const count = cityRestaurants.filter(r => item.check(r)).length;
        if (count === 0) return null;

        const isSelected = selectedPayment === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectPayment(isSelected ? null : item.id)}
            style={{
              height: 30,
              padding: '0 10px',
              borderRadius: 999,
              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: isSelected ? 'var(--accent)' : 'var(--surface-2)',
              color: isSelected ? 'var(--accent-ink)' : 'var(--text)',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: isSelected ? 600 : 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 150ms ease',
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <span
              style={{
                fontSize: 11,
                opacity: isSelected ? 0.9 : 0.6,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
