import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import ListControls from "../components/ListControls";
import api from "../api";

const emptyAdminForm = {
  mode: "create",
  organizationId: null,
  organizationName: "",
  userId: null,
  fullName: "",
  username: "admin",
  email: "",
  phone: "",
  status: "ACTIVE",
  password: "123456"
};

const statusLabels = {
  ACTIVE: "Đang hoạt động",
  LOCKED: "Đã khóa"
};

const sortOptions = [
  { value: "createdAt", label: "Ngày đăng ký" },
  { value: "name", label: "Tên trường" },
  { value: "slug", label: "Mã trường" },
  { value: "status", label: "Trạng thái" },
  { value: "updatedAt", label: "Cập nhật gần nhất" }
];

export default function SystemOrganizationsPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    lockedOrganizations: 0,
    totalUsers: 0
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [meta, setMeta] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminForm, setAdminForm] = useState(null);

  async function loadStats() {
    try {
      const res = await api.get("/system/stats");
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được thống kê hệ thống");
    }
  }

  async function loadOrganizations(nextPage = page) {
    try {
      setError("");
      const res = await api.get("/system/organizations", {
        params: {
          search,
          status: statusFilter,
          page: nextPage,
          limit: pageSize,
          sortBy,
          order
        }
      });

      setOrganizations(res.data.data || []);
      setMeta(res.data.meta || null);
      setPage(nextPage);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách trường");
    }
  }

  useEffect(() => {
    if (user?.role === "SYSTEM_ADMIN") {
      loadStats();
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === "SYSTEM_ADMIN") {
      loadOrganizations();
    }
  }, [statusFilter, page, pageSize, sortBy, order, user?.role]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize, sortBy, order]);

  function openCreateAdmin(organization) {
    setAdminForm({
      ...emptyAdminForm,
      mode: "create",
      organizationId: organization.id,
      organizationName: organization.name,
      username: "admin"
    });
  }

  function openEditAdmin(organization, admin) {
    setAdminForm({
      ...emptyAdminForm,
      mode: "edit",
      organizationId: organization.id,
      organizationName: organization.name,
      userId: admin.id,
      fullName: admin.fullName || "",
      username: admin.username || "",
      email: admin.email || "",
      phone: admin.phone || "",
      status: admin.status || "ACTIVE",
      password: ""
    });
  }

  function updateAdminField(field, value) {
    setAdminForm((current) => ({ ...current, [field]: value }));
  }

  async function toggleOrganizationStatus(organization) {
    const nextStatus = organization.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    setMessage("");
    setError("");

    try {
      await api.patch(`/system/organizations/${organization.id}/status`, { status: nextStatus });
      setMessage(`${nextStatus === "ACTIVE" ? "Mở khóa" : "Khóa"} trường ${organization.name} thành công`);
      await Promise.all([loadStats(), loadOrganizations()]);
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được trạng thái trường");
    }
  }

  async function submitAdminForm(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        fullName: adminForm.fullName,
        username: adminForm.username,
        email: adminForm.email,
        phone: adminForm.phone,
        status: adminForm.status
      };

      if (adminForm.mode === "create") {
        await api.post(`/system/organizations/${adminForm.organizationId}/admins`, {
          ...payload,
          password: adminForm.password
        });
        setMessage(`Tạo admin cho ${adminForm.organizationName} thành công`);
      } else {
        await api.put(`/system/organizations/${adminForm.organizationId}/admins/${adminForm.userId}`, payload);

        if (adminForm.password.trim()) {
          await api.put(`/system/organizations/${adminForm.organizationId}/admins/${adminForm.userId}/password`, {
            newPassword: adminForm.password
          });
        }

        setMessage(`Cập nhật admin của ${adminForm.organizationName} thành công`);
      }

      setAdminForm(null);
      await Promise.all([loadStats(), loadOrganizations()]);
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được tài khoản admin trường");
    }
  }

  if (user?.role !== "SYSTEM_ADMIN") {
    return (
      <AppLayout active="system-organizations" title="Quản trị hệ thống" user={user}>
        <section className="empty-panel">Bạn không có quyền quản lý cấp hệ thống.</section>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      active="system-organizations"
      title="Quản lý trường / tổ chức"
      subtitle="Admin cấp hệ thống quản lý các tổ chức sử dụng EduTrack và tài khoản admin của từng trường"
      user={user}
    >
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="summary-grid dashboard-grid">
        <article className="summary-card">
          <span>Tổng số trường</span>
          <strong>{stats.totalOrganizations}</strong>
        </article>
        <article className="summary-card">
          <span>Đang hoạt động</span>
          <strong>{stats.activeOrganizations}</strong>
        </article>
        <article className="summary-card">
          <span>Đã khóa</span>
          <strong>{stats.lockedOrganizations}</strong>
        </article>
        <article className="summary-card">
          <span>Người dùng cấp trường</span>
          <strong>{stats.totalUsers}</strong>
        </article>
      </section>

      <section className="admin-page-toolbar system-toolbar">
        <div className="admin-search-box">
          <span>Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên trường, mã trường, email, số điện thoại"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
        <button type="button" onClick={() => loadOrganizations(1)}>Tìm kiếm</button>
      </section>

      <ListControls
        meta={meta}
        sortBy={sortBy}
        order={order}
        pageSize={pageSize}
        sortOptions={sortOptions}
        onPageChange={loadOrganizations}
        onSortChange={setSortBy}
        onOrderChange={setOrder}
        onPageSizeChange={setPageSize}
      />

      <section className="table-section role-table-section">
        <table className="admin-data-table system-organizations-table">
          <thead>
            <tr>
              <th>Trường / tổ chức</th>
              <th>Liên hệ</th>
              <th>Dữ liệu</th>
              <th>Admin trường</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr><td colSpan="6">Chưa có trường phù hợp</td></tr>
            ) : organizations.map((organization) => (
              <tr key={organization.id}>
                <td>
                  <div className="system-organization-cell">
                    <strong>{organization.name}</strong>
                    <span>{organization.slug}</span>
                    <small>{new Date(organization.createdAt).toLocaleDateString("vi-VN")}</small>
                  </div>
                </td>
                <td>
                  <div className="system-organization-cell">
                    <span>{organization.email || "Chưa có email"}</span>
                    <span>{organization.phone || "Chưa có số điện thoại"}</span>
                    <small>{organization.address || "Chưa có địa chỉ"}</small>
                  </div>
                </td>
                <td>
                  <div className="system-count-grid">
                    <span>{organization.counts?.users || 0} người dùng</span>
                    <span>{organization.counts?.rooms || 0} phòng</span>
                    <span>{organization.counts?.devices || 0} thiết bị</span>
                    <span>{organization.counts?.reports || 0} phiếu</span>
                  </div>
                </td>
                <td>
                  <div className="admin-account-list">
                    {(organization.users || []).length === 0 ? (
                      <span>Chưa có admin</span>
                    ) : organization.users.map((admin) => (
                      <button type="button" className="secondary-button" key={admin.id} onClick={() => openEditAdmin(organization, admin)}>
                        {admin.fullName} ({admin.username})
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={organization.status === "ACTIVE" ? "status-pill good" : "status-pill danger"}>
                    {statusLabels[organization.status] || organization.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button type="button" onClick={() => openCreateAdmin(organization)}>Thêm admin</button>
                    <button type="button" className="secondary-button" onClick={() => toggleOrganizationStatus(organization)}>
                      {organization.status === "ACTIVE" ? "Khóa trường" : "Mở khóa"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {adminForm && (
        <div className="modal-backdrop">
          <form className="admin-modal" onSubmit={submitAdminForm}>
            <div className="modal-header">
              <h2>{adminForm.mode === "create" ? "Thêm admin trường" : "Cập nhật admin trường"}</h2>
              <button type="button" onClick={() => setAdminForm(null)}>×</button>
            </div>

            <div className="modal-grid">
              <label className="span-2">
                Trường
                <input value={adminForm.organizationName} disabled />
              </label>
              <label>
                Họ tên *
                <input value={adminForm.fullName} onChange={(e) => updateAdminField("fullName", e.target.value)} />
              </label>
              <label>
                Username *
                <input value={adminForm.username} onChange={(e) => updateAdminField("username", e.target.value)} />
              </label>
              <label>
                Email
                <input type="email" value={adminForm.email} onChange={(e) => updateAdminField("email", e.target.value)} />
              </label>
              <label>
                Số điện thoại
                <input value={adminForm.phone} onChange={(e) => updateAdminField("phone", e.target.value)} />
              </label>
              <label>
                Trạng thái
                <select value={adminForm.status} onChange={(e) => updateAdminField("status", e.target.value)}>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="LOCKED">Đã khóa</option>
                </select>
              </label>
              <label>
                {adminForm.mode === "create" ? "Mật khẩu *" : "Mật khẩu mới"}
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => updateAdminField("password", e.target.value)}
                  placeholder={adminForm.mode === "create" ? "Tối thiểu 6 ký tự" : "Bỏ trống nếu không đổi"}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setAdminForm(null)}>Hủy</button>
              <button type="submit">Lưu admin</button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
