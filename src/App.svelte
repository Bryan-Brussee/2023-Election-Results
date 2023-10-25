<script>
  import { sos_data, filter_ids } from "./stores";
  import { apStyleTitleCase as apCase } from "ap-style-title-case";
  import { groups } from "d3-array";
  import { csv } from "d3-fetch";
  import { onMount } from 'svelte';

  import { groupRCVRecords } from "./helpers";

  import location_lookup from "./data/location_lookup.json";

  // Components
  import Table from "./Table.svelte";
  import Timer from "./Timer.svelte";
  import OmniSearch from "./OmniSearch.svelte";

  const data_url =
    "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/latest.csv.gz";



  const loadData = async () => {
    const data = await csv(data_url);
    $sos_data = data;
    return;
  };

  $: {
    $sos_data.forEach((record) => {
      //hot fix for Bloomington Council elections
      if (record.result_id.includes("06616-204")) {
        let office_id = record.result_id.split("-")[1];
        if (parseInt(office_id) == 2044) {
          record.office_id = "2051";
        }
        if (parseInt(office_id) == 2045) {
          record.office_id = "2052";
        }
        if (parseInt(office_id) == 2046) {
          record.office_id = "2053";
        }
        record.result_id = `${record.district}-${record.office_id}-${record.cand_order}`;
      }

      if (record.full_name == "") {
        let split_record = record.result_id.split("-");
        //no real reason to split the district/county id
        record.office_id = split_record[1];
        record.cand_order = split_record[2];
      }

      //format strings in AP style
      record.full_name = apCase(record.full_name.toLowerCase());
      record.location = apCase(record.location.toLowerCase());
      record.seatname = apCase(record.seatname.toLowerCase());

      //format numbers as ints or floats
      record.votecount = parseInt(record.votecount);
      record.votepct = !record.full_name
        ? Math.round(parseFloat(record.votepct) * 100)
        : Math.round(parseFloat(record.votepct));
      record.precinctsreporting = parseInt(record.precinctsreporting);
      record.precinctstotal = parseInt(record.precinctstotal);
    });


  }



  $: grouped_data = groups(
    $filter_ids.length > 0
      ? $sos_data.filter((row) => $filter_ids.includes(row["result_id"]))
      : $sos_data,
    //group by location equivalent substring of ID
    (d) => d.result_id.split("-")[0],
    //and then group by race equivalent substring of ID. For RCV, whichs always appears to start with '2', drops last character
    (d) =>
      d.result_id.split("-")[1].charAt(0) == "2"
        ? d.result_id.split("-")[1].slice(0, -1)
        : d.result_id.split("-")[1]
  );

  //reference our location id against lookup table
  $: {
    grouped_data.forEach((group) => {
      const location_id = group[0];

      if (location_id.length == 2) {
        group[0] = location_lookup[location_id] + " County";
      } else if (location_id.length == 4) {
        group[0] = location_lookup[location_id] + " School District";
      } else {
        group[0] = location_lookup[location_id];
      }

      let races = group[1];

      races.sort((a, b) => {
        //sorts city questions to the bottom
        if (a[0].substr(0,3) == "113") return 1;
        if (b[0].substr(0,3) == "113") return -1;

        //sort school questions to the bottom
        if (a[0].substr(0,3) == "503") return 1;
        if (b[0].substr(0,3) == "503") return -1;
      });
    });

    grouped_data.sort((a,b) => {
      if (a[0] == "Minneapolis") return -1;
      if (b[0] == "Minneapolis") return 1;

      if (a[0] == "St. Paul") return -1;
      if (b[0] == "St. Paul") return 1;

      if (a[0] == "Duluth") return -1;
      if (b[0] == "Duluth") return 1;
    })
  }

 
 


</script>

{#await loadData()}
  <p>Loading</p>
{:then}
  <Timer {loadData} />

  <OmniSearch />
  {#each [...grouped_data] as group}
    <section class="municipality" id={group[0]}>
      <h2 class="municipal-name">{group[0]}</h2>
      <div class="table-container">
        {#each [...group[1]] as race_data}
          <!-- Check office id and group rcv records if needed before passing data to table; pass along rcv boolean too -->
          {@const rcv = race_data[0].charAt(0) == "2" ? true : false}
          <Table
            race_data={rcv
              ? [race_data[0], groupRCVRecords(race_data[1])]
              : race_data}
            {rcv}
          />
        {/each}
      </div>
    </section>
  {/each}
{:catch error}
  <p>{error.message}</p>
{/await}
