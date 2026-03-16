const router = require('express').Router();
const Joi = require('joi');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { sendMoney, getHistory, getOne } = require('../controllers/transactionController');

const sendSchema = Joi.object({
  identifier: Joi.string().required(),
  amount:     Joi.number().positive().max(100000).required(),
  note:       Joi.string().max(200).allow('').optional(),
});

router.post('/send',    auth, validate(sendSchema), sendMoney);
router.get('/history',  auth, getHistory);
router.get('/:id',      auth, getOne);

module.exports = router;
