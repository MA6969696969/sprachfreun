import { useState } from "react";
import { useStreak } from "../context/StreakContext.jsx";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateStr(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function buildMonthCells(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function Streak() {
  const { streakCount, completedDates } = useStreak();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const cells = buildMonthCells(year, month);
  const completedSet = new Set(completedDates);
  const todayKey = dateStr(now.getFullYear(), now.getMonth(), now.getDate());

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <>
      <div className="page">
        <header className="hero small">
          <h1>📅 Streak</h1>
          <p>
            {streakCount === 0
              ? "No active streak yet — spend 5 minutes in the app today to start one."
              : `${streakCount} day${streakCount === 1 ? "" : "s"} in a row. Keep it going!`}
          </p>
        </header>

        <div className="calendar-card">
          <div className="calendar-nav">
            <button type="button" onClick={prevMonth} aria-label="Previous month">
              ←
            </button>
            <div className="calendar-month-label">
              {MONTH_NAMES[month]} {year}
            </div>
            <button type="button" onClick={nextMonth} aria-label="Next month">
              →
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>

          <div className="calendar-grid">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} className="calendar-cell empty" />;
              const key = dateStr(year, month, day);
              const done = completedSet.has(key);
              const isToday = key === todayKey;
              return (
                <div key={i} className={`calendar-cell ${done ? "done" : ""} ${isToday ? "today" : ""}`}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
