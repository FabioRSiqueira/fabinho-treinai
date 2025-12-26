
import React, { useState } from 'react';
import { Student } from '../types';

interface StudentListProps {
  students: Student[];
  onSelectStudent: (id: string) => void;
  onBack: () => void;
  onAddStudent: () => void;
  onRefresh?: () => Promise<void>;
}

const StudentList: React.FC<StudentListProps> = ({ students, onSelectStudent, onBack, onAddStudent, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  const handleManualRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white/90 dark:bg-background-dark/95 backdrop-blur-md px-4 py-3 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Meus Alunos</h1>
        </div>
        <button 
          onClick={handleManualRefresh}
          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${refreshing ? 'animate-spin text-primary' : 'text-gray-400'}`}
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </header>

      <main className="px-4 pt-6 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input 
            className="block w-full h-12 rounded-xl border-0 bg-white dark:bg-surface-dark py-3 pl-11 pr-4 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-primary transition-all"
            placeholder="Buscar aluno..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3">
          {students.length === 0 ? (
            <div className="text-center py-20 px-6 flex flex-col items-center gap-5">
              <div className="size-24 bg-white dark:bg-surface-dark rounded-full flex items-center justify-center shadow-sm text-gray-200">
                <span className="material-symbols-outlined text-6xl">group</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Sua lista está vazia</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-[240px] mx-auto">Se você acabou de cadastrar, tente clicar no botão de recarregar no topo.</p>
              </div>
              <button 
                onClick={onAddStudent}
                className="bg-primary text-[#10221c] font-black h-14 px-8 rounded-2xl shadow-lg flex items-center gap-2"
              >
                <span className="material-symbols-outlined">person_add</span>
                Cadastrar Novo Aluno
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-6 text-gray-500">
              Nenhum resultado para "{search}"
            </div>
          ) : (
            filtered.map(student => (
              <div 
                key={student.id}
                onClick={() => onSelectStudent(student.id)}
                className="group relative flex items-center gap-4 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-transparent dark:border-gray-800 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div 
                  className="size-14 rounded-full bg-gray-100 bg-cover bg-center shadow-inner shrink-0"
                  style={{ backgroundImage: `url(${student.avatar})` }}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <h3 className="text-[16px] font-bold truncate">{student.name}</h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-tight">{student.goal}</p>
                </div>
                <div className="shrink-0 text-gray-300 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <button 
        onClick={onAddStudent}
        className="fixed bottom-[90px] right-5 z-40 flex items-center justify-center size-14 rounded-full bg-primary text-[#10221c] shadow-lg hover:scale-110 transition-all"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </button>
    </div>
  );
};

export default StudentList;
