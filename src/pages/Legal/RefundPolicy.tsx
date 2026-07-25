import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] py-16 px-6 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
        <Link to="/" className="inline-flex items-center gap-2 text-purple-600 font-bold mb-8 hover:text-purple-700 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">Refund & Cancellation Policy</h1>
        <p className="text-slate-500 font-medium mb-10 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

        <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">1. Cancellation by Customer</h2>
            <p className="mb-3">We understand that plans can change. You can cancel your booking through the GouujiPets dashboard. Our cancellation fees are structured as follows:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>More than 48 hours before check-in:</strong> Full refund minus a 5% processing fee.</li>
              <li><strong>24 to 48 hours before check-in:</strong> 50% refund of the total booking amount.</li>
              <li><strong>Less than 24 hours or No-Show:</strong> No refund will be issued.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">2. Cancellation by Partner Facility</h2>
            <p>If a verified partner facility cancels your booking due to unforeseen circumstances or emergencies, you will receive a <strong>100% full refund</strong>. Additionally, our support team will assist you in finding an alternative facility with priority placement.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">3. Refund Processing Time</h2>
            <p>All approved refunds will be processed automatically to the original payment method used during checkout. Please allow <strong>5 to 7 business days</strong> for the amount to reflect in your bank account or credit card statement.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">4. Early Pick-ups</h2>
            <p>If you decide to pick up your pet earlier than the scheduled check-out date, no refunds will be issued for the remaining unused days. This policy is in place because the facility reserved that space specifically for your pet, preventing others from booking.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-900 mb-4">5. Dispute Resolution</h2>
            <p>If you believe you have been incorrectly charged or wish to dispute a cancellation fee, please contact our support team at <a href="mailto:support@gouujipets.com" className="text-purple-600 font-bold hover:underline">support@gouujipets.com</a> within 7 days of the booking date. All disputes will be reviewed on a case-by-case basis.</p>
          </section>
        </div>
      </div>
    </div>
  );
};
