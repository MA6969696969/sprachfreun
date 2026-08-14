import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { courses, getLanguage, getCourse } from "./data/courses.js";
import { buildSystemPrompt, replySchema } from "./promptBuilder.js";

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "\n⚠️  ANTHROPIC_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n" +
      "   Get a key at https://console.anthropic.com/settings/keys\n"
  );
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const EFFORT = process.env.ANTHROPIC_EFFORT || "low";

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.get("/api/courses", (req, res) => {
  res.json(courses);
});

app.post("/api/chat", async (req, res) => {
  try {
    const { language, mode, courseId, level, history, message } = req.body;

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

    const system = buildSystemPrompt({
      languageName: lang.languageName,
      mode,
      course,
      level: level || "beginner",
    });

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

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system,
      messages: apiMessages,
      output_config: {
        effort: EFFORT,
        format: { type: "json_schema", schema: replySchema },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      return res.status(502).json({ error: "No text response from model" });
    }

    const parsed = JSON.parse(textBlock.text);
    res.json(parsed);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(err.status || 500).json({ error: friendlyErrorMessage(err) });
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
