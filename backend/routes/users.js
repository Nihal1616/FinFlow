const router = require("express").Router();
const Joi = require("joi");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  getProfile,
  searchUsers,
  setUpiPin,
  setDecoyPin,
  setDecoyBalance,
  forgotPinRequest,
  forgotPinReset,
  forgotDecoyPinRequest,
  forgotDecoyPinReset,
} = require("../controllers/userController");

const pinSchema = Joi.object({
  pin: Joi.string()
    .pattern(/^\d{4,6}$/)
    .required(),
});
const resetSchema = Joi.object({
  otpCode: Joi.string().length(6).required(),
  newPin: Joi.string()
    .pattern(/^\d{4,6}$/)
    .required(),
});
const decoyResetSchema = Joi.object({
  otpCode: Joi.string().length(6).required(),
  newDecoyPin: Joi.string()
    .pattern(/^\d{4,6}$/)
    .required(),
});
const decoyBalanceSchema = Joi.object({
  balance: Joi.number().min(0).required(),
});

router.get("/profile", auth, getProfile);
router.get("/search", auth, searchUsers);
router.put("/upi-pin", auth, validate(pinSchema), setUpiPin);
router.put("/decoy-pin", auth, validate(pinSchema), setDecoyPin);
router.put(
  "/decoy-balance",
  auth,
  validate(decoyBalanceSchema),
  setDecoyBalance,
);
router.post("/forgot-pin/request", auth, forgotPinRequest);
router.post("/forgot-pin/reset", auth, validate(resetSchema), forgotPinReset);
router.post("/forgot-decoy-pin/request", auth, forgotDecoyPinRequest);
router.post(
  "/forgot-decoy-pin/reset",
  auth,
  validate(decoyResetSchema),
  forgotDecoyPinReset,
);

module.exports = router;
