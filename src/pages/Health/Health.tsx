import { PageTransition } from "../../components/layout/PageTransition";
import { Activity, HeartPulse, Weight, Droplets, ChevronRight, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import { usePet } from "../../context/PetContext";
import { useNavigate } from "react-router-dom";

export const Health = () => {
  const { activePet } = usePet();
  const navigate = useNavigate();

  if (!activePet) {
    return (
      <PageTransition className="pb-24 max-w-5xl mx-auto text-center py-12">
        <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-8 border border-white/80 max-w-md mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            🩺
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">No Active Pet Profile Selected</h2>
          <p className="text-xs text-slate-500 mb-5">Please add or select a pet profile from your dashboard first to view health charts and logs.</p>
        </div>
      </PageTransition>
    );
  }

  // Parse medical history lines
  const historyEntries = activePet.medical_history
    ? activePet.medical_history.split("\n").filter(line => line.trim().length > 0)
    : [];

  return (
    <PageTransition className="pb-24 max-w-5xl mx-auto space-y-6">
      
      <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-5 border border-white/80 flex items-center justify-between shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            🩺 Health Tracker — {activePet.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Real-time vitals and parsed clinical logs from Firestore.</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
        >
          <Edit3 size={13} /> Update Vitals
        </button>
      </div>

      {/* Vitals Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/70 backdrop-blur-xl border border-white/80 p-4 rounded-[20px] shadow-2xs hover:-translate-y-1 hover:shadow-md transition-all flex flex-col gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center"><Weight size={16} /></div>
          <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Weight</span>
          <span className="text-slate-900 font-bold text-lg">
            {activePet.weight ? `${activePet.weight} kg` : 'Not specified'}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/70 backdrop-blur-xl border border-white/80 p-4 rounded-[20px] shadow-2xs hover:-translate-y-1 hover:shadow-md transition-all flex flex-col gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center"><Activity size={16} /></div>
          <span className="text-slate-555 text-[10px] uppercase font-bold tracking-wider">Status Update</span>
          <span className="text-slate-900 font-bold text-sm truncate">{activePet.live_status_update || 'Stable / Healthy'}</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }} className="bg-white/70 backdrop-blur-xl border border-white/80 p-4 rounded-[20px] shadow-2xs hover:-translate-y-1 hover:shadow-md transition-all flex flex-col gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center"><Droplets size={16} /></div>
          <span className="text-slate-555 text-[10px] uppercase font-bold tracking-wider">Allergies</span>
          <span className="text-slate-900 font-bold text-sm truncate">{activePet.allergies || 'None reported'}</span>
        </motion.div>
      </div>

      {/* Past Medical History */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3 px-1">Medical History Logs</h2>
        <div className="bg-white/70 backdrop-blur-xl rounded-[24px] p-5 shadow-2xs border border-white/80 space-y-4 hover:shadow-xs transition-all">
          {historyEntries.length > 0 ? (
            <div className="divide-y divide-purple-100">
              {historyEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 cursor-pointer group hover:px-1 transition-all">
                  <div>
                    <h4 className="font-bold text-slate-950 text-sm group-hover:text-purple-600 transition-colors">
                      {entry.startsWith('- ') || entry.startsWith('* ') ? entry.substring(2) : entry}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Clinical updates logged via partner desk / owner panel</p>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 font-bold text-sm">
              📋 No ongoing medical conditions or clinical notes recorded in Firestore.
            </div>
          )}
        </div>
      </div>
      
    </PageTransition>
  );
};
