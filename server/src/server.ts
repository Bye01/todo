import { createApp } from './app'
import { config } from './config'
import { initDb } from './db'

async function start() {
  await initDb()
  createApp().listen(config.port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${config.port}`)
  })
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})
