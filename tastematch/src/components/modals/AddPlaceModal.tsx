/**
 * src/components/modals/AddPlaceModal.tsx
 * =======================================
 * Modal for Feature 9: Community "Add a place" layer.
 *
 * Local-storage backed form to submit a spot with:
 * - name, city, locality, cuisine, rough price in Naira, payment methods, generator, AC, coords, opening hours
 * - Saves immediately to browser storage with badge "Added by you (local)"
 * - Export button gives clean GeoJSON / OSM tags JSON snippet ready to PR into repo or submit to OSM
 * - Strictly declares this is stored in the browser, never pretends it's on a central server
 */

import React, { useState, useEffect } from 'react';
import { useCommunity } from '@/context/CommunityContext';
import { NIGERIAN_STATE_CAPITALS } from '@/config/nigerianCapitals';
import type { RestaurantParsed } from '@/types/restaurant';
import {
  X,
  PlusCircle,
  Download,
  Copy,
  Check,
  MapPin,
  ShieldCheck,
  Zap,
  Wind,
  CreditCard,
  Banknote,
  Smartphone,
  FileCode,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultCity?: string;
  onPlaceAdded?: (place: RestaurantParsed) => void;
}

const POPULAR_CUISINES = [
  'Nigerian',
  'Suya',
  'Amala & Swallow',
  'Jollof & Rice',
  'Buka / Local Bukateria',
  'Small Chops & Grills',
  'Shawarma & Fast Food',
  'Pepper Soup',
  'African',
  'Continental',
  'Seafood',
  'Bakery & Pastries',
];

