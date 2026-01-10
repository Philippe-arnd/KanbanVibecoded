import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, Mail, Loader2, Eye, EyeOff, Check, MailCheck } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Basculer entre Login et Sign Up
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

    if (isLogin) {
      // 1. Se connecter
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      error = signInError;
    } else {
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
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 text-center">
          <div className="inline-flex p-4 rounded-full bg-green-50 text-green-600 mb-6 animate-bounce">
            <MailCheck size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez vos emails !</h2>
          <p className="text-gray-500 mb-8">
            Un lien de confirmation a été envoyé à <br/><span className="font-medium text-gray-900">{email}</span>.
          </p>
          <button onClick={() => { setShowSuccess(false); setIsLogin(true); }} className="text-indigo-600 font-bold hover:underline">
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="Logo" className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Mon Kanban Vibecodé</h1>
          <p className="text-gray-500 mt-2">Gérez vos projets Pro & Perso</p>
        </div>

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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
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
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                minLength={6}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Jauge de sécurité et Confirmation (Uniquement en mode Inscription) */}
          {!isLogin && (
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 outline-none transition ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-500'}`}
                    placeholder="Répétez le mot de passe"
                  />
                  {confirmPassword && password === confirmPassword && (
                    <Check className="absolute right-3 top-3 text-emerald-500 animate-in fade-in zoom-in" size={18} />
                  )}
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-indigo-200 flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          </span>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setPassword('');
              setConfirmPassword('');
            }} 
            className="ml-2 text-indigo-600 font-bold hover:underline"
          >
            {isLogin ? "Créer un compte" : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}