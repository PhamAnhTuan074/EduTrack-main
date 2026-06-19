// Nguoi code: Phạm Anh Tuấn va Nguyễn Ngọc Phương. Pham vi: cau hinh Express, middleware va route goc dung chung.

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRouter = require("./routes/auth.routes");
const roomRouter = require("./routes/room.routes");
const roomDeviceRouter = require("./routes/room-device.routes");
const deviceRouter = require("./routes/device.routes");
const reportRouter = require("./routes/report.routes");
const repairLogRouter = require("./routes/repair-log.routes");
const dashboardRouter = require("./routes/dashboard.routes");
const exportRouter = require("./routes/export.routes");
const notificationRouter = require("./routes/notification.routes");
const userRouter = require("./routes/user.routes");
const organizationRouter = require("./routes/organization.routes");
dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,https://edu-track-psi-dun.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isVercelDomain = origin && origin.endsWith(".vercel.app");

    if (!origin || allowedOrigins.includes(origin) || isVercelDomain) {
      return callback(null, true);
    }

    return callback(new Error("Origin không được phép bởi CORS"));
  },
  credentials: true
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    message: "Server đang chạy",
    time: new Date()
  });
});

app.use("/api/auth", authRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/rooms/:roomId/devices", roomDeviceRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/reports", reportRouter);
app.use("/api/repair-logs", repairLogRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/export", exportRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/users", userRouter);
app.use("/api/organizations", organizationRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
