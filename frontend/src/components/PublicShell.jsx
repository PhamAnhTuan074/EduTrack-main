// Nguoi code: Phạm Anh Tuấn. Pham vi: layout cho cac trang public.

import { Link } from "react-router-dom";

const navItems = [
  { key: "home", to: "/", label: "Trang chủ" },
  { key: "team", to: "/team", label: "Đội ngũ" },
  { key: "contact", to: "/contact", label: "Liên hệ" }
];

export default function PublicShell({ active, children }) {
  return (
    <main className="public-site">
      <header className="public-nav">
        <Link className="public-brand" to="/" aria-label="EduTrack">
          <img src="/logo_ptit.png" alt="" />
          <span>EduTrack</span>
        </Link>

        <nav className="public-nav-links" aria-label="Điều hướng website">
          {navItems.map((item) => (
            <Link key={item.key} className={active === item.key ? "active" : ""} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="public-nav-actions">
          <Link className="public-text-link" to="/login">Đăng nhập</Link>
        </div>
      </header>

      {children}
    </main>
  );
}
