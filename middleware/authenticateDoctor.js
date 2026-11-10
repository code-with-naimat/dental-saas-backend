const jwt = require("jsonwebtoken");

/**
 * Doctor ka JWT verify karta hai aur req.doctorAuth mein doctorId/clinicId daal deta hai.
 * Ye resolveTenant ke BAAD chalna chahiye (taake req.tenant pehle se mojood ho),
 * aur check karta hai ke token ka clinicId, request ke clinic se match karta hai.
 */
function authenticateDoctor(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Login zaroori hai" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "doctor") {
      return res.status(403).json({ error: "Sirf doctor account is route ko access kar sakta hai" });
    }
    if (decoded.clinicId !== req.tenant.clinic.clinicId) {
      return res.status(403).json({ error: "Ye account is clinic ka nahi hai" });
    }

    req.doctorAuth = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token invalid ya expire ho chuka hai" });
  }
}

module.exports = authenticateDoctor;
