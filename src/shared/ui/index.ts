/**
 * API pública do design system do Prontuário da Família.
 * Importe sempre daqui: `import { Button, useTheme } from '@/shared/ui'`.
 * Este módulo não conhece o domínio — mapeamentos de tipo de registro → cor/ícone vivem em entities/*\/ui.
 */

// Tokens
export * from './tokens';

// Tema
export { ThemeProvider, UiProvider, useTheme, createTheme, lightTheme, darkTheme, headerOptions } from './theme';
export type { Theme, ThemePreference, ThemeProviderProps } from './theme';

// Utilitários de apresentação
export { formatDate, parseISODate, toISODate, type DateFormat } from './lib/date';
export { categoricalIndexFor, getInitials } from './lib/identity';
export { selectionFeedback } from './lib/haptics';

// Componentes — base
export { Screen, type ScreenProps } from './components/Screen';
export { Text, type TextProps, type TextColor } from './components/Text';
export { Icon, icons, type IconName, type IconProps, type ColorRole } from './components/Icon';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { Skeleton, SkeletonListItem, type SkeletonProps } from './components/Skeleton';
export { Divider, type DividerProps } from './components/Divider';

// Ações
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';
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

// Conteúdo
export { Card, type CardProps } from './components/Card';
export { ListItem, type ListItemProps } from './components/ListItem';
export { Avatar, type AvatarProps, type AvatarSize } from './components/Avatar';
export { Chip, FilterChip, ChipGroup, type ChipProps, type ChipGroupProps, type ChipGroupOption } from './components/Chip';
export { Badge, type BadgeProps, type BadgeTone } from './components/Badge';

// Feedback e sobreposições
export { Banner, type BannerProps, type BannerTone } from './components/Banner';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { BottomSheet, type BottomSheetProps } from './components/BottomSheet';
export { ActionSheet, type ActionSheetProps, type ActionSheetOption } from './components/ActionSheet';
