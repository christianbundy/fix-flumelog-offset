#!/usr/bin/env node

const flume = require('flumedb')
const log = require('flumelog-offset')
const os = require('os')
const path = require('path')
const pull = require('pull-stream')
const mv = require('mv')
const crypto = require('crypto')

const yargs = require('yargs')

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

const rand = crypto.randomBytes(32).toString('hex')
const paths = {
  db: config.path,
  tmp: `/tmp/fix-flume-db-${rand}`
}

const a = createDb(paths.db)
const b = createDb(paths.tmp)

const onEachMessage = msg => {
  b.append(msg, function (err) {
    if (err) throw err
  })
}

const onDone = () => {
  // overwrite the real db with the temporary db
  mv(paths.tmp, paths.db, function (err) {
    if (err) throw err
  })
}

pull(
  a.stream({ seqs: false }),
  pull.filter(),
  pull.drain(onEachMessage, onDone)
)
