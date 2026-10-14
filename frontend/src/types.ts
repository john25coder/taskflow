export type User = { id: string; name: string; email: string };
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskType = 'general' | 'study' | 'meeting' | 'work' | 'habit';
export type TaskDifficulty = 'low' | 'medium' | 'high';
export type ChecklistItem = { id: string; text: string; completedAt: string | null; createdAt: string };
export type ChecklistInput = { id?: string; text: string };
export type TaskDetails = {
  subject: string;
  usefulLinks: string[];
  reviewLinks: string[];
  participants: string;
  meetingLink: string;
  location: string;
  project: string;
  area: string;
  plannedMinutes: number;
  meetingTime: string;
  agenda: string;
  notes: string;
  preferredTime: string;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  difficulty: TaskDifficulty;
  details: TaskDetails;
  checklist: ChecklistItem[];
  habitDays: number[];
  habitCompletedToday: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'type' | 'difficulty' | 'details' | 'habitDays' | 'dueDate'> & {
  checklist: ChecklistInput[];
};

export type PointEvent = {
  id: string;
  sourceKind: 'task' | 'habit';
  taskType: TaskType;
  title: string;
  points: number;
  occurredOn: string;
};

export type ProductivityMessage = {
  code: 'goal_reached' | 'goal_close' | 'study_momentum' | 'streak' | 'low_difficulty_suggestion' | 'first_step';
  tone: 'success' | 'progress' | 'focus' | 'encouragement';
  title: string;
  body: string;
  taskId?: string;
};

export type ProductivitySummary = {
  totalPoints: number;
  weeklyPoints: number;
  weeklyGoal: number;
  weeklyProgress: number;
  level: number;
  levelProgress: number;
  nextLevelAt: number;
  currentStreak: number;
  weekStart: string;
  weekEnd: string;
  messages: ProductivityMessage[];
  recentEvents: PointEvent[];
};
