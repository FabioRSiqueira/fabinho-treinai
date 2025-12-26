import React from 'react';
import { Student, View } from '../types';
import { supabase } from '../services/supabase';

interface DashboardProps {
  onNavigate: (view: View, studentId?: string) => void;
  students: Student[];
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, students }) => {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erro ao deslogar:", err);
      window.location.href = '/'; 
    }
  };

  const STUDENT_LIMIT = 5;
  const usagePercentage = Math.min((students.length / STUDENT_LIMIT) * 100, 100);

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              className="bg-center bg-no-repeat bg-cover rounded-2xl size-11 border-2 border-primary shadow-lg shadow-primary/10" 
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=150")' }}
            />
            <div className="absolute -bottom-1 -right-1 size-3.5 bg-primary rounded-full border-2 border-white dark:border-background-dark"></div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none dark:text-white">TreinAí</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mt-0.5">Módulo Treinador</p>
          </div>
        </div>
        <button onClick={handleLogout} className="size-11 flex items-center justify-center text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-surface-dark rounded-2xl transition-all active:scale-90">
          <span className="material-symbols-outlined text-[22px]">logout</span>
        </button>
      </header>

      <main className="flex flex-col gap-6 p-6">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#111816] to-[#1a2e28] text-white p-8 shadow-2xl">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-primary text-[10px] font-black uppercase tracking-[0.25em] mb-2 opacity-80">Plano Profissional</p>
                <h2 className="text-4xl font-black leading-none tracking-tighter">Sua<br/>Base</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex flex-col items-center">
                <span className="text-xs font-black leading-none">{students.length}</span>
                <span className="text-[8px] font-black uppercase opacity-60 tracking-widest mt-1">Alunos</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(17,212,147,0.3)] ${usagePercentage >= 100 ? 'bg-orange-500' : 'bg-primary'}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Capacidade do Plano</p>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest">
                  {usagePercentage >= 100 ? '⚠️ Limite Atingido' : `${STUDENT_LIMIT - students.length} vagas livres`}
                </p>
              </div>
            </div>
          </div>
          <span className="absolute -right-8 -bottom-8 material-symbols-outlined text-[160px] text-primary/5 font-bold rotate-12 select-none pointer-events-none">fitness_center</span>
        </div>

        <section className="grid grid-cols-3 gap-4">
          <button 
            onClick={() => onNavigate('add-student')}
            className={`flex flex-col items-center justify-center p-5 bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:-translate-y-1 active:scale-95 group ${students.length >= STUDENT_LIMIT ? 'opacity-40 grayscale pointer-events-none' : ''}`}
          >
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:bg-primary group-hover:text-[#10221c] transition-colors">
              <span className="material-symbols-outlined text-[24px] filled">person_add</span>
            </div>
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">Cadastro</span>
          </button>
          
          <button 
            onClick={() => onNavigate('students')}
            className="flex flex-col items-center justify-center p-5 bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:-translate-y-1 active:scale-95 group"
          >
            <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px] filled">exercise</span>
            </div>
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">Treinos</span>
          </button>

          <button 
            onClick={() => onNavigate('students')}
            className="flex flex-col items-center justify-center p-5 bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:-translate-y-1 active:scale-95 group"
          >
            <div className="size-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-3 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px] filled">restaurant</span>
            </div>
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest text-center">Dietas</span>
          </button>
        </section>

        {students.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Atividade Recente</h3>
              <button onClick={() => onNavigate('students')} className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/5 px-3 py-1.5 rounded-full">Ver todos</button>
            </div>
            <div className="flex flex-col gap-3">
              {students.slice(0, 4).map(student => (
                <div 
                  key={student.id} 
                  onClick={() => onNavigate('student-detail', student.id)}
                  className="group flex items-center justify-between p-5 bg-white dark:bg-surface-dark rounded-[28px] shadow-sm border border-transparent dark:border-gray-800/50 hover:border-primary/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl bg-gray-200 bg-center bg-cover shadow-inner ring-2 ring-white dark:ring-gray-800" style={{ backgroundImage: `url(${student.avatar})` }} />
                    <div>
                      <p className="font-bold text-[15px] tracking-tight text-[#111816] dark:text-white leading-tight">{student.name}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-wider mt-0.5">{student.goal}</p>
                    </div>
                  </div>
                  <div className="size-10 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-300 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800 flex justify-around items-center h-22 px-4 pb-8 pt-3 z-50">
        <button onClick={() => onNavigate('dashboard')} className="flex flex-col items-center gap-1.5 text-primary w-full group">
          <span className="material-symbols-outlined text-[24px] filled">grid_view</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Painel</span>
        </button>
        <button onClick={() => onNavigate('students')} className="flex flex-col items-center gap-1.5 text-gray-300 w-full group">
          <span className="material-symbols-outlined text-[24px]">group</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Alunos</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-gray-300 w-full group opacity-40">
          <span className="material-symbols-outlined text-[24px]">insights</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Relatórios</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 text-gray-300 w-full group opacity-40">
          <span className="material-symbols-outlined text-[24px]">settings</span>
          <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;