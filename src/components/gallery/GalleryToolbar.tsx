import { useState } from 'react';
import { Badge, Button, Checkbox, Drawer, Grid, Segmented, Select, Tooltip } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined, CheckOutlined, CloseOutlined, FilterOutlined, StarFilled, StarOutlined } from '../AppIcons';
import { GROUP_OPTIONS, type GroupBy, type Origin } from '../../data/gallery';
import { DEMO_ACCOUNTS } from '../../data/store';
import { PopSheet } from '../PopSheet';

export interface GalleryFilters {
  accountId: string;
  origin: Origin | 'all';
  campaign: string;
  shortlistedOnly: boolean;
}

/**
 * Creative gallery filter and Group by toolbar (DL-15).
 * Desktop (>= 768px): single-line filter row + Group by Select on the right.
 * Phone (< 768px): Group by bottom sheet + Filters bottom sheet with active count badge.
 */
export function GalleryToolbar({
  filters,
  onChangeFilters,
  onClearFilters,
  groupBy,
  onChangeGroupBy,
  campaigns,
  shortlistedCount,
  defaultAccountId,
  view,
  onChangeView,
}: {
  view: 'grid' | 'list';
  onChangeView: (v: 'grid' | 'list') => void;
  filters: GalleryFilters;
  onChangeFilters: (next: GalleryFilters) => void;
  onClearFilters: () => void;
  groupBy: GroupBy;
  onChangeGroupBy: (by: GroupBy) => void;
  campaigns: string[];
  shortlistedCount: number;
  defaultAccountId: string;
}) {
  const bp = Grid.useBreakpoint();
  const mobile = !bp.md;
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const viewToggle = (
    <Segmented
      size="small"
      className="gal-view-toggle"
      value={view}
      onChange={(v) => onChangeView(v as 'grid' | 'list')}
      options={[
        { value: 'grid', icon: <Tooltip title="Grid"><AppstoreOutlined aria-label="Grid view" /></Tooltip> },
        { value: 'list', icon: <Tooltip title="List"><UnorderedListOutlined aria-label="List view" /></Tooltip> },
      ]}
    />
  );
  const accountOptions = [
    { value: 'all', label: 'All brands' },
    ...DEMO_ACCOUNTS.map((a) => ({ value: a.id, label: a.name })),
  ];
  const campaignOptions = [
    { value: 'all', label: 'All campaigns' },
    ...campaigns.map((c) => ({ value: c, label: c })),
  ];

  const activeCount =
    (filters.accountId !== defaultAccountId ? 1 : 0) +
    (filters.campaign !== 'all' ? 1 : 0) +
    (filters.shortlistedOnly ? 1 : 0);

  const currentGroupLabel = GROUP_OPTIONS.find((g) => g.value === groupBy)?.label ?? 'No grouping';

  if (mobile) {
    const activePills: { key: string; label: string; remove: () => void }[] = [];
    if (filters.accountId !== defaultAccountId) {
      const lbl = accountOptions.find((a) => a.value === filters.accountId)?.label ?? filters.accountId;
      activePills.push({ key: 'acct', label: lbl, remove: () => onChangeFilters({ ...filters, accountId: defaultAccountId }) });
    }
    if (filters.campaign !== 'all') {
      activePills.push({ key: 'camp', label: filters.campaign, remove: () => onChangeFilters({ ...filters, campaign: 'all' }) });
    }
    if (filters.shortlistedOnly) {
      activePills.push({ key: 'short', label: 'Shortlisted', remove: () => onChangeFilters({ ...filters, shortlistedOnly: false }) });
    }
    const visiblePills = activePills.slice(0, 2);
    const extraCount = activePills.length - visiblePills.length;

    const filterSheetContent = (
      <div className="gal-filter-sheet">
        <div className="filters-row">
          <div className="filters-label t-label">Brand</div>
          <Select
            value={filters.accountId}
            onChange={(v) => onChangeFilters({ ...filters, accountId: v, campaign: 'all' })}
            options={accountOptions}
            className="filters-search"
            getPopupContainer={(n) => n.parentElement ?? document.body}
          />
        </div>
        <div className="filters-row">
          <div className="filters-label t-label">Campaign</div>
          <Select
            showSearch
            value={filters.campaign}
            onChange={(v) => onChangeFilters({ ...filters, campaign: v })}
            options={campaignOptions}
            placeholder="Search campaigns"
            className="filters-search"
            classNames={{ popup: { root: 'wrap-options' } }}
            optionFilterProp="label"
            getPopupContainer={(n) => n.parentElement ?? document.body}
          />
        </div>
        <div className="filters-row">
          <Checkbox
            checked={filters.shortlistedOnly}
            onChange={(e) => onChangeFilters({ ...filters, shortlistedOnly: e.target.checked })}
          >
            Shortlisted only{shortlistedCount > 0 ? `\u00a0· ${shortlistedCount}` : ''}
          </Checkbox>
        </div>
        <div className="filters-foot">
          <Button size="small" type="text" disabled={!activeCount} onClick={onClearFilters}>
            Clear all
          </Button>
          <Button size="middle" type="primary" onClick={() => setFilterSheetOpen(false)}>
            Done
          </Button>
        </div>
      </div>
    );

    return (
      <div className="gal-toolbar-phone">
        <div className="gal-toolbar-phone-row">
          <Button
            className="gal-group-trigger"
            onClick={() => setGroupSheetOpen(true)}
            aria-label={`Group by: ${currentGroupLabel}`}
          >
            Group by {currentGroupLabel.toLowerCase()}
          </Button>
          {viewToggle}

          <PopSheet
            content={filterSheetContent}
            sheetTitle="Filters"
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            trigger="click"
          >
            <span className="filters-trigger">
              <Badge count={activeCount} size="small" color="#f66c30">
                <Button icon={<FilterOutlined />} aria-label="Filters" className="filters-btn" />
              </Badge>
            </span>
          </PopSheet>
        </div>

        {activePills.length > 0 && (
          <div className="active-filters">
            {visiblePills.map((p) => (
              <span key={p.key} className="filter-pill">
                <span className="ellipsis">{p.label}</span>
                <button type="button" aria-label={`Remove ${p.label}`} onClick={p.remove}>
                  <CloseOutlined />
                </button>
              </span>
            ))}
            {extraCount > 0 && (
              <button
                type="button"
                className="filter-pill filter-more"
                onClick={() => setFilterSheetOpen(true)}
                aria-label={`Show ${extraCount} more active filters`}
              >
                +{extraCount}
              </button>
            )}
            <Button type="link" size="small" className="inline-link clear-all" onClick={onClearFilters}>
              Clear all
            </Button>
          </div>
        )}

        <Drawer
          open={groupSheetOpen}
          onClose={() => setGroupSheetOpen(false)}
          placement="bottom"
          size="auto"
          closable={false}
          extra={
            <Button
              type="text"
              icon={<CloseOutlined />}
              aria-label="Close"
              className="sheet-close-btn"
              onClick={() => setGroupSheetOpen(false)}
            />
          }
          title="Group creatives by"
          className="pop-sheet period-sheet"
          destroyOnHidden
        >
          <div className="period-list" role="radiogroup" aria-label="Group creatives by">
            {GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={opt.value === groupBy}
                className={`period-row${opt.value === groupBy ? ' on' : ''}`}
                onClick={() => {
                  onChangeGroupBy(opt.value);
                  setGroupSheetOpen(false);
                }}
              >
                <span className="period-name">{opt.label}</span>
                <CheckOutlined className="period-check" />
              </button>
            ))}
          </div>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="gal-toolbar" role="region" aria-label="Gallery filters and grouping">
      <div className="gal-filters">
        <Select
          value={filters.accountId}
          onChange={(v) => onChangeFilters({ ...filters, accountId: v, campaign: 'all' })}
          aria-label="Brand"
          options={accountOptions}
          popupMatchSelectWidth={false}
        />
        <Select
          showSearch
          value={filters.campaign}
          onChange={(v) => onChangeFilters({ ...filters, campaign: v })}
          placeholder="Search campaigns"
          aria-label="Campaign"
          className="gal-campaign-select"
          classNames={{ popup: { root: 'wrap-options' } }}
          popupMatchSelectWidth={360}
          optionFilterProp="label"
          options={campaignOptions}
        />
        <Button
          icon={filters.shortlistedOnly ? <StarFilled /> : <StarOutlined />}
          className={`gal-shortlist-btn ${filters.shortlistedOnly ? 'on' : ''}`}
          aria-pressed={filters.shortlistedOnly}
          disabled={shortlistedCount === 0 && !filters.shortlistedOnly}
          onClick={() => onChangeFilters({ ...filters, shortlistedOnly: !filters.shortlistedOnly })}
        >
          Shortlisted{shortlistedCount > 0 ? `\u00a0· ${shortlistedCount}` : ''}
        </Button>
        {activeCount > 0 && (
          <Button type="link" size="small" className="inline-link" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="gal-group-control">
        <span className="t-label">Group by</span>
        <Select
          value={groupBy}
          onChange={onChangeGroupBy}
          aria-label="Group by"
          options={GROUP_OPTIONS}
          popupMatchSelectWidth={false}
        />
        {viewToggle}
      </div>
    </div>
  );
}
