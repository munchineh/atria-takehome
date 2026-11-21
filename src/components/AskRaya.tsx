import { useState } from 'react';
import { Button, Input } from 'antd';
import { ArrowUpOutlined } from './AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { RAYA_PROMPTS, askRaya } from '../data/insights';
import type { MockAccount } from '../data/accounts';
import type { Job } from '../data/store';
import { fadeUp } from '../motion/tokens';

/** Ask Raya (D8, approved 10:17). Atria's Overview opens with its AI chat box; here it answers from the page's own data. */
export function AskRaya({ account, windowDays, jobs }: { account: MockAccount; windowDays: number; jobs: Job[] }) {
  const [q, setQ] = useState('');
  const [thread, setThread] = useState<{ q: string; a: string } | null>(null);
  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setThread({ q: t, a: askRaya(t, account, windowDays, jobs) });
    setQ('');
  };
  return (
    <section className="panel raya" aria-labelledby="raya-title">
      <h2 id="raya-title" className="panel-title raya-title">
        <span className="raya-mark" aria-hidden>✦</span> Ask Raya
      </h2>
      <p className="t-help ov-sec-help">Ask about this account's ads in plain words.</p>
      <form
        className="raya-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example, which ad should I improve first?" aria-label="Ask Raya" />
        <Button type="primary" htmlType="submit" shape="circle" icon={<ArrowUpOutlined />} aria-label="Send" disabled={!q.trim()} />
      </form>
      <div className="raya-prompts">
        {RAYA_PROMPTS.map((p) => (
          <button key={p} type="button" className="raya-chip" onClick={() => ask(p)}>
            {p}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {thread && (
          <motion.div key={thread.q} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="raya-answer" aria-live="polite">
            <span className="t-label">{thread.q}</span>
            <p>{thread.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
