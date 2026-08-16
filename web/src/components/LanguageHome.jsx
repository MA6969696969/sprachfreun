import { Link, useParams, Navigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { useProfile, getLevel } from "../context/ProfileContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { CATEGORY_ORDER, categorySlug } from "../lib/categories.js";

function groupByCategory(courses) {
  const groups = new Map();
  for (const course of courses) {
    const cat = course.category || "More";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(course);
  }
  const ordered = CATEGORY_ORDER.filter((cat) => groups.has(cat));
  const extra = [...groups.keys()].filter((cat) => !CATEGORY_ORDER.includes(cat));
  return [...ordered, ...extra].map((cat) => [cat, groups.get(cat)]);
}

export default function LanguageHome({ courses }) {
  const { lang: langCode } = useParams();
  const lang = courses[langCode];
  const { points } = useProfile();
  const { isCategoryPassed, getLangProficiency } = useProgress();
  if (!lang) return <Navigate to="/" replace />;

  const grouped = groupByCategory(lang.courses);
  const langPoints = points[langCode] || 0;
  const langLevel = getLevel(langPoints);
  const proficiency = getLangProficiency(langCode);

  return (
    <>
      <AppHeader backTo="/" backLabel="All languages" />
      <div className="page">
        <header className="hero small">
          <span className="flag-big">{lang.flag}</span>
          <h1>{lang.languageName}</h1>
          <div className="proficiency-badge">
            🎯 {proficiency.title} · {proficiency.passedCount}/{proficiency.totalCount} units passed
          </div>
          <p>{lang.courses.length} courses, organized so you can start with the basics and build up.</p>
          {langPoints > 0 && (
            <p className="lang-mastery">
              🏅 {langLevel.title} · {langPoints} pts in {lang.languageName}
            </p>
          )}
        </header>

        <section>
          <h2>Speaking Playground</h2>
          <Link to={`/${langCode}/playground`} className="playground-card">
            <h3>🗣️ Open conversation practice</h3>
            <p>Pick your level and talk about anything — get a feedback recap when you're done.</p>
          </Link>
        </section>

        {grouped.map(([category, categoryCourses]) => {
          const passed = isCategoryPassed(langCode, category);
          return (
            <section key={category}>
              <h2>{category}</h2>
              <div className="card-grid">
                {categoryCourses.map((course, i) => (
                  <Link
                    key={course.id}
                    to={`/${langCode}/course/${course.id}`}
                    className="course-card"
                    style={{ "--stagger": i }}
                  >
                    <span className="course-icon">{course.icon}</span>
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                  </Link>
                ))}
              </div>
              <Link
                to={`/${langCode}/test/${categorySlug(category)}`}
                className={`category-test-cta ${passed ? "passed" : ""}`}
              >
                {passed ? `✅ ${category} test passed — retake` : `🧪 Take the ${category} test`}
              </Link>
            </section>
          );
        })}
      </div>
    </>
  );
}
