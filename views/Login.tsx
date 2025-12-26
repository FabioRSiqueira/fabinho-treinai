
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          throw new Error("E-mail ou senha incorretos. Entre em contato com seu administrador.");
        }
        throw signInError;
      }
      onLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-screen overflow-hidden bg-background-light dark:bg-background-dark">
      <div className="relative h-[40vh] w-full shrink-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat" 
          style={{ backgroundImage: `url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070")` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-background-light dark:to-background-dark"></div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-5xl font-bold">fitness_center</span>
          </div>
          <h1 className="text-white text-4xl font-black tracking-tighter">TreinAí</h1>
          <p className="text-primary font-bold tracking-[0.2em] uppercase text-[10px] mt-2">Professional Fitness Management</p>
        </div>
      </div>

      <div className="relative -mt-12 flex flex-1 flex-col rounded-t-[40px] bg-background-light dark:bg-background-dark px-8 pt-10 pb-8 z-20">
        <div className="mb-8">
          <h2 className="text-[#111817] dark:text-white text-2xl font-bold">Bem-vindo de volta</h2>
          <p className="text-gray-500 text-sm mt-1">Acesse sua conta para gerenciar seus treinos.</p>
        </div>

        <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
          {error && (
            <div className="p-4 rounded-2xl text-sm font-medium bg-red-50 text-red-600 border border-red-100 flex items-center gap-3 animate-shake">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">E-mail</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
              <input 
                className="w-full rounded-2xl border-0 bg-white dark:bg-surface-dark h-14 pl-12 pr-4 text-base ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 focus:ring-primary transition-all shadow-sm"
                placeholder="seu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Senha</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">lock</span>
              <input 
                className="w-full rounded-2xl border-0 bg-white dark:bg-surface-dark h-14 pl-12 pr-4 text-base ring-1 ring-gray-200 dark:ring-gray-800 focus:ring-2 focus:ring-primary transition-all shadow-sm"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-primary h-14 px-6 text-[#102220] text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="size-5 border-2 border-[#102220] border-t-transparent rounded-full animate-spin"></div>
            ) : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-auto pt-8 text-center">
          <p className="text-gray-400 text-[11px] font-medium uppercase tracking-widest">
            TreinAí v2.0 &copy; 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
