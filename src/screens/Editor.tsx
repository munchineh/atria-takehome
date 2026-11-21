import { useQuota } from '../data/live';
import { MadeFromIcon } from '../components/Icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Dropdown, Empty, Grid, Input, Modal, Segmented, Tag, Tooltip } from 'antd';
import {
  CopyPlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EllipsisOutlined,
  ExclamationCircleOutlined,
  FontSizeOutlined,
  LockOutlined, SmileOutlined, BulbOutlined, TagOutlined, DownOutlined, WarningFilled, ExclamationCircleFilled } from '../components/AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, METRIC_META, plural, recommendationsFor, type AdCopy, type MetricKey } from '../data/mock';
import { accountOf, findCreative, useStore } from '../data/store';
import { hubCrumb, useWorkspace } from '../data/nav';
import { leave, setLeaveGuard } from '../data/leaveGuard';
import { nameOf, CHIPS, REASONS, STYLIZED, ratioFor, TAG_TIPS, predictedCtr, promptFor, tagsFor, type Version } from '../data/variations';
import { AdArt, Thumb } from '../components/Thumb';
import { duration, ease, fadeUp, pageTransition, spring } from '../motion/tokens';
import { ReportAudience } from '../components/ReportAudience';
import { Rating } from '../components/Rating';
import { PageHeader } from '../components/PageHeader';
import { SectionHead } from '../components/SectionHead';

const NAME_HINT = 'For example, Gift box reveal';
const TEXT_FIELDS: { key: keyof AdCopy; label: string }[] = [
  { key: 'head', label: 'Headline' },
  { key: 'price', label: 'Price' },
  { key: 'band', label: 'Body' },
  { key: 'cta', label: 'Button' },
];

/** D2-01 / D2-02: always says "Predicted" (P8, S-16). */
export function PredictedTag({ id, bare }: { id: string; bare?: boolean }) {
  const g = predictedCtr(id);
  const tag = (
    <Tooltip title="Atria's estimate of this image's CTR. It's based on how similar ads did in this account. It can be lower than the original's, which is a sign to refine before you launch.">
      <Tag className={`predicted grade-tag g-${g}`}>{g}</Tag>
    </Tooltip>
  );
  if (bare) return tag;
  return (
    <span className="kv">
      <span className="kv-k">Predicted CTR</span> {tag}
    </span>
  );
}

/**
 * Editor (S-01 to S-92):
 * Focal point: creative canvas preview. Single primary action: Apply change (or Save text when editing text, Iterate when locked).
 */
