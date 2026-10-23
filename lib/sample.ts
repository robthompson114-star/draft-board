import { parseImport } from "./board";
import { SPORTS, type SportSlug } from "./sports";
import type { BoardState } from "./types";

// Placeholder rankings so the board isn't empty on first load.
// Replace them with your own via "Import" (CSV or paste from a spreadsheet).
const NFL = `Name,Pos,Team,Tier
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

const NBA = `Name,Pos,Team,Tier
Nikola Jokic,C,DEN,1
Shai Gilgeous-Alexander,PG,OKC,1
Victor Wembanyama,C,SAS,1
Luka Doncic,PG,LAL,1
Giannis Antetokounmpo,PF,MIL,2
Anthony Edwards,SG,MIN,2
Cade Cunningham,PG,DET,2
Tyrese Haliburton,PG,IND,2
Karl-Anthony Towns,C,NYK,2
Anthony Davis,PF,DAL,3
Jalen Brunson,PG,NYK,3
Donovan Mitchell,SG,CLE,3
Trae Young,PG,ATL,3
LaMelo Ball,PG,CHA,3
Domantas Sabonis,C,SAC,3
Chet Holmgren,C,OKC,4
Evan Mobley,PF,CLE,4
Jalen Williams,SF,OKC,4
Alperen Sengun,C,HOU,4
Devin Booker,SG,PHX,4
Tyrese Maxey,PG,PHI,4
Paolo Banchero,PF,ORL,5
Kevin Durant,SF,HOU,5
Jayson Tatum,SF,BOS,5
Cooper Flagg,SF,DAL,5`;

const MLB = `Name,Pos,Team,Tier
Shohei Ohtani,DH,LAD,1
Aaron Judge,OF,NYY,1
Bobby Witt Jr.,SS,KC,1
Juan Soto,OF,NYM,1
Tarik Skubal,SP,DET,2
Elly De La Cruz,SS,CIN,2
Jose Ramirez,3B,CLE,2
Paul Skenes,SP,PIT,2
Gunnar Henderson,SS,BAL,2
Julio Rodriguez,OF,SEA,3
Fernando Tatis Jr.,OF,SD,3
Corbin Carroll,OF,ARI,3
Francisco Lindor,SS,NYM,3
Ronald Acuna Jr.,OF,ATL,3
Garrett Crochet,SP,BOS,3
Cal Raleigh,C,SEA,4
Vladimir Guerrero Jr.,1B,TOR,4
Freddie Freeman,1B,LAD,4
Jackson Chourio,OF,MIL,4
Zack Wheeler,SP,PHI,4
Ketel Marte,2B,ARI,4
Mason Miller,RP,SD,5
Josh Hader,RP,HOU,5`;

const NHL = `Name,Pos,Team,Tier
Connor McDavid,C,EDM,1
Nathan MacKinnon,C,COL,1
Nikita Kucherov,RW,TBL,1
Leon Draisaitl,C,EDM,1
Cale Makar,D,COL,2
David Pastrnak,RW,BOS,2
Auston Matthews,C,TOR,2
Kirill Kaprizov,LW,MIN,2
Jack Eichel,C,VGK,2
Mitch Marner,RW,VGK,3
Quinn Hughes,D,VAN,3
Jack Hughes,C,NJD,3
Matthew Tkachuk,LW,FLA,3
Connor Hellebuyck,G,WPG,3
Artemi Panarin,LW,NYR,4
Kyle Connor,LW,WPG,4
William Nylander,RW,TOR,4
Sidney Crosby,C,PIT,4
Igor Shesterkin,G,NYR,4
Evan Bouchard,D,EDM,4
Connor Bedard,C,CHI,5
Macklin Celebrini,C,SJS,5
Brady Tkachuk,LW,OTT,5
Andrei Vasilevskiy,G,TBL,5`;

const SAMPLES: Record<SportSlug, string> = { nfl: NFL, nba: NBA, mlb: MLB, nhl: NHL };

export function sampleBoard(sport: SportSlug): BoardState {
  return {
    ...parseImport(SAMPLES[sport])!,
    leagueNotes: SPORTS[sport].defaultLeagueNotes,
  };
}
