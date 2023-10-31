<script>
  import { sos_data, filter_ids } from "./stores";
  import { groups } from "d3-array";
  import { csv } from "d3-fetch";

  import { groupRCVRecords } from "./helpers";

  import location_lookup from "./data/location_lookup.json";

  // Components
  import Table from "./Table.svelte";
  import Timer from "./Timer.svelte";
  import OmniSearch from "./OmniSearch.svelte";

  const data_url =
    "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/latest.csv.gz";

  // test data for 100% data
  // const data_url = "https://electiondata.startribune.com/projects/2023-election-results/staging/nov/versions/results-20231027160545.csv.gz"

  let innerWidth;
  
  $: mobile = innerWidth < 992 ? true : false;

  const loadData = async () => {
    const data = await csv(data_url);
    $sos_data = data;
    return;
  };

  $: {
    $sos_data.forEach((record) => {
      if (record.full_name == "") {
        let split_id = record.result_id.split("-");
        split_id[0].length == 2 ? record.county_id = split_id[0] : record.district = split_id[0]
        record.office_id = split_id[1];
        record.cand_order = split_id[2];
      }

      (record.location) == "St Louis Park" ? record.location = "St. Louis Park" : record.location = record.location;

      //format numbers as ints or floats
      record.votecount = parseInt(record.votecount);
      record.votepct = !record.full_name
        ? parseFloat(record.votepct) * 100
        : parseFloat(record.votepct);
      record.precinctsreporting = parseInt(record.precinctsreporting);
      record.precinctstotal = parseInt(record.precinctstotal);
    });

    $sos_data.sort((a, b) => {
      const getResultId = (item) => item.result_id.split("-")[1].substr(0, 3);
      const isCityOrSchool = (id) => id === "113" || id === "503";

      const aResultId = getResultId(a);
      const bResultId = getResultId(b);

      const aIsCityOrSchool = isCityOrSchool(aResultId);
      const bIsCityOrSchool = isCityOrSchool(bResultId);

      if (aIsCityOrSchool === bIsCityOrSchool) return 0;
      return aIsCityOrSchool ? 1 : -1;
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
        d.office_id.charAt(0) == "2"
          ? d.office_id.slice(0, -1)
          : d.office_id
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
    });

    //sort selected municipalities to the top
    grouped_data.sort((a, b) => {
      if (a[0] == "Minneapolis") return -1;
      if (b[0] == "Minneapolis") return 1;

      if (a[0] == "St. Paul") return -1;
      if (b[0] == "St. Paul") return 1;

      if (a[0] == "Duluth") return -1;
      if (b[0] == "Duluth") return 1;
    });
  }

  $: {
    $sos_data.forEach(record => {
      // if (record.location === "Rochester") {
        console.log(record)
      // }
    })
  }

</script>

<svelte:window bind:innerWidth />

{#await loadData()}
  <p>Loading</p>
{:then}
  <Timer {loadData} />

  <OmniSearch />

  <div class="section-container">
    {#each [...grouped_data] as group}
      <section class="municipality" id={group[0]}>
        <h2 class="municipal-name">{group[0]}</h2>
        <div class="table-container">
          {#each [...group[1]] as race_data (race_data[1][0]["result_id"].split("-")[0] + race_data[1][0]["result_id"].split("-")[1])}
            {@const rcv = race_data[0].charAt(0) == "2" ? true : false}
            <Table
              race_data={rcv
                ? [race_data[0], groupRCVRecords(race_data[1])]
                : race_data}
              {rcv}
              {mobile}
            />
          {/each}
        </div>
      </section>
    {/each}
  </div>
{:catch error}
  <p>{error.message}</p>
{/await}
