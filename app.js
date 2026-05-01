// ──────────────── DATABASE ────────────────
let DB = JSON.parse(localStorage.getItem('akh_v9') || JSON.stringify({
    farms:[],hangars:[],batches:[],weights:[],feed:[],deaths:[],sales:[],
    expenses:[],feedStore:[],staff:[],tempLogs:[],photos:[],equipment:[],
    marketPrices:[],clients:[],clientSales:[],agenda:[]
}));
['feedStore','staff','tempLogs','photos','equipment','marketPrices','clients','clientSales','agenda'].forEach(k=>{if(!DB[k])DB[k]=[]});
const KPB=50;
let cFarm=null,cHangar=null,cDTab='w',cTTab='log',cRefTab='disease',cMoreTab='photos',cReg='30.06,31.25';
let wxRegCache={},_aHF=null,_aBH=null,_aSF=null;

function save(){try{localStorage.setItem('akh_v9',JSON.stringify(DB));}catch(e){toast('تخزين ممتلئ!','err');}}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function todayS(){return new Date().toISOString().split('T')[0];}
function nowT(){return new Date().toTimeString().slice(0,5);}
function fmt(n){return Number(n||0).toLocaleString('ar-EG');}
function fD(d){if(!d)return'';try{return new Date(d+'T12:00:00').toLocaleDateString('ar-EG',{day:'numeric',month:'long'});}catch(e){return d;}}
function dAge(d){const oneDay=86400000;const today=new Date();today.setHours(0,0,0,0);const start=new Date(d+'T00:00:00');return Math.max(0,Math.floor((today-start)/oneDay));}
function fridays(d){let s=new Date(d+'T12:00:00'),n=new Date(),c=0;while(s.getDay()!==5)s.setDate(s.getDate()+1);while(s<=n){c++;s.setDate(s.getDate()+7);}return c;}
function autoPeriod(){const h=new Date().getHours();return h<12?'morning':h<18?'afternoon':'night';}
function periodLabel(p){return p==='morning'?'🌅 صباح':p==='afternoon'?'☀️ نهار':'🌙 ليل';}
function idealRec(a){if(a<=7)return{mn:32,mx:35,hn:55,hx:65};if(a<=14)return{mn:29,mx:32,hn:55,hx:65};if(a<=21)return{mn:26,mx:29,hn:55,hx:70};if(a<=28)return{mn:23,mx:26,hn:55,hx:70};return{mn:20,mx:24,hn:55,hx:75};}

// ──────────────── TOAST / CONFIRM ────────────────
function toast(msg,type=''){const c=document.getElementById('toast-container');const d=document.createElement('div');d.className='toast '+type;d.textContent=msg;c.appendChild(d);setTimeout(()=>d.remove(),3000);}

let confirmCallback=null;
function delWithConfirm(type){
    document.getElementById('confirm-msg').textContent='أنت متأكد من حذف '+type+'؟';
    confirmCallback=()=>{
        if(type==='farm')deleteFarm();
        if(type==='hangar')deleteHangar();
    };
    document.getElementById('confirm-yes').onclick=()=>{confirmCallback();closeModal('confirm');};
    openModal('confirm');
}

// ──────────────── MODALS ────────────────
function openModal(id){document.getElementById('modal-'+id).classList.add('open');}
function closeModal(id){document.getElementById('modal-'+id).classList.remove('open');}
document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));
    document.getElementById('hdrDate').textContent=new Date().toLocaleDateString('ar-EG',{weekday:'long',day:'numeric',month:'long'});
    setupPIN();
});

// ──────────────── PIN ────────────────
const PIN_HASH_KEY='akh_pin_hash';
function hashPin(pin){return btoa(pin).slice(0,10);}
function setupPIN(){
    const stored=localStorage.getItem(PIN_HASH_KEY)||hashPin('0000');
    document.getElementById('pin-screen').style.display='flex';
    document.getElementById('pin-input').value='';
    document.getElementById('pin-msg').style.display='none';
    document.getElementById('pin-input').onkeydown=e=>{if(e.key==='Enter')verifyPin();};
}
function verifyPin(){
    const input=document.getElementById('pin-input').value.trim();
    const stored=localStorage.getItem(PIN_HASH_KEY)||hashPin('0000');
    if(hashPin(input)===stored){
        document.getElementById('pin-screen').style.display='none';
        init();
    }else{
        document.getElementById('pin-msg').style.display='block';
    }
}
function changePin(){
    const np=document.getElementById('set-pin').value.trim();
    if(!np||np.length<4){toast('PIN قصير جداً','err');return;}
    localStorage.setItem(PIN_HASH_KEY,hashPin(np));
    toast('🔒 تم تغيير PIN');
    closeModal('settings');
}
function resetAllData(){
    if(!confirm('سيتم مسح كل البيانات بشكل دائم. متابعة؟'))return;
    localStorage.removeItem('akh_v9');
    localStorage.removeItem(PIN_HASH_KEY);
    location.reload();
}

// ──────────────── NAVIGATION ────────────────
function showPage(id,btn){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.ni').forEach(b=>b.classList.remove('active'));
    document.getElementById('page-'+id).classList.add('active');
    if(btn)btn.classList.add('active');
    document.getElementById('hangarBar').style.display=['data','temp','ref','more'].includes(id)?'flex':'none';
    const fn={dash:renderDash,hangars:renderFarmTree,store:renderStore,data:renderDTab,temp:renderTTab,ref:renderRef,more:renderMore};
    if(fn[id])fn[id]();
}

function renderFarmBar(){
    let h='<button class="fp-add" onclick="openModal(\'addFarm\')">+ مزرعة</button>';
    DB.farms.forEach(f=>h+='<div class="fp'+(f.id===cFarm?' active':'')+'" onclick="selectFarm(\''+f.id+'\')">'+f.name+'</div>');
    document.getElementById('farmBar').innerHTML=h;
}
function selectFarm(id){cFarm=id;cHangar=null;renderFarmBar();renderHangarBar();const pg=document.querySelector('.page.active');if(pg){const pid=pg.id.replace('page-','');const fn={dash:renderDash,store:renderStore,data:renderDTab,temp:renderTTab,hangars:renderFarmTree,more:renderMore,ref:renderRef};if(fn[pid])fn[pid]();}}
function renderHangarBar(){const bar=document.getElementById('hangarBar');if(!cFarm){bar.innerHTML='';return;}const hs=DB.hangars.filter(h=>h.farmId===cFarm);let h='<div class="hp'+(cHangar===null?' active':'')+'" onclick="selectHangar(null)">الكل</div>';hs.forEach(hn=>h+='<div class="hp'+(hn.id===cHangar?' active':'')+'" onclick="selectHangar(\''+hn.id+'\')">'+hn.name+'</div>');bar.innerHTML=h;}
function selectHangar(id){cHangar=id;renderHangarBar();renderDTab();renderTTab();}

