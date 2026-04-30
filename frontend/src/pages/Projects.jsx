import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PlusIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: 15, height: 15 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));
  }, []);

  async function createProject(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/projects', form);
      setProjects(p => [data, ...p]);
      setShowModal(false);
      setForm({ name: '', description: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setError('');
    setForm({ name: '', description: '' });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">All the projects you're part of</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <PlusIcon /> New project
        </button>
      </div>

      {loading ? (
        <div className="centered-spinner"><div className="spinner" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="empty-title">No projects yet</p>
          <p className="empty-subtitle">Create one or ask someone to add you to theirs</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div className="project-card-header">
                <div className="project-icon">{p.name[0].toUpperCase()}</div>
                <div>
                  <div className="project-name">{p.name}</div>
                  <span className={`badge ${p.role === 'admin' ? 'badge-admin' : 'badge-member'}`}>{p.role}</span>
                </div>
              </div>
              {p.description && <p className="project-desc">{p.description}</p>}
              <div className="project-meta">
                <span>{p.task_count} {p.task_count === 1 ? 'task' : 'tasks'}</span>
                <span>{p.member_count} {p.member_count === 1 ? 'member' : 'members'}</span>
                <span style={{ marginLeft: 'auto' }}>{fmtDate(p.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <p className="modal-title">New project</p>
            <form onSubmit={createProject}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="What are we building?"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea
                  className="input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="A quick overview of this project…"
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeModal} className="btn btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
