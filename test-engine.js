var P=require('./engine.js'),fs=require('fs');var st={},mm=[];
process.argv.slice(2).forEach(function(f){fs.readFileSync(f,'utf8').split('\n').filter(Boolean).forEach(function(l){
 var o=JSON.parse(l);var s=st[o.l]||(st[o.l]={lines:0,compared:0,agree:0,skippedOracleNoInt:0,skippedUB:0,engineNoValue:0,mismatch:0});s.lines++;
 var r=P.analyse(o.s,o.l);
 if(o.v===null){ if(r.ok&&r.value!==undefined&&!r.ub){ s.mismatch++;mm.push({l:o.l,s:o.s,note:'oracle has no integer result, engine says '+r.value,tree:r.text});} else s.skippedOracleNoInt++; return;}
 if(!r.ok){s.mismatch++;mm.push({l:o.l,s:o.s,want:o.v,note:'engine rejects: '+r.error});return;}
 if(r.ub){s.skippedUB++;return;}
 if(r.value===undefined){s.engineNoValue++;return;}
 s.compared++; if(r.value===o.v)s.agree++;else{s.mismatch++;mm.push({l:o.l,s:o.s,want:o.v,got:r.value,tree:r.text});}});});
console.log(JSON.stringify(st));mm.slice(0,+(process.env.SHOW||8)).forEach(function(m){console.log(JSON.stringify(m));});
