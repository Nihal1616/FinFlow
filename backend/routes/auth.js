const router = require("express").Router();
const Joi = require("joi");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/auth");
const {
  register,
  login,
  me,
  verifySignupOTP,
  verifyLoginOTP,
  decoyLogin,
} = require("../controllers/authController");

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(10).max(15).required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
});

const otpVerifySchema = Joi.object({
  userId: Joi.string().required(),
  otpCode: Joi.string().length(6).required(),
});

const signupOtpVerifySchema = Joi.object({
  registrationId: Joi.string().required(),
  otpCode: Joi.string().length(6).required(),
});

const decoyLoginSchema = Joi.object({
  identifier: Joi.string().required(),
  decoyPin: Joi.string()
    .pattern(/^\d{4,6}$/)
    .required(),
});

router.post("/register", validate(registerSchema), register);
router.post(
  "/verify-signup-otp",
  validate(signupOtpVerifySchema),
  verifySignupOTP,
);
router.post("/login", validate(loginSchema), login);
router.post("/verify-login-otp", validate(otpVerifySchema), verifyLoginOTP);
router.post("/decoy-login", validate(decoyLoginSchema), decoyLogin);
router.get("/me", auth, me);

module.exports = router;
