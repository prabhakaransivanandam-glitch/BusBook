import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../server/package.json'));
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(here, '../server/.env') });

const mongoose = require('mongoose');
const { connectDB } = await import('../server/src/config/db.js');
const User = (await import('../server/src/models/User.js')).default;
const { hashPassword } = await import('../server/src/utils/passwords.js');

const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@123';
const name = process.argv[4] || process.env.ADMIN_NAME || 'BusBook Admin';

async function main() {
  await connectDB();

  let user = await User.findOne({ email });
  if (user) {
    user.name = name;
    user.role = 'admin';
    user.active = true;
    user.password = hashPassword(password);
    await user.save();
  } else {
    const uid = new mongoose.Types.ObjectId().toString();
    user = await User.create({
      _id: new mongoose.Types.ObjectId(uid),
      firebaseUid: uid,
      name,
      email,
      password: hashPassword(password),
      role: 'admin',
      active: true,
    });
  }

  console.log(`[BusBook] Admin ready: ${email}`);
  console.log(`[BusBook] Password: ${password}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[BusBook] createAdmin failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
