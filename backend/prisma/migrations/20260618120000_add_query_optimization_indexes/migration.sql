-- Add indexes for common multi-tenant filters, sorting, and relationship lookups.
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");
CREATE INDEX "User_organizationId_status_idx" ON "User"("organizationId", "status");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE INDEX "Room_organizationId_status_idx" ON "Room"("organizationId", "status");
CREATE INDEX "Room_organizationId_type_idx" ON "Room"("organizationId", "type");
CREATE INDEX "Room_organizationId_createdAt_idx" ON "Room"("organizationId", "createdAt");

CREATE INDEX "Device_organizationId_roomId_idx" ON "Device"("organizationId", "roomId");
CREATE INDEX "Device_organizationId_status_idx" ON "Device"("organizationId", "status");
CREATE INDEX "Device_organizationId_type_idx" ON "Device"("organizationId", "type");
CREATE INDEX "Device_organizationId_importedAt_idx" ON "Device"("organizationId", "importedAt");

CREATE INDEX "DamageReport_organizationId_status_idx" ON "DamageReport"("organizationId", "status");
CREATE INDEX "DamageReport_organizationId_createdAt_idx" ON "DamageReport"("organizationId", "createdAt");
CREATE INDEX "DamageReport_organizationId_roomId_idx" ON "DamageReport"("organizationId", "roomId");
CREATE INDEX "DamageReport_organizationId_reporterId_idx" ON "DamageReport"("organizationId", "reporterId");

CREATE INDEX "DamageReportDevice_deviceId_reportId_idx" ON "DamageReportDevice"("deviceId", "reportId");

CREATE INDEX "RepairLog_organizationId_deviceId_idx" ON "RepairLog"("organizationId", "deviceId");
CREATE INDEX "RepairLog_organizationId_reportId_idx" ON "RepairLog"("organizationId", "reportId");
CREATE INDEX "RepairLog_organizationId_technicianId_idx" ON "RepairLog"("organizationId", "technicianId");
CREATE INDEX "RepairLog_organizationId_repairedAt_idx" ON "RepairLog"("organizationId", "repairedAt");

CREATE INDEX "Notification_organizationId_recipientId_idx" ON "Notification"("organizationId", "recipientId");
CREATE INDEX "Notification_recipientId_isRead_idx" ON "Notification"("recipientId", "isRead");
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");
CREATE INDEX "Notification_organizationId_type_idx" ON "Notification"("organizationId", "type");
CREATE INDEX "Notification_organizationId_reportId_idx" ON "Notification"("organizationId", "reportId");