function sBids(){if(cHangar)return DB.batches.filter(b=>b.hangarId===cHangar).map(b=>b.id);if(cFarm){const hi=DB.hangars.filter(h=>h.farmId===cFarm).map(h=>h.id);return DB.batches.filter(b=>hi.includes(b.hangarId)).map(b=>b.id);}return DB.batches.map(b=>b.id);}

function fillBS(sid,all){const s=document.getElementById(sid);if(!s)return;const cur=s.value;s.innerHTML=all?'<option value="">عام</option>':'<option value="">اختر دفعة...</option>';const sc=cFarm?(function(){const hi=DB.hangars.filter(h=>h.farmId===cFarm).map(h=>h.id);return DB.batches.filter(b=>hi.includes(b.hangarId));}()):DB.batches;sc.forEach(b=>{const hn=DB.hangars.find(h=>h.id===b.hangarId);s.innerHTML+='<option value="'+b.id+'">'+b.name+(hn?' ('+hn.name+')':'')+'</option>';});if(cur)s.value=cur;}
function fillHS(sid){const s=document.getElementById(sid);if(!s)return;s.innerHTML='<option value="">اختر عنبر...</option>';(cFarm?DB.hangars.filter(h=>h.farmId===cFarm):DB.hangars).forEach(h=>s.innerHTML+='<option value="'+h.id+'">'+h.name+'</option>');}

// ──────────────── VALIDATION ────────────────
function validateNumber(selector,label,min=0){
    const el=document.querySelector(selector);
    const v=parseFloat(el.value);
    if(isNaN(v)||v<min){toast(label+' غير صحيح','err');el.focus();return false;}
    return true;
}

// ──────────────── CRUD OPERATIONS ────────────────
function addFarm(){const n=(document.getElementById('fm-name').value||'').trim();if(!n){toast('أدخل الاسم','err');return;}DB.farms.push({id:uid(),name:n,loc:(document.getElementById('fm-loc').value||'').trim()});save();if(!cFarm)cFarm=DB.farms[DB.farms.length-1].id;closeModal('addFarm');document.getElementById('fm-name').value='';document.getElementById('fm-loc').value='';renderFarmBar();renderFarmTree();toast('✅ تمت الإضافة');}
function openEditFarm(id){const f=DB.farms.find(x=>x.id===id);if(!f)return;document.getElementById('ef-id').value=f.id;document.getElementById('ef-name').value=f.name;document.getElementById('ef-loc').value=f.loc||'';openModal('editFarm');}
function updateFarm(){const id=document.getElementById('ef-id').value,f=DB.farms.find(x=>x.id===id);if(!f)return;const n=(document.getElementById('ef-name').value||'').trim();if(!n){toast('أدخل الاسم','err');return;}f.name=n;f.loc=(document.getElementById('ef-loc').value||'').trim();save();closeModal('editFarm');renderFarmBar();renderFarmTree();toast('✅ تم الحفظ');}
function deleteFarm(){const id=document.getElementById('ef-id').value;DB.farms=DB.farms.filter(x=>x.id!==id);const hi=DB.hangars.filter(h=>h.farmId===id).map(h=>h.id);DB.hangars=DB.hangars.filter(h=>h.farmId!==id);const bi=DB.batches.filter(b=>hi.includes(b.hangarId)).map(b=>b.id);DB.batches=DB.batches.filter(b=>!hi.includes(b.hangarId));['weights','feed','deaths','sales'].forEach(k=>DB[k]=DB[k].filter(r=>!bi.includes(r.batchId)));DB.feedStore=DB.feedStore.filter(r=>r.farmId!==id);DB.staff=DB.staff.filter(s=>s.farmId!==id);DB.tempLogs=DB.tempLogs.filter(t=>!hi.includes(t.hangarId));if(cFarm===id)cFarm=DB.farms.length?DB.farms[0].id:null;save();closeModal('editFarm');renderFarmBar();renderFarmTree();renderDash();toast('🗑 تم الحذف');}
function openAddHangar(fid){_aHF=fid;['hn-name','hn-cap','hn-area','hn-win','hn-fans','hn-fcap'].forEach(i=>document.getElementById(i).value='');openModal('addHangar');}
function addHangar(){const n=(document.getElementById('hn-name').value||'').trim();if(!n){toast('أدخل الاسم','err');return;}DB.hangars.push({id:uid(),farmId:_aHF,name:n,cap:+document.getElementById('hn-cap').value||0,area:+document.getElementById('hn-area').value||0,windows:+document.getElementById('hn-win').value||0,fans:+document.getElementById('hn-fans').value||0,fanCap:+document.getElementById('hn-fcap').value||0});save();closeModal('addHangar');renderFarmTree();renderHangarBar();toast('✅ تمت الإضافة');}
function openEditHangar(id){const h=DB.hangars.find(x=>x.id===id);if(!h)return;document.getElementById('eh-id').value=h.id;document.getElementById('eh-name').value=h.name;document.getElementById('eh-cap').value=h.cap||'';document.getElementById('eh-area').value=h.area||'';document.getElementById('eh-win').value=h.windows||'';document.getElementById('eh-fans').value=h.fans||'';document.getElementById('eh-fcap').value=h.fanCap||'';openModal('editHangar');}
function updateHangar(){const id=document.getElementById('eh-id').value,h=DB.hangars.find(x=>x.id===id);if(!h)return;h.name=document.getElementById('eh-name').value.trim();h.cap=+document.getElementById('eh-cap').value||0;h.area=+document.getElementById('eh-area').value||0;h.windows=+document.getElementById('eh-win').value||0;h.fans=+document.getElementById('eh-fans').value||0;h.fanCap=+document.getElementById('eh-fcap').value||0;save();closeModal('editHangar');renderFarmTree();toast('✅ تم الحفظ');}
function deleteHangar(){const id=document.getElementById('eh-id').value;const bi=DB.batches.filter(b=>b.hangarId===id).map(b=>b.id);DB.hangars=DB.hangars.filter(x=>x.id!==id);DB.batches=DB.batches.filter(b=>b.hangarId!==id);['weights','feed','deaths','sales'].forEach(k=>DB[k]=DB[k].filter(r=>!bi.includes(r.batchId)));DB.tempLogs=DB.tempLogs.filter(t=>t.hangarId!==id);if(cHangar===id)cHangar=null;save();closeModal('editHangar');renderFarmTree();toast('🗑 تم الحذف');}
function openAddBatch(hid){_aBH=hid;document.getElementById('bt-date').value=todayS();['bt-name','bt-count','bt-price','bt-target'].forEach(i=>document.getElementById(i).value='');openModal('addBatch');}
function addBatch(){const n=(document.getElementById('bt-name').value||'').trim(),c=+document.getElementById('bt-count').value,d=document.getElementById('bt-date').value;if(!n||!c||!d){toast('الاسم والعدد والتاريخ مطلوبة','err');return;}DB.batches.push({id:uid(),hangarId:_aBH,name:n,count:c,startCount:c,date:d,price:+document.getElementById('bt-price').value||0,target:+document.getElementById('bt-target').value||2.5,active:true});save();closeModal('addBatch');renderFarmTree();renderDash();toast('✅ تمت الإضافة');}

