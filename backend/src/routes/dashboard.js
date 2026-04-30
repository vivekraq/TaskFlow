const router = require('express').Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');

// pulls everything the user needs for the dashboard in one shot
router.get('/', authenticate, async (req, res) => {
  try {
    const uid = req.user.id;

    // projects this user belongs to
    const projects = await Project.find({ 'members.user': uid }).lean();
    const projectIds = projects.map(p => p._id);
    const projectMap = {};
    projects.forEach(p => {
      const m = p.members.find(m => m.user.toString() === uid);
      projectMap[p._id.toString()] = { name: p.name, role: m?.role };
    });

    // tasks assigned to this user
    const myTasks = await Task.find({ project_id: { $in: projectIds }, assigned_to: uid })
      .populate('assigned_to', 'name')
      .sort([['status', 1], ['due_date', 1], ['created_at', -1]])
      .lean();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const formatted = myTasks.map(t => ({
      id: t._id,
      project_id: t.project_id,
      project_name: projectMap[t.project_id.toString()]?.name || '',
      title: t.title,
      description: t.description,
      assigned_to: t.assigned_to?._id || null,
      assigned_to_name: t.assigned_to?.name || null,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date,
      created_at: t.created_at,
    }));

    // sort: non-done first, then by due date
    formatted.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;
      if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
      if (a.due_date) return -1;
      return 1;
    });

    // overdue tasks across all user's projects
    const overdueTasks = await Task.find({
      project_id: { $in: projectIds },
      due_date: { $lt: now },
      status: { $ne: 'done' },
    }).sort({ due_date: 1 }).lean();

    const overdueFormatted = overdueTasks.map(t => ({
      id: t._id,
      project_id: t.project_id,
      project_name: projectMap[t.project_id.toString()]?.name || '',
      title: t.title,
      priority: t.priority,
      due_date: t.due_date,
      status: t.status,
    }));

    // per-project task stats
    const statsAgg = await Task.aggregate([
      { $match: { project_id: { $in: projectIds } } },
      {
        $group: {
          _id: '$project_id',
          total_tasks: { $sum: 1 },
          done_tasks: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          in_progress_tasks: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          todo_tasks: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          overdue_tasks: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ['$due_date', now] }, { $ne: ['$status', 'done'] }, { $ne: ['$due_date', null] }] },
                1, 0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = {};
    statsAgg.forEach(s => { statsMap[s._id.toString()] = s; });

    const projectStats = projects.map(p => {
      const s = statsMap[p._id.toString()] || {};
      const m = p.members.find(m => m.user.toString() === uid);
      return {
        id: p._id,
        name: p.name,
        role: m?.role || 'member',
        total_tasks: s.total_tasks || 0,
        done_tasks: s.done_tasks || 0,
        in_progress_tasks: s.in_progress_tasks || 0,
        todo_tasks: s.todo_tasks || 0,
        overdue_tasks: s.overdue_tasks || 0,
      };
    });

    const tasks = formatted;
    res.json({
      myTasks: tasks,
      overdueTasks: overdueFormatted,
      projectStats,
      statusSummary: {
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length,
      },
      totalProjects: projects.length,
    });
  } catch (err) {
    console.error('dashboard query failed:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
