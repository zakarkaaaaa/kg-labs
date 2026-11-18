import { useEffect, useMemo, useRef, useState } from 'react';
import type { AlgorithmMeta } from '../core/registry';
import type { RasterResult } from '../core/types';
import { describeStep } from '../core/describe';
import { formatNumber } from '../core/types';

type DockTab = 'steps' | 'calc' | 'code';

interface TraceDockProps {
  meta: AlgorithmMeta;
  result: RasterResult;
  revealed: number;
  paramsLabel: string;
}

const formatValue = (value: number | string, kind: string | undefined): string => {
  if (typeof value === 'number') {
    if (kind === 'int' || Number.isInteger(value)) return String(value);
    return formatNumber(value, 4);
  }
  return value;
};

export const TraceDock = ({ meta, result, revealed, paramsLabel }: TraceDockProps) => {
  const [tab, setTab] = useState<DockTab>('steps');
  const activeRowRef = useRef<HTMLTableRowElement>(null);
  const skipFollowRef = useRef(true);

  const columns = useMemo(
    () =>
      result.columns.filter((column) =>
        result.steps.some((step) => step.values[column.key] !== undefined),
      ),
    [result],
  );

  useEffect(() => {
    skipFollowRef.current = true;
  }, [result]);

  useEffect(() => {
    if (tab !== 'steps') return;
    if (skipFollowRef.current) {
      skipFollowRef.current = false;
      return;
    }
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [revealed, tab]);

  const currentIndex = revealed - 1;

  return (
    <section className="panel dock" style={{ ['--algo' as string]: meta.color }}>
      <div className="dock-tabs">
        <div className="flex items-center gap-1">
          {(
            [
              ['steps', 'Шаги'],
              ['calc', 'Вычисления'],
              ['code', 'Псевдокод'],
            ] as Array<[DockTab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="dock-tab"
              data-active={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 pb-1.5 pr-1">
          <span className="badge" data-tone="accent">
            {meta.name}
          </span>
          <span className="mono text-[10px] dim">{result.steps.length} шагов</span>
        </div>
      </div>

      <div className="dock-body">
        {tab === 'steps' && (
          <div className="table-wrap">
            <table className="trace-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} title={column.hint}>
                      {column.label}
                    </th>
                  ))}
                  <th style={{ textAlign: 'left', width: '38%' }}>вычисление</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.map((step, index) => {
                  const isCurrent = index === currentIndex;
                  const comment = describeStep(meta.id, step);
                  return (
                    <tr
                      key={index}
                      ref={isCurrent ? activeRowRef : undefined}
                      data-current={isCurrent}
                      data-done={index < currentIndex}
                    >
                      {columns.map((column) => {
                        const value = step.values[column.key];
                        if (column.kind === 'bool') {
                          return (
                            <td key={column.key}>
                              <span className="bool-pill" data-on={Number(value) === 1}>
                                {Number(value) === 1 ? 'да' : 'нет'}
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={column.key} title={String(value ?? '')}>
                            {value === undefined ? '—' : formatValue(value, column.kind)}
                          </td>
                        );
                      })}
                      <td
                        className="comment-cell"
                        title={comment}
                        style={{ maxWidth: 520 }}
                      >
                        {comment}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'calc' && (
          <div className="calc-layout">
            <div className="calc-pane">
              <div className="eyebrow mb-2">Пример: {paramsLabel}</div>
              <div className="flex flex-col gap-1.5 mb-3">
                {meta.formulas.map((formula) => (
                  <div className="formula" key={formula}>
                    {formula}
                  </div>
                ))}
              </div>
              <div className="eyebrow mb-1.5">Пошаговые вычисления</div>
              <div>
                {result.steps.slice(0, Math.max(1, Math.min(revealed, 14))).map((step, index) => (
                  <div className="calc-step" key={index}>
                    <b>#{index + 1}</b>
                    <span>{describeStep(meta.id, step)}</span>
                  </div>
                ))}
              </div>
              {result.steps.length > 14 && (
                <div className="prose-note mt-2">
                  … ещё {result.steps.length - 14} шагов — в таблице «Шаги».
                </div>
              )}
            </div>

            <div className="calc-pane">
              <div className="eyebrow mb-2">Что происходит</div>
              {meta.theory.map((paragraph) => (
                <p className="prose-note mb-2" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              <div className="mt-3">
                {Object.entries(result.extra).map(([key, value]) => (
                  <div className="kv" key={key}>
                    <span className="kv-key">{key}</span>
                    <span className="kv-val">
                      {typeof value === 'number' ? formatNumber(value, 4) : value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="prose-note mt-3">{result.legend}</div>
            </div>
          </div>
        )}

        {tab === 'code' && (
          <div className="calc-layout">
            <div className="calc-pane">
              <div className="eyebrow mb-2">Псевдокод</div>
              <div className="rounded-xl border border-white/10 bg-[#03060d] overflow-hidden">
                {meta.pseudocode.map((line, index) => (
                  <div key={index} className="flex gap-3 px-3 py-1 font-mono text-[11px] leading-relaxed">
                    <span className="w-4 text-right text-mist-500 select-none">{index + 1}</span>
                    <span className={`whitespace-pre ${line.startsWith('  ') ? 'text-mist-300' : 'text-mist-100'}`}>{line}</span>
                  </div>
                ))}
              </div>
              <div className="prose-note mt-3">{result.legend}</div>
            </div>
            <div className="calc-pane">
              <div className="eyebrow mb-2">Сложность</div>
              <p className="prose-note">{meta.complexity}</p>
              <div className="eyebrow mt-4 mb-2">Показатели примера</div>
              {Object.entries(result.extra).map(([key, value]) => (
                <div className="kv" key={key}>
                  <span className="kv-key">{key}</span>
                  <span className="kv-val">
                    {typeof value === 'number' ? formatNumber(value, 4) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
