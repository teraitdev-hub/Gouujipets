import { AuthLayout } from "../../components/auth/AuthLayout";
import { Building2, KeyRound, ArrowRight } from "lucide-react";

export const BoardingLogin = () => {
  return (
    <AuthLayout 
      title="Staff Portal" 
      subtitle="Access boarding facility management dashboard."
      imageUrl="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=1000"
    >
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Facility ID</label>
          <div className="relative group">
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="FAC-1002" 
              className="w-full h-12 bg-white border border-[#EBE6DF] rounded-[16px] pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Staff PIN</label>
          <div className="relative group">
            <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7A7A] group-focus-within:text-accent transition-colors" />
            <input 
              type="password" 
              placeholder="••••" 
              maxLength={4}
              className="w-full h-12 bg-white border border-[#EBE6DF] rounded-[16px] pl-11 pr-4 text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all shadow-sm"
            />
          </div>
        </div>

        <button className="w-full h-12 bg-[#2D2D2D] text-white font-bold rounded-[16px] shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2 mt-4">
          Access Facility <ArrowRight size={18} />
        </button>

      </form>
    </AuthLayout>
  );
};
