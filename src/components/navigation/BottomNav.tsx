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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-purple-200 pb-safe z-50 shadow-2xl font-sans">
      <div className="flex items-center justify-around h-16 px-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center justify-center w-full min-w-0 h-full space-y-0.5 transition-all py-1",
                isActive 
                  ? "text-purple-700 font-black scale-105" 
                  : "text-slate-400 hover:text-purple-600 font-medium"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={19} className={clsx("shrink-0", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
                <span className="text-[10px] leading-tight truncate px-0.5 w-full text-center">{item.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-0.5" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};