function getFStock(fid){const rs=DB.feedStore.filter(r=>r.farmId===fid);const i=rs.filter(r=>r.txType==='in').reduce((s,r)=>s+r.kg,0);const o=rs.filter(r=>r.txType==='out').reduce((s,r)=>s+r.kg,0);const kg=Math.max(0,i-o);return{kg,bags:kg/KPB};}
function getStaffInfo(fid){const sf=DB.staff.filter(s=>s.farmId===fid);const rows=sf.map(s=>{const fr=fridays(s.startDate);return{s,fridays:fr,total:(s.allowance+s.advance)*fr};});return{rows,total:rows.reduce((sm,r)=>sm+r.total,0)};}

function saveWeight(){if(!validateNumber('#wt-w','الوزن',0.01))return;const b=document.getElementById('wt-b').value,w=+document.getElementById('wt-w').value,d=document.getElementById('wt-d').value;if(!b){toast('اختر دفعة','err');return;}DB.weights.push({id:uid(),batchId:b,weight:w,date:d||todayS(),note:document.getElementById('wt-note').value});save();closeModal('addWeight');renderDTab();renderDash();toast('⚖️ تم التسجيل');}
function calcFeedKg(){document.getElementById('fd-kg').textContent=fmt((+document.getElementById('fd-bags').value||0)*KPB)+' كجم';}
function showFeedStock(){const bid=document.getElementById('fd-b').value;if(!bid){document.getElementById('fd-stock-info').textContent='';return;}const b=DB.batches.find(x=>x.id===bid);const hn=b?DB.hangars.find(h=>h.id===b.hangarId):null;const fid=hn?hn.farmId:null;if(!fid){document.getElementById('fd-stock-info').textContent='';return;}const st=getFStock(fid);document.getElementById('fd-stock-info').innerHTML='<span style="color:'+(st.bags<10?'var(--danger)':'var(--a)')+'">🌾 المخزن: '+st.bags.toFixed(1)+' شيكارة</span>';}
function saveFeed(){if(!validateNumber('#fd-bags','الشيكاير',0.5))return;const b=document.getElementById('fd-b').value,bags=+document.getElementById('fd-bags').value,d=document.getElementById('fd-d').value||todayS();if(!b){toast('اختر دفعة','err');return;}const bt=DB.batches.find(x=>x.id===b),hn=bt?DB.hangars.find(h=>h.id===bt.hangarId):null,fid=hn?hn.farmId:null;const kg=bags*KPB;if(fid){const st=getFStock(fid);if(kg>st.kg&&!confirm('المخزن غير كافٍ. متابعة؟'))return;}DB.feed.push({id:uid(),batchId:b,bags,qty:kg,type:document.getElementById('fd-type').value,cost:0,date:d});if(fid)DB.feedStore.push({id:uid(),farmId:fid,date:d,bags,kg,txType:'out',batchId:b,feedType:document.getElementById('fd-type').value,note:'صرف'});save();closeModal('addFeed');renderDTab();renderDash();renderStore();toast('🌾 تم الصرف');}
function showDeathToday(){const b=document.getElementById('dt-b').value,d=todayS();if(!b){document.getElementById('dt-today').textContent='';return;}const tds=DB.deaths.filter(x=>x.batchId===b&&x.date===d);if(!tds.length){document.getElementById('dt-today').textContent='';return;}const sum=tds.reduce((s,x)=>s+x.count,0);document.getElementById('dt-today').innerHTML='<span style="color:var(--danger)">نفوق اليوم: <b>'+sum+'</b></span>';}
function saveDeath(){if(!validateNumber('#dt-cnt','العدد',1))return;const b=document.getElementById('dt-b').value,c=+document.getElementById('dt-cnt').value,d=document.getElementById('dt-d').value||todayS(),p=document.getElementById('dt-per').value;if(!b){toast('اختر دفعة','err');return;}const ex=DB.deaths.find(x=>x.batchId===b&&x.date===d&&x.period===p);if(ex){ex.count+=c;}else{DB.deaths.push({id:uid(),batchId:b,count:c,date:d,period:p,reason:document.getElementById('dt-rsn').value});}const bt=DB.batches.find(x=>x.id===b);if(bt)bt.count=Math.max(0,bt.count-c);save();closeModal('addDeath');renderDTab();renderDash();toast('💀 تم التسجيل');}
function calcSale(){document.getElementById('sl-total').value=Math.round((+document.getElementById('sl-cnt').value||0)*(+document.getElementById('sl-w').value||0)*(+document.getElementById('sl-price').value||0));}
function saveSale(){if(!validateNumber('#sl-cnt','العدد',1)||!validateNumber('#sl-price','السعر',0.5))return;const b=document.getElementById('sl-b').value,c=+document.getElementById('sl-cnt').value,w=+document.getElementById('sl-w').value||0,p=+document.getElementById('sl-price').value,d=document.getElementById('sl-d').value||todayS();if(!b){toast('اختر دفعة','err');return;}DB.sales.push({id:uid(),batchId:b,count:c,weight:w,price:p,total:Math.round(c*w*p),date:d});save();closeModal('addSale');renderDTab();renderDash();toast('💰 تم البيع');}
function saveExpense(){if(!validateNumber('#ex-amt','المبلغ',0.5))return;const a=+document.getElementById('ex-amt').value,d=document.getElementById('ex-d').value||todayS();DB.expenses.push({id:uid(),type:document.getElementById('ex-type').value,amount:a,date:d,batchId:document.getElementById('ex-b').value,note:document.getElementById('ex-note').value});save();closeModal('addExpense');renderDTab();renderDash();toast('📋 تمت الإضافة');}
function saveStaff(){const n=(document.getElementById('st-name').value||'').trim();if(!n){toast('أدخل الاسم','err');return;}DB.staff.push({id:uid(),farmId:_aSF,name:n,role:document.getElementById('st-role').value,allowance:+document.getElementById('st-allow').value||0,advance:+document.getElementById('st-adv').value||0,startDate:document.getElementById('st-start').value||todayS()});save();closeModal('addStaff');renderDTab();toast('👤 تمت الإضافة');}
function showIdealTemp(){const hid=document.getElementById('tl-h').value;if(!hid){document.getElementById('tl-ideal').textContent='';return;}const bts=DB.batches.filter(b=>b.hangarId===hid&&b.active);if(!bts.length){document.getElementById('tl-ideal').textContent='';return;}const avg=Math.round(bts.reduce((s,b)=>s+dAge(b.date),0)/bts.length);const rec=idealRec(avg);document.getElementById('tl-ideal').innerHTML='<span style="color:var(--a)">المثالي لعمر '+avg+' يوم: '+rec.mn+'–'+rec.mx+'°</span>';}
function saveTempLog(){const h=document.getElementById('tl-h').value;if(!h||document.getElementById('tl-t').value===''){toast('املأ الحقول','err');return;}DB.tempLogs.push({id:uid(),hangarId:h,temp:+document.getElementById('tl-t').value,hum:+document.getElementById('tl-hum').value||null,date:document.getElementById('tl-d').value||todayS(),time:document.getElementById('tl-time').value||nowT(),note:document.getElementById('tl-note').value});save();closeModal('addTemp');renderTTab();toast('🌡 تم التسجيل');}

