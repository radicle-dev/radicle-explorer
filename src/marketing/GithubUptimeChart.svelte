<script lang="ts">
  export let series: number[];
  export let startDay: string;
  export let best: { uptime: number; day: string };
  export let worst: { uptime: number; day: string };
  export let latest: { uptime: number; day: string };

  const DAY_MS = 86400000;

  const width = 1000;
  const height = 440;
  const marginLeft = 62;
  const marginRight = 28;
  const marginTop = 34;
  const marginBottom = 48;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const axisY = marginTop + plotHeight;

  const yMin = 75;
  const yMax = 100;
  const gridValues = [100, 95, 90, 85, 80, 75];
  const targetValue = 99;

  function dayMs(day: string): number {
    return Date.parse(`${day}T00:00:00Z`);
  }

  function formatDay(day: string): string {
    return new Date(dayMs(day)).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function yOf(uptime: number): number {
    return marginTop + (1 - (uptime - yMin) / (yMax - yMin)) * plotHeight;
  }

  // Colour the line by how bad the number is, rather than using one flat hue, so
  // the decline reads at a glance.
  function colorFor(uptime: number): string {
    if (uptime >= 95) return "var(--color-accent-green-600)";
    if (uptime >= 92) return "var(--color-semantic-amber-600)";
    return "var(--color-semantic-red-600)";
  }

  // Keep a label inside the plot by anchoring it to whichever end it is near.
  function anchorFor(x: number): "start" | "middle" | "end" {
    if (x < marginLeft + 110) return "start";
    if (x > marginLeft + plotWidth - 110) return "end";
    return "middle";
  }

  // Everything the markup needs is derived here in one pass, so the template only
  // reads values and never calls back into these helpers.
  function buildGeometry(
    values: number[],
    firstDay: string,
    peak: { uptime: number; day: string },
    low: { uptime: number; day: string },
    latest: { uptime: number; day: string },
  ) {
    const lastIndex = Math.max(1, values.length - 1);
    const firstMs = dayMs(firstDay);
    const xOf = (index: number) => marginLeft + (index / lastIndex) * plotWidth;

    // Each entry is one UTC day from firstDay onwards, so an index is a day offset.
    const indexOfDay = (day: string) =>
      Math.round((dayMs(day) - firstMs) / DAY_MS);

    const linePath = values
      .map(
        (uptime, index) =>
          `${index === 0 ? "M" : "L"}${xOf(index).toFixed(2)} ${yOf(uptime).toFixed(2)}`,
      )
      .join("");

    const areaPath = `${linePath}L${xOf(lastIndex).toFixed(2)} ${axisY}L${marginLeft} ${axisY}Z`;

    // A gradient stop per day would mean well over a thousand nodes. Emit one only
    // where the colour band changes, doubled at the same offset so the change is a
    // hard edge rather than a long blend.
    const strokeStops: { offset: number; color: string }[] = [];
    let previous: string | undefined;
    values.forEach((uptime, index) => {
      const color = colorFor(uptime);
      if (color === previous) return;
      const offset = (index / lastIndex) * 100;
      if (previous !== undefined) {
        strokeStops.push({ offset, color: previous });
      }
      strokeStops.push({ offset, color });
      previous = color;
    });

    const years: { year: number; x: number }[] = [];
    const lastYear = new Date(dayMs(latest.day)).getUTCFullYear();
    for (
      let year = new Date(firstMs).getUTCFullYear() + 1;
      year <= lastYear;
      year += 1
    ) {
      const index = Math.round((Date.UTC(year, 0, 1) - firstMs) / DAY_MS);
      if (index >= 0 && index <= lastIndex) {
        years.push({ year, x: xOf(index) });
      }
    }

    const markers = [
      {
        key: "peak",
        label: `peak: ${peak.uptime.toFixed(2)}% (${formatDay(peak.day)})`,
        index: indexOfDay(peak.day),
        uptime: peak.uptime,
        color: "var(--color-accent-green-700)",
        dy: -16,
      },
      {
        key: "low",
        label: `low: ${low.uptime.toFixed(2)}% (${formatDay(low.day)})`,
        index: indexOfDay(low.day),
        uptime: low.uptime,
        color: "var(--color-semantic-red-700)",
        dy: 26,
      },
    ].map(marker => {
      const x = xOf(marker.index);
      return {
        ...marker,
        x,
        y: yOf(marker.uptime),
        anchor: anchorFor(x),
      };
    });

    return { linePath, areaPath, strokeStops, years, markers };
  }

  const grid = gridValues.map(value => ({ value, y: yOf(value) }));
  const targetY = yOf(targetValue);

  $: geometry = buildGeometry(series, startDay, best, worst, latest);
  $: startLabel = formatDay(startDay);
  $: latestLabel = formatDay(latest.day);
</script>

<style>
  .chart {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--border-radius-small);
    background-color: var(--color-surface-base);
    padding: 1rem;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .grid {
    stroke: var(--color-border-subtle);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }

  .axis {
    stroke: var(--color-border-mid);
    stroke-width: 1;
  }

  .axis-label {
    fill: var(--color-text-tertiary);
    font: var(--txt-medium-14);
  }

  .target {
    stroke: var(--color-semantic-red-400);
    stroke-width: 1;
    stroke-dasharray: 6 5;
  }

  .target-label {
    fill: var(--color-semantic-red-600);
    font: var(--txt-medium-14);
  }

  .line {
    fill: none;
    stroke: url(#uptime-stroke);
    stroke-width: 2.25;
    stroke-linejoin: round;
  }

  .area {
    fill: url(#uptime-area);
  }

  .marker-dot {
    stroke: var(--color-surface-base);
    stroke-width: 2;
  }

  .marker-label {
    font: var(--txt-bold-14);
  }

  .caption {
    fill: var(--color-text-quaternary);
    font: var(--txt-medium-14);
  }
</style>

<div class="chart">
  <svg
    viewBox="0 0 {width} {height}"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="GitHub uptime over a 90-day rolling window, from {startLabel} to {latestLabel}. Best {best.uptime.toFixed(
      2,
    )} percent, worst {worst.uptime.toFixed(2)} percent, {latest.uptime.toFixed(
      2,
    )} percent in the most recent window.">
    <defs>
      <linearGradient id="uptime-stroke" x1="0" y1="0" x2="1" y2="0">
        {#each geometry.strokeStops as stop}
          <stop offset="{stop.offset}%" stop-color={stop.color} />
        {/each}
      </linearGradient>
      <linearGradient id="uptime-area" x1="0" y1="0" x2="0" y2="1">
        <stop
          offset="0%"
          stop-color="var(--color-accent-green-500)"
          stop-opacity="0.28" />
        <stop
          offset="100%"
          stop-color="var(--color-accent-green-500)"
          stop-opacity="0.02" />
      </linearGradient>
    </defs>

    {#each grid as line (line.value)}
      <line
        class="grid"
        x1={marginLeft}
        y1={line.y}
        x2={marginLeft + plotWidth}
        y2={line.y} />
      <text
        class="axis-label"
        x={marginLeft - 12}
        y={line.y}
        text-anchor="end"
        dominant-baseline="middle">
        {line.value}%
      </text>
    {/each}

    <line
      class="target"
      x1={marginLeft}
      y1={targetY}
      x2={marginLeft + plotWidth}
      y2={targetY} />
    <text
      class="target-label"
      x={marginLeft + plotWidth}
      y={targetY - 8}
      text-anchor="end">
      99% (“two nines”)
    </text>

    <path class="area" d={geometry.areaPath} />
    <path class="line" d={geometry.linePath} />

    <line
      class="axis"
      x1={marginLeft}
      y1={axisY}
      x2={marginLeft + plotWidth}
      y2={axisY} />

    {#each geometry.years as tick (tick.year)}
      <text class="axis-label" x={tick.x} y={axisY + 22} text-anchor="middle">
        {tick.year}
      </text>
    {/each}

    {#each geometry.markers as marker (marker.key)}
      <circle
        class="marker-dot"
        cx={marker.x}
        cy={marker.y}
        r="4.5"
        fill={marker.color} />
      <text
        class="marker-label"
        x={marker.x}
        y={marker.y + marker.dy}
        fill={marker.color}
        text-anchor={marker.anchor}>
        {marker.label}
      </text>
    {/each}

    <text class="caption" x={marginLeft} y={height - 8}>{startLabel}</text>
    <text
      class="caption"
      x={marginLeft + plotWidth}
      y={height - 8}
      text-anchor="end">
      {latestLabel}
    </text>
  </svg>
</div>
