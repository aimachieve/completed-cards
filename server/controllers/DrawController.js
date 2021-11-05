const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
var request = require('request')
var qs = require('querystring')
const keys = require('../config/keys')
const { otplibAuthenticator } = require('../config/otplib')
const { mailgunHelper } = require('../config/mailgun')

const User = require('../models/User')
const Event = require('../models/Event')
const MainTicket = require('../models/MainTicket')
const SatelliteTicket = require('../models/SatelliteTicket')
const Table = require('../models/Table')
const Day = require('../models/Day')
const Room = require('../models/Room')

let otp
let roomnames = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
]

exports.getProducts = (req, res) => {
  Event.findOne().then((event) => {
    if (event) {
      res.json({ products: event })
    }
  })
}

/**
 * Get 10 random tables from DB.
 * @param {object} req
 * @param {object} res
 * @returns
 */
exports.getRandomTables = async (req, res) => {
  const tables = await Table.aggregate([{ $sample: { size: 10 } }])
  await Table.populate(tables, {
    path: 'seat',
    populate: [{ path: 'user_id', populate: [{ path: 'avatar' }] }],
  })
    .then((results) => {
      return res.status(200).json(results)
    })
    .catch((err) => {
      return res.status(500).send('Server Error')
    })
}

exports.getRandomTablesByUserId = async (req, res) => {
  const resTables = []
  const { userId } = req.params
  const tables = await Table.aggregate([
    { $unwind: '$seat' },
    {
      $lookup: {
        from: 'maintickets',
        localField: 'seat',
        foreignField: '_id',
        as: 'seat',
      },
    },
    {
      $match: {
        'seat.user_id': mongoose.Types.ObjectId(userId),
        'seat.status': true,
      },
    },
    { $sample: { size: 10 } },
  ])
  console.log(tables)
  for (let i = 0; i < tables.length; i += 1) {
    let table = await Table.findById(tables[i]._id).populate({
      path: 'seat',
      populate: [{ path: 'user_id', populate: [{ path: 'avatar' }] }],
    })
    await resTables.push(table)
  }
  return res.status(200).json(resTables)
}

/**
 * Search users
 * @param {object} req
 * @param {object} res
 */
exports.searchData = async (req, res) => {
  const { pageNumber, pageSize, key } = req.body
  console.log(pageNumber, pageSize, key)
  MainTicket.aggregate(
    [
      { $match: { username: new RegExp(key) } },
      {
        $group: {
          _id: '$user_id',
          username: { $first: '$username' },
          ticketAmount: { $sum: 1 },
          winAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 1, 0],
            },
          },
          loseAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 0, 1],
            },
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: 'total' },
            { $addFields: { pageNumber: pageNumber } },
          ],
          data: [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }], // add projection here wish you re-shape the docs
        },
      },
    ],
    function (err, results) {
      return res.status(200).json(results[0])
    },
  )
}

/**
 * Get all users who purchased the tickets
 * @param {object} req
 * @param {object} res
 */
exports.getAllUsers = async (req, res) => {
  const { pageNumber, pageSize } = req.body
  MainTicket.aggregate(
    [
      {
        $group: {
          _id: '$user_id',
          username: { $first: '$username' },
          ticketAmount: { $sum: 1 },
          winAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 1, 0],
            },
          },
          loseAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 0, 1],
            },
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: 'total' },
            { $addFields: { pageNumber: pageNumber } },
          ],
          data: [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }], // add projection here wish you re-shape the docs
        },
      },
    ],
    function (err, results) {
      return res.status(200).json(results[0])
    },
  )
}

/**
 * Get all days
 * @param {object} req
 * @param {object} res
 */
exports.getAllDays = async (req, res) => {
  let event = await Event.findOne({ status: { $lt: 3 } })

  if (event) {
    Day.find({ event_id: event._id })
      .populate('room')
      .then((data) => {
        return res.status(200).json(data)
      })
      .catch((error) => res.status(500).send('Server Error'))
  } else {
    return res.status(200).json([])
  }
}

/**
 * Get the users who purchased the satellite tickets by event id
 * @param {object} req
 * @param {object} res
 */
