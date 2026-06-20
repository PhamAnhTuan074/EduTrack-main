// Nguoi code: Nguyễn Ngọc Phương. Pham vi: kiem ke va theo doi thiet bi.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";
import ListControls from "../components/ListControls";

const today = new Date().toISOString().slice(0, 10);

const emptyForm = {
  code: "",
  name: "",
  type: "PROJECTOR",
  roomId: "",
  importedAt: today,
  status: "GOOD"
};

const deviceTypeLabels = {
  PROJECTOR: "Máy chiếu",
  TV: "Màn hình",
  AIR_CONDITIONER: "Điều hòa",
  COMPUTER: "Máy tính",
  SPEAKER: "Loa",
  TABLE_CHAIR: "Bàn ghế",
  OTHER: "Khác"
};

const roomTypeLabels = {
  THEORY: "Phòng học lý thuyết",
  COMPUTER_LAB: "Phòng máy tính",
  LAB: "Phòng thực hành"
};

const statusLabels = {
  GOOD: "Hoạt động tốt",
  BROKEN: "Hỏng",
  REPAIRING: "Đang bảo trì"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

export default function DeviceInventoryPage() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [searchParams] = useSearchParams();
  const initialRoomId = searchParams.get("roomId") || "";

  const [devices, setDevices] = useState([]);
  const [deviceCounts, setDeviceCounts] = useState({ all: 0, good: 0, broken: 0, repairing: 0 });
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState(initialRoomId);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("code");
  const [order, setOrder] = useState("asc");
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [form, setForm] = useState(emptyForm);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openActionDeviceId, setOpenActionDeviceId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadRooms() {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách phòng học");
    }
  }

  async function loadDevices() {
    setIsLoading(true);
    setError("");

    try {
      const baseParams = {
        ...(search ? { search } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(roomFilter ? { roomId: roomFilter } : {})
      };

      const [res, countRes] = await Promise.all([
        api.get("/devices", {
          params: {
            ...baseParams,
            ...(statusFilter ? { status: statusFilter } : {}),
            page,
            limit: pageSize,
            sortBy,
            order
          }
        }),
        api.get("/devices", {
          params: baseParams
        })
      ]);

      const countDevices = countRes.data;
      setDeviceCounts({
        all: countDevices.length,
        good: countDevices.filter((device) => device.status === "GOOD").length,
        broken: countDevices.filter((device) => device.status === "BROKEN").length,
        repairing: countDevices.filter((device) => device.status === "REPAIRING").length
      });
      setDevices(res.data.data || res.data);
      setMeta(res.data.meta || { total: res.data.length, page: 1, limit: res.data.length || pageSize, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách thiết bị");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    loadDevices();
  }, [typeFilter, roomFilter, statusFilter, page, pageSize, sortBy, order]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, roomFilter, statusFilter, pageSize, sortBy, order]);

  const canManageDevices = user?.role === "ADMIN";
  const canCreateRepairLog = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function showPermissionDenied() {
    setMessage("");
    setError(permissionDeniedMessage);
  }

  function openCreateForm() {
    if (!canManageDevices) {
      showPermissionDenied();
      return;
    }

    setEditingDeviceId(null);
    setForm({ ...emptyForm, roomId: rooms[0]?.id ? String(rooms[0].id) : "" });
    setIsFormOpen(true);
    setMessage("");
    setError("");
    setOpenActionDeviceId(null);
  }

  function startEdit(device) {
    if (!canManageDevices) {
      showPermissionDenied();
      return;
    }

    setEditingDeviceId(device.id);
    setForm({
      code: device.code || "",
      name: device.name || "",
      type: device.type || "PROJECTOR",
      roomId: device.roomId ? String(device.roomId) : String(device.room?.id || ""),
      importedAt: device.importedAt?.slice(0, 10) || today,
      status: device.status || "GOOD"
    });
    setIsFormOpen(true);
    setMessage("");
    setError("");
    setOpenActionDeviceId(null);
  }

  function closeForm() {
    setEditingDeviceId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = { ...form, roomId: Number(form.roomId) };

      if (editingDeviceId) {
        delete payload.status;
        await api.put(`/devices/${editingDeviceId}`, payload);
        setMessage("Cập nhật thiết bị thành công");
      } else {
        await api.post(`/rooms/${form.roomId}/devices`, payload);
        setMessage("Thêm thiết bị thành công");
      }

      closeForm();
      await loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được thiết bị");
    }
  }

  async function deleteDevice(device) {
    if (!canManageDevices) {
      showPermissionDenied();
      return;
    }

    const confirmed = window.confirm(`Xóa thiết bị ${device.code}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");
    setOpenActionDeviceId(null);

    try {
      await api.delete(`/devices/${device.id}`);
      setMessage("Xóa thiết bị thành công");
      await loadDevices();
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được thiết bị");
    }
  }

  function openMaintenance(device) {
    if (!canCreateRepairLog) {
      showPermissionDenied();
      return;
    }

    setOpenActionDeviceId(null);
    navigate(`/repair-logs/new?deviceId=${device.id}`);
  }

  return (
    <AppLayout active="devices" title="Quản lý thiết bị" subtitle={`${deviceCounts.all} thiết bị trong hệ thống`} user={user}>
      <div className="admin-page-toolbar">
        <button type="button" className="primary-action" onClick={openCreateForm}>+ Thêm thiết bị</button>
      </div>

      <section className="device-filter-panel">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm thiết bị..." />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tất cả loại</option>
          {Object.entries(deviceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
          <option value="">Tất cả phòng</option>
          {rooms.map((room) => <option key={room.id} value={room.id}>{room.code}</option>)}
        </select>
        <button type="button" onClick={loadDevices}>Tìm kiếm</button>
      </section>

      <div className="filter-pills">
        <button type="button" className={!statusFilter ? "active" : ""} onClick={() => setStatusFilter("")}>Tất cả ({deviceCounts.all})</button>
        <button type="button" className={statusFilter === "GOOD" ? "active" : ""} onClick={() => setStatusFilter("GOOD")}>Hoạt động tốt ({deviceCounts.good})</button>
        <button type="button" className={statusFilter === "BROKEN" ? "active" : ""} onClick={() => setStatusFilter("BROKEN")}>Hỏng ({deviceCounts.broken})</button>
        <button type="button" className={statusFilter === "REPAIRING" ? "active" : ""} onClick={() => setStatusFilter("REPAIRING")}>Đang bảo trì ({deviceCounts.repairing})</button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <ListControls
        meta={meta}
        sortBy={sortBy}
        order={order}
        pageSize={pageSize}
        sortOptions={[
          { value: "code", label: "Mã thiết bị" },
          { value: "name", label: "Tên thiết bị" },
          { value: "type", label: "Loại" },
          { value: "status", label: "Trạng thái" },
          { value: "importedAt", label: "Ngày nhập" }
        ]}
        onPageChange={setPage}
        onSortChange={setSortBy}
        onOrderChange={setOrder}
        onPageSizeChange={setPageSize}
      />

      <section className="dark-table-wrap devices-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Mã thiết bị</th>
              <th>Tên thiết bị</th>
              <th>Loại</th>
              <th>Phòng</th>
              <th>Ngày nhập</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7">Đang tải dữ liệu...</td></tr>
            ) : devices.length === 0 ? (
              <tr><td colSpan="7">Không tìm thấy thiết bị phù hợp</td></tr>
            ) : devices.map((device) => (
              <tr key={device.id}>
                <td className="code-cell">{device.code}</td>
                <td>{device.name}</td>
                <td><span className="type-badge">{deviceTypeLabels[device.type]}</span></td>
                <td><span className="room-badge">{device.room?.code}</span></td>
                <td>{device.importedAt?.slice(0, 10)}</td>
                <td>
                  <span className={device.status === "GOOD" ? "status-pill good" : device.status === "BROKEN" ? "status-pill danger" : "status-pill warning"}>
                    ● {statusLabels[device.status]}
                  </span>
                </td>
                <td className="table-actions">
                  <div className={openActionDeviceId === device.id ? "action-menu is-open" : "action-menu"}>
                    <button
                      type="button"
                      className="action-menu-trigger"
                      aria-expanded={openActionDeviceId === device.id}
                      aria-label={`Mở thao tác cho ${device.code}`}
                      onClick={() => setOpenActionDeviceId((current) => current === device.id ? null : device.id)}
                    >
                      ☰
                    </button>
                    {openActionDeviceId === device.id && (
                    <div className="action-menu-list action-menu-list-wide">
                      <span className="action-menu-label">Thiết bị</span>
                      <button type="button" onClick={() => startEdit(device)}>Sửa</button>
                      <button type="button" className="action-primary" onClick={() => openMaintenance(device)}>Bảo trì</button>
                      <button type="button" className="danger-button" onClick={() => deleteDevice(device)}>Xóa</button>
                    </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="admin-modal device-modal" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>{editingDeviceId ? "Sửa thiết bị" : "Thêm thiết bị"}</h2>
              <button type="button" onClick={closeForm} aria-label="Đóng form">×</button>
            </div>

            <div className="modal-grid">
              <label>
                Mã thiết bị *
                <input value={form.code} onChange={(e) => updateField("code", e.target.value)} placeholder="MC-P401-01" />
              </label>

              <label>
                Loại thiết bị *
                <select value={form.type} onChange={(e) => updateField("type", e.target.value)}>
                  {Object.entries(deviceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>

              <label className="span-2">
                Tên thiết bị *
                <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Máy chiếu Panasonic PT-VX420" />
              </label>

              <label>
                Phòng học *
                <select value={form.roomId} onChange={(e) => updateField("roomId", e.target.value)}>
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.code} - {roomTypeLabels[room.type] || room.type}</option>
                  ))}
                </select>
              </label>

              <label>
                Ngày nhập *
                <input type="date" value={form.importedAt} onChange={(e) => updateField("importedAt", e.target.value)} />
              </label>

              {!editingDeviceId && (
                <label className="span-2">
                  Trạng thái
                  <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                    <option value="GOOD">Hoạt động tốt</option>
                    <option value="BROKEN">Hỏng</option>
                    <option value="REPAIRING">Đang bảo trì</option>
                  </select>
                </label>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeForm}>Hủy</button>
              <button type="submit">Lưu thay đổi</button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
