import { NavLink, useLocation } from "react-router-dom";
import { Search, HeartPulse, Scissors, Sun, ShieldCheck, ShoppingBag, Home } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/useAuthStore";

const services = [
  { name: "Home", path: "/", icon: Home },
  { name: "Boarding", path: "/boarding", icon: Search },
  { name: "Daycare", path: "/boarding?type=daycare", icon: Sun },
  { name: "Grooming", path: "/grooming", icon: Scissors },
  { name: "Veterinary", path: "/veterinary", icon: HeartPulse },
  { name: "Training", path: "/activities", icon: ShieldCheck },
  { name: "Shop", path: "/shop", icon: ShoppingBag },
];

export const ServiceQuickLinks = () => {
  const location = useLocation();
  const { isAuthenticated, openLoginModal, setIntendedRoute } = useAuthStore();

  return (
    <div className="w-full bg-white border-b border-slate-200 overflow-x-auto scrollbar-hide font-sans">
      <div className="flex items-center gap-2 sm:gap-4 px-4 py-2 sm:py-3 min-w-max max-w-7xl mx-auto">
        {services.map((svc) => {
          // Special active logic for daycare query param
          const isActive = svc.name === "Daycare" 
            ? location.pathname === "/boarding" && location.search.includes("type=daycare")
            : svc.name === "Boarding"
            ? location.pathname === "/boarding" && !location.search.includes("type=daycare")
            : location.pathname === svc.path;

          return (
            <NavLink
              key={svc.name}
              to={svc.path}
              onClick={(e) => {
                if (!isAuthenticated && svc.name !== "Home") {
                  e.preventDefault();
                  setIntendedRoute(svc.path);
                  openLoginModal();
                }
              }}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border transition-all active:scale-95",
                isActive 
                  ? "bg-purple-100 border-purple-300 text-purple-800 font-black shadow-sm" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
              )}
            >
              <svc.icon size={14} className={clsx("shrink-0", isActive && "stroke-[2.5]")} />
              <span className="text-xs sm:text-sm whitespace-nowrap">{svc.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
