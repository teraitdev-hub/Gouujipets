/**
 * PlacesAutocompleteInput.tsx
 * Premium Google Places Autocomplete input — works exactly like Zomato/Swiggy/Amazon search.
 * Falls back to OpenStreetMap Nominatim if Google Maps is unavailable.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Search, MapPin, ChevronRight, Loader2, X } from 'lucide-react';
import { useMapContext } from '../../context/MapContext';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface PlaceResult {
  display_name: string;
  main_text: string;
  secondary_text: string;
  lat: number;
  lng: number;
  place_id?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  formatted_address?: string;
}

interface PlacesAutocompleteInputProps {
  placeholder?: string;
  value?: string;
  onSelect: (result: PlaceResult) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  restrictToIndia?: boolean;
}

export const PlacesAutocompleteInput: React.FC<PlacesAutocompleteInputProps> = ({
  placeholder = 'Search area, building, street...',
  value = '',
  onSelect,
  onClear,
  className = '',
  autoFocus = false,
  restrictToIndia = true,
}) => {
  const { isLoaded, authFailed } = useMapContext();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');

  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Array<{
    display_name: string;
    main_text: string;
    secondary_text: string;
    place_id?: string;
    lat?: string;
    lon?: string;
    source: 'google' | 'osm';
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (input.trim().length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);

      // Try Google Places API first
      if (isLoaded && !authFailed && placesLib && (placesLib as any).AutocompleteService) {
        try {
          const service = new (placesLib as any).AutocompleteService();
          const request: any = { input };
          if (restrictToIndia) request.componentRestrictions = { country: 'in' };
          
          const result = await service.getPlacePredictions(request);
          if (result?.predictions?.length > 0) {
            setSuggestions(
              result.predictions.map((p: any) => ({
                display_name: p.description,
                main_text: p.structured_formatting?.main_text || p.description,
                secondary_text: p.structured_formatting?.secondary_text || '',
                place_id: p.place_id,
                source: 'google' as const,
              }))
            );
            setShowDropdown(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('Google Places Autocomplete error:', e);
        }
      }

      // Fallback: OpenStreetMap Nominatim
      try {
        const params = new URLSearchParams({
          format: 'json',
          q: input,
          limit: '6',
          addressdetails: '1',
        });
        if (restrictToIndia) params.set('countrycodes', 'in');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'Accept-Language': 'en' },
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(
            data.map((item: any) => ({
              display_name: item.display_name,
              main_text: item.display_name.split(',')[0],
              secondary_text: item.display_name.split(',').slice(1, 3).join(', ').trim(),
              lat: item.lat,
              lon: item.lon,
              source: 'osm' as const,
            }))
          );
          setShowDropdown(data.length > 0);
        }
      } catch (_) {}

      setIsLoading(false);
    },
    [isLoaded, authFailed, placesLib, restrictToIndia]
  );

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  const handlePick = async (s: typeof suggestions[0]) => {
    setShowDropdown(false);
    setIsLoading(true);

    if (s.source === 'google' && s.place_id && isLoaded && !authFailed && geocodingLib) {
      try {
        const geocoder = new (geocodingLib as any).Geocoder();
        const response = await geocoder.geocode({ placeId: s.place_id });
        if (response.results?.[0]) {
          const result = response.results[0];
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          
          let city = '', state = '', postal_code = '';
          if (result.address_components) {
            for (const comp of result.address_components) {
              const types = comp.types;
              if (types.includes('locality')) city = comp.long_name;
              else if (types.includes('administrative_area_level_1')) state = comp.long_name;
              else if (types.includes('postal_code')) postal_code = comp.long_name;
            }
          }
          const addr = result.formatted_address || s.main_text;
          setQuery(s.main_text);
          setIsLoading(false);
          onSelect({ display_name: addr, main_text: s.main_text, secondary_text: s.secondary_text, lat, lng, place_id: s.place_id, city, state, postal_code, formatted_address: addr });
          return;
        }
      } catch (err) {
        console.warn('Google Geocoder fetch error for placeId:', err);
      }
    }

    // OSM fallback — geocode by lat/lon
    if (s.lat && s.lon) {
      const lat = parseFloat(s.lat);
      const lng = parseFloat(s.lon);
      let city = '', state = '', postal_code = '';

      if (isLoaded && !authFailed && geocodingLib) {
        try {
          const geocoder = new (geocodingLib as any).Geocoder();
          const response = await geocoder.geocode({ location: { lat, lng } });
          if (response.results?.[0]) {
            const comps = response.results[0].address_components || [];
            const get = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name || '';
            city = get('locality') || get('administrative_area_level_2');
            state = get('administrative_area_level_1');
            postal_code = get('postal_code');
          }
        } catch (_) {}
      }

      setQuery(s.main_text);
      setIsLoading(false);
      onSelect({ display_name: s.display_name, main_text: s.main_text, secondary_text: s.secondary_text, lat, lng, city, state, postal_code, formatted_address: s.display_name });
      return;
    }

    setIsLoading(false);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3.5 text-slate-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-12 pl-10 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all shadow-sm"
        />
        {isLoading && (
          <Loader2 size={15} className="absolute right-3 text-purple-500 animate-spin pointer-events-none" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handlePick(s)}
              className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-purple-50 active:bg-purple-100 text-left border-b border-slate-50 last:border-0 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={14} className="text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-tight">{s.main_text}</p>
                {s.secondary_text && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{s.secondary_text}</p>
                )}
              </div>
              <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
