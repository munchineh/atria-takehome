import { briefFromSuggestions } from '../data/insights';
import type { Recommendation } from '../data/mock';
import { useQuota } from '../data/live';
import { useEffect, useRef, useState } from 'react';
import { App, Button, Drawer, Input, Modal, Select } from 'antd';
import { CloseOutlined, EditOutlined, LinkOutlined, LoadingOutlined, PlusOutlined, ReloadOutlined, ThunderboltOutlined } from './AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, SIZES, plural, type Creative } from '../data/mock';
import { accountOf, useStore } from '../data/store';
import { Thumb } from './Thumb';
import { duration, ease, fadeUp } from '../motion/tokens';
import { Rolling } from './Rolling';

type BriefMode = 'empty' | 'url' | 'reading' | 'error' | 'write' | 'filled';

/** Product images Atria already has for each product (prefilled, I1). */
const PRODUCT_IMAGES: Record<string, string[]> = {
  'Sad Pink mochi': ['r01', 'r02'],
  'Mystery mood box': ['r03'],
  'Desk buddy mochi': ['r05'],
  'Mood collection': ['r04'],
};

const draftFromPage = (product: string) =>
  `${product}: a slow-rise squishy toy from Moody Mochi. Hand-painted face, food-safe silicone, about 7 cm wide. $14 each. For adults who buy small comfort gifts. Goal: more purchases. Tone: warm and a little deadpan.`;

export interface CreateSettings {
  perRec: number;
  size: string;
}

