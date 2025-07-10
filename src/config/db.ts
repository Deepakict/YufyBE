import knex from 'knex';
import * as dotenv from 'dotenv';
dotenv.config();

const db = knex({
  client: 'mssql',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    }
  }
});

export default db;