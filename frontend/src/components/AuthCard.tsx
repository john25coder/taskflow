import { useState, type FormEvent } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

type Props = { onAuthenticated: (user: User) => void };

export function AuthCard({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(name, email, password);
      onAuthenticated(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="brand"><span className="brand-mark">T</span> TaskFlow</div>
        <p className="eyebrow">ORGANIZAÇÃO SEM ATRITO</p>
        <h1>Seu dia em ordem.<br /><span>Seu foco no que importa.</span></h1>
        <p className="lead">Crie, acompanhe e conclua tarefas em um espaço simples, seguro e pensado para funcionar em qualquer tela.</p>
        <div className="feature-row">
          <span>✓ Fluxo por status</span><span>✓ Filtros rápidos</span><span>✓ Conta protegida</span>
        </div>
      </section>
      <section className="auth-card" aria-label="Acesso ao TaskFlow">
        <p className="eyebrow">BEM-VINDO</p>
        <h2>{mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}</h2>
        <p className="muted">{mode === 'login' ? 'Continue de onde parou.' : 'Comece com uma senha de 8 caracteres, letra e número.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label>}
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
        </form>
        <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}
        </button>
      </section>
    </main>
  );
}