function calcStoreKg(){document.getElementById('si-kg').textContent=fmt((+document.getElementById('si-bags').value||0)*KPB)+' كجم';}
function saveStoreIn(){if(!validateNumber('#si-bags','الشيكاير',1))return;const bags=+document.getElementById('si-bags').value,d=document.getElementById('si-d').value||todayS();DB.feedStore.push({id:uid(),farmId:cFarm,date:d,bags,kg:bags*KPB,txType:'in',feedType:document.getElementById('si-type').value,pricePerTon:+document.getElementById('si-price').value||0,note:document.getElementById('si-note').value||''});save();closeModal('storeIn');renderStore();renderDash();toast('📦 تم الاستلام');}

function previewPhoto(inp){if(inp.files&&inp.files[0]){const r=new FileReader();r.onload=e=>{document.getElementById('ph-img').src=e.target.result;document.getElementById('ph-preview').style.display='block';};r.readAsDataURL(inp.files[0]);}}
async function savePhoto(){const f=document.getElementById('ph-file').files[0];if(!f){toast('اختر صورة','err');return;}const id=uid();const r=new FileReader();r.onload=async e=>{await idbKeyval.set('ph_'+id,e.target.result);DB.photos.push({id,src:'',cat:document.getElementById('ph-cat').value,batchId:document.getElementById('ph-b').value,note:document.getElementById('ph-note').value,date:todayS(),storedInIDB:true});save();closeModal('addPhoto');renderMore();toast('📷 تم الحفظ');};r.readAsDataURL(f);}
function saveClient(){const n=(document.getElementById('cl-name').value||'').trim();if(!n)return;DB.clients.push({id:uid(),name:n,phone:document.getElementById('cl-phone').value});save();closeModal('client');renderMore();toast('👤 تمت الإضافة');}
function saveClientSale(){const c=document.getElementById('cs-client').value,a=+document.getElementById('cs-amt').value;if(!c||!a)return;DB.clientSales.push({id:uid(),clientId:c,amount:a,date:document.getElementById('cs-date').value||todayS(),paid:false});save();closeModal('clientSale');renderMore();toast('💰 تم البيع');}
function saveMarketPrice(){DB.marketPrices.push({id:uid(),type:document.getElementById('mp-type').value,price:+document.getElementById('mp-price').value,date:document.getElementById('mp-date').value||todayS()});save();closeModal('marketPrice');renderMore();toast('📈 تم الحفظ');}
function saveAgenda(){DB.agenda.push({id:uid(),type:document.getElementById('ag-type').value,date:document.getElementById('ag-date').value,note:document.getElementById('ag-note').value,done:false});save();closeModal('agenda');renderMore();toast('📅 تم الحفظ');}

function delRec(col,id){document.getElementById('confirm-msg').textContent='أنت متأكد من الحذف؟';confirmCallback=()=>{DB[col]=DB[col].filter(x=>x.id!==id);save();renderDTab();renderDash();toast('🗑 تم الحذف');};document.getElementById('confirm-yes').onclick=()=>{confirmCallback();closeModal('confirm');};openModal('confirm');}

// ──────────────── RENDER DATA TAB ────────────────
function switchDTab(t,btn){cDTab=t;document.querySelectorAll('#dataTabs .it').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderDTab();}
function renderDTab(){
    const el=document.getElementById('dataContent');if(!el)return;const bids=sBids(),t=cDTab;let h='';
    if(t==='w'){
        h+='<button class="btn btn-g" onclick="openModal(\'addWeight\');fillBS(\'wt-b\');document.getElementById(\'wt-d\').value=todayS();">+ وزن</button>';
        const rows=DB.weights.filter(w=>bids.includes(w.batchId)).sort((a,b)=>b.date>a.date?1:-1);
        h+='<div class="card"><div class="tw"><table><thead><tr><th data-key="name">دفعة</th><th data-key="w">وزن</th><th data-key="date">تاريخ</th><th></th></tr></thead><tbody>';
        rows.forEach(w=>{const b=DB.batches.find(x=>x.id===w.batchId);h+='<tr><td>'+(b?b.name:'-')+'</td><td style="color:var(--a);font-weight:700">'+w.weight+' كجم</td><td>'+fD(w.date)+'</td><td><button class="dbtn" onclick="delRec(\'weights\',\''+w.id+'\')">×</button></td></tr>';});
        h+='</tbody></table></div></div>';
    }else if(t==='f'){
        h+='<button class="btn btn-g" onclick="openModal(\'addFeed\');fillBS(\'fd-b\');document.getElementById(\'fd-d\').value=todayS();">+ علف</button>';
        const rows=DB.feed.filter(f=>bids.includes(f.batchId)).sort((a,b)=>b.date>a.date?1:-1);
        h+='<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>كمية</th><th>تاريخ</th><th></th></tr></thead><tbody>';
        rows.forEach(f=>{const b=DB.batches.find(x=>x.id===f.batchId);h+='<tr><td>'+(b?b.name:'-')+'</td><td>'+f.bags+' شيكارة</td><td>'+fD(f.date)+'</td><td><button class="dbtn" onclick="delRec(\'feed\',\''+f.id+'\')">×</button></td></tr>';});
        h+='</tbody></table></div></div>';
    }else if(t==='d'){
        h+='<button class="btn btn-r" onclick="openModal(\'addDeath\');fillBS(\'dt-b\');document.getElementById(\'dt-d\').value=todayS();">+ نفوق</button>';
        const rows=DB.deaths.filter(d=>bids.includes(d.batchId)).sort((a,b)=>b.date>a.date?1:-1);
        h+='<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>عدد</th><th>تاريخ</th><th></th></tr></thead><tbody>';
        rows.forEach(d=>{const b=DB.batches.find(x=>x.id===d.batchId);h+='<tr><td>'+(b?b.name:'-')+'</td><td style="color:var(--danger)">'+d.count+'</td><td>'+fD(d.date)+'</td><td><button class="dbtn" onclick="delRec(\'deaths\',\''+d.id+'\')">×</button></td></tr>';});
        h+='</tbody></table></div></div>';
    }else if(t==='s'){
        h+='<button class="btn btn-o" onclick="openModal(\'addSale\');fillBS(\'sl-b\');document.getElementById(\'sl-d\').value=todayS();">+ بيع</button>';
        const rows=DB.sales.filter(s=>bids.includes(s.batchId)).sort((a,b)=>b.date>a.date?1:-1);
        h+='<div class="card"><div class="tw"><table><thead><tr><th>دفعة</th><th>إجمالي</th><th>تاريخ</th><th></th></tr></thead><tbody>';
        rows.forEach(s=>{const b=DB.batches.find(x=>x.id===s.batchId);h+='<tr><td>'+(b?b.name:'-')+'</td><td style="color:var(--a)">'+fmt(s.total)+' ج.م</td><td>'+fD(s.date)+'</td><td><button class="dbtn" onclick="delRec(\'sales\',\''+s.id+'\')">×</button></td></tr>';});
        h+='</tbody></table></div></div>';
    }else if(t==='e'){
        h+='<button class="btn btn-b" onclick="openModal(\'addExpense\');fillBS(\'ex-b\',true);document.getElementById(\'ex-d\').value=todayS();">+ مصروف</button>';
        const rows=DB.expenses.sort((a,b)=>b.date>a.date?1:-1);
        h+='<div class="card"><div class="tw"><table><thead><tr><th>نوع</th><th>مبلغ</th><th>تاريخ</th><th></th></tr></thead><tbody>';
        rows.forEach(e=>{h+='<tr><td>'+e.type+'</td><td style="color:var(--danger)">'+fmt(e.amount)+' ج.م</td><td>'+fD(e.date)+'</td><td><button class="dbtn" onclick="delRec(\'expenses\',\''+e.id+'\')">×</button></td></tr>';});
        h+='</tbody></table></div></div>';
    }else if(t==='st'){
        if(!cFarm){el.innerHTML='<div class="empty">اختر مزرعة</div>';return;}
        const info=getStaffInfo(cFarm);
        h+='<button class="btn btn-g" onclick="openModal(\'addStaff\');_aSF=\''+cFarm+'\';document.getElementById(\'st-start\').value=todayS();">+ موظف</button>';
        h+='<div class="card"><div class="card-title">💼 العمالة</div><div>الإجمالي: <b style="color:var(--danger)">'+fmt(Math.round(info.total))+' ج.م</b></div></div>';
        info.rows.forEach(r=>{h+='<div class="sc"><div>'+r.s.name+' <span class="badge bp">'+r.s.role+'</span><br><small>'+r.fridays+' جمعة · '+fmt(Math.round(r.total))+' ج.م</small></div><button class="dbtn" onclick="DB.staff=DB.staff.filter(x=>x.id!==\''+r.s.id+'\');save();renderDTab();">×</button></div>';});
        el.innerHTML=h;return;
    }
    el.innerHTML=h;
}

