import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePet } from "../../context/PetContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { ArrowLeft, Edit3, HeartPulse, Activity, Syringe, ShieldCheck, AlertCircle, Calendar, ShieldAlert, Smile, CheckCircle2, Circle, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { AddPetModal } from "../../components/pets/AddPetModal";
import { computePetCompletion } from "../../utils/petCompletion";
import { motion } from "framer-motion";

export const PetProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pets } = usePet();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  
  const pet = pets.find(p => p.id === id);
  const completion = pet ? computePetCompletion(pet) : null;

  if (!pet) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh] bg-purple-50/40">
        <h2 className="text-xl font-bold mb-4 text-purple-950">Pet Not Found</h2>
        <button onClick={() => navigate(-1)} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-black text-xs transition-colors shadow-sm">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <PageTransition className="pb-24 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] min-h-screen">
      {/* Cover Header */}
      <div className="h-64 md:h-80 relative w-full overflow-hidden bg-slate-900 rounded-b-[40px] sm:rounded-b-[60px] shadow-sm mb-6">
        <motion.img 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src={pet.photo_url || pet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800"} 
          alt={pet.name} 
          className="w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-6 left-6 w-11 h-11 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20 shadow-sm border border-white/20 active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>

        <button 
          onClick={() => setIsEditOpen(true)}
          className="absolute top-6 right-6 bg-white/20 hover:bg-white/30 backdrop-blur-xl px-4 py-2.5 rounded-full flex items-center gap-2 text-white transition-all z-20 shadow-sm font-black text-sm border border-white/20 active:scale-95"
        >
          <Edit3 size={16} />
          <span>Edit Profile</span>
        </button>

        <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-10 right-6 sm:right-10 flex items-end justify-between">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                {pet.species}
              </span>
              {pet.status && (
                <span className="bg-emerald-500/90 text-white backdrop-blur-md border border-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  {pet.status}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg tracking-tight">{pet.name}</h1>
            <p className="text-sm md:text-base text-slate-200 font-bold mt-1 tracking-wide">
              {pet.breed} • {(pet.age || pet.age_months) ? `${pet.age ? pet.age + 'y ' : ''}${pet.age_months ? pet.age_months + 'm' : ''}`.trim() : 'Age Not Specified'} • {pet.gender || 'Unknown Gender'}
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="hidden sm:flex flex-col items-end bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300 block mb-0.5">Weight</span>
            <span className="text-2xl font-black text-white">{pet.weight || 'N/A'}</span>
          </motion.div>
        </div>
      </div>

      {/* ── LinkedIn-Style Profile Completion Card ─────────────────────── */}
      {completion && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[32px] border border-slate-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8"
          >
            {/* Top row: level badge + pct */}
            <div className="relative flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{completion.levelEmoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Profile Strength
                  </span>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700">
                    {completion.level}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-slate-900 leading-none">
                  {completion.percentage}%
                  <span className="text-sm font-bold text-slate-500 ml-2">Complete</span>
                </h3>
                <p className="text-sm text-slate-500 font-semibold mt-2">
                  {completion.filledCount} of {completion.totalCount} fields filled
                  {completion.percentage < 100 && " · complete your profile to get the best care"}
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(true)}
                className="shrink-0 flex items-center gap-2 bg-slate-900 text-white text-sm font-black px-5 py-3 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-md"
              >
                <Zap size={16} className="text-amber-400" /> Complete Now
              </button>
            </div>

            {/* Progress bar */}
            <div className="relative mb-6">
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completion.percentage}%` }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                />
              </div>
              {/* Milestone marks */}
              {[25, 50, 75].map(m => (
                <div
                  key={m}
                  className="absolute top-0 h-4 w-px bg-white/70"
                  style={{ left: `${m}%` }}
                />
              ))}
            </div>

            {/* Category bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {(["basic", "health", "care", "security"] as const).map(cat => {
                const catFields = completion.fields.filter(f => f.category === cat);
                const catFilled = catFields.filter(f => f.filled).length;
                const catTotal = catFields.length;
                const catPct = Math.round((catFilled / catTotal) * 100);
                const catLabel = { basic: "Basic", health: "Health", care: "Care", security: "Security" }[cat];
                const catColors: Record<string, string> = {
                  basic: "bg-blue-500", health: "bg-emerald-500", care: "bg-amber-500", security: "bg-purple-500"
                };
                return (
                  <div key={cat} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{catLabel}</span>
                      <span className="text-[10px] font-extrabold text-slate-700 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{catFilled}/{catTotal}</span>
                    </div>
                    <div className="h-2 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${catPct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                        className={`h-full rounded-full ${catColors[cat]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Field checklist */}
            <div>
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${!showAllFields ? "max-h-[160px] overflow-hidden" : ""}`} style={{ maskImage: !showAllFields ? "linear-gradient(to bottom, black 60%, transparent 100%)" : undefined, WebkitMaskImage: !showAllFields ? "linear-gradient(to bottom, black 60%, transparent 100%)" : undefined }}>
                {completion.fields.map(f => (
                  <div
                    key={f.key}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      f.filled
                        ? "bg-slate-50 border-slate-200 text-slate-700"
                        : "bg-white border-slate-200/50 text-slate-400"
                    }`}
                  >
                    {f.filled ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate-200 shrink-0" />
                    )}
                    <span className="mr-1 opacity-70">{f.icon}</span>
                    <span className={f.filled ? "text-slate-800" : "text-slate-400"}>{f.label}</span>
                    {!f.filled && (
                      <span className="ml-auto text-[9px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-2 py-1 rounded-full shrink-0">+{f.weight}pt</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAllFields(v => !v)}
                className="mt-4 w-full flex items-center justify-center gap-2 text-[11px] font-black text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors py-2"
              >
                {showAllFields ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {completion.totalCount} fields</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Specifications Grid (Apple Style) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 md:grid-cols-12 gap-6 pb-12">
        
        {/* Left Column: Quick Specs & Basic Health */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <HeartPulse size={18} className="text-purple-500 shrink-0" /> Basic Details
            </h3>
            <div className="divide-y divide-slate-100/80 text-sm">
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Species & Breed</span>
                <span className="font-black text-slate-900">{pet.species} - {pet.breed || 'N/A'}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Current Weight</span>
                <span className="font-black text-slate-900">{pet.weight || 'Not specified'}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Gender</span>
                <span className="font-black text-slate-900">{pet.gender || 'N/A'}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Date of Birth</span>
                <span className="font-black text-slate-900">{pet.dob ? new Date(pet.dob).toLocaleDateString() : 'Not specified'}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-500 font-bold">Live GPS Tracking</span>
                <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider">Enabled</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={18} className="text-emerald-500 shrink-0" /> Diet & Sensitivities
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-black text-slate-400 uppercase tracking-widest text-[10px] block mb-1">Food Preferences</span>
                <p className="font-bold text-slate-800">{pet.food_preferences || 'No specific diet recorded'}</p>
              </div>
              <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                <span className="font-black text-red-500 uppercase tracking-widest text-[10px] block mb-1">Allergies</span>
                <p className="font-bold text-red-900">{pet.allergies || 'None reported'}</p>
              </div>
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                <span className="font-black text-amber-600 uppercase tracking-widest text-[10px] block mb-1">Skin Sensitivities</span>
                <p className="font-bold text-amber-900">{pet.skin_details || 'Normal / None'}</p>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <span className="font-black text-blue-600 uppercase tracking-widest text-[10px] block mb-1">Ideal Temperature</span>
                <p className="font-bold text-blue-900">{pet.ideal_temperature || 'Standard room temp / AC'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Behavior, Temperament, Vaccination & Security Sheets */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Behavior & Temperament Sheet */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Smile size={18} className="text-amber-500 shrink-0" /> Behavior Profile
              </h3>
              <button 
                onClick={() => setIsEditOpen(true)}
                className="text-xs font-black text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full"
              >
                <Edit3 size={12} /> Edit Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-black text-slate-400 uppercase tracking-widest text-[10px] block mb-1">General Behavior</span>
                <p className="text-slate-700 font-semibold leading-relaxed">
                  {pet.behavior_notes || 'No general behavior notes added yet. Click edit to describe social habits, favorite games, or sleeping style.'}
                </p>
              </div>

              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                <span className="font-black text-rose-500 uppercase tracking-widest text-[10px] block mb-1">Aggression Triggers</span>
                <p className="text-slate-700 font-semibold leading-relaxed">
                  {pet.aggression_triggers || 'None documented (e.g. food aggression, loud noises, around larger male dogs).'}
                </p>
              </div>

              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                <span className="font-black text-teal-600 uppercase tracking-widest text-[10px] block mb-1">Calming Methods</span>
                <p className="text-slate-700 font-semibold leading-relaxed">
                  {pet.calming_methods || 'No calming instructions noted (e.g. favorite plush toy, ear scratching, soothing voice).'}
                </p>
              </div>
            </div>
          </div>

          {/* Vaccination & Security Profile Sheet */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-600 shrink-0" /> Health & Security
              </h3>
              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 tracking-wider uppercase">
                Verified Care Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-5 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-start gap-4">
                <div className="p-2.5 bg-white text-purple-600 rounded-xl shrink-0 mt-0.5 border border-purple-100 shadow-sm">
                  <Syringe size={18} />
                </div>
                <div>
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px] block">Recent Vaccination Details</span>
                  <p className="font-bold text-slate-900 mt-1">{pet.vaccination_report || 'No vaccination report added'}</p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="p-2.5 bg-white text-slate-600 rounded-xl shrink-0 mt-0.5 shadow-sm">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px] block">Next Due Date</span>
                  <p className="font-bold text-slate-900 mt-1">{pet.next_vaccination_date ? new Date(pet.next_vaccination_date).toLocaleDateString() : 'Not scheduled / Not set'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                <div className="p-2.5 bg-white text-slate-600 rounded-xl shrink-0 mt-0.5 shadow-sm">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px] block">Security Measures</span>
                  <p className="text-slate-800 font-semibold mt-1 leading-relaxed">{pet.security_measures || 'Standard collar & leash handling. No escape risks or special harness notes.'}</p>
                </div>
              </div>

              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="p-2.5 bg-white text-blue-600 rounded-xl shrink-0 mt-0.5 border border-blue-100 shadow-sm">
                  <HeartPulse size={18} />
                </div>
                <div>
                  <span className="font-black text-blue-500 uppercase tracking-widest text-[10px] block">Veterinary Requests</span>
                  <p className="font-bold text-slate-900 mt-1">
                    {pet.vet_service_required ? '✓ Requested on-call vet / health checkup during stays' : 'Standard check-in (No extra vet checkup requested)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-500 shrink-0" /> Ongoing Medical History
            </h3>
            <p className="text-sm text-slate-700 font-semibold leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100">
              {pet.medical_history || 'No ongoing medical issues, chronic conditions, or daily medications recorded.'}
            </p>
          </div>

        </div>
      </div>

      <AddPetModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        petToEdit={pet} 
      />
    </PageTransition>
  );
};
