import { Link } from "react-router-dom";

export default function AppHeader({ backTo, backLabel }) {
  return (
    <div className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="app-brand">
          <span className="app-brand-mark" />
          <span>Sprachfreund</span>
        </Link>
        {backTo && (
          <Link to={backTo} className="app-header-back">
            ← {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
