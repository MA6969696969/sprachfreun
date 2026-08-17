import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { fetchCourses } from "./api.js";
import { ProfileProvider } from "./context/ProfileContext.jsx";
import { ProgressProvider } from "./context/ProgressContext.jsx";
import { LocaleProvider } from "./context/LocaleContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { StreakProvider } from "./context/StreakContext.jsx";
import Splash from "./components/Splash.jsx";
import Settings from "./components/Settings.jsx";
import Home from "./components/Home.jsx";
import LanguageHome from "./components/LanguageHome.jsx";
import CourseDetail from "./components/CourseDetail.jsx";
import Playground from "./components/Playground.jsx";
import ConversationPractice from "./components/ConversationPractice.jsx";
import VocabPractice from "./components/VocabPractice.jsx";
import MatchGame from "./components/MatchGame.jsx";
import CategoryTest from "./components/CategoryTest.jsx";
import Situations from "./components/Situations.jsx";
import SituationPractice from "./components/SituationPractice.jsx";

const MIN_SPLASH_MS = 2000;

export default function App() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState(null);
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    fetchCourses()
      .then(setCourses)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (error) {
    return (
      <div className="page-center">
        <div className="error-card">
          <h2>Couldn't reach the server</h2>
          <p>{error}</p>
          <p className="hint">Make sure the backend is running on port 3001.</p>
        </div>
      </div>
    );
  }

  return (
    <LocaleProvider>
      <SettingsProvider>
        {!courses || !minTimeDone ? (
          <Splash />
        ) : (
          <ProfileProvider>
            <ProgressProvider>
            <StreakProvider>
              <Routes>
                <Route path="/" element={<Home courses={courses} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/:lang" element={<LanguageHome courses={courses} />} />
                <Route
                  path="/:lang/course/:courseId"
                  element={<CourseDetail courses={courses} />}
                />
                <Route
                  path="/:lang/course/:courseId/flashcards"
                  element={<VocabPractice courses={courses} />}
                />
                <Route
                  path="/:lang/course/:courseId/match"
                  element={<MatchGame courses={courses} />}
                />
                <Route
                  path="/:lang/practice/:courseId"
                  element={<ConversationPractice courses={courses} mode="course" />}
                />
                <Route path="/:lang/playground" element={<Playground courses={courses} />} />
                <Route
                  path="/:lang/playground/:level"
                  element={<ConversationPractice courses={courses} mode="playground" />}
                />
                <Route
                  path="/:lang/test/:category"
                  element={<CategoryTest courses={courses} />}
                />
                <Route path="/:lang/situations" element={<Situations courses={courses} />} />
                <Route
                  path="/:lang/situations/:situationId"
                  element={<SituationPractice courses={courses} />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </StreakProvider>
            </ProgressProvider>
          </ProfileProvider>
        )}
      </SettingsProvider>
    </LocaleProvider>
  );
}
