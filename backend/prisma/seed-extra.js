// Nguoi code: Phạm Anh Tuấn va Nguyễn Ngọc Phương. Pham vi: du lieu demo mo rong cho tai khoan, phong, thiet bi, bao hong va bao cao.

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = process.env.DEMO_PASSWORD || "123456";

function at(date) {
  return new Date(`${date}T08:00:00.000Z`);
}

function clean(data) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

async function ensureOrganization(data) {
  return prisma.organization.upsert({
    where: { slug: data.slug },
    update: clean({
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      status: data.status || "ACTIVE"
    }),
    create: clean({
      name: data.name,
      slug: data.slug,
      address: data.address,
      phone: data.phone,
      email: data.email,
      status: data.status || "ACTIVE"
    })
  });
}

async function ensureUser(organizationId, data, passwordHash) {
  const existing = await prisma.user.findFirst({
    where: {
      organizationId,
      username: data.username
    }
  });

  const userData = clean({
    organizationId,
    fullName: data.fullName,
    username: data.username,
    email: data.email,
    birthYear: data.birthYear,
    address: data.address,
    phone: data.phone,
    role: data.role,
    status: data.status || "ACTIVE"
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: userData
    });
  }

  return prisma.user.create({
    data: {
      ...userData,
      passwordHash
    }
  });
}

async function ensureRoom(organizationId, data) {
  const existing = await prisma.room.findFirst({
    where: {
      organizationId,
      code: data.code
    }
  });

  const roomData = clean({
    organizationId,
    code: data.code,
    type: data.type,
    capacity: data.capacity,
    status: data.status || "ACTIVE"
  });

  if (existing) {
    return prisma.room.update({
      where: { id: existing.id },
      data: roomData
    });
  }

  return prisma.room.create({ data: roomData });
}

async function ensureDevice(organizationId, data) {
  const existing = await prisma.device.findFirst({
    where: {
      organizationId,
      code: data.code
    }
  });

  const deviceData = clean({
    organizationId,
    code: data.code,
    name: data.name,
    type: data.type,
    status: data.status || "GOOD",
    importedAt: data.importedAt,
    roomId: data.roomId
  });

  if (existing) {
    return prisma.device.update({
      where: { id: existing.id },
      data: deviceData
    });
  }

  return prisma.device.create({ data: deviceData });
}

async function ensureDamageReport({ organizationId, reporterId, roomId, description, status, deviceIds }) {
  const existing = await prisma.damageReport.findFirst({
    where: {
      organizationId,
      reporterId,
      roomId,
      description
    },
    include: {
      devices: true
    }
  });

  const report = existing
    ? await prisma.damageReport.update({
        where: { id: existing.id },
        data: { status },
        include: { devices: true }
      })
    : await prisma.damageReport.create({
        data: {
          organizationId,
          reporterId,
          roomId,
          description,
          status,
          devices: {
            create: deviceIds.map((deviceId) => ({ deviceId }))
          }
        },
        include: { devices: true }
      });

  const linkedDeviceIds = new Set(report.devices.map((item) => item.deviceId));
  const missingDeviceIds = deviceIds.filter((deviceId) => !linkedDeviceIds.has(deviceId));

  for (const deviceId of missingDeviceIds) {
    await prisma.damageReportDevice.create({
      data: {
        reportId: report.id,
        deviceId
      }
    });
  }

  return prisma.damageReport.findUnique({
    where: { id: report.id },
    include: {
      room: true,
      reporter: true,
      devices: {
        include: {
          device: true
        }
      }
    }
  });
}

async function ensureRepairLog(data) {
  const repairedAt = data.repairedAt instanceof Date ? data.repairedAt : new Date(data.repairedAt);
  const existing = await prisma.repairLog.findFirst({
    where: {
      organizationId: data.organizationId,
      deviceId: data.deviceId,
      technicianId: data.technicianId,
      content: data.content
    }
  });

  const logData = clean({
    organizationId: data.organizationId,
    deviceId: data.deviceId,
    reportId: data.reportId || null,
    technicianId: data.technicianId,
    quantity: data.quantity || 1,
    repairedAt,
    content: data.content,
    afterStatus: data.afterStatus
  });

  const repairLog = existing
    ? await prisma.repairLog.update({
        where: { id: existing.id },
        data: logData
      })
    : await prisma.repairLog.create({ data: logData });

  await prisma.device.update({
    where: { id: data.deviceId },
    data: { status: data.afterStatus }
  });

  if (data.reportId) {
    await prisma.damageReport.update({
      where: { id: data.reportId },
      data: { status: data.afterStatus === "GOOD" ? "COMPLETED" : "IN_PROGRESS" }
    });
  }

  return repairLog;
}

