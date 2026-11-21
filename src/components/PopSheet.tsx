import { cloneElement, useState, type ReactElement, type ReactNode } from 'react';
import { Button, Drawer, Grid, Popover, type PopoverProps } from 'antd';
import { CheckOutlined, CloseOutlined } from './AppIcons';

/** 5e Gm-19: a floating panel on desktop and tablet, a bottom sheet on phones (below 768 px, the phone layer's line).
 *  The copies panel already worked this way; Filters, How Radar grades, the period list and grade popovers follow it. */
export function usePhone() {
  const bp = Grid.useBreakpoint();
  return !bp.md;
}

type Props = Omit<PopoverProps, 'content' | 'title' | 'children'> & {
  content: ReactNode;
  title?: ReactNode;
  /** Title for the sheet when the popover has none (a sheet always gets a title). */
  sheetTitle?: ReactNode;
  children: ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
  sheetClassName?: string;
};

export function PopSheet({ content, title, sheetTitle, children, sheetClassName, open: openProp, onOpenChange, ...pop }: Props) {
  const phone = usePhone();
  const [own, setOwn] = useState(false);
  const open = openProp ?? own;
  const set = (v: boolean) => {
    setOwn(v);
    onOpenChange?.(v);
  };
  if (phone)
    return (
      <>
        {cloneElement(children, {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            children.props.onClick?.(e);
            set(true);
          },
        })}
        <Drawer
          open={open}
          onClose={() => set(false)}
          placement="bottom"
          size="auto"
          closable={false}
          extra={<Button type="text" icon={<CloseOutlined />} aria-label="Close" className="sheet-close-btn" onClick={() => set(false)} />}
          title={sheetTitle ?? title}
          className={`pop-sheet ${sheetClassName ?? ''}`}
          destroyOnHidden
        >
          <div onClick={(e) => e.stopPropagation()}>{content}</div>
        </Drawer>
      </>
    );
  return (
    <Popover {...pop} content={content} title={title} open={open} onOpenChange={set}>
      {children}
    </Popover>
  );
}

/** 5e Gm-19: the grading period on phones. The Select stays as the trigger; its list opens as a sheet of large rows. */
export function usePeriodSheet<T extends number>(value: T, options: { days: T; short: string; long: string }[], onChange: (v: T) => void) {
  const phone = usePhone();
  const [open, setOpen] = useState(false);
  const selectProps = phone ? { open: false, onClick: () => setOpen(true) } : {};
  const sheet = phone ? (
    <Drawer open={open} onClose={() => setOpen(false)} placement="bottom" size="auto" title="Grade ads on data from" className="pop-sheet period-sheet" destroyOnHidden>
      <div className="period-list" role="radiogroup" aria-label="Grading period">
        {options.map((w) => (
          <button
            key={w.days}
            role="radio"
            aria-checked={w.days === value}
            className={`period-row${w.days === value ? ' on' : ''}`}
            onClick={() => {
              setOpen(false);
              if (w.days !== value) onChange(w.days);
            }}
          >
            <span className="period-name">{w.short}</span>
            <span className="period-dates">{w.long.split(' · ')[1]}</span>
            <CheckOutlined className="period-check" />
          </button>
        ))}
      </div>
    </Drawer>
  ) : null;
  return { selectProps, sheet };
}
