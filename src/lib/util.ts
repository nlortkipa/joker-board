export const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? '⌘' : 'Ctrl';

export const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
};

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const DAY = 86400000;

// Georgian names are hardcoded: not every browser ships ka-GE locale data.
const MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
const MONTHS_SHORT = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];
const WEEKDAYS = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
const WEEKDAYS_SHORT = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];
const pad = (n: number) => String(n).padStart(2, '0');

export function dayLabel(time: number, now = Date.now()) {
  const d = new Date(time);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start.getTime() - new Date(d).setHours(0, 0, 0, 0)) / DAY);
  if (diff === 0) return 'დღეს';
  if (diff === 1) return 'გუშინ';
  if (diff > 1 && diff < 7) return WEEKDAYS[d.getDay()];
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}

export const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const shortDate = (time: number) => {
  const d = new Date(time);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const weekdayNarrow = (time: number) => WEEKDAYS_SHORT[new Date(time).getDay()];

/** Georgian ordinals: 1-ლი, 2-ე, 3-ე … */
export const ordinal = (n: number) => (n === 1 ? '1-ლი' : `${n}-ე`);

/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (d: Date) => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EMOJIS = [
  '🦊', '🐻', '🐼', '🦁', '🐯', '🐸', '🐙', '🦉', '🐺', '🦄', '🐝', '🐢',
  '🐳', '🦩', '🐨', '🐵', '🌻', '🍀', '🔥', '⚡️', '🌙', '⭐️', '🍒', '🍉',
  '👑', '🎩', '🎯', '🎲', '🚀', '💎', '🧠', '😎', '🤠', '🥷', '🧙', '👵',
];

/** Center-crops an image file to a square and downsizes it to a small data URL. */
export async function imageToAvatar(file: Blob, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  const webp = canvas.toDataURL('image/webp', 0.85);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85);
}

export const COLOR_NAMES = ['', 'ლურჯი', 'ნარინჯისფერი', 'ზღვისფერი', 'ყვითელი', 'ვარდისფერი', 'მწვანე', 'იისფერი', 'წითელი'];
