import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../api";

const emptyForm = {
  organizationName: "",
  organizationSlug: "",
  address: "",
  phone: "",
  email: "",
  fullName: "",
  username: "admin",
  password: ""
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => {
      if (field === "organizationName" && !current.organizationSlug) {
        return { ...current, organizationName: value, organizationSlug: slugify(value) };
      }

      if (field === "organizationSlug") {
        return { ...current, organizationSlug: slugify(value) };
      }

      return { ...current, [field]: value };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await api.post("/auth/organizations", form);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Không tạo được tài khoản tổ chức");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell register-shell" aria-label="Đăng ký tổ chức giáo dục">
        <aside className="login-brand-panel">
          <div className="login-logo" aria-label="EduTrack">
            <span>EduTrack</span>
            <small>Organization onboarding</small>
          </div>

          <div className="login-brand-copy">
            <h1>Tạo không gian quản lý cho trường của bạn</h1>
            <p>Sau khi đăng ký, dữ liệu phòng học, thiết bị, phiếu báo hỏng và người dùng của trường sẽ được tách riêng.</p>
          </div>

          <p className="login-brand-footer">Một mã trường duy nhất, một vùng dữ liệu riêng.</p>
        </aside>

        <form className="login-form-panel register-form-panel" onSubmit={handleSubmit}>
          <div className="login-form-heading">
            <h2>Đăng ký tổ chức</h2>
            <p className="login-helper">Tạo trường/học viện và tài khoản admin đầu tiên</p>
          </div>

          <div className="register-grid">
            <label className="login-field">
              <span>Tên trường / tổ chức *</span>
              <input
                value={form.organizationName}
                onChange={(e) => updateField("organizationName", e.target.value)}
                placeholder="Học viện Công nghệ..."
              />
            </label>

            <label className="login-field">
              <span>Mã trường *</span>
              <input
                value={form.organizationSlug}
                onChange={(e) => updateField("organizationSlug", e.target.value)}
                placeholder="ptit"
              />
            </label>

            <label className="login-field">
              <span>Email liên hệ</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="contact@school.edu.vn"
              />
            </label>

            <label className="login-field">
              <span>Số điện thoại</span>
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="024..."
              />
            </label>

            <label className="login-field span-2">
              <span>Địa chỉ</span>
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Địa chỉ trường/học viện"
              />
            </label>

            <label className="login-field">
              <span>Họ tên admin *</span>
              <input
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </label>

            <label className="login-field">
              <span>Username admin *</span>
              <input
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="admin"
              />
            </label>

            <label className="login-field span-2">
              <span>Mật khẩu admin *</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
            </label>
          </div>

          {error && <p className="error-message login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo tổ chức..." : "Tạo tổ chức"}
          </button>

          <p className="auth-switch-text">
            Đã có mã trường? <Link to="/login">Đăng nhập</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
