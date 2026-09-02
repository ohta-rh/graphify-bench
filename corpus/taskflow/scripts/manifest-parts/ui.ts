import type { ManifestEntry } from "../manifest-types";

/** Owner A — the design system. Presentational only: no data access, no
 *  `can()`, no service imports. Domain components compose these. */

type UiSpec = [
  file: string,
  component: string,
  props: string,
  responsibility: string,
  client?: boolean,
];

const UI: UiSpec[] = [
  ["button", "Button", "{ variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit'; onClick?: () => void; className?: string; children?: ReactNode }", "Primary action button with variant/size/loading states."],
  ["icon-button", "IconButton", "{ label: string; icon: ReactNode; variant?: 'ghost' | 'solid'; size?: 'sm' | 'md'; onClick?: () => void; disabled?: boolean; className?: string }", "Square icon-only button carrying an accessible label."],
  ["input", "Input", "{ name: string; value?: string; defaultValue?: string; placeholder?: string; type?: 'text' | 'email' | 'password' | 'search' | 'url'; invalid?: boolean; disabled?: boolean; onChange?: (value: string) => void; className?: string }", "Single-line text field."],
  ["textarea", "Textarea", "{ name: string; value?: string; defaultValue?: string; rows?: number; placeholder?: string; invalid?: boolean; onChange?: (value: string) => void; className?: string }", "Multi-line text field with auto-grow."],
  ["label", "Label", "{ htmlFor: string; required?: boolean; className?: string; children?: ReactNode }", "Form label with a required marker."],
  ["select", "Select", "{ name: string; value?: string; options: readonly SelectOption[]; placeholder?: string; disabled?: boolean; onChange?: (value: string) => void; className?: string }", "Native-backed single select."],
  ["combobox", "Combobox", "{ value: string | null; options: readonly ComboboxOption[]; placeholder?: string; emptyLabel?: string; onChange: (value: string | null) => void; className?: string }", "Filterable single-select with keyboard navigation.", true],
  ["checkbox", "Checkbox", "{ name: string; checked?: boolean; defaultChecked?: boolean; disabled?: boolean; onChange?: (checked: boolean) => void; children?: ReactNode }", "Checkbox with an inline label."],
  ["switch", "Switch", "{ name: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void; label?: string }", "Boolean toggle used across the settings pages.", true],
  ["badge", "Badge", "{ tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'; size?: 'sm' | 'md'; className?: string; children?: ReactNode }", "Small status pill."],
  ["avatar", "Avatar", "{ name: string; src?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }", "User avatar falling back to initials."],
  ["card", "Card", "{ padded?: boolean; className?: string; children?: ReactNode }", "Surface container; also exports header/title/content/footer parts."],
  ["dialog", "Dialog", "{ open: boolean; title: string; description?: string; onClose: () => void; footer?: ReactNode; children?: ReactNode }", "Modal dialog with focus trap.", true],
  ["drawer", "Drawer", "{ open: boolean; side?: 'left' | 'right'; title?: string; onClose: () => void; children?: ReactNode }", "Slide-over panel.", true],
  ["popover", "Popover", "{ open: boolean; anchor: ReactNode; placement?: 'top' | 'bottom' | 'left' | 'right'; onOpenChange: (open: boolean) => void; children?: ReactNode }", "Anchored floating panel.", true],
  ["tooltip", "Tooltip", "{ content: string; placement?: 'top' | 'bottom'; delayMs?: number; children?: ReactNode }", "Hover/focus tooltip.", true],
  ["dropdown-menu", "DropdownMenu", "{ trigger: ReactNode; items: readonly DropdownItem[]; align?: 'start' | 'end' }", "Trigger-anchored action menu.", true],
  ["tabs", "Tabs", "{ value: string; tabs: readonly TabSpec[]; onChange: (value: string) => void; className?: string }", "Horizontal tab bar.", true],
  ["table", "Table", "{ caption?: string; className?: string; children?: ReactNode }", "Data table primitives (head/body/row/cell)."],
  ["pagination", "Pagination", "{ page: number; perPage: number; total: number; onPageChange: (page: number) => void }", "Page-number pagination control.", true],
  ["toast", "Toast", "{ id: string; title: string; description?: string; tone?: 'neutral' | 'success' | 'danger'; onDismiss: (id: string) => void }", "One transient notification card."],
  ["toaster", "Toaster", "{ toasts: readonly ToastSpec[]; onDismiss: (id: string) => void }", "Fixed-position toast region fed by `useToast`.", true],
  ["alert", "Alert", "{ tone?: 'info' | 'success' | 'warning' | 'danger'; title: string; className?: string; children?: ReactNode }", "Inline banner for page-level messages."],
  ["error-message", "ErrorMessage", "{ message?: string | null; fieldId?: string }", "Field-level validation message bound to an input."],
  ["empty-state", "EmptyState", "{ title: string; description?: string; icon?: ReactNode; action?: ReactNode }", "Zero-data placeholder."],
  ["skeleton", "Skeleton", "{ width?: string; height?: string; rounded?: boolean; className?: string }", "Shimmer placeholder used by every `loading.tsx`."],
  ["spinner", "Spinner", "{ size?: 'sm' | 'md' | 'lg'; label?: string }", "Indeterminate progress indicator."],
  ["progress", "Progress", "{ value: number; max?: number; tone?: 'brand' | 'warning' | 'danger'; label?: string }", "Determinate progress bar; the usage meter builds on it."],
  ["form-field", "FormField", "{ name: string; label: string; hint?: string; error?: string | null; required?: boolean; children?: ReactNode }", "Label + control + hint + error layout used by every form."],
  ["tag-input", "TagInput", "{ values: readonly string[]; placeholder?: string; max?: number; onChange: (values: readonly string[]) => void }", "Chip-style multi-value entry.", true],
  ["date-picker", "DatePicker", "{ value: string | null; min?: string; max?: string; onChange: (value: string | null) => void; placeholder?: string }", "Calendar popover returning an ISO date string.", true],
  ["command-palette", "CommandPalette", "{ open: boolean; groups: readonly CommandGroup[]; placeholder?: string; onClose: () => void; onSelect: (id: string) => void }", "Ctrl+K overlay shell; the domain layer supplies the groups.", true],
];

