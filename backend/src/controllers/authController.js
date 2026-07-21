const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Staff = require("../models/Staff");

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const staff = await Staff.findOne({ username: String(username).toLowerCase().trim(), active: true });
    if (!staff || !(await bcrypt.compare(String(password), staff.passwordHash))) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = jwt.sign(
      { id: staff._id.toString(), role: staff.role, name: staff.name },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    res.json({ token, staff: { id: staff._id, name: staff.name, role: staff.role } });
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
