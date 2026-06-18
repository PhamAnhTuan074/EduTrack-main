-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('PROJECTOR', 'TV', 'AIR_CONDITIONER', 'COMPUTER', 'SPEAKER', 'TABLE_CHAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('GOOD', 'BROKEN', 'REPAIRING');

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'GOOD',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roomId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_code_key" ON "Device"("code");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
