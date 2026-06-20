# Huong dan trinh bay quy trinh va thay doi chuc nang EduTrack

Tai lieu nay dung de tra loi khi giang vien hoi:

- Mot chuc nang tren giao dien web hoat dong nhu the nao?
- Du lieu di tu frontend den backend va database ra sao?
- Neu muon sua hoac them mot chuc nang thi can sua nhung file nao?
- Khi phat sinh loi o mot chuc nang thi nen kiem tra theo thu tu nao?

## 1. Cong thuc chung de giai thich mot chuc nang

Khi bi hoi ve bat ky chuc nang nao, nen trinh bay theo 8 buoc sau:

1. Xac dinh man hinh frontend

   Xem route trong `frontend/src/App.jsx`, sau do mo component tuong ung trong `frontend/src/pages`.

   Vi du: duong dan `/rooms` hien thi component `RoomsPage`.

2. Xac dinh thao tac cua nguoi dung tren giao dien

   Kiem tra nut bam, o nhap, select, form submit, checkbox, tab loc du lieu...

   Vi du: nguoi dung chon "Loai phong" va "Trang thai", sau do bam "Tim kiem".

3. Xac dinh state frontend dang luu gi

   Tim cac bien `useState`, vi du `typeFilter`, `statusFilter`, `search`, `page`, `sortBy`.

4. Xac dinh API frontend goi

   Tim cac lenh `api.get`, `api.post`, `api.put`, `api.patch`, `api.delete`.

   Vi du: `api.get("/rooms", { params: ... })`.

5. Xac dinh cau hinh Axios va token

   File `frontend/src/api.js` cau hinh `baseURL` va tu dong gan:

   ```http
   Authorization: Bearer <token>
   ```

6. Xac dinh route backend nhan request

   File `backend/src/app.js` khai bao cac route goc:

   ```js
   app.use("/api/rooms", roomRouter);
   app.use("/api/devices", deviceRouter);
   app.use("/api/reports", reportRouter);
   ```

7. Xac dinh middleware, phan quyen va xu ly database

   Backend thuong di qua:

   - `authenticate`: kiem tra JWT token.
   - `authorize(...)`: kiem tra vai tro nguoi dung.
   - Prisma query: doc, them, sua, xoa du lieu trong database.

8. Xac dinh du lieu tra ve va cach frontend cap nhat giao dien

   Backend tra JSON. Frontend luu vao state, sau do React render lai danh sach, bang, the thong tin hoac thong bao loi.

## 2. Cong thuc chung de thay doi mot chuc nang

Khi giang vien yeu cau "neu thay doi chuc nang nay thi lam sao", co the tra loi theo thu tu:

1. Xac dinh thay doi thuoc loai nao

   - Chi doi giao dien: sua file trong `frontend/src/pages`, `frontend/src/components`, hoac `frontend/src/App.css`.
   - Doi cach goi API: sua component frontend va file route backend tuong ung.
   - Doi logic xu ly: sua file trong `backend/src/routes`.
   - Doi cau truc du lieu: sua `backend/prisma/schema.prisma`, tao migration, cap nhat seed neu can.
   - Doi phan quyen: sua `authorize(...)` trong route backend va an/hien nut tren frontend.

2. Tim dung file bang tu khoa

   Nen dung:

   ```powershell
   rg -n "api.get|api.post|rooms|devices|reports" frontend backend
   ```

3. Sua frontend truoc neu thay doi lien quan den thao tac nguoi dung

   Them input/select/button, them state, dua tham so vao request API.

4. Sua backend de nhan tham so moi

   Doc `req.query`, `req.body`, hoac `req.params`, validate du lieu, roi dua vao Prisma query.

5. Sua database neu can

   Chi sua schema khi can them cot, them enum, them quan he bang. Neu chi loc, tim kiem, sap xep theo cot da co thi khong can sua schema.

6. Kiem thu theo vai tro nguoi dung

   Test toi thieu voi `ADMIN`, `TECHNICIAN`, `REPORTER`, du lieu hop le, du lieu sai, truong hop khong co ket qua.

7. Neu co loi thi lan theo chieu nguoc

   Giao dien hien sai -> xem response tren Network -> xem API backend -> xem Prisma query -> xem database.

## 3. Vi du dai dien: Tim kiem phong theo loai phong va tinh trang

### Quy trinh hien tai

1. Nguoi dung vao `/rooms`.

   Route trong `frontend/src/App.jsx` tro den `RoomsPage`.

2. Man hinh `RoomsPage` co cac state:

   - `typeFilter`: loai phong.
   - `statusFilter`: tinh trang phong.
   - `search`: ma phong.
   - `page`, `pageSize`: phan trang.
   - `sortBy`, `order`: sap xep.

