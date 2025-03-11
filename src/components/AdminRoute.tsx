import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const AdminRoute = () => {
  const { user, isAdmin, loading } = useAuth();

  console.log('AdminRoute - User:', user?.id); // Debug log
  console.log('AdminRoute - Is Admin:', isAdmin); // Debug log
  console.log('AdminRoute - Loading:', loading); // Debug log

  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('AdminRoute - No user, redirecting to login'); // Debug log
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    console.log('AdminRoute - Not admin, redirecting to dashboard'); // Debug log
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute - Access granted'); // Debug log
  return <Outlet />;
};

export default AdminRoute; 