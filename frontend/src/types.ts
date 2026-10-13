export type User = { id: string; name: string; email: string };
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskType = 'general' | 'study' | 'meeting' | 'work' | 'habit';
export type TaskDetails = {
  subject: string;
  usefulLinks: string[];
  reviewLinks: string[];
  participants: string;
  meetingLink: string;
  location: string;
  project: string;
  area: string;
  preferredTime: string;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  details: TaskDetails;
  habitDays: number[];
  habitCompletedToday: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TaskInput = Pick<Task, 'title' | 'description' | 'status' | 'type' | 'details' | 'habitDays' | 'dueDate'>;
