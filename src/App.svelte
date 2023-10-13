<script>
  import { sos_data } from "./stores";
  import { toTitleCase, getRace } from "./helpers";
  import { group } from "d3-array";

  import { csvParse } from 'd3-dsv'


  import { onMount } from "svelte";

  import Race from "./Race.svelte";

  let data_url = "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/latest.csv.gz";

  const loadData = async() => {
    const res = await fetch(data_url);
    const text = await res.text();
    const data = csvParse(text);
    $sos_data = data;
    return;
  }

  $: {
    $sos_data.forEach((record) => {
      record.full_name = toTitleCase(record.full_name);
      record.location = toTitleCase(record.location);
      record.race = getRace(record.seatname);
      record.votecount = parseInt(record.votecount);
      record.votepct = parseInt(record.votepct);
    });
  }


  $: grouped_data = group(
    $sos_data,
    (d) => d.location,
    (d) => d.race
  );


  $: {
    console.log($sos_data);
  }

  // onMount(() => {
  //   const timer = setInterval(() => {
  //     loadData()
  //   }, 2000)
  // })   
</script>

{#await loadData()}
<p>Loading</p>
{:then}
{#each [...grouped_data] as location}
    <section class="municipality" id={location[0]}>
      <h2>{location[0]}</h2>
      {#each [...location[1]] as race_data}
        <Race {race_data} />
      {/each}
    </section>
  {/each}
{/await}

