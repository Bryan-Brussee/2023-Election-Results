<script>
    import { groupRaceRecords, removeParentheticals } from "./helpers";
    import { intcomma, apnumber, capfirst } from 'journalize';
    export let race_data;

    $: race_name = race_data[0];
    $: race_records = race_data[1];
    $: ranked_choice = race_data[1][0].seatname.toLowerCase().includes("choice")
        ? true
        : false;

    $: seats_open = race_name.match(/Elect (\d+)/) ? race_name.match(/Elect (\d+)/)[1] : 1;

    $: {
        if (ranked_choice) {
            race_records = groupRaceRecords(race_records);
        }
    }

    //decimal rounded to nearest integer
    $: precincts_reporting_percent =
        Math.round((race_records[0].precinctsreporting / race_records[0].precinctstotal) * 100);

    $: {
        race_records.sort((a, b) => {
            return b.votecount - a.votecount;
        });
    }

    let candidates_expanded = false;

</script>

<article class="results-module">
    <header>
        <h3 class="race-name">{removeParentheticals(race_name)}</h3>

        {#if seats_open > 1}
            <span class="seats-open interface">{seats_open} seats open</span>
        {/if}
    </header>


    <table class="results-table" class:rcv={ranked_choice}>
        <thead>
            <th class="check-container" />
            <th class="cand">Candidate</th>
            {#if !ranked_choice}
                <th class="votes">Votes</th>
                <th class="pct">Pct.</th>
            {:else}
                <th class="choice">First<br />choice</th>
                <th class="choice">Second<br />choice</th>
                <th class="choice">Third<br />choice</th>
            {/if}
        </thead>
        <tbody>
            {#each race_records as record, i}
                {#if candidates_expanded || i < 5}
                <tr>
                    <!-- check container -->
                    <td />
                    <td class="cand">{record.full_name}</td>
                    {#if !ranked_choice}
                        <td class="votes">{intcomma(record.votecount)}</td>
                        <td class="pct">{record.votepct}%</td>
                    {:else}
                        <td class="choice">
                            {record.votepct_choice1
                                ? record.votepct_choice1 + "%"
                                : "—"}
                            <span>
                                {record.votecount_choice1
                                    ? intcomma(record.votecount_choice1)
                                    : ""}
                            </span>
                        </td>
                        <td class="choice">
                            {record.votepct_choice2
                                ? record.votepct_choice2 + "%"
                                : "—"}
                            <span>
                                {record.votecount_choice2
                                    ? intcomma(record.votecount_choice2)
                                    : ""}
                            </span>
                        </td>
                        <td class="choice">
                            {record.votepct_choice3
                                ? record.votepct_choice3 + "%"
                                : "—"}
                            <span>
                                {record.votecount_choice3
                                    ? intcomma(record.votecount_choice3)
                                    : ""}
                            </span>
                        </td>
                    {/if}
                </tr>
                {/if}
            {/each}
        </tbody>
    </table>
    {#if race_records.length > 5}
    <button class="expand" on:click={() =>{candidates_expanded = !candidates_expanded; console.log(race_records)}}>
        View {candidates_expanded ? "fewer" : "all"} candidates <span>{candidates_expanded ? "-" : "+"}</span>
    </button>
    {/if}
    <footer class="interface precincts-reporting">
        {precincts_reporting_percent}% of precincts reporting
    </footer>
</article>
