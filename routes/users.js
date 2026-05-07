const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const roles = require('../roles');

const SALT_ROUNDS = 10;

function approvedQuery() {
  return { $or: [{ approved: true }, { 'approval.status': 'approved' }] };
}

function normalizeSecurityAnswer(value = '') {
  return String(value).replace(/\s+/g, '').toLowerCase();
}

function isBcryptHash(value = '') {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function hashValue(value) {
  return bcrypt.hash(String(value), SALT_ROUNDS);
}

async function compareValue(input, stored) {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(String(input), stored);
  }
  return String(input) === String(stored);
}

async function findAssignedHfLeader({ country, state, city }) {
  if (!country || !state || !city) return null;

  return User.findOne({
    role: roles.HF_LEADER,
    country,
    state,
    city,
    ...approvedQuery()
  })
    .sort({ name: 1 })
    .select('_id name phone');
}

async function assignMemberLeaderFields(user) {
  if (String(user?.role || '') !== roles.MEMBER) return;

  const leader = await findAssignedHfLeader({
    country: user.country,
    state: user.state,
    city: user.city
  });

  if (!leader) {
    user.currentHfLeaderId = undefined;
    user.currentHfLeaderName = '';
    user.currentHfLeaderPhone = '';
    return;
  }

  user.currentHfLeaderId = leader._id;
  user.currentHfLeaderName = leader.name || '';
  user.currentHfLeaderPhone = leader.phone || '';
}

