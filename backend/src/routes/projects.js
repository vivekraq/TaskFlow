const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');
const taskRouter = require('./tasks');

router.use('/:id/tasks', (req, res, next) => {
  req.params.projectId = req.params.id;
  next();
}, taskRouter);

// list projects the current user belongs to
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user.id })
      .sort({ created_at: -1 })
      .lean();

    // get task counts in one query
    const projectIds = projects.map(p => p._id);
    const taskCounts = await Task.aggregate([
      { $match: { project_id: { $in: projectIds } } },
      { $group: { _id: '$project_id', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    taskCounts.forEach(tc => { countMap[tc._id.toString()] = tc.count; });

    const result = projects.map(p => {
      const member = p.members.find(m => m.user.toString() === req.user.id);
      return {
        id: p._id,
        name: p.name,
        description: p.description,
        created_by: p.created_by,
        created_at: p.created_at,
        role: member?.role || 'member',
        task_count: countMap[p._id.toString()] || 0,
        member_count: p.members.length,
      };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const project = await Project.create({
      name: name.trim(),
      description: description || null,
      created_by: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }],
    });

    res.status(201).json({
      id: project._id,
      name: project.name,
      description: project.description,
      created_by: project.created_by,
      created_at: project.created_at,
      role: 'admin',
      task_count: 0,
      member_count: 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticate, requireProjectRole(), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email')
      .lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const members = project.members.map(m => ({
      id: m.user._id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joined_at: m.joined_at,
    }));

    res.json({
      id: project._id,
      name: project.name,
      description: project.description,
      created_by: project.created_by,
      created_at: project.created_at,
      role: req.projectRole,
      members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireProjectRole('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description: description || null },
      { new: true }
    );
    res.json({ id: project._id, name: project.name, description: project.description, created_at: project.created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireProjectRole('admin'), async (req, res) => {
  try {
    await Task.deleteMany({ project_id: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// add a member by email
router.post('/:id/members', authenticate, requireProjectRole('admin'), async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

    const project = await Project.findById(req.params.id);
    const already = project.members.find(m => m.user.toString() === user._id.toString());
    if (already) return res.status(400).json({ error: 'User is already a member' });

    const entry = { user: user._id, role, joined_at: new Date() };
    project.members.push(entry);
    await project.save();

    res.status(201).json({ id: user._id, name: user.name, email: user.email, role, joined_at: entry.joined_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/members/:userId/role', authenticate, requireProjectRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const project = await Project.findById(req.params.id);
    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // don't let the last admin demote themselves
    if (req.params.userId === req.user.id && role === 'member') {
      const adminCount = project.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot demote the last admin' });
    }

    member.role = role;
    await project.save();
    res.json({ user: member.user, role: member.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/members/:userId', authenticate, requireProjectRole('admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    if (req.params.userId === req.user.id && member.role === 'admin') {
      const adminCount = project.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
