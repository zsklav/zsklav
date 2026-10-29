// Public GitHub statistics. No dependencies or personal access token required.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const username=process.env.PROFILE_USER||'zsklav';
if(!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username))throw new Error('Invalid GitHub username.');
const token=process.env.GITHUB_TOKEN;
const headers={'User-Agent':'Vanshikha-Profile-Stats','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
if(token)headers.Authorization='Bearer '+token;

async function getJSON(endpoint) {
  const response=await fetch('https://api.github.com'+endpoint,{headers,signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`GitHub ${response.status} for ${endpoint.split('?')[0]}`);
  return response.json();
}
function count(value,label) {
  if(!Number.isSafeInteger(value)||value<0)throw new Error('Invalid count for '+label);
  return value;
}
async function searchCount(query) {
  const result=await getJSON('/search/issues?q='+encodeURIComponent(query+' is:public')+'&per_page=1');
  if(result.incomplete_results)throw new Error('GitHub returned incomplete search results.');
  return count(result.total_count,query);
}
const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
const format=value=>Number(value).toLocaleString('en-US');
function svgFrame(title,description,fill,stroke,body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="330" viewBox="0 0 600 330" role="img" aria-labelledby="title description"><title id="title">${escape(title)}</title><desc id="description">${escape(description)}</desc><rect x=".5" y=".5" width="599" height="329" rx="10" fill="${fill}" stroke="${stroke}"/><g font-family="Arial,sans-serif" fill="#edf0f3">${body}</g></svg>\n`;
}
function statsCard(data) {
  const values=[['PRs opened',data.prsOpened],['PRs merged',data.prsMerged],['stars earned',data.starsEarned],['issues opened',data.issuesOpened],['public repos',data.publicRepos],['followers',data.followers]];
  const rows=values.map(([label,value],index)=>{
    const x=index%2===0?34:315;
    const y=110+Math.floor(index/2)*72;
    return `<text x="${x}" y="${y}" font-size="29" font-weight="700" fill="#d5b9ff">${format(value)}</text><text x="${x}" y="${y+24}" font-size="18" fill="#c8c4d2">${label}</text>`;
  }).join('');
  const description=values.map(([label,value])=>`${label}: ${value}`).join('; ');
  return svgFrame('github stats',description,'#241f32','#625077',`<text x="32" y="42" font-family="Trebuchet MS,Arial,sans-serif" font-size="29" font-weight="700" font-style="italic">github stats</text><text x="33" y="66" font-size="13" fill="#c8c4d2">@${escape(username)} · public activity</text>${rows}<text x="33" y="309" font-size="12" fill="#b0a8bd">updated ${escape(data.updatedLabel)}</text>`);
}
function languagesCard(data) {
  const sorted=Object.entries(data.languageBytes).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((sum,[,bytes])=>sum+bytes,0);
  const displayed=sorted.slice(0,6);
  if(sorted.length>6)displayed.push(['Other',sorted.slice(6).reduce((sum,[,bytes])=>sum+bytes,0)]);
  const colors=['#a7c7e7','#b8dba3','#f2c779','#c9b2ec','#eaa6b3','#8ed2c9','#99a3b0'];
  let cursor=34;
  const segments=displayed.map(([,bytes],index)=>{
    const width=total?bytes/total*532:0;
    const rect=`<rect x="${cursor.toFixed(3)}" y="88" width="${width.toFixed(3)}" height="18" fill="${colors[index]}"/>`;
    cursor+=width;
    return rect;
  }).join('');
  const legend=displayed.map(([language,bytes],index)=>{
    const x=index%2===0?34:311;
    const y=145+Math.floor(index/2)*38;
    return `<circle cx="${x+5}" cy="${y-5}" r="5" fill="${colors[index]}"/><text x="${x+18}" y="${y}" font-size="17" fill="#d6e3dd">${escape(language)}</text><text x="${x+248}" y="${y}" text-anchor="end" font-size="16" fill="#b3c6be">${(bytes/total*100).toFixed(1)}%</text>`;
  }).join('');
  const empty=total?'':'<text x="34" y="151" font-size="16" fill="#d6e3dd">No language data in public original repositories yet.</text>';
  return svgFrame('languages used',displayed.map(([name,bytes])=>`${name}: ${(bytes/total*100).toFixed(1)}%`).join('; ')||'No language data available.','#1b2d28','#4f7565',`<text x="32" y="42" font-family="Trebuchet MS,Arial,sans-serif" font-size="29" font-weight="700" font-style="italic">languages used</text><text x="33" y="66" font-size="13" fill="#b3c6be">code in my public repos</text>${segments}${legend}${empty}<text x="33" y="309" font-size="12" fill="#b3c6be">by code size · excludes forks</text>`);
}

async function collectStats() {
const [profile,prsOpened,prsMerged,issuesOpened]=await Promise.all([
  getJSON('/users/'+username),
  searchCount('is:pr author:'+username),
  searchCount('is:pr is:merged author:'+username),
  searchCount('is:issue author:'+username)
]);
const repos=[];
for(let page=1;;page++) {
  const batch=await getJSON(`/users/${username}/repos?type=owner&per_page=100&page=${page}`);
  if(!Array.isArray(batch))throw new Error('GitHub repository list is invalid.');
  repos.push(...batch.filter(repo=>!repo.private));
  if(batch.length<100)break;
}
const originals=repos.filter(repo=>!repo.fork&&repo.owner.login.toLowerCase()===username.toLowerCase());
const languageBytes={};
let next=0;
await Promise.all(Array.from({length:3},async()=>{
  while(next<originals.length) {
    const repo=originals[next++];
    const languages=await getJSON(`/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}/languages`);
    for(const [language,bytes]of Object.entries(languages))languageBytes[language]=(languageBytes[language]||0)+count(bytes,language);
  }
}));
const now=new Date();
const data={
  username,updatedAt:now.toISOString(),
  updatedLabel:new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'}).format(now),
  prsOpened,prsMerged,issuesOpened,
  starsEarned:originals.reduce((sum,repo)=>sum+count(repo.stargazers_count,'stars'),0),
  publicRepos:count(profile.public_repos,'public repositories'),followers:count(profile.followers,'followers'),
  originalReposAnalyzed:originals.length,languageBytes
};
if(data.prsMerged>data.prsOpened)throw new Error('Merged PRs cannot exceed authored PRs.');
return data;
}

const data=process.argv.includes('--render-only')
  ? JSON.parse(await fs.readFile(path.join(root,'assets','stats','data.json'),'utf8'))
  : await collectStats();
if(data.username!==username)throw new Error('The cached statistics belong to a different username.');
// Write only after every request succeeds; a failed refresh preserves the previous cards.
const output=path.join(root,'assets','stats');
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'github.svg'),statsCard(data));
await fs.writeFile(path.join(output,'languages.svg'),languagesCard(data));
await fs.writeFile(path.join(output,'data.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({username,prsOpened:data.prsOpened,prsMerged:data.prsMerged,starsEarned:data.starsEarned,publicRepos:data.publicRepos,languages:Object.keys(data.languageBytes).length,originalReposAnalyzed:data.originalReposAnalyzed},null,2));
