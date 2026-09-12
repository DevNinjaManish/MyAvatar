import {Avatar} from '../src/avatar/Avatar.js';
import {STATES} from '../src/conversation/state.js';

const requested=new URLSearchParams(location.search).get('state')?.toUpperCase()||STATES.IDLE;
const params=new URLSearchParams(location.search);const requestedProfile=params.get('profile')||'fast';const profiles=requestedProfile==='compare'?['fast','balanced']:[requestedProfile==='balanced'?'balanced':'fast'];const reduced=params.get('reduced')==='1';
const state=Object.values(STATES).includes(requested)?requested:STATES.IDLE;
const labels={IDLE:'Ready',LISTENING:'Listening',THINKING:'Understanding',SPEAKING:'Speaking',WORKING:'Working',PAUSED:'Paused',SLEEPING:'Sleeping',ERROR:'Needs attention',RECOVERY:'Recovering'};
const colors={IDLE:'#8bd8b0',LISTENING:'#73d8ef',THINKING:'#e3b862',SPEAKING:'#ef78a4',WORKING:'#e3b862',PAUSED:'#89969b',SLEEPING:'#65737a',ERROR:'#ff696f',RECOVERY:'#73d8ef'};
const bots=[['nova','Nova','#ef78a4'],['sterling','Sterling','#75d8ff'],['rivet','Rivit','#ff9d4d'],['luma','Luma','#73d8ff']];
document.body.dataset.state=state.toLowerCase();document.querySelector('#title').textContent=labels[state];document.querySelector('#summary').textContent=`${profiles.length===2?'Fast + Balanced':' '+profiles[0]} · ${reduced?'reduced motion':'full motion'} · transparent stage`;document.querySelector('#qa-contract').innerHTML=`<span><b>Surface</b> No stage fill, border, crop, or shadow</span><span><b>Signal</b> ${labels[state]} · ${reduced?'reduced motion':'full motion'}</span><span><b>Profiles</b> ${profiles.map(profile=>profile==='fast'?'Fast 30 FPS':'Balanced 45 FPS').join(' / ')}</span>`;const root=document.querySelector('#grid');
for(const profile of profiles){
  const section=document.createElement('section');section.className='profile-row';section.dataset.profile=profile;section.innerHTML=`<header><strong>${profile==='fast'?'Fast':'Balanced'}</strong><small>${profile==='fast'?'Responsive, lightweight motion':'Smoother motion and deeper state light'}</small></header>`;const grid=document.createElement('div');grid.className='grid';
  for(const [id,name,accent] of bots){
    const fixture=document.createElement('article');fixture.className='fixture';fixture.style.setProperty('--accent',accent);fixture.style.setProperty('--state',colors[state]);fixture.dataset.bot=id;
    const stage=document.createElement('div');stage.className='stage';stage.setAttribute('aria-label',`${name}, ${labels[state]}, transparent stage`);const card=document.createElement('div');card.className='card';card.innerHTML=`<div><b>${name}</b><span>${labels[state]} · transparent</span></div><i aria-hidden="true"></i>`;fixture.append(stage,card);grid.append(fixture);
    const avatar=new Avatar(stage);avatar.showRobot(id);avatar.configure({maxFps:profile==='balanced'?45:30,effectFps:profile==='balanced'?24:16,profile,reducedMotion:reduced});avatar.setState(state);if(state==='SPEAKING')avatar.setMouth(.72);
  }
  section.append(grid);root.append(section);
}
