const bcrypt = require('bcryptjs');

async function computeHash() {
  const password = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(`Hashed password for 'admin123' with ${saltRounds} salt rounds: ${hash}`);
}

computeHash();
