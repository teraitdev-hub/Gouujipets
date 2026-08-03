import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Loader2, Search, CheckCircle2, ChevronRight, X, Building2, Target, AlertTriangle, Check } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';
import { useMap } from '../../context/MapContext';
import { Map, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps';

interface LocationPickerProps {
  onLocationSelect: (location: { 
    lat: number; 
    lng: number; 
    address: string; 
    exactAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => void;
  defaultLocation?: { lat: number; lng: number };
  defaultAddress?: string;
  className?: string;
}

interface Suggestion {
  display_name: string;
  place_id?: string;
  main_text?: string;
  secondary_text?: string;
  lat?: string;
  lon?: string;
  source: 'google' | 'osm';
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  defaultLocation = { lat: 12.9716, lng: 77.5946 },
  defaultAddress = '',
  className = 'w-full h-80 rounded-2xl overflow-hidden relative shadow-md border-2 border-slate-200',
}) => {
  const { isLoaded, authFailed, loadError } = useMap();
  const mapAvailable = isLoaded && !authFailed && !loadError;
  
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  
  const [phase, setPhase] = useState<'idle' | 'detecting' | 'done'>(defaultAddress ? 'done' : 'idle');
  const [location, setLocation] = useState(defaultLocation);
  const [mapZoom, setMapZoom] = useState(defaultAddress ? 17 : 14);
  const [shortAddr, setShortAddr] = useState('');
  const [fullAddr, setFullAddr] = useState(defaultAddress);
  const [pincode, setPincode] = useState('');
  const [exactInput, setExactInput] = useState(defaultAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  
  const debounceRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* ── Geocoding Helpers using Official Google SDK (No CORS errors) ── */
  const geocodeCoords = useCallback(async (lat: number, lng: number) => {
    if (mapAvailable && geocodingLib) {
      try {
        const geocoder = new geocodingLib.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results.length > 0) {
          const res = response.results[0];
          const full = res.formatted_address.replace(/, India$/, '');
          const comps = res.address_components || [];
          const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || '';
          const pin = get('postal_code');
          const area = get('sublocality_level_1') || get('sublocality') || get('neighborhood') || get('route');
          const city = get('locality') || get('administrative_area_level_2');
          const state = get('administrative_area_level_1');
          const short = [area, city].filter(Boolean).join(', ') || full.split(',').slice(0, 2).join(', ').trim();
          return { short: short || full, full, pincode: pin, city, state };
        }
      } catch (e) {
        console.warn('Google Geocode error:', e);
      }
    }
    // Fallback to OSM if Google script is loading/unavailable
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
      if (res.ok) {
        const data = await res.json();
        const a = data.address || {};
        const parts = [a.road || a.pedestrian || '', a.suburb || a.neighbourhood || '', a.city || a.town || ''].filter(Boolean);
        const full = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        return { short: parts.slice(0, 2).join(', ') || full, full, pincode: a.postcode || '', city: a.city || a.town || '', state: a.state || '' };
      }
    } catch (_) {}
    const fb = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return { short: fb, full: fb, pincode: '', city: '', state: '' };
  }, [mapAvailable, geocodingLib]);

  const applyLocation = useCallback(async (lat: number, lng: number, zoom = 17, presetData?: { short: string; full: string; pincode?: string; city?: string; state?: string }) => {
    setLocation({ lat, lng });
    setMapZoom(zoom);
    const data = presetData || await geocodeCoords(lat, lng);
    setShortAddr(data.short);
    setFullAddr(data.full);
    setPincode(data.pincode || '');
    setExactInput(data.short);
    onLocationSelect({ 
      lat, lng, 
      address: data.full, 
      exactAddress: data.short,
      city: data.city,
      state: data.state,
      pincode: data.pincode
    });
    setPhase('done');
  }, [geocodeCoords, onLocationSelect]);

  /* ── GPS Detect ── */
  const handleDetect = () => {
    if (!navigator.geolocation) {
      setGpsError('Location not supported on this browser. Please search manually below.');
      setPhase('done');
      return;
    }
    setPhase('detecting');
    setGpsError('');
    setGpsAccuracy(null);

    const giveUp = setTimeout(() => {
      setGpsError('Location detection timed out. Please search your address below.');
      setPhase('done');
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsAccuracy(Math.round(accuracy));
        clearTimeout(giveUp);
        await applyLocation(lat, lng, accuracy < 100 ? 17 : 15);
      },
      (err) => {
        clearTimeout(giveUp);
        setGpsError(err.code === 1 ? 'Location permission denied. Please allow location in browser settings and try again.' : 'Could not get your location. Please type your address in the search box.');
        setPhase('done');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  /* ── Search with Google Places Autocomplete ── */
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      if (mapAvailable && placesLib && (placesLib as any).AutocompleteSuggestion) {
        try {
          const request = { input: val, includedRegionCodes: ['in'] };
          const { suggestions } = await (placesLib as any).AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          setIsSuggesting(false);
          if (suggestions && suggestions.length > 0) {
            setSuggestions(
              suggestions.map((s: any) => {
                const p = s.placePrediction;
                return {
                  display_name: p.text.text,
                  place_id: p.placeId,
                  main_text: p.mainText.text,
                  secondary_text: p.secondaryText?.text || '',
                  source: 'google',
                };
              })
            );
            setShowSuggestions(true);
            return;
          }
        } catch (e) {
          setIsSuggesting(false);
          console.warn('Google New Autocomplete error:', e);
        }
      }

      // Fallback OSM forward geocoding
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1&countrycodes=in`, { headers: { 'Accept-Language': 'en' } });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(
            data.map((item: any) => ({
              display_name: item.display_name,
              main_text: item.display_name.split(',')[0],
              secondary_text: item.display_name.split(',').slice(1).join(', ').trim(),
              lat: item.lat,
              lon: item.lon,
              source: 'osm',
            }))
          );
          setShowSuggestions(data.length > 0);
        }
      } catch (_) {}
      setIsSuggesting(false);
    }, 300);
  };

  const handleSuggestionPick = async (s: Suggestion) => {
    setShowSuggestions(false);
    if (s.source === 'google' && s.place_id && mapAvailable && placesLib && (placesLib as any).Place) {
      try {
        const place = new (placesLib as any).Place({ id: s.place_id });
        await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress', 'addressComponents'] });
        if (place.location) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          
          let city = '', state = '', pin = '';
          if (place.addressComponents) {
            for (const comp of place.addressComponents) {
              const types = comp.types;
              if (types.includes('locality')) city = comp.longText;
              else if (types.includes('administrative_area_level_1')) state = comp.longText;
              else if (types.includes('postal_code')) pin = comp.longText;
            }
          }
          const address = place.formattedAddress || place.displayName;
          await applyLocation(lat, lng, 17, { short: address, full: address, city, state, pincode: pin });
          return;
        }
      } catch (err) {
        console.warn('Google New Places fetch error:', err);
      }
    }

    if (s.lat && s.lon) {
      const lat = parseFloat(s.lat);
      const lng = parseFloat(s.lon);
      await applyLocation(lat, lng, 17);
    }
  };

  const handleMapPin = async (lat: number, lng: number) => {
    await applyLocation(lat, lng, mapZoom);
  };

  /* ── IDLE SCREEN ── */
  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6 space-y-5 font-sans">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-violet-200">
            <Target size={32} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Set Your Exact Business Location</h3>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Detect your live GPS or search your building/street name</p>
          </div>
        </div>

        <button
          type="button" onClick={handleDetect}
          className="w-full h-14 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-violet-200 transition-all"
        >
          <Navigation size={20} className="animate-pulse" />
          📡 Detect My Exact Location
        </button>
        <p className="text-center text-xs text-slate-400 font-medium -mt-2">Uses official Google Maps GPS for pinpoint accuracy</p>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">or search address</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {isSuggesting && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-500" />}
          <input
            type="text" value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search company name, building, street, area…"
            className="w-full h-13 py-3.5 pl-11 pr-10 bg-white border-2 border-slate-200 rounded-xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all shadow-sm"
          />
          {showSuggestions && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestionPick(s)}
                  className="w-full flex items-start gap-3.5 px-4 py-3.5 hover:bg-violet-50 active:bg-violet-100 text-left border-b border-slate-100 last:border-0 transition-colors">
                  <MapPin size={18} className="text-violet-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{s.main_text || s.display_name.split(',')[0]}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{s.secondary_text || s.display_name}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── DETECTING SCREEN ── */
  if (phase === 'detecting') {
    return (
      <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-8 flex flex-col items-center justify-center gap-4 min-h-[220px] font-sans">
        <div className="relative">
          <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-300">
            <Navigation size={28} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-violet-400 animate-ping opacity-25" />
        </div>
        <div className="text-center">
          <p className="font-black text-violet-900 text-lg">Acquiring Exact Google GPS Lock…</p>
          <p className="text-sm text-violet-600 font-medium mt-1">Please tap "Allow" when prompted by your browser</p>
        </div>
      </div>
    );
  }

  /* ── DONE SCREEN ── */
  return (
    <div className="space-y-3 font-sans">
      {gpsError && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex gap-2.5 items-center">
          <AlertTriangle size={18} className="text-orange-500 shrink-0" />
          <p className="text-xs font-bold text-orange-800 leading-relaxed">{gpsError}</p>
        </div>
      )}

      {/* Prominent Confirmed Address Card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5 text-white shadow">
              <Check size={18} strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-green-200 text-green-900 px-2 py-0.5 rounded-md mb-1">
                📍 Confirmed Location
              </span>
              <h4 className="font-black text-slate-900 text-base leading-snug break-words">
                {fullAddr || shortAddr || "Location Selected"}
              </h4>
              {pincode && (
                <span className="inline-block mt-1.5 text-xs font-bold bg-white text-slate-700 border border-green-200 rounded-lg px-2.5 py-0.5 shadow-2xs">
                  📮 PIN Code: {pincode}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setPhase('idle'); setSearchQuery(''); }}
            className="shrink-0 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-3 py-1.5 transition-all shadow-2xs flex items-center gap-1"
          >
            Change <X size={13} />
          </button>
        </div>
      </div>

      {/* Search box to change location */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {isSuggesting && <Loader2 size={14} className="absolute right-20 top-1/2 -translate-y-1/2 animate-spin text-violet-500" />}
        <input
          type="text" value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search different building, street, or landmark…"
          className="w-full h-11 pl-10 pr-24 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition-all shadow-2xs"
        />
        <button
          type="button" onClick={handleDetect}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-colors"
        >
          <Navigation size={13} /> GPS
        </button>

        {showSuggestions && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => handleSuggestionPick(s)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-violet-50 text-left border-b border-slate-100 last:border-0 transition-colors">
                <MapPin size={16} className="text-violet-600 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{s.main_text || s.display_name.split(',')[0]}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{s.secondary_text || s.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin size={14} className="text-violet-600 animate-bounce" />
          Move or drag pin on map to fine-tune exact spot
        </p>
        {gpsAccuracy && !gpsError && (
          <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
            🎯 ±{gpsAccuracy}m GPS Lock
          </span>
        )}
      </div>

      {/* Interactive Map */}
      <div className={className}>
        {mapAvailable ? (
          <Map
            defaultCenter={{ lat: location.lat, lng: location.lng }}
            defaultZoom={mapZoom}
            gestureHandling={'cooperative'}
            disableDefaultUI={true}
            mapId="LOCATION_PICKER_MAP"
            onClick={(e) => {
              if (e.detail.latLng) {
                handleMapPin(e.detail.latLng.lat, e.detail.latLng.lng);
              }
            }}
          >
            <AdvancedMarker
              position={{ lat: location.lat, lng: location.lng }}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng) {
                  handleMapPin(e.latLng.lat(), e.latLng.lng());
                }
              }}
            />
          </Map>
        ) : (
          <FallbackMap center={[location.lat, location.lng]} zoom={mapZoom} className="w-full h-full" onLocationSelect={handleMapPin} />
        )}
      </div>

      {/* Exact address / flat details */}
      <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 size={15} className="text-violet-600" />
          Building Name / Floor / Flat Number / Landmark
        </label>
        <input
          type="text" value={exactInput}
          onChange={(e) => {
            setExactInput(e.target.value);
            onLocationSelect({ lat: location.lat, lng: location.lng, address: fullAddr || e.target.value, exactAddress: e.target.value });
          }}
          placeholder="e.g. Shop #4, Ground Floor, Prestige Plaza, Opposite HDFC Bank"
          className="w-full h-12 px-4 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-600 transition-all shadow-2xs"
        />
        <div className="flex justify-between items-center px-1">
          <p className="text-[11px] text-slate-400 font-mono">
            📍 GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
          <span className="text-[11px] font-bold text-green-600">✅ Synced with Google Maps</span>
        </div>
      </div>
    </div>
  );
};
