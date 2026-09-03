import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { courses, getLanguage, getCourse } from "./data/courses.js";
import {
  buildSystemPrompt,
  replySchema,
  buildGradePrompt,
  gradeSchema,
  buildSituationPrompt,
  situationSchema,
} from "./promptBuilder.js";
import { submitScore, getLeaderboard } from "./leaderboardStore.js";
import { signup, login, getUserById, verifyToken, requestPasswordReset, resetPassword } from "./authStore.js";

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠️  ANTHROPIC_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n" +
      "   Get a key at https://console.anthropic.com/settings/keys\n"
  );
}

// reads ANTHROPIC_API_KEY from env. An explicit timeout matters here: without
// one, a rare stalled request can hang far longer than any learner will wait,
// and our own retry-on-failure logic below never gets a chance to kick in.
const client = new Anthropic({ timeout: 20000 });

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const EFFORT = process.env.ANTHROPIC_EFFORT || "low";

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.get("/api/courses", (req, res) => {
  res.json(courses);
});

// Rarely, the model's structured-output text contains a literal, un-decoded
// escape sequence (e.g. a raw "ö" or a stray "\3" instead of the actual
// character) — the JSON is technically valid so JSON.parse succeeds, but the
// resulting string is corrupted. Catch that content-level failure the same
// way we catch a parse error, so the retry loop below covers both.
function hasCorruptedEscapes(value) {
  if (typeof value === "string") {
    return /\\u[0-9a-fA-F]{4}/.test(value) || /\\[0-9]/.test(value);
  }
  if (Array.isArray(value)) return value.some(hasCorruptedEscapes);
  if (value && typeof value === "object") return Object.values(value).some(hasCorruptedEscapes);
  return false;
}

// Occasionally the model's structured-output response comes back truncated
// or malformed (rare, but seen in testing) — a retry clears it up almost
// every time, so we don't surface a raw parse error to the learner for what
// is usually just a one-off hiccup.
async function createStructuredMessage({ system, messages, schema, maxTokens }) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
        output_config: {
          effort: EFFORT,
          format: { type: "json_schema", schema },
        },
      });
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock) throw new Error("No text response from model");
      const parsed = JSON.parse(textBlock.text);
      if (hasCorruptedEscapes(parsed)) throw new Error("Corrupted escape sequence in model output");
      return parsed;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

app.post("/api/chat", async (req, res) => {
  try {
    const {
      language,
      mode,
      courseId,
      level,
      history,
      message,
      situationTitle,
      situationScenario,
      turnCount,
    } = req.body;

    const lang = getLanguage(language);
    if (!lang) {
      return res.status(400).json({ error: `Unknown language: ${language}` });
    }

    let course = null;
    if (mode === "course") {
      course = getCourse(language, courseId);
      if (!course) {
        return res.status(400).json({ error: `Unknown course: ${courseId}` });
      }
    }

    let system, schema;
    if (mode === "situation") {
      if (!situationScenario) {
        return res.status(400).json({ error: "Missing situationScenario" });
      }
      system = buildSituationPrompt({
        languageName: lang.languageName,
        situationTitle: situationTitle || "",
        situationScenario,
        turnCount: turnCount || 6,
      });
      schema = situationSchema;
    } else {
      system = buildSystemPrompt({
        languageName: lang.languageName,
        mode,
        course,
        level: level || "beginner",
      });
      schema = replySchema;
    }

    const apiMessages = (history || []).map((turn) => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: turn.content,
    }));

    if (message && message.trim()) {
      apiMessages.push({ role: "user", content: message.trim() });
    }

    if (apiMessages.length === 0) {
      // Conversation start: no visible user turn yet, ask the model to open.
      apiMessages.push({
        role: "user",
        content: "(The learner has just joined. Greet them and start the conversation.)",
      });
    }

    const parsed = await createStructuredMessage({
      system,
      messages: apiMessages,
      schema,
      maxTokens: 700,
    });
    res.json(parsed);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(err.status || 500).json({ error: friendlyErrorMessage(err) });
  }
});

app.post("/api/grade", async (req, res) => {
  try {
    const { language, term, correctTranslation, userAnswer } = req.body;

    const lang = getLanguage(language);
    if (!lang) {
      return res.status(400).json({ error: `Unknown language: ${language}` });
    }
    if (!term || !correctTranslation) {
      return res.status(400).json({ error: "Missing term or correctTranslation" });
    }

    const system = buildGradePrompt({ languageName: lang.languageName });
    const userContent = `${lang.languageName} text: "${term}"
Accepted meaning: "${correctTranslation}"
Learner said: "${(userAnswer || "").trim() || "(nothing — no answer given)"}"`;

    const parsed = await createStructuredMessage({
      system,
      messages: [{ role: "user", content: userContent }],
      schema: gradeSchema,
      maxTokens: 300,
    });
    res.json(parsed);
  } catch (err) {
    console.error("Grade error:", err);
    res.status(err.status || 500).json({ error: friendlyErrorMessage(err) });
  }
});

async function getAuthUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const userId = verifyToken(token);
  return userId ? getUserById(userId) : null;
}

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const result = await signup({ email, username, password });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login({ email, password });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message || "Login failed" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  res.json({ user });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    await requestPasswordReset({ email });
    res.json({ sent: true });
  } catch (err) {
    console.error("Forgot-password error:", err);
    res.status(500).json({ error: "Couldn't send the reset email right now — try again in a moment." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const result = await resetPassword({ email, code, newPassword });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Reset failed" });
  }
});

app.post("/api/leaderboard", async (req, res) => {
  try {
    let { deviceId, name, totalPoints, points } = req.body;
    // A signed-in submission always uses the account's own protected
    // identity — never whatever name/deviceId the client sent — so no one
    // else can post scores under your username.
    const authUser = await getAuthUser(req);
    if (authUser) {
      deviceId = `user:${authUser.id}`;
      name = authUser.username;
    }
    const result = await submitScore({ deviceId, name, totalPoints, points });
    res.json(result);
  } catch (err) {
    console.error("Leaderboard submit error:", err);
    res.status(400).json({ error: err.message || "Invalid submission" });
  }
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    const langCode = typeof req.query.lang === "string" ? req.query.lang : undefined;
    const entries = await getLeaderboard({ langCode });
    res.json({ entries });
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

function friendlyErrorMessage(err) {
  if (err.status === 401) {
    return "The server's Anthropic API key is missing or invalid. Check server/.env.";
  }
  if (err.status === 429) {
    return "Rate limited — give it a few seconds and try again.";
  }
  if (err.status === 529 || err.status === 500) {
    return "Claude is temporarily overloaded — try again in a moment.";
  }
  return err.message || "Something went wrong talking to Claude.";
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Sprachfreund server listening on http://localhost:${PORT}`);
});
