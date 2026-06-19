// Nguoi code: Nguyễn Ngọc Phương. Pham vi: danh sach va xu ly phieu bao hong.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";
import ListControls from "../components/ListControls";

const statusLabels = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành"
};

const reportTabs = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "IN_PROGRESS", label: "Đang sửa" },
  { value: "COMPLETED", label: "Hoàn thành" }
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [openActionReportId, setOpenActionReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadReports() {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/reports", {
        params: {
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          page,
          limit: pageSize,
          sortBy,
          order
        }
      });

      setReports(res.data.data || res.data);
      setMeta(res.data.meta || { total: res.data.length, page: 1, limit: res.data.length || pageSize, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách phiếu báo hỏng");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [statusFilter, page, pageSize, sortBy, order]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize, sortBy, order]);

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  async function updateStatus(report, status) {
    setMessage("");
    setError("");
    setOpenActionReportId(null);

    try {
      await api.patch(`/reports/${report.id}/status`, { status });
      setMessage(`Đã cập nhật phiếu #${report.id}`);
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được trạng thái phiếu");
    }
  }

  function openReportDetail(report) {
    setSelectedReport(report);
    setOpenActionReportId(null);
    setMessage("");
    setError("");
  }

  async function confirmReport(report) {
    setMessage("");
    setError("");

    try {
      const res = await api.patch(`/reports/${report.id}/status`, { status: "IN_PROGRESS" });
      setSelectedReport(res.data);
      setMessage(`Đã xác nhận phiếu #${report.id} và chuyển sang Đang sửa`);
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Không xác nhận được phiếu báo hỏng");
    }
  }

  function openRepairForm(report) {
    const firstDevice = report.devices[0]?.device;
    setOpenActionReportId(null);

    if (!firstDevice) {
      setError("Phiếu này chưa có thiết bị để ghi sửa chữa");
      return;
    }

    navigate(`/repair-logs/new?reportId=${report.id}&deviceId=${firstDevice.id}&complete=1`);
  }

  return (
    <AppLayout
      active="reports"
      title="Danh sách phiếu báo hỏng"
      subtitle={`${meta.total} phiếu trong hệ thống`}
      user={user}
    >
      <div className="admin-page-toolbar">
        <div className="admin-search-box">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadReports(); }}
            placeholder="Tìm phòng, người báo cáo, mô tả..."
          />
        </div>
        <button type="button" onClick={loadReports}>Tìm kiếm</button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="filter-pills">
        {reportTabs.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            className={statusFilter === tab.value ? "active" : ""}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ListControls
        meta={meta}
        sortBy={sortBy}
        order={order}
        pageSize={pageSize}
        sortOptions={[
          { value: "id", label: "ID" },
          { value: "status", label: "Trạng thái" },
          { value: "createdAt", label: "Ngày báo cáo" },
          { value: "updatedAt", label: "Ngày cập nhật" }
        ]}
        onPageChange={setPage}
        onSortChange={setSortBy}
        onOrderChange={setOrder}
        onPageSizeChange={setPageSize}
      />

      <section className="table-section reports-table-section">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Phòng</th>
              <th>Thiết bị</th>
              <th>Người báo cáo</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Ngày báo cáo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8">Đang tải dữ liệu...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan="8">Chưa có phiếu báo hỏng</td></tr>
            ) : reports.map((report) => (
              <tr key={report.id}>
                <td>#{report.id}</td>
                <td>{report.room?.code}</td>
                <td>{report.devices.map((item) => item.device.name).join(", ")}</td>
                <td>{report.reporter?.fullName}</td>
                <td>{report.description}</td>
                <td>{statusLabels[report.status]}</td>
                <td>{report.createdAt?.slice(0, 10)}</td>
                <td className="table-actions">
                  <div className={openActionReportId === report.id ? "action-menu is-open" : "action-menu"}>
                    <button
                      type="button"
                      className="action-menu-trigger"
                      aria-expanded={openActionReportId === report.id}
                      aria-label={`Mở thao tác cho phiếu #${report.id}`}
                      onClick={() => setOpenActionReportId((current) => current === report.id ? null : report.id)}
                    >
                      ...
                    </button>
                    {openActionReportId === report.id && (
                      <div className="action-menu-list action-menu-list-wide">
                        <span className="action-menu-label">Phiếu #{report.id}</span>
                        <button type="button" className="action-primary" onClick={() => openReportDetail(report)}>Xem chi tiết</button>
                        {report.status === "PENDING" && <button type="button" onClick={() => updateStatus(report, "IN_PROGRESS")}>Xác nhận</button>}
                        <button type="button" className="action-primary" onClick={() => openRepairForm(report)}>Hoàn thành</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedReport && (
        <div className="report-detail-backdrop" role="presentation" onClick={() => setSelectedReport(null)}>
          <section
            className="report-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-detail-header">
              <div>
                <span>Phiếu báo hỏng #{selectedReport.id}</span>
                <h2 id="report-detail-title">{selectedReport.room?.code || "Không rõ phòng"}</h2>
                <p>{statusLabels[selectedReport.status] || selectedReport.status}</p>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)} aria-label="Đóng chi tiết">×</button>
            </div>

            <div className="report-detail-body">
              <div className="report-detail-grid">
                <section>
                  <span>Người báo cáo</span>
                  <strong>{selectedReport.reporter?.fullName || selectedReport.reporter?.username || "Không rõ"}</strong>
                </section>
                <section>
                  <span>Ngày báo cáo</span>
                  <strong>{selectedReport.createdAt?.slice(0, 10)}</strong>
                </section>
                <section>
                  <span>Phòng</span>
                  <strong>{selectedReport.room?.code || "Không rõ"}</strong>
                </section>
                <section>
                  <span>Trạng thái</span>
                  <strong>{statusLabels[selectedReport.status] || selectedReport.status}</strong>
                </section>
              </div>

              <section className="report-detail-block">
                <span>Thiết bị báo hỏng</span>
                <div className="report-device-list">
                  {selectedReport.devices?.map((item) => (
                    <strong key={item.device?.id || item.deviceId}>{item.device?.name || "Thiết bị không rõ"}</strong>
                  ))}
                </div>
              </section>

              <section className="report-detail-block">
                <span>Mô tả sự cố</span>
                <p>{selectedReport.description}</p>
              </section>
            </div>

            <div className="report-detail-actions">
              {selectedReport.status === "PENDING" && (
                <button type="button" onClick={() => confirmReport(selectedReport)}>Xác nhận</button>
              )}
              <button type="button" className="secondary-button" onClick={() => setSelectedReport(null)}>Đóng</button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
