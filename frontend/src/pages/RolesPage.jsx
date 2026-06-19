// Nguoi code: Phạm Anh Tuấn. Pham vi: ma tran quyen theo vai tro.

import { useMemo } from "react";
import AppLayout from "../components/AppLayout";

const roleCards = [
  {
    role: "ADMIN",
    name: "Quản trị viên",
    summary: "Quản lý toàn bộ dữ liệu của trường, tài khoản người dùng và cấu hình tổ chức."
  },
  {
    role: "TECHNICIAN",
    name: "Kỹ thuật viên",
    summary: "Theo dõi thiết bị, xử lý phiếu báo hỏng, cập nhật trạng thái và ghi nhận sửa chữa."
  },
  {
    role: "REPORTER",
    name: "Người báo hỏng",
    summary: "Xem phòng học, thiết bị và tạo phiếu báo hỏng khi phát hiện sự cố."
  }
];

const permissions = [
  { name: "Xem dashboard thống kê", ADMIN: true, TECHNICIAN: true, REPORTER: true },
  { name: "Xem danh sách phòng học", ADMIN: true, TECHNICIAN: true, REPORTER: true },
  { name: "Thêm, sửa, xóa phòng học", ADMIN: true, TECHNICIAN: false, REPORTER: false },
  { name: "Xem danh sách thiết bị", ADMIN: true, TECHNICIAN: true, REPORTER: true },
  { name: "Thêm, sửa, xóa thiết bị", ADMIN: true, TECHNICIAN: false, REPORTER: false },
  { name: "Cập nhật trạng thái thiết bị", ADMIN: true, TECHNICIAN: true, REPORTER: false },
  { name: "Tạo phiếu báo hỏng", ADMIN: true, TECHNICIAN: true, REPORTER: true },
  { name: "Xử lý phiếu báo hỏng", ADMIN: true, TECHNICIAN: true, REPORTER: false },
  { name: "Ghi nhận lịch sử sửa chữa", ADMIN: true, TECHNICIAN: true, REPORTER: false },
  { name: "Quản lý người dùng", ADMIN: true, TECHNICIAN: false, REPORTER: false },
  { name: "Cập nhật thông tin tổ chức", ADMIN: true, TECHNICIAN: false, REPORTER: false },
  { name: "Xem và cập nhật hồ sơ cá nhân", ADMIN: true, TECHNICIAN: true, REPORTER: true }
];

function PermissionMark({ allowed }) {
  return <span className={allowed ? "permission-mark allowed" : "permission-mark denied"}>{allowed ? "Có" : "Không"}</span>;
}

export default function RolesPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const isAdmin = user?.role === "ADMIN";

  return (
    <AppLayout
      active="roles"
      title="Phân quyền"
      subtitle="Ma trận quyền phù hợp với quy trình quản lý phòng học, thiết bị, báo hỏng và sửa chữa"
      user={user}
    >
      {!isAdmin ? (
        <section className="empty-panel">Bạn không có quyền xem cấu hình phân quyền của tổ chức.</section>
      ) : (
        <>
          <section className="role-overview-grid">
            {roleCards.map((item) => (
              <article className="role-card" key={item.role}>
                <span>{item.role}</span>
                <h2>{item.name}</h2>
                <p>{item.summary}</p>
              </article>
            ))}
          </section>

          <section className="table-section role-table-section">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Chức năng</th>
                  <th>Admin</th>
                  <th>Kỹ thuật viên</th>
                  <th>Người báo hỏng</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.name}>
                    <td>{permission.name}</td>
                    <td><PermissionMark allowed={permission.ADMIN} /></td>
                    <td><PermissionMark allowed={permission.TECHNICIAN} /></td>
                    <td><PermissionMark allowed={permission.REPORTER} /></td>
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
