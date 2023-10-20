import { groups } from 'd3-array';

export function parseID(results_id) {
  return results_id.replace(/-\d+$/, '');
}

export function getRace(input) {
  const pattern = /\s*\b\w+\b\s*\bChoice\b/gi;
  const output = input.replace(pattern, '');
  return output.trim();
 
}

//more descriptive name
export function groupRaceRecords(race_records) {
  return groups(race_records, d => d.cand_order)
      .map(([key, records]) => {
          const base_record = { ...records[0] }; // creating a copy to avoid mutation
          
          //slice off last digit of office id, instead of using counter
          //note that the final rank column will need an office_id of something like 200x
          records.forEach(({votecount, votepct}, i) => {
              base_record[`votecount_choice${i + 1}`] = votecount;
              base_record[`votepct_choice${i + 1}`] = votepct;
          });

          return base_record;
      });
}

export function removeParentheticals(inputStr) {
  return inputStr.replace(/\(.*?\)/g, '').trim();
}


