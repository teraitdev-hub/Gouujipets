import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, FileText, Loader2, Plus, Calendar, Upload, CheckCircle2, Trash2, ExternalLink } from "lucide-react";
import { auth, db, storage } from "../../lib/firebase";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface PartnerMedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
}

export const PartnerMedicalModal = ({ isOpen, onClose, booking }: PartnerMedicalModalProps) => {
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Record Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newRecord, setNewRecord] = useState({
    title: "",
    type: "Core",
    due_date: new Date().toISOString().split('T')[0],
    notes: "",
    status: "completed",
    documentUrl: ""
  });

  useEffect(() => {
    if (isOpen && booking) {
      fetchPets();
    } else {
      setPets([]);
      setRecords([]);
      setShowAddForm(false);
    }
  }, [isOpen, booking]);

  const fetchPets = async () => {
    setIsLoading(true);
    try {
      // Find which pets belong to this customer
      const q = query(collection(db, 'pets'), where('owner_id', '==', booking.customer_id.id || booking.customer_id));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(docSnap => {
        const petData = docSnap.data();
        let extra: any = {};
        
        if (petData.behavior_notes && typeof petData.behavior_notes === 'string' && petData.behavior_notes.trim().startsWith('{')) {
          try {
            extra = JSON.parse(petData.behavior_notes);
          } catch (e) {}
        }
        
        return {
          ...petData,
          id: docSnap.id,
          ...extra,
          behavior_notes: extra.general !== undefined ? extra.general : petData.behavior_notes
        };
      });
      
      let filteredPets = data || [];
      
      if (booking.pet_ids) {
        let allowedIds: string[] = [];
        if (Array.isArray(booking.pet_ids)) allowedIds = booking.pet_ids;
        else if (typeof booking.pet_ids === 'string') {
          try { allowedIds = JSON.parse(booking.pet_ids); }
          catch (e) { allowedIds = [booking.pet_ids]; }
        }
        
        if (allowedIds.length > 0) {
          filteredPets = filteredPets.filter(p => allowedIds.includes(p.id));
        }
      }

      if (filteredPets.length > 0) {
        setPets(filteredPets);
        setSelectedPetId(filteredPets[0].id);
        fetchRecords(filteredPets[0].id);
      }
    } catch (err) {
      console.error("Error fetching pets", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecords = async (petId: string) => {
    try {
      const q = query(collection(db, 'health_records_and_reminders'), where('pet_id', '==', petId));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data) setRecords(data);
    } catch (err) {
      console.error("Error fetching records", err);
    }
  };

  const handlePetChange = (petId: string) => {
    setSelectedPetId(petId);
    fetchRecords(petId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedPetId || 'pet'}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `vaccine-records/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewRecord(prev => ({ ...prev, documentUrl: url }));
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this health record?")) return;
    try {
      await deleteDoc(doc(db, 'health_records_and_reminders', recordId));
      fetchRecords(selectedPetId);
    } catch (err) {
      console.error("Delete record error", err);
      alert("Failed to delete record");
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId) return;
    
    setIsSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const computedStatus = newRecord.due_date > todayStr ? "upcoming" : "completed";
      
      const payload = {
        pet_id: selectedPetId,
        title: newRecord.title,
        name: newRecord.title,
        due_date: newRecord.due_date,
        date: newRecord.due_date,
        type: newRecord.type,
        notes: newRecord.notes,
        status: computedStatus,
        document_url: newRecord.documentUrl || "",
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'health_records_and_reminders'), payload);

      alert("Health record added successfully!");
      setShowAddForm(false);
      setNewRecord({
        title: "",
        type: "Core",
        due_date: new Date().toISOString().split('T')[0],
        notes: "",
        status: "completed",
        documentUrl: ""
      });
      fetchRecords(selectedPetId);

      // Also append to pet's medical history & quick columns for visibility
      const pet = pets.find(p => p.id === selectedPetId);
      if (pet) {
        const newHistory = pet.medical_history 
          ? `${pet.medical_history}\n- ${newRecord.title} (${newRecord.due_date})` 
          : `- ${newRecord.title} (${newRecord.due_date})`;
          
        const updates: any = { medical_history: newHistory };
        if (computedStatus === 'completed') {
          updates.vaccination_report = `${newRecord.title} (given ${newRecord.due_date})`;
        } else {
          updates.next_vaccination_date = newRecord.due_date;
        }
        await updateDoc(doc(db, 'pets', selectedPetId), updates);
      }

    } catch (err: any) {
      console.error("Failed to add record", err);
      alert("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPet = pets.find(p => p.id === selectedPetId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between relative bg-white z-20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                  <Activity size={16} />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-tight">Medical & Vaccinations</h2>
                  <p className="text-xs text-gray-500">{booking?.customer_id?.full_name}'s Pets</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 sm:p-4 overflow-y-auto">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="animate-spin mb-4" size={32} />
                  <p>Loading pet records...</p>
                </div>
              ) : pets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No pets found for this customer.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pet Selector */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {pets.map(pet => (
                      <button
                        key={pet.id}
                        onClick={() => handlePetChange(pet.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-black whitespace-nowrap transition-colors ${
                          selectedPetId === pet.id 
                            ? 'bg-purple-600 text-white shadow-2xs' 
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pet.name} ({pet.species})
                      </button>
                    ))}
                  </div>

                  {/* Pet Details Snippet */}
                  {selectedPet && (
                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 space-y-3 text-xs shadow-2xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Food & Diet</strong>
                          <p className="text-slate-800 font-bold">{selectedPet.food_preferences || 'None specified'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-purple-700 block mb-0.5 uppercase tracking-wider text-[9px]">Allergies</strong>
                          <p className="text-purple-950 font-black">{selectedPet.allergies || 'None reported'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Ideal Temperature</strong>
                          <p className="text-slate-800 font-bold">{selectedPet.ideal_temperature || 'Room Temperature / AC'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">General Behavior & Habits</strong>
                          <p className="text-slate-700 font-medium leading-relaxed">{selectedPet.behavior_notes || 'No behavior notes.'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-purple-700 block mb-0.5 uppercase tracking-wider text-[9px]">Aggression Triggers</strong>
                          <p className="text-purple-950 font-bold leading-relaxed">{selectedPet.aggression_triggers || 'None documented.'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Calming Methods</strong>
                          <p className="text-slate-700 font-medium leading-relaxed">{selectedPet.calming_methods || 'None documented.'}</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                          <strong className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Security & Escape Measures</strong>
                          <p className="text-slate-700 font-medium leading-relaxed">{selectedPet.security_measures || 'Standard leash handling.'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="bg-purple-100/50 p-2.5 rounded-xl border border-purple-200">
                          <strong className="text-purple-900 block mb-0.5 uppercase tracking-wider text-[9px]">Recent Vaccination Info</strong>
                          <p className="text-purple-950 font-bold">{selectedPet.vaccination_report || 'No vaccination record.'}</p>
                          {selectedPet.next_vaccination_date && (
                            <span className="text-[9px] text-purple-700 font-bold mt-1 block">
                              ⏰ Next Due: {new Date(selectedPet.next_vaccination_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="bg-purple-100/50 p-2.5 rounded-xl border border-purple-200 flex flex-col justify-between">
                          <div>
                            <strong className="text-purple-900 block mb-0.5 uppercase tracking-wider text-[9px]">Vet Checkup Required</strong>
                            <p className="text-purple-950 font-bold">
                              {selectedPet.vet_service_required ? '✓ Yes, Vet service requested during stays' : 'Standard stay (No extra vet request)'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                        <strong className="text-slate-400 block mb-0.5 uppercase tracking-wider text-[9px]">Ongoing Medical History</strong>
                        <p className="text-slate-750 font-medium leading-relaxed whitespace-pre-line">{selectedPet.medical_history || 'No medical history recorded.'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-slate-900">Vaccinations & Records</h3>
                    <button 
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="text-purple-600 text-sm font-black flex items-center gap-1 hover:underline"
                    >
                      <Plus size={16} /> Add Record
                    </button>
                  </div>

                  {/* Add Record Form */}
                  {showAddForm && (
                    <form onSubmit={handleAddRecord} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Title (e.g. Rabies Vaccine)</label>
                          <input 
                            type="text" 
                            required
                            value={newRecord.title}
                            onChange={e => setNewRecord({...newRecord, title: e.target.value})}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Type</label>
                          <select 
                            value={newRecord.type}
                            onChange={e => setNewRecord({...newRecord, type: e.target.value})}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                          >
                            <option value="Core">Core Vaccine</option>
                            <option value="Non-Core">Non-Core Vaccine</option>
                            <option value="Deworming">Deworming</option>
                            <option value="Checkup">General Checkup</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Date (Given or Due)</label>
                          <input 
                            type="date" 
                            required
                            value={newRecord.due_date}
                            onChange={e => setNewRecord({...newRecord, due_date: e.target.value})}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Upload Certificate proof</label>
                          <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-lg transition-all w-full h-[38px]">
                            {isUploading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : newRecord.documentUrl ? (
                              <CheckCircle2 size={14} className="text-purple-600" />
                            ) : (
                              <Upload size={14} />
                            )}
                            <span>{isUploading ? 'Uploading...' : newRecord.documentUrl ? 'Uploaded!' : 'Upload file'}</span>
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
                        <input 
                          type="text" 
                          value={newRecord.notes}
                          onChange={e => setNewRecord({...newRecord, notes: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-600"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-600 font-bold text-sm">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-black text-sm disabled:opacity-50 shadow-2xs">
                          {isSaving ? "Saving..." : "Save Record"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Records List */}
                  <div className="space-y-3">
                    {records.map(record => (
                      <div key={record.id} className="p-3 border border-purple-200 rounded-xl flex items-center justify-between hover:border-purple-300 transition-colors bg-purple-50/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            (record.type === 'Core' || record.type === 'Non-Core' || record.type === 'vaccine') ? 'bg-purple-100 text-purple-700' :
                            record.type === 'Deworming' ? 'bg-purple-100 text-purple-600' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900 text-sm">{record.title || record.name}</h4>
                              {record.status === "upcoming" && (
                                <span className="bg-purple-100 text-purple-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border border-purple-200">
                                  Upcoming
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                              <Calendar size={12} /> {record.due_date || record.date}
                              {record.notes && <span>• {record.notes}</span>}
                            </div>
                            {record.document_url && (
                              <a 
                                href={record.document_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded mt-1 border border-purple-200"
                              >
                                <ExternalLink size={10} /> View proof document
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                            {record.type}
                          </span>
                          <button 
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {records.length === 0 && !showAddForm && (
                      <div className="text-center py-6 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
                        No health records found for this pet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
