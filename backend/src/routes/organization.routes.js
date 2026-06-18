const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

function selectOrganization() {
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

router.get("/current", authenticate, async (req, res) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: selectOrganization()
    });

    if (!organization) {
      return res.status(404).json({ message: "Không tìm thấy tổ chức" });
    }

    return res.json(organization);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/current", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const address = String(req.body.address || "").trim() || null;
    const phone = String(req.body.phone || "").trim() || null;
    const email = String(req.body.email || "").trim() || null;

    if (!name) {
      return res.status(400).json({ message: "Vui lòng nhập tên trường hoặc tổ chức" });
    }

    const organization = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: {
        name,
        address,
        phone,
        email
      },
      select: selectOrganization()
    });

    return res.json(organization);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
