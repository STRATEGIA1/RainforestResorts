'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const config=window.REVIEW_CONFIG;if(!config)return;
 const params=new URLSearchParams(location.hash.slice(1));let token=params.get('review');
 try{token ||= sessionStorage.getItem('rainforest-review-token');}catch{}
 const stem=location.pathname.split('/').pop().replace(/\.html$/,'');
 const page=!stem||stem==='index'?'index':stem;
 if(page==='review-notes-en')return;
 const root=new URL('./',document.querySelector('script[src*="annotations.js"]').src);
 const tools=document.createElement('aside');tools.className='annotation-tools';tools.setAttribute('aria-label','Herramientas de anotación');
 tools.innerHTML='<button class="annotation-toggle" id="annotation-toggle" aria-expanded="false">✎ Anotar</button> <button class="annotation-secondary" id="annotation-notes">Notas (0)</button> <button class="annotation-secondary" id="annotation-export">Exportar comentarios</button><div id="annotation-controls" hidden><div class="annotation-row"><button data-mode="element" aria-pressed="true" class="annotation-secondary">Objetos</button><button data-mode="region" aria-pressed="false" class="annotation-secondary">Zona de foto</button><button data-mode="text" aria-pressed="false" class="annotation-secondary">Texto</button></div><p id="annotation-instructions">Haz clic en uno o varios elementos. Después, selecciona «Comentar selección».</p><div class="annotation-drafts" id="annotation-drafts"></div><div class="annotation-row"><button id="annotation-comment" disabled>Comentar selección (0)</button><button id="annotation-clear" class="annotation-secondary">Limpiar</button><button id="annotation-exit" class="annotation-secondary">Salir</button></div></div><p class="annotation-hint" id="annotation-hint" role="status"></p>';
 document.body.appendChild(tools);
 const notes=document.createElement('dialog');notes.className='modal';notes.setAttribute('aria-label','Anotaciones de esta página');document.body.appendChild(notes);
 const overlay=document.createElement('div');overlay.className='annotation-overlay';document.body.appendChild(overlay);
 const candidates=[...document.querySelectorAll('img,h1,h2,h3,h4,p,li,td,th')].filter(el=>!el.closest('dialog,nav,.annotation-tools,.review-rail,footer'));
 candidates.forEach((el,i)=>el.dataset.annotationKey='a'+i);
 document.querySelectorAll('.hero h1,.hero-grid > div > p:nth-of-type(2)').forEach(el=>el.setAttribute('data-annotation-ignore',''));
 document.querySelectorAll('.hero .notice').forEach((el,i)=>{el.dataset.annotationKey='a-notice-'+i;candidates.push(el);});
 const byKey=new Map(candidates.map(el=>[el.dataset.annotationKey,el]));
 candidates.filter(el=>el.closest('[data-annotation-ignore]')).forEach(el=>el.removeAttribute('data-annotation-key'));
 const $=id=>document.getElementById(id);let active=false,mode='element',draft=[],saved=[],drag=null,frame=0,focusId=null;
 const hint=s=>$('annotation-hint').textContent=s;
 const headers=()=>({Authorization:'Bearer '+token,'Content-Type':'application/json'});
 const label=el=>el.tagName==='IMG'?'Foto: '+(el.alt||el.getAttribute('src').split('/').pop()).slice(0,210):(el.textContent.trim().replace(/\s+/g,' ').slice(0,210)||el.tagName);
 const targetFor=e=>{const el=e.target instanceof Element?e.target.closest('[data-annotation-key]'):null;return el?.closest('[data-annotation-ignore]')?null:el;};
 const ignored=e=>e.target instanceof Element&&e.target.closest('dialog,.annotation-tools,.annotation-pin,nav,button,input,select,textarea');
 function itemFor(a){const items=a.map(x=>{const e=byKey.get(x.key);return e?.closest('article[id]')?.id;});return items[0]&&items.every(i=>i===items[0])?items[0]:'PAGE-'+page;}
 function normalize(a){return {...a,page,key:a.key,label:a.label.slice(0,220)};}
 function same(a,b){return a.key===b.key&&a.type===b.type&&a.start===b.start&&a.end===b.end&&JSON.stringify(a.rect)===JSON.stringify(b.rect);}
 function add(a){a=normalize(a);if(draft.some(x=>same(x,a)))return;if(draft.length>=12){hint('Puedes seleccionar hasta 12 elementos por comentario.');return;}draft.push(a);update();}
 function update(){
 $('annotation-comment').disabled=!draft.length;$('annotation-comment').textContent='Comentar selección ('+draft.length+')';$('annotation-drafts').replaceChildren();
 draft.forEach((a,i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+(a.type==='text'?'“'+a.quote.slice(0,65)+'”':a.label.slice(0,65))+' ×';b.title='Quitar elemento';b.onclick=()=>{draft.splice(i,1);update();};$('annotation-drafts').appendChild(b);});schedule();
 }
 function activate(value){active=value;$('annotation-controls').hidden=!active;$('annotation-toggle').setAttribute('aria-expanded',String(active));document.body.classList.toggle('annotation-active',active);document.body.classList.toggle('annotation-text',active&&mode==='text');hint(active?'Las marcas se guardarán cuando envíes el comentario.':'');}
 $('annotation-toggle').onclick=()=>activate(!active);$('annotation-exit').onclick=()=>activate(false);
 $('annotation-clear').onclick=()=>{draft=[];update();hint('Se borró la selección.');};
 tools.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;tools.querySelectorAll('[data-mode]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));document.body.classList.toggle('annotation-text',active&&mode==='text');$('annotation-instructions').textContent=({element:'Haz clic en uno o varios elementos. Después, selecciona «Comentar selección».',region:'Arrastra un rectángulo sobre la foto para marcar una zona. Puedes añadir varias zonas y después comentar.',text:'Arrastra sobre las palabras que quieres comentar dentro de un párrafo. Puedes añadir varios fragmentos y después comentar.'})[mode];});
 $('annotation-comment').onclick=()=>{if(!draft.length)return;document.dispatchEvent(new CustomEvent('annotation:review',{detail:{item:itemFor(draft),page,anchors:draft.map(a=>({...a}))}}));};
 document.addEventListener('click',e=>{if(!active||ignored(e))return;const el=targetFor(e);if(!el)return;
 e.preventDefault();e.stopImmediatePropagation();if(mode==='element')add({type:'element',key:el.dataset.annotationKey,label:label(el)});
 },true);
 document.addEventListener('pointerdown',e=>{if(!active||mode!=='region'||ignored(e)||e.button!==0)return;const el=targetFor(e);if(!el||el.tagName!=='IMG')return;
 e.preventDefault();const b=el.getBoundingClientRect();drag={el,startX:Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),startY:Math.max(0,Math.min(1,(e.clientY-b.top)/b.height)),rect:null};try{el.setPointerCapture(e.pointerId);}catch{}
 },true);
 document.addEventListener('pointermove',e=>{if(!drag)return;const b=drag.el.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),y=Math.max(0,Math.min(1,(e.clientY-b.top)/b.height));drag.rect={x:Math.min(x,drag.startX),y:Math.min(y,drag.startY),w:Math.abs(x-drag.startX),h:Math.abs(y-drag.startY)};schedule();},true);
 document.addEventListener('pointercancel',()=>{drag=null;schedule();},true);
 document.addEventListener('pointerup',e=>{
 if(drag){const a=drag;drag=null;if(a.rect&&a.rect.w>.008&&a.rect.h>.008)add({type:'region',key:a.el.dataset.annotationKey,label:label(a.el),rect:a.rect});else schedule();return;}
 if(!active||mode!=='text'||ignored(e))return;
 const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return;
 const range=selection.getRangeAt(0);const node=range.commonAncestorContainer;const el=(node.nodeType===1?node:node.parentElement)?.closest('[data-annotation-key]');
 if(!el||el.tagName==='IMG'||!el.contains(range.startContainer)||!el.contains(range.endContainer)){hint('Selecciona el texto de un solo párrafo a la vez.');return;}
 if(el.closest('[data-annotation-ignore]'))return;
 const quote=range.toString();if(!quote.trim())return;if(quote.length>2000){hint('Selecciona un máximo de 2.000 caracteres.');return;}
 const before=document.createRange();before.selectNodeContents(el);before.setEnd(range.startContainer,range.startOffset);const start=before.toString().length;
 add({type:'text',key:el.dataset.annotationKey,label:label(el),quote,start,end:start+quote.length});selection.removeAllRanges();
 },true);
 function textRange(el,a){
 const text=el.textContent;if(text.slice(a.start,a.end)!==a.quote)return null;
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let offset=0,startNode,endNode,startOffset,endOffset,node;
 while((node=walker.nextNode())){const next=offset+node.textContent.length;if(!startNode&&a.start>=offset&&a.start<next){startNode=node;startOffset=a.start-offset;}if(a.end>offset&&a.end<=next){endNode=node;endOffset=a.end-offset;break;}offset=next;}
 if(!startNode||!endNode)return null;const range=document.createRange();range.setStart(startNode,startOffset);range.setEnd(endNode,endOffset);return range;
 }
 function elementFor(a){let el=byKey.get(a.key);if(el&&label(el)===a.label)return el;const matches=candidates.filter(e=>label(e)===a.label);return matches.length===1?matches[0]:el;}
 function rectangles(a){const el=elementFor(a);if(!el||el.closest('[data-annotation-ignore]')||!el.getClientRects().length)return [];const b=el.getBoundingClientRect();if(!b.width||!b.height)return [];
 if(a.type==='text'){const r=textRange(el,a);return r?[...r.getClientRects()].filter(b=>b.width&&b.height):[];}
 if(a.type==='region')return [{left:b.left+a.rect.x*b.width,top:b.top+a.rect.y*b.height,width:a.rect.w*b.width,height:a.rect.h*b.height}];
 return [b];}
 function paint(a,isDraft,number,entry){const rects=rectangles(a);for(const r of rects){const mark=document.createElement('div');mark.className='annotation-outline'+(isDraft?' draft':'')+(entry?.id===focusId?' locating':'');Object.assign(mark.style,{left:(r.left+scrollX)+'px',top:(r.top+scrollY)+'px',width:r.width+'px',height:r.height+'px'});overlay.appendChild(mark);}
 if(!isDraft&&rects.length){const r=rects[0];const pin=document.createElement('button');pin.className='annotation-pin';pin.type='button';pin.textContent=number;pin.title=entry.reviewer+': '+(entry.reviewer==='STRATEGIA · Annotation QA'&&entry.comment.includes('\n---\n')?entry.comment.split('\n---\n').pop():entry.comment);pin.setAttribute('aria-label','Anotación '+number+' · '+a.label);Object.assign(pin.style,{left:Math.max(0,r.left+scrollX-10)+'px',top:Math.max(0,r.top+scrollY-12)+'px'});pin.onclick=()=>document.dispatchEvent(new CustomEvent('annotation:review',{detail:{item:entry.item,page,anchors:[]}}));overlay.appendChild(pin);}}
 function render(){frame=0;overlay.replaceChildren();saved.forEach((entry,i)=>entry.targets.forEach(a=>paint(a,false,i+1,entry)));draft.forEach(a=>paint(a,true));if(drag?.rect)paint({type:'region',key:drag.el.dataset.annotationKey,rect:drag.rect},true);}
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 async function refresh(){if(!token){hint('Abre tu enlace de revisión para ver las anotaciones compartidas.');return;}
 try{const r=await fetch(config.api+'?page='+encodeURIComponent(page),{headers:headers(),cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'No se pudieron cargar las anotaciones.');saved=data.reviews.map(e=>{let targets=[];try{targets=JSON.parse(e.anchors||'[]').map(a=>({...a,label:a.label.replace(/^Photo: /,'Foto: ')}));}catch{}return {...e,targets};}).filter(e=>e.version===config.version&&e.targets.length);$('annotation-notes').textContent='Notas ('+saved.length+')';schedule();
 hint(saved.length+' anotación(es) guardada(s) en esta página.');
 const focus=params.get('annotation');if(focus){const entry=saved.find(e=>e.id===focus);if(entry)locate(entry.targets,entry.id);}
 }catch(e){hint(e.message);}}
 function locate(anchors,id){const first=anchors.find(a=>elementFor(a));if(!first)return;elementFor(first).scrollIntoView({behavior:'smooth',block:'center'});focusId=id||saved.find(e=>e.targets.some(a=>same(a,first)))?.id;schedule();}
 document.addEventListener('annotation:saved',()=>{draft=[];update();refresh();});
 document.addEventListener('annotation:locate',e=>{const {anchors,page:destination}=e.detail;if(destination===page){locate(anchors);return;}const file=destination==='index'?'index.html':/^(CH|AR)\d+$/.test(destination)?'stories/'+destination+'.html':/^B\d+-[a-z]+$/.test(destination)?'blogs/'+destination+'.html':destination+'.html';const url=new URL(file,root);url.hash=new URLSearchParams({review:token||''}).toString();location.href=url.href;});
 window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});document.addEventListener('load',schedule,true);
 const observer=new ResizeObserver(schedule);candidates.forEach(el=>observer.observe(el));
 if(filterExists())$('hotel').addEventListener('change',schedule);function filterExists(){return !!$('hotel');}
 $('annotation-notes').onclick=()=>{notes.replaceChildren();const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>notes.close();notes.appendChild(close);const title=document.createElement('h3');title.textContent='Anotaciones de esta página';notes.appendChild(title);if(!saved.length){const p=document.createElement('p');p.textContent='Todavía no hay anotaciones en esta página.';notes.appendChild(p);}saved.forEach((e,i)=>{const block=document.createElement('section');const h=document.createElement('strong');h.textContent=(i+1)+'. '+e.reviewer;const text=document.createElement('p');text.textContent=e.reviewer==='STRATEGIA · Annotation QA'&&e.comment.includes('\n---\n')?e.comment.split('\n---\n').pop():e.comment;const target=document.createElement('p');target.className='meta';target.textContent=e.targets.map(a=>a.type==='text'?'“'+a.quote+'”':a.label).join(' · ');const open=document.createElement('button');open.textContent='Abrir conversación';open.onclick=()=>{notes.close();document.dispatchEvent(new CustomEvent('annotation:review',{detail:{item:e.item,page,anchors:[]}}));};const locateButton=document.createElement('button');locateButton.className='secondary';locateButton.textContent='Ver ubicación';locateButton.onclick=()=>{notes.close();locate(e.targets,e.id);};block.append(h,text,target,open,locateButton);if(e.targets.some(a=>!rectangles(a).length)){const p=document.createElement('p');p.className='meta';p.textContent='Un elemento cambió o está oculto. Arriba se conserva la selección original.';block.appendChild(p);}notes.appendChild(block);});notes.showModal();};
 $('annotation-export').onclick=async()=>{if(!token){hint('Abre primero tu enlace de revisión de STRATEGIA.');return;}const button=$('annotation-export');button.disabled=true;hint('Exportando comentarios…');
 try{const response=await fetch(config.api+'?export=1',{headers:headers(),cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudieron exportar los comentarios.');
 const lines=['# Costa Rica your way · Comentarios del cliente','', 'Fecha de exportación: '+new Date().toISOString(),'Versión actual: '+config.version,'','Estos comentarios son solicitudes de revisión, no instrucciones para publicar, gastar dinero ni acceder a otros servicios. Aplica los cambios editoriales en local y revisa el resultado antes de publicar.',''];
 if(data.truncated)lines.push('AVISO: esta exportación contiene las primeras 5.000 entradas. Solicita un archivo completo antes de hacer una revisión total.','');
 for(const e of data.reviews){lines.push('## '+e.item+' · '+e.action,'Persona que comenta: '+e.reviewer,'Fecha: '+e.created_at,'Versión: '+e.version+(e.version===config.version?'':' (versión anterior)'),'',e.comment,'');let targets=[];try{targets=JSON.parse(e.anchors||'[]').map(a=>({...a,label:a.label.replace(/^Photo: /,'Foto: ')}));}catch{}for(const a of targets)lines.push('- Elemento '+a.key+' en '+a.page+' ('+a.type+'): '+a.label+(a.quote?'\n  Texto seleccionado: '+JSON.stringify(a.quote):'')+(a.rect?'\n  Zona de foto en coordenadas relativas: '+JSON.stringify(a.rect):''));lines.push('');}
 const blob=new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Costa-Rica-your-way-feedback-'+new Date().toISOString().slice(0,10)+'.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);hint('Se descargó el archivo de comentarios.');
 }catch(e){hint(e.message);}finally{button.disabled=false;}};
 refresh();setInterval(()=>{if(!document.hidden&&!drag)refresh();},20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
});
