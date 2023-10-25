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
    let searchText;
    let doingAddressSearch = false;
    let currentItems=[];
    let locationsAndRaces=[];
    let selected;

    // Geocoder setup
    const accessToken="pk.eyJ1Ijoic3RhcnRyaWJ1bmUiLCJhIjoiY2xucDJvb2YzMGsyeDJxcDYwYnV3dWk1ayJ9.3lS9wRHXMH94yQI52kViag";
    const geocoder = new MapboxGeocoder({
        accessToken: accessToken,
        countries: "us",
        bbox: [-97.24, 43.5, -89.48, 49.38],
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
                "zip": f.context.filter((r) => r.id.includes("postcode"))[0].text
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
            const officeId = `${fullId[0]}-${fullId[1]}`
            return {
                "location": $sos_data.filter(row => row["seatname"] == o)[0].location, 
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
        // This syncs the text entered into svelte-select with the text in the hidden geocoder
        searchText = filterText;

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
            if (selected.groupHeader) {
                $filter_ids = $sos_data.filter(row => row["location"] === selected.value).map(row => row["result_id"])
            } else {
                const race_id = (result_id) => {
                    const parts = result_id.split("-")
                    return `${parts[0]}-${parts[1]}`
                }
                $filter_ids = $sos_data.filter(row => race_id(row.result_id) === selected.id).map(row => row["result_id"])
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
    $: if (searchText === "") {
        currentItems = locationsAndRaces;
    }

    // Toggle between searching addresses if the text input starts with digits, or filtering offices/locations
    $: {
        if (/^\d+/.exec(searchText)) {
            if (!doingAddressSearch) {
                doingAddressSearch = true;
            }
            geocoder.setInput(searchText);
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


<Select
    items={currentItems}
    {filter}
    bind:value={selected}
    groupBy={(item) => item.location}
    groupHeaderSelectable
    on:clear={()=>{currentItems=locationsAndRaces}}
    hideEmptyState={doingAddressSearch&&searchText.length < 6}
    placeholder={"Select a location or office or type in a street address…"}
>
    <div slot="empty">               
        {#if doingAddressSearch}
            Address not found.
        {:else}
            No office or location found.
        {/if}
    </div>
</Select>

<div id="geocoder"></div>

<style>
    #geocoder {
        display: none;
    }
</style>
