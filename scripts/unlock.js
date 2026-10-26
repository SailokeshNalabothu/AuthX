require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const targetEmail = process.argv[2];

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/authx';
  console.log(`Connecting to database at ${uri}...`);
  await mongoose.connect(uri);

  let filter = {};
  if (targetEmail) {
    filter = { email: targetEmail.toLowerCase().trim() };
  } else {
    filter = { isLocked: true };
  }

  const result = await User.updateMany(filter, {
    $set: {
      isLocked: false,
      lockUntil: null,
      lockReason: null,
      loginAttempts: 0,
      accountLockToken: null,
      accountLockExpires: null,
      accountUnlockToken: null,
      accountUnlockExpires: null
    }
  });

  if (targetEmail) {
    const user = await User.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!user) {
      console.log(`❌ User with email "${targetEmail}" was not found.`);
    } else {
      console.log(`✅ Successfully unlocked account for: ${user.email} (Role: ${user.role}, isLocked: ${user.isLocked})`);
    }
  } else {
    console.log(`✅ Unlocked ${result.modifiedCount} locked account(s).`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error unlocking account:", err.message);
  process.exit(1);
});
