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
  const { isAuthenticated, openLoginModal } = useAuthStore();

  const handleAction = (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    if (item.action === "login") {
      if (isAuthenticated) {
        navigate(item.name === "Profile" ? "/profile" : "/pets");
      } else {
        openLoginModal();
      }
    } else {
      navigate(item.path);
    }
  };

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden">
        <div className="flex items-center justify-around h-[68px] px-2 relative">
          {publicNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={(e) => handleAction(e, item)}
                className={clsx(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 relative z-10",
                  isActive ? "text-brand-600 scale-105" : "text-slate-400 hover:text-brand-500"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-brand-50/50 rounded-[24px] -z-10" />
                )}
                <item.icon size={24} className={clsx(isActive && "fill-brand-100", "transition-all")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={clsx("text-[10px] font-bold tracking-wide transition-all", isActive ? "opacity-100" : "opacity-0 h-0")}>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
