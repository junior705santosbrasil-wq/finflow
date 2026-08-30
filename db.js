const { Pool } = require('pg');

// Conecta ao Postgres usando a variável DATABASE_URL
// (fornecida pelo Neon/Supabase/Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});

module.exports = pool;
