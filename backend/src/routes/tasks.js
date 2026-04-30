const router = require('express').Router({ mergeParams: true });
const Task = require('../models/Task');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');
const { requireProjectRole } = require('../middleware/rbac');

const VALID_STATUSES = ['todo', 'in_progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// turn a populated task doc into the shape the frontend expects
function fmt(t) {
  const obj = t.toJSON ? t.toJSON() : t;
  return {
    id: obj._id || obj.id,
    project_id: obj.project_id?._id || obj.project_id,
    title: obj.title,
    description: obj.description || null,
    assigned_to: obj.assigned_to?._id || obj.assigned_to || null,
    assigned_to_name: obj.assigned_to?.name || null,
    assigned_to_email: obj.assigned_to?.email || null,
    created_by: obj.created_by?._id || obj.created_by || null,
    created_by_name: obj.created_by?.name || null,
    status: obj.status,
    priority: obj.priority,
    due_date: obj.due_date || null,
    created_at: obj.created_at,
    updated_at: obj.updated_at,
  };
}

router.get('/', authenticate, requireProjectRole(), async (req, res) => {
  try {
    const pid = req.params.id || req.params.projectId;
    const tasks = await Task.find({ project_id: pid })
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name')
      .sort({ created_at: -1 });
    res.json(tasks.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireProjectRole(), async (req, res) => {
  try {
    const { title, description, assigned_to, status = 'todo', priority = 'medium', due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

    const pid = req.params.id || req.params.projectId;

    // make sure assignee is a project member
    if (assigned_to) {
      const project = await Project.findById(pid);
      const isMember = project.members.some(m => m.user.toString() === assigned_to.toString());
      if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
    }

    let task = await Task.create({
      project_id: pid,
      title: title.trim(),
      description: description || null,
      assigned_to: assigned_to || null,
      status,
      priority,
      due_date: due_date || null,
      created_by: req.user.id,
    });

    task = await task.populate('assigned_to', 'name email');
    task = await task.populate('created_by', 'name');
    res.status(201).json(fmt(task));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// members can only change status on tasks assigned to them, admins/creators can do anything
router.put('/:taskId', authenticate, requireProjectRole(), async (req, res) => {
  try {
    const pid = req.params.id || req.params.projectId;
    const existing = await Task.findOne({ _id: req.params.taskId, project_id: pid });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const isAdmin = req.projectRole === 'admin';
    const isCreator = existing.created_by.toString() === req.user.id;
    const isAssignee = existing.assigned_to?.toString() === req.user.id;

    // assignee-only: can only change status
    if (!isAdmin && !isCreator) {
      if (!isAssignee) return res.status(403).json({ error: 'Insufficient permissions' });
      const { status } = req.body;
      if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      existing.status = status || existing.status;
      await existing.save();
      const populated = await existing.populate('assigned_to', 'name email');
      return res.json(fmt(populated));
    }

    const { title, description, assigned_to, status, priority, due_date } = req.body;
    if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

    if (assigned_to != null && assigned_to) {
      const project = await Project.findById(pid);
      const isMember = project.members.some(m => m.user.toString() === assigned_to.toString());
      if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
    }

    if (title) existing.title = title.trim();
    if (description !== undefined) existing.description = description || null;
    if (assigned_to !== undefined) existing.assigned_to = assigned_to || null;
    if (status) existing.status = status;
    if (priority) existing.priority = priority;
    if (due_date !== undefined) existing.due_date = due_date || null;

    await existing.save();
    await existing.populate('assigned_to', 'name email');
    await existing.populate('created_by', 'name');
    res.json(fmt(existing));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:taskId', authenticate, requireProjectRole(), async (req, res) => {
  try {
    const pid = req.params.id || req.params.projectId;
    const task = await Task.findOne({ _id: req.params.taskId, project_id: pid });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isAdmin = req.projectRole === 'admin';
    const isCreator = task.created_by.toString() === req.user.id;
    if (!isAdmin && !isCreator) return res.status(403).json({ error: 'Insufficient permissions' });

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
