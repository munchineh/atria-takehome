import { useState } from 'react';
import { App, Button, Input, Radio } from 'antd';
import { FlagOutlined, CheckOutlined } from '@ant-design/icons';
import { PopSheet } from './PopSheet';

/** Mancini 10:27: report one audience, say why, and add detail if you like. */
const REASONS = [
  "This product isn't for them",
  "The ad doesn't speak to them",
  'Too broad to be useful',
  'Something else',
] as const;

export function ReportAudience({ audience, onReported, reported }: { audience: string; reported: boolean; onReported: () => void }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>();
  const [note, setNote] = useState('');
  const needsNote = reason === 'Something else';
  const canSend = !!reason && (!needsNote || note.trim().length > 0);

  if (reported)
    return (
      <span className="persona-reported t-help">
        <CheckOutlined aria-hidden /> Reported
      </span>
    );

  const form = (
    <div className="report-form">
      <Radio.Group value={reason} onChange={(e) => setReason(e.target.value)} className="report-reasons">
        {REASONS.map((r) => (
          <Radio key={r} value={r}>
            {r}
          </Radio>
        ))}
      </Radio.Group>
      <Input.TextArea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={needsNote ? "Tell us what's wrong" : 'Add detail (optional)'}
        autoSize={{ minRows: 2, maxRows: 4 }}
        aria-label="More detail"
      />
      <div className="report-actions">
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          type="primary"
          disabled={!canSend}
          onClick={() => {
            setOpen(false);
            onReported();
            message.success("Thanks. We'll use this to improve audience reads.");
          }}
        >
          Send report
        </Button>
      </div>
    </div>
  );

  return (
    <PopSheet content={form} title={`What's wrong with "${audience}"?`} trigger="click" placement="bottomRight" open={open} onOpenChange={setOpen} classNames={{ root: 'report-pop' }}>
      <Button type="text" size="small" className="persona-flag" icon={<FlagOutlined />} aria-label={`Report ${audience} as wrong`}>
        Not right?
      </Button>
    </PopSheet>
  );
}