exports.getSatelliteUsersByEventId = (req, res) => {
  const { satelliteEventId } = req.params
  const { pageNumber, pageSize } = req.body

  SatelliteTicket.aggregate(
    [
      {
        $match: {
          satelliteId: mongoose.Types.ObjectId(satelliteEventId),
        },
      },
      {
        $group: {
          _id: '$user_id',
          username: { $first: '$username' },
          ticketAmount: { $sum: 1 },
          winAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 1, 0],
            },
          },
          loseAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 0, 1],
            },
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: 'total' },
            { $addFields: { pageNumber: pageNumber } },
          ],
          data: [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }], // add projection here wish you re-shape the docs
        },
      },
    ],
    function (err, results) {
      return res.status(200).json(results[0])
    },
  )
}

/**
 * Search the users who purchased the satellite tickets by event id
 * @param {object} req
 * @param {object} res
 */
exports.searchSatelliteUsersBySatelliteEventId = (req, res) => {
  const { satelliteEventId } = req.params
  const { keyword, pageNumber, pageSize } = req.body
  // console.log(req.body)
  SatelliteTicket.aggregate(
    [
      {
        $match: {
          username: new RegExp(keyword),
          satelliteId: mongoose.Types.ObjectId(satelliteEventId),
        },
      },
      {
        $group: {
          _id: '$user_id',
          username: { $first: '$username' },
          ticketAmount: { $sum: 1 },
          winAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 1, 0],
            },
          },
          loseAmount: {
            $sum: {
              $cond: [{ $ne: ['$status', true] }, 0, 1],
            },
          },
        },
      },
      {
        $facet: {
          metadata: [
            { $count: 'total' },
            { $addFields: { pageNumber: pageNumber } },
          ],
          data: [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }], // add projection here wish you re-shape the docs
        },
      },
    ],
    function (err, results) {
      return res.status(200).json(results[0])
    },
  )
}

/**
 * Get satellite events by the main event id
 * @param {object} req
 * @param {object}
 */
exports.getEventById = (req, res) => {
  Event.findOne({ status: { $lt: 3 } })
    .then((result) => {
      console.log(result)
      return res.status(200).json(result)
    })
    .catch((error) => {
      return res.status(500).send('Server Error')
    })
}

exports.getRandomTablesByDayIdAndRoomNumber = async (req, res) => {
  const resTables = []
  const { dayId, roomnumber } = req.body

  const tables = await Table.aggregate([
    { $unwind: '$seat' },
    {
      $lookup: {
        from: 'maintickets',
        localField: 'seat',
        foreignField: '_id',
        as: 'seat',
      },
    },
    {
      $match: {
        day: mongoose.Types.ObjectId(dayId),
        table: {
          $lt: (Number(roomnumber) + 1) * 2000 + 1,
          $gt: Number(roomnumber) * 2000,
        },
        // 'seat.history': {
        //   $elemMatch: {
        //     room: roomnumber,
        //   },
        // },
      },
    },
    { $sample: { size: 10 } },
  ])
  for (let i = 0; i < tables.length; i += 1) {
    let table = await Table.findById(tables[i]._id).populate({
      path: 'seat',
      populate: [{ path: 'user_id', populate: [{ path: 'avatar' }] }],
    })
    await resTables.push(table)
  }
  return res.status(200).json(resTables)
}

/**
 * Get the tickets by user id
 * @param {object} req
 * @param {object} res
 * @returns object
 */
