const router = require("express").Router();
const auth = require("../middlewares/auth");
const {
  getProfile,
  searchUsers,
  setUpiPin,
} = require("../controllers/userController");

router.get("/profile", auth, getProfile);
router.get("/search", auth, searchUsers);
router.put("/upi-pin", auth, setUpiPin);

module.exports = router;
