import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { KeyRound, Lock, Eye, EyeOff, Check, Loader2 } from 'lucide-react';

// --- PASSWORD UPDATE COMPONENT ---
export default function UpdatePassword({ onDone, title, description }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess("Password updated successfully!");
      setTimeout(() => {
        onDone();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
      <div className="bg-[#E0EBDD] p-0 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black relative">
        <div className="text-left mb-8 p-2 border-b-2 border-black bg-[#89CFF0] flex items-center gap-2">
          <div className="inline-flex p-1 rounded-sm bg-white/50 text-black">
            <KeyRound size={32} />
          </div>
          <h1 className="text-xl font-bold text-black">{title}</h1>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 p-8 pt-0">
          <p className="text-black/80 -mt-4 mb-4">{description}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2 bg-white border-2 border-black rounded-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none transition-none" placeholder="••••••••" minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-black/60 hover:text-black transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>

          <div className="group relative">
            <div className="flex gap-1 h-1.5 cursor-help">
              {[1, 2, 3, 4].map((step) => (<div key={step} className={`h-full flex-1 rounded-full transition-all duration-300 ${strength >= step ? (strength === 4 ? 'bg-emerald-500' : strength === 3 ? 'bg-blue-500' : strength === 2 ? 'bg-orange-400' : 'bg-red-400') : 'bg-gray-200'}`} />))}
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
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
              <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#FFFFE1]"></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full pl-10 pr-4 py-2 border-2 rounded-none outline-none transition-none bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-black'}`} placeholder="Repeat password" />
              {confirmPassword && password === confirmPassword && (<Check className="absolute right-3 top-3 text-emerald-500 animate-in fade-in zoom-in" size={18} />)}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center">{success}</p>}

          <button type="submit" disabled={loading || !!success} className="w-full bg-[#89CFF0] text-black font-bold py-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none flex justify-center items-center">
            {loading ? <Loader2 className="animate-spin" /> : 'Update'}
          </button>
        </form>
        
        {title === "Change your password" && (
            <button onClick={onDone} className="absolute top-2 right-2 text-black hover:bg-red-500 hover:text-white border-2 border-black bg-white w-8 h-8 font-mono rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none">&times;</button>
        )}
      </div>
    </div>
  );
}
