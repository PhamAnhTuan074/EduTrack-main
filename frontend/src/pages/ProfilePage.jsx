// Nguoi code: Phạm Anh Tuấn. Pham vi: ho so ca nhan va doi mat khau.

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import api from "../api";

const emptyProfile = {
  fullName: "",
  username: "",
  email: "",
  birthYear: "",
  address: "",
  phone: ""
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export default function ProfilePage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [profile, setProfile] = useState(emptyProfile);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadProfile() {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/users/profile");
      setProfile({
        fullName: res.data.fullName || "",
        username: res.data.username || "",
        email: res.data.email || "",
        birthYear: res.data.birthYear || "",
        address: res.data.address || "",
        phone: res.data.phone || ""
      });
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được hồ sơ cá nhân");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function updateProfileField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const res = await api.put("/users/profile", {
        fullName: profile.fullName,
        email: profile.email,
        birthYear: profile.birthYear,
        address: profile.address,
        phone: profile.phone
      });

      const nextUser = {
        ...user,
        fullName: res.data.fullName,
        email: res.data.email,
        birthYear: res.data.birthYear,
        address: res.data.address,
        phone: res.data.phone,
        organization: res.data.organization || user?.organization
      };

      localStorage.setItem("user", JSON.stringify(nextUser));
      setMessage("Cập nhật hồ sơ thành công");
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được hồ sơ");
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }

    try {
      await api.put("/users/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      setPasswordForm(emptyPasswordForm);
      setMessage("Đổi mật khẩu thành công");
    } catch (err) {
      setError(err.response?.data?.message || "Không đổi được mật khẩu");
    }
  }

  return (
    <AppLayout
      active="profile"
      title="Hồ sơ cá nhân"
      subtitle="Cập nhật thông tin liên hệ và bảo mật tài khoản"
      user={user}
    >
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="profile-page-grid">
        <form className="organization-settings-panel" onSubmit={handleProfileSubmit}>
          <div className="organization-settings-header">
            <div>
              <span>Tài khoản</span>
              <strong>{profile.username || "..."}</strong>
            </div>
            <small>{isLoading ? "Đang tải hồ sơ..." : "Thông tin liên hệ dùng trong nội bộ tổ chức."}</small>
          </div>

          <div className="modal-grid">
            <label className="span-2">
              Họ tên *
              <input
                value={profile.fullName}
                onChange={(e) => updateProfileField("fullName", e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={profile.email}
                onChange={(e) => updateProfileField("email", e.target.value)}
                placeholder="user@school.edu.vn"
              />
            </label>
            <label>
              Năm sinh
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={profile.birthYear}
                onChange={(e) => updateProfileField("birthYear", e.target.value)}
                placeholder="1998"
              />
            </label>
            <label>
              Số điện thoại
              <input
                value={profile.phone}
                onChange={(e) => updateProfileField("phone", e.target.value)}
                placeholder="09..."
              />
            </label>
            <label>
              Địa chỉ
              <input
                value={profile.address}
                onChange={(e) => updateProfileField("address", e.target.value)}
                placeholder="Địa chỉ liên hệ"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={isLoading}>Lưu hồ sơ</button>
          </div>
        </form>

        <form className="organization-settings-panel" onSubmit={handlePasswordSubmit}>
          <div className="organization-settings-header">
            <div>
              <span>Bảo mật</span>
              <strong>Mật khẩu</strong>
            </div>
            <small>Mật khẩu mới cần tối thiểu 6 ký tự.</small>
          </div>

          <div className="modal-grid single-column">
            <label>
              Mật khẩu hiện tại *
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label>
              Mật khẩu mới *
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => updatePasswordField("newPassword", e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label>
              Xác nhận mật khẩu mới *
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => updatePasswordField("confirmPassword", e.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="submit">Đổi mật khẩu</button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
