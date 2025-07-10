require('dotenv').config();

module.exports = {
  development: {
    client: 'mssql',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    },
    migrations: {
      directory: './migrations'
    },
    pool: { min: 2, max: 10 }
  }
};