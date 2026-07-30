import { NavLink } from "react-router-dom";
import { Search, Home, MapPin, ShieldCheck, User } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/useAuthStore";

export const BottomNav = () => {
  const { user } = useAuthStore();

  const bottomNavItems = user?.role === 'partner' ? [
    { name: "Directory", path: "/", icon: Search },
    { name: "Desk Hub", path: "/partner/dashboard", icon: Home },
    { name: "Reservations", path: "/partner/bookings", icon: MapPin },
    { name: "Services", path: "/partner/services", icon: ShieldCheck },
    { name: "Settings", path: "/partner/settings", icon: User },
  ] : user?.role === 'admin' || user?.role === 'superadmin' ? [
    { name: "Directory", path: "/", icon: Search },
    { name: "Admin Hub", path: "/admin/dashboard", icon: Home },
    { name: "Users", path: "/admin/users", icon: MapPin },
    { name: "Shops", path: "/admin/businesses", icon: ShieldCheck },
  ] : [
    { name: "Directory", path: "/", icon: Search },
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "All Centers", path: "/boarding", icon: MapPin },
    { name: "Services", path: "/services", icon: ShieldCheck },
    { name: "Account", path: "/profile", icon: User },
  ];
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pb-safe font-sans">
      <div className="bg-white/85 backdrop-blur-2xl border-t border-slate-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around h-[68px] px-2 relative">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "relative flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-all duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-slate-400 hover:text-slate-600"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={clsx("relative flex flex-col items-center justify-center transition-transform duration-300", isActive ? "-translate-y-1" : "")}>
                    <item.icon size={22} className={clsx(isActive ? "stroke-[2.5]" : "stroke-[1.5]", "transition-all duration-300")} />
                    <span className={clsx("text-[10px] font-bold tracking-wide transition-all duration-300 mt-1", isActive ? "opacity-100" : "opacity-0 h-0")}>
                      {item.name}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};