exports.getTicketsByUserId = async (req, res) => {
  const { userId } = req.params
  const resData = []

  //  Get the main event tickets
  const numberOfMainTicketsByUserId = await MainTicket.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$event', numberOfTickets: { $sum: 1 } } },
  ])
  for (let i = 0; i < numberOfMainTicketsByUserId.length; i += 1) {
    let mainEvent = await Event.findById(numberOfMainTicketsByUserId[i]._id)
    await resData.push({
      _id: numberOfMainTicketsByUserId[i]._id,
      purchaseData: 'Main',
      eventTime: mainEvent.main.date,
      quantity: numberOfMainTicketsByUserId[i].numberOfTickets,
      result: mainEvent.status,
    })
  }

  //  Get the satellite event tickets
  const numberOfSatelliteTicketsByUserId = await SatelliteTicket.aggregate([
    { $match: { user_id: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$satelliteId', numberOfTickets: { $sum: 1 } } },
  ])
  for (let i = 0; i < numberOfSatelliteTicketsByUserId.length; i += 1) {
    let wholeEvent = await Event.findOne({
      satellite: {
        $elemMatch: {
          _id: mongoose.Types.ObjectId(numberOfSatelliteTicketsByUserId[i]._id),
        },
      },
    })

    wholeEvent.satellite.map((item, index) => {
      if (String(item._id) == numberOfSatelliteTicketsByUserId[i]._id) {
        resData.push({
          _id: numberOfSatelliteTicketsByUserId[i]._id,
          purchaseData: `Satellite ${index + 1}`,
          eventTime: item.date,
          quantity: numberOfSatelliteTicketsByUserId[i].numberOfTickets,
          result: item.status,
        })
      }
    })
  }
  return res.status(200).json(resData)
}

/**
 * Send email to the administrator's email account
 * @param {object} req
 * @param {object} res
 * @returns
 */
exports.sendEmailToAdmin = (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body
  return res.status(200).send('OK')
}

/*========================= Admin page =============================*/
// Create New Evnet
exports.create_Event = async (req, res) => {
  let event = await Event.findOne({ status: { $lt: 3 } })

  if (event) {
    event.status = 3
    var entryCount = await MainTicket.find({ event: event._id }).count()
    var winnerCount = await MainTicket.find({
      event: event._id,
      status: true,
    }).count()

    event.entry = entryCount
    event.winner = winnerCount

    await event.save()
  }

  const newEvent = new Event({
    name: req.body.eventName,
    status: 0,
  })

  await MainTicket.deleteMany()
  await SatelliteTicket.deleteMany()

  newEvent
    .save()
    .then((event) => {
      res.json('OK')
    })
    .catch((err) => console.log(err))
}

// Create Satellite Event
exports.create_sEvent = async (req, res) => {
  const current_event = await Event.findById(req.body.id)
  const current_satellite = current_event.satellite
  current_satellite.push({
    price: req.body.price,
    entries: req.body.entries,
    winners: req.body.winners,
    date: req.body.date,
  })

  await Event.findOneAndUpdate(
    { _id: req.body.id },
    { $set: { satellite: current_satellite } },
  )

  const updated_event = await Event.findById(req.body.id)

  res.json({
    success: true,
    current_event: updated_event,
  })
}

// Create Main Event
exports.create_mEvent = async (req, res) => {
  const current_event = await Event.findById(req.body.id)

  await Event.findOneAndUpdate(
    { _id: req.body.id },
    {
      $set: {
        main: {
          price: req.body.price,
          date: req.body.date,
        },
      },
    },
  )

  const updated_event = await Event.findById(req.body.id)

  res.json({
    success: true,
    current_event: updated_event,
  })
}

exports.getCurrentEvent = async (req, res) => {
  const current_event = await Event.findOne({ status: { $lt: 3 } })

  res.json({
    success: true,
    current_event: current_event,
  })
}

exports.resetPassword = async (req, res) => {
  console.log(req.body)
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(req.body.password, salt, (err, hash) => {
      if (err) throw err
      console.log(hash)
      User.findOneAndUpdate(
        { _id: req.body.id },
        {
          $set: {
            password: hash,
          },
        },
      )
        .then((user) => {
          console.log(user)
          res.json({
            success: 'true',
            user: user,
          })
        })
        .catch((err) =>
          res.json({
            succeess: 'false',
          }),
        )
    })
  })
}

/*========================= CartPage =============================*/
exports.get_tickets = async (req, res) => {
  const current_event = await Event.findOne({ status: 0 })

  let tickets = []

  tickets.push(current_event.main)
  tickets.psuh(current_event.satellite)

  res.json({
    success: true,
    tickets,
  })
}
/*========================= CartPage =============================*/

