// Nguoi code: Nguyễn Ngọc Phương. Pham vi: thong ke dashboard.

const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/stats", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const [
      totalRooms,
      totalDevices,
      totalReports,
      brokenDevices,
      pendingReports,
      deviceStatusGroups,
      reportStatusGroups,
      brokenGroups
    ] = await Promise.all([
      prisma.room.count({ where: { organizationId: req.user.organizationId } }),
      prisma.device.count({ where: { organizationId: req.user.organizationId } }),
      prisma.damageReport.count({ where: { organizationId: req.user.organizationId } }),
      prisma.device.count({ where: { organizationId: req.user.organizationId, status: "BROKEN" } }),
      prisma.damageReport.count({ where: { organizationId: req.user.organizationId, status: "PENDING" } }),
      prisma.device.groupBy({
        by: ["status"],
        where: { organizationId: req.user.organizationId },
        _count: { id: true }
      }),
      prisma.damageReport.groupBy({
        by: ["status"],
        where: { organizationId: req.user.organizationId },
        _count: { id: true }
      }),
      prisma.device.groupBy({
        by: ["roomId"],
        where: { organizationId: req.user.organizationId, status: "BROKEN" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5
      })
    ]);

    const roomIds = brokenGroups.map((item) => item.roomId);
    const rooms = roomIds.length > 0
      ? await prisma.room.findMany({
          where: {
            id: { in: roomIds },
            organizationId: req.user.organizationId
          },
          select: { id: true, code: true, type: true }
        })
      : [];
    const roomsById = new Map(rooms.map((room) => [room.id, room]));

    const topBrokenRooms = brokenGroups
      .map((item) => {
        const room = roomsById.get(item.roomId);
        return {
          roomId: item.roomId,
          roomCode: room?.code || "Không rõ",
          roomType: room?.type || "OTHER",
          brokenCount: item._count.id
        };
      })
      .sort((a, b) => b.brokenCount - a.brokenCount)
      .slice(0, 5);

    const deviceStatusCounts = {
      GOOD: 0,
      BROKEN: 0,
      REPAIRING: 0
    };
    deviceStatusGroups.forEach((item) => {
      deviceStatusCounts[item.status] = item._count.id;
    });

    const reportStatusCounts = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0
    };
    reportStatusGroups.forEach((item) => {
      reportStatusCounts[item.status] = item._count.id;
    });

    return res.json({
      totalRooms,
      totalDevices,
      totalReports,
      brokenDevices,
      pendingReports,
      inProgressReports: reportStatusCounts.IN_PROGRESS,
      processedReports: reportStatusCounts.COMPLETED,
      deviceStatusCounts,
      reportStatusCounts,
      topBrokenRooms
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
