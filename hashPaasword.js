import bcrypt from 'bcryptjs';

const hash = await bcrypt.hash('Admin@Smile2026', 10);
console.log(hash);