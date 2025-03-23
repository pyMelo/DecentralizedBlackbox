import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgres://myuser:mypassword@localhost:5432/iota_blocks",
})

export default pool;  // <-- Aggiunto export default qui
