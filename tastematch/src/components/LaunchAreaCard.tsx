import React, { useState } from 'react';
import type { Restaurant } from '../types/restaurant';
import {
  LAUNCH_AREA_CONFIG,
  computeAreaCompleteness,
  getLeastCompleteWorklist,
} from '../config/launchArea';

interface LaunchAreaCardProps {
  places: Restaurant[];
  onSelectRestaurant?: (restaurant: Restaurant) => void;
}

export const LaunchAreaCard: React.FC<LaunchAreaCardProps> = ({ places, onSelectRestaurant }) => {
  const [showWorklist, setShowWorklist] = useState(false);

  // Filter places to the launch area
  const areaTarget = (LAUNCH_AREA_CONFIG.neighbourhood || LAUNCH_AREA_CONFIG.city).toLowerCase();
  const areaPlaces = places.filter(p => {
    const locality = (p.locality || '').toLowerCase();
    const address = (p.address || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const city = (p.city || '').toLowerCase();
    return locality.includes(areaTarget) || address.includes(areaTarget) || name.includes(areaTarget) || city === areaTarget;
  });

  if (areaPlaces.length === 0) {
    return null;
  }

  const metrics = computeAreaCompleteness(areaPlaces);
  const worklist = getLeastCompleteWorklist(areaPlaces, 20);

  const areaName = LAUNCH_AREA_CONFIG.neighbourhood
    ? `${LAUNCH_AREA_CONFIG.neighbourhood}, ${LAUNCH_AREA_CONFIG.city}`
    : LAUNCH_AREA_CONFIG.city;

  return (
    <div className="bg-white border-2 border-emerald-600 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wide mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Launch Area Focus
          </div>
          <h2 className="text-xl font-bold text-gray-900">{areaName}</h2>
          <p className="text-sm text-gray-600">
            One dense, complete neighbourhood beats a thin map. Help diners and owners by completing missing details.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-3xl font-extrabold text-emerald-700">{metrics.overallCompletenessPct}%</span>
            <span className="block text-xs font-medium text-gray-500">Completeness</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${metrics.overallCompletenessPct}%` }}
        ></div>
      </div>

      {/* 5 Field Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 text-center">
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
          <span className="block text-xs font-medium text-gray-500">Cuisine</span>
          <span className="text-sm font-bold text-gray-900">{metrics.pctWithCuisine}%</span>
          <span className="block text-[11px] text-gray-400">{metrics.placesWithCuisine}/{metrics.totalPlaces}</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
          <span className="block text-xs font-medium text-gray-500">Hours</span>
          <span className="text-sm font-bold text-gray-900">{metrics.pctWithHours}%</span>
          <span className="block text-[11px] text-gray-400">{metrics.placesWithHours}/{metrics.totalPlaces}</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
          <span className="block text-xs font-medium text-gray-500">Phone</span>
          <span className="text-sm font-bold text-gray-900">{metrics.pctWithPhone}%</span>
          <span className="block text-[11px] text-gray-400">{metrics.placesWithPhone}/{metrics.totalPlaces}</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
          <span className="block text-xs font-medium text-gray-500">WhatsApp Order</span>
          <span className="text-sm font-bold text-gray-900">{metrics.pctWithWhatsApp}%</span>
          <span className="block text-[11px] text-gray-400">{metrics.placesWithWhatsApp}/{metrics.totalPlaces}</span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 col-span-2 sm:col-span-1">
          <span className="block text-xs font-medium text-gray-500">Location</span>
          <span className="text-sm font-bold text-gray-900">{metrics.pctWithLocation}%</span>
          <span className="block text-[11px] text-gray-400">{metrics.placesWithLocation}/{metrics.totalPlaces}</span>
        </div>
      </div>

      {/* Toggle Worklist Button */}
      <button
        type="button"
        onClick={() => setShowWorklist(!showWorklist)}
        className="w-full py-2 px-4 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <span>{showWorklist ? 'Hide Completion Worklist' : 'Show 20 Least-Complete Places to Fix'}</span>
        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
          {worklist.length}
        </span>
      </button>

      {/* 20 Least-Complete Places Worklist */}
      {showWorklist && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-800">Priority Worklist ({worklist.length} places)</h3>
            <span className="text-xs text-gray-500">Ranked by missing fields</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {worklist.map(({ restaurant, missingFields, completenessScore }) => (
              <div
                key={restaurant.uid || restaurant.restaurant_id}
                onClick={() => onSelectRestaurant && onSelectRestaurant(restaurant)}
                className="p-3 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/30 transition cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">{restaurant.name}</h4>
                  <p className="text-xs text-gray-500">{restaurant.locality || restaurant.address || 'Address not listed'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                    {completenessScore}/5 complete
                  </span>
                  {missingFields.slice(0, 2).map(f => (
                    <span key={f} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      Need {f}
                    </span>
                  ))}
                  {missingFields.length > 2 && (
                    <span className="text-[11px] text-gray-400">+{missingFields.length - 2} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
