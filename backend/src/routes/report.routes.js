const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { buildPaginationMeta, parsePagination, parseSort } = require("../utils/list-query");

const router = express.Router();
const validReportStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const reportStatusLabels = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành"
};

function normalizeDeviceIds(body) {
  if (Array.isArray(body.deviceIds)) {
    return [...new Set(body.deviceIds.map(Number).filter(Number.isInteger))];
  }

  if (body.deviceId) {
    const deviceId = Number(body.deviceId);
    return Number.isInteger(deviceId) ? [deviceId] : [];
  }

  return [];
}

async function createReportNotifications(tx, report, actorId) {
  const recipients = await tx.user.findMany({
    where: {
      organizationId: report.organizationId,
      role: { in: ["ADMIN", "TECHNICIAN"] }
    },
    select: { id: true }
  });

  if (recipients.length === 0) {
    return;
  }

  const deviceNames = report.devices.map((item) => item.device.name).join(", ");

  await tx.notification.createMany({
    data: recipients.map((recipient) => ({
      organizationId: report.organizationId,
      type: "DAMAGE_REPORT",
      title: `Phiếu báo hỏng mới #${report.id}`,
      message: `${report.reporter.fullName} báo hỏng tại phòng ${report.room.code}: ${deviceNames}.`,
      recipientId: recipient.id,
      actorId,
      reportId: report.id
    }))
  });
}

async function createStatusNotification(report, actorId, status) {
  await prisma.notification.create({
    data: {
      organizationId: report.organizationId,
      type: "REPAIR_UPDATE",
      title: `Cập nhật phiếu báo hỏng #${report.id}`,
      message: `Phiếu báo hỏng tại phòng ${report.room.code} đã chuyển sang trạng thái: ${reportStatusLabels[status]}.`,
      recipientId: report.reporter.id,
      actorId,
      reportId: report.id
    }
  });
}

router.post("/", authenticate, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const roomId = Number(req.body.roomId);
    const deviceIds = normalizeDeviceIds(req.body);
    const description = String(req.body.description || "").trim();

    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Vui lòng chọn phòng học" });
    }

    if (deviceIds.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn thiết bị bị hỏng" });
    }

    if (!description) {
      return res.status(400).json({ message: "Vui lòng nhập mô tả sự cố" });
    }

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        organizationId
      },
      select: { id: true }
    });

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    const devices = await prisma.device.findMany({
      where: {
        id: { in: deviceIds },
        roomId,
        organizationId
      },
      select: { id: true }
    });

    if (devices.length !== deviceIds.length) {
      return res.status(400).json({ message: "Thiết bị không thuộc phòng đã chọn" });
    }

    const report = await prisma.$transaction(async (tx) => {
      const createdReport = await tx.damageReport.create({
        data: {
          organizationId,
          reporterId: req.user.id,
          roomId,
          description,
          devices: {
            create: deviceIds.map((deviceId) => ({ deviceId }))
          }
        },
        include: {
          reporter: { select: { id: true, fullName: true, username: true, role: true } },
          room: { select: { id: true, code: true } },
          devices: {
            include: {
              device: { select: { id: true, code: true, name: true, status: true } }
            }
          }
        }
      });

      await tx.device.updateMany({
        where: {
          id: { in: deviceIds },
          organizationId
        },
        data: { status: "BROKEN" }
      });

      await createReportNotifications(tx, createdReport, req.user.id);

      return createdReport;
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const { page, limit, skip, take, isPaginated } = parsePagination(req.query);
    const { sortBy, order } = parseSort(req.query, ["id", "status", "createdAt", "updatedAt"], "createdAt");

    const where = {
      organizationId: req.user.organizationId,
      ...(status && validReportStatuses.includes(status) ? { status } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { room: { code: { contains: search, mode: "insensitive" } } },
              { reporter: { fullName: { contains: search, mode: "insensitive" } } },
              { reporter: { username: { contains: search, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [reports, total] = await Promise.all([
      prisma.damageReport.findMany({
        where,
        include: {
          reporter: { select: { id: true, fullName: true, username: true, role: true } },
          room: { select: { id: true, code: true } },
          devices: {
            include: {
              device: { select: { id: true, code: true, name: true, status: true } }
            }
          }
        },
        orderBy: { [sortBy]: order },
        ...(isPaginated ? { skip, take } : {})
      }),
      isPaginated ? prisma.damageReport.count({ where }) : Promise.resolve(0)
    ]);

    if (isPaginated) {
      return res.json({
        data: reports,
        meta: buildPaginationMeta(total, page, limit)
      });
    }

    return res.json(reports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/status", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID phiếu báo hỏng không hợp lệ" });
    }

    if (!validReportStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái phiếu không hợp lệ" });
    }

    const existingReport = await prisma.damageReport.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      select: { id: true }
    });

    if (!existingReport) {
      return res.status(404).json({ message: "Không tìm thấy phiếu báo hỏng" });
    }

    const report = await prisma.damageReport.update({
      where: { id },
      data: { status },
      include: {
        reporter: { select: { id: true, fullName: true, username: true, role: true } },
        room: { select: { id: true, code: true } },
        devices: {
          include: {
            device: { select: { id: true, code: true, name: true, status: true } }
          }
        }
      }
    });

    await createStatusNotification(report, req.user.id, status);

    return res.json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
