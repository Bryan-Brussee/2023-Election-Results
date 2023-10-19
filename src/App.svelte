<script>
  import { sos_data } from "./stores";
  import { getRace } from "./helpers";
  import {apStyleTitleCase as apCase} from 'ap-style-title-case'
  import { group } from "d3-array";

  import { csvParse } from "d3-dsv";

  import Table from "./Table.svelte";
  import Timer from "./Timer.svelte";

  let data_url = "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/latest.csv.gz";

  //testing url for today
  // let data_url =
  //   "http://electiondata.startribune.com/projects/2023-election-results/staging/nov/versions/results-20231013163009.csv.gz";

  const loadData = async () => {
    const res = await fetch(data_url);
    const text = await res.text();
    const data = csvParse(text);
    $sos_data = data;
    return;
  };

  $: {
    $sos_data.forEach((record) => {
      //format strings in AP style
      record.full_name = apCase(record.full_name.toLowerCase());
      record.location = apCase(record.location.toLowerCase());
      record.seatname = apCase(record.seatname.toLowerCase());

      //format ints
      record.votecount = parseInt(record.votecount);
      record.votepct = parseInt(record.votepct);
      record.precinctsreporting = parseInt(record.precinctsreporting);
      record.precinctstotal = parseInt(record.precinctstotal);

      //create new key for race, equivalent to seatname without ordinal choice
      record.race = getRace(record.seatname);

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
</script>

{#await loadData()}
  <p>Loading</p>
{:then}
  <Timer {loadData} />
  {#each [...grouped_data] as location}
    <section class="municipality" id={location[0]}>
      <h2 class="municipal-name">{location[0]}</h2>
      <div class="table-container">
        {#each [...location[1]] as race_data}
        <Table {race_data} />
      {/each}
      </div>
    </section>
  {/each}
{:catch error}
  <p>{error.message}</p>
{/await}
