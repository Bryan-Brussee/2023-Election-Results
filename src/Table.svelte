<script>
    import { intcomma, pluralize, apnumber, capfirst } from "journalize";
    import { apStyleTitleCase as apCase } from "ap-style-title-case";

    import questions from "./data/questions.json";
    import ward_descriptions from "./data/ward-descriptions.json";

    import geodata from "./data/geometries.json";
    import DistrictLocatorMap from "./DistrictLocatorMap.svelte";
    export let race_data;
    export let rcv;
    export let mobile;

    let final_rank = false;

    $: cand_records = race_data[1].sort((a, b) => {
        //if we have winners, sort them to the top
        if (a.winner && !b.winner) return -1;
        if (!a.winner && b.winner) return 1;

        //else if we have final round records, sort those to the top
        const finalRoundA = a.votecount_choiceFinal || 0;
        const finalRoundB = b.votecount_choiceFinal || 0;
        if (finalRoundA > finalRoundB) return -1;
        if (finalRoundA < finalRoundB) return 1;

        //else if we have votes, sort those to the top
        if (a.votecount > b.votecount) return -1;
        if (a.votecount < b.votecount) return 1;

        //else sort yes to top for yes no questions
        if (a.full_name.toLowerCase() === "yes") return -1;
        if (b.full_name.toLowerCase() === "yes") return 1;

        //else if write in response, sort to bottom
        if (a.full_name.toLowerCase() === "write-in") return 1;
        if (b.full_name.toLowerCase() === "write-in") return -1;

        //for all other cases, sort alphabetically
        if (a.full_name < b.full_name) return -1;
        if (a.full_name > b.full_name) return 1;
        return 0;
    });

    let no_results = true;

    $: cand_records.forEach((record) => {
        if (record.votecount_choiceFinal) {
            final_rank = true;
        }
        if (record.votecount > 0 || record.precinctsreporting > 0) {
            no_results = false;
        }
    });

    $: district_id = cand_records[0].district;
    $: county_id = cand_records[0].county_id;
    $: office_id = cand_records[0].office_id;


    $: seat_name = cand_records[0].seatname;
    $: seat_name_formatted = cand_records[0].display_name;

    $: seats_open = seat_name.match(/Elect (\d+)/)
        ? seat_name.match(/Elect (\d+)/)[1]
        : 1;


    $: winners = cand_records.filter((candidate) => candidate.winner == "True").length;

    $: too_close = winners < seats_open;

    //decimal rounded to nearest integer
    $: precincts_reporting_pct = (cand_records[0].precinctsreporting / cand_records[0].precinctstotal) * 100;

    $: question_table = /113|503/.test(office_id.substr(0, 3)) || office_id == "0421";
    $: st_paul_race = cand_records[0].district === "58000";
    $: question_copy = questions[`${district_id > 2 ? district_id : county_id}-${office_id}`]?.question_body;

    $: ward_description = ward_descriptions[district_id]?.[office_id];

    let candidates_expanded = false;
    let question_expanded = false;
    let wards_expanded = false;

    // Map stuff
    const getWard = (officeTitle) => {
        const wardRe = /(?:Ward|District) (\d+)/;
        const found = officeTitle.match(wardRe);
        return found ? found[1].padStart(2, "0") : "";
    };

    const filterDistrict = (geojson, subdistrict) => {
        return {
            type: "FeatureCollection",
            features: geojson.features.filter(
                (f) => f.properties.district === subdistrict
            ),
        };
    };

    const location_id = race_data[1][0]["result_id"].split("-")[0];
    const subdistrict =
        race_data[1][0]["results_group"] === "cntyRaceQuestions"
            ? race_data[1][0]["district"]
            : getWard(race_data[1][0]["seatname"]) !== ""
            ? getWard(race_data[1][0]["seatname"])
            : undefined;
</script>

