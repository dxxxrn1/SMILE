import bcrypt from 'bcrypt';

const hash = await bcrypt.hash('Admin@Smile2026', 10);
console.log(hash);