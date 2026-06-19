-- Remove platform-level system admin accounts and keep users scoped to organizations.
DELETE FROM "User"
WHERE "role" = 'SYSTEM_ADMIN' OR "organizationId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'TECHNICIAN', 'REPORTER');

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "Role_new"
USING ("role"::text::"Role_new");

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
