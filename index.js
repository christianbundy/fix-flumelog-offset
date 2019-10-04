#!/usr/bin/env node

const flume = require('flumedb')
const log = require('flumelog-offset')
const os = require('os')
const path = require('path')
const pull = require('pull-stream')
const mv = require('mv')

const yargs = require('yargs')

const max = Date.now()
const min = 1398910373926

const config = yargs
  .usage('Usage: $0 [options]')
  .options('path', {
    describe: 'database path',
    default: path.join(os.homedir(), '.ssb', 'flume', 'log.offset'),
    type: 'string'
  })
  .argv

const createDb = (file) =>
  flume(log(file, {
    codec: {
      encode: JSON.stringify,
      decode: (data) => {
        if (data.length >= 0x3fffffe7) {
          // way too long
          return null
        }

        try {
          return JSON.parse(data)
        } catch (e) {
          console.log(`Ignored error: ${e}`)
          return null
        }
      }
    }
  }))

const paths = {
  db: config.path,
  tmp: '/tmp/fix-flume-db'
}

const a = createDb(paths.db)
const b = []
const c = {}
const d = createDb(paths.tmp)

const onEachMessage = msg => {
  if (msg.value.previous == null) {
    c[msg.value.author] = [msg]
  } else {
    c[msg.value.author].push(msg)
  }
}

const onDone = () => {
  // overwrite the real db with the temporary db
  const last = {}

  Object.entries(c).forEach(([feed, messages]) => {
    messages.forEach((message) => {
      if (message.value.previous != null) {
        if (message.value.timestamp < last[feed]) {
          console.log(`from the past: ${feed}, ${message.value.timestamp}`)
          message.timestamp = last[feed]
        } else if (message.value.timestamp > max) {
          message.timestamp = last[feed]
          console.log(`from the future: ${feed}, ${message.value.timestamp}`)
        } else {
          message.timestamp = message.value.timestamp
        }
      } else {
        if (message.value.timestamp < min) {
          console.log(`first message from the past: ${feed}`)
          message.timestamp = min
        } else if (message.value.timestamp > max) {
          console.log(`first message from the future: ${feed}`)
          message.timestamp = max
        } else {
          message.timestamp = message.value.timestamp
        }
      }

      last[feed] = message.timestamp
      b.push(message)
    })
  })

  b.sort((a, b) =>
    a.timestamp - b.timestamp
  )

  b.forEach((msg) => {
    d.append(msg, function (err) {
      if (err) throw err
    })
  })

  mv(paths.tmp, paths.db, function (err) {
    if (err) throw err
    console.log('done! make sure to delete your indexes before starting ssb-server')
  })
}

pull(
  a.stream({ seqs: false }),
  pull.filter(),
  pull.drain(onEachMessage, onDone)
)
