// Nguoi code: Nguyễn Ngọc Phương. Pham vi: ghi nhan lich su sua chua thiet bi.

const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();
const validDeviceStatuses = ["GOOD", "BROKEN", "REPAIRING"];

const reportStatusLabels = {
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành"
};

router.post("/", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const deviceId = Number(req.body.deviceId);
    const reportId = req.body.reportId ? Number(req.body.reportId) : null;
    const quantity = Number(req.body.quantity || 1);
    const repairedAt = req.body.repairedAt ? new Date(req.body.repairedAt) : new Date();
    const content = String(req.body.content || "").trim();
    const { afterStatus } = req.body;

    if (!Number.isInteger(deviceId)) {
      return res.status(400).json({ message: "Vui lòng chọn thiết bị cần ghi nhận sửa chữa" });
    }

    if (reportId !== null && !Number.isInteger(reportId)) {
      return res.status(400).json({ message: "ID phiếu báo hỏng không hợp lệ" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Số lượng sửa chữa phải là số nguyên lớn hơn 0" });
    }

    if (Number.isNaN(repairedAt.getTime())) {
      return res.status(400).json({ message: "Ngày sửa chữa không hợp lệ" });
    }

    if (!content) {
      return res.status(400).json({ message: "Vui lòng nhập nội dung sửa chữa" });
    }

    if (!validDeviceStatuses.includes(afterStatus)) {
      return res.status(400).json({ message: "Trạng thái sau sửa không hợp lệ" });
    }

    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        organizationId
      },
      select: { id: true }
    });

    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    if (reportId !== null) {
      const reportDevice = await prisma.damageReportDevice.findFirst({
        where: {
          reportId,
          deviceId,
          report: {
            organizationId
          }
        },
        select: { reportId: true, deviceId: true }
      });

      if (!reportDevice) {
        return res.status(400).json({ message: "Thiết bị không thuộc phiếu báo hỏng đã chọn" });
      }
    }

    const repairLog = await prisma.$transaction(async (tx) => {
      const createdLog = await tx.repairLog.create({
        data: {
          organizationId,
          deviceId,
          reportId,
          technicianId: req.user.id,
          quantity,
          repairedAt,
          content,
          afterStatus
        },
        include: {
          device: { include: { room: { select: { id: true, code: true } } } },
          report: true,
          technician: { select: { id: true, fullName: true, username: true, role: true } }
        }
      });

      await tx.device.update({
        where: { id: deviceId },
        data: { status: afterStatus }
      });

      if (reportId !== null) {
        const nextReportStatus = afterStatus === "GOOD" ? "COMPLETED" : "IN_PROGRESS";
        const updatedReport = await tx.damageReport.update({
          where: { id: reportId },
          data: { status: nextReportStatus },
          include: {
            room: { select: { id: true, code: true } },
            reporter: { select: { id: true } }
          }
        });

        await tx.notification.create({
          data: {
            organizationId,
            type: "REPAIR_UPDATE",
            title: `Cập nhật phiếu báo hỏng #${reportId}`,
            message: `Phiếu báo hỏng tại phòng ${updatedReport.room.code} đã chuyển sang trạng thái: ${reportStatusLabels[nextReportStatus]}.`,
            recipientId: updatedReport.reporter.id,
            actorId: req.user.id,
            reportId
          }
        });
      }

      return createdLog;
    });

    return res.status(201).json(repairLog);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