async function ensureNotification(data) {
  const existing = await prisma.notification.findFirst({
    where: {
      organizationId: data.organizationId,
      title: data.title,
      recipientId: data.recipientId || null
    }
  });

  const notificationData = clean({
    organizationId: data.organizationId,
    type: data.type,
    title: data.title,
    message: data.message,
    isRead: data.isRead || false,
    recipientId: data.recipientId || null,
    actorId: data.actorId || null,
    reportId: data.reportId || null
  });

  if (existing) {
    return prisma.notification.update({
      where: { id: existing.id },
      data: notificationData
    });
  }

  return prisma.notification.create({ data: notificationData });
}

async function addStandardClassroomDevices(organizationId, room, options = {}) {
  const prefix = options.prefix || room.code;
  const importedAt = options.importedAt || at("2026-01-15");
  const statuses = options.statuses || {};
  const names = options.names || {};

  return {
    projector: await ensureDevice(organizationId, {
      code: `MC-${prefix}-01`,
      name: names.projector || `May chieu ${room.code}`,
      type: "PROJECTOR",
      status: statuses.projector || "GOOD",
      importedAt,
      roomId: room.id
    }),
    tv: await ensureDevice(organizationId, {
      code: `TV-${prefix}-01`,
      name: names.tv || `Tivi ${room.code}`,
      type: "TV",
      status: statuses.tv || "GOOD",
      importedAt,
      roomId: room.id
    }),
    airConditioner: await ensureDevice(organizationId, {
      code: `AC-${prefix}-01`,
      name: names.airConditioner || `Dieu hoa ${room.code}`,
      type: "AIR_CONDITIONER",
      status: statuses.airConditioner || "GOOD",
      importedAt,
      roomId: room.id
    }),
    speaker: await ensureDevice(organizationId, {
      code: `SP-${prefix}-01`,
      name: names.speaker || `Loa ${room.code}`,
      type: "SPEAKER",
      status: statuses.speaker || "GOOD",
      importedAt,
      roomId: room.id
    }),
    furniture: await ensureDevice(organizationId, {
      code: `BC-${prefix}-01`,
      name: names.furniture || `Bo ban ghe ${room.code}`,
      type: "TABLE_CHAIR",
      status: statuses.furniture || "GOOD",
      importedAt,
      roomId: room.id
    })
  };
}

async function addComputerLabDevices(organizationId, room, options = {}) {
  const prefix = options.prefix || room.code;
  const importedAt = options.importedAt || at("2026-03-01");
  const computerCount = options.computerCount || 20;
  const brokenComputers = new Set(options.brokenComputers || []);
  const repairingComputers = new Set(options.repairingComputers || []);
  const devices = {
    computers: []
  };

  devices.projector = await ensureDevice(organizationId, {
    code: `MC-${prefix}-01`,
    name: `May chieu phong ${room.code}`,
    type: "PROJECTOR",
    status: options.projectorStatus || "GOOD",
    importedAt,
    roomId: room.id
  });
  devices.airConditioner = await ensureDevice(organizationId, {
    code: `AC-${prefix}-01`,
    name: `Dieu hoa phong ${room.code}`,
    type: "AIR_CONDITIONER",
    status: options.airConditionerStatus || "GOOD",
    importedAt,
    roomId: room.id
  });
  devices.speaker = await ensureDevice(organizationId, {
    code: `SP-${prefix}-01`,
    name: `Loa phong ${room.code}`,
    type: "SPEAKER",
    status: options.speakerStatus || "GOOD",
    importedAt,
    roomId: room.id
  });
  devices.switch = await ensureDevice(organizationId, {
    code: `SW-${prefix}-01`,
    name: `Switch mang ${room.code}`,
    type: "OTHER",
    status: options.switchStatus || "GOOD",
    importedAt,
    roomId: room.id
  });

  for (let index = 1; index <= computerCount; index += 1) {
    const codeNumber = String(index).padStart(2, "0");
    const status = brokenComputers.has(index) ? "BROKEN" : repairingComputers.has(index) ? "REPAIRING" : "GOOD";
    const computer = await ensureDevice(organizationId, {
      code: `PC-${prefix}-${codeNumber}`,
      name: index === 1 ? `May tinh giang vien ${room.code}` : `May tinh sinh vien ${room.code}-${codeNumber}`,
      type: "COMPUTER",
      status,
      importedAt,
      roomId: room.id
    });
    devices.computers.push(computer);
  }

  return devices;
}

