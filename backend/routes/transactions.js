const router = require("express").Router();
const Joi = require("joi");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  sendMoney,
  getHistory,
  getOne,
  requestTransactionOTP,
  analyzeTransaction,
} = require("../controllers/transactionController");

const requestOtpSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

const sendSchema = Joi.object({
  identifier: Joi.string().required(),
  amount: Joi.number().positive().max(100000).required(),
  note: Joi.string().max(200).allow("").optional(),
  pin: Joi.string()
    .pattern(/^\d{4,6}$/)
    .required(),
  transactionOtp: Joi.string().length(6).optional(),
});

router.post(
  "/request-otp",
  auth,
  validate(requestOtpSchema),
  requestTransactionOTP,
);
router.post("/analyze", auth, analyzeTransaction);
router.post("/send", auth, validate(sendSchema), sendMoney);
router.get("/history", auth, getHistory);
router.get("/:id", auth, getOne);

module.exports = router;
