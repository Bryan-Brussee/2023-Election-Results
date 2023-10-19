<script>
    export let loadData;

    let interval = 60;
    $: timer = interval;

    import { onMount } from 'svelte';

    function countdown() {
        if (timer == 0) {
            loadData();
            timer = interval;
        } else {
            timer--;
        }
    }

  onMount(() => {
    setInterval(() => {
        countdown()
    }, 1000)

  })
</script>

<div class="timer">
    {#if timer !== 0}
    <p>Checking for new data in: {timer} seconds</p>
    {:else}
    <p>Reloading data</p>
    {/if}
</div>