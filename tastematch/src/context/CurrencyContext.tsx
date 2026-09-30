import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type RatesState,
  fetchLiveRates,
  convertCurrency,
  formatCurrency,
} from '@/lib/currency';

interface CurrencyContextValue {
  selectedCurrency: string;
  setSelectedCurrency: (code: string) => void;
  ratesState: RatesState;
  loading: boolean;
  refreshRates: () => Promise<void>;
  /** Convert an amount from given currency to the currently selected currency */
  convert: (amount: number | null | undefined, fromCode: string) => number | null;
  /** Format directly in selected currency */
  format: (amount: number | null | undefined, options?: { isApprox?: boolean }) => string;
  /**
   * Dual display for cards/drawers:
   * If selected equals listed, returns primary formatted string and listed=null.
   * If selected differs, returns converted with "≈" prefix, and "600 INR listed" subline.
   */
  formatDual: (amount: number | null | undefined, listedCurrency: string) => {
    display: string;
    listed: string | null;
    isConverted: boolean;
  };
  availableCurrencies: string[];
}

const STORAGE_KEY = 'tm-selected-currency';

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)?.toUpperCase() || 'USD';
    } catch {
      return 'USD';
    }
  });

  const [ratesState, setRatesState] = useState<RatesState>({
    rates: { USD: 1 },
    date: 'Loading...',
    provider: 'fawazahmed0',
    isFallback: false,
    error: null,
  });

  const [loading, setLoading] = useState(true);

  const loadRates = useCallback(async (force = false) => {
    setLoading(true);
    const result = await fetchLiveRates(force);
    setRatesState(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRates(false);
  }, [loadRates]);

  const setSelectedCurrency = useCallback((code: string) => {
    const upper = code.trim().toUpperCase();
    setSelectedCurrencyState(upper);
    try {
      localStorage.setItem(STORAGE_KEY, upper);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const convert = useCallback(
    (amount: number | null | undefined, fromCode: string): number | null => {
      return convertCurrency(amount, fromCode, selectedCurrency, ratesState.rates);
    },
    [selectedCurrency, ratesState.rates],
  );

  const format = useCallback(
    (amount: number | null | undefined, options?: { isApprox?: boolean }): string => {
      return formatCurrency(amount, selectedCurrency, options);
    },
    [selectedCurrency],
  );

  const formatDual = useCallback(
    (amount: number | null | undefined, listedCurrency: string) => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return { display: 'n/a', listed: null, isConverted: false };
      }

      const listedCode = listedCurrency.trim().toUpperCase();
      const currentCode = selectedCurrency.trim().toUpperCase();

      if (listedCode === currentCode) {
        return {
          display: formatCurrency(amount, listedCode),
          listed: null,
          isConverted: false,
        };
      }

      const converted = convertCurrency(amount, listedCode, currentCode, ratesState.rates);
      if (converted === null) {
        // Fall back to original amount only
        return {
          display: formatCurrency(amount, listedCode),
          listed: null,
          isConverted: false,
        };
      }

      const approxStr = formatCurrency(converted, currentCode, { isApprox: true });
      const listedStr = `${formatCurrency(amount, listedCode)} listed`;

      return {
        display: approxStr,
        listed: listedStr,
        isConverted: true,
      };
    },
    [selectedCurrency, ratesState.rates],
  );

  const availableCurrencies = useMemo(() => {
    return Object.keys(ratesState.rates).sort();
  }, [ratesState.rates]);

  const value = useMemo(
    () => ({
      selectedCurrency,
      setSelectedCurrency,
      ratesState,
      loading,
      refreshRates: () => loadRates(true),
      convert,
      format,
      formatDual,
      availableCurrencies,
    }),
    [
      selectedCurrency,
      setSelectedCurrency,
      ratesState,
      loading,
      loadRates,
      convert,
      format,
      formatDual,
      availableCurrencies,
    ],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}
