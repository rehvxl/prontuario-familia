/**
 * API pública do design system do Prontuário da Família.
 * Importe sempre daqui: `import { Button, useTheme } from '@/shared/ui'`.
 * Este módulo não conhece o domínio — mapeamentos de tipo de registro → cor/ícone vivem em entities/*\/ui.
 */

// Tokens
export * from './tokens';

// Tema
export {
  ThemeProvider,
  UiProvider,
  HueProvider,
  useTheme,
  createTheme,
  lightTheme,
  darkTheme,
  onLeaf,
  withHue,
  headerOptions,
  headerTitleColors,
  headerTitleStyles,
  nativeScrollProps,
} from './theme';
export type { Theme, ThemePreference, ThemeProviderProps, HueProviderProps, CreateThemeOptions, GlassState, HeaderOptionsConfig, NativeColors } from './theme';

// Utilitários de apresentação
export { formatDate, parseISODate, toISODate, type DateFormat } from './lib/date';
export { categoricalIndexFor, getInitials, registerPersonHues } from './lib/identity';
export { selectionFeedback } from './lib/haptics';
export { STACK_FONT_SCALE, useStackedLayout } from './lib/a11y';

// Componentes — base
export { Screen, ScrollEdgeVeil, useScreenHorizontalInset, useFloatingFooterInset, FLOATING_ACTION_HEIGHT, type ScreenProps, type FloatingFooterInsetOptions } from './components/Screen';
export { screenTitleProps, type TitleStyleProps } from './components/screenTitleProps';
export { Text, type TextProps, type TextColor } from './components/Text';
export {
  Icon,
  icons,
  ICON_MAP,
  nativeIcon,
  resolveIcon,
  type IconName,
  type IconProps,
  type ColorRole,
  type SemanticIconName,
  type LegacyIconName,
  type NativeIconSpec,
} from './components/Icon';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { Skeleton, SkeletonListItem, type SkeletonProps } from './components/Skeleton';
export { Divider, type DividerProps } from './components/Divider';

// Pasta com divisórias (v4)
export { DividerBoard, useRailAsStrip, RAIL_STRIP_FONT_SCALE, type DividerBoardProps } from './components/DividerBoard';
export { Leaf, leafContentInset, type LeafProps } from './components/Leaf';
export { RAIL_TAB_ROLE, TabRail, tabHeights, type TabRailProps, type TabRailItem } from './components/TabRail';
export { TabMark, type TabMarkProps } from './components/TabMark';
export { StateLine, type StateLineProps } from './components/StateLine';

// Ações
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize, type ButtonStyleName, type ButtonRole } from './components/Button';
export { FloatingActionButton, type FloatingActionButtonProps } from './components/FloatingActionButton';
export { Menu, ContextMenu, type MenuItem, type MenuProps } from './components/Menu';
export { IconButton, type IconButtonProps, type IconButtonVariant } from './components/IconButton';

// Formulário
export { FieldLabel, FieldMessage, type FieldLabelProps } from './components/FieldMessage';
export { TextField, type TextFieldProps } from './components/TextField';
export { SearchField, type SearchFieldProps } from './components/SearchField';
export { OtpInput, sanitizeOtp, type OtpInputProps } from './components/OtpInput';
export { DateField, type DateFieldProps } from './components/DateField';
export { Select, type SelectProps, type SelectOption } from './components/Select';
export { SegmentedControl, type SegmentedControlProps, type SegmentOption } from './components/SegmentedControl';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Switch, type SwitchProps } from './components/Switch';

// Conteúdo
export { Card, type CardProps } from './components/Card';
export { ListItem, type ListItemProps } from './components/ListItem';
export { ListSection, type ListSectionProps } from './components/ListSection';
export { GlassSurface, type GlassSurfaceProps, type GlassSurfaceShape } from './components/GlassSurface';
export { Avatar, type AvatarProps, type AvatarSize } from './components/Avatar';
export { Chip, FilterChip, ChipGroup, type ChipProps, type ChipGroupProps, type ChipGroupOption } from './components/Chip';
export { Badge, DemoBadge, type BadgeProps, type BadgeTone, type DemoBadgeProps } from './components/Badge';
export { IconTile, type IconTileProps } from './components/IconTile';

// Saúde (v3): genéricos, sem domínio — o estado clínico chega pronto (`computeFlag` em entities/measurement).
export { REFERENCE_STATE_APPEARANCE, type ReferenceState, type ReferenceRange, type Confidence } from './components/clinical';
export { SectionHeader, type SectionHeaderProps } from './components/SectionHeader';
export { StateChip, type StateChipProps } from './components/StateChip';
export { MetricValue, metricAccessibilityLabel, type MetricValueProps } from './components/MetricValue';
export { RangeBar, rangeBarGeometry, type RangeBarProps, type RangeBarGeometry } from './components/RangeBar';
export { SummaryCard, StatTile, StatTileGroup, type SummaryCardProps, type StatTileProps } from './components/SummaryCard';
export { Sparkline, type SparklineProps } from './components/Sparkline';
export { TrendChart, TREND_SINGLE_POINT_TEXT, sharedBand, niceScale, type TrendChartProps, type TrendPoint } from './components/TrendChart';
export { AttentionList, type AttentionListProps, type AttentionItemView, type AttentionTone } from './components/AttentionList';
export { SuggestedField, suggestedFieldLabel, quoteEvidence, type SuggestedFieldProps } from './components/SuggestedField';
export { ProgressSteps, type ProgressStepsProps } from './components/ProgressSteps';

// Feedback e sobreposições
export { Banner, type BannerProps, type BannerTone } from './components/Banner';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { ListSkeleton, LoadErrorState, OfflineBanner, errorMessage } from './components/ScreenState';
export { BottomSheet, type BottomSheetProps, type BottomSheetDetent } from './components/BottomSheet';
export { ActionSheet, type ActionSheetProps, type ActionSheetOption } from './components/ActionSheet';
export { ConfirmSheet, type ConfirmSheetProps } from './components/ConfirmSheet';
