import { useState, useEffect } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { Syringe, CheckCircle2, Circle, Plus, X, Upload, Loader2, Trash2, ExternalLink, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { usePet } from "../../context/PetContext";
import { db, storage } from "../../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const Vaccinations = () => {
  const { activePet } = usePet();
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newVax, setNewVax] = useState({ name: "", date: "", type: "Core", notes: "", documentUrl: "" });

  useEffect(() => {
    if (!activePet?.id) {
      setVaccines([]);
      return;
    }

    const q = query(
      collection(db, 'health_records_and_reminders'),
      where('pet_id', '==', activePet.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      // Sort: upcoming vaccines on top, then completed by date desc
      data.sort((a: any, b: any) => {
        if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
        if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setVaccines(data);
    }, (err) => {
      console.error("Realtime vaccines error:", err);
    });

    return () => unsubscribe();
  }, [activePet?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activePet?.id || 'pet'}_${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, `vaccine-records/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setNewVax(prev => ({ ...prev, documentUrl: url }));
    } catch (err) {
      console.error("Upload error", err);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVax.name || !newVax.date || !activePet?.id) return;

    setIsSaving(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const status = newVax.date > todayStr ? "upcoming" : "completed";

      const payload = {
        pet_id: activePet.id,
        title: newVax.name,
        name: newVax.name,
        date: newVax.date,
        due_date: newVax.date,
        status,
        type: newVax.type,
        notes: newVax.notes || "",
        document_url: newVax.documentUrl || "",
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, 'health_records_and_reminders'), payload);

      // Proactively update pet's overview record fields for quick display
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      if (status === 'completed') {
        await updateDoc(firestoreDoc(db, 'pets', activePet.id), {
          vaccination_report: `${newVax.name} (given ${newVax.date})`
        });
      } else if (status === 'upcoming') {
        await updateDoc(firestoreDoc(db, 'pets', activePet.id), {
          next_vaccination_date: newVax.date
        });
      }

      setIsAdding(false);
      setNewVax({ name: "", date: "", type: "Core", notes: "", documentUrl: "" });
    } catch (err) {
      console.error("Save record error", err);
      alert("Failed to save vaccination record");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vaccination record?")) return;
    try {
      await deleteDoc(doc(db, 'health_records_and_reminders', id));
    } catch (err) {
      console.error("Delete record error", err);
      alert("Failed to delete record");
    }
  };

  const formatDate = (dateStr: string, status: string) => {
    const d = new Date(dateStr);
    const formatted = d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    return status === "upcoming" ? `Due on ${formatted}` : `Given on ${formatted}`;
  };

  if (!activePet) {
    return (
      <PageTransition className="pb-24 max-w-5xl mx-auto text-center py-12">
        <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-8 border border-white/80 max-w-md mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            🐕
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">No Active Pet Profile Selected</h2>
          <p className="text-xs text-slate-500 mb-5">Please add or select a pet profile from your dashboard first to manage vaccination records.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="pb-24 max-w-5xl mx-auto space-y-6">
      <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 flex justify-between items-center transition-all hover:shadow-lg hover:-translate-y-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Syringe className="text-purple-600" /> Vaccinations — {activePet.name}
          </h1>
          <p className="text-sm text-slate-500">Keep track of your pet's immunization schedule.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAdd} className="bg-white/70 backdrop-blur-xl p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 transition-all hover:shadow-lg hover:-translate-y-1 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-purple-100">
                <h3 className="font-black text-purple-950 text-base">Add Vaccination Record</h3>
                <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Vaccine Name *</label>
                  <input 
                    type="text" 
                    value={newVax.name}
                    onChange={(e) => setNewVax({...newVax, name: e.target.value})}
                    placeholder="e.g. Rabies"
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Date (Given or Due) *</label>
                  <input 
                    type="date" 
                    value={newVax.date}
                    onChange={(e) => setNewVax({...newVax, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Type</label>
                  <select 
                    value={newVax.type}
                    onChange={(e) => setNewVax({...newVax, type: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  >
                    <option value="Core">Core</option>
                    <option value="Non-Core">Non-Core</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Notes / Description</label>
                  <input 
                    type="text" 
                    value={newVax.notes}
                    onChange={(e) => setNewVax({...newVax, notes: e.target.value})}
                    placeholder="e.g. Given at VET Clinic"
                    className="w-full bg-slate-50 border border-slate-205 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Upload Vaccination Certificate (Given)</label>
                  <div className="flex items-center gap-3">
                    <label className={clsx(
                      "cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl transition-all w-full",
                      isUploading && "opacity-50 pointer-events-none"
                    )}>
                      {isUploading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : newVax.documentUrl ? (
                        <>
                          <CheckCircle2 size={16} className="text-purple-605" />
                          <span>Certificate Uploaded!</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Choose Document/Photo</span>
                        </>
                      )}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-slate-500 font-bold text-xs">Cancel</button>
                <button type="submit" disabled={isSaving || isUploading} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl disabled:opacity-50 shadow-sm flex items-center gap-1">
                  {isSaving && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 transition-all hover:shadow-lg hover:-translate-y-1">
        {vaccines.length > 0 ? (
          <div className="relative border-l-2 border-purple-100 ml-3 space-y-8 py-2">
            {vaccines.map((vax, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={vax.id} 
                className="relative pl-6"
              >
                <div className="absolute -left-[11px] top-0 bg-transparent rounded-full shadow-sm z-10">
                  {vax.status === "completed" ? (
                    <CheckCircle2 className="text-purple-600 bg-white rounded-full" size={20} />
                  ) : (
                    <Circle className="text-purple-600 bg-white rounded-full" size={20} />
                  )}
                </div>
                
                <div className={clsx("flex justify-between items-start", vax.status === "completed" && "opacity-80")}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-base">{vax.title || vax.name}</h4>
                      {vax.status === "upcoming" && (
                        <span className="bg-purple-100 text-purple-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-200">
                          Upcoming / Due
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(vax.date, vax.status)}</p>
                    {vax.notes && <p className="text-xs text-slate-400 mt-1">Notes: {vax.notes}</p>}
                    {vax.document_url && (
                      <a 
                        href={vax.document_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md mt-2 border border-purple-200"
                      >
                        <FileText size={12} />
                        <span>View Certificate Proof</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "text-[10px] font-bold px-2 py-1 rounded-md shrink-0",
                      vax.type === "Core" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                      {vax.type}
                    </span>
                    <button 
                      onClick={() => handleDelete(vax.id)}
                      className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                      title="Delete record"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 font-bold text-sm">
            🛡️ No vaccination records added for {activePet.name}. Click "+" to add vaccine sheets manually!
          </div>
        )}
      </div>
    </PageTransition>
  );
};
