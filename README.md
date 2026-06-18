# EduTrack

EduTrack is a multi-school facility management platform for schools, academies, and education organizations.

Each organization has its own isolated data space for rooms, devices, damage reports, repair logs, notifications, dashboard reports, and users.

## Main Features

- Organization registration with the first admin account.
- Login by organization code, username, and password.
- Per-organization data isolation through `organizationId`.
- Room management for classrooms, computer labs, and labs.
- Device management by room, type, status, and import date.
- Damage report workflow with automatic device status updates.
- Repair log tracking for admins and technicians.
- Notifications for new reports, repair updates, and admin announcements.
- Dashboard statistics and CSV export.
- User management with `ADMIN`, `TECHNICIAN`, and `REPORTER` roles.
- Public website pages for introduction, team, contact, organization registration, and login.
- Personal profile management with contact information and password change.
- Pagination, sorting, search, and filters on main management lists.
- Admin role-permission matrix for the current facility workflow.
- System admin role for managing all registered schools and each school's admin accounts.

## Demo Account

After running the seed script:

- Organization code: `ptit`
- System admin: organization code `system`, username `systemadmin`, password `123456`
- Admin: `admin` / `123456`
- Technician: `tech` / `123456`
- Reporter: `reporter` / `123456`

## Local Development

Backend:

```bash
cd backend
npm ci
npx prisma migrate deploy
npm run prisma:seed
npm run prisma:seed-extra
npm run dev
```

On Windows PowerShell, set `DATABASE_URL` before running Prisma commands if you do not use a `.env` file:

```powershell
$env:DATABASE_URL="postgresql://postgres:123456@localhost:5432/facility_management"
npx prisma migrate deploy
npm run prisma:seed
npm run prisma:seed-extra
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

By default, the frontend calls `http://localhost:5000/api`. You can override this with `VITE_API_URL` or `VITE_API_BASE_URL`.

## Docker

```bash
docker compose up --build
```

Then seed demo data. This runs both the base seed and the larger extra dataset:

```bash
docker compose --profile seed up seed
```

Add or refresh the larger non-destructive demo dataset:

```powershell
cd backend
$env:DATABASE_URL="postgresql://postgres:123456@localhost:5432/facility_management"
npm run prisma:seed-extra
```

Create the system admin on an existing database without deleting data:

```bash
cd backend
npm run system-admin:ensure
```

Frontend runs at `http://localhost:3000`.
Backend runs at `http://localhost:5000`.

## Multi-Tenant Notes

- A user belongs to exactly one organization.
- Room codes and device codes are unique only inside one organization.
- Usernames are unique only inside one organization.
- API access is scoped by `organizationId` from the JWT token.
- Old tokens without organization scope are rejected and users must log in again.
