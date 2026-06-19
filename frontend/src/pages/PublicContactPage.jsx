// Nguoi code: Phạm Anh Tuấn. Pham vi: trang lien he public.

import { useState } from "react";
import PublicShell from "../components/PublicShell";

const emptyForm = {
  organization: "",
  contactName: "",
  email: "",
  message: ""
};

export default function PublicContactPage() {
  const [form, setForm] = useState(emptyForm);
  const [sent, setSent] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setSent(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    setForm(emptyForm);
  }

  return (
    <PublicShell active="contact">
      <section className="public-page-band">
        <p className="public-eyebrow">Liên hệ</p>
        <h1>Trao đổi nhu cầu triển khai EduTrack</h1>
        <p>
          Gửi thông tin trường học, học viện hoặc tổ chức giáo dục để lên cấu hình ban đầu,
          tài khoản admin và quy trình quản lý thiết bị phù hợp.
        </p>
      </section>

      <section className="public-section public-contact-layout">
        <form className="public-contact-form" onSubmit={handleSubmit}>
          <label>
            Tên trường / tổ chức
            <input
              value={form.organization}
              onChange={(e) => updateField("organization", e.target.value)}
              placeholder="Tên trường hoặc học viện"
              required
            />
          </label>

          <label>
            Người liên hệ
            <input
              value={form.contactName}
              onChange={(e) => updateField("contactName", e.target.value)}
              placeholder="Họ tên"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="contact@school.edu.vn"
              required
            />
          </label>

          <label>
            Nội dung
            <textarea
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              rows="5"
              placeholder="Nhu cầu quản lý phòng học, thiết bị, báo hỏng hoặc sửa chữa"
              required
            />
          </label>

          {sent && <p className="success-message">Thông tin đã được ghi nhận trên giao diện demo.</p>}
          <button type="submit">Gửi liên hệ</button>
        </form>

        <aside className="public-contact-info">
          <strong>EduTrack</strong>
          <p>Hỗ trợ mô hình nhiều trường học, phân quyền nội bộ và quản lý vòng đời thiết bị.</p>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>contact@edutrack.local</dd>
            </div>
            <div>
              <dt>Phạm vi</dt>
              <dd>Phòng học, thiết bị, báo hỏng, sửa chữa, báo cáo</dd>
            </div>
            <div>
              <dt>Tài khoản thử</dt>
              <dd>Mã trường ptit, admin / 123456</dd>
            </div>
          </dl>
        </aside>
      </section>
    </PublicShell>
  );
}
