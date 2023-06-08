const express = require('express')
const router = express.Router()
const passport = require('../config/passport')
const admin = require('./modules/admin')
const { apiErrorHandler } = require('../middleware/error-handler')
const { authenticated, authenticatedAdmin } = require('../middleware/api-auth')
const replyController = require('../controllers/replyController')
const userController = require('../controllers/userController')

router.use('/admin', authenticated, authenticatedAdmin, admin)

// 告訴passport不用session了 改用token驗證
router.post('/signin', passport.authenticate('local', { session: false }), userController.signIn)

router.get('/users/top', authenticated, userController.getTopUsers)
router.post('/users', userController.signUp)
router.get('/users/:id', authenticated, userController.getUser)
router.put('/users/:id', authenticated, userController.putUser)
router.delete('/users/:id', authenticated, userController.deleteUser)

router.get('/tweets/:id/replies', authenticated, replyController.getReplies)
router.post('/tweets/:id/replies', authenticated, replyController.postReply)
router.put('/tweets/:tweetId/replies/:replyId', authenticated, replyController.putReply)
router.delete('/tweets/:tweetId/replies/:replyId', authenticated, replyController.deleteReply)

router.use('/', apiErrorHandler)
module.exports = router
