import { useState, useEffect } from 'react';
import { authClient } from '../lib/auth-client';

export function useAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    // Check for reset token in URL (better-auth standard)
    // or handle it if we are on a specific route. 
    // Usually better-auth redirects to a reset page. 
    // If the user lands on the app with a token, we might want to flag it.
    // However, better-auth handles the reset flow via API. 
    // The "isPasswordRecovery" state was used to show UpdatePassword component.
    // We can assume if we have a "token" param and "reset_password" (example) we are in recovery.
    // But standard better-auth flow: user clicks link -> goes to reset page.
    
    // For this migration, let's assume we handle it if we see a specific hash or param?
    if (window.location.hash) {
      // Handle hash if needed
    } 
    // Let's leave it as manual state for now or check URL params if needed.
  }, []);

  const logout = async () => {
    await authClient.signOut();
  };

  return {
    session,
    loading: isPending,
    isPasswordRecovery,
    setIsPasswordRecovery,
    logout
  };
}
