import { useEffect, useRef, useState } from 'react';
import { App, Button, Drawer, Input, Modal, Select } from 'antd';
import { CloseOutlined, EditOutlined, LinkOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
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
  onCancel,
  onCreate,
  panel = false,
}: {
  creative: Creative;
  recCount: number;
  onCancel: () => void;
  onCreate: (s: CreateSettings) => void;
  /** Rendered inside the expanding action bar (Mancini's "morphing" reference, 20 Nov 17:59). */
  panel?: boolean;
}) {
  const { briefs, setBrief, credits, lastSettings } = useStore();
  const { message } = App.useApp();
  const account = accountOf(creative);
  const brand = 'brand' in account ? account.brand : null;
  const saved = briefs[creative.product];
  const [mode, setMode] = useState<BriefMode>(saved ? 'filled' : 'empty');
  const [brief, setDraft] = useState(saved ?? '');
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

  const readPage = () => {
    setMode('reading');
    setTimeout(() => {
      if (!/^(https?:\/\/)?[\w-]+\.[\w.]+/.test(url.trim())) return setMode('error');
      const text = draftFromPage(creative.product);
      setDraft(text);
      setBrief(creative.product, text);
      setMode('filled');
    }, 1400);
  };

  const addFile = (f?: File) => {
    if (!f) return;
    if (images.length >= 4) return setUploadError('You can add up to 4 images');
    if (!/image\/(png|jpe?g)/.test(f.type)) return setUploadError('Use a PNG or JPG file');
    if (f.size > 5 * 1024 * 1024) return setUploadError('That file is over 5 MB');
    setUploadError('');
    setImages((p) => [...p, URL.createObjectURL(f)]);
  };

  return (
    <div className={`dlg ${panel ? 'dlg-panel' : ''}`}>
      <div className="dlg-scroll">
        {panel && <h4 className="dlg-panel-title">Create variations</h4>}
        <p className="dlg-sub muted">
          For <b className="ink">{creative.name}</b> · {plural(recCount, 'suggestion')}
        </p>

        {/* Brand row (I5, I7): prefilled, inline, no modal. */}
        <section className="dlg-row brand-row">
          <span className="dlg-label">Brand</span>
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
              <Button type="link" size="small" className="inline-link" onClick={() => message.info({ content: 'Brands open in a new tab.', key: 'brand' })}>
                Change
              </Button>
            </span>
          ) : (
            <span className="brand-value">
              <span className="muted">No brand linked to this ad account</span>
              <Button size="small" onClick={() => message.info({ content: 'Brands open in a new tab.', key: 'brand' })}>
                Link a brand
              </Button>
              <span className="muted small block-sm">Colors and fonts come from the brand</span>
            </span>
          )}
        </section>

        {/* Ad brief (I1). */}
        <section className="dlg-block">
          <div className="dlg-label">Ad brief</div>
          <AnimatePresence mode="wait" initial={false}>
            {(mode === 'empty' || mode === 'url' || mode === 'reading' || mode === 'error') && !saved ? (
              <motion.div key="starts" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="brief-starts">
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
                  <span className="t-help">Cover the product, who it's for, the goal and the tone</span>
                  <Button icon={<EditOutlined />} onClick={() => setMode('write')}>
                    Write it yourself
                  </Button>
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
                  <Button type="text" onClick={() => setMode('filled')}>
                    Cancel
                  </Button>
                </span>
              </motion.div>
            ) : (
              <motion.div key="field" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="brief-field">
                <span className="t-help">Cover the product, who it's for, the goal and the tone</span>
                <Input.TextArea
                  value={brief}
                  onChange={(e) => setDraft(e.target.value)}
                  autoSize={{ minRows: 3, maxRows: 7 }}
                  autoFocus={mode === 'write'}
                  aria-label="Ad brief"
                />
                {mode === 'filled' && saved && (
                  <span className="t-help">
                    Saved for {creative.product}. Used for every variation of this product.{' '}
                    <Button type="link" size="small" className="inline-link" onClick={() => setMode('url')}>
                      Rewrite from a product page
                    </Button>
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Product images (I2). */}
        <section className="dlg-block">
          <div className="dlg-label">Product images</div>
          <span className="t-help">Up to 4. PNG or JPG, under 5 MB each</span>
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
              <button className="img-tile add" onClick={() => file.current?.click()}>
                <PlusOutlined />
                <span>Add image</span>
              </button>
            )}
            <input ref={file} type="file" accept="image/png,image/jpeg" hidden onChange={(e) => addFile(e.target.files?.[0])} />
          </div>
          {uploadError && <span className="field-error">{uploadError}</span>}
        </section>

        {/* Output (I3, I4). */}
        <section className="dlg-grid">
          <label className="dlg-block">
            <span className="dlg-label">Size</span>
            <Select value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s.value, label: s.label }))} />
            {size === defaultSize && (
              <span className="t-help">
                Set to {top.label}, where this ad spends most ({Math.round(top.share * 100)}%)
              </span>
            )}
          </label>
          <label className="dlg-block">
            <span className="dlg-label">Variations per suggestion</span>
            <Select value={perRec} onChange={setPerRec} options={[2, 4, 6, 8].map((n) => ({ value: n, label: n }))} />
          </label>
        </section>
      </div>

      <footer className="dlg-foot">
        <div className="dlg-sum">
          <span>
            {plural(recCount, 'suggestion')} × {perRec} = <b><Rolling value={total} /> variations</b>
          </span>
          <span className="t-help">
            Uses <Rolling value={cost} /> of {credits.toLocaleString()} credits
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
              Create {total} variations
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
  onClose,
  onCreate,
}: {
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
  const body = <Body key={n} creative={creative} recCount={recCount} onCancel={onClose} onCreate={onCreate} />;
  if (mobile)
    return (
      <Drawer open={open} onClose={onClose} placement="bottom" height="100%" title="Create variations" className="sheet-drawer" destroyOnHidden>
        {body}
      </Drawer>
    );
  return (
    <Modal open={open} onCancel={onClose} title="Create variations" footer={null} width={600} className="create-modal" destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: duration.fast, ease: ease.standard } }}>
        {body}
      </motion.div>
    </Modal>
  );
}
