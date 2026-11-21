/**
 * App icons: the asset library's set (antd outlined), per S-90 in handoffs/ui-system-rules.md.
 * Reverted from Lucide on 21 Nov (V-01). Screens import from here so the set can change in one place.
 * Aliases map the few names added during the Lucide trial to their antd equivalents.
 */
export * from '@ant-design/icons';
export {
  BlockOutlined as CopyPlusOutlined,
  ControlOutlined as SlidersOutlined,
  InboxOutlined as ArchiveOutlined,
  RollbackOutlined as ArchiveRestoreOutlined,
} from '@ant-design/icons';

import Icon from '@ant-design/icons';
import type { GetProps } from 'antd';

type IconProps = Partial<GetProps<typeof Icon>>;

/**
 * Bookmark, for "Saved" (Mancini 13:04: like saving a post on social media). antd has no bookmark,
 * so this is drawn on antd's 1024 grid with an outlined stroke weight that matches the set.
 */
const bookmarkOutline = () => (
  <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor" aria-hidden>
    <path d="M760 112H264c-26.5 0-48 21.5-48 48v744c0 12.3 7 23.5 18 28.9 11 5.4 24.1 4.1 33.8-3.4L512 744l244.2 185.5c5.7 4.3 12.5 6.5 19.4 6.5 4.9 0 9.7-1.1 14.2-3.3 11-5.4 18-16.6 18-28.9V160c0-26.5-21.3-48-47.8-48zM736 838.2L531.4 682.8c-11.5-8.7-27.3-8.7-38.8 0L288 838.2V184h448v654.2z" />
  </svg>
);
const bookmarkFill = () => (
  <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor" aria-hidden>
    <path d="M760 112H264c-26.5 0-48 21.5-48 48v744c0 12.3 7 23.5 18 28.9 11 5.4 24.1 4.1 33.8-3.4L512 744l244.2 185.5c5.7 4.3 12.5 6.5 19.4 6.5 4.9 0 9.7-1.1 14.2-3.3 11-5.4 18-16.6 18-28.9V160c0-26.5-21.3-48-47.8-48z" />
  </svg>
);
export const BookmarkOutlined = (props: IconProps) => <Icon component={bookmarkOutline} {...props} />;
export const BookmarkFilled = (props: IconProps) => <Icon component={bookmarkFill} {...props} />;
