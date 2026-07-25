import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, PawPrint, Camera, ChevronRight, Loader2 } from "lucide-react";
import { usePet } from "../../context/PetContext";

import { storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface AddPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  petToEdit?: any;
}

const EMPTY_FORM = {
  name: "",
  species: "Dog",
  breed: "",
  dob: "",
  age: "",
  ageMonths: "",
  gender: "Male",
  weight: "",
  medical_history: "",
  allergies: "",
  food_preferences: "",
  behavior_notes: "",
  aggression_triggers: "",
  calming_methods: "",
  skin_details: "",
  ideal_temperature: "",
  vaccination_report: "",
  next_vaccination_date: "",
  security_measures: "",
  vet_service_required: false,
  photoUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300"
};

export const AddPetModal = ({ isOpen, onClose, petToEdit }: AddPetModalProps) => {
  const { addPet, updatePet } = usePet();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const isEditing = !!petToEdit;

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsSaving(false);
      if (petToEdit) {
        setFormData({
          name: petToEdit.name || "",
          species: petToEdit.species || "Dog",
          breed: petToEdit.breed || "",
          dob: petToEdit.dob || "",
          age: petToEdit.age != null ? String(petToEdit.age) : "",
          ageMonths: petToEdit.age_months != null ? String(petToEdit.age_months) : "",
          gender: petToEdit.gender || "Male",
          weight: petToEdit.weight != null ? String(petToEdit.weight) : "",
          medical_history: petToEdit.medical_history || "",
          allergies: petToEdit.allergies || "",
          food_preferences: petToEdit.food_preferences || "",
          behavior_notes: petToEdit.behavior_notes || "",
          aggression_triggers: petToEdit.aggression_triggers || "",
          calming_methods: petToEdit.calming_methods || "",
          skin_details: petToEdit.skin_details || "",
          ideal_temperature: petToEdit.ideal_temperature || "",
          vaccination_report: petToEdit.vaccination_report || "",
          next_vaccination_date: petToEdit.next_vaccination_date || "",
          security_measures: petToEdit.security_measures || "",
          vet_service_required: !!petToEdit.vet_service_required,
          photoUrl: petToEdit.photo_url || petToEdit.avatar_url || EMPTY_FORM.photoUrl
        });
      } else {
        setFormData({ ...EMPTY_FORM });
      }
    }
  }, [isOpen, petToEdit]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const storageRef = ref(storage, `pet-photos/${filePath}`);
      await uploadBytes(storageRef, file);
      const publicUrl = await getDownloadURL(storageRef);

      setFormData({ ...formData, photoUrl: publicUrl });
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSavePet = async () => {
    if (!formData.name.trim() || !formData.breed.trim()) {
      alert("Please fill in at least Pet's Name and Breed.");
      setStep(1);
      return;
    }

    setIsSaving(true);
    
    const payload: any = {
      name: formData.name.trim(),
      species: formData.species,
      breed: formData.breed.trim(),
      gender: formData.gender,
      age: formData.age ? parseInt(formData.age, 10) : 0,
      age_months: formData.ageMonths ? parseInt(formData.ageMonths, 10) : 0,
      weight: formData.weight ? formData.weight : null,
      medical_history: formData.medical_history ? formData.medical_history.trim() : null,
      allergies: formData.allergies ? formData.allergies.trim() : null,
      food_preferences: formData.food_preferences ? formData.food_preferences.trim() : null,
      behavior_notes: formData.behavior_notes ? formData.behavior_notes.trim() : null,
      aggression_triggers: formData.aggression_triggers ? formData.aggression_triggers.trim() : null,
      calming_methods: formData.calming_methods ? formData.calming_methods.trim() : null,
      skin_details: formData.skin_details ? formData.skin_details.trim() : null,
      ideal_temperature: formData.ideal_temperature ? formData.ideal_temperature.trim() : null,
      vaccination_report: formData.vaccination_report ? formData.vaccination_report.trim() : null,
      next_vaccination_date: formData.next_vaccination_date ? formData.next_vaccination_date : null,
      security_measures: formData.security_measures ? formData.security_measures.trim() : null,
      vet_service_required: formData.vet_service_required,
      dob: formData.dob ? formData.dob : null,
      avatar_url: (formData.photoUrl && formData.photoUrl !== EMPTY_FORM.photoUrl) ? formData.photoUrl : null,
      photo_url: (formData.photoUrl && formData.photoUrl !== EMPTY_FORM.photoUrl) ? formData.photoUrl : null
    };

    try {
      if (isEditing) {
        await updatePet(petToEdit.id, payload);
      } else {
        await addPet(payload);
      }
      
      onClose();
      setTimeout(() => {
        setStep(1);
        setFormData({ ...EMPTY_FORM });
      }, 500);
    } catch (err: any) {
      console.error('Pet save error:', err);
      alert("Failed to save pet details. Error: " + (err.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSavePet();
    }
  };

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all";
  const labelClass = "block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[101] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/80">
              <div>
                <h2 className="text-xl font-black text-gray-900">{isEditing ? 'Edit Pet Profile' : 'Add New Pet'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    Step {step} of 3
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {step === 1 ? 'Basic Details' : step === 2 ? 'Behavior & Sensitivities' : 'Vaccination & Security'}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition-colors border border-gray-200 shadow-2xs">
                <X size={18} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-purple-100 h-1.5">
              <div className="bg-purple-600 h-full transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <form id="add-pet-form" onSubmit={handleSubmit} className="space-y-4">
                
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="flex justify-center py-2">
                      <div className="relative">
                        <div className="w-24 h-24 bg-purple-50 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                          {isUploading ? (
                            <Loader2 size={24} className="animate-spin text-purple-600" />
                          ) : formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <PawPrint size={32} className="text-purple-300" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-purple-700 transition-colors cursor-pointer shadow-2xs">
                          <Camera size={14} />
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Pet's Name *</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Max"
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Species *</label>
                        <select 
                          value={formData.species}
                          onChange={(e) => setFormData({...formData, species: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Rabbit">Rabbit</option>
                          <option value="Hamster">Hamster</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Breed *</label>
                        <input 
                          type="text" 
                          value={formData.breed}
                          onChange={(e) => setFormData({...formData, breed: e.target.value})}
                          placeholder="e.g. Golden Retriever"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>Age (Yrs)</label>
                          <input 
                            type="number" 
                            min="0"
                            value={formData.age}
                            onChange={(e) => setFormData({...formData, age: e.target.value})}
                            placeholder="2"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Months</label>
                          <input 
                            type="number" 
                            min="0"
                            max="11"
                            value={formData.ageMonths}
                            onChange={(e) => setFormData({...formData, ageMonths: e.target.value})}
                            placeholder="6"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Date of Birth</label>
                        <input 
                          type="date" 
                          max={new Date().toISOString().split('T')[0]}
                          value={formData.dob}
                          onChange={(e) => {
                            const newDob = e.target.value;
                            let newAge = formData.age;
                            let newAgeMonths = formData.ageMonths;
                            try {
                              if (newDob && newDob.trim() !== "") {
                                const bDate = new Date(newDob);
                                if (!isNaN(bDate.getTime())) {
                                  const today = new Date();
                                  let years = today.getFullYear() - bDate.getFullYear();
                                  let months = today.getMonth() - bDate.getMonth();
                                  if (today.getDate() < bDate.getDate()) months--;
                                  if (months < 0) { years--; months += 12; }
                                  newAge = String(Math.max(0, years));
                                  newAgeMonths = String(Math.max(0, months));
                                }
                              }
                            } catch (err) {}
                            setFormData({...formData, dob: newDob, age: newAge, ageMonths: newAgeMonths});
                          }}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Weight</label>
                        <input 
                          type="text" 
                          value={formData.weight}
                          onChange={(e) => setFormData({...formData, weight: e.target.value})}
                          placeholder="e.g. 5 kg"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Gender</label>
                        <div className="flex gap-2">
                          <label className={`flex-1 py-2 border rounded-xl text-center text-xs font-bold cursor-pointer transition-all ${formData.gender === 'Male' ? 'bg-purple-100 border-purple-300 text-purple-900 shadow-2xs' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <input type="radio" name="gender" className="hidden" checked={formData.gender === 'Male'} onChange={() => setFormData({...formData, gender: 'Male'})} />
                            Male
                          </label>
                          <label className={`flex-1 py-2 border rounded-xl text-center text-xs font-bold cursor-pointer transition-all ${formData.gender === 'Female' ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-2xs' : 'bg-white border-gray-200 text-gray-600'}`}>
                            <input type="radio" name="gender" className="hidden" checked={formData.gender === 'Female'} onChange={() => setFormData({...formData, gender: 'Female'})} />
                            Female
                          </label>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900 font-medium shadow-2xs">
                      💡 These profile details are optional right now, but completing them helps resorts & vets prepare customized care for your pet!
                    </div>

                    <div>
                      <label className={labelClass}>General Behavior & Habits</label>
                      <textarea 
                        value={formData.behavior_notes}
                        onChange={(e) => setFormData({...formData, behavior_notes: e.target.value})}
                        placeholder="Describe your pet's general behavior (e.g. friendly, shy, active, loves naps)..."
                        className={`${inputClass} min-h-[60px] resize-y`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Aggression Triggers</label>
                        <textarea 
                          value={formData.aggression_triggers}
                          onChange={(e) => setFormData({...formData, aggression_triggers: e.target.value})}
                          placeholder="When does the pet become aggressive? (e.g. around male dogs, when eating, or 'None')..."
                          className={`${inputClass} min-h-[60px] resize-y`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Calming Methods</label>
                        <textarea 
                          value={formData.calming_methods}
                          onChange={(e) => setFormData({...formData, calming_methods: e.target.value})}
                          placeholder="How to calm the pet down? (e.g. give specific toy, gently pet ears)..."
                          className={`${inputClass} min-h-[60px] resize-y`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Diet / Food Preferences</label>
                        <input 
                          type="text"
                          value={formData.food_preferences}
                          onChange={(e) => setFormData({...formData, food_preferences: e.target.value})}
                          placeholder="Specific food brands, meal times..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Allergies</label>
                        <input 
                          type="text"
                          value={formData.allergies}
                          onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                          placeholder="e.g. Chicken, Grain (or 'None')"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Skin Details / Sensitivities</label>
                        <input 
                          type="text"
                          value={formData.skin_details}
                          onChange={(e) => setFormData({...formData, skin_details: e.target.value})}
                          placeholder="e.g. sensitive skin, dry skin, tick issues"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Ideal Temperature</label>
                        <input 
                          type="text"
                          value={formData.ideal_temperature}
                          onChange={(e) => setFormData({...formData, ideal_temperature: e.target.value})}
                          placeholder="e.g. AC preferred, room temperature"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Medical History & Ongoing Issues</label>
                      <textarea 
                        value={formData.medical_history}
                        onChange={(e) => setFormData({...formData, medical_history: e.target.value})}
                        placeholder="Any ongoing medical conditions or regular medications? (Type 'None' if healthy)"
                        className={`${inputClass} min-h-[50px] resize-y`}
                      />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900 font-medium shadow-2xs">
                      🛡️ Verified care partners check these records for pet safety and health checkups during check-in.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Recent Vaccination Details</label>
                        <input 
                          type="text"
                          value={formData.vaccination_report}
                          onChange={(e) => setFormData({...formData, vaccination_report: e.target.value})}
                          placeholder="Name of vaccine & date given"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Next Due Date (dd-mm-yyyy)</label>
                        <input 
                          type="date"
                          value={formData.next_vaccination_date}
                          onChange={(e) => setFormData({...formData, next_vaccination_date: e.target.value})}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Additional Security Measures</label>
                      <textarea 
                        value={formData.security_measures}
                        onChange={(e) => setFormData({...formData, security_measures: e.target.value})}
                        placeholder="Any special handling rules, collar instructions, escape risks, or security notes..."
                        className={`${inputClass} min-h-[60px] resize-y`}
                      />
                    </div>

                    <label className="flex items-start gap-3 p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl cursor-pointer hover:bg-purple-50 transition-colors shadow-2xs">
                      <input 
                        type="checkbox" 
                        checked={formData.vet_service_required} 
                        onChange={(e) => setFormData({...formData, vet_service_required: e.target.checked})} 
                        className="w-4 h-4 mt-0.5 rounded accent-purple-600 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-xs">Request Veterinary Service Checkup</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Check this if you want an on-call vet or health checkup during any future boarding/clinic stays.</p>
                      </div>
                    </label>
                  </motion.div>
                )}
              </form>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-purple-100 bg-purple-50/50 flex flex-col gap-2">
              <div className="flex gap-2">
                {step > 1 && (
                  <button 
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="w-1/3 bg-white border border-purple-200 text-purple-900 font-bold py-2.5 rounded-xl hover:bg-purple-100 transition-colors text-xs shadow-2xs"
                  >
                    ← Back
                  </button>
                )}
                <button 
                  type="submit" 
                  form="add-pet-form"
                  disabled={isSaving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-black py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 text-xs shadow-2xs"
                >
                  {isSaving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving...</>
                  ) : step < 3 ? (
                    <>Next Step <ChevronRight size={16} /></>
                  ) : (
                    <>{isEditing ? 'Update Profile' : 'Save Complete Profile'}</>
                  )}
                </button>
              </div>

              {step < 3 && (
                <button
                  type="button"
                  onClick={handleSavePet}
                  disabled={isSaving}
                  className="w-full text-center text-xs font-bold text-purple-600 hover:text-purple-800 py-1"
                >
                  Skip for now & save basic profile only →
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

