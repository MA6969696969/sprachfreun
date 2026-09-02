import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Auth() {
  const { user, isSignedIn, checkedSession, signup, login, logout } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signup(email, username, password);
      } else {
        await login(email, password);
      }
      navigate("/settings");
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
            <h1>👤 Account</h1>
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
          <h1>👤 {mode === "signup" ? "Create account" : "Sign in"}</h1>
          <p>Protect your leaderboard name with an email and password.</p>
        </header>

        <form className="auth-form list-card" onSubmit={handleSubmit}>
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

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={submitting || !checkedSession}>
            {submitting ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          className="cta-text-link"
          onClick={() => {
            setMode((m) => (m === "signup" ? "login" : "signup"));
            setError(null);
          }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </>
  );
}
