
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

const supabaseUrl = 'https://rdwgeefswosgarjeswtb.supabase.co';
const supabaseAnonKey = 'sb_publishable_F9hHilt821FYYmBOagk-yQ_eNhx3WY2';

interface AddStudentProps {
  onBack: () => void;
  onSuccess: () => void;
  studentCount?: number;
}

const AddStudent: React.FC<AddStudentProps> = ({ onBack, onSuccess, studentCount = 0 }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    goal: 'Hipertrofia',
    weight: '',
    height: ''
  });
  const [error, setError] = useState<string | null>(null);

  const STUDENT_LIMIT = 5;
  const isLimitReached = studentCount >= STUDENT_LIMIT;

  // Link do WhatsApp Atualizado (Seu número: 19 99110-9852)
  const WHATSAPP_NUMBER = "5519991109852"; 
  const WHATSAPP_MESSAGE = encodeURIComponent("Olá! Gostaria de fazer o upgrade do meu plano TreinAí para alunos ilimitados via PIX.");
  const upgradeLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

  const getErrorMessage = (err: any): string => {
    if (!err) return "Erro desconhecido";
    console.error("Erro detectado no cadastro:", err);
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return "Erro técnico ao cadastrar";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      setError("Seu plano atual atingiu o limite de 5 alunos.");
      return;
    }

    setLoading(true);
    setError(null);

    // Validação de correspondência de senha
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    try {
      const { data: { session: trainerSession } } = await supabase.auth.getSession();
      if (!trainerSession) throw new Error("Sessão expirada. Entre novamente.");

      const trainerId = trainerSession.user.id;
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { full_name: formData.name, role: 'student' } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("E-mail inválido ou em uso.");

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: formData.name,
          role: 'student',
          trainer_id: trainerId,
          goal: formData.goal,
          weight: parseFloat(formData.weight) || null,
          height: parseFloat(formData.height) || null
        });

      if (profileError) throw profileError;
      onSuccess();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      <header className="sticky top-0 z-50 flex items-center bg-white dark:bg-surface-dark p-4 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="ml-2 text-lg font-bold">Cadastro de Aluno</h2>
      </header>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[#111816] dark:text-white">Novo Aluno</h1>
          {isLimitReached ? (
            <div className="mt-4 p-6 bg-orange-500/10 border-2 border-dashed border-orange-500/30 rounded-[32px] text-center">
              <span className="material-symbols-outlined text-orange-500 text-4xl mb-3">lock_person</span>
              <p className="text-orange-600 dark:text-orange-400 text-sm font-black leading-tight mb-4">
                VOCÊ ATINGIU O LIMITE DE 5 ALUNOS!
              </p>
              <p className="text-gray-500 text-xs mb-6">
                Para cadastrar mais alunos e ter acesso ilimitado a IA, faça o upgrade para o Plano Pro agora.
              </p>
              <a 
                href={upgradeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-primary h-14 rounded-2xl text-[#10221c] font-black text-sm shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">payments</span>
                LIBERAR ILIMITADO VIA PIX
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Você tem {STUDENT_LIMIT - studentCount} vagas restantes no plano atual.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className={`space-y-6 ${isLimitReached ? 'opacity-20 pointer-events-none' : ''}`}>
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs border border-red-100 animate-shake">
              <p className="font-bold mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                ATENÇÃO
              </p>
              <p>{error}</p>
            </div>
          )}

          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-gray-400 px-1 tracking-widest">Acesso</h3>
            <div className="space-y-3">
              <input required type="email" className="w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 focus:ring-2 focus:ring-primary shadow-sm" placeholder="E-mail do Aluno" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <div className="relative">
                <input required type={showPassword ? "text" : "password"} className="w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 focus:ring-2 focus:ring-primary shadow-sm" placeholder="Senha" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                className="w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 focus:ring-2 focus:ring-primary shadow-sm" 
                placeholder="Confirmar Senha" 
                value={formData.confirmPassword} 
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[11px] font-black uppercase text-gray-400 px-1 tracking-widest">Perfil</h3>
            <div className="space-y-3">
              <input required className="w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 focus:ring-2 focus:ring-primary shadow-sm" placeholder="Nome Completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.1" className="w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 focus:ring-2 focus:ring-primary shadow-sm" placeholder="Peso (kg)" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                <input type="number" step="0.01" className="w-full h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark px-4 focus:ring-2 focus:ring-primary shadow-sm" placeholder="Altura (m)" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
              </div>
            </div>
          </section>

          <button 
            type="submit" 
            disabled={loading || isLimitReached} 
            className="w-full bg-primary h-16 rounded-2xl text-[#10221c] font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
          >
            {loading ? <div className="size-6 border-3 border-[#10221c] border-t-transparent rounded-full animate-spin"></div> : "Concluir Cadastro"}
          </button>
        </form>

        {isLimitReached && (
          <button 
            onClick={onBack}
            className="w-full h-14 mt-4 text-primary font-black text-xs uppercase tracking-widest"
          >
            Voltar ao Início
          </button>
        )}
      </div>
    </div>
  );
};

export default AddStudent;
