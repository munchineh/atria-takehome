import type { ThemeConfig } from 'antd';

/** Atria look: the Figma asset library (stock antd 5, primary #F66C30, Inter 14/22). Library tints: colorPrimaryBg #FFF7F0, colorPrimaryBorder #FFCEAD. Radius scale (L-030): 6 px controls and tags, 10 px cards, 14 px floating surfaces. */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#f66c30',
    colorLink: '#f66c30',
    colorInfo: '#1677ff',
    borderRadius: 6,
    borderRadiusLG: 10,
    // 5c A-29: small buttons, tags and small selects were 4 px (antd default); the scale says 6.
    borderRadiusSM: 6,
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
    Table: { headerBg: '#fafafa', headerSplitColor: 'transparent', rowHoverBg: '#fff7f0', cellPaddingBlockMD: 14 },
    Tabs: { itemSelectedColor: '#1f1f1f', inkBarColor: '#f66c30', itemColor: '#6b6b6b' },
    Modal: { borderRadiusLG: 14 },
    Popover: { borderRadiusLG: 14 },
    Notification: { borderRadiusLG: 14 },
    Drawer: { borderRadiusLG: 14 },
    Dropdown: { borderRadiusLG: 14 },
    // Controls stay at 6 px at every size (L-030): large inputs, selects and buttons were picking up 10.
    Input: { borderRadiusLG: 6 },
    // 5c A-32: the select's popup list is a floating surface; 10 reads as one with the control.
    Select: { borderRadiusLG: 6, optionSelectedBg: '#fff7f0' },
    Checkbox: { borderRadiusSM: 4 },
    Button: { borderRadiusLG: 6 },
    InputNumber: { borderRadiusLG: 6 },
  },
};
