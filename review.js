'use strict';
document.addEventListener('DOMContentLoaded', () => {
 const config=window.REVIEW_CONFIG;
 const filter=document.getElementById('hotel');
 if(filter)filter.addEventListener('change',()=>{
  document.querySelectorAll('#social .post').forEach(p=>p.classList.toggle('hidden',filter.value!=='all'&&p.dataset.hotel!==filter.value));
  document.querySelectorAll('#social .social-month').forEach(month=>{const count=month.querySelectorAll('.post:not(.hidden)').length;month.querySelector('.month-post-count').textContent=count+' posts · '+(filter.value==='all'?'Both hotels':filter.value);});
 });
 const params=new URLSearchParams(location.hash.slice(1));
 let token=params.get('review');
 try {if(token)sessionStorage.setItem('rainforest-review-token',token);else token=sessionStorage.getItem('rainforest-review-token');}catch{}
 // Keep the capability in the fragment (never query parameters or HTTP referrers).
 document.querySelectorAll('a[href]').forEach(a=>{try{const u=new URL(a.href);if(token&&u.origin===location.origin&&u.pathname.endsWith('.html')&&!u.hash){u.hash=new URLSearchParams({review:token}).toString();a.href=u.href;}}catch{}});
 const d=document.createElement('dialog');d.className='modal';d.id='review-dialog';
 d.innerHTML='<button type="button" id="close-review" class="secondary" style="float:right" aria-label="Close">×</button><h3 id="review-title">Review</h3><p class="review-mode">Comments are shared with the review team. Enter your name. Approval covers only the copy in this version; photographs and publication checks are reviewed separately.</p><p id="review-version" class="meta"></p><div id="review-targets" class="annotation-summary"></div><div id="review-history" aria-live="polite"></div><form id="review-form"><label for="reviewer">Your name</label><input id="reviewer" autocomplete="name" minlength="2" maxlength="100" required><label for="review-action">Review type</label><select id="review-action"><option value="comment">Comment</option><option value="request_changes">Request changes</option><option value="approve_copy">Approve copy</option></select><label for="review-comment">Comment</label><textarea id="review-comment" maxlength="4000"></textarea><label id="approval-check" hidden><input id="confirm-copy" type="checkbox" style="display:inline;width:auto"> I approve only the copy in this version.</label><button id="save-review" type="submit">Save comment</button></form><p id="review-message" role="status"></p>';
 document.body.appendChild(d);
 const $=id=>document.getElementById(id);let item,requestId,busy=false,loadSequence=0,selectedAnchors=[],selectedPage=null;
 const message=s=>$('review-message').textContent=s;
 const authHeaders=()=>({'Authorization':'Bearer '+token,'Content-Type':'application/json'});
 const labels={comment:'Comment',request_changes:'Changes requested',approve_copy:'Copy approved'};
 async function load(){const seq=++loadSequence;const target=item;$('review-history').textContent='Loading comments…';
 try{const r=await fetch(config.api+'?item='+encodeURIComponent(target),{headers:authHeaders(),cache:'no-store'});const data=await r.json();if(seq!==loadSequence)return;if(!r.ok)throw Error(data.error||'Could not load comments.');
 $('review-history').replaceChildren();if(!data.reviews.length)$('review-history').textContent='No comments yet.';
 for(const e of data.reviews){const p=document.createElement('div');p.style.cssText='border-bottom:1px solid #ddd;padding:12px 0;white-space:pre-wrap;overflow-wrap:anywhere';
 const head=document.createElement('strong');head.textContent=e.reviewer+' · '+(labels[e.action]||e.action);p.appendChild(head);
 const meta=document.createElement('p');meta.className='meta';meta.textContent=new Date(e.created_at).toLocaleString()+' · '+e.version+(e.version===config.version?'':' · Previous version');p.appendChild(meta);
 const txt=document.createElement('p');txt.textContent=e.reviewer==='STRATEGIA · Annotation QA'&&e.comment.includes('\n---\n')?e.comment.split('\n---\n').pop():e.comment;p.appendChild(txt);
 let anchors=[];try{anchors=JSON.parse(e.anchors||'[]').map(a=>({...a,label:a.label.replace(/^Foto: /,'Photo: ')}));}catch{}
 if(anchors.length){const context=document.createElement('p');context.className='meta';context.textContent=anchors.map(a=>a.type==='text'?'“'+a.quote+'”':a.label).join(' · ');p.appendChild(context);
 if(e.version===config.version){const locate=document.createElement('button');locate.type='button';locate.className='review-button';locate.textContent='View selection';locate.onclick=()=>{d.close();document.dispatchEvent(new CustomEvent('annotation:locate',{detail:{anchors,page:e.page}}));};p.appendChild(locate);}}
 $('review-history').appendChild(p);}
 if(data.version!==config.version)message('A newer version is available. Refresh before saving.');
 }catch(e){if(seq===loadSequence)$('review-history').textContent=e.message;}}
 function updateAction(){const approving=$('review-action').value==='approve_copy';$('approval-check').hidden=!approving;$('confirm-copy').required=approving;$('review-comment').required=!approving;requestId=null;}
 $('review-action').addEventListener('change',updateAction);
 $('close-review').onclick=()=>{if(!busy)d.close();};d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 function openReview(id,approving=false,anchors=[],page=null){
 item=id;selectedAnchors=anchors;selectedPage=page;requestId=null;$('review-title').textContent='Review · '+(config.itemLabels?.[item]||item);$('review-version').textContent='Version '+config?.version;$('review-comment').value='';$('confirm-copy').checked=false;$('review-action').value=approving?'approve_copy':'comment';updateAction();message('');
 $('review-targets').replaceChildren();if(anchors.length){const t=document.createElement('p');t.textContent=anchors.length+' selected item(s): '+anchors.map(a=>a.type==='text'?'“'+a.quote+'”':a.label).join(' · ');$('review-targets').appendChild(t);}
 if(!d.open)d.showModal();const ready=!!(config?.api&&token);$('save-review').disabled=!ready;if(!ready){$('review-history').textContent='';message('Open your STRATEGIA review link to save comments.');}else load();}
 document.querySelectorAll('[data-review],[data-approve]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openReview(b.dataset.review||b.dataset.approve,!!b.dataset.approve);}));
 document.addEventListener('annotation:review',e=>openReview(e.detail.item,false,e.detail.anchors,e.detail.page));
 $('review-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!token)return;if(!$('review-form').reportValidity())return;
 busy=true;$('save-review').disabled=true;$('close-review').disabled=true;message('Saving…');requestId ||= crypto.randomUUID();
 try{const response=await fetch(config.api,{method:'POST',headers:authHeaders(),body:JSON.stringify({id:requestId,item,version:config.version,reviewer:$('reviewer').value,action:$('review-action').value,comment:$('review-comment').value,anchors:selectedAnchors,page:selectedPage})});const result=await response.json();if(!response.ok||!result.saved)throw Error(result.error||'Could not save. Please try again.');
 message('Comment saved and shared.');document.dispatchEvent(new CustomEvent('annotation:saved'));selectedAnchors=[];selectedPage=null;$('review-targets').replaceChildren();requestId=null;$('review-comment').value='';$('confirm-copy').checked=false;await load();
 }catch(error){message(error.message+' No save confirmation was received.');}finally{busy=false;$('save-review').disabled=false;$('close-review').disabled=false;}});
});
