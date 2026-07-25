import { type ReactNode, useState } from "react";
import { AdminSidebar } from "../navigation/AdminSidebar";
import { Menu, Search, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Navigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const [adminSearch, setAdminSearch] = useState("");

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'superadmin')) {
    return <Navigate to="/login/admin" replace />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-900 flex overflow-hidden font-sans">
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* VERIFIED x Amazon Super Admin Command Header in Light Purple Color Only */}
        <header className="min-h-[64px] py-2 bg-purple-50 border-b border-purple-200 flex flex-wrap items-center justify-between px-4 sm:px-6 shrink-0 relative z-30 shadow-sm text-purple-950 gap-y-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-900 hover:bg-purple-200 transition-colors border border-purple-200"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping shrink-0" />
              <div className="min-w-0">
                <h2 className="text-sm font-black text-purple-950 leading-none flex items-center gap-1.5 flex-wrap">
                  <span className="truncate">Super Admin Control Desk</span>
                  <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-2xs shrink-0">
                    PLATFORM OWNER
                  </span>
                </h2>
                <p className="text-[10px] text-purple-700 font-bold mt-0.5 hidden sm:block">
                  All 500+ VERIFIED CARE™ Centers & Live Systems Operational
                </p>
              </div>
            </div>
          </div>

          {/* Universal Admin Quick-Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-6 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600" />
            <input
              type="text"
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Quick search centers, owners, phone numbers, invoice IDs..."
              className="w-full h-9 pl-9 pr-4 bg-white border border-purple-200 rounded-xl text-xs font-medium text-purple-950 placeholder:text-purple-400 focus:outline-none focus:border-purple-600 transition-all shadow-inner"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2 pl-3 border-l border-purple-200">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm border border-purple-400">
                SA
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-black text-purple-950 leading-none">Super Admin</p>
                <p className="text-[9px] font-bold text-purple-700 flex items-center gap-0.5 mt-0.5 uppercase tracking-wider">
                  <ShieldCheck size={10} className="stroke-[3]" /> Root Access
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
