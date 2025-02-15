require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const passport = require('passport')
const router = require('./routes')
const app = express()
const port = process.env.PORT || 3000
// const rateLimit = require('express-rate-limit')

// const limiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 限制時間
//   max: 250 // 限制請求數量
// })

// const corsOptions = {
//   origin: [
//    process.env.GITHUB_PAGE,
//    'http://localhost:3000'
//   ],
//   method: 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
//   allowedHeaders: ['Content-Type', 'Authorization']
// }    corsOptions
// app.set('trust proxy', 1) // 讓limiter可以讀取ip
// app.use(limiter)
app.use('*', cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(passport.initialize())
app.use('/upload', express.static(path.join(__dirname, 'upload')))
app.use('/api', router)
app.get('/', (req, res) => res.send('Hello World!'))
app.listen(port, () => console.info(`Example app listening on port ${port}!`))
module.exports = app
