import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, MapPin, Tag, Users, Loader2 } from "lucide-react";

interface BusinessRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (business: any) => void;
  ownerId: string;
  defaultType: string;
}

import { db } from "../../lib/firebase";
import { collection, addDoc, getDoc } from "firebase/firestore";

export const BusinessRegistrationModal = ({ isOpen, onClose, onSuccess, ownerId, defaultType }: BusinessRegistrationModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: defaultType || "Boarding",
    description: "",
    amenities: "",
    street: "",
    city: "",
    lat: "20.5937",
    lng: "78.9629",
    capacity: "10",
    priceFrom: "999"
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const payload = {
        name: formData.name,
        type: formData.type.toLowerCase(),
        description: formData.description,
        address: formData.street || 'Not provided',
        city: formData.city,
        owner_id: ownerId,
        amenities: formData.amenities ? formData.amenities.split(',').map(a => a.trim()) : [],
        capacity: Number(formData.capacity) || 10,
        priceFrom: Number(formData.priceFrom) || 999,
        lat: Number(formData.lat) || 20.5937,
        lng: Number(formData.lng) || 78.9629,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'businesses'), payload);
      const snapshot = await getDoc(docRef);
      const data = { id: snapshot.id, ...snapshot.data() };

      onSuccess(data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register business');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Register Shop</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">Complete your profile to get listed on the map.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold mb-6">
              {error}
            </div>
          )}

          <form id="business-registration-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Shop Name</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  placeholder="e.g. Happy Paws Boarding"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Business Category</label>
              <div className="relative">
                <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all appearance-none"
                >
                  <option value="Boarding">Boarding</option>
                  <option value="Grooming">Grooming</option>
                  <option value="Veterinary">Veterinary Clinic</option>
                  <option value="Pet Shop">Pet Shop</option>
                  <option value="Training">Training</option>
                  <option value="Walking">Walking</option>
                  <option value="Pet Sitting">Pet Sitting</option>
                  <option value="Daycare">Daycare</option>
                  <option value="Swimming">Swimming</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full h-24 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all resize-none"
                placeholder="Describe your business and services..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Amenities (Comma separated)</label>
              <input 
                type="text" 
                value={formData.amenities}
                onChange={e => setFormData({...formData, amenities: e.target.value})}
                className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                placeholder="e.g. WiFi, Air Conditioning, Free Parking"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">City</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    placeholder="e.g. Mumbai"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Street / Area</label>
                <input 
                  type="text" 
                  value={formData.street}
                  onChange={e => setFormData({...formData, street: e.target.value})}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  placeholder="e.g. Bandra West"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Daily Capacity</label>
                <div className="relative">
                  <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="number" 
                    value={formData.capacity}
                    onChange={e => setFormData({...formData, capacity: e.target.value})}
                    className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Starting Price (₹)</label>
                <div className="relative">
                  <Tag size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="number" 
                    value={formData.priceFrom}
                    onChange={e => setFormData({...formData, priceFrom: e.target.value})}
                    className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>
            
            <p className="text-[11px] font-medium text-gray-400 leading-relaxed text-center mt-4">
              By clicking register, your business will become instantly discoverable by thousands of pet parents on Gouuji Pets.
            </p>
          </form>
        </div>

        <div className="p-6 border-t border-purple-100 bg-purple-50/50 shrink-0">
          <button 
            type="submit"
            form="business-registration-form"
            disabled={isLoading}
            className="w-full h-14 bg-purple-600 text-white rounded-2xl font-black shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 shadow-2xs"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Register Shop Now'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
