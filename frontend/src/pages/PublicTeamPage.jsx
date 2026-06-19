// Nguoi code: Phạm Anh Tuấn. Pham vi: trang gioi thieu doi ngu.

import PublicShell from "../components/PublicShell";

const teams = [
  {
    name: "Ban quản trị trường",
    role: "Thiết lập tổ chức, quản lý phòng học, thiết bị, người dùng và phân quyền nội bộ."
  },
  {
    name: "Tổ kỹ thuật",
    role: "Tiếp nhận phiếu báo hỏng, cập nhật tiến độ sửa chữa và ghi nhận lịch sử xử lý thiết bị."
  },
  {
    name: "Người báo hỏng",
    role: "Gửi phản ánh sự cố từ phòng học, theo dõi thông báo và phối hợp cung cấp mô tả hỏng hóc."
  }
];

export default function PublicTeamPage() {
  return (
    <PublicShell active="team">
      <section className="public-page-band">
        <p className="public-eyebrow">Đội ngũ sử dụng hệ thống</p>
        <h1>Phối hợp rõ vai trò trong từng trường</h1>
        <p>
          EduTrack tổ chức quy trình theo đúng cách một trường học vận hành cơ sở vật chất:
          quản trị, kỹ thuật và người báo hỏng cùng làm việc trên một nguồn dữ liệu.
        </p>
      </section>

      <section className="public-section public-team-grid">
        {teams.map((item) => (
          <article className="public-team-card" key={item.name}>
            <span>{item.name.charAt(0)}</span>
            <h2>{item.name}</h2>
            <p>{item.role}</p>
          </article>
        ))}
      </section>
    </PublicShell>
  );
}
