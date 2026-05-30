import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import BuyerDashboard from './pages/BuyerDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import GuestDemo from './pages/GuestDemo';
import EnterprisePage from './pages/EnterprisePage';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
  }

  if (!token) return <Navigate to="/login" />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;

  return children;
};

const Dashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'supplier') return <SupplierDashboard />;
  if (user?.role === 'buyer') return <BuyerDashboard />;
  if (user?.role === 'delivery') return <DeliveryDashboard />;
  if (user?.role === 'admin') return <AdminDashboard />;

  return <div className="p-8 text-gray-500">Unknown role: {user?.role}</div>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/demo" element={<GuestDemo />} />
          <Route path="/enterprise" element={<EnterprisePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/demo" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
