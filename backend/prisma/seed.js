// Nguoi code: Phạm Anh Tuấn và Nguyễn Ngọc Phương. Pham vi: du lieu mau nen cho các module dung chung.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.repairLog.deleteMany();
  await prisma.damageReportDevice.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.device.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);

  const organization = await prisma.organization.create({
    data: {
      name: "Học viện Công nghệ Bưu chính Viễn thông",
      slug: "ptit",
      address: "Hà Nội",
      phone: "0240000000",
      email: "cosovatchat@ptit.edu.vn"
    }
  });

  const admin = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: "Phạm Anh Tuấn",
      username: "admin",
      passwordHash,
      role: "ADMIN",
      email: "admin@ptit.edu.vn",
      birthYear: 1988,
      address: "Hà Nội",
      phone: "0900000001"
    }
  });

  const technician = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: "Nguyễn Văn Nam",
      username: "tech",
      passwordHash,
      role: "TECHNICIAN",
      email: "tech@ptit.edu.vn",
      birthYear: 1993,
      address: "Hà Nội",
      phone: "0900000002"
    }
  });

  const reporter = await prisma.user.create({
    data: {
      organizationId: organization.id,
      fullName: "Lê Minh Tuấn",
      username: "reporter",
      passwordHash,
      role: "REPORTER",
      email: "reporter@ptit.edu.vn",
      birthYear: 1998,
      address: "Hà Nội",
      phone: "0900000003"
    }
  });

  const roomData = (data) => ({ ...data, organizationId: organization.id });

  const p101 = await prisma.room.create({ data: roomData({ code: "P101", type: "THEORY", capacity: 60, status: "ACTIVE" }) });
  const p102 = await prisma.room.create({ data: roomData({ code: "P102", type: "THEORY", capacity: 50, status: "MAINTENANCE" }) });
  const lab01 = await prisma.room.create({ data: roomData({ code: "LAB01", type: "COMPUTER_LAB", capacity: 35, status: "ACTIVE" }) });
  const p201 = await prisma.room.create({ data: roomData({ code: "P201", type: "THEORY", capacity: 70, status: "ACTIVE" }) });
  const p202 = await prisma.room.create({ data: roomData({ code: "P202", type: "THEORY", capacity: 55, status: "ACTIVE" }) });
  const lab02 = await prisma.room.create({ data: roomData({ code: "LAB02", type: "COMPUTER_LAB", capacity: 40, status: "ACTIVE" }) });
  const labChem = await prisma.room.create({ data: roomData({ code: "LAB-HOA", type: "LAB", capacity: 30, status: "MAINTENANCE" }) });
  const labPhysics = await prisma.room.create({ data: roomData({ code: "LAB-LY", type: "LAB", capacity: 32, status: "ACTIVE" }) });

  const deviceData = (data) => ({ ...data, organizationId: organization.id });

  const projector = await prisma.device.create({
    data: deviceData({ code: "MC-P101-01", name: "Máy chiếu P101", type: "PROJECTOR", status: "BROKEN", roomId: p101.id })
  });

  await prisma.device.create({
    data: deviceData({ code: "TV-P101-01", name: "Màn hình hiển thị P101", type: "TV", status: "BROKEN", roomId: p101.id })
  });

  const airConditioner = await prisma.device.create({
    data: deviceData({ code: "AC-P102-01", name: "Điều hòa P102", type: "AIR_CONDITIONER", status: "REPAIRING", roomId: p102.id })
  });

  const teacherComputer = await prisma.device.create({
    data: deviceData({ code: "PC-LAB01-01", name: "Máy tính giảng viên LAB01", type: "COMPUTER", status: "GOOD", roomId: lab01.id })
  });

  const speaker = await prisma.device.create({
    data: deviceData({ code: "SP-LAB01-01", name: "Loa phòng LAB01", type: "SPEAKER", status: "BROKEN", roomId: lab01.id })
  });

  await prisma.device.createMany({
    data: [
      deviceData({ code: "MC-P201-01", name: "Máy chiếu Epson EB-X51 P201", type: "PROJECTOR", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-05") }),
      deviceData({ code: "TV-P201-01", name: "Màn hình Samsung 55 inch P201", type: "TV", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-05") }),
      deviceData({ code: "AC-P201-01", name: "Điều hòa Daikin P201", type: "AIR_CONDITIONER", status: "BROKEN", roomId: p201.id, importedAt: new Date("2026-01-08") }),
      deviceData({ code: "SP-P201-01", name: "Loa treo tường P201", type: "SPEAKER", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-08") }),
      deviceData({ code: "BC-P201-01", name: "Bộ bàn ghế giảng viên P201", type: "TABLE_CHAIR", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-10") }),

      deviceData({ code: "MC-P202-01", name: "Máy chiếu Panasonic P202", type: "PROJECTOR", status: "REPAIRING", roomId: p202.id, importedAt: new Date("2026-02-02") }),
      deviceData({ code: "TV-P202-01", name: "Màn hình LG 50 inch P202", type: "TV", status: "GOOD", roomId: p202.id, importedAt: new Date("2026-02-02") }),
      deviceData({ code: "AC-P202-01", name: "Điều hòa Casper P202", type: "AIR_CONDITIONER", status: "GOOD", roomId: p202.id, importedAt: new Date("2026-02-04") }),
      deviceData({ code: "SP-P202-01", name: "Hệ thống loa trợ giảng Bluetooth P202", type: "SPEAKER", status: "BROKEN", roomId: p202.id, importedAt: new Date("2026-02-04") }),

      deviceData({ code: "PC-LAB02-01", name: "Máy tính giảng viên LAB02", type: "COMPUTER", status: "GOOD", roomId: lab02.id, importedAt: new Date("2026-03-01") }),
      deviceData({ code: "PC-LAB02-02", name: "Máy tính sinh viên LAB02-02", type: "COMPUTER", status: "GOOD", roomId: lab02.id, importedAt: new Date("2026-03-01") }),
      deviceData({ code: "PC-LAB02-03", name: "Máy tính sinh viên LAB02-03", type: "COMPUTER", status: "BROKEN", roomId: lab02.id, importedAt: new Date("2026-03-01") }),
      deviceData({ code: "MC-LAB02-01", name: "Máy chiếu phòng LAB02", type: "PROJECTOR", status: "GOOD", roomId: lab02.id, importedAt: new Date("2026-03-03") }),
      deviceData({ code: "SW-LAB02-01", name: "Bộ chuyển mạch mạng LAB02", type: "OTHER", status: "REPAIRING", roomId: lab02.id, importedAt: new Date("2026-03-05") }),

      deviceData({ code: "TB-HOA-01", name: "Bộ dụng cụ thí nghiệm hóa cơ bản", type: "OTHER", status: "GOOD", roomId: labChem.id, importedAt: new Date("2026-04-01") }),
      deviceData({ code: "HT-HOA-01", name: "Hệ thống hút khí LAB-HOA", type: "OTHER", status: "BROKEN", roomId: labChem.id, importedAt: new Date("2026-04-02") }),
      deviceData({ code: "BC-HOA-01", name: "Bàn thí nghiệm LAB-HOA", type: "TABLE_CHAIR", status: "GOOD", roomId: labChem.id, importedAt: new Date("2026-04-02") }),

      deviceData({ code: "TB-LY-01", name: "Bộ thí nghiệm điện học LAB-LY", type: "OTHER", status: "GOOD", roomId: labPhysics.id, importedAt: new Date("2026-05-01") }),
      deviceData({ code: "MC-LY-01", name: "Máy chiếu phòng LAB-LY", type: "PROJECTOR", status: "GOOD", roomId: labPhysics.id, importedAt: new Date("2026-05-03") }),
      deviceData({ code: "AC-LY-01", name: "Điều hòa LAB-LY", type: "AIR_CONDITIONER", status: "GOOD", roomId: labPhysics.id, importedAt: new Date("2026-05-03") })
    ]
  });

  const reportProjector = await prisma.damageReport.create({
    data: {
      organizationId: organization.id,
      reporterId: reporter.id,
      roomId: p101.id,
      description: "Máy chiếu không lên hình khi bắt đầu tiết học.",
      status: "PENDING",
      devices: { create: [{ deviceId: projector.id }] }
    }
  });

  const reportAc = await prisma.damageReport.create({
    data: {
      organizationId: organization.id,
      reporterId: reporter.id,
      roomId: p102.id,
      description: "Điều hòa phát tiếng ồn lớn và làm mát yếu.",
      status: "IN_PROGRESS",
      devices: { create: [{ deviceId: airConditioner.id }] }
    }
  });

  const reportSpeaker = await prisma.damageReport.create({
    data: {
      organizationId: organization.id,
      reporterId: reporter.id,
      roomId: lab01.id,
      description: "Loa bị rè khi mở âm lượng lớn.",
      status: "COMPLETED",
      devices: { create: [{ deviceId: speaker.id }] }
    }
  });

  await prisma.repairLog.createMany({
    data: [
      {
        organizationId: organization.id,
        deviceId: airConditioner.id,
        reportId: reportAc.id,
        technicianId: technician.id,
        quantity: 1,
        repairedAt: new Date("2026-06-10"),
        content: "Vệ sinh lưới lọc, kiểm tra gas lạnh, thiết bị cần theo dõi thêm.",
        afterStatus: "REPAIRING"
      },
      {
        organizationId: organization.id,
        deviceId: speaker.id,
        reportId: reportSpeaker.id,
        technicianId: technician.id,
        quantity: 1,
        repairedAt: new Date("2026-06-11"),
        content: "Thay dây tín hiệu âm thanh và kiểm tra lại cổng kết nối.",
        afterStatus: "GOOD"
      },
      {
        organizationId: organization.id,
        deviceId: teacherComputer.id,
        reportId: null,
        technicianId: technician.id,
        quantity: 1,
        repairedAt: new Date("2026-06-12"),
        content: "Cài lại driver máy chiếu và cập nhật phần mềm trình chiếu.",
        afterStatus: "GOOD"
      }
    ]
  });

  await prisma.device.update({ where: { id: speaker.id }, data: { status: "GOOD" } });
  await prisma.notification.createMany({
    data: [
      {
        organizationId: organization.id,
        type: "DAMAGE_REPORT",
        title: `Phiếu báo hỏng mới #${reportProjector.id}`,
        message: `Lê Minh Tuấn báo hỏng tại phòng ${p101.code}: Máy chiếu P101.`,
        recipientId: admin.id,
        actorId: reporter.id,
        reportId: reportProjector.id,
        isRead: false
      },
      {
        organizationId: organization.id,
        type: "DAMAGE_REPORT",
        title: `Phiếu báo hỏng đang xử lý #${reportAc.id}`,
        message: `Phiếu điều hòa tại phòng ${p102.code} đang được kỹ thuật viên xử lý.`,
        recipientId: admin.id,
        actorId: technician.id,
        reportId: reportAc.id,
        isRead: false
      },
      {
        organizationId: organization.id,
        type: "REPAIR_UPDATE",
        title: `Phiếu báo hỏng đã hoàn thành #${reportSpeaker.id}`,
        message: `Loa phòng ${lab01.code} đã được sửa và chuyển về trạng thái tốt.`,
        recipientId: reporter.id,
        actorId: technician.id,
        reportId: reportSpeaker.id,
        isRead: true
      },
      {
        organizationId: organization.id,
        type: "ADMIN_ANNOUNCEMENT",
        title: "Thông báo kiểm tra thiết bị cuối tuần",
        message: "Admin yêu cầu rà soát máy chiếu, màn hình hiển thị và điều hòa tại các phòng học trước buổi học đầu tuần.",
        recipientId: technician.id,
        actorId: admin.id,
        isRead: false
      }
    ]
  });

  console.log(`Seed completed for organization=${organization.slug}`);
  console.log("Demo accounts: ptit / admin / 123456, ptit / tech / 123456, ptit / reporter / 123456");
}

main()
  .then(() => console.log("Seed completed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


