-- Nguoi code: Phạm Anh Tuấn. Pham vi: migration vai tro system admin.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SYSTEM_ADMIN';

ALTER TABLE "User" ALTER COLUMN "organizationId" DROP NOT NULL;
