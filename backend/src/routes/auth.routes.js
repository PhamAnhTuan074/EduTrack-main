// Nguoi code: Phạm Anh Tuấn. Pham vi: dang nhap, dang ky to chuc va xac thuc nguoi dung.

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();
const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function buildToken(user, organization) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      organizationId: organization?.id || null,
      organizationSlug: organization?.slug || null
    },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );
}

function publicUser(user, organization) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    birthYear: user.birthYear,
    address: user.address,
    phone: user.phone,
    role: user.role,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug
        }
      : null
  };
}

router.post("/organizations", async (req, res) => {
  try {
    const organizationName = String(req.body.organizationName || req.body.name || "").trim();
    const slug = normalizeSlug(req.body.organizationSlug || req.body.slug || organizationName);
    const address = String(req.body.address || "").trim() || null;
    const phone = String(req.body.phone || "").trim() || null;
    const email = String(req.body.email || "").trim() || null;
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "admin").trim();
    const password = String(req.body.password || "");

    if (!organizationName || !slug || !fullName || !username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin trường và tài khoản admin" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          address,
          phone,
          email
        }
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          fullName,
          username,
          passwordHash,
          role: "ADMIN"
        }
      });

      return { organization, user };
    });

    const token = buildToken(result.user, result.organization);

    return res.status(201).json({
      message: "Tạo tài khoản trường thành công",
      token,
      user: publicUser(result.user, result.organization)
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã trường hoặc username admin đã tồn tại" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const organizationSlug = normalizeSlug(req.body.organizationSlug || req.body.organization || "");
    const username = String(req.body.username || "").trim();
    const { password } = req.body;

    if (!organizationSlug || !username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập mã trường, tên đăng nhập và mật khẩu" });
    }

    const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug } });

    if (!organization) {
      return res.status(401).json({ message: "Mã trường hoặc thông tin đăng nhập không đúng" });
    }

    if (organization.status === "LOCKED") {
      return res.status(403).json({ message: "Tài khoản trường đang bị khóa" });
    }

    const user = await prisma.user.findUnique({
      where: {
        organizationId_username: {
          organizationId: organization.id,
          username
        }
      }
    });

    if (!user) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const now = new Date();

    if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil > now) {
      return res.status(403).json({ message: "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau." });
    }

    if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil <= now) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          failedLoginCount: 0,
          lockedUntil: null
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const failedLoginCount = user.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= MAX_FAILED_LOGIN;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          status: shouldLock ? "LOCKED" : "ACTIVE",
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null
        }
      });

      if (shouldLock) {
        return res.status(403).json({ message: "Tài khoản đã bị khóa 15 phút do nhập sai mật khẩu 5 lần" });
      }

      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        status: "ACTIVE",
        lockedUntil: null
      }
    });

    const token = buildToken(user, organization);

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: publicUser(user, organization)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        birthYear: true,
        address: true,
        phone: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    if (user.organization?.id !== req.user.organizationId) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.json(user);
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
});

module.exports = router;
