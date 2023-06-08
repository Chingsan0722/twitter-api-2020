const { Tweet, Reply, User } = require('../models')

const replyController = {
  getReplies: (req, res, next) => {
    const { tweetId } = req.params
    Reply.findAll({
      where: { TweetId: tweetId },
      include: { model: User, attributes: ['account', 'name', 'avatar'] },
      order: [['createdAt', 'DESC']]
    })
      .then((replies) => {
        res.json({ status: 'success', data: replies })
      })
      .catch((error) => next(error))
  },
  postReply: (req, res, next) => {},
  putReply: (req, res, next) => {},
  deleteReply: (req, res, next) => {}
}

module.exports = replyController
