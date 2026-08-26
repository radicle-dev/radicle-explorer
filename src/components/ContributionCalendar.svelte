<script lang="ts">
  import type { ContributionDay } from "@http-client";

  import { pluralize } from "@app/lib/utils";

  import Button from "@app/components/Button.svelte";
  import DropdownList from "@app/components/DropdownList.svelte";
  import DropdownListItem from "@app/components/DropdownList/DropdownListItem.svelte";
  import Icon from "@app/components/Icon.svelte";
  import Popover, { closeFocused } from "@app/components/Popover.svelte";

  // Every day this person has contributed on, across all the years the node
  // reported. The grid windows this to one span at a time.
  export let days: ContributionDay[];
  // The heading for the section this calendar opens. It sits on the same row as
  // the total and the period picker, which are this component's own state, so
  // the row is drawn here rather than by the caller.
  export let title: string;

  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const DAY_MS = 86_400_000;

  // The rolling window the calendar opens on.
  const ROLLING_DAYS = 365;

  // A year padded to whole weeks is 53 or 54 columns, and so is the rolling
  // window. The grid is always laid out on that many tracks, even for the year
  // in progress, which is only part-way through: sizing the tracks to the
  // columns actually in use would make a partial year's dots visibly larger
  // than a complete year's, and the graphic would jump in height when
  // switching between them.
  const WEEK_COLUMNS = 53;

  // Roughly what a three-letter label occupies, used to decide how many will
  // fit without colliding.
  const LABEL_WIDTH = 30;

  // The rolling window, or one calendar year.
  type Selection = "rolling" | number;

  interface Bounds {
    // Inclusive, as `YYYY-MM-DD` in UTC, so they compare against the dates the
    // node reports without going back through `Date`.
    from: string;
    to: string;
  }

  interface Cell {
    key: string;
    // UTC midnight of the day, in epoch milliseconds.
    time: number;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
    // False for the days padding the first and last weeks out, which fall
    // outside the span. They hold a slot in the grid but are not drawn.
    inRange: boolean;
  }

  interface Thresholds {
    low: number;
    mid: number;
    high: number;
  }

  let selection: Selection = "rolling";

  function isoDate(time: number): string {
    return new Date(time).toISOString().slice(0, 10);
  }

  function utcToday(): number {
    const today = new Date();

    return Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
  }

  // A year ends on its last day, or today for the year still in progress.
  function bounds(selection: Selection): Bounds {
    const today = utcToday();
    if (selection === "rolling") {
      return {
        from: isoDate(today - (ROLLING_DAYS - 1) * DAY_MS),
        to: isoDate(today),
      };
    }

    return {
      from: isoDate(Date.UTC(selection, 0, 1)),
      to: isoDate(Math.min(Date.UTC(selection, 11, 31), today)),
    };
  }

  // The rolling window, then every year this person contributed in, newest
  // first.
  function availablePeriods(days: ContributionDay[]): Selection[] {
    const years = [new Date().getUTCFullYear()];
    for (const day of days) {
      const year = Number(day.date.slice(0, 4));
      if (!Number.isNaN(year) && !years.includes(year)) {
        years.push(year);
      }
    }

    return ["rolling", ...years.sort((a, b) => b - a)];
  }

  function periodLabel(selection: Selection): string {
    return selection === "rolling" ? "Last 12 months" : String(selection);
  }

  // Quartiles of the active days, not fractions of the busiest one. Scaling
  // against the maximum collapses under a single outlier: on a real profile
  // whose busiest day held 35 contributions, that put 54 of 62 active days in
  // the lowest band and rendered the year almost flat. Quartiles spread the
  // same data evenly across the four steps. Taken over the selected span, so
  // each one reads on its own terms rather than against this person's busiest
  // year ever.
  function quartiles(days: ContributionDay[]): Thresholds | undefined {
    const active = days
      .map(day => day.count)
      .filter(count => count > 0)
      .sort((a, b) => a - b);
    if (active.length === 0) {
      return undefined;
    }
    const at = (fraction: number) =>
      active[Math.min(active.length - 1, Math.floor(active.length * fraction))];

    return { low: at(0.25), mid: at(0.5), high: at(0.75) };
  }

  function level(count: number, thresholds: Thresholds | undefined) {
    if (count <= 0 || !thresholds) return 0 as const;
    if (count <= thresholds.low) return 1 as const;
    if (count <= thresholds.mid) return 2 as const;
    if (count <= thresholds.high) return 3 as const;
    return 4 as const;
  }

  // Columns are calendar weeks, rows are Sunday..Saturday, so the grid lines up
  // the way a wall calendar does, with both ends padded out to whole weeks.
  function buildWeeks(
    counts: Record<string, number>,
    { from, to }: Bounds,
    thresholds: Thresholds | undefined,
  ): Cell[][] {
    const first = Date.parse(`${from}T00:00:00Z`);
    const last = Date.parse(`${to}T00:00:00Z`);
    // Back up to that week's Sunday so every column holds a full week.
    const start = first - new Date(first).getUTCDay() * DAY_MS;
    const end = last + (6 - new Date(last).getUTCDay()) * DAY_MS;

    const columns: Cell[][] = [];
    let column: Cell[] = [];
    for (let time = start; time <= end; time += DAY_MS) {
      const key = isoDate(time);
      const inRange = time >= first && time <= last;
      const count = inRange ? (counts[key] ?? 0) : 0;
      column.push({
        key,
        time,
        count,
        level: inRange ? level(count, thresholds) : 0,
        inRange,
      });
      if (column.length === 7) {
        columns.push(column);
        column = [];
      }
    }
    if (column.length > 0) {
      columns.push(column);
    }

    return columns;
  }

  // A month label sits above the first column that falls in that month, which
  // is how the months stay aligned with the weeks beneath them.
  function buildMonthLabels(weeks: Cell[][], labelGap: number) {
    const labels: { index: number; label: string }[] = [];
    let previous = -1;
    weeks.forEach((column, index) => {
      // The month of the first day in this column that is in range, so a padded
      // first column is labelled by the month the span starts in.
      const day = column.find(cell => cell.inRange) ?? column[0];
      const month = new Date(day.time).getUTCMonth();
      if (month !== previous) {
        const last = labels.at(-1);
        const clearOfPrevious =
          last === undefined || index - last.index >= labelGap;
        // Also needs room before the right edge, or it would overflow.
        const clearOfEnd = weeks.length - index >= labelGap;
        if (clearOfPrevious && clearOfEnd) {
          labels.push({ index, label: MONTHS[month] });
        }
        previous = month;
      }
    });

    return labels;
  }

  function cellTitle(cell: Cell): string {
    const when = new Date(cell.time).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    return cell.count === 0
      ? `No contributions on ${when}`
      : `${cell.count} ${pluralize("contribution", cell.count)} on ${when}`;
  }

  let gridWidth = 0;

  $: periods = availablePeriods(days);
  // Navigating to another profile can land on a year that person was not
  // active in, so fall back to the rolling window.
  $: if (!periods.includes(selection)) {
    selection = "rolling";
  }
  $: span = bounds(selection);
  $: spanDays = days.filter(
    day => day.date >= span.from && day.date <= span.to,
  );
  $: counts = spanDays.reduce<Record<string, number>>((map, day) => {
    map[day.date] = day.count;
    return map;
  }, {});
  $: total = spanDays.reduce((sum, day) => sum + day.count, 0);
  $: weeks = buildWeeks(counts, span, quartiles(spanDays));
  $: columns = Math.max(WEEK_COLUMNS, weeks.length);
  $: columnWidth = columns > 0 ? gridWidth / columns : 0;
  // How many columns a label needs to itself. The grid is fluid, so this is
  // measured rather than assumed: at a narrow window a column can be a few
  // pixels wide, and labelling every month would overlap them and push the
  // row wider than the pane.
  $: labelGap =
    columnWidth > 0 ? Math.max(2, Math.ceil(LABEL_WIDTH / columnWidth)) : 2;
  $: monthLabels = buildMonthLabels(weeks, labelGap);
