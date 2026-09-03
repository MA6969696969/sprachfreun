import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { signupUser, loginUser, fetchMe, requestPasswordReset, resetPassword } from "../api.js";

const STORAGE_KEY = "sprachfreund.auth.v1";

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token && parsed.user) return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return { token: null, user: null };
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [{ token, user }, setState] = useState(loadStored);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    try {
      if (token && user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore write failures
    }
  }, [token, user]);

  // Verify the stored token is still valid (e.g. hasn't expired) once on
  // load, rather than trusting it forever.
  useEffect(() => {
    if (!token) {
      setCheckedSession(true);
      return;
    }
    fetchMe(token)
      .then(({ user: freshUser }) => setState({ token, user: freshUser }))
      .catch(() => setState({ token: null, user: null }))
      .finally(() => setCheckedSession(true));
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signup = useCallback(async (email, username, password) => {
    const result = await signupUser({ email, username, password });
    setState({ token: result.token, user: result.user });
    return result.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await loginUser({ email, password });
    setState({ token: result.token, user: result.user });
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, user: null });
  }, []);

  const forgotPassword = useCallback(async (email) => {
    await requestPasswordReset({ email });
  }, []);

  const completePasswordReset = useCallback(async (email, code, newPassword) => {
    const result = await resetPassword({ email, code, newPassword });
    setState({ token: result.token, user: result.user });
    return result.user;
  }, []);

  const value = {
    user,
    token,
    checkedSession,
    signup,
    login,
    logout,
    forgotPassword,
    completePasswordReset,
    isSignedIn: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
