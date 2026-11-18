import type { Page } from '../App';
import { BookIcon } from './ui';

interface HeaderProps {
  page: Page;
  onPageChange: (page: Page) => void;
}

const NAV: Array<{ id: Page; label: string }> = [
  { id: 'explorer', label: 'Визуализатор' },
  { id: 'bench', label: 'Бенчмарк' },
  { id: 'theory', label: 'Теория' },
];

export const Header = ({ page, onPageChange }: HeaderProps) => (
  <header className="app-header">
    <div className="flex items-center gap-3">
      <div className="brand-mark">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <path
            d="M4 19h4v-4h4v-4h4V7h4"
            fill="none"
            stroke="url(#brand-grad)"
            strokeWidth="2.4"
            strokeLinecap="square"
          />
          <rect x="3" y="18" width="3" height="3" rx="0.6" fill="#22d3ee" opacity="0.85" />
          <rect x="19" y="5" width="3" height="3" rx="0.6" fill="#a78bfa" opacity="0.9" />
        </svg>
      </div>
      <div>
        <div className="eyebrow">Компьютерная графика · БГУ · ФПМИ</div>
        <h1 className="text-[15px] font-semibold tracking-tight text-mist-100 leading-tight">
          Базовые растровые алгоритмы
        </h1>
      </div>
    </div>

    <nav className="nav ml-auto mr-auto" aria-label="Разделы">
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          className="nav-item"
          data-active={page === item.id}
          onClick={() => onPageChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>

    <div className="flex items-center gap-2">
      <span className="badge" data-tone="accent">
        <span className="pixel-dot" style={{ width: 5, height: 5 }} />
        Лабораторная 3
      </span>
      <a
        className="btn btn-ghost hidden md:inline-flex"
        href="./report.pdf"
        target="_blank"
        rel="noreferrer"
      >
        Отчёт PDF
      </a>
      <button type="button" className="btn hidden lg:inline-flex" onClick={() => onPageChange('theory')}>
        <BookIcon size={14} />
        Как это работает
      </button>
    </div>
  </header>
);
