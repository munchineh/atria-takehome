import { useQuota } from '../data/live';
import { MadeFromIcon } from '../components/Icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Dropdown, Empty, Grid, Input, Modal, Segmented, Tag, Tooltip } from 'antd';
import {
  ArrowRightOutlined,
  CopyPlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EllipsisOutlined,
  ExclamationCircleOutlined,
  FontSizeOutlined,
  LockOutlined,
} from '../components/AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, CREATIVES, METRIC_META, plural, recommendationsFor, type AdCopy, type MetricKey } from '../data/mock';
import { accountOf, findCreative, useStore } from '../data/store';
import { useWorkspace } from '../data/nav';
import { CHIPS, REASONS, STYLIZED, ratioFor, TAG_TIPS, predictedCtr, promptFor, tagsFor, type Version } from '../data/variations';
import { AdArt } from '../components/Thumb';
import { duration, ease, fadeUp, pageTransition, spring } from '../motion/tokens';
import { ReportAudience } from '../components/ReportAudience';
import { Rating } from '../components/Rating';
import { PageHeader } from '../components/PageHeader';
import { SectionHead } from '../components/SectionHead';

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
  const { message } = App.useApp();
  const c = findCreative(id) ?? CREATIVES[0];
  const { jobsFor, versionsOf, applyChange, saveText, branch, deleteVariation, credits, iterate } = useStore();
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
  const [editing, setEditing] = useState(params.get('text') === '1');
  const [draft, setDraft] = useState<AdCopy | undefined>(undefined);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

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

  const go = (nid: string) => nav(ws.editorPath(c.id, nid, job.id));
  const apply = (instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    const out = applyChange(job.id, v, shown.n, text, makeNew);
    setAsk('');
    setRating(null);
    if (out !== v.id) {
      message.success({ content: `New variation from v${shown.n}`, duration: 3 });
      go(out);
    }
  };
  const chip = (label: string) => {
    if ((label === 'Edit text' || label === 'Fix the text') && !v.stylized) {
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
        { title: <Link to={back}>{v.angle}</Link> },
      ]
    : [
        { title: <Link to="/">Radar</Link> },
        { title: <Link to={ws.radarPath(c.id)}>{c.name}</Link> },
        { title: <Link to={back}>{roundLabel}</Link> },
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
        {versions.length > 1 && (
          <div className="filmstrip" ref={strip} role="listbox" aria-label="Versions">
            {versions.map((x) => (
              <motion.button
                key={x.n}
                type="button"
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
                <span className="film-cap" title={x.caption}>
                  <strong>v{x.n}</strong> <span className="t-help">{x.state === 'applying' ? 'Applying your change' : x.caption}</span>
                </span>
              </motion.button>
            ))}
          </div>
        )}

        <div className="ed-meta-row">
          <span className="ed-predict">
            <PredictedTag id={v.id} />
            {c.grades.ctr && <span className="t-help">vs {c.grades.ctr} on the original</span>}
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

  const textBlock = (
    <section className="ed-block">
      <SectionHead
        title="Text"
        help={
          v.stylized
            ? 'Atria drew this text into the image. Changing it makes a new version.'
            : textMode === 'stylized'
              ? 'Atria draws the text into the image. It looks richer, but words can come out misspelled.'
              : 'Text sits on top of the image, so you can change it any time for free.'
        }
        action={
          canStylize ? (
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
          ) : undefined
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {v.stylized || textMode === 'stylized' ? (
          <motion.div key="styl" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="ed-stack">
            <div className="ed-text-sum">
              {shown.copy ? [shown.copy.head, shown.copy.price, shown.copy.band, shown.copy.cta].filter(Boolean).join('\u00a0· ') : 'No text'}
            </div>
            <div className="ed-text-action">
              <Button
                disabled={applying}
                onClick={() => {
                  if (v.stylized) return apply('Create a new version with updated text');
                  const nid = branch(job.id, v, 'stylized', '');
                  message.success({ content: 'Generating a stylized-text variation', duration: 3 });
                  go(nid);
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
                    <span className="ed-warn">
                      May contain a typo: {typoNow}.{' '}
                      <button type="button" className="ed-inline-link" onClick={() => setDraft({ ...draft, head: val.replace(typoNow!, fixedTypo) })}>
                        Change to {fixedTypo}
                      </button>
                    </span>
                  )}
                </label>
              );
            })}
            <span className="t-help">Text edits don't use credits</span>
            <div className="ed-text-action">
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
    </section>
  );

  const changeBlock = (
    <section className="ed-block">
      <SectionHead title="Refine" />
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
        <div className="ed-mode">
          <Segmented
            block
            size={mobile ? 'large' : 'middle'}
            value={makeNew ? 'variation' : 'version'}
            onChange={(val) => setMakeNew(val === 'variation')}
            options={[
              { label: 'New version', value: 'version' },
              { label: 'New variation', value: 'variation' },
            ]}
          />
          <p className="t-help ed-mode-help">
            {makeNew
              ? 'Makes a new variation next to this one. You can save it and test it on its own.'
              : `Adds v${latest.n + 1} to this variation. Earlier versions stay in the history below the image.`}
          </p>
        </div>
      )}
      {!mobile && (
        <div className="ed-apply">
          <span className="t-help">{costLine}</span>
          <Tooltip title={applyDisabled ? (!ask.trim() ? 'Describe what you want to change first.' : 'Applying your previous change.') : undefined}>
            <Button type={editing || locked ? 'default' : 'primary'} disabled={applyDisabled} onClick={() => apply(ask)}>
              {onOlder ? `New variation from v${shown.n}` : makeNew ? 'Create new variation' : 'Apply change'}
            </Button>
          </Tooltip>
        </div>
      )}
    </section>
  );

  const promptBlock = (
    <section className="ed-block">
      <button type="button" className="ed-inline-link" onClick={() => setPromptOpen((o) => !o)} aria-expanded={promptOpen}>
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
    </section>
  );

  const tagBlock = (
    <section className="ed-block">
      <SectionHead title="How Atria reads this image" />
      <dl className="ed-tags-plain">
        {readEntries.map(([k, val]) => (
          <div key={k} className="ed-tag-row">
            <Tooltip title={TAG_TIPS[k]}>
              <dt className="dotted">{k}</dt>
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
        title={ws.inCreation ? `Edit ${v.angle}` : v.angle}
        tag={
          locked ? (
            <Tag color="blue" icon={<LockOutlined />}>
              In an ad
            </Tag>
          ) : undefined
        }
        desc={
          locked
            ? "This creative is in an ad, so it can't change. Iterate to make a new creative from it."
            : 'Describe a change or edit the text. Each change is saved as a new version.'
        }
        actions={
          ws.inCreation ? (
            <Button onClick={() => nav(back)}>Done</Button>
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
                <Tooltip title="More actions.">
                  <Button icon={<EllipsisOutlined />} aria-label="More actions" />
                </Tooltip>
              </Dropdown>
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
                  {v.from.angle}
                </button>
              </>
            ) : null}
          </span>
        </p>
      )}

      {rec && (
        <section className="panel ed-diag-banner" aria-label="Original ad diagnostic">
          <span className="t-help ed-diag-from">Original ad</span>
          <div className="ed-diag-head">
            <span className="ed-diag-metric">{recMetricLabel}</span>
            {recGrade ? (
              <Tag className={`grade-tag g-${recGrade[0]}`}>{recGrade}</Tag>
            ) : (
              <Tooltip title={`${recMetricLabel} isn't graded on this account. Radar grades conversion on ${ACCOUNT.conversionMetric}.`}>
                <Tag className="rec-grade no-grade">No grade</Tag>
              </Tooltip>
            )}
            {recVal && <span className="ed-diag-val">{recVal}</span>}
            {recAvg && <span className="t-help">Account average{'\u00a0'}{recAvg}</span>}
          </div>
          <p className="ed-diag-issue">{rec.issue}</p>
          <p className="ed-diag-fix">
            <ArrowRightOutlined aria-hidden />
            <span>{rec.fix}</span>
          </p>
        </section>
      )}

      <div className="ed-grid">
        {canvas}
        <aside className={`ed-panel panel ${locked ? 'locked' : ''}`}>
          {locked && (
            <div className="ed-lock">
              <span>
                <strong>Locked while in an ad.</strong> Iterate to edit a new copy.
              </span>
              <Button
                type="primary"
                icon={<CopyPlusOutlined />}
                onClick={() => {
                  const nid = iterate(job.id, v);
                  nav(ws.inCreation ? `/creation/${c.id}/${nid}/edit?round=${job.id}` : ws.editorPath(c.id, nid, job.id));
                }}
              >
                Iterate
              </Button>
            </div>
          )}
          {changeBlock}
          {textBlock}
          {promptBlock}
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
                {onOlder ? `New variation from v${shown.n}` : makeNew ? 'Create new variation' : 'Apply change'}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
