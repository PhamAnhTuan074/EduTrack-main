-- Nguoi code: Phạm Anh Tuấn. Pham vi: migration to chuc.

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'LOCKED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Bootstrap existing single-school data into one default organization.
INSERT INTO "Organization" ("name", "slug", "address", "phone", "email", "updatedAt")
VALUES ('PTIT', 'ptit', NULL, NULL, NULL, CURRENT_TIMESTAMP);

-- Add organization scope columns.
ALTER TABLE "User" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Room" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Device" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "DamageReport" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "RepairLog" ADD COLUMN "organizationId" INTEGER;
ALTER TABLE "Notification" ADD COLUMN "organizationId" INTEGER;

UPDATE "User" SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ptit');
UPDATE "Room" SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ptit');
UPDATE "Device" SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ptit');
UPDATE "DamageReport" SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ptit');
UPDATE "RepairLog" SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ptit');
UPDATE "Notification" SET "organizationId" = (SELECT "id" FROM "Organization" WHERE "slug" = 'ptit');

ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Room" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Device" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "DamageReport" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "RepairLog" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Notification" ALTER COLUMN "organizationId" SET NOT NULL;

-- Replace global uniqueness with per-organization uniqueness.
DROP INDEX "User_username_key";
DROP INDEX "Room_code_key";
DROP INDEX "Device_code_key";

CREATE UNIQUE INDEX "User_organizationId_username_key" ON "User"("organizationId", "username");
CREATE UNIQUE INDEX "Room_organizationId_code_key" ON "Room"("organizationId", "code");
CREATE UNIQUE INDEX "Device_organizationId_code_key" ON "Device"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageReport" ADD CONSTRAINT "DamageReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
