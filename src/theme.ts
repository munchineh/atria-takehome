import type { ThemeConfig } from 'antd';

/** Atria look: stock antd with an orange primary, Inter, 6px radius. */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#f5582a',
    colorLink: '#f5582a',
    colorInfo: '#1677ff',
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    colorText: '#1f1f1f',
    colorTextSecondary: '#6b6b6b',
    colorBorderSecondary: '#efefef',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.28s',
    motionEaseOut: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  },
  components: {
    Table: { headerBg: '#fafafa', headerSplitColor: 'transparent', rowHoverBg: '#fff7f3', cellPaddingBlockMD: 14 },
    Tabs: { itemSelectedColor: '#1f1f1f', inkBarColor: '#f5582a', itemColor: '#6b6b6b' },  },
};
