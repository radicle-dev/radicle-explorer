<script lang="ts">
  export let insertions: number;
  export let deletions: number;
  export let hoverable: boolean = false;
</script>

<style>
  .badge {
    display: flex;
    font: var(--txt-code-bold);
    height: var(--button-tiny-height);
    white-space: nowrap;
    border-radius: var(--border-radius-full);
    overflow: hidden;
  }
  .hoverable:hover .positive {
    background-color: var(--color-surface-alpha-mid);
  }
  .hoverable:hover .negative {
    background-color: var(--color-surface-alpha-mid);
  }
  .positive {
    display: flex;
    padding: 0 6px;
    align-items: center;
    color: var(--color-text-open);
    background-color: var(--color-feedback-success-bg);
  }
  .negative {
    display: flex;
    padding: 0 6px;
    align-items: center;
    color: var(--color-feedback-error-text);
    background-color: var(--color-feedback-error-bg);
  }
</style>

<div class="badge" class:hoverable>
  <div class="positive">
    +{insertions}
  </div>
  <div class="negative">
    -{deletions}
  </div>
</div>
