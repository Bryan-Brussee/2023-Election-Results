<!-- 
    @component
    Generates an svg locator map, where a district is highlighted
    within a given boundary.
-->



<script>
    import { geoMercator, geoPath } from "d3";

    /** @type {Object} [outline={geoJSON}] GeoJSON for geography that is outlined */
    export let outline;

    /** @type {Object} [districts={geoJSON}] GeoJSON of sub-geography to be highlighted */
    export let district;

    /** @type {Boolean} [rewindJson=false] Boolean on whether to rewind the geojsons. May be necssary if they are rendering weirdly.*/
    // export let rewindJson = false;

    /** @type {String} [color="#333333"] Color for district fill and outline stroke */
    export let color="#333333";

    /** @type {Number} [strokeWidth=2] Stroke width for outline */
    export let strokeWidth = 2;

    /** @type {Number} [width=300] Width of svg */
    export let width = 300;

    /** @type {Number} [height=300] Width of svg */
    export let height = 300;

    /** @type {String} [className="my-class"] CSS class for svg */
    export let className = "";

    const projection = geoMercator()
        .fitSize([width, height],{
            type: "FeatureCollection",
            features: outline.features
        });

    const path = geoPath()
        .projection(projection);



</script>

<svg viewBox="0 0 {width} {height}" class={className}>
    <g>
        <path
            d={path(outline)}
            stroke={color}
            stroke-width={strokeWidth}
            fill-opacity={0}
        />

        <path
            d={path(district)}
            fill={color}
        /> 
    </g>
</svg>