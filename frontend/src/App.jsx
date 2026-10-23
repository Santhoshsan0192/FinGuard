import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import finguardApi from './api/finguardApi';

// Analyst Pages
import AnalystDashboard from './pages/analyst/AnalystDashboard';
import AlertsQueue from './pages/analyst/AlertsQueue';
import AlertDetail from './pages/analyst/AlertDetail';
import CustomersList from './pages/analyst/CustomersList';
import CustomerProfile from './pages/analyst/CustomerProfile';
import ShadowDashboard from './pages/analyst/ShadowDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersList from './pages/admin/UsersList';
import BatchesList from './pages/admin/BatchesList';
import DatasetsList from './pages/admin/DatasetsList';

function MainLayout({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastBatchTime, setLastBatchTime] = useState(null);
  const { user } = useAuth();

  const fetchStatus = async () => {
    if (!user) return;
    try {
      const summary = await finguardApi.getDashboardSummary();
      setLastBatchTime(summary?.batchInfo?.completedAt || summary?.batchInfo?.startedAt || summary?.batchInfo?.lastRun);
    } catch (e) {
      console.warn('Status check warning:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [refreshKey, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Clone children to pass refreshKey
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { key: refreshKey });
    }
    return child;
  });

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar onRefresh={handleRefresh} refreshing={refreshing} lastBatchTime={lastBatchTime} />
      <main className="flex-1 pb-16">
        {childrenWithProps}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<Navigate to="/analyst" replace />} />
          
          {/* Analyst Routes */}
          <Route path="/analyst/*" element={
            <ProtectedRoute allowedRoles={['ANALYST', 'ADMIN']}>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<AnalystDashboard />} />
                  <Route path="alerts" element={<AlertsQueue />} />
                  <Route path="alerts/:id" element={<AlertDetail />} />
                  <Route path="customers" element={<CustomersList />} />
                  <Route path="customers/:id" element={<CustomerProfile />} />
                  <Route path="shadow" element={<ShadowDashboard />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="users" element={<UsersList />} />
                  <Route path="batches" element={<BatchesList />} />
                  <Route path="datasets" element={<DatasetsList />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
