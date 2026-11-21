import { Button, Segmented, Select, Switch } from 'antd';
import { AppstoreOutlined, CloseOutlined, DownOutlined, FilterOutlined, SlidersOutlined, UnorderedListOutlined } from '../AppIcons';
import { GROUP_OPTIONS, type GroupBy, type Origin } from '../../data/gallery';
import { DEMO_ACCOUNTS } from '../../data/store';
import { PopSheet } from '../PopSheet';

export type UseFilter = 'all' | 'used' | 'unused';
export type Order = 'newest' | 'oldest' | 'name';
export interface GalleryFilters {
  accountId: string;
  origin: Origin | 'all';
  campaign: string;
  use: UseFilter;
  showArchived: boolean;
}

/**
 * Filter and Display menus (Mancini 10:34 reference, built 11:00). Two buttons replace a five-control toolbar.
 * Filter narrows what's shown; Display changes how it's shown. Desktop: popovers. Phones: bottom sheets (PopSheet).
 * Active filters stay visible as removable pills, so a filtered view is never hidden inside a closed menu.
 */
export function GalleryMenus({
  filters,
  onChange,
  onClear,
  defaultAccountId,
  campaigns,
  groupBy,
  onGroupBy,
  view,
  onView,
  order,
  onOrder,
}: {
  filters: GalleryFilters;
  onChange: (f: GalleryFilters) => void;
  onClear: () => void;
  defaultAccountId: string;
  campaigns: string[];
  groupBy: GroupBy;
  onGroupBy: (g: GroupBy) => void;
  view: 'grid' | 'list';
  onView: (v: 'grid' | 'list') => void;
  order: Order;
  onOrder: (o: Order) => void;
}) {
  const accountName = (id: string) => (id === 'all' ? 'All accounts' : DEMO_ACCOUNTS.find((a) => a.id === id)?.name ?? id);
  const pills: { key: string; label: string; remove: () => void }[] = [];
  if (filters.accountId !== defaultAccountId) pills.push({ key: 'acc', label: accountName(filters.accountId), remove: () => onChange({ ...filters, accountId: defaultAccountId }) });
  if (filters.campaign !== 'all') pills.push({ key: 'camp', label: filters.campaign, remove: () => onChange({ ...filters, campaign: 'all' }) });
  if (filters.use !== 'all') pills.push({ key: 'use', label: filters.use === 'used' ? 'In an ad' : 'Not in an ad', remove: () => onChange({ ...filters, use: 'all' }) });
  if (filters.showArchived) pills.push({ key: 'arch', label: 'Showing archived', remove: () => onChange({ ...filters, showArchived: false }) });

  const row = (label: string, control: React.ReactNode) => (
    <div className="menu-row">
      <span className="menu-label">{label}</span>
      {control}
    </div>
  );

  const filterBody = (
    <div className="menu-body">
      {row(
        'Ad account',
        <Select
          value={filters.accountId}
          onChange={(v) => onChange({ ...filters, accountId: v, campaign: 'all' })}
          options={[{ value: 'all', label: 'All accounts' }, ...DEMO_ACCOUNTS.map((a) => ({ value: a.id, label: a.name }))]}
          popupMatchSelectWidth={false}
          className="menu-select"
        />,
      )}
      {row(
        'Campaign',
        <Select
          value={filters.campaign}
          onChange={(v) => onChange({ ...filters, campaign: v })}
          options={[{ value: 'all', label: 'All campaigns' }, ...campaigns.map((c) => ({ value: c, label: c }))]}
          popupMatchSelectWidth={false}
          className="menu-select"
        />,
      )}
      {row(
        'Used in ads',
        <Segmented
          size="small"
          value={filters.use}
          onChange={(v) => onChange({ ...filters, use: v as UseFilter })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'used', label: 'In an ad' },
            { value: 'unused', label: 'Not yet' },
          ]}
        />,
      )}
      <div className="menu-row menu-switch">
        <span>
          <span className="menu-label">Show archived</span>
          <span className="t-help">Creatives you've archived stay here, out of the way.</span>
        </span>
        <Switch checked={filters.showArchived} onChange={(on) => onChange({ ...filters, showArchived: on })} aria-label="Show archived" />
      </div>
      {pills.length > 0 && (
        <Button type="link" className="inline-link menu-clear" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );

  const displayBody = (
    <div className="menu-body">
      <Segmented
        block
        className="menu-view"
        value={view}
        onChange={(v) => onView(v as 'grid' | 'list')}
        options={[
          { value: 'grid', label: <span className="menu-view-opt"><AppstoreOutlined />Grid</span> },
          { value: 'list', label: <span className="menu-view-opt"><UnorderedListOutlined />List</span> },
        ]}
      />
      {row('Group by', <Select value={groupBy} onChange={onGroupBy} options={GROUP_OPTIONS} className="menu-select" />)}
      {row(
        'Order',
        <Select
          value={order}
          onChange={onOrder}
          className="menu-select"
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'oldest', label: 'Oldest first' },
            { value: 'name', label: 'Name, A to Z' },
          ]}
        />,
      )}
    </div>
  );

  return (
    <div className="gal-menus">
      <div className="gal-menus-row">
        <PopSheet content={filterBody} title="Filter" trigger="click" placement="bottomLeft" classNames={{ root: 'menu-pop' }}>
          <Button icon={<FilterOutlined />} className={pills.length ? 'is-selected' : ''}>
            Filter{pills.length ? ` · ${pills.length}` : ''} <DownOutlined className="menu-chev" />
          </Button>
        </PopSheet>
        <PopSheet content={displayBody} title="Display" trigger="click" placement="bottomLeft" classNames={{ root: 'menu-pop' }}>
          <Button icon={<SlidersOutlined />}>
            Display <DownOutlined className="menu-chev" />
          </Button>
        </PopSheet>
      </div>
      {pills.length > 0 && (
        <div className="gal-pills">
          {pills.map((p) => (
            <button key={p.key} type="button" className="filter-pill" onClick={p.remove} aria-label={`Remove filter ${p.label}`}>
              {p.label} <CloseOutlined />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
