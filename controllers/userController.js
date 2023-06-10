const jwt = require('jsonwebtoken')
const { User, Tweet } = require('../models')
const { getUser } = require('../_helpers')
const bcrypt = require('bcryptjs')
const userController = {
  signIn: (req, res, next) => {
    try {
      if (req.authInfo && req.authInfo.message) {
        throw new Error(req.authInfo.message)
      }
      const userData = getUser(req).toJSON()
      if (!userData) throw new Error('account or password incorrect!')
      delete userData.password

      const token = jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '7d' })
      res.json({
        status: 'success',
        token,
        data: {
          user: userData
        }
      })
    } catch (err) {
      next(err)
    }
  },
  signUp: (req, res, next) => {
    if (req.body.password !== req.body.passwordCheck) throw new Error('Password do not match!')
    if (req.body.name.length > 50) throw new Error('Max length 50')
    return Promise.all([
      User.findOne({ where: { email: req.body.email } }),
      User.findOne({ where: { account: req.body.account } })
    ])
      .then(([emailCheck, accountCheck]) => {
        if (emailCheck) throw new Error('Email already exists!')
        if (accountCheck) throw new Error('Account already exists!')
        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({
        account: req.body.account,
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(data => {
        const userData = data.toJSON()
        delete userData.password
        res.json({ status: 'success', message: 'Create success' })
      })
      .catch(err => next(err))
  },
  getUser: (req, res, next) => {
    const userId = req.params.id
    Promise.all([
      User.findOne({
        where: { id: userId },
        raw: true
      }),
      Tweet.findAll({
        where: { UserId: userId },
        raw: true
      })
    ])
      .then(([data, tweets]) => {
        if (!data) throw new Error('User not found!')
        delete data.password
        data.tweetsCounts = tweets.length
        res.json({ status: 'success', data })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    const userId = req.params.id
    // const iAmUser = req.user.id
    // if(userId !== iAmUser) throw new Error('Can not edit others profile')
    const { account, name, email, password, passwordCheck, introduction } = req.body
    if (password !== passwordCheck) throw new Error('Password do not match!')
    User.findByPk(userId)
      .then(data => {
        return data.update({
          account,
          name,
          email,
          password,
          introduction
        })
      })
      .then(data => {
        data = data.toJSON()
        delete data.password
        res.json({ status: 'success', data })
      })
      .catch(err => next(err))
  },
  deleteUser: (req, res, next) => {
    const userId = req.params.id
    // 別人也能刪除自己 需更動passport
    User.findByPk(userId)
      .then(user => {
        if (!user) throw new Error('User not found')
        user.destroy()
      })
      .then(() => {
        res.json({ status: 'success', data: 'Delete success' })
      })
      .catch(err => next(err))
  },
  getTopUsers: (req, res, next) => {
    // 研究如何把followers從res中移除，否則回傳資料太大包
    User.findAll({
      include: [{
        model: User,
        as: 'Followers'
      }]
    })
      .then(users => {
        const newUsers = users
          .map(user => ({
            ...user.toJSON(),
            followerCount: user.Followers.length,
            isFollowing: req.user.Followings ? req.user.Followings.some(f => f.id === user.id) : false
          }))
          .sort((a, b) => b.followerCount - a.followerCount)

        res.json({ status: 'success', data: newUsers })
      })
      .catch(err => next(err))
  }
}

module.exports = userController
