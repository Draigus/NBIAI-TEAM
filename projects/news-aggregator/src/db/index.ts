import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { loadConfig } from '../config.js'
import * as schema from './schema.js'

const config = loadConfig()
export const pool = new pg.Pool({ connectionString: config.NEWS_DB_URL })
export const db = drizzle(pool, { schema })
export { schema }
