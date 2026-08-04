import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Navigation, Loader2, Search, Target, Home, ChevronRight, CheckCircle2 } from 'lucide-react';
import { FallbackMap } from '../Map/FallbackMap';
import { useMap as useMapContext } from '../../context/MapContext';
import { Map, AdvancedMarker, useMapsLibrary, useMap as useGoogleMap } from '@vis.gl/react-google-maps';

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
  defaultLocation = { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore center
  defaultAddress = '',
  className = 'w-full h-full min-h-[400px] rounded-3xl overflow-hidden relative shadow-xl border border-slate-200/60 font-sans',
}) => {
  const { isLoaded, authFailed, loadError } = useMapContext();
  const mapAvailable = isLoaded && !authFailed && !loadError;
  
  const googleMap = useGoogleMap('LOCATION_PICKER_MAP');
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  
  const [location, setLocation] = useState(defaultLocation);
  const [mapZoom, setMapZoom] = useState(defaultAddress ? 17 : 13);
  const [shortAddr, setShortAddr] = useState('');
  const [fullAddr, setFullAddr] = useState(defaultAddress || 'Locating...');
  const [pincode, setPincode] = useState('');
  const [exactInput, setExactInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const debounceRef = useRef<any>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Programmatically pan the map when location state changes
  useEffect(() => {
    if (googleMap && location) {
      googleMap.panTo(location);
      googleMap.setZoom(mapZoom);
    }
  }, [googleMap, location.lat, location.lng, mapZoom]);

  // Initial geocode if default location provided but no address
  useEffect(() => {
    if (!defaultAddress && mapAvailable) {
      applyLocation(defaultLocation.lat, defaultLocation.lng, 13);
    }
  }, [mapAvailable]);

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
    // Fallback to OSM
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&email=contact@gouujipets.com`, { headers: { 'Accept-Language': 'en' } });
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
    setIsGeocoding(true);
    
    const data = presetData || await geocodeCoords(lat, lng);
    
    setShortAddr(data.short);
    setFullAddr(data.full);
    setPincode(data.pincode || '');
    
    // Crucial bug fix: Update the search query to show what was selected!
    setSearchQuery(data.short);
    
    onLocationSelect({ 
      lat, lng, 
      address: data.full, 
      exactAddress: exactInput || undefined,
      city: data.city,
      state: data.state,
      pincode: data.pincode
    });
    
    setIsGeocoding(false);
  }, [geocodeCoords, exactInput, onLocationSelect]);

  const handleDetect = () => {
    if (!navigator.geolocation) {
      alert('Location not supported on this browser.');
      return;
    }
    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        await applyLocation(lat, lng, accuracy < 100 ? 18 : 16);
        setIsDetecting(false);
      },
      (err) => {
        setIsDetecting(false);
        alert('Could not get your location. Please check permissions or type your address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      if (mapAvailable && placesLib && (placesLib as any).AutocompleteService) {
        try {
          const service = new (placesLib as any).AutocompleteService();
          const request = { input: val, componentRestrictions: { country: 'in' } };
          const result = await service.getPlacePredictions(request);
          setIsSuggesting(false);
          
          if (result?.predictions && result.predictions.length > 0) {
            setSuggestions(
              result.predictions.map((p: any) => ({
                display_name: p.description,
                place_id: p.place_id,
                main_text: p.structured_formatting?.main_text || p.description,
                secondary_text: p.structured_formatting?.secondary_text || '',
                source: 'google',
              }))
            );
            setShowSuggestions(true);
            return;
          }
        } catch (e) {
          setIsSuggesting(false);
        }
      }

      // OSM Fallback
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
    
    // Update the search bar immediately so the user sees their selection
    setSearchQuery(s.main_text || s.display_name);

    if (s.source === 'google' && s.place_id && mapAvailable && geocodingLib) {
      try {
        const geocoder = new geocodingLib.Geocoder();
        const response = await geocoder.geocode({ placeId: s.place_id });
        if (response.results?.[0]) {
          const result = response.results[0];
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          
          let city = '', state = '', pin = '';
          if (result.address_components) {
            for (const comp of result.address_components) {
              const types = comp.types;
              if (types.includes('locality')) city = comp.long_name;
              else if (types.includes('administrative_area_level_1')) state = comp.long_name;
              else if (types.includes('postal_code')) pin = comp.long_name;
            }
          }
          const address = result.formatted_address || s.main_text || '';
          await applyLocation(lat, lng, 17, { short: s.main_text || address, full: address, city, state, pincode: pin });
          return;
        }
      } catch (err) {}
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

  return (
    <div className={className}>
      {/* MAP BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-slate-100">
        {mapAvailable ? (
          <Map
            center={{ lat: location.lat, lng: location.lng }}
            zoom={mapZoom}
            onCenterChanged={(ev) => {
               setMapZoom(ev.detail.zoom);
               handleMapPin(ev.detail.center.lat, ev.detail.center.lng);
            }}
            gestureHandling={'cooperative'}
            disableDefaultUI={true}
            mapId="LOCATION_PICKER_MAP"
          />
        ) : (
          <FallbackMap center={[location.lat, location.lng]} zoom={mapZoom} className="w-full h-full" onLocationSelect={(lat, lng) => handleMapPin(lat, lng)} />
        )}

        {/* Center Animated HTML Marker (Zomato-Style) */}
        <div className="absolute top-1/2 left-1/2 pointer-events-none z-10 flex flex-col items-center" style={{ transform: 'translate(-50%, -100%)' }}>
          <div className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg mb-1 shadow-lg whitespace-nowrap animate-in fade-in zoom-in duration-300">
            {isGeocoding ? "Locating..." : "Your Location"}
          </div>
          <div className="relative flex flex-col items-center">
            <div className={`w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center shadow-md border-[3px] border-white z-10 transition-transform duration-200 ${isGeocoding ? 'scale-110 animate-pulse' : ''}`}>
               <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-purple-600 -mt-[2px] z-0 drop-shadow-sm"></div>
          </div>
          <div className="w-4 h-1.5 bg-black/30 rounded-[100%] blur-[1.5px] mt-0.5"></div>
        </div>
      </div>

      {/* FLOATING TOP OVERLAY: Search Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 z-20 pointer-events-none flex justify-center">
        <div className="pointer-events-auto w-full max-w-lg relative">
          <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 overflow-hidden group hover:bg-white/90 transition-all duration-300">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600/70 pointer-events-none group-focus-within:text-purple-600 transition-colors" />
            {(isSuggesting || isGeocoding) && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-purple-600" />}
            <input
              type="text" 
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search area, street, building..."
              className="w-full h-12 sm:h-14 pl-12 pr-12 bg-transparent text-sm font-bold text-slate-800 placeholder:text-slate-500 placeholder:font-medium focus:outline-none transition-all"
            />
          </div>
          
          {/* Autocomplete Suggestions */}
          {showSuggestions && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden max-h-60 overflow-y-auto animate-in slide-in-from-top-2 fade-in duration-200">
              <button 
                onClick={handleDetect}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50/50 text-left border-b border-slate-100/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Navigation size={16} className="shrink-0" />
                </div>
                <div>
                  <p className="text-sm font-black text-purple-700">Detect current location</p>
                  <p className="text-[10px] font-bold text-purple-400 mt-0.5">Using GPS</p>
                </div>
              </button>
              
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestionPick(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 text-left border-b border-slate-100/50 last:border-0 transition-colors">
                  <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{s.main_text || s.display_name.split(',')[0]}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{s.secondary_text || s.display_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COMPACT FLOATING BOTTOM OVERLAY */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-20 pointer-events-none flex flex-col items-end gap-3 justify-end">
        
        {/* GPS Target Button */}
        <button
          onClick={handleDetect}
          disabled={isDetecting}
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-md text-slate-800 rounded-full shadow-lg border border-white/50 flex items-center justify-center hover:bg-white active:scale-95 transition-all disabled:opacity-50"
          title="Locate Me"
        >
          {isDetecting ? <Loader2 size={18} className="animate-spin text-purple-600" /> : <Target size={18} className="text-purple-600" />}
        </button>

        {/* Glassmorphic Address Card */}
        <div className="pointer-events-auto w-full max-w-lg mx-auto bg-white/85 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/60 p-3 sm:p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <MapPin size={18} className="shrink-0" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {isGeocoding ? 'Locating...' : shortAddr || 'Select Location'}
              </h3>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-2">
                {isGeocoding ? 'Fetching precise address...' : fullAddr || 'Drag the map to pinpoint your exact spot'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" 
                value={exactInput}
                onChange={(e) => {
                  setExactInput(e.target.value);
                  onLocationSelect({ 
                    lat: location.lat, lng: location.lng, 
                    address: fullAddr, exactAddress: e.target.value,
                    city: shortAddr.split(',')[1]?.trim(),
                    pincode
                  });
                }}
                placeholder="House / Flat No. (Optional)"
                className="w-full h-10 sm:h-11 pl-9 pr-3 bg-white/60 border border-slate-200/50 rounded-xl text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-300 focus:bg-white transition-all"
              />
            </div>
            
            <button
              onClick={() => {
                // Flash visual success to user (optional, state already up-to-date)
                const btn = document.getElementById('loc-confirm-btn');
                if (btn) {
                  btn.innerHTML = '✓ Saved';
                  btn.classList.add('bg-green-500');
                  setTimeout(() => {
                    btn.innerHTML = 'Confirm';
                    btn.classList.remove('bg-green-500');
                  }, 2000);
                }
              }}
              id="loc-confirm-btn"
              className="h-10 sm:h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all whitespace-nowrap"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
