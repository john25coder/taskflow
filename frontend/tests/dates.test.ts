import { describe, expect, it } from 'vitest';
import { formatDueDate, isOverdue, localIsoDate } from '../src/utils/dates';

describe('date helpers', () => {
  it('formata prazo em português e aceita tarefa sem data', () => {
    expect(formatDueDate(null)).toBe('Sem prazo');
    expect(formatDueDate('2026-10-20')).toContain('20');
  });

  it('não marca tarefa concluída como atrasada', () => {
    expect(isOverdue('2020-01-01', 'done', new Date('2026-01-01'))).toBe(false);
    expect(isOverdue('2020-01-01', 'todo', new Date('2026-01-01'))).toBe(true);
  });

  it('gera a data local usada nas conclusões de hábitos', () => {
    expect(localIsoDate(new Date(2026, 9, 3, 10, 30))).toBe('2026-10-03');
  });
});
