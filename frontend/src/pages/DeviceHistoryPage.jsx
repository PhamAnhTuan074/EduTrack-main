// Nguoi code: Nguyễn Ngọc Phương. Pham vi: lich su sua chua thiet bi.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";

const statusLabels = {
  GOOD: "Hoạt động tốt",
  BROKEN: "Hỏng",
  REPAIRING: "Đang bảo trì"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

function formatDate(value) {
  if (!value) return "Chưa có ngày";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function getStatusClass(status) {
  if (status === "GOOD") return "status-pill good";
  if (status === "BROKEN") return "status-pill danger";
  return "status-pill warning";
}

export default function DeviceHistoryPage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [device, setDevice] = useState(null);
  const [repairLogs, setRepairLogs] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const canViewRepairHistory = user?.role === "ADMIN" || user?.role === "TECHNICIAN";
  const canCreateRepairLog = canViewRepairHistory;

  const loadHistory = useCallback(async function loadHistory() {
    if (!canViewRepairHistory) {
      setError(permissionDeniedMessage);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await api.get(`/devices/${deviceId}/repair-logs`);
      setDevice(res.data.device);
      setRepairLogs(res.data.repairLogs || []);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được lịch sử sửa chữa");
    } finally {
      setIsLoading(false);
    }
  }, [canViewRepairHistory, deviceId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <AppLayout
      active="devices"
      title={`Lịch sử sửa chữa${device?.code ? `: ${device.code}` : ""}`}
      subtitle={device ? `${device.name} - Phòng ${device.room?.code || "chưa rõ"}` : "Theo dõi các lần bảo trì của thiết bị"}
      user={user}
    >
      {!canViewRepairHistory ? (
        <section className="empty-panel">{permissionDeniedMessage}</section>
      ) : (
        <>
          <div className="admin-page-toolbar history-page-toolbar">
            <div className="history-breadcrumb" aria-label="Đường dẫn">
              <button type="button" onClick={() => navigate("/dashboard")}>Trang chủ</button>
              <span>/</span>
              <button type="button" onClick={() => navigate("/devices")}>Thiết bị</button>
              {device?.room?.id && (
                <>
                  <span>/</span>
                  <button type="button" onClick={() => navigate(`/devices?roomId=${device.room.id}`)}>Phòng {device.room.code}</button>
                </>
              )}
            </div>

            <div className="history-toolbar-actions">
              <button type="button" className="secondary-button" onClick={() => navigate("/devices")}>Quay lại thiết bị</button>
              {canCreateRepairLog && (
                <button type="button" className="primary-action" onClick={() => navigate(`/repair-logs/new?deviceId=${deviceId}`)}>
                  Ghi sửa chữa
                </button>
              )}
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <section className="repair-summary-panel history-summary-panel">
            <div>
              <span>Mã thiết bị</span>
              <strong>{device?.code || "Đang tải..."}</strong>
            </div>
            <div>
              <span>Tên thiết bị</span>
              <strong>{device?.name || "Đang tải..."}</strong>
            </div>
            <div>
              <span>Phòng</span>
              <strong>{device?.room?.code || "Chưa rõ"}</strong>
            </div>
          </section>

          <section className="dark-table-wrap history-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Ngày sửa</th>
                  <th>Nội dung sửa</th>
                  <th>Kỹ thuật viên</th>
                  <th>Số lượng</th>
                  <th>Trạng thái sau sửa</th>
                  <th>Phiếu liên quan</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="6" className="history-empty-cell">Đang tải dữ liệu...</td></tr>
                ) : repairLogs.length === 0 ? (
                  <tr><td colSpan="6" className="history-empty-cell">Thiết bị chưa có lịch sử sửa chữa</td></tr>
                ) : repairLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.repairedAt)}</td>
                    <td className="history-content-cell">{log.content}</td>
                    <td>{log.technician?.fullName || log.technician?.username || "Chưa rõ"}</td>
                    <td>{log.quantity}</td>
                    <td>
                      <span className={getStatusClass(log.afterStatus)}>
                        {statusLabels[log.afterStatus] || log.afterStatus}
                      </span>
                    </td>
                    <td>{log.report ? `#${log.report.id}` : "Không có"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </AppLayout>
  );
}
