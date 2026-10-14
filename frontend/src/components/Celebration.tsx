import type { CSSProperties } from 'react';

export type CelebrationEvent = {
  id: number;
  kind: 'points' | 'checklist' | 'milestone';
  message: string;
};

export function Celebration({ event }: { event: CelebrationEvent }) {
  const particleCount = event.kind === 'milestone' ? 64 : 32;

  return <div className={`celebration celebration-${event.kind}`}>
    {event.kind !== 'points' && <div className="celebration-confetti" aria-hidden="true">
      {Array.from({ length: particleCount }, (_, index) => <i key={index} style={{
        '--x': `${(index * 37) % 101}%`,
        '--delay': `${(index % 8) * 40}ms`,
        '--turn': `${index % 2 === 0 ? 540 : -540}deg`,
        '--color': ['#45a36f', '#f2c562', '#9c83db', '#79bddb'][index % 4]
      } as CSSProperties} />)}
    </div>}
    <div className="celebration-toast" role="status" aria-live="polite">
      <span aria-hidden="true">{event.kind === 'milestone' ? '★' : event.kind === 'checklist' ? '✓' : '+'}</span>
      {event.message}
    </div>
  </div>;
}
