import { useState } from "react";
import { PageTransition } from "../../components/layout/PageTransition";
import { usePet } from "../../context/PetContext";
import { HeartPulse, Plus, Search, Filter, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AddPetModal } from "../../components/pets/AddPetModal";
import { computePetCompletion } from "../../utils/petCompletion";

export const Pets = () => {
  const { pets } = usePet();
  const navigate = useNavigate();
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [isAddingPet, setIsAddingPet] = useState(false);

  const editingPet = pets.find((p) => p.id === editingPetId);

  return (
    <PageTransition className="pb-24 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">My Pets</h1>
          <p className="text-text-light mt-1">Manage profiles, health records, and preferences.</p>
        </div>
        
        <button 
          onClick={() => setIsAddingPet(true)}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black hover:bg-purple-700 transition-all shadow-sm flex items-center gap-2 self-start md:self-auto active:scale-95"
        >
          <Plus size={18} className="stroke-[3]" />
          Add Pet
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 group-focus-within:text-purple-700 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name or breed..." 
            className="w-full h-12 bg-white border border-purple-200 rounded-xl pl-11 pr-4 text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-600 transition-all shadow-2xs placeholder:text-purple-400"
          />
        </div>
        <button className="h-12 px-6 bg-white border border-purple-200 rounded-xl flex items-center gap-2 hover:bg-purple-50 transition-all shadow-2xs text-purple-900 font-black active:scale-95 text-xs">
          <Filter size={18} className="text-purple-600" />
          Filter Profile
        </button>
      </div>

      {/* Pet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pets.map((pet, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={pet.id} 
            className="bg-white/70 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col"
          >
            {/* Cover Image Area */}
            <div className="h-48 relative overflow-hidden">
              <img 
                src={pet.avatar_url || pet.photo_url || "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80"} 
                alt={pet.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Profile strength badge */}
              {(() => {
                const c = computePetCompletion(pet);
                return (
                  <div className={`absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-md border border-white/20 ${
                    c.percentage === 100 ? "bg-purple-950/90 text-white shadow-2xs" :
                    c.percentage >= 80  ? "bg-purple-800/90 text-white" :
                    c.percentage >= 60  ? "bg-purple-700/90 text-white" :
                    c.percentage >= 35  ? "bg-purple-600/90 text-white" :
                    "bg-purple-500/80 text-white"
                  }`}>
                    {c.levelEmoji} {c.percentage}%
                  </div>
                );
              })()}
              
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-bold text-white drop-shadow-md">{pet.name}</h3>
                  <p className="text-white/90 text-sm font-medium">{pet.breed}</p>
                </div>
                <span className="bg-[#FDFBF7]/20 backdrop-blur-md text-white border border-white/30 text-xs font-bold px-3 py-1.5 rounded-xl capitalize">
                  {pet.species}
                </span>
              </div>
            </div>
            
            {/* Card Content */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="grid grid-cols-3 gap-2 mb-4 bg-white/50 rounded-xl p-3 border border-white/60">
                <div className="text-center">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Age</p>
                  <p className="font-bold text-slate-900 text-sm">
                    {pet.age || pet.age_months ? (
                      `${pet.age ? pet.age + 'y ' : ''}${pet.age_months ? pet.age_months + 'm' : (pet.age ? '' : '-')}`
                    ).trim() : '-'}
                  </p>
                </div>
                <div className="text-center border-l border-slate-200/50">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Weight</p>
                  <p className="font-bold text-slate-900 text-sm">{pet.weight ? `${pet.weight}kg` : '-'}</p>
                </div>
                <div className="text-center border-l border-slate-200/50">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-0.5">Gender</p>
                  <p className="font-bold text-slate-900 text-sm capitalize">{pet.gender || '-'}</p>
                </div>
              </div>

              {/* Profile Completion Bar */}
              {(() => {
                const c = computePetCompletion(pet);
                return (
                  <div className={`mb-4 p-3 rounded-xl border ${c.levelBg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${c.levelColor}`}>
                        {c.levelEmoji} Profile {c.level}
                      </span>
                      <span className={`text-xs font-black ${c.levelColor}`}>{c.percentage}%</span>
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.percentage}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          c.percentage === 100 ? "bg-purple-950" :
                          c.percentage >= 80  ? "bg-purple-800" :
                          c.percentage >= 60  ? "bg-purple-700" :
                          c.percentage >= 35  ? "bg-purple-600" : "bg-purple-400"
                        }`}
                      />
                    </div>
                    {c.nextSuggestion && (
                      <p className="text-[9px] text-slate-400 font-medium mt-1.5 flex items-center gap-1">
                        <Zap size={9} /> Add {c.nextSuggestion.label} to unlock +{c.nextSuggestion.weight}pts
                      </p>
                    )}
                  </div>
                );
              })()}
              
              {/* Flipkart x Apple High-Density Care Specifications */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-bold">
                <div className="bg-purple-50 text-purple-900 p-2 rounded-xl border border-purple-200 flex items-center gap-1.5 truncate shadow-2xs">
                  <HeartPulse size={14} className="shrink-0 text-purple-600" />
                  <span className="truncate">Health: Inspected</span>
                </div>
                <div className="bg-purple-50 text-purple-900 p-2 rounded-xl border border-purple-200 flex items-center gap-1.5 truncate shadow-2xs">
                  <span className="shrink-0">🛡️</span>
                  <span className="truncate">Vaccines: Up to Date</span>
                </div>
                <div className="bg-purple-100 text-purple-950 p-2 rounded-xl border border-purple-300 flex items-center gap-1.5 truncate col-span-2 shadow-2xs font-black">
                  <span className="shrink-0">🥗</span>
                  <span className="truncate">Diet: {pet.food_preferences || 'Standard Balanced Diet'}</span>
                </div>
                {pet.allergies && (
                  <div className="bg-purple-50 text-purple-800 p-2 rounded-xl border border-purple-200 flex items-center gap-1.5 truncate col-span-2">
                    <span className="shrink-0">⚠️</span>
                    <span className="truncate">Allergies: {pet.allergies}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-4 border-t border-purple-100 flex gap-3">
                <button 
                  onClick={() => navigate(`/pet/${pet.id}`)}
                  className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-xs font-black hover:bg-purple-700 transition-colors shadow-2xs"
                >
                  View Profile
                </button>
                <button 
                  onClick={() => setEditingPetId(pet.id)}
                  className="px-4 py-2.5 rounded-xl text-xs font-black border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(isAddingPet || editingPetId) && (
          <AddPetModal 
            isOpen={true} 
            onClose={() => {
              setIsAddingPet(false);
              setEditingPetId(null);
            }} 
            petToEdit={editingPet}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
};
