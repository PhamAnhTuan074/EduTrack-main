const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).replace(/"/g, '""');
  return /[",\n\r]/.test(text) ? `"${text}"` : text;
}

function sendCsv(res, filename, headers, rows) {
  const csvRows = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send("\uFEFF" + csvRows);
}

router.get("/devices", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: {
        organizationId: req.user.organizationId
      },
      include: { room: { select: { code: true } } },
      orderBy: [{ room: { code: "asc" } }, { code: "asc" }]
    });

    return sendCsv(
      res,
      "danh-sach-thiet-bi.csv",
      ["Mã phòng", "Mã thiết bị", "Tên thiết bị", "Loại", "Trạng thái", "Ngày nhập"],
      devices.map((device) => [
        device.room?.code,
        device.code,
        device.name,
        device.type,
        device.status,
        device.importedAt.toISOString().slice(0, 10)
      ])
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/repair-logs", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const repairLogs = await prisma.repairLog.findMany({
      where: {
        organizationId: req.user.organizationId
      },
      include: {
        device: { include: { room: { select: { code: true } } } },
        technician: { select: { fullName: true, username: true } },
        report: { select: { id: true, status: true } }
      },
      orderBy: { repairedAt: "desc" }
    });

    return sendCsv(
      res,
      "lich-su-sua-chua.csv",
      ["Ngày sửa", "Mã phòng", "Mã thiết bị", "Tên thiết bị", "Kỹ thuật viên", "Nội dung sửa", "Số lượng", "Trạng thái sau sửa", "Phiếu liên quan"],
      repairLogs.map((log) => [
        log.repairedAt.toISOString().slice(0, 10),
        log.device?.room?.code,
        log.device?.code,
        log.device?.name,
        log.technician?.fullName,
        log.content,
        log.quantity,
        log.afterStatus,
        log.report ? `#${log.report.id}` : ""
      ])
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
