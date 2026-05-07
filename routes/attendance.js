const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AttendanceReport = require('../models/AttendanceReport');

function getWeekStart(date = new Date()) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  return current;
}

function buildCenterKey(payload = {}) {
  return [payload.country, payload.state, payload.branch || '', payload.city || '']
    .map((item) => String(item || '').trim())
    .join('|')
    .toLowerCase();
}

function approvedFilter() {
  return { $or: [{ approved: true }, { 'approval.status': 'approved' }] };
}

function buildJurisdictionFilter(user) {
  const role = String(user?.role || '');
  if (role === 'Admin') return {};

  if (role === 'State Pastor') {
    return {
      ...(user.country ? { country: user.country } : {}),
      ...(user.state ? { state: user.state } : {})
    };
  }

  if (role === 'Branch Pastor') {
    const filter = {
      ...(user.country ? { country: user.country } : {}),
      ...(user.state ? { state: user.state } : {})
    };
    if (user.branch) {
      filter.branch = user.branch;
    } else if (user.city) {
      filter.city = user.city;
    }
    return filter;
  }

  return null;
}

router.get('/members', async (req, res) => {
  try {
    const { leaderId } = req.query;
    if (!leaderId) return res.status(400).json({ msg: 'leaderId is required' });

    const leader = await User.findById(leaderId).select('role country state branch city');
    if (!leader) return res.status(404).json({ msg: 'Leader not found' });
    if (leader.role !== 'HF Leader') return res.status(403).json({ msg: 'Only HF Leaders can manage attendance' });

    const members = await User.find({
      ...approvedFilter(),
      role: 'Member',
      currentHfLeaderId: leader._id
    }).select('name email attendanceCredits currentHfLeaderId');

    res.json({ members });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { leaderId, totals, presentMemberIds = [] } = req.body;
    if (!leaderId) return res.status(400).json({ msg: 'leaderId is required' });

    const leader = await User.findById(leaderId).select('name role country state branch city');
    if (!leader) return res.status(404).json({ msg: 'Leader not found' });
    if (leader.role !== 'HF Leader') return res.status(403).json({ msg: 'Only HF Leaders can submit attendance' });

    const weekStart = getWeekStart();
    const existing = await AttendanceReport.findOne({ leaderId: leader._id, weekStart });
    if (existing) {
      return res.status(409).json({ msg: 'Attendance already submitted for this week.' });
    }

    const numericTotals = {
      totalAttendance: Number(totals?.totalAttendance) || 0,
      maleAdults: Number(totals?.maleAdults) || 0,
      femaleAdults: Number(totals?.femaleAdults) || 0,
      children: Number(totals?.children) || 0
    };

    const cleanMemberIds = Array.from(new Set((presentMemberIds || []).map(String).filter(Boolean)));

    const report = new AttendanceReport({
      leaderId: leader._id,
      leaderName: leader.name,
      centerKey: buildCenterKey(leader),
      country: leader.country,
      state: leader.state,
      branch: leader.branch,
      city: leader.city,
      weekStart,
      totals: numericTotals,
      presentMemberIds: cleanMemberIds,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await report.save();

    if (cleanMemberIds.length) {
      await User.updateMany(
        { _id: { $in: cleanMemberIds } },
        {
          $inc: { attendanceCredits: 1 },
          $push: {
            attendanceHistory: {
              weekStart,
              creditedById: leader._id,
              creditedByName: leader.name,
              centerKey: buildCenterKey(leader),
              at: new Date()
            }
          }
        }
      );
    }

    res.status(201).json({ msg: 'Attendance submitted', report });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ msg: 'userId is required' });

    const requester = await User.findById(userId).select('role country state branch city');
    if (!requester) return res.status(404).json({ msg: 'User not found' });

    const jurisdiction = buildJurisdictionFilter(requester);
    if (jurisdiction === null) {
      return res.status(403).json({ msg: 'Not authorized for attendance summary' });
    }

    const weekStart = getWeekStart();
    const reports = await AttendanceReport.find({ weekStart, ...jurisdiction }).select('totals');

    const summary = reports.reduce(
      (acc, report) => {
        acc.totalAttendance += Number(report?.totals?.totalAttendance) || 0;
        acc.maleAdults += Number(report?.totals?.maleAdults) || 0;
        acc.femaleAdults += Number(report?.totals?.femaleAdults) || 0;
        acc.children += Number(report?.totals?.children) || 0;
        return acc;
      },
      { totalAttendance: 0, maleAdults: 0, femaleAdults: 0, children: 0 }
    );

    res.json({ weekStart, summary });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/member-summary', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ msg: 'userId is required' });

    const member = await User.findById(userId).select(
      'name role attendanceCredits attendanceHistory currentHfLeaderId currentHfLeaderName currentHfLeaderPhone'
    );
    if (!member) return res.status(404).json({ msg: 'User not found' });
    if (String(member.role || '') !== 'Member') {
      return res.status(403).json({ msg: 'Only members can view this summary' });
    }

    let leader = null;
    if (member.currentHfLeaderId) {
      leader = await User.findById(member.currentHfLeaderId).select('name phone');
    }

    const totalReports = member.currentHfLeaderId
      ? await AttendanceReport.countDocuments({ leaderId: member.currentHfLeaderId })
      : 0;

    const uniqueWeeks = new Set(
      (member.attendanceHistory || [])
        .map((item) => item?.weekStart ? new Date(item.weekStart).toISOString().slice(0, 10) : '')
        .filter(Boolean)
    );

    const attendanceCount = uniqueWeeks.size;
    const attendancePercentage = totalReports > 0
      ? Number(((attendanceCount / totalReports) * 100).toFixed(1))
      : 0;

    const ticks = (member.attendanceHistory || [])
      .slice()
      .sort((left, right) => new Date(right.at || right.weekStart || 0) - new Date(left.at || left.weekStart || 0))
      .map((item) => ({
        weekStart: item.weekStart,
        creditedByName: item.creditedByName,
        at: item.at
      }));

    res.json({
      member: {
        name: member.name,
        attendanceCredits: Number(member.attendanceCredits || 0),
        attendanceCount,
        attendancePercentage,
        leaderName: leader?.name || member.currentHfLeaderName || '',
        leaderPhone: leader?.phone || member.currentHfLeaderPhone || '',
        ticks
      }
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
