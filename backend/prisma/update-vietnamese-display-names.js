// Nguoi code: Phạm Anh Tuấn và Nguyễn Ngọc Phương. Pham vi: cap nhat ten hien thi tieng Viet cho database hien co.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const userUpdates = [
  { organizationSlug: "ptit", username: "admin", fullName: "Phạm Anh Tuấn" },
  { organizationSlug: "ptit", username: "admin_csht", fullName: "Phạm Thu Hà" },
  { organizationSlug: "ptit", username: "tech", fullName: "Nguyễn Văn Nam" },
  { organizationSlug: "ptit", username: "tech_dien", fullName: "Trần Đức Minh" },
  { organizationSlug: "ptit", username: "tech_it", fullName: "Đỗ Quang Huy" },
  { organizationSlug: "ptit", username: "reporter", fullName: "Lê Minh Tuấn" },
  { organizationSlug: "ptit", username: "gv_mang", fullName: "Vũ Thị Mai" },
  { organizationSlug: "ptit", username: "gv_hoa", fullName: "Nguyễn Thị Lan" },
  { organizationSlug: "ptit", username: "gv_vatly", fullName: "Hoàng Mạnh Cường" },
  { organizationSlug: "ptit", username: "gv_ktpm", fullName: "Bùi Anh Khoa" },
  { organizationSlug: "ptit", username: "thu_vien", fullName: "Đặng Ngọc Anh" },
  { organizationSlug: "hou", username: "hou_admin", fullName: "Hoàng Thu Trang" },
  { organizationSlug: "hou", username: "hou_tech", fullName: "Phạm Văn Kiên" },
  { organizationSlug: "hou", username: "hou_reporter", fullName: "Đặng Minh Châu" },
  { organizationSlug: "hou", username: "hou_gv_media", fullName: "Lê Bảo Anh" }
];

const deviceUpdates = [
  { organizationSlug: "ptit", code: "TV-P101-01", name: "Màn hình hiển thị P101" },
  { organizationSlug: "ptit", code: "TV-P102-01", name: "Màn hình hiển thị P102" },
  { organizationSlug: "ptit", code: "TV-P201-01", name: "Màn hình hiển thị P201" },
  { organizationSlug: "ptit", code: "TV-P202-01", name: "Màn hình hiển thị P202" },
  { organizationSlug: "ptit", code: "TV-P301-01", name: "Màn hình hiển thị P301" },
  { organizationSlug: "ptit", code: "TV-P302-01", name: "Màn hình hiển thị P302" },
  { organizationSlug: "ptit", code: "TV-P401-01", name: "Màn hình hiển thị P401" },
  { organizationSlug: "ptit", code: "TV-HALL-A1-01", name: "Màn hình hiển thị HALL-A1" },
  { organizationSlug: "ptit", code: "TV-LIB-01-01", name: "Màn hình hiển thị LIB-01" },
  { organizationSlug: "ptit", code: "SP-P202-01", name: "Hệ thống loa trợ giảng Bluetooth P202" },
  { organizationSlug: "ptit", code: "SW-LAB01-01", name: "Bộ chuyển mạch mạng LAB01" },
  { organizationSlug: "ptit", code: "SW-LAB02-01", name: "Bộ chuyển mạch mạng LAB02" },
  { organizationSlug: "ptit", code: "SW-LAB03-01", name: "Bộ chuyển mạch mạng LAB03" },
  { organizationSlug: "ptit", code: "SW-LAB-MANG-01", name: "Bộ chuyển mạch mạng LAB-MANG" },
  { organizationSlug: "hou", code: "TV-A101-01", name: "Màn hình hiển thị A101" },
  { organizationSlug: "hou", code: "TV-A102-01", name: "Màn hình hiển thị A102" },
  { organizationSlug: "hou", code: "TV-B201-01", name: "Màn hình hiển thị B201" },
  { organizationSlug: "hou", code: "SW-CLAB01-01", name: "Bộ chuyển mạch mạng CLAB01" },
  { organizationSlug: "hou", code: "CAM-MEDIA01-01", name: "Máy quay ghi hình MEDIA01" }
];

async function organizationBySlug(slug, cache) {
  if (!cache.has(slug)) {
    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true, slug: true }
    });
    cache.set(slug, organization);
  }

  return cache.get(slug);
}

async function updateUsers(cache) {
  let updated = 0;
  let skipped = 0;

  for (const item of userUpdates) {
    const organization = await organizationBySlug(item.organizationSlug, cache);
    if (!organization) {
      skipped += 1;
      continue;
    }

    const result = await prisma.user.updateMany({
      where: {
        organizationId: organization.id,
        username: item.username
      },
      data: {
        fullName: item.fullName
      }
    });
    updated += result.count;
    skipped += result.count === 0 ? 1 : 0;
  }

  return { updated, skipped };
}

async function updateDevices(cache) {
  let updated = 0;
  let skipped = 0;

  for (const item of deviceUpdates) {
    const organization = await organizationBySlug(item.organizationSlug, cache);
    if (!organization) {
      skipped += 1;
      continue;
    }

    const result = await prisma.device.updateMany({
      where: {
        organizationId: organization.id,
        code: item.code
      },
      data: {
        name: item.name
      }
    });
    updated += result.count;
    skipped += result.count === 0 ? 1 : 0;
  }

  return { updated, skipped };
}

async function main() {
  const organizationCache = new Map();
  const users = await updateUsers(organizationCache);
  const devices = await updateDevices(organizationCache);

  console.log("Vietnamese display names updated");
  console.log(`Users: updated=${users.updated}, skipped=${users.skipped}`);
  console.log(`Devices: updated=${devices.updated}, skipped=${devices.skipped}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = {
  userUpdates,
  deviceUpdates
};
