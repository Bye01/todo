import { createApp } from './app'
import { config } from './config'
import { getDb } from './db'

getDb()

createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`)
})