export default function AddPlaceModal({
  open,
  onClose,
  defaultCity = 'Lagos',
  onPlaceAdded,
}: Props) {
  const { addCommunityPlace, communityPlaces, exportPlaceAsGeoJSON, exportPlaceAsOSMTags } =
    useCommunity();

  const [name, setName] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [locality, setLocality] = useState('');
  const [cuisine, setCuisine] = useState('Nigerian');
  const [customCuisine, setCustomCuisine] = useState('');
  const [priceNaira, setPriceNaira] = useState<string>('');
  const [paymentCash, setPaymentCash] = useState(true);
  const [paymentCards, setPaymentCards] = useState(true);
  const [paymentMobile, setPaymentMobile] = useState(true);
  const [backupGenerator, setBackupGenerator] = useState(false);
  const [airConditioning, setAirConditioning] = useState(false);
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [openingHours, setOpeningHours] = useState('');
  const [phone, setPhone] = useState('');

  const [activeTab, setActiveTab] = useState<'form' | 'export'>('form');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync city when defaultCity changes
  useEffect(() => {
    if (defaultCity) setCity(defaultCity);
  }, [defaultCity]);

  if (!open) return null;

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        // Fallback to city capital coords if available
        const matched = NIGERIAN_STATE_CAPITALS.find(
          (c) => c.capital.toLowerCase() === city.toLowerCase(),
        );
        if (matched) {
          setLatitude(matched.lat.toFixed(6));
          setLongitude(matched.lng.toFixed(6));
        } else {
          alert('Could not retrieve current location. Please enter coordinates manually or leave blank.');
        }
      },
      { timeout: 8000 },
    );
  };

  const handleUseCityCoords = () => {
    const matched = NIGERIAN_STATE_CAPITALS.find(
      (c) => c.capital.toLowerCase() === city.toLowerCase(),
    );
    if (matched) {
      setLatitude(matched.lat.toFixed(6));
      setLongitude(matched.lng.toFixed(6));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a restaurant or food spot name.');
      return;
    }

    const latNum = latitude ? parseFloat(latitude) : null;
    const lngNum = longitude ? parseFloat(longitude) : null;
    const priceNum = priceNaira ? parseInt(priceNaira, 10) : null;

    const finalCuisine = cuisine === 'Other' ? customCuisine || 'Nigerian' : cuisine;

    const newPlace = addCommunityPlace({
      name: name.trim(),
      city: city.trim(),
      locality: locality.trim() || undefined,
      cuisine: finalCuisine,
      priceForTwoNaira: priceNum && !isNaN(priceNum) ? priceNum : null,
      paymentCash,
      paymentCards,
      paymentMobile,
      backupGenerator,
      airConditioning,
      latitude: latNum && !isNaN(latNum) ? latNum : null,
      longitude: lngNum && !isNaN(lngNum) ? lngNum : null,
      openingHours: openingHours.trim() || undefined,
      phone: phone.trim() || undefined,
    });

    if (onPlaceAdded) {
      onPlaceAdded(newPlace);
    }

    // Reset and close
    setName('');
    setLocality('');
    setPriceNaira('');
    setLatitude('');
    setLongitude('');
    setOpeningHours('');
    setPhone('');
    setErrorMsg(null);
    onClose();
  };

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const downloadJson = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const geoJsonData = exportPlaceAsGeoJSON();
  const osmTagsData = exportPlaceAsOSMTags();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
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
                background: 'rgba(200, 240, 60, 0.15)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlusCircle size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Community: Add a Food Spot
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Feature 9: Contributor Layer for Nigerian Diners
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch: Form vs Export */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'form' ? '2px solid var(--accent)' : 'none',
              background: 'transparent',
              color: activeTab === 'form' ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: activeTab === 'form' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Submit Place
          </button>
          <button
            type="button"
            data-tab-export="true"
            onClick={() => setActiveTab('export')}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'export' ? '2px solid var(--accent)' : 'none',
              background: 'transparent',
              color: activeTab === 'export' ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: activeTab === 'export' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Export to OSM / PR ({communityPlaces.length} saved)
          </button>
        </div>

        {/* Honest Architecture Disclaimer Banner */}
        <div
          style={{
            padding: '10px 20px',
            background: 'rgba(16, 185, 129, 0.08)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
            <strong>Local Browser Storage:</strong> Entries are stored in your device's browser and immediately show up with the badge <span style={{ color: '#10b981', fontWeight: 600 }}>"Added by you (local)"</span>. To contribute upstream to OpenStreetMap or TasteMatch, export your GeoJSON snippet below!
          </div>
        </div>

        {/* Content Body */}
        <div style={{ overflowY: 'auto', padding: 20, flex: 1 }}>
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {errorMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    fontSize: 12,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* Spot Name */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Place / Spot Name *
                </label>
                <input
                  type="text"
                  required
                  data-input-name="true"
                  placeholder="e.g. Iya Basira Buka, Danfo Bistro, Mega Chicken"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 14,
                  }}
                />
              </div>

              {/* City & Locality row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    City / Capital
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 8px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  >
                    {NIGERIAN_STATE_CAPITALS.map((c) => (
                      <option key={c.capital} value={c.capital}>
                        {c.capital} ({c.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Locality / Neighbourhood
                  </label>
                  <input
                    type="text"
                    data-input-locality="true"
                    placeholder="e.g. Victoria Island, Wuse 2"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Cuisine & Rough Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Cuisine / Specialty
                  </label>
                  <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 8px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  >
                    {POPULAR_CUISINES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="Other">Other (enter custom)</option>
                  </select>
                  {cuisine === 'Other' && (
                    <input
                      type="text"
                      placeholder="Custom cuisine"
                      value={customCuisine}
                      onChange={(e) => setCustomCuisine(e.target.value)}
                      style={{
                        width: '100%',
                        height: 34,
                        marginTop: 6,
                        padding: '0 10px',
                        borderRadius: 6,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontSize: 12,
                      }}
                    />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Rough Cost for 2 (₦)
                  </label>
                  <input
                    type="number"
                    step="100"
                    data-input-cost="true"
                    placeholder="e.g. 5000"
                    value={priceNaira}
                    onChange={(e) => setPriceNaira(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Payment Methods Accepted
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentCash(!paymentCash)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: paymentCash ? '1px solid #10b981' : '1px solid var(--border)',
                      background: paymentCash ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-2)',
                      color: paymentCash ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Banknote size={14} /> Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentCards(!paymentCards)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: paymentCards ? '1px solid #10b981' : '1px solid var(--border)',
                      background: paymentCards ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-2)',
                      color: paymentCards ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <CreditCard size={14} /> Cards / POS
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMobile(!paymentMobile)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: paymentMobile ? '1px solid #10b981' : '1px solid var(--border)',
                      background: paymentMobile ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-2)',
                      color: paymentMobile ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Smartphone size={14} /> Bank Transfer / Mobile
                  </button>
                </div>
              </div>

              {/* Power & Amenities */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                  Power & Amenities
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setBackupGenerator(!backupGenerator)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: backupGenerator ? '1px solid #eab308' : '1px solid var(--border)',
                      background: backupGenerator ? 'rgba(234, 179, 8, 0.15)' : 'var(--surface-2)',
                      color: backupGenerator ? '#eab308' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Zap size={14} /> Backup Generator
                  </button>

                  <button
                    type="button"
                    data-btn-ac="true"
                    onClick={() => setAirConditioning(!airConditioning)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: airConditioning ? '1px solid #38bdf8' : '1px solid var(--border)',
                      background: airConditioning ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-2)',
                      color: airConditioning ? '#38bdf8' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Wind size={14} /> Air Conditioning (AC)
                  </button>
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    Coordinates (Latitude / Longitude)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      disabled={isLocating}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: 11,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      {isLocating ? 'Locating...' : '📍 Use My Location'}
                    </button>
                    <button
                      type="button"
                      data-btn-center="true"
                      onClick={handleUseCityCoords}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Use Capital Center
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude (e.g. 6.5244)"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude (e.g. 3.3792)"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Opening Hours & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Opening Hours (OSM format)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mo-Sa 09:00-22:00"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    Phone / WhatsApp Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +234 801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                data-btn-submit="true"
                style={{
                  height: 44,
                  marginTop: 8,
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <PlusCircle size={16} /> Save to My Places (Local)
              </button>
            </form>
          ) : (
            /* Export Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Export your saved community spots to contribute them to OpenStreetMap or create a Pull Request to TasteMatch's dataset.
              </div>

              {/* GeoJSON Snippet Card */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    <MapPin size={16} color="var(--accent)" /> GeoJSON FeatureCollection
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => copyText(geoJsonData, 'geojson')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {copiedType === 'geojson' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedType === 'geojson' ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadJson('tastematch_community_places.geojson', geoJsonData)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 160,
                    overflowY: 'auto',
                    background: '#090a0f',
                    color: '#94a3b8',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'Consolas, monospace',
                  }}
                >
                  {geoJsonData}
                </pre>
              </div>

              {/* OSM Tags JSON Card */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    <FileCode size={16} color="var(--accent)" /> OSM Tags JSON (for JOSM / iD)
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => copyText(osmTagsData, 'osmtags')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {copiedType === 'osmtags' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      {copiedType === 'osmtags' ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadJson('osm_tags_snippet.json', osmTagsData)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 11,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 140,
                    overflowY: 'auto',
                    background: '#090a0f',
                    color: '#94a3b8',
                    padding: 10,
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: 'Consolas, monospace',
                  }}
                >
                  {osmTagsData}
                </pre>
              </div>

              {/* GitHub Pull Request link */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(200, 240, 60, 0.08)',
                  border: '1px solid rgba(200, 240, 60, 0.2)',
                  fontSize: 12,
                  color: 'var(--text)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Ready to submit this to TasteMatch's open dataset repository?</span>
                <a
                  href="https://github.com/Joshcodings/resturant_recommedation/issues/new?title=Community%20Restaurant%20Contribution&body=Please%20find%20attached%20my%20exported%20GeoJSON%20snippet%20for%20inclusion."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--accent)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Create GitHub Issue
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
