import { useState } from 'react';
import {
  House, LayoutPanelTop, Cpu, Wifi, Shield, Gamepad2, Trash2, Package, History, CircuitBoard, MessageSquare, Undo2,
} from 'lucide-react';
import { NETWORK_ROWS, LEDGER } from '../data.js';
import Toggle from './Toggle.jsx';
import Diff from './Diff.jsx';

const NAV = [
  { label: 'System', items: [['Home', House], ['General', LayoutPanelTop], ['Performance', Cpu], ['Network', Wifi], ['Privacy', Shield], ['Game Mode', Gamepad2]] },
  { label: 'Tools', items: [['Cleaner', Trash2], ['Debloat', Package], ['Backups', History], ['BIOS', CircuitBoard], ['Assistant', MessageSquare]] },
];

export default function AppWindow() {
  const [rows, setRows] = useState(NETWORK_ROWS.map((r) => r.on));
  const throttle = LEDGER[0];
  const active = 6 + rows.filter(Boolean).length;
  const flip = (i) => setRows((r) => r.map((v, j) => (j === i ? !v : v)));

  return (
    <div className="window" aria-label="Preview of the Unlag app, Network page">
      <div className="titlebar">
        <img src="/logo.png" alt="" width="16" height="16" />
        <span>unlag</span>
        <div className="win-ctrl" aria-hidden="true"><i /><i /><i /></div>
      </div>
      <div className="app">
        <aside className="app-side">
          {NAV.map((group) => (
            <div className="side-group" key={group.label}>
              <div className="side-label">{group.label}</div>
              {group.items.map(([name, Icon]) => (
                <div className={`side-item${name === 'Network' ? ' is-active' : ''}`} key={name}>
                  <Icon size={16} strokeWidth={1.5} />
                  {name}
                </div>
              ))}
            </div>
          ))}
        </aside>

        <div className="app-main">
          <div className="page-head">
            <h3>Network</h3>
            <span className="mono">{active} of 21 active</span>
          </div>
          <p className="page-sub">Faster pings, cleaner packets, smarter DNS</p>
          <div className="tabs" role="presentation">
            {['Latency', 'Bandwidth', 'DNS', 'Adapter', 'Protocols', 'Wireless'].map((t) => (
              <span key={t} className={`tab${t === 'Bandwidth' ? ' is-on' : ''}`}>{t}</span>
            ))}
          </div>
          <div className="rows">
            {NETWORK_ROWS.map((row, i) => (
              <div className={`row${row.open ? ' is-open' : ''}`} key={row.name}>
                <div className="row-text">
                  <div className="row-name">{row.name}</div>
                  <div className="row-desc">{row.desc}</div>
                </div>
                <span className="row-impact">{row.impact}</span>
                <Toggle on={rows[i]} onChange={() => flip(i)} label={row.name} />
                {row.open && (
                  <div className="row-diff">
                    <div className="diff-path mono">{throttle.path}</div>
                    <Diff k={throttle.key} from={throttle.from} to={throttle.to} on={rows[i]} />
                    <div className="row-foot">
                      <span>{rows[i] ? 'Original value saved' : 'Original value restored'}</span>
                      <button type="button" className="mini-btn" onClick={() => flip(i)} disabled={!rows[i]}>
                        <Undo2 size={12} strokeWidth={1.5} />Revert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="app-log">
          <div className="log-head"><span>Change log</span><span className="mono">tweaks.json</span></div>
          {LEDGER.map((e, i) => (
            <div className="log-entry" key={e.id}>
              <div className="log-id mono">{e.id}</div>
              <div className="log-val mono">
                <span className="k">{e.key}</span>
                <span className="v-from">{e.from}</span>
                <span className="v-arrow">→</span>
                <span className="v-to">{i === 0 && !rows[0] ? e.from : e.to}</span>
              </div>
            </div>
          ))}
          <p className="log-note">Every line can be undone exactly</p>
        </aside>
      </div>
    </div>
  );
}
