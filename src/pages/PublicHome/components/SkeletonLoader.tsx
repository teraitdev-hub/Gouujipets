import { motion } from "framer-motion";

interface SkeletonProps {
  type: "card" | "hero" | "text" | "stats" | "review";
  count?: number;
}

export const SkeletonLoader = ({ type, count = 1 }: SkeletonProps) => {
  const elements = Array.from({ length: count });

  if (type === "hero") {
    return (
      <div className="w-full h-[600px] bg-slate-200/50 animate-pulse rounded-[40px] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-300 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {elements.map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="h-48 bg-slate-200/70 animate-pulse"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 animate-pulse rounded w-1/2"></div>
              <div className="pt-2 flex gap-2">
                <div className="h-6 bg-slate-200 animate-pulse rounded flex-1"></div>
                <div className="h-6 bg-slate-200 animate-pulse rounded flex-1"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "stats") {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {elements.map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center h-32">
             <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse mb-3"></div>
             <div className="h-6 bg-slate-200 animate-pulse rounded w-1/2 mb-2"></div>
             <div className="h-3 bg-slate-200 animate-pulse rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "review") {
     return (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
         {elements.map((_, i) => (
           <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse"></div>
               <div>
                 <div className="h-4 bg-slate-200 animate-pulse rounded w-24 mb-2"></div>
                 <div className="h-3 bg-slate-200 animate-pulse rounded w-16"></div>
               </div>
             </div>
             <div className="space-y-2">
               <div className="h-3 bg-slate-200 animate-pulse rounded w-full"></div>
               <div className="h-3 bg-slate-200 animate-pulse rounded w-full"></div>
               <div className="h-3 bg-slate-200 animate-pulse rounded w-2/3"></div>
             </div>
           </div>
         ))}
       </div>
     );
  }

  return (
    <div className="space-y-3 w-full">
      {elements.map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 animate-pulse rounded w-full"></div>
      ))}
    </div>
  );
};
