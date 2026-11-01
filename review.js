'use strict';
document.addEventListener('DOMContentLoaded', () => {
 const config=window.REVIEW_CONFIG;
 const filter=document.getElementById('hotel');
 if(filter)filter.addEventListener('change',()=>document.querySelectorAll('.post').forEach(p=>p.classList.toggle('hidden',filter.value!=='all'&&p.dataset.hotel!==filter.value)));
 const params=new URLSearchParams(location.hash.slice(1));
 let token=params.get('review');
 try {if(token)sessionStorage.setItem('rainforest-review-token',token);else token=sessionStorage.getItem('rainforest-review-token');}catch{}
 // Keep the capability in the fragment (never query parameters or HTTP referrers).
 document.querySelectorAll('a[href]').forEach(a=>{try{const u=new URL(a.href);if(token&&u.origin===location.origin&&u.pathname.endsWith('.html')&&!u.hash){u.hash=new URLSearchParams({review:token}).toString();a.href=u.href;}}catch{}});
 const d=document.createElement('dialog');d.className='modal';d.id='review-dialog';
 d.innerHTML='<button type="button" id="close-review" class="secondary" style="float:right" aria-label="Cerrar">×</button><h3 id="review-title">Review</h3><p class="review-mode">Los comentarios se comparten con el equipo de revisión. Cada persona escribe su nombre. La aprobación cubre solo el texto de esta versión; las fotografías y las verificaciones de publicación se revisan por separado.</p><p id="review-version" class="meta"></p><div id="review-targets" class="annotation-summary"></div><div id="review-history" aria-live="polite"></div><form id="review-form"><label for="reviewer">Tu nombre</label><input id="reviewer" autocomplete="name" minlength="2" maxlength="100" required><label for="review-action">Tipo de revisión</label><select id="review-action"><option value="comment">Comentar</option><option value="request_changes">Solicitar cambios</option><option value="approve_copy">Aprobar texto</option></select><label for="review-comment">Comentario</label><textarea id="review-comment" maxlength="4000"></textarea><label id="approval-check" hidden><input id="confirm-copy" type="checkbox" style="display:inline;width:auto"> Apruebo únicamente el texto de esta versión.</label><button id="save-review" type="submit">Guardar comentario</button></form><p id="review-message" role="status"></p>';
 document.body.appendChild(d);
 const $=id=>document.getElementById(id);let item,requestId,busy=false,loadSequence=0,selectedAnchors=[],selectedPage=null;
 const message=s=>$('review-message').textContent=s;
 const authHeaders=()=>({'Authorization':'Bearer '+token,'Content-Type':'application/json'});
 const labels={comment:'Comentario',request_changes:'Cambios solicitados',approve_copy:'Texto aprobado'};
 async function load(){const seq=++loadSequence;const target=item;$('review-history').textContent='Cargando comentarios…';
 try{const r=await fetch(config.api+'?item='+encodeURIComponent(target),{headers:authHeaders(),cache:'no-store'});const data=await r.json();if(seq!==loadSequence)return;if(!r.ok)throw Error(data.error||'No se pudieron cargar los comentarios.');
 $('review-history').replaceChildren();if(!data.reviews.length)$('review-history').textContent='Todavía no hay comentarios.';
 for(const e of data.reviews){const p=document.createElement('div');p.style.cssText='border-bottom:1px solid #ddd;padding:12px 0;white-space:pre-wrap;overflow-wrap:anywhere';
 const head=document.createElement('strong');head.textContent=e.reviewer+' · '+(labels[e.action]||e.action);p.appendChild(head);
 const meta=document.createElement('p');meta.className='meta';meta.textContent=new Date(e.created_at).toLocaleString()+' · '+e.version+(e.version===config.version?'':' · Versión anterior');p.appendChild(meta);
 const txt=document.createElement('p');txt.textContent=e.reviewer==='STRATEGIA · Annotation QA'&&e.comment.includes('\n---\n')?e.comment.split('\n---\n').pop():e.comment;p.appendChild(txt);
 let anchors=[];try{anchors=JSON.parse(e.anchors||'[]').map(a=>({...a,label:a.label.replace(/^Photo: /,'Foto: ')}));}catch{}
 if(anchors.length){const context=document.createElement('p');context.className='meta';context.textContent=anchors.map(a=>a.type==='text'?'“'+a.quote+'”':a.label).join(' · ');p.appendChild(context);
 if(e.version===config.version){const locate=document.createElement('button');locate.type='button';locate.className='review-button';locate.textContent='Ver selección';locate.onclick=()=>{d.close();document.dispatchEvent(new CustomEvent('annotation:locate',{detail:{anchors,page:e.page}}));};p.appendChild(locate);}}
 $('review-history').appendChild(p);}
 if(data.version!==config.version)message('Hay una versión nueva. Actualiza la página antes de guardar.');
 }catch(e){if(seq===loadSequence)$('review-history').textContent=e.message;}}
 function updateAction(){const approving=$('review-action').value==='approve_copy';$('approval-check').hidden=!approving;$('confirm-copy').required=approving;$('review-comment').required=!approving;requestId=null;}
 $('review-action').addEventListener('change',updateAction);
 $('close-review').onclick=()=>{if(!busy)d.close();};d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 function openReview(id,approving=false,anchors=[],page=null){
 item=id;selectedAnchors=anchors;selectedPage=page;requestId=null;$('review-title').textContent='Revisión · '+item;$('review-version').textContent='Versión '+config?.version;$('review-comment').value='';$('confirm-copy').checked=false;$('review-action').value=approving?'approve_copy':'comment';updateAction();message('');
 $('review-targets').replaceChildren();if(anchors.length){const t=document.createElement('p');t.textContent=anchors.length+' elemento(s) seleccionado(s): '+anchors.map(a=>a.type==='text'?'“'+a.quote+'”':a.label).join(' · ');$('review-targets').appendChild(t);}
 if(!d.open)d.showModal();const ready=!!(config?.api&&token);$('save-review').disabled=!ready;if(!ready){$('review-history').textContent='';message('Abre el enlace de revisión de STRATEGIA para guardar comentarios.');}else load();}
 document.querySelectorAll('[data-review],[data-approve]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openReview(b.dataset.review||b.dataset.approve,!!b.dataset.approve);}));
 document.addEventListener('annotation:review',e=>openReview(e.detail.item,false,e.detail.anchors,e.detail.page));
 $('review-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!token)return;if(!$('review-form').reportValidity())return;
 busy=true;$('save-review').disabled=true;$('close-review').disabled=true;message('Guardando…');requestId ||= crypto.randomUUID();
 try{const response=await fetch(config.api,{method:'POST',headers:authHeaders(),body:JSON.stringify({id:requestId,item,version:config.version,reviewer:$('reviewer').value,action:$('review-action').value,comment:$('review-comment').value,anchors:selectedAnchors,page:selectedPage})});const result=await response.json();if(!response.ok||!result.saved)throw Error(result.error||'No se pudo guardar. Inténtalo de nuevo.');
 message('Comentario guardado y compartido.');document.dispatchEvent(new CustomEvent('annotation:saved'));selectedAnchors=[];selectedPage=null;$('review-targets').replaceChildren();requestId=null;$('review-comment').value='';$('confirm-copy').checked=false;await load();
 }catch(error){message(error.message+' No se recibió confirmación de guardado.');}finally{busy=false;$('save-review').disabled=false;$('close-review').disabled=false;}});
});
