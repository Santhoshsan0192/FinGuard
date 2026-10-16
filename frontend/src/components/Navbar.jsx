import React from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  FileText, 
  Activity, 
  DatabaseZap 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavLinkItem({ to, icon: Icon, children, currentPath }) {
  const isActive = currentPath === to || (to !== '/analyst' && to !== '/admin' && currentPath.startsWith(to));
  return (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        isActive 
          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700' 
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );
}

export default function Navbar({ onRefresh, refreshing }) {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        <div className="flex items-center space-x-6">
          {/* Brand & Platform Identity */}
          <Link to={role === 'ADMIN' ? '/admin' : '/analyst'} className="flex items-center space-x-3 text-zinc-100 group">
            <div className="flex items-center justify-center w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-300 group-hover:bg-zinc-700 transition-colors">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm tracking-tight">FinGuard</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium tracking-wide border bg-zinc-800 text-zinc-300 border-zinc-700">
                  {role === 'ADMIN' ? 'ADMIN' : 'ANALYST'}
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          {role === 'ANALYST' && (
            <nav className="hidden md:flex items-center space-x-1 ml-4 border-l border-zinc-800 pl-4">
              <NavLinkItem to="/analyst" icon={LayoutDashboard} currentPath={location.pathname}>Overview</NavLinkItem>
              <NavLinkItem to="/analyst/alerts" icon={AlertTriangle} currentPath={location.pathname}>Fraud Alerts</NavLinkItem>
              <NavLinkItem to="/analyst/customers" icon={Users} currentPath={location.pathname}>Customers</NavLinkItem>
            </nav>
          )}

          {role === 'ADMIN' && (
            <nav className="hidden md:flex items-center space-x-1 ml-4 border-l border-zinc-800 pl-4">
              <NavLinkItem to="/admin" icon={Activity} currentPath={location.pathname}>System Status</NavLinkItem>
              <NavLinkItem to="/admin/users" icon={Users} currentPath={location.pathname}>Users</NavLinkItem>
              <NavLinkItem to="/admin/batches" icon={DatabaseZap} currentPath={location.pathname}>Batches</NavLinkItem>
              <NavLinkItem to="/admin/datasets" icon={FileText} currentPath={location.pathname}>Datasets</NavLinkItem>
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-xs font-medium text-zinc-300 transition cursor-pointer"
              title="Refresh Dashboard Pipeline Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-zinc-100' : 'text-zinc-400'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-3 border-l border-zinc-800">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-medium text-zinc-200">{user}</div>
              <div className="text-[10px] text-zinc-500">{role === 'ADMIN' ? 'Administrator' : 'Fraud Analyst'}</div>
            </div>
            
            <button
              onClick={logout}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
