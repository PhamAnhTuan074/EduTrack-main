// Nguoi code: Nguyễn Ngọc Phương. Pham vi: quan ly thiet bi va trang thai thiet bi.

const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { buildPaginationMeta, parsePagination, parseSort } = require("../utils/list-query");

const router = express.Router();

const validDeviceTypes = ["PROJECTOR", "TV", "AIR_CONDITIONER", "COMPUTER", "SPEAKER", "TABLE_CHAIR", "OTHER"];
const validDeviceStatuses = ["GOOD", "BROKEN", "REPAIRING"];

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const type = String(req.query.type || "").trim();
    const status = String(req.query.status || "").trim();
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const { page, limit, skip, take, isPaginated } = parsePagination(req.query);
    const { sortBy, order } = parseSort(req.query, ["code", "name", "type", "status", "importedAt", "createdAt"], "code");

    const where = {
      organizationId: req.user.organizationId,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(type && validDeviceTypes.includes(type) ? { type } : {}),
      ...(status && validDeviceStatuses.includes(status) ? { status } : {}),
      ...(Number.isInteger(roomId) ? { roomId } : {})
    };

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        include: {
          room: { select: { id: true, code: true, type: true } }
        },
        orderBy: { [sortBy]: order },
        ...(isPaginated ? { skip, take } : {})
      }),
      isPaginated ? prisma.device.count({ where }) : Promise.resolve(0)
    ]);

    if (isPaginated) {
      return res.json({
        data: devices,
        meta: buildPaginationMeta(total, page, limit)
      });
    }

    return res.json(devices);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/:id/repair-logs", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    const device = await prisma.device.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        status: true,
        importedAt: true,
        room: { select: { id: true, code: true } }
      }
    });

    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    const repairLogs = await prisma.repairLog.findMany({
      where: {
        deviceId: id,
        organizationId: req.user.organizationId
      },
      include: {
        technician: { select: { id: true, fullName: true, username: true, role: true } },
        report: { select: { id: true, description: true, status: true } }
      },
      orderBy: { repairedAt: "desc" }
    });

    return res.json({ device, repairLogs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const code = normalizeCode(req.body.code);
    const { name, type, status } = req.body;
    const roomId = req.body.roomId ? Number(req.body.roomId) : undefined;
    const importedAt = req.body.importedAt ? new Date(req.body.importedAt) : undefined;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    if (!code || !name || !type) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin thiết bị" });
    }

    if (!validDeviceTypes.includes(type)) {
      return res.status(400).json({ message: "Loại thiết bị không hợp lệ" });
    }

    if (status && !validDeviceStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái thiết bị không hợp lệ" });
    }

    if (roomId !== undefined && !Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Phòng học không hợp lệ" });
    }

    if (importedAt && Number.isNaN(importedAt.getTime())) {
      return res.status(400).json({ message: "Ngày nhập không hợp lệ" });
    }

    const existingDevice = await prisma.device.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      select: { id: true, status: true }
    });

    if (!existingDevice) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    if (roomId !== undefined) {
      const room = await prisma.room.findFirst({
        where: {
          id: roomId,
          organizationId: req.user.organizationId
        },
        select: { id: true }
      });

      if (!room) {
        return res.status(404).json({ message: "Không tìm thấy phòng học" });
      }
    }

    const device = await prisma.device.update({
      where: { id },
      data: {
        code,
        name: name.trim(),
        type,
        status: status || existingDevice.status,
        ...(roomId !== undefined ? { roomId } : {}),
        ...(importedAt ? { importedAt } : {})
      },
      include: { room: { select: { id: true, code: true, type: true } } }
    });

    return res.json(device);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã thiết bị đã tồn tại trong trường này" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/status", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    if (!validDeviceStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái thiết bị không hợp lệ" });
    }

    const existingDevice = await prisma.device.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      select: { id: true }
    });

    if (!existingDevice) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    const device = await prisma.device.update({
      where: { id },
      data: { status },
      include: { room: { select: { id: true, code: true, type: true } } }
    });

    return res.json(device);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    const existingDevice = await prisma.device.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      },
      select: { id: true }
    });

    if (!existingDevice) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    await prisma.device.delete({ where: { id } });

    return res.json({ message: "Xóa thiết bị thành công" });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(409).json({ message: "Không thể xóa thiết bị đã có phiếu báo hỏng hoặc lịch sử sửa chữa" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
