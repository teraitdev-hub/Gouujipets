import { type ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "../navigation/Sidebar";
import { BottomNav } from "../navigation/BottomNav";
import { ServiceQuickLinks } from "../navigation/ServiceQuickLinks";
import { PublicNavbar } from "./PublicNavbar";
import { Menu } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const getInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "C";
  };

  const isPublicRoute = 
    location.pathname === "/" ||
    location.pathname.startsWith("/boarding") ||
    location.pathname.startsWith("/grooming") ||
    location.pathname.startsWith("/veterinary") ||
    location.pathname.startsWith("/services") ||
    location.pathname.startsWith("/activities") ||
    location.pathname.startsWith("/facility");

  return (
    <div className="h-[100dvh] w-full max-w-[100vw] bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-slate-900 flex overflow-hidden relative font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-16 md:pb-0">
        {isPublicRoute ? (
          <div className="shrink-0 z-30">
            <PublicNavbar />
          </div>
        ) : (
          <header className="min-h-[64px] py-2 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between px-4 sm:px-6 shrink-0 relative z-30 shadow-sm text-slate-900 gap-y-2">
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate("/profile")}
                  className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm overflow-hidden hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer shrink-0"
                >
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    getInitial()
                  )}
                </button>
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200 ml-1 shrink-0"
                >
                  <Menu size={18} />
                </button>
              </div>
            </div>
          </header>
        )}

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
