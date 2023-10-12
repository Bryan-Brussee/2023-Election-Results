<script>
    import { groupRaceRecords } from "./helpers";
    export let race_data;

    $: race_name = race_data[0];
    $: race_records = race_data[1];
    $: ranked_choice = race_data[1][0].seatname.toLowerCase().includes("choice")
        ? true
        : false;

    $: {
        if (race_name.includes("St. Paul")) {
            // console.log(race_records);
        }
    }

    $: {
        if (ranked_choice) {
            race_records = groupRaceRecords(race_records);
            // console.log(race_records);
        }
    }

    //probably need to refine this one
    $: precincts_reporting = race_records[0].precincts_reporting;

    $: {
        race_records.sort((a, b) => {
            return b.votecount - a.votecount;
        });
    }
</script>

<article class="results-module">
    <h3 class="race-name">{race_name}</h3>

    <table class="results-table">
        {#if ranked_choice}
            <thead>
                <th class="check-container" />
                <th class="cand">Candidate</th>
                <th>First<br />choice</th>
                <th>Second<br />choice</th>
                <th>Third<br />choice</th>
                <!-- <th>Final round</th> -->
            </thead>
        {:else}
            <thead>
                <th class="check-container" />
                <th class="cand">Candidate</th>
                <th class="votes">Votes</th>
                <th class="pct">Pct.</th>
            </thead>
        {/if}
        <tbody>
            {#each race_records as record}
                {#if ranked_choice}
                    <tr>
                        <td />
                        <td class="cand">{record.full_name}</td>
                        <td
                            >{(record.votepct_choice1) ? (record.votepct_choice1) + "%" : "—"}
                            <span>{(record.votecount_choice1) ? record.votecount_choice1 : ""}</span></td
                        >
                        <td
                        >{(record.votepct_choice2) ? (record.votepct_choice2) + "%" : "—"}
                        <span>{(record.votecount_choice2) ? record.votecount_choice2 : ""}</span></td
                    >
                    <td
                    >{(record.votepct_choice3) ? (record.votepct_choice3) + "%" : "—"}
                    <span>{(record.votecount_choice3) ? record.votecount_choice3 : ""}</span></td
                >
                    </tr>
                {:else}
                    <tr>
                        <td class="check-container" />
                        <td class="cand">{record.full_name}</td>
                        <td class="votes">{record.votecount}</td>
                        <td class="pct">{record.votepct}</td>
                    </tr>
                {/if}
            {/each}
        </tbody>
    </table>
</article>
