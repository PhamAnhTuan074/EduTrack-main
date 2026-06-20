// Nguoi code: Phạm Anh Tuấn. Pham vi: trang gioi thieu public cua EduTrack.

import { Link } from "react-router-dom";
import PublicShell from "../components/PublicShell";
import heroImage from "../assets/hero.png";

const serviceItems = [
  {
    title: "Quản lý phòng học",
    body: "Theo dõi phòng học, phòng máy, phòng lab theo mã phòng, loại phòng, sức chứa và trạng thái sử dụng."
  },
  {
    title: "Theo dõi thiết bị",
    body: "Quản lý máy chiếu, màn hình hiển thị, điều hòa, máy tính, loa, bàn ghế và thiết bị khác theo từng phòng."
  },
  {
    title: "Báo hỏng và sửa chữa",
    body: "Tiếp nhận phiếu báo hỏng, cập nhật tiến độ xử lý và ghi nhận lịch sử sửa chữa tập trung."
  },
  {
    title: "Báo cáo vận hành",
    body: "Thống kê nhanh thiết bị hỏng, phiếu chờ xử lý, phòng có nhiều sự cố và xuất dữ liệu CSV."
  }
];

const metrics = [
  ["3", "Vai trò vận hành"],
  ["100%", "Dữ liệu tách theo trường"],
  ["CSV", "Xuất báo cáo"],
  ["JWT", "Xác thực truy cập"]
];

export default function PublicHomePage() {
  return (
    <PublicShell active="home">
      <section
        className="public-hero"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(17, 24, 39, 0.88), rgba(17, 24, 39, 0.42)), url(${heroImage})` }}
      >
        <div className="public-hero-content">
          <p className="public-eyebrow">Nền tảng quản lý cơ sở vật chất giáo dục</p>
          <h1>EduTrack</h1>
          <p>
            Một hệ thống dùng chung cho nhiều trường học, học viện hoặc tổ chức giáo dục,
            giúp tách riêng dữ liệu phòng học, thiết bị, báo hỏng, sửa chữa và người dùng.
          </p>
          <div className="public-hero-actions">
            <Link className="public-button-link" to="/register">Tạo tài khoản tổ chức</Link>
            <Link className="public-outline-link" to="/login">Vào hệ thống</Link>
          </div>
        </div>
      </section>

      <section className="public-section public-service-grid" aria-label="Dịch vụ">
        {serviceItems.map((item) => (
          <article className="public-service-card" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="public-section public-split-section">
        <div>
          <p className="public-eyebrow">Phù hợp với đề tài quản lý</p>
          <h2>Từ bài toán một trường sang nền tảng quản lý</h2>
          <p>
            Mỗi tổ chức có mã trường riêng, tài khoản admin riêng và vùng dữ liệu riêng.
            Admin có thể quản lý người dùng nội bộ, kỹ thuật viên xử lý sự cố, còn người báo hỏng tạo phiếu theo phòng.
          </p>
        </div>

        <div className="public-metric-grid">
          {metrics.map(([value, label]) => (
            <article key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
