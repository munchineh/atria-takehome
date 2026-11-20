import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, App, Breadcrumb, Button, Empty, Grid, Input, Modal, Segmented, Tag, Tooltip } from 'antd';
import {
  BranchesOutlined,
  DeleteOutlined,
  DislikeFilled,
  DislikeOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  LikeFilled,
  LikeOutlined,
} from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, plural, recommendationsFor, short, type AdCopy } from '../data/mock';
import { findCreative, useStore } from '../data/store';
import { CHIPS, REASONS, STYLIZED, ratioFor, TAG_TIPS, predictedCtr, promptFor, tagsFor, type Version } from '../data/variations';
import { AdArt } from '../components/Thumb';
import { duration, ease, fadeUp, pageTransition, spring } from '../motion/tokens';

const TEXT_FIELDS: { key: keyof AdCopy; label: string }[] = [
  { key: 'head', label: 'Headline' },
  { key: 'price', label: 'Price' },
  { key: 'band', label: 'Body' },
  { key: 'cta', label: 'Button' },
];

/** D2-01 / D2-02: always says "Predicted" (P8). */
export function PredictedTag({ id }: { id: string }) {
  const g = predictedCtr(id);
  return (
    <Tooltip title="An estimate from how similar ads performed in this account. Not a guarantee.">
      <Tag className={`predicted p-${g}`}>Predicted CTR: {g}</Tag>
    </Tooltip>
  );
}

/**
 * Screen 7: the editor (E1 to E6, O3, O4, G5). Route #/ad/:id/variations/:vid?round=.
 * Iterate forward: every change adds a version; changing an older version or the prompt
 * makes a new variation, so nothing is ever overwritten.
 */
