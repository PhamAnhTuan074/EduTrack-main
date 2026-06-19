# Phan chia cong viec nhom EduTrack

Thanh vien:

- Phạm Anh Tuấn
- Nguyễn Ngọc Phương

Muc tieu phan chia: moi thanh vien deu tham gia xay dung full-stack, gom backend, frontend, database/seed, kiem thu va tai lieu. Khong tach mot nguoi chi lam frontend va mot nguoi chi lam backend.

## Nguyen tac chung

- Moi tinh nang nen lam tren branch rieng va merge qua pull request.
- Truoc khi push: `git pull --rebase origin main`, chay kiem tra, sau do moi `git push`.
- Neu sua `backend/prisma/schema.prisma`, nguoi sua phai tao migration va bao nguoi con lai pull code moi truoc khi tao migration khac.
- Cac file dung chung nhu `frontend/src/App.jsx`, `frontend/src/App.css`, `backend/src/app.js` can trao doi truoc khi sua lon.
- Trong code, comment dau file ghi ro nguoi code chinh. File dung chung co the ghi ca hai thanh vien.

## Phạm Anh Tuấn - Khoi tai khoan, to chuc va phong hoc

Ty le dong gop muc tieu: 50%.

Pham vi chinh:

- Dang nhap, xac thuc, phan quyen.
- Dang ky va quan ly to chuc.
- Quan ly nguoi dung, vai tro, ho so ca nhan.
- Quan ly phong hoc.
- Trang public: gioi thieu, doi ngu, lien he.

Backend phu trach chinh:

- `backend/src/routes/auth.routes.js`
- `backend/src/routes/user.routes.js`
- `backend/src/routes/organization.routes.js`
- `backend/src/routes/system.routes.js`
- `backend/src/routes/room.routes.js`
- `backend/src/middlewares/auth.middleware.js`
- `backend/prisma/ensure-system-admin.js`
- Cac migration lien quan den room, organization, user profile va system admin.

Frontend phu trach chinh:

- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/RegisterOrganizationPage.jsx`
- `frontend/src/pages/ProfilePage.jsx`
- `frontend/src/pages/UsersPage.jsx`
- `frontend/src/pages/RolesPage.jsx`
- `frontend/src/pages/OrganizationSettingsPage.jsx`
- `frontend/src/pages/SystemOrganizationsPage.jsx`
- `frontend/src/pages/RoomsPage.jsx`
- `frontend/src/pages/PublicHomePage.jsx`
- `frontend/src/pages/PublicTeamPage.jsx`
- `frontend/src/pages/PublicContactPage.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/src/components/PublicShell.jsx`

Ket qua can ban giao:

- Dang nhap va bao ve route hoat dong dung theo vai tro.
- Admin quan ly duoc nguoi dung, phong hoc va thong tin to chuc.
- System admin quan ly duoc danh sach to chuc.
- Trang public co luong dieu huong ro rang toi dang ky/dang nhap/lien he.

## Nguyễn Ngọc Phương - Khoi thiet bi, bao hong va bao cao

Ty le dong gop muc tieu: 50%.

Pham vi chinh:

- Quan ly thiet bi va gan thiet bi vao phong.
- Tao, theo doi va xu ly phieu bao hong.
- Ghi nhan lich su sua chua.
- Thong bao, dashboard, export CSV.
- Bo loc, tim kiem, sap xep va phan trang danh sach.

Backend phu trach chinh:

- `backend/src/routes/device.routes.js`
- `backend/src/routes/room-device.routes.js`
- `backend/src/routes/report.routes.js`
- `backend/src/routes/repair-log.routes.js`
- `backend/src/routes/notification.routes.js`
- `backend/src/routes/dashboard.routes.js`
- `backend/src/routes/export.routes.js`
- `backend/src/utils/list-query.js`
- Cac migration lien quan den device, damage report, repair log, notification va index toi uu truy van.

Frontend phu trach chinh:

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/DevicesPage.jsx`
- `frontend/src/pages/DeviceInventoryPage.jsx`
- `frontend/src/pages/DeviceHistoryPage.jsx`
- `frontend/src/pages/ReportsPage.jsx`
- `frontend/src/pages/ReportCreatePage.jsx`
- `frontend/src/pages/RepairLogFormPage.jsx`
- `frontend/src/pages/NotificationsPage.jsx`
- `frontend/src/components/ListControls.jsx`

Ket qua can ban giao:

- Thiet bi duoc tao, loc, tim kiem, sap xep va cap nhat trang thai dung.
- Phieu bao hong cap nhat duoc trang thai va sinh thong bao phu hop.
- Lich su sua chua hien thi day du theo tung thiet bi.
- Dashboard va export phan anh dung du lieu hien co.

## File dung chung do ca hai cung code

- `backend/src/app.js`
- `backend/src/prisma.js`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.js`
- `backend/prisma/seed-extra.js`
- `backend/scripts/verify-no-unsafe-sql.js`
- `frontend/src/App.jsx`
- `frontend/src/App.css`
- `frontend/src/api.js`
- `frontend/src/main.jsx`
- `frontend/src/index.css`
- `frontend/src/components/AppLayout.jsx`
- Cac file cau hinh Docker, Vite, ESLint, Render, Vercel va Nginx co ho tro comment.

## Quy uoc review va kiem thu

- Phạm Anh Tuấn test lai luong cua Nguyễn Ngọc Phương it nhat mot lan truoc khi merge.
- Nguyễn Ngọc Phương test lai luong cua Phạm Anh Tuấn it nhat mot lan truoc khi merge.
- Moi pull request can co mo ta ngan: da sua gi, test bang tai khoan nao, lenh da chay.
- Neu conflict trong file dung chung, uu tien trao doi va tach commit nho de de review.
