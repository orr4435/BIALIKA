import React, { useEffect, useRef, useState } from 'react';
import { answer, DEFAULT_CHIPS } from '../lib/agent.js';
import { toolDefs, runTool, systemPrompt } from '../lib/aiTools.js';
import { fmt } from '../lib/helpers.js';

const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
const API = '/api/chat';

/* Ask DeepSeek through the Netlify Function, executing tool calls locally.
   Throws on any transport/config error so the caller can fall back. */
async function llmReply(history) {
  const messages = [...history];
  for (let round = 0; round < 5; round++) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, tools: toolDefs }),
    });
    if (!res.ok) throw new Error('api ' + res.status);
    const data = await res.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    if (!msg) throw new Error('empty response');
    if (msg.tool_calls && msg.tool_calls.length) {
      messages.push(msg);
      for (const tc of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* keep empty */ }
        const result = runTool(tc.function.name, args);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }
    return { content: (msg.content || '').trim(), messages: [...messages, msg] };
  }
  throw new Error('too many tool rounds');
}

function MiniList({ items }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="mini-list">
      {items.map(it => (
        <div className="mini-row" key={it.label}>
          <span>{it.label}</span>
          <span className="mtrack"><span className="mfill" style={{ width: (it.value / max * 100) + '%' }} /></span>
          <b>{fmt(it.value)}</b>
        </div>
      ))}
    </div>
  );
}
function Spark({ data, label }) {
  const W = 220, H = 44;
  const max = Math.max(...data, 1);
  const bw = W / data.length - 3;
  return (
    <div className="spark">
      <svg width={W} height={H} role="img" aria-label={label}>
        {data.map((v, i) => {
          const bh = Math.max(2, v / max * (H - 4));
          return <rect key={i} x={i * (W / data.length) + 1.5} y={H - bh} width={bw} height={bh} rx="1.5" fill="#25d366" opacity="0.85" />;
        })}
      </svg>
      <div className="spark-cap">{label}</div>
    </div>
  );
}

export default function Chat() {
  const [open, setOpen] = useState(() => new URLSearchParams(location.search).has('ask'));
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [aiMode, setAiMode] = useState('unknown'); // 'unknown' | 'ai' | 'local'
  const bodyRef = useRef(null);
  const openedRef = useRef(false);
  const askedRef = useRef(false);
  const historyRef = useRef([{ role: 'system', content: systemPrompt() }]);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('ask');
    if (q && !askedRef.current) { askedRef.current = true; setTimeout(() => ask(q), 300); }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      setMsgs([{
        who: 'bot', time: now(),
        text: 'שלום! אני עוזר הנתונים של המוקד העירוני 🏛️ שאלו אותי כל דבר על הפניות — רחובות, נושאים, זמני טיפול, השוואות בין תקופות.',
        chips: DEFAULT_CHIPS,
      }]);
    }
  }, [open]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, typing, open]);

  const ask = async q => {
    const question = q.trim();
    if (!question) return;
    setMsgs(m => [...m, { who: 'me', time: now(), text: question }]);
    setText('');
    setTyping(true);

    // try the AI first (unless we already know it's unavailable)
    if (aiMode !== 'local') {
      try {
        const hist = [...historyRef.current, { role: 'user', content: question }];
        const { content, messages } = await llmReply(hist);
        // keep history bounded: system + last 14 turns
        historyRef.current = [messages[0], ...messages.slice(1).slice(-14)];
        setAiMode('ai');
        setTyping(false);
        setMsgs(m => [...m, { who: 'bot', time: now(), text: content || '—' }]);
        return;
      } catch {
        setAiMode('local');
      }
    }
    // rule-based fallback (no key / offline / static hosting)
    setTimeout(() => {
      const a = answer(question);
      setTyping(false);
      setMsgs(m => [...m, { who: 'bot', time: now(), ...a }]);
    }, 350 + Math.random() * 350);
  };

  const statusLine = aiMode === 'ai'
    ? 'קריית ביאליק · נתוני 2025 · מחובר ל-AI'
    : aiMode === 'local'
      ? 'קריית ביאליק · נתוני 2025 · מצב מקומי'
      : 'קריית ביאליק · נתוני 2025 · מחובר';

  return (
    <>
      <button className="chat-fab" aria-label="פתיחת עוזר הנתונים" onClick={() => setOpen(o => !o)}>
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7 3 3 6.9 3 11.7c0 2.1.8 4 2.1 5.5L4 21l4-1.1c1.2.6 2.6 1 4 1 5 0 9-3.9 9-8.7S17 3 12 3zm-4.5 9.6c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zm4.5 0c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9zm4.5 0c-.5 0-.9-.4-.9-.9s.4-.9.9-.9.9.4.9.9-.4.9-.9.9z" /></svg>
        )}
      </button>
      {open && (
        <div className="chat-win" role="dialog" aria-label="עוזר נתונים">
          <div className="chat-head">
            <div className="avatar">🏛️</div>
            <div className="who">
              <div className="nm">עוזר הנתונים · מוקד 106</div>
              <div className="st">{statusLine}</div>
            </div>
            <button className="x" onClick={() => setOpen(false)} aria-label="סגירה">✕</button>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={'msg ' + (m.who === 'me' ? 'me' : 'bot')}>
                {m.listTitle && <div style={{ fontWeight: 650, marginBottom: 2 }}>{m.listTitle}</div>}
                <span style={{ whiteSpace: 'pre-wrap' }}>{m.text}</span>
                {m.list && <MiniList items={m.list} />}
                {m.spark && <Spark data={m.spark} label={m.sparkLabel || ''} />}
                {m.chips && (
                  <div className="chat-chips" style={{ padding: '8px 0 0' }}>
                    {m.chips.map(c => <button key={c} className="chat-chip" onClick={() => ask(c)}>{c}</button>)}
                  </div>
                )}
                <span className="time">{m.time}</span>
              </div>
            ))}
            {typing && (
              <div className="msg bot"><span className="typing"><span /><span /><span /></span></div>
            )}
          </div>
          <form className="chat-input" onSubmit={e => { e.preventDefault(); ask(text); }}>
            <input
              value={text} onChange={e => setText(e.target.value)}
              placeholder="שאלו על הפניות… למשל: כמה פניות היו ביוני?"
              aria-label="שאלה לעוזר הנתונים"
            />
            <button type="submit" aria-label="שליחה">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ transform: 'scaleX(-1)' }}><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
