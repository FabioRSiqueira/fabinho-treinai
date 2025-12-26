
import React, { useState, useEffect } from 'react';
import { View, Student, UserRole } from './types';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import StudentDashboard from './views/StudentDashboard';
import StudentList from './views/StudentList';
import StudentDetail from './views/StudentDetail';
import WorkoutEditor from './views/WorkoutEditor';
import MealPlanEditor from './views/MealPlanEditor';
import AddStudent from './views/AddStudent';
import Chat from './views/Chat';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('login');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

  const fetchStudents = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    try {
      // Filtrar apenas alunos com status 'active'
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('trainer_id', session.user.id)
        .eq('role', 'student')
        .eq('status', 'active') // Filtro adicionado
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      if (data) {
        setStudents(data.map(s => ({
          id: s.id,
          name: s.full_name || 'Aluno',
          avatar: s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name || 'S')}&background=random`,
          status: s.status || 'active', 
          lastActivity: 'Agora', 
          age: 0, 
          goal: s.goal || '', 
          weight: s.weight || 0, 
          height: s.height || 0, 
          adherence: 0
        })));
      }
    } catch (err) {
      console.error("Erro ao buscar alunos:", err);
    }
  };

  const determineRoleAndNavigate = async (session: any) => {
    if (!session?.user) {
      setUserRole(null);
      setStudents([]);
      setSelectedStudentId(null);
      setCurrentView('login');
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', session.user.id).maybeSingle();
      
      // Verificação de Segurança: Bloquear acesso se inativo
      if (profile?.status === 'inactive') {
        await supabase.auth.signOut();
        alert('Esta conta foi desativada pelo treinador.');
        setCurrentView('login');
        setLoading(false);
        return;
      }

      const role = profile?.role || 'student';
      setUserRole(role);
      
      if (role === 'trainer') {
        await fetchStudents();
        setCurrentView('dashboard');
      } else {
        setCurrentView('student-dashboard');
      }
    } catch (err) {
      console.error("Erro na navegação pós-login:", err);
      setCurrentView('login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      determineRoleAndNavigate(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      determineRoleAndNavigate(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateTo = (view: View, id?: string) => {
    if (id !== undefined) setSelectedStudentId(id);
    // Só faz fetch se não for uma volta de exclusão bem sucedida
    if (view === 'students' || view === 'dashboard') {
      fetchStudents();
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  // Função para remover aluno do estado local imediatamente
  const handleDeleteStudentState = (id: string) => {
    // 1. Remove do array local para sumir da tela instantaneamente
    setStudents(prev => prev.filter(s => s.id !== id));
    // 2. Limpa seleção
    setSelectedStudentId(null);
    // 3. Muda a view sem disparar o fetchStudents (que poderia trazer o aluno de volta se o DB for lento)
    setCurrentView('students');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-background-dark text-primary animate-pulse font-black">TREINAÍ...</div>;

  const renderView = () => {
    const student = students.find(s => s.id === selectedStudentId);

    switch (currentView) {
      case 'login': return <Login onLogin={() => {}} />;
      case 'dashboard': return <Dashboard onNavigate={navigateTo} students={students} />;
      case 'student-dashboard': return <StudentDashboard onNavigate={navigateTo} />;
      case 'students': return <StudentList students={students} onSelectStudent={(id) => navigateTo('student-detail', id)} onBack={() => navigateTo('dashboard')} onAddStudent={() => navigateTo('add-student')} onRefresh={fetchStudents} />;
      case 'student-detail': return student ? <StudentDetail student={student} onBack={() => { setSelectedStudentId(null); navigateTo('students'); }} onAction={(a) => navigateTo(a as any, selectedStudentId!)} onDeleteSuccess={handleDeleteStudentState} /> : <Dashboard onNavigate={navigateTo} students={students} />;
      case 'create-workout': return <WorkoutEditor onBack={() => navigateTo('student-detail', selectedStudentId!)} studentId={selectedStudentId} studentName={student?.name} />;
      case 'create-meal': return <MealPlanEditor onBack={() => navigateTo('student-detail', selectedStudentId!)} studentId={selectedStudentId} studentName={student?.name} />;
      case 'add-student': return <AddStudent onBack={() => navigateTo('dashboard')} onSuccess={() => { fetchStudents(); navigateTo('students'); }} studentCount={students.length} />;
      case 'chat': return <Chat onBack={() => navigateTo(userRole === 'trainer' ? 'student-detail' : 'student-dashboard', selectedStudentId!)} studentId={selectedStudentId} studentName={student?.name} />;
      default: return userRole === 'trainer' ? <Dashboard onNavigate={navigateTo} students={students} /> : <StudentDashboard onNavigate={navigateTo} />;
    }
  };

  return <div className="min-h-screen bg-background-light dark:bg-background-dark max-w-md mx-auto shadow-2xl relative">{renderView()}</div>;
};

export default App;
