const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { buildPaginationMeta, parsePagination, parseSort } = require("../utils/list-query");

const router = express.Router();
const validOrganizationStatuses = ["ACTIVE", "LOCKED"];
const validUserStatuses = ["ACTIVE", "LOCKED"];

router.use(authenticate, authorize("SYSTEM_ADMIN"));

function selectAdminUser() {
  return {
    id: true,
    fullName: true,
    username: true,
    email: true,
    phone: true,
    status: true,
    failedLoginCount: true,
    lockedUntil: true,
    createdAt: true
  };
}

function selectOrganizationBase() {
  return {
    id: true,
    name: true,
    slug: true,
    address: true,
    phone: true,
    email: true,
    status: true,
    createdAt: true,
    updatedAt: true
  };
}

async function findOrganization(id) {
  if (!Number.isInteger(id)) {
    return null;
  }

  return prisma.organization.findUnique({
    where: { id },
    select: { id: true }
  });
}

router.get("/stats", async (req, res) => {
  try {
    const [totalOrganizations, activeOrganizations, lockedOrganizations, totalUsers] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.organization.count({ where: { status: "LOCKED" } }),
      prisma.user.count({ where: { role: { not: "SYSTEM_ADMIN" } } })
    ]);

    return res.json({
      totalOrganizations,
      activeOrganizations,
      lockedOrganizations,
      totalUsers
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/organizations", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const { page, limit, skip, take, isPaginated } = parsePagination(req.query);
    const { sortBy, order } = parseSort(req.query, ["name", "slug", "status", "createdAt", "updatedAt"], "createdAt");

    const where = {
      ...(status && validOrganizationStatuses.includes(status) ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        select: {
          ...selectOrganizationBase(),
          users: {
            where: { role: "ADMIN" },
            select: selectAdminUser(),
            orderBy: { createdAt: "asc" }
          },
          _count: {
            select: {
              users: true,
              rooms: true,
              devices: true,
              damageReports: true
            }
          }
        },
        orderBy: { [sortBy]: order },
        ...(isPaginated ? { skip, take } : {})
      }),
      isPaginated ? prisma.organization.count({ where }) : Promise.resolve(0)
    ]);

    const data = organizations.map((organization) => ({
      ...organization,
      counts: {
        users: organization._count.users,
        rooms: organization._count.rooms,
        devices: organization._count.devices,
        reports: organization._count.damageReports
      },
      _count: undefined
    }));

    if (isPaginated) {
      return res.json({
        data,
        meta: buildPaginationMeta(total, page, limit)
      });
    }

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/organizations/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || "").trim();

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID tổ chức không hợp lệ" });
    }

    if (!validOrganizationStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái tổ chức không hợp lệ" });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { status },
      select: selectOrganizationBase()
    });

    return res.json(organization);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy tổ chức" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/organizations/:id/admins", async (req, res) => {
  try {
    const organizationId = Number(req.params.id);
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "123456");
    const email = String(req.body.email || "").trim() || null;
    const phone = String(req.body.phone || "").trim() || null;
    const status = String(req.body.status || "ACTIVE").trim();

    if (!Number.isInteger(organizationId)) {
      return res.status(400).json({ message: "ID tổ chức không hợp lệ" });
    }

    if (!fullName || !username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập họ tên, username và mật khẩu admin trường" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    if (!validUserStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái tài khoản không hợp lệ" });
    }

    const organization = await findOrganization(organizationId);

    if (!organization) {
      return res.status(404).json({ message: "Không tìm thấy tổ chức" });
    }

    const user = await prisma.user.create({
      data: {
        organizationId,
        fullName,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        role: "ADMIN",
        email,
        phone,
        status,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
      },
      select: selectAdminUser()
    });

    return res.status(201).json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Username admin đã tồn tại trong trường này" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/organizations/:organizationId/admins/:userId", async (req, res) => {
  try {
    const organizationId = Number(req.params.organizationId);
    const userId = Number(req.params.userId);
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim() || null;
    const phone = String(req.body.phone || "").trim() || null;
    const status = String(req.body.status || "ACTIVE").trim();

    if (!Number.isInteger(organizationId) || !Number.isInteger(userId)) {
      return res.status(400).json({ message: "ID tổ chức hoặc người dùng không hợp lệ" });
    }

    if (!fullName || !username) {
      return res.status(400).json({ message: "Vui lòng nhập họ tên và username admin trường" });
    }

    if (!validUserStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái tài khoản không hợp lệ" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: "ADMIN"
      }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "Không tìm thấy admin trường" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        username,
        email,
        phone,
        status,
        failedLoginCount: status === "ACTIVE" ? 0 : undefined,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
      },
      select: selectAdminUser()
    });

    return res.json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Username admin đã tồn tại trong trường này" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/organizations/:organizationId/admins/:userId/password", async (req, res) => {
  try {
    const organizationId = Number(req.params.organizationId);
    const userId = Number(req.params.userId);
    const newPassword = String(req.body.newPassword || "");

    if (!Number.isInteger(organizationId) || !Number.isInteger(userId)) {
      return res.status(400).json({ message: "ID tổ chức hoặc người dùng không hợp lệ" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: "ADMIN"
      }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "Không tìm thấy admin trường" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        failedLoginCount: 0,
        lockedUntil: null,
        status: "ACTIVE"
      }
    });

    return res.json({ message: "Đặt lại mật khẩu admin trường thành công" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
