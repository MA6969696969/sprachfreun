import { Link } from "react-router-dom";
import ProfileBar from "./ProfileBar.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { useActiveLanguage } from "../context/ActiveLanguageContext.jsx";
import { useProfile, getLevel } from "../context/ProfileContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { useLocale } from "../context/LocaleContext.jsx";
import { CATEGORY_ORDER, categorySlug } from "../lib/categories.js";
import { CourseIcon } from "../lib/icons.jsx";

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

export default function Home({ courses }) {
  const { activeLanguage } = useActiveLanguage();
  const lang = courses[activeLanguage];
  const { points } = useProfile();
  const { isCategoryPassed, getLangProficiency, getCourseMastery } = useProgress();
  const { t } = useLocale();

  const grouped = groupByCategory(lang.courses);
  const langCode = lang.code;
  const langPoints = points[langCode] || 0;
  const langLevel = getLevel(langPoints);
  const proficiency = getLangProficiency(langCode);

  return (
    <div className="page">
      <ProfileBar />

      <header className="lang-home-header">
        <LanguageSwitcher courses={courses} />
        <div className="proficiency-badge">
          <span className="stat-icon">🎯</span> {proficiency.title} · {proficiency.passedCount}/
          {proficiency.totalCount} units passed
        </div>
        {langPoints > 0 && (
          <p className="lang-mastery">
            <span className="stat-icon">🏅</span> {langLevel.title} · {langPoints} pts in{" "}
            {lang.languageName}
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
          <section key={category} className="path-chapter">
            <div className={`chapter-banner ${passed ? "passed" : ""}`}>
              <h2>{category}</h2>
            </div>
            <div className="course-path">
              {categoryCourses.map((course, i) => {
                const mastery = getCourseMastery(langCode, course.id);
                return (
                  <div className="path-node-wrap" key={course.id}>
                    <Link
                      to={`/${langCode}/course/${course.id}/flashcards`}
                      className={`path-node ${mastery ? `mastery-${mastery}` : ""}`}
                    >
                      <span className="path-node-icon">
                        <CourseIcon courseId={course.id} size={28} />
                      </span>
                    </Link>
                    <span className="path-node-label">{course.title}</span>
                  </div>
                );
              })}
              <div className="path-node-wrap">
                <Link
                  to={`/${langCode}/test/${categorySlug(category)}`}
                  className={`path-node path-checkpoint ${passed ? "passed" : ""}`}
                >
                  <span className="path-node-icon">{passed ? "✅" : "🧪"}</span>
                </Link>
                <span className="path-node-label">
                  {passed ? `${category} test passed — retake` : `${category} test`}
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
