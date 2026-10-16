import { useState, useMemo, useEffect } from 'react';
import { X, Send, Copy, Check, Plus, Trash2, AlertCircle, Utensils } from 'lucide-react';
import type { RestaurantParsed } from '@/types/restaurant';
import {
  getSuggestedDishesForRestaurant,
  formatFoodRunMessage,
} from '@/lib/foodRunPlanner';
import WhatsAppShareModal from '@/components/common/WhatsAppShareModal';

interface FoodRunModalProps {
  restaurant: RestaurantParsed | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FoodRunModal({ restaurant, isOpen, onClose }: FoodRunModalProps) {
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [customDish, setCustomDish] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize with top 2 suggestions when restaurant changes or modal opens
  useEffect(() => {
    if (restaurant && isOpen) {
      const suggestions = getSuggestedDishesForRestaurant(restaurant);
      setSelectedDishes(suggestions.slice(0, 2));
      setCopied(false);
    }
  }, [restaurant, isOpen]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!restaurant) return [];
    return getSuggestedDishesForRestaurant(restaurant);
  }, [restaurant]);

  const foodRun = useMemo(() => {
    if (!restaurant) return null;
    return formatFoodRunMessage({
      restaurantName: restaurant.restaurant_name,
      localityOrCity: `${restaurant.locality || restaurant.city}, ${restaurant.city}`,
      dishes: selectedDishes,
      averageCostForTwo: restaurant.average_cost_for_two,
      currency: restaurant.currency || 'NGN',
      restaurantUid: restaurant.uid,
    });
  }, [restaurant, selectedDishes]);

  if (!isOpen || !restaurant || !foodRun) return null;

  const handleToggleDish = (dish: string) => {
    if (selectedDishes.includes(dish)) {
      setSelectedDishes(selectedDishes.filter((d) => d !== dish));
    } else {
      if (selectedDishes.length >= 6) return;
      setSelectedDishes([...selectedDishes, dish]);
    }
  };

  const handleAddCustomDish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customDish.trim();
    if (!trimmed) return;
    if (selectedDishes.length >= 6) return;
    if (!selectedDishes.includes(trimmed)) {
      setSelectedDishes([...selectedDishes, trimmed]);
    }
    setCustomDish('');
  };

  const handleRemoveDish = (dish: string) => {
    setSelectedDishes(selectedDishes.filter((d) => d !== dish));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(foodRun.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Utensils className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Organise a Food Run
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {restaurant.restaurant_name} · {restaurant.locality || restaurant.city}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Dish Selection count indicator */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Select Dishes (2–6 required)
            </label>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                selectedDishes.length >= 2 && selectedDishes.length <= 6
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {selectedDishes.length} / 6 selected
            </span>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((dish) => {
              const isSelected = selectedDishes.includes(dish);
              return (
                <button
                  key={dish}
                  type="button"
                  onClick={() => handleToggleDish(dish)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors border inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 font-medium'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  <span>{dish}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Dish Input */}
          <form onSubmit={handleAddCustomDish} className="flex gap-2">
            <input
              type="text"
              placeholder="Add another dish (e.g. Asun, Extra plantain)..."
              value={customDish}
              onChange={(e) => setCustomDish(e.target.value)}
              disabled={selectedDishes.length >= 6}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!customDish.trim() || selectedDishes.length >= 6}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>

          {/* Chosen Checklist */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-700/70 space-y-2">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Order Checklist
            </div>
            {selectedDishes.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No dishes picked yet. Pick from above or add one.</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDishes.map((dish) => (
                  <div
                    key={dish}
                    className="flex items-center justify-between text-xs bg-white dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-700"
                  >
                    <span className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                      <span className="font-mono text-zinc-400">[ ]</span>
                      {dish}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDish(dish)}
                      className="text-zinc-400 hover:text-rose-500 p-0.5"
                      title="Remove dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Estimated Total */}
            <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Estimated Total:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {foodRun.estimatedCostText}
              </span>
            </div>
          </div>

          {/* Validation warning if < 2 */}
          {!foodRun.isValid && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{foodRun.error}</span>
            </div>
          )}

          {/* WhatsApp Message Preview */}
          {foodRun.isValid && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                WhatsApp Message Preview
              </label>
              <pre className="text-[11px] bg-emerald-50/50 dark:bg-emerald-950/20 text-zinc-800 dark:text-zinc-200 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 whitespace-pre-wrap font-sans">
                {foodRun.message}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!foodRun.isValid}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Order!' : 'Copy Message'}
          </button>

          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            disabled={!foodRun.isValid}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ${
              foodRun.isValid
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 cursor-pointer'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            Share via WhatsApp
          </button>
        </div>
      </div>

      <WhatsAppShareModal
        open={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`Food Run: ${restaurant.restaurant_name}`}
        message={foodRun.message}
        planDeepLink={foodRun.deepLink}
      />
    </div>
  );
}
