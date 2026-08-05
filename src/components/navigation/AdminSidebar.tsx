import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Store, Receipt, Settings,
  FileText, X, LogOut, ShieldCheck, Search, Crown, Activity, Sparkles
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/useAuthStore";

const adminNavItems = [
  { name: "Platform Dashboard", path: "/admin/dashboard",  icon: LayoutDashboard },
  { name: "AI Insights",        path: "/admin/ai-insights",icon: Sparkles        },
  { name: "All Centers Directory", path: "/admin/businesses", icon: Store           },
  { name: "Users & Pet Parents",   path: "/admin/users",      icon: Users           },
  { name: "Financial Invoices",    path: "/admin/finance",    icon: Receipt         },
  { name: "Directory CMS",         path: "/admin/cms",        icon: FileText        },
  { name: "System Settings",       path: "/admin/settings",   icon: Settings        },
];

export const AdminSidebar = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}) => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    window.location.href = "/";
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-purple-950/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <div
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out",
          "bg-white text-slate-800 border-r border-purple-200 shadow-2xl font-sans",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 justify-between border-b border-purple-200 shrink-0 bg-purple-50/80">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-2 group text-left"
          >
            <img src="/logo.png" alt="Gouuji Admin" className="h-10 w-10 object-cover rounded-full animate-[spin_8s_linear_infinite] drop-shadow-sm border border-slate-800" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* System Quick Status */}
        <div className="px-4 py-3.5 border-b border-purple-200 shrink-0 bg-purple-50/40">
          <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-purple-600 animate-pulse" />
              <div>
                <p className="text-[10px] font-black text-slate-900 leading-none">Root Controller</p>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5">Live Database Connected</p>
              </div>
            </div>
            <span className="bg-purple-100 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-purple-200 uppercase">
              ONLINE
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
          <div className="px-2 pb-1 text-[10px] font-black text-purple-600 uppercase tracking-widest">
            SUPER ADMIN DESK
          </div>
          {adminNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/admin/dashboard"}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 font-bold text-xs group",
                  isActive
                    ? "bg-purple-600 text-white shadow-sm font-black"
                    : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={16}
                    className={clsx(
                      "transition-transform group-hover:scale-110 shrink-0",
                      isActive ? "stroke-[2.5]" : "stroke-[1.75] text-purple-400 group-hover:text-purple-600"
                    )}
                  />
                  <span className="truncate flex-1">{item.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-purple-200 bg-purple-50/60 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-50 text-purple-700 hover:text-purple-600 text-xs font-bold transition-all border border-purple-200 hover:border-purple-300"
          >
            <LogOut size={14} />
            <span>Sign Out Control Desk</span>
          </button>
        </div>
      </div>
    </>
  );
};

