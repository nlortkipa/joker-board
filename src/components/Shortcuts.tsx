import { Kbd, Modal } from './ui';

export const SHORTCUTS: [string[], string][] = [
  [['Mod', 'K'], 'ბრძანებების პალიტრა'],
  [['N'], 'თამაშის ჩაწერა'],
  [['P'], 'მოთამაშის დამატება'],
  [['1'], 'რეიტინგი'],
  [['2'], 'თამაშები'],
  [['3'], 'მოთამაშეები'],
  [['E'], 'თამაშის რედაქტირება'],
  [['S'], 'პარამეტრები'],
  [['?'], 'მალსახმობები'],
  [['Esc'], 'დახურვა / უკან'],
  [['↵'], 'შენახვა'],
];

export function Shortcuts({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="კლავიატურის მალსახმობები" onClose={onClose}>
      <div className="shortcut-list" style={{ gridTemplateColumns: '1fr' }}>
        {SHORTCUTS.map(([keys, label]) => (
          <div key={label}>
            <span>{label}</span>
            <span className="keys">
              {keys.map((k) => (
                <Kbd key={k} k={k} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
