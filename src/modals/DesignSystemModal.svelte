<script lang="ts">
  import { followSystemTheme, theme } from "@app/lib/appearance";

  import Button from "@app/components/Button.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Modal from "@app/components/Modal.svelte";
  import Radio from "@app/components/Radio.svelte";

  function extractCssVariables(variableName: string) {
    return Array.from(document.styleSheets)
      .filter(
        sheet =>
          sheet.href === null || sheet.href.startsWith(window.location.origin),
      )
      .reduce<string[]>(
        (acc, sheet) =>
          (acc = [
            ...acc,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            ...Array.from(sheet.cssRules).reduce(
              (def, rule) =>
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                (def =
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  rule.selectorText === ":root"
                    ? [
                        ...def,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        ...Array.from(rule.style).filter(name =>
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          // @ts-ignore
                          name.startsWith(variableName),
                        ),
                      ]
                    : def),
              [],
            ),
          ]),
        [],
      );
  }

  // rg "\--color-\w*-\w*" -o --no-line-number --no-filename -g "\!public/colors.css" -g "\!ColorPaletteModal.svelte" | sort | uniq | jq -sRM 'split("\n")[:-1]'
  const usedColors = [
    "--color-accent-blue",
    "--color-background-",
    "--color-background-default",
    "--color-background-dip",
    "--color-background-float",
    "--color-border-",
    "--color-border-alpha",
    "--color-border-brand",
    "--color-border-contrast",
    "--color-border-default",
    "--color-border-error",
    "--color-border-focus",
    "--color-border-hint",
    "--color-border-match",
    "--color-border-merged",
    "--color-border-mid",
    "--color-border-primary",
    "--color-border-selected",
    "--color-border-strong",
    "--color-border-subtle",
    "--color-border-success",
    "--color-border-warning",
    "--color-feedback-",
    "--color-feedback-error",
    "--color-feedback-success",
    "--color-feedback-warning",
    "--color-fill-",
    "--color-fill-contrast",
    "--color-fill-counter",
    "--color-fill-danger",
    "--color-fill-delegate",
    "--color-fill-diff",
    "--color-fill-float",
    "--color-fill-ghost",
    "--color-fill-gray",
    "--color-fill-merged",
    "--color-fill-primary",
    "--color-fill-private",
    "--color-fill-secondary",
    "--color-fill-selected",
    "--color-fill-separator",
    "--color-fill-success",
    "--color-fill-warning",
    "--color-fill-yellow",
    "--color-foreground-",
    "--color-foreground-black",
    "--color-foreground-contrast",
    "--color-foreground-dim",
    "--color-foreground-disabled",
    "--color-foreground-emphasized",
    "--color-foreground-match",
    "--color-foreground-primary",
    "--color-foreground-red",
    "--color-foreground-success",
    "--color-foreground-white",
    "--color-foreground-yellow",
    "--color-foregroung-disabled",
    "--color-neutrals-opaque",
    "--color-prettylights-syntax",
    "--color-semantic-red",
    "--color-surface-",
    "--color-surface-alpha",
    "--color-surface-archived",
    "--color-surface-base",
    "--color-surface-brand",
    "--color-surface-canvas",
    "--color-surface-merged",
    "--color-surface-mid",
    "--color-surface-open",
    "--color-surface-strong",
    "--color-surface-subtle",
    "--color-text-",
    "--color-text-archived",
    "--color-text-disabled",
    "--color-text-merged",
    "--color-text-on",
    "--color-text-open",
    "--color-text-primary",
    "--color-text-secondary",
    "--color-text-tertiary",
  ];

  const colors = extractCssVariables("--color").filter(c => {
    return !c.startsWith("--color-prettylights-syntax");
  });

  function getColorGroup(color: string): string {
    // For three-level primitive colors like neutrals-opaque-light-50
    // e.g., "--color-neutrals-opaque-light-50" -> "neutrals-opaque-light"
    const threeLevelMatch = color.match(/--color-(neutrals-[a-z]+-[a-z]+)-\d+/);
    if (threeLevelMatch) {
      return threeLevelMatch[1];
    }

    // For two-level primitive colors like accent-blue-100 or semantic-red-100
    // e.g., "--color-accent-blue-100" -> "accent-blue"
    // e.g., "--color-semantic-red-100" -> "semantic-red"
    const twoLevelMatch = color.match(/--color-((accent|semantic)-[a-z]+)-\d+/);
    if (twoLevelMatch) {
      return twoLevelMatch[1];
    }

    // For simpler tokens like "--color-surface-base", just get the first part
    // e.g., "--color-surface-base" -> "surface"
    const simpleMatch = color.match(/--color-([a-z]+)-/);
    if (simpleMatch) {
      return simpleMatch[1];
    }

    return "";
  }

  const colorGroups = [...new Set(colors.map(getColorGroup))].filter(
    g => g !== "",
  );

  let checkers = $state(false);

  const icons = [
    "activity",
    "archive",
    "arrow-left",
    "arrow-up",
    "attach",
    "badge",
    "bookmark",
    "bookmark-fill",
    "branch",
    "checkmark",
    "checkout",
    "chevron-down",
    "chevron-left",
    "chevron-left-right",
    "chevron-right",
    "chevron-up",
    "clock",
    "code",
    "collapse-vertical",
    "comment",
    "commit",
    "copy",
    "cross",
    "cursor",
    "device",
    "diff",
    "disconnect",
    "document",
    "download",
    "edit",
    "ellipsis",
    "ellipsis-vertical",
    "emoji",
    "expand-vertical",
    "eye",
    "eye-slash",
    "folder",
    "folder-open",
    "git",
    "guide",
    "help",
    "hourglass",
    "issue",
    "key",
    "link",
    "lock",
    "logo",
    "menu",
    "moon",
    "open-external",
    "patch",
    "pin-filled",
    "pin-hollow",
    "play",
    "plus",
    "question-mark",
    "reply",
    "repository",
    "review",
    "seed",
    "seed-filled",
    "settings",
    "stop",
    "sun",
    "trash",
  ] as const;
