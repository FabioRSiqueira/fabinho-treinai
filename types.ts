
export type UserRole = 'trainer' | 'student';
export type View = 'login' | 'dashboard' | 'student-dashboard' | 'students' | 'student-detail' | 'create-workout' | 'create-meal' | 'add-student' | 'chat';

export interface Student {
  id: string;
  name: string;
  avatar: string;
  status: 'active' | 'inactive' | 'new';
  lastActivity: string;
  age: number;
  goal: string;
  weight: number;
  height: number;
  adherence: number;
  email?: string;
  trainer_id?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  sets: number;
  reps: string;
  weight: number;
  rest: number;
  image?: string;
  videoUrl?: string; // Novo campo para vídeo
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  calories: number;
  icon: string;
  foods: Array<{
    name: string;
    amount: string;
    calories: number;
  }>;
}
