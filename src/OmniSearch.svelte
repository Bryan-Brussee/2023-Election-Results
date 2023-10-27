<script>
    // Libraries
    import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
    import Select from "svelte-select";
    import MiniSearch from "minisearch";
    import { csv } from "d3-fetch";
    import { onMount } from "svelte";

    // Helpers
    import mcdLookup from "./mcdfipslookup.json";

    // Stores
    import { sos_data, filter_ids } from "./stores";

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
            "AVE": "AVENUE"
        }

        const tokens = address.split(" ")
        tokens.forEach(t => {
            if (t in replacements) {
                t = replacements[t]
            };
        });

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
        fields: ["location", "value"],
        storeFields: ["location", "value", "label", "id"]
    });

    const getLocationsAndRaces = (data) => {
        const offices = Array.from(new Set($sos_data.map(row => row["seatname"])));
        const items = offices
        .filter(o => {
            const seatId = $sos_data.filter(row => row["seatname"] === o)[0].office_id;
            if ((seatId.charAt(0) === "2" && seatId.charAt(3) === "1") || seatId.charAt(0) !== "2") {
                return true
            }
            return false
        })
        .map(o => {
            const fullId = $sos_data.filter(row => row["seatname"] == o)[0].result_id.split("-");
            const officeId = fullId[1].charAt(0) === "2" 
                ? `${fullId[0]}-${fullId[1].slice(0,3)}`
                : `${fullId[0]}-${fullId[1]}`
            const results_group = $sos_data.filter(row => row["seatname"] == o)[0].results_group
            const append  = results_group === "SDRaceQuestions" ?
                                " School District" :
                                results_group === "cntyRaceQuestions" ?
                                " County" :
                                ""
            const location = `${$sos_data.filter(row => row["seatname"] == o)[0].location}${append}`
            return {
                "location": location, 
                "value": o, 
                "label": o.replace(/\([\w\s\d#]+\)/, "").replace("First Choice", "").replace(/\(Elect \d+\)/,""), 
                "id": officeId
            }
        });
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
                    possibleRows.forEach(r => {
                        r["StreetAddr"] = addressReplace(r["StreetAddr"]);
                    });
                    streetSearch.addAll(possibleRows)
                    const result = streetSearch.search(selected.streetName)
                    if (result) {
                        activeAddress = possibleRows.filter(r => r.id == result[0].id)[0]
                    }
                    streetSearch.removeAll();
                });
            } else {
                $filter_ids = []
            }
        } else {
            if (selected.groupHeader) {
                $filter_ids = $sos_data.filter(row => row["location"] === selected.value).map(row => row["result_id"])
            } else {
                const race_id = (result_id) => {
                    const parts = result_id.split("-")
                    return parts[1].charAt(0) === "2"
                        ? `${parts[0]}-${parts[1].slice(0,3)}`
                        : `${parts[0]}-${parts[1]}`
                }
                $filter_ids = $sos_data.filter(row => race_id(row.result_id) === selected.id).map(row => row["result_id"]);
            }
        }
    }

    // If an address has been selected, figure out what races apply to it and update $filter_ids accordingly
    $: if (activeAddress) {
        // County races
        const countyCode = activeAddress["County"]
        const countyDistrict = activeAddress["CommDist"]

        const countyRaces = $sos_data.filter(row => {
            row["results_group"] == "cntyRaceQuestions" && 
            row["county_id"] == countyCode &&
            ["", countyDistrict].includes(row["district"])
        });

        // Municipal races
        const mcdCode = mcdLookup[activeAddress["County"] + activeAddress["StateMCDCd"]]
        const ward = activeAddress["Ward"]

        const muniRaces = $sos_data.filter(row => (
            row["results_group"] == "local" &&
            row["district"] == mcdCode &&
            ["", ward].includes(getWard(row["seatname"]))
        ));

        // School races
        const schoolData = activeAddress["SchDist"].split("-")

        const schoolRaces = $sos_data.filter(row => (
            row["results_group"] == "SDRaceQuestions" &&
            row["district"] == schoolData[0].padStart(4, "0") &&
            ["00", schoolData[1]].includes(getWard(row["seatname"]))
        ));

        $filter_ids = [...countyRaces, ...muniRaces, ...schoolRaces].map(r => r.result_id);

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

    // Ensure locationsAndRaces updates after $sos_data first resolves
    $: locationsAndRaces = getLocationsAndRaces($sos_data);

    onMount(()=>{
        geocoder.addTo("#geocoder");
        currentItems = locationsAndRaces;
    });

</script>



<div class="sticky-wrapper">

    <Select
    items={currentItems}
    {filter}
    bind:value={selected}
    bind:filterText
    groupBy={(item) => item.location}
    groupHeaderSelectable
    on:clear={()=> {
        currentItems=locationsAndRaces; 
        $filter_ids=[]; 
        selected=undefined;
        }
    }
    hideEmptyState={doingAddressSearch && filterText.length < 8}
    placeholder={"Select from dropdown or type address..."}
    inputStyles="font-family:'Benton Sans',Helvetica,sans-serif;"
    --font-size="15px"
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

<div id="omnisearch-status">
    {#if selected && $filter_ids.length > 0}
        Showing results for
        {#if selected.houseNumber || selected.groupHeader}
            <span>{selected.label}</span>
        {:else}
            <span>{selected.label} ({selected.location})</span>
        {/if}
        <button on:click={()=>{$filter_ids=[]; filterText="";selected=undefined}}>Show all</button>
    {/if}
    {#if selected && $filter_ids.length === 0}
        No elections found for the address {selected.label}. 
        <button on:click={()=>{filterText="";selected=undefined}}>Clear search</button>
    {/if}
</div>

<div id="geocoder"></div>

<style>
    #geocoder {
        display: none;
    }
</style>
