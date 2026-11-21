import { theme as antdTheme, type ThemeConfig } from 'antd';
import { duration } from './motion/tokens';

/**
 * Atria look (antd 6.7.1, primary #F66C30, Inter 14/22).
 * Library tints: colorPrimaryBg #FFF7F0, colorPrimaryBorder #FFCEAD.
 * Radius scale (L-030): 6 px controls and tags, 10 px cards, 14 px floating surfaces.
 * R-C2: orange text uses step 8 (#a83411) for AA contrast on white.
 * R-C10: tertiary text at 0.55 alpha (4.74:1) so actionable meta lines pass AA.
 * R-MO1/R-MO2: antd motion durations mirrored from src/motion/tokens.ts.
 */
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#f66c30',
    // Mancini 10:48: brown text links read as muddy. Links are ink, weight 500, and turn brand orange with an underline on hover.
    colorLink: '#1f1f1f',
    colorLinkHover: '#e0561c',
    colorLinkActive: '#1f1f1f',
    colorPrimaryText: '#a83411', // R-C2
    colorPrimaryTextHover: '#cf4e1f',
    colorPrimaryTextActive: '#821f07',
    colorPrimaryBg: '#fff7f0', // R-C9
    colorPrimaryBorder: '#ffcead', // R-C9
    colorInfo: '#1677ff', // R-C4: info semantic only; links use colorLink
    colorTextTertiary: 'rgba(0, 0, 0, 0.55)', // R-C10
    borderRadius: 6,
    borderRadiusLG: 10,
    borderRadiusSM: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    colorBorderSecondary: '#efefef',
    motionDurationFast: `${duration.instant}s`,
    motionDurationMid: `${duration.fast}s`,
    motionDurationSlow: `${duration.base}s`,
    motionEaseInOut: 'cubic-bezier(0.2, 0, 0, 1)',
    motionEaseOut: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    motionEaseOutBack: 'cubic-bezier(0.2, 0, 0, 1)',
    motionEaseInBack: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },
  components: {
    Table: { headerBg: '#fafafa', headerSplitColor: 'transparent', rowHoverBg: '#fff7f0', cellPaddingBlockMD: 14 },
    Tabs: { itemSelectedColor: 'rgba(0, 0, 0, 0.88)', inkBarColor: '#f66c30', itemColor: 'rgba(0, 0, 0, 0.65)' },
    Modal: { borderRadiusLG: 14 },
    Popover: { borderRadiusLG: 14 },
    Notification: { borderRadiusLG: 14 },
    Drawer: { borderRadiusLG: 14 },
    Dropdown: { borderRadiusLG: 14 },
    // Controls (Mancini 10:50, after Atria's Radar settings): fields and secondary buttons are tonal fills, not white boxes
    // with grey outlines. Focus and selection turn orange. Radius 8 for every control.
    Input: { borderRadius: 8, borderRadiusLG: 8, colorFillTertiary: '#f3f1f5', colorFillSecondary: '#ebe8ef', activeBg: '#ffffff', activeBorderColor: '#f66c30', hoverBorderColor: 'transparent' },
    Select: { borderRadius: 8, borderRadiusLG: 8, optionSelectedBg: '#fff1e8', optionSelectedColor: '#1f1f1f', colorFillTertiary: '#f3f1f5', colorFillSecondary: '#ebe8ef', activeBorderColor: '#f66c30' },
    InputNumber: { borderRadius: 8, borderRadiusLG: 8, colorFillTertiary: '#f3f1f5', activeBg: '#ffffff', activeBorderColor: '#f66c30' },
    Checkbox: { borderRadiusSM: 4 },
    Button: {
      borderRadius: 8,
      borderRadiusLG: 8,
      borderRadiusSM: 8,
      defaultBg: '#f3f1f5',
      defaultBorderColor: 'transparent',
      defaultColor: '#1f1f1f',
      defaultHoverBg: '#ebe8ef',
      defaultHoverBorderColor: 'transparent',
      defaultHoverColor: '#1f1f1f',
      defaultActiveBg: '#e3dfe8',
      defaultActiveBorderColor: 'transparent',
      defaultActiveColor: '#1f1f1f',
      defaultShadow: 'none',
      primaryShadow: 'none',
      fontWeight: 500,
    },
    Switch: { colorTextQuaternary: '#d6d2db', colorTextTertiary: '#c4bfca', trackHeight: 22, handleSize: 18, trackMinWidth: 40 },
    Segmented: { trackBg: '#f3f1f5', itemSelectedBg: '#ffffff', itemColor: 'rgba(0,0,0,0.6)', itemSelectedColor: '#1f1f1f', borderRadius: 8, borderRadiusSM: 6 },
    Radio: { colorPrimary: '#f66c30' },
  },
};

/** R-H9, G7 (R-C): nested dark theme for the expanding Create variations panel on AdDetail. */
export const darkBarTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: '#f66c30',
    colorLink: '#ffb185',
    colorLinkHover: '#ffcead',
    colorLinkActive: '#f66c30',
    colorBgContainer: '#2a272e',
    colorBgElevated: '#2a272e',
    borderRadius: 6,
  },
};
