import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, Mail, Loader2, Eye, EyeOff, Check, MailCheck, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [view, setView] = useState('login'); // 'login', 'signup', 'forgot_password'
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  // Password strength calculation (0 to 4)
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let error = null;

    if (view === 'login') {
      // 1. Log in
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      error = signInError;
    } else if (view === 'signup') {
      // Password confirmation check
      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        setLoading(false);
        return;
      }

      // 2. Sign up
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app` // Redirects to app to handle session
        }
      });
      error = signUpError;
      
      if (!error && data) {
        setShowSuccess(true);
      }
    } else if (view === 'forgot_password') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app`,
      });
      error = resetError;
      if (!error) {
        setShowResetSuccess(true);
      }
    }

    if (error) {
      alert(error.message);
    }
    setLoading(false);
  };

  // --- SUCCESS SCREEN (SIGN UP) ---
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-[#E0EBDD] p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black text-center">
          <div className="inline-flex p-4 rounded-full bg-green-50 text-green-600 mb-6 animate-bounce">
            <MailCheck size={48} />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Check your emails!</h2>
          <p className="text-black/80 mb-8">
            A confirmation link has been sent to <br/><span className="font-medium text-black">{email}</span>.
          </p>
          <button onClick={() => { setShowSuccess(false); setView('login'); }} className="text-black font-bold underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // --- SUCCESS SCREEN (FORGOT PASSWORD) ---
  if (showResetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-[#E0EBDD] p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black text-center">
          <div className="inline-flex p-4 rounded-full bg-green-50 text-green-600 mb-6">
            <MailCheck size={48} />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Reset email sent!</h2>
          <p className="text-black/80 mb-8">
            A link to reset your password has been sent to <br/><span className="font-medium text-black">{email}</span>.
          </p>
          <button onClick={() => { setShowResetSuccess(false); setView('login'); }} className="text-black font-bold underline">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#586A7A] flex items-center justify-center p-4 font-sans">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
      <div className="bg-[#E0EBDD] p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="Logo" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black">My Vibecodé Kanban</h1>
          <p className="text-black/80 mt-2">Manage your Pro & Personal projects</p>
        </div>

        {view === 'forgot_password' ? (
          <form onSubmit={handleAuth} className="space-y-4">
            <p className="text-center text-gray-600">Enter your email to receive a reset link.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#89CFF0] text-black font-bold py-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Send link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border-2 border-black rounded-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-none"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-black/60 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Security Gauge and Confirmation (Only in Sign Up mode) */}
            {view === 'signup' && (
              <>
                {/* Gauge */}
                <div className="group relative mb-4">
                  <div className="flex gap-1 h-1.5 cursor-help">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step} 
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${strength >= step ? (strength === 4 ? 'bg-emerald-500' : strength === 3 ? 'bg-blue-500' : strength === 2 ? 'bg-orange-400' : 'bg-red-400') : 'bg-gray-200'}`} 
                      />
                    ))}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-[#FFFFE1] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs hidden group-hover:block z-20">
                    <p className="font-bold text-black mb-2 border-b border-black/20 pb-1">Security criteria:</p>
                    <ul className="space-y-1">
                      <li className={`flex items-center gap-2 ${password.length >= 8 ? "text-green-600 font-bold" : "text-black/60"}`}>{password.length >= 8 ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-black/20"></div>} 8 chars min.</li>
                      <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? "text-green-600 font-bold" : "text-black/60"}`}>{/[A-Z]/.test(password) ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-black/20"></div>} 1 uppercase</li>
                      <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? "text-green-600 font-bold" : "text-black/60"}`}>{/[0-9]/.test(password) ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-black/20"></div>} 1 number</li>
                      <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? "text-green-600 font-bold" : "text-black/60"}`}>{/[^A-Za-z0-9]/.test(password) ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-black/20"></div>} 1 special char</li>
                    </ul>
                    {/* Triangle */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
                    <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFFFE1]"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border-2 rounded-none outline-none transition-none bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-black'}`}
                      placeholder="Repeat password"
                    />
                    {confirmPassword && password === confirmPassword && (
                      <Check className="absolute right-3 top-3 text-emerald-500 animate-in fade-in zoom-in" size={18} />
                    )}
                  </div>
                </div>
              </>
            )}

            {view === 'login' && (
              <div className="text-right">
                <button type="button" onClick={() => setView('forgot_password')} className="text-sm text-black hover:underline font-bold">Forgot password?</button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#89CFF0] text-black font-bold py-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : (view === 'login' ? 'Log in' : "Sign up")}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          {view === 'login' && (
            <>
              <span className="text-black/80">No account yet?</span>
              <button onClick={() => setView('signup')} className="ml-2 text-black font-bold underline">Create an account</button>
            </>
          )}
          {view === 'signup' && (
            <>
              <span className="text-black/80">Already have an account?</span>
              <button onClick={() => setView('login')} className="ml-2 text-black font-bold underline">Log in</button>
            </>
          )}
          {view === 'forgot_password' && (
            <button onClick={() => setView('login')} className="text-black font-bold underline flex items-center gap-2 mx-auto">
              <ArrowLeft size={16} /> Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
