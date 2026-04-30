import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(str) {
  if (!str) return false;
  const d = new Date(str);
  d.setHours(23, 59, 59);
  return d < new Date();
}

const STATUSES = [
  { key: 'todo', label: 'To do', badge: 'badge badge-todo' },
  { key: 'in_progress', label: 'In progress', badge: 'badge badge-in-progress' },
  { key: 'done', label: 'Done', badge: 'badge badge-done' },
];

const DOT_CLS = { high: 'dot dot-high', medium: 'dot dot-medium', low: 'dot dot-low' };
const P_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

function PlusIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 15, height: 15 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TaskCard({ task, members, isAdmin, currentUserId, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    assigned_to: task.assigned_to ? String(task.assigned_to) : '',
    due_date: task.due_date ? task.due_date.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);

  const canEdit = isAdmin || task.created_by === currentUserId || task.assigned_to === currentUserId;
  const overdue = isOverdue(task.due_date) && task.status !== 'done';

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put(`/projects/${task.project_id}/tasks/${task.id}`, {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
      });
      onUpdate(data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus() {
    const next = task.status === 'done' ? 'todo' : task.status === 'in_progress' ? 'done' : 'in_progress';
    try {
      const { data } = await api.put(`/projects/${task.project_id}/tasks/${task.id}`, { status: next });
      onUpdate(data);
    } catch {}
  }

  if (editing) {
    return (
      <div className="task-edit-form">
        <div className="form-group">
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details…" rows={2} />
        </div>
        <div className="form-row">
          <div>
            <label>Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label>Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label>Assigned to</label>
            <select className="input" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label>Due date</label>
            <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
        </div>
        <div className="task-edit-actions">
          <button onClick={() => setEditing(false)} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          {(isAdmin || task.created_by === currentUserId) && (
            <button onClick={() => { setEditing(false); onDelete(task.id); }} className="btn btn-danger-ghost ml-auto">Delete</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`task-card${overdue ? ' overdue' : ''}`}>
      <div className="task-card-inner">
        <button
          className={`task-check${task.status === 'done' ? ' checked' : task.status === 'in_progress' ? ' in-progress' : ''}`}
          onClick={quickStatus}
          aria-label="Toggle status"
        />
        <div className="task-content">
          <p className={`task-title${task.status === 'done' ? ' done' : ''}`}>{task.title}</p>
          {task.description && <p className="task-desc">{task.description}</p>}
          <div className="task-meta">
            <span className={`task-meta-item`}>
              <span className={DOT_CLS[task.priority]} />
              {P_LABELS[task.priority]}
            </span>
            {task.assigned_to_name && (
              <span className="task-meta-item">→ {task.assigned_to_name}</span>
            )}
            {task.due_date && (
              <span className={`task-meta-item${overdue ? ' overdue' : ''}`}>
                {overdue ? 'overdue · ' : ''}{fmtDate(task.due_date)}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <button className="task-edit-btn" onClick={() => setEditing(true)} aria-label="Edit task">
            <EditIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [statusFilter, setStatusFilter] = useState('');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', status: 'todo' });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([api.get(`/projects/${id}`), api.get(`/projects/${id}/tasks`)]);
      setProject(pRes.data);
      setTasks(tRes.data);
    } catch {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = project?.role === 'admin';

  async function createTask(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post(`/projects/${id}/tasks`, {
        ...taskForm,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null,
      });
      setTasks(t => [data, ...t]);
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '', status: 'todo' });
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post(`/projects/${id}/members`, { email: memberEmail, role: memberRole });
      setProject(p => ({ ...p, members: [...p.members, data] }));
      setShowMemberModal(false);
      setMemberEmail('');
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject(p => ({ ...p, members: p.members.filter(m => m.id !== userId) }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  }

  async function changeRole(userId, role) {
    try {
      await api.put(`/projects/${id}/members/${userId}/role`, { role });
      setProject(p => ({ ...p, members: p.members.map(m => m.id === userId ? { ...m, role } : m) }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to change role');
    }
  }

  async function deleteProject() {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete project');
    }
  }

  function updateTask(updated) {
    setTasks(t => t.map(x => x.id === updated.id ? updated : x));
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks(t => t.filter(x => x.id !== taskId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  }

  const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks;
  const byStatus = {
    todo: filtered.filter(t => t.status === 'todo'),
    in_progress: filtered.filter(t => t.status === 'in_progress'),
    done: filtered.filter(t => t.status === 'done'),
  };

  if (loading) return <div className="centered-spinner"><div className="spinner" /></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <button className="breadcrumb-btn" onClick={() => navigate('/projects')}>Projects</button>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{project.name}</span>
          </div>
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => { setShowTaskModal(true); setFormError(''); }} className="btn btn-primary">
            <PlusIcon /> Add task
          </button>
          {isAdmin && (
            <button onClick={deleteProject} className="btn btn-danger-ghost">Delete</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'tasks' ? ' active' : ''}`} onClick={() => setTab('tasks')}>Tasks</button>
        <button className={`tab-btn${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>
          Members ({project.members?.length ?? 0})
        </button>
      </div>

      {/* Tasks tab */}
      {tab === 'tasks' && (
        <>
          <div className="filter-bar">
            <span className="filter-count">{tasks.length} total</span>
            {['', 'todo', 'in_progress', 'done'].map(s => (
              <button
                key={s}
                className={`filter-btn${statusFilter === s ? ' active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === '' ? 'All' : s === 'todo' ? 'To do' : s === 'in_progress' ? 'In progress' : 'Done'}
              </button>
            ))}
          </div>

          <div className="kanban">
            {STATUSES.map(({ key, label, badge }) => (
              <div key={key}>
                <div className="kanban-col-header">
                  <span className={badge}>{label}</span>
                  <span className="kanban-col-count">{byStatus[key].length}</span>
                </div>
                <div className="task-list">
                  {byStatus[key].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      members={project.members || []}
                      isAdmin={isAdmin}
                      currentUserId={user.id}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                    />
                  ))}
                  {byStatus[key].length === 0 && (
                    <div className="task-empty">Nothing here</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div>
          {isAdmin && (
            <div style={{ marginBottom: '1rem' }}>
              <button onClick={() => { setShowMemberModal(true); setFormError(''); }} className="btn btn-outline">
                + Invite member
              </button>
            </div>
          )}
          <div className="card-list">
            {project.members?.map(m => (
              <div key={m.id} className="member-row">
                <div className="avatar avatar-md">{m.name[0].toUpperCase()}</div>
                <div className="member-info">
                  <div className="member-name-row">
                    {m.name}
                    {m.id === user.id && <span className="you-label">(you)</span>}
                  </div>
                  <div className="member-email">{m.email}</div>
                </div>
                {isAdmin ? (
                  <select
                    className="input"
                    style={{ width: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    value={m.role}
                    onChange={e => changeRole(m.id, e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                ) : (
                  <span className={`badge ${m.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>{m.role}</span>
                )}
                {isAdmin && m.id !== user.id && (
                  <button onClick={() => removeMember(m.id)} className="btn btn-danger-ghost" style={{ padding: '0.25rem' }}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create task modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTaskModal(false)}>
          <div className="modal">
            <p className="modal-title">New task</p>
            <form onSubmit={createTask}>
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="form-group">
                <input
                  className="input"
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What needs to get done?"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <textarea
                  className="input"
                  value={taskForm.description}
                  onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any details? (optional)"
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div>
                  <label>Priority</label>
                  <select className="input" value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select className="input" value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label>Assign to</label>
                  <select className="input" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    <option value="">No one</option>
                    {project.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Due date</label>
                  <input type="date" className="input" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Adding…' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite member modal */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowMemberModal(false)}>
          <div className="modal modal-sm">
            <p className="modal-title">Invite someone</p>
            <form onSubmit={addMember}>
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="form-group">
                <label>Their email</label>
                <input
                  type="email"
                  className="input"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  required
                  autoFocus
                />
                <p className="form-hint">They need an account already</p>
              </div>
              <div className="form-group">
                <label>Role</label>
                <div className="role-toggle">
                  {['member', 'admin'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMemberRole(r)}
                      className={`role-option${memberRole === r ? ' selected' : ''}`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="form-hint">
                  {memberRole === 'admin' ? 'Admins can manage members and delete the project' : 'Members can create and update tasks'}
                </p>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => { setShowMemberModal(false); setMemberEmail(''); }} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Inviting…' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
