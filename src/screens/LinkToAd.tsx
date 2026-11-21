import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { App, Breadcrumb, Button, Empty, Input, Select, Tag } from 'antd';
import { motion } from 'motion/react';
import { ArrowRightOutlined, CheckCircleFilled, CopyOutlined, ThunderboltOutlined } from '../components/AppIcons';
import { AdArt, Thumb } from '../components/Thumb';
import { SectionHead } from '../components/SectionHead';
import { CTA_OPTIONS, FIELD_LABEL, adSetupOf, applyAdRecs, type AdSetup, type CtaButton } from '../data/adsetup';
import { goalOf, recommendationsFor, type Grade, type Recommendation } from '../data/mock';
import { accountOf, findCreative, useStore } from '../data/store';
import { answers, predictedCtr, ratioFor, recIdsOf } from '../data/variations';
import { fadeUp, pageTransition } from '../motion/tokens';

/** Grades on one scale, best first: a projection moves up one notch per suggestion met (C+ to B, not C+ to A). */
const SCALE: Exclude<Grade, null>[] = ['A', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
const lift = (g: Grade, steps: number): Grade => (g ? SCALE[Math.max(0, SCALE.indexOf(g) - steps)] : g);

/**
 * 264 (Mancini 17:36): Link to Ad. A creative from the gallery becomes an ad: the fields around it are filled in.
 * - Generated from an ad (the core flow): filled from that ad by default, with its ad-level fixes applied, and a
 *   summary of the old ad and the suggestions this one should meet, ticked as they are met.
 * - A variation of a creative that is already in an ad (or an uploaded creative): nothing is filled until you pick
 *   "Use the ad's content" or "Use suggested changes".
 * A projected grade updates as the fields change. Creating it adds a "Not running" ad to Ad Library.
 */
export function LinkToAd() {
  const { vid = '' } = useParams();
  const [qs] = useSearchParams();
  const round = qs.get('round');
  const nav = useNavigate();
  const { message } = App.useApp();
  const { jobs, drafts, createDraft } = useStore();

  // Resolve the creative and the ad it relates to.
  const uploadedAd = vid.startsWith('up-') ? findCreative(vid.slice(3)) : undefined;
  const job = round ? jobs.find((j) => j.id === round) : undefined;
  const v = job?.variations.find((x) => x.id === vid);
  const sourceAd = uploadedAd ?? (job ? findCreative(job.creativeId) : undefined);
  const parentInAd = v?.from && (job?.variations.find((x) => x.id === v.from!.id)?.launched || drafts.some((d) => d.creative.vid === v.from!.id));
  const core = !!v && !v.from && !!sourceAd;

  const recs = useMemo(() => (sourceAd ? recommendationsFor(sourceAd) : []), [sourceAd]);
  const adRecs = recs.filter((r) => r.scope === 'ad');
  const roundRecs: Recommendation[] = useMemo(() => {
    if (!job || !v) return [];
    const ids = [...new Set([...recIdsOf(v).filter((id) => answers(v, id)), ...(job.adRecIds ?? []), ...adRecs.map((r) => r.id)])];
    return recs.filter((r) => ids.includes(r.id));
  }, [job, v, recs, adRecs]);
  const base = sourceAd ? adSetupOf(sourceAd, accountOf(sourceAd).name, goalOf(sourceAd) === 'Sales') : null;
  const blank: AdSetup = { brand: base?.brand ?? '', headline: '', primaryText: '', cta: 'Shop now', landing: '' };
  const [setup, setSetup] = useState<AdSetup>(() => (core && base ? applyAdRecs(base, adRecs) : blank));
  const [name, setName] = useState(() => (v ? `${sourceAd?.name.split(' · ')[0] ?? 'New ad'} · ${v.angle}` : `${uploadedAd?.name ?? 'New ad'} · New`));
  const [filled, setFilled] = useState<'none' | 'ad' | 'fixes'>(core ? 'fixes' : 'none');

  if (!sourceAd || (!v && !uploadedAd)) {
    return (
      <div className="page">
        <Empty description="This creative couldn't be found. It may have been made in another browser." />
      </div>
    );
  }
  const img = v?.img ?? uploadedAd!.img;
  const copy = v ? v.copy : uploadedAd!.copy;
  const set = (k: keyof AdSetup, val: string) => setSetup((s) => ({ ...s, [k]: val }));
  const met = (r: Recommendation) => (r.scope === 'ad' && r.field ? setup[r.field] === r.value : !!v && answers(v, r.id));
  const metCount = (target: 'CPA' | 'CTR') => roundRecs.filter((r) => r.target === target && met(r)).length;
  const projected = {
    overall: lift(sourceAd.overall, Math.min(2, roundRecs.filter(met).length)),
    cpa: lift(sourceAd.grades.conversion, metCount('CPA')),
    ctr: v ? (predictedCtr(v.id) as Grade) : sourceAd.grades.ctr,
  };
  const ready = setup.headline.trim() && setup.primaryText.trim() && setup.landing.trim();
  const create = () => {
    const id = createDraft({
      name,
      accountId: sourceAd.accountId,
      sourceAdId: sourceAd.id,
      creative: { img, copy, jobId: job?.id, vid: v?.id },
      setup,
      recIds: roundRecs.filter(met).map((r) => r.id),
      how: 'linked',
    });
    message.success({ content: 'Ad created in Ad Library. It runs once you open it in Ads Manager.', duration: 3 });
    nav(`/creation/ads/${id}`);
  };

  return (
    <motion.div {...pageTransition} className="page link-ad">
      <header className="ph ad-top">
        <Breadcrumb className="ph-crumbs" items={[{ title: <Link to="/creation">Creative Gallery</Link> }, { title: 'Link to Ad' }]} />
        <div className="ph-actions">
          <Button onClick={() => nav(-1)}>Cancel</Button>
          <Button type="primary" disabled={!ready} onClick={create}>
            Create ad
          </Button>
        </div>
      </header>
      <div className="link-title">
        <h1 className="ph-title">Link to Ad</h1>
        <p className="ph-desc">Set up the ad around this creative. It's saved in Ad Library as not running until you open it in Ads Manager.</p>
      </div>

      <div className="detail-grid">
        <aside className="detail-left">
          <div className="lib-creative">
            <AdArt slot={img} copy={copy} alt={v?.angle ?? uploadedAd!.name} ratio={ratioFor(img)} />
          </div>

          {/* The ad this creative was made to improve, and what it was meant to fix. */}
          {core && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel link-prev">
              <SectionHead title="The ad it improves on" />
              <Link to={`/ad/${sourceAd.id}`} className="rel-ad">
                <Thumb c={sourceAd} size={40} />
                <span className="rel-ad-text">
                  <b>{sourceAd.name}</b>
                  <span className="t-help">
                    Overall {sourceAd.overall}{' '}· CPA {sourceAd.grades.conversion ?? 'not graded'}{' '}· CTR {sourceAd.grades.ctr ?? 'not graded'}
                  </span>
                </span>
              </Link>
              <span className="t-label link-sub">Suggestions to meet</span>
              <ul className="lib-fix-list">
                {roundRecs.map((r) => (
                  <li key={r.id} className={met(r) ? 'met' : ''}>
                    <CheckCircleFilled className="lib-fix-icon" aria-hidden />
                    <span>
                      <b>{r.fix}</b>
                      <span className="t-help">
                        {r.issue}
                        {' '}· {r.scope === 'ad' && r.field ? (met(r) ? `${FIELD_LABEL[r.field]} filled in` : `${FIELD_LABEL[r.field]} doesn't match yet`) : 'In this creative'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </aside>

        <div className="detail-right link-right">
          {/* Projected score, compared with the ad it came from. */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel link-proj">
            <SectionHead title="Projected score" help={`An estimate against ${sourceAd.name}, from how similar changes did in this account.`} />
            <div className="link-proj-row">
              {(
                [
                  ['Overall', sourceAd.overall, projected.overall],
                  ['CPA', sourceAd.grades.conversion, projected.cpa],
                  ['CTR', sourceAd.grades.ctr, projected.ctr],
                ] as const
              ).map(([label, was, now]) => (
                <div key={label} className="link-proj-cell">
                  <span className="t-label">{label}</span>
                  <span className="link-proj-grades">
                    <Tag className={`grade-tag g-${(was ?? 'N')[0]} link-was`}>{was ?? 'N/A'}</Tag>
                    <ArrowRightOutlined className="link-proj-arrow" aria-hidden />
                    <Tag className={`grade-tag predicted g-${(now ?? 'N')[0]}`}>{now ?? 'N/A'}</Tag>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {!core && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel link-fill">
              <SectionHead
                title={uploadedAd ? `This creative runs in ${sourceAd.name}` : `Made from a creative in ${sourceAd.name}`}
                help={parentInAd || uploadedAd ? 'Start from that ad, or from its content with the suggested fixes.' : 'Start from the ad it came from, or from its content with the suggested fixes.'}
              />
              <div className="link-fill-actions">
                <Button
                  icon={<CopyOutlined />}
                  type={filled === 'ad' ? 'primary' : 'default'}
                  onClick={() => {
                    if (base) setSetup(base);
                    setFilled('ad');
                  }}
                >
                  Use the ad's content
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  type={filled === 'fixes' ? 'primary' : 'default'}
                  disabled={!adRecs.length}
                  onClick={() => {
                    if (base) setSetup(applyAdRecs(base, adRecs));
                    setFilled('fixes');
                  }}
                >
                  {adRecs.length ? `Use suggested changes (${adRecs.length})` : 'No suggested changes'}
                </Button>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel lib-form">
            <SectionHead title="Ad setup" help={core ? `Filled in from ${sourceAd.name}${adRecs.length ? ', with its suggested fixes' : ''}.` : 'What people see around the creative in Meta.'} />
            <label className="lib-field">
              <span>Ad name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="lib-field">
              <span>{FIELD_LABEL.brand}</span>
              <Select value={setup.brand} onChange={(val) => set('brand', val)} options={[setup.brand, `@${setup.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}`].map((x) => ({ value: x, label: x }))} />
            </label>
            {(['primaryText', 'headline'] as const).map((k) => {
              const fix = adRecs.find((r) => r.field === k);
              return (
                <label key={k} className="lib-field">
                  <span>
                    {FIELD_LABEL[k]}
                    {fix && setup[k] === fix.value && <span className="link-fixed">Suggested fix</span>}
                  </span>
                  {k === 'primaryText' ? (
                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={setup[k]} onChange={(e) => set(k, e.target.value)} placeholder="The copy above the creative" />
                  ) : (
                    <Input value={setup[k]} onChange={(e) => set(k, e.target.value)} placeholder="Shown under the creative" />
                  )}
                </label>
              );
            })}
            <label className="lib-field">
              <span>{FIELD_LABEL.cta}</span>
              <Select<CtaButton> value={setup.cta} onChange={(val) => set('cta', val)} options={CTA_OPTIONS.map((x) => ({ value: x, label: x }))} />
            </label>
            <label className="lib-field">
              <span>
                {FIELD_LABEL.landing}
                {adRecs.some((r) => r.field === 'landing' && setup.landing === r.value) && <span className="link-fixed">Suggested fix</span>}
              </span>
              <Input addonBefore="https://" value={setup.landing} onChange={(e) => set('landing', e.target.value)} placeholder="yourstore.com/products" />
            </label>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
