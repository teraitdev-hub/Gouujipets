import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Star, PawPrint, Shield, HeartPulse, Camera, MessageSquare, Clock, ChevronRight, Sparkles, X } from "lucide-react";
import { PageTransition } from "../../components/layout/PageTransition";
import { useAuthStore } from "../../store/useAuthStore";
import { useNavigate } from "react-router-dom";

interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  yearlyPrice: number;
  color: string;
  gradient: string;
  border: string;
  textAccent: string;
  badge?: string;
  badgeColor?: string;
  icon: typeof PawPrint;
  features: { text: string; included: boolean }[];
  cta: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Paw Starter",
    tagline: "Perfect to get started",
    price: 0,
    yearlyPrice: 0,
    color: "bg-purple-50",
    gradient: "from-white to-purple-50",
    border: "border-purple-200",
    textAccent: "text-purple-950",
    icon: PawPrint,
    cta: "Get Started Free",
    features: [
      { text: "1 Pet Profile",                       included: true  },
      { text: "Basic Health Tracking",               included: true  },
      { text: "Browse & Book Facilities",            included: true  },
      { text: "Standard Boarding Booking",           included: true  },
      { text: "Photo Gallery (50 photos)",           included: true  },
      { text: "Email Support",                       included: true  },
      { text: "Priority Booking Access",             included: false },
      { text: "Unlimited Pet Profiles",              included: false },
      { text: "Vet Consultation Discounts",          included: false },
      { text: "Dedicated Care Manager",              included: false },
      { text: "Insurance Partner Benefits",          included: false },
    ],
  },
  {
    id: "pro",
    name: "Paw Pro",
    tagline: "Most popular for pet parents",
    price: 399,
    yearlyPrice: 3588,
    color: "bg-purple-600",
    gradient: "from-purple-600 to-purple-700",
    border: "border-purple-400",
    textAccent: "text-purple-100",
    icon: Zap,
    popular: true,
    badge: "Most Popular",
    badgeColor: "bg-white text-purple-900",
    cta: "Start Pro – ₹399/mo",
    features: [
      { text: "Up to 5 Pet Profiles",               included: true  },
      { text: "Advanced Health Tracking",            included: true  },
      { text: "Priority Booking Access",             included: true  },
      { text: "Photo Gallery (500 photos)",          included: true  },
      { text: "10% Discount on All Services",        included: true  },
      { text: "Vet Consultation Discounts (15%)",    included: true  },
      { text: "24/7 Chat Support",                   included: true  },
      { text: "Dedicated Care Manager",              included: false },
      { text: "Insurance Partner Benefits",          included: false },
      { text: "Unlimited Pet Profiles",              included: false },
      { text: "Premium Partner Lounges",             included: false },
    ],
  },
  {
    id: "elite",
    name: "Paw Elite",
    tagline: "For the ultimate pet parent",
    price: 999,
    yearlyPrice: 8988,
    color: "bg-purple-950",
    gradient: "from-purple-900 to-purple-950",
    border: "border-purple-500",
    textAccent: "text-purple-100",
    icon: Crown,
    badge: "Best Value",
    badgeColor: "bg-purple-200 text-purple-950",
    cta: "Go Elite – ₹999/mo",
    features: [
      { text: "Unlimited Pet Profiles",              included: true  },
      { text: "Advanced Health Tracking",            included: true  },
      { text: "Priority Booking Access",             included: true  },
      { text: "Unlimited Photo Gallery",             included: true  },
      { text: "20% Discount on All Services",        included: true  },
      { text: "Vet Consultation Discounts (25%)",    included: true  },
      { text: "Dedicated Personal Care Manager",     included: true  },
      { text: "Insurance Partner Benefits",          included: true  },
      { text: "Premium Partner Lounges Access",      included: true  },
      { text: "Emergency 24/7 Vet Hotline",          included: true  },
      { text: "Annual Health Checkup Package",       included: true  },
    ],
  },
];

const FEATURES_COMPARE = [
  { name: "Pet Profiles",        free: "1",       pro: "5",      elite: "Unlimited" },
  { name: "Photo Gallery",       free: "50",      pro: "500",    elite: "Unlimited" },
  { name: "Service Discount",    free: "—",       pro: "10%",    elite: "20%" },
  { name: "Vet Discount",        free: "—",       pro: "15%",    elite: "25%" },
  { name: "Priority Booking",    free: "✗",       pro: "✓",      elite: "✓"  },
  { name: "Care Manager",        free: "✗",       pro: "✗",      elite: "✓"  },
  { name: "Insurance Benefits",  free: "✗",       pro: "✗",      elite: "✓"  },
  { name: "Support",             free: "Email",   pro: "24/7",   elite: "24/7 + Hotline" },
];

