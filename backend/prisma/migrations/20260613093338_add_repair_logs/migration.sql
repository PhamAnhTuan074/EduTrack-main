-- CreateTable
CREATE TABLE "RepairLog" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "reportId" INTEGER,
    "technicianId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "repairedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "afterStatus" "DeviceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DamageReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairLog" ADD CONSTRAINT "RepairLog_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
