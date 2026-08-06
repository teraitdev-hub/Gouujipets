import { PageTransition } from "../../components/layout/PageTransition";
import { Phone, Mail, MapPin, Send, HelpCircle } from "lucide-react";
import { Map } from "../../components/Map";

export const Contact = () => {
  return (
    <PageTransition className="pb-24 max-w-5xl mx-auto space-y-6">
      
      <div className="bg-[#F5E6CC] rounded-[32px] p-6 shadow-sm border border-[#EBE6DF]">
        <h1 className="text-2xl font-bold text-[#2D2D2D] mb-2 flex items-center gap-2">
          <HelpCircle className="text-primary" /> Help & Support
        </h1>
        <p className="text-sm text-[#7A7A7A]">We're here for you and your pets. Reach out anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-primary text-white rounded-[24px] p-6 shadow-lg shadow-primary/20">
            <h3 className="font-black text-xl mb-6">24/7 Emergency Clinic</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-white/90">
                <div className="w-10 h-10 bg-[#FDFBF7]/20 rounded-full flex items-center justify-center shrink-0"><Phone size={18} /></div>
                <p className="font-bold text-lg">+919071710000</p>
              </div>
              <div className="flex items-center gap-4 text-white/90">
                <div className="w-10 h-10 bg-[#FDFBF7]/20 rounded-full flex items-center justify-center shrink-0"><MapPin size={18} /></div>
                <p className="text-sm font-medium">24, 100 Feet Rd, HRBR Layout 1st Block, Banaswadi, Bengaluru, 560043</p>
              </div>
            </div>
          </div>

          <div className="bg-[#FDFBF7] rounded-[24px] p-6 shadow-sm border border-[#EBE6DF]">
            <h3 className="font-bold text-[#2D2D2D] mb-4">General Inquiries</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-[#7A7A7A]">
                <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center shrink-0"><Phone size={18} /></div>
                <p className="font-bold text-[#2D2D2D] text-sm">+919071710000</p>
              </div>
              <div className="flex items-center gap-4 text-[#7A7A7A]">
                <div className="w-10 h-10 bg-secondary/50 rounded-full flex items-center justify-center shrink-0"><Mail size={18} /></div>
                <p className="font-bold text-[#2D2D2D] text-sm">ping@gouuji.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-[#FDFBF7] rounded-[32px] p-6 shadow-sm border border-[#EBE6DF]">
          <h3 className="font-bold text-[#2D2D2D] mb-6 text-lg">Send us a message</h3>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Subject</label>
              <input type="text" placeholder="How can we help?" className="w-full h-12 bg-[#F5E6CC] border border-[#EBE6DF] rounded-[16px] px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#7A7A7A] uppercase tracking-wider ml-1">Message</label>
              <textarea placeholder="Write your message here..." rows={4} className="w-full bg-[#F5E6CC] border border-[#EBE6DF] rounded-[16px] p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none"></textarea>
            </div>
            <button className="w-full bg-primary text-white font-bold h-12 rounded-[16px] hover:bg-[#4A8754] transition-colors shadow-md shadow-primary/20 flex items-center justify-center gap-2 mt-2">
              <Send size={18} /> Send Message
            </button>
          </form>
        </div>

      </div>

      {/* Map Section */}
      <div className="bg-[#FDFBF7] rounded-[32px] p-2 shadow-sm border border-[#EBE6DF]">
        <Map 
          center={[13.0238, 77.6434]} 
          zoom={15} 
          markers={[
            { position: [13.0238, 77.6434], popupText: "Gouujipets - HRBR Layout" }
          ]} 
        />
      </div>

    </PageTransition>
  );
};
