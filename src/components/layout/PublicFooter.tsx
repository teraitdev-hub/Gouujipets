import { MapPin, Phone, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export const PublicFooter = () => {
  return (
    <footer className="bg-gradient-to-b from-slate-950 via-[#0c0a1d] to-[#0a0818] text-slate-300 font-sans pt-20 pb-10 border-t border-purple-500/20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 text-left group inline-block">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-purple-600/30">
                G
              </div>
              <div className="leading-none">
                <span className="text-base font-black text-white tracking-tight block">
                  Gouuji<span className="text-purple-500">Pets</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                  Verified Care
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              India's first completely verified network for premium pet boarding, grooming, and 24/7 emergency veterinary care.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs font-bold text-slate-500">
              <span className="hover:text-purple-400 cursor-pointer transition-colors">Facebook</span>
              <span>•</span>
              <span className="hover:text-purple-400 cursor-pointer transition-colors">Instagram</span>
              <span>•</span>
              <span className="hover:text-purple-400 cursor-pointer transition-colors">Twitter (X)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-4">Explore</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link to="/boarding" className="hover:text-purple-400 transition-colors">Pet Boarding</Link></li>
              <li><Link to="/grooming" className="hover:text-purple-400 transition-colors">Grooming Spas</Link></li>
              <li><Link to="/veterinary" className="hover:text-purple-400 transition-colors">24/7 Veterinary</Link></li>
              <li><Link to="/activities" className="hover:text-purple-400 transition-colors">Pet Activities & Pool</Link></li>
            </ul>
          </div>

          {/* Business & Support */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><Link to="/about" className="hover:text-purple-400 transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-purple-400 transition-colors">Contact Support</Link></li>
              <li><Link to="/partner/login" className="hover:text-purple-400 transition-colors">Partner With Us</Link></li>
              <li><Link to="/membership" className="hover:text-purple-400 transition-colors">VIP Membership</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-4">Contact</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-purple-500 shrink-0 mt-0.5" />
                <span>123 Pet Avenue, Koramangala, Bangalore, KA 560034</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-purple-500 shrink-0" />
                <a href="tel:18007383674" className="hover:text-purple-400 transition-colors">1800-PET-EMRG</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-purple-500 shrink-0" />
                <a href="mailto:support@gouujipets.com" className="hover:text-purple-400 transition-colors">support@gouujipets.com</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-purple-500" />
            <span>Gouuji Assured™ Verified Network</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Gouuji Pets. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link to="/refund-policy" className="hover:text-purple-400 transition-colors">Refund & Cancellation Policy</Link>
            <Link to="/privacy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-purple-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
