import { useEffect, useState } from 'react';
import { App, Button, Drawer, Grid, Input, Modal, Select, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, CopyOutlined, EditOutlined, LeftOutlined } from '../AppIcons';
import { AnimatePresence, motion } from 'motion/react';
import { ACCOUNT, SIZES, plural } from '../../data/mock';
import { DEMO_ACCOUNTS, NEW_CREATIVE_STARTS, newProject, useStore, type NewCreativeStart } from '../../data/store';
import { Thumb } from '../Thumb';
import { Rolling } from '../Rolling';
import { fadeUp } from '../../motion/tokens';

const START_ICON: Record<NewCreativeStart, React.ReactNode> = {
  scratch: <EditOutlined />,
  clone: <CopyOutlined />,
};

/**
 * DL-16: "New creative" flow in the Creative gallery (illustrative, simple).
 * Step 1: Chooser with the three starts from NEW_CREATIVE_STARTS.
 * Step 2: Create panel with no ad attached (Brand, optional reference/clone picker, Ad brief, Size, count, cost).
 * On Create: calls newProject(start, name, accountId) then startJob({ creativeId: p.id, recIds: ['r1'], perRec, size }).
 */
export function NewCreativeModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (creativeId: string, jobId: string) => void;
}) {
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const { message } = App.useApp();
  const { accountId, credits, startJob } = useStore();
  const account = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? DEMO_ACCOUNTS[0];
  const brand = 'brand' in account ? account.brand : null;
  const sampleAds = account.creatives.slice(0, 6);

  const [step, setStep] = useState<'choose' | 'create'>('choose');
  const [start, setStart] = useState<NewCreativeStart>('scratch');
  const [name, setName] = useState('');
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [brief, setBrief] = useState('');
  const [size, setSize] = useState('2:3');
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (open) {
      setStep('choose');
      setStart('scratch');
      setName('');
      setPickedIds([]);
      setBrief('');
      setSize('2:3');
      setCount(4);
    }
  }, [open]);

  const pickStart = (s: NewCreativeStart) => {
    setStart(s);
    setPickedIds([]);
    if (s === 'scratch') {
      setName('');
      setBrief('');
    } else {
      const first = sampleAds[0];
      if (first) {
        setPickedIds([first.id]);
        setName(`Clone\u00a0· ${first.product}`);
        setBrief(
          `Product: ${first.product} from ${account.name}.\nGoal: make a fresh creative ready to test.\nTone: match the brand colors and style.`,
        );
      }
    }
    setStep('create');
  };

  const toggleSample = (id: string) => {
    const ad = sampleAds.find((x) => x.id === id);
    setPickedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 10) return prev;
      if (!prev.length && ad) setName(`Clone\u00a0· ${ad.product}`);
      return [...prev, id];
    });
  };

  const cost = count * ACCOUNT.creditsPerImage;
  const needsPick = start !== 'scratch' && pickedIds.length === 0;
  const needsBrief = brief.trim().length === 0;
  const shortCredits = cost > credits;
  const canCreate = !needsPick && !needsBrief && !shortCredits;
  const startMeta = NEW_CREATIVE_STARTS.find((s) => s.value === start)!;

  const submit = () => {
    if (!canCreate) return;
    const p = newProject(start, name || (start === 'clone' ? 'From an ad you like' : 'New creative'), account.id);
    const job = startJob({ creativeId: p.id, recIds: ['r1'], perRec: count, size });
    message.success({ content: `Generating ${plural(job.count, 'creative')}`, duration: 3 });
    onCreated(p.id, job.id);
    onClose();
  };

  const body = (
    <div className="dlg nc-dlg">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'choose' ? (
          <motion.div key="choose" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="dlg-scroll nc-choose">
            <p className="t-help nc-intro">Choose how you want to start. You can refine or test any creative in an ad later.</p>
            <div className="nc-starts">
              {NEW_CREATIVE_STARTS.map((opt) => (
                <button key={opt.value} type="button" className="nc-start-card" onClick={() => pickStart(opt.value)}>
                  <span className="nc-start-icon" aria-hidden>
                    {START_ICON[opt.value]}
                  </span>
                  <span className="nc-start-text">
                    <strong>{opt.title}</strong>
                    <span className="t-help">{opt.help}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="create" variants={fadeUp} initial="hidden" animate="show" exit="exit" className="nc-step2">
            <div className="dlg-scroll">
              <div className="nc-back-row">
                <Button type="text" icon={<LeftOutlined />} onClick={() => setStep('choose')}>
                  Change start
                </Button>
                <span className="t-help">{startMeta.title}</span>
              </div>

              {/* Brand row */}
              <section className="dlg-row brand-row">
                <span className="dlg-label">Brand</span>
                {brand ? (
                  <span className="brand-value">
                    <span className="swatches">
                      {brand.colors.map((col) => (
                        <i key={col} style={{ background: col }} />
                      ))}
                    </span>
                    <span>
                      {brand.name}
                      {'\u00a0'}· {brand.colors.length} colors{'\u00a0'}· {brand.font}
                    </span>
                  </span>
                ) : (
                  <span className="brand-value muted">{account.name}</span>
                )}
              </section>

              {/* Illustrative sample ad picker for clone start */}
              {start !== 'scratch' && (
                <section className="dlg-block">
                  <div className="dlg-label-row">
                    <span className="dlg-label">
                      <span className="nc-req" aria-hidden>*</span>Ads you like
                    </span>
                    <span className="t-help">
                      {`${pickedIds.length} of 10 selected.`}
                    </span>
                  </div>
                  <div className="nc-sample-grid">
                    {sampleAds.map((ad) => {
                      const picked = pickedIds.includes(ad.id);
                      return (
                        <button
                          key={ad.id}
                          type="button"
                          className={`nc-sample ${picked ? 'on' : ''}`}
                          aria-pressed={picked}
                          onClick={() => toggleSample(ad.id)}
                        >
                          <Thumb c={ad} size={40} />
                          <span className="nc-sample-name ellipsis">{ad.name}</span>
                          {picked && <CheckOutlined className="nc-sample-check" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Creative title */}
              <label className="dlg-block">
                <span className="dlg-label">Name</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Holiday gift drop"
                  aria-label="Creative name"
                />
              </label>

              {/* Ad brief */}
              <label className="dlg-block">
                <span className="dlg-label">
                  <span className="nc-req" aria-hidden>*</span>Ad brief
                </span>
                <Input.TextArea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={
                    "Product: what it is and what makes it different\nWho it's for: the people you want to reach\nGoal: what the creative should get people to do\nTone: how it should sound"
                  }
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  aria-label="Ad brief"
                />
              </label>

              {/* Output size & count */}
              <section className="dlg-grid">
                <label className="dlg-block">
                  <span className="dlg-label">Size</span>
                  <Select value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s.value, label: s.label }))} />
                </label>
                <label className="dlg-block">
                  <span className="dlg-label">Number of creatives</span>
                  <Select value={count} onChange={setCount} options={[2, 4, 6, 8].map((n) => ({ value: n, label: n }))} />
                </label>
              </section>
            </div>

            <footer className="dlg-foot">
              <div className="dlg-sum">
                <span>
                  <b>
                    <Rolling value={count} /> {count === 1 ? 'creative' : 'creatives'}
                  </b>
                </span>
                {/* R-AI6 & DL-16: cost beside the button before the click, never hover-only. */}
                <span className="t-help">
                  {shortCredits
                    ? `Needs ${cost}\u00a0credits. You have ${credits.toLocaleString('en-US')}.`
                    : `Uses ${cost} of ${credits.toLocaleString('en-US')}\u00a0credits`}
                </span>
                {needsBrief && <span className="t-help dlg-need">Add a brief to continue.</span>}
              </div>
              <div className="dlg-actions">
                <Button onClick={onClose}>Cancel</Button>
                <Tooltip
                  title={
                    canCreate
                      ? undefined
                      : shortCredits
                        ? 'Not enough credits for this batch.'
                        : needsPick
                          ? 'Select at least one ad to continue.'
                          : 'Add an ad brief to continue.'
                  }
                >
                  <Button type="primary" disabled={!canCreate} onClick={submit}>
                    Create {count} creatives
                  </Button>
                </Tooltip>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (mobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        placement="bottom"
        size="large"
        styles={{ wrapper: { height: '100svh' } }}
        closable={false}
        extra={<Button type="text" icon={<CloseOutlined />} aria-label="Close" className="sheet-close-btn" onClick={onClose} />}
        title="New creative"
        className="sheet-drawer"
        destroyOnHidden
      >
        {body}
      </Drawer>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="New creative"
      footer={null}
      width={600}
      className="create-modal"
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      {body}
    </Modal>
  );
}
