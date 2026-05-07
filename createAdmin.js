const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { mongoURI } = require('./config');

async function createAdmin() {
  await mongoose.connect(mongoURI);
  const exists = await User.findOne({ email: 'admin@hf.local' });
  if (exists) {
    console.log('Admin user already exists.');
    process.exit(0);
  }
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await User.create({
    name: 'Admin',
    email: 'admin@hf.local',
    password: hashedPassword,
    role: 'Admin',
    approved: true,
    approval: {
      status: 'approved',
      approvedBy: 'System',
      approvedByRole: 'System',
      approvedAt: new Date(),
      chain: []
    },
    notifications: [{ message: 'Admin account created.' }],
    createdAt: new Date()
  });
  console.log('Admin user created: admin@hf.local / admin123');
  process.exit(0);
}

createAdmin();