<article class="results-module">
    <header class:expanded={question_expanded || wards_expanded} >
        <div class="flex-container">
            <div class="office-name">
                <h3>{seat_name_formatted}</h3>
                {#if seats_open > 1}
                    <span class="seats-open interface"
                        >{seats_open} seats open</span
                    >
                {/if}

                        {#if ward_description}
        <div class="wards-container">
            <span>{@html wards_expanded ?
                ward_description + "&nbsp;&nbsp;"  :
                ward_description.split("").slice(0, mobile ? 55 : 90).join("") + "...&nbsp;&nbsp;"}</span>
            
                <button
                on:click|preventDefault={() => {
                    wards_expanded = !wards_expanded;
                }}
                >{wards_expanded
                    ? "Hide full text"
                    : "Show full text"}</button
            >    
        </div>
        {/if}
            </div>

            {#if subdistrict}
                <div class="mini-map">
                    <DistrictLocatorMap
                        outline={geodata[location_id]}
                        district={subdistrict
                            ? filterDistrict(geodata[location_id], subdistrict)
                            : geodata[location_id]}
                    />
                </div>
            {/if}
        </div>
        {#if question_copy}
            <div class="question-container">
                <span>
                    {@html question_expanded || question_copy.split("").length <= (mobile ? 55 : 90)
                        ? question_copy + "&nbsp;&nbsp;"
                        : question_copy
                              .split("")
                              .slice(0, mobile ? 55 : 90)
                              .join("") + "...&nbsp;&nbsp;"}
                                              </span>
                               
                    {#if question_copy.split(" ").length > (mobile ? 12 : 16)}
                    <button
                        on:click|preventDefault={() => {
                            question_expanded = !question_expanded;
                        }}
                        >{question_expanded
                            ? "Hide full text"
                            : "Show full text"}</button
                    >
                    {/if}
            </div>
        {/if}

    </header>

    <table class="results-table" class:rcv class:no_results>
        <thead>
            <th class="check-container" />
            <th class="cand">{question_table ? "Choice" : "Candidate"}</th>
            {#if !rcv}
                <th class="votes">Votes</th>
                <th class="pct">Pct.</th>
            {:else}
                <th class="choice">First<br />choice</th>
                {#if !st_paul_race}
                    <th class="choice">Second<br />choice</th>
                    <th class="choice">Third<br />choice</th>
                {/if}
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
                        <td class="check-container">
                            {@html record.winner ? "&#10004&#xFE0E;" : ""}
                        </td>

                        <td class="cand">{(/yes|no|write-in/.test(record.full_name.toLowerCase()))
                                ? apCase(record.full_name.toLowerCase())
                                : record.full_name}
                            {record.incumbent == "True" ? "(i)" : ""}
                        </td>
                        {#if !rcv}
                            <td class="votes">{ no_results ? "—" : intcomma(record.votecount)}</td>
                            <td class="pct">{no_results ? "—" : `${record.votepct.toFixed(1)}%`}</td>
                        {:else}
                            <td class="choice">
                                <div>
                                    <span class="pct">
                                        {no_results ? "—" : `${record.votepct_choice1.toFixed(mobile ? 1 : 0)}%`}
                                    </span>
                                    <span class="count">
                                        {no_results ? "" : intcomma(record.votecount_choice1)}
                                    </span>
                                </div></td
                            >
                            {#if !st_paul_race}
                                <td class="choice">
                                    <div>
                                        <span class="pct">
                                            {no_results ? "—" : `${record.votepct_choice2.toFixed(mobile ? 1 : 0)}%`}
                                        </span>
                                        <span class="count">
                                            {no_results ? "" : intcomma(record.votecount_choice2)}
                                        </span>
                                    </div>
                                </td>
                                <td class="choice">
                                    <div>
                                        <span class="pct">
                                            {no_results ? "—" : `${record.votepct_choice3.toFixed(mobile ? 1 : 0)}%`}
                                        </span>
                                        <span class="count">
                                            {no_results ? "" : intcomma(record.votecount_choice3)}
                                        </span>
                                    </div>
                                </td>
                            {/if}

                            {#if final_rank}
                                <td class="choice">
                                    <div class:empty={!record.votecount_choiceFinal}>
                                        <span class="pct">
                                            {no_results || !record.votecount_choiceFinal ? "—" : `${record.votepct_choiceFinal.toFixed(mobile ? 1 : 0)}%`}
                                        </span>
                                        <span class="count">
                                            {no_results || !record.votecount_choiceFinal ? "" : intcomma(record.votecount_choiceFinal)}
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
            on:click|preventDefault={() => {
                candidates_expanded = !candidates_expanded;
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
        <!-- St. Paul note -->
        {#if st_paul_race && rcv}St. Paul only reports live results for first-choice votes.<br>{/if}
       <!-- Precincts reporting note -->
        {precincts_reporting_pct.toFixed(0)}% of precincts reporting.
        <!-- 'Too close' note -->
        {#if too_close && precincts_reporting_pct.toFixed(0) === "100" && !rcv && cand_records[0].full_name.toLowerCase() !== "write-in"}
        {(question_table) ? "Referendum is too close to call." : `${capfirst(apnumber(seats_open - winners))} seat${pluralize(seats_open - winners)} ${seats_open - winners == 1 ? "is" : "are"} too close to call.`}
        {/if}
        <!-- Special note for two primary races -->
        <!-- {#if seat_name_formatted === "Special Primary For County Commissioner District 3" && winners < 2 && precincts_reporting_pct.toFixed(0) === "100"}
        {`${capfirst(apnumber(2 - winners))} seat${pluralize(2 - winners)} ${2 - winners == 1 ? "is" : "are"} too close to call.`}
        {/if} -->
    </footer>
</article>
