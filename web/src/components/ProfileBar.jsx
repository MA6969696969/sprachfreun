import { useState } from "react";
import { Pencil } from "lucide-react";
import { useProfile } from "../context/ProfileContext.jsx";

export default function ProfileBar() {
  const { name, setName, totalPoints, level } = useProfile();
  const [editing, setEditing] = useState(!name);
  const [draft, setDraft] = useState(name || "");

  function commitName() {
    const trimmed = draft.trim();
    setName(trimmed || "Friend");
    setEditing(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    commitName();
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const pointsToNext = level.next ? Math.max(0, level.next.threshold - totalPoints) : 0;

  return (
    <div className="profile-bar">
      <div className="profile-avatar">{initial}</div>
      <div className="profile-main">
        {editing ? (
          <form className="profile-name-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              onFocus={(e) => e.target.select()}
              placeholder="What should we call you?"
              maxLength={24}
              autoFocus
            />
          </form>
        ) : (
          <button
            type="button"
            className="profile-name"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            {name}{" "}
            <span className="profile-edit-hint">
              <Pencil size={12} />
            </span>
          </button>
        )}

        <div className="profile-level-row">
          <span className="profile-level-title">{level.title}</span>
          <span className="profile-points">{totalPoints} pts</span>
        </div>
        <div className="profile-level-track">
          <div className="profile-level-fill" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <div className="profile-level-next">
          {level.next ? `${pointsToNext} pts to ${level.next.title}` : "Max level reached"}
        </div>
      </div>
    </div>
  );
}
