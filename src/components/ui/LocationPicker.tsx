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
  className = 'w-full h-[500px] sm:h-[600px] rounded-3xl overflow-hidden relative shadow-lg border border-slate-200 font-sans',
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
    
    // Notify parent immediately of the map location change
    onLocationSelect({ 
      lat, lng, 
      address: data.full, 
      exactAddress: exactInput || data.short,
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
      {/* MAP BACKGROUND (Always visible in Zomato style) */}
      <div className="absolute inset-0 z-0 bg-slate-100">
        {mapAvailable ? (
          <Map
            center={{ lat: location.lat, lng: location.lng }}
            zoom={mapZoom}
            onCenterChanged={(ev) => {
               // When map pans programmatically or by user, update our internal zoom state
               setMapZoom(ev.detail.zoom);
            }}
            gestureHandling={'cooperative'}
            disableDefaultUI={true}
            mapId="LOCATION_PICKER_MAP"
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

      {/* FLOATING TOP OVERLAY: Search Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 pointer-events-none">
        <div className="pointer-events-auto max-w-lg mx-auto relative">
          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white overflow-hidden">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            {(isSuggesting || isGeocoding) && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-purple-600" />}
            <input
              type="text" 
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search area, street, building..."
              className="w-full h-14 pl-12 pr-12 bg-transparent text-sm font-black text-slate-900 placeholder:text-slate-400 placeholder:font-semibold focus:outline-none focus:bg-white transition-all"
            />
          </div>
          
          {/* Autocomplete Suggestions */}
          {showSuggestions && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto animate-in slide-in-from-top-2">
              <button 
                onClick={handleDetect}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 text-left border-b border-slate-100 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Navigation size={16} className="shrink-0" />
                </div>
                <div>
                  <p className="text-sm font-black text-purple-700">Detect current location</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Using GPS</p>
                </div>
              </button>
              
              {suggestions.map((s, i) => (
                <button key={i} type="button" onClick={() => handleSuggestionPick(s)}
                  className="w-full flex items-start gap-3.5 px-5 py-4 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0 transition-colors">
                  <MapPin size={18} className="text-slate-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 truncate">{s.main_text || s.display_name.split(',')[0]}</p>
                    <p className="text-[11px] font-bold text-slate-500 truncate mt-0.5">{s.secondary_text || s.display_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING CURRENT LOCATION FAB */}
      <div className="absolute bottom-[160px] sm:bottom-[140px] right-4 z-20">
        <button
          onClick={handleDetect}
          disabled={isDetecting}
          className="w-12 h-12 bg-white text-slate-900 rounded-full shadow-xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all disabled:opacity-50"
          title="Locate Me"
        >
          {isDetecting ? <Loader2 size={20} className="animate-spin text-purple-600" /> : <Target size={20} className="text-slate-700" />}
        </button>
      </div>

      {/* BOTTOM SHEET: Zomato Style Address Confirmation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 border-t border-slate-100 animate-in slide-in-from-bottom-10 pointer-events-auto">
        <div className="p-5 sm:p-6 pb-6">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
          
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
              <MapPin size={20} className="shrink-0" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black text-slate-900 truncate pr-2">
                {isGeocoding ? 'Locating...' : shortAddr || 'Select Location'}
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed pr-2">
                {isGeocoding ? 'Fetching address details...' : fullAddr || 'Drag the map pin to precisely locate your spot'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Optional Exact Details Input */}
            <div className="relative">
              <Home size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                placeholder="House / Flat No. / Building Name (Optional)"
                className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-semibold focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
              />
            </div>
            
            <button
              onClick={() => {
                // Flash success, no strictly needed action here as state is lifted up, but UX implies completion
                alert("Location Confirmed!");
              }}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-black text-base rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
