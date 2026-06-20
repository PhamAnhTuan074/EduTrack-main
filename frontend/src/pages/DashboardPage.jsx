// Nguoi code: Nguyen Ngoc Phuong. Pham vi: dashboard thong ke tong quan.

import { useEffect, useMemo, useState } from "react";
import api from "../api";
import AppLayout from "../components/AppLayout";

const roleLabels = {
  ADMIN: "Quản trị viên",
  TECHNICIAN: "Kỹ thuật viên",
  REPORTER: "Người báo hỏng"
};

const deviceStatusLabels = {
  GOOD: "Hoạt động tốt",
  BROKEN: "Đang hỏng",
  REPAIRING: "Đang sửa"
};

const reportStatusLabels = {
  PENDING: "Chưa xử lý",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã xử lý"
};

const defaultStats = {
  totalRooms: 0,
  totalDevices: 0,
  totalReports: 0,
  brokenDevices: 0,
  pendingReports: 0,
  inProgressReports: 0,
  processedReports: 0,
  deviceStatusCounts: {
    GOOD: 0,
    BROKEN: 0,
    REPAIRING: 0
  },
  reportStatusCounts: {
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0
  },
  topBrokenRooms: []
};

const chartColors = {
  room: "#2563eb",
  device: "#0f766e",
  good: "#059669",
  broken: "#dc2626",
  repairing: "#d97706",
  pending: "#f59e0b",
  progress: "#2563eb",
  completed: "#059669"
};

function getListTotal(payload) {
  if (payload?.meta && Number.isFinite(Number(payload.meta.total))) {
    return Number(payload.meta.total);
  }

  if (Array.isArray(payload?.data)) {
    return payload.data.length;
  }

  if (Array.isArray(payload)) {
    return payload.length;
  }

  return 0;
}

function buildTopBrokenRooms(devices, fallbackRooms) {
  if (!Array.isArray(devices) || devices.length === 0) {
    return fallbackRooms || [];
  }

  const groupedRooms = new Map();

  devices
    .filter((device) => device.status === "BROKEN")
    .forEach((device) => {
      const roomId = device.room?.id || device.roomId || "unknown";
      const current = groupedRooms.get(roomId) || {
        roomId,
        roomCode: device.room?.code || "Không rõ",
        roomType: device.room?.type || "OTHER",
        brokenCount: 0
      };

      current.brokenCount += 1;
      groupedRooms.set(roomId, current);
    });

  return Array.from(groupedRooms.values())
    .sort((a, b) => b.brokenCount - a.brokenCount)
    .slice(0, 5);
}

async function loadSyncedStats(baseStats) {
  const [roomsRes, allDevicesRes, goodDevicesRes, brokenDevicesRes, repairingDevicesRes] = await Promise.all([
    api.get("/rooms", { params: { page: 1, limit: 1 } }),
    api.get("/devices"),
    api.get("/devices", { params: { status: "GOOD", page: 1, limit: 1 } }),
    api.get("/devices", { params: { status: "BROKEN", page: 1, limit: 1 } }),
    api.get("/devices", { params: { status: "REPAIRING", page: 1, limit: 1 } })
  ]);

  const allDevices = Array.isArray(allDevicesRes.data) ? allDevicesRes.data : allDevicesRes.data?.data || [];
  const deviceStatusCounts = {
    GOOD: getListTotal(goodDevicesRes.data),
    BROKEN: getListTotal(brokenDevicesRes.data),
    REPAIRING: getListTotal(repairingDevicesRes.data)
  };

  const nextStats = {
    ...baseStats,
    totalRooms: getListTotal(roomsRes.data),
    totalDevices: allDevices.length,
    brokenDevices: deviceStatusCounts.BROKEN,
    deviceStatusCounts,
    topBrokenRooms: buildTopBrokenRooms(allDevices, baseStats.topBrokenRooms)
  };

  const reportResults = await Promise.allSettled([
    api.get("/reports", { params: { status: "PENDING", page: 1, limit: 1 } }),
    api.get("/reports", { params: { status: "IN_PROGRESS", page: 1, limit: 1 } }),
    api.get("/reports", { params: { status: "COMPLETED", page: 1, limit: 1 } })
  ]);

  if (reportResults.every((result) => result.status === "fulfilled")) {
    const reportStatusCounts = {
      PENDING: getListTotal(reportResults[0].value.data),
      IN_PROGRESS: getListTotal(reportResults[1].value.data),
      COMPLETED: getListTotal(reportResults[2].value.data)
    };

    return {
      ...nextStats,
      totalReports: reportStatusCounts.PENDING + reportStatusCounts.IN_PROGRESS + reportStatusCounts.COMPLETED,
      pendingReports: reportStatusCounts.PENDING,
      inProgressReports: reportStatusCounts.IN_PROGRESS,
      processedReports: reportStatusCounts.COMPLETED,
      reportStatusCounts
    };
  }

  return nextStats;
}

