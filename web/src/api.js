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

export async function submitLeaderboardScore({ deviceId, name, totalPoints, points }) {
  const res = await fetch(`${BASE_URL}/api/leaderboard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
