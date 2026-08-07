(function () {
  "use strict";
  const suits=["S","H","D","C"], ranks=["","","2","3","4","5","6","7","8","9","10","J","Q","K","A"], symbols={S:"♠",H:"♥",D:"♦",C:"♣"};
  const themes=new Set(["colorblind","green","blue","grey","orange","purple","red","sand","midnight","rose"]);
  const els={status:document.getElementById("status"),hands:document.getElementById("hands"),trick:document.getElementById("trick"),scorebar:document.getElementById("scorebar"),finish:document.getElementById("finish-trick"),note:document.getElementById("note")};
  let state;
  function makeDeck(){const cards=[];suits.forEach((suit)=>{for(let rank=2;rank<=14;rank+=1)cards.push({id:suit+rank,rank,suit});});return cards;}
  function shuffle(cards){for(let i=cards.length-1;i>0;i-=1){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
  function text(card){return ranks[card.rank]+symbols[card.suit];} function red(card){return card.suit==="H"||card.suit==="D";}
  function theme(){try{const value=localStorage.getItem("leave-me-alone-games-theme");document.body.dataset.theme=themes.has(value)?value:"colorblind";}catch{document.body.dataset.theme="colorblind";}}
  function newGame(){const deck=shuffle(makeDeck());state={hands:[[],[],[],[]],active:0,trick:[],tricks:[0,0,0,0],complete:false};for(let i=0;i<13;i+=1)for(let player=0;player<4;player+=1)state.hands[player].push(deck.pop());render();}
  function cardButton(card,enabled,onClick){const button=document.createElement("button");button.type="button";button.className="playing-card"+(red(card)?" red":"");button.textContent=text(card);button.disabled=!enabled;if(onClick)button.addEventListener("click",onClick);return button;}
  function play(player,index){if(state.complete||state.trick.length>=4||state.active!==player)return;state.trick.push({player,card:state.hands[player].splice(index,1)[0]});if(state.trick.length<4)state.active=(player+1)%4;render();}
  function finishTrick(){if(state.trick.length!==4)return;const winner=state.trick[0].player;state.tricks[winner]+=1;state.active=winner;state.trick=[];state.complete=state.hands.every((hand)=>hand.length===0);render();}
  function render(){
    els.hands.textContent="";state.hands.forEach((hand,player)=>{const box=document.createElement("div");box.className="player-box";const heading=document.createElement("h3");heading.textContent="Player "+(player+1)+" · "+hand.length+" cards"+(state.active===player&&!state.complete?" · active":"");box.appendChild(heading);const row=document.createElement("div");row.className="card-row";hand.forEach((card,index)=>row.appendChild(cardButton(card,state.active===player&&!state.complete&&state.trick.length<4,()=>play(player,index))));box.appendChild(row);els.hands.appendChild(box);});
    els.trick.textContent="";state.trick.forEach((entry)=>{const item=document.createElement("div");item.className="trick-card";item.innerHTML="<strong>Player "+(entry.player+1)+"</strong>";item.appendChild(cardButton(entry.card,false));els.trick.appendChild(item);});
    els.scorebar.textContent="";state.tricks.forEach((count,player)=>{const item=document.createElement("div");item.innerHTML="<span>Player "+(player+1)+" tricks</span><strong>"+count+"</strong>";els.scorebar.appendChild(item);});
    els.status.textContent=state.complete?"Deal complete.":"Player "+(state.active+1)+" to play.";els.finish.disabled=state.trick.length!==4||state.complete;els.note.textContent=state.complete?"This basic deal is complete. Start a new deal when ready.":"No suit-following restrictions yet; this pass establishes four hands and local trick turns.";
  }
  document.getElementById("new-game").addEventListener("click",newGame);els.finish.addEventListener("click",finishTrick);theme();newGame();
  if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("../../sw.js").catch(()=>{}));
})();
