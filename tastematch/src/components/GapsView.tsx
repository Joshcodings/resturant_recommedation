import React, { useState, useMemo } from 'react';
import type { Restaurant } from '../types/restaurant';
import { evaluatePlaceCompleteness } from '../config/launchArea';
import { ExternalLink, CheckCircle, AlertCircle, Phone, Clock, Utensils, MessageSquare } from 'lucide-react';

interface GapsViewProps {
  city: string;
  places: Restaurant[];
  onSelectRestaurant?: (restaurant: Restaurant) => void;
  onClaimRestaurant?: (restaurant: Restaurant) => void;
}

type GapFilter = 'all-gaps' | 'missing-hours' | 'missing-phone' | 'missing-cuisine' | 'missing-whatsapp';

export const GapsView: React.FC<GapsViewProps> = ({
  city,
  places,
  onSelectRestaurant,
  onClaimRestaurant,
}) => {
  const [filter, setFilter] = useState<GapFilter>('all-gaps');

  // Evaluate completeness for all places in this city
  const evaluatedPlaces = useMemo(() => {
    return places.map(p => evaluatePlaceCompleteness(p));
  }, [places]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'missing-hours':
        return evaluatedPlaces.filter(p => p.missingFields.includes('Opening Hours'));
      case 'missing-phone':
        return evaluatedPlaces.filter(p => p.missingFields.includes('Phone Number'));
      case 'missing-cuisine':
        return evaluatedPlaces.filter(p => p.missingFields.includes('Cuisine'));
      case 'missing-whatsapp':
        return evaluatedPlaces.filter(p => p.missingFields.includes('Order on WhatsApp'));
      case 'all-gaps':
      default:
        // Any place missing at least one field, sorted by least complete first
        return [...evaluatedPlaces]
          .filter(p => p.missingFields.length > 0)
          .sort((a, b) => a.completenessScore - b.completenessScore);
    }
  }, [evaluatedPlaces, filter]);

  // Builds official OpenStreetMap edit URL
  const getOsmEditUrl = (p: Restaurant) => {
    const lat = p.latitude;
    const lon = p.longitude;
    const osmId = p.osm_id || p.source_id;
    const osmType = p.osm_type || 'node';

    if (osmId) {
      const cleanId = String(osmId).replace(/^[a-z]+\//i, '');
      if (lat && lon) {
        return `https://www.openstreetmap.org/edit?${osmType}=${cleanId}#map=19/${lat}/${lon}`;
      }
      return `https://www.openstreetmap.org/edit?${osmType}=${cleanId}`;
    }
    if (lat && lon) {
      return `https://www.openstreetmap.org/edit#map=19/${lat}/${lon}`;
    }
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${p.name} ${city} Nigeria`)}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 uppercase tracking-wide mb-1">
            <AlertCircle size={13} />
            Data Quality & Coverage Gaps
          </div>
          <h2 className="text-xl font-bold text-gray-900">{city} Gaps Explorer</h2>
          <p className="text-sm text-gray-600">
            Real data from OpenStreetMap and community contributors. Help complete missing information below.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        {[
          { id: 'all-gaps', label: 'All Gaps', count: evaluatedPlaces.filter(p => p.missingFields.length > 0).length },
          { id: 'missing-hours', label: 'Missing Hours', count: evaluatedPlaces.filter(p => p.missingFields.includes('Opening Hours')).length },
          { id: 'missing-phone', label: 'Missing Phone', count: evaluatedPlaces.filter(p => p.missingFields.includes('Phone Number')).length },
          { id: 'missing-cuisine', label: 'Missing Cuisine', count: evaluatedPlaces.filter(p => p.missingFields.includes('Cuisine')).length },
          { id: 'missing-whatsapp', label: 'Missing WhatsApp', count: evaluatedPlaces.filter(p => p.missingFields.includes('Order on WhatsApp')).length },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as GapFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              filter === tab.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              filter === tab.id ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Listing Cards */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
            No places with this gap found in {city}!
          </div>
        ) : (
          filtered.map(({ restaurant, missingFields, completenessScore }) => (
            <div
              key={restaurant.uid || restaurant.restaurant_id}
              className="border border-gray-200 rounded-lg p-3 hover:border-emerald-500 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white"
            >
              <div
                className="cursor-pointer flex-1"
                onClick={() => onSelectRestaurant && onSelectRestaurant(restaurant)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-sm text-gray-900 hover:text-emerald-700 transition">
                    {restaurant.name}
                  </h4>
                  <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-gray-100 text-gray-700">
                    {completenessScore}/5 complete
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1.5">
                  {restaurant.locality ? `${restaurant.locality}, ` : ''}{restaurant.city}
                  {restaurant.address && restaurant.address !== restaurant.name ? ` • ${restaurant.address}` : ''}
                </p>

                {/* Missing badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {missingFields.map(f => (
                    <span
                      key={f}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1"
                    >
                      {f === 'Opening Hours' && <Clock size={10} />}
                      {f === 'Phone Number' && <Phone size={10} />}
                      {f === 'Cuisine' && <Utensils size={10} />}
                      {f === 'Order on WhatsApp' && <MessageSquare size={10} />}
                      Need {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getOsmEditUrl(restaurant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs font-medium transition inline-flex items-center gap-1"
                  title="Open in OpenStreetMap editor"
                >
                  <ExternalLink size={12} />
                  <span>Edit on OSM</span>
                </a>

                {onClaimRestaurant && (
                  <button
                    type="button"
                    onClick={() => onClaimRestaurant(restaurant)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition"
                  >
                    Claim Place
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
