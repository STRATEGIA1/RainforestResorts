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
 d.innerHTML='<button type="button" id="close-review" class="secondary" style="float:right" aria-label="Close">×</button><h3 id="review-title">Review</h3><p class="review-mode">Comments are shared with the reviewing team. Names are self-declared. Copy approval covers this version only; photography and publication checks remain pending.</p><p id="review-version" class="meta"></p><div id="review-history" aria-live="polite"></div><form id="review-form"><label for="reviewer">Reviewer name / Nombre</label><input id="reviewer" autocomplete="name" minlength="2" maxlength="100" required><label for="review-action">Decision / Decisión</label><select id="review-action"><option value="comment">Comment / Comentar</option><option value="request_changes">Request changes / Solicitar cambios</option><option value="approve_copy">Approve copy / Aprobar texto</option></select><label for="review-comment">Comment / Comentario</label><textarea id="review-comment" maxlength="4000"></textarea><label id="approval-check" hidden><input id="confirm-copy" type="checkbox" style="display:inline;width:auto"> I approve the text in this version only. / Apruebo solo el texto de esta versión.</label><button id="save-review" type="submit">Save review / Guardar revisión</button></form><p id="review-message" role="status"></p>';
 document.body.appendChild(d);
 const $=id=>document.getElementById(id);let item,requestId,busy=false,loadSequence=0;
 const message=s=>$('review-message').textContent=s;
 const authHeaders=()=>({'Authorization':'Bearer '+token,'Content-Type':'application/json'});
 const labels={comment:'Comment / Comentario',request_changes:'Changes requested / Cambios solicitados',approve_copy:'Copy approved / Texto aprobado'};
 async function load(){const seq=++loadSequence;const target=item;$('review-history').textContent='Loading comments…';
 try{const r=await fetch(config.api+'?item='+encodeURIComponent(target),{headers:authHeaders(),cache:'no-store'});const data=await r.json();if(seq!==loadSequence)return;if(!r.ok)throw Error(data.error||'Could not load reviews.');
 $('review-history').replaceChildren();if(!data.reviews.length)$('review-history').textContent='No reviews yet / Sin revisiones aún.';
 for(const e of data.reviews){const p=document.createElement('div');p.style.cssText='border-bottom:1px solid #ddd;padding:12px 0;white-space:pre-wrap;overflow-wrap:anywhere';
 const head=document.createElement('strong');head.textContent=e.reviewer+' · '+(labels[e.action]||e.action);p.appendChild(head);
 const meta=document.createElement('p');meta.className='meta';meta.textContent=new Date(e.created_at).toLocaleString()+' · '+e.version+(e.version===config.version?'':' · Previous version / Versión anterior');p.appendChild(meta);
 const txt=document.createElement('p');txt.textContent=e.comment;p.appendChild(txt);$('review-history').appendChild(p);}
 if(data.version!==config.version)message('A newer version is available. Reload before saving.');
 }catch(e){if(seq===loadSequence)$('review-history').textContent=e.message;}}
 function updateAction(){const approving=$('review-action').value==='approve_copy';$('approval-check').hidden=!approving;$('confirm-copy').required=approving;$('review-comment').required=!approving;requestId=null;}
 $('review-action').addEventListener('change',updateAction);
 $('close-review').onclick=()=>{if(!busy)d.close();};d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 document.querySelectorAll('[data-review],[data-approve]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();item=b.dataset.review||b.dataset.approve;requestId=null;$('review-title').textContent='Review / Revisión · '+item;$('review-version').textContent='Version '+config?.version;$('review-comment').value='';$('confirm-copy').checked=false;$('review-action').value=b.dataset.approve?'approve_copy':'comment';updateAction();message('');d.showModal();
 const ready=!!(config?.api&&token);$('save-review').disabled=!ready;if(!ready){$('review-history').textContent='';message('Open the review link provided by STRATEGIA to save feedback. / Abre el enlace de revisión de STRATEGIA para guardar comentarios.');}else load();}));
 $('review-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!token)return;if(!$('review-form').reportValidity())return;
 busy=true;$('save-review').disabled=true;$('close-review').disabled=true;message('Saving… / Guardando…');requestId ||= crypto.randomUUID();
 try{const response=await fetch(config.api,{method:'POST',headers:authHeaders(),body:JSON.stringify({id:requestId,item,version:config.version,reviewer:$('reviewer').value,action:$('review-action').value,comment:$('review-comment').value})});const result=await response.json();if(!response.ok||!result.saved)throw Error(result.error||'Save failed. Please retry.');
 message('Saved online / Guardado online.');requestId=null;$('review-comment').value='';$('confirm-copy').checked=false;await load();
 }catch(error){message(error.message+' No confirmation received / Sin confirmación de guardado.');}finally{busy=false;$('save-review').disabled=false;$('close-review').disabled=false;}});
});
