// Nguoi code: Phạm Anh Tuấn va Nguyễn Ngọc Phương. Pham vi: ket noi Prisma dung chung cho toan backend.

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