/*========================= PlayGame =============================*/
exports.assignSatelliteTable = async (req, res) => {
  const { satelliteId, roomnumber } = req.body

  let event = await Event.findOne({ status: 0 })
  let day = await Day.findOne({ event_id: event._id })
    .populate('room', 'roomnumber')
    .sort({ daynumber: -1 })

  let newRoom

  if (day == null) {
    // when there is no day info in day table.
    day = new Day({
      daynumber: 1,
      event_id: event._id,
    })

    newRoom = new Room({
      roomnumber: roomnumber,
      day: day._id,
    })
    await newRoom.save()

    day.room = [newRoom._id]
    await day.save()
  } else {
    // when there is a day info in day table.
    let roomflag =
      day.room.filter((item) => item.roomnumber == roomnumber).length > 0
    if (!roomflag) {
      // when there is a roomnumber info in day's room field.
      newRoom = new Room({
        roomnumber: roomnumber,
        day: day._id,
      })

      await newRoom.save()
      day.room = [...day.room, newRoom._id]
      await day.save()
    }
  }

  let satelliteEvent = event.satellite.filter(
    (item) => item._id.toString() == satelliteId,
  )

  let maps
  var newMainTicket
  var i = 0,
    j = 0

  SatelliteTicket.find({ satelliteId: satelliteId }).then(async (data) => {
    maps = data
    var newMainTicket = {}

    for (i = 0; i < satelliteEvent[0].winners; i++) {
      let winnerNumber = Math.ceil(Math.random() * 1000) % maps.length
      await SatelliteTicket.findOneAndUpdate(
        { _id: maps[winnerNumber]._id },
        { $set: { status: true } },
      )

      newMainTicket = new MainTicket({
        user_id: maps[winnerNumber].user_id,
        satelliteId: satelliteId,
        event: event._id,
      })
      await newMainTicket.save()
      maps.splice(winnerNumber, 1)
    }

    MainTicket.find({ satelliteId: satelliteId }).then(async (maindata) => {
      maps = maindata
      let temp = []
      let tempuser_id = []
      let avoiderror = 0
      j = roomnumber * 2000

      while (true) {
        var isExistRoomNumber = await Table.findOne({ table: j })

        if (isExistRoomNumber) {
          j++
          continue
        }

        for (i = 0; i < maps.length; i++) {
          let flag = tempuser_id.filter(
            (item) => item.toString() == maps[i].user_id.toString(),
          ).length

          if (flag < 2) {
            await MainTicket.findOneAndUpdate(
              { _id: maps[i]._id },
              {
                $set: {
                  history: [
                    ...maps[i].history,
                    {
                      room: Math.floor(j / 2000),
                      table: j % 2000,
                      seat: temp.length,
                    },
                  ],
                },
              },
            )

            temp.push(maps[i]._id)
            tempuser_id.push(maps[i].user_id)
            maps.splice(i, 1)
            avoiderror = 0
            i--
          } else {
            avoiderror++
            continue
          }
          if (temp.length == 10 || maps.length === 0) {
            newTable = new Table({
              table: j,
              seat: temp,
              day: day._id,
            })

            await newTable.save()
            j++
            temp = []
            tempuser_id = []
            break
          }
        }

        console.log('maps.length => ', maps.length)
        if (maps.length === 0) {
          break
        }

        if (avoiderror > maps.length) {
          newTable = new Table({
            table: j,
            seat: temp,
            day: day._id,
          })

          await newTable.save()
          j++
          temp = []
          tempuser_id = []
        }
      }
    })
  })

  let event_satellite = event.satellite
  for (i = 0; i < event_satellite.length; i++) {
    if (event_satellite[i]._id.toString() == satelliteId) break
  }
  event_satellite[i].status = false
  await event.save()
  res.json('OK')
}

exports.makeTable = async (req, res) => {
  let event = await Event.findOne({ status: { $lt: 3 } })
  let day = await Day.findOne({ event_id: event._id }).sort({ daynumber: -1 })

  let winnerCount = await MainTicket.find({ status: true }).count()
  day.entry = winnerCount
  await day.save()

  MainTicket.find({ status: true, satelliteId: null }).then(async (data) => {
    // except satellite when make first table
    let maps = data
    let temp = []
    let tempuser_id = []
    let newTable, newRoom
    let avoiderror = 0 // avoid always flag == 2
    var i = 0,
      j = 0

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    let roomcount = Math.ceil(data.length / 20000)

    for (i = 0; i < roomcount; i++) {
      let existRoom = await Room.findOne({ roomnumber: i, day: day._id })

      if (existRoom === null) {
        newRoom = new Room({
          roomnumber: i,
          day: day._id,
        })

        newRoom.save()

        day.room = [...day.room, newRoom._id]
        await day.save()
      }
    }

    while (true) {
      var isExistRoomNumber = await Table.findOne({ table: j, day: day._id }) //if j is existed in table number, continue

      if (isExistRoomNumber) {
        j++
        continue
      }

      for (i = 0; i < maps.length; i++) {
        let flag = tempuser_id.filter(
          (item) => item.toString() == maps[i].user_id.toString(),
        ).length

        if (flag < 2) {
          // check if there are more than 2 users in temp
          await MainTicket.findOneAndUpdate(
            { _id: maps[i]._id },
            {
              $set: {
                history: [
                  ...maps[i].history,
                  {
                    room: Math.floor(j / 2000),
                    table: j % 2000,
                    seat: temp.length,
                  },
                ],
              },
            },
          )

          temp.push(maps[i]._id)
          tempuser_id.push(maps[i].user_id)
          maps.splice(i, 1)
          avoiderror = 0
          i--
        } else {
          avoiderror++
          continue
        }
        if (temp.length == 10 || maps.length === 0) {
          newTable = new Table({
            table: j,
            seat: temp,
            day: day._id,
          })

          await newTable.save()
          j++
          temp = []
          tempuser_id = []
          break
        }
      }

      console.log('maps.length => ', maps.length)
      if (maps.length === 0) {
        break
      }

      if (avoiderror > maps.length) {
        newTable = new Table({
          table: j,
          seat: temp,
          day: day._id,
        })

        await newTable.save()
        j++
        temp = []
        tempuser_id = []
      }
    }

    res.json('OK')
  })

  if (event.status == 0) {
    event.status = 1
    await event.save()
  }
}

