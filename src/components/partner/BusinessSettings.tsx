import { useState } from "react";
import { Building2, MapPin, Tag, Users, Loader2, Save, Crosshair, Navigation, Sparkles, CheckCircle } from "lucide-react";
import { db, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { LocationPicker } from "../Map/LocationPicker";

interface BusinessSettingsProps {
  business: any;
  onUpdate: (updated: any) => void;
}

export const BusinessSettings = ({ business, onUpdate }: BusinessSettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  
  // Parse existing address or coordinates cleanly
  const initialStreet = typeof business.address === 'string' ? business.address : (business.address?.street || "");
  
  const [formData, setFormData] = useState({
    name: business.name || "",
    contactEmail: business.contact_email || business.contactEmail || "",
    contactPhone: business.contact_phone || business.contactPhone || "",
    type: business.type || "boarding",
    description: business.description || "",
    amenities: Array.isArray(business.amenities) ? business.amenities.join(', ') : (business.amenities || "WiFi, Air Conditioned Suites, CCTV 24/7, Vet On-Call"),
    street: initialStreet,
    city: business.city || (business.address?.city || "Mumbai"),
    state: business.state || "Maharashtra",
    pincode: business.pincode || "400050",
    lat: business.lat || business.latitude || 19.0760,
    lng: business.lng || business.longitude || 72.8777,
    capacity: business.capacity?.toString() || "15",
    priceFrom: (business.price_from || business.price_per_night || business.priceFrom || 1499).toString(),
    imageUrl: business.image_url || ""
  });
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `businesses/${fileName}`;

      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      setFormData({ ...formData, imageUrl: downloadUrl });
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6))
        }));
        setIsLocating(false);
      },
      async (err) => {
        try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          if (data.latitude && data.longitude) {
            setFormData(prev => ({
              ...prev,
              lat: data.latitude,
              lng: data.longitude
            }));
            setIsLocating(false);
            return;
          }
        } catch (fallbackErr) {
          console.error("IP fallback failed:", fallbackErr);
        }
        console.error("GPS error", err);
        alert("Could not detect exact GPS. Using default city coordinates or you can enter manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  };

  const handleCityPreset = (city: string, state: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      city,
      state,
      lat,
      lng
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setIsSaved(false);

    try {
      const fullAddressString = `${formData.street ? formData.street + ', ' : ''}${formData.city}, ${formData.state} - ${formData.pincode}`;

      const updatePayload: any = {
        name: formData.name,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        type: formData.type,
        description: formData.description,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        address: fullAddressString,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        capacity: parseInt(formData.capacity.toString(), 10) || 15,
        price_from: parseInt(formData.priceFrom.toString(), 10) || 999,
        image_url: formData.imageUrl
      };

      if (formData.amenities) {
        updatePayload.amenities = formData.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
      }

      await updateDoc(doc(db, 'businesses', business.id || business._id), updatePayload);
      const updated = { id: business.id || business._id, ...updatePayload };
      onUpdate(updated);
      
      // Dispatch event so Layout can update instantly
      window.dispatchEvent(new CustomEvent('business-updated'));
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update shop details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-purple-200 mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-purple-800"></div>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-purple-950 flex items-center gap-2.5">
            <Building2 className="text-purple-600" /> Complete Shop Profile & Location
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Set your exact location, coordinates, and address so customers can discover your shop on the live map
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold mb-6">
          {error}
        </div>
      )}

      {isSaved && (
        <div className="p-4 bg-purple-100 text-purple-900 rounded-2xl text-sm font-bold mb-6 flex items-center gap-2 shadow-sm border border-purple-200">
          <CheckCircle size={18} className="text-purple-600" />
          <span>Shop address, map coordinates, and settings saved successfully! Your facility is now live on the map.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo Upload Row */}
        <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
          <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 relative group shadow-sm">
            {formData.imageUrl ? (
              <img src={formData.imageUrl} alt="Shop Preview" className="w-full h-full object-cover" />
            ) : (
              <Building2 size={32} className="text-gray-400" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Shop Image Banner</h3>
            <p className="text-xs text-gray-500 mb-3">Upload a high-quality photo of your resort, clinic, or salon</p>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={isUploading}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-900 hover:file:bg-purple-200 cursor-pointer transition-colors"
            />
          </div>
        </div>

        {/* Section 1: Basic Info */}
        <div>
          <h3 className="text-xs font-black text-purple-700 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Sparkles size={14} /> 1. Shop Identity & Pricing
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Shop / Resort Name</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Primary Facility Category</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all capitalize"
              >
                <option value="boarding">Pet Boarding & Luxury Resort</option>
                <option value="veterinary">Veterinary Clinic & Hospital</option>
                <option value="grooming">Pet Grooming Salon & Spa</option>
                <option value="daycare">Daycare & Play Park</option>
                <option value="training">Pet Training & Agility Center</option>
                <option value="sitting">Home Pet Sitting & Walking</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Starting Rate / Day (₹)</label>
              <div className="relative">
                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="number" 
                  value={formData.priceFrom}
                  onChange={e => setFormData({...formData, priceFrom: e.target.value})}
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Contact Phone</label>
              <input 
                type="text" 
                value={formData.contactPhone}
                onChange={e => setFormData({...formData, contactPhone: e.target.value})}
                placeholder="+91 98765 43210"
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Contact Email</label>
              <input 
                type="email" 
                value={formData.contactEmail}
                onChange={e => setFormData({...formData, contactEmail: e.target.value})}
                placeholder="shop@gouujipets.com"
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Daily Pet Capacity</label>
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="number" 
                  value={formData.capacity}
                  onChange={e => setFormData({...formData, capacity: e.target.value})}
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Shop Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all resize-none"
                placeholder="Describe your facility, safety measures, play areas, and staff qualifications..."
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Amenities Included (Comma separated)</label>
              <input 
                type="text" 
                value={formData.amenities}
                onChange={e => setFormData({...formData, amenities: e.target.value})}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                placeholder="e.g. AC Rooms, CCTV Access, Vet On Call, 3x Daily Walks, Filtered Water"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Complete Address & Map Coordinates */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-xs font-black text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={14} /> 2. Complete Address & Interactive Map Coordinates
            </h3>
          </div>

          <div className="mb-6 rounded-2xl overflow-hidden border border-purple-200 shadow-sm relative z-0 h-[300px]">
            <LocationPicker 
              initialLocation={{ lat: Number(formData.lat) || 19.0760, lng: Number(formData.lng) || 72.8777 }}
              onLocationSelect={(loc) => {
                setFormData(prev => ({ ...prev, lat: loc.lat, lng: loc.lng, street: loc.address || prev.street }));
              }}
            />
          </div>

          <div className="grid md:grid-cols-4 gap-5">
            <div className="space-y-1.5 md:col-span-4">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Building / Street / Landmark Address</label>
              <input 
                type="text" 
                value={formData.street}
                onChange={e => setFormData({...formData, street: e.target.value})}
                placeholder="e.g. Shop #12, Palm Beach Road, Near Infinity Mall, Bandra West"
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">City</label>
              <input 
                type="text" 
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">State</label>
              <input 
                type="text" 
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Pincode</label>
              <input 
                type="text" 
                value={formData.pincode}
                onChange={e => setFormData({...formData, pincode: e.target.value})}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                required
              />
            </div>

            {/* GPS Coordinate Boxes */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider ml-1 flex items-center gap-1">
                <Navigation size={13} className="text-purple-600" /> Map Latitude (GPS)
              </label>
              <input 
                type="number" 
                step="0.000001"
                value={formData.lat}
                onChange={e => setFormData({...formData, lat: parseFloat(e.target.value) || 0})}
                className="w-full h-12 px-4 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-black text-purple-950 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-extrabold text-purple-900 uppercase tracking-wider ml-1 flex items-center gap-1">
                <Navigation size={13} className="text-purple-600" /> Map Longitude (GPS)
              </label>
              <input 
                type="number" 
                step="0.000001"
                value={formData.lng}
                onChange={e => setFormData({...formData, lng: parseFloat(e.target.value) || 0})}
                className="w-full h-12 px-4 bg-purple-50/50 border border-purple-200 rounded-xl text-sm font-black text-purple-950 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end border-t border-gray-100">
          <button 
            type="submit"
            disabled={isLoading}
            className="px-10 h-13 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-500/25 transition-all flex items-center gap-2.5 disabled:bg-gray-400 active:scale-95 shadow-2xs"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Complete Shop Profile & Location</>}
          </button>
        </div>
      </form>
    </div>
  );
};
