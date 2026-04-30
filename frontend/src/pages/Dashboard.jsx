import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const STATUS_BADGE = {
  todo: 'badge badge-todo',
  in_progress: 'badge badge-in-progress',
  done: 'badge badge-done',
};
const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const DOT = { high: 'dot dot-high', medium: 'dot dot-medium', low: 'dot dot-low' };

function WarnIcon() {
  return (
    <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: 16, height: 16 }}>
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="centered-spinner"><div className="spinner" /></div>;
  }

  const { statusSummary, myTasks = [], overdueTasks = [], totalProjects = 0 } = data || {};

  const stats = [
    { label: 'Projects', value: totalProjects, color: '' },
    { label: 'To do', value: statusSummary?.todo ?? 0, color: 'text-muted' },
    { label: 'In progress', value: statusSummary?.in_progress ?? 0, color: 'text-blue' },
    { label: 'Done', value: statusSummary?.done ?? 0, color: 'text-success' },
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Hey {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's what's going on with your tasks</p>
      </div>

      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {overdueTasks.length > 0 && (
        <div className="overdue-alert">
          <div className="overdue-alert-title">
            <WarnIcon />
            {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'}
          </div>
          {overdueTasks.map(t => (
            <div key={t.id} className="overdue-item">
              <div className="overdue-item-left">
                <span className={DOT[t.priority]} />
                <span style={{ fontSize: '0.875rem' }}>{t.title}</span>
                <Link to={`/projects/${t.project_id}`} className="overdue-link">{t.project_name}</Link>
              </div>
              <span className="overdue-date">due {fmtDate(t.due_date)}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.75rem' }}>
          Your tasks
        </p>
        {myTasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No tasks yet</p>
            <p className="empty-subtitle">Join a project to get started</p>
          </div>
        ) : (
          <div className="card-list">
            {myTasks.map(task => {
              const overdue = isOverdue(task.due_date) && task.status !== 'done';
              return (
                <div key={task.id} className="card-list-item">
                  <span className={DOT[task.priority]} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-faint)' : 'var(--text)' }}>
                      {task.title}
                    </p>
                    <Link to={`/projects/${task.project_id}`} style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      {task.project_name}
                    </Link>
                  </div>
                  <span className={STATUS_BADGE[task.status]}>{STATUS_LABEL[task.status]}</span>
                  {task.due_date && (
                    <span style={{ fontSize: '0.75rem', color: overdue ? '#f87171' : 'var(--text-faint)', flexShrink: 0 }}>
                      {fmtDate(task.due_date)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
