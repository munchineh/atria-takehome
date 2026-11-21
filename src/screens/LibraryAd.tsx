import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Breadcrumb, Button, Empty, Grid, Input, Select, Tooltip } from 'antd';
import { motion } from 'motion/react';
import { CheckCircleFilled, EditOutlined, ExportOutlined, PictureOutlined } from '../components/AppIcons';
import { AdArt, CarouselArt, Creative } from '../components/Thumb';
import { EditCreativeDialog, type CreativeDraft } from '../components/EditCreativeDialog';
import { SectionHead } from '../components/SectionHead';
import { CTA_OPTIONS, FIELD_LABEL, type AdSetup, type CtaButton } from '../data/adsetup';
import { useLibrary } from '../data/library';
import { recommendationsFor } from '../data/mock';
import { findCreative, useStore } from '../data/store';
import { fadeUp, pageTransition } from '../motion/tokens';

/**
 * 262 (Mancini 17:36): an ad in Ad Library (repurposes the creative page). Everything about the ad can be edited
 * here except the creative itself, which opens in "Edit creative". "Open in Ads Manager" is how it starts running;
 * that export flow is out of scope for the prototype.
 */
export function LibraryAd() {
  const { id = '' } = useParams();
  const ads = useLibrary();
  const a = ads.find((x) => x.id === id);
  const nav = useNavigate();
  const bp = Grid.useBreakpoint();
  const { message } = App.useApp();
  const { updateDraft, saveAdEdit } = useStore();
  const [setup, setSetup] = useState<AdSetup | null>(a?.setup ?? null);
  const [creative, setCreative] = useState<CreativeDraft | null>(a ? { img: a.img, copy: a.copy } : null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (a) {
      setSetup(a.setup);
      setCreative({ img: a.img, copy: a.copy });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const src = a?.sourceAdId ? findCreative(a.sourceAdId) : undefined;
  const fixes = useMemo(() => (src && a ? recommendationsFor(src).filter((r) => a.recIds.includes(r.id)) : []), [src, a]);

  if (!a || !setup || !creative) {
    return (
      <div className="page">
        <Empty description="This ad isn't in the library. It may have been made in another browser." />
      </div>
    );
  }
  const dirty = JSON.stringify(setup) !== JSON.stringify(a.setup) || creative.img !== a.img || JSON.stringify(creative.copy) !== JSON.stringify(a.copy);
  const set = (k: keyof AdSetup, v: string) => setSetup((s) => (s ? { ...s, [k]: v } : s));
  const save = () => {
    if (a.draft) updateDraft(a.id, { setup, creative: { ...a.draft.creative, img: creative.img, copy: creative.copy } });
    else saveAdEdit(a.id, { setup, creative });
    message.success('Changes saved');
  };
  const pagePath = a.creativeRef?.vid && a.sourceAdId ? `/creation/${a.sourceAdId}/${a.creativeRef.vid}/edit?round=${a.creativeRef.jobId}` : undefined;
  const image = a.media === 'Image';

  return (
    <motion.div {...pageTransition} className="page lib-ad">
      <header className="ph ad-top">
        <Breadcrumb className="ph-crumbs" items={[{ title: <Link to="/creation/ads">Ad Library</Link> }, { title: a.name }]} />
        <div className="ph-actions">
          <Tooltip title="Opening the ad in Meta Ads Manager isn't part of this prototype">
            <Button icon={<ExportOutlined />} onClick={() => message.info("In the live product, this opens the ad in Meta Ads Manager to run it. It's not part of this prototype.")}>
              {bp.md ? 'Open in Ads Manager' : 'Ads Manager'}
            </Button>
          </Tooltip>
          <Button type="primary" disabled={!dirty} onClick={save}>
            Save changes
          </Button>
        </div>
      </header>

      <div className="detail-grid">
        <aside className="detail-left">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="lib-creative">
            {a.media === 'Carousel' && a.ad ? <CarouselArt c={a.ad} /> : a.ad && !dirty && creative.img === a.ad.img ? <Creative c={{ ...a.ad, copy: creative.copy }} /> : <AdArt slot={creative.img} copy={creative.copy} alt={a.name} media={a.media} ratio={creative.img.startsWith('x') ? '3 / 4' : '1 / 1'} />}
          </motion.div>
          <div className="lib-creative-actions">
            <Tooltip title={image ? '' : 'Only image creatives can be edited for now'}>
              <Button icon={<EditOutlined />} disabled={!image} onClick={() => setEditing(true)} block>
                Edit creative
              </Button>
            </Tooltip>
            {pagePath && (
              <Button type="text" icon={<PictureOutlined />} onClick={() => nav(pagePath)} block>
                Open creative page
              </Button>
            )}
          </div>
        </aside>

        <div className="detail-right">
          <div className="lib-ad-title">
            <span className={`lib-status s-${a.status.replace(' ', '-').toLowerCase()}`}>{a.status}</span>
            <h1 className="ph-title">{a.name}</h1>
            <p className="ph-desc">
              {a.source}
              {src && (
                <>
                  {'\u00a0· '}
                  <Link to={`/ad/${src.id}`}>See how the original performs</Link>
                </>
              )}
            </p>
          </div>

          {fixes.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel lib-fixes">
              <SectionHead title="Fixes in this ad" help={`Suggestions from ${src?.name} that this ad was set up to meet.`} />
              <ul className="lib-fix-list">
                {fixes.map((r) => {
                  const met = r.scope === 'ad' && r.field ? setup[r.field] === r.value : true;
                  return (
                    <li key={r.id} className={met ? 'met' : ''}>
                      <CheckCircleFilled className="lib-fix-icon" aria-hidden />
                      <span>
                        <b>{r.fix}</b>
                        <span className="t-help">{r.scope === 'ad' && r.field ? `${FIELD_LABEL[r.field]}${met ? '' : '. Changed since, so it no longer matches the suggestion.'}` : 'In the creative'}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="show" className="panel lib-form">
            <SectionHead title="Ad setup" help="What people see around the creative in Meta." />
            <label className="lib-field">
              <span>{FIELD_LABEL.brand}</span>
              <Select value={setup.brand} onChange={(v) => set('brand', v)} options={[setup.brand, `@${setup.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}`].map((v) => ({ value: v, label: v }))} />
            </label>
            <label className="lib-field">
              <span>{FIELD_LABEL.primaryText}</span>
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={setup.primaryText} onChange={(e) => set('primaryText', e.target.value)} />
            </label>
            <label className="lib-field">
              <span>{FIELD_LABEL.headline}</span>
              <Input value={setup.headline} onChange={(e) => set('headline', e.target.value)} />
            </label>
            <label className="lib-field">
              <span>{FIELD_LABEL.cta}</span>
              <Select<CtaButton> value={setup.cta} onChange={(v) => set('cta', v)} options={CTA_OPTIONS.map((v) => ({ value: v, label: v }))} />
            </label>
            <label className="lib-field">
              <span>{FIELD_LABEL.landing}</span>
              <Input addonBefore="https://" value={setup.landing} onChange={(e) => set('landing', e.target.value)} />
            </label>
            {a.ad && (
              <div className="lib-field lib-places">
                <span>Placements</span>
                <span className="t-help">{a.ad.placements.map((p) => p.label).join(', ')}</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <EditCreativeDialog
        open={editing}
        value={creative}
        onClose={() => setEditing(false)}
        onApply={(v) => {
          setCreative(v);
          setEditing(false);
          message.info('Creative updated. Save changes to keep it.');
        }}
        openPage={pagePath ? () => nav(pagePath) : undefined}
      />
    </motion.div>
  );
}
