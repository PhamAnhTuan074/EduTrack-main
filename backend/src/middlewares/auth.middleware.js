// Nguoi code: Phạm Anh Tuấn. Pham vi: xac thuc JWT va phan quyen API.

const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Thiếu token xác thực" });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.user.organizationId) {
      return res.status(401).json({ message: "Token không có thông tin trường học. Vui lòng đăng nhập lại" });
    }
    return next();
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorize
};
