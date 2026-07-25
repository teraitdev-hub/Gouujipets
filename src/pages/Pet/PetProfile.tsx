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
    <PageTransition className="pb-24 bg-gray-50 min-h-screen">
      {/* Cover Header */}
      <div className="h-56 md:h-64 relative w-full overflow-hidden bg-purple-950">
        <img 
          src={pet.photo_url || pet.avatar_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800"} 
          alt={pet.name} 
          className="w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-950 via-purple-950/40 to-transparent" />
        
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 w-9 h-9 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors z-20 shadow-sm border border-white/30"
        >
          <ArrowLeft size={18} />
        </button>

        <button 
          onClick={() => setIsEditOpen(true)}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-white transition-colors z-20 shadow-sm font-bold text-xs border border-white/30"
        >
          <Edit3 size={14} />
          <span>Edit Profile</span>
        </button>

        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                {pet.species}
              </span>
              {pet.status && (
                <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
                  {pet.status}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-md">{pet.name}</h1>
            <p className="text-xs md:text-sm text-gray-200 font-medium mt-0.5">
              {pet.breed} • {(pet.age || pet.age_months) ? `${pet.age ? pet.age + 'y ' : ''}${pet.age_months ? pet.age_months + 'm' : ''}`.trim() : 'Age Not Specified'} • {pet.gender || 'Unknown Gender'}
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-xs text-gray-300 block font-medium">Weight</span>
            <span className="text-lg font-black text-white">{pet.weight || 'Not recorded'}</span>
          </div>
        </div>
      </div>

      {/* ── LinkedIn-Style Profile Completion Card ─────────────────────── */}
      {completion && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl border p-5 ${completion.levelBg} shadow-sm`}
          >
            {/* Decorative blobs */}
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/40 blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/30 blur-xl pointer-events-none" />

            {/* Top row: level badge + pct */}
            <div className="relative flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{completion.levelEmoji}</span>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${completion.levelColor}`}>
                    Profile Strength
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${completion.levelBg} ${completion.levelColor}`}>
                    {completion.level}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-purple-950 leading-none">
                  {completion.percentage}%
                  <span className="text-sm font-bold text-purple-600 ml-2">Complete</span>
                </h3>
                <p className="text-xs text-purple-700 font-medium mt-1">
                  {completion.filledCount} of {completion.totalCount} fields filled
                  {completion.percentage < 100 && " · complete your profile to get the best care"}
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(true)}
                className="shrink-0 flex items-center gap-1.5 bg-purple-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-purple-700 active:scale-95 transition-all shadow-md"
              >
                <Zap size={13} /> Complete Now
              </button>
            </div>

            {/* Progress bar */}
            <div className="relative mb-4">
              <div className="h-2.5 bg-white/60 rounded-full overflow-hidden border border-white/40">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completion.percentage}%` }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    completion.percentage === 100
                      ? "bg-gradient-to-r from-purple-800 to-purple-950"
                      : completion.percentage >= 80
                      ? "bg-gradient-to-r from-purple-700 to-purple-800"
                      : completion.percentage >= 60
                      ? "bg-gradient-to-r from-purple-600 to-purple-700"
                      : completion.percentage >= 35
                      ? "bg-gradient-to-r from-purple-500 to-purple-600"
                      : "bg-gradient-to-r from-purple-400 to-purple-500"
                  }`}
                />
              </div>
              {/* Milestone marks */}
              {[25, 50, 75].map(m => (
                <div
                  key={m}
                  className="absolute top-0 h-2.5 w-px bg-white/70"
                  style={{ left: `${m}%` }}
                />
              ))}
            </div>

            {/* Category bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {(["basic", "health", "care", "security"] as const).map(cat => {
                const catFields = completion.fields.filter(f => f.category === cat);
                const catFilled = catFields.filter(f => f.filled).length;
                const catTotal = catFields.length;
                const catPct = Math.round((catFilled / catTotal) * 100);
                const catLabel = { basic: "Basic", health: "Health", care: "Care", security: "Security" }[cat];
                const catColors: Record<string, string> = {
                  basic: "bg-purple-600", health: "bg-purple-500", care: "bg-purple-400", security: "bg-purple-700"
                };
                return (
                  <div key={cat} className="bg-white/60 border border-white/50 rounded-xl p-2.5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{catLabel}</span>
                      <span className="text-[10px] font-extrabold text-slate-700">{catFilled}/{catTotal}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
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
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 ${!showAllFields ? "max-h-[148px] overflow-hidden" : ""}`} style={{ maskImage: !showAllFields ? "linear-gradient(to bottom, black 60%, transparent 100%)" : undefined, WebkitMaskImage: !showAllFields ? "linear-gradient(to bottom, black 60%, transparent 100%)" : undefined }}>
                {completion.fields.map(f => (
                  <div
                    key={f.key}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      f.filled
                        ? "bg-white/70 border-white/60 text-slate-700"
                        : "bg-white/40 border-white/30 text-slate-500"
                    }`}
                  >
                    {f.filled ? (
                      <CheckCircle2 size={14} className="text-purple-600 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-slate-300 shrink-0" />
                    )}
                    <span className="mr-0.5">{f.icon}</span>
                    <span className={f.filled ? "text-slate-800 font-semibold" : "text-slate-400"}>{f.label}</span>
                    {!f.filled && (
                      <span className="ml-auto text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">+{f.weight}pt</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAllFields(v => !v)}
                className="mt-2.5 w-full flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors py-1"
              >
                {showAllFields ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Show all {completion.totalCount} fields</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Specifications Grid (Amazon/Flipkart Compact High-Density Style) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Column: Quick Specs & Basic Health */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-2xs">
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <HeartPulse size={16} className="text-purple-600 shrink-0" /> Basic Pet Specifications
            </h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Species & Breed</span>
                <span className="font-bold text-gray-900">{pet.species} - {pet.breed || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Current Weight</span>
                <span className="font-bold text-gray-900">{pet.weight || 'Not specified'}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Gender</span>
                <span className="font-bold text-gray-900">{pet.gender || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Date of Birth</span>
                <span className="font-bold text-gray-900">{pet.dob ? new Date(pet.dob).toLocaleDateString() : 'Not specified'}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-500 font-medium">Live GPS Tracking</span>
                <span className="font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Enabled</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-2xs">
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={16} className="text-purple-600 shrink-0" /> Diet & Sensitivities
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-400 uppercase text-[10px] block mb-0.5">Food Preferences</span>
                <p className="font-bold text-gray-800">{pet.food_preferences || 'No specific diet recorded'}</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <span className="font-bold text-purple-700 uppercase text-[10px] block mb-0.5">Allergies</span>
                <p className="font-bold text-purple-950">{pet.allergies || 'None reported'}</p>
              </div>
              <div className="p-2.5 bg-purple-50/70 rounded-xl border border-purple-200">
                <span className="font-bold text-purple-600 uppercase text-[10px] block mb-0.5">Skin Sensitivities</span>
                <p className="font-bold text-purple-900">{pet.skin_details || 'Normal / None'}</p>
              </div>
              <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                <span className="font-bold text-purple-700 uppercase text-[10px] block mb-0.5">Ideal Temperature</span>
                <p className="font-bold text-purple-950">{pet.ideal_temperature || 'Standard room temp / AC'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Behavior, Temperament, Vaccination & Security Sheets */}
        <div className="md:col-span-8 space-y-4">
          
          {/* Behavior & Temperament Sheet */}
          <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Smile size={18} className="text-purple-600 shrink-0" /> Behavior & Temperament Sheet
              </h3>
              <button 
                onClick={() => setIsEditOpen(true)}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <Edit3 size={12} /> Edit Details
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-400 uppercase text-[10px] block mb-1">General Behavior & Habits</span>
                <p className="text-gray-800 font-medium leading-relaxed">
                  {pet.behavior_notes || 'No general behavior notes added yet. Click edit to describe social habits, favorite games, or sleeping style.'}
                </p>
              </div>

              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200">
                <span className="font-bold text-purple-700 uppercase text-[10px] block mb-1">Aggression Triggers</span>
                <p className="text-gray-800 font-medium leading-relaxed">
                  {pet.aggression_triggers || 'None documented (e.g. food aggression, loud noises, around larger male dogs).'}
                </p>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
                <span className="font-bold text-purple-600 uppercase text-[10px] block mb-1">Calming Methods</span>
                <p className="text-gray-800 font-medium leading-relaxed">
                  {pet.calming_methods || 'No calming instructions noted (e.g. favorite plush toy, ear scratching, soothing voice).'}
                </p>
              </div>
            </div>
          </div>

          {/* Vaccination & Security Profile Sheet */}
          <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={18} className="text-purple-600 shrink-0" /> Vaccination & Security Profile
              </h3>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                Verified Care Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 flex items-start gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5 border border-purple-200">
                  <Syringe size={16} />
                </div>
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[10px] block">Recent Vaccination Details</span>
                  <p className="font-bold text-gray-900 mt-0.5">{pet.vaccination_report || 'No vaccination report added'}</p>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0 mt-0.5">
                  <Calendar size={16} />
                </div>
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[10px] block">Next Due Date</span>
                  <p className="font-bold text-gray-900 mt-0.5">{pet.next_vaccination_date ? new Date(pet.next_vaccination_date).toLocaleDateString() : 'Not scheduled / Not set'}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="p-2 bg-slate-200 text-slate-700 rounded-lg shrink-0 mt-0.5">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <span className="font-bold text-gray-400 uppercase text-[10px] block">Additional Security Measures</span>
                  <p className="text-gray-800 font-medium mt-0.5">{pet.security_measures || 'Standard collar & leash handling. No escape risks or special harness notes.'}</p>
                </div>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-100 flex items-start gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5">
                  <HeartPulse size={16} />
                </div>
                <div>
                  <span className="font-bold text-purple-600 uppercase text-[10px] block">Veterinary Service Checkup</span>
                  <p className="font-bold text-purple-900 mt-0.5">
                    {pet.vet_service_required ? '✓ Requested on-call vet / health checkup during stays' : 'Standard check-in (No extra vet checkup requested)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-gray-400 shrink-0" /> Ongoing Medical History & Notes
            </h3>
            <p className="text-xs text-gray-700 font-medium leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
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
