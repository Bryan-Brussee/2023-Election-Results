import { groups } from 'd3-array';


//more descriptive name
export function groupRCVRecords(race_records) {
  return groups(race_records, d => d.cand_order)
      .map(([key, records]) => {
          const base_record = { ...records[0] }; // creating a copy to avoid mutation
          
          //note that the final rank column will need an office_id of something like 200x
          records.forEach((record) => {
              //slice off last digit of office id, instead of using counter
              let rank = record.office_id.slice(-1);

              if (record.full_name !== "") {
                base_record[`votecount_choice${rank}`] = record.votecount;
                base_record[`votepct_choice${rank}`] = record.votepct;
              } else {
                base_record[`votecount_choiceFinal`] = record.votecount;
                base_record[`votepct_choiceFinal`] = record.votepct;
              }
          });

          return base_record;
      });
}



