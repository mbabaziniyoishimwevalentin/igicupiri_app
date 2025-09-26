import bcrypt from 'bcryptjs';
import { query } from '../config/db';

async function main() {
  try {
    // Sample users for testing
    const users = [
      {
        fullName: 'Dr. Jane Smith',
        email: 'jane.smith@igicupuri.edu',
        password: 'lecturer123',
        role: 'lecturer'
      },
      {
        fullName: 'John Doe',
        email: 'john.doe@student.igicupuri.edu',
        password: 'student123',
        role: 'student',
        studentId: 'STU001'
      }
    ];

    for (const user of users) {
      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE email = ?', [user.email]);
      
      if (existing.rows.length > 0) {
        console.log(`User ${user.email} already exists`);
        continue;
      }

      // Create user
      const passwordHash = await bcrypt.hash(user.password, 10);
      await query(
        'INSERT INTO users (full_name, email, password_hash, role, student_id) VALUES (?, ?, ?, ?, ?)',
        [user.fullName, user.email, passwordHash, user.role, user.studentId || null]
      );

      console.log(`User ${user.email} created successfully`);
    }

    console.log('Sample users created successfully');
  } catch (error) {
    console.error('Error creating sample users:', error);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
