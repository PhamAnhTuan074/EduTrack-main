import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";

const today = new Date().toISOString().slice(0, 10);

const statusLabels = {
  GOOD: "Tốt",
  BROKEN: "Hỏng",
  REPAIRING: "Đang sửa chữa"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

export default function RepairLogFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const deviceId = searchParams.get("deviceId") || "";
  const reportId = searchParams.get("reportId") || "";
  const isCompletingReport = searchParams.get("complete") === "1";
  const canCreateRepairLog = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  const [device, setDevice] = useState(null);
  const [form, setForm] = useState({
    quantity: 1,
    repairedAt: today,
    content: "",
    afterStatus: "GOOD"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDeviceInfo() {
    if (!canCreateRepairLog) {
      return;
    }

    if (!deviceId) {
      return;
    }

    try {
      const res = await api.get(`/devices/${deviceId}/repair-logs`);
      setDevice(res.data.device);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được thông tin thiết bị");
    }
  }

  useEffect(() => {
    loadDeviceInfo();
  }, [deviceId, canCreateRepairLog]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!canCreateRepairLog) {
      setError(permissionDeniedMessage);
      return;
    }

    try {
      const payload = {
        deviceId: Number(deviceId),
        reportId: reportId ? Number(reportId) : undefined,
        quantity: Number(form.quantity),
        repairedAt: form.repairedAt,
        content: form.content,
        afterStatus: isCompletingReport ? "GOOD" : form.afterStatus
      };

      await api.post("/repair-logs", payload);
      if (reportId) {
        navigate("/reports", {
          state: {
            message: isCompletingReport
              ? `Đã lưu lịch sử sửa chữa và hoàn thành phiếu #${reportId}`
              : `Đã lưu lịch sử sửa chữa cho phiếu #${reportId}`
          }
        });
        return;
      }

      setMessage("Ghi nhận sửa chữa thành công");
      setForm({ quantity: 1, repairedAt: today, content: "", afterStatus: "GOOD" });
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được lịch sử sửa chữa");
    }
  }

  return (
    <AppLayout
      active="repair-new"
      title="Ghi nhận sửa chữa"
      subtitle={`${user?.fullName || user?.username || "Người dùng"} - ${user?.role || ""}`}
      user={user}
    >
      {!canCreateRepairLog ? (
        <p className="error-message">{permissionDeniedMessage}</p>
      ) : (
        <>
      <section className="repair-summary-panel">
        <div>
          <span>Thiết bị</span>
          <strong>{device ? `${device.code} - ${device.name}` : "Đang tải..."}</strong>
        </div>
        <div>
          <span>Phòng</span>
          <strong>{device?.room?.code || "..."}</strong>
        </div>
        {reportId && (
          <div>
            <span>Phiếu báo hỏng</span>
            <strong>#{reportId}</strong>
          </div>
        )}
      </section>

      <form className="room-form report-form repair-form-panel" onSubmit={handleSubmit}>
        <h2>Thông tin sửa chữa</h2>

        <label>
          Số lượng sửa chữa
          <input required type="number" min="1" value={form.quantity} onChange={(e) => updateField("quantity", e.target.value)} />
        </label>

        <label>
          Ngày sửa chữa
          <input required type="date" value={form.repairedAt} onChange={(e) => updateField("repairedAt", e.target.value)} />
        </label>

        {isCompletingReport ? (
          <label>
            Trạng thái sau sửa
            <input value="Tốt" readOnly />
          </label>
        ) : (
          <label>
            Trạng thái sau sửa
            <select required value={form.afterStatus} onChange={(e) => updateField("afterStatus", e.target.value)}>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="wide-field">
          Nội dung sửa chữa / linh kiện thay thế
          <textarea
            required
            value={form.content}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder="Ví dụ: Thay dây HDMI, vệ sinh cổng kết nối, kiểm tra nguồn máy chiếu..."
            rows="4"
          />
        </label>

        <div className="form-actions">
          <button type="submit">Lưu lịch sử sửa chữa</button>
          {deviceId && <button type="button" className="secondary-button" onClick={() => navigate(`/devices/${deviceId}/history`)}>Xem lịch sử</button>}
        </div>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
        </>
      )}
    </AppLayout>
  );
}