</script>

<style>
  .calendar {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--color-border-subtle);
    /* Light is the base; the dark override follows. Steps climb in contrast
       against their own background so a busier day reads as a stronger mark in
       either theme. */
    --cal-empty: var(--color-surface-mid);
    --cal-1: var(--color-accent-green-200);
    --cal-2: var(--color-accent-green-400);
    --cal-3: var(--color-accent-green-600);
    --cal-4: var(--color-accent-green-800);
  }
  :global(:root[data-theme="dark"]) .calendar {
    --cal-empty: var(--color-surface-subtle);
    --cal-1: var(--color-accent-green-800);
    --cal-2: var(--color-accent-green-600);
    --cal-3: var(--color-accent-green-500);
    --cal-4: var(--color-accent-green-300);
  }
  /* Matches the other section headers on the page. */
  .header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-primary);
  }
  .period {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }
  .total {
    font: var(--txt-body-m-regular);
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
  .body {
    padding: 1rem;
  }
  .grid {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }
  /* Both rows share one column track sizing, so labels stay over their week. */
  .months,
  .weeks {
    display: grid;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    gap: 2px;
  }
  .months {
    grid-auto-flow: column;
    font: var(--txt-body-s-regular);
    color: var(--color-text-tertiary);
    height: 1rem;
    /* A label is wider than its column, so it is allowed to spill to the right
       of its own track; clipping keeps that from widening the pane. */
    overflow: hidden;
  }
  .month {
    grid-row: 1;
    white-space: nowrap;
  }
  .weeks {
    grid-auto-flow: column;
    grid-template-rows: repeat(7, auto);
  }
  /* Each day is a square cell holding a smaller dot, so the spacing around a
     dot is even on all four sides. The cell takes its width from the 1fr track
     and its height from the aspect ratio, which is what makes the whole
     graphic's height follow the window width. */
  .cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dot {
    width: 66%;
    height: 66%;
    border-radius: 50%;
    background-color: var(--cal-empty);
  }
  .cell.level-1 .dot {
    background-color: var(--cal-1);
  }
  .cell.level-2 .dot {
    background-color: var(--cal-2);
  }
  .cell.level-3 .dot {
    background-color: var(--cal-3);
  }
  .cell.level-4 .dot {
    background-color: var(--cal-4);
  }
</style>

<div class="calendar">
  <div class="header">
    <span class="txt-body-l-semibold">{title}</span>
    <div class="period">
      <span class="total">
        {total}
        {pluralize("contribution", total)}
      </span>
      <Popover
        popoverPadding="0"
        popoverPositionTop="2.5rem"
        popoverPositionRight="0"
        popoverBorderRadius="var(--border-radius-md)">
        <Button
          let:expanded
          slot="toggle"
          let:toggle
          on:click={toggle}
          ariaLabel="Contribution period"
          size="small">
          {periodLabel(selection)}
          <Icon name={expanded ? "chevron-up" : "chevron-down"} />
        </Button>
        <DropdownList slot="popover" items={periods}>
          <svelte:fragment slot="item" let:item>
            <DropdownListItem
              selected={item === selection}
              on:click={() => {
                selection = item;
                closeFocused();
              }}>
              {periodLabel(item)}
            </DropdownListItem>
          </svelte:fragment>
        </DropdownList>
      </Popover>
    </div>
  </div>
  <div class="body">
    <div class="grid" style:--columns={columns} bind:clientWidth={gridWidth}>
      <div class="months">
        {#each monthLabels as label (label.index)}
          <span class="month" style:grid-column={label.index + 1}>
            {label.label}
          </span>
        {/each}
      </div>
      <div class="weeks">
        {#each weeks as column, index (index)}
          {#each column as cell (cell.key)}
            {#if cell.inRange}
              <div class="cell level-{cell.level}" title={cellTitle(cell)}>
                <span class="dot"></span>
              </div>
            {:else}
              <div class="cell"></div>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  </div>
</div>