export function Body({
  creative,
  recCount,
  picked,
  onCancel,
  onCreate,
  onRemove,
  panel = false,
}: {
  /** 227: removes a suggestion from the round (deselects it on the ad page). The brief is not rewritten. */
  onRemove?: (id: string) => void;
  /** Item 9: the suggestions picked on the ad page. When given, the brief can be filled in from them. */
  picked?: Recommendation[];
  creative: Creative;
  recCount: number;
  onCancel: () => void;
  onCreate: (s: CreateSettings) => void;
  /** Rendered inside the expanding action bar (Mancini's "morphing" reference, 20 Nov 17:59). */
  panel?: boolean;
}) {
  const { briefs, setBrief, credits, lastSettings } = useStore();
  const quota = useQuota();
  const { message, modal } = App.useApp();
  const account = accountOf(creative);
  const brand = 'brand' in account ? account.brand : null;
  const saved = briefs[creative.product];
  // Mancini 09:43: the brief starts filled in from the picked suggestions; a product page is the alternative.
  const fromSuggestions = !!picked && picked.length > 0;
  const [mode, setMode] = useState<BriefMode>(fromSuggestions ? 'write' : saved ? 'filled' : 'empty');
  const [brief, setDraft] = useState(() => (fromSuggestions ? briefFromSuggestions(creative, picked!, account, saved) : saved ?? ''));
  const [prefilled, setPrefilled] = useState(fromSuggestions);
  const [url, setUrl] = useState('');
  const [images, setImages] = useState<string[]>(PRODUCT_IMAGES[creative.product] ?? []);
  const [uploadError, setUploadError] = useState('');
  const top = creative.placements[0];
  const defaultSize = top.label === 'Feed' ? '2:3' : '9:16';
  const [size, setSize] = useState(lastSettings[creative.id]?.size ?? defaultSize);
  const [perRec, setPerRec] = useState(lastSettings[creative.id]?.perRec ?? ACCOUNT.variationsPerRecommendation);
  const file = useRef<HTMLInputElement>(null);
  const total = recCount * perRec;
  const cost = total * ACCOUNT.creditsPerImage;
  const ready = brief.trim().length > 0 && (mode === 'filled' || mode === 'write');

  // Item 9: fill the brief from the diagnosis. Everything stays editable; nothing is saved until Create.
  const prefill = () => {
    setDraft(briefFromSuggestions(creative, picked ?? [], account, saved));
    setPrefilled(true);
    setMode('write');
  };
  // 286 (Mancini 19:29): "Reset changes" asks first when the brief has edits, since they're lost.
  const resetBrief = () => {
    const fresh = briefFromSuggestions(creative, picked ?? [], account, saved);
    if (brief.trim() === fresh.trim()) return prefill();
    modal.confirm({
      title: 'Reset your changes?',
      content: 'The brief goes back to what Atria wrote from the suggestions in this round. Your edits are lost.',
      okText: 'Reset',
      cancelText: 'Keep my edits',
      onOk: prefill,
    });
  };

  const readPage = () => {
    setMode('reading');
    setTimeout(() => {
      if (!/^(https?:\/\/)?[\w-]+\.[\w.]+/.test(url.trim())) return setMode('error');
      const text = draftFromPage(creative.product);
      setDraft(text);
      setBrief(creative.product, text);
      setPrefilled(false);
      setMode('filled');
    }, 1400);
  };

  const addFile = (f?: File) => {
    if (!f) return;
    if (images.length >= 4) return setUploadError('You can add up to 4 images.');
    if (!/image\/(png|jpe?g)/.test(f.type)) return setUploadError('Use a PNG or JPG file.');
    if (f.size > 5 * 1024 * 1024) return setUploadError('That file is over 5\u00a0MB.');
    setUploadError('');
    setImages((p) => [...p, URL.createObjectURL(f)]);
  };

  return (
    <div className={`dlg ${panel ? 'dlg-panel' : ''}`}>
      <div className="dlg-scroll">
        {panel && <h4 className="dlg-panel-title">Generate new creatives</h4>}
        <p className="dlg-sub muted">
          For <b className="ink">{creative.name}</b> · {plural(recCount, 'suggestion')}
        </p>

        {/* 227 (Mancini 16:02): the suggestions in this round, each with the problem it solves, as removable chips.
            Removing one doesn't touch the brief; "Reset changes" rewrites it from what's left, dropping your edits (284). */}
        {picked && picked.length > 0 && (
          <div className="dlg-refs">
            <div className="dlg-refs-head">
              <span className="dlg-field-label">Suggestions in this round</span>
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={resetBrief}>
                Reset changes
              </Button>
            </div>
            <ul className="dlg-ref-chips">
              {picked.map((r) => (
                <li key={r.id} className="dlg-ref-chip">
                  <span className="dlg-ref-text">
                    <b>{r.fix}</b>
                    <span className="dlg-ref-problem">{r.issue}</span>
                  </span>
                  {onRemove && picked.length > 1 && (
                    <button type="button" className="dlg-ref-x" aria-label={`Remove "${r.fix}" from this round`} onClick={() => onRemove(r.id)}>
                      <CloseOutlined />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* S-70 (FG3 "Ad context"): group labels on the left, fields on the right; stacked on phones. */}
        <section className="dlg-group">
          <h5 className="dlg-group-label">Context</h5>
          <div className="dlg-group-fields">
        {/* Ad brief (I1). */}
        <div className="dlg-field">
          {/* 5d C5d-08: one help line only; the rewrite link sits on the label row. */}
          <div className="dlg-label-row">
            <span className="dlg-field-label"><span className="req" aria-hidden>*</span>Ad brief</span>
            <span className="row-gap wrap">
              {(mode === 'filled' || mode === 'write') && brief.trim().length > 0 && (
                <Button type="link" size="small" className="inline-link" icon={<CloseOutlined />} onClick={() => { setDraft(''); setPrefilled(false); setMode('write'); }}>
                  Clear
                </Button>
              )}
              {(mode === 'filled' || mode === 'write') && (
                <Button type="link" size="small" className="inline-link" icon={<LinkOutlined />} onClick={() => setMode('url')}>
                  Create from product page
                </Button>
              )}
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {(mode === 'empty' || mode === 'url' || mode === 'reading' || mode === 'error') && !saved && !brief ? (
              <motion.div key="starts" variants={fadeUp} initial="hidden" animate="show" exit="exit" className={`brief-starts-wrap ${picked && picked.length > 0 ? 'has-prefill' : ''}`}>
                {picked && picked.length > 0 && (
                  <>
                    {/* Item 9 (R-E): featured pre-fill option from picked suggestions. */}
                    <div className="brief-start brief-prefill">
                      <div className="brief-prefill-body">
                        <b className="brief-prefill-title">
                          <ThunderboltOutlined aria-hidden /> Start from the suggestions
                        </b>
                        <span className="t-help">Fills in the product, who it's for, the goal and what to change. You can edit it.</span>
                      </div>
                      <Button onClick={prefill}>Fill in the brief</Button>
                    </div>
                    <div className="brief-divider muted small">
                      <span>or start another way</span>
                    </div>
                  </>
                )}
                <div className="brief-starts">
                  <div className="brief-start">
                    <b>Start from a product page</b>
                    <Input
                      placeholder="https://"
                      prefix={<LinkOutlined className="muted" />}
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        if (mode === 'error') setMode('url');
                      }}
                      onPressEnter={() => url && readPage()}
                      status={mode === 'error' ? 'error' : undefined}
                      inputMode="url"
                      aria-label="Product page link"
                    />
                    {mode === 'error' && <span className="field-error">Couldn't read that page. Check the link, or write the brief yourself.</span>}
                    <Button onClick={readPage} disabled={!url || mode === 'reading'} icon={mode === 'reading' ? <LoadingOutlined /> : undefined}>
                      {mode === 'reading' ? 'Reading the page' : 'Write brief'}
                    </Button>
                  </div>
                  <div className="brief-or muted small">or</div>
                  <div className="brief-start">
                    <b>Write your own</b>
                    <span className="t-help">Cover the product, who it's for, the goal and the tone.</span>
                    <Button icon={<EditOutlined />} onClick={() => setMode('write')}>
                      Write it yourself
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : mode === 'url' || mode === 'reading' || mode === 'error' ? (
              <motion.div key="rewrite" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="brief-start inline">
                <Input
                  placeholder="https://"
                  prefix={<LinkOutlined className="muted" />}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  status={mode === 'error' ? 'error' : undefined}
                  inputMode="url"
                  aria-label="Product page link"
                  autoFocus
                />
                {mode === 'error' && <span className="field-error">Couldn't read that page. Check the link, or write the brief yourself.</span>}
                <span className="row-gap">
                  <Button onClick={readPage} disabled={!url || mode === 'reading'} icon={mode === 'reading' ? <LoadingOutlined /> : undefined}>
                    {mode === 'reading' ? 'Reading the page' : 'Write brief'}
                  </Button>
                  <Button type="text" onClick={() => setMode(prefilled || !saved ? 'write' : 'filled')}>
                    Cancel
                  </Button>
                </span>
              </motion.div>
            ) : (
              <motion.div key="field" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="brief-field">
                <Input.TextArea
                  // 5d OG-18: Atria's structured brief, as a placeholder (product, who it's for, goal, tone).
                  placeholder={'Product: what it is and what makes it different\nWho it\'s for: the people you want to reach\nGoal: what the ad should get people to do\nTone: how it should sound'}
                  value={brief}
                  onChange={(e) => setDraft(e.target.value)}
                  autoSize={{ minRows: 3, maxRows: 7 }}
                  autoFocus={mode === 'write'}
                  aria-label="Ad brief"
                />
                {mode === 'write' && prefilled && <span className="brief-foot">Filled in from the suggestions you picked. Change anything you like.</span>}
                {mode === 'filled' && saved && <span className="brief-foot">Saved for {creative.product}. Used for every variation of this product.</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Product images (I2). */}
        <div className="dlg-field">
          <span className="dlg-field-label">Product images</span>
          <div className="img-tiles">
            <AnimatePresence initial={false}>
              {images.map((s) => (
                <motion.div
                  key={s}
                  className="img-tile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: duration.base } }}
                  exit={{ opacity: 0, transition: { duration: duration.instant } }}
                >
                  {s.startsWith('blob:') ? <img src={s} alt="Product" /> : <Thumb c={{ img: s, media: 'Image', name: 'Product image' }} size={64} />}
                  <button className="img-remove" aria-label="Remove image" onClick={() => setImages((p) => p.filter((x) => x !== s))}>
                    <CloseOutlined />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {images.length < 4 && (
              // 285 (Mancini 19:28): a plus only; the label was crowding the tile. The name stays for screen readers, no tooltip (clear icon).
              <button className="img-tile add" aria-label="Add image" onClick={() => file.current?.click()}>
                <PlusOutlined />
              </button>
            )}
            <input ref={file} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => addFile(e.target.files?.[0])} />
          </div>
          {/* S-71: help sits under the field. */}
          {uploadError ? <span className="field-error">{uploadError}</span> : <span className="t-help">Up to 4. PNG or JPG, under 5{'\u00a0'}MB each.</span>}
        </div>
          </div>
        </section>

        <section className="dlg-group">
          <h5 className="dlg-group-label">Style</h5>
          <div className="dlg-group-fields">
        {/* Brand row (I5, I7): prefilled, inline, no modal. */}
        <div className="dlg-field">
          <span className="dlg-field-label">Brand</span>
          {/* S-72: a read-only value is a fill box, not a disabled field. */}
          <div className="dlg-readonly brand-row">
          {brand ? (
            <span className="brand-value">
              <span className="swatches">
                {brand.colors.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <span>
                {brand.name} · {brand.colors.length} colors · {brand.font}
              </span>
              {/* G7 (R-C): use crisp default buttons on the dark panel so actions are legible and unmistakably clickable. */}
              <Button type={panel ? 'default' : 'link'} size="small" className={panel ? undefined : 'inline-link'} onClick={() => message.info({ content: "In the live product, this opens Brands. It's not part of this prototype.", key: 'brand' })}>
                Change
              </Button>
            </span>
          ) : (
            <span className="brand-value">
              <span className="muted">No brand linked to this ad account</span>
              <Button size="small" onClick={() => message.info({ content: "In the live product, this opens Brands. It's not part of this prototype.", key: 'brand' })}>
                Link a brand
              </Button>
              <span className="muted small block-sm">Colors and fonts come from the brand</span>
            </span>
          )}
          </div>
        </div>

        {/* Output (I3, I4). */}
        <div className="dlg-grid">
          <label className="dlg-field">
            <span className="dlg-field-label">Size</span>
            <Select value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s.value, label: s.label }))} />
            {size === defaultSize && (
              <span className="t-help">
                Set to {top.label}, where this ad spends most ({Math.round(top.share * 100)}%)
              </span>
            )}
          </label>
          <label className="dlg-field">
            <span className="dlg-field-label">Creatives per suggestion</span>
            <Select value={perRec} onChange={setPerRec} options={[2, 4, 6, 8].map((n) => ({ value: n, label: n }))} />
          </label>
        </div>
          </div>
        </section>
      </div>

      {quota.live && quota.left === 0 && (
        // L-163: the demo's daily cap for live Gemini images.
        <div className="demo-banner" role="status">
          <span className="demo-banner-tag">Demo</span>
          <span>This prototype makes 10 live images a day, and they're used up. New creatives use sample images until tomorrow.</span>
        </div>
      )}
      <footer className="dlg-foot">
        <div className="dlg-sum">
          <span>
            {plural(recCount, 'suggestion')} × {perRec} = <b><Rolling value={total} /> creatives</b>
          </span>
          <span className="t-help">
            Uses <Rolling value={cost} /> of {credits.toLocaleString('en-US')}{'\u00a0'}credits
          </span>
          {/* 5c A-22, A-23: one hint, under the total, instead of a tooltip plus a floating line. */}
          {!ready && <span className="t-help dlg-need">Add a brief to continue</span>}
        </div>
        <div className="dlg-actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
              type="primary"
              disabled={!ready || cost > credits}
              onClick={() => {
                if (mode === 'write') setBrief(creative.product, brief);
                onCreate({ perRec, size });
              }}
            >
              Generate {total} creatives
            </Button>
        </div>
      </footer>
    </div>
  );
}

/** Screen 3. Desktop: modal. Mobile: full-screen sheet. */
export function CreateDialog({
  open,
  mobile,
  creative,
  recCount,
  picked,
  onClose,
  onCreate,
  onRemove,
}: {
  onRemove?: (id: string) => void;
  picked?: Recommendation[];
  open: boolean;
  mobile: boolean;
  creative: Creative;
  recCount: number;
  onClose: () => void;
  onCreate: (s: CreateSettings) => void;
}) {
  // Remount on open so the brief state reflects what's saved now.
  const [n, setN] = useState(0);
  useEffect(() => {
    if (open) setN((x) => x + 1);
  }, [open]);
  const body = <Body key={n} creative={creative} recCount={recCount} picked={picked} onCancel={onClose} onCreate={onCreate} onRemove={onRemove} />;
  if (mobile)
    return (
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        size="large"
        styles={{ wrapper: { height: 'auto', maxHeight: '92svh' } }}
        title="Generate new creatives"
        className="sheet-drawer create-sheet"
        destroyOnHidden
      >
        {body}
      </Drawer>
    );
  return (
    <Modal open={open} onCancel={onClose} title="Generate new creatives" footer={null} width={600} className="create-modal" destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}>
        {body}
      </motion.div>
    </Modal>
  );
}
