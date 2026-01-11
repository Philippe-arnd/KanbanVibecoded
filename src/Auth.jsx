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

  // Calcul de la force du mot de passe (0 à 4)
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
      // 1. Se connecter
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      error = signInError;
    } else if (view === 'signup') {
      // Vérification de la confirmation du mot de passe
      if (password !== confirmPassword) {
        alert("Les mots de passe ne correspondent pas !");
        setLoading(false);
        return;
      }

      // 2. S'inscrire
      const { data, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin // Redirige l'utilisateur vers l'app après clic sur le mail
        }
      });
      error = signUpError;
      
      if (!error && data) {
        setShowSuccess(true);
      }
    } else if (view === 'forgot_password') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
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

  // --- ÉCRAN DE SUCCÈS (INSCRIPTION) ---
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-[#E0EBDD] p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black text-center">
          <div className="inline-flex p-4 rounded-full bg-green-50 text-green-600 mb-6 animate-bounce">
            <MailCheck size={48} />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Vérifiez vos emails !</h2>
          <p className="text-black/80 mb-8">
            Un lien de confirmation a été envoyé à <br/><span className="font-medium text-black">{email}</span>.
          </p>
          <button onClick={() => { setShowSuccess(false); setView('login'); }} className="text-black font-bold underline">
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // --- ÉCRAN DE SUCCÈS (MOT DE PASSE OUBLIÉ) ---
  if (showResetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-[#E0EBDD] p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black text-center">
          <div className="inline-flex p-4 rounded-full bg-green-50 text-green-600 mb-6">
            <MailCheck size={48} />
          </div>
          <h2 className="text-2xl font-bold text-black mb-2">Email de réinitialisation envoyé !</h2>
          <p className="text-black/80 mb-8">
            Un lien pour réinitialiser votre mot de passe a été envoyé à <br/><span className="font-medium text-black">{email}</span>.
          </p>
          <button onClick={() => { setShowResetSuccess(false); setView('login'); }} className="text-black font-bold underline">
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#586A7A] flex items-center justify-center p-4 font-sans">
      <div className="bg-[#E0EBDD] p-8 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-2 border-black">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="Logo" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-black">Mon Kanban Vibecodé</h1>
          <p className="text-black/80 mt-2">Gérez vos projets Pro & Perso</p>
        </div>

        {view === 'forgot_password' ? (
          <form onSubmit={handleAuth} className="space-y-4">
            <p className="text-center text-gray-600">Entrez votre email pour recevoir un lien de réinitialisation.</p>
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
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#89CFF0] text-black font-bold py-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Envoyer le lien"}
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
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
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

            {/* Jauge de sécurité et Confirmation (Uniquement en mode Inscription) */}
            {view === 'signup' && (
              <>
                {/* Jauge */}
                <div className="flex gap-1 h-1.5 mb-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div 
                      key={step} 
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${strength >= step ? (strength === 4 ? 'bg-emerald-500' : strength === 3 ? 'bg-blue-500' : strength === 2 ? 'bg-orange-400' : 'bg-red-400') : 'bg-gray-200'}`} 
                    />
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border-2 rounded-none outline-none transition-none bg-white focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${confirmPassword && password !== confirmPassword ? 'border-red-500' : 'border-black'}`}
                      placeholder="Répétez le mot de passe"
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
                <button type="button" onClick={() => setView('forgot_password')} className="text-sm text-black hover:underline font-bold">Mot de passe oublié ?</button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#89CFF0] text-black font-bold py-3 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-none flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : (view === 'login' ? 'Se connecter' : "S'inscrire")}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          {view === 'login' && (
            <>
              <span className="text-black/80">Pas encore de compte ?</span>
              <button onClick={() => setView('signup')} className="ml-2 text-black font-bold underline">Créer un compte</button>
            </>
          )}
          {view === 'signup' && (
            <>
              <span className="text-black/80">Déjà un compte ?</span>
              <button onClick={() => setView('login')} className="ml-2 text-black font-bold underline">Se connecter</button>
            </>
          )}
          {view === 'forgot_password' && (
            <button onClick={() => setView('login')} className="text-black font-bold underline flex items-center gap-2 mx-auto">
              <ArrowLeft size={16} /> Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}