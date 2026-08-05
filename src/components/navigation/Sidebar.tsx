import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  PawPrint,
  Home,
  Scissors,
  Stethoscope,
  Syringe,
  Image as ImageIcon,
  Phone,
  User,
  X,
  LogOut,
  Crown,
  ShieldCheck,
  Search,
  Settings,
  Users,
  Archive,
  Building2,
  Calendar,
  MessageSquare
} from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/useAuthStore";

export const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const navItems = user?.role === 'partner' ? [
    { name: "Directory Home",       path: "/",                  icon: Search          },
    { name: "Partner Desk Hub",     path: "/partner/dashboard", icon: LayoutDashboard },
    { name: "Stay Reservations",    path: "/partner/bookings",  icon: Calendar         },
    { name: "Services Offered",     path: "/partner/services",  icon: ShieldCheck      },
    { name: "Center Profile",       path: "/partner/settings",  icon: Settings        },
    { name: "Client Directory",     path: "/partner/customers", icon: Users           },
    { name: "Facility Inventory",   path: "/partner/inventory", icon: Archive         },
    { name: "Support Desk",         path: "/partner/support",   icon: MessageSquare   },
  ] : user?.role === 'admin' || user?.role === 'superadmin' ? [
    { name: "Directory Home",    path: "/",                 icon: Search          },
    { name: "Admin Panel Hub",   path: "/admin/dashboard",  icon: LayoutDashboard },
    { name: "Manage Users",      path: "/admin/users",      icon: Users           },
    { name: "Manage Shops",      path: "/admin/businesses", icon: Building2       },
    { name: "Support Inbox",     path: "/admin/helpdesk",   icon: MessageSquare   },
  ] : [
    { name: "Directory Home",    path: "/",             icon: Search          },
    { name: "My Dashboard",      path: "/dashboard",    icon: LayoutDashboard },
    { name: "All Centers",       path: "/boarding",     icon: Crown           },
    { name: "My Pets",           path: "/pets",          icon: PawPrint        },
    { name: "Services & Spas",   path: "/services",      icon: Scissors        },
    { name: "Vaccine Passport",  path: "/vaccinations",  icon: Syringe         },
    { name: "Pet Gallery",       path: "/gallery",       icon: ImageIcon       },
    { name: "Customer Care",     path: "/support",       icon: MessageSquare   },
    { name: "Account Settings",  path: "/profile",       icon: User            },
    { name: "Emergency Line",    path: "/contact",       icon: Phone           },
  ];

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    window.location.href = "/";
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Clean White Theme */}
      <div
        className={clsx(
          "fixed md:static inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-in-out font-sans",
          "bg-white text-slate-800 border-r border-slate-200 shadow-xl md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo + close */}
        <div className="h-20 flex items-center px-6 justify-between shrink-0 border-b border-slate-100">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group text-left"
          >
            <img src="/logo.png" alt="Gouuji Pets" className="h-10 w-10 object-cover rounded-full animate-[spin_8s_linear_infinite] drop-shadow-sm border border-slate-800" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Greeting */}
        <div className="px-6 py-5 border-b border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-lg shadow-sm overflow-hidden shrink-0">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={user.name || "User"} className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.name || user?.full_name || "P").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-purple-600 flex items-center gap-1 uppercase tracking-widest">
                <ShieldCheck size={12} className="stroke-[3]" /> Assured
              </p>
              <p className="text-sm font-black text-slate-900 truncate max-w-[150px] mt-0.5">
                {user?.name || user?.full_name || "Pet Parent"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm group",
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={clsx(
                      "transition-transform group-hover:scale-110 shrink-0",
                      isActive ? "stroke-[2.5] text-purple-600" : "stroke-[2] text-slate-400 group-hover:text-slate-600"
                    )}
                  />
                  <span className="truncate flex-1">{item.name}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-red-600 text-sm font-bold transition-all border border-slate-200 hover:border-red-200"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

