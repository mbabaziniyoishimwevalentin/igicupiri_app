import { query } from '../config/db';

async function main() {
  try {
    // Add downloads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS downloads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, paper_id)
      );
    `);

    // Add bookmarks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, paper_id)
      );
    `);

    console.log('Database updated with student tables');
  } catch (error) {
    console.error('Error updating database:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});