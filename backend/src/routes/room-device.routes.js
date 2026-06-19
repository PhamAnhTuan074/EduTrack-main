// Nguoi code: Nguyễn Ngọc Phương. Pham vi: lien ket thiet bi voi phong hoc.

const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router({ mergeParams: true });

const validDeviceTypes = ["PROJECTOR", "TV", "AIR_CONDITIONER", "COMPUTER", "SPEAKER", "TABLE_CHAIR", "OTHER"];
const validDeviceStatuses = ["GOOD", "BROKEN", "REPAIRING"];

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const search = String(req.query.search || "").trim();

    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "ID phòng học không hợp lệ" });
    }

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        organizationId: req.user.organizationId
      }
    });

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    const devices = await prisma.device.findMany({
      where: {
        roomId,
        organizationId: req.user.organizationId,
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { code: "asc" }
    });

    return res.json({ room, devices });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const code = normalizeCode(req.body.code);
    const { name, type, status } = req.body;
    const importedAt = req.body.importedAt ? new Date(req.body.importedAt) : new Date();

    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "ID phòng học không hợp lệ" });
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

    if (Number.isNaN(importedAt.getTime())) {
      return res.status(400).json({ message: "Ngày nhập không hợp lệ" });
    }

    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        organizationId: req.user.organizationId
      }
    });

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    const device = await prisma.device.create({
      data: {
        organizationId: req.user.organizationId,
        code,
        name: name.trim(),
        type,
        status: status || "GOOD",
        importedAt,
        roomId
      }
    });

    return res.status(201).json(device);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã thiết bị đã tồn tại" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
