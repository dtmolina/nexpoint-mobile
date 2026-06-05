import { useDispatch, useSelector } from 'react-redux';
import { login, logout, clearError, selectBusiness } from '../store/authSlice';

// Thin wrapper around the auth slice so screens don't reach into redux directly.
export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, business, isLoading, error, bootstrapped } = useSelector((s) => s.auth);

  return {
    user,
    token,
    business,
    isLoading,
    error,
    bootstrapped,
    isAuthenticated: !!token,
    isSuperAdmin: user?.role === 'super_admin',
    signIn: (credentials) => dispatch(login(credentials)),
    signOut: () => dispatch(logout()),
    selectBusiness: (biz) => dispatch(selectBusiness(biz)),
    dismissError: () => dispatch(clearError()),
  };
}
