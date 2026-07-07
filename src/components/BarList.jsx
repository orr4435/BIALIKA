import React from 'react';
import { fmt } from '../lib/helpers.js';

export default function BarList({ items, fmtFn = fmt, colors }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="blist">
      {items.map((it, i) => (
        <div className="brow" key={it.label}>
          <div className="bl" title={it.label}>{it.label}</div>
          <div className="track">
            <div className="fill" style={{ width: (it.value / max * 100) + '%', background: colors ? colors(i, it) : undefined }} />
          </div>
          <div className="bv">
            {fmtFn(it.value)}
            {it.sub != null && <small> {it.sub}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}
