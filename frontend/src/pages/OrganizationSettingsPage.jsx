// Nguoi code: Phạm Anh Tuấn. Pham vi: cau hinh thong tin to chuc.

import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import api from "../api";

const emptyForm = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  email: ""
};

export default function OrganizationSettingsPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const canEdit = user?.role === "ADMIN";

  async function loadOrganization() {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/organizations/current");
      setForm({
        name: res.data.name || "",
        slug: res.data.slug || "",
        address: res.data.address || "",
        phone: res.data.phone || "",
        email: res.data.email || ""
      });
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được thông tin tổ chức");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrganization();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!canEdit) {
      setError("Bạn không có quyền cập nhật thông tin tổ chức");
      return;
    }

    try {
      const res = await api.put("/organizations/current", {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email
      });

      const nextUser = {
        ...user,
        organization: {
          ...user.organization,
          name: res.data.name,
          slug: res.data.slug
        }
      };
      localStorage.setItem("user", JSON.stringify(nextUser));
      setMessage("Cập nhật thông tin tổ chức thành công");
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được thông tin tổ chức");
    }
  }

  return (
    <AppLayout
      active="organization"
      title="Thông tin tổ chức"
      subtitle="Quản lý hồ sơ trường học hoặc học viện đang sử dụng nền tảng"
      user={user}
    >
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <form className="organization-settings-panel" onSubmit={handleSubmit}>
        <div className="organization-settings-header">
          <div>
            <span>Mã trường</span>
            <strong>{form.slug || "..."}</strong>
          </div>
          <small>{canEdit ? "Admin có thể cập nhật thông tin liên hệ của trường." : "Bạn đang ở chế độ xem."}</small>
        </div>

        {isLoading ? (
          <section className="empty-panel">Đang tải thông tin tổ chức...</section>
        ) : (
          <div className="modal-grid">
            <label className="span-2">
              Tên trường / tổ chức *
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={!canEdit}
                placeholder="Tên trường hoặc học viện"
              />
            </label>
            <label>
              Email liên hệ
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                disabled={!canEdit}
                placeholder="contact@school.edu.vn"
              />
            </label>
            <label>
              Số điện thoại
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                disabled={!canEdit}
                placeholder="024..."
              />
            </label>
            <label className="span-2">
              Địa chỉ
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                disabled={!canEdit}
                placeholder="Địa chỉ trường/học viện"
              />
            </label>
          </div>
        )}

        {canEdit && (
          <div className="modal-actions">
            <button type="submit" disabled={isLoading}>Lưu thông tin</button>
          </div>
        )}
      </form>
    </AppLayout>
  );
}
