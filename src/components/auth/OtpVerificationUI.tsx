import { Loader2 } from "lucide-react";

interface Props {
  otp: string;
  setOtp: (otp: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onResend: () => void;
  resendTimer: number;
}

export const OtpVerificationUI = ({ 
  otp, setOtp, isLoading, onSubmit, onCancel, onResend, resendTimer 
}: Props) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 shadow-sm text-left">
        <h3 className="text-xl font-black text-slate-900 mb-4">Welcome to GOUUJI Pets</h3>
        <div className="space-y-3 text-sm text-slate-600 font-medium">
          <p>Before we continue, let's verify your identity.</p>
          <p>Enter the 6-digit verification code we've sent to your registered email address or mobile number.</p>
          <p>This helps keep your account, bookings, and pet information safe.</p>
          <p className="font-bold text-amber-600 pt-2">OTP expires in 1 minute.</p>
        </div>
      </div>

      <div className="relative group">
        <input 
          type="text" 
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all text-center tracking-[0.5em] text-2xl shadow-sm"
          maxLength={6}
          required
        />
      </div>

      <button 
        type="submit" 
        disabled={isLoading || otp.length < 6}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 mt-4 hover:shadow-purple-600/40 active:scale-[0.98]"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : "Verify OTP"}
      </button>

      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button 
          type="button" 
          onClick={onResend}
          disabled={resendTimer > 0 || isLoading}
          className="flex-1 bg-white text-purple-600 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-2xl transition-all hover:bg-purple-50 flex items-center justify-center"
        >
          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
        </button>
        <button 
          type="button" 
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 bg-slate-50 text-slate-600 border border-slate-200 font-bold py-3 rounded-2xl transition-all hover:bg-slate-100 flex items-center justify-center"
        >
          Change Number
        </button>
      </div>
    </form>
  );
};
