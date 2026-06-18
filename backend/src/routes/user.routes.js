const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { buildPaginationMeta, parsePagination, parseSort } = require("../utils/list-query");

const router = express.Router();
const validRoles = ["ADMIN", "TECHNICIAN", "REPORTER"];
const validStatuses = ["ACTIVE", "LOCKED"];

function selectUser() {
  return {
    id: true,
    fullName: true,
    username: true,
    email: true,
    birthYear: true,
    address: true,
    phone: true,
    role: true,
    status: true,
    failedLoginCount: true,
    lockedUntil: true,
    createdAt: true,
    organization: {
      select: {
        id: true,
        name: true,
        slug: true
      }
    }
  };
}

function parseProfileInput(body) {
  const birthYear = body.birthYear === "" || body.birthYear === null || body.birthYear === undefined
    ? null
    : Number(body.birthYear);

  return {
    fullName: String(body.fullName || "").trim(),
    email: String(body.email || "").trim() || null,
    birthYear,
    address: String(body.address || "").trim() || null,
    phone: String(body.phone || "").trim() || null
  };
}

function validateProfileInput(profile) {
  if (!profile.fullName) {
    return "Vui lòng nhập họ tên";
  }

  if (profile.birthYear !== null && (!Number.isInteger(profile.birthYear) || profile.birthYear < 1900 || profile.birthYear > new Date().getFullYear())) {
    return "Năm sinh không hợp lệ";
  }

  return null;
}

router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      select: selectUser()
    });

    if (!user || (req.user.role !== "SYSTEM_ADMIN" && user.organization?.id !== req.user.organizationId)) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/profile", authenticate, async (req, res) => {
  try {
    const profile = parseProfileInput(req.body);
    const validationError = validateProfileInput(profile);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: profile,
      select: selectUser()
    });

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/profile/password", authenticate, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user || (req.user.role !== "SYSTEM_ADMIN" && user.organizationId !== req.user.organizationId)) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        failedLoginCount: 0,
        lockedUntil: null,
        status: "ACTIVE"
      }
    });

    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();
    const { page, limit, skip, take, isPaginated } = parsePagination(req.query);
    const { sortBy, order } = parseSort(req.query, ["id", "fullName", "username", "role", "status", "createdAt"], "id");

    const where = {
      organizationId: req.user.organizationId,
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(role && validRoles.includes(role) ? { role } : {})
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: selectUser(),
        orderBy: { [sortBy]: order },
        ...(isPaginated ? { skip, take } : {})
      }),
      isPaginated ? prisma.user.count({ where }) : Promise.resolve(0)
    ]);

    if (isPaginated) {
      return res.json({
        data: users,
        meta: buildPaginationMeta(total, page, limit)
      });
    }

    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "123456");
    const role = String(req.body.role || "REPORTER");
    const status = String(req.body.status || "ACTIVE");

    if (!fullName || !username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên, username và mật khẩu" });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        organizationId: req.user.organizationId,
        fullName,
        username,
        passwordHash,
        role,
        status,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
      },
      select: selectUser()
    });

    return res.status(201).json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Username đã tồn tại trong trường này" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "").trim();
    const role = String(req.body.role || "REPORTER");
    const status = String(req.body.status || "ACTIVE");

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    if (!fullName || !username) {
      return res.status(400).json({ message: "Vui lòng nhập tên và username" });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName,
        username,
        role,
        status,
        failedLoginCount: status === "ACTIVE" ? 0 : undefined,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
      },
      select: selectUser()
    });

    return res.json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Username đã tồn tại trong trường này" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/status", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!existingUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status,
        failedLoginCount: status === "ACTIVE" ? 0 : undefined,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
      },
      select: selectUser()
    });

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