exports.roomDraw = async (req, res) => {
  let roomnumber = req.params.id

  let event = await Event.findOne({ status: { $lt: 3 } })
  let day = await Day.findOne({ event_id: event._id }).sort({ daynumber: -1 })

  var tables = await Table.find({
    day: day._id,
    table: {
      $lt: (Number(roomnumber) + 1) * 2000 + 1,
      $gt: Number(roomnumber) * 2000,
    },
  })

  for (var i = tables.length - 1; i >= 0; i--) {
    let temp = tables[i].seat

    for (var j = temp.length - 1; j > 2; j--) {
      let rand = Math.ceil(Math.random() * 100) % temp.length

      await MainTicket.findOneAndUpdate(
        { _id: temp[rand]._id },
        { $set: { status: false } },
      )

      temp.splice(rand, 1)
    }
    console.log('temp-length----->', i)
  }

  for (var i = tables.length - 1; i >= 0; i--) {
    let temp = tables[i].seat

    for (var j = temp.length - 1; j >= 0; j--) {
      let tempMainTicket = await MainTicket.findOne({
        _id: temp[j]._id,
        status: true,
      })
      if (tempMainTicket) {
        tempMainTicket.history = [...tempMainTicket.history, null]

        await tempMainTicket.save()
      }
    }
    console.log('tempMainTicket =>', i)
  }

  let room = await Room.findOne({ roomnumber: roomnumber, day: day._id })
  room.status = true
  await room.save()
  res.json('OK')
}

exports.endDay = async (req, res) => {
  let event = await Event.findOne({ status: { $lt: 3 } })
  let day = await Day.findOne({ event_id: event._id }).sort({ daynumber: -1 })

  day.status = false

  let newDay = new Day({
    daynumber: day.daynumber + 1,
    event_id: event._id,
  })

  MainTicket.find({ status: true }).then(async (data) => {
    let maps = data
    let temp = []
    let tempuser_id = []
    let newTable, newRoom
    let avoiderror = 0 // avoid always flag == 2
    var i = 0,
      j = 0

    // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    let roomcount = Math.ceil(data.length / 20000)

    for (i = 0; i < roomcount; i++) {
      let existRoom = await Room.findOne({ roomnumber: i, day: newDay._id })
      if (existRoom === null) {
        newRoom = new Room({
          roomnumber: i,
          day: newDay._id,
        })

        await newRoom.save()

        newDay.room = [...newDay.room, newRoom._id]
        await newDay.save()
      }
    }

    while (true) {
      for (i = 0; i < maps.length; i++) {
        let flag = tempuser_id.filter(
          (item) => item.toString() == maps[i].user_id.toString(),
        ).length

        if (flag < 2) {
          // check if there are more than 2 users in temp
          let maphistory = maps[i].history
          if (maphistory[maps[i].history.length - 1] == null) {
            maphistory.splice(map.history.length - 1, 1)
          }

          await MainTicket.findOneAndUpdate(
            { _id: maps[i]._id },
            {
              $set: {
                history: [
                  ...maphistory,
                  {
                    room: Math.floor(j / 2000),
                    table: j % 2000,
                    seat: temp.length,
                  },
                ],
              },
            },
          )

          temp.push(maps[i]._id)
          tempuser_id.push(maps[i].user_id)
          maps.splice(i, 1)
          avoiderror = 0
          i--
        } else {
          avoiderror++
          continue
        }
        if (temp.length == 10 || maps.length === 0) {
          newTable = new Table({
            table: j,
            seat: temp,
            day: newDay._id,
          })

          await newTable.save()
          j++
          temp = []
          tempuser_id = []
          break
        }
      }

      console.log('maps.length => ', maps.length)
      if (maps.length === 0) {
        break
      }

      if (avoiderror > maps.length) {
        newTable = new Table({
          table: j,
          seat: temp,
          day: newDay._id,
        })

        await newTable.save()
        j++
        temp = []
        tempuser_id = []
      }
    }

    res.json('OK')
  })

  let winnerCount = await MainTicket.find({ status: true }).count()

  day.winner = winnerCount
  newDay.entry = winnerCount

  await newDay.save()
  await day.save()

  if (event.status == 0) {
    event.status = 1
    await event.save()
  }
}

