const router = require('express').Router();
const Joi = require('joi');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const { register, login, me } = require('../controllers/authController');

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  phone:    Joi.string().min(10).max(15).required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password:   Joi.string().required(),
});

router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema),    login);
router.get('/me',        auth,                     me);

module.exports = router;