const iconMap: Record<string, typeof PawPrint> = {
  pet: PawPrint, health: HeartPulse, cam: Camera, msg: MessageSquare, time: Clock, shield: Shield, star: Star,
};

export const Membership = () => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleSelect = (planId: string) => {
    if (planId === "free") {
      navigate("/dashboard");
      return;
    }
    setSelectedPlan(planId);
    // In production: integrate Razorpay / Stripe here
    alert(`🚀 ${planId.toUpperCase()} plan selected!\n\nThis would open payment gateway in production.`);
  };

  const yearDiscount = 2; // 2 months free on yearly

  return (
    <PageTransition className="pb-24">
      {/* ── HERO ────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-purple-950 px-4 pt-12 pb-16 text-center border-b border-purple-800">
        {/* Background orbs */}
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 bg-purple-900 border border-purple-700 text-purple-200 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <Sparkles size={12} className="text-purple-400" /> GouujiPets Premium Subscription Plans
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-3">
            Give Your Pet the<br />
            <span className="text-purple-300">Best Life & Verified Care</span>
          </h1>
          <p className="text-purple-200 font-medium text-sm sm:text-base max-w-lg mx-auto mb-8">
            Unlock priority bookings, vet discounts and a dedicated care manager — all in one transparent plan.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-purple-900 border border-purple-700 rounded-2xl p-1 gap-1 shadow-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all ${
                billing === "monthly" ? "bg-white text-purple-950 shadow-md" : "text-purple-200 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-1.5 ${
                billing === "yearly" ? "bg-white text-purple-950 shadow-md" : "text-purple-200 hover:text-white"
              }`}
            >
              Yearly
              <span className="text-[9px] font-black bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
                2 MONTHS FREE
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── PLAN CARDS ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PLANS.map((plan, i) => {
            const displayPrice = billing === "yearly"
              ? Math.round(plan.yearlyPrice / 12)
              : plan.price;
            const isPopular = plan.popular;
            const isDark = plan.id !== "free";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl overflow-hidden border ${plan.border} ${
                  isPopular ? "ring-2 ring-violet-500 ring-offset-2" : ""
                } shadow-lg`}
              >
                {/* Plan background */}
                <div className={`p-5 sm:p-6 bg-gradient-to-br ${plan.gradient} ${isDark ? "text-white" : "text-slate-900"}`}>
                  {/* Popular badge */}
                  {plan.badge && (
                    <div className={`absolute top-4 right-4 text-[10px] font-black px-2.5 py-1 rounded-full ${plan.badgeColor}`}>
                      {plan.badge}
                    </div>
                  )}

                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${isDark ? "bg-white/20" : "bg-purple-600 text-white"}`}>
                    <plan.icon size={20} className={isDark ? "text-white" : "text-white"} />
                  </div>

                  <h2 className="text-xl font-black mb-0.5">{plan.name}</h2>
                  <p className={`text-xs font-medium mb-4 ${isDark ? "text-white/70" : "text-slate-500"}`}>
                    {plan.tagline}
                  </p>

                  <div className="flex items-baseline gap-1 mb-5">
                    {displayPrice === 0 ? (
                      <span className="text-4xl font-black">Free</span>
                    ) : (
                      <>
                        <span className="text-sm font-bold">₹</span>
                        <span className="text-4xl font-black">{displayPrice}</span>
                        <span className={`text-xs font-medium ${isDark ? "text-white/60" : "text-slate-400"}`}>/mo</span>
                      </>
                    )}
                  </div>

                  {billing === "yearly" && plan.price > 0 && (
                    <p className={`text-[11px] font-bold mb-4 ${isDark ? "text-purple-200" : "text-purple-700"}`}>
                      ₹{plan.yearlyPrice}/yr — Save ₹{plan.price * 2 * 12 / 12 * 2} vs monthly
                    </p>
                  )}

                  <button
                    onClick={() => handleSelect(plan.id)}
                    className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 ${
                      isDark
                        ? "bg-white text-purple-950 hover:bg-purple-100"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {plan.cta}
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Feature list */}
                <div className="bg-white p-5 sm:p-6 space-y-2.5">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className={`flex items-start gap-2.5 text-xs font-medium ${f.included ? "text-slate-700" : "text-slate-300"}`}>
                      {f.included ? (
                        <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Check size={10} className="text-purple-600 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          <X size={9} className="text-slate-300 stroke-[3]" />
                        </div>
                      )}
                      {f.text}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── WHY UPGRADE ─────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 mt-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Why Upgrade?</h2>
          <p className="text-slate-500 text-sm mt-2">Everything your pet deserves, in one place</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: "Priority Care", desc: "Skip the queue on bookings", color: "bg-purple-100 text-purple-700" },
            { icon: HeartPulse, title: "Vet Discounts", desc: "Save on consultations", color: "bg-purple-100 text-purple-700" },
            { icon: Star, title: "Exclusive Perks", desc: "Premium partner access", color: "bg-purple-100 text-purple-700" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-purple-200 rounded-2xl p-4 text-center shadow-2xs hover:shadow-md transition-all"
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-3 ${item.color}`}>
                <item.icon size={20} />
              </div>
              <h3 className="font-black text-purple-950 text-xs mb-1">{item.title}</h3>
              <p className="text-[10px] text-purple-700 font-medium">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── COMPARISON TABLE (desktop) ───────────────────── */}
      <div className="max-w-4xl mx-auto px-4 mt-14 hidden sm:block">
        <h2 className="text-2xl font-black text-purple-950 text-center mb-6">Full Plan Comparison</h2>
        <div className="bg-white rounded-3xl border border-purple-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-4 text-center border-b border-purple-200 bg-purple-50">
            <div className="p-4 text-left text-sm font-black text-purple-900 uppercase tracking-wider">Feature</div>
            {PLANS.map(p => (
              <div key={p.id} className={`p-4 text-sm font-black ${p.popular ? "bg-purple-600 text-white" : "text-purple-950"}`}>
                {p.name}
              </div>
            ))}
          </div>
          {/* Rows */}
          {FEATURES_COMPARE.map((row, i) => (
            <div key={i} className={`grid grid-cols-4 text-center text-xs font-medium border-b border-purple-100 ${i % 2 === 0 ? "bg-purple-50/30" : "bg-white"}`}>
              <div className="p-3.5 text-left text-purple-950 font-bold">{row.name}</div>
              <div className="p-3.5 text-purple-700">{row.free}</div>
              <div className="p-3.5 text-purple-800 font-black bg-purple-100/50">{row.pro}</div>
              <div className="p-3.5 text-purple-900 font-black">{row.elite}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 mt-14">
        <h2 className="text-xl font-black text-slate-900 text-center mb-6">Loved by Pet Parents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "Priya S.", pet: "Shih Tzu owner", stars: 5, text: "The priority booking feature gives me so much peace of mind when Mochi needs urgent boarding. Worth every rupee!" },
            { name: "Arjun K.", pet: "Labrador owner", stars: 5, text: "The vet discounts alone paid for my Pro subscription. My vet bills dropped by 15% immediately." },
            { name: "Meena R.", pet: "Persian Cat owner", stars: 5, text: "My dedicated care manager remembered my cat's allergy! This feels premium, like Netflix for pets." },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm"
            >
              <div className="flex mb-3">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} size={13} className="text-purple-400 fill-purple-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="text-xs font-black text-slate-900">{t.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{t.pet}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 mt-14">
        <h2 className="text-xl font-black text-slate-900 text-center mb-6">Frequently Asked</h2>
        <div className="space-y-3">
          {[
            { q: "Can I cancel anytime?", a: "Yes! Cancel your subscription at any time with no questions asked. You'll retain access until the end of your billing period." },
            { q: "How does the Vet discount work?", a: "Present your GouujiPets membership QR on the app to our partner vet clinics for instant discount on consultation and medicines." },
            { q: "Is billing in INR?", a: "Yes, all prices are in Indian Rupees (₹) and billed through our Razorpay payment gateway." },
            { q: "Can I upgrade/downgrade my plan?", a: "Absolutely. You can switch plans at any time. Upgrades are prorated and downgrades take effect from the next billing cycle." },
          ].map((faq, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-1.5">{faq.q}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── STICKY CTA (mobile) ──────────────────────────── */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 z-40 px-4 pb-2">
        <button
          onClick={() => handleSelect("pro")}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Zap size={16} /> Try Paw Pro — ₹399/mo
        </button>
      </div>
    </PageTransition>
  );
};

