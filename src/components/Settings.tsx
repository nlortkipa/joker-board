import { useRef, useState, type DragEvent } from 'react';
import type { Game, Player } from '../lib/model';
import { setPrefs, usePrefs, type Theme } from '../lib/prefs';
import { importAll } from '../lib/store';
import { toast } from '../lib/toast';
import { cx } from '../lib/util';
import { Download, Upload } from './Icons';
import { Modal } from './ui';

const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'მიჰყვება სისტემას' },
  { id: 'light', label: 'ნათელი' },
  { id: 'dark', label: 'მუქი' },
];

/** Miniature window used as the appearance swatch. */
function ThemeArt({ theme }: { theme: Theme }) {
  return (
    <span className={cx('theme-art', `theme-art-${theme}`)} aria-hidden>
      {(theme === 'system' ? ['light', 'dark'] : [theme]).map((t) => (
        <span key={t} className={cx('mini', t)}>
          <span className="mini-side" />
          <span className="mini-main">
            <span className="mini-bar accent" />
            <span className="mini-bar" />
            <span className="mini-bar short" />
          </span>
        </span>
      ))}
    </span>
  );
}

export function Settings({ players, games, onClose }: { players: Player[]; games: Game[]; onClose: () => void }) {
  const prefs = usePrefs();
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 2, players, games }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `joker-board-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('სარეზერვო ფაილი ჩამოიტვირთა');
  };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.players) || !Array.isArray(data.games) || !data.games.every((g: Game) => Array.isArray(g.scores)))
        throw new Error();
      if (!confirm(`ყველაფერი ჩანაცვლდეს ფაილიდან „${f.name}“? (${data.players.length} მოთამაშე, ${data.games.length} თამაში)`))
        return;
      await importAll({ players: data.players, games: data.games });
      toast(`იმპორტირდა ${data.games.length} თამაში`);
    } catch {
      toast('ეს ფაილი Joker Board-ის სარეზერვო ასლს არ ჰგავს', 'error');
    }
  };

  // Track nested enter/leave so hovering child rows doesn't flicker the highlight.
  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    depth.current++;
    setOver(true);
  };
  const onDragLeave = () => {
    if (--depth.current <= 0) {
      depth.current = 0;
      setOver(false);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    readFile(e.dataTransfer.files[0]);
  };

  return (
    <Modal title="პარამეტრები" wide className="settings" onClose={onClose}>
      <div className="set-group">
        <div className="theme-picker" role="radiogroup" aria-label="იერსახე">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={prefs.theme === t.id}
              className={cx('theme-opt', prefs.theme === t.id && 'on')}
              onClick={() => setPrefs({ theme: t.id })}
            >
              <ThemeArt theme={t.id} />
              <span className="theme-name">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={cx('set-group', 'drop-group', over && 'over')}
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="set-row">
          <span className="set-icon" style={{ background: 'var(--c1)' }}>
            <Download size={15} />
          </span>
          <div className="set-label">
            <b>ექსპორტი</b>
            <span>
              {players.length} მოთამაშე · {games.length} თამაში
            </span>
          </div>
          <button className="btn" onClick={exportData}>
            ჩამოტვირთვა
          </button>
        </div>
        <div className="set-row">
          <span className="set-icon" style={{ background: 'var(--c3)' }}>
            <Upload size={15} />
          </span>
          <div className="set-label">
            <b>იმპორტი</b>
          </div>
          <button className="btn" onClick={() => file.current?.click()}>
            ფაილის არჩევა…
          </button>
        </div>
        <div className="drop-veil" aria-hidden>
          <Upload size={22} />
          <b>გაუშვი იმპორტისთვის</b>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            readFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </Modal>
  );
}
