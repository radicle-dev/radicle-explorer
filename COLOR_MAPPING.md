# Color Token Migration: Explorer → Garden

## Complete Mapping Table

### Text/Foreground Colors
| Old (Explorer) | New (Garden) | Notes |
|---|---|---|
| `--color-foreground-contrast` | `--color-text-primary` | Primary text color |
| `--color-foreground-dim` | `--color-text-tertiary` | Secondary/muted text |
| `--color-foreground-disabled` | `--color-text-disabled` | Disabled state text |
| `--color-foreground-emphasized` | `--color-surface-brand-primary` | **Changed from text to surface!** |
| `--color-foreground-emphasized-hover` | `--color-text-on-brand` | Text on brand backgrounds |
| `--color-foreground-match-background` | `--color-text-on-brand` | Text on filled backgrounds |
| `--color-foreground-success` | `--color-text-open` | Success/open state text |
| `--color-foreground-red` | `--color-feedback-error-text` | Error text |
| `--color-foreground-yellow` | `--color-text-archived` | Warning/archived text |
| `--color-foreground-primary` | `--color-text-merged` or `--color-text-tertiary` | **Context dependent - needs manual review** |
| `--color-foreground-primary-hover` | **REMOVED** | Not used in new system |
| `--color-foreground-white` | `#ffffff` or keep | Utility color |
| `--color-foreground-black` | `#000000` or keep | Utility color |

### Surface/Background Colors
| Old (Explorer) | New (Garden) | Notes |
|---|---|---|
| `--color-background-default` | `--color-surface-base` | Page background |
| `--color-background-float` | `--color-surface-subtle` | Elevated surfaces |
| `--color-background-dip` | `--color-surface-base` | Inset surfaces |

### Fill Colors
| Old (Explorer) | New (Garden) | Notes |
|---|---|---|
| `--color-fill-ghost` | `--color-surface-mid` | Subtle fills |
| `--color-fill-ghost-hover` | `--color-surface-strong` | Hover state |
| `--color-fill-float` | `--color-surface-subtle` | Floating element fills |
| `--color-fill-float-hover` | `--color-border-alpha-subtle` | Hover state for floats |
| `--color-fill-secondary` | `--color-surface-brand-primary` | Brand/primary fill |
| `--color-fill-secondary-hover` | `--color-surface-brand-secondary` | Brand hover state |
| `--color-fill-secondary-counter` | **REMOVED** | No longer used |
| `--color-fill-primary` | **Context dependent** | **Needs manual review** |
| `--color-fill-primary-hover` | **Context dependent** | **Needs manual review** |
| `--color-fill-gray` | `--color-text-tertiary` | **Changed from fill to text!** |
| `--color-fill-selected` | `--color-surface-brand-primary` | Selected state |
| `--color-fill-separator` | `--color-border-subtle` | Dividers/separators |
| `--color-fill-counter` | `--color-surface-alpha-subtle` | Counter badges |
| `--color-fill-counter-emphasized` | **REMOVED** | No longer used |
| `--color-fill-merged` | `--color-surface-merged` | Merged patch state |
| `--color-fill-delegate` | `--color-surface-merged` | **Semantic change: delegate→merged** |
| `--color-fill-private` | `--color-surface-archived` | **Semantic change: private→archived** |
| `--color-fill-diff-green` | `--color-feedback-success-bg` | Diff additions |
| `--color-fill-diff-green-light` | `--color-feedback-success-bg` | Diff additions (light) |
| `--color-fill-diff-red` | `--color-feedback-error-bg` | Diff deletions |
| `--color-fill-diff-red-light` | `--color-feedback-error-bg` | Diff deletions (light) |
| `--color-fill-yellow` | `--color-feedback-warning-text` | **Context dependent** |
| `--color-fill-yellow-iconic` | **Context dependent** | **Needs review** |
| `--color-fill-success` | `--color-feedback-success-bg` or `--color-text-open` | **Context dependent** |
| `--color-fill-danger` | `--color-feedback-error-bg` or `--color-feedback-error-text` | **Context dependent** |
| `--color-fill-warning` | `--color-feedback-warning-bg` | Warning backgrounds |
| `--color-fill-contrast` | `--color-text-primary` | **Changed from fill to text** |

### Border Colors
| Old (Explorer) | New (Garden) | Notes |
|---|---|---|
| `--color-border-hint` | `--color-border-subtle` | Subtle borders |
| `--color-border-default` | `--color-border-mid` | Standard borders |
| `--color-border-focus` | `--color-border-brand` | Focus/active borders |
| `--color-border-primary` | `--color-border-brand` | Brand accent borders |
| `--color-border-primary-hover` | **REMOVED** | Not used in new system |
| `--color-border-error` | `--color-feedback-error-border` | Error borders |
| `--color-border-warning` | `--color-feedback-warning-border` | Warning borders |
| `--color-border-success` | `--color-feedback-success-border` | Success borders |
| `--color-border-selected` | **Context dependent** | **Needs review** |
| `--color-border-merged` | **Context dependent** | **Needs review** |
| `--color-border-match-background` | **REMOVED** | Not used in new system |
| `--color-border-contrast` | **Context dependent** | **Needs review** |

## Manual Review Required

The following need to be checked case-by-case as they're context-dependent:

1. `--color-foreground-primary` - sometimes text, sometimes brand
2. `--color-fill-primary` - varies by usage
3. `--color-fill-yellow` and `--color-fill-yellow-iconic`
4. `--color-border-selected`
5. `--color-border-merged`
6. `--color-border-contrast`

## Typo Found

- `--color-foregroung-disabled` (4 occurrences) → should be `--color-foreground-disabled`