// ──────────────── TEMP ────────────────
function switchTTab(t,btn){cTTab=t;document.querySelectorAll('#page-temp .it').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderTTab();}
function renderTTab(){
    const el=document.getElementById('tempContent');if(!el)return;const hs=cHangar?[DB.hangars.find(h=>h.id===cHangar)].filter(Boolean):cFarm?DB.hangars.filter(h=>h.farmId===cFarm):DB.hangars;
    if(cTTab==='log'){
        let h='<button class="btn btn-g" onclick="openModal(\'addTemp\');fillHS(\'tl-h\');document.getElementById(\'tl-d\').value=todayS();">+ حرارة</button>';
        hs.forEach(hn=>{if(!hn)return;const bts=DB.batches.filter(b=>b.hangarId===hn.id&&b.active);const avg=bts.length?Math.round(bts.reduce((s,b)=>s+dAge(b.date),0)/bts.length):21;const ideal=idealRec(avg);const logs=DB.tempLogs.filter(t=>t.hangarId===hn.id).sort((a,b)=>(b.date+b.time)>(a.date+a.time)?1:-1);
            h+='<div class="card"><div class="card-title">🌡 '+hn.name+' <small>مثالي: '+ideal.mn+'–'+ideal.mx+'°</small></div>';
            logs.slice(0,12).forEach(tl=>{h+='<div class="trow"><div class="ttime">'+tl.date.slice(5)+'<br>'+tl.time+'</div><div style="font-weight:900">'+tl.temp+'°C</div></div>';});
            h+='</div>';});
        el.innerHTML=h||'<div class="empty">لا عنابر</div>';
    }else{
        let h='';hs.forEach(hn=>{if(!hn)return;const bts=DB.batches.filter(b=>b.hangarId===hn.id&&b.active),birds=bts.reduce((s,b)=>s+b.count,0);const actual=(hn.fans||0)*(hn.fanCap||0);const ok=actual>0;
            h+='<div class="card"><div class="card-title">💨 '+hn.name+'</div><div>طيور: '+fmt(birds)+' | قدرة: '+fmt(actual)+' م³/س</div><div class="'+(ok?'ao':'alert')+' alert">'+(ok?'✅ تهوية كافية':'⚠️ راجع التهوية')+'</div></div>';});
        el.innerHTML=h||'<div class="empty">لا عنابر</div>';
    }
}

