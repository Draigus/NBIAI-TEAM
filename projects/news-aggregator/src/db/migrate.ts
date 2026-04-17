import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from './index.js'
await migrate(db, { migrationsFolder: './src/db/migrations' })
await pool.end()
console.log('Migrations complete.')
