<script>
    import { removeParentheticals, removeRCVOrdinal } from "./helpers";
    import { intcomma, apnumber, capfirst } from "journalize";
    import geodata from "./data/geometries.json";
    import DistrictLocatorMap from "./DistrictLocatorMap.svelte";
    export let race_data;
    export let rcv;

    let final_rank = false;

    $: cand_records = race_data[1].sort((a, b) => {
        if (a.winner && !b.winner) return -1;
        if (!a.winner && b.winner) return 1;

        const finalRoundA = a.votecount_choiceFinal || 0;
        const finalRoundB = b.votecount_choiceFinal || 0;
        if (finalRoundA > finalRoundB) return -1;
        if (finalRoundA < finalRoundB) return 1;

        if (a.votecount > b.votecount) return -1;
        if (a.votecount < b.votecount) return 1;

        //check for yes, make sure it comes first
        if (a.full_name.toLowerCase() === "yes") return -1;
        if (b.full_name.toLowerCase() === "yes") return 1;

        //check for 'write-in', make sure it comes last
        if (a.full_name.toLowerCase() === "write-in") return 1;
        if (b.full_name.toLowerCase() === "write-in") return -1;

        //sort alphabetically
        if (a.full_name < b.full_name) return -1;
        if (a.full_name > b.full_name) return 1;
        return 0;
    });

    $: cand_records.forEach((record) => {
        if (record.votecount_choiceFinal) {
            final_rank = true;
        }
    });

    $: seat_name = cand_records[0].seatname;
    $: seat_name_formatted = removeParentheticals(removeRCVOrdinal(seat_name));

    $: seats_open = seat_name.match(/Elect (\d+)/)
        ? seat_name.match(/Elect (\d+)/)[1]
        : 1;

    //decimal rounded to nearest integer
    $: precincts_reporting_pct = Math.round(
        (cand_records[0].precinctsreporting / cand_records[0].precinctstotal) *
            100
    );

    let candidates_expanded = false;

    // Map stuff
    const getWard = (officeTitle) => {
        const wardRe = /(?:Ward|District) (\d+)/
        const found = officeTitle.match(wardRe)
        return found ? found[1].padStart(2, "0") : ""
    }

    const filterDistrict = (geojson, subdistrict) => {
        return {
            type: "FeatureCollection",
            features: geojson.features.filter(
                (f) =>
                    f.properties.district === subdistrict
            ),
        };
    };

    const location_id = race_data[1][0]["result_id"].split("-")[0]
    const subdistrict = race_data[1][0]["results_group"] === "cntyRaceQuestions"
        ? race_data[1][0]["district"]
        : getWard(race_data[1][0]["seatname"]) !== ""
        ? getWard(race_data[1][0]["seatname"])
        : undefined
    
</script>

<article class="results-module">
    <header>
        <h3 class="race-name">{seat_name_formatted}</h3>

        {#if seats_open > 1}
            <span class="seats-open interface">{seats_open} seats open</span>
        {/if}

        <div style='width:100px;'>
            <DistrictLocatorMap 
                outline={geodata[location_id]} 
                district={
                    subdistrict 
                    ? filterDistrict(geodata[location_id], subdistrict)
                    : geodata[location_id]
                } 
            />
        </div>
    </header>

    <table class="results-table" class:rcv>
        <thead>
            <th class="check-container" />
            <th class="cand">Candidate</th>
            {#if !rcv}
                <th class="votes">Votes</th>
                <th class="pct">Pct.</th>
            {:else}
                <th class="choice">First<br />choice</th>
                <th class="choice">Second<br />choice</th>
                <th class="choice">Third<br />choice</th>
                {#if final_rank}
                    <th class="choice">Final<br />round</th>
                {/if}
            {/if}
        </thead>
        <tbody>
            {#each cand_records as record, i}
                {#if candidates_expanded || i < 5}
                    <tr class:winner={record.winner}>
                        <!-- check container -->
                        <td class="check-container"
                            >{@html record.winner ? "&#10004&#xFE0E;" : ""}</td
                        >
           
                        <td class="cand">{record.full_name} {(record.incumbent == "True") ? "(i)" : ""}</td>
                        {#if !rcv}
                            <td class="votes">{intcomma(record.votecount)}</td>
                            <td class="pct">{record.votepct}%</td>
                        {:else}
                            <td class="choice">
                                <div>
                                    <span class="pct">
                                        {record.votepct_choice1
                                            ? record.votepct_choice1 + "%"
                                            : "—"}
                                    </span>
                                    <span class="count">
                                        {record.votecount_choice1
                                            ? intcomma(record.votecount_choice1)
                                            : ""}
                                    </span>
                                </div></td
                            >
                            <td class="choice">
                                <div>
                                    <span class="pct">
                                        {record.votepct_choice2
                                            ? record.votepct_choice2 + "%"
                                            : "—"}
                                    </span>
                                    <span class="count">
                                        {record.votecount_choice2
                                            ? intcomma(record.votecount_choice2)
                                            : ""}
                                    </span>
                                </div>
                            </td>
                            <td class="choice">
                                <div>
                                    <span class="pct">
                                        {record.votepct_choice3
                                            ? record.votepct_choice3 + "%"
                                            : "—"}
                                    </span>
                                    <span class="count">
                                        {record.votecount_choice3
                                            ? intcomma(record.votecount_choice3)
                                            : ""}
                                    </span>
                                </div>
                            </td>

                            {#if final_rank}
                                <td class="choice">
                                    <div>
                                        <span class="pct">
                                            {record.votepct_choiceFinal
                                                ? record.votepct_choiceFinal +
                                                  "%"
                                                : "—"}
                                        </span>
                                        <span class="count">
                                            {record.votecount_choiceFinal
                                                ? intcomma(
                                                      record.votecount_choiceFinal
                                                  )
                                                : ""}
                                        </span>
                                    </div>
                                </td>
                            {/if}
                        {/if}
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
    {#if cand_records.length > 5}
        <button
            class="expand"
            on:click={() => {
                candidates_expanded = !candidates_expanded;
                console.log(cand_records);
            }}
        >
            View {candidates_expanded ? "fewer" : "all"} candidates
            <!-- HTML entities for plus and minus icons with additional string to prevent emoji render in mobile -->
            <span
                >{@html candidates_expanded
                    ? "&#x2212&#xFE0E;"
                    : "&#43&#xFE0E;"}</span
            >
        </button>
    {/if}
    <footer class="interface precincts-reporting">
        {precincts_reporting_pct}% of precincts reporting
    </footer>
</article>
