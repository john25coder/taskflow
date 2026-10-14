import { useState } from 'react';
import type { ChecklistItem, Task } from '../types';

type Props = {
  task: Task;
  busy: boolean;
  onToggle: (task: Task, item: ChecklistItem) => Promise<boolean>;
  onChangeStatus: (task: Task) => void;
};

export function StudyChecklist({ task, busy, onToggle, onChangeStatus }: Props) {
  const [recentlyCompletedId, setRecentlyCompletedId] = useState<string | null>(null);
  const completed = task.checklist.filter((item) => item.completedAt).length;
  const progress = Math.round(completed / task.checklist.length * 100);

  async function toggle(item: ChecklistItem) {
    if (await onToggle(task, item)) {
      setRecentlyCompletedId(item.completedAt ? null : item.id);
    }
  }

  return <section className={`study-checklist ${progress === 100 ? 'checklist-complete' : ''}`} aria-label={`Checklist de ${task.title}`}>
    <div className="checklist-heading"><strong>Passo a passo</strong><span>{completed}/{task.checklist.length} · {progress}%</span></div>
    <progress className="checklist-progress" max={task.checklist.length} value={completed}
      aria-label={`Progresso de ${task.title}`} />
    <ul>{task.checklist.map((item) => <li key={item.id}>
      <label className={`checklist-item ${recentlyCompletedId === item.id && item.completedAt ? 'just-completed' : ''}`}>
        <input type="checkbox" checked={Boolean(item.completedAt)} disabled={busy || task.status === 'done'}
          onChange={() => void toggle(item)} />
        <span className="checklist-check" aria-hidden="true">✓</span>
        <span className="checklist-text">{item.text}</span>
      </label>
    </li>)}</ul>
    <button className={`button ${task.status === 'done' ? 'secondary' : 'primary'}`} disabled={busy || (task.status !== 'done' && completed !== task.checklist.length)}
      onClick={() => onChangeStatus(task)}>
      {task.status === 'done' ? 'Reabrir tarefa' : 'Concluir tarefa · +15 pontos'}
    </button>
    <p className="field-help">{task.status === 'done' ? 'Reabra a tarefa para ajustar o checklist.' : completed === task.checklist.length
      ? 'Checklist completo! Conclua a tarefa para receber os pontos.' : 'Cada item avança o progresso. Os pontos vêm ao concluir a tarefa.'}</p>
  </section>;
}
