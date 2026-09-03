import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail } from "lucide-react";
import AppHeader from "./AppHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const TITLES = {
  login: "Sign in",
  signup: "Create account",
  forgot: "Reset your password",
  reset: "Enter your code",
};

export default function Auth() {
  const { user, isSignedIn, checkedSession, signup, login, logout, forgotPassword, completePasswordReset } =
    useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(email, username, password);
        navigate("/settings");
      } else if (mode === "login") {
        await login(email, password);
        navigate("/settings");
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setNotice("If that email has an account, a 6-digit code is on its way — check your inbox.");
        setMode("reset");
      } else if (mode === "reset") {
        await completePasswordReset(email, code, newPassword);
        navigate("/settings");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setNotice("Sent again — check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isSignedIn) {
    return (
      <>
        <AppHeader backTo="/settings" backLabel="Settings" />
        <div className="page">
          <header className="hero small">
            <h1>
              <User size={26} className="icon-inline" /> Account
            </h1>
          </header>
          <div className="list-card auth-account-card">
            <div className="auth-account-username">{user.username}</div>
            <div className="auth-account-email">{user.email}</div>
          </div>
          <p className="auth-hint">
            You're signed in — your leaderboard entries use this username, and no one else can post
            under it.
          </p>
          <div className="cta-stack">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                logout();
                navigate("/settings");
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader backTo="/settings" backLabel="Settings" />
      <div className="page">
        <header className="hero small">
          <h1>
            <User size={26} className="icon-inline" /> {TITLES[mode]}
          </h1>
          <p>
            {mode === "forgot"
              ? "Enter your account email and we'll send you a 6-digit code."
              : mode === "reset"
              ? "Enter the code we emailed you, plus a new password."
              : "Protect your leaderboard name with an email and password."}
          </p>
        </header>

        <form className="auth-form list-card" onSubmit={handleSubmit}>
          {mode !== "reset" && (
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          )}

          {mode === "signup" && (
            <label className="auth-field">
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="3-20 letters, numbers, underscores"
                autoComplete="username"
                maxLength={20}
                required
              />
            </label>
          )}

          {(mode === "login" || mode === "signup") && (
            <label className="auth-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            </label>
          )}

          {mode === "reset" && (
            <>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-field">
                <span>6-digit code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <label className="auth-field">
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </>
          )}

          {notice && <p className="auth-notice">{notice}</p>}
          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={submitting || !checkedSession}>
            {submitting
              ? "…"
              : mode === "signup"
              ? "Create account"
              : mode === "forgot"
              ? "Send reset code"
              : mode === "reset"
              ? "Reset password"
              : "Sign in"}
          </button>

          {mode === "reset" && (
            <button
              type="button"
              className="cta-text-link"
              onClick={handleResendCode}
              disabled={submitting || !email}
            >
              <Mail size={16} /> Resend code
            </button>
          )}
        </form>

        {mode === "login" && (
          <button
            type="button"
            className="cta-text-link"
            onClick={() => {
              setMode("forgot");
              setError(null);
              setNotice(null);
            }}
          >
            Forgot your password?
          </button>
        )}

        <button
          type="button"
          className="cta-text-link"
          onClick={() => {
            setMode((m) => (m === "signup" ? "login" : m === "login" ? "signup" : "login"));
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : mode === "login"
            ? "New here? Create an account"
            : "Back to sign in"}
        </button>
      </div>
    </>
  );
}