exports.finalRoom = async (req, res) => {
  let finalwinner = Number(req.params.id)

  let event = await Event.findOne({ status: { $lt: 3 } })
  let day = await Day.findOne({ event_id: event._id }).sort({ daynumber: -1 })

  var tables = await Table.find({ day: day._id })

  let total = 0

  day.status = false
  day.winner = finalwinner

  for (var i = tables.length - 1; i >= 0 && total <= finalwinner; i--) {
    let temp = tables[i].seat

    let randomlimit = Math.ceil(Math.random() * 100) % 3

    for (var j = temp.length - 1; j > randomlimit; j--) {
      let rand = Math.ceil(Math.random() * 100) % temp.length

      await MainTicket.findOneAndUpdate(
        { _id: temp[rand]._id },
        { $set: { status: false } },
      )

      temp.splice(rand, 1)
      total++
    }
    console.log('temp-length----->', i)
    // await Table.findOneAndUpdate({ _id: tables[i]._id }, {$set: {'seat': temp} })
  }

  let rooms = await Room.find({ day: day._id })

  for (i = 0; i < rooms.length; i++) {
    rooms[i].status = true
    await rooms[i].save()
  }

  await day.save()
  event.status = 2
  await event.save()

  res.json('OK')
}

exports.payment = async (req, res) => {
  let xKey = keys.cardknoxKey
  let xSoftwareName = keys.xSoftwareName
  let xSoftwareVersion = keys.xSoftwareVersion
  let transactionUrl = keys.transactionUrl
  let xVersion = keys.xVersion

  let { cart, user } = req.body

  let amount = 0
  for (var i = cart.length - 1; i >= 0; i--) {
    amount += cart[i].quantity * cart[i].price
  }

  request.post(
    {
      url: transactionUrl,
      form: {
        xKey: xKey,
        xVersion: xVersion,
        xSoftwareName: xSoftwareName,
        xSoftwareVersion: xSoftwareVersion,
        xCommand: 'cc:Sale',
        xAmount: 10,
        xCardNum: user.cardname,
        xCVV: user.cvc,
        xExp: user.expire,
        xEmail: user.xEmail,
        xBillFirstName: user.xBillFirstName,
        xBillLastName: user.xBillLastName,
        xBillStreet: user.xBillStreet,
        xBillCity: user.xBillCity,
        xBillState: user.xBillState,
        xBillZip: user.xBillZip,
        xBillCountry: user.xBillCountry,
        xBillCompany: user.xBillCompany,
        xBillPhone: user.xBillPhone,
      },
    },
    function (error, response, body) {
      data = qs.parse(body)
      console.log(data)
      // let event = await Event.findOne({status: 0});

      // var newMainTicket = {}

      // User.find().then(async (users) => {
      //   for (var j = 0; j < 5; j++) {
      //     console.log(i + '-----' + j)
      //     newMainTicket = new MainTicket({
      //       user_id: users[i]._id,
      //       username: users[i].name,
      //       event: event._id
      //     })
      //     await newMainTicket.save()
      //   }
      // })

      res.json(data)
    },
  )
}

exports.getFinalWinner = async (req, res) => {
  let event = await Event.findOne({ status: 2 })

  if (event) {
    MainTicket.find({ status: false })
      .sort({ history: -1 })
      .limit(event.winner)
      .populate('user_id')
      .then((data) => res.json(data))
  } else {
    res.json([])
  }
}

/*========================= PlayGame =============================*/

/*========================= Create Mock Data =============================*/
exports.createMockData = async (req, res) => {
  let event = await Event.findOne({ status: 0 })

  var newMainTicket = {}

  User.find().then(async (users) => {
    for (var i = 0; i < users.length; i++) {
      for (var j = 0; j < 4; j++) {
        console.log(i + '-----' + j)
        newMainTicket = new MainTicket({
          user_id: users[i]._id,
          username: users[i].username,
          event: event._id,
        })
        await newMainTicket.save()
      }
    }
    res.json('OK')
  })
}
/*========================================================================*/