// ──────────────── REFERENCE ────────────────
function switchRefTab(t,btn){cRefTab=t;document.querySelectorAll('#page-ref .it').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderRef();}
function renderRef(){
    const el=document.getElementById('refContent');if(!el)return;
    if(cRefTab==='disease'){
        const DIS=[{n:'نيوكاسل',s:'أعراض تنفسية، إسهال أخضر، التواء الرقبة',t:'لقاح، عزل',p:'تحصين منتظم'},{n:'الجمبورو',s:'إسهال أبيض، خمول، نفوق مفاجئ',t:'لقاح، رفع الحرارة',p:'تحصين في العمر المناسب'},{n:'الكوكسيديا',s:'إسهال دموي، ضعف، فقدان شهية',t:'مضادات كوكسيديا',p:'فرشة جافة وتهوية'},{n:'الإجهاد الحراري',s:'لهاث، أجنحة ممدودة، نفوق',t:'تبريد، فيتامين C',p:'مراقبة الحرارة'},{n:'إنفلونزا الطيور',s:'زرقة العرف، تورم الرأس، نفوق عالي',t:'إبلاغ الطبيب فوراً',p:'أمن حيوي صارم'}];
        el.innerHTML=DIS.map(d=>'<div class="card"><div class="card-title">🦠 '+d.n+'</div><div><b>أعراض:</b> '+d.s+'</div><div><b>علاج:</b> '+d.t+'</div><div><b>وقاية:</b> '+d.p+'</div></div>').join('');
    }else{
        const bids=sBids(),bts=DB.batches.filter(b=>bids.includes(b.id)&&b.active);
        let h='<div class="itabs"><button class="it active" onclick="switchAnalytics(\'fcr\',this)">📊 FCR</button><button class="it" onclick="switchAnalytics(\'grow\',this)">📈 نمو</button></div><div id="analyticsInner"></div>';
        el.innerHTML=h;renderAnalytics('fcr',bts);
    }
}
function switchAnalytics(t,btn){document.querySelectorAll('#refContent .it').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');const bids=sBids();const bts=DB.batches.filter(b=>bids.includes(b.id)&&b.active);renderAnalytics(t,bts);}
function renderAnalytics(t,bts){
    const el=document.getElementById('analyticsInner');if(!el)return;
    if(t==='fcr'){
        el.innerHTML=bts.map(b=>{const fKg=DB.feed.filter(f=>f.batchId===b.id).reduce((s,x)=>s+x.qty,0);const lw=DB.weights.filter(w=>w.batchId===b.id).sort((a,c)=>c.date>a.date?1:-1)[0];const fcr=lw&&fKg&&b.startCount?(fKg/(b.startCount*lw.weight)).toFixed(2):'-';return '<div class="fcr"><b>'+b.name+'</b> — FCR: <b style="color:var(--a2)">'+fcr+'</b> | علف: '+fmt(fKg)+' كجم</div>';}).join('')||'<div class="empty">لا بيانات</div>';
    }else{
        el.innerHTML='<div class="chart-w"><canvas id="growC"></canvas></div>';
        setTimeout(()=>{const ctx=document.getElementById('growC');if(!ctx)return;const colors=['#00e272','#ffb703','#38b6ff'];const ds=[];bts.forEach((b,i)=>{const ws=DB.weights.filter(w=>w.batchId===b.id).sort((a,c)=>a.date>c.date?1:-1);if(!ws.length)return;ds.push({label:b.name,data:ws.map(w=>({x:dAge(b.date)-dAge(w.date),y:w.weight})),borderColor:colors[i%3],tension:0.4,pointRadius:3});});if(ds.length)new Chart(ctx,{type:'line',data:{datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#dff5e8'}}},scales:{x:{ticks:{color:'#4a7a5e'},grid:{color:'#1c3424'}},y:{ticks:{color:'#4a7a5e'},grid:{color:'#1c3424'}}}}});},200);
    }
}

// ──────────────── MORE ────────────────
function switchMoreTab(t,btn){cMoreTab=t;document.querySelectorAll('#page-more .it').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderMore();}
function renderMore(){
    const el=document.getElementById('moreContent');if(!el)return;let h='';
    if(cMoreTab==='photos'){h+='<button class="btn btn-g" onclick="openModal(\'addPhoto\');fillBS(\'ph-b\',true);">+ صورة</button>';h+='<div class="photo-grid">';
        DB.photos.slice().reverse().forEach(p=>{const src=p.src||'';h+='<div class="photo-item"><img src="'+src+'" onclick="window.open(\''+src+'\')"><button class="photo-del" onclick="delWithConfirmPhoto(\''+p.id+'\')">×</button></div>';});
        h+='</div>';if(!DB.photos.length)h+='<div class="empty">لا صور</div>';
    }else if(cMoreTab==='agenda'){
        h+='<button class="btn btn-g" onclick="openModal(\'agenda\');document.getElementById(\'ag-date\').value=todayS();">+ موعد</button>';
        DB.agenda.sort((a,b)=>a.date>b.date?1:-1).forEach(a=>{h+='<div class="card"><div class="rb"><div><b>'+a.type+'</b><br><small>'+fD(a.date)+' · '+(a.note||'')+'</small></div><button class="btn btn-sm btn-g" onclick="a.done=true;save();renderMore();">✓</button></div></div>';});
        if(!DB.agenda.length)h+='<div class="empty">لا مواعيد</div>';
    }else if(cMoreTab==='clients'){
        h+='<button class="btn btn-g" onclick="openModal(\'client\')">+ عميل</button>';
        DB.clients.forEach(c=>{const sales=DB.clientSales.filter(s=>s.clientId===c.id);const total=sales.reduce((s,x)=>s+x.amount,0);const paid=sales.filter(s=>s.paid).reduce((s,x)=>s+x.amount,0);const due=total-paid;h+='<div class="card"><div class="rb"><div><b>'+c.name+'</b><br><small>مستحق: '+fmt(due)+' ج.م</small></div><button class="btn btn-sm btn-g" onclick="DB.clientSales.filter(s=>s.clientId===\''+c.id+'\').forEach(s=>s.paid=true);save();renderMore();">سدد</button></div></div>';});
        if(!DB.clients.length)h+='<div class="empty">لا عملاء</div>';
    }else if(cMoreTab==='market'){
        h+='<button class="btn btn-g" onclick="openModal(\'marketPrice\');document.getElementById(\'mp-date\').value=todayS();">+ سعر</button>';
        h+='<div class="chart-w"><canvas id="marketChart"></canvas></div>';
        setTimeout(()=>{const ctx=document.getElementById('marketChart');if(!ctx)return;const dates=[...new Set(DB.marketPrices.map(p=>p.date))].sort();const types=['كتكوت','علف','بيع'];const colors=['#00e272','#ffb703','#38b6ff'];const datasets=types.map((tp,i)=>({label:tp,data:dates.map(d=>{const ps=DB.marketPrices.filter(p=>p.date===d&&p.type===tp);return ps.length?ps[ps.length-1].price:null;}),borderColor:colors[i],tension:0.3,pointRadius:3}));new Chart(ctx,{type:'line',data:{labels:dates,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#dff5e8'}}},scales:{x:{ticks:{color:'#4a7a5e'},grid:{color:'#1c3424'}},y:{ticks:{color:'#4a7a5e'},grid:{color:'#1c3424'}}}}});},200);
    }
    el.innerHTML=h;
}
async function delWithConfirmPhoto(id){
    document.getElementById('confirm-msg').textContent='أنت متأكد من حذف الصورة؟';
    confirmCallback=async()=>{
        await idbKeyval.del('ph_'+id);
        DB.photos=DB.photos.filter(x=>x.id!==id);
        save();
        renderMore();
        toast('🗑 تم الحذف');
    };
    document.getElementById('confirm-yes').onclick=()=>{confirmCallback();closeModal('confirm');};
    openModal('confirm');
}

// ──────────────── DASHBOARD ────────────────
function renderDash(){
    document.getElementById('quickActions').innerHTML=[
        {ic:'⚖️',lb:'وزن',fn:"openModal('addWeight');fillBS('wt-b');document.getElementById('wt-d').value=todayS();"},
        {ic:'💀',lb:'نفوق',fn:"openModal('addDeath');fillBS('dt-b');document.getElementById('dt-d').value=todayS();"},
        {ic:'🌾',lb:'علف',fn:"openModal('addFeed');fillBS('fd-b');document.getElementById('fd-d').value=todayS();"},
        {ic:'💰',lb:'بيع',fn:"openModal('addSale');fillBS('sl-b');document.getElementById('sl-d').value=todayS();"},
        {ic:'🌡',lb:'حرارة',fn:"openModal('addTemp');fillHS('tl-h');document.getElementById('tl-d').value=todayS();"},
        {ic:'📷',lb:'صورة',fn:"openModal('addPhoto');fillBS('ph-b',true);"},
        {ic:'📦',lb:'مخزن',fn:"openModal('storeIn');document.getElementById('si-d').value=todayS();"}
    ].map(a=>'<div class="qa" onclick="'+a.fn+'"><div class="qa-ic">'+a.ic+'</div><div class="qa-lb">'+a.lb+'</div></div>').join('');
    const bids=sBids(),bts=DB.batches.filter(b=>bids.includes(b.id)&&b.active);
    const birds=bts.reduce((s,b)=>s+b.count,0);
    const wa=new Date();wa.setDate(wa.getDate()-7);
    const wd=DB.deaths.filter(d=>bids.includes(d.batchId)&&new Date(d.date+'T12:00:00')>=wa).reduce((s,d)=>s+d.count,0);
    const lws=bts.map(b=>{const ws=DB.weights.filter(w=>w.batchId===b.id).sort((a,c)=>c.date>a.date?1:-1);return ws.length?ws[0].weight:null;}).filter(Boolean);
    const avgW=lws.length?(lws.reduce((s,w)=>s+w,0)/lws.length).toFixed(2):'-';
    const inc=DB.sales.filter(s=>bids.includes(s.batchId)).reduce((s,x)=>s+x.total,0);
    const cCst=DB.batches.filter(b=>bids.includes(b.id)).reduce((s,b)=>s+(b.startCount*(b.price||0)),0);
    const sCst=cFarm?getStaffInfo(cFarm).total:0;
    const oExp=DB.expenses.reduce((s,x)=>s+x.amount,0);
    const tExp=cCst+oExp+sCst,pr=inc-tExp;
    document.getElementById('dashStats').innerHTML='<div class="stat"><div class="sn">'+fmt(birds)+'</div><div class="sl">طيور</div></div><div class="stat w"><div class="sn">'+bts.length+'</div><div class="sl">دفعات</div></div><div class="stat r"><div class="sn">'+wd+'</div><div class="sl">نفوق أسبوع</div></div><div class="stat b"><div class="sn">'+avgW+'</div><div class="sl">وزن كجم</div></div>';
    document.getElementById('dInc').textContent=fmt(Math.round(inc))+' ج.م';
    document.getElementById('dExp').textContent=fmt(Math.round(tExp))+' ج.م';
    const pe=document.getElementById('dProfit');pe.textContent=(pr>=0?'+':'')+fmt(Math.round(pr))+' ج.م';pe.className=pr>=0?'pp':'pn';
    let al='';
    if(cFarm){const st=getFStock(cFarm);if(st.bags<10)al+='<div class="alert">⚠️ مخزن منخفض: '+st.bags.toFixed(1)+' شيكارة</div>';}
    bts.forEach(b=>{const bd=DB.deaths.filter(d=>d.batchId===b.id&&new Date(d.date+'T12:00:00')>=wa).reduce((s,d)=>s+d.count,0);if(b.startCount&&(bd/b.startCount)*100>=3)al+='<div class="alert">⚠️ '+b.name+': نفوق مرتفع</div>';});
    document.getElementById('alertZone').innerHTML=al;
    const el=document.getElementById('dashBatches');
    if(!bts.length){el.innerHTML='<div class="empty">لا دفعات نشطة</div>';}else{el.innerHTML=bts.map(b=>{const hn=DB.hangars.find(h=>h.id===b.hangarId),fm=hn?DB.farms.find(f=>f.id===hn.farmId):null;const lw=DB.weights.filter(w=>w.batchId===b.id).sort((a,c)=>c.date>a.date?1:-1)[0];const fKg=DB.feed.filter(f=>f.batchId===b.id).reduce((s,x)=>s+x.qty,0);const fcr=lw&&fKg&&b.startCount?(fKg/(b.startCount*lw.weight)).toFixed(2):'-';return '<div class="bc"><div class="rb"><div><b>'+b.name+'</b><br><small>'+(fm?fm.name+' · ':'')+(hn?hn.name+' · ':'')+dAge(b.date)+' يوم</small></div><span class="badge bg">نشطة</span></div><div class="g3"><div>'+fmt(b.count)+'</div><div>'+(lw?lw.weight+' كجم':'-')+'</div><div>'+fcr+'</div></div></div>';}).join('');}
    loadWeather();
}

function renderFarmTree(){
    const el=document.getElementById('farmTree');if(!el)return;if(!DB.farms.length){el.innerHTML='<div class="empty">لا مزارع<br><button class="btn btn-g" onclick="openModal(\'addFarm\')">+ مزرعة</button></div>';return;}
    el.innerHTML=DB.farms.map(f=>{const hs=DB.hangars.filter(hn=>hn.farmId===f.id),st=getFStock(f.id),si=getStaffInfo(f.id);return '<div class="card" style="border-right:3px solid var(--a2)"><div class="rb"><div><b style="color:var(--a2)">🏡 '+f.name+'</b><br><small>🌾'+st.bags.toFixed(1)+' ش · 👥'+si.rows.length+'</small></div><div><button class="btn btn-sm" onclick="openAddHangar(\''+f.id+'\')">+ عنبر</button><button class="ebtn" onclick="openEditFarm(\''+f.id+'\')">✏️</button></div></div>'+hs.map(hn=>{const bts=DB.batches.filter(b=>b.hangarId===hn.id);const act=bts.filter(b=>b.active);const birds=act.reduce((s,b)=>s+b.count,0);return '<div class="hi"><div class="rb"><div><b>🏠 '+hn.name+'</b><br><small>'+act.length+' دفعة · '+fmt(birds)+' طير</small></div><div><button class="btn btn-sm btn-outline" onclick="openAddBatch(\''+hn.id+'\')">+ دفعة</button><button class="ebtn" onclick="openEditHangar(\''+hn.id+'\')">✏️</button></div></div></div>';}).join('')+'</div>';}).join('');
}

function renderStore(){
    const el=document.getElementById('storeContent');if(!el)return;if(!cFarm){el.innerHTML='<div class="empty">اختر مزرعة</div>';return;}
    const fm=DB.farms.find(f=>f.id===cFarm),st=getFStock(cFarm),low=st.bags<10;
    const rs=DB.feedStore.filter(r=>r.farmId===cFarm).sort((a,b)=>b.date>a.date?1:-1);
    let h='<div class="stock'+(low?' low':'')+'"><div><div>'+(fm?fm.name:'')+'</div><div style="font-size:1.9rem;font-weight:900">'+st.bags.toFixed(1)+'</div><div>'+fmt(Math.round(st.kg))+' كجم</div></div><button class="btn btn-g btn-sm" onclick="openModal(\'storeIn\');document.getElementById(\'si-d\').value=todayS();">+ استلام</button></div>';
    if(low)h+='<div class="alert">⚠️ المخزن منخفض!</div>';
    h+='<div class="card"><div class="card-title">📋 حركات المخزن</div>';
    h+=rs.length?'<div class="tw"><table><thead><tr><th>تاريخ</th><th>نوع</th><th>كمية</th></tr></thead><tbody>'+rs.map(r=>'<tr><td>'+fD(r.date)+'</td><td><span class="badge '+(r.txType==='in'?'bg':'br')+'">'+(r.txType==='in'?'وارد':'صادر')+'</span></td><td>'+r.bags+' شيكارة</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">لا حركات</div>';
    h+='</div>';el.innerHTML=h;
}

// ──────────────── WEATHER ────────────────
function loadWeather(){
    const key=cReg;if(wxRegCache[key]&&Date.now()-wxRegCache[key].ts<1800000){renderWx(wxRegCache[key]);return;}
    const coords=cReg.split(',');
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+coords[0]+'&longitude='+coords[1]+'&current=temperature_2m,relative_humidity_2m&timezone=Africa/Cairo').then(r=>r.json()).then(d=>{
        wxRegCache[key]={ts:Date.now(),temp:d.current.temperature_2m,hum:d.current.relative_humidity_2m};
        document.getElementById('hdrTemp').innerHTML=d.current.temperature_2m+'°';
        renderWx(wxRegCache[key]);
    }).catch(()=>{document.getElementById('hdrTemp').textContent='--°';});
}
function renderWx(w){
    const el=document.getElementById('wxWidget');if(!el||!w)return;const ab=DB.batches.filter(b=>b.active);const avg=ab.length?Math.round(ab.reduce((s,b)=>s+dAge(b.date),0)/ab.length):21;const rec=idealRec(avg),tOk=w.temp>=rec.mn&&w.temp<=rec.mx,hOk=w.hum>=rec.hn&&w.hum<=rec.hx;
    el.innerHTML='<div class="wx"><div class="rb"><div><div class="wx-t">'+w.temp+'°C</div><div>💧 '+w.hum+'%</div></div><div><span class="badge '+(tOk?'bg':'br')+'">'+(tOk?'✅':'⚠️')+' حرارة</span><br><span class="badge '+(hOk?'bg':'by')+'">'+(hOk?'✅':'⚠️')+' رطوبة</span></div></div><div>مثالي لعمر '+avg+' يوم: '+rec.mn+'–'+rec.mx+'° / '+rec.hn+'–'+rec.hx+'%</div></div>';
}
function showWeatherModal(){openModal('weather');loadWeatherModal();}
function changeRegion(){cReg=document.getElementById('wx-region').value;loadWeatherModal();}
function loadWeatherModal(){
    const coords=cReg.split(',');document.getElementById('wxContent').innerHTML='<div class="empty"><span class="spinner"></span> جاري التحميل...</div>';
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+coords[0]+'&longitude='+coords[1]+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=Africa/Cairo').then(r=>r.json()).then(d=>{
        const t=d.current.temperature_2m,hu=d.current.relative_humidity_2m,fl=d.current.apparent_temperature,wi=d.current.wind_speed_10m;
        wxRegCache[cReg]={ts:Date.now(),temp:t,hum:hu};document.getElementById('hdrTemp').textContent=t+'°';
        document.getElementById('wxContent').innerHTML='<div class="sg"><div class="stat w"><div class="sn">'+t+'°</div><div class="sl">حرارة</div></div><div class="stat b"><div class="sn">'+hu+'%</div><div class="sl">رطوبة</div></div><div class="stat"><div class="sn">'+fl+'°</div><div class="sl">إحساس</div></div><div class="stat"><div class="sn">'+wi+'</div><div class="sl">رياح كم/س</div></div></div>';
        renderWx(wxRegCache[cReg]);
    }).catch(()=>{document.getElementById('wxContent').innerHTML='<div class="alert">تعذر التحميل</div>';});
}

// ──────────────── EXPORT / IMPORT ────────────────
function exportJSON(){
    const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='alkheir_backup_'+todayS()+'.json';a.click();
    toast('✅ تم التصدير');
}
function exportCSV(){
    const bids=sBids();let csv='\uFEFFالدفعة,طيور,تاريخ,عمر,وزن,علف,نفوق,مبيعات\n';
    DB.batches.filter(b=>bids.includes(b.id)).forEach(b=>{const lw=DB.weights.filter(w=>w.batchId===b.id).sort((a,c)=>c.date>a.date?1:-1);const fKg=DB.feed.filter(f=>f.batchId===b.id).reduce((s,x)=>s+x.qty,0);const dc=DB.deaths.filter(d=>d.batchId===b.id).reduce((s,d)=>s+d.count,0);const sl=DB.sales.filter(s=>s.batchId===b.id).reduce((s,x)=>s+x.total,0);csv+=b.name+','+b.count+','+b.date+','+dAge(b.date)+','+(lw.length?lw[0].weight:0)+','+(fKg/KPB).toFixed(1)+','+dc+','+Math.round(sl)+'\n';});
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='alkheir.csv';a.click();
    toast('✅ تم التصدير');
}
function exportPDF(){
    const bids=sBids(),bts=DB.batches.filter(b=>bids.includes(b.id));const inc=DB.sales.filter(s=>bids.includes(s.batchId)).reduce((s,x)=>s+x.total,0);const exp=DB.batches.filter(b=>bids.includes(b.id)).reduce((s,b)=>s+(b.startCount*(b.price||0)),0)+DB.expenses.reduce((s,x)=>s+x.amount,0);const win=window.open('','_blank');if(!win){toast('السماح بالنوافذ المنبثقة','err');return;}
    win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th{background:#00803f;color:#fff;padding:8px}td{padding:7px;border:1px solid #ddd}</style></head><body><h1>تقرير الخير للدواجن</h1><p>مبيعات: '+fmt(Math.round(inc))+' ج.م | مصاريف: '+fmt(Math.round(exp))+' ج.م | ربح: '+fmt(Math.round(inc-exp))+' ج.م</p><table><tr><th>دفعة</th><th>طيور</th><th>عمر</th><th>علف</th><th>نفوق</th></tr>');
    bts.forEach(b=>{const fKg=DB.feed.filter(f=>f.batchId===b.id).reduce((s,x)=>s+x.qty,0);const dc=DB.deaths.filter(d=>d.batchId===b.id).reduce((s,d)=>s+d.count,0);win.document.write('<tr><td>'+b.name+'</td><td>'+b.count+'</td><td>'+dAge(b.date)+' يوم</td><td>'+(fKg/KPB).toFixed(1)+'</td><td>'+dc+'</td></tr>');});
    win.document.write('</table></body></html>');win.print();toast('🖨 تم التصدير');
}
function importJSON(input){
    const reader=new FileReader();
    reader.onload=e=>{
        try{
            const data=JSON.parse(e.target.result);
            if(!data.farms||!data.batches)throw new Error();
            confirmCallback=()=>{DB=data;save();toast('✅ تم الاستيراد بنجاح');init();};
            document.getElementById('confirm-msg').textContent='استيراد البيانات سيستبدل كل البيانات الحالية. متابعة؟';
            document.getElementById('confirm-yes').onclick=()=>{confirmCallback();closeModal('confirm');};
            openModal('confirm');
        }catch{toast('❌ ملف غير صالح','err');}
    };
    reader.readAsText(input.files[0]);input.value='';
}

// ──────────────── INIT ────────────────
function init(){
    if(DB.farms.length)cFarm=DB.farms[0].id;
    renderFarmBar();renderDash();
    document.querySelectorAll('input[type=date]').forEach(el=>{if(!el.value)el.value=todayS();});
    document.querySelectorAll('input[type=time]').forEach(el=>{if(!el.value)el.value=nowT();});
}
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js');}
