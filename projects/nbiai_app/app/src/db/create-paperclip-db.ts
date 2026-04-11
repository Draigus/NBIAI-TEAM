import 'dotenv/config'
import { Pool } from 'pg'

async function main() {
  // Use postgres superuser to create the database
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' })
  // Grant nbiai user CREATEDB for future use
  try { await pool.query('ALTER USER nbiai CREATEDB') } catch { /* ignore */ }
  try {
    await pool.query('CREATE DATABASE paperclip OWNER nbiai')
    console.log('Created paperclip database')
  } catch (e) {
    console.log('Result:', (e as Error).message)
  }
  await pool.end()
}
main()
