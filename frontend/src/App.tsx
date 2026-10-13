import { useEffect, useState } from 'react';
import { AuthCard } from './components/AuthCard';
import { TaskDashboard } from './components/TaskDashboard';
import { ApiError, authApi } from './services/api';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then(({ user }) => setUser(user)).catch((error) => {
      if (!(error instanceof ApiError) || error.status !== 401) console.error(error);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="splash"><span className="brand-mark">T</span><p>Carregando TaskFlow...</p></div>;
  return user ? <TaskDashboard user={user} onLogout={() => setUser(null)} /> : <AuthCard onAuthenticated={setUser} />;
}