async function seedPtit(passwordHash) {
  const organization = await ensureOrganization({
    name: "Hoc vien Cong nghe Buu chinh Vien thong",
    slug: "ptit",
    address: "Km10 Nguyen Trai, Ha Dong, Ha Noi",
    phone: "02433528122",
    email: "cosovatchat@ptit.edu.vn"
  });

  const users = {
    admin: await ensureUser(organization.id, {
      fullName: "Quan tri vien CSVC",
      username: "admin",
      role: "ADMIN",
      email: "admin@ptit.edu.vn",
      birthYear: 1988,
      address: "Ha Noi",
      phone: "0900000001"
    }, passwordHash),
    admin2: await ensureUser(organization.id, {
      fullName: "Pham Thu Ha",
      username: "admin_csht",
      role: "ADMIN",
      email: "admin.csht@ptit.edu.vn",
      birthYear: 1990,
      address: "Ha Dong, Ha Noi",
      phone: "0900000010"
    }, passwordHash),
    tech: await ensureUser(organization.id, {
      fullName: "Nguyen Van Nam",
      username: "tech",
      role: "TECHNICIAN",
      email: "tech@ptit.edu.vn",
      birthYear: 1993,
      address: "Ha Noi",
      phone: "0900000002"
    }, passwordHash),
    techDien: await ensureUser(organization.id, {
      fullName: "Tran Duc Minh",
      username: "tech_dien",
      role: "TECHNICIAN",
      email: "tech.dien@ptit.edu.vn",
      birthYear: 1992,
      address: "Thanh Xuan, Ha Noi",
      phone: "0900000011"
    }, passwordHash),
    techIt: await ensureUser(organization.id, {
      fullName: "Do Quang Huy",
      username: "tech_it",
      role: "TECHNICIAN",
      email: "tech.it@ptit.edu.vn",
      birthYear: 1995,
      address: "Cau Giay, Ha Noi",
      phone: "0900000012"
    }, passwordHash),
    reporter: await ensureUser(organization.id, {
      fullName: "Le Minh Tuan",
      username: "reporter",
      role: "REPORTER",
      email: "reporter@ptit.edu.vn",
      birthYear: 1998,
      address: "Ha Noi",
      phone: "0900000003"
    }, passwordHash),
    gvMang: await ensureUser(organization.id, {
      fullName: "Vu Thi Mai",
      username: "gv_mang",
      role: "REPORTER",
      email: "gv.mang@ptit.edu.vn",
      birthYear: 1987,
      address: "Ha Dong, Ha Noi",
      phone: "0900000013"
    }, passwordHash),
    gvHoa: await ensureUser(organization.id, {
      fullName: "Nguyen Thi Lan",
      username: "gv_hoa",
      role: "REPORTER",
      email: "gv.hoa@ptit.edu.vn",
      birthYear: 1985,
      address: "Dong Da, Ha Noi",
      phone: "0900000014"
    }, passwordHash),
    gvVatLy: await ensureUser(organization.id, {
      fullName: "Hoang Manh Cuong",
      username: "gv_vatly",
      role: "REPORTER",
      email: "gv.vatly@ptit.edu.vn",
      birthYear: 1984,
      address: "Nam Tu Liem, Ha Noi",
      phone: "0900000015"
    }, passwordHash),
    gvKtpm: await ensureUser(organization.id, {
      fullName: "Bui Anh Khoa",
      username: "gv_ktpm",
      role: "REPORTER",
      email: "gv.ktpm@ptit.edu.vn",
      birthYear: 1991,
      address: "Bac Tu Liem, Ha Noi",
      phone: "0900000016"
    }, passwordHash),
    thuVien: await ensureUser(organization.id, {
      fullName: "Dang Ngoc Anh",
      username: "thu_vien",
      role: "REPORTER",
      email: "thuvien@ptit.edu.vn",
      birthYear: 1994,
      address: "Ha Dong, Ha Noi",
      phone: "0900000017"
    }, passwordHash)
  };

  const rooms = {};
  for (const room of [
    { code: "P101", type: "THEORY", capacity: 60 },
    { code: "P102", type: "THEORY", capacity: 50, status: "MAINTENANCE" },
    { code: "P201", type: "THEORY", capacity: 70 },
    { code: "P202", type: "THEORY", capacity: 55 },
    { code: "P301", type: "THEORY", capacity: 65 },
    { code: "P302", type: "THEORY", capacity: 65 },
    { code: "P401", type: "THEORY", capacity: 80 },
    { code: "HALL-A1", type: "THEORY", capacity: 140 },
    { code: "LIB-01", type: "THEORY", capacity: 45 },
    { code: "LAB01", type: "COMPUTER_LAB", capacity: 35 },
    { code: "LAB02", type: "COMPUTER_LAB", capacity: 40 },
    { code: "LAB03", type: "COMPUTER_LAB", capacity: 42 },
    { code: "LAB-MANG", type: "COMPUTER_LAB", capacity: 36 },
    { code: "LAB-DT", type: "LAB", capacity: 28 },
    { code: "LAB-HOA", type: "LAB", capacity: 30, status: "MAINTENANCE" },
    { code: "LAB-LY", type: "LAB", capacity: 32 }
  ]) {
    rooms[room.code] = await ensureRoom(organization.id, room);
  }

  const devices = {};
  devices.P101 = await addStandardClassroomDevices(organization.id, rooms.P101, {
    importedAt: at("2026-01-05"),
    statuses: { projector: "BROKEN", tv: "BROKEN" }
  });
  devices.P102 = await addStandardClassroomDevices(organization.id, rooms.P102, {
    importedAt: at("2026-01-08"),
    statuses: { airConditioner: "REPAIRING" }
  });
  devices.P201 = await addStandardClassroomDevices(organization.id, rooms.P201, {
    importedAt: at("2026-01-10"),
    statuses: { airConditioner: "BROKEN" }
  });
  devices.P202 = await addStandardClassroomDevices(organization.id, rooms.P202, {
    importedAt: at("2026-02-02"),
    statuses: { projector: "REPAIRING", speaker: "BROKEN" }
  });
  devices.P301 = await addStandardClassroomDevices(organization.id, rooms.P301, {
    importedAt: at("2026-02-15")
  });
  devices.P302 = await addStandardClassroomDevices(organization.id, rooms.P302, {
    importedAt: at("2026-02-17"),
    statuses: { tv: "BROKEN" }
  });
  devices.P401 = await addStandardClassroomDevices(organization.id, rooms.P401, {
    importedAt: at("2026-03-10"),
    statuses: { projector: "BROKEN" }
  });
  devices["HALL-A1"] = await addStandardClassroomDevices(organization.id, rooms["HALL-A1"], {
    prefix: "HALL-A1",
    importedAt: at("2026-03-15"),
    statuses: { speaker: "REPAIRING", airConditioner: "BROKEN" }
  });
  devices["LIB-01"] = await addStandardClassroomDevices(organization.id, rooms["LIB-01"], {
    prefix: "LIB-01",
    importedAt: at("2026-03-20"),
    statuses: { projector: "BROKEN" }
  });

  devices.LAB01 = await addComputerLabDevices(organization.id, rooms.LAB01, {
    computerCount: 18,
    speakerStatus: "BROKEN",
    brokenComputers: [7]
  });
  devices.LAB02 = await addComputerLabDevices(organization.id, rooms.LAB02, {
    computerCount: 20,
    switchStatus: "REPAIRING",
    brokenComputers: [3, 14]
  });
  devices.LAB03 = await addComputerLabDevices(organization.id, rooms.LAB03, {
    computerCount: 24,
    brokenComputers: [5, 8, 19],
    repairingComputers: [12]
  });
  devices["LAB-MANG"] = await addComputerLabDevices(organization.id, rooms["LAB-MANG"], {
    prefix: "LAB-MANG",
    computerCount: 16,
    switchStatus: "REPAIRING",
    brokenComputers: [2]
  });

  devices["LAB-HOA"] = {
    hood: await ensureDevice(organization.id, {
      code: "HT-HOA-01",
      name: "He thong hut khi LAB-HOA",
      type: "OTHER",
      status: "BROKEN",
      importedAt: at("2026-04-02"),
      roomId: rooms["LAB-HOA"].id
    }),
    kit: await ensureDevice(organization.id, {
      code: "TB-HOA-01",
      name: "Bo dung cu thi nghiem hoa co ban",
      type: "OTHER",
      status: "GOOD",
      importedAt: at("2026-04-01"),
      roomId: rooms["LAB-HOA"].id
    }),
    furniture: await ensureDevice(organization.id, {
      code: "BC-HOA-01",
      name: "Ban thi nghiem LAB-HOA",
      type: "TABLE_CHAIR",
      status: "GOOD",
      importedAt: at("2026-04-02"),
      roomId: rooms["LAB-HOA"].id
    })
  };

  devices["LAB-LY"] = {
    electricityKit: await ensureDevice(organization.id, {
      code: "TB-LY-01",
      name: "Bo thi nghiem dien hoc LAB-LY",
      type: "OTHER",
      status: "GOOD",
      importedAt: at("2026-05-01"),
      roomId: rooms["LAB-LY"].id
    }),
    projector: await ensureDevice(organization.id, {
      code: "MC-LY-01",
      name: "May chieu phong LAB-LY",
      type: "PROJECTOR",
      status: "GOOD",
      importedAt: at("2026-05-03"),
      roomId: rooms["LAB-LY"].id
    }),
    airConditioner: await ensureDevice(organization.id, {
      code: "AC-LY-01",
      name: "Dieu hoa LAB-LY",
      type: "AIR_CONDITIONER",
      status: "GOOD",
      importedAt: at("2026-05-03"),
      roomId: rooms["LAB-LY"].id
    })
  };

  devices["LAB-DT"] = {
    oscilloscope: await ensureDevice(organization.id, {
      code: "OSC-DT-01",
      name: "May hien song LAB-DT",
      type: "OTHER",
      status: "GOOD",
      importedAt: at("2026-04-15"),
      roomId: rooms["LAB-DT"].id
    }),
    solderingStation: await ensureDevice(organization.id, {
      code: "HAN-DT-01",
      name: "Tram han linh kien LAB-DT",
      type: "OTHER",
      status: "BROKEN",
      importedAt: at("2026-04-15"),
      roomId: rooms["LAB-DT"].id
    }),
    projector: await ensureDevice(organization.id, {
      code: "MC-DT-01",
      name: "May chieu LAB-DT",
      type: "PROJECTOR",
      status: "GOOD",
      importedAt: at("2026-04-16"),
      roomId: rooms["LAB-DT"].id
    })
  };

  const reports = [];
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.P101.id,
    description: "May chieu P101 khong len hinh khi bat dau tiet hoc.",
    status: "PENDING",
    deviceIds: [devices.P101.projector.id]
  }));
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.P101.id,
    description: "Tivi P101 hien soc ngang va khong nhan tin hieu HDMI.",
    status: "PENDING",
    deviceIds: [devices.P101.tv.id]
  }));
  const reportP102Ac = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.P102.id,
    description: "Dieu hoa P102 phat tieng on lon va lam mat yeu.",
    status: "IN_PROGRESS",
    deviceIds: [devices.P102.airConditioner.id]
  });
  reports.push(reportP102Ac);
  const reportLab01Speaker = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvKtpm.id,
    roomId: rooms.LAB01.id,
    description: "Loa LAB01 bi re khi mo am luong lon.",
    status: "COMPLETED",
    deviceIds: [devices.LAB01.speaker.id]
  });
  reports.push(reportLab01Speaker);
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvMang.id,
    roomId: rooms.P201.id,
    description: "Dieu hoa P201 khong khoi dong, den bao loi nhap nhay.",
    status: "PENDING",
    deviceIds: [devices.P201.airConditioner.id]
  }));
  const reportP202Projector = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.P202.id,
    description: "May chieu P202 bi mo anh, can can chinh lai bong chieu.",
    status: "IN_PROGRESS",
    deviceIds: [devices.P202.projector.id]
  });
  reports.push(reportP202Projector);
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.P202.id,
    description: "Loa tro giang P202 mat ket noi bluetooth lien tuc.",
    status: "PENDING",
    deviceIds: [devices.P202.speaker.id]
  }));
  const reportLab02Pc = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvKtpm.id,
    roomId: rooms.LAB02.id,
    description: "May tinh LAB02-03 khong vao duoc he dieu hanh.",
    status: "COMPLETED",
    deviceIds: [devices.LAB02.computers[2].id]
  });
  reports.push(reportLab02Pc);
  const reportLab02Switch = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvMang.id,
    roomId: rooms.LAB02.id,
    description: "Switch mang LAB02 chap chon, mot day may mat ket noi.",
    status: "IN_PROGRESS",
    deviceIds: [devices.LAB02.switch.id]
  });
  reports.push(reportLab02Switch);
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvHoa.id,
    roomId: rooms["LAB-HOA"].id,
    description: "He thong hut khi LAB-HOA khong hut duoc mui thi nghiem.",
    status: "PENDING",
    deviceIds: [devices["LAB-HOA"].hood.id]
  }));
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvKtpm.id,
    roomId: rooms.LAB03.id,
    description: "Hai may tinh LAB03-05 va LAB03-08 khong ket noi duoc mang noi bo.",
    status: "PENDING",
    deviceIds: [devices.LAB03.computers[4].id, devices.LAB03.computers[7].id]
  }));
  const reportLabMang = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvMang.id,
    roomId: rooms["LAB-MANG"].id,
    description: "Switch trung tam LAB-MANG bao loi cong uplink.",
    status: "IN_PROGRESS",
    deviceIds: [devices["LAB-MANG"].switch.id]
  });
  reports.push(reportLabMang);
  const reportLabDt = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.gvVatLy.id,
    roomId: rooms["LAB-DT"].id,
    description: "Tram han linh kien LAB-DT khong dieu chinh duoc nhiet do.",
    status: "COMPLETED",
    deviceIds: [devices["LAB-DT"].solderingStation.id]
  });
  reports.push(reportLabDt);
  reports.push(await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.thuVien.id,
    roomId: rooms["LIB-01"].id,
    description: "May chieu phong thu vien khong nhan tin hieu tu laptop.",
    status: "PENDING",
    deviceIds: [devices["LIB-01"].projector.id]
  }));
  const reportHallSpeaker = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.admin2.id,
    roomId: rooms["HALL-A1"].id,
    description: "He thong loa hoi truong A1 bi mat mot kenh am thanh.",
    status: "IN_PROGRESS",
    deviceIds: [devices["HALL-A1"].speaker.id]
  });
  reports.push(reportHallSpeaker);

  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.P102.airConditioner.id,
    reportId: reportP102Ac.id,
    technicianId: users.techDien.id,
    repairedAt: at("2026-06-10"),
    content: "Ve sinh luoi loc, kiem tra gas lanh, thiet bi can theo doi them.",
    afterStatus: "REPAIRING"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.LAB01.speaker.id,
    reportId: reportLab01Speaker.id,
    technicianId: users.tech.id,
    repairedAt: at("2026-06-11"),
    content: "Thay day tin hieu am thanh va kiem tra lai cong ket noi.",
    afterStatus: "GOOD"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.P202.projector.id,
    reportId: reportP202Projector.id,
    technicianId: users.tech.id,
    repairedAt: at("2026-06-13"),
    content: "Ve sinh kinh chieu, dat mua bong den thay the, tam thoi de trang thai dang sua.",
    afterStatus: "REPAIRING"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.LAB02.computers[2].id,
    reportId: reportLab02Pc.id,
    technicianId: users.techIt.id,
    repairedAt: at("2026-06-14"),
    content: "Cai lai he dieu hanh va khoi phuc driver card mang.",
    afterStatus: "GOOD"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.LAB02.switch.id,
    reportId: reportLab02Switch.id,
    technicianId: users.techIt.id,
    repairedAt: at("2026-06-15"),
    content: "Thay day uplink tam thoi va theo doi switch trong 48 gio.",
    afterStatus: "REPAIRING"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices["LAB-MANG"].switch.id,
    reportId: reportLabMang.id,
    technicianId: users.techIt.id,
    repairedAt: at("2026-06-16"),
    content: "Cap nhat firmware switch, cong uplink con loi khi tai cao.",
    afterStatus: "REPAIRING"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices["LAB-DT"].solderingStation.id,
    reportId: reportLabDt.id,
    technicianId: users.techDien.id,
    repairedAt: at("2026-06-16"),
    content: "Thay bo dieu khien nhiet va hieu chuan lai dau han.",
    afterStatus: "GOOD"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices["HALL-A1"].speaker.id,
    reportId: reportHallSpeaker.id,
    technicianId: users.tech.id,
    repairedAt: at("2026-06-17"),
    content: "Kiem tra amply va day loa, can thay jack tin hieu kenh phai.",
    afterStatus: "REPAIRING"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.LAB03.computers[11].id,
    reportId: null,
    technicianId: users.techIt.id,
    repairedAt: at("2026-06-12"),
    content: "Bao tri dinh ky may tinh LAB03-12, ve sinh may va cap nhat phan mem.",
    afterStatus: "GOOD"
  });

  await ensureNotification({
    organizationId: organization.id,
    type: "ADMIN_ANNOUNCEMENT",
    title: "Lich kiem tra thiet bi tuan 25",
    message: "De nghi doi ky thuat ra soat may chieu, am thanh va dieu hoa tai cac phong hoc tang 2-4.",
    recipientId: users.tech.id,
    actorId: users.admin.id,
    isRead: false
  });

  for (const report of reports) {
    await ensureNotification({
      organizationId: organization.id,
      type: "DAMAGE_REPORT",
      title: `Phieu bao hong #${report.id} - ${report.room.code}`,
      message: `${report.reporter.fullName} bao hong tai phong ${report.room.code}: ${report.devices.map((item) => item.device.name).join(", ")}.`,
      recipientId: users.admin.id,
      actorId: report.reporterId,
      reportId: report.id,
      isRead: report.status === "COMPLETED"
    });
  }

  return organization;
}

