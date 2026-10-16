import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await login(username, password);
    
    if (result.success) {
      if (from === '/') {
        navigate(result.role === 'ADMIN' ? '/admin' : '/analyst', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center space-x-3 mb-2 text-zinc-100">
          <div className="flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-md">
            <ShieldCheck className="w-5 h-5 text-zinc-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FinGuard</h1>
        </div>
        <p className="text-zinc-500 text-sm">Secure Analyst Authentication</p>
      </div>

      <div className="bg-[#0d121f] p-8 rounded-lg border border-zinc-800/80 shadow-sm w-full max-w-sm">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-2 rounded-md mb-6 text-sm font-medium">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold py-2 rounded-md transition-colors flex justify-center items-center mt-4 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
          <span>Quick fill:</span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => { setUsername('analyst'); setPassword('analyst123'); setError(''); }}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors"
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('admin123'); setError(''); }}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded transition-colors"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