const EXTRA_TYPES: Record<string, [name: string, rhs: string][]> = {
  select: [["SelectOption", "{ value: string; label: string; disabled?: boolean }"]],
  combobox: [["ComboboxOption", "{ value: string; label: string; description?: string }"]],
  "dropdown-menu": [["DropdownItem", "{ id: string; label: string; icon?: ReactNode; destructive?: boolean; onSelect: () => void }"]],
  tabs: [["TabSpec", "{ value: string; label: string; count?: number }"]],
  breadcrumb: [["BreadcrumbItem", "{ label: string; href?: string }"]],
  toaster: [["ToastSpec", "{ id: string; title: string; description?: string; tone?: 'neutral' | 'success' | 'danger' }"]],
  "command-palette": [
    ["CommandGroup", "{ heading: string; items: readonly CommandItemSpec[] }"],
    ["CommandItemSpec", "{ id: string; label: string; hint?: string; shortcut?: string }"],
  ],
};

const COMPOUND: Record<string, string[]> = {
  card: ["CardHeader", "CardTitle", "CardDescription", "CardContent", "CardFooter"],
  table: ["TableHead", "TableBody", "TableRow", "TableCell", "TableHeaderCell"],
  dialog: ["DialogFooter", "DialogHeader"],
};

export const uiEntries: ManifestEntry[] = UI.map(
  ([file, component, props, responsibility, client]) => {
    const propsType = `${component}Props`;
    const extras = EXTRA_TYPES[file] ?? [];
    const compound = COMPOUND[file] ?? [];
    return {
      path: `src/components/ui/${file}.tsx`,
      owner: "A",
      responsibility,
      client: client === true,
      exports: [
        ...extras.map(([name, rhs]) => ({
          name,
          kind: "type" as const,
          signature: rhs,
        })),
        { name: propsType, kind: "type" as const, signature: props },
        {
          name: component,
          kind: "component" as const,
          signature: `(props: ${propsType}): ReactElement | null`,
        },
        ...compound.map((name) => ({
          name,
          kind: "component" as const,
          signature: `(props: { className?: string; children?: ReactNode }): ReactElement | null`,
        })),
      ],
    };
  },
);

uiEntries.push({
  path: "src/components/ui/index.ts",
  owner: "A",
  responsibility:
    "Barrel re-exporting every design-system primitive. Domain components import from here.",
  exports: [],
});
