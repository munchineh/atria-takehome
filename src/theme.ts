import type { ThemeConfig } from 'antd';

/** Atria look: stock antd with an orange primary and Inter. Radius scale (L-030): 6 px controls and tags, 10 px cards, 14 px floating surfaces. */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#f5582a',
    colorLink: '#f5582a',
    colorInfo: '#1677ff',
    borderRadius: 6,
    borderRadiusLG: 10,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    colorText: '#1f1f1f',
    colorTextSecondary: '#6b6b6b',
    colorBorderSecondary: '#efefef',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.28s',
    motionEaseOut: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    // antd's default 'back' curves overshoot (badges, popovers, switches). Flattened to match ours.
    motionEaseOutBack: 'cubic-bezier(0.2, 0, 0, 1)',
    motionEaseInBack: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },
  components: {
    Table: { headerBg: '#fafafa', headerSplitColor: 'transparent', rowHoverBg: '#fff7f3', cellPaddingBlockMD: 14 },
    Tabs: { itemSelectedColor: '#1f1f1f', inkBarColor: '#f5582a', itemColor: '#6b6b6b' },
    Modal: { borderRadiusLG: 14 },
    Popover: { borderRadiusLG: 14 },
    Notification: { borderRadiusLG: 14 },
    Drawer: { borderRadiusLG: 14 },
    Dropdown: { borderRadiusLG: 14 },
  },
};