3. Khi nguoi dung chon loai phong hoac tinh trang, React cap nhat state va goi lai `loadRooms()`.

4. `loadRooms()` goi API:

   ```http
   GET /api/rooms?type=COMPUTER_LAB&status=ACTIVE&page=1&limit=10&sortBy=code&order=asc
   ```

5. Axios trong `frontend/src/api.js` gan token vao header.

6. Backend nhan request tai `backend/src/routes/room.routes.js`:

   ```js
   router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
   ```

7. Backend tao dieu kien loc:

   ```js
   const where = {
     organizationId: req.user.organizationId,
     ...(status && validRoomStatuses.includes(status) ? { status } : {}),
     ...(type && validRoomTypes.includes(type) ? { type } : {})
   };
   ```

8. Prisma truy van bang `Room`:

   ```js
   prisma.room.findMany({
     where,
     include: {
       _count: {
         select: { devices: true }
       }
     },
     orderBy: { [sortBy]: order },
     skip,
     take
   });
   ```

9. Backend tra ve `data` va `meta`. Frontend cap nhat `rooms` va hien thi cac the phong. Neu rong thi hien "Khong tim thay phong hoc phu hop".

### Neu muon thay doi chuc nang nay

Vi du yeu cau: "Them bo loc suc chua toi thieu khi tim phong".

Can sua:

- Frontend: `frontend/src/pages/RoomsPage.jsx`
  - Them state `minCapacity`.
  - Them input "Suc chua toi thieu".
  - Gui them `minCapacity` trong `params` cua `api.get("/rooms")`.

- Backend: `backend/src/routes/room.routes.js`
  - Doc `const minCapacity = Number(req.query.minCapacity)`.
  - Validate neu co nhap thi phai la so nguyen duong.
  - Them vao `where`:

    ```js
    ...(Number.isInteger(minCapacity) && minCapacity > 0 ? { capacity: { gte: minCapacity } } : {})
    ```

- Database: khong can sua schema vi cot `capacity` da co san trong model `Room`.

- Kiem thu:
  - Loc `COMPUTER_LAB`, `ACTIVE`, `minCapacity=40`.
  - Nhap rong thi van hien tat ca theo bo loc cu.
  - Nhap gia tri sai thi backend can bo qua hoac tra loi ro rang tuy cach thiet ke.

## 4. Bang chuc nang va vi du dai dien

| Nhom chuc nang | Frontend chinh | Backend chinh | Vi du quy trinh | Vi du thay doi |
|---|---|---|---|---|
| Dang ky to chuc | `RegisterOrganizationPage.jsx` | `auth.routes.js` | Nguoi dung nhap thong tin truong va admin dau tien, frontend goi `POST /auth/organizations`, backend tao `Organization` va user `ADMIN`. | Them truong so dien thoai bat buoc: sua form, validate backend, neu cot da co thi khong can sua schema. |
| Dang nhap | `LoginPage.jsx` | `auth.routes.js` | Nguoi dung nhap ma to chuc, username, password; backend kiem tra organization, user, password, trang thai khoa; tra token va user. | Doi so lan sai mat khau truoc khi khoa: sua logic trong `auth.routes.js`. |
| Quan ly phong | `RoomsPage.jsx` | `room.routes.js` | Loc phong theo ma, loai phong, trang thai; backend loc theo `organizationId`, `type`, `status`. | Them loc suc chua toi thieu: sua frontend params va backend `where.capacity.gte`. |
| Quan ly thiet bi theo phong | `DevicesPage.jsx` | `room-device.routes.js`, `device.routes.js` | Vao mot phong, frontend goi `GET /rooms/:roomId/devices`, backend kiem tra phong thuoc to chuc roi tra danh sach thiet bi. | Them truong nha san xuat cho thiet bi: can sua schema, form frontend, validate backend, migration va seed. |
| Kho thiet bi | `DeviceInventoryPage.jsx` | `device.routes.js` | Loc thiet bi theo phong, loai, trang thai, ngay nhap; backend dung Prisma `device.findMany`. | Them loc theo khoang ngay nhap: sua frontend them 2 input date, backend them dieu kien `importedAt`. |
| Bao hong | `ReportCreatePage.jsx`, `ReportsPage.jsx` | `report.routes.js` | Reporter chon phong, chon thiet bi hong, nhap mo ta; backend tao `DamageReport`, gan thiet bi vao report, cap nhat trang thai thiet bi neu can, tao thong bao. | Bat buoc chon it nhat 1 thiet bi: sua validate frontend va backend. |
| Xu ly bao hong | `ReportsPage.jsx` | `report.routes.js` | Admin/Technician xem danh sach report, cap nhat trang thai `PENDING`, `IN_PROGRESS`, `COMPLETED`. | Them trang thai `CANCELLED`: phai sua enum Prisma, validate backend, UI label, seed/test. |
| Nhat ky sua chua | `RepairLogFormPage.jsx`, `DeviceHistoryPage.jsx` | `repair-log.routes.js`, `device.routes.js` | Technician them lich su sua chua cho thiet bi; backend tao `RepairLog`, cap nhat trang thai thiet bi sau sua. | Them chi phi sua chua: sua schema `RepairLog`, form, backend payload, export neu can. |
| Thong bao | `NotificationsPage.jsx` | `notification.routes.js` | Frontend lay danh sach thong bao, danh dau da doc, admin co the gui thong bao chung. | Them loc thong bao theo loai: sua tab/select frontend va `req.query.type` backend. |
| Dashboard va xuat file | `DashboardPage.jsx` | `dashboard.routes.js`, `export.routes.js` | Frontend goi `/dashboard/stats`, backend tong hop so phong, thiet bi, bao hong; export tra file CSV. | Them bieu do phong bao hong nhieu nhat: backend tong hop theo `roomId`, frontend render them chart/card. |
| Quan ly nguoi dung | `UsersPage.jsx` | `user.routes.js` | Admin loc user theo vai tro, them/sua/khoa user; backend chi cho `ADMIN` thuc hien. | Them vai tro moi: sua enum `Role`, route phan quyen, UI label, seed va cac man hinh lien quan. |
| Ho so ca nhan | `ProfilePage.jsx` | `user.routes.js` | Nguoi dung xem va sua thong tin ca nhan, doi mat khau. | Bat buoc mat khau moi manh hon: sua validate frontend va backend. |
| Thong tin to chuc | `OrganizationSettingsPage.jsx` | `organization.routes.js` | Admin xem/sua ten, dia chi, lien he to chuc hien tai. | Them logo to chuc: can them cot/logo upload hoac URL, sua form va backend. |

