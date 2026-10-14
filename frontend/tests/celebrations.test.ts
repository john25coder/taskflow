import { describe, expect, it } from 'vitest';
import { productivityMilestone } from '../src/utils/celebrations';

const previous = { totalPoints: 90, level: 1, weekStart: '2026-10-12', weeklyGoal: 100, weeklyPoints: 90 };

describe('celebrações de produtividade', () => {
  it('combina subida de nível e meta alcançada na mesma conclusão', () => {
    expect(productivityMilestone(previous, { ...previous, totalPoints: 105, level: 2, weeklyPoints: 105 }))
      .toBe('Nível 2 desbloqueado! Meta semanal alcançada!');
  });

  it('celebra uma meta sem depender da subida de nível', () => {
    const start = { ...previous, weeklyGoal: 50, weeklyPoints: 40, totalPoints: 40 };
    expect(productivityMilestone(start, { ...start, weeklyPoints: 55, totalPoints: 55 })).toBe('Meta semanal alcançada!');
  });

  it('não celebra carregamento, atualização de meta ou perda de pontos', () => {
    expect(productivityMilestone(previous, previous)).toBeNull();
    expect(productivityMilestone(previous, { ...previous, weeklyGoal: 50 })).toBeNull();
    expect(productivityMilestone(previous, { ...previous, totalPoints: 75, weeklyPoints: 75 })).toBeNull();
  });

  it('não repete a meta já alcançada nem compara metas de semanas diferentes', () => {
    const achieved = { ...previous, totalPoints: 110, weeklyPoints: 110, level: 2 };
    expect(productivityMilestone(achieved, { ...achieved, totalPoints: 125, weeklyPoints: 125 })).toBeNull();
    expect(productivityMilestone(previous, { ...previous, totalPoints: 95, weeklyPoints: 100, weekStart: '2026-10-19' })).toBeNull();
    expect(productivityMilestone(previous, { ...previous, totalPoints: 95, weeklyPoints: 95, weeklyGoal: 50 })).toBeNull();
  });
});
