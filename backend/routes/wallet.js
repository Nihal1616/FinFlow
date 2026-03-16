const router = require('express').Router();
const Joi = require('joi');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { getBalance, addMoney } = require('../controllers/walletController');

const addMoneySchema = Joi.object({
  amount: Joi.number().positive().max(100000).required(),
  method: Joi.string().valid('UPI', 'NetBanking', 'Card').default('UPI'),
});

router.get('/balance',   auth, getBalance);
router.post('/add-money', auth, validate(addMoneySchema), addMoney);

module.exports = router;
