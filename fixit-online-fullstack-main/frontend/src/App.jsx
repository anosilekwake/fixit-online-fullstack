// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import FixItOnlineLandingPage from "./FixItOnlineLandingPage";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

// 🔒 Wrapper for protected routes
function PrivateRoute({ children }) {
  const { adminToken } = useAuth();
  const location = useLocation();

  if (!adminToken) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<FixItOnlineLandingPage />} />

      {/* Admin login */}
      <Route path="/admin-login" element={<AdminLogin />} />

      {/* Protected admin dashboard */}
      <Route
        path="/admin/dashboard"
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
