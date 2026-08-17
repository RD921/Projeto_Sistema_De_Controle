const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token ausente" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token invalido" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.tenant_id = decoded.tenant_id || 1;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token expirado ou invalido" });
  }
};