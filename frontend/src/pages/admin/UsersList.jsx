import React, { useState, useEffect } from 'react';
import { Users, Shield, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import finguardApi from '../../api/finguardApi';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await finguardApi.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve users from backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        setError('');
        const data = await finguardApi.getUsers();
        if (isMounted) setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load users:', err);
        if (isMounted) setError(err?.response?.data?.message || 'Failed to retrieve users from backend API.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadInitial();
    return () => { isMounted = false; };
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      setActionLoading(user.userId);
      const newStatus = !user.active;
      const updated = await finguardApi.updateUserStatus(user.userId, newStatus);
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, active: updated.active } : u));
      setActionSuccess(`User ${user.username} is now ${newStatus ? 'Active' : 'Disabled'}.`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err?.response?.data?.message || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (user) => {
    try {
      setActionLoading(user.userId);
      const newRole = user.role === 'ROLE_ADMIN' ? 'ROLE_ANALYST' : 'ROLE_ADMIN';
      const updated = await finguardApi.updateUserRole(user.userId, newRole);
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, role: updated.role } : u));
      setActionSuccess(`User ${user.username} role updated to ${updated.role}.`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err?.response?.data?.message || 'Failed to change user role.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-white">User Management</h1>
              <p className="text-xs text-slate-400">
                Manage system access, analyst permissions, and RBAC accounts via MongoDB.
              </p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {actionSuccess && (
          <div className="mb-4 flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center justify-between p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchUsers} className="underline hover:text-rose-300 ml-2">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Fetching users from backend...</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 bg-slate-900/50">
                {users.map((u) => {
                  const isAdmin = (u.role || '').toUpperCase().includes('ADMIN');
                  const isBusy = actionLoading === u.userId;
                  return (
                    <tr key={u.userId || u.username} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-white flex items-center">
                        {isAdmin ? (
                          <Shield className="w-3.5 h-3.5 mr-2 text-rose-400" />
                        ) : (
                          <Users className="w-3.5 h-3.5 mr-2 text-indigo-400" />
                        )}
                        <span className="font-mono text-sm">{u.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                          isAdmin ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {u.role || 'ROLE_ANALYST'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.active ? (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-500/15 text-zinc-400 border border-zinc-500/30">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Initial'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={isBusy}
                          className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                        >
                          {isAdmin ? 'Make Analyst' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isBusy}
                          className={`text-xs font-semibold px-2 py-1 rounded border transition ${
                            u.active
                              ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
                              : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                          }`}
                        >
                          {u.active ? 'Disable' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
