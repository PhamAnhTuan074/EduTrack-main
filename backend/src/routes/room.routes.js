const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { buildPaginationMeta, parsePagination, parseSort } = require("../utils/list-query");

const router = express.Router();

const validRoomTypes = ["THEORY", "COMPUTER_LAB", "LAB"];
const validRoomStatuses = ["ACTIVE", "MAINTENANCE"];

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function validateRoomInput({code, type, status, capacity}){
  if (!code || !type || !capacity) {
      return "Vui lòng nhập đầy đủ thông tin phòng học";
  }

  if (!validRoomTypes.includes(type)) {
    return "Loại phòng học không hợp lệ";
  }

  if (status && !validRoomStatuses.includes(status)) {
    return "Trạng thái phòng học không hợp lệ";
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return "Sức chứa phải là số nguyên lớn hơn 0";
  }

  return null;
}

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();
    const { page, limit, skip, take, isPaginated } = parsePagination(req.query);
    const { sortBy, order } = parseSort(req.query, ["code", "type", "capacity", "status", "createdAt"], "code");

    const where = {
      organizationId: req.user.organizationId,
      ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
      ...(status && validRoomStatuses.includes(status) ? { status } : {}),
      ...(type && validRoomTypes.includes(type) ? { type } : {})
    };

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          _count: {
            select: { devices: true }
          }
        },
        orderBy: { [sortBy]: order },
        ...(isPaginated ? { skip, take } : {})
      }),
      isPaginated ? prisma.room.count({ where }) : Promise.resolve(0)
    ]);

    if (isPaginated) {
      return res.json({
        data: rooms,
        meta: buildPaginationMeta(total, page, limit)
      });
    }

    return res.json(rooms);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    const { type, status } = req.body;
    const capacity = Number(req.body.capacity);
    const validateError = validateRoomInput({code, type, status, capacity});


    if (validateError){
      return res.status(400).json({message: validateError});
    }
    // if (!code || !type || !capacity) {
    //   return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phòng học" });
    // }

    // if (!validRoomTypes.includes(type)) {
    //   return res.status(400).json({ message: "Loại phòng học không hợp lệ" });
    // }

    // if (status && !validRoomStatuses.includes(status)) {
    //   return res.status(400).json({ message: "Trạng thái phòng học không hợp lệ" });
    // }

    // if (!Number.isInteger(capacity) || capacity <= 0) {
    //   return res.status(400).json({ message: "Sức chứa phải là số nguyên lớn hơn 0" });
    // }

    const room = await prisma.room.create({
      data: {
        organizationId: req.user.organizationId,
        code,
        type,
        capacity,
        status: status || "ACTIVE"
      }
    });

    return res.status(201).json(room);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã phòng đã tồn tại" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const code = normalizeCode(req.body.code);
    const { type, status } = req.body;
    const capacity = Number(req.body.capacity);
    const validateError = validateRoomInput({code, type, status, capacity});

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID phòng học không hợp lệ" });
    }

    // if (!code || !type || !capacity) {
    //   return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phòng học" });
    // }

    // if (!validRoomTypes.includes(type)) {
    //   return res.status(400).json({ message: "Loại phòng học không hợp lệ" });
    // }

    // if (status && !validRoomStatuses.includes(status)) {
    //   return res.status(400).json({ message: "Trạng thái phòng học không hợp lệ" });
    // }

    // if (!Number.isInteger(capacity) || capacity <= 0) {
    //   return res.status(400).json({ message: "Sức chứa phải là số nguyên lớn hơn 0" });
    // }

    if (validateError){
      return res.status(400).json({message: validateError});
    }

    const existingRoom = await prisma.room.findFirst({
      where: {
        id,
        organizationId: req.user.organizationId
      }
    });

    if (!existingRoom) {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        code,
        type,
        capacity,
        status
      }
    });

    return res.json(room);

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã phòng đã tồn tại" });
    }

    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.delete("/:id", authenticate, authorize("ADMIN"), async(req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)){
      return res.status(400).json({message: "ID phòng không hợp lệ"});
    }

    const [room, deviceCount] = await Promise.all([
      prisma.room.findFirst({
        where: {
          id,
          organizationId: req.user.organizationId
        },
        select: { id: true }
      }),
      prisma.device.count({
        where: {
          roomId: id,
          organizationId: req.user.organizationId
        }
      })
    ]);

    if (!room) {
      return res.status(404).json({message: "Không tìm thấy phòng học"});
    }

    if (deviceCount > 0){
      return res.status(400).json({message: "Không thể xoá phòng đang chứa thiết bị"});
    } 

    await prisma.room.delete({ where: { id } });
    
    return res.json({message: "Xoá phòng học thành công"});
  } catch(error) {
    if (error.code === "P2025"){
      return res.status(404).json({message: "Không tìm thấy phòng học"});
    }

    console.error(error);
    return res.status(500).json({message: "Lỗi server"});
  }
});

// router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
//   try {
//     const id = Number(req.params.id);

//     if (!Number.isInteger(id)) {
//       return res.status(400).json({ message: "ID phòng học không hợp lệ" });
//     }

//     const deviceCount = await prisma.device.count({ where: { roomId: id } });

//     if (deviceCount > 0) {
//       return res.status(409).json({ message: "Không thể xóa phòng học đang chứa thiết bị" });
//     }

//     await prisma.room.delete({ where: { id } });

//     return res.json({ message: "Xóa phòng học thành công" });

//   } catch (error) {
//     if (error.code === "P2025") {
//       return res.status(404).json({ message: "Không tìm thấy phòng học" });
//     }

//     console.error(error);
//     return res.status(500).json({ message: "Lỗi server" });
//   }
// });

module.exports = router;