function BarChart({ title, data, emptyText }) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <section className="dashboard-chart-card" aria-label={title}>
      <div className="dashboard-chart-heading">
        <h2>{title}</h2>
      </div>

      {maxValue === 0 ? (
        <p className="dashboard-chart-empty">{emptyText}</p>
      ) : (
        <div className="dashboard-bar-chart">
          {data.map((item) => {
            const width = `${Math.round((item.value / maxValue) * 100)}%`;

            return (
              <div className="dashboard-bar-row" key={item.label}>
                <div className="dashboard-bar-label">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <div className="dashboard-bar-track">
                  <span style={{ width, backgroundColor: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DonutChart({ title, total, data }) {
  let current = 0;
  const gradient = total > 0
    ? data.map((item) => {
        const start = current;
        const value = (item.value / total) * 100;
        current += value;
        return `${item.color} ${start}% ${current}%`;
      }).join(", ")
    : "#e5e7eb 0% 100%";

  return (
    <section className="dashboard-chart-card dashboard-donut-card" aria-label={title}>
      <div className="dashboard-chart-heading">
        <h2>{title}</h2>
      </div>

      <div className="dashboard-donut-layout">
        <div className="dashboard-donut" style={{ background: `conic-gradient(${gradient})` }}>
          <span>{total}</span>
          <small>Tổng phiếu</small>
        </div>

        <div className="dashboard-legend">
          {data.map((item) => (
            <div className="dashboard-legend-item" key={item.label}>
              <span style={{ backgroundColor: item.color }} />
              <p>{item.label}</p>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [stats, setStats] = useState(defaultStats);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const dashboardRes = await api.get("/dashboard/stats");
        const dashboardStats = {
          ...defaultStats,
          ...dashboardRes.data,
          deviceStatusCounts: {
            ...defaultStats.deviceStatusCounts,
            ...(dashboardRes.data.deviceStatusCounts || {})
          },
          reportStatusCounts: {
            ...defaultStats.reportStatusCounts,
            ...(dashboardRes.data.reportStatusCounts || {})
          },
          topBrokenRooms: dashboardRes.data.topBrokenRooms || []
        };

        const syncedStats = await loadSyncedStats(dashboardStats);
        setStats(syncedStats);
      } catch (err) {
        setError(err.response?.data?.message || "Không tải được dữ liệu dashboard");
      }
    }

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
  const reportStatusCounts = stats.reportStatusCounts || defaultStats.reportStatusCounts;
  const deviceStatusCounts = stats.deviceStatusCounts || defaultStats.deviceStatusCounts;
  const topBrokenRooms = stats.topBrokenRooms || [];

  const overviewChartData = [
    { label: "Phòng học", value: stats.totalRooms, color: chartColors.room },
    { label: "Thiết bị học", value: stats.totalDevices, color: chartColors.device },
    { label: "Thiết bị hỏng", value: stats.brokenDevices, color: chartColors.broken }
  ];

  const deviceStatusChartData = [
    { label: deviceStatusLabels.GOOD, value: deviceStatusCounts.GOOD || 0, color: chartColors.good },
    { label: deviceStatusLabels.REPAIRING, value: deviceStatusCounts.REPAIRING || 0, color: chartColors.repairing },
    { label: deviceStatusLabels.BROKEN, value: deviceStatusCounts.BROKEN || 0, color: chartColors.broken }
  ];

  const reportStatusChartData = [
    { label: reportStatusLabels.PENDING, value: reportStatusCounts.PENDING || 0, color: chartColors.pending },
    { label: reportStatusLabels.IN_PROGRESS, value: reportStatusCounts.IN_PROGRESS || 0, color: chartColors.progress },
    { label: reportStatusLabels.COMPLETED, value: reportStatusCounts.COMPLETED || 0, color: chartColors.completed }
  ];

  const topRoomChartData = topBrokenRooms.map((room) => ({
    label: room.roomCode,
    value: room.brokenCount,
    color: chartColors.broken
  }));

  return (
    <AppLayout
      active="dashboard"
      title="Trang chủ"
      subtitle={`Xin chào, ${displayName} - ${displayRole}`}
      user={user}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="summary-grid dashboard-grid">
        <article className="summary-card">
          <span>Tổng số phòng học</span>
          <strong>{stats.totalRooms}</strong>
        </article>
        <article className="summary-card">
          <span>Tổng thiết bị học</span>
          <strong>{stats.totalDevices}</strong>
        </article>
        <article className="summary-card">
          <span>Thiết bị đang hỏng</span>
          <strong>{stats.brokenDevices}</strong>
        </article>
        <article className="summary-card">
          <span>Phiếu chưa xử lý</span>
          <strong>{stats.pendingReports}</strong>
        </article>
        <article className="summary-card">
          <span>Phiếu đã xử lý</span>
          <strong>{stats.processedReports}</strong>
        </article>
      </div>

      <div className="dashboard-chart-grid">
        <BarChart
          title="Tổng quan phòng học và thiết bị"
          data={overviewChartData}
          emptyText="Chưa có dữ liệu phòng học hoặc thiết bị"
        />

        <DonutChart
          title="Tình trạng phiếu báo hỏng"
          total={stats.totalReports}
          data={reportStatusChartData}
        />

        <BarChart
          title="Tình trạng thiết bị"
          data={deviceStatusChartData}
          emptyText="Chưa có dữ liệu thiết bị"
        />

        <BarChart
          title="Top phòng có thiết bị hỏng"
          data={topRoomChartData}
          emptyText="Chưa có thiết bị hỏng"
        />
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
            {topBrokenRooms.length === 0 ? (
              <tr><td colSpan="3">Chưa có thiết bị hỏng</td></tr>
            ) : topBrokenRooms.map((room) => (
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