## 5. Mau cau tra loi khi giang vien hoi truc tiep

### Mau 1: Hoi ve quy trinh

"Chuc nang nay bat dau tu man hinh frontend. Khi nguoi dung thao tac, component luu gia tri vao state va goi API bang Axios. Axios gan token dang nhap vao header. Backend Express nhan request o route tuong ung, middleware kiem tra token va vai tro, sau do Prisma truy van database theo `organizationId` cua nguoi dung. Ket qua duoc tra ve dang JSON, frontend cap nhat state va render lai giao dien."

### Mau 2: Hoi ve thay doi chuc nang

"Neu thay doi chuc nang nay, em se xac dinh thay doi anh huong den giao dien, API hay database. Neu chi them bo loc thi sua frontend de gui tham so moi va backend de them dieu kien trong Prisma query. Neu them truong du lieu moi thi phai sua `schema.prisma`, tao migration, cap nhat form frontend, validate backend va test lai cac vai tro nguoi dung."

### Mau 3: Hoi ve loi chuc nang

"Em se kiem tra theo thu tu: giao dien co gui dung tham so khong, request tren Network co dung URL va token khong, backend route co nhan dung `req.query` hoac `req.body` khong, middleware co chan quyen khong, Prisma query co dieu kien loc dung khong, va cuoi cung la database co du lieu phu hop khong."

## 6. Checklist khi sua chuc nang bat ky

- Da xac dinh dung man hinh frontend.
- Da xac dinh API frontend dang goi.
- Da xac dinh route backend xu ly API do.
- Da kiem tra middleware `authenticate` va `authorize`.
- Da kiem tra model trong `schema.prisma`.
- Da biet thay doi co can migration database hay khong.
- Da cap nhat validate o ca frontend va backend neu can.
- Da test voi dung vai tro nguoi dung.
- Da test truong hop khong co du lieu, du lieu sai, va du lieu hop le.
- Da kiem tra giao dien sau khi backend tra ket qua.

## 7. Lenh tim nhanh khi can bao ve hoac sua code

Tim man hinh frontend co goi API:

```powershell
rg -n "api.get|api.post|api.put|api.patch|api.delete" frontend/src/pages
```

Tim route backend:

```powershell
rg -n "router.get|router.post|router.put|router.patch|router.delete" backend/src/routes
```

Tim model database:

```powershell
rg -n "model Room|model Device|model DamageReport|model RepairLog|model User" backend/prisma/schema.prisma
```

Tim noi khai bao duong dan API:

```powershell
rg -n "app.use" backend/src/app.js
```

Tim noi cau hinh token frontend:

```powershell
rg -n "Authorization|interceptors|baseURL" frontend/src/api.js
```
