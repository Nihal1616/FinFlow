const router = require("express").Router();
const Joi = require("joi");
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createGroup,
  getGroups,
  getGroup,
  addExpense,
  settleExpense,
  getBalances,
} = require("../controllers/splitController");

const createGroupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(300).allow("").optional(),
  memberIds: Joi.array().items(Joi.string()).optional(),
});

const addExpenseSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  totalAmount: Joi.number().positive().required(),
  splitType: Joi.string().valid("equal", "custom").default("equal"),
  customSplits: Joi.array()
    .items(
      Joi.object({
        userId: Joi.string().required(),
        share: Joi.number().positive().required(),
      }),
    )
    .optional(),
  note: Joi.string().max(300).allow("").optional(),
});

const settleSchema = Joi.object({
  pin: Joi.string().pattern(/^\d{4,6}$/).required(),
});

router.get("/balances", auth, getBalances);
router.post("/groups", auth, validate(createGroupSchema), createGroup);
router.get("/groups", auth, getGroups);
router.get("/groups/:groupId", auth, getGroup);
router.post("/groups/:groupId/expenses", auth, validate(addExpenseSchema), addExpense);
router.post("/expenses/:expenseId/settle", auth, validate(settleSchema), settleExpense);

module.exports = router;
