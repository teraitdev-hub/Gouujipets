import { type ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "../navigation/Sidebar";
import { BottomNav } from "../navigation/BottomNav";
import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useAuthStore } from "../../store/useAuthStore";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuthStore();

  return (
    <div className="h-[100dvh] bg-[#f5f3ff] text-slate-900 flex overflow-hidden relative font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-16 md:pb-0">
        <header className="min-h-[72px] py-3 bg-white/80 backdrop-blur-2xl border-b border-purple-100/60 flex flex-wrap items-center justify-between px-4 sm:px-8 shrink-0 relative z-30 shadow-[0_4px_20px_rgba(124,58,237,0.04)] text-slate-900 gap-y-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center text-purple-600 hover:from-purple-100 hover:to-indigo-100 transition-all border border-purple-200/60 shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-none tracking-tight">
                My Dashboard
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1 hidden sm:block">
                Manage your pet's bookings and records
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-3 pl-4 border-l border-purple-100/60">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-purple-600/25 ring-2 ring-purple-200">
                {user?.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
            </div>
          </div>
        </header>

        <main
          className={`flex-1 overflow-y-auto bg-transparent relative ${
            location.pathname.startsWith("/boarding") ||
            location.pathname.startsWith("/facility") ||
            location.pathname === "/"
              ? "p-0"
              : "p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full"
          }`}
        >
          <div className="relative z-10">{children}</div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
