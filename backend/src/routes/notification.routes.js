const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();
const validFilters = ["all", "unread", "read"];

function buildWhere(req, filter) {
  const where = {
    organizationId: req.user.organizationId,
    recipientId: req.user.id
  };

  if (filter === "unread") {
    where.isRead = false;
  }

  if (filter === "read") {
    where.isRead = true;
  }

  return where;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const filter = validFilters.includes(req.query.filter) ? req.query.filter : "all";

    const [notifications, countGroups] = await Promise.all([
      prisma.notification.findMany({
        where: buildWhere(req, filter),
        include: {
          actor: { select: { id: true, fullName: true, username: true, role: true } },
          report: {
            select: {
              id: true,
              status: true,
              room: { select: { id: true, code: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.notification.groupBy({
        by: ["isRead"],
        where: buildWhere(req, "all"),
        _count: { id: true }
      })
    ]);

    const unreadCount = countGroups.find((group) => group.isRead === false)?._count.id || 0;
    const readCount = countGroups.find((group) => group.isRead === true)?._count.id || 0;

    return res.json({
      notifications,
      counts: {
        all: unreadCount + readCount,
        unread: unreadCount,
        read: readCount
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: buildWhere(req, "unread")
    });

    return res.json({ count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/admin", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();

    if (!title || !message) {
      return res.status(400).json({ message: "Vui lòng nhập tiêu đề và nội dung thông báo" });
    }

    const recipients = await prisma.user.findMany({
      where: {
        organizationId: req.user.organizationId,
        status: "ACTIVE"
      },
      select: { id: true }
    });

    const result = await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        type: "ADMIN_ANNOUNCEMENT",
        organizationId: req.user.organizationId,
        title,
        message,
        actorId: req.user.id,
        recipientId: recipient.id
      }))
    });

    return res.status(201).json({ created: result.count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thông báo không hợp lệ" });
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId,
        recipientId: req.user.id
      },
      select: { id: true }
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.json(updatedNotification);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/mark-all-read", authenticate, async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: buildWhere(req, "unread"),
      data: { isRead: true }
    });

    return res.json({ updated: result.count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