// Example: Register a new user (role-based)
// Register a new user (extended fields)
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      state,
      branch,
      country,
      city,
      phone,
      address,
      branchAddress,
      stateHqAddress,
      securityQuestion,
      securityAnswer
    } = req.body;

    const hashedPassword = await hashValue(password);
    const normalizedAnswer = securityAnswer ? normalizeSecurityAnswer(securityAnswer) : '';
    const hashedSecurityAnswer = normalizedAnswer ? await hashValue(normalizedAnswer) : '';
    const isMember = String(role || '') === roles.MEMBER;

    const now = new Date();
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      state,
      branch,
      country,
      city,
      phone,
      address,
      branchAddress,
      stateHqAddress,
      securityQuestion,
      securityAnswer: hashedSecurityAnswer,
      approved: isMember,
      approval: {
        status: isMember ? 'approved' : 'pending',
        approvedBy: isMember ? 'System' : undefined,
        approvedByRole: isMember ? 'System' : undefined,
        approvedAt: isMember ? now : undefined,
        requestedRole: role,
        appliedAt: now,
        chain: isMember ? [{ by: 'System', role: 'System', at: now, status: 'approved' }] : []
      },
      notifications: [{ message: isMember ? 'Your Member account is active and ready to use.' : 'Your registration is pending approval.' }],
      createdAt: now
    });
    await assignMemberLeaderFields(user);
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.securityAnswer;

    res.status(201).json({
      msg: isMember ? 'Member account created' : 'User registered',
      user: safeUser,
      autoApproved: isMember
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Approve a user (role-based approval chain)
// POST /api/users/approve/:id
// Body: { approverName, approverRole }
router.post('/approve/:id', async (req, res) => {
  try {
    const { approverName, approverRole } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Approval logic based on user.role
    // HF Leader: can be approved by Branch Pastor, State Pastor, Admin
    // Branch Pastor: can be approved by State Pastor, Admin
    // State Pastor: can be approved by Admin only
    const role = user.role;
    const allowed =
      (role === 'HF Leader' && ['Branch Pastor', 'State Pastor', 'Admin'].includes(approverRole)) ||
      (role === 'Branch Pastor' && ['State Pastor', 'Admin'].includes(approverRole)) ||
      (role === 'State Pastor' && approverRole === 'Admin');
    if (!allowed) {
      return res.status(403).json({ msg: 'You are not authorized to approve this user.' });
    }

    user.approved = true;
    user.approval = {
      ...(user.approval || {}),
      approvedBy: approverName,
      approvedByRole: approverRole,
      approvedAt: new Date(),
      status: 'approved',
      chain: [
        ...(user.approval && user.approval.chain ? user.approval.chain : []),
        { by: approverName, role: approverRole, at: new Date(), status: 'approved' }
      ]
    };
    user.notifications.push({ message: `Your registration has been approved by ${approverName} (${approverRole}) on ${new Date().toLocaleDateString()}.` });
    await user.save();
    res.json({ msg: 'User approved', user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Reject a user (role-based rejection)
// POST /api/users/reject/:id
// Body: { approverName, approverRole, reason }
router.post('/reject/:id', async (req, res) => {
  try {
    const { approverName, approverRole, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Same role logic as approval
    const role = user.role;
    const allowed =
      (role === 'HF Leader' && ['Branch Pastor', 'State Pastor', 'Admin'].includes(approverRole)) ||
      (role === 'Branch Pastor' && ['State Pastor', 'Admin'].includes(approverRole)) ||
      (role === 'State Pastor' && approverRole === 'Admin');
    if (!allowed) {
      return res.status(403).json({ msg: 'You are not authorized to reject this user.' });
    }

    user.approved = false;
    user.approval = {
      ...(user.approval || {}),
      approvedBy: approverName,
      approvedByRole: approverRole,
      approvedAt: new Date(),
      status: 'rejected',
      chain: [
        ...(user.approval && user.approval.chain ? user.approval.chain : []),
        { by: approverName, role: approverRole, at: new Date(), status: 'rejected' }
      ]
    };
    user.notifications.push({ message: `Your registration was rejected by ${approverName} (${approverRole}) on ${new Date().toLocaleDateString()}. Reason: ${reason}` });
    await user.save();
    res.json({ msg: 'User rejected', user });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Discover approved HF leaders and branch pastors by location
router.get('/discover', async (req, res) => {
  try {
    const { country, state, city } = req.query;
    if (!country || !state || !city) {
      return res.status(400).json({ msg: 'country, state and city are required.' });
    }

    const locationFilter = { country, state, city };
    const approvedFilter = {
      $or: [{ approved: true }, { 'approval.status': 'approved' }]
    };

    const hfLeaders = await User.find({
      ...locationFilter,
      ...approvedFilter,
      role: 'HF Leader'
    }).select('name phone address country state city');

    const branchPastors = await User.find({
      ...locationFilter,
      ...approvedFilter,
      role: 'Branch Pastor'
    }).select('name branchAddress address country state city');

    res.json({ hfLeaders, branchPastors });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Dashboard stats scoped by role jurisdiction
router.get('/dashboard-stats', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ msg: 'userId is required.' });
    }

    const requester = await User.findById(userId).select('role country state branch city');
    if (!requester) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const role = String(requester.role || '').trim();
    if (!['Admin', 'State Pastor', 'Branch Pastor'].includes(role)) {
      return res.status(403).json({ msg: 'You are not authorized to view dashboard stats.' });
    }

    const approvedFilter = {
      $or: [{ approved: true }, { 'approval.status': 'approved' }]
    };

    const scopeFilter = {};
    if (role === 'State Pastor') {
      if (requester.country) scopeFilter.country = requester.country;
      if (requester.state) scopeFilter.state = requester.state;
    } else if (role === 'Branch Pastor') {
      if (requester.country) scopeFilter.country = requester.country;
      if (requester.state) scopeFilter.state = requester.state;
      if (requester.branch) {
        scopeFilter.branch = requester.branch;
      } else if (requester.city) {
        scopeFilter.city = requester.city;
      }
    }

    const scopedUsers = await User.find({
      ...approvedFilter,
      ...scopeFilter
    }).select('role country weeklyAttendance');

    const totalHfCenters = scopedUsers.filter((item) => item.role === 'HF Leader').length;
    const totalBranches = scopedUsers.filter((item) => item.role === 'Branch Pastor').length;
    const totalHfMembers = scopedUsers.length;
    const totalHfAttendanceForWeek = scopedUsers.reduce((sum, item) => {
      const value = Number(item.weeklyAttendance);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const totalCountries = new Set(
      scopedUsers
        .map((item) => String(item.country || '').trim())
        .filter(Boolean)
    ).size;

    res.json({
      scope: role === 'Admin' ? 'global' : role === 'State Pastor' ? 'state' : 'branch',
      stats: {
        totalHfCenters,
        totalBranches,
        totalHfMembers,
        totalHfAttendanceForWeek,
        totalCountries
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get notifications for a user
router.get('/:id/notifications', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user.notifications);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Mark notification as read
router.post('/:id/notifications/:nid/read', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const notif = user.notifications.id(req.params.nid);
    if (notif) notif.read = true;
    await user.save();
    res.json({ msg: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Password reset (first login)
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.password = await hashValue(newPassword);
    await user.save();
    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/forgot-password/question', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('securityQuestion');
    if (!user || !user.securityQuestion) {
      return res.status(404).json({ msg: 'No security question found for this email' });
    }

    res.json({ securityQuestion: user.securityQuestion });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;
    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({ msg: 'Email, security answer and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.securityQuestion || !user.securityAnswer) {
      return res.status(404).json({ msg: 'User with a security question was not found' });
    }

    const normalizedInputAnswer = normalizeSecurityAnswer(securityAnswer);
    const isAnswerValid = await compareValue(normalizedInputAnswer, user.securityAnswer);
    if (!isAnswerValid) {
      return res.status(401).json({ msg: 'Incorrect security answer' });
    }

    // Migrate legacy plain-text security answers to hashed values after successful verification.
    if (!isBcryptHash(user.securityAnswer)) {
      user.securityAnswer = await hashValue(normalizeSecurityAnswer(user.securityAnswer));
    }

    user.password = await hashValue(newPassword);
    await user.save();
    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const isPasswordValid = await compareValue(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    // Migrate legacy plain-text passwords to hashed values after successful login.
    if (!isBcryptHash(user.password)) {
      user.password = await hashValue(password);
      await user.save();
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.securityAnswer;

    // For demo: return user info (in production, return JWT or session)
    res.json({ msg: 'Login successful', user: safeUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -securityAnswer');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Update user profile (self-service, non-sensitive fields only)
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      country,
      state,
      city,
      branchAddress,
      stateHqAddress,
      themePreference,
      localePreference
    } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (name !== undefined) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (address !== undefined) user.address = String(address).trim();
    if (country !== undefined) user.country = String(country).trim();
    if (state !== undefined) user.state = String(state).trim();
    if (city !== undefined) user.city = String(city).trim();
    if (branchAddress !== undefined) user.branchAddress = String(branchAddress).trim();
    if (stateHqAddress !== undefined) user.stateHqAddress = String(stateHqAddress).trim();
    if (themePreference !== undefined) user.themePreference = String(themePreference).trim() || 'default';
    if (localePreference !== undefined) user.localePreference = String(localePreference).trim() || 'en-US';
    await assignMemberLeaderFields(user);
    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.securityAnswer;
    res.json({ msg: 'Profile updated', user: safeUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Example: Get all users (admin only, placeholder)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
