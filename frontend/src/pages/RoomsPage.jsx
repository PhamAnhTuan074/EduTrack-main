import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";
import ListControls from "../components/ListControls";

const emptyForm = { code: "", type: "THEORY", capacity: "", status: "ACTIVE" };

const roomTypeLabels = {
  THEORY: "Phòng học lý thuyết",
  COMPUTER_LAB: "Phòng máy tính",
  LAB: "Phòng thực hành"
};

const roomStatusLabels = {
  ACTIVE: "Đang sử dụng",
  MAINTENANCE: "Đang bảo trì"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

export default function RoomsPage() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("code");
  const [order, setOrder] = useState("asc");
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const canManageRooms = user?.role === "ADMIN";

  async function loadRooms() {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/rooms", {
        params: {
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(typeFilter ? { type: typeFilter } : {}),
          page,
          limit: pageSize,
          sortBy,
          order
        }
      });
      setRooms(res.data.data || res.data);
      setMeta(res.data.meta || { total: res.data.length, page: 1, limit: res.data.length || pageSize, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách phòng học");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, [statusFilter, typeFilter, page, pageSize, sortBy, order]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, pageSize, sortBy, order]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function showPermissionDenied() {
    setMessage("");
    setError(permissionDeniedMessage);
  }

  function openCreateForm() {
    if (!canManageRooms) {
      showPermissionDenied();
      return;
    }

    setEditingRoomId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function startEdit(room) {
    if (!canManageRooms) {
      showPermissionDenied();
      return;
    }

    setEditingRoomId(room.id);
    setForm({ code: room.code, type: room.type, capacity: String(room.capacity), status: room.status });
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingRoomId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = { ...form, capacity: Number(form.capacity) };

      if (editingRoomId) {
        await api.put(`/rooms/${editingRoomId}`, payload);
        setMessage("Cập nhật phòng học thành công");
      } else {
        await api.post("/rooms", payload);
        setMessage("Thêm phòng học thành công");
      }

      closeForm();
      await loadRooms();
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được phòng học");
    }
  }

  async function deleteRoom(room) {
    if (!canManageRooms) {
      showPermissionDenied();
      return;
    }

    const confirmed = window.confirm(`Xóa phòng ${room.code}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await api.delete(`/rooms/${room.id}`);
      setMessage("Xóa phòng học thành công");
      await loadRooms();
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được phòng học");
    }
  }

  return (
    <AppLayout active="rooms" title="Quản lý phòng học" subtitle={`${meta.total} phòng học trong hệ thống`} user={user}>
      <div className="admin-page-toolbar">
        <div className="admin-search-box">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadRooms(); }}
            placeholder="Tìm mã phòng..."
          />
        </div>
        <button type="button" className="primary-action" onClick={openCreateForm}>+ Thêm phòng</button>
      </div>

      <section className="device-filter-panel">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Tất cả loại phòng</option>
          {Object.entries(roomTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang sử dụng</option>
          <option value="MAINTENANCE">Đang bảo trì</option>
        </select>
        <button type="button" onClick={loadRooms}>Tìm kiếm</button>
      </section>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <ListControls
        meta={meta}
        sortBy={sortBy}
        order={order}
        pageSize={pageSize}
        sortOptions={[
          { value: "code", label: "Mã phòng" },
          { value: "type", label: "Loại phòng" },
          { value: "capacity", label: "Sức chứa" },
          { value: "status", label: "Trạng thái" },
          { value: "createdAt", label: "Ngày tạo" }
        ]}
        onPageChange={setPage}
        onSortChange={setSortBy}
        onOrderChange={setOrder}
        onPageSizeChange={setPageSize}
      />

      {isLoading ? (
        <section className="empty-panel">Đang tải dữ liệu...</section>
      ) : rooms.length === 0 ? (
        <section className="empty-panel">Không tìm thấy phòng học phù hợp</section>
      ) : (
        <section className="room-card-grid">
          {rooms.map((room) => (
            <article key={room.id} className="room-card">
              <div className="room-icon">P</div>
              <h2>{room.code}</h2>
              <p>{roomTypeLabels[room.type]}</p>
              <span className={room.status === "ACTIVE" ? "status-pill good" : "status-pill warning"}>● {roomStatusLabels[room.status]}</span>
              <div className="room-meta">
                <span>{room.capacity} chỗ</span>
                <span>{room._count?.devices ?? 0} thiết bị</span>
              </div>
              <div className="room-card-actions">
                <button type="button" onClick={() => navigate(`/devices?roomId=${room.id}`)}>Thiết bị</button>
                <button type="button" onClick={() => startEdit(room)}>Sửa</button>
                <button type="button" className="danger-button" onClick={() => deleteRoom(room)}>Xóa</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>{editingRoomId ? "Sửa phòng học" : "Thêm phòng học"}</h2>
              <button type="button" onClick={closeForm}>×</button>
            </div>
            <div className="modal-grid">
              <label>Mã phòng *<input value={form.code} onChange={(e) => updateField("code", e.target.value)} placeholder="P101" /></label>
              <label>Loại phòng *<select value={form.type} onChange={(e) => updateField("type", e.target.value)}><option value="THEORY">Phòng học lý thuyết</option><option value="COMPUTER_LAB">Phòng máy tính</option><option value="LAB">Phòng thực hành</option></select></label>
              <label>Sức chứa *<input type="number" min="1" value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} placeholder="60" /></label>
              <label>Trạng thái *<select value={form.status} onChange={(e) => updateField("status", e.target.value)}><option value="ACTIVE">Đang sử dụng</option><option value="MAINTENANCE">Đang bảo trì</option></select></label>
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
