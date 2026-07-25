import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
        <Link to="/" className="inline-flex items-center gap-2 text-purple-600 font-bold mb-8 hover:text-purple-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-slate-500 font-medium mb-10 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing or using the GouujiPets platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">2. Description of Service</h2>
            <p>GouujiPets is an online marketplace that connects pet parents with verified pet care providers, including boarding facilities, groomers, and veterinary clinics. We facilitate the booking process and provide a platform for communication and payment processing.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>You must provide accurate and complete information about yourself and your pets.</li>
              <li>You must ensure that your pets are up-to-date on vaccinations before utilizing any boarding or daycare services.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree not to use the platform for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">4. Partner Responsibilities</h2>
            <p>Verified partners must adhere to the highest standards of pet care, maintain accurate facility details, and comply with our platform's policies and local regulations. Partners agree to the platform commission structure as outlined during their onboarding process.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">5. Limitation of Liability</h2>
            <p>GouujiPets acts solely as a facilitator. While we thoroughly verify our partners, we are not directly responsible for the care provided. In no event shall GouujiPets be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the platform or the services provided by partners.</p>
          </section>
          
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">6. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms of Service at any time. Any changes will be effective immediately upon posting on the platform. Your continued use of the platform following the posting of revised Terms means that you accept and agree to the changes.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
