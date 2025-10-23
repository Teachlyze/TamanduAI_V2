// Re-export from AuthContext
import { useAuth as useAuthContext, AuthProvider } from '@/contexts/AuthContext.jsx';

export { AuthProvider };
export const useAuth = useAuthContext;
export default useAuth;
