import { useRef, useState, type DragEvent } from 'react';
import type { Game, Player } from '../lib/model';
import { setPrefs, usePrefs, type Theme } from '../lib/prefs';
import { importAll } from '../lib/store';
import { toast } from '../lib/toast';
import { cx } from '../lib/util';
import { Download, Upload } from './Icons';
import { Modal, Segmented } from './ui';

export function Settings({ players, games, onClose }: { players: Player[]; games: Game[]; onClose: () => void }) {
  const prefs = usePrefs();
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);

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
      if (!confirm(`ყველაფერი ჩანაცვლდეს ფაილიდან „${f.name}“? (${data.players.length} მოთამაშე, ${data.games.length} თამაში)`)) return;
      await importAll({ players: data.players, games: data.games });
      toast(`იმპორტირდა ${data.games.length} თამაში`);
    } catch {
      toast('ეს ფაილი Joker Board-ის სარეზერვო ასლს არ ჰგავს', 'error');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    readFile(e.dataTransfer.files[0]);
  };

  return (
    <Modal title="პარამეტრები" wide onClose={onClose}>
      <div className="settings-row">
        <div className="label">
          <b>იერსახე</b>
          <span>ნაგულისხმევად მიჰყვება სისტემას</span>
        </div>
        <Segmented<Theme>
          label="იერსახე"
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
          options={[
            { id: 'system', label: 'ავტო' },
            { id: 'light', label: 'ნათელი' },
            { id: 'dark', label: 'მუქი' },
          ]}
        />
      </div>

      <div className="field">
        <span>სარეზერვო ასლი</span>
        <div
          className={cx('dropzone', over && 'over')}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <Upload size={20} />
          <div className="grow">
            <b>ჩააგდე სარეზერვო ფაილი აქ</b>
            სერვერზე: {players.length} მოთამაშე · {games.length} თამაში
          </div>
          <div className="dz-actions">
            <button className="btn" onClick={() => file.current?.click()}>
              იმპორტი…
            </button>
            <button className="btn" onClick={exportData}>
              <Download /> ექსპორტი
            </button>
          </div>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        </div>
      </div>

    </Modal>
  );
}
