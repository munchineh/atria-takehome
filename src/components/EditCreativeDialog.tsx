import { useEffect, useState } from 'react';
import { App, Button, Input, Modal, Segmented } from 'antd';
import { AdArt } from './Thumb';
import { ACCOUNT, type AdCopy } from '../data/mock';
import { applyToImage } from '../data/variations';
import { useStore } from '../data/store';

export type CreativeDraft = { img: string; copy?: AdCopy };
type Mode = 'type' | 'stylize' | 'image';

const CHIPS = ['Make the product bigger', 'Change the background', 'Simplify the layout'];

/**
 * 262 (Mancini 17:36): "Edit creative" from an ad in Ad Library. The same three ways to change a creative as the
 * creative page (type over the text, draw the text into the image, change the image), in a dialog, so the ad's
 * other fields stay on screen. Changes apply to this ad's creative when the ad is saved.
 */
export function EditCreativeDialog({
  open,
  value,
  onClose,
  onApply,
  openPage,
}: {
  open: boolean;
  value: CreativeDraft;
  onClose: () => void;
  onApply: (v: CreativeDraft) => void;
  /** Opens the creative in its own page, where changes are saved as a draft version. */
  openPage?: () => void;
}) {
  const { message } = App.useApp();
  const { credits, spendCredits } = useStore();
  const [draft, setDraft] = useState<CreativeDraft>(value);
  const [mode, setMode] = useState<Mode>('type');
  const [style, setStyle] = useState('');
  const [ask, setAsk] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setDraft(value);
      setMode(value.copy?.stylized ? 'image' : 'type');
      setStyle('');
      setAsk('');
    }
  }, [open, value]);

  const drawn = !!draft.copy?.stylized;
  const setCopy = (patch: Partial<AdCopy>) => setDraft((d) => ({ ...d, copy: { head: '', ...d.copy, ...patch } }));
  const run = (fn: () => void) => {
    setBusy(true);
    spendCredits(ACCOUNT.creditsPerImage);
    window.setTimeout(() => {
      fn();
      setBusy(false);
    }, 1400);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Edit creative"
      width={880}
      className="ecd-modal"
      destroyOnHidden
      footer={
        <div className="ecd-foot">
          {openPage ? (
            <Button type="link" className="inline-link" onClick={openPage}>
              Open in its own page
            </Button>
          ) : (
            <span />
          )}
          <span className="ecd-foot-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" disabled={busy} onClick={() => onApply(draft)}>
              Use this creative
            </Button>
          </span>
        </div>
      }
    >
      <div className="ecd">
        <div className="ecd-preview">
          <AdArt slot={draft.img} copy={draft.copy} alt="Creative preview" ratio={draft.img.startsWith('x') ? '3 / 4' : '1 / 1'} />
          {busy && <span className="ecd-busy">Creating the new image</span>}
        </div>
        <div className="ecd-controls">
          <span className="t-label">How to change it</span>
          <Segmented
            block
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: 'type', label: 'Type to edit', disabled: drawn },
              { value: 'stylize', label: 'Text with AI' },
              { value: 'image', label: 'Change the image' },
            ]}
          />
          {mode === 'type' && (
            <div className="ecd-fields">
              <p className="t-help">Free. The text sits on top of the image and stays editable.</p>
              <label className="ecd-field">
                <span>Headline</span>
                <Input value={draft.copy?.head ?? ''} onChange={(e) => setCopy({ head: e.target.value.toUpperCase() })} />
              </label>
              {draft.copy?.price !== undefined && (
                <label className="ecd-field">
                  <span>Price</span>
                  <Input value={draft.copy?.price ?? ''} onChange={(e) => setCopy({ price: e.target.value.toUpperCase() })} />
                </label>
              )}
              {draft.copy?.band !== undefined && (
                <label className="ecd-field">
                  <span>Band</span>
                  <Input value={draft.copy?.band ?? ''} onChange={(e) => setCopy({ band: e.target.value.toUpperCase() })} />
                </label>
              )}
              <label className="ecd-field">
                <span>Button on the image</span>
                <Input value={draft.copy?.cta ?? ''} onChange={(e) => setCopy({ cta: e.target.value.toUpperCase() })} />
              </label>
            </div>
          )}
          {mode === 'stylize' && (
            <div className="ecd-fields">
              <p className="t-help">
                Atria draws the text into the image. It looks richer, but words can come out misspelled and you can't type over it afterwards.
              </p>
              <label className="ecd-field">
                <span>Text style (optional)</span>
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="For example, hand-drawn chalk lettering" value={style} onChange={(e) => setStyle(e.target.value)} />
              </label>
              <div className="ecd-run">
                <Button
                  loading={busy}
                  onClick={() =>
                    run(() => {
                      setCopy({ stylized: true });
                      message.success('Text drawn into the image');
                    })
                  }
                >
                  Draw the text in
                </Button>
                <span className="t-help">
                  Uses {ACCOUNT.creditsPerImage} of {credits.toLocaleString('en-US')} credits
                </span>
              </div>
            </div>
          )}
          {mode === 'image' && (
            <div className="ecd-fields">
              <label className="ecd-field">
                <span>What should change?</span>
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="For example, make the product bigger" value={ask} onChange={(e) => setAsk(e.target.value)} />
              </label>
              <div className="ecd-chips">
                {CHIPS.map((c) => (
                  <Button key={c} size="small" onClick={() => setAsk(c)}>
                    {c}
                  </Button>
                ))}
              </div>
              <div className="ecd-run">
                <Button
                  loading={busy}
                  disabled={!ask.trim()}
                  onClick={() =>
                    run(() => {
                      setDraft((d) => applyToImage(d.img, d.copy, ask));
                      message.success('New image ready');
                    })
                  }
                >
                  Apply change
                </Button>
                <span className="t-help">
                  Uses {ACCOUNT.creditsPerImage} of {credits.toLocaleString('en-US')} credits
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
