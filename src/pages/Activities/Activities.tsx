import { PageTransition } from "../../components/layout/PageTransition";
import { Activity, Target, Footprints, Flame } from "lucide-react";
import { motion } from "framer-motion";

export const Activities = () => {
  return (
    <PageTransition className="pb-24 max-w-5xl mx-auto space-y-6">
      <div className="bg-[#F5E6CC] rounded-[32px] p-6 shadow-sm border border-[#EBE6DF]">
        <h1 className="text-2xl font-bold text-[#2D2D2D] mb-2 flex items-center gap-2">
          <Activity className="text-primary" /> Activity Tracker
        </h1>
        <p className="text-sm text-[#7A7A7A]">Monitor daily exercise and playtime goals.</p>
      </div>

      {/* Daily Rings Concept */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#F5E6CC] border border-[#EBE6DF] p-5 rounded-[24px] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-success flex items-center justify-center mb-3">
            <Footprints className="text-success" size={24} />
          </div>
          <h4 className="font-bold text-[#2D2D2D]">Steps</h4>
          <p className="text-2xl font-black text-[#2D2D2D]">8,240 <span className="text-xs text-[#7A7A7A] font-normal">/ 10k</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#F5E6CC] border border-[#EBE6DF] p-5 rounded-[24px] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary flex items-center justify-center mb-3">
            <Target className="text-primary" size={24} />
          </div>
          <h4 className="font-bold text-[#2D2D2D]">Playtime</h4>
          <p className="text-2xl font-black text-[#2D2D2D]">45 <span className="text-xs text-[#7A7A7A] font-normal">min</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#F5E6CC] border border-[#EBE6DF] p-5 rounded-[24px] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-warning flex items-center justify-center mb-3">
            <Flame className="text-warning" size={24} />
          </div>
          <h4 className="font-bold text-[#2D2D2D]">Calories</h4>
          <p className="text-2xl font-black text-[#2D2D2D]">320 <span className="text-xs text-[#7A7A7A] font-normal">kcal</span></p>
        </motion.div>
      </div>
      
      {/* Recent Activity Log */}
      <div>
        <h3 className="text-sm font-bold text-[#2D2D2D] mb-3 px-1">Recent Activity Log</h3>
        <div className="bg-[#F5E6CC] rounded-[24px] p-5 shadow-sm border border-[#EBE6DF] space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#EBE6DF]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Footprints size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#2D2D2D] text-sm">Morning Walk</h4>
                <p className="text-[10px] text-[#7A7A7A]">Today • 7:30 AM</p>
              </div>
            </div>
            <span className="font-bold text-[#2D2D2D] text-sm">2.4 km</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 text-accent rounded-full flex items-center justify-center">
                <Target size={18} />
              </div>
              <div>
                <h4 className="font-bold text-[#2D2D2D] text-sm">Fetch at the Park</h4>
                <p className="text-[10px] text-[#7A7A7A]">Yesterday • 5:15 PM</p>
              </div>
            </div>
            <span className="font-bold text-[#2D2D2D] text-sm">30 min</span>
          </div>
        </div>
      </div>

    </PageTransition>
  );
};