export function Editor() {
  const { id, vid } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const { message } = App.useApp();
  const c = findCreative(id) ?? CREATIVES[0];
  const { jobsFor, versionsOf, applyChange, saveText, branch, deleteVariation, credits } = useStore();
  const job = jobsFor(c.id).find((j) => j.variations.some((v) => v.id === vid));
  const v = job?.variations.find((x) => x.id === vid);

  const versions: Version[] = v ? versionsOf(v) : [];
  const latest = versions.at(-1);
  const [sel, setSel] = useState<number | null>(null);
  const shown = versions.find((x) => x.n === sel) ?? latest;
  const onOlder = !!shown && !!latest && shown.n !== latest.n;
  const applying = latest?.state === 'applying';

  const [ask, setAsk] = useState('');
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [textMode, setTextMode] = useState<'editable' | 'stylized'>('editable');
  const [editing, setEditing] = useState(params.get('text') === '1');
  const [draft, setDraft] = useState<AdCopy | undefined>(undefined);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // A new variation or new version: follow the latest one.
  useEffect(() => {
    setSel(null);
    setTextMode('editable');
  }, [vid]);
  useEffect(() => {
    if (latest) setSel(null);
  }, [latest?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    strip.current?.scrollTo({ left: strip.current.scrollWidth, behavior: 'smooth' });
  }, [versions.length]);
  useEffect(() => {
    if (v) setPrompt(promptFor(v, c.product));
  }, [v?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (editing && shown) setDraft(shown.copy ? { ...shown.copy } : undefined);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const recs = useMemo(() => recommendationsFor(c), [c]);
  const rec = recs.find((r) => r.id === v?.recId) ?? recommendationsFor(findCreative('mm-1090245')!).find((r) => r.id === v?.recId);

  if (!job || !v || !shown || !latest)
    return (
      <div className="page">
        <Empty description={<b>This variation was deleted</b>}>
          <Button type="primary" onClick={() => nav(`/ad/${c.id}/variations`)}>
            View variations
          </Button>
        </Empty>
      </div>
    );

  const back = `/ad/${c.id}/variations?round=${job.id}`;
  const parent = v.from ? job.variations.find((x) => x.id === v.from!.id) : undefined;
  const cost = ACCOUNT.creditsPerImage;
  const costLine = `Uses ${cost} of ${credits.toLocaleString()} credits`;
  const typoNow = shown.n === 1 && v.typo && shown.copy?.head.includes(v.typo) ? v.typo : undefined;
  const fixedTypo = typoNow ? typoNow.replace(/(.)\1(?!.*\1\1)/, '$1') : '';
  const stylizedSlot = !v.stylized ? STYLIZED[shown.img] ?? STYLIZED[v.img] : undefined;
  const preview = textMode === 'stylized' && stylizedSlot ? { img: stylizedSlot, copy: undefined } : editing && draft ? { img: shown.img, copy: draft } : shown;
  const canvasVersion = applying && !onOlder ? versions.at(-2) ?? shown : shown;

  const go = (nid: string) => nav(`/ad/${c.id}/variations/${nid}?round=${job.id}`);
  const apply = (instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    const out = applyChange(job.id, v, shown.n, text);
    setAsk('');
    setRating(null);
    if (out !== v.id) {
      message.success({ content: `New variation from v${shown.n}`, duration: 3 });
      go(out);
    }
  };
  const chip = (label: string) => {
    if (label === 'Fix the text' && !v.stylized) {
      setTextMode('editable');
      setEditing(true);
      return;
    }
    setAsk(label);
    input.current?.focus();
  };
  const reason = (r: (typeof REASONS)[number]) => {
    if (r.fill === null) chip('Fix the text');
    else {
      setAsk(r.fill);
      input.current?.focus();
    }
  };

  const canvas = (
    <div className="ed-canvas">
      <div className="ed-art">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${textMode}-${canvasVersion.n}-${editing ? 'e' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.base, ease: ease.standard } }}
            exit={{ opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
          >
            <AdArt
              slot={textMode === 'stylized' ? preview.img : editing ? shown.img : canvasVersion.img}
              copy={textMode === 'stylized' ? undefined : editing ? draft : canvasVersion.copy}
              typo={textMode === 'editable' && !editing && canvasVersion.n === 1 ? v.typo : undefined}
              ratio={ratioFor(textMode === 'stylized' ? preview.img : canvasVersion.img)}
              alt={`${v.angle} variation, v${canvasVersion.n}`}
            />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {applying && !onOlder && (
            <motion.div className="ed-applying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: duration.fast } }}>
              <span>Applying your change</span>
            </motion.div>
          )}
        </AnimatePresence>
        {textMode === 'stylized' && <span className="ed-preview-label">Preview</span>}
      </div>

      <div className="filmstrip" ref={strip} role="listbox" aria-label="Versions">
        {versions.map((x) => (
          <motion.button
            key={x.n}
            role="option"
            aria-selected={x.n === shown.n}
            className={`film ${x.n === shown.n ? 'on' : ''} ${x.state}`}
            onClick={() => x.state === 'ready' && setSel(x.n === latest.n ? null : x.n)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: duration.base } }}
          >
            <span className="film-img">
              {x.state === 'applying' ? <i className="film-skeleton" /> : <AdArt slot={x.img} copy={x.copy} ratio={ratioFor(x.img)} alt={`v${x.n}`} />}
            </span>
            <span className="film-cap">
              <b>v{x.n}</b> <span className="muted">{x.state === 'applying' ? 'Applying your change' : x.caption}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const textBlock = (
    <section className="ed-block">
      <div className="ed-block-head">
        <b>Text</b>
        {stylizedSlot && (
          <Segmented
            size="small"
            value={textMode}
            onChange={(m) => {
              setTextMode(m as typeof textMode);
              setEditing(false);
            }}
            options={[
              { value: 'editable', label: 'Editable text' },
              { value: 'stylized', label: 'Stylized text' },
            ]}
          />
        )}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {v.stylized ? (
          <motion.div key="baked" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            <Tag className="wrap-tag">Text is part of the image. Edits create a new variation.</Tag>
            <Button block onClick={() => apply('Regenerate the text')} disabled={applying}>
              Regenerate · uses {cost} credits
            </Button>
          </motion.div>
        ) : textMode === 'stylized' ? (
          <motion.div key="styl" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            <Tag className="wrap-tag">Text is part of the image. Edits create a new variation.</Tag>
            <p className="t-help">Richer type, but a typo or a price change means a new image. Editable text stays free to change.</p>
            <Button
              block
              onClick={() => {
                const nid = branch(job.id, v, 'stylized', '');
                message.success({ content: 'Creating a stylized-text variation', duration: 3 });
                go(nid);
              }}
            >
              Create stylized variation
            </Button>
            <span className="muted small">{costLine}</span>
          </motion.div>
        ) : editing && draft ? (
          <motion.div key="edit" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            {TEXT_FIELDS.filter((f) => draft[f.key] !== undefined || f.key === 'band').map((f) => {
              const val = (draft[f.key] as string | undefined) ?? '';
              const bad = f.key === 'head' && typoNow && val.includes(typoNow);
              return (
                <label key={f.key} className="ed-field">
                  <span className="small">{f.label}</span>
                  <Input
                    value={val}
                    status={bad ? 'warning' : undefined}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value || (f.key === 'band' ? undefined : '') })}
                  />
                  {bad && (
                    <span className="small warn-line">
                      May contain a typo: {typoNow}.{' '}
                      <a onClick={() => setDraft({ ...draft, head: val.replace(typoNow!, fixedTypo) })}>Change to {fixedTypo}</a>
                    </span>
                  )}
                </label>
              );
            })}
            <span className="t-help">Text edits don't use credits</span>
            <div className="row-gap">
              <Button
                type="primary"
                disabled={applying}
                onClick={() => {
                  saveText(v, draft);
                  setEditing(false);
                  message.success({ content: `Saved as v${versions.length + 1}`, duration: 2 });
                }}
              >
                Save text
              </Button>
              <Button onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            <div className="ed-text-sum small">
              {shown.copy ? [shown.copy.head, shown.copy.price, shown.copy.band, shown.copy.cta].filter(Boolean).join(' · ') : 'No text'}
            </div>
            {typoNow && (
              <span className="small warn-line">
                <ExclamationCircleOutlined /> The headline may contain a typo: {typoNow}
              </span>
            )}
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)} disabled={onOlder} className="self-start">
              Edit text
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

  const changeBlock = (
    <section className="ed-block">
      <AnimatePresence initial={false}>
        {rating === 'down' && (
          <motion.div key="why" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-reasons">
            <span className="t-label">What's wrong?</span>
            <div className="chips">
              {REASONS.map((r) => (
                <button key={r.label} className="chip" onClick={() => reason(r)}>
                  {r.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <label className="ed-field">
        <b>What should change?</b>
        <Input.TextArea
          ref={input as never}
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          placeholder="e.g. Make the headline shorter"
          autoSize={{ minRows: 2, maxRows: 5 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              apply(ask);
            }
          }}
        />
      </label>
      <div className="chips">
        {CHIPS.map((ch) => (
          <button key={ch} className="chip" onClick={() => chip(ch)}>
            {ch}
          </button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {onOlder && (
          <motion.div key="older" variants={fadeUp} initial="hidden" animate="show" exit="exit">
            <Alert
              type="info"
              showIcon
              icon={<BranchesOutlined />}
              message={`You're on v${shown.n}. A change here makes a new variation, and v${latest.n} stays as it is.`}
              action={
                <Button size="small" type="link" onClick={() => setSel(null)}>
                  Go to v{latest.n}
                </Button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
      {!mobile && (
        <div className="ed-apply">
          <span className="muted small">{costLine}</span>
          <Button type="primary" disabled={!ask.trim() || (applying && !onOlder)} onClick={() => apply(ask)}>
            {onOlder ? `New variation from v${shown.n}` : 'Apply change'}
          </Button>
        </div>
      )}
    </section>
  );

  const promptBlock = (
    <section className="ed-block">
      <button className="link-btn" onClick={() => setPromptOpen((o) => !o)} aria-expanded={promptOpen}>
        {promptOpen ? 'Hide prompt' : 'Show prompt'}
      </button>
      <AnimatePresence initial={false}>
        {promptOpen && (
          <motion.div
            key="prompt"
            className="ed-stack"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: { height: spring.layout, opacity: { duration: duration.fast } } }}
            exit={{ opacity: 0, height: 0, transition: { height: { duration: duration.base, ease: ease.exit }, opacity: { duration: duration.instant } } }}
          >
            <span className="t-label">Image prompt</span>
            <Input.TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} autoSize={{ minRows: 4, maxRows: 9 }} />
            <span className="muted small">Brief v1 · saved for {c.product}</span>
            {prompt !== promptFor(v, c.product) && (
              <div className="row-gap wrap">
                <Button
                  onClick={() => {
                    const nid = branch(job.id, v, 'prompt', prompt);
                    message.success({ content: `New variation from v${latest.n}`, duration: 3 });
                    go(nid);
                  }}
                >
                  Create new variation
                </Button>
                <span className="muted small">{costLine}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

  const tags = tagsFor(v.angle);
  const tagBlock = (
    <section className="ed-block">
      <span className="t-label">How Atria reads this image</span>
      <div className="ed-tags">
        {Object.entries(tags).map(([k, val]) => (
          <div key={k} className="ed-tag-row small">
            <Tooltip title={TAG_TIPS[k]}>
              <span className="muted dotted">{k}</span>
            </Tooltip>
            <Tag>{val}</Tag>
          </div>
        ))}
      </div>
      <button className="link-btn small" onClick={() => message.success('Thanks for the feedback')}>
        Report a wrong tag
      </button>
    </section>
  );

  return (
    <motion.div {...pageTransition} className="page editor">
      <div className="detail-head">
        <Breadcrumb
          items={[
            ...(c.project
              ? [{ title: <Link to="/creation">Image ads</Link> }]
              : [{ title: <Link to="/">Radar</Link> }, { title: <Link to={`/ad/${c.id}`}>{short(c.name, mobile ? 10 : 22)}</Link> }]),
            { title: <Link to={back}>Variations</Link> },
            { title: v.angle },
          ]}
        />
      </div>

      <div className="ed-head">
        <div className="ed-title">
          <h3>{v.angle}</h3>
          <div className="row-gap wrap small">
            {rec && <span className="muted">Fixes: {rec.issue} ({rec.target})</span>}
            <PredictedTag id={v.id} />
            {v.from && (
              <Tag icon={<BranchesOutlined />} className="from-tag">
                {v.from.how === 'stylized' ? 'Stylized text from' : 'New variation from'} v{v.from.v}
                {parent ? (
                  <>
                    {' '}
                    of <a onClick={() => go(parent.id)}>{v.from.angle}</a>
                  </>
                ) : null}
              </Tag>
            )}
            {v.launched && <Tag color="default">Paused in Meta</Tag>}
          </div>
        </div>
        <div className="ed-tools">
          <Tooltip title="Good result">
            <Button
              type="text"
              aria-label="Good result"
              aria-pressed={rating === 'up'}
              icon={rating === 'up' ? <LikeFilled /> : <LikeOutlined />}
              onClick={() => setRating(rating === 'up' ? null : 'up')}
            />
          </Tooltip>
          <Tooltip title="Bad result">
            <Button
              type="text"
              aria-label="Bad result"
              aria-pressed={rating === 'down'}
              icon={rating === 'down' ? <DislikeFilled /> : <DislikeOutlined />}
              onClick={() => {
                const next = rating === 'down' ? null : 'down';
                setRating(next);
                // Mobile: the reasons sit in the panel below the image, so bring them into view.
                if (next && mobile) setTimeout(() => document.querySelector('.ed-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
              }}
            />
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={() => message.success(`Downloaded v${shown.n}`)}>
            {mobile ? '' : 'Download'}
          </Button>
          <Button danger type="text" icon={<DeleteOutlined />} onClick={() => setConfirmDelete(true)} aria-label="Delete variation">
            {mobile ? '' : 'Delete variation'}
          </Button>
        </div>
      </div>

      <div className="ed-grid">
        {canvas}
        <aside className="ed-panel panel">
          <h4 className="ed-panel-title">Refine</h4>
          {changeBlock}
          {textBlock}
          {promptBlock}
          {tagBlock}
        </aside>
      </div>

      {mobile && (
        <>
          <div className="sticky-spacer" />
          <motion.div className="sticky-bar" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1, transition: spring.gentle }}>
            <div className="sticky-summary">
              <span className="small">{costLine}</span>
            </div>
            <Button type="primary" block disabled={!ask.trim() || (applying && !onOlder)} onClick={() => apply(ask)}>
              {onOlder ? `New variation from v${shown.n}` : 'Apply change'}
            </Button>
          </motion.div>
        </>
      )}

      <Modal
        open={confirmDelete}
        title="Delete this variation?"
        okText="Delete variation"
        cancelText="Keep it"
        okButtonProps={{ danger: true }}
        onCancel={() => setConfirmDelete(false)}
        onOk={() => {
          deleteVariation(job.id, v.id);
          setConfirmDelete(false);
          message.success({ content: 'Variation deleted', duration: 2 });
          nav(back);
        }}
      >
        {versions.length > 1 ? `Its ${plural(versions.length, 'version')} are deleted too. This can't be undone.` : "This can't be undone."}
      </Modal>
    </motion.div>
  );
}
