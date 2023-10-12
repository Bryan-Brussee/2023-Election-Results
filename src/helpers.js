import { csvParse } from 'd3-dsv'
import { groups } from 'd3-array';
import { sos_data } from "./stores";

export async function loadData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok' + response.statusText);
    }
    const csvText = await response.text();
    const data = csvParse(csvText);
    sos_data.set(data); // Update the store with the parsed data
  } catch (error) {
    console.error('Error fetching or parsing CSV data:', error);
  }
}

export function parseID(results_id) {
  return results_id.replace(/-\d+$/, '');
}

export function toTitleCase(input) {
  return input.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}

export function getRace(input) {
  const pattern = /\s*\b\w+\b\s*\bChoice\b/gi;
  const output = input.replace(pattern, '');
  return output.trim();
 
}

export function groupRaceRecords(race_records) {
  return groups(race_records, d => d.cand_order)
      .map(([key, records]) => {
          const base_record = { ...records[0] }; // creating a copy to avoid mutation
          
          records.forEach(({votecount, votepct}, i) => {
              base_record[`votecount_choice${i + 1}`] = votecount;
              base_record[`votepct_choice${i + 1}`] = votepct;
          });

          return base_record;
      });
}


