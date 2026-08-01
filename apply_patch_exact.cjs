const fs = require('fs');

let content = fs.readFileSync('old_UserLogin.tsx', 'utf8');

const oldHandleSubmit = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const loginIdentifier = formData.email.trim();
    const validEmail = isEmail(loginIdentifier);
    const validPhone = isPhone(loginIdentifier);

    if (!validEmail && !validPhone) {
      setError("Please enter a valid Email address or Phone Number.");
      setIsLoading(false);
      return;
    }

    if (!isLogin && !validPhone) {
      const passwordCheck = checkPasswordStrength(formData.password);
      if (!passwordCheck.isStrong) {
        setError(passwordCheck.errors.join(" "));
        setIsLoading(false);
        return;
      }
    }

    const finalEmail = validPhone ? \`\${loginIdentifier.replace(/[^0-9]/g, '')}@phone.gouuji.com\` : loginIdentifier.toLowerCase();

    try {`;

const newHandleSubmit = `  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const userCredential = await verifyOTP(confirmationResult, otp, 'customer');
      
      if (!isLogin) {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, "users", userCredential.user.uid), {
          full_name: formData.name || "Customer",
          phone: formData.email.trim(),
          email: "",
          role: "customer",
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
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError("Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const loginIdentifier = formData.email.trim();
    const validEmail = isEmail(loginIdentifier);
    const validPhone = isPhone(loginIdentifier);

    if (!validEmail && !validPhone) {
      setError("Please enter a valid Email address or Phone Number.");
      setIsLoading(false);
      return;
    }

    if (!isLogin && !validPhone) {
      const passwordCheck = checkPasswordStrength(formData.password);
      if (!passwordCheck.isStrong) {
        setError(passwordCheck.errors.join(" "));
        setIsLoading(false);
        return;
      }
    }

    if (validPhone) {
      try {
        const recaptchaVerifier = setupRecaptcha("recaptcha-container");
        const confirmation = await sendOTP(loginIdentifier, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setShowOtpInput(true);
      } catch (err: any) {
        setError(err.message || "Failed to send OTP. Please check the number.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const finalEmail = loginIdentifier.toLowerCase();

    try {`;

content = content.replace(oldHandleSubmit, newHandleSubmit);

const oldFormStart = `          <form onSubmit={handleSubmit} className="space-y-4">`;

const newFormStart = `          <div id="recaptcha-container"></div>

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
          <form onSubmit={handleSubmit} className="space-y-4">`;

content = content.replace(oldFormStart, newFormStart);

const oldPasswordBlock = `            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                  required
                />
              </div>
              {!isLogin && formData.password.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className={\`flex items-center gap-1 \${formData.password.length >= 8 ? 'text-green-600' : 'text-slate-400'}\`}>• Minimum 8 characters</div>
                  <div className={\`flex items-center gap-1 \${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 uppercase letter</div>
                  <div className={\`flex items-center gap-1 \${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 lowercase letter</div>
                  <div className={\`flex items-center gap-1 \${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 number</div>
                  <div className={\`flex items-center gap-1 \${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 special character</div>
                </div>
              )}
            </div>`;

const newPasswordBlock = `            {!isPhone(formData.email) && (
            <div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-4 font-medium outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all placeholder:text-slate-400 shadow-sm"
                  required
                />
              </div>
              {!isLogin && formData.password.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className={\`flex items-center gap-1 \${formData.password.length >= 8 ? 'text-green-600' : 'text-slate-400'}\`}>• Minimum 8 characters</div>
                  <div className={\`flex items-center gap-1 \${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 uppercase letter</div>
                  <div className={\`flex items-center gap-1 \${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 lowercase letter</div>
                  <div className={\`flex items-center gap-1 \${/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 number</div>
                  <div className={\`flex items-center gap-1 \${/[^A-Za-z0-9]/.test(formData.password) ? 'text-green-600' : 'text-slate-400'}\`}>• At least 1 special character</div>
                </div>
              )}
            </div>
            )}`;

content = content.replace(oldPasswordBlock, newPasswordBlock);

const oldFormEnd = `                  {isLogin ? "Sign In" : "Create Account"} 
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>`;

const newFormEnd = `                  {isLogin ? "Sign In" : "Create Account"} 
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          )}`;

content = content.replace(oldFormEnd, newFormEnd);

fs.writeFileSync('src/pages/Auth/UserLogin.tsx', content);
console.log('Successfully patched src/pages/Auth/UserLogin.tsx');
