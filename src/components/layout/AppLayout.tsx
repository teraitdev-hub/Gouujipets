import { type ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../navigation/Sidebar";
import { BottomNav } from "../navigation/BottomNav";
import { ServiceQuickLinks } from "../navigation/ServiceQuickLinks";
import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-900 flex overflow-hidden relative font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-16 md:pb-0">
        <header className="min-h-[64px] py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between px-4 sm:px-6 shrink-0 relative z-30 shadow-sm text-slate-900 gap-y-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
            >
              <Menu size={18} />
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                My Dashboard
              </h2>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5 hidden sm:block">
                Manage your pet's bookings and records
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                C
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent relative">
          <ServiceQuickLinks />
          <div className={`relative z-10 ${
            location.pathname.startsWith("/boarding") ||
            location.pathname.startsWith("/facility") ||
            location.pathname === "/"
              ? "p-0"
              : "p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full"
          }`}>
            {children}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
