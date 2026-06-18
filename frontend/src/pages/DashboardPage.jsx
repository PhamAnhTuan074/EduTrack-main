import { useEffect, useMemo, useState } from "react";
import api from "../api";
import AppLayout from "../components/AppLayout";

const roleLabels = {
  ADMIN: "Quản trị viên",
  TECHNICIAN: "Kỹ thuật viên",
  REPORTER: "Người báo hỏng"
};

export default function DashboardPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [stats, setStats] = useState({
    totalRooms: 0,
    brokenDevices: 0,
    pendingReports: 0,
    topBrokenRooms: []
  });
  const [error, setError] = useState("");

  async function loadStats() {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được dữ liệu dashboard");
    }
  }

  useEffect(() => {
    if (user?.role) {
      loadStats();
    }
  }, [user?.role]);

  async function openExport(path, filename) {
    try {
      const res = await api.get(`/export/${path}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Không xuất được file báo cáo");
    }
  }

  const displayName = user?.fullName || user?.username || "Người dùng";
  const displayRole = roleLabels[user?.role] || user?.role || "Chưa có vai trò";

  return (
    <AppLayout
      active="dashboard"
      title="Trang chủ"
      subtitle={`Xin chào, ${displayName}`}
      user={user}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="summary-grid dashboard-grid">
        <article className="summary-card">
          <span>Tổng số phòng học</span>
          <strong>{stats.totalRooms}</strong>
        </article>
        <article className="summary-card">
          <span>Thiết bị đang hỏng</span>
          <strong>{stats.brokenDevices}</strong>
        </article>
        <article className="summary-card">
          <span>Phiếu mới chưa xử lý</span>
          <strong>{stats.pendingReports}</strong>
        </article>
        <article className="summary-card">
          <span>Vai trò hiện tại</span>
          <strong>{displayRole}</strong>
        </article>
      </div>

      <section className="table-section dashboard-section">
        <div className="section-heading-row">
          <h2>Top 5 phòng có nhiều thiết bị hỏng</h2>
          <div className="form-actions inline-actions">
            <button type="button" className="secondary-button" onClick={() => openExport("devices", "danh-sach-thiet-bi.csv")}>Xuất thiết bị</button>
            <button type="button" className="secondary-button" onClick={() => openExport("repair-logs", "lich-su-sua-chua.csv")}>Xuất lịch sử sửa</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Loại phòng</th>
              <th>Số thiết bị hỏng</th>
            </tr>
          </thead>
          <tbody>
            {stats.topBrokenRooms.length === 0 ? (
              <tr><td colSpan="3">Chưa có thiết bị hỏng</td></tr>
            ) : stats.topBrokenRooms.map((room) => (
              <tr key={room.roomId}>
                <td>{room.roomCode}</td>
                <td>{room.roomType}</td>
                <td>{room.brokenCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppLayout>
  );
}
