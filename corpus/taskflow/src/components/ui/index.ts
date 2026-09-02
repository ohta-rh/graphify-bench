/**
 * Barrel re-exporting every design-system primitive. Domain components import
 * from here (`@/components/ui`) rather than reaching for individual files, so
 * the private helpers under `./_lib/` stay unexported and the public surface of
 * the design system is exactly this list.
 */

export { Alert } from "./alert";
export type { AlertProps } from "./alert";

export { Avatar, initialsOf } from "./avatar";
export type { AvatarProps } from "./avatar";

export { Badge } from "./badge";
export type { BadgeProps } from "./badge";

export { Button } from "./button";
export type { ButtonProps } from "./button";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export type { CardProps } from "./card";

export { Checkbox } from "./checkbox";
export type { CheckboxProps } from "./checkbox";

export { Combobox } from "./combobox";
export type { ComboboxOption, ComboboxProps } from "./combobox";

export { CommandPalette, flattenGroups } from "./command-palette";
export type {
  CommandGroup,
  CommandItemSpec,
  CommandPaletteProps,
} from "./command-palette";

export { DatePicker } from "./date-picker";
export type { DatePickerProps } from "./date-picker";

export { Dialog, DialogFooter, DialogHeader } from "./dialog";
export type { DialogProps } from "./dialog";

export { Drawer } from "./drawer";
export type { DrawerProps } from "./drawer";

export { DropdownMenu } from "./dropdown-menu";
export type { DropdownItem, DropdownMenuProps } from "./dropdown-menu";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";

export { ErrorMessage, errorMessageId } from "./error-message";
export type { ErrorMessageProps } from "./error-message";

export { FormField } from "./form-field";
export type { FormFieldProps } from "./form-field";

export { IconButton } from "./icon-button";
export type { IconButtonProps } from "./icon-button";

export { Input } from "./input";
export type { InputProps } from "./input";

export { Label } from "./label";
export type { LabelProps } from "./label";

export { Pagination } from "./pagination";
export type { PaginationProps } from "./pagination";

export { Popover } from "./popover";
export type { PopoverProps } from "./popover";

export { Progress, progressPercent } from "./progress";
export type { ProgressProps } from "./progress";

export { Select } from "./select";
export type { SelectOption, SelectProps } from "./select";

export { Skeleton, SkeletonLines } from "./skeleton";
export type { SkeletonProps } from "./skeleton";

export { Spinner } from "./spinner";
export type { SpinnerProps } from "./spinner";

export { Switch } from "./switch";
export type { SwitchProps } from "./switch";

export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./table";
export type { TableProps } from "./table";

export { Tabs } from "./tabs";
export type { TabSpec, TabsProps } from "./tabs";

export { TagInput } from "./tag-input";
export type { TagInputProps } from "./tag-input";

export { Textarea } from "./textarea";
export type { TextareaProps } from "./textarea";

export { Toast } from "./toast";
export type { ToastProps } from "./toast";

export { Toaster, TOAST_TIMEOUT_MS } from "./toaster";
export type { ToasterProps, ToastSpec } from "./toaster";

export { Tooltip } from "./tooltip";
export type { TooltipProps } from "./tooltip";
