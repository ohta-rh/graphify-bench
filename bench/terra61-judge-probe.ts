/** Validate the unchanged explanation grader; excluded from benchmark scoring. */
import fs from 'node:fs';
import { judge } from './grade.js';
const result=await judge('1. States that the probe answer is OK.','The probe answer is OK.');
fs.writeFileSync('results/terra61/probes/judge.json',JSON.stringify({...result,not_a_scored_benchmark:true},null,2)+'\n');
console.log(JSON.stringify(result));
if(result.score===null)throw new Error('Explanation judge unavailable; preserve all solver evidence');
