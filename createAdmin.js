const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { mongoURI } = require('./config');

// Usage:
//   node createAdmin.js <email> <password> <name> [role]
//
// role defaults to 'Admin'. Use 'Super Admin' for the platform owner.
//
// Examples:
//   node createAdmin.js admin@hf.local admin123 "Admin User"
//   node createAdmin.js info@timsmek.com MyPass123 "Timothy Onyebuchi" "Super Admin"

async function createAdmin() {
  const [,, email, password, name, role = 'Admin'] = process.argv;

  if (!email || !password || !name) {
    console.error('Usage: node createAdmin.js <email> <password> <name> [role]');
    console.error('Example: node createAdmin.js info@timsmek.com MyPass123 "Timothy Onyebuchi" "Super Admin"');
    process.exit(1);
  }

  const validRoles = ['Super Admin', 'Admin', 'State Pastor', 'Branch Pastor', 'HF Leader', 'Member'];
  if (!validRoles.includes(role)) {
    console.error(`Invalid role "${role}". Valid roles: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  await mongoose.connect(mongoURI);

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    console.log(`User with email ${email} already exists (role: ${exists.role}).`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({
    name,
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role,
    mustResetPassword: false,
    emailVerificationRequired: false,
    emailVerified: true,
    approved: true,
    approval: {
      status: 'approved',
      approvedBy: 'System',
      approvedByRole: 'System',
      approvedAt: new Date(),
      chain: []
    },
    notifications: [{ message: `${role} account created by system seed script.` }],
    createdAt: new Date()
  });

  console.log(`✔ ${role} account created: ${email}`);
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
