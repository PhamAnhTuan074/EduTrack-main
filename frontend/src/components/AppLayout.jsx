import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

const roleLabels = {
  ADMIN: "Quản trị viên",
  TECHNICIAN: "Kỹ thuật viên",
  REPORTER: "Người báo hỏng"
};

const navItems = [
  { key: "dashboard", to: "/dashboard", icon: "H", label: "Trang chủ" },
  { key: "rooms", to: "/rooms", icon: "P", label: "Phòng học" },
  { key: "devices", to: "/devices", icon: "T", label: "Thiết bị" },
  { key: "report-new", to: "/reports/new", icon: "!", label: "Báo hỏng" },
  { key: "reports", to: "/reports", icon: "B", label: "Phiếu báo hỏng" },
  { key: "profile", to: "/profile", icon: "U", label: "Hồ sơ" },
  { key: "organization", to: "/organization", icon: "O", label: "Tổ chức", adminOnly: true },
  { key: "users", to: "/users", icon: "N", label: "Người dùng", adminOnly: true },
  { key: "roles", to: "/roles", icon: "R", label: "Phân quyền", adminOnly: true }
];

export default function AppLayout({ active, title, subtitle, user, children }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const displayName = user?.fullName || user?.username || "Người dùng";
  const displayRole = roleLabels[user?.role] || user?.role || "Chưa có vai trò";
  const organizationName = user?.organization?.name || "Chưa chọn trường";
  const organizationSlug = user?.organization?.slug || "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        const res = await api.get("/notifications/unread-count");
        setUnreadCount(res.data.count || 0);
      } catch {
        setUnreadCount(0);
      }
    }

    loadUnreadCount();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  const visibleNavItems = navItems.filter((item) => {
    return !item.adminOnly || user?.role === "ADMIN";
  });
  const overviewNavItems = visibleNavItems.slice(0, 1);
  const managementNavItems = visibleNavItems.filter((item) => ["rooms", "devices", "report-new", "reports"].includes(item.key));
  const accountNavItems = visibleNavItems.filter((item) => ["profile", "organization", "users", "roles"].includes(item.key));

  return (
    <main className="app-shell dashboard-app admin-dark-app">
      <aside className="sidebar dashboard-sidebar admin-sidebar">
        <div className="sidebar-brand admin-brand">
          <img className="brand-icon" src="/logo_ptit.png" alt="EduTrack" />
          <div>
            <p>EduTrack</p>
            <span>Nền tảng quản lý CSVC đa trường</span>
          </div>
        </div>

        <section className="sidebar-organization-card" aria-label="Tổ chức hiện tại">
          <span>Trường / tổ chức</span>
          <strong>{organizationName}</strong>
          {organizationSlug && <em>{organizationSlug}</em>}
        </section>

        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {overviewNavItems.length > 0 && (
            <>
              <p className="nav-group-title">Tổng quan</p>
              {overviewNavItems.map((item) => (
                <Link key={item.key} className={active === item.key ? "sidebar-link active" : "sidebar-link"} to={item.to}>
                  <span>{item.icon}</span>
                  <em>{item.label}</em>
                </Link>
              ))}
            </>
          )}

          <p className="nav-group-title">Quản lý</p>
          {managementNavItems.map((item) => (
            <Link key={item.key} className={active === item.key ? "sidebar-link active" : "sidebar-link"} to={item.to}>
              <span>{item.icon}</span>
              <em>{item.label}</em>
            </Link>
          ))}

          <p className="nav-group-title">Tài khoản</p>
          {accountNavItems.map((item) => (
            <Link key={item.key} className={active === item.key ? "sidebar-link active" : "sidebar-link"} to={item.to}>
              <span>{item.icon}</span>
              <em>{item.label}</em>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <section className="sidebar-user-card" aria-label="Thông tin người dùng">
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <p>{displayName}</p>
              <span>{displayRole}</span>
            </div>
          </section>

          <button type="button" className="sidebar-logout-button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <section className="content-panel dashboard-content admin-content">
        <div className="admin-topbar">
          <div className="topbar-actions">
            <button
              type="button"
              className={active === "notifications" ? "notification-bell-button active" : "notification-bell-button"}
              onClick={() => navigate("/notifications")}
              aria-label={`Mở trung tâm thông báo${unreadCount > 0 ? `, có ${unreadCount} thông báo chưa đọc` : ""}`}
            >
              <span>!</span>
              {unreadCount > 0 && <strong>{unreadCount}</strong>}
            </button>
            <div className="topbar-user-chip"><span>{initial}</span>{user?.username || "user"}</div>
          </div>
        </div>

        <header className="page-header dashboard-header admin-page-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
