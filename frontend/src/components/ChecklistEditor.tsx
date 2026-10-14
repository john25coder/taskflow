import type { ChecklistInput } from '../types';

export type ChecklistDraftItem = ChecklistInput & { key: string };

type Props = {
  items: ChecklistDraftItem[];
  onChange: (items: ChecklistDraftItem[]) => void;
};

export function ChecklistEditor({ items, onChange }: Props) {
  function move(index: number, direction: -1 | 1) {
    const next = [...items];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  }

  return <fieldset className="checklist-editor">
    <legend>Checklist de estudo <small>opcional</small></legend>
    <p className="field-help">Divida o estudo em passos: exercícios, leituras ou revisões.</p>
    <ol>{items.map((item, index) => <li key={item.key}>
      <label><span className="sr-only">Passo {index + 1}</span>
        <input value={item.text} maxLength={200} required placeholder={`Ex.: resolver exercícios ${index + 1}–${index + 5}`}
          onChange={(event) => onChange(items.map((entry, position) => position === index ? { ...entry, text: event.target.value } : entry))} />
      </label>
      <div className="checklist-editor-actions">
        <button type="button" disabled={index === 0} aria-label={`Mover passo ${index + 1} para cima`} onClick={() => move(index, -1)}>↑</button>
        <button type="button" disabled={index === items.length - 1} aria-label={`Mover passo ${index + 1} para baixo`} onClick={() => move(index, 1)}>↓</button>
        <button type="button" aria-label={`Remover passo ${index + 1}`} onClick={() => onChange(items.filter((_, position) => position !== index))}>×</button>
      </div>
    </li>)}</ol>
    <button type="button" className="button secondary" disabled={items.length >= 50}
      onClick={() => onChange([...items, { key: crypto.randomUUID(), text: '' }])}>+ Adicionar passo</button>
  </fieldset>;
}
