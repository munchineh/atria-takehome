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
    // S-13, V-03: links in the library orange (not the old AA brown #a83411; contrast 3.0:1 is a known trade-off, annotated).
    colorLink: '#f66c30',
    colorLinkHover: '#ff8f5c',
    colorLinkActive: '#d4531c',
    colorPrimaryText: '#a83411', // R-C2
    colorPrimaryTextHover: '#cf4e1f',
    colorPrimaryTextActive: '#821f07',
    colorPrimaryBg: '#fff7f0', // R-C9
    colorPrimaryBorder: '#ffcead', // R-C9
    colorInfo: '#1677ff', // R-C4: info semantic only; links use colorLink
    colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
    colorTextTertiary: 'rgba(0, 0, 0, 0.45)', // library colorTextDescription (S-01)
    colorBgLayout: '#f5f5f5',
    colorSuccess: '#18b723',
    colorWarning: '#f38d05',
    colorError: '#ed383b',
    fontWeightStrong: 600,
    lineHeight: 22 / 14,
    borderRadius: 6,
    borderRadiusLG: 8,
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
    // LP-05: selected tab label orange as in the library and FG2.
    Tabs: { itemSelectedColor: '#f66c30', inkBarColor: '#f66c30', itemColor: 'rgba(0, 0, 0, 0.65)', titleFontSize: 14 },
    // V-05: one radius (8) for every floating surface.
    Modal: { borderRadiusLG: 8 },
    Popover: { borderRadiusLG: 8 },
    Notification: { borderRadiusLG: 8 },
    Drawer: { borderRadiusLG: 8 },
    Dropdown: { borderRadiusLG: 8 },
    // Controls follow the asset library as drawn (S-11, S-22, V-02): white, 1 px outline, radius 6.
    Input: { borderRadius: 6, borderRadiusLG: 6 },
    Select: { borderRadius: 6, borderRadiusLG: 6, optionSelectedBg: '#fff7f0' },
    InputNumber: { borderRadius: 6, borderRadiusLG: 6 },
    Checkbox: { borderRadiusSM: 4 },
    Button: { borderRadius: 6, borderRadiusLG: 6, borderRadiusSM: 6, fontWeight: 400, primaryShadow: 'none', defaultShadow: 'none' },
    Segmented: { borderRadius: 6, borderRadiusSM: 4 },
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
