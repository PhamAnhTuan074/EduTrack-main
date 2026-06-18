import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [organizationSlug, setOrganizationSlug] = useState("ptit");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [rememberAccount, setRememberAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await api.post("/auth/login", { organizationSlug, username, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate(res.data.user?.role === "SYSTEM_ADMIN" ? "/system/organizations" : "/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không kết nối được backend. Hãy kiểm tra backend đang chạy và CORS đúng port frontend."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Đăng nhập hệ thống quản lý cơ sở vật chất đa trường">
        <aside className="login-brand-panel">
          <div className="login-logo" aria-label="Nền tảng quản lý cơ sở vật chất">
            <span>EduTrack</span>
            <small>Multi-school facility platform</small>
          </div>

          <div className="login-brand-copy">
            <h1>Nền tảng quản lý cơ sở vật chất giáo dục</h1>
            <p>Mỗi trường học có không gian dữ liệu riêng để quản lý phòng học, thiết bị, báo hỏng và sửa chữa.</p>
          </div>

          <p className="login-brand-footer">Dùng thử: system / systemadmin / 123456 hoặc ptit / admin / 123456</p>
        </aside>

        <form className="login-form-panel" onSubmit={handleLogin}>
          <div className="login-form-heading">
            <h2>Đăng nhập hệ thống</h2>
            <p className="login-welcome">Chào mừng bạn quay lại</p>
            <p className="login-helper">Nhập mã trường để truy cập đúng dữ liệu, hoặc dùng mã system cho quản trị nền tảng</p>
          </div>

          <label className="login-field" htmlFor="organizationSlug">
            <span>Mã trường / tổ chức</span>
            <input
              id="organizationSlug"
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
              autoComplete="organization"
              placeholder="ptit hoặc system"
            />
          </label>

          <label className="login-field" htmlFor="username">
            <span>Tên đăng nhập</span>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
            />
          </label>

          <label className="login-field" htmlFor="password">
            <span>Mật khẩu</span>
            <div className="password-control">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="********"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </label>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={rememberAccount}
              onChange={(e) => setRememberAccount(e.target.checked)}
            />
            <span>Lưu tài khoản trên thiết bị này</span>
          </label>

          {error && <p className="error-message login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <p className="auth-switch-text">
            Chưa có tài khoản trường? <Link to="/register">Đăng ký tổ chức</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