async function seedHou(passwordHash) {
  const organization = await ensureOrganization({
    name: "Truong Dai hoc Mo Ha Noi",
    slug: "hou",
    address: "B101 Nguyen Hien, Hai Ba Trung, Ha Noi",
    phone: "02438682321",
    email: "quantricsvc@hou.edu.vn"
  });

  const users = {
    admin: await ensureUser(organization.id, {
      fullName: "Hoang Thu Trang",
      username: "hou_admin",
      role: "ADMIN",
      email: "admin@hou.edu.vn",
      birthYear: 1989,
      address: "Hai Ba Trung, Ha Noi",
      phone: "0911000001"
    }, passwordHash),
    tech: await ensureUser(organization.id, {
      fullName: "Pham Van Kien",
      username: "hou_tech",
      role: "TECHNICIAN",
      email: "tech@hou.edu.vn",
      birthYear: 1992,
      address: "Hoang Mai, Ha Noi",
      phone: "0911000002"
    }, passwordHash),
    reporter: await ensureUser(organization.id, {
      fullName: "Dang Minh Chau",
      username: "hou_reporter",
      role: "REPORTER",
      email: "reporter@hou.edu.vn",
      birthYear: 1990,
      address: "Thanh Tri, Ha Noi",
      phone: "0911000003"
    }, passwordHash),
    reporter2: await ensureUser(organization.id, {
      fullName: "Le Bao Anh",
      username: "hou_gv_media",
      role: "REPORTER",
      email: "media@hou.edu.vn",
      birthYear: 1986,
      address: "Dong Da, Ha Noi",
      phone: "0911000004"
    }, passwordHash)
  };

  const rooms = {};
  for (const room of [
    { code: "A101", type: "THEORY", capacity: 70 },
    { code: "A102", type: "THEORY", capacity: 65 },
    { code: "B201", type: "THEORY", capacity: 80 },
    { code: "CLAB01", type: "COMPUTER_LAB", capacity: 32 },
    { code: "MEDIA01", type: "LAB", capacity: 24 },
    { code: "LAB-CN", type: "LAB", capacity: 28 }
  ]) {
    rooms[room.code] = await ensureRoom(organization.id, room);
  }

  const devices = {};
  devices.A101 = await addStandardClassroomDevices(organization.id, rooms.A101, {
    importedAt: at("2026-01-20"),
    statuses: { projector: "GOOD" }
  });
  devices.A102 = await addStandardClassroomDevices(organization.id, rooms.A102, {
    importedAt: at("2026-01-22"),
    statuses: { airConditioner: "BROKEN" }
  });
  devices.B201 = await addStandardClassroomDevices(organization.id, rooms.B201, {
    importedAt: at("2026-02-01"),
    statuses: { tv: "BROKEN" }
  });
  devices.CLAB01 = await addComputerLabDevices(organization.id, rooms.CLAB01, {
    computerCount: 18,
    brokenComputers: [4, 9],
    switchStatus: "GOOD"
  });
  devices.MEDIA01 = {
    camera: await ensureDevice(organization.id, {
      code: "CAM-MEDIA01-01",
      name: "Camera ghi hinh MEDIA01",
      type: "OTHER",
      status: "GOOD",
      importedAt: at("2026-03-01"),
      roomId: rooms.MEDIA01.id
    }),
    speaker: await ensureDevice(organization.id, {
      code: "SP-MEDIA01-01",
      name: "Bo loa kiem am MEDIA01",
      type: "SPEAKER",
      status: "REPAIRING",
      importedAt: at("2026-03-01"),
      roomId: rooms.MEDIA01.id
    }),
    computer: await ensureDevice(organization.id, {
      code: "PC-MEDIA01-01",
      name: "May dung phim MEDIA01",
      type: "COMPUTER",
      status: "GOOD",
      importedAt: at("2026-03-02"),
      roomId: rooms.MEDIA01.id
    })
  };
  devices["LAB-CN"] = {
    printer: await ensureDevice(organization.id, {
      code: "PR-CN-01",
      name: "May in mau LAB-CN",
      type: "OTHER",
      status: "BROKEN",
      importedAt: at("2026-04-05"),
      roomId: rooms["LAB-CN"].id
    }),
    projector: await ensureDevice(organization.id, {
      code: "MC-CN-01",
      name: "May chieu LAB-CN",
      type: "PROJECTOR",
      status: "GOOD",
      importedAt: at("2026-04-05"),
      roomId: rooms["LAB-CN"].id
    })
  };

  const reportA102Ac = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.A102.id,
    description: "Dieu hoa A102 khong mat trong tiet hoc buoi chieu.",
    status: "PENDING",
    deviceIds: [devices.A102.airConditioner.id]
  });
  const reportB201Tv = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.B201.id,
    description: "Tivi B201 khong nhan dieu khien va man hinh toi.",
    status: "PENDING",
    deviceIds: [devices.B201.tv.id]
  });
  const reportClabPc = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms.CLAB01.id,
    description: "May tinh CLAB01-04 va CLAB01-09 khoi dong cham, hay treo ung dung.",
    status: "COMPLETED",
    deviceIds: [devices.CLAB01.computers[3].id, devices.CLAB01.computers[8].id]
  });
  const reportMediaSpeaker = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter2.id,
    roomId: rooms.MEDIA01.id,
    description: "Loa kiem am MEDIA01 bi mat tieng ben trai.",
    status: "IN_PROGRESS",
    deviceIds: [devices.MEDIA01.speaker.id]
  });
  const reportPrinter = await ensureDamageReport({
    organizationId: organization.id,
    reporterId: users.reporter.id,
    roomId: rooms["LAB-CN"].id,
    description: "May in mau LAB-CN bao ket giay lien tuc.",
    status: "PENDING",
    deviceIds: [devices["LAB-CN"].printer.id]
  });

  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.CLAB01.computers[3].id,
    reportId: reportClabPc.id,
    technicianId: users.tech.id,
    repairedAt: at("2026-06-15"),
    content: "Thay o cung SSD cho may CLAB01-04 va toi uu ung dung hoc tap.",
    afterStatus: "GOOD"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.CLAB01.computers[8].id,
    reportId: reportClabPc.id,
    technicianId: users.tech.id,
    repairedAt: at("2026-06-15"),
    content: "Ve sinh RAM, cai lai driver do hoa cho may CLAB01-09.",
    afterStatus: "GOOD"
  });
  await ensureRepairLog({
    organizationId: organization.id,
    deviceId: devices.MEDIA01.speaker.id,
    reportId: reportMediaSpeaker.id,
    technicianId: users.tech.id,
    repairedAt: at("2026-06-17"),
    content: "Kiem tra day tin hieu loa kiem am, dat bo chuyen doi thay the.",
    afterStatus: "REPAIRING"
  });

  for (const report of [reportA102Ac, reportB201Tv, reportClabPc, reportMediaSpeaker, reportPrinter]) {
    await ensureNotification({
      organizationId: organization.id,
      type: "DAMAGE_REPORT",
      title: `Phieu bao hong #${report.id} - ${report.room.code}`,
      message: `${report.reporter.fullName} bao hong tai phong ${report.room.code}: ${report.devices.map((item) => item.device.name).join(", ")}.`,
      recipientId: users.admin.id,
      actorId: report.reporterId,
      reportId: report.id,
      isRead: report.status === "COMPLETED"
    });
  }

  await ensureNotification({
    organizationId: organization.id,
    type: "ADMIN_ANNOUNCEMENT",
    title: "Kiem ke thiet bi thang 6",
    message: "Phong quan tri yeu cau ra soat so luong may tinh, may chieu va thiet bi am thanh truoc ngay 25/06.",
    recipientId: users.tech.id,
    actorId: users.admin.id,
    isRead: false
  });

  return organization;
}

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const organizations = [
    await seedPtit(passwordHash),
    await seedHou(passwordHash)
  ];

  const counts = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.room.count(),
    prisma.device.count(),
    prisma.damageReport.count(),
    prisma.repairLog.count(),
    prisma.notification.count()
  ]);

  console.log("Extra seed completed");
  console.log(`Organizations touched: ${organizations.map((organization) => organization.slug).join(", ")}`);
  console.log(`Counts: organizations=${counts[0]}, users=${counts[1]}, rooms=${counts[2]}, devices=${counts[3]}, reports=${counts[4]}, repairLogs=${counts[5]}, notifications=${counts[6]}`);
  console.log(`Demo password for created accounts: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
