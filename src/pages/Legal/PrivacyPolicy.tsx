import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
        <Link to="/" className="inline-flex items-center gap-2 text-purple-600 font-bold mb-8 hover:text-purple-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-slate-500 font-medium mb-10 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">1. Information We Collect</h2>
            <p className="mb-3">At GouujiPets, we collect information to provide better services to all our users. We may collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and physical address.</li>
              <li><strong>Pet Information:</strong> Breed, age, medical history, vaccination records, and specific care requirements.</li>
              <li><strong>Payment Information:</strong> Transaction details securely processed by our payment gateway providers.</li>
              <li><strong>Usage Data:</strong> Information on how you interact with our platform, including IP addresses, browser types, and access times.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p>We use the collected information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>To facilitate bookings and connect you with verified pet care partners.</li>
              <li>To provide customer support and respond to your inquiries.</li>
              <li>To send administrative information, such as confirmations and policy updates.</li>
              <li>To improve our platform and develop new features.</li>
              <li>To ensure the safety and security of all pets and users on our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">3. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share necessary information with our verified partners strictly to fulfill your booking requests (e.g., providing your pet's dietary needs to a boarding facility). We may also disclose information if required by law or to protect our legal rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction. However, please be aware that no method of transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">5. Contact Us</h2>
            <p>If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at <a href="mailto:privacy@gouujipets.com" className="text-purple-600 font-bold hover:underline">privacy@gouujipets.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
