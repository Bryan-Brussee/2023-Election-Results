<script>
    // Libraries
    import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
    import Select from "svelte-select";
    import MiniSearch from "minisearch";
    import { csv } from "d3-fetch";
    import { onMount } from "svelte";

    // Helpers
    import mcdLookup from "./mcdfipslookup.json";
    import sticky from "./sticky"

    // Stores
    import { sos_data, filter_ids } from "./stores";

    //sticky variables
    export let top;
    let stickToTop = true;
    let isStuck = false;

    function handleStuck(e) {
        isStuck = e.detail.isStuck;
    }

    let activeAddress;
    let filterText;
    let doingAddressSearch = false;
    let currentItems=[];
    let locationsAndRaces=[];
    let selected;

    // Geocoder setup
    const accessToken="pk.eyJ1Ijoic3RhcnRyaWJ1bmUiLCJhIjoiY2xucDJvb2YzMGsyeDJxcDYwYnV3dWk1ayJ9.3lS9wRHXMH94yQI52kViag";
    const geocoder = new MapboxGeocoder({
        accessToken: accessToken,
        countries: "us",
        bbox: [-97.5, 43, -89, 49.5],
        types: "address",
        placeholder: "Search for an address…"
    });

    const streetSearch = new MiniSearch({
        fields: ["StreetAddr"]
    });

    const getWard = (officeTitle) => {
        const wardRe = /(?:Ward|District) (\d+)/
        const found = officeTitle.match(wardRe)
        return found ? found[1].padStart(2, "0") : ""
    }

    const addressReplace = (address) => {
        const replacements = {
            "E": "EAST",
            "W": "WEST",
            "S": "SOUTH",
            "N": "NORTH",
            "NW": "NORTHWEST",
            "NE": "NORTHEAST",
            "SE": "SOUTHEAST",
            "SW": "SOUTHWEST",
            "ST": "STREET",
            "RD": "ROAD",
            "DR": "DRIVE",
            "CR": "CIRCLE",
            "LN": "LANE",
            "AVE": "AVENUE",
            "PKWY": "PARKWAY",
            "TER": "TERRACE",
            "PL": "PLACE"
        }

        let tokens = address.split(" ");
        for (let i=0; i<tokens.length; i++) {
            if (tokens[i] in replacements) {
                tokens[i] = replacements[tokens[i]]
            }
        }
        return tokens.join(" ");
    }

    geocoder.on("results", event => {
        currentItems = event.features.map(f => {
            return {
                "label": f.place_name, 
                "houseNumber": parseInt(f.address),
                "streetName": f.text.toUpperCase(), 
                "zip": f.context.filter((r) => r.id.includes("postcode"))[0].text,
                "state": f.context.filter((r) => r.id.includes("region"))[0].text
            }
        });
    });

    // Setup for Offices/Locations select
    const officesSearch = new MiniSearch({
        fields: ["location", "label"],
        storeFields: ["location", "value", "label", "id"]
    });

    const getLocationsAndRaces = (data) => {
        const officeId = (id) => {
            const result_id = id.split("-")
            const location_id = result_id[0]
            const office_id = result_id[1].charAt(0) === "2" ? result_id[1].slice(0,3) : result_id[1]
            return `${location_id}-${office_id}`
        }
        const offices = Array.from(new Set($sos_data.map(row => officeId(row["result_id"]))));
        let items = offices
        .map(o => {
            const sample_row = $sos_data.filter(row => officeId(row["result_id"]) == o)[0]
            const location = sample_row.location
            const display_name = sample_row.display_name
            return {
                "location": location, 
                "value": o, 
                "label": display_name, 
                "id": officeId(sample_row["result_id"])
            }
        });
        items.push(...[
            {
                "location": "Laporte Public School District",
                "value": "0306-5001",
                "label": "Special Election For School Board Member ",
                "id": "0306-5001"
            },
            {
                "location": "Rothsay Public School District",
                "value": "0850-5000",
                "label": "School Board Member At Large  ",
                "id": "0850-5000"
            },
            {
                "location": "Laporte Public School District",
                "value": "0306-5031",
                "label": "School District Question 1 ",
                "id": "0306-5031"
            }
        ]);
        officesSearch.removeAll();
        officesSearch.addAll(items);
        return items;
    }

 

    // Override default svelte-select filter function to use minisearch instead
    function filter({
    loadOptions,
    filterText,
    items,
    groupBy,
    convertStringItemsToObjects,
    filterGroupedItems,
    }) {

        if (items && loadOptions) return items;
        if (!items) return [];

        if (items && items.length > 0 && typeof items[0] !== 'object') {
            items = convertStringItemsToObjects(items);
        }

        let filterResults = items

        if (filterText && !doingAddressSearch) {
            filterResults = officesSearch.search(filterText, {prefix: true});
        }        

        if (groupBy) {
            filterResults = filterGroupedItems(filterResults);
        }

        return filterResults;
    };


    // Reactive: If selection, check if it's an address or an office/location and update $filter_ids
    $: if (selected) {
        if (selected.houseNumber) {
            if (selected.state === "Minnesota") {
                csv(`https://static.startribune.com/news/projects/all/2023-precinct-finder/zips/${selected.zip}.csv`)
                .then(precinctData => {
                    let possibleRows = precinctData.filter(
                            r => parseInt(r.HouseNbrLo) <= selected.houseNumber && 
                            selected.houseNumber <= parseInt(r.HouseNbrHi)
                        );
                    for (let i=0; i<possibleRows.length; i++) {
                        possibleRows[i]["StreetAddr"] = addressReplace(possibleRows[i]["StreetAddr"])
                    };
                    if (possibleRows.length > 0) {
                        streetSearch.addAll(possibleRows)
                        const result = streetSearch.search(addressReplace(selected.streetName))
                        if (result.length > 0) {
                            activeAddress = possibleRows.filter(r => r.id == result[0].id)[0]
                        } else {
                            $filter_ids = ["xxxx"]
                        }
                        streetSearch.removeAll();
                    } else {
                        $filter_ids = ["xxxx"]
                    }
                });
            } else {
                $filter_ids = ["nonmn"]
            }
        } else {
            activeAddress = undefined;
            if (selected.groupHeader) {
                $filter_ids = $sos_data.filter(row => row["location"] === selected.value).map(row => row["result_id"])
                // Special handling for deleted school districts
                if (selected.value === "Rothsay Public School District") {
                    $filter_ids = ["rothsay"]
                }
                if (selected.value === "Laporte Public School District") {
                    $filter_ids = ["laporte"]
                }
            } else {
                const race_id = (result_id) => {
                    const parts = result_id.split("-")
                    return parts[1].charAt(0) === "2"
                        ? `${parts[0]}-${parts[1].slice(0,3)}`
                        : `${parts[0]}-${parts[1]}`
                }
                $filter_ids = $sos_data.filter(row => race_id(row.result_id) === selected.id).map(row => row["result_id"]);
            }
            // Special handling for deleted school districts
            if (selected.location === "Rothsay Public School District") {
                $filter_ids = ["rothsay"]
            }
            if (selected.location === "Laporte Public School District") {
                $filter_ids = ["laporte"]
            }
        }
        const top = document.getElementById("search")
        top.scrollIntoView()
        const input = document.querySelector(".value-container input")
        // @ts-ignore
        input.blur()
    }

    // If an address has been selected, figure out what races apply to it and update $filter_ids accordingly
    $: if (activeAddress) {
        // County races
        const countyCode = activeAddress["County"]
        const countyDistrict = activeAddress["CommDist"]

        const countyRaces = $sos_data.filter(row => (
            row["results_group"] == "cntyRaceQuestions" && 
            row["county_id"] == countyCode &&
            ["", countyDistrict].includes(row["district"])
        ));

        // Municipal races
        const mcdCode = mcdLookup[`${parseInt(activeAddress["County"])}${activeAddress["StateMCDCd"]}`]
        const ward = activeAddress["Ward"]

        const muniRaces = $sos_data.filter(row => (
            row["results_group"] == "local" &&
            row["district"] == mcdCode &&
            ["", ward].includes(getWard(row["seatname"]))
        ));

        // School races
        const schoolData = activeAddress["SchDist"].split("-")

        let schoolRaces = $sos_data.filter(row => (
            row["results_group"] == "SDRaceQuestions" &&
            row["district"] == schoolData[0].padStart(4, "0") &&
            ["", schoolData[1].padStart(2, "0")].includes(getWard(row["seatname"]))
        ));
        // Special hardcoded handling for school districts no longer reporting through SoS
        if (schoolData[0] === "306") {
            schoolRaces = [{"result_id": "laporte"}]
        }
        if (schoolData[0] === "850") {
            schoolRaces = [{"result_id": "rothsay"}]
        }
        $filter_ids = [...countyRaces, ...muniRaces, ...schoolRaces].map(r => r.result_id);
        if ($filter_ids.length === 0) {
            $filter_ids = ["xxxx"]
        }

    }

    // Remove addresses from select if search field has been cleared
    $: if (filterText === "") {
        currentItems = locationsAndRaces;
    }

    // Toggle between searching addresses if the text input starts with digits, or filtering offices/locations
    $: {
        if (/^\d+/.exec(filterText)) {
            if (!doingAddressSearch) {
                doingAddressSearch = true;
            }
            geocoder.setInput(filterText);
            selected = undefined;
        } else {
            if (doingAddressSearch) {
                doingAddressSearch = false;
                geocoder.clear();
            }
        }
    };

    const clearAll = () => {
        $filter_ids=[]; 
        filterText=""; 
        selected=undefined; 
        activeAddress=undefined;

        //return to top of page
        const top = document.getElementById("search");
        top.scrollIntoView();
    }

    onMount(()=>{
        geocoder.addTo("#geocoder");
        locationsAndRaces = getLocationsAndRaces($sos_data);
        currentItems = locationsAndRaces;
    });

    //a little extra jazz

