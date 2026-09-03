const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function fetchCourses() {
  const res = await fetch(`${BASE_URL}/api/courses`);
  if (!res.ok) throw new Error("Failed to load courses");
  return res.json();
}

export async function sendChat({
  language,
  mode,
  courseId,
  level,
  history,
  message,
  situationTitle,
  situationScenario,
  turnCount,
}) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language,
      mode,
      courseId,
      level,
      history,
      message,
      situationTitle,
      situationScenario,
      turnCount,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function gradeAnswer({ language, term, correctTranslation, userAnswer }) {
  const res = await fetch(`${BASE_URL}/api/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, term, correctTranslation, userAnswer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function submitLeaderboardScore({ deviceId, name, totalPoints, points, token }) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api/leaderboard`, {
    method: "POST",
    headers,
    body: JSON.stringify({ deviceId, name, totalPoints, points }),
  });
  if (!res.ok) throw new Error("Failed to submit score");
  return res.json();
}

export async function fetchLeaderboard(langCode) {
  const url = new URL(`${BASE_URL}/api/leaderboard`);
  if (langCode) url.searchParams.set("lang", langCode);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

export async function signupUser({ email, username, password }) {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data;
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function fetchMe(token) {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Not signed in");
  return res.json();
}

export async function requestPasswordReset({ email }) {
  const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't send the reset email");
  return data;
}

export async function resetPassword({ email, code, newPassword }) {
  const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Reset failed");
  return data;
}
