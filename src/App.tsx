import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Toasts } from './components/Feedback';
import { GameResult, gameTitle, shareGame } from './components/GameResult';
import { Games } from './components/Games';
import { Back, Cards, Gear, People, Plus, Share, Trophy } from './components/Icons';
import { Leaderboard } from './components/Leaderboard';
import { LogGame } from './components/LogGame';
import { PlayerEditor, Players, newPlayer } from './components/Players';
import { Settings } from './components/Settings';
import { Shortcuts } from './components/Shortcuts';
import { Avatar, Kbd, Modal, Segmented } from './components/ui';
import { placesOf, type Game } from './lib/model';
import { setPrefs, usePrefs } from './lib/prefs';
import { go, useRoute } from './lib/router';
import { deleteGame, playerMap, startSync, UNKNOWN, useStore } from './lib/store';
import { PERIODS, type Period } from './lib/stats';
import { toast } from './lib/toast';
import { cx, dayLabel, isTyping } from './lib/util';

type Overlay =
  | null
  | { kind: 'log'; edit?: Game; seed?: string[] }
  | { kind: 'player' | 'settings' | 'shortcuts' | 'onboarding' | 'delete' };

export default function App() {
  const { players, games, loaded, offline } = useStore();
  const route = useRoute();
  const prefs = usePrefs();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [period, setPeriod] = useState<Period>('all');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => startSync(), []);

  useEffect(() => {
    if (loaded && !offline && !prefs.onboarded && games.length === 0) setOverlay((o) => o ?? { kind: 'onboarding' });
  }, [loaded, offline, prefs.onboarded, games.length]);

  const game = route.name === 'game' ? games.find((g) => g.id === route.id) : undefined;
  const pm = useMemo(() => playerMap(players), [players]);
  const recent = useMemo(() => [...games].sort((a, b) => b.playedAt.localeCompare(a.playedAt)).slice(0, 4), [games]);

  const openLog = useCallback((extra?: { edit?: Game; seed?: string[] }) => {
    setPrefs({ onboarded: true });
    setOverlay({ kind: 'log', ...extra });
  }, []);

  // Global keyboard shortcuts. Letters use e.code so they work on a Georgian layout too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (overlay?.kind === 'onboarding' && e.code === 'KeyN') {
        e.preventDefault();
        openLog();
        return;
      }
      if (overlay || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.code;
      // Stop the key from also being typed into the input the opened dialog autofocuses.
      if (['KeyN', 'KeyP', 'KeyS', 'KeyE'].includes(c)) e.preventDefault();
      if (c === 'KeyN') openLog();
      else if (c === 'KeyP') setOverlay({ kind: 'player' });
      else if (c === 'KeyS') setOverlay({ kind: 'settings' });
      else if (c === 'KeyE' && game) openLog({ edit: game });
      else if (e.key === '?') setOverlay({ kind: 'shortcuts' });
      else if (e.key === 'Escape' && route.name === 'game') go('/games');
      else if (c === 'Digit1') go('/leaderboard');
      else if (c === 'Digit2') go('/games');
      else if (c === 'Digit3') go('/players');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, route.name, game, openLog]);

  // Large-title collapse on phones
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    setScrolled(false);
  }, [route]);

  const nav = [
    { id: 'leaderboard', path: '/leaderboard', label: 'რეიტინგი', icon: <Trophy size={14} />, tone: 'gold' },
    { id: 'games', path: '/games', label: 'თამაშები', icon: <Cards size={14} />, tone: 'blue', count: games.length },
    { id: 'players', path: '/players', label: 'მოთამაშეები', icon: <People size={14} />, tone: 'green', count: players.length },
  ];
  const activeNav = route.name === 'game' ? 'games' : route.name;

  let title = 'რეიტინგი';
  let right: ReactNode = null;
  let content: ReactNode = null;
  let mobileExtra: ReactNode = null;

  const logBtn = (
    <button className="btn primary hide-mobile" onClick={() => openLog()}>
      <Plus /> თამაშის ჩაწერა <Kbd k="N" />
    </button>
  );
  const periodPicker = (
    <Segmented<Period> label="პერიოდი" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ id: p.id, label: p.label }))} />
  );

  if (!loaded) {
    content = <div className="empty" />;
  } else if (route.name === 'leaderboard') {
    right = (
      <>
        {games.length > 0 && <span className="hide-mobile">{periodPicker}</span>}
        {logBtn}
      </>
    );
    mobileExtra = games.length > 0 ? <div className="mh-extra">{periodPicker}</div> : null;
    content = <Leaderboard players={players} games={games} period={period} onLog={() => openLog()} />;
  } else if (route.name === 'games') {
    title = 'თამაშები';
    right = logBtn;
    content = <Games players={players} games={games} onLog={() => openLog()} />;
  } else if (route.name === 'players') {
    title = 'მოთამაშეები';
    right = (
      <>
        <button className="btn primary hide-mobile" onClick={() => setOverlay({ kind: 'player' })}>
          <Plus /> მოთამაშის დამატება <Kbd k="P" />
        </button>
      </>
    );
    content = <Players players={players} games={games} onAdd={() => setOverlay({ kind: 'player' })} />;
  } else if (route.name === 'game') {
    if (!game) {
      title = 'თამაში';
      content = (
        <div className="empty">
          <div className="art">🫥</div>
          <h3>თამაში ვერ მოიძებნა</h3>
          <p>შესაძლოა სხვა მოწყობილობიდან წაიშალა.</p>
          <button className="btn" onClick={() => go('/games')}>
            თამაშებზე დაბრუნება
          </button>
        </div>
      );
    } else {
      title = gameTitle(game);
      right = (
        <button className="icon-btn" onClick={() => shareGame(game, players)} aria-label="გაზიარება" title="გაზიარება">
          <Share />
        </button>
      );
      content = (
        <GameResult
          game={game}
          players={players}
          onEdit={() => openLog({ edit: game })}
          onAgain={() => openLog({ seed: game.playerIds })}
          onDelete={() => setOverlay({ kind: 'delete' })}
        />
      );
    }
  }

  const isRoot = route.name !== 'game';

  return (
    <div className="app">
      <div className="mesh" aria-hidden />
      <aside className="sidebar">
        <button className="brand" onClick={() => go('/leaderboard')}>
          <img src="/logo.svg" alt="" />
          <div>
            <b>Joker Board</b>
            <span>{offline ? '⚠︎ კავშირი არ არის' : 'ოჯახის ჯოკერის დაფა'}</span>
          </div>
        </button>
        {nav.map((n) => (
          <button key={n.id} className={cx('nav-item', activeNav === n.id && 'active')} onClick={() => go(n.path)}>
            <span className={cx('nav-icon', n.tone)}>{n.icon}</span>
            {n.label}
            <span className="count">{n.count || ''}</span>
          </button>
        ))}
        {recent.length > 0 && (
          <>
            <div className="side-section">ბოლო თამაშები</div>
            {recent.map((g) => {
              const places = placesOf(g.scores);
              const w = places.indexOf(1);
              const winner = pm.get(g.playerIds[w]) ?? UNKNOWN;
              return (
                <button
                  key={g.id}
                  className={cx('nav-item recent', route.name === 'game' && route.id === g.id && 'active')}
                  onClick={() => go(`/games/${g.id}`)}
                >
                  <Avatar player={winner} />
                  <span className="recent-text">
                    <b>{winner.name}</b>
                    <span>{dayLabel(new Date(g.playedAt).getTime())}</span>
                  </span>
                  <span className="count">🏆</span>
                </button>
              );
            })}
          </>
        )}
        <div className="side-foot">
          <button className="btn primary block large" onClick={() => openLog()}>
            <Plus /> თამაშის ჩაწერა <Kbd k="N" />
          </button>
          <button className="nav-item" onClick={() => setOverlay({ kind: 'settings' })}>
            <span className="nav-icon gray">
              <Gear size={14} />
            </span>
            პარამეტრები
            <span className="count">
              <Kbd k="S" />
            </span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className={cx('topbar', isRoot && 'is-root', scrolled && 'scrolled')}>
          {!isRoot && (
            <button className="icon-btn" onClick={() => go('/games')} aria-label="უკან">
              <Back />
            </button>
          )}
          {isRoot && <img className="bar-logo" src="/logo.svg" alt="" />}
          <h1>{title}</h1>
          <span className="spacer" />
          {right}
        </header>
        {isRoot && (
          <div className="mobile-head">
            <div className="mh-row">
              <button className="mh-brand" onClick={() => go('/leaderboard')} aria-label="Joker Board">
                <img src="/logo.svg" alt="" />
              </button>
              <div className="mh-titles">
                <span className={cx('mh-eyebrow', offline && 'offline')}>
                  {offline ? '⚠︎ კავშირი არ არის' : 'Joker Board'}
                </span>
                <h1>{title}</h1>
              </div>
            </div>
            {mobileExtra}
          </div>
        )}
        <div className="page" key={route.name === 'game' ? route.id : route.name}>
          {content}
        </div>
      </main>

      <nav className="tabbar">
        <button className={cx(activeNav === 'leaderboard' && 'on')} onClick={() => go('/leaderboard')}>
          <Trophy size={22} /> რეიტინგი
        </button>
        <button className={cx(activeNav === 'games' && 'on')} onClick={() => go('/games')}>
          <Cards size={22} /> თამაშები
        </button>
        <button className="fab" onClick={() => openLog()} aria-label="თამაშის ჩაწერა">
          <Plus size={24} strokeWidth={2.4} />
        </button>
        <button className={cx(activeNav === 'players' && 'on')} onClick={() => go('/players')}>
          <People size={22} /> მოთამაშეები
        </button>
        <button onClick={() => setOverlay({ kind: 'settings' })}>
          <Gear size={22} /> პარამეტრები
        </button>
      </nav>

      {overlay?.kind === 'log' && (
        <LogGame players={players} games={games} edit={overlay.edit} seed={overlay.seed} onClose={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'player' && (
        <PlayerEditor isNew player={newPlayer('', players)} players={players} onClose={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'settings' && <Settings players={players} games={games} onClose={() => setOverlay(null)} />}
      {overlay?.kind === 'shortcuts' && <Shortcuts onClose={() => setOverlay(null)} />}
      {overlay?.kind === 'onboarding' && (
        <Onboarding
          onClose={() => {
            setPrefs({ onboarded: true });
            setOverlay(null);
          }}
          onStart={() => openLog()}
        />
      )}
      {overlay?.kind === 'delete' && game && (
        <Modal
          title="წავშალო ეს თამაში?"
          onClose={() => setOverlay(null)}
          footer={
            <>
              <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setOverlay(null)}>
                გაუქმება
              </button>
              <button
                className="btn primary danger-fill"
                onClick={() => {
                  deleteGame(game.id);
                  setOverlay(null);
                  go('/games');
                  toast('თამაში წაიშალა', 'info');
                }}
              >
                წაშლა
              </button>
            </>
          }
        >
          <p className="muted" style={{ margin: 0 }}>
            შედეგი ყველასთვის წაიშლება რეიტინგიდან. ამის დაბრუნება შეუძლებელია.
          </p>
        </Modal>
      )}
      <Toasts />
    </div>
  );
}

function Onboarding({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="hero-modal">
        <img className="logo" src="/logo.svg" alt="" />
        <h2>მოგესალმებით!</h2>
        <p>ჩაწერე ყოველი თამაშის შედეგი და ნახე, ვინ არის ოჯახის ნამდვილი ჯოკერის ჩემპიონი.</p>
        <div className="press hide-touch">
          დააჭირე <span className="kbd">N</span>-ს პირველი თამაშის ჩასაწერად
        </div>
        <button className="btn primary large show-touch" style={{ marginTop: 18 }} onClick={onStart}>
          პირველი თამაშის ჩაწერა
        </button>
      </div>
    </Modal>
  );
}
