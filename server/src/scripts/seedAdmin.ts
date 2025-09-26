import bcrypt from 'bcryptjs';
import { query } from '../config/db';

async function main() {
  try {
    // Check if admin already exists
    const existingAdmin = await query('SELECT id FROM users WHERE email = ?', ['admin@igicupuri.edu']);
    
    if (existingAdmin.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    await query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['System Administrator', 'admin@igicupuri.edu', passwordHash, 'admin']
    );

    console.log('Admin user created successfully');
    console.log('Email: admin@igicupuri.edu');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});