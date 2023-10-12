<script>
  import { sos_data } from "./stores";
  import { loadData, toTitleCase, getRace } from "./helpers";
  import { group } from "d3-array";

  import { onMount } from "svelte";

  import Race from "./Race.svelte";

  let data_url = "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/latest.csv.gz";

  $: {
    $sos_data.forEach((record) => {
      record.full_name = toTitleCase(record.full_name);
      record.location = toTitleCase(record.location);
      record.race = getRace(record.seatname);
      record.votecount = parseInt(record.votecount);
      record.votepct = parseInt(record.votepct);
      // if (record.seatname === "Council Member Ward 1 First Choice (St. Paul)") {
      //   console.log(record);
      // }
    });
  }

  $: grouped_data = group(
    $sos_data,
    (d) => d.location,
    (d) => d.race
  );

  onMount(() => {
    loadData(data_url);

    const timer = setInterval(() => {
      loadData(data_url);
      console.log("data reloaded")
    }, 10 * 1000);
  });
</script>

{#if $sos_data != []}
  {#each [...grouped_data] as location}
    <section class="municipality" id={location[0]}>
      <h2>{location[0]}</h2>
      {#each [...location[1]] as race_data}
        <Race {race_data} />
      {/each}
    </section>
  {/each}
{:else}
  <p>Error loading data</p>
{/if}

