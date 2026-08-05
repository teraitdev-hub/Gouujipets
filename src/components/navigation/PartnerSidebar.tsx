import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Calendar, CalendarDays, LogIn, LogOut,
  PawPrint, Package, Users, DollarSign, Archive,
  FileText, Settings, X, Search, ShieldCheck, Phone
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/useAuthStore";

const partnerGroups = [
  {
    title: "Operations Desk",
    items: [
      { name: "Live Command Hub",  path: "/partner/dashboard",         icon: LayoutDashboard },
      { name: "All Stay Reservations", path: "/partner/bookings",      icon: Calendar         },
      { name: "Check-in Queue",    path: "/partner/check-in",          icon: LogIn, badge: "Live" },
      { name: "Check-out Queue",   path: "/partner/check-out",         icon: LogOut           },
      { name: "Active Guests in Care", path: "/partner/current-pets",  icon: PawPrint         },
    ],
  },
  {
    title: "Directory & Catalog",
    items: [
      { name: "Services & Rates",  path: "/partner/services",          icon: Package  },
      { name: "Client Directory",  path: "/partner/customers",         icon: Users    },
      { name: "Facility Inventory", path: "/partner/inventory",        icon: Archive  },
    ],
  },
  {
    title: "Financials & Reports",
    items: [
      { name: "Revenue Dashboard", path: "/partner/revenue",           icon: DollarSign },
      { name: "Expense Tracker",   path: "/partner/expenses",          icon: Archive    },
      { name: "Business Analytics", path: "/partner/reports",          icon: FileText   },
    ],
  },
  {
    title: "Listing Settings",
    items: [
      { name: "Center Profile & Photos", path: "/partner/settings",    icon: Settings   },
    ],
  },
];

export const PartnerSidebar = ({
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
            onClick={() => navigate("/partner/dashboard")}
            className="flex items-center gap-2 group text-left"
          >
            <img src="/logo.png" alt="Gouuji Partner" className="h-10 w-10 object-cover rounded-full drop-shadow-sm border border-slate-800" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Verified Partner Badge Strip */}
        <div className="px-4 py-3 border-b border-purple-200 shrink-0 bg-purple-50/40">
          <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-purple-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-purple-600" />
              <div>
                <p className="text-[10px] font-black text-slate-900 leading-none">Verified Listing</p>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5">100% Upfront Pricing</p>
              </div>
            </div>
            <span className="bg-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase shadow-2xs">
              PRO
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 custom-scrollbar">
          {partnerGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-2 pb-1 text-[9px] font-black text-purple-600 uppercase tracking-widest">
                {group.title}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 font-bold text-xs group",
                      isActive
                        ? "bg-purple-600 text-white shadow-sm font-black"
                        : "text-slate-600 hover:bg-purple-50 hover:text-purple-700"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 truncate">
                        <item.icon
                          size={16}
                          className={clsx(
                            "transition-transform group-hover:scale-110 shrink-0",
                            isActive ? "stroke-[2.5]" : "stroke-[1.75] text-purple-400 group-hover:text-purple-600"
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={clsx(
                            "text-[9px] font-black px-1.5 py-0.2 rounded-full",
                            isActive
                              ? "bg-white text-purple-900"
                              : "bg-purple-100 text-purple-700 border border-purple-200"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-purple-200 bg-purple-50/60 shrink-0 space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-100/80 hover:bg-purple-200 text-purple-900 text-xs font-bold transition-all border border-purple-200/60"
          >
            <Search size={14} />
            <span>View Directory Listing</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-600 text-xs font-bold transition-all border border-purple-200 hover:border-purple-300"
          >
            <X size={14} />
            <span>Sign Out Desk</span>
          </button>
        </div>
      </div>
    </>
  );
};

