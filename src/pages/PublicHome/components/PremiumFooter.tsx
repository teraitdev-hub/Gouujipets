import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const PremiumFooter = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus("loading");
    try {
      await addDoc(collection(db, "newsletter_subscribers"), {
        email,
        subscribedAt: serverTimestamp(),
      });
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      console.error("Newsletter error:", error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-300 py-16 border-t border-slate-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <span className="text-3xl">🐾</span>
              <span className="text-2xl font-black text-white tracking-tight">GouujiPets</span>
            </Link>
            <p className="text-sm text-slate-400 font-medium mb-8 max-w-sm leading-relaxed">
              India's most trusted premium pet care network. We connect loving pet parents with verified, professional caregivers, groomers, and veterinarians.
            </p>
            <div className="flex gap-4">
              <span className="text-xs font-bold text-slate-500 uppercase">Connect with us on Social Media</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-wider text-xs">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li><Link to="/about" className="hover:text-purple-400 transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-purple-400 transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="hover:text-purple-400 transition-colors">Pet Care Blog</Link></li>
              <li><Link to="/contact" className="hover:text-purple-400 transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-wider text-xs">Legal</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-400">
              <li><Link to="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund" className="hover:text-purple-400 transition-colors">Refund Policy</Link></li>
              <li><Link to="/trust" className="hover:text-purple-400 transition-colors">Trust & Safety</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-wider text-xs">Newsletter</h4>
            <p className="text-sm text-slate-400 font-medium mb-4">
              Get weekly pet care tips and exclusive offers directly in your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email" 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all pr-12"
                required
                disabled={status === "loading"}
              />
              <button 
                type="submit" 
                disabled={status === "loading"}
                className="absolute right-2 top-2 bottom-2 w-9 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {status === "loading" ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
              </button>
            </form>
            {status === "success" && <p className="text-emerald-400 text-xs mt-2 font-bold">Successfully subscribed!</p>}
            {status === "error" && <p className="text-red-400 text-xs mt-2 font-bold">Failed to subscribe. Try again.</p>}
          </div>

        </div>

        <div className="border-t border-slate-800/50 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium">
            © {new Date().getFullYear()} GouujiPets. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
};
