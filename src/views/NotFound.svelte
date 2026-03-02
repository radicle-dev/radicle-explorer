<script lang="ts">
  import Layout from "@app/App/Layout.svelte";
  import IconLarge from "@app/components/IconLarge.svelte";

  export let title: string;
</script>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }
</style>

<Layout>
  <div class="container">
    <IconLarge name="desert" />
    <div class="title txt-heading-m">{title}</div>
  </div>
</Layout>
