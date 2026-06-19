-- Nguoi code: Phạm Anh Tuấn. Pham vi: migration ho so nguoi dung.

ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "birthYear" INTEGER;
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