</script>

<style>
  .checkers {
    background: repeating-conic-gradient(#88888833 0% 25%, transparent 0% 50%)
      50% / 20px 20px;
    border-radius: 1rem;
  }

  .container {
    display: flex;
    margin: 0;
    padding: 0;
  }

  .color {
    width: 3rem;
    height: 3rem;
    border-radius: var(--border-radius-md);
    outline-style: solid !important;
    outline-color: #88888899 !important;
    outline-offset: 0.3rem;
    margin: 1rem;
  }

  .unused {
    outline-style: dotted !important;
    outline-color: #55555555 !important;
  }
</style>

<Modal>
  <div slot="body" style="display: flex; flex-direction: column;">
    <div
      style="display: flex; margin-left: auto; width: 100%; padding-left: 0.5rem; margin-bottom: 1rem; gap: 0.5rem;">
      <Button
        ariaLabel="transparency"
        styleBorderRadius="0"
        variant={checkers ? "selected" : "not-selected"}
        on:click={() => {
          checkers = !checkers;
        }}>
        {#if checkers}
          <Icon name="review" />
        {:else}
          <Icon name="eye-slash" />
        {/if}
      </Button>
      <Radio>
        <Button
          ariaLabel="Light Mode"
          styleBorderRadius="0"
          variant={!$followSystemTheme && $theme === "light"
            ? "selected"
            : "not-selected"}
          on:click={() => {
            theme.set("light");
            followSystemTheme.set(false);
          }}>
          <Icon name="sun" />
        </Button>
        <div class="global-spacer"></div>
        <Button
          ariaLabel="Dark Mode"
          styleBorderRadius="0"
          variant={!$followSystemTheme && $theme === "dark"
            ? "selected"
            : "not-selected"}
          on:click={() => {
            theme.set("dark");
            followSystemTheme.set(false);
          }}>
          <Icon name="moon" />
        </Button>
      </Radio>
    </div>

    <div class="container">
      <div class:checkers>
        {#each colorGroups as colorGroup}
          <div style:display="flex">
            {#each colors.filter(color => {
              return getColorGroup(color) === colorGroup;
            }) as color}
              <div style:display="inline-flex">
                <div
                  class:unused={!usedColors.includes(color)}
                  title={color}
                  class="color"
                  style:background-color={`var(${color})`}>
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>

    <div
      style="display: flex; flex-direction: column; padding-left: 0.5rem; width: 100%; align-items: flex-start;">
      <div style="margin-top: 1rem; display: flex; flex-direction: row;">
        {#each icons.slice(0, 25) as icon}
          <div style="display: flex;" title={icon}>
            <Icon name={icon} />
          </div>
        {/each}
      </div>
      <div style="margin-top: 1rem; display: flex; flex-direction: row;">
        {#each icons.slice(25, 50) as icon}
          <div style="display: flex;" title={icon}>
            <Icon name={icon} />
          </div>
        {/each}
      </div>
      <div style="margin-top: 1rem; display: flex; flex-direction: row;">
        {#each icons.slice(50) as icon}
          <div style="display: flex;" title={icon}>
            <Icon name={icon} />
          </div>
        {/each}
      </div>
    </div>
  </div>
</Modal>
