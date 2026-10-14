import type { ProductivitySummary } from '../types';

type ProgressSnapshot = Pick<ProductivitySummary, 'totalPoints' | 'level' | 'weekStart' | 'weeklyGoal' | 'weeklyPoints'>;

export function productivityMilestone(previous: ProgressSnapshot, next: ProgressSnapshot): string | null {
  if (next.totalPoints <= previous.totalPoints) return null;

  const achievements: string[] = [];
  if (next.level > previous.level) achievements.push(`Nível ${next.level} desbloqueado!`);
  if (next.weekStart === previous.weekStart && next.weeklyGoal === previous.weeklyGoal &&
    previous.weeklyPoints < previous.weeklyGoal && next.weeklyPoints >= next.weeklyGoal) {
    achievements.push('Meta semanal alcançada!');
  }
  return achievements.length > 0 ? achievements.join(' ') : null;
}
