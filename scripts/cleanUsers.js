const mongoose = require('mongoose');
require('dotenv').config();

async function cleanUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/authx';
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);

  const User = require('../src/models/User');
  const Session = require('../src/models/Session');

  const keepEmail = 'sailokeshnalabothu@gmail.com';

  // Find all other users
  const usersToDelete = await User.find({ email: { $ne: keepEmail } });
  const idsToDelete = usersToDelete.map(u => u._id);
  const emailsToDelete = usersToDelete.map(u => u.email);

  console.log(`Found ${usersToDelete.length} user(s) to remove:`, emailsToDelete);

  // Delete sessions for those users
  const sessionDeleteRes = await Session.deleteMany({ userId: { $in: idsToDelete } });
  
  // Delete users
  const userDeleteRes = await User.deleteMany({ email: { $ne: keepEmail } });

  // Update target user to ensure clean state
  const targetUser = await User.findOneAndUpdate(
    { email: keepEmail },
    {
      $set: {
        isLocked: false,
        lockUntil: null,
        lockReason: null,
        loginAttempts: 0,
        isVerified: true,
        role: 'admin'
      }
    },
    { new: true }
  );

  console.log(`✅ Deleted ${userDeleteRes.deletedCount} user(s) successfully.`);
  console.log(`✅ Deleted ${sessionDeleteRes.deletedCount} related session(s).`);
  
  if (targetUser) {
    console.log('✅ Retained user in database:');
    console.log(JSON.stringify({
      id: targetUser._id,
      email: targetUser.email,
      role: targetUser.role,
      isVerified: targetUser.isVerified,
      isLocked: targetUser.isLocked
    }, null, 2));
  } else {
    console.log('⚠️ Target user was not found, please check the email address.');
  }

  const allRemaining = await User.find({}, 'email role isVerified isLocked');
  console.log('\nAll users currently in database:');
  console.log(JSON.stringify(allRemaining, null, 2));

  await mongoose.disconnect();
}

cleanUsers().catch(err => {
  console.error('Error cleaning users:', err);
  process.exit(1);
});
