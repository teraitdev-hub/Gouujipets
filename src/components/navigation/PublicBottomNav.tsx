import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Heart, User } from "lucide-react";
import { clsx } from "clsx";
import { useAuthStore } from "../../store/useAuthStore";

const publicNavItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Search", path: "/boarding", icon: Search },
  { name: "Favorites", action: "login", icon: Heart },
  { name: "Profile", action: "login", icon: User },
];

export const PublicBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openLoginModal } = useAuthStore();

  const handleAction = (e: React.MouseEvent, item: any) => {
    if (item.action === "login") {
      e.preventDefault();
      openLoginModal();
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] pb-safe font-sans">
      <div className="bg-white/85 backdrop-blur-2xl border-t border-slate-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-around h-[68px] px-2 relative">
          {publicNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={(e) => handleAction(e, item)}
                className={clsx(
                  "relative flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-all duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <div className={clsx("relative flex flex-col items-center justify-center transition-transform duration-300", isActive ? "-translate-y-1" : "")}>
                  <item.icon size={22} className={clsx(isActive ? "stroke-[2.5]" : "stroke-[1.5]", "transition-all duration-300")} />
                  <span className={clsx("text-[10px] font-bold tracking-wide transition-all duration-300 mt-1", isActive ? "opacity-100" : "opacity-0 h-0")}>
                    {item.name}
                  </span>
                  {isActive && (
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
