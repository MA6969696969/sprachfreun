import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { fetchCourses } from "./api.js";
import { ProfileProvider } from "./context/ProfileContext.jsx";
import { ProgressProvider } from "./context/ProgressContext.jsx";
import { LocaleProvider } from "./context/LocaleContext.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { StreakProvider } from "./context/StreakContext.jsx";
import { ActiveLanguageProvider, useActiveLanguage } from "./context/ActiveLanguageContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import Splash from "./components/Splash.jsx";
import AppShell from "./components/AppShell.jsx";
import Settings from "./components/Settings.jsx";
import Auth from "./components/Auth.jsx";
import Streak from "./components/Streak.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import Home from "./components/Home.jsx";
import CourseDetail from "./components/CourseDetail.jsx";
import Playground from "./components/Playground.jsx";
import ConversationPractice from "./components/ConversationPractice.jsx";
import VocabPractice from "./components/VocabPractice.jsx";
import MatchGame from "./components/MatchGame.jsx";
import CategoryTest from "./components/CategoryTest.jsx";
import Situations from "./components/Situations.jsx";
import SituationPractice from "./components/SituationPractice.jsx";

const MIN_SPLASH_MS = 2000;

function LanguageRedirect({ courses }) {
  const { lang } = useParams();
  const { setActiveLanguage } = useActiveLanguage();

  useEffect(() => {
    if (courses[lang]) setActiveLanguage(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return <Navigate to="/" replace />;
}

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
          <AuthProvider>
          <ProfileProvider>
            <ProgressProvider>
            <StreakProvider>
            <ActiveLanguageProvider courses={courses}>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<Home courses={courses} />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/streak" element={<Streak />} />
                  <Route path="/leaderboard" element={<Leaderboard courses={courses} />} />
                </Route>
                <Route path="/account" element={<Auth />} />
                <Route path="/:lang" element={<LanguageRedirect courses={courses} />} />
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
                  path="/:lang/course/:courseId/test"
                  element={<ConversationPractice courses={courses} mode="test" />}
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
            </ActiveLanguageProvider>
            </StreakProvider>
            </ProgressProvider>
          </ProfileProvider>
          </AuthProvider>
        )}
      </SettingsProvider>
    </LocaleProvider>
  );
}
