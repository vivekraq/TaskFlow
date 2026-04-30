const Project = require('../models/Project');

const requireProjectRole = (...roles) => async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user.id);
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this project' });
    }
    req.projectRole = member.role;
    if (roles.length && !roles.includes(req.projectRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { requireProjectRole };
