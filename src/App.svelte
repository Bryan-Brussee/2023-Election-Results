<script>
  import { sos_data } from "./stores";
  import { getRace } from "./helpers";
  import { apStyleTitleCase as apCase } from "ap-style-title-case";
  import { group } from "d3-array";

  import { csvParse } from "d3-dsv";

  import Table from "./Table.svelte";
  import Timer from "./Timer.svelte";

  let data_url =
    "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/latest.csv.gz";

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

  //basic formatting for non-override
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

  //and add a filter to this to work with the search bar

  $: grouped_data = group(
    $sos_data,
    //groups by location equivalent substring of ID
    (d) => d.result_id.split("-")[0],
    //and then groups by race equivalent substring of ID. For RCV, whichs always appears to start with '2', drops last character
    (d) =>
      d.result_id.split("-")[1].charAt(0) == 2
        ? d.result_id.split("-")[1].slice(0, -1)
        : d.result_id.split("-")[1]
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
    {@const location_name = [...location[1]][0][1][0].location}
    <section class="municipality" id={location_name}>
      <h2 class="municipal-name">{location_name}</h2>
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
