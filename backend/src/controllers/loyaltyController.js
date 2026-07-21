const LoyaltyAccount = require("../models/LoyaltyAccount");

async function getAccount(req, res, next) {
  try {
    const account = await LoyaltyAccount.findOne({ phone: req.params.phone });
    if (!account) return res.json({ phone: req.params.phone, points: 0, history: [] });
    res.json(account);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAccount };
