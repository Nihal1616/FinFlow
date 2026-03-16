const router = require('express').Router();
const auth = require('../middlewares/auth');
const { getProfile, searchUsers } = require('../controllers/userController');

router.get('/profile', auth, getProfile);
router.get('/search',  auth, searchUsers);

module.exports = router;
