import { parseImport } from "./board";
import type { BoardState } from "./types";

// Placeholder rankings so the board isn't empty on first load.
// Replace them with your own via "Import" (CSV or paste from a spreadsheet).
const SAMPLE = `Name,Pos,Team,Tier
Ja'Marr Chase,WR,CIN,1
Bijan Robinson,RB,ATL,1
Justin Jefferson,WR,MIN,1
Jahmyr Gibbs,RB,DET,1
CeeDee Lamb,WR,DAL,2
Saquon Barkley,RB,PHI,2
Puka Nacua,WR,LAR,2
Amon-Ra St. Brown,WR,DET,2
Malik Nabers,WR,NYG,2
De'Von Achane,RB,MIA,3
Nico Collins,WR,HOU,3
Brian Thomas Jr.,WR,JAX,3
Ashton Jeanty,RB,LV,3
Brock Bowers,TE,LV,3
Derrick Henry,RB,BAL,3
Christian McCaffrey,RB,SF,4
Josh Allen,QB,BUF,4
Lamar Jackson,QB,BAL,4
Drake London,WR,ATL,4
A.J. Brown,WR,PHI,4
Trey McBride,TE,ARI,4
Jonathan Taylor,RB,IND,4
Jayden Daniels,QB,WSH,5
Jalen Hurts,QB,PHI,5
Ladd McConkey,WR,LAC,5
Tee Higgins,WR,CIN,5
Kyren Williams,RB,LAR,5
George Kittle,TE,SF,5
Josh Jacobs,RB,GB,5
Garrett Wilson,WR,NYJ,5`;

export function sampleBoard(): BoardState {
  return {
    ...parseImport(SAMPLE)!,
    leagueNotes: "12-team, half-PPR, 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX",
  };
}
