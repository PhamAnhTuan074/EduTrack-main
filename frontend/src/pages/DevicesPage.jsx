import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  code: "",
  name: "",
  type: "PROJECTOR",
  status: "GOOD",
  importedAt: today
};

const deviceTypeLabels = {
  PROJECTOR: "Máy chiếu",
  TV: "Tivi",
  AIR_CONDITIONER: "Điều hòa",
  COMPUTER: "Máy tính",
  SPEAKER: "Loa",
  TABLE_CHAIR: "Bàn ghế",
  OTHER: "Khác"
};

const deviceStatusLabels = {
  GOOD: "Tốt",
  BROKEN: "Hỏng",
  REPAIRING: "Đang sửa chữa"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

export default function DevicesPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [room, setRoom] = useState(null);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const canManageDevices = user?.role === "ADMIN";
  const canCreateRepairLog = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  async function loadDevices(nextSearch = search) {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get(`/rooms/${roomId}/devices`, {
        params: nextSearch ? { search: nextSearch } : undefined
      });
      setRoom(res.data.room);
      setDevices(res.data.devices);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách thiết bị");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDevices("");
  }, [roomId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function showPermissionDenied() {
    setMessage("");
    setError(permissionDeniedMessage);
  }

  function startEdit(device) {
    if (!canManageDevices) {
      showPermissionDenied();
      return;
    }

    setEditingDeviceId(device.id);
    setForm({
      code: device.code,
      name: device.name,
      type: device.type,
      status: device.status,
      importedAt: device.importedAt?.slice(0, 10) || today
    });
    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingDeviceId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!canManageDevices) {
      showPermissionDenied();
      return;
    }

    try {
      if (editingDeviceId) {
        await api.put(`/devices/${editingDeviceId}`, form);
        setMessage("Cập nhật thiết bị thành công");
      } else {
        await api.post(`/rooms/${roomId}/devices`, form);
        setMessage("Thêm thiết bị thành công");
      }

      resetForm();
      await loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được thiết bị");
    }
  }

  async function updateStatus(device, status) {
    if (!canCreateRepairLog) {
      showPermissionDenied();
      return;
    }

    setMessage("");
    setError("");

    try {
      await api.patch(`/devices/${device.id}/status`, { status });
      setMessage(`Đã cập nhật trạng thái ${device.code}`);
      await loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được trạng thái thiết bị");
    }
  }

  async function deleteDevice(device) {
    if (!canManageDevices) {
      showPermissionDenied();
      return;
    }

    const confirmed = window.confirm(`Xóa thiết bị ${device.code}?`);

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await api.delete(`/devices/${device.id}`);
      setMessage("Xóa thiết bị thành công");
      await loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được thiết bị");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  function openHistory(device) {
    if (!canCreateRepairLog) {
      showPermissionDenied();
      return;
    }

    navigate(`/devices/${device.id}/history`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h2>CSVC</h2>
        <Link to="/dashboard">Trang chủ</Link>
        <Link to="/rooms">Phòng học</Link>
        <Link to="/reports/new">Báo hỏng</Link>
        <Link to="/reports">Phiếu báo hỏng</Link>
      </aside>

      <section className="content-panel">
        <nav className="breadcrumb">
          <Link to="/dashboard">Trang chủ</Link>
          <span>/</span>
          <Link to="/rooms">Phòng {room?.code || "..."}</Link>
          <span>/</span>
          <strong>Thiết bị</strong>
        </nav>

        <header className="page-header">
          <div>
            <h1>Thiết bị phòng {room?.code || "..."}</h1>
            <p>{user?.fullName} - {user?.role}</p>
          </div>
          <button className="secondary-button" onClick={logout}>Đăng xuất</button>
        </header>

        <form className="room-form" onSubmit={handleSubmit}>
          <h2>{editingDeviceId ? "Cập nhật thiết bị" : "Thêm thiết bị"}</h2>

          <label>
            Mã thiết bị
            <input value={form.code} onChange={(e) => updateField("code", e.target.value)} placeholder="MC-P101-01" />
          </label>

          <label>
            Tên thiết bị
            <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Máy chiếu P101" />
          </label>

          <label>
            Loại thiết bị
            <select value={form.type} onChange={(e) => updateField("type", e.target.value)}>
              <option value="PROJECTOR">Máy chiếu</option>
              <option value="TV">Tivi</option>
              <option value="AIR_CONDITIONER">Điều hòa</option>
              <option value="COMPUTER">Máy tính</option>
              <option value="SPEAKER">Loa</option>
              <option value="TABLE_CHAIR">Bàn ghế</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>

          <label>
            Tình trạng
            <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
              <option value="GOOD">Tốt</option>
              <option value="BROKEN">Hỏng</option>
              <option value="REPAIRING">Đang sửa chữa</option>
            </select>
          </label>

          <label>
            Ngày nhập
            <input type="date" value={form.importedAt} onChange={(e) => updateField("importedAt", e.target.value)} />
          </label>

          <div className="form-actions">
            <button type="submit">{editingDeviceId ? "Lưu cập nhật" : "Thêm thiết bị"}</button>
            {editingDeviceId && <button type="button" className="secondary-button" onClick={resetForm}>Hủy</button>}
          </div>
        </form>

        <section className="table-section">
          <div className="toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã hoặc tên thiết bị" />
            <button type="button" onClick={() => loadDevices(search)}>Tìm kiếm</button>
            <button type="button" className="secondary-button" onClick={() => { setSearch(""); loadDevices(""); }}>Làm mới</button>
          </div>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}

          <table>
            <thead>
              <tr>
                <th>Mã thiết bị</th>
                <th>Tên thiết bị</th>
                <th>Loại</th>
                <th>Tình trạng</th>
                <th>Ngày nhập</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6">Đang tải dữ liệu...</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan="6">Không tìm thấy thiết bị phù hợp</td></tr>
              ) : devices.map((device) => (
                <tr key={device.id}>
                  <td>{device.code}</td>
                  <td>{device.name}</td>
                  <td>{deviceTypeLabels[device.type]}</td>
                  <td>{deviceStatusLabels[device.status]}</td>
                  <td>{device.importedAt?.slice(0, 10)}</td>
                  <td className="row-actions device-actions">
                    <button type="button" className="secondary-button" onClick={() => updateStatus(device, "GOOD")}>Tốt</button>
                    <button type="button" className="secondary-button" onClick={() => updateStatus(device, "BROKEN")}>Hỏng</button>
                    <button type="button" className="secondary-button" onClick={() => updateStatus(device, "REPAIRING")}>Đang sửa</button>
                    <button type="button" className="secondary-button" onClick={() => openHistory(device)}>Lịch sử</button>
                    <button type="button" onClick={() => startEdit(device)}>Sửa</button>
                    <button type="button" className="danger-button" onClick={() => deleteDevice(device)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
