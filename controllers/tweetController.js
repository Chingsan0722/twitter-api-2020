const { getLastUpdated, getLastUpd, getUser } = require('../_helpers')
const { User, Tweet, Like, Reply } = require('../models')

const tweetController = {
  getTweets: (req, res, next) => {
    const liked = req.query.liked
    const userId = getUser(req).id || getUser(req).dataValues.id
    const searchUserId = req.params.id
    const limit = parseInt(req.query.limit) || 10
    const page = parseInt(req.query.page) || 1
    const offset = limit * (page - 1)

    let counts
    if (liked) {
      Like.findAll({
        where: { User_Id: searchUserId },
        attributes: ['TweetId'],
        raw: true,
        nest: true
      })
        .then((likes) => {
          return likes.map((row) => row.TweetId)
        })
        .then((tweetIds) => {
          return Tweet.findAll({
            where: { id: tweetIds },
            include: [
              { model: User, attributes: ['account', 'name', 'avatar'] },
              { model: Like, attributes: ['UserId', 'updatedAt'] },
              { model: Reply, attributes: ['UserId'] }
            ],
            nest: true,
            order: [['createdAt', 'DESC']],
            limit,
            offset
          })
        })
        .then((tweets) => {
          if (tweets.length === 0) return res.status(404).json('Tweets not found')
          counts = tweets.map((tweet) => {
            const fileteredLikesTime = tweet.Likes.filter((like) => like.UserId === Number(searchUserId))[0].dataValues.updatedAt
            return {
              ...tweet.toJSON(),
              account: tweet.User?.account,
              name: tweet.User?.name,
              avatar: tweet.User?.avatar,
              likesCount: tweet.Likes?.length,
              repliesCount: tweet.Replies?.length,
              lastUpdated: getLastUpd(tweet),
              isLiked: tweet.Likes?.some(
                (l) => Number(l.UserId) === Number(userId)
              ),
              updatedAt: fileteredLikesTime
            }
          })
            .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
        })
        .then(() => {
          const data = counts.map(({ Likes, Replies, User, ...rest }) => rest)
          return res.status(200).json(data)
        })
        .catch((err) => next(err))
    } else {
      Tweet.findAll({
        where: { UserId: searchUserId },
        include: [
          { model: User, attributes: ['account', 'name', 'avatar'] },
          { model: Like, attributes: ['UserId', 'updatedAt'] },
          { model: Reply, attributes: ['UserId'] }
        ],
        nest: true,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      })
        .then((tweets) => {
          if (tweets.length === 0) { return res.status(404).json('Tweets not found') }
          counts = tweets.map((tweet) => ({
            ...tweet.toJSON(),
            account: tweet.User?.account,
            name: tweet.User?.name,
            avatar: tweet.User?.avatar,
            likesCount: tweet.Likes?.length,
            repliesCount: tweet.Replies?.length,
            lastUpdated: getLastUpd(tweet),
            isLiked: tweet.Likes?.some(
              (l) => Number(l.UserId) === Number(userId)
            )
          }))
        })
        .then(() => {
          const data = counts.map(({ Likes, Replies, User, ...rest }) => rest)
          return res.status(200).json(data)
        })
        .catch((err) => next(err))
    }
  },
  getAllTweets: (req, res, next) => {
    const userId = getUser(req).id || getUser(req).dataValues.id
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = limit * (page - 1);
    Tweet.findAll({
      include: [
        { model: User, attributes: ['account', 'name', 'avatar'] },
        { model: Like, attributes: ['UserId'] },
        { model: Reply, attributes: ['UserId'] }
      ],
      order: [['createdAt', 'DESC']],
      nest: true,
      limit,
      offset
    })
      .then((tweets) => {
        return tweets.map((tweet) => ({
          ...tweet.get({ plain: true }),
          account: tweet.User?.account,
          name: tweet.User?.name,
          avatar: tweet.User?.avatar,
          likesCount: tweet.Likes?.length,
          repliesCount: tweet.Replies?.length,
          lastUpdated: getLastUpd(tweet),
          isLiked: tweet.Likes?.some((l) => l.UserId === Number(userId)),
          User: undefined,
          Likes: undefined,
          Replies: undefined
        }))
      })
      .then((data) => res.status(200).json(data))
      .catch((err) => next(err))
  },
  getTweet: (req, res, next) => {
    const tweetId = req.params.id
    const userId = getUser(req).id || getUser(req).dataValues.id
    Promise.all([
      User.findByPk(userId, { attributes: ['avatar'], raw: true }),
      Tweet.findByPk(tweetId, {
        include: [
          { model: User, attributes: ['account', 'name', 'avatar'] },
          { model: Like, attributes: ['UserId'] },
          { model: Reply, attributes: ['UserId'] }
        ],
        nest: true
      })
    ])
      .then(([user, data]) => {
        if (!data) return res.status(404).json('Tweets not found')
        const tweet = data?.dataValues
        tweet.likesCount = tweet.Likes?.length
        tweet.repliesCount = tweet.Replies?.length
        tweet.account = tweet.User?.account
        tweet.name = tweet.User?.name
        tweet.avatar = tweet.User?.avatar
        tweet.userAvatar = user?.avatar
        tweet.isLiked = tweet.Likes?.some((f) => f.UserId === Number(userId))
        delete tweet.User
        delete tweet.Likes
        delete tweet.Replies
        getLastUpdated(tweet)
        return res.status(200).json(data)
      })
      .catch((err) => next(err))
  },
  getRepliedTweets: (req, res, next) => {
    const userId = req.params.id
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = limit * (page - 1);
    Reply.findAll({
      where: { UserId: userId },
      include: [
        { model: User, attributes: ['avatar', 'name', 'account'] },
        {
          model: Tweet,
          attributes: ['UserId'],
          include: [{ model: User, attributes: ['avatar', 'name', 'account'] }]
        }
      ],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC']
      ],
      nest: true,
      limit,
      offset
    })
      .then((tweets) => {
        const beforeData = tweets.map((tweet) => ({
          ...tweet.toJSON(),
          tweetUserName: tweet.Tweet?.User?.name,
          tweetUserAccount: tweet.Tweet?.User?.account,
          tweetUserAvatar: tweet.Tweet?.User?.avatar,
          repliedUserName: tweet.User?.name,
          repliedUserAccount: tweet?.User.account,
          repliedUserAvatar: tweet?.User.avatar,
          lastUpdated: getLastUpd(tweet)
        }))
        const data = beforeData.map(({ Tweet, User, ...rest }) => rest)
        res.status(200).json(data)
      })
      .catch((err) => next(err))
  },
  postTweet: (req, res, next) => {
    const { description, likable, commendable } = req.body
    if (!description) { return res.status(400).json('Description can not be empty!') }
    if (description.length > 140) { return res.status(400).json('Max length 140.') }
    const id = req.user.id || getUser(req).dataValues.id
    Tweet.create({
      UserId: id,
      description,
      likable: likable || '1',
      commendable: commendable || '1'
    })
      .then((data) => {
        if (!data) return res.status(404).json('Tweet not found')
        getLastUpdated(data)
        return res.status(200).json('post success')
      })
      .catch((err) => next(err))
  },
  putTweet: (req, res, next) => {
    const { description, likable, commendable } = req.body
    const id = req.params.id
    if (!description) { return res.status(400).json('Description can not be empty!') }
    if (description.length > 140) { return res.status(400).json('Max length 140.') }
    Tweet.findByPk(id)
      .then((tweet) => {
        if (!tweet) return res.status(404).json('Tweet not found!')
        return tweet.update({
          description,
          likable: likable || '1',
          commendable: commendable || '1'
        })
      })
      .then((data) => {
        if (!data) return res.status(400).json('Update failed!')
        getLastUpdated(data)
        return res.status(200).json('update success')
      })
      .catch((err) => next(err))
  },
  deleteTweet: (req, res, next) => {
    const id = req.params.id
    Tweet.findByPk(id)
      .then((tweet) => {
        if (!tweet) return res.status(404).json('Tweet not found')
        Like.findAll({
          where: { TweetId: id }
        })
          .then((like) => {
            like.destroy()
          })
        Reply.findAll({
          where: { TweetId: id }
        })
          .then((reply) => {
            reply.destroy()
          })
        tweet.destroy()
      })
      .then(() => {
        return res.status(200).json('Delete success')
      })
      .catch((err) => next(err))
  }
}

module.exports = tweetController