</script>


{#if !stickToTop}
<slot />
{/if}
<div 
class="sticky-wrapper" 
style="top: {top}px;"
class:isStuck
data-position={stickToTop ? 'top' : 'bottom'}
use:sticky={{ stickToTop }}
on:stuck={handleStuck}>

    <Select
    items={currentItems}
    {filter}
    bind:value={selected}
    bind:filterText
    groupBy={(item) => item.location}
    groupHeaderSelectable
    on:clear={clearAll}
    hideEmptyState={doingAddressSearch && filterText.length < 8}
    placeholder={"Select from dropdown or type address..."}
    inputStyles="font-family:'Benton Sans',Helvetica,sans-serif;"
    --font-size="16px"
    --border="1px solid #707273"
    >
        <div slot="empty">               
            {#if doingAddressSearch}
                Address not found.
            {:else}
                No office or location found.
            {/if}
        </div>
    </Select>
</div>
{#if stickToTop}
<slot />
{/if}

<div id="omnisearch-status">

    {#if selected && $filter_ids.length > 0 && !["xxxx","nonmn","rothsay","laporte"].includes($filter_ids[0])}
        Showing results for
        {#if selected.houseNumber || selected.groupHeader}
            <span>{selected.label}</span>
        {:else}
            <span>{selected.label} ({selected.location})</span>
        {/if}
        <button on:click={clearAll}>Show all</button>
    {/if}
    {#if selected && $filter_ids.includes("rothsay")}
        Note: Results for the school board election for <strong>Rothsay Public School District</strong>
        are not available because those results are not being reported to the Minnesota
        Secretary of State.
        <button on:click={clearAll}>Clear search</button>

    {/if}
    {#if selected && $filter_ids.includes("laporte")}
        Note: Results for the school board election and referendum for <strong>Laporte Public School District</strong>
        are not available because those results are not being reported to the Minnesota
        Secretary of State.
        <button on:click={clearAll}>Clear search</button>
 
    {/if}
    {#if selected && $filter_ids[0] === "xxxx"}
        No elections found for the address {selected.label}. 
        <button on:click={clearAll}>Clear search</button>
    {/if}
    {#if selected && $filter_ids[0] === "nonmn"}
        Election results are only available for locations in Minnesota. 
        <button on:click={clearAll}>Clear search</button>
    {/if}
</div>

<div id="geocoder"></div>

<style>
    #geocoder {
        display: none;
    }
</style>