export function Editor() {
  const { id, vid } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const ws = useWorkspace();
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const { message, modal } = App.useApp();
  const c = findCreative(id) ?? CREATIVES[0];
  const { jobsFor, versionsOf, applyChange, branch, deleteVariation, credits, iterate, restoreVersion, commitVersion, commitVariation, renameCreative } = useStore();
  const job = jobsFor(c.id).find((j) => j.variations.some((v) => v.id === vid));
  const v = job?.variations.find((x) => x.id === vid);

  const versions: Version[] = v ? versionsOf(v) : [];
  const latest = versions.at(-1);
  const [sel, setSel] = useState<number | null>(null);
  const shown = versions.find((x) => x.n === sel) ?? latest;
  const onOlder = !!shown && !!latest && shown.n !== latest.n;
  const applying = latest?.state === 'applying';

  const quota = useQuota();
  const [ask, setAsk] = useState('');
  const [makeNew, setMakeNew] = useState(params.get('new') === '1');
  const [reportedTags, setReportedTags] = useState<string[]>([]);
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [textMode, setTextMode] = useState<'editable' | 'stylized'>('editable');
  const [styleNote, setStyleNote] = useState('');
  // Mancini 15:20: the panel asks three things in order: save as, what to change, and for text, how.
  const [scope, setScope] = useState<'image' | 'text'>(params.get('text') === '1' ? 'text' : 'image');
  const [editing, setEditing] = useState(params.get('text') === '1');
  const [draft, setDraft] = useState<AdCopy | undefined>(undefined);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** 265: a version picked to restore. It becomes current only once the designer saves. */
  const [restoring, setRestoring] = useState<number | null>(null);
  // 266 (Mancini 18:24): changes stay pending until Save. `base` is the version the page opened on; anything after it,
  // and typed text not yet saved, is unsaved. Leaving with unsaved changes asks first.
  const [base, setBase] = useState<number | null>(null);
  /** 273 (Mancini 19:07): the creative's name, edited at the top of the panel and saved with everything else. */
  const [nameDraft, setNameDraft] = useState('');
  const [leaveTo, setLeaveTo] = useState<(() => void) | null>(null);
  const askLeave = useCallback((go: () => void) => setLeaveTo(() => go), []);
  const strip = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSel(null);
    setTextMode('editable');
    setBase(latest?.n ?? null);
    setNameDraft(v ? nameOf(v) : '');
  }, [vid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (latest) setSel(null);
    setRestoring(null);
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
  // 250: a variation can answer more than one suggestion; the extra ones are listed after the main one.
  const extraRecs = (v?.alsoRecIds ?? []).map((id) => recs.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
  const recMetricKey: MetricKey | null = rec ? ({ CPA: 'conversion', CTR: 'ctr', Hook: 'hook' } as Record<string, MetricKey>)[rec.target] ?? null : null;
  const recGrade = recMetricKey ? c.grades[recMetricKey] : null;
  const recMeta = recMetricKey ? METRIC_META[recMetricKey] : null;
  const recValKey = recMetricKey ? ({ conversion: 'cpa', ctr: 'ctr', hook: 'hookRate', retention: 'retention' } as const)[recMetricKey] : null;
  const recVal =
    recMeta && recValKey && c.values[recValKey] != null
      ? recMeta.unit(c.values[recValKey]!)
      : rec?.target === 'ROAS'
        ? (c.roas ?? 0).toFixed(2)
        : null;
  const recAvg = recMeta ? recMeta.unit(accountOf(c).avg[recMeta.avgKey]) : null;
  const recMetricLabel = rec ? (rec.target === 'Hook' ? 'Hook rate' : rec.target) : '';

  if (!job || !v || !shown || !latest) {
    return (
      <div className="page">
        <Empty description={<strong>This variation was deleted</strong>}>
          <Button type="primary" onClick={() => nav(ws.roundPath(c.id))}>
            View variations
          </Button>
        </Empty>
      </div>
    );
  }

  const back = ws.inCreation ? `/creation/${c.id}/${v.id}` : ws.roundPath(c.id, job.id);
  const locked = Boolean(v.launched);
  const parent = v.from ? job.variations.find((x) => x.id === v.from!.id) : undefined;
  const cost = ACCOUNT.creditsPerImage;
  const costLine = `Uses ${cost} of ${credits.toLocaleString('en-US')}\u00a0credits${quota.live && quota.left === 0 ? '\u00a0· sample image, live images used up today' : ''}`;
  const typoNow = shown.n === 1 && v.typo && shown.copy?.head.includes(v.typo) ? v.typo : undefined;
  const fixedTypo = typoNow ? typoNow.replace(/(.)\1(?!.*\1\1)/, '$1') : '';
  const stylizedSlot = !v.stylized ? STYLIZED[shown.img] ?? STYLIZED[v.img] : undefined;
  const canStylize = !v.stylized && Boolean(shown.copy);
  const preview =
    textMode === 'stylized' && stylizedSlot ? { img: stylizedSlot, copy: undefined } : editing && draft ? { img: shown.img, copy: draft } : shown;
  const canvasVersion = applying && !onOlder ? versions.at(-2) ?? shown : shown;

  const editPath = (nid: string) => (ws.inCreation ? `/creation/${c.id}/${nid}/edit?round=${job.id}` : ws.editorPath(c.id, nid, job.id));
  const go = (nid: string) => nav(ws.editorPath(c.id, nid, job.id));
  const opened = base ?? latest.n;
  const pendingCount = versions.filter((x) => x.n > opened).length;
  const textDirty = editing && !!draft && JSON.stringify(draft) !== JSON.stringify(shown.copy);
  const nameDirty = nameDraft.trim() !== nameOf(v);
  const onlyName = nameDirty && !pendingCount && !textDirty;
  const dirty = !locked && (pendingCount > 0 || textDirty || nameDirty);
  const saveLabel = onlyName ? 'Save' : makeNew ? 'Save as new variation' : 'Save new version';
  /** Saves pending changes. Returns the new variation's id when saved as a variation. */
  const save = (stay = false) => {
    const copy = textDirty ? draft : undefined;
    setEditing(false);
    setLeaveGuard(null);
    if (onlyName) {
      renameCreative(v.id, nameDraft);
      message.success({ content: 'Name saved', duration: 2 });
      return undefined;
    }
    if (makeNew) {
      const nid = commitVariation(job.id, v, opened, copy);
      if (nameDirty) renameCreative(nid, nameDraft);
      message.success({ content: 'Saved as a new variation', duration: 2 });
      if (!stay) go(nid);
      return nid;
    }
    const n = commitVersion(v, opened, copy);
    if (nameDirty) renameCreative(v.id, nameDraft);
    setBase(n);
    message.success({ content: `Saved as v${n}`, duration: 2 });
    return undefined;
  };
  const discard = () => {
    setNameDraft(nameOf(v));
    if (pendingCount) restoreVersion(v, opened);
    setEditing(false);
    setLeaveGuard(null);
  };
  const apply = (instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    // 266: on the latest version a change is a pending version; Save decides whether it becomes a version or a variation.
    const out = applyChange(job.id, v, shown.n, text, false);
    setAsk('');
    setRating(null);
    if (out !== v.id) {
      message.success({ content: `New variation from v${shown.n}`, duration: 3 });
      go(out);
    }
  };
  const chip = (label: string) => {
    if ((label === 'Edit text' || label === 'Fix the text') && !v.stylized) {
      setScope('text');
      setMakeNew(false);
      setTextMode('editable');
      setEditing(true);
      return;
    }
    setAsk(label);
    input.current?.focus();
  };
  const reason = (r: (typeof REASONS)[number]) => {
    if (r.fill === null) chip('Edit text');
    else {
      setAsk(r.fill);
      input.current?.focus();
    }
  };

  // S-46: omit Angle row when it repeats the creative title.
  const readEntries = Object.entries(tagsFor(v.angle)).filter(([k, val]) => !(k === 'Angle' && val === v.angle));
  const roundLabel = `Round ${Math.max(1, jobsFor(c.id).findIndex((r) => r.id === job.id) + 1)}\u00a0· ${job.date}`;

  const crumbs = ws.inCreation
    ? [
        { title: <Link to="/creation">Creative gallery</Link> },
        { title: <Link to={back}>{nameOf(v)}</Link> },
        // Mancini 13:21: every breadcrumb ends with the current page.
        { title: 'Edit' },
      ]
    : [
        { title: <Link to={hubCrumb().to}>{hubCrumb().label}</Link> },
        { title: <Link to={ws.radarPath(c.id)}>{c.name}</Link> },
        { title: <Link to={back}>{roundLabel}</Link> },
        { title: nameOf(v) },
      ];

  const applyDisabled = !ask.trim() || (applying && !onOlder);

  const canvas = (
    <section className="panel ed-canvas">
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
              copy={
                textMode === 'stylized'
                  ? stylizedSlot
                    ? undefined
                    : shown.copy
                      ? { ...shown.copy, stylized: true }
                      : undefined
                  : editing
                    ? draft
                    : canvasVersion.copy
              }
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
        {textMode === 'stylized' && stylizedSlot && <span className="ed-preview-label">Sample</span>}
      </div>

      <div className="ed-under">
        <div className="ed-meta-row">
          {/* 257 (Mancini 16:28): just the label and the predicted grade. The original's score is in Iteration history. */}
          <span className="ed-predict">
            <span className="ed-predict-label-inline">Predicted CTR</span>
            <PredictedTag id={v.id} bare />
          </span>
          <Rating
            question="Is this result good?"
            onRate={(r) => {
              setRating(r);
              if (r === 'down' && mobile) setTimeout(() => document.querySelector('.ed-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
            }}
          />
        </div>
      </div>
    </section>
  );

  const pickMethod = (m: 'editable' | 'stylized') => {
    setTextMode(m);
    setEditing(false);
    // Typed text is always a new version. Stylized text redraws the image, so it is always a new variation.
    if (!v.stylized) setMakeNew(m === 'stylized');
  };
  const methodNow = v.stylized || textMode === 'stylized' ? 'stylized' : 'editable';
  const textBlock = (
    <div className="ed-step">
      <span className="ed-step-label">How to change the text</span>
      <div className="ed-methods" role="radiogroup" aria-label="How to change the text">
        <button type="button" role="radio" aria-checked={methodNow === 'editable'} disabled={Boolean(v.stylized)} className={`ed-method ${methodNow === 'editable' ? 'on' : ''}`} onClick={() => pickMethod('editable')}>
          <b>Type to edit</b>
          <span className="t-help">
            {v.stylized
              ? "Not available. This creative's text is drawn into the image."
              : 'Free. The text sits on top of the image and stays editable. Saved as a new version.'}
          </span>
        </button>
        <button type="button" role="radio" aria-checked={methodNow === 'stylized'} disabled={!v.stylized && !canStylize} className={`ed-method ${methodNow === 'stylized' ? 'on' : ''}`} onClick={() => pickMethod('stylized')}>
          <b>Stylized with AI</b>
          <span className="t-help">
            {v.stylized
              ? 'Atria redraws the whole image with the new text in it.'
              : "Atria redraws the whole image with the text in it. It looks richer, but words can come out misspelled and you can't type over the text afterwards. Always a new variation."}
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {v.stylized || textMode === 'stylized' ? (
          <motion.div key="styl" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            <div className="ed-text-sum">
              {shown.copy ? [shown.copy.head, shown.copy.price, shown.copy.band, shown.copy.cta].filter(Boolean).join('\u00a0· ') : 'No text'}
            </div>
            {/* Mancini 14:34: stylized text is drawn by the model, so it takes its own short prompt. It is added to
                this variation's prompt and only steers the lettering; the image, product and layout stay as they are. */}
            {!v.stylized && (
              <label className="ed-style-note">
                <span className="t-label">Text style (optional)</span>
                <Input.TextArea value={styleNote} onChange={(e) => setStyleNote(e.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="For example, hand-drawn chalk lettering" maxLength={160} />
                <span className="t-help">This will only adjust the text generated on the image. Choose Whole image to edit the full prompt.</span>
              </label>
            )}
            <div className="ed-text-action">
              <Button
                disabled={applying}
                onClick={() => {
                  if (v.stylized) return apply('Create a new version with updated text');
                  // 235 (Mancini 16:09): confirm first. Once the text is drawn into the image it can't be typed over again.
                  modal.confirm({
                    title: 'Create a stylized variation?',
                    content: (
                      <>
                        <p>Atria draws the text into a new image. You won't be able to change it with Type to edit afterwards.</p>
                        <p>To change the text later, you'll need to create another variation. It uses {cost}{'\u00a0'}credits.</p>
                      </>
                    ),
                    okText: 'Create variation',
                    cancelText: 'Cancel',
                    icon: <ExclamationCircleFilled className="stylize-confirm-icon" />,
                    className: 'stylize-confirm',
                    onOk: () => {
                      const nid = branch(job.id, v, 'stylized', styleNote.trim());
                      message.success({ content: 'Generating a stylized-text variation', duration: 3 });
                      go(nid);
                    },
                  });
                }}
              >
                {v.stylized ? 'Create new version' : 'Create stylized variation'}
              </Button>
              <span className="t-help">{costLine}</span>
            </div>
          </motion.div>
        ) : editing && draft ? (
          <motion.div key="edit" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            {TEXT_FIELDS.filter((f) => draft[f.key] !== undefined || f.key === 'band').map((f) => {
              const val = (draft[f.key] as string | undefined) ?? '';
              const bad = f.key === 'head' && typoNow && val.includes(typoNow);
              return (
                <label key={f.key} className="ed-field">
                  <span className="ed-label">{f.label}</span>
                  <Input
                    value={val}
                    status={bad ? 'warning' : undefined}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value || (f.key === 'band' ? undefined : '') })}
                  />
                  {bad && (
                    // 234 (Mancini 16:08): reads like a keyboard's suggestion bar: an amber icon, "Did you mean", and the fix as one tap.
                    <span className="ed-warn ed-typo">
                      <WarningFilled className="ed-typo-icon" aria-hidden />
                      <span>Did you mean</span>
                      <button type="button" className="ed-typo-fix" aria-label={`Change ${typoNow} to ${fixedTypo}`} onClick={() => setDraft({ ...draft, head: val.replace(typoNow!, fixedTypo) })}>
                        {fixedTypo}
                      </button>
                    </span>
                  )}
                </label>
              );
            })}
            <span className="t-help">Text edits don't use credits</span>
            <div className="ed-text-action">
              <Button onClick={() => setEditing(false)}>Discard text changes</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            <div className="ed-text-sum">
              {shown.copy ? [shown.copy.head, shown.copy.price, shown.copy.band, shown.copy.cta].filter(Boolean).join('\u00a0· ') : 'No text'}
            </div>
            {typoNow && (
              <span className="ed-warn">
                <ExclamationCircleOutlined /> The headline may contain a typo: {typoNow}
              </span>
            )}
            <div className="ed-text-action">
              <Tooltip title={onOlder ? `Switch to v${latest.n} to edit text.` : undefined}>
                <Button icon={<FontSizeOutlined />} onClick={() => setEditing(true)} disabled={onOlder}>
                  Edit text
                </Button>
              </Tooltip>
              <span className="t-help">Free</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const promptBlock = (
    <div className="ed-step ed-prompt">
      <button type="button" className="acc-toggle" onClick={() => setPromptOpen((o) => !o)} aria-expanded={promptOpen}>
        <span>{promptOpen ? 'Hide prompt' : 'Show prompt'}</span>
        <DownOutlined aria-hidden />
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
            <span className="ed-label">Image prompt</span>
            <Input.TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} autoSize={{ minRows: 4, maxRows: 9 }} />
            <span className="t-help">Brief v1{'\u00a0'}· saved for {c.product}</span>
            {prompt !== promptFor(v, c.product) && (
              <div className="ed-text-action">
                <Button
                  onClick={() => {
                    const nid = branch(job.id, v, 'prompt', prompt);
                    message.success({ content: `New variation from v${latest.n}`, duration: 3 });
                    go(nid);
                  }}
                >
                  Create new variation
                </Button>
                <span className="t-help">{costLine}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const changeBlock = (
    <section className="ed-block">
      {/* 273 (Mancini 19:07): no "Refine" heading; the panel starts with the creative's name. */}
      <label className="ed-step ed-name">
        <span className="ed-step-label">Name</span>
        <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} maxLength={60} placeholder={NAME_HINT} />
      </label>
      <AnimatePresence initial={false}>
        {rating === 'down' && (
          <motion.div key="why" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-reasons">
            <span className="t-label">What's wrong?</span>
            <div className="ed-chips">
              {REASONS.map((r) => (
                <button key={r.label} type="button" className="chip" onClick={() => reason(r)}>
                  {r.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {onOlder && (
          <motion.div key="older" variants={fadeUp} initial="hidden" animate="show" exit="exit">
            <Alert
              type="info"
              showIcon
              icon={<MadeFromIcon />}
              title={`You're on v${shown.n}. A change here makes a new variation, and v${latest.n} stays as it is.`}
              action={
                <Button type="link" onClick={() => setSel(null)}>
                  Go to v{latest.n}
                </Button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
      {!onOlder && (
        <div className="ed-step ed-mode">
          <span className="ed-step-label">Save as</span>
          <Segmented
            block
            size={mobile ? 'large' : 'middle'}
            value={makeNew ? 'variation' : 'version'}
            onChange={(val) => {
              setMakeNew(val === 'variation');
              if (!v.stylized) setTextMode(val === 'variation' && canStylize ? 'stylized' : 'editable');
              setEditing(false);
            }}
            options={[
              { label: 'New version', value: 'version' },
              { label: 'New variation', value: 'variation' },
            ]}
          />
          <p className="t-help ed-mode-help">
            {makeNew
              ? 'Makes a new, separate creative and leaves this one as it is. Best for a different idea you want to test against this one. It adds one more creative to manage.'
              : `Saves your changes to this creative as v${opened + 1}. Best for small fixes. It stays one creative, so you can go back to an earlier version but can't test two versions against each other.`}
          </p>
        </div>
      )}
      <div className="ed-step">
        <span className="ed-step-label">What to change</span>
        <Segmented
          block
          size={mobile ? 'large' : 'middle'}
          value={scope}
          onChange={(val) => {
            setScope(val as typeof scope);
            setEditing(false);
          }}
          options={[
            { label: 'Whole image', value: 'image' },
            { label: 'Text only', value: 'text' },
          ]}
        />
      </div>
      {scope === 'image' ? (
        <>
      <label className="ed-field">
        <span className="ed-label">What should change?</span>
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
      <div className="ed-chips">
        {CHIPS.map((ch) => (
          <button key={ch} type="button" className="chip" onClick={() => chip(ch)}>
            {ch}
          </button>
        ))}
      </div>
      {!mobile && (
        <div className="ed-apply">
          <span className="t-help">{costLine}</span>
          <Tooltip title={applyDisabled ? (!ask.trim() ? 'Describe what you want to change first.' : 'Applying your previous change.') : undefined}>
            <Button disabled={applyDisabled} onClick={() => apply(ask)}>
              {onOlder ? `New variation from v${shown.n}` : 'Generate image'}
            </Button>
          </Tooltip>
        </div>
      )}
          {promptBlock}
        </>
      ) : (
        textBlock
      )}
    </section>
  );

  // 265 (Mancini 17:36): History card under the image. Where the creative came from, then its versions; an older
  // version can be restored, which takes a Save and warns that later versions are lost.
  const laterThan = (n: number) => versions.filter((x) => x.n > n);
  const confirmRestore = (n: number) => {
    const lost = laterThan(n);
    modal.confirm({
      title: `Restore v${n}?`,
      icon: <ExclamationCircleFilled />,
      content: `${lost.length === 1 ? `v${lost[0].n} is` : `v${lost[0].n} ${lost.length === 2 ? 'and' : 'to'} v${lost.at(-1)!.n} are`} deleted and v${n} becomes the current version. Variations made from this creative are kept.`,
      okText: 'Save',
      cancelText: 'Cancel',
      onOk: () => {
        restoreVersion(v, n);
        message.success({ content: `Restored v${n}`, duration: 2 });
      },
    });
  };
  const origin = c.project ? (
    <ol className="ed-hist-steps">
      <li className="ed-hist-step">
        <span className="ed-hist-label">Origin</span>
        <b className="ed-hist-text">AI playground</b>
      </li>
    </ol>
  ) : v.from && parent ? (
    <ol className="ed-hist-steps">
      <li className="ed-hist-step">
        <span className="ed-hist-label">Origin</span>
        <Link to={editPath(parent.id)} className="ed-hist-ad">
          <b>Variation of {nameOf(parent)} v{v.from.v}</b>
        </Link>
      </li>
    </ol>
  ) : rec ? (
    <ol className="ed-hist-steps">
            <li className="ed-hist-step">
              <span className="ed-hist-label">Origin</span>
              <Link to={ws.radarPath(c.id)} className="ed-hist-ad">
                <Thumb c={c} size={24} />
                <b>Generated from {c.name}</b>
              </Link>
            </li>
            <li className="ed-hist-step">
              <span className="ed-hist-label">Problem</span>
              <b className="ed-hist-text">{rec.issue}</b>
              <span className="ed-hist-metric">
                <span>{recMetricLabel}</span>
                {recGrade ? (
                  <Tag className={`grade-tag g-${recGrade[0]}`}>{recGrade}</Tag>
                ) : (
                  <Tooltip title={`${recMetricLabel} isn't graded on this account. Radar grades conversion on ${ACCOUNT.conversionMetric}.`}>
                    <Tag className="rec-grade no-grade">No grade</Tag>
                  </Tooltip>
                )}
                {recVal && <span>{recVal}</span>}
                {recAvg && <span className="t-help">Average{'\u00a0'}{recAvg}</span>}
              </span>
              {extraRecs.map((r) => <b key={r.id} className="ed-hist-text">{r.issue}</b>)}
            </li>
            <li className="ed-hist-step">
              <span className="ed-hist-label">{extraRecs.length ? 'Suggestions used' : 'Suggestion used'}</span>
              <b className="ed-hist-text">{rec.fix}</b>
              {extraRecs.map((r) => <b key={r.id} className="ed-hist-text">{r.fix}</b>)}
            </li>
          </ol>
  ) : null;
  const histBlock = (
    <section className="panel ed-history" aria-label="History">
      <SectionHead title="History" />
      {origin}
      <div className="ed-hist-versions">
        <span className="ed-hist-label">Versions</span>
        {versions.length > 1 ? (
          <div className="filmstrip" ref={strip} role="listbox" aria-label="Versions">
            {versions.map((x) => (
              <motion.button
                key={x.n}
                type="button"
                role="option"
                aria-selected={x.n === shown.n}
                className={`film ${x.n === shown.n ? 'on' : ''} ${x.state}`}
                onClick={() => {
                  if (x.state !== 'ready') return;
                  setSel(x.n === latest.n ? null : x.n);
                  setRestoring(null);
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: duration.base } }}
              >
                <span className="film-img">
                  {x.state === 'applying' ? <i className="film-skeleton" /> : <AdArt slot={x.img} copy={x.copy} ratio={ratioFor(x.img)} alt={`v${x.n}`} />}
                </span>
                <span className="film-cap" title={x.caption}>
                  <strong>v{x.n}</strong> <span className="t-help">{x.state === 'applying' ? 'Applying your change' : x.caption}</span>
                </span>
              </motion.button>
            ))}
          </div>
        ) : (
          <span className="t-help">Only v1 so far. Edits saved as a new version show here.</span>
        )}
        {onOlder && (
          <div className="ed-restore">
            {restoring === shown.n ? (
              <>
                <span>v{shown.n} becomes the current version when you save.</span>
                <span className="ed-restore-actions">
                  <Button onClick={() => setRestoring(null)}>Cancel</Button>
                  <Button type="primary" onClick={() => confirmRestore(shown.n)}>
                    Save
                  </Button>
                </span>
              </>
            ) : (
              <>
                <span>Viewing v{shown.n}. The current version is v{latest.n}.</span>
                <Tooltip title={locked ? "This creative runs in an ad, so it can't go back to an earlier version." : undefined}>
                  <Button disabled={locked} onClick={() => setRestoring(shown.n)}>
                    Restore v{shown.n}
                  </Button>
                </Tooltip>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );

  // 265 (Mancini 17:36): Related, in the right panel. Creatives from the same round, and creatives made from an ad that
  // uses this one.
  const variants = job.variations.filter((x) => x.id !== v.id && !x.deleted);
  const relatedFromAds = v.becameCreative ? jobsFor(v.becameCreative).flatMap((j) => j.variations.filter((x) => !x.deleted).map((x) => ({ x, j }))) : [];
  const relThumbs = (items: { x: typeof v; j: typeof job }[]) => (
    <ul className="rel-grid">
      {items.slice(0, 11).map(({ x, j }) => (
        <li key={x.id}>
          <Tooltip title={nameOf(x)}>
            <Link to={j.id === job.id ? editPath(x.id) : `/creation/${j.creativeId}/${x.id}/edit?round=${j.id}`} className="rel-thumb" aria-label={`Open creative ${x.angle}`}>
              <Thumb c={{ img: x.img, media: 'Image', name: x.angle }} size={64} />
            </Link>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
  const relatedBlock = (
    <section className="ed-block ed-related" aria-label="Related">
      <SectionHead title="Related" />
      <div className="rel-sub">
        <span className="rel-sub-title">
          Variant creatives <span className="tab-count">{variants.length}</span>
        </span>
        {variants.length ? relThumbs(variants.map((x) => ({ x, j: job }))) : <p className="t-help">No other creatives were made in this round.</p>}
      </div>
      <div className="rel-sub">
        <span className="rel-sub-title">
          Related creatives <span className="tab-count">{relatedFromAds.length}</span>
        </span>
        {relatedFromAds.length ? relThumbs(relatedFromAds) : <p className="t-help">None yet. Creatives made from an ad that uses this one show here.</p>}
      </div>
    </section>
  );

  const tagBlock = (
    <section className="ed-block">
      <SectionHead title="How Atria reads this image" />
      {/* Mancini 14:35: chips with an icon instead of a key-value table. */}
      <dl className="ed-chips">
        {readEntries.map(([k, val]) => (
          <div key={k} className="ed-chip">
            <Tooltip title={TAG_TIPS[k]}>
              <dt>{k === 'Emotion' ? <SmileOutlined aria-hidden /> : k === 'Theme' ? <BulbOutlined aria-hidden /> : <TagOutlined aria-hidden />}{k}</dt>
            </Tooltip>
            <dd>{val}</dd>
            <ReportAudience
              audience={`${k}: ${val}`}
              label=""
              reported={reportedTags.includes(k)}
              onReported={() => setReportedTags((x) => [...x, k])}
              reasons={["That's not what the image shows", 'Too vague to be useful', 'Something else']}
            />
          </div>
        ))}
      </dl>
    </section>
  );

  return (
    <motion.div {...pageTransition} className="page editor">
      <PageHeader
        crumbs={crumbs}
        title={ws.inCreation ? 'Edit Creative' : nameOf(v)}
        tag={
          locked ? (
            <Tag color="blue" icon={<LockOutlined />}>
              In an ad
            </Tag>
          ) : undefined
        }
        desc={
          locked
            ? "This creative runs in an ad, so it can't get a new version. Make a new variation to change it."
            : 'Change the image or its text, then save it as a new version or a new variation.'
        }
        actions={
          ws.inCreation ? (
            <>
              <Button onClick={() => leave(() => nav(back))}>Done</Button>
              {!locked && (
                <Button type="primary" disabled={!dirty || applying} onClick={() => save()}>
                  {saveLabel}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button icon={<DownloadOutlined />} onClick={() => message.success(`Downloaded v${shown.n}`)}>
                Download
              </Button>
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: 'delete',
                      danger: true,
                      icon: <DeleteOutlined />,
                      label: 'Delete variation',
                      onClick: () => setConfirmDelete(true),
                    },
                  ],
                }}
              >
                  <Button icon={<EllipsisOutlined />} aria-label="More actions" />
              </Dropdown>
              {!locked && (
                <Button type="primary" disabled={!dirty || applying} onClick={() => save()}>
                  {saveLabel}
                </Button>
              )}
            </>
          )
        }
      />

      {v.from && (
        <p className="ed-origin-note">
          <MadeFromIcon />
          <span>
            {v.from.how === 'stylized' ? 'Stylized text from' : 'New variation from'} v{v.from.v}
            {parent ? (
              <>
                {' '}
                of{' '}
                <button type="button" className="ed-inline-link" onClick={() => go(parent.id)}>
                  {nameOf(v.from)}
                </button>
              </>
            ) : null}
          </span>
        </p>
      )}

      <div className="ed-grid">
        <div className="ed-left">
          {canvas}
          {histBlock}
        </div>
        <aside className={`ed-panel panel ${locked ? 'locked' : ''}`}>
          {locked && (
            <div className="ed-lock">
              <span>
                <strong>This creative runs in {v.launched!.audience}.</strong> A new version would change a running ad, so edits go into a new variation.
              </span>
              <Button
                type="primary"
                icon={<CopyPlusOutlined />}
                onClick={() => {
                  const nid = iterate(job.id, v);
                  nav(ws.inCreation ? `/creation/${c.id}/${nid}/edit?round=${job.id}` : ws.editorPath(c.id, nid, job.id));
                }}
              >
                Make a new variation
              </Button>
            </div>
          )}
          {changeBlock}
          {relatedBlock}
          {tagBlock}
        </aside>
      </div>



      <AnimatePresence>
        {mobile && !locked && ask.trim().length > 0 && (
          <>
            <div className="sticky-spacer" />
            <motion.div
              key="ed-sticky"
              className="sticky-bar"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: spring.gentle }}
              exit={{ y: 24, opacity: 0, transition: { duration: duration.fast, ease: ease.exit } }}
            >
              <div className="sticky-summary">
                <span className="small">{costLine}</span>
              </div>
              <Button type="primary" block disabled={applying && !onOlder} onClick={() => apply(ask)}>
                {onOlder ? `New variation from v${shown.n}` : 'Generate image'}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <LeaveGuard dirty={dirty} ask={askLeave} />
      <Modal
        open={!!leaveTo}
        title="Save your changes?"
        onCancel={() => setLeaveTo(null)}
        footer={
          <div className="ed-leave-foot">
            <Button
              onClick={() => {
                const go = leaveTo;
                discard();
                setLeaveTo(null);
                go?.();
              }}
            >
              Discard changes
            </Button>
            <span className="ed-leave-actions">
              <Button onClick={() => setLeaveTo(null)}>Keep editing</Button>
              <Button
                type="primary"
                disabled={applying}
                onClick={() => {
                  const go = leaveTo;
                  save(true);
                  setLeaveTo(null);
                  go?.();
                }}
              >
                {saveLabel}
              </Button>
            </span>
          </div>
        }
      >
        {applying ? 'A change is still being applied. Wait for it to finish to save it, or discard it.' : "Your changes to this creative aren't saved. If you leave now, they're lost."}
      </Modal>
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

/** 266: while the creative page has unsaved changes, links, the shell's buttons and reloading ask first. */
function LeaveGuard({ dirty, ask }: { dirty: boolean; ask: (go: () => void) => void }) {
  const nav = useNavigate();
  useEffect(() => {
    if (!dirty) return;
    setLeaveGuard(ask);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#/"]');
      if (!a || a.closest('.ant-modal')) return;
      e.preventDefault();
      e.stopPropagation();
      const to = a.getAttribute('href')!.slice(1);
      ask(() => nav(to));
    };
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    document.addEventListener('click', onClick, true);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      setLeaveGuard(null);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [dirty, ask, nav]);
  return null;
}
