import fs from 'fs';

let content = fs.readFileSync('old_UserLogin.tsx', 'utf8');

// 1. Replace handleSubmit and add OTP logic
content = content.replace(
  /const handleSubmit = async.*?try \{/s,
  `const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const userCredential = await verifyOTP(confirmationResult, otp, 'customer');
      
      if (!isLogin) {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          full_name: formData.name || 'Customer',
          phone: formData.email.trim(),
          email: '',
          role: 'customer',
          loginMethod: 'phone',
          created_at: new Date().toISOString()
        }, { merge: true });

        if (formData.petName) {
           localStorage.setItem('pending_pet_registration', JSON.stringify({
              name: formData.petName,
              species: formData.petType,
              breed: formData.petBreed,
           }));
        }
      }

      await useAuthStore.getState().loadUser();
      
      if (intendedRoute) {
        navigate(intendedRoute);
        setIntendedRoute(null);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const loginIdentifier = formData.email.trim();
    const validEmail = isEmail(loginIdentifier);
    const validPhone = isPhone(loginIdentifier);

    if (!validEmail && !validPhone) {
      setError('Please enter a valid Email address or Phone Number.');
      setIsLoading(false);
      return;
    }

    if (!isLogin && !validPhone) {
      const passwordCheck = checkPasswordStrength(formData.password);
      if (!passwordCheck.isStrong) {
        setError(passwordCheck.errors.join(' '));
        setIsLoading(false);
        return;
      }
    }

    if (validPhone) {
      try {
        const recaptchaVerifier = setupRecaptcha('recaptcha-container');
        const confirmation = await sendOTP(loginIdentifier, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setShowOtpInput(true);
      } catch (err: any) {
        setError(err.message || 'Failed to send OTP. Please check the number.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const finalEmail = loginIdentifier.toLowerCase();

    try {`
);

// 2. Add recaptcha-container and wrap forms
content = content.replace(
  /<form onSubmit=\{handleSubmit\} className="space-y-4">/s,
  `<div id="recaptcha-container"></div>

          {showOtpInput ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all text-center tracking-[0.5em] text-2xl shadow-sm"
                  maxLength={6}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 mt-4 hover:shadow-purple-600/40 active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : "Verify OTP"}
              </button>
              <button 
                type="button" 
                onClick={() => { setShowOtpInput(false); setConfirmationResult(null); }}
                className="w-full bg-white text-slate-600 font-bold py-3 rounded-2xl transition-all mt-2"
              >
                Change Phone Number
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">`
);

// 3. Make password field optional using the EXACT right replacement logic
content = content.replace(
  /<div>\s*<div className="relative group">\s*<div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 transition-colors">\s*<Lock size=\{20\} \/>\s*<\/div>\s*<input[\s\S]*?<\/div>\s*<\/div>/,
  (match) => {
    // We match from <div> to the closing </div> of the password field section.
    // The original file ends with `</div>` (for the password field), then `{!isLogin && formData.password.length > 0 && (`, etc.
    // Let's replace the placeholder and required fields.
    let updatedMatch = match.replace(/placeholder="Password[^"]*"/, 'placeholder="Password"');
    // Ensure we replace required={!isPhone(formData.email)} with required if it exists, or just leave required
    updatedMatch = updatedMatch.replace(/required=\{!isPhone\(formData\.email\)\}/, 'required');
    
    // Now wrap it correctly!
    return `{!isPhone(formData.email) && (
              ` + updatedMatch + `
            )}`;
  }
);

// 4. Close the form ternary
content = content.replace(
  /<\/button>\s*<\/form>/g,
  (match, offset, string) => {
    // Only replace the LAST one!
    if (string.lastIndexOf('</form>') === offset + match.indexOf('</form>')) {
      return `</button>
          </form>
          )}`;
    }
    return match;
  }
);

fs.writeFileSync('src/pages/Auth/UserLogin.tsx', content);
console.log('Modified UserLogin.tsx');
