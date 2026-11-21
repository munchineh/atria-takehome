/**
 * App icons (Mancini 10:48): Lucide line icons at a 1.75 stroke with round caps, in place of antd's thin outlined set.
 * Exported under the antd names the screens already use, and wrapped in span.anticon so antd's Button, Tag and Input
 * place and size them exactly as before (1em, currentColor). antd's own internal icons (select arrows, close buttons) stay antd.
 */
import { forwardRef, type CSSProperties, type MouseEventHandler } from 'react';
import * as L from 'lucide-react';

type P = { className?: string; style?: CSSProperties; onClick?: MouseEventHandler<HTMLSpanElement>; spin?: boolean; rotate?: number; 'aria-hidden'?: boolean | 'true' | 'false'; 'aria-label'?: string; title?: string };

function make(Icon: L.LucideIcon, opts: { fill?: boolean; badge?: boolean; spin?: boolean } = {}) {
  const C = forwardRef<HTMLSpanElement, P>(({ className, style, spin, rotate, ...rest }, ref) => (
    <span
      ref={ref}
      role="img"
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
      className={`anticon lucide-wrap ${spin || opts.spin ? 'anticon-spin' : ''} ${className ?? ''}`}
      style={{ ...style, ...(rotate ? { transform: `rotate(${rotate}deg)` } : null) }}
    >
      {opts.badge ? (
        // Filled status circles: solid disc, mark knocked out in white.
        <Icon size="1em" strokeWidth={2.25} fill="currentColor" color="currentColor" className="lucide-badge" />
      ) : (
        <Icon size="1em" strokeWidth={1.75} fill={opts.fill ? 'currentColor' : 'none'} />
      )}
    </span>
  ));
  C.displayName = Icon.displayName;
  return C;
}

export const AppstoreFilled = make(L.LayoutGrid, { fill: true });
export const AppstoreOutlined = make(L.LayoutGrid);
export const ArrowDownOutlined = make(L.ArrowDown);
export const ArrowRightOutlined = make(L.ArrowRight);
export const ArrowUpOutlined = make(L.ArrowUp);
export const BarChartOutlined = make(L.ChartNoAxesColumn);
export const BellOutlined = make(L.Bell);
export const BranchesOutlined = make(L.GitBranch);
export const BulbOutlined = make(L.Lightbulb);
export const CalendarOutlined = make(L.Calendar);
export const CaretRightFilled = make(L.Play, { fill: true });
export const CheckCircleFilled = make(L.CircleCheck, { badge: true });
export const CheckOutlined = make(L.Check);
export const ClockCircleOutlined = make(L.Clock);
export const CloseOutlined = make(L.X);
export const CloudUploadOutlined = make(L.CloudUpload);
export const CoffeeOutlined = make(L.Coffee);
export const CompassOutlined = make(L.Compass);
export const CopyOutlined = make(L.Copy);
export const DeleteOutlined = make(L.Trash2);
export const DislikeFilled = make(L.ThumbsDown, { fill: true });
export const DislikeOutlined = make(L.ThumbsDown);
export const DownOutlined = make(L.ChevronDown);
export const DownloadOutlined = make(L.Download);
export const EditOutlined = make(L.Pencil);
export const EllipsisOutlined = make(L.Ellipsis);
export const EnvironmentOutlined = make(L.MapPin);
export const ExclamationCircleFilled = make(L.CircleAlert, { badge: true });
export const ExclamationCircleOutlined = make(L.CircleAlert);
export const ExportOutlined = make(L.ExternalLink);
export const EyeOutlined = make(L.Eye);
export const FilterOutlined = make(L.ListFilter);
export const FlagOutlined = make(L.Flag);
export const FontSizeOutlined = make(L.Type);
export const FormOutlined = make(L.FileText);
export const GiftOutlined = make(L.Gift);
export const HeartOutlined = make(L.Heart);
export const HistoryOutlined = make(L.History);
export const HomeOutlined = make(L.House);
export const InfoCircleOutlined = make(L.Info);
export const LeftOutlined = make(L.ChevronLeft);
export const LikeFilled = make(L.ThumbsUp, { fill: true });
export const LikeOutlined = make(L.ThumbsUp);
export const LinkOutlined = make(L.Link);
export const LoadingOutlined = make(L.LoaderCircle, { spin: true });
export const MenuOutlined = make(L.Menu);
export const MessageOutlined = make(L.MessageCircle);
export const MinusOutlined = make(L.Minus);
export const MobileOutlined = make(L.Smartphone);
export const PictureOutlined = make(L.Image);
export const PlayCircleOutlined = make(L.CirclePlay);
export const PlusOutlined = make(L.Plus);
export const QuestionCircleOutlined = make(L.CircleHelp);
export const ReloadOutlined = make(L.RotateCw);
export const RightOutlined = make(L.ChevronRight);
export const SendOutlined = make(L.Send);
export const ShoppingCartOutlined = make(L.ShoppingCart);
export const SmileOutlined = make(L.Smile);
export const StarFilled = make(L.Star, { fill: true });
export const StarOutlined = make(L.Star);
export const SunOutlined = make(L.Sun);
export const SwapOutlined = make(L.ArrowLeftRight);
export const SyncOutlined = make(L.RefreshCw);
export const ThunderboltOutlined = make(L.Zap);
export const UnorderedListOutlined = make(L.List);
export const UserAddOutlined = make(L.UserPlus);
export const VideoCameraOutlined = make(L.Video);
export const WarningOutlined = make(L.TriangleAlert);
export const CopyPlusOutlined = make(L.CopyPlus);
