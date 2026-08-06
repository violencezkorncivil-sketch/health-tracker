
/* ============================================================
   ⬇️ ใส่ลิงก์ Google Apps Script Web App ตรงนี้ได้เลย (ถาวร)
   ============================================================ */
let GAS_URL = "";
let PIN = "";

/* ============================================================
   ☁️ โหมดซิงก์ด้วยบัญชีอีเมล (Supabase) — ผู้ขาย/เจ้าของแอปตั้งครั้งเดียว
   ผู้ใช้แค่สมัครด้วยอีเมล+รหัสผ่าน ไม่ต้องยุ่งกับ Google Sheets เลย
   วิธีตั้ง: สร้างโปรเจกต์ฟรีที่ supabase.com → Settings → API
   แล้ววาง URL กับ anon key ตรงนี้ (คีย์ anon เปิดเผยได้ ปลอดภัยเพราะมี RLS)
   ============================================================ */

/* ============================================================
   📄 ลิงก์ "ทำสำเนา" ของไฟล์ Google Sheets ต้นแบบ (ผู้แจก/ผู้ขายใส่ครั้งเดียว)
   วิธีได้ลิงก์: เปิดไฟล์ต้นแบบของคุณ → คัดลอกลิงก์ → เปลี่ยนท้ายจาก /edit... เป็น /copy
   ตัวอย่าง: https://docs.google.com/spreadsheets/d/AAAA111/copy
   ถ้าเว้นว่าง ระบบจะแสดงวิธีสร้างไฟล์ใหม่เองแทน
   ============================================================ */
const TEMPLATE_URL = "";

/* ============================================================
   🔏 ชื่อผู้ถือสิทธิ์ของไฟล์ชุดนี้ (ใส่ชื่อ/อีเมลผู้ซื้อก่อนส่งมอบ)
   เว้นว่าง = ไม่แสดงอะไรเลย · ใส่ชื่อ = แสดงในหน้าเกี่ยวกับ
   ทำให้รู้ได้ว่าไฟล์ที่หลุดออกไปมาจากใคร
   ============================================================ */
const LICENSE = "";

/* ============================================================
   🔑 ระบบคีย์เปิดใช้งาน (ทำงานออฟไลน์ ไม่ต้องมีเซิร์ฟเวอร์)
   • LICENSE_ON = false → ใครเปิดก็ใช้ได้ทันที (ไฟล์ของเจ้าของเอง)
   • LICENSE_ON = true  → ต้องใส่ชื่อ + คีย์ก่อนถึงจะใช้ได้ (ไฟล์ที่ขาย)
   • KEY_SALT = รหัสลับของคุณ — ต้องใส่ให้ตรงกับในไฟล์ "สร้างคีย์.html"
     เปลี่ยนครั้งเดียวตอนแรก แล้วห้ามเปลี่ยนอีก ไม่งั้นคีย์เก่าใช้ไม่ได้ทั้งหมด
   ============================================================ */
const LICENSE_ON = false;
const KEY_SALT   = "เปลี่ยนข้อความนี้เป็นของตัวเอง-แล้วห้ามเปลี่ยนอีก";

/* เก็บลิงก์+PIN ไว้ในเครื่อง (ไม่ได้อยู่ในไฟล์ ใครเปิดโค้ดบน GitHub ก็ไม่เห็น) */
function applyTheme(t){
  document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");
  const btn=document.getElementById("themeBtn"); if(btn) btn.textContent = t==="dark"?"☀️":"🌙";
  const mt=document.getElementById("metaTheme"); if(mt) mt.content = t==="dark"?"#0f1420":"#f5f7f5";
  if(window.S){ if(S.view==="stat"&&typeof drawCharts==="function")drawCharts();
    if(typeof drawProg==="function")drawProg(); if(typeof renderBodyStats==="function")renderBodyStats(); }
}
const LS={
  get(k){try{return localStorage.getItem(k)||""}catch(e){return ""}},
  set(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}},
};
/* ---------- เก็บข้อมูลในเครื่อง (ใช้งานได้ทันทีโดยไม่ต้องตั้งค่าอะไร) ---------- */
const DKEY="healthData";
let saveTimer=null, saveWarned=false, saveFail=0;
/* ---------- ทำความสะอาดข้อมูลที่รับเข้ามา ----------
   กันข้อมูลพังจากชีต/ไฟล์สำรอง/คลาวด์ ไม่ให้ทำแอปล่มหรือเซฟทับของดี  */
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
function arr(a){return Array.isArray(a)?a:[];}
function okRow(x){return x && typeof x==="object" && !Array.isArray(x);}
function okDate(x){return okRow(x) && DATE_RE.test(String(x.date||""));}
function fixSets(v){
  if(Array.isArray(v)) return v.filter(y=>Array.isArray(y)).map(y=>[+y[0]||0,+y[1]||0]);
  if(typeof v==="string"){ try{return fixSets(JSON.parse(v||"[]"));}catch(e){return [];} }
  return [];
}
function cleanWo(a){return arr(a).filter(okDate).map(w=>({...w,sets:fixSets(w.sets)}));}
function cleanWater(o){
  const out={};
  if(o && typeof o==="object" && !Array.isArray(o))
    Object.keys(o).forEach(k=>{ if(DATE_RE.test(k)){const v=+o[k]; if(isFinite(v)&&v>=0) out[k]=v;} });
  return out;
}
const UNUM=["age","w","h","act","goal","rhr","hrmax","lthr","tdeeReal","z2goal","lt1","lt1d","lt1m"];
/* บันทึกความพร้อมรายวัน: ล้า/ปวดกล้ามเนื้อ/เครียด/อารมณ์ (1-5) + ชีพจรตอนตื่น + HRV */
const RDK=["f","s","st","m","rhr","hrv"];
function cleanRd(o){
  const out={};
  if(!okRow(o)) return out;
  Object.keys(o).forEach(k=>{
    if(!DATE_RE.test(k) || !okRow(o[k])) return;
    const v={}, src=o[k];
    RDK.forEach(x=>{
      const n=+src[x];
      if(!isFinite(n)||n<=0) return;
      if(["f","s","st","m"].includes(x)){ if(n>=1&&n<=5) v[x]=Math.round(n); }
      else if(n<=999) v[x]=Math.round(n);
    });
    if(Object.keys(v).length) out[k]=v;
  });
  return out;
}
function cleanUser(u){
  if(!okRow(u)) return {};
  const o={};
  UNUM.forEach(k=>{ if(u[k]!==undefined&&u[k]!==""){const v=+u[k]; if(isFinite(v)) o[k]=v;} });
  if(u.sex==="m"||u.sex==="f") o.sex=u.sex;
  const zm=String(u.zmodel||"").toLowerCase();
  if(["max","hrr","lthr","fit"].includes(zm)) o.zmodel=zm;
  return o;
}
function cleanBlob(j){
  return {
    ex:    arr(j.ex).filter(okDate),
    food:  arr(j.food).filter(okDate),
    sleep: arr(j.sleep).filter(okDate),
    body:  arr(j.body).filter(okDate),
    photo: arr(j.photo).filter(x=>okRow(x)&&x.img),
    myfood:arr(j.myfood).filter(x=>okRow(x)&&x.name),
    wo:    cleanWo(j.wo),
    water: cleanWater(j.water),
    lt1log:arr(j.lt1log).filter(x=>okRow(x)&&DATE_RE.test(String(x.d||""))&&+x.hr>0),
    rd:    cleanRd(j.rd),
    user:  cleanUser(j.user)
  };
}
function applyClean(c){
  S.ex=c.ex; S.food=c.food; S.sleep=c.sleep; S.body=c.body;
  S.photo=c.photo; S.myfood=c.myfood; S.wo=c.wo; S.water=c.water; clearFoodMap();
  if(c.lt1log.length||!S.lt1log) S.lt1log=c.lt1log;
  S.rd=c.rd;
  Object.assign(S.user,c.user);
}
function countAll(o){
  return arr(o.ex).length+arr(o.food).length+arr(o.wo).length+arr(o.sleep).length+
         arr(o.body).length+arr(o.myfood).length+arr(o.photo).length+
         Object.keys(o.water&&typeof o.water==="object"?o.water:{}).length;
}
/* แถวที่ส่งขึ้นชีต: ค่าที่เป็นอาร์เรย์ต้องแปลงเป็นข้อความ ไม่งั้นโครงสร้างหาย */
function forSheet(sheet,row){
  if(sheet==="Workout") return {...row, sets:JSON.stringify(fixSets(row.sets))};
  return row;
}
/* ---------- รวมข้อมูลสองชุดเข้าด้วยกัน (ไม่ทิ้งของใคร) ---------- */
/* ลายนิ้วมือของแถว — ใช้กันซ้ำเมื่อแถวไม่มี ts (ข้อมูลเก่าหรือชีตถูกแก้มือ) */
function fp(x){return JSON.stringify([x.date||"",x.name||x.ex||x.type||"",x.time||"",x.kcal||x.vol||x.min||0]);}
function keyOf(x,k){const v=x[k]; return (v===undefined||v===null||v==="") ? null : String(v);}
function mergeById(local,cloud,key){
  const out=[...arr(cloud)];
  const seen=new Set(), seenFp=new Set();
  out.forEach(x=>{ const k=keyOf(x,key); if(k) seen.add(k); seenFp.add(fp(x)); });
  const extra=[];
  arr(local).forEach(x=>{
    const k=keyOf(x,key), f=fp(x);
    if(k){                                  // มี ts → กันซ้ำด้วย ts
      if(seen.has(k)) return;
      seen.add(k); seenFp.add(f); out.push(x); extra.push(x);
    }else{                                  // ไม่มี ts → เก็บไว้ในเครื่อง แต่ไม่ส่งขึ้นชีต (กันซ้ำไม่ได้)
      if(seenFp.has(f)) return;
      seenFp.add(f); out.push(x);
    }
  });
  return {list:out,extra};
}
function mergeByDate(local,cloud){                   /* 1 วัน 1 รายการ — เอาอันที่ใหม่กว่า */
  const map={};
  arr(cloud).forEach(x=>{map[x.date]=x;});
  const extra=[];
  arr(local).forEach(x=>{
    const c=map[x.date];
    if(!c || (+x.ts||0) > (+c.ts||0)){ map[x.date]=x; extra.push(x); }
  });
  return {list:Object.values(map),extra};
}

let saveBlocked=false, _lastWritten=null;   /* โหลดเข้ามาไม่สมบูรณ์ → ห้ามเขียนทับของเดิม */
function saveNow(force){
  if(saveBlocked && !force) return;
  if(force) saveBlocked=false;
  clearTimeout(saveTimer); saveTimer=null;
  try{
    localStorage.setItem(DKEY,JSON.stringify({
      v:3,ex:S.ex,food:S.food,wo:S.wo,sleep:S.sleep,body:S.body,
      photo:S.photo,myfood:S.myfood,water:S.water,user:S.user,lt1log:S.lt1log,rd:S.rd}));
    _lastWritten={ex:S.ex.slice(),food:S.food.slice(),wo:S.wo.slice(),sleep:S.sleep.slice(),
                  body:S.body.slice(),photo:S.photo.slice(),myfood:S.myfood.slice()};
    saveFail=0;
    const b=el("saveInfo"); if(b) b.textContent="บันทึกในเครื่องแล้ว";
    try{ snapMake(); }catch(e){}
  }catch(e){
    saveFail++;
    const b=el("saveInfo"); if(b) b.innerHTML='<span style="color:var(--bad)">⚠️ บันทึกไม่สำเร็จ — พื้นที่เต็ม</span>';
    if(saveFail===1||saveFail%20===0)
      alert("พื้นที่เก็บข้อมูลในเครื่องเต็ม บันทึกไม่ได้ ⚠️\n(มักเกิดจากรูป progress เยอะ)\n\nกดสำรองข้อมูลเป็นไฟล์ทันที แล้วลบรูปเก่าบางส่วน");
  }
}
let _pend={};
function saveLocal(){
  if(saveBlocked) return;
  _pend={ex:S.ex.slice(),food:S.food.slice(),wo:S.wo.slice(),sleep:S.sleep.slice(),
         body:S.body.slice(),photo:S.photo.slice(),myfood:S.myfood.slice(),water:{...S.water},rd:{...S.rd}};
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{ saveNow(); _pend={}; },400);
}
/* ================= จุดกู้คืนอัตโนมัติ =================
   เก็บสำเนาข้อมูลวันละ 1 ชุด ย้อนหลัง 7 วัน ไว้คนละที่กับข้อมูลหลัก
   ทำงานแยกอิสระจากระบบซิงก์ — ถ้าซิงก์พังยังกู้จากตรงนี้ได้
   ไม่เก็บรูป progress เพราะกินที่มาก (รูปมีระบบสำรองของตัวเองอยู่แล้ว)   */
const SNAPK="healthSnap", UNDOK="healthUndo";
function snapList(){ try{const a=JSON.parse(LS.get(SNAPK)||"[]"); return Array.isArray(a)?a:[];}catch(e){return [];} }
function snapBlob(){ return {v:3,ex:S.ex,food:S.food,wo:S.wo,sleep:S.sleep,body:S.body,
  myfood:S.myfood,water:S.water,user:S.user,lt1log:S.lt1log,rd:S.rd}; }
function snapMake(){
  try{
    const L=snapList(), t=today();
    if(L.length && L[L.length-1].d===t) return;          /* วันนี้เก็บไปแล้ว */
    const b=snapBlob();
    if(countAll(b)===0) return;                          /* ไม่มีข้อมูล ไม่ต้องเก็บ */
    L.push({d:t, n:countAll(b), at:newTs(), j:JSON.stringify(b)});
    while(L.length>7) L.shift();
    if(!LS.set(SNAPK,JSON.stringify(L)))                 /* ที่ไม่พอ → ลดจำนวนชุดลง */
      while(L.length>2){ L.shift(); if(LS.set(SNAPK,JSON.stringify(L))) break; }
  }catch(e){}
}
function snapApply(j,keepPhoto){
  const c=cleanBlob(j), ph=S.photo;
  applyClean(c);
  if(keepPhoto) S.photo=ph;
  saveNow(true); fillUser(); drawZones(); render(); renderWo(); renderBody(); sleepFill(); snapShow();
}
function snapRestore(d){
  const it=snapList().find(x=>x.d===d); if(!it) return;
  let j=null; try{ j=JSON.parse(it.j); }catch(e){ return alert("จุดกู้คืนนี้เสียหาย ใช้ไม่ได้"); }
  if(!confirm("ย้อนข้อมูลกลับไปเป็นของวันที่ "+thShort(d)+" ("+it.n+" รายการ)?\n\n"
    +"ตอนนี้มี "+countAll(S)+" รายการ — ระบบจะเก็บสถานะปัจจุบันไว้ให้ กดย้อนกลับได้ถ้าเปลี่ยนใจ\n"
    +"(รูป progress ไม่ถูกแตะ)")) return;
  LS.set(UNDOK,JSON.stringify({at:newTs(),n:countAll(S),j:JSON.stringify(snapBlob())}));
  snapApply(j,true);
  alert("ย้อนข้อมูลกลับเรียบร้อย ✅ ("+it.n+" รายการ)\n\nถ้าไม่ใช่ที่ต้องการ กดปุ่ม \"เลิกทำการกู้คืน\" ได้เลย"
    +(GAS_URL?"\n\n⚠️ ข้อมูลในชีตยังเป็นของเดิม — ถ้าจะให้ตรงกัน กดโหลดข้อมูลจาก Sheets อีกครั้ง":""));
}
function snapUndo(){
  let u=null; try{ u=JSON.parse(LS.get(UNDOK)||"null"); }catch(e){}
  if(!u) return;
  if(!confirm("เลิกทำการกู้คืน แล้วกลับไปเป็นข้อมูลก่อนหน้า ("+u.n+" รายการ)?")) return;
  snapApply(JSON.parse(u.j),true); LS.set(UNDOK,"");
  alert("กลับมาเป็นข้อมูลก่อนกู้คืนแล้ว ✅"); snapShow();
}
function snapShow(){
  const box=el("snapList"); if(!box) return;
  const L=snapList().slice().reverse();
  let u=null; try{ u=JSON.parse(LS.get(UNDOK)||"null"); }catch(e){}
  box.innerHTML = (L.length
    ? L.map(x=>`<div class="hrow"><span>${thShort(x.d)} · <span style="color:var(--dim);font-size:12px">${x.n} รายการ</span></span>
        <button class="btn ghost" style="width:auto;margin:0;padding:6px 12px;font-size:13px"
          onclick="snapRestore('${x.d}')">ย้อนกลับ</button></div>`).join("")
    : `<div class="empty">ยังไม่มีจุดกู้คืน — ระบบจะเก็บให้เองวันละ 1 ชุดเมื่อมีการบันทึกข้อมูล</div>`)
    + (u?`<button class="btn ghost" id="snapUndoBtn" onclick="snapUndo()">↩️ เลิกทำการกู้คืนล่าสุด (กลับไป ${u.n} รายการ)</button>`:"");
}

/* ---------- เปิดแอปค้างข้ามเที่ยงคืน ----------
   ถ้ายังดูวันที่ "วันนี้" อยู่ พอข้ามวันต้องเลื่อนตามให้เอง
   ไม่งั้นบันทึกตอนเช้าจะไปลงวันเมื่อวานโดยไม่รู้ตัว              */
let _dayNow=null;
function dayWatch(){
  const t=today();
  if(_dayNow===null){ _dayNow=t; return; }
  if(t===_dayNow) return;
  const wasToday = S.date===_dayNow;
  _dayNow=t;
  if(!wasToday) return;                      /* ผู้ใช้กำลังดูวันย้อนหลังอยู่ อย่าไปยุ่ง */
  if(saveTimer) saveNow();
  S.date=t; wPend=null;
  if(el("dateSel")) el("dateSel").value=t;
  setTime(nowHHMM());
  render(); renderWo(); renderBody(); sleepFill();
  if(S.view==="stat") drawCharts();
  /* ใช้กล่องของตัวเอง — ห้ามไปทับกล่อง "มีเวอร์ชันใหม่" ไม่งั้นข้อความอัปเดตหาย */
  const b=el("dayBar");
  if(b){ b.style.display="block";
    b.innerHTML=`📅 <b>ข้ามวันแล้ว</b> — เปลี่ยนเป็นวันที่ ${thDate(t)} ให้อัตโนมัติ
      <button class="btn ghost" style="margin-top:8px" onclick="this.parentNode.style.display='none'">รับทราบ</button>`; }
}
setInterval(dayWatch,30000);

/* ---------- กลับมาเปิดแอปอีกครั้ง ----------
   มือถือไม่ได้โหลดแอปใหม่ตอนกดไอคอน มันคืนหน้าเดิมที่ค้างไว้
   ถ้าทิ้งไว้นาน = ตั้งใจเปิดใหม่ → พากลับหน้าสรุป
   ถ้าเพิ่งสลับไปแป๊บเดียว = ยังทำอะไรค้างอยู่ → อยู่หน้าเดิม        */
let _hidAt=0;
function goHome(){
  const b=document.querySelector("nav [data-p=home]"); if(b) b.click();
  const v=el("viewSeg")&&el("viewSeg").querySelector('[data-v="day"]'); if(v) v.click();
  window.scrollTo(0,0);
}
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="hidden"){ _hidAt=Date.now(); return; }
  const away = _hidAt ? Date.now()-_hidAt : 0;
  _hidAt=0;
  dayWatch();
  if(away > 900000) goHome();               /* ห่างเกิน 15 นาที ถือว่าเปิดใหม่ */
});
addEventListener("pageshow",e=>{ if(e.persisted) goHome(); });

/* ---------- เปิดหลายแท็บพร้อมกัน ----------
   แท็บอื่นเขียนข้อมูลใหม่ → รวมเข้ากับของเรา ไม่ให้เขียนทับกันไปมา   */
addEventListener("storage",e=>{
  if(e.key!==DKEY || !e.newValue || saveBlocked) return;
  let j=null; try{ j=JSON.parse(e.newValue); }catch(err){ return; }
  if(!okRow(j)) return;
  try{
    const c=cleanBlob(j);
    const pending=!!saveTimer;                /* เรามีของที่ยังไม่ได้เขียนลงเครื่องไหม */
    applyClean(c);                            /* อีกแท็บคือความจริงล่าสุด — รับมาทั้งก้อน (ลบก็ลบตาม) */
    if(pending && _lastWritten){
      /* เติมเฉพาะของที่ "เราเพิ่มใหม่หลังเซฟครั้งล่าสุด" กลับเข้าไป — ไม่ฟื้นของที่อีกแท็บลบ */
      ["ex","food","wo","photo"].forEach(k=>{
        const had=new Set(arr(_lastWritten[k]).map(x=>String(x.ts)));
        const mine=_pend[k]||[];
        mine.forEach(x=>{ if(!had.has(String(x.ts)) && !S[k].some(y=>String(y.ts)===String(x.ts))) S[k].push(x); });
      });
      ["sleep","body"].forEach(k=>{
        (_pend[k]||[]).forEach(x=>{ if(!arr(_lastWritten[k]).some(y=>y.date===x.date&&y.ts===x.ts)){
          S[k]=arr(S[k]).filter(y=>y.date!==x.date); S[k].push(x);} });
      });
      (_pend.myfood||[]).forEach(x=>{ if(!S.myfood.some(y=>y.name===x.name)) S.myfood.push(x); });
      Object.keys(_pend.water||{}).forEach(k=>{ S.water[k]=_pend.water[k]; });
      saveNow();                              /* เขียนผลรวมครั้งเดียว อีกแท็บจะรับไปเฉยๆ ไม่เขียนกลับ */
    }
    render(); renderWo(); renderBody(); sleepFill();
  }catch(err){}
});

/* ปิดแอป/สลับไปแอปอื่นกลางคัน → เขียนลงเครื่องทันที ไม่รอ 400 มิลลิวินาที */
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden" && saveTimer) saveNow(); });
addEventListener("pagehide",()=>{ if(saveTimer) saveNow(); });
addEventListener("blur",()=>{ if(saveTimer) saveNow(); });
/* ข้อมูลเก่าเก็บน้ำเป็น "แก้ว" — แปลงเป็น มล. ทุกครั้งที่โหลด ไม่ว่ามาจากทางไหน */
function fixWater(){
  Object.keys(S.water||{}).forEach(k=>{ if(S.water[k]>0 && S.water[k]<=40) S.water[k]=S.water[k]*250; });
}
function loadLocal(){
  let raw=null;
  try{ raw=localStorage.getItem(DKEY); }catch(e){ return false; }
  if(!raw) return false;
  let j=null;
  try{ j=JSON.parse(raw); }catch(e){ j=null; }
  if(!okRow(j)){
    saveBlocked=true;                      /* อ่านไม่ออก — หยุดเขียน จะได้ไม่ทับของเดิม */
    setTimeout(()=>alert("อ่านข้อมูลในเครื่องไม่ได้ ⚠️\n\nระบบหยุดการบันทึกไว้ก่อนเพื่อไม่ให้ทับของเดิม\nถ้ามีไฟล์สำรอง ให้ไปที่ ⚙️ ตั้งค่า → กู้คืนจากไฟล์"),600);
    return false;
  }
  try{
    applyClean(cleanBlob(j));
    if(!(+j.v>=3)) fixWater();             /* ข้อมูลรุ่นเก่าเก็บน้ำเป็น "แก้ว" — แปลงครั้งเดียวเท่านั้น */
    return true;
  }catch(e){
    saveBlocked=true;
    setTimeout(()=>alert("ข้อมูลในเครื่องมีบางส่วนเสียหาย ⚠️\nระบบหยุดการบันทึกไว้ก่อนเพื่อความปลอดภัย — กรุณาสำรองไฟล์ไว้ก่อน"),600);
    return false;
  }
}

const APP_NAME="สุขภาพ Tracker";
const APP_VER="6.3";
const GS_CODE=`/*************************************************************
 *  สุขภาพ Tracker — Google Apps Script Backend
 *  วางโค้ดนี้ใน Extensions > Apps Script ของ Google Sheets
 *  แล้ว Deploy > New deployment > Web app
 *     Execute as : Me
 *     Who has access : Anyone
 *  คัดลอกลิงก์ที่ลงท้ายด้วย /exec ไปวางในแอป
 *
 *  🔒 ตั้ง PIN ข้างล่างก่อนใช้งาน แล้วใส่ PIN เดียวกันในแท็บตั้งค่าของแอป
 *     ถ้าลิงก์หลุดไปถึงคนอื่น เขาจะเข้าข้อมูลไม่ได้ถ้าไม่มี PIN
 *************************************************************/

/** ⬇️ ที่อยู่ของแอป (ผู้แจก/ผู้ขายใส่ครั้งเดียว) เช่น 'https://myapp.netlify.app/'
    ถ้าเว้นว่างไว้ ระบบจะให้คัดลอกลิงก์+PIN ไปวางในแอปเอง */
var APP_URL = '';

/** PIN — ปกติไม่ต้องแก้ ระบบจะสุ่มให้อัตโนมัติตอนกด "ตั้งค่าครั้งแรก"
    (ถ้าอยากกำหนดเอง ใส่ตรงนี้ได้เลย) */
var PIN = '';

function getPin() {
  if (PIN) return String(PIN);
  var pp = PropertiesService.getDocumentProperties();
  var v = pp.getProperty('PIN');
  if (!v) { v = String(Math.floor(100000 + Math.random() * 900000)); pp.setProperty('PIN', v); }
  return v;
}

/*************************************************************
 *  เมนูช่วยตั้งค่าในตัว Google Sheets
 *************************************************************/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('💪 แอปสุขภาพ')
    .addItem('1️⃣ ตั้งค่าครั้งแรก', 'firstSetup')
    .addItem('2️⃣ วิธี Deploy (ดูขั้นตอน)', 'showDeployHelp')
    .addItem('3️⃣ 📲 รับลิงก์เชื่อมแอป', 'showLink')
    .addSeparator()
    .addItem('💾 สำรองข้อมูลเดี๋ยวนี้', 'backupNow')
    .addItem('⏰ ตั้งสำรองอัตโนมัติทุกวัน', 'setupAutoBackup')
    .addItem('📊 สถานะการสำรอง', 'backupStatus')
    .addItem('♻️ กู้คืนจากไฟล์สำรองล่าสุด', 'restoreLatestBackup')
    .addSeparator()
    .addItem('🔑 ดู/เปลี่ยน PIN', 'showPin')
    .addToUi();
}

function firstSetup() {
  ['Exercise', 'Food', 'Workout', 'Sleep', 'Body', 'Photo', 'MyFood', 'Water', 'User'].forEach(sh);
  var pin = getPin();
  var html = '<div style="font-family:sans-serif;line-height:1.9;font-size:14px">'
    + '<h3 style="margin:0 0 10px">✅ สร้างตารางเก็บข้อมูลเรียบร้อย</h3>'
    + 'PIN ของคุณคือ <b style="font-size:20px;color:#0d9488">' + pin + '</b> (ระบบสุ่มให้ ไม่ต้องจำ เดี๋ยวมีลิงก์ให้กดทีเดียว)<br><br>'
    + '<b>ขั้นต่อไป — เปิดใช้งานให้แอปเชื่อมได้:</b><ol style="padding-left:18px">'
    + '<li>กดปุ่ม <b>Deploy</b> (สีน้ำเงิน มุมขวาบนของหน้า Apps Script) → <b>New deployment</b></li>'
    + '<li>กดรูปเฟือง ⚙️ ข้าง "Select type" → เลือก <b>Web app</b></li>'
    + '<li>ช่อง <b>Who has access</b> เลือก <b>Anyone</b> (สำคัญมาก)</li>'
    + '<li>กด <b>Deploy</b> → <b>Authorize access</b> → เลือกบัญชีตัวเอง</li>'
    + '<li>ถ้าขึ้นเตือนสีเหลือง กด <b>Advanced</b> → <b>Go to ... (unsafe)</b> → <b>Allow</b></li>'
    + '<li>กลับมาที่ Sheets → เมนู <b>💪 แอปสุขภาพ → 3️⃣ รับลิงก์เชื่อมแอป</b></li>'
    + '</ol>'
    + '<div style="background:#eaf3ed;border-radius:10px;padding:10px;margin-top:8px">'
    + '💾 <b>แนะนำอย่างยิ่ง:</b> หลังตั้งค่าเสร็จ กดเมนู <b>⏰ ตั้งสำรองอัตโนมัติทุกวัน</b> อีกครั้ง '
    + 'ระบบจะสำรองข้อมูลลงไดรฟ์ของคุณทุกคืน เก็บย้อนหลัง 30 ชุด กู้คืนได้ทันทีถ้าเกิดอะไรขึ้น</div></div>';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(html).setWidth(460).setHeight(420), 'ตั้งค่าครั้งแรก');
}

function showDeployHelp() { firstSetup(); }

function showPin() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('PIN ปัจจุบันคือ ' + getPin(),
    'ถ้าอยากเปลี่ยน พิมพ์ PIN ใหม่แล้วกด OK (เว้นว่าง = ไม่เปลี่ยน)', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() === ui.Button.OK) {
    var v = r.getResponseText().trim();
    if (v) {
      PropertiesService.getDocumentProperties().setProperty('PIN', v);
      ui.alert('เปลี่ยน PIN เป็น ' + v + ' แล้ว — อย่าลืมกด "รับลิงก์เชื่อมแอป" ใหม่');
    }
  }
}

function showLink() {
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  var ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('ยังไม่ได้ Deploy\\n\\nกรุณาทำตามขั้นตอนในเมนู "2️⃣ วิธี Deploy" ให้เสร็จก่อน แล้วค่อยกดเมนูนี้อีกครั้ง');
    return;
  }
  var pin = getPin();
  var quick = '';
  if (APP_URL) {
    var payload = Utilities.base64Encode(
      Utilities.newBlob(JSON.stringify({ u: url, p: pin })).getBytes(), Utilities.Charset.UTF_8);
    quick = APP_URL + (APP_URL.indexOf('#') >= 0 ? '' : '#s=' + payload);
  }
  var html = '<div style="font-family:sans-serif;font-size:14px;line-height:1.8">'
    + (quick
      ? '<h3 style="margin:0 0 8px">📲 เชื่อมแอปแบบกดทีเดียว</h3>'
        + '<p>ส่งลิงก์นี้เข้า LINE ตัวเอง แล้วเปิดบนมือถือ — แอปจะเชื่อมให้อัตโนมัติ</p>'
        + '<textarea id="q" style="width:100%;height:70px;font-size:12px">' + quick + '</textarea>'
        + '<button onclick="document.getElementById(\\'q\\').select();document.execCommand(\\'copy\\');this.textContent=\\'คัดลอกแล้ว ✅\\'" '
        + 'style="padding:9px 14px;margin-top:8px;border:0;border-radius:8px;background:#0d9488;color:#fff;font-size:14px;cursor:pointer">📋 คัดลอกลิงก์</button><hr>'
      : '')
    + '<b>หรือกรอกเองในแอป (แท็บ ⚙️ ตั้งค่า)</b><br>'
    + 'ลิงก์ Web App:<br><textarea style="width:100%;height:56px;font-size:12px">' + url + '</textarea>'
    + 'PIN: <b style="font-size:18px;color:#0d9488">' + pin + '</b>'
    + '<p style="color:#888;font-size:12px">⚠️ ลิงก์นี้เข้าถึงข้อมูลสุขภาพของคุณได้ ส่งให้ตัวเองเท่านั้น</p></div>';
  ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(480).setHeight(430), 'ลิงก์เชื่อมแอป');
}


var COLS = {
  Exercise: ['ts','date','type','min','km','hr','hrmax','z1','z2','z3','z4','z5','pct','load','fat','kcal','intensity','note'],
  Food:     ['ts','date','time','meal','name','qty','unit','kcal','protein','carb','fat','fiber','sodium','sat','sugar','alc'],
  Sleep:    ['ts','date','bed','wake','hours','quality','wakeups','awake','rem','core','deep','stageScore','note'],
  Workout:  ['ts','date','group','ex','sets','vol','top','e1rm','min','kcal','note'],
  Body:     ['ts','date','w','fat','waist','chest','arm','thigh','hip','note'],
  Photo:    ['ts','date','img','note'],
  MyFood:   ['ts','name','kcal','protein','carb','fat','fiber','sodium','sat','sugar','alc','unit'],
  Water:    ['date','ml'],
  User:     ['key','value']
};

function doGet(e) {
  // ไม่ส่งข้อมูลใดๆ ผ่าน GET เพื่อความปลอดภัย
  return json({ ok: true, msg: 'สุขภาพ Tracker API พร้อมใช้งาน' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var got = true;
  try { lock.waitLock(25000); } catch (err) { got = false; }
  if (!got) return json({ ok: false, error: 'ระบบกำลังยุ่ง ลองใหม่อีกครั้ง' });
  try {
    var q = JSON.parse(e.postData.contents);
    var pin = getPin();
    if (pin && String(q.key || '') !== pin) {
      return json({ ok: false, error: 'PIN ไม่ถูกต้อง' });
    }
    var out;
    switch (q.action) {
      case 'ping':   out = { ok: true }; break;
      case 'getAll': out = getAll(); break;
      case 'add':    out = addRow(q.sheet, q.row, q.unique); break;
      case 'del':    out = delRow(q.sheet, q.ts); break;
      case 'water':  out = setWater(q.date, q.ml); break;
      case 'user':   out = setUser(q.user); break;
      default:       out = { ok: false, error: 'unknown action' };
    }
    return json(out);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (err2) {}
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function sh(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(COLS[name]);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, COLS[name].length).setFontWeight('bold').setBackground('#e8eaed');
  }
  if (s.getLastRow() === 0) s.appendRow(COLS[name]);
  // ถ้าเวอร์ชันใหม่มีคอลัมน์เพิ่ม ให้เขียนหัวตารางใหม่
  var head = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), COLS[name].length)).getValues()[0];
  if (String(head.slice(0, COLS[name].length)) !== String(COLS[name])) {
    s.getRange(1, 1, 1, COLS[name].length).setValues([COLS[name]])
      .setFontWeight('bold').setBackground('#e8eaed');
  }
  return s;
}

function readSheet(name) {
  var s = sh(name);
  if (s.getLastRow() < 2) return [];
  var v = s.getRange(2, 1, s.getLastRow() - 1, COLS[name].length).getValues();
  return v.map(function (r) {
    var o = {};
    COLS[name].forEach(function (c, i) {
      var val = r[i];
      if (Object.prototype.toString.call(val) === '[object Date]') {
        if (c === 'date') val = fmt(val);
        else if (c === 'bed' || c === 'wake' || c === 'time')      // ชีตเผลอแปลงเวลาเป็นวันที่
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
        else val = fmt(val);
      }
      if (typeof val === 'string' && val.charAt(0) === "'") val = val.substring(1);
      o[c] = val;
    });
    return o;
  }).filter(function (o) { return o.date || o.key || o.name; });
}

function fmt(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* แสดงวันที่แบบไทย ว/ด/ปี พ.ศ. */
function thai_(key) {
  var p = String(key).split('-');
  if (p.length !== 3) return String(key);
  return p[2] + '/' + p[1] + '/' + (Number(p[0]) + 543);
}

function getAll() {
  var water = {};
  readSheet('Water').forEach(function (r) { if (r.date) water[String(r.date)] = Number(r.ml) || 0; });
  var user = {};
  readSheet('User').forEach(function (r) {
    var v = r.value;
    user[r.key] = (r.key === 'sex' || r.key === 'zmodel') ? String(v) : Number(v);
  });
  return {
    ok: true,
    ex: readSheet('Exercise'),
    food: readSheet('Food'),
    sleep: readSheet('Sleep'),
    wo: readSheet('Workout'),
    body: readSheet('Body'),
    photo: readSheet('Photo'),
    myfood: readSheet('MyFood'),
    water: water,
    user: (user.w ? user : null)
  };
}

/* กันชีตแปลงข้อความของเราเอง — "23:00" จะกลายเป็นเวลา, "=..." จะกลายเป็นสูตร
   ใส่ ' นำหน้า = เก็บเป็นข้อความล้วน (ตอนอ่านกลับ Sheets ตัด ' ให้เอง) */
function cv_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return fmt(v);
  var s = String(v);
  return s.charAt(0) === "'" ? s.substring(1) : s;
}

function cellSafe_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return v;
  if (v === '') return '';
  if (/^[=+\\-@]/.test(v) || /^\\d{1,2}:\\d{2}(:\\d{2})?$/.test(v) || /^\\d{4}-\\d{2}-\\d{2}/.test(v)) return "'" + v;
  return v;
}

/* มีแถวที่ ts นี้อยู่แล้วหรือยัง — กันข้อมูลซ้ำตอนคิวออฟไลน์ส่งใหม่ */
function hasTs_(s, name, ts) {
  var c = COLS[name].indexOf('ts');
  if (c < 0) return false;
  var last = s.getLastRow();
  if (last < 2) return false;
  var v = s.getRange(2, c + 1, last - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (cv_(v[i][0]) === String(ts)) return true;
  return false;
}

function addRow(name, row, unique) {
  var s = sh(name);
  // ถ้าเป็นข้อมูลแบบ 1 วัน 1 รายการ (การนอน) ให้ลบของเดิมวันนั้นก่อน
  if (unique === 'date') delByDate(name, row.date);
  // ส่งซ้ำจากคิวออฟไลน์ — ถ้ามี ts เดิมอยู่แล้วไม่ต้องเพิ่มใหม่
  else if (row && row.ts && hasTs_(s, name, row.ts)) return { ok: true, dup: true };
  s.appendRow(COLS[name].map(function (c) {
    return cellSafe_(row[c]);
  }));
  return { ok: true };
}

function delRow(name, ts) {
  var s = sh(name);
  if (s.getLastRow() < 2) return { ok: true };
  var col = s.getRange(2, 1, s.getLastRow() - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (cv_(col[i][0]) === String(ts)) s.deleteRow(i + 2);
  }
  return { ok: true };
}

function delByDate(name, date) {
  if (COLS[name].indexOf('date') < 0) return;              // ชีตนี้ไม่มีคอลัมน์วันที่
  var s = sh(name);
  if (s.getLastRow() < 2) return;
  var idx = COLS[name].indexOf('date') + 1;
  var col = s.getRange(2, idx, s.getLastRow() - 1, 1).getValues();
  for (var i = col.length - 1; i >= 0; i--) {
    if (cv_(col[i][0]) === String(date)) s.deleteRow(i + 2);
  }
}

function setWater(date, ml) {
  var s = sh('Water');
  var last = s.getLastRow();
  if (last >= 2) {
    var col = s.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      if (cv_(col[i][0]) === String(date)) {
        s.getRange(i + 2, 2).setValue(Number(ml) || 0);
        return { ok: true };
      }
    }
  }
  s.appendRow([cellSafe_(date), Number(ml) || 0]);
  return { ok: true };
}

function setUser(user) {
  var s = sh('User');
  var last = s.getLastRow();
  var rows = last > 1 ? s.getRange(2, 1, last - 1, 2).getValues() : [];
  var idx = {};
  rows.forEach(function (r, i) { if (r[0] !== '') idx[cv_(r[0])] = i + 2; });
  var add = [];
  Object.keys(user).forEach(function (k) {
    if (idx[k]) s.getRange(idx[k], 2).setValue(cellSafe_(user[k]));   // มีอยู่แล้ว → อัปเดตเฉพาะคีย์นั้น
    else add.push([k, cellSafe_(user[k])]);
  });
  if (add.length) s.getRange(s.getLastRow() + 1, 1, add.length, 2).setValues(add);
  return { ok: true };
}

/*************************************************************
 *  สำรองข้อมูลอัตโนมัติลง Google Drive (แนะนำให้เปิด)
 *  ตั้ง Trigger: ⏰ Triggers → Add Trigger → backupToDrive
 *                → Time-driven → Day timer → เลือกเวลากลางคืน
 *  ระบบจะเก็บไฟล์สำรองย้อนหลัง 30 ชุดในโฟลเดอร์ "HealthTracker Backups"
 *  ในไดรฟ์ของคุณเอง (ไม่มีใครเห็นนอกจากคุณ)
 *************************************************************/
var BACKUP_FOLDER = 'HealthTracker Backups';
var BACKUP_KEEP = 30;

function backupFolder_() {
  var it = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

function snapshot_() {
  var out = { app: 'health-tracker', v: 2, at: new Date().toISOString() };
  Object.keys(COLS).forEach(function (name) { out[name] = readSheet(name); });
  return out;
}

function backupToDrive() {
  var folder = backupFolder_();
  var stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd_HHmm');
  var json = JSON.stringify(snapshot_());
  folder.createFile('health-backup-' + stamp + '.json', json, 'application/json');

  // ลบไฟล์เก่าเกินโควตาที่ตั้งไว้
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); files.push({ f: f, t: f.getDateCreated().getTime() }); }
  files.sort(function (a, b) { return b.t - a.t; });
  for (var i = BACKUP_KEEP; i < files.length; i++) files[i].f.setTrashed(true);

  return { ok: true, count: files.length + 1, kb: Math.round(json.length / 1024) };
}

function backupNow() {
  var r = backupToDrive();
  SpreadsheetApp.getUi().alert(
    '✅ สำรองข้อมูลเรียบร้อย\\n\\nขนาด ' + r.kb + ' KB\\n' +
    'เก็บไว้ในโฟลเดอร์ Drive ชื่อ "' + BACKUP_FOLDER + '"\\n' +
    'ระบบเก็บย้อนหลังสูงสุด ' + BACKUP_KEEP + ' ชุด');
}

/** กู้คืนจากไฟล์สำรองล่าสุดใน Drive (เขียนทับข้อมูลปัจจุบันทั้งหมด) */
function restoreLatestBackup() {
  var ui = SpreadsheetApp.getUi();
  var folder = backupFolder_();
  var files = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); files.push({ f: f, t: f.getDateCreated().getTime() }); }
  if (!files.length) { ui.alert('ยังไม่มีไฟล์สำรองในโฟลเดอร์ "' + BACKUP_FOLDER + '"'); return; }
  files.sort(function (a, b) { return b.t - a.t; });
  var newest = files[0].f;

  var res = ui.alert('กู้คืนข้อมูล',
    'จะกู้คืนจากไฟล์:\\n' + newest.getName() +
    '\\n\\n⚠️ ข้อมูลปัจจุบันในไฟล์นี้จะถูกเขียนทับทั้งหมด ต้องการทำต่อไหม?',
    ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;

  var data = JSON.parse(newest.getBlob().getDataAsString());
  Object.keys(COLS).forEach(function (name) {
    var rows = data[name]; if (!rows) return;
    var s = sh(name);
    if (s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1);
    if (!rows.length) return;
    var values = rows.map(function (o) {
      return COLS[name].map(function (col) { return (o[col] === undefined || o[col] === null) ? '' : o[col]; });
    });
    s.getRange(2, 1, values.length, COLS[name].length).setValues(values);
  });
  ui.alert('✅ กู้คืนเรียบร้อย\\n\\nเปิดแอปแล้วดึงข้อมูลใหม่ได้เลย');
}

/** ดูสถานะการสำรอง */
function backupStatus() {
  var folder = backupFolder_();
  var files = [], it = folder.getFiles(), total = 0;
  while (it.hasNext()) { var f = it.next(); files.push({ n: f.getName(), t: f.getDateCreated() }); total += f.getSize(); }
  files.sort(function (a, b) { return b.t - a.t; });
  var triggers = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'backupToDrive'; });
  var msg = 'โฟลเดอร์: ' + BACKUP_FOLDER + '\\n'
    + 'จำนวนไฟล์สำรอง: ' + files.length + ' ชุด (รวม ' + Math.round(total / 1024) + ' KB)\\n'
    + 'ล่าสุด: ' + (files.length ? Utilities.formatDate(files[0].t, 'Asia/Bangkok', 'd MMM yyyy HH:mm') : '— ยังไม่เคยสำรอง —') + '\\n\\n'
    + 'สำรองอัตโนมัติ: ' + (triggers.length ? '✅ เปิดอยู่' : '❌ ยังไม่ได้ตั้ง — กดเมนู "ตั้งสำรองอัตโนมัติทุกวัน"');
  SpreadsheetApp.getUi().alert('สถานะการสำรองข้อมูล', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/** ตั้ง trigger สำรองอัตโนมัติทุกวันตอนตี 2 (กดครั้งเดียวพอ) */
function setupAutoBackup() {
  var ui = SpreadsheetApp.getUi();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'backupToDrive') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('backupToDrive').timeBased().atHour(2).everyDays(1).create();
  backupToDrive();
  ui.alert('✅ ตั้งสำรองอัตโนมัติทุกวันตอนตี 2 แล้ว\\n\\nและสำรองให้ 1 ชุดทันทีเรียบร้อย');
}

/*************************************************************
 *  แจ้งเตือนทางอีเมล (ไม่บังคับ)
 *  วิธีเปิดใช้: ในหน้า Apps Script → เมนูซ้าย ⏰ Triggers → Add Trigger
 *    - ฟังก์ชัน: dailyReminder   → Time-driven → Day timer → เลือกช่วงเวลา
 *    - ฟังก์ชัน: weeklySummary   → Time-driven → Week timer → เลือกวัน/เวลา
 *  อีเมลจะส่งไปที่บัญชี Google ที่เป็นเจ้าของไฟล์นี้
 *************************************************************/
function dailyReminder() {
  var d = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  var food = readSheet('Food').filter(function (r) { return String(r.date) === d; });
  var ex   = readSheet('Exercise').filter(function (r) { return String(r.date) === d; });
  var wo   = readSheet('Workout').filter(function (r) { return String(r.date) === d; });
  var sl   = readSheet('Sleep').filter(function (r) { return String(r.date) === d; });
  var kcal = food.reduce(function (a, b) { return a + (Number(b.kcal) || 0); }, 0);
  var miss = [];
  if (!food.length) miss.push('อาหาร');
  if (!ex.length && !wo.length) miss.push('ออกกำลังกาย');
  if (!sl.length) miss.push('การนอน');
  var msg = miss.length
    ? 'วันนี้ยังไม่ได้บันทึก: ' + miss.join(' / ') + '\\n\\nกินไปแล้ว ' + kcal + ' kcal'
    : 'วันนี้บันทึกครบทั้ง 3 ด้านแล้ว 🎉 กินไป ' + kcal + ' kcal';
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '📋 เตือนบันทึกสุขภาพ ' + thai_(d), msg);
}

function weeklySummary() {
  var tz = 'Asia/Bangkok', now = new Date();
  var keys = [];
  for (var i = 6; i >= 0; i--) {
    var dd = new Date(now.getTime() - i * 86400000);
    keys.push(Utilities.formatDate(dd, tz, 'yyyy-MM-dd'));
  }
  var inK = 0, outK = 0, min = 0, slH = 0, slN = 0, na = 0, fdDays = {};
  readSheet('Food').forEach(function (r) {
    if (keys.indexOf(String(r.date)) < 0) return;
    inK += Number(r.kcal) || 0; na += Number(r.sodium) || 0; fdDays[r.date] = 1;
  });
  readSheet('Exercise').forEach(function (r) {
    if (keys.indexOf(String(r.date)) < 0) return;
    outK += Number(r.kcal) || 0; min += Number(r.min) || 0;
  });
  readSheet('Sleep').forEach(function (r) {
    if (keys.indexOf(String(r.date)) < 0) return;
    slH += Number(r.hours) || 0; slN++;
  });
  var nDays = Object.keys(fdDays).length || 1;
  var body = 'สรุป 7 วันล่าสุด (' + thai_(keys[0]) + ' ถึง ' + thai_(keys[6]) + ')\\n\\n'
    + '🍽️ กินเฉลี่ย ' + Math.round(inK / nDays) + ' kcal/วัน (บันทึก ' + nDays + '/7 วัน)\\n'
    + '🧂 โซเดียมเฉลี่ย ' + Math.round(na / nDays) + ' มก./วัน (ไม่ควรเกิน 2,000)\\n'
    + '🏃 ออกกำลังรวม ' + min + ' นาที · เผา ' + outK + ' kcal\\n'
    + '😴 นอนเฉลี่ย ' + (slN ? (slH / slN).toFixed(1) : '-') + ' ชม./คืน (บันทึก ' + slN + '/7 คืน)\\n\\n'
    + 'เปิดแอปเพื่อดูรายละเอียดและกราฟ';
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '📊 สรุปสุขภาพรายสัปดาห์', body);
}

/* สร้างชีตทั้งหมด (เรียกจากเมนูตั้งค่าครั้งแรก) */
function setupSheets() { firstSetup(); }
`;

// ฐานข้อมูลอาหารไทย: [ชื่อ, กิโลแคลอรี่, โปรตีน(g), คาร์บ(g), ไขมัน(g), หน่วย/1 เสิร์ฟ, หมวด,
//                    ใยอาหาร(g), โซเดียม(mg), ไขมันอิ่มตัว(g), น้ำตาลอิสระ(g), แอลกอฮอล์(g), โพแทสเซียม(mg)]
// โซเดียมของเมนู "น้ำ" (ก๋วยเตี๋ยว/ก๋วยจั๊บ/บะหมี่/เย็นตาโฟ/ราเมง) = ค่าเมื่อ "ซดน้ำหมดชาม"
// อ้างอิงผลวัดของกรมอนามัย 2568 (ชามละ 500 ก.) — ในแอปผู้ใช้เลือกได้ว่าซดแค่ไหน แล้วคูณลดให้
const FOODS = [
// ===== ข้าว/เส้น จานเดียว =====
["ข้าวเหนียว 1 ห่อ",280,5,62,0.6,"1 ห่อ (150 ก.)","จานเดียว",1.5,5,0.2,0,0,60],
["ข้าวกล้อง",220,5,45,1.8,"1 ทัพพี (150 ก.)","จานเดียว",2.7,5,0.4,0,0,130],
["ข้าวผัด",560,20,70,22,"1 จาน (350 ก.)","จานเดียว",2.5,1100,6,4,0,450],
["ข้าวผัดกะเพราหมูสับไข่ดาว",680,28,72,32,"1 จาน (400 ก.)","จานเดียว",3,1300,9,4,0,600],
["ข้าวกะเพราหมูสับ",560,25,68,20,"1 จาน (400 ก.)","จานเดียว",3,1200,6.5,4,0,550],
["ข้าวกะเพราไก่",520,28,66,16,"1 จาน (400 ก.)","จานเดียว",3,1200,4.5,4,0,550],
["ข้าวกะเพราหมูกรอบ",720,24,70,38,"1 จาน (400 ก.)","จานเดียว",3,1350,13,5,0,600],
["ข้าวมันไก่",600,28,72,22,"1 จาน (400 ก.)","จานเดียว",1.5,1184,7,5,0,500],
["ข้าวมันไก่ทอด",700,28,74,32,"1 จาน (400 ก.)","จานเดียว",1.5,1250,10,5,0,500],
["ข้าวหมูแดง",560,24,80,16,"1 จาน (400 ก.)","จานเดียว",2,1250,5,18,0,500],
["ข้าวหมูกรอบ",680,24,72,34,"1 จาน (400 ก.)","จานเดียว",2,1300,12,6,0,520],
["ข้าวขาหมู",700,30,75,30,"1 จาน (420 ก.)","จานเดียว",3,1205,11,10,0,620],
["ข้าวหมกไก่",620,26,78,22,"1 จาน (400 ก.)","จานเดียว",3,1200,7,6,0,550],
["ข้าวคลุกกะปิ",580,18,78,20,"1 จาน (380 ก.)","จานเดียว",4,1500,6,16,0,600],
["ข้าวไข่เจียว",520,16,60,24,"1 จาน (330 ก.)","จานเดียว",1,700,6,1,0,300],
["ข้าวไข่ดาว",400,12,56,14,"1 จาน (300 ก.)","จานเดียว",1,500,3.6,0,0,250],
["ข้าวหน้าเป็ด",620,28,76,22,"1 จาน (400 ก.)","จานเดียว",2,1300,7,10,0,550],
["ข้าวผัดอเมริกัน",900,28,90,48,"1 จาน (450 ก.)","จานเดียว",4,1900,15,12,0,800],
["ข้าวผัดปู",620,20,74,26,"1 จาน (350 ก.)","จานเดียว",2.5,1150,6.5,4,0,480],
["ข้าวผัดกุ้ง",580,24,72,22,"1 จาน (350 ก.)","จานเดียว",2.5,1150,5.5,4,0,480],
["ข้าวราดแกงเขียวหวานไก่",600,24,70,24,"1 จาน (420 ก.)","จานเดียว",4,1200,15,8,0,600],
["ข้าวราดผัดกระเพราทะเล",540,26,68,18,"1 จาน (400 ก.)","จานเดียว",3,1300,4.5,4,0,550],
["ข้าวผัดพริกแกงหมู",640,26,68,29,"1 จาน (380 ก.)","จานเดียว",3.5,1300,10,6,0,580],
["ข้าวหน้าไก่เทอริยากิ",620,30,80,18,"1 จาน (400 ก.)","จานเดียว",2,1400,4.5,18,0,550],
["ข้าวแกงกะหรี่ญี่ปุ่นหมูทอด",850,28,100,36,"1 จาน (450 ก.)","จานเดียว",5,1700,13,14,0,750],
["ข้าวหน้าหมูทอด (ทงคัตสึ)",800,30,90,34,"1 จาน (430 ก.)","จานเดียว",3,1300,11,12,0,650],
["ข้าวหน้าเนื้อ (กิวด้ง)",650,26,85,22,"1 ชาม (400 ก.)","จานเดียว",2.5,1400,8,16,0,550],
["ผัดไทย",550,18,72,20,"1 จาน (300 ก.)","จานเดียว",3.5,1150,4.5,18,0,500],
["ผัดไทยกุ้งสด",600,24,72,22,"1 จาน (320 ก.)","จานเดียว",3.5,1200,5,18,0,550],
["ผัดซีอิ๊ว",560,18,70,22,"1 จาน (350 ก.)","จานเดียว",3,1352,6,8,0,500],
["ราดหน้าหมู",520,20,66,18,"1 จาน (400 ก.)","จานเดียว",3.5,1400,5.5,8,0,600],
["ผัดกระเพราหมูสับ (ไม่รวมข้าว)",320,24,8,20,"1 จาน (170 ก.)","จานเดียว",2,1150,6.5,3,0,480],
["ผัดมาม่า",480,12,62,18,"1 จาน (300 ก.)","จานเดียว",3,1500,7,5,0,350],
["สปาเก็ตตี้คาโบนาร่า",700,24,72,34,"1 จาน (330 ก.)","จานเดียว",4,1000,16,5,0,450],
["สปาเก็ตตี้ผัดขี้เมา",560,20,70,20,"1 จาน (330 ก.)","จานเดียว",4,1200,5,6,0,500],
["ข้าวต้มหมู",280,16,40,5,"1 ชาม (450 ก.)","จานเดียว",1.5,800,1.8,2,0,400],
["โจ๊กหมู",300,16,42,7,"1 ชาม (400 ก.)","จานเดียว",1.5,900,2.5,2,0,350],
["ข้าวเปล่า+ไข่ต้ม",320,10,53,7,"1 ชุด (250 ก.)","จานเดียว",1,130,2.2,0,0,220],

// ===== ก๋วยเตี๋ยว/ซุป =====
["ก๋วยเตี๋ยวน้ำหมู",350,18,45,10,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",2.5,1900,3.6,4,0,450],
["ก๋วยเตี๋ยวน้ำตก",400,20,45,14,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",3,2200,5,5,0,520],
["ก๋วยเตี๋ยวต้มยำ",450,20,50,18,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",3,2100,6,12,0,550],
["ก๋วยเตี๋ยวเรือ",380,20,44,12,"1 ชาม (350 ก.)","ก๋วยเตี๋ยว",3,2000,4.3,6,0,500],
["ก๋วยเตี๋ยวแห้ง",420,20,50,16,"1 ชาม (250 ก.)","ก๋วยเตี๋ยว",2.5,1300,5.5,5,0,470],
["เย็นตาโฟ",400,18,55,12,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",4,2500,4,14,0,550],
["ก๋วยเตี๋ยวเป็ดตุ๋น",450,24,50,16,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",2.5,1950,5.5,6,0,520],
["บะหมี่หมูแดง",420,20,55,13,"1 ชาม (350 ก.)","ก๋วยเตี๋ยว",2.5,1480,4.5,9,0,430],
["บะหมี่เกี๊ยวกุ้ง",400,20,52,12,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",2.5,1700,4,5,0,420],
["ก๋วยจั๊บน้ำข้น",480,18,50,22,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",2,1900,8,3,0,480],
["ราเมง",550,24,65,20,"1 ชาม (550 ก.)","ก๋วยเตี๋ยว",4,2300,7,6,0,600],
["ก๋วยเตี๋ยวไก่มะระ",320,20,38,8,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",3,1700,2.4,3,0,500],
["สุกี้น้ำ",320,22,30,10,"1 ชาม (450 ก.)","ก๋วยเตี๋ยว",4,1400,3.5,8,0,700],
["สุกี้แห้ง",450,24,40,20,"1 จาน (300 ก.)","ก๋วยเตี๋ยว",4,1400,6.5,9,0,700],
["มาม่าต้มยำ (ซอง)",320,7,45,12,"1 ซอง (60 ก. เส้นแห้ง)","ก๋วยเตี๋ยว",2,1500,6,5,0,180],
["ต้มยำกุ้งน้ำใส",180,20,10,6,"1 ถ้วย (250 ก.)","ก๋วยเตี๋ยว",2,1200,1.8,5,0,520],
["ต้มยำกุ้งน้ำข้น",320,20,14,20,"1 ถ้วย (250 ก.)","ก๋วยเตี๋ยว",2,1300,11,6,0,550],
["ต้มจืดหมูสับ",150,14,8,6,"1 ถ้วย (250 ก.)","ก๋วยเตี๋ยว",1.5,800,2.2,2,0,400],
["แกงจืดเต้าหู้หมูสับ",160,14,9,7,"1 ถ้วย (250 ก.)","ก๋วยเตี๋ยว",1.5,850,2.4,2,0,420],

// ===== กับข้าว/แกง =====
["แกงเขียวหวานไก่",300,18,12,20,"1 ถ้วย (250 ก.)","กับข้าว",3,1000,13,6,0,480],
["แกงเผ็ดหมู",320,18,12,22,"1 ถ้วย (250 ก.)","กับข้าว",3,1000,14,6,0,480],
["แกงส้มผักรวมกุ้ง",180,16,14,6,"1 ถ้วย (250 ก.)","กับข้าว",3.5,1130,1.2,8,0,550],
["แกงมัสมั่นไก่",380,20,20,25,"1 ถ้วย (250 ก.)","กับข้าว",3,1000,15,10,0,550],
["พะแนงหมู",350,20,10,26,"1 ถ้วย (220 ก.)","กับข้าว",2,1000,16,5,0,450],
["ต้มข่าไก่",280,16,10,20,"1 ถ้วย (250 ก.)","กับข้าว",1.5,1000,13,4,0,450],
["ผัดผักบุ้งไฟแดง",120,4,10,8,"1 จาน (150 ก.)","กับข้าว",3,800,1.6,3,0,400],
["ผัดผักรวม",130,5,12,8,"1 จาน (150 ก.)","กับข้าว",3.5,700,1.6,4,0,420],
["ผัดคะน้าหมูกรอบ",320,14,12,25,"1 จาน (180 ก.)","กับข้าว",3,1050,8.5,3,0,450],
["ไข่เจียว",220,12,2,18,"1 ฟอง (60 ก. ทอดแล้ว)","กับข้าว",0,400,4.5,0,0,160],
["ไข่ต้ม",78,6.3,0.6,5.3,"1 ฟอง (50 ก.)","กับข้าว",0,62,1.6,0.6,0,63],   // ค่าละเอียดจาก USDA 173424
["ไข่ตุ๋น",130,10,3,8,"1 ถ้วย (150 ก.)","กับข้าว",0.2,500,2.5,1,0,180],
["หมูทอดกระเทียม",380,26,6,28,"1 จาน (150 ก.)","กับข้าว",0.5,750,9.5,2,0,450],
["ไก่ทอด",300,24,12,18,"1 ชิ้นใหญ่ (120 ก.)","กับข้าว",0.5,650,4.5,1,0,320],
["ไก่ย่าง",240,30,3,12,"1/4 ตัว (150 ก.)","กับข้าว",0.2,600,3.4,2,0,400],
["ปลาทอด",280,28,4,17,"1 ตัวกลาง (150 ก.)","กับข้าว",0,500,3.5,0,0,450],
["ปลานึ่งมะนาว",220,32,6,8,"1 จาน (250 ก.)","กับข้าว",1,1000,2,3,0,600],
["ปลาเผา",250,35,2,11,"1 ตัว (200 ก. เนื้อ)","กับข้าว",0,400,2.5,0,0,620],
["หมูปิ้ง",90,7,4,5,"1 ไม้ (30 ก.)","กับข้าว",0,270,2.4,3,0,110],   // คำนวณจากส่วนผสม: หมู 35 ก. + น้ำตาล/นมข้น/กะทิ + น้ำปลา-ซีอิ๊ว
["ไก่ปิ้ง",80,9,2,4,"1 ไม้ (30 ก.)","กับข้าว",0,220,1.2,1.5,0,100],   // คำนวณจากส่วนผสม: ไก่ 35 ก. + น้ำตาลหมัก + ซีอิ๊ว
["ลูกชิ้นปิ้ง",120,6,10,6,"1 ไม้ 5 ลูก (60 ก.)","กับข้าว",0.3,700,2.4,4,0,120],
["ไส้กรอกอีสาน",180,8,10,12,"1 ไม้ (60 ก.)","กับข้าว",0.5,800,4.5,2,0,180],
["ส้มตำไทย",120,4,20,3,"1 จาน (200 ก.)","กับข้าว",4,900,0.6,14,0,450],
["ส้มตำปูปลาร้า",150,8,18,5,"1 จาน (200 ก.)","กับข้าว",4,1300,1,12,0,500],
["ลาบหมู",280,24,8,17,"1 จาน (150 ก.)","กับข้าว",2,950,6,2,0,480],
["น้ำตกหมู",300,26,8,18,"1 จาน (150 ก.)","กับข้าว",2,950,6.5,3,0,500],
["ยำวุ้นเส้น",250,14,28,9,"1 จาน (200 ก.)","กับข้าว",2,1000,2.5,8,0,400],
["ยำทะเล",220,26,14,6,"1 จาน (200 ก.)","กับข้าว",2,1100,1.2,8,0,550],
["สลัดผัก (น้ำสลัดใส)",120,4,12,6,"1 จาน (200 ก.)","กับข้าว",3,400,1,7,0,400],
["สลัดอกไก่",280,30,12,12,"1 จาน (250 ก.)","กับข้าว",3,700,2.5,6,0,650],
["เต้าหู้ทอด",180,12,6,12,"1 จานเล็ก (100 ก.)","กับข้าว",1.5,350,1.8,1,0,250],
["ปอเปี๊ยะทอด",180,5,20,9,"2 ชิ้น (80 ก.)","กับข้าว",1.5,350,3,3,0,150],
["หมูสามชั้นทอด",420,20,2,38,"100 กรัม","วัตถุดิบ",0,300,14,0,0,280],
["กุ้งเผา",120,24,1,2,"4 ตัว (120 ก. ทั้งเปลือก)","กับข้าว",0,300,0.4,0,0,300],
["หมูกระทะ (ต่อมื้อ)",900,50,40,60,"1 มื้อ (600 ก.)","กับข้าว",5,2500,21,14,0,1100],
["ชาบู (ต่อมื้อ)",700,45,45,35,"1 มื้อ (700 ก.)","กับข้าว",6,2200,13,12,0,1200],
["ปิ้งย่างเกาหลี (ต่อมื้อ)",950,55,45,62,"1 มื้อ (600 ก.)","กับข้าว",5,2500,22,18,0,1200],

// ===== ฟาสต์ฟู้ด/ขนมปัง =====
["แฮมเบอร์เกอร์",550,25,45,30,"1 ชิ้น (220 ก.)","ฟาสต์ฟู้ด",3,900,11,8,0,400],
["เฟรนช์ฟรายส์",340,4,44,17,"1 ห่อกลาง (115 ก.)","ฟาสต์ฟู้ด",4,350,2.6,0,0,750],
["พิซซ่า",280,12,32,11,"1 ชิ้น (110 ก.)","ฟาสต์ฟู้ด",2,640,5,4,0,200],
["ไก่ทอด KFC",290,20,12,18,"1 ชิ้น (110 ก.)","ฟาสต์ฟู้ด",0.5,800,4,0,0,250],
["แซนด์วิชแฮมชีส",320,15,32,14,"1 ชิ้น (130 ก.)","ฟาสต์ฟู้ด",2,800,6,4,0,250],
["ขนมปังปิ้งเนยน้ำตาล",250,5,32,11,"1 แผ่น (60 ก.)","ฟาสต์ฟู้ด",1.5,300,6,12,0,80],
["ครัวซองต์",270,6,30,14,"1 ชิ้น (60 ก.)","ฟาสต์ฟู้ด",1.5,320,8,6,0,80],
["โดนัท",250,4,32,12,"1 ชิ้น (60 ก.)","ฟาสต์ฟู้ด",1,250,5.5,14,0,70],
["ซาลาเปาไส้หมูสับ",220,9,32,6,"1 ลูก (90 ก.)","ฟาสต์ฟู้ด",1,400,2,6,0,150],
["ปาท่องโก๋",90,2,10,5,"1 คู่ (25 ก.)","ฟาสต์ฟู้ด",0.4,150,2.2,0,0,30],
["ข้าวเหนียวหมูปิ้ง",370,12,60,9,"1 ชุด (200 ก.)","ฟาสต์ฟู้ด",1.5,700,3,8,0,220],
["ข้าวเหนียวไก่ทอด",520,22,62,20,"1 ชุด (250 ก.)","ฟาสต์ฟู้ด",1.5,800,5,3,0,320],

// ===== ผลไม้ =====
["กล้วยน้ำว้า 1 ผล",100,1.2,25,0.3,"1 ผล (70 ก. เนื้อ)","ผลไม้",2.6,1,0.1,0,0,350],
["แอปเปิ้ล",80,0.4,21,0.3,"1 ผล (180 ก.)","ผลไม้",3.6,1,0.1,0,0,160],
["ส้ม",60,1,15,0.2,"1 ผล (130 ก.)","ผลไม้",3,0,0,0,0,230],
["มะม่วงสุก 1 ผล",150,1,38,0.5,"1 ผล (200 ก. เนื้อ)","ผลไม้",4,3,0.1,0,0,350],
["แตงโม",50,1,12,0.2,"1 จานเล็ก (200 ก.)","ผลไม้",0.6,2,0,0,0,170],
["สับปะรด",60,0.6,15,0.1,"1 จานเล็ก (150 ก.)","ผลไม้",1.6,2,0,0,0,150],
["องุ่น",70,0.7,18,0.2,"15 ผล (100 ก.)","ผลไม้",0.9,2,0.1,0,0,190],

// ===== ขนม/ของหวาน =====
["ไอศกรีม",200,4,24,10,"1 ถ้วย (100 ก.)","ของหวาน",0.5,80,6,22,0,200],
["เค้กช็อกโกแลต",350,5,45,17,"1 ชิ้น (100 ก.)","ของหวาน",2,300,9,33,0,180],
["บิงซู",450,8,70,15,"1 ถ้วย (350 ก.)","ของหวาน",2,150,9,55,0,350],
["ข้าวเหนียวมะม่วง",480,6,85,13,"1 จาน (250 ก.)","ของหวาน",3,200,10,45,0,350],
["บัวลอยน้ำขิง",280,4,52,7,"1 ถ้วย (200 ก.)","ของหวาน",1.5,60,5.5,32,0,150],
["ทองหยิบ/ฝอยทอง",150,3,30,3,"3 ชิ้น (45 ก.)","ของหวาน",0,30,1,28,0,40],
["มันฝรั่งทอดกรอบ (ถุง)",270,3,28,16,"1 ถุงเล็ก (50 ก.)","ของหวาน",2.5,350,5,1,0,550],
["ช็อกโกแลตแท่ง",250,3,28,14,"1 แท่ง (45 ก.)","ของหวาน",2,40,8.5,25,0,200],
["คุกกี้",120,1.5,16,6,"2 ชิ้น (25 ก.)","ของหวาน",0.5,90,3,8,0,40],
["ถั่วอบ",180,7,7,15,"1 กำมือ (30 ก.)","ของหวาน",3,120,2,1,0,220],

// ===== เครื่องดื่ม =====
["น้ำเปล่า",0,0,0,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,2,0,0,0,1],
["ชาเขียวไม่หวาน",0,0,0,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,3,0,0,0,25],
["กาแฟดำ/อเมริกาโน่ (ไม่ใส่น้ำตาล)",5,0.3,0,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,5,0,0,0,115],
["กาแฟเย็น (หวานปกติ)",250,4,38,9,"1 แก้ว (400 มล.)","เครื่องดื่ม",0,100,6,34,0,200],
["ลาเต้ร้อน",150,8,14,7,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,105,4.5,0,0,350],
["ชาไทยเย็น",280,4,45,10,"1 แก้ว (400 มล.)","เครื่องดื่ม",0,120,7,42,0,180],
["ชานมไข่มุก",400,6,70,10,"1 แก้ว (450 มล.)","เครื่องดื่ม",0.5,150,7,60,0,200],
["น้ำอัดลม",150,0,38,0,"1 กระป๋อง (325 มล.)","เครื่องดื่ม",0,45,0,38,0,10],
["น้ำผลไม้กล่อง",120,0.5,29,0,"1 กล่อง (200 มล.)","เครื่องดื่ม",0.3,15,0,27,0,250],
["นมสด",150,8,12,8,"1 กล่อง 200 มล.","เครื่องดื่ม",0,100,5,0,0,320],
["นมถั่วเหลือง",120,6,15,4,"1 กล่อง (200 มล.)","เครื่องดื่ม",1,100,0.6,9,0,250],
["โยเกิร์ตรสธรรมชาติ",100,6,12,3,"1 ถ้วย (150 ก.)","เครื่องดื่ม",0,80,1.9,0,0,280],
["เวย์โปรตีน 1 สคูป",120,24,3,1.5,"1 สคูป (30 ก.)","เครื่องดื่ม",0.5,100,0.8,1,0,150],
["เบียร์",143,1.5,11.8,0.0,"1 กระป๋อง 330 มล.","เครื่องดื่ม",0.0,13,0.0,0.0,13.0,90],   // Alcoholic beverage, beer, regular, all,
["เหล้า/วิสกี้",65,0.0,0.0,0.0,"1 เป๊ก 30 มล.","เครื่องดื่ม",0.0,0,0.0,0.0,9.4,1],   // Alcoholic beverage, distilled, all (gin, rum, vodka, whiskey) 80 proof,
// --- เหล้าไทย นับเป็น "ฝา" (1 ฝา ≈ 30 มล.) · แคลจากแอลกอฮอล์ล้วน 7.1 kcal/ก. ---
// [ชื่อ, kcal, P, C, F, หน่วย, หมวด, ไฟเบอร์, โซเดียม, ไขมันอิ่มตัว, น้ำตาล, กรัมแอลกอฮอล์]
["เหล้า Regency (ฝา 30 มล.)",59,0,0,0,"1 ฝา 30 มล.","เครื่องดื่ม",0,0,0,0,8.3,0],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["Regency + โซดา (1 ฝา)",59,0,0,0,"1 แก้ว (1 ฝา 30 มล.)","เครื่องดื่ม",0,10,0,0,8.3,0],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้า Regency (ขวดเล็ก 350 มล.)",687,0,0,0,"1 ขวด 350 มล.","เครื่องดื่ม",0,0,0,0,96.7,4],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้า Regency (ขวดกลม 500 มล.)",981,0,0,0,"1 ขวด 500 มล.","เครื่องดื่ม",0,0,0,0,138.1,5],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้า Regency (ขวดใหญ่ 700 มล.)",1374,0,0,0,"1 ขวด 700 มล.","เครื่องดื่ม",0,0,0,0,193.3,7],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้า 28 ดีกรี (ฝา 30 มล.)",47,0,0,0,"1 ฝา 30 มล.","เครื่องดื่ม",0,0,0,0,6.6,0],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้า 35 ดีกรี (ฝา 30 มล.)",59,0,0,0,"1 ฝา 30 มล.","เครื่องดื่ม",0,0,0,0,8.3,0],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้า 40 ดีกรี (ฝา 30 มล.)",67,0,0,0,"1 ฝา 30 มล.","เครื่องดื่ม",0,0,0,0,9.5,0],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["เหล้าขาว 40 ดีกรี (ฝา 30 มล.)",67,0,0,0,"1 ฝา 30 มล.","เครื่องดื่ม",0,0,0,0,9.5,0],   // USDA:Alcoholic beverage, distilled, whiskey, 86 p
["โซดา",0,0,0,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,15,0,0,0,2],
["ไวน์แดง",126,0.1,3.9,0.0,"1 แก้ว 150 มล.","เครื่องดื่ม",0.0,6,0.0,0.9,15.7,188],   // Alcoholic beverage, wine, table, red,
["น้ำหวาน/น้ำแดง",120,0,30,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,30,0,30,0,5],
// ===== วัตถุดิบเดี่ยว / อาหารคลีน (กินแยกจาน) =====
["สะโพกไก่ย่าง (มีหนัง)",230,24,0,15,"100 กรัม","วัตถุดิบ",0,90,4.2,0,0,240],
["น่องไก่ต้ม",170,24,0,8,"1 น่อง (90 ก. เนื้อ)","วัตถุดิบ",0,90,2.2,0,0,230],
["ปีกไก่ทอด",160,12,4,11,"1 ชิ้น (50 ก.)","วัตถุดิบ",0.1,300,3,0,0,110],
["หมูสันในต้ม",145,26,0,4,"100 กรัม","วัตถุดิบ",0,60,1.4,0,0,420],
["หมูสับลวก",250,20,0,19,"100 กรัม","วัตถุดิบ",0,70,7,0,0,320],
["หมูสามชั้นย่าง",380,18,0,34,"100 กรัม","วัตถุดิบ",0,80,12.5,0,0,260],
["เนื้อวัวสันในย่าง",206,29.0,0,9.1,"100 กรัม","วัตถุดิบ",0,59,3.5,0,0,358],   // USDA 173117 Beef, tenderloin steak, lean only, broiled
["ปลานิลนึ่ง",110,22,0,2.5,"100 กรัม","วัตถุดิบ",0,50,0.9,0,0,380],
["ปลาแซลมอนย่าง",210,23,0,13,"100 กรัม","วัตถุดิบ",0,70,2.6,0,0,380],
["ปลาทูนึ่ง",150,22,0,7,"1 ตัว (90 ก.)","วัตถุดิบ",0,260,2.2,0,0,300],
["ทูน่ากระป๋องในน้ำแร่",110,25,0,1,"1 กระป๋อง (80 ก.)","วัตถุดิบ",0,280,0.3,0,0,200],
["ปลาซาบะย่าง",250,21,0,18,"100 กรัม","วัตถุดิบ",0,90,4.3,0,0,320],
["กุ้งลวก",100,20,1,1.5,"100 กรัม","วัตถุดิบ",0,200,0.3,0,0,260],
["ปลาหมึกลวก",95,18,3,1.5,"100 กรัม","วัตถุดิบ",0,250,0.4,0,0,250],
["ไข่ขาวต้ม",17,3.6,0.2,0,"1 ฟอง (33 ก.)","วัตถุดิบ",0,55,0,0,0,54],
["ไข่ต้ม 2 ฟอง",156,12,1.2,10,"2 ฟอง (100 ก.)","วัตถุดิบ",0,130,3.2,0,0,130],
["ไข่คน (ใส่น้ำมันนิด)",180,12,1.5,14,"2 ฟอง (110 ก.)","วัตถุดิบ",0,180,4,0,0,150],
["เต้าหู้ขาวอ่อน",70,7,2,4,"1 หลอด (120 ก.)","วัตถุดิบ",0.5,15,0.6,0,0,130],
["ถั่วลันเตาลวก",80,5,14,0.4,"100 กรัม","วัตถุดิบ",5,3,0.1,0,0,270],
["บล็อคโคลี่ลวก",35,2.8,7,0.4,"100 กรัม (1 ถ้วย)","วัตถุดิบ",3.3,40,0.1,0,0,290],
["บล็อคโคลี่ผัดน้ำมัน",100,3,8,7,"1 จานเล็ก (100 ก.)","วัตถุดิบ",3,300,1.2,0,0,320],
["แครอทลวก",40,0.9,9,0.2,"100 กรัม","วัตถุดิบ",3,60,0,0,0,240],
["ผักบุ้งลวก",25,2.6,3,0.2,"100 กรัม","วัตถุดิบ",2.1,110,0,0,0,310],
["คะน้าลวก",35,3,5,0.5,"100 กรัม","วัตถุดิบ",2.6,20,0.1,0,0,300],
["กะหล่ำปลีลวก",25,1.3,6,0.1,"100 กรัม","วัตถุดิบ",2,8,0,0,0,200],
["ถั่วฝักยาวลวก",35,2.4,7,0.2,"100 กรัม","วัตถุดิบ",2.8,4,0,0,0,240],
["ผักรวมลวก",40,2.5,7,0.4,"1 จาน (150 ก.)","วัตถุดิบ",3,30,0.1,0,0,270],
["ผักสลัดสด (ไม่ใส่น้ำสลัด)",20,1.5,3,0.2,"1 จาน (100 ก.)","วัตถุดิบ",1.5,15,0,0,0,200],
["มะเขือเทศ",20,1,4,0.2,"1 ลูก (100 ก.)","วัตถุดิบ",1.2,5,0,0,0,240],
["แตงกวา",15,0.7,3,0.1,"1 ลูก (100 ก.)","วัตถุดิบ",0.6,2,0,0,0,150],
["ฟักทองนึ่ง",50,1.2,12,0.1,"100 กรัม","วัตถุดิบ",1.5,2,0,0,0,340],
["เห็ดลวก",25,3,4,0.3,"100 กรัม","วัตถุดิบ",1.5,6,0,0,0,330],
["ข้าวไรซ์เบอร์รี่",230,5,47,1.5,"1 ทัพพี (150 ก.)","วัตถุดิบ",3,5,0.3,0,0,160],
["มันหวานนึ่ง",90,1.6,21,0.1,"100 กรัม","วัตถุดิบ",3.3,36,0,0,0,340],
["ข้าวโพดต้ม",90,3,19,1.2,"1 ฝัก (100 ก. เมล็ด)","วัตถุดิบ",2.4,15,0.2,0,0,250],
["วุ้นเส้นลวก",80,0.1,20,0,"1 ถ้วย (100 ก.)","วัตถุดิบ",0.4,5,0,0,0,10],
["เส้นก๋วยเตี๋ยวลวก",190,3,42,0.5,"1 ชาม (150 ก.)","วัตถุดิบ",1.5,20,0.1,0,0,40],
["เนยถั่ว",95,4,3,8,"1 ช้อนโต๊ะ (16 ก.)","วัตถุดิบ",0.9,75,1.6,1.5,0,105],
["น้ำมันพืช (ผัด 1 ช้อน)",120,0,0,14,"1 ช้อนโต๊ะ (14 ก.)","วัตถุดิบ",0,0,2,0,0,0],
["กรีกโยเกิร์ตไม่หวาน",100,10,6,3,"1 ถ้วย (150 ก.)","วัตถุดิบ",0,55,2,0,0,210],
["นมพร่องมันเนย",90,8,12,2,"1 กล่อง 200 มล.","วัตถุดิบ",0,100,1.3,0,0,380],
["ชีสแผ่น",60,4,1,5,"1 แผ่น (18 ก.)","วัตถุดิบ",0,270,3,0,0,25],
["น้ำพริกกะปิ",60,3,5,3,"1 ช้อนโต๊ะ (15 ก.)","วัตถุดิบ",1,900,0.8,2,0,120],
["น้ำจิ้มไก่",35,0,9,0,"1 ช้อนโต๊ะ (15 ก.)","วัตถุดิบ",0.1,300,0,7,0,20],
["น้ำสลัดครีม",90,0.5,3,8,"1 ช้อนโต๊ะ (15 ก.)","วัตถุดิบ",0,200,1.3,2.5,0,15],
["น้ำปลาหวาน",50,0.5,12,0,"1 ช้อนโต๊ะ (15 ก.)","วัตถุดิบ",0.1,900,0,11,0,30],
["ซุปใสผัก",40,2,6,0.5,"1 ถ้วย (200 ก.)","วัตถุดิบ",1.5,700,0.1,1,0,250],
["โปรตีนบาร์",200,15,20,7,"1 แท่ง (55 ก.)","วัตถุดิบ",3,200,3,8,0,200],
["เวย์โปรตีน 2 สคูป",240,48,6,3,"2 สคูป (60 ก.)","วัตถุดิบ",1,200,1.5,2,0,300],

// ===== เพิ่มจาก USDA FoodData Central (SR Legacy 2018) — ข้อมูลสาธารณะของรัฐบาลสหรัฐฯ =====
// undefined = USDA ไม่ได้วิเคราะห์ค่านั้นไว้ ปล่อยให้แอปประมาณจากชนิดอาหารเหมือนเดิม
// --- วัตถุดิบ ---
["หมูบดดิบ",263,16.9,0.0,21.2,"100 ก.","วัตถุดิบ",0.0,56,7.9,0,0,287],   // Pork, fresh, ground, raw
["หมูบดผัดสุก",297,25.7,0.0,20.8,"100 ก.","วัตถุดิบ",0.0,73,7.7,0.0,0,362],   // Pork, fresh, ground, cooked
["หมูสันนอกล้วนดิบ",143,21.4,0.0,5.7,"100 ก.","วัตถุดิบ",0.0,52,1.9,0.0,0,389],   // Pork, fresh, loin, whole, separable lean only, raw
["หมูสันในล้วนดิบ",109,20.9,0.0,2.2,"100 ก.","วัตถุดิบ",0.0,53,0.7,0.0,0,399],   // Pork, fresh, loin, tenderloin, separable lean only, raw
["หมูสันในย่างสุก",143,26.2,0.0,3.5,"100 ก.","วัตถุดิบ",0.0,57,1.2,0.0,0,421],   // Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted
["หมูสามชั้นดิบ",518,9.3,0.0,53.0,"100 ก.","วัตถุดิบ",0.0,32,19.3,0.0,0,185],   // Pork, fresh, belly, raw
["ซี่โครงหมูดิบ",277,15.5,0.0,23.4,"100 ก.","วัตถุดิบ",0.0,81,7.5,0.0,0,242],   // Pork, fresh, spareribs, separable lean and fat, raw
["ซี่โครงหมูอบสุก",361,20.9,0.0,30.9,"100 ก.","วัตถุดิบ",0.0,91,9.2,0.0,0,265],   // Pork, fresh, spareribs, separable lean and fat, cooked, roasted
["เบคอนทอดสุก",88,5.7,0.2,6.9,"2 แผ่น (16 ก.)","วัตถุดิบ",0.0,351,2.3,0.0,0,87],   // Pork, cured, bacon, cooked, baked
["แฮมหมูอบ",46,6.2,0.1,2.1,"1 แผ่น (28 ก.)","วัตถุดิบ",0.0,388,0.7,0.0,0,101],   // Pork, cured, ham, boneless, extra lean and regular, roasted
["อกไก่ไม่มีหนัง อบสุก",165,31.0,0.0,3.6,"100 ก.","วัตถุดิบ",0.0,74,1.0,0.0,0,256],   // Chicken, broilers or fryers, breast, meat only, cooked, roasted
["อกไก่มีหนัง อบสุก",197,29.8,0.0,7.8,"100 ก.","วัตถุดิบ",0.0,71,2.2,0.0,0,245],   // Chicken, broilers or fryers, breast, meat and skin, cooked, roasted
["สะโพกไก่มีหนัง ดิบ",221,16.5,0.2,16.6,"100 ก.","วัตถุดิบ",0.0,81,4.5,0.0,0,204],   // Chicken, broilers or fryers, thigh, meat and skin, raw
["น่องไก่ไม่มีหนัง ทอดสุก",195,28.6,0.0,8.1,"100 ก.","วัตถุดิบ",0.0,96,2.1,0,0,249],   // Chicken, broilers or fryers, drumstick, meat only, cooked, fried
["ตับไก่ดิบ",119,16.9,0.7,4.8,"100 ก.","วัตถุดิบ",0.0,71,1.6,0.0,0,230],   // Chicken, liver, all classes, raw
["ตับไก่ต้มสุก",167,24.5,0.9,6.5,"100 ก.","วัตถุดิบ",0.0,76,2.1,0.0,0,263],   // Chicken, liver, all classes, cooked, simmered
["เนื้อเป็ดไม่มีหนัง ดิบ",135,18.3,0.9,6.0,"100 ก.","วัตถุดิบ",0.0,74,2.3,0.0,0,271],   // Duck, domesticated, meat only, raw
["เป็ดมีหนัง ดิบ",404,11.5,0.0,39.3,"100 ก.","วัตถุดิบ",0.0,63,13.2,0.0,0,209],   // Duck, domesticated, meat and skin, raw
["เนื้อวัวบด 95% ไม่ติดมัน ดิบ",137,21.4,0.0,5.0,"100 ก.","วัตถุดิบ",0.0,66,2.2,0.0,0,346],   // Beef, ground, 95% lean meat / 5% fat, raw
["เนื้อวัวบด 90% ดิบ",176,20.0,0.0,10.0,"100 ก.","วัตถุดิบ",0.0,66,3.9,0.0,0,321],   // Beef, ground, 90% lean meat / 10% fat, raw
["เนื้อวัวบดปิ้งเป็นแพตตี้",212,22.0,0.0,13.1,"1 ชิ้น (85 ก.)","วัตถุดิบ",0.0,61,5.0,0.0,0,270],   // Beef, ground, 85% lean meat / 15% fat, patty, cooked, broiled
["แซลมอนเลี้ยงดิบ",208,20.4,0.0,13.4,"100 ก.","วัตถุดิบ",0.0,59,3.0,0.0,0,363],   // Fish, salmon, Atlantic, farmed, raw
["ปลานิล/ทับทิม ดิบ",96,20.1,0.0,1.7,"100 ก.","วัตถุดิบ",0.0,52,0.6,0.0,0,302],   // Fish, tilapia, raw
["ปลานิล/ทับทิม ย่างสุก",128,26.1,0.0,2.6,"100 ก.","วัตถุดิบ",0.0,56,0.9,0.0,0,380],   // Fish, tilapia, cooked, dry heat
["ปลาดุกเลี้ยงดิบ",119,15.2,0.0,5.9,"100 ก.","วัตถุดิบ",0.0,98,1.3,0.0,0,302],   // Fish, catfish, channel, farmed, raw
["ปลากะพงดิบ",100,20.5,0.0,1.3,"100 ก.","วัตถุดิบ",0.0,64,0.3,0.0,0,417],   // Fish, snapper, mixed species, raw
["ปลาอินทรี/ปลาซาบะ ดิบ",139,19.3,0.0,6.3,"100 ก.","วัตถุดิบ",0.0,59,1.8,0.0,0,446],   // Fish, mackerel, spanish, raw
["ปลาคอดดิบ",82,17.8,0.0,0.7,"100 ก.","วัตถุดิบ",0.0,54,0.1,0.0,0,413],   // Fish, cod, Atlantic, raw
["ปลากะตักดิบ",131,20.4,0.0,4.8,"100 ก.","วัตถุดิบ",0.0,104,1.3,0.0,0,383],   // Fish, anchovy, european, raw
["ปลาซาร์ดีนกระป๋องในน้ำมัน",191,22.7,0.0,10.5,"1 กระป๋อง 92 ก.","วัตถุดิบ",0.0,282,1.4,0.0,0,365],   // Fish, sardine, Atlantic, canned in oil, drained solids with bone
["ทูน่ากระป๋องในน้ำ ไม่เติมเกลือ",191,42.1,0.0,1.4,"1 กระป๋อง 165 ก.","วัตถุดิบ",0.0,82,0.4,0.0,0,390],   // Fish, tuna, light, canned in water, without salt, drained solids
["กุ้งดิบ",85,20.1,0.0,0.5,"100 ก.","วัตถุดิบ",0,119,0.1,0,0,264],   // Crustaceans, shrimp, raw
["กุ้งสุก",99,24.0,0.2,0.3,"100 ก.","วัตถุดิบ",0,111,0.1,0,0,259],   // Crustaceans, shrimp, cooked
["ปลาหมึกดิบ",92,15.6,3.1,1.4,"100 ก.","วัตถุดิบ",0.0,44,0.4,0.0,0,246],   // Mollusks, squid, mixed species, raw
["ปูดิบ",87,18.1,0.0,1.1,"100 ก.","วัตถุดิบ",0.0,293,0.2,0,0,329],   // Crustaceans, crab, blue, raw
["หอยนางรมดิบ",81,9.4,5.0,2.3,"100 ก.","วัตถุดิบ",0.0,106,0.5,0,0,168],   // Mollusks, oyster, Pacific, raw
["หอยแมลงภู่ดิบ",86,11.9,3.7,2.2,"100 ก.","วัตถุดิบ",0.0,286,0.4,0.0,0,320],   // Mollusks, mussel, blue, raw
["หอยเชลล์ดิบ",69,12.1,3.2,0.5,"100 ก.","วัตถุดิบ",0.0,392,0.1,0.0,0,205],   // Mollusks, scallop, mixed species, raw
["หอยลายดิบ",86,14.7,3.6,1.0,"100 ก.","วัตถุดิบ",0.0,601,0.2,0.0,0,46],   // Mollusks, clam, mixed species, raw
["ไข่ไก่ดิบ",72,6.3,0.4,4.8,"1 ฟอง (50 ก.)","วัตถุดิบ",0.0,71,1.6,undefined,0,69],   // Egg, whole, raw, fresh
["ไข่ดาว (ทอดน้ำมัน)",90,6.3,0.4,6.8,"1 ฟอง (55 ก.)","วัตถุดิบ",0.0,95,2.0,undefined,0,70],   // Egg, whole, cooked, fried
["เต้าหู้แข็ง (แคลเซียมซัลเฟต)",144,17.3,2.8,8.7,"100 ก.","วัตถุดิบ",2.3,14,1.3,undefined,0,237],   // Tofu, raw, firm, prepared with calcium sulfate
["ถั่วเหลืองต้มสุก",296,31.3,14.4,15.4,"1 ถ้วย 172 ก.","วัตถุดิบ",10.3,2,2.2,undefined,0,886],   // Soybeans, mature seeds, cooked, boiled, with salt
["ถั่วดำต้มสุก",227,15.2,40.8,0.9,"1 ถ้วย 172 ก.","วัตถุดิบ",15.0,2,0.2,undefined,0,610],   // Beans, black, mature seeds, cooked, boiled, without salt
["ถั่วแดงต้มสุก",225,15.3,40.4,0.9,"1 ถ้วย 177 ก.","วัตถุดิบ",13.1,4,0.1,undefined,0,714],   // Beans, kidney, red, mature seeds, cooked, boiled, without salt
["ถั่วลูกไก่ (ชิกพี) ต้มสุก",269,14.5,45.0,4.2,"1 ถ้วย 164 ก.","วัตถุดิบ",12.5,11,0.4,undefined,0,477],   // Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled,
["ถั่วเลนทิลต้มสุก",230,17.9,39.9,0.8,"1 ถ้วย 198 ก.","วัตถุดิบ",15.6,4,0.1,undefined,0,732],   // Lentils, mature seeds, cooked, boiled, without salt
["ถั่วเขียวดิบ",347,23.9,62.6,1.1,"100 ก.","วัตถุดิบ",16.3,15,0.3,undefined,0,1246],   // Mung beans, mature seeds, raw
["ถั่วงอกดิบ",30,3.0,5.9,0.2,"100 ก.","วัตถุดิบ",1.8,6,0.0,undefined,0,149],   // Mung beans, mature seeds, sprouted, raw
["หน่อไม้สดดิบ",27,2.6,5.2,0.3,"100 ก.","วัตถุดิบ",2.2,4,0.1,undefined,0,533],   // Bamboo shoots, raw
["มะระดิบ",17,1.0,3.7,0.2,"100 ก.","วัตถุดิบ",2.8,5,undefined,undefined,0,296],   // Balsam-pear (bitter gourd), pods, raw
["ถั่วฝักยาวดิบ",47,2.8,8.3,0.4,"100 ก.","วัตถุดิบ",undefined,4,0.1,undefined,0,240],   // Yardlong bean, raw
["มะเขือม่วงดิบ",25,1.0,5.9,0.2,"100 ก.","วัตถุดิบ",3.0,2,0.0,undefined,0,229],   // Eggplant, raw
["ผักโขมดิบ",23,2.9,3.6,0.4,"100 ก.","วัตถุดิบ",2.2,79,0.1,undefined,0,558],   // Spinach, raw
["กระเจี๊ยบเขียวดิบ",33,1.9,7.5,0.2,"100 ก.","วัตถุดิบ",3.2,7,0.0,undefined,0,299],   // Okra, raw
["ฟักแม้ว (มะระหวาน) ดิบ",19,0.8,4.5,0.1,"100 ก.","วัตถุดิบ",1.7,2,0.0,undefined,0,125],   // Chayote, fruit, raw
["บวบดิบ",20,1.2,4.3,0.2,"100 ก.","วัตถุดิบ",1.1,3,0.0,undefined,0,139],   // Gourd, dishcloth (towelgourd), raw
["ดอกกะหล่ำดิบ",25,1.9,5.0,0.3,"100 ก.","วัตถุดิบ",2.0,30,0.1,undefined,0,299],   // Cauliflower, raw
["หน่อไม้ฝรั่งดิบ",20,2.2,3.9,0.1,"100 ก.","วัตถุดิบ",2.1,2,0.0,undefined,0,202],   // Asparagus, raw
["คื่นช่ายฝรั่งดิบ",14,0.7,3.0,0.2,"100 ก.","วัตถุดิบ",1.6,80,0.0,undefined,0,260],   // Celery, raw
["ถั่วแขกดิบ",31,1.8,7.0,0.2,"100 ก.","วัตถุดิบ",2.7,6,0.1,undefined,0,211],   // Beans, snap, green, raw
["ถั่วลันเตาเมล็ดดิบ",81,5.4,14.4,0.4,"100 ก.","วัตถุดิบ",5.7,5,0.1,undefined,0,244],   // Peas, green, raw
["ผักกาดหอมโรเมน",17,1.2,3.3,0.3,"100 ก.","วัตถุดิบ",2.1,8,0.0,undefined,0,247],   // Lettuce, cos or romaine, raw
["พริกหวานแดง",26,1.0,6.0,0.3,"100 ก.","วัตถุดิบ",2.1,4,0.1,undefined,0,211],   // Peppers, sweet, red, raw
["พริกขี้หนูแดง",4,0.2,0.9,0.0,"10 ก.","วัตถุดิบ",0.2,1,0.0,undefined,0,32],   // Peppers, hot chili, red, raw
["หอมใหญ่ดิบ",40,1.1,9.3,0.1,"100 ก.","วัตถุดิบ",1.7,4,0.0,undefined,0,146],   // Onions, raw
["กระเทียมสด",4,0.2,1.0,0.0,"1 ช้อนชา 3 ก.","วัตถุดิบ",0.1,1,0.0,undefined,0,11],   // Garlic, raw
["ขิงสด",8,0.2,1.8,0.1,"10 ก.","วัตถุดิบ",0.2,1,0.0,undefined,0,42],   // Ginger root, raw
["ต้นหอมสด",6,0.4,1.5,0.0,"20 ก.","วัตถุดิบ",0.5,3,0.0,undefined,0,52],   // Onions, spring or scallions (includes tops and bulb), raw
["ผักชีสด",2,0.2,0.4,0.1,"10 ก.","วัตถุดิบ",0.3,5,0.0,undefined,0,45],   // Coriander (cilantro) leaves, raw
["โหระพา/กะเพราสด",2,0.3,0.3,0.1,"10 ก.","วัตถุดิบ",0.2,0,0.0,undefined,0,26],   // Basil, fresh
["สาหร่ายทะเลสด",4,0.2,1.0,0.1,"10 ก.","วัตถุดิบ",0.1,23,0.0,undefined,0,8],   // Seaweed, kelp, raw
["สาหร่ายแผ่น (โนริ)",1,0.2,0.2,0.0,"1 แผ่น 3 ก.","วัตถุดิบ",0.0,1,0.0,undefined,0,10],   // Seaweed, laver, raw
["เผือกดิบ",112,1.5,26.5,0.2,"100 ก.","วัตถุดิบ",4.1,11,0.0,undefined,0,591],   // Taro, raw
["มันสำปะหลังดิบ",160,1.4,38.1,0.3,"100 ก.","วัตถุดิบ",1.8,14,0.1,undefined,0,271],   // Cassava, raw
["หัวถั่วพูดิบ",148,11.6,28.1,0.9,"100 ก.","วัตถุดิบ",undefined,35,0.2,undefined,0,586],   // Winged bean tuber, raw
["ข้าวสวย 1 ทัพพี",91,1.9,19.7,0.2,"1 ทัพพี 70 ก.","วัตถุดิบ",0.3,1,0.1,undefined,0,24],   // Rice, white, long-grain, regular, cooked, unenriched, with salt
["ข้าวกล้องหุงสุก",86,1.9,17.9,0.7,"1 ทัพพี 70 ก.","วัตถุดิบ",1.1,3,0.2,undefined,0,60],   // Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distri
["บะหมี่ไข่ลวกสุก",110,3.6,20.1,1.7,"1 ก้อน 80 ก.","วัตถุดิบ",1.0,6,0.3,undefined,0,30],   // Noodles, egg, cooked, enriched, with added salt
["พาสต้า/สปาเกตตีสุก",221,8.1,43.2,1.3,"1 จาน 140 ก.","วัตถุดิบ",2.5,1,0.2,undefined,0,62],   // Pasta, cooked, enriched, without added salt
["เส้นหมี่แห้ง (ก่อนลวก)",182,3.0,40.1,0.3,"50 ก.","วัตถุดิบ",0.8,91,0.1,undefined,0,15],   // Rice noodles, dry
["ขนมปังโฮลวีท (แผ่น)",71,3.5,12.0,1.0,"1 แผ่น 28 ก.","วัตถุดิบ",1.7,127,0.2,undefined,0,72],   // Bread, whole-wheat, commercially prepared
["ข้าวโอ๊ตดิบ",152,5.3,27.1,2.6,"40 ก.","วัตถุดิบ",4.0,2,0.4,undefined,0,145],   // Cereals, oats, regular and quick, not fortified, dry
["แป้งสาลีอเนกประสงค์",29,0.8,6.1,0.1,"1 ช้อนโต๊ะ 8 ก.","วัตถุดิบ",0.2,0,0.0,undefined,0,9],   // Wheat flour, white, all-purpose, unenriched
["ข้าวโพดหวานต้ม",96,3.4,21.0,1.5,"100 ก.","วัตถุดิบ",2.4,1,0.2,undefined,0,218],   // Corn, sweet, yellow, cooked, boiled, drained, without salt
["มันฝรั่งต้ม (ปอกเปลือก)",86,1.7,20.0,0.1,"100 ก.","วัตถุดิบ",1.8,5,0.0,undefined,0,328],   // Potatoes, boiled, cooked without skin, flesh, without salt
["มันหวานอบ",90,2.0,20.7,0.1,"100 ก.","วัตถุดิบ",3.3,36,0.1,undefined,0,475],   // Sweet potato, cooked, baked in skin, flesh, without salt
// --- เครื่องดื่ม ---
["นมสดเต็มมันเนย",149,7.7,11.7,7.9,"1 แก้ว 240 มล.","เครื่องดื่ม",0.0,105,4.6,0,0,322],   // Milk, whole, 3.25% milkfat, with added vitamin D
["นมพร่องมันเนย 2%",122,8.1,11.7,4.8,"1 แก้ว 240 มล.","เครื่องดื่ม",0.0,115,3.1,0,0,342],   // Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin
["โยเกิร์ตธรรมดา (นมเต็มมันเนย)",149,8.5,11.4,8.0,"1 ถ้วย 245 ก.","เครื่องดื่ม",0.0,113,5.1,0,0,379],   // Yogurt, plain, whole milk
["กรีกโยเกิร์ตเต็มมันเนย",194,18.0,8.0,10.0,"1 ถ้วย 200 ก.","เครื่องดื่ม",0.0,70,4.8,0,0,282],   // Yogurt, Greek, plain, whole milk
// --- วัตถุดิบ ---
["ชีสเชดดาร์",115,6.8,0.6,9.5,"1 แผ่น 28 ก.","วัตถุดิบ",0.0,180,5.4,undefined,0,21],   // Cheese, cheddar, sharp, sliced
["ชีสมอสซาเรลลา",90,6.7,0.7,6.6,"30 ก.","วัตถุดิบ",0.0,146,4.2,undefined,0,23],   // Cheese, mozzarella, whole milk
["ครีมชีส",52,0.9,0.8,5.2,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.0,47,3.0,undefined,0,20],   // Cheese, cream
["เนยเค็ม",36,0.0,0.0,4.1,"1 ช้อนชา 5 ก.","วัตถุดิบ",0.0,32,2.6,undefined,0,1],   // Butter, salted
["วิปครีม (ครีมข้น)",51,0.4,0.4,5.4,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.0,4,3.5,undefined,0,14],   // Cream, fluid, heavy whipping
["นมข้นหวาน",61,1.5,10.3,1.7,"1 ช้อนโต๊ะ 19 ก.","วัตถุดิบ",0.0,24,1.0,10.3,0,71],   // Milk, canned, condensed, sweetened
["ถั่วลิสงดิบ",159,7.2,4.5,13.8,"1 กำมือ 28 ก.","วัตถุดิบ",2.4,5,1.8,undefined,0,198],   // Peanuts, all types, raw
["เม็ดมะม่วงหิมพานต์ดิบ",155,5.1,8.5,12.3,"1 กำมือ 28 ก.","วัตถุดิบ",0.9,3,2.2,undefined,0,185],   // Nuts, cashew nuts, raw
["วอลนัท",183,4.3,3.8,18.3,"1 กำมือ 28 ก.","วัตถุดิบ",1.9,1,1.7,undefined,0,123],   // Nuts, walnuts, english
["พิสตาชิโอดิบ",157,5.6,7.6,12.7,"1 กำมือ 28 ก.","วัตถุดิบ",3.0,0,1.7,undefined,0,287],   // Nuts, pistachio nuts, raw
["แมคคาเดเมียดิบ",201,2.2,3.9,21.2,"1 กำมือ 28 ก.","วัตถุดิบ",2.4,1,3.4,undefined,0,103],   // Nuts, macadamia nuts, raw
["เมล็ดเจีย",58,2.0,5.1,3.7,"1 ช้อนโต๊ะ 12 ก.","วัตถุดิบ",4.1,2,0.4,undefined,0,49],   // Seeds, chia seeds, dried
["เมล็ดฟักทองอบ",157,8.5,3.0,13.7,"1 กำมือ 28 ก.","วัตถุดิบ",1.7,2,2.4,undefined,0,227],   // Seeds, pumpkin and squash seed kernels, dried
["เมล็ดทานตะวัน",164,5.8,5.6,14.4,"1 กำมือ 28 ก.","วัตถุดิบ",2.4,3,1.2,undefined,0,181],   // Seeds, sunflower seed kernels, dried
["งาขาว/งาดำ",52,1.6,2.1,4.5,"1 ช้อนโต๊ะ 9 ก.","วัตถุดิบ",1.1,1,0.6,undefined,0,42],   // Seeds, sesame seeds, whole, dried
["อัลมอนด์ดิบ",162,5.9,6.0,14.0,"1 กำมือ 28 ก.","วัตถุดิบ",3.5,0,1.1,undefined,0,205],   // Nuts, almonds
["น้ำมันมะกอก",119,0.0,0.0,13.5,"1 ช้อนโต๊ะ 13.5 ก.","วัตถุดิบ",0.0,0,1.9,0.0,0,0],   // Oil, olive, salad or cooking
["น้ำมันมะพร้าว",121,0.0,0.0,13.5,"1 ช้อนโต๊ะ 13.6 ก.","วัตถุดิบ",0.0,0,11.2,0.0,0,0],   // Oil, coconut
["น้ำมันงา",120,0.0,0.0,13.6,"1 ช้อนโต๊ะ 13.6 ก.","วัตถุดิบ",0.0,0,1.9,0.0,0,0],   // Oil, sesame, salad or cooking
["น้ำมันรำข้าว",120,0.0,0.0,13.6,"1 ช้อนโต๊ะ 13.6 ก.","วัตถุดิบ",0.0,0,2.7,0.0,0,0],   // Oil, rice bran
["น้ำมันปาล์ม",120,0.0,0.0,13.6,"1 ช้อนโต๊ะ 13.6 ก.","วัตถุดิบ",0.0,0,6.7,0.0,0,0],   // Oil, palm
["มายองเนส",95,0.1,0.1,10.5,"1 ช้อนโต๊ะ 14 ก.","วัตถุดิบ",0.0,89,1.6,0.1,0,3],   // Salad dressing, mayonnaise, regular
["น้ำปลา",6,0.9,0.7,0.0,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.0,1413,0.0,undefined,0,49],   // Sauce, fish, ready-to-serve
["ซีอิ๊วขาว",8,1.3,0.8,0.1,"1 ช้อนโต๊ะ 16 ก.","วัตถุดิบ",0.1,879,0.0,undefined,0,66],   // Soy sauce made from soy and wheat (shoyu)
["ซีอิ๊วขาวโซเดียมต่ำ",9,1.4,0.9,0.0,"1 ช้อนโต๊ะ 16 ก.","วัตถุดิบ",0.1,576,0.0,undefined,0,56],   // Soy sauce made from soy and wheat (shoyu), low sodium
["ซอสหอยนางรม",8,0.2,1.7,0.0,"1 ช้อนโต๊ะ 16 ก.","วัตถุดิบ",0.0,437,0.0,0.0,0,8],   // Sauce, oyster, ready-to-serve
["ซอสมะเขือเทศ",17,0.2,4.7,0.0,"1 ช้อนโต๊ะ 17 ก.","วัตถุดิบ",0.1,154,0.0,3.6,0,47],   // Catsup
["ซอสศรีราชา",5,0.1,1.0,0.0,"1 ช้อนชา 5 ก.","วัตถุดิบ",0.1,106,undefined,0.8,0,17],   // Sauce, hot chile, sriracha
["น้ำตาลทราย",15,0.0,4.0,0.0,"1 ช้อนชา 4 ก.","วัตถุดิบ",0.0,0,0.0,4.0,0,0],   // Sugars, granulated
["น้ำผึ้ง",64,0.1,17.3,0.0,"1 ช้อนโต๊ะ 21 ก.","วัตถุดิบ",0.0,1,0.0,17.2,0,11],   // Honey
["เกลือแกง",0,0.0,0.0,0.0,"1 ช้อนชา 6 ก.","วัตถุดิบ",0.0,2325,0.0,undefined,0,0],   // Salt, table
["กะทิสด",34,0.3,0.8,3.6,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.3,2,3.2,undefined,0,39],   // Nuts, coconut milk, raw (liquid expressed from grated meat and water)
["เนยถั่วบดหยาบ",94,3.8,3.5,8.0,"1 ช้อนโต๊ะ 16 ก.","วัตถุดิบ",1.3,78,1.2,undefined,0,119],   // Peanut butter, chunk style, with salt
// --- ผลไม้ ---
["กล้วยหอม 1 ผล",105,1.3,27.0,0.4,"1 ผล 118 ก.","ผลไม้",3.1,1,0.1,undefined,0,422],   // Bananas, raw
["มะละกอสุก",60,0.7,15.1,0.4,"1 จานเล็ก 140 ก.","ผลไม้",2.4,11,0.1,undefined,0,254],   // Papayas, raw
["ส้มโอ",72,1.4,18.3,0.1,"1 จานเล็ก 190 ก.","ผลไม้",1.9,2,undefined,undefined,0,409],   // Pummelo, raw
["ลิ้นจี่",66,0.8,16.5,0.4,"10 ผล 100 ก.","ผลไม้",1.3,1,0.1,undefined,0,171],   // Litchis, raw
["ลำไย 10 ผล",62,0.9,15.8,0.1,"10 ผล (เนื้อ 80 ก.)","ผลไม้",0.8,0,0,0,0,213],   // Longans, raw — ปรับน้ำหนักตามผลไทย
["ขนุน 1 จานเล็ก",142,2.6,34.9,1.0,"1 จานเล็ก 150 ก.","ผลไม้",2.2,3,0.3,undefined,0,670],   // Jackfruit, raw
["มะขามสด",120,1.4,31.2,0.3,"50 ก.","ผลไม้",2.5,14,0.1,undefined,0,315],   // Tamarinds, raw
["ฝรั่ง 1 ผล",112,4.2,23.6,1.6,"1 ผล 165 ก.","ผลไม้",8.9,3,0.4,undefined,0,687],   // Guavas, common, raw
["ทุเรียนหมอนทอง 2 พู",176,1.8,32.5,6.4,"2 พู 120 ก.","ผลไม้",4.6,2,undefined,undefined,0,522],   // Durian, raw or frozen
["ละมุด",141,0.7,33.9,1.9,"1 ผล 170 ก.","ผลไม้",9.0,20,0.3,undefined,0,328],   // Sapodilla, raw
["น้อยหน่า 1 ผล",146,3.2,36.6,0.4,"1 ผล 155 ก.","ผลไม้",6.8,14,0.1,undefined,0,384],   // Sugar-apples, (sweetsop), raw
["เสาวรส",17,0.4,4.2,0.1,"1 ผล 18 ก.","ผลไม้",1.9,5,0.0,undefined,0,61],   // Passion-fruit, (granadilla), purple, raw
["มะเฟือง",28,0.9,6.1,0.3,"1 ผล 91 ก.","ผลไม้",2.5,2,0.0,undefined,0,120],   // Carambola, (starfruit), raw
["มะพร้าวอ่อน (เนื้อ)",177,1.7,7.6,16.7,"50 ก.","ผลไม้",4.5,10,14.8,undefined,0,178],   // Nuts, coconut meat, raw
// --- เครื่องดื่ม ---
["น้ำมะพร้าว",46,1.7,8.9,0.5,"1 แก้ว 240 มล.","เครื่องดื่ม",2.6,252,0.4,undefined,0,605],   // Nuts, coconut water (liquid from coconuts)
// --- ผลไม้ ---
["ลูกพลับ",118,1.0,31.2,0.3,"1 ผล 168 ก.","ผลไม้",6.0,2,0.0,undefined,0,271],   // Persimmons, japanese, raw
["สาลี่",101,0.6,27.1,0.2,"1 ผล 178 ก.","ผลไม้",5.5,2,0.0,undefined,0,206],   // Pears, raw
["สตรอว์เบอร์รี",46,1.0,11.1,0.4,"10 ผล 144 ก.","ผลไม้",2.9,1,0.0,undefined,0,220],   // Strawberries, raw
["บลูเบอร์รี",84,1.1,21.4,0.5,"1 ถ้วย 148 ก.","ผลไม้",3.6,1,0.0,undefined,0,113],   // Blueberries, raw
["เชอร์รีหวาน",43,0.7,10.9,0.1,"10 ผล 68 ก.","ผลไม้",1.4,0,0.0,undefined,0,152],   // Cherries, sweet, raw
["กีวี",46,0.9,11.0,0.4,"1 ผล 75 ก.","ผลไม้",2.2,2,0.0,undefined,0,235],   // Kiwifruit, green, raw
["อินทผลัม",133,0.9,36.0,0.1,"2 ผล 48 ก.","ผลไม้",3.2,0,undefined,undefined,0,334],   // Dates, medjool
["ลูกพรุนแห้ง",101,0.9,26.8,0.2,"5 ผล 42 ก.","ผลไม้",3.0,1,0.0,undefined,0,308],   // Plums, dried (prunes), uncooked
["อะโวคาโด",160,2.0,8.5,14.7,"ครึ่งลูก 100 ก.","ผลไม้",6.7,7,2.1,undefined,0,485],   // Avocados, raw, all commercial varieties
["แคนตาลูป",54,1.3,13.1,0.3,"1 จานเล็ก 160 ก.","ผลไม้",1.4,26,0.1,undefined,0,424],   // Melons, cantaloupe, raw
["เกรปฟรุต",41,0.8,10.3,0.1,"ครึ่งผล 123 ก.","ผลไม้",1.4,0,0.0,undefined,0,184],   // Grapefruit, raw, white, all areas
["พุทรา",79,1.2,20.2,0.2,"10 ผล 100 ก.","ผลไม้",undefined,3,undefined,undefined,0,250],   // Jujube, raw
["ลำไยอบแห้ง",86,1.5,22.2,0.1,"30 ก.","ผลไม้",undefined,14,undefined,undefined,0,198],   // Longans, dried
// --- เครื่องดื่ม ---,

// ===== เพิ่มจากตารางคุณค่าโภชนาการอาหารไทย 2561 · สำนักโภชนาการ กรมอนามัย =====
// ตัวเลขผ่านการตรวจ 2 ชั้น: ผลรวมองค์ประกอบ = 100 ก. และพลังงานตรงกับ 4P+9F+4C+2ไฟเบอร์
// ตารางไทยไม่ได้วัดไขมันอิ่มตัว จึงเว้น undefined ให้แอปประมาณตามชนิดอาหารเหมือนเดิม
// --- วัตถุดิบ ---
["ผักบุ้งจีนสด",16,1.7,2.6,0.3,"100 ก.","วัตถุดิบ",2.3,130,undefined,undefined,0,270],   // 04120 ผักบุ้งจีน
["ผักคะน้าสด",31,2.7,5.4,0.5,"100 ก.","วัตถุดิบ",1.6,undefined,undefined,undefined,0,348],   // 04111 ผักคะน้า
["ผักกวางตุ้ง",11,1.5,1.6,0.2,"100 ก.","วัตถุดิบ",1.6,undefined,undefined,undefined,0,252],   // 04012 กวางตุ้ง, ต้นและใบ
["ผักกาดขาว",11,1.5,1.6,0.1,"100 ก.","วัตถุดิบ",0.5,undefined,undefined,undefined,0,238],   // 04099 ผักกาดขาว
["ผักกาดเขียว",22,2.1,3.4,0.2,"100 ก.","วัตถุดิบ",0.7,undefined,undefined,undefined,0,384],   // 04100 ผักกาดเขียว
["ปวยเล้ง",25,2.6,2.3,0.9,"100 ก.","วัตถุดิบ",0.7,undefined,undefined,undefined,0,558],   // 04095 ปวยเล้ง
["กะหล่ำปลีสด",14,1.6,2.2,0.1,"100 ก.","วัตถุดิบ",1.2,undefined,undefined,undefined,0,170],   // 04019 กะหล่าปลี
["กะหล่ำปลีม่วง",24,1.6,5.4,0.1,"100 ก.","วัตถุดิบ",2.3,undefined,undefined,undefined,0,293],   // 04020 กะหล่าปลี, สีม่วง
["ผักกูด",25,1.7,5.0,0.4,"100 ก.","วัตถุดิบ",1.4,undefined,undefined,undefined,0],   // 04106 ผักกูด
["ผักหวานป่า",55,7.0,7.1,1.1,"100 ก.","วัตถุดิบ",5.5,undefined,undefined,undefined,0],   // 04134 ผักหวาน, ป่า
["ผักหนาม",21,2.1,3.6,0.2,"100 ก.","วัตถุดิบ",0.8,undefined,undefined,undefined,0],   // 04132 ผักหนาม
["ใบบัวบก",38,1.8,7.4,0.9,"100 ก.","วัตถุดิบ",3.4,undefined,undefined,undefined,0],   // 04087 บัวบก,ใบ
["ใบเหลียง",83,6.6,15.8,1.2,"100 ก.","วัตถุดิบ",8.8,undefined,undefined,undefined,0],   // 04249 เหลียง, ใบ
["ยอดผักเสี้ยว (ชงโค)",60,6.3,8.9,0.8,"100 ก.","วัตถุดิบ",1.9,undefined,undefined,undefined,0],   // 04130 ผักเสี้ยว (ชงโค), ยอด
["ดอกขี้เหล็ก",78,4.9,18.7,0.4,"100 ก.","วัตถุดิบ",9.8,undefined,undefined,undefined,0],   // 04032 ขี้เหล็ก, ดอก
["ใบกะเพรา",32,3.2,5.3,0.6,"100 ก.","วัตถุดิบ",3.9,176,undefined,undefined,0,307],   // 04015 กะเพราขาว,ใบ
["ใบยี่หร่า",42,3.8,7.2,1.0,"100 ก.","วัตถุดิบ",5.7,undefined,undefined,undefined,0],   // 04200 ยี่หร่า,ใบ
["ผักชี",24,2.7,3.4,0.6,"100 ก.","วัตถุดิบ",3.0,undefined,undefined,undefined,0,521],   // 04112 ผักซี
["ผักชีฝรั่ง",27,2.0,5.2,0.6,"100 ก.","วัตถุดิบ",3.4,61,undefined,undefined,0,432],   // 04113 ผักซีฝรั่ง
["ผักชีลาว",32,3.4,4.5,0.8,"100 ก.","วัตถุดิบ",3.6,179,undefined,undefined,0,686],   // 04115 ผักซีลาว
["ใบต้นหอม",30,1.5,6.5,0.4,"100 ก.","วัตถุดิบ",2.5,39,undefined,undefined,0,313],   // 04053 ต้นหอม,ใบ
["ใบตั้งโอ๋",15,2.1,2.0,0.3,"100 ก.","วัตถุดิบ",1.9,51,undefined,undefined,0],   // 04056 ตั้งโอ๋,ใบ
["ต้นกระเทียม (ใบ)",40,3.2,6.4,0.8,"100 ก.","วัตถุดิบ",1.3,undefined,undefined,undefined,0],   // 04008 กระเทียม,ต้น
["หน่อข่าอ่อน",43,1.3,9.5,0.4,"100 ก.","วัตถุดิบ",0.9,13,undefined,undefined,0],   // 04028 ข่าอ่อน, หน่อ
["พริกขี้หนูสด",6,0.3,1.2,0.2,"10 ก.","วัตถุดิบ",0.9,undefined,undefined,undefined,0,44],   // 04138 พริกขี้หนู
["พริกชี้ฟ้าเขียว",11,0.3,2.6,0.1,"20 ก.","วัตถุดิบ",0.4,undefined,undefined,undefined,0,68],   // 04143 พริกชี้ฟ้า, เขียว
["พริกหยวก",23,1.1,5.0,0.2,"100 ก.","วัตถุดิบ",1.7,undefined,undefined,undefined,0,175],   // 04146 พริกหยวก
["ถั่วพู",21,2.3,3.8,0.2,"100 ก.","วัตถุดิบ",2.9,6,undefined,undefined,0,307],   // 04072 ถั่วพู
["ถั่วฝักยาวสด",35,2.8,6.6,0.3,"100 ก.","วัตถุดิบ",1.3,undefined,undefined,undefined,0,240],   // 04071 ถั่วฝักยาว, แดง
["ถั่วลันเตาฝัก",58,4.3,11.3,0.1,"100 ก.","วัตถุดิบ",1.4,undefined,undefined,undefined,0,200],   // 04074 ถั่วลันเตา
["บวบงู",19,1.3,3.8,0.2,"100 ก.","วัตถุดิบ",1.7,undefined,undefined,undefined,0,160],   // 04083 บวบงู
["บวบหอม",17,1.0,3.5,0.2,"100 ก.","วัตถุดิบ",1.4,undefined,undefined,undefined,0,189],   // 04084 บวบหอม
["บวบเหลี่ยม",18,0.7,3.6,0.2,"100 ก.","วัตถุดิบ",0.3,undefined,undefined,undefined,0,139],   // 04085 บวบเหลี่ยม
["น้ำเต้า",17,0.6,3.7,0.1,"100 ก.","วัตถุดิบ",0.3,undefined,undefined,undefined,0,150],   // 04080 น้้าเต้า, ผล
["เนื้อฟักทองสด",75,1.9,15.8,0.9,"100 ก.","วัตถุดิบ",2.0,undefined,undefined,undefined,0,340],   // 04154 ฟักทอง, เนื้อ
["ยอดฟักทอง",19,2.0,3.2,0.2,"100 ก.","วัตถุดิบ",0.8,undefined,undefined,undefined,0,436],   // 04156 ฟักทอง, ยอดอ่อน
["มะระขี้นก",20,1.2,4.6,0.4,"100 ก.","วัตถุดิบ",3.8,26,undefined,undefined,0,296],   // 04185 มะระขึ้นก
["มะระจีน",19,0.9,4.7,0.2,"100 ก.","วัตถุดิบ",2.2,8,undefined,undefined,0,315],   // 04186 มะระจีน
["มะเขือเปราะ",25,1.3,5.6,0.2,"100 ก.","วัตถุดิบ",2.3,undefined,undefined,undefined,0,438],   // 04174 มะเขือเปราะ, เจ้าพระยา
["มะเขือพวง",52,2.7,13.5,0.8,"100 ก.","วัตถุดิบ",10.1,undefined,undefined,undefined,0],   // 04175 มะเขือพวง
["มะเขือยาวม่วง",16,1.0,3.6,0.2,"100 ก.","วัตถุดิบ",2.1,undefined,undefined,undefined,0,207],   // 04177 มะเขือยาว, สีม่วง
["มะเขือไข่เต่า",32,1.6,7.3,0.4,"100 ก.","วัตถุดิบ",3.3,2,undefined,undefined,0,303],   // 04170 มะเขือไข่เต่า, สีม่วง
["มะเขือเทศลูกเล็ก",24,1.1,4.7,0.3,"100 ก.","วัตถุดิบ",1.1,undefined,undefined,undefined,0,237],   // 04171 มะเขือเทศ, ลูกเล็ก
["มะเขือเทศลูกใหญ่",15,0.6,3.3,0.2,"100 ก.","วัตถุดิบ",1.1,undefined,undefined,undefined,0,156],   // 04172 มะเขือเทศ, ลูกใหญ่
["มะละกอดิบ (ส้มตำ)",37,0.8,8.9,0.1,"100 ก.","วัตถุดิบ",0.8,undefined,undefined,undefined,0,182],   // 04188 มะละกอดิบ, ผลป้อม
["แตงร้าน",10,0.7,1.9,0.1,"100 ก.","วัตถุดิบ",1.0,undefined,undefined,undefined,0,212],   // 04065 แตงร้าน
["ข้าวโพดอ่อน",29,2.3,5.3,0.3,"100 ก.","วัตถุดิบ",2.1,undefined,undefined,undefined,0,244],   // 04026 ข้าวโพด, อ่อน
["ขนุนอ่อน",35,1.6,8.3,1.0,"100 ก.","วัตถุดิบ",6.7,undefined,undefined,undefined,0],   // 04024 ขนุน, อ่อน
["หน่อไม้ไผ่ป่า",33,2.4,6.4,0.2,"100 ก.","วัตถุดิบ",1.0,undefined,undefined,undefined,0,533],   // 04222 หน่อไม้ไผ่ป่า
["หน่อไม้ต้ม",22,1.8,3.7,0.6,"100 ก.","วัตถุดิบ",2.3,undefined,undefined,undefined,0,533],   // 04223 หน่อไม้พันธุ์กิมซุง, ต้ม
["หน่อไม้หวาน",21,1.5,3.9,0.3,"100 ก.","วัตถุดิบ",0.8,undefined,undefined,undefined,0,533],   // 04226 หน่อไม้หวาน, หน่อใหญ่
["หน่อเหรียง",94,7.5,9.3,3.5,"100 ก.","วัตถุดิบ",1.3,undefined,undefined,undefined,0],   // 04229 หน่อเหรียง
["หยวกกล้วย",15,0.8,3.2,0.2,"100 ก.","วัตถุดิบ",0.6,undefined,undefined,undefined,0],   // 04232 หยวกกล้วย, อ่อน
["ยอดมันเทศ",58,3.6,10.6,0.8,"100 ก.","วัตถุดิบ",1.4,undefined,undefined,undefined,0],   // 04192 มันเทศ, ใบอ่อน
["ยอดมะระ",87,5.8,17.1,0.3,"100 ก.","วัตถุดิบ",1.9,undefined,undefined,undefined,0,608],   // 04184 มะระ, ยอดอ่อน
["ใบมะขามอ่อน",59,3.6,11.4,0.3,"100 ก.","วัตถุดิบ",1.0,undefined,undefined,undefined,0],   // 04163 มะขาม, ใบอ่อน
["ลูกมะกอกไทย",88,0.7,23.1,0.2,"100 ก.","วัตถุดิบ",2.3,undefined,undefined,undefined,0],   // 04160 มะกอกไทย, ผล
["มะเขือขาวดอง",34,1.2,7.9,0.6,"100 ก.","วัตถุดิบ",2.0,undefined,undefined,undefined,0],   // 04166 มะเขือขาว, ดอง
["เห็ดนางฟ้า",35,2.3,6.4,0.3,"100 ก.","วัตถุดิบ",0.7,undefined,undefined,undefined,0,420],   // 04241 เห็ดนางฟ้า
["เห็ดนางรม",30,2.1,5.3,0.3,"100 ก.","วัตถุดิบ",0.5,undefined,undefined,undefined,0,420],   // 04242 เห็ดนางรม
["เห็ดฟาง",35,3.2,5.9,0.2,"100 ก.","วัตถุดิบ",0.9,undefined,undefined,undefined,0,78],   // 04243 เห็ดบัว (เห็ดฟาง)
["เห็ดเข็มทอง",25,1.7,5.4,0.1,"100 ก.","วัตถุดิบ",2.4,7,undefined,undefined,0,291],   // 04237 เห็ดเข็มทอง
["เห็ดหอมสด",24,2.2,4.5,0.3,"100 ก.","วัตถุดิบ",2.7,2,undefined,undefined,0,233],   // 04247 เห็ดหอมสด
["เห็ดหูหนูสด",50,1.4,12.7,0.1,"100 ก.","วัตถุดิบ",1.8,undefined,undefined,undefined,0],   // 04248 เห็ดหูหนูสด
["เห็ดเผาะ",47,2.2,10.9,0.4,"100 ก.","วัตถุดิบ",2.3,undefined,undefined,undefined,0],   // 04245 เห็ดเผาะ
["มันแกว",35,0.9,8.2,0.1,"100 ก.","วัตถุดิบ",1.4,undefined,undefined,undefined,0,150],   // 02005 มันแกว,ดิบ
["มันเทศเนื้อม่วง",102,0.8,25.5,0.2,"100 ก.","วัตถุดิบ",2.4,21,undefined,undefined,0,250],   // 02011 มันเทศ, เนื้อสีม่วงแดง, ดิบ
["หัวไชเท้า",22,0.8,5.5,0.0,"100 ก.","วัตถุดิบ",0.7,undefined,undefined,undefined,0,233],   // 02021 หัวผักกาด,หัวไซชเท้า, ดิบ
// --- ผลไม้ ---
["กล้วยน้ำว้า 100 ก.",143,1.1,35.4,0.2,"100 ก.","ผลไม้",2.3,undefined,undefined,undefined,0,358],   // 05015 กล้วยน้าว้า, สุก
["กล้วยหอม 100 ก.",128,0.9,31.7,0.2,"100 ก.","ผลไม้",1.9,undefined,undefined,undefined,0,358],   // 05021 กล้วยหอม, สุก
["กล้วยไข่สุก",108,1.2,26.2,0.2,"100 ก.","ผลไม้",1.9,undefined,undefined,undefined,0,269],   // 05001 กล้วยไข่, สุก
["กล้วยหักมุกสุก",109,0.8,28.5,0.2,"100 ก.","ผลไม้",5.1,undefined,undefined,undefined,0,359],   // 05026 กล้วยหักมุกนวล , สุก
["มังคุด",79,0.5,20.1,0.0,"100 ก.","ผลไม้",1.7,undefined,undefined,undefined,0,48],   // 05110 มังคุด
["เงาะโรงเรียน",73,1.0,17.4,0.3,"100 ก.","ผลไม้",1.6,undefined,undefined,undefined,0,161],   // 05036 เงาะ,โรงเรียน
["ลางสาด",67,0.9,15.9,0.1,"100 ก.","ผลไม้",0.3,undefined,undefined,undefined,0,266],   // 05116 ลางสาด
["ลำไยกะโหลก",77,0.9,18.4,0.1,"100 ก.","ผลไม้",0.2,undefined,undefined,undefined,0,266],   // 05118 ลําใย, กะโหลก
["ชมพู่",26,0.5,6.6,0.0,"100 ก.","ผลไม้",1.1,undefined,undefined,undefined,0,123],   // 05044 ชมพู่,เมืองเพชร
["น้อยหน่า 100 ก.",92,1.4,22.6,0.2,"100 ก.","ผลไม้",2.7,undefined,undefined,undefined,0,247],   // 05065 น้อยหน่า
["พุทราไทย",89,1.7,19.7,0.8,"100 ก.","ผลไม้",1.0,undefined,undefined,undefined,0,250],   // 05073 พุทราไทย
["ระกำ",50,0.6,12.2,0.2,"100 ก.","ผลไม้",0.7,undefined,undefined,undefined,0],   // 05111 ระกํา
["มะไฟ",48,0.7,11.4,0.3,"100 ก.","ผลไม้",0.9,undefined,undefined,undefined,0],   // 05085 มะไฟ
["ลูกหว้า",52,0.9,13.6,0.1,"100 ก.","ผลไม้",3.3,undefined,undefined,undefined,0,199],   // 05129 ลูกหว้า
["ขนุน 100 ก.",118,2.2,27.4,0.4,"100 ก.","ผลไม้",2.2,undefined,undefined,undefined,0,355],   // 05031 ขนุน, จําปา
["แก้วมังกรเนื้อชมพู",59,1.3,12.9,1.0,"100 ก.","ผลไม้",3.4,undefined,undefined,undefined,0,287],   // 05028 แก้วมังกร, เนื้อชมพู
["แก้วมังกรเนื้อขาว",59,1.3,11.9,0.7,"100 ก.","ผลไม้",0.0,undefined,undefined,undefined,0],   // 05029 แก้วมังกร,เนื้อสีขาว
["แตงไทยสุก",13,0.2,3.4,0.0,"100 ก.","ผลไม้",0.3,undefined,undefined,undefined,0,267],   // 05050 แตงไทย,สุก
["แตงโมกินรี",33,0.7,7.5,0.1,"100 ก.","ผลไม้",0.4,undefined,undefined,undefined,0,122],   // 05051 แตงโม,กินรี
["ฝรั่งแป้นสีทอง",37,0.5,9.9,0.2,"100 ก.","ผลไม้",3.3,4,undefined,undefined,0,417],   // 05069 ฝรั่ง, แป้นสีทอง
["มะม่วงคาราบาวสุก",61,0.5,14.0,0.6,"100 ก.","ผลไม้",1.0,undefined,undefined,undefined,0,168],   // 05091 มะม่วง, คาราบาว, สุก
["มะม่วงดิบ (แก้ว)",71,0.5,18.1,0.2,"100 ก.","ผลไม้",2.4,undefined,undefined,undefined,0,168],   // 05086 มะม่วง, แก้ว, ดิบ
["มะละกอฮอลแลนด์สุก",39,0.7,9.7,0.1,"100 ก.","ผลไม้",1.7,undefined,undefined,undefined,0,224],   // 05108 มะละกอ, ฮอลแลนด์,สุก
["ส้มสายน้ำผึ้ง",49,0.8,11.1,0.2,"100 ก.","ผลไม้",1.0,undefined,undefined,undefined,0,157],   // 05138 ส้มสายน้าผึ้ง
["ส้มโอขาวใหญ่",50,0.8,12.0,0.2,"100 ก.","ผลไม้",1.7,undefined,undefined,undefined,0,206],   // 05143 สัมโอ, ขาวใหญ่
["สับปะรดภูเก็ต",66,0.7,16.3,0.1,"100 ก.","ผลไม้",1.4,undefined,undefined,undefined,0,160],   // 05147 สัปปะรด, ภูเก็ต
["องุ่นเขียว",51,0.5,12.5,0.1,"100 ก.","ผลไม้",1.0,undefined,undefined,undefined,0,190],   // 05153 องุ่นเขียิวะ
["องุ่นแดง",61,0.5,14.9,0.2,"100 ก.","ผลไม้",1.0,undefined,undefined,undefined,0,246],   // 05156 องุ่นแดงนอก, ลูกเล็ก
["แอปเปิ้ลเขียว",47,0.2,12.1,0.2,"100 ก.","ผลไม้",2.2,undefined,undefined,undefined,0,127],   // 05157 แอปเปิ้ลเขียว
["แอปเปิ้ลแดงฟูจิ",47,0.2,11.8,0.2,"100 ก.","ผลไม้",1.5,undefined,undefined,undefined,0,106],   // 05160 แอปเปิ้ลแดงลาย,ฟูจิ
// --- วัตถุดิบ ---
["ข้าวเหนียวนึ่ง",138,2.5,31.4,0.4,"1 ทัพพี 60 ก.","วัตถุดิบ",0.3,undefined,undefined,undefined,0,6],   // 01039 ข้าวเหนียว,นึ่ง
["ข้าวกล้องหอมมะลิ (ข้าวสาร)",357,7.7,75.2,3.5,"100 ก.","วัตถุดิบ",3.3,20,undefined,undefined,0,250],   // 01011 ข้าวกล้อง, หอมมะลิ, ดิบ
["ข้าวสังข์หยด (ข้าวสาร)",359,9.0,73.1,4.2,"100 ก.","วัตถุดิบ",3.8,undefined,undefined,undefined,0,250],   // 01023 ข้าวเจ้า, สังข์หยด, ดิบ
["ข้าวเหนียวดำ (ข้าวสาร)",354,8.2,76.1,3.0,"100 ก.","วัตถุดิบ",4.9,undefined,undefined,undefined,0,250],   // 01037 ข้าวเหนียวดํา, ดิบ
["ก๋วยเตี๋ยวเส้นเล็กสด",220,4.4,49.4,0.6,"1 ก้อน 100 ก.","วัตถุดิบ",0.2,undefined,undefined,undefined,0,4],   // 01002 ก๋วยเตี๋ยว, เส้นเล็ก, เส้นสด
["ก๋วยเตี๋ยวเส้นใหญ่สด",135,2.5,29.6,0.8,"1 ก้อน 100 ก.","วัตถุดิบ",0.1,undefined,undefined,undefined,0,4],   // 01003 ก๋วยเตี๋ยว, เส้นใหญ่, เส้นสด
["ขนมจีนแป้งสด",54,0.8,12.7,0.0,"1 จับ 60 ก.","วัตถุดิบ",0.1,undefined,undefined,undefined,0,2],   // 01004 ขนมจีน, แป้งสด
["ขนมจีนแป้งหมัก",46,0.5,11.0,0.1,"1 จับ 60 ก.","วัตถุดิบ",0.1,undefined,undefined,undefined,0,2],   // 01005 ขนมจีน, แป้งหมัก
["ขนมปังปอนด์",99,3.7,18.9,1.0,"1 แผ่น 30 ก.","วัตถุดิบ",0.1,undefined,undefined,undefined,0,38],   // 01006 ขนมปังปอนด์
["เต้าหู้เหลือง",150,13.5,9.1,6.7,"100 ก.","วัตถุดิบ",0.3,undefined,undefined,undefined,0,237],   // 03015 เต้าหู้เหลือง
["ถั่วลิสงอบเกลือ",181,8.3,6.2,14.3,"1 กำมือ 30 ก.","วัตถุดิบ",3.1,undefined,undefined,undefined,0,190],   // 03039 ถั่วลิสง,อบเกลือ, รวมเยื่อหุ้มเมล็ด
["หมูเนื้อแดงดิบ",110,19.6,0.4,3.3,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,389],   // 06050 หมู, เนื้อ, ดิบ
["ตับหมูดิบ",117,19.8,2.6,3.0,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,273],   // 06054 หมู,ตับ, ดิบ
["มันหมูดิบ",714,4.7,2.7,76.0,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,65],   // 06057 หมู,มัน, ดิบ
["เนื้อไก่รวมดิบ",165,19.5,0.0,9.7,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,229],   // 06005 ไก่, เนื้อ, ดิบ
["ไก่บ้านเนื้อล้วนดิบ",111,20.8,0.0,3.1,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,229],   // 06012 ไก่บ้าน,กิ้น, ดิบ
["สะโพกไก่บ้านมีหนัง",124,21.1,0.0,4.4,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,204],   // 06015 ไก่บ้าน, สะโพก, เนื้อและหนัง, ดิบ
["แคบหมูมีมัน",188,14.7,0.0,14.3,"30 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,38],   // 06023 แคบหมู,มีมัน
["แคบหมูไม่มีมัน",154,16.9,3.4,8.1,"30 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,38],   // 06024 แคบหมู,ไม่มีมัน
["ไส้กรอกค็อกเทลหมู",242,11.8,7.2,18.4,"100 ก.","วัตถุดิบ",0.0,712,undefined,undefined,0,151],   // 06044 ไส้กรอกคอกเทล, หมู
["ไส้กรอกเวียนนาหมู",263,14.5,2.1,21.8,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,101],   // 06046 ไส้กรอกเวียนนา, หมู
["ไส้อั่ว",420,18.0,5.7,36.1,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,194],   // 06048 ไส้อั้ว, ดิบ
["นกกระทา",116,18.5,0.0,4.7,"100 ก.","วัตถุดิบ",0.0,93,undefined,undefined,0,246],   // 06025 นกกระทา, ดิบ
["ปลาช่อนสด",122,20.5,1.4,3.8,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07024 ปลาชซ่อน, สด
["ปลาดุกสด",114,23.0,0.0,2.4,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,358],   // 07027 ปลาดุก, สด
["ปลาทูสด",140,20.0,0.0,6.7,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,406],   // 07035 ปลาทู,สด
["ปลาทูนึ่ง 1 ตัว",82,14.9,0.0,2.4,"1 ตัว 60 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,244],   // 07034 ปลาทู,นึ่ง
["ปลาสลิดสด",76,17.2,0.0,0.8,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07059 ปลาสลิด, สด
["ปลานิลสด",93,18.2,0.0,2.2,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,302],   // 07041 ปลานิล, สด
["ปลาทับทิมสด",113,21.0,0.7,2.9,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,302],   // 07039 ปลาทับทิม, สด
["ปลากะพงขาวสด",100,21.3,0.0,1.6,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,1087],   // 07015 ปลากะพงขาว, สด
["ปลาตะเพียนสด",111,20.4,0.1,3.2,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07031 ปลาตะเพียน, สด
["ปลาหมอสด",133,17.2,0.1,7.1,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07068 ปลาหมอ, สด
["ปลาสวายสด",256,15.5,0.1,21.5,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07062 ปลาสวาย, สด
["ปลาไหลสด",87,18.9,0.1,1.2,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,272],   // 07074 ปลาไหล, สด
["ปลาทูน่าสด",110,24.8,0.0,1.2,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,441],   // 07036 ปลาทูน่า, สด
["ปลาโอสด",109,24.5,0.2,1.1,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,876],   // 07078 ปลาโอ, สด
["ปลาหมึกกล้วยสด",62,13.7,0.4,0.6,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,246],   // 07070 ปลาหมึกกระเป๋า, สด
["กุ้งกุลาดำสด",120,14.3,5.7,4.4,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,264],   // 07003 กุ้งกุลาดํา,หัว, สด
["กุ้งแห้ง",26,4.6,1.3,0.3,"1 ช้อนโต๊ะ 10 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07008 กุ้งตัวเล็ก, แห้ง
["ปูม้านิ่มสด",59,10.5,0.8,1.1,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,259],   // 07083 ปูม้า, นิ่ม,สด
["หอยแครงสด",81,12.9,4.3,1.3,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,46],   // 07094 หอยแครง, สด
["หอยแมลงภู่สด",53,8.1,3.1,0.9,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0,320],   // 07098 หอยแมลงภู่, สด
["หอยขมสด",74,12.1,4.9,0.7,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07091 หอยขม, สด
["ปลาร้า",22,2.3,0.6,1.2,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07050 ปลารั้า
["ลูกชิ้นปลาทอด",277,21.7,15.2,14.4,"100 ก.","วัตถุดิบ",0.0,undefined,undefined,undefined,0],   // 07086 ลูกชิ้นปลา, ทอด
// --- เครื่องดื่ม ---
["นมวัวดิบ",130,7.7,8.4,7.2,"1 แก้ว 240 มล.","เครื่องดื่ม",0.0,127,undefined,0.0,0,397],   // 09031 นมวัว, ดิบ
["นมยูเอชทีรสจืด",133,6.8,8.4,8.0,"1 กล่อง 200 มล.","เครื่องดื่ม",0.0,undefined,undefined,0.0,0,264],   // 09003 นม, ยูเอชที, รสธรรมชาติ
["นมยูเอชทีรสหวาน",141,6.8,11.3,7.8,"1 กล่อง 200 มล.","เครื่องดื่ม",0.0,undefined,undefined,undefined,0,264],   // 09004 นม, ย ูเอชที, รสหวาน
["นมแพะดิบ",198,9.8,10.4,13.2,"1 แก้ว 240 มล.","เครื่องดื่ม",0.0,208,undefined,0.0,0,460],   // 09028 นมแพะ, ดิบ
["โยเกิร์ตจืด 1 ถ้วย",160,5.7,20.9,6.0,"1 ถ้วย 150 ก.","เครื่องดื่ม",0.0,undefined,undefined,0.0,0,232],   // 09035 โยเกิร์ต, รสธรรมชาติ
["โยเกิร์ตไขมันต่ำรสผลไม้",138,4.9,26.8,1.2,"1 ถ้วย 150 ก.","เครื่องดื่ม",0.0,undefined,undefined,undefined,0,292],   // 09034 โยเกิร์ต, ไขมันต่า, รสผลไม้รวม
// --- จานเดียว ---
["ส้มตำอีสาน",56,3.6,10.8,0.6,"1 จาน 200 ก.","จานเดียว",1.8,undefined,undefined,undefined,0,350],   // 11204 สัมตํา, อีสาน
// --- กับข้าว ---
["ลาบเนื้อ (รวมผักสด)",168,18.6,11.0,6.0,"1 จาน 150 ก.","กับข้าว",2.1,undefined,undefined,undefined,0,414],   // 11201 ลาบเนื้อ, รวมผักสด
["ลาบเลือดอีสาน",148,23.5,11.2,1.8,"1 จาน 150 ก.","กับข้าว",1.7,undefined,undefined,undefined,0,400],   // 11202 ลาบเลือด, อีสาน
// --- จานเดียว ---
["ขนมจีนน้ำยากะทิ",188,8.0,24.2,8.3,"1 จาน 250 ก.","จานเดียว",7.8,795,undefined,undefined,0,331],   // 11161 ขนมจีนน้ายากะทิ
["ขนมจีนน้ำพริก (รวมผัก)",380,8.5,49.5,16.5,"1 จาน 250 ก.","จานเดียว",0.8,undefined,undefined,undefined,0,250],   // 11142 ขนมจีนน้าพริก, รวมผัก
// ===== ป๊อปคอร์น (USDA SR Legacy — ค่าห้องแล็บ) =====
["ป๊อปคอร์นคั่วลม 1 ถ้วย",31,1.0,6.2,0.4,"1 ถ้วย 8 ก.","ของหวาน",1.2,1,0,0,0,26],   // 167959 Snacks, popcorn, air-popped
["ป๊อปคอร์นคั่วลม 100 ก.",387,12.9,77.8,4.5,"100 ก.","ของหวาน",14.5,8,0.6,0,0,329],   // 167959
["ป๊อปคอร์นคั่วน้ำมันใส่เกลือ 1 ถ้วย",55,1.0,6.3,3.1,"1 ถ้วย 11 ก.","ของหวาน",1.1,97,0.5,0,0,25],   // 170247 oil-popped, salt added
["ป๊อปคอร์นไมโครเวฟ รสเนย 1 ถุง",485,6.5,48.0,29.6,"1 ถุง 87 ก.","ของหวาน",8.7,665,6.3,0.5,0,209],   // 174785 microwave, butter flavor
["ป๊อปคอร์นไมโครเวฟ ไขมันต่ำ 1 ถุง",127,3.8,21.6,2.9,"1 ถุง 30 ก.","ของหวาน",4.3,189,0.4,0.3,0,72],   // 174778 microwave, low fat
["ป๊อปคอร์นคาราเมล 1 ถ้วย",151,1.3,27.7,4.5,"1 ถ้วย 35 ก.","ของหวาน",1.8,72,1.3,18.6,0,38],   // 167552 caramel-coated, without peanuts
["ป๊อปคอร์นคาราเมลใส่ถั่ว 1 ถ้วย",160,2.6,32.3,3.1,"1 ถ้วย 40 ก.","ของหวาน",1.5,71,0.4,18.2,0,142],   // 167551 caramel-coated, with peanuts
["ป๊อปคอร์นรสชีส 1 ถ้วย",58,1.0,5.7,3.7,"1 ถ้วย 11 ก.","ของหวาน",1.1,98,0.7,0.1,0,29],   // 167960 cheese-flavor
["ป๊อปคอร์นโรงหนัง รสเค็ม/เนย (ถ้วยกลาง)",450,8.1,51.5,25.3,"ถ้วยกลาง ~90 ก.","ของหวาน",9.0,796,4.4,0,0,202],   // ประมาณ: 170247 × 90 ก.
["ป๊อปคอร์นโรงหนัง รสคาราเมล (ถ้วยกลาง)",388,3.4,71.2,11.5,"ถ้วยกลาง ~90 ก.","ของหวาน",4.7,185,3.2,47.9,0,98],   // ประมาณ: 167552 × 90 ก.
["ข้าวโพดอัดแผ่น (ป๊อปคอร์นเค้ก)",38,1.0,8.0,0.3,"1 แผ่น 10 ก.","ของหวาน",0.3,29,0.1,0,0,32],   // 167550 popcorn cakes

// ===== เนื้อวัว: ชิ้นส่วนต่าง ๆ (USDA SR Legacy — ค่าห้องแล็บ, สุกแล้ว 100 ก.) =====
["สเต๊กริบอายย่าง (เลาะมันออก)",215,27.4,0,11.8,"100 ก.","วัตถุดิบ",0,60,4.6,0,0,282],   // 172144 rib eye, lip off, lean only, grilled
["สเต๊กริบอายย่าง (ติดมัน)",365,22.6,0,29.8,"100 ก.","วัตถุดิบ",0,64,12.0,0,0,302],   // 168677 rib whole, lean and fat, choice, roasted
["สเต๊กเนื้อสันนอก (เซอร์ลอยน์) ย่าง",211,29.2,0,9.5,"100 ก.","วัตถุดิบ",0,59,3.9,0,0,367],   // 169455 top loin steak, lean only, broiled
["สเต๊กเนื้อสันในติดมัน (เกรดไพร์ม)",308,25.3,0,22.2,"100 ก.","วัตถุดิบ",0,59,8.8,0,0,368],   // 169548 tenderloin, lean and fat, prime, broiled
["สเต๊กทีโบนย่าง (เลาะมันออก)",198,26.0,0,9.6,"100 ก.","วัตถุดิบ",0,71,3.3,0,0,327],   // 168644 t-bone, lean only, broiled
["สเต๊กทีโบนย่าง (ติดมัน)",294,24.2,0,21.1,"100 ก.","วัตถุดิบ",0,63,8.7,0,0,240],   // 169537 t-bone, lean and fat, broiled
["สเต๊กเนื้อสันแหลม (แฟลงก์) ย่าง",194,27.8,0,8.3,"100 ก.","วัตถุดิบ",0,56,3.5,0,0,338],   // 168611 flank steak, lean only, broiled
["สเต๊กเนื้อสเกิร์ตย่าง",205,26.7,0,10.1,"100 ก.","วัตถุดิบ",0,76,3.9,0,0,295],   // 168744 inside skirt steak, lean only, broiled
["เนื้ออกวัวตุ๋น (บริสเก็ต) เลาะมัน",218,29.8,0,10.1,"100 ก.","วัตถุดิบ",0,70,3.6,0,0,285],   // 170612 brisket whole, lean only, braised
["เนื้ออกวัวตุ๋น (บริสเก็ต) ติดมัน",331,25.9,0,24.5,"100 ก.","วัตถุดิบ",0,64,9.4,0,0,251],   // 168665 brisket whole, lean and fat, braised
["เนื้อสันคอวัวตุ๋น (ชัค)",224,34.7,0,8.4,"100 ก.","วัตถุดิบ",0,56,3.2,0,0,275],   // 171817 chuck arm pot roast, lean only, braised
["ซี่โครงเนื้อตุ๋น (เลาะมันออก)",250,28.8,0,14.9,"100 ก.","วัตถุดิบ",0,75,4.2,0,0,264],   // 169567 chuck short ribs, lean only, braised
["ซี่โครงเนื้อตุ๋น (ติดมัน)",287,25.8,0,20.4,"100 ก.","วัตถุดิบ",0,71,9.1,0,0,269],   // 170825 chuck short ribs, lean and fat, braised
["เนื้อสะโพกวัวตุ๋น (ท็อปราวด์)",207,36.1,0,5.8,"100 ก.","วัตถุดิบ",0,45,2.0,0,0,334],   // 170235 top round, lean only, braised
["เนื้อน่องในวัวอบ (อายออฟราวด์)",163,29.6,0,4.1,"100 ก.","วัตถุดิบ",0,39,1.4,0,0,245],   // 171807 eye of round roast, lean only, roasted
["เนื้อน่องวัวดิบ (แชงก์)",128,21.8,0,3.9,"100 ก.","วัตถุดิบ",0,63,1.3,0,0,387],   // 169441 shank crosscuts, lean only, raw
["เนื้อวัวบด 80% ปิ้งสุก",246,24.0,0,15.9,"100 ก.","วัตถุดิบ",0,83,6.0,0,0,335],   // 171798 ground 80/20 patty, pan-broiled
["เนื้อวัวบด 90% ปิ้งสุก",204,25.2,0,10.7,"100 ก.","วัตถุดิบ",0,75,4.2,0,0,363],   // 171793 ground 90/10 patty, pan-broiled
["เนื้อวัวบด 95% ปิ้งสุก",164,25.8,0,5.9,"100 ก.","วัตถุดิบ",0,71,2.6,0,0,376],   // 171792 ground 95/5 patty, pan-broiled
["ตับวัวทอด",175,26.5,5.2,4.7,"100 ก.","วัตถุดิบ",0,77,2.5,0,0,351],   // 168627 beef liver, pan-fried
["เนื้อวัวอบแห้ง (เจอร์กี้) 1 ห่อ",123,10.0,3.3,7.7,"1 ห่อ 30 ก.","ของหวาน",0.5,536,3.2,2.7,0,179],   // 167536 beef jerky × 30 ก.
["เนื้อสไลด์ชาบู/สุกี้ (ติดมัน) ดิบ",250,18.0,0,20.0,"100 ก.","วัตถุดิบ",0,60,8.0,0,0,373],   // ประมาณจากเนื้อสันคอติดมัน
["เนื้อวากิวสไลด์ ดิบ",400,14.0,0,38.0,"100 ก.","วัตถุดิบ",0,55,15.0,0,0,357],   // ประมาณ (มันแทรกสูง)
["ลูกชิ้นเนื้อวัว",180,14.0,10.0,9.0,"100 ก.","วัตถุดิบ",0.3,800,3.5,0.5,0],   // ประมาณจากส่วนผสม (เนื้อ+แป้ง+เกลือ)

// ===== หมู/ไก่ ชิ้นส่วนเพิ่มเติม (USDA SR Legacy) =====
["คอหมูย่าง (ติดมัน) 100 ก.",269,23.1,0,18.9,"100 ก.","วัตถุดิบ",0,67,7.0,0,0,332],   // 168259 pork blade Boston, lean and fat, roasted
["คอหมูย่าง (เลาะมัน) 100 ก.",232,24.2,0,14.3,"100 ก.","วัตถุดิบ",0,88,5.2,0,0,427],   // 167852 pork blade Boston, lean only, roasted
["หมูสันนอกย่างสุก",210,28.6,0,9.8,"100 ก.","วัตถุดิบ",0,64,3.6,0,0,438],   // 168232 pork loin whole, lean only, broiled
["ซี่โครงหมูตุ๋นสุก",397,29.1,0,30.3,"100 ก.","วัตถุดิบ",0,93,11.1,0,0,320],   // 167854 pork spareribs, lean and fat, braised

// ===== สเต๊กจานเสิร์ฟ (คำนวณจากส่วนผสม — ค่าประมาณ) =====
["สเต๊กเนื้อสันนอก 1 จาน (เนื้อ 200 ก.)",700,62.0,26.0,37.0,"เนื้อ 200 ก. (ทั้งจาน)","จานเดียว",2.5,900,12.0,4.0,0,920],
["สเต๊กเนื้อ ร้านทั่วไป 1 จาน (เนื้อ 120 ก. + เฟรนช์ฟรายส์)",770,41.6,54.0,39.8,"เนื้อ 120 ก. (ทั้งจาน)","จานเดียว",4.6,830,11.0,6.0,0,715],
["สเต๊กริบอาย 1 จาน (เนื้อ 250 ก.)",700,66.0,3.0,47.0,"เนื้อ 250 ก. (ทั้งจาน)","จานเดียว",0.3,700,20.0,1.0,0,900],
["สเต๊กหมู 1 จาน (ร้านทั่วไป)",750,45.0,52.0,40.0,"หมู 150 ก. (ทั้งจาน)","จานเดียว",4.5,800,12.0,6.0,0,890],
["สเต๊กอกไก่ 1 จาน (ไก่ 180 ก.)",650,52.0,45.0,29.0,"ไก่ 180 ก. (ทั้งจาน)","จานเดียว",4.5,850,7.5,5.0,0,870],
["สเต๊กปลาแซลมอน 1 จาน",630,42.0,35.0,34.0,"ปลา 180 ก. (ทั้งจาน)","จานเดียว",3.5,750,8.0,4.0,0,1000],

// ===== เมนูเนื้อไทย/ตุ๋น (คำนวณจากส่วนผสม — ค่าประมาณ) =====
["เนื้อแดดเดียวทอด 100 ก.",350,37.6,3.0,20.8,"100 ก.","วัตถุดิบ",0,1100,9.0,3.0,0,500],
["เนื้อแดดเดียวทอด 1 จาน",245,26.3,2.1,14.6,"1 จาน ~70 ก.","กับข้าว",0,770,6.3,2.1,0,420],
["หมูแดดเดียวทอด 100 ก.",360,37.5,3.0,22.0,"100 ก.","วัตถุดิบ",0,1100,8.5,3.0,0,450],
["เนื้อสวรรค์",370,35.0,10.0,20.0,"100 ก.","วัตถุดิบ",0,900,8.0,9.0,0,420],
["ต้มเนื้อเปื่อย 1 ถ้วย",210,27.3,2.0,9.2,"1 ถ้วย 250 ก.","กับข้าว",0.4,700,3.3,1.0,0,450],
["ต้มแซ่บเนื้อเปื่อย 1 ถ้วย",200,25.0,4.0,9.0,"1 ถ้วย 250 ก.","กับข้าว",0.8,850,3.3,1.0,0,450],
["ก๋วยเตี๋ยวเนื้อตุ๋น 1 ชาม",380,27.5,34.0,11.6,"1 ชาม (500 ก.)","ก๋วยเตี๋ยว",1.8,1950,4.5,3.0,0,520],
["แกงมัสมั่นเนื้อ 1 ถ้วย",480,30.0,19.0,30.5,"1 ถ้วย (250 ก.)","กับข้าว",2.0,1000,18.0,6.0,0,630],
["พะโล้เนื้อ 1 ถ้วย",290,33.0,10.0,12.5,"1 ถ้วย (250 ก.)","กับข้าว",0.2,1000,4.5,8.0,0,400],
["สตูว์เนื้อ 1 ถ้วย",350,29.0,25.0,14.0,"1 ถ้วย (250 ก.)","กับข้าว",2.5,750,5.0,4.0,0,600],
["ซี่โครงวัวตุ๋นซอสบาร์บีคิว 1 ชิ้น",430,34.0,14.0,26.5,"1 ชิ้น ~150 ก.","กับข้าว",0.3,570,12.0,12.0,0,280],
["เนื้อย่างจิ้มแจ่ว 1 จาน",360,44.5,7.0,14.5,"1 จาน (เนื้อ 150 ก.)","กับข้าว",0.5,850,5.5,3.0,0,440],
["เนื้อผัดน้ำมันหอย 1 จาน",345,28.0,9.0,21.0,"1 จาน (200 ก.)","กับข้าว",2.0,1300,6.0,2.0,0,560],
["ยำเนื้อย่าง 1 จาน",250,29.0,9.0,9.0,"1 จาน (180 ก.)","กับข้าว",1.8,850,3.5,4.0,0,590],
["เนื้อย่างเกาหลี (บุลโกกิ) 1 จาน",490,38.0,17.0,28.0,"1 จาน (200 ก.)","กับข้าว",0.8,900,9.0,13.0,0,480],

// ===== ปิ้งย่างเป็นไม้/เป็นชิ้น (คำนวณจากส่วนผสม — ค่าประมาณ) =====
["หมูปิ้งไม้ใหญ่",165,12.5,6.0,9.5,"1 ไม้ ~60 ก.","กับข้าว",0,480,4.2,5.5,0,200],
["หมูปิ้งติดมัน (คอหมู) 1 ไม้",130,7.5,3.5,9.5,"1 ไม้ (35 ก.)","กับข้าว",0,280,3.5,3.3,0,140],
["คอหมูย่าง 1 จาน",415,35.0,4.0,28.5,"1 จาน (หมู 150 ก.)","กับข้าว",0.2,600,10.5,3.0,0,520],
["หมูสามชั้นย่างเกาหลี 1 จาน",570,27.0,0,51.0,"1 จาน (หมู 150 ก.)","กับข้าว",0,80,18.5,0,0,380],
["อกไก่ปิ้ง 1 ชิ้น",290,46.5,1.0,10.4,"1 ชิ้น ~150 ก.","กับข้าว",0,400,2.5,0.5,0,380],
["อกไก่ปิ้ง 1 ไม้",70,12.0,1.0,2.0,"1 ไม้ ~40 ก.","กับข้าว",0,150,0.6,0.5,0,100],
["สะโพกไก่ย่าง 1 ชิ้น",280,28.8,1.0,17.5,"1 ชิ้น ~120 ก.","กับข้าว",0,300,4.8,0.5,0,220],
// ===== เครื่องปรุง/ซอส/น้ำจิ้ม =====
["ซีอิ๊วดำ",25,0.5,5.5,0,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0,1200,0,4,0,78],   // USDA:Soy sauce made from soy and wheat (shoyu)
["ซอสปรุงรส (ฝาเขียว)",10,1.3,1.0,0,"1 ช้อนโต๊ะ 16 ก.","วัตถุดิบ",0,1100,0,0.3,0,70],   // USDA:Soy sauce made from soy and wheat (shoyu)
["เต้าเจี้ยว",20,1.5,2.5,0.5,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.3,1300,0.1,0.5,0,38],   // USDA:Miso
["กะปิ",8,1.2,0.5,0.1,"1 ช้อนชา 6 ก.","วัตถุดิบ",0,900,0,0,0],
["พริกน้ำปลา",7,0.9,0.7,0,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.1,1300,0,0.2,0,52],   // USDA:Sauce, fish, ready-to-serve
["น้ำจิ้มแจ่ว",15,0.4,3.0,0.1,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.2,450,0,1.5,0,52],   // USDA:Sauce, fish, ready-to-serve
["น้ำจิ้มสุกี้",22,0.3,5.0,0.1,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.2,350,0,3.5,0,58],   // USDA:Sauce, hot chile, sriracha
["น้ำจิ้มซีฟู้ด",12,0.3,2.5,0.1,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.2,400,0,1.8,0,52],   // USDA:Sauce, fish, ready-to-serve
["น้ำยำ (น้ำปรุงรสยำ)",18,0.3,4.0,0.1,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0.1,500,0,3,0,52],   // USDA:Sauce, fish, ready-to-serve
["ซอสพริก",15,0.2,3.5,0,"1 ช้อนโต๊ะ 17 ก.","วัตถุดิบ",0.2,450,0,3,0,55],   // USDA:Sauce, hot chile, sriracha
["ซอสบาร์บีคิว",29,0.1,6.9,0.1,"1 ช้อนโต๊ะ 17 ก.","วัตถุดิบ",0.2,175,0,5.6,0,39],   // USDA 174523
["ซอสเทอริยากิ",16,1.1,2.8,0,"1 ช้อนโต๊ะ 18 ก.","วัตถุดิบ",0,690,0,2.5,0,40],   // USDA 171167
["มัสตาร์ด",3,0.2,0.3,0.2,"1 ช้อนชา 5 ก.","วัตถุดิบ",0.2,55,0,0,0,8],   // USDA 172234
["น้ำส้มสายชู",3,0,0,0,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0,0,0,0,0,0],   // USDA 172237
["น้ำสลัดซีซาร์",81,0.3,0.5,8.7,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.1,181,1.3,0.4,0,4],   // USDA 169055
["น้ำสลัดอิตาเลียน",36,0.1,1.8,3.2,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0,149,0.4,1.6,0,13],   // USDA 171019
["น้ำสลัดแรนช์",65,0.2,0.9,6.7,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0,135,1.1,0.7,0,10],   // USDA 173592
["น้ำสลัดเทาซันด์ไอส์แลนด์",61,0.2,2.3,5.6,"1 ช้อนโต๊ะ 16 ก.","วัตถุดิบ",0.1,154,0.8,2.4,0,17],   // USDA 171402
["น้ำสลัดงาญี่ปุ่น",60,0.6,3.0,5.2,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.1,180,0.8,2.5,0,24],   // USDA:Salad dressing, sesame seed dressing, regula
["มายองเนสไขมันต่ำ",36,0.1,1.4,3.3,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0,124,0.5,0.5,0,5],   // USDA 173594
["น้ำตาลปี๊บ",76,0,19.0,0,"1 ช้อนโต๊ะ 20 ก.","วัตถุดิบ",0,10,0,19,0,27],   // USDA:Sugars, brown
["น้ำตาลทรายแดง",15,0,3.9,0,"1 ช้อนชา 4 ก.","วัตถุดิบ",0,1,0,3.9,0,5],   // USDA 168833
["น้ำเชื่อม",60,0,15.5,0,"1 ช้อนโต๊ะ 20 ก.","วัตถุดิบ",0,2,0,15.5,0],
["เมเปิลไซรัป",52,0,13.4,0,"1 ช้อนโต๊ะ 20 ก.","วัตถุดิบ",0,2,0,12.1,0,42],   // USDA 169661
["แยมผลไม้",56,0.1,13.8,0,"1 ช้อนโต๊ะ 20 ก.","วัตถุดิบ",0.2,6,0,9.7,0,16],   // USDA 169641
["สารให้ความหวานซูคราโลส 1 ซอง",3,0,0.9,0,"1 ซอง 1 ก.","วัตถุดิบ",0,0,0,0,0],
["หญ้าหวาน (สตีเวีย) 1 ซอง",0,0,0,0,"1 ซอง 1 ก.","วัตถุดิบ",0,0,0,0,0],
["ผงชูรส",0,0,0,0,"1 ช้อนชา 5 ก.","วัตถุดิบ",0,610,0,0,0],
["ผงปรุงรส (ซุปผง)",10,0.5,2.0,0.1,"1 ช้อนชา 5 ก.","วัตถุดิบ",0,900,0,0.3,0,20],   // USDA:Soup, beef broth, cubed, dry
["ซุปก้อน",25,1.0,2.5,1.2,"1 ก้อน 10 ก.","วัตถุดิบ",0,2000,0.6,0.3,0,40],   // USDA:Soup, beef broth, cubed, dry
["พริกไทยดำป่น",6,0.2,1.5,0.1,"1 ช้อนชา 2.3 ก.","วัตถุดิบ",0.6,0,0,0,0,32],   // USDA 170931
["ผงขมิ้น",9,0.2,1.9,0.1,"1 ช้อนชา 3 ก.","วัตถุดิบ",0.6,1,0,0,0,62],   // USDA:Spices, turmeric, ground
["น้ำมะนาว",4,0.1,1.3,0,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0.1,0,0,0.3,0,19],   // USDA 168156
["น้ำมะขามเปียก",20,0.2,5.0,0.1,"1 ช้อนโต๊ะ 20 ก.","วัตถุดิบ",0.5,3,0,0,0,126],   // USDA:Tamarinds, raw
["มะขามเปียก 100 ก.",239,2.8,62.5,0.6,"100 ก.","วัตถุดิบ",5.1,28,0.3,0,0,628],   // USDA 167763

// ===== เครื่องดื่ม =====
["กาแฟเอสเพรสโซ 1 ช็อต",3,0.1,0,0,"1 ช็อต 30 มล.","เครื่องดื่ม",0,1,0,0,0,34],   // USDA:Beverages, coffee, brewed, espresso, restaur
["กาแฟอเมริกาโน่ (ไม่ใส่น้ำตาล)",5,0.2,0,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,5,0,0,0,34],   // USDA:Beverages, coffee, brewed, espresso, restaur
["กาแฟคาปูชิโน่ (ไม่ใส่น้ำตาล)",75,4.0,6.0,4.0,"1 แก้ว 240 มล.","เครื่องดื่ม",0,55,2.4,0,0,230],
["กาแฟลาเต้เย็น (ไม่ใส่น้ำตาล)",112,6.0,9.0,6.0,"1 แก้ว (400 มล.)","เครื่องดื่ม",0,80,3.6,0,0,195],
["กาแฟมอคค่าเย็น",320,8.0,45.0,12.0,"1 แก้ว (400 มล.)","เครื่องดื่ม",1.5,130,7.0,34,0,210],
["ชาเขียวเย็น (หวานปกติ)",200,1.5,45.0,2.0,"1 แก้ว (400 มล.)","เครื่องดื่ม",0,60,1.2,42,0,92],   // USDA:Beverages, tea, black, brewed, prepared with
["ชาดำเย็น (หวาน)",180,0,45.0,0,"1 แก้ว (400 มล.)","เครื่องดื่ม",0,20,0,44,0,92],   // USDA:Beverages, tea, black, brewed, prepared with
["ชามะนาว (หวาน)",150,0,38.0,0,"1 แก้ว (400 มล.)","เครื่องดื่ม",0,15,0,36,0,92],   // USDA:Beverages, tea, black, brewed, prepared with
["โกโก้ร้อน (ใส่นม+น้ำตาล)",220,8.0,30.0,8.0,"1 แก้ว (250 มล.)","เครื่องดื่ม",2.0,130,4.5,22,0,492],   // USDA:Milk, chocolate beverage, hot cocoa, homemad
["ไมโล/โอวัลติน 1 แก้ว",200,7.0,30.0,5.5,"1 แก้ว (250 มล.)","เครื่องดื่ม",0.6,150,3.2,20,0,458],   // USDA:Beverages, Malted drink mix, natural, powder
["น้ำส้มคั้นสด",108,1.7,25.0,0.5,"1 แก้ว 240 มล.","เครื่องดื่ม",0.5,2,0.1,20.2,0,480],   // USDA 169098 (WHO นับน้ำผลไม้เป็นน้ำตาลอิสระ)
["น้ำแอปเปิ้ล 1 กล่อง",92,0.2,22.8,0.2,"1 กล่อง 200 มล.","เครื่องดื่ม",0.4,5,0,21,0,202],   // USDA:Apple juice, canned or bottled, unsweetened,
["น้ำอ้อย",190,0.2,47.0,0.2,"1 แก้ว 250 มล.","เครื่องดื่ม",0,30,0,45,0],
["น้ำใบเตย/น้ำเก๊กฮวย (หวาน)",110,0,27.5,0,"1 แก้ว 250 มล.","เครื่องดื่ม",0,15,0,27,0,15],
["น้ำกระเจี๊ยบ (หวาน)",100,0,25.0,0,"1 แก้ว 250 มล.","เครื่องดื่ม",0,10,0,24,0],
["น้ำมะนาวโซดา (หวาน)",120,0,30.0,0,"1 แก้ว (350 มล.)","เครื่องดื่ม",0,20,0,29,0],
["น้ำขิง (หวาน)",90,0,22.0,0,"1 แก้ว (250 มล.)","เครื่องดื่ม",0,10,0,21,0],
["น้ำเต้าหู้",130,6.0,18.0,3.5,"1 แก้ว 250 มล.","เครื่องดื่ม",0.8,30,0.6,12,0],
["นมเปรี้ยว/ยาคูลท์",50,0.8,12.0,0,"1 ขวด 80 มล.","เครื่องดื่ม",0,15,0,11,0],
["นมถั่วเหลืองไม่หวาน",70,6.0,3.0,3.5,"1 กล่อง 200 มล.","เครื่องดื่ม",1.0,60,0.5,0,0],
["นมอัลมอนด์ไม่หวาน",36,1.0,3.1,2.4,"1 แก้ว 240 มล.","เครื่องดื่ม",0.5,173,0.2,0,0,161],   // USDA 174832
["นมข้าวไม่หวาน",113,0.7,22.1,2.4,"1 แก้ว 240 มล.","เครื่องดื่ม",0.7,94,0,12.7,0,65],   // USDA 171942
["นมโอ๊ตไม่หวาน",100,3.0,16.0,3.0,"1 แก้ว 240 มล.","เครื่องดื่ม",1.5,100,0.4,5,0],
["นมข้นจืด",20,1.0,1.5,1.1,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0,16,0.7,0,0,45],   // USDA 172194
["ครีมเทียมผง",16,0.1,1.7,1.0,"1 ช้อนชา 3 ก.","วัตถุดิบ",0,6,0.9,1.5,0,20],   // USDA:Cream substitute, powdered
["ครีมสด (ฮาล์ฟแอนด์ฮาล์ฟ)",20,0.5,0.6,1.7,"1 ช้อนโต๊ะ 15 ก.","วัตถุดิบ",0,9,1.1,0,0,20],   // USDA 171255
["น้ำอัดลม 1 กระป๋อง (325 มล.)",137,0,34.0,0.5,"1 กระป๋อง 325 มล.","เครื่องดื่ม",0,10,0,32,0,16],   // USDA 174852
["น้ำอัดลมไม่มีน้ำตาล 1 กระป๋อง",3,0.3,0.3,0,"1 กระป๋อง 325 มล.","เครื่องดื่ม",0,13,0,0,0,21],   // USDA 174850
["เครื่องดื่มชูกำลัง 1 ขวด",105,0.3,26.0,0,"1 ขวด 150 มล.","เครื่องดื่ม",0,60,0,25,0],
["เรดบูล 1 กระป๋อง",108,1.3,25.5,0,"1 กระป๋อง 250 มล.","เครื่องดื่ม",0,98,0,25.5,0,8],   // USDA 173210
["เกลือแร่/สปอนเซอร์ 1 ขวด",62,0,15.5,0,"1 ขวด 250 มล.","เครื่องดื่ม",0,110,0,15,0],
["เบียร์ 1 ขวดใหญ่ (630 มล.)",260,2.0,20.0,0,"1 ขวด 630 มล.","เครื่องดื่ม",0,25,0,0,24.9],
["เบียร์ไร้แอลกอฮอล์ 1 กระป๋อง",60,0.5,14.0,0,"1 กระป๋อง 330 มล.","เครื่องดื่ม",0,15,0,0,0],
["ไวน์ขาว 1 แก้ว",121,0.1,3.8,0,"1 แก้ว 150 มล.","เครื่องดื่ม",0,7,0,1,15.1],
["สาเก 1 แก้ว",134,0.5,5.0,0,"1 แก้ว 100 มล.","เครื่องดื่ม",0,2,0,0,14.4],
["โซจู 1 ช็อต",58,0,0.5,0,"1 ช็อต 50 มล.","เครื่องดื่ม",0,1,0,0.5,7.9],
["ค็อกเทล (มาการิต้า/โมฮิโต้)",250,0.2,26.0,0,"1 แก้ว 200 มล.","เครื่องดื่ม",0,10,0,24,18],
["ไฮบอล 1 แก้ว",160,0,8.0,0,"1 แก้ว 300 มล.","เครื่องดื่ม",0,15,0,7,20],
["เหล้าปั่น 1 แก้ว",320,0.5,45.0,0,"1 แก้ว (350 มล.)","เครื่องดื่ม",0.3,25,0,42,14],

// ===== ขนม/ของว่างซอง =====
["มันฝรั่งทอดกรอบ 1 ถุงเล็ก",149,1.8,15.1,9.5,"1 ถุง 28 ก.","ของหวาน",0.9,148,1.0,0.1,0,335],   // USDA 169677
["มันฝรั่งทอดกรอบ 1 ถุงใหญ่",399,4.8,40.4,25.5,"1 ถุง 75 ก.","ของหวาน",2.3,395,2.6,0.2,0,897],   // USDA 169677
["ตอร์ติญ่าชิป (โดริโทส) 1 ถุง",189,2.8,27.1,8.3,"1 ถุง 40 ก.","ของหวาน",2.2,131,1.1,0.3,0,73],   // USDA 167558
["แครกเกอร์ 5 ชิ้น",82,1.1,9.8,4.2,"5 ชิ้น 16 ก.","ของหวาน",0.4,116,0.9,1.3,0,19],   // USDA 174982
["คุกกี้ช็อกโกแลตชิพ 3 ชิ้น",153,2.0,23.0,6.1,"3 ชิ้น 34 ก.","ของหวาน",1.0,142,2.0,11.2,0,45],   // USDA 172715
["กราโนล่าบาร์ 1 แท่ง",132,2.8,18.0,5.5,"1 แท่ง 28 ก.","ของหวาน",1.5,82,0.7,8.0,0,94],   // USDA 167542
["กราโนล่า 1/2 ถ้วย",298,8.4,32.9,14.8,"1/2 ถ้วย 61 ก.","ของหวาน",5.4,16,2.4,12.1,0,328],   // USDA 171646
["ช็อกโกแลตนม 1 แท่ง",235,3.4,26.1,13.1,"1 แท่ง 44 ก.","ของหวาน",1.5,35,8.1,22.7,0,163],   // USDA 167587
["ลูกอม 1 เม็ด",24,0,5.9,0,"1 เม็ด 6 ก.","ของหวาน",0,2,0,3.8,0,0],   // USDA 167990
["หมากฝรั่ง 1 แผ่น",11,0,2.9,0,"1 แผ่น 3 ก.","ของหวาน",0.1,0,0,2.0,0,0],   // USDA 168771
["หมากฝรั่งไม่มีน้ำตาล 1 แผ่น",5,0,2.0,0,"1 แผ่น 2 ก.","ของหวาน",0,0,0,0,0],
["เยลลี่ 1 ถ้วย",81,1.6,19.2,0,"1 ถ้วย 135 ก.","ของหวาน",0,101,0,18.2,0,1],   // USDA 169596
["พุดดิ้งช็อกโกแลต 1 ถ้วย",153,2.3,24.8,5.0,"1 ถ้วย 108 ก.","ของหวาน",0,164,1.4,18.6,0,198],   // USDA 168778
["ไอศกรีมวานิลลา 1 สกู๊ป",137,2.3,15.6,7.3,"1 สกู๊ป 66 ก.","ของหวาน",0.5,53,4.5,14.0,0,132],   // USDA 167575
["ไอศกรีมช็อกโกแลต 1 สกู๊ป",143,2.5,18.6,7.3,"1 สกู๊ป 66 ก.","ของหวาน",0.8,50,4.5,16.8,0,165],   // USDA 168809
["ข้าวเกรียบกุ้ง 1 ถุงเล็ก",160,2.0,18.0,9.0,"1 ถุง 30 ก.","ของหวาน",0.3,280,4.0,1,0],
["สาหร่ายทอดกรอบ 1 ซอง",170,5.0,18.0,9.0,"1 ซอง 32 ก.","ของหวาน",2.0,400,3.0,3,0],
["ปลาเส้น 1 ซอง",90,8.0,12.0,0.6,"1 ซอง 27 ก.","ของหวาน",0.2,480,0.2,6,0],
["เวเฟอร์ 1 แท่ง",130,1.2,16.0,6.8,"1 แท่ง 25 ก.","ของหวาน",0.3,45,4.5,10,0],
["บิสกิตสอดไส้ครีม 2 ชิ้น",120,1.3,17.5,5.2,"2 ชิ้น 25 ก.","ของหวาน",0.4,90,2.5,9,0],
["ปอกกี้ 1 ซอง",120,1.8,17.0,5.0,"1 ซอง 25 ก.","ของหวาน",0.4,60,3.0,8,0],

// ===== ขนมไทย =====
["ทองหยอด 1 ลูก",55,1.2,10.0,1.2,"1 ลูก 15 ก.","ของหวาน",0,5,0.4,9,0],
["เม็ดขนุน 1 ลูก",55,1.0,9.5,1.5,"1 ลูก 15 ก.","ของหวาน",0.2,5,0.5,8.5,0],
["ลูกชุบ 1 ลูก",50,0.8,9.5,1.0,"1 ลูก 15 ก.","ของหวาน",0.3,5,0.3,8,0],
["ขนมชั้น 1 ชิ้น",90,0.4,15.0,3.2,"1 ชิ้น 30 ก.","ของหวาน",0.1,20,2.8,10,0],
["ขนมตาล 1 ถ้วย",110,1.0,19.0,3.2,"1 ถ้วย 40 ก.","ของหวาน",0.5,25,2.8,11,0],
["ขนมกล้วย 1 ชิ้น",130,1.2,22.0,4.0,"1 ชิ้น 50 ก.","ของหวาน",1.0,25,3.5,12,0],
["ข้าวต้มมัด 1 มัด",200,3.0,34.0,5.5,"1 มัด 80 ก.","ของหวาน",1.0,30,4.8,10,0],
["สังขยาฟักทอง 1 ชิ้น",130,3.5,17.0,5.0,"1 ชิ้น 60 ก.","ของหวาน",0.8,40,3.5,13,0],
["กล้วยบวชชี 1 ถ้วย",230,2.0,34.0,10.0,"1 ถ้วย 150 ก.","ของหวาน",1.8,50,8.8,20,0],
["ฟักทองแกงบวด 1 ถ้วย",230,2.0,33.0,10.5,"1 ถ้วย 150 ก.","ของหวาน",2.0,50,9.0,22,0],
["ตะโก้ 1 ถ้วย",70,0.4,11.0,2.7,"1 ถ้วย 30 ก.","ของหวาน",0.1,25,2.4,7,0],
["ลอดช่องน้ำกะทิ 1 ถ้วย",280,1.5,42.0,12.0,"1 ถ้วย 200 ก.","ของหวาน",0.5,60,10.5,28,0],
["สาคูเปียกข้าวโพด 1 ถ้วย",200,1.5,33.0,7.0,"1 ถ้วย 150 ก.","ของหวาน",0.8,45,6.0,18,0],
["วุ้นกะทิ 1 ชิ้น",80,0.3,13.0,3.0,"1 ชิ้น 40 ก.","ของหวาน",0,15,2.6,10,0],
["ขนมครก 2 คู่",120,1.2,14.0,6.5,"2 คู่ 40 ก.","ของหวาน",0.2,60,5.5,6,0],
["ขนมถ้วย 2 ถ้วย",110,1.0,16.0,4.5,"2 ถ้วย 50 ก.","ของหวาน",0.2,45,4.0,9,0],
["ขนมเปียกปูน 1 ชิ้น",90,0.4,16.0,2.8,"1 ชิ้น 40 ก.","ของหวาน",0.2,20,2.4,9,0],
["ข้าวเหนียวสังขยา 1 จาน",380,6.0,60.0,12.5,"1 จาน 150 ก.","ของหวาน",1.0,60,9.0,22,0],
["โรตีกล้วยไข่ 1 ชิ้น",400,6.0,48.0,20.0,"1 ชิ้น (150 ก.)","ของหวาน",1.5,300,10.0,22,0],
["ขนมโตเกียว 1 ชิ้น",90,2.0,13.0,3.2,"1 ชิ้น 35 ก.","ของหวาน",0.2,90,1.4,6,0],
["ขนมปังสังขยา 1 ชิ้น",250,5.0,35.0,10.0,"1 ชิ้น (80 ก.)","ของหวาน",1.0,250,5.5,14,0],

// ===== เบเกอรี่ =====
["ขนมปังขาว 1 แผ่น",75,2.3,14.0,1.0,"1 แผ่น 28 ก.","วัตถุดิบ",0.7,137,0.2,1.2,0,35],   // USDA:Bread, white, commercially prepared (include
["เค้กสปันจ์ 1 ชิ้น",110,2.1,23.2,1.0,"1 ชิ้น 38 ก.","ของหวาน",0.2,237,0.3,13.9,0,38],   // USDA 172706
["ชีสเค้ก 1 ชิ้น",257,4.4,20.4,18.0,"1 ชิ้น 80 ก.","ของหวาน",0.3,350,7.9,17.4,0,72],   // USDA 172711
["พายแอปเปิ้ล 1 ชิ้น",277,2.2,39.8,12.9,"1 ชิ้น 117 ก.","ของหวาน",1.9,235,4.4,18.4,0,76],   // USDA 175011
["โดนัทเคลือบน้ำตาล 1 ชิ้น",192,2.3,22.9,10.3,"1 ชิ้น 45 ก.","ของหวาน",0.7,181,2.7,11,0,46],   // USDA 174992
["มัฟฟินบลูเบอร์รี 1 ชิ้น",248,3.0,35.0,10.6,"1 ชิ้น 66 ก.","ของหวาน",0.7,222,1.8,20.8,0,80],   // USDA 172765
["แพนเค้ก 1 แผ่น",175,4.9,21.8,7.5,"1 แผ่น 77 ก.","ของหวาน",0.7,338,1.6,5,0,102],   // USDA 175009
["วาฟเฟิล 1 แผ่น",95,2.1,14.5,3.2,"1 แผ่น 32 ก.","ของหวาน",0.8,218,0.5,1.6,0,47],   // USDA 167519
["ครัวซองเนย 1 ชิ้น",231,4.7,26.1,12.0,"1 ชิ้น 57 ก.","ของหวาน",1.5,219,6.7,6.4,0,67],   // USDA 174987
["ขนมปังพิต้า 1 แผ่น",165,5.5,33.4,0.7,"1 แผ่น 60 ก.","วัตถุดิบ",1.3,322,0.1,0.8,0,72],   // USDA 174915
["ตอร์ติญ่าข้าวโพด 1 แผ่น",52,1.4,10.7,0.7,"1 แผ่น 24 ก.","วัตถุดิบ",1.5,11,0.1,0.2,0,44],   // USDA 175036
["บราวนี่ 1 ชิ้น",230,2.7,36.0,9.0,"1 ชิ้น 56 ก.","ของหวาน",1.2,175,2.4,22,0],
["ซาลาเปาไส้สังขยา 1 ลูก",210,5.0,35.0,5.5,"1 ลูก (85 ก.)","ของหวาน",1.0,200,3.0,14,0],

// ===== เนื้อสัตว์แปรรูป/เครื่องใน =====
["ลิ้นวัวตุ๋น",284,19.3,0,22.3,"100 ก.","วัตถุดิบ",0,65,8.1,0,0,184],   // USDA 170598
["ผ้าขี้ริ้ววัวต้ม",94,11.7,2.0,4.0,"100 ก.","วัตถุดิบ",0,68,1.4,0,0,42],   // USDA 174769
["หัวใจวัวต้ม",165,28.5,0.1,4.7,"100 ก.","วัตถุดิบ",0,59,1.4,0,0,219],   // USDA 169448
["กระเพาะหมูต้ม",157,21.4,0.1,7.3,"100 ก.","วัตถุดิบ",0,40,3.0,0,0,85],   // USDA 168323
["เนื้อแกะบดย่างสุก",283,24.8,0,19.6,"100 ก.","วัตถุดิบ",0,81,8.1,0,0,339],   // USDA 172544
["อกไก่งวงอบ",147,30.1,0,2.1,"100 ก.","วัตถุดิบ",0,99,0.6,0,0,249],   // USDA 171496
["ไข่ปลาดิบ",143,22.3,1.5,6.4,"100 ก.","วัตถุดิบ",0,91,1.5,0,0,221],   // USDA 175132
["ปูอลาสก้าต้ม",97,19.4,0,1.5,"100 ก.","วัตถุดิบ",0,1072,0.1,0,0,262],   // USDA 174202
["ปลาหมึกทอด",175,17.9,7.8,7.5,"100 ก.","วัตถุดิบ",0.3,306,1.9,0,0,279],   // USDA 171982
["ไส้กรอกรมควัน 1 อัน",181,11.4,6.8,12.0,"1 อัน 84 ก.","วัตถุดิบ",0,869,4.0,1.6,0,206],   // USDA 174605
["ฮอทดอก (ไส้กรอกเนื้อ) 1 อัน",155,5.6,1.3,14.1,"1 อัน 48 ก.","วัตถุดิบ",0,409,5.6,0.6,0,121],   // USDA 174614
["โบโลน่าหมู 1 แผ่น",69,4.3,0.2,5.6,"1 แผ่น 28 ก.","วัตถุดิบ",0,254,1.9,0,0,78],   // USDA 173856
["เบคอนดิบ 1 แผ่น",110,3.8,0,10.4,"1 แผ่น 28 ก.","วัตถุดิบ",0,210,3.5,0,0,56],   // USDA 168277
["หมูยอ",220,13.0,6.0,16.0,"100 ก.","วัตถุดิบ",0,900,6.0,1,0,101],   // USDA:Sausage, Vienna, canned, chicken, beef, pork
["กุนเชียง 1 ชิ้น",130,5.0,5.0,10.0,"1 ชิ้น 30 ก.","วัตถุดิบ",0,400,3.8,4,0],
["หมูหยอง 2 ช้อนโต๊ะ",90,8.0,6.0,4.0,"2 ช้อนโต๊ะ 20 ก.","วัตถุดิบ",0,350,1.5,5,0],
["หมูแผ่น 1 แผ่น",80,6.0,8.0,2.5,"1 แผ่น 20 ก.","วัตถุดิบ",0,300,0.9,7,0],
["แหนม",180,17.0,3.0,11.0,"100 ก.","วัตถุดิบ",0,700,4.0,0.5,0],
["ปูอัด 1 ชิ้น",16,1.5,2.0,0.1,"1 ชิ้น 17 ก.","วัตถุดิบ",0,90,0,0.7,0,19],   // USDA:Fish, surimi
["ลูกชิ้นหมู",190,13.0,12.0,10.0,"100 ก.","วัตถุดิบ",0.3,750,3.8,0.5,0],
["ลูกชิ้นไก่",160,13.0,12.0,7.0,"100 ก.","วัตถุดิบ",0.3,700,2.2,0.5,0],
["ไข่เค็ม 1 ฟอง",110,7.0,1.0,9.0,"1 ฟอง 60 ก.","วัตถุดิบ",0,800,3.0,0,0,133],   // USDA:Egg, duck, whole, fresh, raw
["ไข่เยี่ยวม้า 1 ฟอง",95,8.0,1.5,6.5,"1 ฟอง 60 ก.","วัตถุดิบ",0,500,2.0,0,0,133],   // USDA:Egg, duck, whole, fresh, raw
["ไข่เป็ดดิบ 1 ฟอง",130,9.0,1.0,9.7,"1 ฟอง 70 ก.","วัตถุดิบ",0,102,2.6,0,0,156],   // USDA 172189
["ไข่นกกระทา 1 ฟอง",14,1.2,0,1.0,"1 ฟอง 9 ก.","วัตถุดิบ",0,13,0.3,0,0,12],   // USDA 172191

// ===== ผัก/สมุนไพร/ของดอง =====
["แครอทดิบ",41,0.9,9.6,0.2,"100 ก.","วัตถุดิบ",2.8,69,0,0,0,320],   // USDA 170393
["แตงกวาสด 100 ก.",15,0.7,3.6,0.1,"100 ก.","วัตถุดิบ",0.5,2,0,0,0,147],   // USDA 168409
["ฟักทองต้ม",20,0.7,4.9,0.1,"100 ก.","วัตถุดิบ",1.1,1,0,0,0,230],   // USDA 168449
["กะหล่ำปลีต้ม",23,1.3,5.5,0.1,"100 ก.","วัตถุดิบ",1.9,8,0,0,0,196],   // USDA 168514
["ถั่วลันเตาแช่แข็งต้ม",78,5.2,14.3,0.3,"100 ก.","วัตถุดิบ",4.5,72,0,0,0,110],   // USDA 170017
["ข้าวโพดครีมกระป๋อง 1 ถ้วย",184,4.4,46.3,1.0,"1 ถ้วย 256 ก.","วัตถุดิบ",3.1,668,0.3,0,0,342],   // USDA 169215
["เห็ดหอมแห้ง 4 ดอก",44,1.4,11.3,0.2,"4 ดอก 15 ก.","วัตถุดิบ",1.7,2,0,0,0,228],   // USDA 168436
["สาหร่ายวากาเมะ 2 ช้อนโต๊ะ",5,0.3,0.9,0.1,"2 ช้อนโต๊ะ 10 ก.","วัตถุดิบ",0.1,87,0,0,0,6],   // USDA 170496
["ตะไคร้สด",99,1.8,25.3,0.5,"100 ก.","วัตถุดิบ",0,6,0.1,0,0,723],   // USDA:Lemon grass (citronella), raw
["ข่าสด",71,1.0,15.0,0.8,"100 ก.","วัตถุดิบ",2.4,5,0.2,0,0],
["กระชายสด",55,1.5,11.0,0.5,"100 ก.","วัตถุดิบ",2.0,5,0.1,0,0],
["ขมิ้นชันสด",90,2.0,18.0,1.0,"100 ก.","วัตถุดิบ",3.0,5,0.3,0,0],
["ใบมะกรูด 5 ใบ",3,0.1,0.6,0,"5 ใบ 5 ก.","วัตถุดิบ",0.3,1,0,0,0],
["มะนาว 1 ลูก",11,0.3,3.7,0.1,"1 ลูก 44 ก.","วัตถุดิบ",0.2,1,0,0,0,45],   // USDA:Limes, raw
["กระเทียมดอง 1 หัว",12,0.3,2.7,0,"1 หัว 10 ก.","วัตถุดิบ",0.2,200,0,1.5,0,40],   // USDA:Garlic, raw
["ผักกาดดอง",20,1.0,3.5,0.2,"100 ก.","วัตถุดิบ",1.5,1200,0,0.5,0],
["แตงกวาดอง",18,0.5,4.0,0.2,"100 ก.","วัตถุดิบ",1.2,800,0,2,0,117],   // USDA:Pickles, cucumber, dill or kosher dill

// ===== นม/ชีส/ไขมันทา =====
["ชีสพาร์เมซานขูด 1 ช้อนโต๊ะ",21,1.4,0.7,1.4,"1 ช้อนโต๊ะ 5 ก.","วัตถุดิบ",0,90,0.8,0,0,9],   // USDA 171247
["เนยจืด 1 ช้อนชา",36,0,0,4.1,"1 ช้อนชา 5 ก.","วัตถุดิบ",0,1,2.5,0,0,1],   // USDA 173430
["มาการีน 1 ช้อนชา",17,0,0.1,1.9,"1 ช้อนชา 5 ก.","วัตถุดิบ",0,29,0.4,0,0,2],   // USDA 171415

// ===== ธัญพืช/เส้น/แป้ง =====
["เส้นก๋วยเตี๋ยวสุก 1 ถ้วย",190,3.2,42.2,0.4,"1 ถ้วย 176 ก.","วัตถุดิบ",1.8,33,0,0,0,7],   // USDA 168914
["วุ้นเส้นแห้ง 50 ก.",166,0.1,41.2,0.1,"50 ก.","วัตถุดิบ",2.0,2,0,0,0,2],   // USDA 169884
["สาคูเม็ด/แป้งมัน 50 ก.",179,0.1,44.4,0,"50 ก.","วัตถุดิบ",0.5,1,0,0,0,6],   // USDA 169717
["ซีเรียลคอร์นเฟลก 1 ถ้วย",100,2.0,24.0,0.1,"1 ถ้วย 28 ก.","วัตถุดิบ",0.7,200,0,3,0,30],   // USDA:Cereals ready-to-eat, RALSTON Corn Flakes
["ข้าวโอ๊ตสำเร็จรูป 1 ซอง",120,4.0,21.0,2.5,"1 ซอง 32 ก.","วัตถุดิบ",3.0,180,0.5,6,0,117],   // USDA:Cereals, oats, instant, fortified, plain, dr
["แป้งข้าวเจ้า 1 ช้อนโต๊ะ",29,0.5,6.4,0.1,"1 ช้อนโต๊ะ 8 ก.","วัตถุดิบ",0.2,0,0,0,0,6],   // USDA:Rice flour, white, unenriched
["บะหมี่กึ่งสำเร็จรูป 1 ซอง (ดิบ)",280,6.0,40.0,11.0,"1 ซอง 60 ก.","วัตถุดิบ",1.8,1400,5.5,2,0,109],   // USDA:Soup, ramen noodle, any flavor, dry
["เส้นบุก (ชิราทากิ)",8,0.2,3.0,0,"100 ก.","วัตถุดิบ",2.9,10,0,0,0],
["ข้าวญี่ปุ่นหุงสุก 1 ทัพพี",130,2.4,28.7,0.2,"1 ทัพพี 100 ก.","วัตถุดิบ",0.3,1,0,0,0,26],   // USDA:Rice, white, short-grain, cooked, unenriched
["แผ่นเกี๊ยว 5 แผ่น",70,2.3,14.0,0.3,"5 แผ่น 25 ก.","วัตถุดิบ",0.5,110,0,0,0,20],   // USDA:Wonton wrappers (includes egg roll wrappers)
["กาแฟโบราณ/โอเลี้ยง (หวาน)",180,0.5,42.0,1.5,"1 แก้ว (350 มล.)","เครื่องดื่ม",0,40,1.0,40,0],
["กาแฟสำเร็จรูป 3in1 1 ซอง",90,0.8,15.0,3.0,"1 ซอง 18 ก.","เครื่องดื่ม",0,50,2.7,11,0],

// ===== เพิ่มชุด "ต้มเลือดหมู / เกาเหลา / ไข่ลวก / แซลมอน / ทูน่า / ผลไม้" =====
// ที่มา: FCD = ตารางคุณค่าทางโภชนาการอาหารไทย 2561 กรมอนามัย · USDA = FoodData Central (SR Legacy)
// เมนูที่ "ประกอบเอง" = บวกจากส่วนประกอบที่มีที่มาจริง เขียนสูตรกำกับไว้ทุกบรรทัด
// เกาเหลาที่ไม่มีในตาราง คิดจาก "ชามก๋วยเตี๋ยวเดิม ลบเส้นออก" (เส้นเล็กลวก 150 ก. = 190 kcal, ค 42 ก.)
// ชามที่ลบแล้วคาร์บติดลบ แปลว่าตัวเลขต้นทางไม่ลงตัว จึงตั้งคาร์บที่ 3 ก. (ผัก+เครื่องปรุง) แล้วคิดพลังงานใหม่ด้วย 4/4/9

// --- ต้มเลือดหมู / เกาเหลา (ชามละ 400 ก. · โซเดียมที่ไม่ได้วัด ปล่อยให้แอปประมาณ) ---
["ต้มเลือดหมู 1 ถ้วย",144,20.2,4.8,4.4,"1 ถ้วย (400 ก.)","ก๋วยเตี๋ยว",undefined,undefined,undefined,undefined,0,480],   // FCD 11104 ต้มเลือดหมู 36 kcal/100 ก.
["ก๋วยเตี๋ยวเลือดหมู (ใส่เส้น)",334,23.2,46.8,4.9,"1 ชาม (550 ก.)","ก๋วยเตี๋ยว",1.5,undefined,undefined,undefined,0,520],   // ประกอบเอง: ต้มเลือดหมู 400 ก. + เส้นเล็กลวก 150 ก.
["เกาเหลาหมู 1 ชาม",128,12,7.8,5.5,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",undefined,1484,undefined,undefined,0,204],   // FCD 11036 เกาเหลาหมู 32 kcal · Na 371 · K 51 ต่อ 100 ก.
["เกาเหลาเนื้อตุ๋น 1 ชาม",192,18,8.6,9.5,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",undefined,undefined,undefined,undefined,0,undefined],   // FCD 11035 เกาเหลาเนื้อตุ๋น 48 kcal/100 ก.
["เกาเหลาเป็ดตุ๋น 1 ชาม",256,21,8,15.5,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",1,1930,5.4,6,0,480],   // ประกอบเอง: ก๋วยเตี๋ยวเป็ดตุ๋น − เส้น
["เกาเหลาเย็นตาโฟ 1 ชาม",216,15,13,11.5,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",2.5,2480,3.9,14,0,510],   // ประกอบเอง: เย็นตาโฟ − เส้น
["เกาเหลาต้มยำ 1 ชาม",262,17,8,18,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",1.5,2080,5.9,12,0,510],   // ประกอบเอง: ก๋วยเตี๋ยวต้มยำ − เส้น
["เกาเหลาก๋วยจั๊บน้ำข้น 1 ชาม",290,15,8,22,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",0.5,1880,7.9,3,0,440],   // ประกอบเอง: ก๋วยจั๊บน้ำข้น − เส้น
["เกาเหลาไก่มะระ 1 ชาม",148,17,3,7.5,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",2.5,1680,2.3,3,0,460],   // ประกอบเอง: ก๋วยเตี๋ยวไก่มะระ − เส้น (คาร์บติดลบ จึงตั้งที่ 3 ก.)
["เกาเหลาสุกี้ (สุกี้น้ำไม่ใส่เส้น)",218,22,10,10,"1 ชาม (350 ก.)","ก๋วยเตี๋ยว",3.6,1395,3.5,8,0,690],   // ประกอบเอง: สุกี้น้ำ − วุ้นเส้นลวก 100 ก.
["เกาเหลาลูกชิ้นปลา 1 ชาม",141,13,11,5,"1 ชาม (400 ก.)","ก๋วยเตี๋ยว",1,undefined,undefined,undefined,0,undefined],   // ประกอบเอง: ลูกชิ้นปลา 80 ก. + ผัก 50 ก. + น้ำซุป

// --- ไข่ลวก (ไข่ลวกเกือบไม่สุก ค่าจึงเท่าไข่ดิบ) ---
["ไข่ลวก 1 ฟอง",72,6.3,0.4,4.8,"1 ฟอง (50 ก.)","วัตถุดิบ",0,71,1.6,0,0,69],   // USDA Egg, whole, raw, fresh 143 kcal/100 ก.
["ไข่ลวก 2 ฟอง (ใส่ซีอิ๊ว 1 ช้อนชา)",147,13,1.1,9.6,"2 ฟอง (116 ก.)","วัตถุดิบ",0,435,3.2,0,0,160],   // ประกอบเอง: ไข่ดิบ 2 ฟอง + ซีอิ๊วขาว 5 ก.

// --- แซลมอน ---
["แซลมอนย่าง 150 ก. (เนื้อล้วน)",309,33.2,0,18.5,"150 ก.","วัตถุดิบ",0,92,3.6,0,0,576],   // USDA Salmon, Atlantic, farmed, cooked, dry heat
["แซลมอนซาชิมิ 5 ชิ้น",156,15.3,0,10.1,"5 ชิ้น (75 ก.)","วัตถุดิบ",0,44,2.3,0,0,272],   // USDA Salmon, Atlantic, farmed, raw
["แซลมอนอบเทริยากิ 1 ชิ้น",351,34,12,18.6,"1 ชิ้น (ปลา 150 ก.)","กับข้าว",0.2,950,3.7,10,0,600],   // ประกอบเอง: แซลมอนย่าง 150 ก. + ซอสเทริยากิ 30 ก.
["ข้าวหน้าแซลมอน (ซาชิมิดง)",486,26,64,14,"1 ชาม (330 ก.)","จานเดียว",1,600,3.2,6,0,420],   // ประกอบเอง: ข้าวญี่ปุ่น 220 ก. + แซลมอนดิบ 100 ก.

// --- ทูน่า (ค่ากระป๋องมาจากตารางไทย ซึ่งวัดจากสินค้าที่ขายในไทยจริง) ---
["ทูน่ากระป๋องในน้ำเกลือ (สะเด็ดน้ำ)",129,30.7,0.7,0.4,"100 ก. (เนื้อสะเด็ดน้ำ)","วัตถุดิบ",0,undefined,undefined,0,0,undefined],   // FCD 11118
["ทูน่าเนื้อขาวในน้ำเกลือ",112,26.4,0.7,0.4,"100 ก. (เนื้อสะเด็ดน้ำ)","วัตถุดิบ",0,undefined,undefined,0,0,undefined],   // FCD 11116
["ทูน่ากระป๋องในน้ำมัน (สะเด็ดน้ำมัน)",218,23.5,0.5,13.5,"100 ก. (เนื้อสะเด็ดน้ำมัน)","วัตถุดิบ",0,undefined,undefined,0,0,undefined],   // FCD 07037
["ทูน่าสเต๊กในน้ำเกลือ (กระป๋อง)",117,25.9,1.5,0.8,"100 ก.","วัตถุดิบ",0,undefined,undefined,0,0,undefined],   // FCD 11122
["ทูน่ามายองเนส (กระป๋อง)",158,9.2,11.1,8.5,"100 ก.","วัตถุดิบ",0,undefined,undefined,undefined,0,undefined],   // FCD 11121
["ทูน่าผัดพริกใบกะเพรา (กระป๋อง)",200,12,8.8,13,"100 ก.","วัตถุดิบ",0,undefined,undefined,undefined,0,undefined],   // FCD 11120
["ทูน่าแซนด์วิช (กระป๋อง)",177,19.1,10.7,6.5,"100 ก.","วัตถุดิบ",0,undefined,undefined,undefined,0,undefined],   // FCD 11115
["สเต๊กทูน่าย่าง 150 ก.",195,43.7,0,0.9,"150 ก.","วัตถุดิบ",0,81,0.3,0,0,791],   // USDA Fish, tuna, yellowfin, fresh, cooked, dry heat
["สลัดทูน่าน้ำสลัดครีม 1 จาน",311,26.6,5.5,20.3,"1 จาน (230 ก.)","กับข้าว",2,700,3.2,2,0,480],   // ประกอบเอง: ทูน่าในน้ำเกลือ 80 ก. + ผักสลัด 120 ก. + น้ำสลัดครีม 30 ก.

// --- ผลไม้เพิ่ม (FCD 2561 · หมวด 05) ---
["มะยงชิด",55,0.5,12.5,0.3,"100 ก.","ผลไม้",1.6,undefined,undefined,0,0,137],   // FCD 05105
["มะปรางสุก",47,0.4,11.3,0,"100 ก.","ผลไม้",1.5,undefined,undefined,0,0,undefined],   // FCD 05083
["ลองกอง",61,0.9,11.9,0.1,"100 ก.","ผลไม้",undefined,3,undefined,0,0,173],   // FCD 05113
["ทุเรียนชะนี",148,2.5,24.6,4.4,"100 ก.","ผลไม้",2.4,undefined,undefined,0,0,undefined],   // FCD 05061 (คาร์บคิดกลับจากพลังงาน)
["ทุเรียนก้านยาว",187,2.5,35,4.1,"100 ก.","ผลไม้",1.7,undefined,undefined,0,0,undefined],   // FCD 05060 (คาร์บคิดกลับจากพลังงาน)
["มะขามหวาน",333,2.9,80.3,0,"100 ก.","ผลไม้",4.7,undefined,undefined,0,0,undefined],   // FCD 05082
["มะขามป้อม",57,0.3,13.4,0.2,"100 ก.","ผลไม้",0.8,1,undefined,0,0,202],   // FCD 05081
["ชมพู่ทับทิมจันทร์",39,0.5,9,0.1,"100 ก.","ผลไม้",0.8,undefined,undefined,0,0,112],   // FCD 05040
["ลูกท้อ (พีช)",38,1.2,8.2,0.1,"100 ก.","ผลไม้",undefined,undefined,undefined,0,0,184],   // FCD 05128
["ลูกไหน (พลัม)",48,1.2,10.3,0.3,"100 ก.","ผลไม้",3,undefined,undefined,0,0,201],   // FCD 05130
["ส้มเขียวหวาน",43,0.8,9.3,0.3,"100 ก.","ผลไม้",1.6,3,undefined,0,0,190],   // FCD 05133
["ส้มโชกุน",45,1.1,9.2,0.2,"100 ก.","ผลไม้",1.3,undefined,undefined,0,0,213],   // FCD 05134
["สาลี่หอม",57,0.3,13.9,0.1,"100 ก.","ผลไม้",undefined,undefined,undefined,0,0,176],   // FCD 05151
["ลูกตาลอ่อน",42,0.5,7.7,1,"100 ก.","ผลไม้",1.9,undefined,undefined,0,0,130],   // FCD 05127
["มะกอกฝรั่ง",52,0.8,12.3,0,"100 ก.","ผลไม้",1.2,undefined,undefined,0,0,undefined],   // FCD 05079
["มะขามเทศ",73,3.5,12.6,1,"100 ก.","ผลไม้",3.4,undefined,undefined,0,0,undefined],   // FCD 05080
["แตงโมเหลือง",28,0.5,5.7,0.1,"100 ก.","ผลไม้",1.4,undefined,undefined,0,0,103],   // FCD 05054
["มะม่วงน้ำดอกไม้สุก",76,0.6,17.7,0.2,"100 ก.","ผลไม้",0.8,undefined,undefined,0,0,197],   // FCD 05093
["มะม่วงเขียวเสวยดิบ",79,0.7,18.1,0.4,"100 ก.","ผลไม้",2,undefined,undefined,0,0,197],   // FCD 05089
["มะม่วงอกร่องสุก",76,0.9,17.2,0.2,"100 ก.","ผลไม้",1.1,undefined,undefined,0,0,undefined],   // FCD 05102
["ขนุนจำปา",118,2.2,25.3,0.4,"100 ก.","ผลไม้",2.2,undefined,undefined,0,0,355],   // FCD 05031
["ฝรั่งกลมสาลี่",37,0.6,6.9,0.1,"100 ก.","ผลไม้",2.9,undefined,undefined,0,0,184],   // FCD 05066
["มะละกอฮาวายสุก",46,0.6,10.6,0.2,"100 ก.","ผลไม้",1.9,3,undefined,0,0,316],   // FCD 05109
["กล้วยเล็บมือนางสุก",124,1.4,26.6,0.3,"100 ก.","ผลไม้",undefined,undefined,undefined,0,0,undefined],   // FCD 05020
["สับปะรดนางแล",63,0.4,12.8,0.8,"100 ก.","ผลไม้",1.4,undefined,undefined,0,0,129],   // FCD 05145
["สับปะรดภูแล",58,0.4,13.6,0.2,"100 ก.","ผลไม้",1.3,undefined,undefined,0,0,172],   // FCD 05146
["มะม่วงหาวมะนาวโห่",57,1.1,7.8,2.4,"100 ก.","ผลไม้",undefined,undefined,undefined,0,0,411],   // FCD 05103

// --- ผลไม้เพิ่ม (USDA) ---
["ทับทิม (เมล็ด)",144,3,32.5,2.1,"1 ถ้วย 174 ก.","ผลไม้",7,5,0.2,0,0,411],   // USDA Pomegranates, raw
["มะเดื่อฝรั่งสด",74,0.8,19.2,0.3,"2 ผล 100 ก.","ผลไม้",2.9,1,0.1,0,0,232],   // USDA Figs, raw
["ลูกเกด",120,1.3,31.7,0.1,"1 กำมือ 40 ก.","ผลไม้",1.8,10,0,0,0,298],   // USDA Raisins, dark, seedless
["ราสป์เบอร์รี",64,1.5,14.6,0.9,"1 ถ้วย 123 ก.","ผลไม้",8,1,0,0,0,186],   // USDA Raspberries, raw
["แบล็กเบอร์รี",62,2,13.8,0.7,"1 ถ้วย 144 ก.","ผลไม้",7.6,1,0,0,0,233],   // USDA Blackberries, raw
["หม่อน (มัลเบอร์รี)",60,2,13.7,0.6,"1 ถ้วย 140 ก.","ผลไม้",2.4,14,0.1,0,0,272],   // USDA Mulberries, raw

// ===== เมนูเกาหลี + หมาล่า =====
// USDA = USDA FoodData Central (SR Legacy) · ประกอบเอง = บวกจากส่วนประกอบ เขียนสูตรกำกับไว้
// โซเดียมของเมนูที่มีน้ำซุป = ค่าเมื่อ "ซดน้ำหมด" เหมือนกติกาของก๋วยเตี๋ยวในไฟล์นี้
// ในแอปเลือกได้ว่าซดแค่ไหน แล้วระบบคูณลดให้

// --- กิมจิ / เครื่องปรุงเกาหลี ---
["กิมจิ",15,1.1,2.4,0.5,"100 ก.","วัตถุดิบ",1.6,498,0.1,0,0,151],   // USDA Cabbage, kimchi
["กิมจิ 1 จานเล็ก",8,0.6,1.2,0.3,"1 จานเล็ก (50 ก.)","วัตถุดิบ",0.8,249,0.1,0,0,76],   // USDA Cabbage, kimchi × 50 ก.
["โคชูจัง 1 ช้อนโต๊ะ",35,0.8,7.2,0.3,"1 ช้อนโต๊ะ (20 ก.)","วัตถุดิบ",0.6,400,0.1,5,0,50],   // ฉลากซอสพริกเกาหลีมาตรฐาน
["ต๊อก (แป้งข้าวเกาหลี)",209,3.8,47,0.6,"100 ก.","วัตถุดิบ",0.6,200,0.2,0,0,30],   // ประกอบเอง: แป้งข้าวเจ้าที่ความชื้น 43% (ต๊อกแท่งสด)

// --- ซุป / หม้อร้อน (โซเดียม = ซดน้ำหมด) ---
["ซุนดูบูจีเก (ซุปเต้าหู้อ่อน)",427,36,10,27,"1 หม้อ (450 ก.)","ก๋วยเตี๋ยว",1.7,1150,6.6,3,0,600],   // ประกอบเอง: เต้าหู้อ่อน 250 + หมูสับ 40 + หอย 30 + ไข่ 1 ฟอง + กิมจิ 30 + ซุปโคชูจัง
["ซุนดูบูจีเก + ข้าว 1 ชุด",675,41,67,27,"1 ชุด (650 ก.)","ก๋วยเตี๋ยว",2,1160,6.8,3,0,660],   // ประกอบเอง: ซุนดูบูจีเก + ข้าวสวย 200 ก.
["ซุปกิมจิ (กิมจิจีเก)",294,17,13,19.3,"1 หม้อ (400 ก.)","ก๋วยเตี๋ยว",2.9,1600,6.5,3,0,560],   // ประกอบเอง: กิมจิ 150 + หมูสามชั้น 60 + เต้าหู้ 80 + ซุปโคชูจัง
["ต๊อกกุก (ซุปต๊อก)",436,20,71,8,"1 ชาม (450 ก.)","ก๋วยเตี๋ยว",1.2,1500,2.6,2,0,350],   // ประกอบเอง: ต๊อก 150 + ซุปเนื้อ + ไข่ 1 ฟอง + สาหร่าย
["รามยอนเกาหลี 1 ซอง",500,10,79,16,"1 ซอง (120 ก. เส้นแห้ง)","ก๋วยเตี๋ยว",5,1790,7,3,0,270],   // ค่าจากฉลากบะหมี่ซองเกาหลีขนาดมาตรฐาน 120 ก.
["รามยอนเกาหลี ใส่ไข่+ชีส",632,20.3,80.4,25.8,"1 ชาม (550 ก.)","ก๋วยเตี๋ยว",5,2131,11.6,3,0,364],   // ประกอบเอง: รามยอน 1 ซอง + ไข่ 1 ฟอง + ชีสแผ่น 1 แผ่น

// --- จานเดียว ---
["คิมบับ 1 ม้วน",307,12,48,7.4,"1 ม้วน 8 ชิ้น (230 ก.)","จานเดียว",1.4,820,1.6,2,0,290],   // ประกอบเอง: ข้าวน้ำมันงา 150 + สาหร่าย 2 แผ่น + ไข่เจียว 30 + ปูอัด 25 + แครอท/ผักโขม/ไชเท้าดอง
["คิมบับ 1 ชิ้น",38,1.5,6,0.9,"1 ชิ้น (29 ก.)","จานเดียว",0.2,103,0.2,0.3,0,36],   // คิมบับ 1 ม้วน ÷ 8
["บิบิมบับ",597,28,75,20.5,"1 ถ้วย (450 ก.)","จานเดียว",4.5,1150,5.5,7,0,750],   // ประกอบเอง: ข้าวสวย 200 + ผักลวก 5 อย่าง 120 + เนื้อบด 50 + ไข่ดาว 1 ฟอง + โคชูจัง 25 + น้ำมันงา
["ต๊อกโบกี",566,14.6,120,3,"1 จาน (300 ก.)","จานเดียว",2.8,2050,0.8,14,0,320],   // ประกอบเอง: ต๊อก 200 + ซอสโคชูจัง 60 + ลูกชิ้นปลา 30 + ผัก
["จับแช (วุ้นเส้นผัดเกาหลี)",376,7,60,12,"1 จาน (250 ก.)","จานเดียว",2.5,950,2.5,5,0,300],   // ประกอบเอง: วุ้นเส้นมันเทศแห้ง 60 + ผักผัด 80 + เนื้อ 30 + น้ำมันงา/ซีอิ๊ว
["ข้าวผัดกิมจิ",526,20,62,22,"1 จาน (350 ก.)","จานเดียว",2,1300,5.5,2,0,500],   // ประกอบเอง: ข้าวสวย 200 + กิมจิ 80 + หมูสับ 40 + ไข่ 1 ฟอง + น้ำมัน 10

// --- กับข้าว ---
["ไก่ทอดเกาหลี (ซอสหวานเผ็ด) 5 ชิ้น",547,32,44,27,"5 ชิ้น (200 ก.)","กับข้าว",1,1100,6,18,0,400],   // ประกอบเอง: ไก่ทอดชุบแป้ง 160 + ซอสยังนยอม 40

// --- หมาล่า (จีนเสฉวน ที่ไทยขายแบบสายพาน) ---
// แต่ละไม้ต่างกันมากตามของที่หยิบ จึงแยกเป็นผัก/เนื้อ ไม่ยัดเป็นค่าเดียว
["หมาล่า 1 ไม้ (ผัก/เห็ด)",23,0.8,1.8,1.4,"1 ไม้ (30 ก.)","วัตถุดิบ",0.8,180,0.3,0,0,70],   // ประกอบเอง: ผัก 30 ก. + น้ำมันพริกหมาล่าเคลือบ
["หมาล่า 1 ไม้ (ลูกชิ้น/เนื้อสัตว์)",63,4.2,3.5,3.6,"1 ไม้ (40 ก.)","วัตถุดิบ",0.2,250,1.2,0,0,60],   // ประกอบเอง: ลูกชิ้น/เนื้อ 35 ก. + น้ำมันพริกหมาล่าเคลือบ
["หมาล่าสายพาน 1 มื้อ (15 ไม้)",674,37,37,42,"1 มื้อ (520 ก.)","กับข้าว",6,3000,9,4,0,900],   // ประกอบเอง: เฉลี่ยผัก 8 ไม้ + เนื้อ 7 ไม้
];


const EX = [
["เดิน",3.5],["เดินเร็ว",4.3],["วิ่งเหยาะ",7],["วิ่ง",9.8],["วิ่งบนลู่",8.5],
["ปั่นจักรยาน",7.5],["ปั่นจักรยานอยู่กับที่",7],["ว่ายน้ำ",8],["เดินขึ้นเขา/เทรล",6],["ขึ้นบันได",8],
["ยกน้ำหนัก/เวท",5],["บอดี้เวท (วิดพื้น สควอท)",4.5],["HIIT",9],["คาร์ดิโอกลุ่ม/แอโรบิค",6.5],
["โยคะ",3],["พิลาทิส",3.8],["ยืดเหยียด",2.3],["เต้น",5],
["ฟุตบอล",7],["ตะกร้อ",6],["แบดมินตัน",5.5],["บาสเกตบอล",6.5],["วอลเลย์บอล",4],
["ปิงปอง",4],["เทนนิส",7],["กอล์ฟ (เดิน)",4.8],["มวย/ชกกระสอบ",9],["กระโดดเชือก",11],
["ทำงานบ้าน/ทำสวน",3.5],["อื่นๆ",5]
];

/* คลังท่าเวท: [ชื่อ, อุปกรณ์, รูปแบบท่า, คำอธิบายสั้น] */
const EXDB = {
 "อก":[
  ["เบนช์เพรส (บาร์เบล)","bar","press","นอนหงายบนม้า ดันบาร์ขึ้นจากกลางอก"],
  ["อินไคลน์เบนช์เพรส (บาร์เบล)","bar","incline","ม้าเอียง 30–45° ดันบาร์ขึ้น เน้นอกบน"],
  ["เบนช์เพรส (ดัมเบล)","db","press","นอนหงาย ดันดัมเบล 2 ข้างขึ้นเหนืออก"],
  ["อินไคลน์ดัมเบลเพรส","db","incline","ม้าเอียง ดันดัมเบลขึ้น เน้นอกบน"],
  ["ดิคไลน์เพรส","bar","press","ม้าเอียงหัวลง ดันบาร์ เน้นอกล่าง"],
  ["ดัมเบลฟลาย","db","fly","นอนหงาย กางแขนเป็นวงกว้างแล้วหุบเข้าหากัน"],
  ["เพคเด็ค (แมชชีน)","mc","fly","นั่งกับเครื่อง หุบแขนเข้าหากันด้านหน้าอก"],
  ["ชิสต์เพรส (แมชชีน)","mc","press","นั่งกับเครื่อง ดันมือไปข้างหน้าระดับอก"],
  ["อินไคลน์เพรส (แมชชีน)","mc","incline","นั่งเอน ดันขึ้นเฉียง เน้นอกบน"],
  ["สมิธแมชชีนเบนช์","mc","press","เบนช์เพรสกับบาร์ที่วิ่งในราง ควบคุมง่าย"],
  ["เคเบิลครอสโอเวอร์","cb","fly","ยืนกลางเครื่อง ดึงสายจากบนลงมาไขว้หน้าอก"],
  ["เคเบิลฟลายล่าง","cb","fly","ดึงสายจากล่างขึ้นมาชนกันระดับอก"],
  ["วิดพื้น","bw","pushup","ดันตัวขึ้น-ลงจากพื้น ลำตัวตรง"],
  ["ดิป (อก)","bw","dip","ยันบาร์คู่ โน้มตัวไปหน้า ลง-ขึ้น เน้นอกล่าง"]],
 "หลัง":[
  ["เดดลิฟต์","bar","hinge","ยกบาร์จากพื้นด้วยการดันสะโพก หลังตรง"],
  ["บาร์เบลโรว์","bar","row","โน้มตัว 45° ดึงบาร์เข้าหาท้อง"],
  ["ทีบาร์โรว์","bar","row","โน้มตัวดึงบาร์ที่ปลายยึดกับพื้น"],
  ["ดัมเบลโรว์","db","row","เข่า-มือยันม้า ดึงดัมเบลข้างเดียวขึ้นข้างลำตัว"],
  ["แลทพูลดาวน์","mc","pulldown","นั่งดึงบาร์จากด้านบนลงมาหน้าอก"],
  ["ซีทเต็ดโรว์ (แมชชีน)","mc","row","นั่งดึงมือจับเข้าหาลำตัว"],
  ["ไฮโรว์ (แมชชีน)","mc","row","นั่งดึงจากมุมสูงลงเฉียงเข้าหาอก"],
  ["แอสซิสต์พูลอัพ (แมชชีน)","mc","pullup","ดึงข้อโดยมีเครื่องช่วยพยุงน้ำหนักตัว"],
  ["แบ็คเอ็กซ์เทนชัน (แมชชีน)","mc","hinge","ก้มแล้วเงยลำตัวขึ้น เน้นหลังล่าง"],
  ["ซีทเต็ดเคเบิลโรว์","cb","row","นั่งดึงสายเคเบิลเข้าหาท้อง"],
  ["สเตรทอาร์มพูลดาวน์","cb","pulldown","แขนตรง กดสายจากหน้าลงมาต้นขา"],
  ["เฟซพูล","cb","facepull","ดึงเชือกเข้าหาหน้า ข้อศอกสูง เน้นหลังบน/ไหล่หลัง"],
  ["พูลอัพ/ชินอัพ","bw","pullup","โหนบาร์แล้วดึงตัวขึ้นจนคางพ้นบาร์"],
  ["ชรัก (ดัมเบล)","db","shrug","ถือดัมเบลข้างลำตัว ยักไหล่ขึ้น"]],
 "ขา":[
  ["สควอท","bar","squat","แบกบาร์บนหลัง ย่อลงจนต้นขาขนานพื้น"],
  ["ฟรอนต์สควอท","bar","squat","วางบาร์หน้าไหล่ ย่อลง เน้นหน้าขา"],
  ["โรมาเนียนเดดลิฟต์","bar","hinge","ขาเกือบตรง ดันสะโพกไปหลัง เน้นแฮมสตริง"],
  ["ฮิปทรัสต์","bar","hip","พิงม้า วางบาร์บนสะโพก ดันสะโพกขึ้น เน้นก้น"],
  ["ลันจ์ (ดัมเบล)","db","lunge","ก้าวขาไปหน้า ย่อลงจนเข่าหลังเกือบแตะพื้น"],
  ["บัลแกเรียนสปลิทสควอท","db","lunge","วางเท้าหลังบนม้า ย่อขาหน้าลง"],
  ["โกเบลตสควอท","db","squat","ถือดัมเบลไว้หน้าอก แล้วย่อลง"],
  ["เลกเพรส","mc","legpress","นั่งเอน ดันแป้นน้ำหนักออกด้วยขา"],
  ["แฮ็คสควอท","mc","squat","สควอทกับเครื่องที่รางเอียง"],
  ["เลกเอ็กซ์เทนชัน","mc","legext","นั่งเหยียดเข่าขึ้น เน้นหน้าขา"],
  ["เลกเคิร์ล (นอน)","mc","legcurl","นอนคว่ำ งอเข่าดึงส้นเข้าหาก้น"],
  ["เลกเคิร์ล (นั่ง)","mc","legcurl","นั่งงอเข่าลง เน้นแฮมสตริง"],
  ["คาฟเรส (แมชชีน)","mc","calf","เขย่งปลายเท้าขึ้น-ลง เน้นน่อง"],
  ["ฮิปแอบดักชัน (แมชชีน)","mc","hip","นั่งกางขาออกด้านข้าง เน้นก้นข้าง"],
  ["ฮิปแอดดักชัน (แมชชีน)","mc","hip","นั่งหุบขาเข้าหากัน เน้นขาด้านใน"],
  ["สมิธสควอท","mc","squat","สควอทกับบาร์ในราง ทรงตัวง่ายกว่า"],
  ["เคเบิลคิกแบ็ค","cb","hip","ยืนเตะขาไปด้านหลังต้านสาย เน้นก้น"],
  ["สควอทเปล่า/แอร์สควอท","bw","squat","ย่อ-ยืนด้วยน้ำหนักตัวเปล่า"]],
 "ไหล่":[
  ["โอเวอร์เฮดเพรส (บาร์เบล)","bar","ohp","ยืนดันบาร์จากไหล่ขึ้นเหนือหัว"],
  ["อัพไรท์โรว์","bar","raise","ดึงบาร์ขึ้นชิดลำตัวถึงระดับอก ข้อศอกสูง"],
  ["ดัมเบลโชลเดอร์เพรส","db","ohp","นั่ง/ยืน ดันดัมเบลขึ้นเหนือหัว"],
  ["อาร์โนลด์เพรส","db","ohp","ดันขึ้นพร้อมหมุนข้อมือจากหน้าออกข้าง"],
  ["ไซด์ลาเทอรัลเรส","db","raise","กางแขนออกข้างจนถึงระดับไหล่ เน้นไหล่ข้าง"],
  ["ฟรอนต์เรส","db","raise","ยกแขนขึ้นด้านหน้าถึงระดับไหล่"],
  ["รีเวิร์สฟลาย","db","facepull","โน้มตัว กางแขนออกหลัง เน้นไหล่หลัง"],
  ["โชลเดอร์เพรส (แมชชีน)","mc","ohp","นั่งกับเครื่อง ดันมือขึ้นเหนือไหล่"],
  ["ลาเทอรัลเรส (แมชชีน)","mc","raise","นั่งกางแขนออกข้างต้านเครื่อง"],
  ["รีเวิร์สเพคเด็ค","mc","facepull","นั่งหันหน้าเข้าเครื่อง กางแขนไปหลัง"],
  ["เคเบิลลาเทอรัลเรส","cb","raise","กางแขนออกข้างต้านสายเคเบิล"],
  ["เคเบิลเฟซพูล","cb","facepull","ดึงเชือกเข้าหาหน้า ข้อศอกสูง"]],
 "แขน":[
  ["บาร์เบลเคิร์ล","bar","curl","ยืนงอศอกยกบาร์ขึ้น เน้นไบเซป"],
  ["อีซี่บาร์เคิร์ล","bar","curl","ใช้บาร์หยัก ถนอมข้อมือกว่าบาร์ตรง"],
  ["สกัลครัชเชอร์","bar","tricep","นอนหงาย งอศอกลดบาร์ลงหาหน้าผาก"],
  ["ดัมเบลเคิร์ล","db","curl","งอศอกยกดัมเบลสลับ/พร้อมกัน"],
  ["แฮมเมอร์เคิร์ล","db","curl","จับดัมเบลแนวตั้ง ยกขึ้น เน้นแขนด้านนอก"],
  ["คอนเซนเทรชันเคิร์ล","db","curl","นั่งพิงศอกกับต้นขา ยกดัมเบลข้างเดียว"],
  ["โอเวอร์เฮดทริเซปเอ็กซ์เทนชัน","db","tricep","ยกดัมเบลเหนือหัว งอศอกลงหลัง"],
  ["พรีเชอร์เคิร์ล (แมชชีน)","mc","curl","วางแขนบนแป้นเอียง งอศอกยกขึ้น"],
  ["ไบเซปเคิร์ล (แมชชีน)","mc","curl","นั่งกับเครื่อง งอศอกยก เน้นไบเซป"],
  ["ทริเซปเอ็กซ์เทนชัน (แมชชีน)","mc","tricep","นั่งเหยียดศอกดันลง เน้นไตรเซป"],
  ["ดิปแมชชีน","mc","dip","นั่งกดมือลงต้านเครื่อง เน้นไตรเซป"],
  ["ทริเซปพุชดาวน์ (เคเบิล)","cb","tricep","กดสายลงจนแขนเหยียดตรง"],
  ["เคเบิลเคิร์ล","cb","curl","งอศอกดึงสายขึ้น เน้นไบเซป"],
  ["ดิป (แขน)","bw","dip","ยันบาร์คู่ ลำตัวตรง ลง-ขึ้น เน้นไตรเซป"],
  ["ริสเคิร์ล","db","curl","งอข้อมือขึ้น-ลง เน้นแขนท่อนล่าง"]],
 "แกนกลาง":[
  ["แพลงก์","bw","plank","ยันศอก ลำตัวตรงเป็นเส้นเดียว ค้างไว้"],
  ["ไซด์แพลงก์","bw","plank","ตะแคงยันศอกข้างเดียว ค้างไว้"],
  ["ครันช์","bw","crunch","นอนหงาย ม้วนตัวยกไหล่ขึ้นเล็กน้อย"],
  ["ไบซิเคิลครันช์","bw","crunch","ม้วนตัวสลับศอกแตะเข่าตรงข้าม"],
  ["แฮงกิงเลกเรส","bw","legraise","โหนบาร์แล้วยกขาขึ้น"],
  ["รัสเซียนทวิสต์ (ดัมเบล)","db","twist","นั่งเอน บิดลำตัวซ้าย-ขวาถือน้ำหนัก"],
  ["แอบโรลเลอร์","bw","rollout","คุกเข่า กลิ้งล้อออกไปแล้วดึงกลับ"],
  ["เคเบิลครันช์","cb","crunch","คุกเข่าดึงสายจากบน ม้วนตัวลง"],
  ["เคเบิลวู้ดช็อป","cb","twist","ดึงสายเฉียงข้ามลำตัว บิดเอว"],
  ["แอบครันช์ (แมชชีน)","mc","crunch","นั่งกับเครื่อง ม้วนตัวลงต้านน้ำหนัก"],
  ["โรตารี่ทอร์โซ (แมชชีน)","mc","twist","นั่งบิดลำตัวต้านเครื่อง"]],
 "อื่นๆ":[["พิมพ์ชื่อท่าเอง","bw","plank","ท่าที่ไม่มีในรายการ"]]
};
const EQ={
 bar:["บาร์เบล","#fbbf24"], db:["ดัมเบล","#4ade80"], mc:["แมชชีน","#38bdf8"],
 cb:["เคเบิล","#818cf8"], bw:["บอดี้เวท","#f472b6"]
};
/* ไอคอนตามรูปแบบท่า */
const PAT={
 press:"M2 15h20M6 15v3M18 15v3M6 11h12M8 9v4M16 9v4",
 incline:"M3 19h13l5-9M7 19v-3M9 10h9M11 8v4M17 8v4",
 fly:"M12 5v14M12 9c-3-3-6-3-8.5-1M12 9c3-3 6-3 8.5-1M12 15c-3 2-6 2-8.5 0M12 15c3 2 6 2 8.5 0",
 pushup:"M2 20h20M5 20l4-6 9-1M9 14l-2-4M18 13l2 3M7.5 9.2a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4",
 dip:"M4 4v9M20 4v9M7 4h10M12 7v6M9 13l3 5 3-5",
 row:"M3 19h5M5.5 19V9M5.5 9h6l7 4M12 9v10M18.5 13v6M16 19h5",
 pulldown:"M3 4h18M12 4v4M8.5 8h7M12 12v5M9 21h6M12 17v4",
 pullup:"M3 4h18M9 4v3M15 4v3M12 7.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3M12 11v5M9.5 16l2.5 5 2.5-5",
 squat:"M4 8h16M7 8v3M17 8v3M12 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3M12 8v4l-3 4v4M12 12l3 4v4",
 legpress:"M3 5v14M5 10h6l6-5M11 10v5l6 5M20 4v16",
 hinge:"M3 20h18M6 20v-3M6 17l6-6 5 3M12 11l-1.5-4M4 7h13",
 legext:"M4 6v12M4 11h8l5 5M17 16h3M12 11v5",
 legcurl:"M3 8h12M15 8v4a4 4 0 01-8 0M7 20h10M11 16v4",
 calf:"M8 21v-6l-2-3M8 15h6M14 12a2 2 0 100-4 2 2 0 000 4M5 21h14",
 ohp:"M12 21v-7M8.5 14h7M9 10l3-4 3 4M5 5h14M5 3v4M19 3v4",
 raise:"M12 21v-8M9 13h6M12 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3M9.5 13L4 9M14.5 13L20 9",
 curl:"M7 3v8a5 5 0 0010 0V9M17 15v5M13.5 20h7M4 20h6",
 tricep:"M7 3v9a5 5 0 005 5M12 17v3M9 20h7M5 3h4M15 3h4",
 shrug:"M5 8v9M19 8v9M8 6h8M12 6v12M9 18h6",
 facepull:"M12 4v6M4 10h16M4 10l4 4M20 10l-4 4M8 14v6M16 14v6",
 hip:"M3 18h18M6 18v-4a6 6 0 0112 0v4M9 10V6M15 10V6",
 plank:"M3 19h18M6 19v-4M6 15l10-2M16 13l1-3M8 15l1-4",
 crunch:"M3 20h18M7 20v-4l5-3 4 2M12 13l-1-4M6 16l-2 2",
 legraise:"M4 3h16M12 3v6M9 9h6M12 15l5-3M12 15v5",
 twist:"M12 4a2 2 0 100 4 2 2 0 000-4M12 8v6M6 11l6 3 6-3M9 20l3-6 3 6",
 rollout:"M3 19h18M6 19v-3l7-4M13 12l4 2M17 16.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5"
};
function icon(pat,c){
  const d=PAT[pat]||PAT.plank;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="${c||"currentColor"}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}
function exInfo(name){
  for(const g in EXDB){const f=EXDB[g].find(x=>x[0]===name); if(f)return {group:g,eq:f[1],pat:f[2],desc:f[3]};}
  return {group:"อื่นๆ",eq:"bw",pat:"plank",desc:""};
}

/* โซนหัวใจ (% ของ HRmax) */
const ZONES=[
 [1,"Z1 ฟื้นตัว",50,60,"#38bdf8",1,0.60],
 [2,"Z2 เผาไขมัน",60,70,"#4ade80",2,0.50],
 [3,"Z3 แอโรบิก",70,80,"#fbbf24",3,0.35],
 [4,"Z4 เทรชโฮลด์",80,90,"#fb923c",4,0.20],
 [5,"Z5 สูงสุด",90,100,"#f87171",5,0.10]
];
/* ขอบเขตโซนของแต่ละโมเดล (%) */
const ZBOUND={
  max:[[50,60],[60,70],[70,80],[80,90],[90,100]],          // % ของ HRmax
  hrr:[[50,60],[60,70],[70,80],[80,90],[90,100]],          // % ของ Heart Rate Reserve (Karvonen)
  lthr:[[65,81],[81,89],[89,94],[94,100],[100,106]]        // % ของ LTHR (Friel)
};
function hrMax(){return +S.user.hrmax || Math.round(208-0.7*(S.user.age||35));}  // ใช้ค่าที่วัดจริงก่อน ไม่มีค่อยใช้ Tanaka
function hrRest(){return +S.user.rhr || 60;}
/* LT1 = เพดาน Zone 2 ที่วัดจากตัวเองจริงๆ (ทดสอบพูด / HR ดริฟต์ / แล็บ) */
function lt1(){return +S.user.lt1||0;}
function lt1Days(){                                   // ผลทดสอบเก่ากี่วันแล้ว
  const d=+S.user.lt1d||0; if(!d) return null;
  const k=String(d).slice(0,4)+"-"+String(d).slice(4,6)+"-"+String(d).slice(6,8);
  return Math.round((new Date(S.date)-new Date(k))/864e5);
}
const LT1M={1:"ทดสอบพูด (Talk Test)",2:"ทดสอบ HR ดริฟต์",3:"วัดจากแล็บ/แลคเตต",4:"กรอกเอง"};
function zModel(){
  let m=S.user.zmodel||"hrr";
  if(m!=="fit" && !ZBOUND[m]) m="hrr";                 /* ค่าแปลกปลอมจากชีต ต้องไม่ทำแอปล่ม */
  if(m==="fit")  return lt1()>0 ? "fit" : "hrr";
  if(m==="lthr") return +S.user.lthr>0 ? "lthr" : "hrr";
  return m;
}
/* ขอบเขตแบบ "ความฟิตจริง" — ยึดเพดาน Zone 2 ที่วัดได้เป็นหลัก
   Z2 บน = LT1 พอดี · Z3 = โซนกลางระหว่าง LT1 กับจุดล้า (LT2) · Z4–Z5 = เหนือจุดล้า */
function fitBounds(){
  const L1=lt1();
  const L2=+S.user.lthr>0 ? +S.user.lthr : Math.round(L1/0.87);   // ถ้าไม่รู้ LT2 ประมาณจาก LT1
  const band=Math.max(8,Math.round(L1*0.08));                     // ความกว้างของแถบ Zone 2
  const z1lo=Math.max(hrRest()+15, Math.round(hrMax()*0.5));
  return [[z1lo, L1-band],[L1-band, L1],[L1, L2],[L2, Math.round(L2*1.05)],[Math.round(L2*1.05), Math.max(hrMax(),Math.round(L2*1.12))]];
}
function zoneBpm(i){                 // i = 0..4 → [lo,hi] เป็น bpm
  const m=zModel();
  if(m==="fit"){const b=fitBounds()[i];return [Math.round(b[0]),Math.round(b[1])];}
  const b=ZBOUND[m][i];
  if(m==="lthr"){const L=+S.user.lthr; return [Math.round(L*b[0]/100),Math.round(L*b[1]/100)];}
  if(m==="hrr"){const hm=hrMax(),r=hrRest();
    return [Math.round(r+(hm-r)*b[0]/100),Math.round(r+(hm-r)*b[1]/100)];}
  const hm=hrMax(); return [Math.round(hm*b[0]/100),Math.round(hm*b[1]/100)];
}
function zoneMid(i){const [a,b]=zoneBpm(i);return (a+b)/2;}
function modelName(){return {fit:"ความฟิตจริงของคุณ (LT1 ที่วัดเอง)",max:"% ของ HRmax",
  hrr:"Karvonen (Heart Rate Reserve)",lthr:"% ของ LTHR"}[zModel()];}
/* ความน่าเชื่อถือของโซนตอนนี้ 0–100 + เหตุผล */
function zoneTrust(){
  const m=zModel(), age=lt1Days();
  if(m==="fit"){
    const stale = age!==null && age>84;
    return {score: stale?70:95, lv: stale?"ควรทดสอบใหม่":"แม่นที่สุด",
      why: `มาจาก${LT1M[+S.user.lt1m]||"ค่าที่วัดเอง"} เมื่อ ${age===null?"—":age===0?"วันนี้":age+" วันก่อน"}`+
           (stale?" — ผ่านมาเกิน 12 สัปดาห์แล้ว ความฟิตน่าจะเปลี่ยน ควรทดสอบใหม่":""),
      stale};
  }
  if(m==="lthr") return {score:75,lv:"ค่อนข้างแม่น",why:"คำนวณจาก LTHR (จุดล้า) ที่คุณทดสอบไว้ แต่เพดาน Zone 2 ยังเป็นการประมาณจากสัดส่วน",stale:false};
  if(m==="hrr")  return {score:55,lv:"ประมาณการ",why:"คำนวณจากชีพจรพัก + HRmax "+(+S.user.hrmax?"ที่วัดจริง":"ที่ประมาณจากอายุ")+" — ยังเป็นสูตรกลาง ไม่ใช่ค่าของคุณจริงๆ",stale:false};
  return {score:35,lv:"หยาบที่สุด",why:"คำนวณจากอายุอย่างเดียว คนอายุเท่ากันมี HRmax ต่างกันได้ถึง ±12 ครั้ง",stale:false};
}

/* คีย์ผู้ใช้ที่ต้องเก็บถาวร — ต้องส่งครบทุกครั้ง เพราะฝั่ง Sheets เขียนทับทั้งชุด */
const UKEYS=["sex","age","w","h","act","goal","rhr","hrmax","lthr","zmodel","tdeeReal","z2goal","lt1","lt1d","lt1m"];
function userPayload(){
  const o={}; UKEYS.forEach(k=>o[k]=S.user[k]!==undefined?S.user[k]:0);
  /* ประวัติผลทดสอบ Zone 2 — เก็บเป็นตัวเลขล้วนเพื่อให้ชีต User รับได้โดยไม่ต้องแก้สคริปต์ */
  const L=arr(S.lt1log).slice(-24);
  L.forEach((x,i)=>{ o["lt1h"+(i+1)] = (+String(x.d).replace(/-/g,"")||0)*10000 + (+x.hr||0)*10 + (+x.m||0); });
  const prev=Math.min(24,+LS.get("lt1n")||0);
  for(let i=L.length;i<prev;i++) o["lt1h"+(i+1)]=0;    /* ล้างเฉพาะคีย์ที่เคยเขียนไว้แล้วตอนนี้ไม่มี */
  LS.set("lt1n",String(L.length));
  /* บันทึกความพร้อม 60 วันล่าสุด — อัดเป็นตัวเลขก้อนเดียวต่อวัน ชีต User รับได้เลย ไม่ต้องแก้สคริปต์ */
  Object.keys(S.rd||{}).filter(DATE_RE.test.bind(DATE_RE)).sort().slice(-60).forEach(d=>{
    const r=S.rd[d]||{};
    const num=(+r.f||0)*1e9+(+r.s||0)*1e8+(+r.st||0)*1e7+(+r.m||0)*1e6+(+r.rhr||0)*1e3+(+r.hrv||0);
    if(num>0) o["rd"+d.replace(/-/g,"")]=num;
  });
  return o;
}
function rdFromUser(u){
  const out={};
  Object.keys(u||{}).filter(k=>/^rd\d{8}$/.test(k)).forEach(k=>{
    const v=+u[k]; if(!(v>0)) return;
    const d=k.slice(2), o={};
    const put=(key,val,lo,hi)=>{ if(val>=lo&&val<=hi) o[key]=val; };
    put("f", Math.floor(v/1e9)%10,1,5);  put("s", Math.floor(v/1e8)%10,1,5);
    put("st",Math.floor(v/1e7)%10,1,5);  put("m", Math.floor(v/1e6)%10,1,5);
    put("rhr",Math.floor(v/1e3)%1000,20,999); put("hrv",v%1000,1,999);
    if(Object.keys(o).length) out[d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6,8)]=o;
  });
  return out;
}
function lt1FromUser(u){
  const out=[];
  Object.keys(u||{}).filter(k=>/^lt1h\d+$/.test(k)).sort((a,b)=>(+a.slice(4))-(+b.slice(4))).forEach(k=>{
    const v=+u[k]; if(!(v>1e10))return;
    const dn=Math.floor(v/10000), r=v%10000;
    const d=String(dn); if(d.length!==8)return;
    out.push({d:d.slice(0,4)+"-"+d.slice(4,6)+"-"+d.slice(6,8), hr:Math.floor(r/10), m:r%10});
  });
  return out;
}
const S = {
  date: today(),
  ex: [], food: [], sleep: [], water: {}, wo: [], body: [], photo: [], myfood: [], lt1log: [], rd: {},
  user: {sex:"m",age:35,w:70,h:170,act:1.375,goal:0,rhr:60,hrmax:0,lthr:0,zmodel:"hrr",tdeeReal:0,z2goal:150,
         lt1:0,lt1d:0,lt1m:0},
  chosen: null, qty: 1, meal: "เช้า", time: "", sq: 3, range: 7,
  view:"day", showAll:false, grp: "อก", exName:null, sets: [[0,10],[0,10],[0,10]],
  charts: {}
};

let _lastTs=0;
function newTs(){ let t=Date.now(); if(t<=_lastTs) t=_lastTs+1; _lastTs=t; return t; }
function today(){const d=new Date();return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());}
function p2(n){return String(n).padStart(2,"0");}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

function el(id){return document.getElementById(id);}
function n1(v){return Math.round(v*10)/10;}

/* ---------- ซิงก์ด้วยบัญชีอีเมล (Supabase) ---------- */
function applyBlob(j){
  if(!j)return;
  applyClean(cleanBlob(j));
  if(!(+j.v>=3)) fixWater();
}
/* ---------- การเชื่อมต่อ ---------- */
function setStatus(t,cls){const s=el("status");s.textContent=t;s.className=cls||"";}
let queueWarned=false, queueFull=false;
function queueGet(){try{return JSON.parse(LS.get("queue")||"[]")}catch(e){return []}}
function queueAdd(p){
  const q=queueGet(); q.push(p);
  if(q.length>300 && !queueWarned){ queueWarned=true;
    alert("มีข้อมูลรอส่งขึ้น Google Sheets เกิน 300 รายการ ⚠️\n\nกรุณาเชื่อมต่อเน็ตแล้วเปิดแอปทิ้งไว้สักครู่\nและกดสำรองข้อมูลเป็นไฟล์ไว้ด้วยเพื่อความปลอดภัย"); }
  if(!LS.set("queue",JSON.stringify(q)) && !queueFull){ queueFull=true;   /* ห้ามตัดของเก่าทิ้ง */
    alert("พื้นที่ในเครื่องเต็ม เก็บคิวส่งข้อมูลไม่ได้ ⚠️\nกรุณาสำรองข้อมูลเป็นไฟล์ทันที"); }
  updateQueueBadge();
}
function updateQueueBadge(){const n=queueGet().length,b=el("queueInfo");
  if(b) b.innerHTML = n? `<span style="color:var(--food)">มี ${n} รายการรอส่งขึ้น Google Sheets</span>` : "ซิงก์ครบแล้ว";}
let flushing=false;
function queueDrop(item){                                  /* เอาออกจากคิว 1 ชิ้น */
  const cur=queueGet(), t=JSON.stringify(item);
  const i=cur.findIndex(x=>JSON.stringify(x)===t);
  if(i<0) return false;
  cur.splice(i,1);
  return LS.set("queue",JSON.stringify(cur));              /* เขียนไม่ได้ = false → ต้องหยุด */
}
async function flushQueue(){
  if(!GAS_URL || flushing) return {sent:0,failed:0};
  flushing=true;
  let sent=0, failed=0, guard=0;
  try{
    let idx=0;
    while(guard++ < 2000){
      const q=queueGet();
      if(idx>=q.length) break;
      const head=q[idx];
      const j=await rawApi(head);
      if(!j) break;                                        /* ออฟไลน์จริง — หยุด เก็บไว้ทั้งหมด */
      if(j.ok===false){
        /* เซิร์ฟเวอร์ปฏิเสธ: ถ้าเป็นเรื่อง PIN คือผิดทั้งระบบ ให้หยุด
           ถ้าเป็นรายการนี้เสียเอง ให้ข้ามไปทำตัวถัดไป ไม่ให้ค้างหัวแถวตลอดกาล */
        if(/PIN/i.test(j.error||"")){ setStatus("PIN ไม่ถูกต้อง — ซิงก์ไม่ได้","err"); break; }
        setStatus("บางรายการซิงก์ไม่ผ่าน","err"); failed++; idx++; continue;
      }
      sent++;
      if(!queueDrop(head)) break;                          /* เขียนคิวไม่ได้ — หยุด กันวนไม่จบ */
    }
  } finally { flushing=false; updateQueueBadge(); }
  return {sent,failed};
}
/* กลับมาออนไลน์เมื่อไหร่ ส่งต่อทันที — ไม่ต้องรอเปิดแอปใหม่ */
addEventListener("online",()=>flushQueue());
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") flushQueue(); });
setInterval(()=>flushQueue(),120000);
async function rawApi(payload){
  try{
    const r = await fetch(GAS_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({...payload,key:PIN})});
    const j = await r.json();
    if(j && j.ok===false) setStatus("เชื่อมต่อไม่ผ่าน: "+(j.error||"ไม่ทราบสาเหตุ"),"err");
    else setStatus("เชื่อมต่อแล้ว","ok");
    return j;
  }catch(e){ setStatus("ออฟไลน์ (เก็บในเครื่อง)","err"); return null; }
}
async function api(payload){
  if(!GAS_URL){ setStatus("เก็บในเครื่อง"); return null; }
  const j=await rawApi(payload);
  if((!j || j.ok===false) && payload.action!=="ping" && payload.action!=="getAll") queueAdd(payload);
  return j;
}
/* ================= เปิดแอปให้ไว =================
   เดิม: เปิดแอปทีไรก็ดึงข้อมูล "ทั้งก้อน" จาก Google Sheets ทุกครั้ง
         Apps Script ที่ไม่ได้ใช้สักพักต้องปลุกเครื่องก่อน (cold start) กินเวลา 3-8 วินาที
   ใหม่: ของที่เพิ่มใหม่ยังส่งขึ้นทันทีทุกครั้งเหมือนเดิม (ไม่รอ)
         ส่วนการ "ดึงทั้งก้อน" มีไว้รับของจากเครื่องอื่นเท่านั้น จึงทำแค่ทุก 10 นาทีพอ
         และเลื่อนไปทำหลังหน้าจอวาดเสร็จ ผู้ใช้จะได้ใช้งานได้เลยไม่ต้องรอ */
const PULL_EVERY = 10*60*1000;
function lastPullAt(){ return +LS.get("pullAt")||0; }
async function bootSync(){
  const gap = Date.now()-lastPullAt();
  const queued = queueGet().length;
  if(lastPullAt() && gap < PULL_EVERY && !queued){
    setStatus("พร้อมใช้งาน · ซิงก์ล่าสุด "+agoTxt(gap));
    setTimeout(()=>{ flushQueue(); },1200);        /* ของค้าง (ถ้ามี) ส่งเงียบๆ ทีหลัง */
    return;
  }
  setStatus("พร้อมใช้งาน · กำลังซิงก์เบื้องหลัง");
  await new Promise(r=>setTimeout(r,350));         /* ให้หน้าจอวาดเสร็จก่อน */
  await loadAll();
}
function agoTxt(ms){
  const m=Math.round(ms/60000);
  if(m<1) return "เมื่อครู่";
  if(m<60) return m+" นาทีที่แล้ว";
  const h=Math.round(m/60); return h<24? h+" ชม.ที่แล้ว" : Math.round(h/24)+" วันที่แล้ว";
}
async function loadAll(){
  if(!GAS_URL){el("noUrlWarn").style.display="block";setStatus("เก็บในเครื่อง");return;}
  el("noUrlWarn").style.display="none";
  setStatus("กำลังโหลด...");
  await flushQueue();                       /* ส่งของค้างให้หมดก่อน ไม่งั้นของที่ลบไว้จะฟื้น */
  const j = await api({action:"getAll"});
  if(j && j.ok===false){ setStatus("เชื่อมไม่ได้: "+(j.error||""),"err"); render(); return; }
  if(j && j.ok){
    try{
      const c=cleanBlob(j);
      const localN=countAll(S), cloudN=countAll(c);
      /* รวมสองฝั่งเข้าด้วยกัน — ของในเครื่องที่ชีตยังไม่มี จะถูกส่งขึ้นไปให้ ไม่หายแน่นอน */
      const seen=+LS.get("lastPull")||0;     /* เคยเห็นชีตครั้งล่าสุดเมื่อไหร่ */
      /* แถวที่เคยส่งขึ้นไปแล้ว (ts <= lastPull) แต่ตอนนี้ชีตไม่มี = ถูกลบจากที่อื่น → ลบตาม */
      const dropGone=(local,cloud)=>{
        if(!seen) return arr(local);
        const inCloud=new Set(arr(cloud).map(x=>String(x.ts)));
        return arr(local).filter(x=>{ const t=+x.ts||0; return !(t>0 && t<=seen && !inCloud.has(String(x.ts))); });
      };
      S.ex=dropGone(S.ex,c.ex); S.food=dropGone(S.food,c.food);
      S.wo=dropGone(S.wo,c.wo); S.photo=dropGone(S.photo,c.photo);
      const locMf=arr(S.myfood);             /* เก็บฉบับในเครื่องไว้ก่อนรวม — ดูคอมเมนต์ล่าง */
      const mEx=mergeById(S.ex,c.ex,"ts"),   mFd=mergeById(S.food,c.food,"ts");
      const mWo=mergeById(S.wo,c.wo,"ts"),   mMf=mergeById(S.myfood,c.myfood,"name");
      /* ช่อง pot (โพแทสเซียม) กับ recipe (ส่วนผสม) ไม่มีคอลัมน์ในชีต — ถ้าให้แถวจากชีตชนะเฉย ๆ
         การดึงข้อมูลทั้งก้อนหนึ่งครั้งจะลบสูตรอาหารของผู้ใช้หายเงียบ ๆ จึงติดค่ากลับจากฉบับในเครื่อง */
      locMf.forEach(lm=>{
        if(lm.pot===undefined && lm.recipe===undefined) return;
        const t=mMf.list.find(m=>m.name===lm.name);
        if(t && t!==lm){ if(lm.pot!==undefined&&t.pot===undefined) t.pot=lm.pot;
                         if(lm.recipe!==undefined&&t.recipe===undefined) t.recipe=lm.recipe; }
      });
      const mPh=mergeById(S.photo,c.photo,"ts");
      const mSl=mergeByDate(S.sleep,c.sleep), mBd=mergeByDate(S.body,c.body);
      const locWater={...S.water}, cloudWater={...c.water};
      S.ex=mEx.list; S.food=mFd.list; S.wo=mWo.list; S.myfood=mMf.list; clearFoodMap();
      S.photo=mPh.list; S.sleep=mSl.list; S.body=mBd.list;
      /* น้ำเป็นยอดสะสมรายวัน — เอาค่าที่มากกว่าเสมอ จะได้ไม่ย้อนกลับ */
      Object.keys(locWater).forEach(k=>{ if(!(c.water[k]>=locWater[k])) c.water[k]=locWater[k]; });
      S.water=c.water;
      const hist=lt1FromUser(j.user||{});
      if(hist.length>=(S.lt1log||[]).length) S.lt1log=hist;
      const cRd=rdFromUser(j.user||{});           /* ของในเครื่องชนะ คลาวด์เติมเฉพาะวันที่ยังไม่มี */
      Object.keys(cRd).forEach(d=>{ if(!S.rd[d]) S.rd[d]=cRd[d]; });
      if(cloudN>0) Object.assign(S.user,c.user);      /* ชีตว่าง = ยังไม่เคยตั้งค่า อย่าทับของในเครื่อง */
      fillUser(); drawZones();

      const push=[["Exercise",mEx.extra],["Food",mFd.extra],["Workout",mWo.extra],
                  ["MyFood",mMf.extra],["Photo",mPh.extra]];
      const wExtra=Object.keys(locWater).filter(k=>locWater[k]>0 && !(cloudWater[k]>=locWater[k])).length;
      const n=push.reduce((a,x)=>a+x[1].length,0)+mSl.extra.length+mBd.extra.length+wExtra;
      if(n>0){
        setStatus("กำลังส่งข้อมูลในเครื่องขึ้นชีต ("+n+")");
        let okN=0, badN=0;
        const send=async pl=>{ const r=await api(pl); if(r&&r.ok) okN++; else badN++; };
        for(const [sheet,rows] of push) for(const row of rows) await send({action:"add",sheet,row:forSheet(sheet,row)});
        for(const row of mSl.extra) await send({action:"add",sheet:"Sleep",row,unique:"date"});
        for(const row of mBd.extra) await send({action:"add",sheet:"Body",row,unique:"date"});
        for(const k of Object.keys(locWater)) if(locWater[k]>0 && !(cloudWater[k]>=locWater[k]))
          await send({action:"water",date:k,ml:locWater[k]});
        await api({action:"user",user:userPayload()});
        setTimeout(()=>{
          if(badN===0) alert("เชื่อม Google Sheets แล้ว ✅\n\nส่งข้อมูลในเครื่อง "+okN+" รายการขึ้นชีตเรียบร้อย ไม่มีอะไรหาย");
          else alert("ส่งขึ้นชีตได้ "+okN+" รายการ\nอีก "+badN+" รายการยังส่งไม่ได้ ⚠️\n\nไม่ต้องกังวล — ข้อมูลยังอยู่ในเครื่องครบและอยู่ในคิวรอส่ง\nพอเน็ตกลับมาปกติระบบจะส่งให้เอง");
        },400);
      }
      LS.set("lastPull",String(newTs())); LS.set("pullAt",String(Date.now()));
      setStatus("เชื่อมต่อแล้ว","ok");
    }catch(e){
      setStatus("อ่านข้อมูลจากชีตไม่ได้","err");
      console.error(e);
    }
  }
  render();
}

/* ---------- นำทาง ---------- */
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("nav button").forEach(x=>x.classList.remove("on"));
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); el("p-"+b.dataset.p).classList.add("on");
  window.scrollTo(0,0);
  if(b.dataset.p==="body") renderBody();
  fitSoon();          /* ช่องเวลาที่เพิ่งถูกแสดง ต้องวัดความกว้างตอนนี้ ตอนซ่อนอยู่วัดไม่ได้ */
});

el("dateSel").value = S.date;
el("dateSel").onchange = e=>{S.date=e.target.value;wPend=null;setTime(nowHHMM());render();renderWo();renderBody();sleepFill();if(S.view==="stat")drawCharts();};
el("viewSeg").onclick=e=>{const b=e.target.closest("button");if(!b)return;
  el("viewSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  S.view=b.dataset.v;
  el("viewDay").style.display=S.view==="day"?"block":"none";
  el("viewStat").style.display=S.view==="stat"?"block":"none";
  window.scrollTo(0,0);
  if(S.view==="stat")drawCharts();};

/* ---------- ออกกำลังกาย ---------- */
el("exType").innerHTML = EX.map((e,i)=>`<option value="${i}">${e[0]}</option>`).join("");

function drawZones(){
  const hm=hrMax();
  el("hrmaxTxt").innerHTML=`โมเดลโซน: <b>${modelName()}</b> · HRmax ${hm} ${S.user.hrmax?"(วัดจริง)":"(ประมาณจากอายุ)"}${zModel()==="hrr"?` · ชีพจรพัก ${hrRest()}`:""}${zModel()==="lthr"?` · LTHR ${S.user.lthr}`:""}<br>เปลี่ยนวิธีคำนวณได้ที่ ⚙️ ตั้งค่า`;
  const ZTIP=["ฟื้นตัว/วอร์มอัพ","🫀 เบา = พูดเป็นประโยคเต็มได้","grey zone — เลี่ยงถ้าไม่จำเป็น","🔥 หนัก = พูดได้แค่คำสั้นๆ","🔥 เกือบสุดแรง"];
  el("zoneRows").innerHTML=ZONES.map((z,i)=>{const [lo,hi]=zoneBpm(i);
    return `<div class="zr"${i===1?' style="background:color-mix(in srgb,var(--move) 9%,transparent);border-radius:10px"':""}>
    <div class="zd" style="background:${z[4]}"></div>
    <div class="zn">${z[1]}<small>${lo}–${hi} bpm · ${ZTIP[i]}</small></div>
    <input type="number" step="any" inputmode="decimal" placeholder="0" data-z="${z[0]}"><div class="zu">นาที</div></div>`}).join("");
  {const [a,b]=zoneBpm(1);
   el("zoneRows").insertAdjacentHTML("beforeend",
    `<div class="mini" style="margin-top:8px">🫀 <b>Zone 2 ของคุณ = ${a}–${b} bpm</b> คือช่วงที่คุ้มที่สุดสำหรับสร้างฐานความอดทนและเผาไขมัน · ดูสรุปสัดส่วน 80/20 ได้ที่หน้า 🏠 สรุป</div>`);}
  el("zoneRows").querySelectorAll("input").forEach(x=>x.oninput=exCalc);
  if(el("zTrust")) lt1Show();
  if(el("zonePreview")) el("zonePreview").innerHTML=ZONES.map((z,i)=>{const [lo,hi]=zoneBpm(i);
    return `<div class="grade"><div><span style="color:${z[4]}">●</span> ${z[1]}</div><b>${lo}–${hi} bpm</b></div>`}).join("");
}
function zoneVals(){const o={};el("zoneRows").querySelectorAll("input").forEach(x=>o[+x.dataset.z]=+x.value||0);return o;}
function keytel(hr,min){
  const u=S.user;
  const perMin = u.sex==="m"
    ? (-55.0969 + 0.6309*hr + 0.1988*u.w + 0.2017*u.age)/4.184
    : (-20.4022 + 0.4472*hr - 0.1263*u.w + 0.074*u.age)/4.184;
  return Math.max(0,Math.round(perMin*min));
}
function cardioCalc(){
  const hm=hrMax(), z=zoneVals();
  const zmin=ZONES.reduce((a,x)=>a+(z[x[0]]||0),0);
  const min = zmin>0 ? zmin : (+el("exMin").value||0);
  const met = EX[+el("exType").value][1];
  let pct, fat, load, src;
  if(zmin>0){
    const avgBpm = ZONES.reduce((a,x,idx)=>a+(z[x[0]]||0)*zoneMid(idx),0)/zmin;
    pct = avgBpm/hm*100;
    fat = ZONES.reduce((a,x)=>a+(z[x[0]]||0)*x[6],0)/zmin*100;
    load = ZONES.reduce((a,x)=>a+(z[x[0]]||0)*x[5],0);
    src = "จากโซนที่กรอก · โมเดล "+modelName();
  } else {
    pct = Math.max(50,Math.min(95, 45 + met*4.6));      // ประมาณจากความหนักของกิจกรรม
    const zz = ZONES.find(x=>pct<x[3]) || ZONES[4];
    fat = zz[6]*100; load = min*zz[5];
    src = "ประมาณจากประเภทกิจกรรม";
  }
  const hr = Math.round(hm*pct/100);
  const kcal = keytel(hr,min);
  const level = pct<60?"เบา (ฟื้นตัว)" : pct<70?"เบา–ปานกลาง" : pct<80?"ปานกลาง" : pct<90?"หนัก" : "หนักมาก";
  const st = pct<70?"ok": pct<90?"warn":"bad";
  const hiMin=(z[4]||0)+(z[5]||0);
  let effect, note;
  if(pct>=85 || hiMin>=8){
    effect="พัฒนา VO2max / ความอึด"; note="ความหนักระดับนี้กระตุ้นหัวใจและกล้ามเนื้อขาได้ดี แต่ต้องพักให้พอ ไม่ควรทำติดกันทุกวัน";
  } else if(pct<70 && min>=30){
    effect="เผาไขมันเป็นหลัก"; note="Zone 2 นานๆ เผาไขมันสัดส่วนสูงและไม่รบกวนการฟื้นตัวของกล้ามเนื้อ เหมาะทำควบคู่กับเวท";
  } else {
    effect="พัฒนาความฟิตหัวใจ (แอโรบิก)"; note="ช่วงกลางๆ เผาแคลอรี่รวมได้เยอะ เหมาะทำสลับกับ Zone 2";
  }
  return {min,hr,hm,pct,fat,load,kcal,level,st,effect,note,z,zmin,src,
    km:+el("exKm").value||0};
}
function exCalc(){
  const c=cardioCalc();
  if(c.zmin>0) el("exMin").value=c.min;
  const fatK=Math.round(c.kcal*c.fat/100), carbK=c.kcal-fatK;
  el("exResult").innerHTML=`<div class="card" style="background:var(--card2);margin:14px 0 0">
    <div class="stat">
      <div class="s"><span>เผาผลาญ</span><b style="color:var(--move)">${c.kcal}</b><span>kcal</span></div>
      <div class="s"><span>HR เฉลี่ยโดยประมาณ</span><b style="color:${c.st==="ok"?"var(--move)":c.st==="warn"?"var(--food)":"var(--bad)"}">${c.hr}</b>
        <span>ครั้ง/นาที · ${Math.round(c.pct)}% HRmax</span></div>
    </div>
    <div style="margin-top:11px"><span class="pill ${c.st}">${c.level}</span>
      <span class="pill ok" style="margin-left:6px">${c.effect}</span></div>
    <div style="margin-top:11px">
      <div style="display:flex;justify-content:space-between;font-size:12px"><span>สัดส่วนพลังงานที่ใช้</span>
        <span>ไขมัน <b style="color:var(--acc)">${Math.round(c.fat)}%</b> · คาร์บ ${Math.round(100-c.fat)}%</span></div>
      <div class="stg" style="height:14px;margin:6px 0 0"><i style="background:var(--acc);width:${c.fat}%"></i><i style="background:var(--food);width:${100-c.fat}%"></i></div>
      <div class="mini">≈ ไขมัน ${fatK} kcal · คาร์บ ${carbK} kcal · โหลดการฝึก ${Math.round(c.load)}</div>
    </div>
    <div class="mini" style="margin-top:9px">💡 ${esc(c.note)}</div>
    <div class="mini">ที่มาความหนัก: ${c.src}</div>
    ${c.km?`<div class="mini">เพซ ${(c.min/c.km).toFixed(1)} นาที/กม.</div>`:""}
  </div>`;
  return c;
}
["exType","exMin","exKm"].forEach(id=>el(id).oninput=exCalc);
el("exAdd").onclick=async()=>{
  const c=cardioCalc();
  if(c.min<=0) return alert("ใส่เวลาหรือเวลาในโซนก่อนนะ");
  const r={ts:newTs(),date:S.date,type:EX[+el("exType").value][0],min:c.min,
    km:c.km,hr:c.hr,hrmax:0,
    z1:c.z[1]||0,z2:c.z[2]||0,z3:c.z[3]||0,z4:c.z[4]||0,z5:c.z[5]||0,
    pct:c.pct?Math.round(c.pct):0,load:Math.round(c.load),fat:Math.round(c.fat),
    kcal:c.kcal,intensity:c.level,note:el("exNote").value};
  S.ex.push(r); el("exNote").value=""; el("exKm").value="";
  el("zoneRows").querySelectorAll("input").forEach(x=>x.value="");
  exCalc(); render();
  await api({action:"add",sheet:"Exercise",row:r});
};

/* ---------- เวทเทรนนิ่ง ---------- */
el("modeSeg").onclick=e=>{const b=e.target.closest("button");if(!b)return;
  el("modeSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  const w=b.dataset.m==="weight";
  el("weightForm").style.display=w?"block":"none";
  el("cardioForm").style.display=w?"none":"block";
  if(w){renderWo();drawProg();}
};
el("grpChips").innerHTML=Object.keys(EXDB).map((g,i)=>
  `<div class="chip${i===0?" on":""}" data-g="${g}">${g}</div>`).join("");
el("grpChips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;
  el("grpChips").querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));c.classList.add("on");
  S.grp=c.dataset.g; el("woSearch").value=""; fillExList();};

function exList(){
  const q=el("woSearch").value.trim().toLowerCase();
  if(q){const out=[];for(const g in EXDB)EXDB[g].forEach(x=>{if(x[0].toLowerCase().includes(q)||x[3].includes(q))out.push([...x,g]);});return out.slice(0,40);}
  return (EXDB[S.grp]||[]).map(x=>[...x,S.grp]);
}
function fillExList(){
  el("woPick").innerHTML=exList().map(x=>`<div class="exrow" data-n="${esc(x[0])}" data-g="${x[4]}">
    <div class="exi">${icon(x[2],EQ[x[1]][1])}</div>
    <div style="flex:1"><b>${esc(x[0])}</b><small>${esc(x[3])}</small></div>
    <div class="eqp">${EQ[x[1]][0]}</div></div>`).join("");
}
el("woSearch").oninput=fillExList;
el("woPick").onclick=e=>{
  const r=e.target.closest(".exrow"); if(!r)return;
  S.grp=r.dataset.g; S.exName=r.dataset.n;
  el("grpChips").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.g===S.grp));
  showSel(); woChange();
};
function showSel(){
  const n=S.exName; if(!n){el("woSel").innerHTML="";return;}
  const inf=exInfo(n);
  const custom = n==="พิมพ์ชื่อท่าเอง";
  el("woSel").innerHTML=`<div class="selbox">
    <div class="exi">${icon(inf.pat,EQ[inf.eq][1])}</div>
    <div style="flex:1"><b>${esc(n)}</b><small>${esc(inf.desc)} · ${EQ[inf.eq][0]} · ${esc(inf.group)}</small></div>
    <button onclick="pickAgain()">เปลี่ยน</button></div>`;
  el("woCustomWrap2").innerHTML = custom
    ? `<label>พิมพ์ชื่อท่าเอง</label><input type="text" id="woCustom" placeholder="เช่น เคเบิลฟลายล่าง">` : "";
  el("woSearch").style.display="none"; el("woPick").style.display="none";
}
function pickAgain(){
  S.exName=null; el("woSel").innerHTML=""; el("woCustomWrap2").innerHTML="";
  el("woSearch").style.display="block"; el("woPick").style.display="block";
  el("woSearch").value=""; fillExList();
}
function woChange(){
  const custom = S.exName==="พิมพ์ชื่อท่าเอง";
  const last=lastSession(woName());
  if(last) S.sets=last.sets.map(x=>[x[0],x[1]]);
  else S.sets=[[0,10],[0,10],[0,10]];
  drawSets(); sideDraw(); showLast();
}
function woName(){
  if(S.exName==="พิมพ์ชื่อท่าเอง"){const c=el("woCustom");return (c&&c.value.trim())||"ท่าอื่นๆ";}
  return S.exName||"";
}
function drawSets(){
  /* ท่าดัมเบลเขียนหน่วยกำกับไว้ในแถวเลย จะได้ไม่ต้องเลื่อนไปอ่านคำอธิบาย */
  const kgU = isDbEx(woName()) ? "กก./ลูก ×" : "กก. ×";
  el("setRows").innerHTML=S.sets.map((s0,i)=>`<div class="setrow">
    <div class="no">${i+1}</div>
    <input type="number" inputmode="decimal" step="any" value="${s0[0]||""}" placeholder="นน." data-i="${i}" data-f="0">
    <div class="u">${kgU}</div>
    <input type="number" step="any" inputmode="decimal" value="${s0[1]||""}" placeholder="ครั้ง" data-i="${i}" data-f="1">
    <div class="u">ครั้ง</div>
    <button onclick="rmSet(${i})">✕</button></div>`).join("");
  el("setRows").querySelectorAll("input").forEach(inp=>inp.oninput=e=>{
    S.sets[+e.target.dataset.i][+e.target.dataset.f]=+e.target.value||0; calcWo();});
  calcWo();
}
/* แถบเลือกวิธีนับครั้ง — โผล่เฉพาะท่าดัมเบล ท่าบาร์เบล/แมชชีนไม่มีปัญหานี้ */
function sideDraw(){
  const box=el("sideBox"), note=el("setNote"); if(!box) return;
  const n=woName();
  if(!n || !isDbEx(n)){ box.innerHTML=""; if(note) note.textContent=""; calcWo(); return; }
  const side=curSide(n);
  box.innerHTML=`<label style="margin-top:13px">จำนวนครั้งที่กรอก นับยังไง</label>
    <div class="seg a" id="sideSeg" style="margin:0">
      <button class="${side===2?"on":""}" data-s="2">นับต่อข้าง</button>
      <button class="${side===1?"on":""}" data-s="1">นับรวม 2 ข้าง</button>
    </div>
    <div class="mini" data-nofold="1" style="margin-top:6px">${side===2
      ? "เช่น ยกดัมเบลสองลูกพร้อมกัน 10 ครั้ง หรือสลับข้างละ 10 ครั้ง → ปริมาณคูณสองให้"
      : "เช่น ยกสลับซ้าย-ขวารวมกัน 10 ครั้ง (ข้างละ 5) → ไม่คูณสอง"}</div>`;
  el("sideSeg").onclick=e=>{
    const b=e.target.closest("button"); if(!b) return;
    const v=+b.dataset.s;
    if(v===curSide(n)) return;
    sideSet(n,v); sideDraw(); askFixOld(n,v);
  };
  if(note) note.innerHTML=`💡 ใส่น้ำหนัก <b>ต่อดัมเบล 1 ลูก</b> — ตัวเลขที่เขียนอยู่บนลูกดัมเบล ไม่ต้องบวกสองข้าง`;
  calcWo();
}
/* เปลี่ยนวิธีนับแล้ว บันทึกเก่าของท่านี้จะคนละมาตรฐานกัน กราฟจะกระโดดโดยไม่มีเหตุผล
   จึงถามให้ผู้ใช้ตัดสินใจเอง ไม่แก้ข้อมูลเก่าเงียบ ๆ */
async function askFixOld(name,side){
  const old=arr(S.wo).filter(w=>w.ex===name && sideOf(w)!==side);
  if(!old.length) return;
  if(!confirm(`มีบันทึกเก่าของ "${name}" อยู่ ${old.length} ครั้ง ที่ใช้วิธีนับแบบเดิม\n`
    +`ถ้าไม่แก้ กราฟปริมาณจะกระโดดตรงจุดที่เปลี่ยน\n\nแก้บันทึกเก่าให้เป็นแบบใหม่ด้วยไหม?`)) return;
  for(const w of old){
    w.vol=Math.round(volOf(w.sets,side));
    await api({action:"add",sheet:"Workout",row:{...w,sets:JSON.stringify(w.sets)}});
  }
  saveNow(); renderWo(); render(); drawProg();
  alert(`ปรับบันทึกเก่า ${old.length} ครั้งเรียบร้อย ✅`);
}
function rmSet(i){ if(S.sets.length<=1)return; S.sets.splice(i,1); drawSets(); }
el("setAdd").onclick=()=>{const l=S.sets[S.sets.length-1]||[0,10];S.sets.push([l[0],l[1]]);drawSets();};
el("setCopy").onclick=()=>{
  const last=lastSession(woName());
  if(!last)return alert("ยังไม่เคยบันทึกท่านี้");
  S.sets=last.sets.map(x=>[x[0],x[1]]); drawSets();
};
function lastSession(name,beforeDate){
  const arr=S.wo.filter(w=>w.ex===name && (!beforeDate||w.date<beforeDate));
  arr.sort((a,b)=> a.date===b.date ? a.ts-b.ts : (a.date<b.date?-1:1));
  return arr.length?arr[arr.length-1]:null;
}
/* ================= ดัมเบล: น้ำหนักข้างละ และนับครั้งยังไง =================
   ปัญหาจริงที่ผู้ใช้ถาม: ท่าดัมเบลกรอกน้ำหนัก "ข้างละ" หรือ "รวมสองข้าง"
   แอปเดิมไม่ได้บอกไว้เลย ทั้งที่ตอบต่างกันแล้วปริมาณรวมต่างกันเท่าตัว

   กติกาที่ใช้ (เขียนไว้บนหน้าจอด้วย ไม่ให้ต้องเดา)
   1. น้ำหนัก = "ต่อดัมเบล 1 ลูก" เสมอ คือตัวเลขที่เขียนอยู่บนลูกดัมเบล
      เพราะเป็นเลขที่คนพูดกันจริง ("เคิร์ล 7.5") และทำให้ 1RM/สถิติเทียบกันได้ข้ามครั้ง
   2. ส่วน "จำนวนครั้ง" ต่างหากที่กำกวม — บางคนนับต่อข้าง บางคนนับรวมสลับสองข้าง
      จึงให้เลือกเอง แล้วปริมาณรวมคูณให้ถูก:
         นับต่อข้าง   → ปริมาณ = น้ำหนัก × ครั้ง × 2   (สองแขนทำงานเท่ากัน)
         นับรวม 2 ข้าง → ปริมาณ = น้ำหนัก × ครั้ง
      ครอบคลุมทั้งท่าที่ยกพร้อมกัน (เพรส/ฟลาย/ลาเทอรัลเรส) และท่าที่ยกสลับ/ทีละข้าง
   3. 1RM ยังเป็น "ต่อดัมเบล 1 ลูก" ตามธรรมเนียมสากล ไม่คูณสอง

   บันทึกเก่าที่ยังไม่มีการเลือก ถือว่าเป็น "รวม 2 ข้าง" (= ตัวเลขเดิมที่เคยเก็บไว้)
   ตัวเลขย้อนหลังจึงไม่ขยับเองโดยไม่บอก — ถ้าจะแก้ ผู้ใช้กดสั่งเองได้ */
const SIDEK="woSide";
function sideMap(){ try{ return JSON.parse(LS.get(SIDEK)||"{}")||{}; }catch(e){ return {}; } }
function sideSet(name,v){ const m=sideMap(); m[name]=v; LS.set(SIDEK,JSON.stringify(m)); }
function isDbEx(name){ return exInfo(name).eq==="db"; }
/* ค่าเริ่มต้นของท่าดัมเบล = นับต่อข้าง เพราะคนส่วนใหญ่พูดว่า "10 ครั้ง" หมายถึงแขนละ 10 */
function curSide(name){
  if(!isDbEx(name)) return 1;
  const m=sideMap();
  return m[name]===1||m[name]===2 ? m[name] : 2;
}
/* บันทึกเก่าไม่มีธง แต่อ่านย้อนได้จากตัวเลขปริมาณที่เก็บไว้ว่าคูณสองไปแล้วหรือยัง
   (ไม่ต้องเพิ่มคอลัมน์ในชีต — ชีตยังเหมือนเดิมทุกช่อง) */
function sideOf(w){
  const base=arr(w&&w.sets).reduce((a,s0)=>a+(+s0[0]||0)*(+s0[1]||0),0);
  if(!base) return 1;
  return Math.abs(+w.vol-base*2) < Math.abs(+w.vol-base) ? 2 : 1;
}
function volOf(sets,side){return sets.reduce((a,s0)=>a+(+s0[0]||0)*(+s0[1]||0),0)*(side===2?2:1);}
function e1rmOf(sets){return Math.round(sets.reduce((a,s0)=>{
  const w=+s0[0]||0,r=+s0[1]||0; return Math.max(a, r?w*(1+r/30):0);},0));}
function calcWo(){
  const side=curSide(woName());
  const v=volOf(S.sets,side), e=e1rmOf(S.sets);
  const u=el("woVolU"); if(u) u.textContent = side===2? "กก.·ครั้ง (นับ 2 ข้าง)" : "กก.·ครั้ง";
  const u2=el("wo1rmU"); if(u2) u2.textContent = isDbEx(woName())? "กก. ต่อลูก" : "กก.";
  el("woVol").textContent=Math.round(v); el("wo1rm").textContent=e;
  const last=lastSession(woName());
  if(last){
    const dv=v-last.vol, de=e-last.e1rm;
    el("woCmp").innerHTML= (!v)?"" : `เทียบครั้งก่อน: ปริมาณ <b class="${dv>0?"up":dv<0?"down":"flat"}">${dv>0?"+":""}${Math.round(dv)}</b> กก.·ครั้ง · 1RM <b class="${de>0?"up":de<0?"down":"flat"}">${de>0?"+":""}${de}</b> กก.`;
  } else el("woCmp").textContent="ยังไม่มีข้อมูลครั้งก่อนของท่านี้";
}
function showLast(){
  const last=lastSession(woName()), box=el("lastTime");
  if(!last){box.style.display="none";return;}
  box.style.display="block";
  box.innerHTML=`📖 ครั้งล่าสุด <b>${thShort(last.date)}</b><br>${last.sets.map(x=>x[0]+"กก.×"+x[1]).join(" · ")}
    <br>ปริมาณ ${Math.round(last.vol)}${sideOf(last)===2?" (นับต่อข้าง × 2)":""} · 1RM ~${last.e1rm} กก.`;
}
el("woAdd").onclick=async()=>{
  const sets=S.sets.filter(x=>(+x[1]||0)>0);
  if(!sets.length) return alert("ใส่จำนวนครั้งอย่างน้อย 1 เซ็ตก่อนนะ");
  const name=woName(); if(!name)return alert("เลือกท่าก่อนนะ");
  const min=sets.length*3;
  const r={ts:newTs(),date:S.date,group:S.grp,ex:name,sets:sets.map(x=>[+x[0]||0,+x[1]||0]),
    vol:Math.round(volOf(sets,curSide(name))),top:Math.max(...sets.map(x=>+x[0]||0)),e1rm:e1rmOf(sets),
    min:min,kcal:Math.round(5*S.user.w*(min/60)),note:el("woNote").value};
  S.wo.push(r); el("woNote").value="";
  renderWo(); render(); drawProg();
  await api({action:"add",sheet:"Workout",row:{...r,sets:JSON.stringify(r.sets)}});
};

function renderWo(){ saveLocal();
  const list=S.wo.filter(w=>w.date===S.date);
  const byG={};
  list.forEach(w=>{(byG[w.group]=byG[w.group]||[]).push(w);});
  foldCount("woToday",list.length,"ท่า");
  el("woToday").innerHTML=list.length?
    `<div class="mini" style="margin-bottom:10px">รวม <b style="color:var(--move)">${list.length}</b> ท่า · ${list.reduce((a,b)=>a+b.sets.length,0)} เซ็ต · ปริมาณรวม <b style="color:var(--move)">${Math.round(list.reduce((a,b)=>a+b.vol,0)).toLocaleString()}</b> กก.·ครั้ง</div>`+
    Object.entries(byG).map(([g,arr])=>
      `<div style="color:var(--move);font-size:12.5px;font-weight:700;margin:11px 0 6px">${esc(g)}</div>`+
      arr.map(w=>`<div class="wo"><div class="h"><span class="exi">${icon(exInfo(w.ex).pat,"#4ade80")}</span><span>${esc(w.ex)}</span>
        ${isPR(w)?'<span class="badge">🏆 สถิติใหม่</span>':""}
        <button class="del" onclick="del('wo',${w.ts})">✕</button></div>
        <div class="st">${w.sets.map((x,i)=>`<b>${x[0]||"–"} กก.${isDbEx(w.ex)?"/ลูก":""} × ${x[1]}</b>`).join("")}</div>
        <div class="ft">ปริมาณ ${Math.round(w.vol).toLocaleString()} กก.·ครั้ง${sideOf(w)===2?" (นับต่อข้าง × 2)":""} · 1RM ~${w.e1rm} กก.${isDbEx(w.ex)?"/ลูก":""}${w.note?" · "+esc(w.note):""}</div></div>`).join("")
    ).join("")
    :`<div class="empty">ยังไม่ได้บันทึกเวทวันนี้</div>`;

  // ตัวเลือกท่าในกราฟพัฒนาการ
  const names=[...new Set(S.wo.map(w=>w.ex))];
  const cur=el("progEx").value;
  el("progEx").innerHTML=names.length?names.map(n=>`<option${n===cur?" selected":""}>${esc(n)}</option>`).join(""):`<option>ยังไม่มีข้อมูล</option>`;

  // PR
  const best={};
  S.wo.forEach(w=>{ if(!best[w.ex]||w.e1rm>best[w.ex].e1rm) best[w.ex]=w; });
  const bl=Object.values(best).sort((a,b)=>b.e1rm-a.e1rm);
  el("prList").innerHTML=bl.length?bl.map(w=>`<div class="pr"><div style="display:flex;gap:8px;align-items:flex-start"><span class="exi" style="width:20px;height:20px">${icon(exInfo(w.ex).pat,"#38bdf8")}</span><div>${esc(w.ex)}
    <small>${thShort(w.date)} · ${w.sets.map(x=>x[0]+"×"+x[1]).join(", ")}</small></div></div>
    <div style="text-align:right;white-space:nowrap"><b style="color:var(--acc)">${w.top}</b> กก.
    <small>1RM ~${w.e1rm}</small></div></div>`).join(""):`<div class="empty">ยังไม่มีสถิติ</div>`;
}
function isPR(w){
  const prev=S.wo.filter(x=>x.ex===w.ex&&x.ts!==w.ts&&(x.date<w.date||(x.date===w.date&&x.ts<w.ts)));
  return prev.length && w.e1rm>Math.max(...prev.map(x=>x.e1rm));
}
el("progEx").onchange=drawProg;
function drawProg(){
  const name=el("progEx").value;
  const arr=S.wo.filter(w=>w.ex===name).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.ts-b.ts);
  if(!arr.length){el("progInfo").innerHTML=`<div class="empty">บันทึกท่านี้ 2 ครั้งขึ้นไปจะเห็นพัฒนาการ</div>`;return;}
  const lbl=arr.map(w=>thShort(w.date));
  mk("c6",{data:{labels:lbl,datasets:[
    {type:"line",label:"น้ำหนักสูงสุด (กก.)",data:arr.map(w=>w.top),borderColor:cssv("--acc"),backgroundColor:cssv("--acc"),yAxisID:"y",tension:.3,pointRadius:3},
    {type:"bar",label:"ปริมาณรวม",data:arr.map(w=>w.vol),backgroundColor:"rgba(74,222,128,.45)",yAxisID:"y1",borderRadius:5}
  ]},options:{responsive:true,plugins:{legend:{labels:{color:cssv("--dim"),font:{size:10.5},boxWidth:12}}},
    scales:{x:{ticks:{color:cssv("--dim"),font:{size:9.5}},grid:{color:cssv("--line")}},
      y:{position:"left",ticks:{color:"#38bdf8",font:{size:10}},grid:{color:cssv("--line")},beginAtZero:true},
      y1:{position:"right",ticks:{color:"#4ade80",font:{size:10}},grid:{display:false},beginAtZero:true}}}});
  const f=arr[0],l=arr[arr.length-1];
  const dw=l.top-f.top, dv=l.vol-f.vol;
  el("progInfo").innerHTML=`<div class="hint" style="margin-top:10px">
    บันทึกแล้ว <b>${arr.length}</b> ครั้ง · ตั้งแต่ ${thShort(f.date)}<br>
    น้ำหนัก ${f.top} → <b>${l.top}</b> กก. <b class="${dw>0?"up":dw<0?"down":"flat"}">${dw>0?"+":""}${n1(dw)} กก.</b><br>
    ปริมาณ ${Math.round(f.vol)} → <b>${Math.round(l.vol)}</b> <b class="${dv>0?"up":dv<0?"down":"flat"}">${dv>0?"+":""}${Math.round(dv)}</b><br>
    สถิติสูงสุด <b style="color:var(--acc)">${Math.max(...arr.map(w=>w.top))}</b> กก. · 1RM ~${Math.max(...arr.map(w=>w.e1rm))} กก.</div>`;
}
fillExList(); drawSets();

/* ---------- อาหาร ---------- */
function nowHHMM(){const d=new Date();return p2(d.getHours())+":"+p2(d.getMinutes());}
function mealOf(t){const h=+String(t||"12:00").split(":")[0];
  return h<10.5?"เช้า":h<15?"กลางวัน":h<21?"เย็น":"ดึก";}
function mealIcon(m){return {"เช้า":"🌅","กลางวัน":"☀️","เย็น":"🌙","ดึก":"🌌","ว่าง":"🍪"}[m]||"🍽️";}
function setTime(t){S.time=t; el("fTime").value=t; tpSyncAll(); S.meal=mealOf(t);
  el("fTimeTag").innerHTML=`${mealIcon(S.meal)} ระบบจัดให้เป็นมื้อ <b>${esc(S.meal)}</b> อัตโนมัติ (แก้เวลาได้ตามจริง)`;}
el("fTime").onchange=e=>setTime(e.target.value);
el("fNow").onclick=()=>setTime(nowHHMM());




/* ---------- น้ำตาลอิสระ (free sugar) และแอลกอฮอล์ ---------- */
const SUG=[
 [/น้ำอัดลม|น้ำหวาน|น้ำแดง|น้ำผลไม้กล่อง|ชานม|ชาไทย|กาแฟเย็น|นมเปรี้ยว|เกลือแร่|บิงซู/,0.95],
 [/เค้ก|ไอศกรีม|โดนัท|ช็อกโกแลต|คุกกี้|ทองหยิบ|ฝอยทอง|บัวลอย|ข้าวเหนียวมะม่วง|ขนมปังปิ้งเนยน้ำตาล|ลาเต้|โยเกิร์ตรส/,0.55],
 [/น้ำจิ้ม|น้ำปลาหวาน|ซอส|ผัดไทย|หมูแดง|เทอริยากิ|ผัดหวาน/,0.25],
 [/ผลไม้|กล้วย|แอปเปิ้ล|ส้ม|มะม่วง|แตงโม|สับปะรด|มะละกอ|ฝรั่ง|ทุเรียน|ลำไย|องุ่น|นมสด|นมพร่อง|นมถั่วเหลือง|โยเกิร์ตรสธรรมชาติ|กรีกโยเกิร์ต/,0]
];
function sugarOf(name,carb,cat){
  if(!carb)return 0;
  for(const [re,r] of SUG) if(re.test(name)) return n1(carb*r);
  if(cat==="ของหวาน")return n1(carb*0.5);
  if(cat==="เครื่องดื่ม")return n1(carb*0.8);
  if(cat==="ผลไม้"||cat==="วัตถุดิบ")return 0;
  return n1(carb*0.06);
}
/* กรัมแอลกอฮอล์บริสุทธิ์ (1 ดื่มมาตรฐาน = 10 ก.) */
const ALC=[[/เบียร์ ?0|ไร้แอลกอฮอล์|ไม่มีแอลกอฮอล์|non-?alco/i,0],   /* ต้องเช็คก่อนกฎทั่วไป ไม่งั้น "เบียร์ 0" จะถูกนับเป็นเบียร์ปกติ */
 [/เบียร์/,13],[/ไวน์/,14],[/เหล้า|วิสกี้|วอดก้า|เตกีล่า|ยิน|รัม|สาเก|โซจู/,9.5],
 [/ค็อกเทล|ไฮบอล|เหล้าปั่น/,14]];
function alcOf(name){ for(const [re,v] of ALC) if(re.test(name)) return v; return 0; }

/* ---------- สัดส่วนไขมันอิ่มตัว (ประมาณจากชนิดอาหาร) ---------- */
const SATR=[
 /* กลุ่มกะทิเท่านั้น — "น้ำข้น" ของก๋วยจั๊บมาจากแป้งมัน ไม่ใช่กะทิ จึงไม่อยู่บรรทัดนี้ */
 [/กะทิ|แกงเขียวหวาน|แกงเผ็ด|มัสมั่น|พะแนง|ต้มข่า|ต้มยำกุ้งน้ำข้น|บัวลอย|ข้าวเหนียวมะม่วง/,0.62],
 [/เนย|ชีส|ครีม|ไอศกรีม|เค้ก|คุกกี้|โดนัท|ครัวซอง|ช็อกโกแลต|บิงซู|วิปครีม/,0.55],
 [/ทอด|กรอบ|สามชั้น|ขาหมู|หมูกรอบ|ปาท่องโก๋|เฟรนช์ฟราย|มันฝรั่งทอด|ไส้กรอก|เบคอน/,0.45],
 [/หมู|เนื้อวัว|กิวด้ง|เบอร์เกอร์|พิซซ่า|ลูกชิ้น|แฮม|นมสด|โยเกิร์ต|ลาเต้|ชาไทย|ชานม|กาแฟเย็น/,0.38],
 [/ไก่|ไข่|เป็ด|ซาลาเปา|ขนมปัง|ข้าวผัด|กะเพรา|ผัด/,0.30],
 [/ปลา|กุ้ง|ปลาหมึก|ทะเล|แซลมอน|ทูน่า|เต้าหู้|ถั่ว|อัลมอนด์|อะโวคาโด|น้ำมันมะกอก|งา|เมล็ด/,0.15],
 [/ผัก|ผลไม้|ลวก|นึ่ง|ต้ม|สลัด/,0.20]
];
function satOf(name,fat,cat){
  if(!fat)return 0;
  for(const [re,r] of SATR) if(re.test(name)) return n1(fat*r);
  return n1(fat*0.35);
}

/* ---------- โซเดียม (มก.) ประมาณจากชนิดอาหาร ---------- */
const NA=[
 [/มาม่า|บะหมี่กึ่ง/,1600],
 [/ก๋วยเตี๋ยวน้ำ|ก๋วยเตี๋ยวต้มยำ|เย็นตาโฟ|ก๋วยจั๊บ|ราเมง|บะหมี่|ก๋วยเตี๋ยวเรือ|ก๋วยเตี๋ยวเป็ด|ก๋วยเตี๋ยวไก่|ก๋วยเตี๋ยวน้ำตก/,1700],
 [/ก๋วยเตี๋ยวแห้ง|สุกี้|ผัดซีอิ๊ว|ราดหน้า|ผัดไทย/,1300],
 [/ต้มยำ|แกงส้ม|แกงเผ็ด|แกงเขียวหวาน|พะแนง|มัสมั่น|ต้มข่า|แกงจืด|ต้มจืด|ซุป/,1100],
 [/ส้มตำ|ปลาร้า|น้ำพริก|กะปิ|ปลาเค็ม|ไข่เค็ม/,1300],
 [/ลาบ|น้ำตก|ยำ/,950],
 [/หมูกระทะ|ชาบู|ปิ้งย่าง|บุฟเฟ่ต์/,3000],
 [/ข้าวผัด|กะเพรา|ผัดพริกแกง|ผัดคะน้า|ผัดผัก|ผัดมาม่า|ข้าวคลุกกะปิ|ขี้เมา|คาโบนาร่า/,1000],
 [/ข้าวมันไก่|ข้าวหมูแดง|ข้าวหมูกรอบ|ข้าวขาหมู|ข้าวหมกไก่|ข้าวหน้า|กิวด้ง|ทงคัตสึ|แกงกะหรี่/,1200],
 [/ข้าวต้ม|โจ๊ก/,900],
 [/ไส้กรอก|ลูกชิ้น|แฮม|เบคอน|หมูยอ|ปูอัด/,700],
 [/หมูปิ้ง|ไก่ปิ้ง|ไก่ย่าง|หมูทอดกระเทียม|ปลาทอด|เต้าหู้ทอด|ปอเปี๊ยะ/,500],
 [/เบอร์เกอร์|พิซซ่า|แซนด์วิช|KFC|ไก่ทอด/,800],
 [/เฟรนช์ฟราย|มันฝรั่งทอด|ขนมปังปิ้ง|ครัวซอง|โดนัท|ซาลาเปา|ปาท่องโก๋/,300],
 [/ชีส/,300],
 [/น้ำจิ้ม|น้ำปลาหวาน|น้ำสลัด|ซอส/,400],
 [/นม|โยเกิร์ต|เวย์|โปรตีนบาร์/,90],
 [/ทูน่ากระป๋อง/,350],
 [/ไข่ต้ม|ไข่ดาว|ไข่เจียว|ไข่คน|ไข่ตุ๋น|ไข่ขาว/,180],
 [/ข้าวสวย|ข้าวกล้อง|ข้าวเหนียว|ข้าวโอ๊ต|ไรซ์เบอร์รี่|วุ้นเส้น|เส้นก๋วยเตี๋ยวลวก|มัน|ข้าวโพด/,10],
 [/ลวก|นึ่ง|ต้ม|สด|ย่างไม่ใส่|สลัดผัก|อะโวคาโด|อัลมอนด์|ถั่ว|เต้าหู้ขาว|เต้าหู้แข็ง/,60],
 [/น้ำเปล่า|ชาเขียวไม่หวาน|กาแฟดำ/,5],
 [/กาแฟ|ชาไทย|ชานม|น้ำอัดลม|น้ำผลไม้|เบียร์|เหล้า|ไวน์|น้ำหวาน|บิงซู|ไอศกรีม|เค้ก|ช็อกโกแลต|คุกกี้|ทองหยิบ|บัวลอย|ข้าวเหนียวมะม่วง/,60]
];
const NA_CAT={"ผลไม้":3,"วัตถุดิบ":90,"เครื่องดื่ม":50,"ของหวาน":120,"จานเดียว":1000,"ก๋วยเตี๋ยว":1500,"กับข้าว":800,"ฟาสต์ฟู้ด":700};
function sodiumOf(name,cat){
  for(const [re,v] of NA) if(re.test(name)) return v;
  return NA_CAT[cat]!==undefined?NA_CAT[cat]:400;
}
const NA_LIMIT=2000;      // WHO: ไม่เกิน 2,000 มก./วัน

/* ---------- โพแทสเซียม (มก.) ----------
   WHO แนะนำ ≥ 3,510 มก./วัน และสิ่งที่สำคัญต่อความดันคือ "อัตราส่วนโซเดียม:โพแทสเซียม"
   มากกว่าโซเดียมเดี่ยว ๆ (INTERSALT/DASH) — เป้าคือ ≤ 1:1 โดยน้ำหนัก
   แถวที่มีค่าห้องแล็บใช้ค่าจริง ที่เหลือประมาณจาก โปรตีน/ไฟเบอร์/พลังงาน
   (สัมประสิทธิ์หาโดยฟิตกับ 309 แถวที่มีค่าจริง คลาดกลาง ~18%) */
const K_GOAL=3510;
const POTG=[
 ["veg",/สาหร่าย|ผัก|คะน้า|กะหล่ำ|บล็อคโคลี|ปวยเล้ง|ตำลึง|ชะอม|โหระพา|กะเพรา|ใบ|ยอด|ดอก|หน่อไม้|เห็ด|มะเขือ|บวบ|น้ำเต้า|มะระ|ถั่วฝัก|ถั่วพู|ถั่วงอก|ถั่วลันเตา|หัวไชเท้า|แครอท|แตงกวา|แตงร้าน|กระเจี๊ยบ|หน่อไม้ฝรั่ง|คื่นช่าย|ข้าวโพดอ่อน|ขนุนอ่อน|หยวก|มันแกว|เผือก|มันเทศ|มันฝรั่ง|มันสำปะหลัง|ฟักทอง|พริก|หอมใหญ่|กระเทียม|ขิง|ข่า|ตะไคร้|กระชาย|ขมิ้น|มะละกอดิบ|ต้นหอม|มะนาว|ผักชี/],
 ["meat",/เนื้อ|หมู|ไก่|วัว|เป็ด|แกะ|สเต๊ก|ซี่โครง|คอหมู|ริบอาย|ทีโบน|บริสเก็ต|แฟลงก์|สเกิร์ต|ปลา|กุ้ง|ปู|หอย|ปลาหมึก|แซลมอน|ทูน่า|ซาบะ|ตับ|หัวใจ|ลิ้น|กระเพาะ|ผ้าขี้ริ้ว|ไข่|เบคอน|แฮม|ไส้กรอก|ลูกชิ้น|แหนม|กุนเชียง|หมูยอ|โบโลน่า|ฮอทดอก|ไก่งวง|นกกระทา/],
 ["milk",/นม|ชีส|โยเกิร์ต|ครีม|เนย(?!ถั่ว)/],
 ["nut", /ถั่ว|อัลมอนด์|วอลนัท|เม็ดมะม่วง|พิสตา|แมคคา|งา|เมล็ด|เต้าหู้/],
 ["carb",/ข้าว|เส้น|บะหมี่|พาสต้า|สปาเก|ขนมปัง|แป้ง|มาม่า|ซีเรียล|โอ๊ต|ตอร์ติญ่า|พิต้า|ครัวซอง|เกี๊ยว|สาคู|วุ้นเส้น|ขนมจีน|เค้ก|คุกกี้|ช็อก|ไอศ|โดนัท|มัฟฟิน|พาย|พุดดิ้ง|เวเฟอร์|บิสกิต|ป๊อปคอร์น|แครกเกอร์|ทอดกรอบ|ขนม|ลูกอม|หมากฝรั่ง|เยลลี่|กราโนล่า|ชิป/],
 ["cond",/น้ำมัน|เกลือ|น้ำตาล|ซอส|ซีอิ๊ว|น้ำปลา|น้ำจิ้ม|น้ำสลัด|มายอง|กะปิ|เต้าเจี้ยว|ผงชูรส|ซุปก้อน|แยม|น้ำผึ้ง|ไซรัป|น้ำเชื่อม|มัสตาร์ด|สายชู|ผงปรุง|พริกไทย|มะขามเปียก/],
];
/* [ต่อโปรตีน 1 ก., ต่อไฟเบอร์ 1 ก., ต่อ 1 kcal] */
const POTC={veg:[0,90,1.7],fruit:[30,10,2.3],meat:[12,0,0.1],milk:[5,35,0],
            nut:[20,25,0],carb:[20,5,0],cond:[30,105,0],drink:[30,120,0.8],mix:[12,90,0.15]};
function potGroup(name,cat){
  if(cat==="ผลไม้")return "fruit";
  if(cat==="เครื่องดื่ม")return "drink";
  for(const [g,re] of POTG) if(re.test(name)) return g;
  return "mix";
}
function potOf(name,cat,kcal,protein,fiber){
  if(!kcal) return 0;
  const [a,b,c]=POTC[potGroup(name,cat)];
  return Math.max(0,Math.round((+protein||0)*a+(+fiber||0)*b+kcal*c));
}
/* หาโพแทสเซียมของอาหาร 1 รายการที่บันทึกไว้ — ใช้ค่าห้องแล็บก่อนถ้าเมนูนั้นมี */
function potRow(b){
  const f=findFood(b.name);
  if(f && f.length>=13 && typeof f[12]==="number")
    return {mg:f[12]*(+b.qty||1), lab:true};
  const cat=f?f[6]:"";
  const fib=(b.fiber!==undefined&&b.fiber!=="")?(+b.fiber||0):fiberOf(b.name,+b.carb||0,cat);
  return {mg:potOf(b.name,cat,+b.kcal||0,+b.protein||0,fib), lab:false};
}
function naK(na,pot){ return pot? n1(na/pot) : null; }
/* ---------- สารอาหารของ "หนึ่งรายการที่กิน" ----------
   ที่เดียวที่ตัดสินว่าค่าไหนของจริง ค่าไหนประมาณ — ทั้งยอดรวมของวันและบรรทัดในรายการมื้อ
   ใช้ตัวนี้ตัวเดียวกัน ตัวเลขจึงตรงกันเสมอ
   ค่าที่บันทึกไว้เป็น 0 คือ "วัดแล้วได้ศูนย์" ไม่ใช่ "ไม่มีข้อมูล" — ห้ามเอาค่าประมาณไปทับ
   (ไม่งั้นน้ำมันมะกอกที่โซเดียม 0 จะโดนเดาเป็น 400 มก.) */
const NUTK=["fiber","sodium","sat","sugar","alc"];
/* ลำดับความน่าเชื่อถือ: ฐานข้อมูลเมนู → ค่าที่บันทึกไว้ในรายการ → ค่าประมาณจากชนิดอาหาร
   ฐานข้อมูลมาก่อน เพราะเมื่อเราแก้ค่าให้แม่นขึ้น รายการเก่าต้องดีขึ้นตามด้วย
   ไม่งั้นค่าประมาณผิด ๆ ที่เคยถูกบันทึกไว้จะค้างอยู่ตลอดไป */
/* บันทึกเก่าบางรายการไม่มีช่องหน่วยติดมา — เอาจากฐานข้อมูลก่อน ไม่งั้นใช้คำกลาง ๆ
   ห้ามปล่อยให้หน้าจอขึ้นคำว่า undefined เด็ดขาด */
function unitOf(b){
  if(b && b.unit) return b.unit;
  const f=b?findFood(b.name):null;
  return (f && f[5]) ? f[5] : "ที่";
}
function nutRow(b){
  const f=findFood(b.name), cat=f?f[6]:"";
  const q=+b.qty||1;
  const bf=(+b.broth>0&&+b.broth<=1)?+b.broth:1;      /* ซดน้ำซุปแค่ไหน — มีผลเฉพาะโซเดียม */
  /* เทียบขนาดจาก "แคลอรี่ที่บันทึกไว้ ÷ แคลอรี่ต่อหน่วยในฐานข้อมูล" ไม่ใช่ช่อง qty
     เพราะบันทึกเก่าบางรายการไม่มี qty และผู้ใช้แก้แคลอรี่เองได้ — ใช้แคลจึงตรงกับของจริงเสมอ */
  const ratio=(f && +f[1]>0 && +b.kcal>0) ? (+b.kcal/+f[1]) : q;
  const has=k=>(b[k]!==undefined&&b[k]!=="");
  const db=i=>(f && f[i]!==undefined && f[i]!=="") ? (+f[i]||0)*ratio : null;
  const src={};
  const pick=(k,i,est)=>{
    const v=db(i); if(v!==null){ src[k]="db"; return v; }
    if(has(k)){ src[k]="rec"; return +b[k]||0; }
    src[k]="est"; return est;
  };
  const kk=potRow(b);
  const o={
    fiber : pick("fiber", 7,fiberOf(b.name,+b.carb||0,cat)),
    sodium: pick("sodium",8,sodiumOf(b.name,cat))*bf,
    sat   : pick("sat",   9,satOf(b.name,+b.fat||0,cat)),
    sugar : pick("sugar",10,sugarOf(b.name,+b.carb||0,cat)),
    alc   : pick("alc",  11,alcOf(b.name)),
    pot   : kk.mg,
    potLab: kk.lab, broth:bf, src,
  };
  /* จำนวนช่องที่ยังเป็นค่าประมาณ — เอาไว้บอกผู้ใช้ว่าตัวเลขนี้เชื่อได้แค่ไหน */
  o.est = NUTK.filter(k=>src[k]==="est").length + (kk.lab?0:1);
  return o;
}
/* เมนูที่ให้สารตัวนั้นมากที่สุดของวัน — ใช้ชี้ตัวจริงแทนการเดาว่า "ของทอด/กะทิ" */
function topSrc(fd,key,n){
  const m=new Map();
  arr(fd).forEach(b=>{ const v=nutRow(b)[key]; if(v>0) m.set(b.name,(m.get(b.name)||0)+v); });
  return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n||2).map(([name,v])=>({name,v}));
}

/* ---------- ไฟเบอร์ (ประมาณจากชนิดอาหาร) ---------- */
const FIB=[
 [/ผัก|บล็อคโคลี่|คะน้า|ผักบุ้ง|กะหล่ำ|ถั่วฝักยาว|แครอท|สลัด|เห็ด|แตงกวา|มะเขือเทศ|ฟักทอง|ถั่วลันเตา|ส้มตำ|ยำ|แกงส้ม|ต้มยำ/,0.33],
 [/ผลไม้|กล้วย|แอปเปิ้ล|ส้ม|มะม่วง|แตงโม|สับปะรด|มะละกอ|ฝรั่ง|ทุเรียน|ลำไย|องุ่น|อะโวคาโด/,0.13],
 [/ข้าวกล้อง|ไรซ์เบอร์รี่|โฮลวีท|ข้าวโอ๊ต|ถั่ว|อัลมอนด์|เนยถั่ว|มันหวาน|ข้าวโพด|เต้าหู้|ถั่วเหลือง|มันฝรั่ง/,0.11],
 [/น้ำอัดลม|น้ำหวาน|ชา|กาแฟ|นม|เบียร์|เหล้า|ไวน์|โยเกิร์ต|เวย์|ไอศกรีม|เค้ก|ช็อกโกแลต|คุกกี้|โดนัท|น้ำเปล่า/,0.01]
];
function fiberOf(name,carb,cat){
  if(!carb)return 0;
  if(cat==="ผลไม้")return n1(carb*0.13);
  for(const [re,f] of FIB) if(re.test(name)) return n1(carb*f);
  if(cat==="วัตถุดิบ")return n1(carb*0.08);
  return n1(carb*0.04);
}
el("qtyChips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;
  el("qtyChips").querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));c.classList.add("on");
  S.qty=+c.dataset.q; el("fQty").value=""; el("fQtyNote").textContent=""; fPreview();};

/* ---------- กรอกปริมาณเอง: ตัวคูณ หรือ น้ำหนัก/ปริมาตรจริง ----------
   หน่วยของเมนูมักมีน้ำหนักติดมาด้วย เช่น "1 ถ้วย 8 ก." หรือ "100 ก." → แปลงกรัมเป็นตัวคูณให้เลย */
function unitGrams(unit){
  const s=String(unit||"");
  const m=s.match(/([\d.]+)\s*(?:ก\.|กรัม|มล\.|ml|g)\b/i) || s.match(/([\d.]+)\s*(?:ก\.|กรัม|มล\.)/);
  if(!m) return 0;
  const n=parseFloat(m[1]);
  return (n>0 && n<5000)? n : 0;
}
function parseQty(txt,unit){
  const t=String(txt||"").trim().replace(/,/g,"");
  if(!t) return null;
  const frac={"ครึ่ง":0.5,"1/2":0.5,"½":0.5,"1/4":0.25,"¼":0.25,"3/4":0.75,"¾":0.75,"1/3":1/3,"2/3":2/3};
  if(frac[t]!==undefined) return {q:frac[t],why:"เศษส่วน"};
  const m=t.match(/^([\d.]+)\s*(.*)$/);
  if(!m) return null;
  const n=parseFloat(m[1]); if(!isFinite(n)||n<=0||n>9999) return null;
  const rest=m[2].trim();
  if(/^(ก\.|กรัม|g|กก\.|มล\.|ml|ลิตร|l)$/i.test(rest)){
    let grams=n;
    if(/^(กก\.|kg)$/i.test(rest)) grams=n*1000;
    if(/^(ลิตร|l)$/i.test(rest)) grams=n*1000;
    const per=unitGrams(unit);
    if(!per) return {q:null,why:"เมนูนี้ไม่ได้บอกน้ำหนักต่อหน่วย เลยแปลงกรัมให้ไม่ได้ — ใส่เป็นตัวคูณแทนได้"};
    return {q:+(grams/per).toFixed(3), why:`${n} ${rest} ÷ ${per} = ${n1(grams/per)} หน่วย`};
  }
  if(rest==="") return {q:n,why:"ตัวคูณ"};
  return {q:null,why:'พิมพ์ได้แค่ตัวเลข หรือ ตัวเลข+หน่วย เช่น "150 ก."'};
}
/* ---------- น้ำซุป: ตัวแปรเดียวที่คุมโซเดียมได้จริงในอาหารไทย ----------
   กรมอนามัยวัดก๋วยเตี๋ยวชามละ 500 ก. ได้โซเดียม 1,400–2,700 มก. ต่อชาม "เมื่อซดน้ำหมด"
   ค่าที่เก็บในฐานข้อมูลของเมนูน้ำจึงเป็นแบบซดหมด แล้วให้ผู้ใช้เลือกว่าซดแค่ไหน
   (น้ำซุปกินโซเดียมราว 60% ของทั้งชาม — ไม่ซดน้ำจึงลดได้มาก) */
/* เมนู "น้ำ" ที่โซเดียมส่วนใหญ่อยู่ในน้ำซุป — ผู้ใช้เลือกได้ว่าซดแค่ไหน แล้วระบบคูณลดให้
   รวมซุปเกาหลีด้วย เพราะเป็นชนิดที่น้ำเค็มจัดพอ ๆ กับก๋วยเตี๋ยว และคนไทยมักไม่ซดหมด */
const SOUPRE=/ก๋วยเตี๋ยว|ก๋วยจั๊บ|บะหมี่|เย็นตาโฟ|ราเมง|เกาเหลา|สุกี้น้ำ|ซุนดูบู|ซุปกิมจิ|กิมจิจีเก|ต๊อกกุก|รามยอน|ต้มเลือดหมู/;
function isSoup(name,cat){
  const n=String(name||"");
  if(/แห้ง/.test(n)) return false;
  return SOUPRE.test(n) || (cat==="ก๋วยเตี๋ยว" && !/ต้มจืด|แกงจืด|ต้มยำ/.test(n));
}
let brothF=0.68;
function brothSync(){
  const on=!!S.chosen && isSoup(S.chosen[0],S.chosen[6]);
  el("brothBox").style.display=on?"block":"none";
  if(!on){ brothF=1; return; }
  brothF=+(el("brothSeg").querySelector("button.on")||{dataset:{b:"0.68"}}).dataset.b||0.68;
  brothNote();
}
function brothNote(){
  if(!S.chosen) return;
  const f=S.chosen, full=(f[8]!==undefined?+f[8]:sodiumOf(f[0],f[6]))*(S.qty||1);
  el("brothNote").innerHTML=`โซเดียมที่จะบันทึก <b style="color:${full*brothF>=1200?"var(--bad)":"var(--txt)"}">${Math.round(full*brothF).toLocaleString()}</b> มก.`
    + (brothF<1?` <span style="color:var(--move)">(ลดจาก ${Math.round(full).toLocaleString()})</span>`:"");
}
el("brothSeg").onclick=e=>{
  const b=e.target.closest("button"); if(!b) return;
  el("brothSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); brothF=+b.dataset.b||1; brothNote();
};
/* หน่วยเลือกด้วยปุ่ม ไม่ต้องพิมพ์ — คีย์บอร์ดตัวเลขบนมือถือไม่มีตัวอักษรไทยให้พิมพ์ "ก." อยู่แล้ว */
let fUnitMode="x";
function fQtyApply(){
  if(!S.chosen) return;
  const raw=el("fQty").value;
  if(String(raw).trim()===""){ el("fQtyNote").textContent=""; return; }
  const suffix={x:"",g:" ก.",ml:" มล."}[fUnitMode]||"";
  const r=parseQty(raw+suffix,S.chosen[5]);
  if(!r){ el("fQtyNote").textContent=""; return; }
  if(r.q===null){ el("fQtyNote").innerHTML=`<span style="color:var(--bad)">${esc(r.why)}</span>`; return; }
  el("qtyChips").querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));
  S.qty=r.q; el("fQtyNote").textContent="= "+n1(r.q)+" × "+S.chosen[5]+"  ("+r.why+")";
  fPreview();
}
el("fQty").oninput=fQtyApply;
el("fUnitSeg").onclick=e=>{
  const b=e.target.closest("button"); if(!b) return;
  el("fUnitSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on"));
  b.classList.add("on"); fUnitMode=b.dataset.u;
  el("fQty").placeholder = fUnitMode==="x" ? "หรือพิมพ์ตัวเลขเอง เช่น 1.25"
                        : fUnitMode==="g" ? "น้ำหนักเป็นกรัม เช่น 150" : "ปริมาตรเป็นมล. เช่น 250";
  fQtyApply();
};
/* เมนูไหนไม่ได้บอกน้ำหนักต่อหน่วย ก็เลือกกรัม/มล. ไม่ได้ — ปิดปุ่มไว้ ไม่ให้กดแล้วงงว่าทำไมไม่ขึ้น
   แต่ปิดเฉย ๆ แล้วไม่บอกอะไรก็งงอยู่ดี จึงเขียนบอกด้วยว่าทำไม และต้องทำยังไงถึงจะกรอกกรัมได้
   (เมนูในฐานข้อมูลบอกน้ำหนักครบทุกรายการแล้ว จะเจอเคสนี้เฉพาะเมนูที่ผู้ใช้พิมพ์หน่วยเอง) */
function fUnitSegSync(){
  const per=S.chosen?unitGrams(S.chosen[5]):0;
  el("fUnitSeg").querySelectorAll("button").forEach(b=>{
    const off = b.dataset.u!=="x" && !per;
    b.disabled=off; b.style.opacity=off?".38":"";
  });
  if(!per && fUnitMode!=="x"){
    fUnitMode="x";
    el("fUnitSeg").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.u==="x"));
  }
  const w=el("fUnitWhy");
  if(w) w.innerHTML = per ? "" :
    `กรอกเป็นกรัมไม่ได้ เพราะเมนูนี้ไม่ได้บอกว่า 1 ${esc(String(S.chosen?S.chosen[5]:"หน่วย").replace(/^\d+\s*/,""))} หนักเท่าไร
     — แก้ได้โดยใส่น้ำหนักลงในช่องหน่วยของเมนู เช่น <b>1 จาน (250 ก.)</b>`;
}

function ALLFOODS(){
  return FOODS.concat(S.myfood.map(m=>{
    const r=[m.name,+m.kcal||0,+m.protein||0,+m.carb||0,+m.fat||0,m.unit||"1 ที่","ของฉัน",+m.fiber||0,+m.sodium||0,+m.sat||0,+m.sugar||0,
      (m.alc!==undefined&&m.alc!=="")?+m.alc||0:undefined];
    if(+m.pot>0) r.push(+m.pot);   /* เมนูรวมจากส่วนผสมมีโพแทสเซียมจริงติดมาด้วย (ช่องที่ 13) */
    return r;
  }));
}
/* ค้นเมนูด้วยตารางแฮช — เดิมไล่ทีละแถว 762 รอบต่อการเรียก 1 ครั้ง
   พอมีข้อมูลหลายเดือนจะถูกเรียกหลายพันครั้งต่อการวาดหนึ่งรอบ มือถือจึงหน่วง */
let _foodMap=null, _foodMapN=-1;
function foodMap(){
  const n=arr(S.myfood).length;
  if(_foodMap && _foodMapN===n) return _foodMap;
  const m=new Map();
  /* ชื่อชนกัน → เมนูที่ผู้ใช้เพิ่มเองต้องชนะเมนูสำเร็จรูปเสมอ เพราะเป็นตัวเลขที่เขาตั้งใจใส่เอง
     (ALLFOODS เรียงของสำเร็จรูปมาก่อน จึงต้องให้ของทีหลังเขียนทับ) */
  ALLFOODS().forEach(f=>{ m.set(f[0],f); });
  _foodMapN=n;
  return _foodMap=m;
}
function clearFoodMap(){ _foodMap=null; _foodMapN=-1; }
function findFood(n){return foodMap().get(n);}
/* นับว่าเคยกินเมนูไหนไปกี่ครั้ง (90 วันล่าสุด) — ใช้จัดลำดับผลค้นหา */
let _eatC=null, _eatAt=0;
function eatCount(){
  if(_eatC && Date.now()-_eatAt<30000) return _eatC;
  const from=shiftDate(S.date,-90), c={};
  arr(S.food).forEach(f=>{ if(f&&f.name&&f.date>=from) c[f.name]=(c[f.name]||0)+1; });
  _eatAt=Date.now(); return _eatC=c;
}
el("fSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase();
  const pk=el("fPick");
  if(!q){pk.classList.remove("on");el("fManual").style.display="none";return;}
  const all=ALLFOODS().filter(f=>f[0].toLowerCase().includes(q));
  /* เรียงให้ของที่ "ตรงที่สุด" ขึ้นก่อน — เมนูของฉันและที่กินบ่อยได้แต้มพิเศษ */
  const eaten=eatCount();
  const rank=f=>{const n=f[0].toLowerCase();
    let r = n===q?0 : n.startsWith(q)?1 : /[\s(]/.test(n.charAt(n.indexOf(q)-1))?2 : 3;
    if(f[6]==="ของฉัน") r-=2;          /* เมนูที่ผู้ใช้เพิ่มเอง ขึ้นก่อนเสมอ */
    else if(eaten[f[0]]) r-=1;         /* เคยกินมาแล้ว ขึ้นก่อนของที่ไม่เคยกิน */
    return r;};
  all.sort((a,b)=>rank(a)-rank(b) || (eaten[b[0]]||0)-(eaten[a[0]]||0)
                  || a[0].length-b[0].length || a[0].localeCompare(b[0],"th"));
  const hit=all.slice(0,25);
  if(!hit.length){pk.classList.remove("on");el("fManual").style.display="block";el("mName").value=e.target.value;el("fChosen").style.display="none";mPreview();return;}
  el("fManual").style.display="none";
  pk.innerHTML=hit.map(f=>`<div data-n="${esc(f[0])}">${esc(f[0])} <span class="tag">${esc(f[6])}</span><small>${f[1]} kcal · ${f[5]}${(f[8]!==undefined?f[8]:sodiumOf(f[0],f[6]))>=1200?' · <span style="color:#f87171">🧂 โซเดียมสูง</span>':""}</small></div>`).join("")
    + (all.length>25?`<div class="more">แสดง 25 จาก ${all.length} รายการ — พิมพ์เพิ่มเพื่อค้นให้แคบลง</div>`:"");
  pk.classList.add("on");
};
/* เลือกเมนูเข้าสู่หน้าบันทึก — จุดเดียว ใช้ทั้งจากผลค้นหาและหลังบันทึกสูตรเสร็จ */
function chooseFood(name){
  const f=findFood(name); if(!f) return;
  S.chosen=f;
  el("fChosen").style.display="block";
  el("fName").textContent=f[0];
  const per=unitGrams(f[5]);
  /* หน่วยไหนบอกน้ำหนักไว้ในตัวอยู่แล้ว ไม่ต้องวงเล็บซ้ำอีก ("ไก่ 180 ก. (≈ 180 ก.)" อ่านแล้วงง) */
  const shown=/[\d.]+\s*(?:ก\.|กรัม|มล\.|ml|g)/i.test(String(f[5]));
  el("fUnit").textContent="1 หน่วย = "+f[5]+((per&&!shown)?` (≈ ${per} ${/มล\.|ml/i.test(f[5])?"มล.":"ก."})`:"");
  S.qty=1; el("fQty").value=""; el("fQtyNote").textContent="";
  el("qtyChips").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.q==="1"));
  /* เมนูที่ผู้ใช้เพิ่มเอง — ให้ลบ/ดูสูตรได้จากตรงนี้ แทนที่จะมีกล่องแยกอีกกล่อง */
  const mine=f[6]==="ของฉัน" ? arr(S.myfood).find(m=>m.name===f[0]) : null;
  el("fOwnBox").style.display=mine?"block":"none";
  if(mine) el("fOwnBox").innerHTML=`<span class="tag">📒 เมนูที่คุณเพิ่มเอง</span>
    <button class="del" style="font-size:13px" onclick="delMyFood(${mine.ts})">✕ ลบเมนูนี้</button>`
    + (Array.isArray(mine.recipe)&&mine.recipe.length
       ?`<details class="fold sub" data-fold="rShow"><summary>🥘 ส่วนผสมในสูตร <span class="fn">${mine.recipe.length} อย่าง</span></summary>
          <div class="foldc"><div class="mini" style="line-height:1.8">${mine.recipe.map(x=>`${esc(x.n)} × ${n1(x.q)}`).join("<br>")}</div></div></details>`
       :"");
  fUnitSegSync(); brothSync(); fPreview();
}
el("fPick").onclick=e=>{
  const d=e.target.closest("div[data-n]"); if(!d)return;
  el("fPick").classList.remove("on"); el("fSearch").value="";
  chooseFood(d.dataset.n);
};
function fPreview(){
  if(!S.chosen)return;
  const f=S.chosen,q=S.qty;
  el("fKcal").textContent=Math.round(f[1]*q);
  el("fMac").textContent=`โปรตีน ${n1(f[2]*q)} ก. · คาร์บ ${n1(f[3]*q)} ก. · ไขมัน ${n1(f[4]*q)} ก.`;
  brothNote();
}
/* ---------- แก้ไขรายการที่บันทึกแล้ว ----------
   เดิมแก้ได้ทางเดียวคือลบทิ้งแล้วกรอกใหม่ทั้งหมด — น่ารำคาญที่สุดเวลาใส่ปริมาณผิดนิดเดียว
   ปุ่ม ✎ เปิดรายการกลับเข้าฟอร์มพร้อมค่าเดิม (เมนู/ปริมาณ/เวลา/น้ำซุป) แก้แล้วบันทึกทับตัวเดิม */
let editTs=null;
function editBanner(where){
  const b=el("fEditBar"); if(!b) return;
  b.style.display=editTs?"block":"none";
  if(editTs) b.innerHTML=`✎ กำลังแก้ไขรายการเดิม — กด "บันทึก" แล้วตัวเก่าจะถูกแทนที่
    <button class="btn ghost" style="margin-top:7px;padding:7px" onclick="editCancel()">ยกเลิกการแก้ไข</button>`;
}
function editCancel(){ editTs=null; editBanner();
  S.chosen=null; el("fChosen").style.display="none"; el("fManual").style.display="none"; }
function editFood(ts){
  const rec=arr(S.food).find(x=>String(x.ts)===String(ts)); if(!rec) return;
  document.querySelector("nav [data-p=food]").click();
  editTs=rec.ts;
  if(rec.time) setTime(rec.time);
  if(findFood(rec.name)){
    chooseFood(rec.name);
    S.qty=+rec.qty||1;
    if(S.qty!==1){ el("fQty").value=S.qty; fQtyApply(); }
    /* คืนตัวเลือกน้ำซุปเดิม */
    if(el("brothBox").style.display!=="none"){
      const bsel=(+rec.broth>0&&+rec.broth<1)?String(rec.broth):"1";
      el("brothSeg").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x.dataset.b===bsel));
      brothF=+bsel; brothNote();
    }
    el("fChosen").scrollIntoView({behavior:"smooth",block:"start"});
  }else{
    /* เมนูที่ไม่อยู่ในฐาน (กรอกเอง/ประมาณเอง) → เปิดฟอร์มกรอกเองพร้อมค่าเดิม */
    el("fManual").style.display="block"; el("fChosen").style.display="none";
    el("mModeSeg").querySelector('[data-m="exact"]').click();
    el("mName").value=rec.name; el("mUnit").value=rec.unit||"";
    el("mKcal").value=rec.kcal||""; el("mP").value=rec.protein||""; el("mC").value=rec.carb||""; el("mF").value=rec.fat||"";
    el("mFib").value=rec.fiber!==undefined?rec.fiber:""; el("mNa").value=rec.sodium!==undefined?rec.sodium:"";
    el("mSat").value=rec.sat!==undefined?rec.sat:""; el("mSug").value=rec.sugar!==undefined?rec.sugar:"";
    el("mAlc").value=rec.alc!==undefined?rec.alc:"";
    el("mSaveFav").checked=false;
    mPreview(); el("fManual").scrollIntoView({behavior:"smooth",block:"start"});
  }
  editBanner();
}
/* ตัวเก่าออก ตัวใหม่เข้า — ทั้งในเครื่องและบนชีต */
async function editReplace(newRow){
  const old=editTs; editTs=null; editBanner();
  S.food=arr(S.food).filter(x=>String(x.ts)!==String(old));
  S.food.push(newRow); render();
  await api({action:"del",sheet:"Food",ts:old});
  await api({action:"add",sheet:"Food",row:newRow});
}
el("fClear").onclick=()=>{S.chosen=null;el("fChosen").style.display="none";
  S.qty=1;el("fQty").value="";el("fQtyNote").textContent=""; editTs=null; editBanner();};
el("fAdd").onclick=async()=>{
  const f=S.chosen,q=S.qty;if(!f)return;
  const bf=isSoup(f[0],f[6])?brothF:1;
  const r={date:S.date,time:S.time,meal:S.meal,name:f[0],qty:q,unit:f[5],
    kcal:Math.round(f[1]*q),protein:n1(f[2]*q),carb:n1(f[3]*q),fat:n1(f[4]*q),
    fiber:n1((f[7]!==undefined?f[7]:fiberOf(f[0],f[3],f[6]))*q),
    sodium:Math.round((f[8]!==undefined?f[8]:sodiumOf(f[0],f[6]))*q*bf),
    sat:n1((f[9]!==undefined?f[9]:satOf(f[0],f[4],f[6]))*q),
    sugar:n1((f[10]!==undefined?f[10]:sugarOf(f[0],f[3],f[6]))*q),
    alc:n1((f[11]!==undefined?f[11]:alcOf(f[0]))*q),ts:newTs()};
  if(bf!==1) r.broth=bf;
  S.chosen=null;el("fChosen").style.display="none";
  if(editTs){ await editReplace(r); return; }
  S.food.push(r);
  render(); await api({action:"add",sheet:"Food",row:r});
};
const RATIO={bal:[.17,.48,.35],pro:[.40,.15,.45],carb:[.10,.75,.15],veg:[.15,.70,.15],fat:[.08,.40,.52]};
let mMode="est";
el("mModeSeg").onclick=e=>{const b=e.target.closest("button");if(!b)return;
  el("mModeSeg").querySelectorAll("button").forEach(x=>x.classList.remove("on"));b.classList.add("on");
  mMode=b.dataset.m;
  el("mEst").style.display=mMode==="est"?"block":"none";
  el("mExact").style.display=mMode==="exact"?"block":"none";
  mPreview();};
["mGuess","mType","mKcal","mP","mC","mF","mFib","mNa","mSat","mSug","mAlc"].forEach(id=>{el(id).oninput=mPreview;el(id).onchange=mPreview;});
function mCalc(){
  if(mMode==="est"){
    const k=+el("mGuess").value, r=RATIO[el("mType").value];
    const carb=n1(k*r[1]/4), fibF={veg:0.30,bal:0.05,pro:0.03,carb:0.05,fat:0.03}[el("mType").value];
    const naF={veg:120,bal:800,pro:600,carb:500,fat:600}[el("mType").value];
    return {kcal:k, protein:n1(k*r[0]/4), carb:carb, fat:n1(k*r[2]/9), fiber:n1(carb*fibF),
      sodium:+el("mNa").value||Math.round(naF*k/500),
      sat:+el("mSat").value||n1(n1(k*r[2]/9)*(el("mType").value==="fat"?0.5:0.35)),
      sugar:+el("mSug").value||n1(carb*(el("mType").value==="fat"?0.4:0.1)), alc:+el("mAlc").value||0, src:"ประมาณ"};
  }
  const P=+el("mP").value||0, C=+el("mC").value||0, F=+el("mF").value||0;
  let k=+el("mKcal").value||0;
  const fromMac=Math.round(P*4+C*4+F*9);
  if(!k) k=fromMac;
  return {kcal:k, protein:n1(P), carb:n1(C), fat:n1(F), fiber:n1(+el("mFib").value||C*0.05),
    sodium:+el("mNa").value||Math.round(k*0.9), sat:+el("mSat").value||n1(F*0.35),
    sugar:+el("mSug").value||0, alc:+el("mAlc").value||0, fromMac, src:"กรอกเอง"};
}
function mPreview(){
  const c=mCalc();
  if(!c.kcal && !c.protein && !c.carb && !c.fat){el("mPreview").innerHTML="";return;}
  let warn="";
  if(mMode==="exact" && c.fromMac>0 && +el("mKcal").value>0 && Math.abs(c.fromMac-c.kcal)>c.kcal*0.15)
    warn=`<div class="mini" style="color:var(--food);margin-top:7px">⚠️ สารอาหารที่กรอกคิดเป็น ${c.fromMac} kcal ต่างจากที่กรอกไว้ (${c.kcal}) ลองเช็คอีกที</div>`;
  if(mMode==="exact" && !+el("mKcal").value && c.fromMac>0)
    warn=`<div class="mini" style="margin-top:7px">คิดแคลอรี่จากสารอาหารให้: โปรตีน ${c.protein}×4 + คาร์บ ${c.carb}×4 + ไขมัน ${c.fat}×9</div>`;
  el("mPreview").innerHTML=`<div class="card" style="background:var(--card2);margin:13px 0 0;text-align:center">
    <b style="color:var(--food);font-size:26px">${c.kcal}</b> kcal
    <div class="mini">โปรตีน ${c.protein} ก. · คาร์บ ${c.carb} ก. · ไขมัน ${c.fat} ก. · ไฟเบอร์ ${c.fiber} ก. · โซเดียม ${c.sodium} มก. · อิ่มตัว ${c.sat} ก. <span class="tag">${c.src}</span></div>${warn}</div>`;
}
el("fNew").onclick=()=>{
  el("fManual").style.display="block"; el("fChosen").style.display="none";
  el("fPick").classList.remove("on");
  if(!el("mName").value) el("mName").value=el("fSearch").value.trim();
  mPreview(); el("fManual").scrollIntoView({behavior:"smooth",block:"start"});
};
el("mCancel").onclick=()=>{el("fManual").style.display="none";el("fSearch").value=""; editTs=null; editBanner();};
el("mAdd").onclick=async()=>{
  const name=el("mName").value.trim(); if(!name)return alert("ใส่ชื่อเมนูก่อนนะ");
  const c=mCalc();
  if(!c.kcal)return alert("ใส่แคลอรี่ หรือสารอาหารอย่างน้อยหนึ่งอย่างก่อนนะ");
  const unit=el("mUnit").value.trim()||(mMode==="est"?"ประมาณเอง":"1 ที่");
  const r={date:S.date,time:S.time,meal:S.meal,name:name,qty:1,unit:unit,
    kcal:c.kcal,protein:c.protein,carb:c.carb,fat:c.fat,fiber:c.fiber,sodium:c.sodium,sat:c.sat,sugar:c.sugar,alc:c.alc,ts:newTs()};
  if(editTs){
    el("mName").value="";el("mUnit").value="";el("mKcal").value="";el("mP").value="";el("mC").value="";el("mF").value="";
    el("mPreview").innerHTML=""; el("fSearch").value=""; el("fManual").style.display="none";
    await editReplace(r); return;
  }
  S.food.push(r);
  if(el("mSaveFav").checked && !findFood(name)){
    const mf={ts:newTs(),name:name,kcal:c.kcal,protein:c.protein,carb:c.carb,fat:c.fat,fiber:c.fiber,sodium:c.sodium,sat:c.sat,sugar:c.sugar,alc:c.alc||0,unit:unit};
    S.myfood.push(mf); api({action:"add",sheet:"MyFood",row:mf});
  }
  el("mName").value="";el("mUnit").value="";el("mKcal").value="";el("mP").value="";el("mC").value="";el("mF").value="";
  el("mPreview").innerHTML=""; el("fSearch").value=""; el("fManual").style.display="none";
  render(); await api({action:"add",sheet:"Food",row:r});
};
/* เมนูที่ผู้ใช้เพิ่มเองไม่มีกล่องแยกอีกแล้ว — ค้นเจอในช่องค้นหาปกติ (และขึ้นก่อนเสมอ)
   ฟังก์ชันนี้เหลือหน้าที่เดียวคือทำความสะอาดรายการและล้างแคชการค้นหา */
function renderMyFood(){
  S.myfood=arr(S.myfood).filter(x=>okRow(x)&&x.name); clearFoodMap();
}
async function delMyFood(ts){
  if(!confirm("ลบเมนูนี้ออกจากรายการของฉัน? (ที่บันทึกกินไปแล้วไม่หาย)"))return;
  S.myfood=arr(S.myfood).filter(x=>x.ts!=ts);
  S.chosen=null; el("fChosen").style.display="none";
  renderMyFood(); render(); saveNow();
  await api({action:"del",sheet:"MyFood",ts:ts});
}

/* ---------- กินบ่อย / คัดลอกเมื่อวาน / ส่งออก ---------- */
function renderFav(){
  const cnt={};
  S.food.forEach(f=>{ if(findFood(f.name)) cnt[f.name]=(cnt[f.name]||0)+1; });
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);
  el("favWrap").style.display=top.length?"block":"none";
  if(el("favN")) el("favN").textContent=top.length+" เมนู";
  el("favChips").innerHTML=top.map(n=>`<div class="chip y" data-n="${esc(n)}">${esc(n)}</div>`).join("");
  const fd=document.querySelector('details[data-fold="favBox"]'); if(fd) foldBind(fd);
}
el("favChips").onclick=e=>{
  const c=e.target.closest(".chip"); if(!c)return;
  const f=findFood(c.dataset.n); if(!f)return;
  S.chosen=f; S.qty=1;
  el("qtyChips").querySelectorAll(".chip").forEach(x=>x.classList.toggle("on",x.dataset.q==="1"));
  el("fManual").style.display="none"; el("fChosen").style.display="block";
  el("fName").textContent=f[0]; el("fUnit").textContent="1 หน่วย = "+f[5];
  fPreview();
  el("fChosen").scrollIntoView({behavior:"smooth",block:"center"});
};
/* ---------- คัดลอกจากเมื่อวาน: เลือกเป็นรายมื้อได้ ----------
   กดปุ่มแล้วโชว์ชิปมื้อของเมื่อวาน (พร้อมจำนวน+แคล) — กดมื้อไหนก๊อปมื้อนั้น หรือกด "ทั้งวัน" */
el("copyYtd").onclick=()=>{
  const box=el("copyBox");
  if(box.style.display!=="none"){ box.style.display="none"; return; }
  const y=shiftDate(S.date,-1), src=arr(S.food).filter(f=>okRow(f)&&f.date===y);
  if(!src.length){ alert("เมื่อวานไม่มีข้อมูลอาหาร"); return; }
  const by={}; src.forEach(f=>{ const m=f.meal||"อื่นๆ"; (by[m]=by[m]||[]).push(f); });
  const order=["เช้า","กลางวัน","เย็น","ว่าง","ดึก"];
  const meals=[...order.filter(m=>by[m]), ...Object.keys(by).filter(m=>!order.includes(m))];
  box.innerHTML = meals.map(m=>{
    const k=by[m].reduce((a,b)=>a+(+b.kcal||0),0);
    return `<div class="chip y" data-m="${esc(m)}">${mealIcon(m)} ${esc(m)} <small>${by[m].length} รายการ · ${k.toLocaleString()} kcal</small></div>`;
  }).join("") + (meals.length>1?`<div class="chip" data-m="*">ทั้งวัน (${src.length} รายการ)</div>`:"");
  box.style.display="flex";
};
el("copyBox").onclick=async e=>{
  const c=e.target.closest(".chip"); if(!c) return;
  const y=shiftDate(S.date,-1);
  const src=arr(S.food).filter(f=>okRow(f)&&f.date===y && (c.dataset.m==="*"||(f.meal||"อื่นๆ")===c.dataset.m));
  if(!src.length) return;
  el("copyBox").style.display="none";
  for(const s0 of src){
    const r={...s0,date:S.date,ts:newTs()};
    S.food.push(r); await api({action:"add",sheet:"Food",row:r});
  }
  render();
};

/* ---------- รวมเมนูจากส่วนผสม ----------
   สารอาหารของเมนูรวม = ผลบวกของส่วนผสมจริง (รวมโพแทสเซียมจากค่าแล็บด้วย)
   แม่นกว่าการกรอกเองหรือให้ระบบเดาจากชื่อเมนูมาก */
let R=[];                                   /* [{name, qty}] */
function rReset(){ R=[]; el("rName").value=""; el("rSearch").value=""; el("rServ").value="1"; el("rUnit").value=""; rDraw(); }
el("rOpen").onclick=()=>{
  el("fRecipe").style.display="block";
  el("fManual").style.display="none"; el("fChosen").style.display="none"; el("fPick").classList.remove("on");
  if(!el("rName").value) el("rName").value=el("fSearch").value.trim();
  rDraw(); el("fRecipe").scrollIntoView({behavior:"smooth",block:"start"});
};
el("rCancel").onclick=()=>{ el("fRecipe").style.display="none"; rReset(); };
el("rSearch").oninput=e=>{
  const q=e.target.value.trim().toLowerCase(), pk=el("rPick");
  if(!q){ pk.classList.remove("on"); return; }
  const all=ALLFOODS().filter(f=>f[0].toLowerCase().includes(q));
  /* วัตถุดิบมาก่อนเมนูจานเสร็จ — สูตรอาหารประกอบจากวัตถุดิบ */
  all.sort((a,b)=>{
    const ra=(a[0].toLowerCase().startsWith(q)?0:2)+(a[6]==="วัตถุดิบ"?0:1);
    const rb=(b[0].toLowerCase().startsWith(q)?0:2)+(b[6]==="วัตถุดิบ"?0:1);
    return ra-rb || a[0].length-b[0].length;
  });
  const hit=all.slice(0,8);
  if(!hit.length){ pk.classList.remove("on"); return; }
  pk.innerHTML=hit.map(f=>`<div data-n="${esc(f[0])}">${esc(f[0])} <span class="tag">${esc(f[6])}</span><small>${f[1]} kcal · ${esc(f[5])}</small></div>`).join("");
  pk.classList.add("on");
};
el("rPick").onclick=e=>{
  const d=e.target.closest("div[data-n]"); if(!d) return;
  R.push({name:d.dataset.n, qty:1});
  el("rSearch").value=""; el("rPick").classList.remove("on");
  rDraw();
};
/* รวมสารอาหารของสูตร — ใช้ตัวประมาณชุดเดียวกับทั้งแอปเมื่อส่วนผสมไม่มีค่าจริง */
function rNut(){
  const t={kcal:0,protein:0,carb:0,fat:0,fiber:0,sodium:0,sat:0,sugar:0,alc:0,pot:0,potLab:0,est:0};
  R.forEach(x=>{
    const f=findFood(x.name); if(!f) return;
    const q=+x.qty||0;
    const v=(i,est)=>((f[i]!==undefined&&f[i]!=="")?+f[i]:(t.est++,est))*q;
    t.kcal+=(+f[1]||0)*q; t.protein+=(+f[2]||0)*q; t.carb+=(+f[3]||0)*q; t.fat+=(+f[4]||0)*q;
    t.fiber+=v(7,fiberOf(x.name,+f[3]||0,f[6])); t.sodium+=v(8,sodiumOf(x.name,f[6]));
    t.sat+=v(9,satOf(x.name,+f[4]||0,f[6]));     t.sugar+=v(10,sugarOf(x.name,+f[3]||0,f[6]));
    t.alc+=v(11,alcOf(x.name));
    if(f.length>=13 && typeof f[12]==="number"){ t.pot+=f[12]*q; t.potLab++; }
    else { t.pot+=potOf(x.name,f[6],(+f[1]||0)*q,(+f[2]||0)*q,t.fiber); t.est++; }
  });
  return t;
}
function rDraw(){
  const L=el("rList"), t=rNut();
  L.innerHTML = R.length ? R.map((x,i)=>{
    const f=findFood(x.name)||[x.name,0,0,0,0,"?"];
    return `<div class="fbar" style="gap:8px">
      <span style="flex:1;min-width:0"><b style="font-size:13.5px">${esc(x.name)}</b>
        <small style="display:block;color:var(--dim);font-size:11.5px">${esc(f[5])} · ${Math.round(f[1]*(+x.qty||0))} kcal</small></span>
      <input type="number" step="any" inputmode="decimal" value="${x.qty}" data-i="${i}"
        style="width:74px;flex:none;text-align:center;padding:8px 4px">
      <button class="del" data-del="${i}">✕</button></div>`;
  }).join("") : `<div class="empty" style="padding:10px 0">ยังไม่มีส่วนผสม — ค้นหาแล้วแตะเพื่อเพิ่ม</div>`;
  const sv=Math.max(0.1,+el("rServ").value||1);
  el("rSum").innerHTML = R.length ? `
    <div class="offchips" style="margin-top:8px">
      <span>รวม <b>${Math.round(t.kcal).toLocaleString()}</b> kcal</span>
      <span>P <b>${n1(t.protein)}</b></span><span>C <b>${n1(t.carb)}</b></span><span>F <b>${n1(t.fat)}</b></span>
      <span>ใย <b>${n1(t.fiber)}</b></span><span>Na <b>${Math.round(t.sodium).toLocaleString()}</b></span>
      <span>K <b>${Math.round(t.pot).toLocaleString()}</b></span>
    </div>
    ${sv!==1?`<div class="mini" style="margin-top:5px">ต่อ 1 มื้อ (÷${n1(sv)}): <b style="color:var(--food)">${Math.round(t.kcal/sv).toLocaleString()}</b> kcal · P ${n1(t.protein/sv)} ก.</div>`:""}` : "";
}
el("rList").oninput=e=>{
  const i=e.target.dataset.i; if(i===undefined) return;
  R[+i].qty=e.target.value; rDraw();
  /* คืนโฟกัสให้ช่องเดิม — rDraw วาดใหม่ทำโฟกัสหลุด */
  const inp=el("rList").querySelector(`input[data-i="${i}"]`);
  if(inp){ inp.focus(); const v=inp.value; inp.value=""; inp.value=v; }
};
el("rList").onclick=e=>{
  const d=e.target.closest("[data-del]"); if(!d) return;
  R.splice(+d.dataset.del,1); rDraw();
};
el("rServ").oninput=rDraw;
el("rSave").onclick=async()=>{
  const name=el("rName").value.trim();
  if(!name) return alert("ตั้งชื่อเมนูก่อนนะ");
  const use=R.filter(x=>+x.qty>0);
  if(!use.length) return alert("เพิ่มส่วนผสมอย่างน้อย 1 อย่างก่อนนะ");
  const dup=findFood(name);
  if(dup && dup[6]!=="ของฉัน") return alert("ชื่อนี้ชนกับเมนูในฐานข้อมูล — ตั้งชื่อให้ต่างออกไปหน่อย เช่นเติมคำว่า \"ของฉัน\"");
  if(dup && !confirm("มีเมนูของคุณชื่อนี้อยู่แล้ว — บันทึกทับด้วยสูตรใหม่?")) return;
  const t=rNut(), sv=Math.max(0.1,+el("rServ").value||1);
  /* ส่วนผสมทุกอย่างบอกน้ำหนักต่อหน่วยอยู่แล้ว จึงบวกเป็นน้ำหนักรวมของสูตรได้
     ติดตัวเลขนี้ไว้ในหน่วย เมนูของผู้ใช้จะกรอกเป็น "กรัม" ได้เหมือนเมนูในฐานข้อมูล */
  let gTot=0, gAll=true;
  R.filter(x=>+x.qty>0).forEach(x=>{ const f=findFood(x.name);
    const per=f?unitGrams(f[5]):0;
    if(per) gTot+=per*(+x.qty||0); else gAll=false; });
  const gServe = (gAll && gTot>0) ? Math.round(gTot/sv) : 0;
  let unit=el("rUnit").value.trim();
  if(!unit) unit = sv!==1?`1 มื้อ (สูตรทำ ${n1(sv)} มื้อ)`:"1 จาน (สูตรรวม)";
  if(gServe && !unitGrams(unit)) unit += ` (${gServe} ก.)`;
  const mf={ts:newTs(),name,unit,
    kcal:Math.round(t.kcal/sv),protein:n1(t.protein/sv),carb:n1(t.carb/sv),fat:n1(t.fat/sv),
    fiber:n1(t.fiber/sv),sodium:Math.round(t.sodium/sv),sat:n1(t.sat/sv),sugar:n1(t.sugar/sv),
    alc:n1(t.alc/sv),pot:Math.round(t.pot/sv),
    recipe:use.map(x=>({n:x.name,q:+x.qty}))};   /* เก็บสูตรไว้ดู/แก้ทีหลัง (อยู่ในเครื่อง+ไฟล์สำรอง) */
  S.myfood=arr(S.myfood).filter(m=>m.name!==name);
  S.myfood.push(mf); clearFoodMap(); saveNow();
  api({action:"add",sheet:"MyFood",row:mf});
  el("fRecipe").style.display="none"; rReset();
  /* พาไปหน้าบันทึกต่อเลย — เมนูเพิ่งสร้างถูกเลือกไว้ให้แล้ว */
  chooseFood(name);
  el("fChosen").scrollIntoView({behavior:"smooth",block:"start"});
};
/* ---------- รายงานสรุปสำหรับหมอ (พิมพ์/เซฟ PDF) ----------
   ตัวเลขชุดเดียวกับหน้าสถิติทุกตัว แค่จัดหน้าใหม่ให้สะอาด อ่านจบใน 1 หน้ากระดาษ */
el("docBtn").onclick=()=>{
  clearDD();                        /* คิดจากข้อมูลสดเสมอ ไม่ใช้แคชของหน้าที่วาดไปก่อนหน้า */
  const days=period(S.date,30), A=agg(days), u=S.user;
  const fdN=A.fdDays, slN=A.slDays;
  const rr=(A.avgNa&&A.avgPot)? n1(A.avgNa/A.avgPot) : null;
  const wArr=bodySorted().filter(x=>x.w>0), lw=wArr[wArr.length-1];
  const w30=wArr.filter(x=>x.date>=shiftDate(S.date,-30));
  const dW=w30.length>1? n1(w30[w30.length-1].w - w30[0].w) : null;
  const bmi=lw? n1(lw.w/Math.pow(u.h/100,2)) : null;
  const waistA=bodySorted().filter(x=>x.waist>0), lwa=waistA[waistA.length-1];
  const z2wk=n1(days.reduce((a,d)=>a+d.ex.reduce((x,e)=>x+(+e.z2||0),0),0)/30*7);
  const exWk=n1(A.exDays/30*7);
  /* คะแนน/ประสิทธิภาพการนอนเฉลี่ยจากคืนที่กรอกระยะไว้ */
  let slScore=0,slEff=0,slQ=0;
  days.forEach(d=>{ const e=sleepEval(d.sl); if(e){ slScore+=e.score; slEff+=e.eff; slQ++; } });
  /* RHR/HRV เฉลี่ยจากเช็คความรู้สึก */
  let rhr=[],hrv=[];
  days.forEach(d=>{ const r=(S.rd||{})[d.key]; if(r){ if(+r.rhr>0)rhr.push(+r.rhr); if(+r.hrv>0)hrv.push(+r.hrv); } });
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
  const wkAlcAll=n1(A.alc/30*7);
  const tr=(k,v,ref)=>v==null||v===""?"":`<tr><td>${k}</td><td>${v}</td><td>${ref||""}</td></tr>`;
  const st=licState&&(()=>{try{return licState()}catch(e){return{}}})()||{};
  el("printDoc").innerHTML=`
    <h1>รายงานสุขภาพส่วนบุคคล (30 วันล่าสุด)</h1>
    <div class="sub">${thDate(shiftDate(S.date,-29))} – ${thDate(S.date)}${st.on&&st.ok&&st.name?` · ${esc(st.name)}`:""}
      · อายุ ${u.age} ปี · สูง ${u.h} ซม. · บันทึกด้วยตนเองผ่านแอปสุขภาพ</div>
    <h2>ร่างกาย</h2><table>
      ${tr("น้ำหนักล่าสุด", lw? n1(lw.w)+" กก." : null)}
      ${tr("เปลี่ยนแปลงใน 30 วัน", dW!=null? (dW>0?"+":"")+dW+" กก." : null)}
      ${tr("BMI", bmi, "เกณฑ์เอเชีย 18.5–22.9")}
      ${tr("รอบเอวล่าสุด", lwa? lwa.waist+" ซม." : null, u.sex==="m"?"ชายไม่ควรเกิน 90":"หญิงไม่ควรเกิน 80")}
    </table>
    <h2>อาหาร (เฉลี่ยต่อวัน · บันทึก ${fdN}/30 วัน)</h2><table>
      ${tr("พลังงาน", A.avgIn.toLocaleString()+" kcal", "เป้า "+u.target.toLocaleString())}
      ${tr("โปรตีน", A.avgPr+" ก. ("+(u.w?n1(A.avgPr/u.w):"-")+" ก./กก.)", "เป้า "+u.pGoal+" ก.")}
      ${tr("โซเดียม", A.avgNa.toLocaleString()+" มก.", "WHO ≤ 2,000")}
      ${tr("โพแทสเซียม", A.avgPot.toLocaleString()+" มก.", "WHO ≥ 3,510")}
      ${tr("อัตราส่วน Na:K", rr, "เป้า ≤ 1")}
      ${tr("น้ำตาลอิสระ", A.avgSug+" ก.", "≤ "+u.sugGoal+" ก. (10% พลังงาน)")}
      ${tr("ไขมันอิ่มตัว", A.avgSat+" ก.", "≤ "+u.satGoal+" ก.")}
      ${tr("ใยอาหาร", A.avgFb+" ก.", "เป้า "+u.fibGoal+" ก.")}
      ${tr("แอลกอฮอล์", wkAlcAll>0? wkAlcAll+" ก./สัปดาห์ (≈ "+n1(wkAlcAll/10)+" ดื่มมาตรฐาน)" : "ไม่ดื่ม/ไม่ได้บันทึก")}
    </table>
    <h2>การออกกำลังกาย</h2><table>
      ${tr("ความถี่", exWk+" วัน/สัปดาห์")}
      ${tr("รวม 30 วัน", A.min.toLocaleString()+" นาที · เผา "+A.kOut.toLocaleString()+" kcal")}
      ${tr("Zone 2 (แอโรบิกเบา)", z2wk+" นาที/สัปดาห์", "แนะนำ ≥ 150")}
    </table>
    <h2>การนอน (บันทึก ${slN}/30 คืน)</h2><table>
      ${tr("ชั่วโมงนอนเฉลี่ย", A.avgSleep? A.avgSleep+" ชม./คืน" : null, "เกณฑ์ 7–9")}
      ${slQ?tr("คะแนนคุณภาพเฉลี่ย", Math.round(slScore/slQ)+"/100", "จากระยะการนอน "+slQ+" คืน"):""}
      ${slQ?tr("ประสิทธิภาพการนอน", n1(slEff/slQ)+"%", "เกณฑ์ ≥ 85%"):""}
      ${tr("ชีพจรขณะพักเฉลี่ย", avg(rhr)? avg(rhr)+" ครั้ง/นาที" : null)}
      ${tr("HRV เฉลี่ย", avg(hrv)? avg(hrv)+" ms" : null)}
    </table>
    <div class="foot">หมายเหตุ: ข้อมูลทั้งหมดผู้ใช้บันทึกเอง · ค่าสารอาหารอ้างอิงฐานข้อมูล USDA FoodData Central
      และตารางคุณค่าทางโภชนาการอาหารไทย บางรายการเป็นค่าประมาณจากชนิดอาหาร ·
      รายงานนี้ใช้ประกอบการปรึกษาเท่านั้น ไม่ใช่เอกสารวินิจฉัยทางการแพทย์ ·
      พิมพ์เมื่อ ${thDate(today())}</div>`;
  window.print();
};
/* ---------- แจ้งเตือน ---------- */
function notiCfg(){try{return JSON.parse(LS.get("noti")||"{}")}catch(e){return {}}}
function notiShow(){
  const perm = ("Notification" in window)? Notification.permission : "unsupported";
  const c=notiCfg();
  el("notiState").innerHTML =
    perm==="unsupported" ? "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน — ใช้วิธีปฏิทิน (.ics) แทนได้"
    : perm==="granted" ? `<span style="color:var(--move)">✅ อนุญาตแล้ว</span> ${c.on?"· เปิดใช้งานอยู่":"· ยังไม่ได้เปิดใช้งาน"}`
    : perm==="denied" ? `<span style="color:var(--bad)">❌ ถูกปฏิเสธไว้</span> — ต้องไปเปิดในตั้งค่าเบราว์เซอร์/มือถือ`
    : "ยังไม่ได้ขออนุญาต";
  el("notiAsk").style.display = perm==="granted"?"none":"block";
  el("notiCfg").style.display = perm==="granted"?"block":"none";
  el("nOn").checked=!!c.on;
  if(c.b)el("nB").value=c.b; if(c.l)el("nL").value=c.l;
  if(c.d)el("nD").value=c.d; if(c.s)el("nS").value=c.s;
  tpSyncAll();
  if(c.w!==undefined)el("nW").value=c.w;
}
el("notiAsk").onclick=async()=>{
  if(!("Notification" in window))return alert("เบราว์เซอร์นี้ไม่รองรับ ใช้ไฟล์ปฏิทิน (.ics) แทนได้");
  const r=await Notification.requestPermission(); notiShow();
  if(r==="granted"){ LS.set("noti",JSON.stringify({...notiCfg(),on:true})); notiShow();
    notify("เปิดแจ้งเตือนแล้ว ✅","จะเตือนตามเวลาที่ตั้งไว้เมื่อเปิดแอปค้างไว้"); }
};
el("nSave").onclick=()=>{
  LS.set("noti",JSON.stringify({on:el("nOn").checked,b:el("nB").value,l:el("nL").value,
    d:el("nD").value,s:el("nS").value,w:+el("nW").value||0}));
  notiShow(); alert("บันทึกแล้ว ✅");
};
el("nTest").onclick=()=>notify("ทดสอบแจ้งเตือน 🔔","ถ้าเห็นข้อความนี้แปลว่าใช้งานได้แล้ว");
function notify(title,body){
  try{ if(Notification.permission==="granted") new Notification(title,{body:body,icon:"icon-192.png",badge:"icon-192.png"});
  }catch(e){}
}
/* ตัวจับเวลาในแอป — ตรวจทุกนาที */
let lastFired={};
setInterval(()=>{
  const c=notiCfg(); if(!c.on || !("Notification" in window) || Notification.permission!=="granted")return;
  const now=nowHHMM(), tday=today();
  const d=dayData(tday);
  const fire=(key,title,body)=>{ if(lastFired[key]===tday+now)return; lastFired[key]=tday+now; notify(title,body); };
  if(c.b&&now===c.b&&!d.fd.some(x=>x.meal==="เช้า")) fire("b","🍽️ บันทึกมื้อเช้า","ยังไม่ได้บันทึกมื้อเช้าวันนี้");
  if(c.l&&now===c.l&&!d.fd.some(x=>x.meal==="กลางวัน")) fire("l","🍽️ บันทึกมื้อกลางวัน","กินอะไรไปบ้าง? บันทึกไว้ก่อนลืม");
  if(c.d&&now===c.d&&!d.fd.some(x=>x.meal==="เย็น")) fire("d","🍽️ บันทึกมื้อเย็น",`วันนี้กินไป ${d.kIn} kcal จากเป้า ${S.user.target}`);
  if(c.s&&now===c.s) fire("s","😴 ใกล้เวลานอนแล้ว","เข้านอนตอนนี้จะได้ครบ 7–9 ชม. พรุ่งนี้อย่าลืมบันทึกการนอน");
  if(c.w>0){ const h=+now.split(":")[0], m=+now.split(":")[1];
    /* ช่วงเตือนน้ำต้องเป็นจำนวนเต็มชั่วโมง — ผู้ใช้พิมพ์ทศนิยมมาก็ปัดให้ ไม่ให้เงื่อนไขพัง */
    const wStep=Math.max(1,Math.round(+c.w||0));
    if(m===0 && h>=8 && h<=21 && (h-8)%wStep===0){
      const g=S.water[tday]||0;
      if(g<waterGoal()) fire("w"+h,"💧 ดื่มน้ำหน่อย",`วันนี้ดื่มไป ${g.toLocaleString()} มล. จากเป้า ${waterGoal().toLocaleString()} มล.`);
    }}
},60000);

/* ไฟล์ปฏิทิน (.ics) — เตือนระดับเครื่อง ใช้ได้แม้ไม่เปิดแอป */
el("icsBtn").onclick=()=>{
  const c=notiCfg();
  const evs=[["บันทึกมื้อเช้า 🍽️",c.b||"08:30"],["บันทึกมื้อกลางวัน 🍽️",c.l||"13:00"],
    ["บันทึกมื้อเย็น 🍽️",c.d||"19:30"],["เตรียมเข้านอน 😴",c.s||"22:30"],
    ["ชั่งน้ำหนัก + บันทึกการนอน ⚖️","07:00"]];
  const dt=S.date.replace(/-/g,"");
  let ics="BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//"+APP_NAME+"//TH\r\nCALSCALE:GREGORIAN\r\n";
  evs.forEach((e,i)=>{
    const [h,m]=e[1].split(":");
    ics+="BEGIN:VEVENT\r\nUID:health-"+i+"-"+dt+"@tracker\r\n"+
      "DTSTART;TZID=Asia/Bangkok:"+dt+"T"+h+m+"00\r\n"+
      "DURATION:PT10M\r\nRRULE:FREQ=DAILY\r\n"+
      "SUMMARY:"+e[0]+"\r\nDESCRIPTION:เปิดแอปสุขภาพเพื่อบันทึกข้อมูล\r\n"+
      "BEGIN:VALARM\r\nTRIGGER:PT0M\r\nACTION:DISPLAY\r\nDESCRIPTION:"+e[0]+"\r\nEND:VALARM\r\nEND:VEVENT\r\n";
  });
  ics+="END:VCALENDAR";
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));
  a.download="health-reminders.ics"; a.click();
  setTimeout(()=>alert("ดาวน์โหลดแล้ว ✅\nเปิดไฟล์นี้ในมือถือ → เพิ่มเข้าปฏิทิน จะเตือนทุกวันแม้ไม่ได้เปิดแอป"),300);
};

/* ---------- เตือนสำรองข้อมูล ---------- */
function backupInfo(){
  const last=LS.get("lastBackup");
  const days = last? Math.floor((new Date(today())-new Date(last))/86400000) : null;
  const el2=el("backupWarn");
  if(!el2)return;
  if(GAS_URL){ el2.style.display="none"; return; }   /* เชื่อมชีตแล้ว = มีสำรองอยู่แล้ว */
  /* กล่องเตือน "ยังไม่ได้เชื่อมชีต" พูดเรื่องเดียวกัน — โชว์ทีเดียวพอ ไม่งั้นกินหน้าจอแรกทั้งหน้า */
  if(days===null){ el2.style.display="none"; return; }
  if(days>=14){
    el2.style.display="block";
    el2.innerHTML=`💾 สำรองข้อมูลล่าสุดเมื่อ ${days} วันก่อน — ข้อมูลอยู่ในเครื่องนี้ที่เดียว
      <button class="btn" style="margin-top:9px" onclick="el('expJson').click()">สำรองเดี๋ยวนี้ (10 วินาที)</button>`;
  } else el2.style.display="none";
}
el("expJson").onclick=()=>{
  const data={v:3,exported:S.date,ex:S.ex,food:S.food,wo:S.wo,sleep:S.sleep,body:S.body,
    photo:S.photo,myfood:S.myfood,water:S.water,user:S.user,lt1log:S.lt1log,rd:S.rd};
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}));
  a.download="health-backup-"+S.date+".json"; a.click();
  LS.set("lastBackup",today()); backupInfo();
};
el("impJson").onclick=()=>el("impFile").click();
el("impFile").onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const j=JSON.parse(r.result);
      if(!okRow(j)) throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
      const c=cleanBlob(j);                                  /* ตรวจให้ผ่านก่อน ค่อยแตะข้อมูลจริง */
      const n=countAll(c);
      const lose=[];
      if(arr(S.photo).length>arr(c.photo).length) lose.push("รูป progress "+(arr(S.photo).length-arr(c.photo).length)+" รูป");
      if(Object.keys(S.water).length>Object.keys(c.water).length) lose.push("บันทึกน้ำ "+(Object.keys(S.water).length-Object.keys(c.water).length)+" วัน");
      if(!confirm("กู้คืน "+n+" รายการจากไฟล์นี้?\n\nข้อมูลในเครื่องตอนนี้ ("+countAll(S)+" รายการ) จะถูกแทนที่ทั้งหมด"
        +(lose.length?"\n\n⚠️ จะหายไป: "+lose.join(" · "):"")))return;
      applyClean(c);
      if(!(+j.v>=3)) fixWater();
      saveNow(true); fillUser(); drawZones(); render(); renderWo(); renderBody(); sleepFill();
      alert("กู้คืนเรียบร้อย ✅ ("+n+" รายการ)"+(GAS_URL?"\n\nกดปุ่ม \"โหลดข้อมูลจาก Sheets\" เพื่อส่งขึ้นชีตด้วย":""));
    }catch(err){alert("ไฟล์ไม่ถูกต้อง ❌");}
  };
  r.readAsText(f); e.target.value="";
};
el("expCsv").onclick=()=>{
  const rows=[];
  const push=(t,o,cols)=>{rows.push([t]);rows.push(cols);o.forEach(x=>rows.push(cols.map(c=>x[c]!==undefined?x[c]:"")));rows.push([]);};
  push("EXERCISE",S.ex,["date","type","min","km","hr","hrmax","z1","z2","z3","z4","z5","pct","load","fat","kcal","intensity","note"]);
  push("WORKOUT",arr(S.wo).map(w=>({...w,sets:fixSets(w.sets).map(x=>x[0]+"x"+x[1]).join(" ")})),["date","group","ex","sets","vol","top","e1rm","min","kcal","note"]);
  push("FOOD",S.food,["date","time","meal","name","qty","unit","kcal","protein","carb","fat","fiber","sodium","sat","sugar","alc"]);
  push("SLEEP",S.sleep,["date","bed","wake","hours","awake","rem","core","deep","stageScore","quality","wakeups","note"]);
  push("BODY",S.body,["date","w","fat","waist","chest","arm","thigh","hip","note"]);
  push("MYFOOD",S.myfood,["name","unit","kcal","protein","carb","fat","fiber","sodium","sat","sugar","alc"]);
  push("ZONE2 TESTS",(S.lt1log||[]).map(x=>({date:x.d,hr:x.hr,method:LT1M[+x.m]||""})),["date","hr","method"]);
  push("WATER",Object.entries(S.water).map(([d,g])=>({date:d,ml:g})),["date","ml"]);
  const csv="\uFEFF"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download="health-data-"+S.date+".csv"; a.click();
};

/* ---------- น้ำ ---------- */
let wPend=null;                       // มล. ที่ยังไม่ได้กดบันทึก
function waterGoal(){return Math.max(1500, Math.round(S.user.w*32/100)*100);}   // ~32 มล./กก.
function waterCur(){return wPend!==null? wPend : (S.water[S.date]||0);}
function waterShow(){
  const cur=waterCur(), goal=waterGoal();
  el("wMl").textContent=cur.toLocaleString(); el("wGoal").textContent=goal.toLocaleString();
  el("wBar").style.width=Math.min(100,cur/goal*100)+"%";
  el("wLeft").innerHTML = cur>=goal ? '<span style="color:var(--move)">ครบเป้าแล้ววันนี้ 🎉</span>'
    : `ขาดอีก <b style="color:var(--acc)">${(goal-cur).toLocaleString()}</b> มล. (≈ ${Math.ceil((goal-cur)/250)} แก้ว)`;
  if(document.activeElement!==el("wInput")) el("wInput").value=cur||"";
  el("wDirty").innerHTML = wPend!==null ? '<span style="color:var(--food)">ยังไม่ได้บันทึก — กดปุ่ม "บันทึกน้ำดื่ม" เพื่อยืนยัน</span>' : "";
}
el("wQuick").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;
  wPend=waterCur()+(+c.dataset.a);waterShow();};
el("wMinus").onclick=()=>{const v=waterCur()-250; wPend=v<=40?0:v; waterShow();};
el("wReset").onclick=()=>{wPend=0;waterShow();};
el("wInput").oninput=e=>{const v=Math.max(0,+e.target.value||0); wPend=(v>0&&v<=40)?0:v; waterShow();};
el("wSave").onclick=async()=>{
  if(wPend===null)return;
  const v=wPend; S.water[S.date]=v; wPend=null;
  render(); await api({action:"water",date:S.date,ml:v});
};

/* ---------- ประเมินระยะการนอน (มาตรฐานผู้ใหญ่) ---------- */
const STAGES=[
  ["deep","หลับลึก (Deep)","#4f46e5",13,23,"ฟื้นฟูร่างกาย ซ่อมกล้ามเนื้อ หลั่ง growth hormone"],
  ["core","หลับตื้น (Core)","#818cf8",45,60,"ช่วงยาวที่สุด ใช้เชื่อมความจำและพักร่างกาย"],
  ["rem","REM","#38bdf8",20,25,"ฝัน จัดระเบียบความจำและอารมณ์"],
  ["awake","ตื่นกลางดึก","#f87171",0,8,"ยิ่งน้อยยิ่งดี"]
];
function hm(min){const m=Math.max(0,Math.round(min));return Math.floor(m/60)+" ชม. "+(m%60)+" นาที";}
function effCol(e){return e>=85?"var(--move)":e>=80?"var(--food)":"var(--bad)";}
/* หลับจริง (TST) = REM + Core + Deep · เวลาบนเตียง = TST + ตื่นกลางดึก
   เกณฑ์ % ของแต่ละระยะเป็นเกณฑ์เทียบ "เวลาหลับจริง" ตามมาตรฐาน — ห้ามเอาเวลาตื่นมาหารรวม
   ส่วน "ตื่นกลางดึก" คิดเป็น % ของเวลาบนเตียง (= 100 − ประสิทธิภาพการนอน) */
function sleepEval(sl){
  if(!sl) return null;
  const v={awake:+sl.awake||0,rem:+sl.rem||0,core:+sl.core||0,deep:+sl.deep||0};
  const tst=v.rem+v.core+v.deep;                 // เวลาหลับจริง
  const bed=tst+v.awake;                         // เวลาอยู่บนเตียง
  if(tst<30) return null;                        // ยังไม่ได้กรอกระยะ
  const wk=Math.max(0,Math.round(+sl.wakeups||0));
  const pct={}; STAGES.forEach(([k])=>pct[k]=n1(v[k]/(k==="awake"?bed:tst)*100));
  const grades=STAGES.map(([k,name,c,lo,hi,why])=>{
    const p=pct[k];
    let st,txt;
    if(k==="awake"){ st=p<=hi?"ok":p<=hi*2?"warn":"bad"; txt=st==="ok"?"ดี":st==="warn"?"ค่อนข้างมาก":"ตื่นบ่อยเกินไป"; }
    else if(p<lo){ st=p<lo*0.65?"bad":"warn"; txt="น้อยกว่าเกณฑ์"; }
    else if(p>hi){ st="warn"; txt="มากกว่าเกณฑ์"; }
    else { st="ok"; txt="อยู่ในเกณฑ์"; }
    return {k,name,c,p,lo,hi,st,txt,why,min:v[k],base:k==="awake"?"เวลาบนเตียง":"เวลาหลับจริง"};
  });
  const hrs=n1(tst/60), bedHrs=n1(bed/60);
  const eff=bed? n1(tst/bed*100) : 0;            // ประสิทธิภาพการนอน · เกณฑ์มาตรฐาน ≥ 85%
  let score=grades.reduce((a,g)=>a+(g.st==="ok"?100:g.st==="warn"?60:25),0)/grades.length;
  score = score*0.7 + (hrs>=7&&hrs<=9?100:Math.max(0,100-Math.abs(hrs-8)*18))*0.3;
  const wkPen=Math.min(15,Math.max(0,wk-1)*3);   // ตื่น 0–1 ครั้งถือว่าปกติ · ครั้งที่ 2 ขึ้นไปหักครั้งละ 3
  score=Math.max(0,Math.round(score-wkPen));
  return {v,tot:bed,tst,bed,hrs,bedHrs,eff,wakeups:wk,wkPen,pct,grades,score,
    effTxt: eff>=90?"ดีมาก":eff>=85?"ผ่านเกณฑ์ (≥85%)":eff>=80?"ต่ำกว่าเกณฑ์เล็กน้อย":"ต่ำกว่าเกณฑ์",
    msg: score>=80?"คุณภาพการนอนดีมาก 🎉":score>=65?"คุณภาพพอใช้ ยังพัฒนาได้":score>=45?"คุณภาพไม่ค่อยดี ลองปรับกิจวัตรก่อนนอน":"คุณภาพแย่ ควรจัดการเรื่องการนอนจริงจัง"};
}
/* หัวสรุป: หลับจริง / บนเตียง / ประสิทธิภาพ — ใช้ทั้งหน้านอนและหน้าสรุป */
function sleepHead(ev){
  return `<div class="mini" style="margin-top:5px;line-height:1.75">
    หลับจริง <b style="color:var(--sleep)">${hm(ev.tst)}</b> · อยู่บนเตียง ${hm(ev.bed)}<br>
    ประสิทธิภาพการนอน <b style="color:${effCol(ev.eff)}">${ev.eff}%</b> <span style="color:var(--dim)">· ${ev.effTxt}</span>
    ${ev.wkPen?`<br><span style="color:var(--food)">ตื่นกลางดึก ${ev.wakeups} ครั้ง — หัก ${ev.wkPen} คะแนน</span>`
      :ev.wakeups?`<br>ตื่นกลางดึก ${ev.wakeups} ครั้ง <span style="color:var(--dim)">· อยู่ในเกณฑ์</span>`:""}</div>`;
}
function stageBar(ev){
  return `<div class="stg">${STAGES.map(([k,n,c])=>
    `<i style="background:${c};width:${ev.bed?n1(ev.v[k]/ev.bed*100):0}%"></i>`).join("")}</div>
    <div class="stglg">${STAGES.map(([k,n,c])=>
    `<span><i style="background:${c}"></i>${n} ${Math.round(ev.v[k])} นาที</span>`).join("")}</div>
    <div class="mini" style="margin-top:5px;color:var(--dim)">แถบ = สัดส่วนของเวลาบนเตียง · ตัวเลข % ด้านล่างเทียบกับเวลาหลับจริง</div>`;
}
function stageGrades(ev){
  return ev.grades.map(g=>`<div class="grade"><div>${esc(g.name)}
    <small style="display:block;color:var(--dim);font-size:10.5px">เกณฑ์ ${g.k==="awake"?"ไม่เกิน "+g.hi:g.lo+"–"+g.hi}% ของ${g.base}</small></div>
    <div style="text-align:right"><b style="color:${g.st==="ok"?"var(--move)":g.st==="warn"?"var(--food)":"var(--bad)"}">${g.p}%</b>
    <small style="display:block;color:var(--dim);font-size:10.5px">${Math.round(g.min)} นาที · ${g.txt}</small></div></div>`).join("");
}
/* ชั่วโมง "หลับจริง" ของบันทึกหนึ่งคืน — คำนวณใหม่ทุกครั้งที่แสดงผล
   บันทึกเก่าที่เคยเก็บเวลารวม (นับตอนตื่นกลางดึกด้วย) จึงถูกแก้ให้เอง โดยไม่ต้องแตะข้อมูลเดิมในเครื่องหรือในชีต */
function slHours(sl){
  if(!sl) return 0;
  const tst=(+sl.rem||0)+(+sl.core||0)+(+sl.deep||0);
  if(tst>=30) return n1(tst/60);
  return +sl.hours||0;                           // ไม่มีระยะการนอน → ใช้เวลาเข้านอน–ตื่นที่บันทึกไว้
}
/* ---------- นอน ---------- */
function sCalc(){
  const b=el("sBed").value.split(":"),w=el("sWake").value.split(":");
  let m=(+w[0]*60+ +w[1])-(+b[0]*60+ +b[1]); if(m<=0)m+=1440;
  const h=n1(m/60);
  const box=el("bedBox");
  if(box) box.innerHTML=`อยู่บนเตียง <b style="color:var(--sleep)">${Math.floor(m/60)} ชม. ${m%60} นาที</b>
    <span class="mini">${h<6?"· น้อยไปนะ ควรได้ 7–9 ชม.":h<7?"· เกือบพอ ควรได้ 7–9 ชม.":h<=9?"· อยู่ในเกณฑ์ดี 👍":"· นานกว่าปกติ"}</span>`;
  return h;
}
["sBed","sWake"].forEach(id=>el(id).oninput=sCalc);
el("stageInputs").innerHTML=STAGES.map(([k,name,c])=>`<div class="f" style="border-left:3px solid ${c}">
  <b>${name}</b><div>
  <input type="number" step="any" inputmode="decimal" placeholder="0" id="st_${k}_h"><span>ชม.</span>
  <input type="number" step="any" inputmode="decimal" placeholder="0" id="st_${k}_m"><span>นาที</span></div></div>`).join("");
STAGES.forEach(([k])=>["h","m"].forEach(u=>el("st_"+k+"_"+u).oninput=stPreview));
el("sWakeN").oninput=stPreview;
function stObj(){const o={};STAGES.forEach(([k])=>{o[k]=(+el("st_"+k+"_h").value||0)*60+(+el("st_"+k+"_m").value||0);});
  o.wakeups=Math.max(0,Math.round(+el("sWakeN").value||0)); return o;}
function stPreview(){
  const ev=sleepEval(stObj());
  el("stBox").innerHTML = ev? `<div class="card" style="background:var(--card2);margin:12px 0 0">
    <div style="text-align:center"><b style="font-size:26px;color:${ev.score>=80?"var(--move)":ev.score>=65?"var(--food)":"var(--bad)"}">${ev.score}</b>
    <span class="mini"> / 100</span></div>
    ${sleepHead(ev)}
    ${stageBar(ev)}${stageGrades(ev)}
    <div class="mini" style="margin-top:8px">${ev.msg}</div></div>` : "";
}
/* ดึงบันทึกเดิมของวันนั้นกลับเข้าฟอร์ม — กันเผลอกดบันทึกทับด้วยค่าว่าง */
function sleepFill(){
  const r=arr(S.sleep).find(x=>okRow(x)&&x.date===S.date);
  if(el("sBed")) el("sBed").value = r&&r.bed ? r.bed : "23:00";
  if(el("sWake")) el("sWake").value = r&&r.wake ? r.wake : "06:30";
  tpSyncAll();
  STAGES.forEach(([k])=>{
    const v=r? (+r[k]||0) : 0;
    const h=el("st_"+k+"_h"), m=el("st_"+k+"_m");
    if(h) h.value = v? Math.floor(v/60) : "";
    if(m) m.value = v? v%60 : "";
  });
  if(el("sWakeN")) el("sWakeN").value = r&&+r.wakeups>0 ? Math.round(+r.wakeups) : "";
  if(el("sNote")) el("sNote").value = r&&r.note ? r.note : "";
  sCalc(); stPreview();
  const b=el("sExist");
  if(b) b.innerHTML = r? `<span style="color:var(--move)">✓ วันนี้บันทึกไว้แล้ว</span> — แก้ไขแล้วกดบันทึกอีกครั้งเพื่อทับของเดิม` : "";
}
el("sAdd").onclick=async()=>{
  const st=stObj(), evv=sleepEval(st);
  const old=arr(S.sleep).find(x=>okRow(x)&&x.date===S.date);
  const empty = !evv && !sCalc();
  if(empty) return alert("ยังไม่ได้ใส่เวลานอนหรือระยะการนอนเลยนะครับ");
  const oldEv=sleepEval(old);
  if(oldEv && !evv &&
     !confirm("วันนี้เคยบันทึกระยะการนอนไว้แล้ว (คะแนน "+oldEv.score+")\nบันทึกทับด้วยข้อมูลที่ไม่มีระยะการนอน?")) return;
  const r={date:S.date,bed:el("sBed").value,wake:el("sWake").value,
    hours: evv? evv.hrs : sCalc(),                 /* = เวลาหลับจริง ไม่รวมตอนตื่นกลางดึก */
    quality: evv? Math.max(1,Math.min(5,Math.round(evv.score/20))) : 0,
    wakeups: st.wakeups,
    awake:st.awake,rem:st.rem,core:st.core,deep:st.deep,
    stageScore: evv?evv.score:0, note:el("sNote").value,ts:newTs()};
  S.sleep=arr(S.sleep).filter(x=>okRow(x)&&x.date!==S.date); S.sleep.push(r);
  render(); sleepFill(); saveNow();
  await api({action:"add",sheet:"Sleep",row:r,unique:"date"});
};

/* ---------- ร่างกาย ---------- */
function bodySorted(){return arr(S.body).filter(okDate).sort((a,b)=>a.date<b.date?-1:1);}
function ma7(arr,i){                       // ค่าเฉลี่ยเคลื่อนที่ 7 วัน
  const w=arr.slice(Math.max(0,i-6),i+1).filter(x=>x.w>0);
  return w.length?n1(w.reduce((a,b)=>a+ +b.w,0)/w.length):null;
}
el("bAdd").onclick=async()=>{
  const g=id=>+el(id).value||0;
  if(!g("bW")&&!g("bWaist")) return alert("ใส่น้ำหนักหรือรอบเอวอย่างน้อยอย่างหนึ่งนะ");
  const old=arr(S.body).find(x=>okRow(x)&&x.date===S.date)||{};
  const keep=(id,k)=>g(id)||(+old[k]||0);        /* เว้นว่างไว้ = ใช้ค่าเดิมของวันนั้น ไม่ล้างทิ้ง */
  const r={ts:newTs(),date:S.date,w:keep("bW","w"),fat:keep("bFat","fat"),waist:keep("bWaist","waist"),
    chest:keep("bChest","chest"),arm:keep("bArm","arm"),thigh:keep("bThigh","thigh"),hip:keep("bHip","hip"),
    note:el("bNote").value||old.note||""};
  S.body=arr(S.body).filter(x=>okRow(x)&&x.date!==S.date); S.body.push(r);
  if(r.w){S.user.w=r.w; el("uW").value=r.w; calcTdee(); exCalc();
    api({action:"user",user:userPayload()});}
  renderBody(); render(); saveNow();
  await api({action:"add",sheet:"Body",row:r,unique:"date"});
};
function renderBody(){
  const arr=bodySorted(), last=arr[arr.length-1];
  const t=S.body.find(x=>x.date===S.date)||last||{};
  [["bW","w"],["bFat","fat"],["bWaist","waist"],["bChest","chest"],["bArm","arm"],["bThigh","thigh"],["bHip","hip"]]
    .forEach(([id,k])=>{ if(!el(id).value) el(id).value=t[k]?n1(t[k]):""; });
  renderPhotos();
}
function renderBodyStats(){
  const arr=bodySorted(), cut=shiftDate(S.date,-30);
  const wArr=arr.filter(x=>x.w>0), lastW=wArr[wArr.length-1];
  const trend = wArr.length?ma7(wArr,wArr.length-1):null;
  const old=wArr.filter(x=>x.date<=cut).pop() || wArr[0];
  const d30 = (lastW&&old&&old!==lastW)? n1(lastW.w-old.w) : null;
  const bmi = lastW? n1(lastW.w/Math.pow(S.user.h/100,2)) : null;
  el("bStat").innerHTML = lastW ? `
    <div class="s"><span>น้ำหนักล่าสุด</span><b>${n1(lastW.w)}</b><span>กก. · ${thShort(lastW.date)}</span></div>
    <div class="s"><span>เฉลี่ย 7 วัน (ดูอันนี้)</span><b style="color:var(--acc)">${trend||"-"}</b><span>กก.</span></div>
    <div class="s"><span>เปลี่ยนแปลง ~30 วัน</span><b class="${d30>0?"down":d30<0?"up":"flat"}">${d30!==null?(d30>0?"+":"")+d30:"-"}</b><span>กก.</span></div>
    <div class="s"><span>BMI</span><b>${bmi||"-"}</b><span>${bmi?(bmi<18.5?"ผอม":bmi<23?"ปกติ":bmi<25?"ท้วม":bmi<30?"อ้วน":"อ้วนมาก"):""}</span></div>`
    : `<div class="empty">ยังไม่มีข้อมูล — บันทึกที่แท็บ ⚖️ ร่างกาย</div>`;
  const waistArr=arr.filter(x=>x.waist>0), lw=waistArr[waistArr.length-1];
  if(lw){
    const lim=S.user.sex==="m"?90:80;
    const ok=lw.waist<lim;
    const oldW=waistArr.filter(x=>x.date<=cut).pop()||waistArr[0];
    const dw=n1(lw.waist-oldW.waist);
    el("bWaistBox").innerHTML=`<div class="${ok?"lastbox":"warn"}" style="margin-top:12px">
      รอบเอวล่าสุด <b>${lw.waist}</b> ซม. ${ok?"✅ อยู่ในเกณฑ์":"⚠️ เกินเกณฑ์"} (${S.user.sex==="m"?"ชาย":"หญิง"}เอเชียควรต่ำกว่า ${lim} ซม.)
      ${waistArr.length>1?`<br>เทียบ ~30 วันก่อน: <b>${dw>0?"+":""}${dw}</b> ซม.`:""}</div>`;
  } else el("bWaistBox").innerHTML="";
  drawBodyCharts();
}
function drawBodyCharts(){
  const arr=bodySorted().filter(x=>x.w>0);
  if(arr.length){
    const lbl=arr.map(x=>thShort(x.date));
    mk("c7",{fitY:true,data:{labels:lbl,datasets:[
      {type:"line",label:"เฉลี่ย 7 วัน",data:arr.map((_,i)=>ma7(arr,i)),borderColor:cssv("--acc"),borderWidth:2.5,tension:.3,pointRadius:0},
      {type:"line",label:"ชั่งจริง",data:arr.map(x=>+x.w),borderColor:cssv("--dim"),borderWidth:1,pointRadius:2.5,pointBackgroundColor:cssv("--dim"),tension:.2}
    ]},options:{}});
  }
  const m=bodySorted().filter(x=>x.waist>0||x.chest>0||x.arm>0||x.thigh>0||x.hip>0);
  if(m.length){
    const lbl=m.map(x=>thShort(x.date));
    const ds=[["waist","เอว","#fbbf24"],["chest","อก","#4ade80"],["hip","สะโพก","#818cf8"],["thigh","ต้นขา","#f472b6"],["arm","แขน","#38bdf8"]]
      .filter(([k])=>m.some(x=>x[k]>0))
      .map(([k,n,c])=>({label:n,data:m.map(x=>x[k]>0?+x[k]:null),borderColor:c,tension:.3,pointRadius:2,spanGaps:true}));
    mk("c8",{type:"line",fitY:true,data:{labels:lbl,datasets:ds},options:{}});
  }
}
/* รูป progress — ย่อรูปก่อนเก็บ */
el("phBtn").onclick=()=>el("phFile").click();
el("phFile").onchange=e=>{
  const f=e.target.files[0]; if(!f)return;
  const img=new Image(), rd=new FileReader();
  rd.onload=()=>{img.onload=async()=>{
    const MAX=420, sc=Math.min(1,MAX/Math.max(img.width,img.height));
    const cv=document.createElement("canvas");
    cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    let q=0.6, data=cv.toDataURL("image/jpeg",q);
    while(data.length>44000 && q>0.25){ q-=0.1; data=cv.toDataURL("image/jpeg",q); }
    const r={ts:newTs(),date:S.date,img:data,note:""};
    S.photo.push(r); renderPhotos(); saveNow();
    await api({action:"add",sheet:"Photo",row:r});
  }; img.src=rd.result;};
  rd.readAsDataURL(f); e.target.value="";
};
function renderPhotos(){
  const ph=arr(S.photo).filter(x=>okRow(x)&&x.img).sort((a,b)=>String(a.date)<String(b.date)?-1:1);
  el("phGrid").innerHTML=ph.map(x=>`<div class="ph"><img src="${x.img}">
    <u>${thShort(x.date)}</u><button onclick="delPhoto(${x.ts})">✕</button></div>`).join("");
  el("phCompare").innerHTML = ph.length>=2 ? `<div class="cmp">
    <figure><img src="${ph[0].img}"><figcaption>เริ่มต้น · ${thShort(ph[0].date)}</figcaption></figure>
    <figure><img src="${ph[ph.length-1].img}"><figcaption>ล่าสุด · ${thShort(ph[ph.length-1].date)}</figcaption></figure>
    </div><div class="mini" style="text-align:center">ห่างกัน ${Math.round((new Date(ph[ph.length-1].date)-new Date(ph[0].date))/86400000)} วัน</div>`:"";
}
async function delPhoto(ts){
  if(!confirm("ลบรูปนี้?"))return;
  S.photo=arr(S.photo).filter(x=>x.ts!=ts); renderPhotos(); saveNow();
  await api({action:"del",sheet:"Photo",ts:ts});
}

/* ================= เครื่องมือหา Zone 2 จากความฟิตจริง ================= */
let ltRows=[{hr:"",a:0},{hr:"",a:0},{hr:"",a:0},{hr:"",a:0},{hr:"",a:0}];   // a: 0=ยังไม่ตอบ 1=สบาย 2=เริ่มฝืด 3=ไม่ได้
const LTA=[["😌","พูดสบาย",""],["😮‍💨","เริ่มฝืด","w"],["🥵","พูดไม่ได้","b"]];

function ltDraw(){
  el("ltRows").innerHTML=`<div class="lth"><u></u><span>HR (bpm)</span><span>ตอนพูด 30 วินาที รู้สึกยังไง</span></div>`+
    ltRows.map((r,i)=>`<div class="ltr"><u>${i+1}</u>
      <input type="number" step="any" inputmode="decimal" placeholder="–" value="${r.hr}" data-i="${i}">
      <div class="sw">${LTA.map((a,k)=>`<button data-i="${i}" data-a="${k+1}"
        class="${r.a===k+1?"on "+a[2]:""}">${a[0]}<br>${a[1]}</button>`).join("")}</div></div>`).join("");
  el("ltRows").querySelectorAll("input").forEach(x=>x.oninput=e=>{ltRows[+e.target.dataset.i].hr=e.target.value;});
  el("ltRows").querySelectorAll(".sw button").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i; ltRows[i].a=+b.dataset.a; ltDraw();});
}
el("ltAddRow").onclick=()=>{ltRows.push({hr:"",a:0}); ltDraw();};

el("ltTalkCalc").onclick=()=>{
  const done=ltRows.filter(r=>+r.hr>0 && r.a>0);
  if(done.length<3) return alert("กรอกอย่างน้อย 3 ช่วง (ทั้ง HR และคำตอบ) ก่อนนะครับ");
  const ok=done.filter(r=>r.a===1).map(r=>+r.hr);
  const eq=done.filter(r=>r.a===2).map(r=>+r.hr);
  if(!ok.length) return alert("ยังไม่มีช่วงไหนที่ \"พูดสบาย\" เลย — แปลว่าเริ่มต้นหนักเกินไป\nลองทดสอบใหม่โดยเริ่มจากเบากว่านี้มากๆ ครับ");
  const last=Math.max(...ok);
  const first=eq.length?Math.min(...eq):null;
  /* เพดาน Zone 2 = ช่วงสุดท้ายที่ยังพูดสบาย (ค่าที่ปลอดภัย ไม่เสี่ยงตั้งสูงเกิน) */
  const hr=last;
  const band=Math.max(8,Math.round(hr*0.08));
  el("ltTalkOut").innerHTML=`<div class="res">
    <b class="big2">${hr-band}–${hr} bpm</b>
    <div class="mini" style="margin-top:4px">คือ Zone 2 ของคุณจากการทดสอบนี้ (เพดาน LT1 ≈ <b>${hr}</b> bpm)</div>
    ${first?`<div class="mini" style="margin-top:7px">ช่วงที่เริ่มพูดฝืดคือ ${first} bpm — จุดที่ร่างกายเริ่มเปลี่ยนโหมดอยู่ระหว่าง ${hr}–${first} เราเลือกค่าล่างไว้ให้ เพื่อไม่ให้ซ้อมหนักเกินโดยไม่รู้ตัว</div>`
      :`<div class="mini" style="margin-top:7px">ยังไม่มีช่วงที่ "เริ่มฝืด" — ถ้าอยากได้ค่าที่แม่นขึ้น ลองเพิ่มช่วงที่หนักขึ้นอีกจนพูดเริ่มฝืด แล้วทดสอบใหม่</div>`}
    <button class="btn g" onclick="lt1Save(${hr},1)">ใช้ค่านี้เป็น Zone 2 ของฉัน</button>
  </div>`;
};

el("ltDriftCalc").onclick=()=>{
  const h1=+el("dfH1").value, k1=+el("dfK1").value, h2=+el("dfH2").value, k2=+el("dfK2").value;
  if(!(h1>0&&k1>0&&h2>0&&k2>0)) return alert("กรอกให้ครบทั้ง 4 ช่องก่อนนะครับ");
  const ef1=k1/h1, ef2=k2/h2;
  const dc=Math.round((ef1-ef2)/ef1*1000)/10;          // % decoupling
  const tested=Math.round((h1+h2)/2);
  let hr,txt,col;
  if(dc<5){ hr=tested;
    txt=`ดริฟต์แค่ <b>${dc}%</b> (ต่ำกว่า 5%) — แปลว่า HR ${tested} <b>ยังอยู่ใต้ LT1</b> ✅ ตั้งเป็นเพดาน Zone 2 ได้เลย
      <br><span style="color:var(--dim)">ถ้าอยากรู้เพดานที่แท้จริง ลองทดสอบซ้ำโดยเพิ่มความเร็วอีกนิดจน ดริฟต์เข้าใกล้ 5% นั่นคือขอบบนของ Zone 2 พอดี</span>`;
    col="var(--move)";
  } else if(dc<10){ hr=tested-5;
    txt=`ดริฟต์ <b>${dc}%</b> (5–10%) — HR ${tested} อยู่<b>ใกล้หรือเลย LT1 ไปนิดหน่อย</b> แนะนำตั้งเพดาน Zone 2 ต่ำลงประมาณ 5 ครั้ง
      <br><span style="color:var(--dim)">ถ้าวันที่ทดสอบอากาศร้อน นอนไม่พอ หรือเพิ่งซ้อมหนักมา ค่าดริฟต์จะสูงกว่าปกติได้ ลองทดสอบซ้ำในวันที่สภาพดี</span>`;
    col="var(--food)";
  } else { hr=tested-10;
    txt=`ดริฟต์ <b>${dc}%</b> (เกิน 10%) — HR ${tested} <b>เกิน LT1 ไปแล้วชัดเจน</b> แนะนำตั้งเพดาน Zone 2 ต่ำลงประมาณ 10 ครั้ง แล้วทดสอบซ้ำ
      <br><span style="color:var(--dim)">อีกความหมายคือฐานแอโรบิกยังบางอยู่ — เติมเวลา Zone 2 ให้มากขึ้นก่อนค่อยไปเพิ่มความหนัก</span>`;
    col="var(--bad)";
  }
  const band=Math.max(8,Math.round(hr*0.08));
  el("ltDriftOut").innerHTML=`<div class="res">
    <b class="big2" style="color:${col}">${hr-band}–${hr} bpm</b>
    <div class="mini" style="margin-top:6px">${txt}</div>
    <div class="mini" style="margin-top:7px">ความคุ้มของหัวใจ: ครึ่งแรก ${Math.round(ef1*1000)} · ครึ่งหลัง ${Math.round(ef2*1000)}</div>
    <button class="btn g" onclick="lt1Save(${hr},2)">ใช้ค่านี้เป็น Zone 2 ของฉัน</button>
  </div>`;
};

el("ltManSave").onclick=()=>{
  const hr=+el("ltManHr").value;
  if(!(hr>0)) return alert("ใส่ค่า HR ก่อนนะครับ");
  lt1Save(hr,+el("ltManSrc").value);
};

async function lt1Save(hr,method){
  hr=Math.round(hr);
  if(hr<70||hr>210) return alert("ค่านี้ดูผิดปกติ (ควรอยู่ราว 90–180) ลองเช็กอีกทีนะครับ");
  const hm=hrMax();
  if(hr>hm*0.88 && !confirm(`ค่านี้สูงถึง ${Math.round(hr/hm*100)}% ของ HRmax ซึ่งสูงผิดปกติสำหรับเพดาน Zone 2\n(คนที่ฝึกมาดีมักอยู่ราว 70–85% ของ HRmax)\n\nอาจตั้งสูงเกินจริง จะบันทึกต่อไหม?`)) return;
  if(+S.user.lthr>0 && hr>=+S.user.lthr) return alert("เพดาน Zone 2 ต้องต่ำกว่า LTHR (จุดล้า) ที่ใส่ไว้ครับ");
  S.user.lt1=hr;
  S.user.lt1d=+(S.date.replace(/-/g,""));
  S.user.lt1m=method;
  S.user.zmodel="fit";
  S.lt1log=(S.lt1log||[]).filter(x=>x.d!==S.date);
  S.lt1log.push({d:S.date,hr:hr,m:method});
  saveLocal(); fillUser(); drawZones(); exCalc(); render();
  await api({action:"user",user:userPayload()});
  const [a,b]=zoneBpm(1);
  alert(`บันทึกแล้ว ✅\n\nZone 2 ของคุณคือ ${a}–${b} bpm\nโซนทั้งหมดในแอปคำนวณใหม่จากค่านี้เรียบร้อย`);
}

function lt1Show(){
  const T=zoneTrust(), [a,b]=zoneBpm(1), age=lt1Days();
  el("zTrust").innerHTML=`<div style="display:flex;align-items:center;gap:9px">
    <span style="flex:1">ความแม่นของโซนตอนนี้: <b style="color:${T.score>=80?"var(--move)":T.score>=50?"var(--food)":"var(--bad)"}">${T.lv}</b></span>
    <span class="fb2" style="width:80px;height:7px;background:var(--track);border-radius:6px;overflow:hidden;display:inline-block">
      <i style="display:block;height:100%;width:${T.score}%;background:${T.score>=80?"var(--move)":T.score>=50?"var(--food)":"var(--bad)"}"></i></span></div>
    <div style="margin-top:5px">${T.why}</div>`;

  el("lt1State").innerHTML = lt1()? `<div class="res" style="margin-top:0">
      <div class="mini">Zone 2 ของคุณตอนนี้</div>
      <b class="big2">${a}–${b} bpm</b>
      <div class="mini" style="margin-top:5px">เพดาน LT1 = <b>${lt1()}</b> bpm (${Math.round(lt1()/hrMax()*100)}% ของ HRmax)
        · จาก${LT1M[+S.user.lt1m]||"ค่าที่บันทึกไว้"} เมื่อ ${age===null?"–":age===0?"วันนี้":age+" วันก่อน"}</div>
      ${T.stale?`<div class="mini" style="color:var(--food);margin-top:6px">⏰ ผ่านมา ${age} วันแล้ว — ควรทดสอบใหม่ ความฟิตน่าจะเปลี่ยนไปพอสมควร</div>`:""}
    </div>`
    : `<div class="res" style="margin-top:0">
      <div class="mini">Zone 2 ตอนนี้ (จากสูตร ยังไม่ได้ทดสอบ)</div>
      <b class="big2" style="color:var(--food)">${a}–${b} bpm</b>
      <div class="mini" style="margin-top:5px">ยังไม่เคยทดสอบ — ค่านี้มาจาก${modelName()} ซึ่งเป็นค่าเฉลี่ยของคนทั่วไป</div>
    </div>`;

  const L=arr(S.lt1log).filter(x=>okRow(x)&&x.d).sort((x,y)=>x.d<y.d?1:-1);
  if(L.length){
    const oldest=L[L.length-1], newest=L[0], diff=newest.hr-oldest.hr;
    const wks=Math.round((new Date(newest.d)-new Date(oldest.d))/6048e5);
    el("lt1Hist").innerHTML=`<h2 style="font-size:15px;margin:0 0 6px">📈 ประวัติการทดสอบ</h2>
      ${L.length>1&&wks>0?`<div class="mini" style="margin-bottom:6px">${diff>0
        ?`เพดาน Zone 2 ขึ้นจาก <b>${oldest.hr}</b> → <b style="color:var(--move)">${newest.hr}</b> bpm ใน ${wks} สัปดาห์ — <b>ฟิตขึ้นจริง</b> คุณวิ่งได้เร็วขึ้นโดยยังอยู่ในโซนเดิม 💪`
        :diff<0?`เพดานลดจาก ${oldest.hr} → ${newest.hr} bpm — อาจเป็นช่วงพัก เจ็บป่วย หรือทดสอบในวันที่สภาพไม่ดี`
        :`เพดานเท่าเดิมที่ ${newest.hr} bpm`}</div>`:""}
      ${L.map(x=>`<div class="hrow"><span>${thShort(x.d)} · <span style="color:var(--dim);font-size:12px">${LT1M[+x.m]||"—"}</span></span>
        <b>${x.hr} bpm</b></div>`).join("")}`;
  } else el("lt1Hist").innerHTML="";
}
document.querySelectorAll(".tb[data-lt]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tb[data-lt]").forEach(x=>x.classList.toggle("on",x===b));
  ({talk:"ltTalk",drift:"ltDrift",man:"ltMan"}) && ["talk","drift","man"].forEach(k=>{
    el({talk:"ltTalk",drift:"ltDrift",man:"ltMan"}[k]).style.display = (k===b.dataset.lt)?"block":"none";});
});

/* ---------- ตั้งค่า ---------- */
function fillUser(){
  el("uZm").value=S.user.zmodel||"hrr"; el("uRhr").value=S.user.rhr||"";
  el("uHrmax").value=S.user.hrmax||""; el("uLthr").value=S.user.lthr||"";
  el("uZ2").value=String(z2Goal());
  el("ltManHr").value=lt1()||"";
  lt1Show();
  el("uSex").value=S.user.sex;el("uAge").value=S.user.age;el("uW").value=S.user.w;
  el("uH").value=S.user.h;el("uAct").value=S.user.act;el("uGoal").value=S.user.goal;
  calcTdee();
}
function calcTdee(){
  const u=S.user;
  /* ข้อมูลพัง (เช่นถูกเขียนทับจากชีต/ไฟล์สำรองที่เสีย) → ใช้ค่ากลางแทน
     ดีกว่าปล่อยให้เป้าแคลอรี่กลายเป็น 7 kcal แล้วทั้งหน้าสรุปเพี้ยนตาม */
  const fix=(k,def)=>{const [lo,hi]=PROF[k]; const x=+u[k]; if(!isFinite(x)||x<lo||x>hi) u[k]=def;};
  fix("age",35); fix("w",70); fix("h",170);
  if(!(+u.act>=1&&+u.act<=2.5)) u.act=1.375;
  const bmr = u.sex==="m" ? 10*u.w+6.25*u.h-5*u.age+5 : 10*u.w+6.25*u.h-5*u.age-161;
  u.bmr=Math.round(bmr); u.tdee=Math.round(bmr*u.act);
  u.tdeeUse = (+u.tdeeReal>0) ? Math.round(+u.tdeeReal) : u.tdee;   // ใช้ค่าจริงถ้ามี
  u.target=u.tdeeUse+ (+u.goal);
  /* โปรตีนต่อน้ำหนักตัว — ยิ่งกินขาดแคลอรี่ยิ่งต้องการมากขึ้นเพื่อรักษากล้ามเนื้อ
     (ISSN 2017 / Helms 2014: ช่วงลดน้ำหนัก 1.8–2.7 ก./กก., รักษา 1.4–1.8) */
  u.pkg = (+u.goal<=-250) ? 2.0 : (+u.goal>0 ? 1.8 : 1.6);
  u.pGoal=Math.round(u.w*u.pkg); u.cGoal=Math.round(u.target*0.45/4); u.fGoal=Math.round(u.target*0.28/9);
  u.fibGoal=Math.round(u.target/1000*14);
  u.satGoal=Math.round(u.target*0.10/9);
  u.sugGoal=Math.round(u.target*0.10/4); u.sugIdeal=Math.round(u.target*0.05/4);   // ไขมันอิ่มตัวไม่เกิน 10% ของพลังงาน   // 14 ก. ต่อ 1000 kcal (คำแนะนำสากล)
  const bmi=n1(u.w/Math.pow(u.h/100,2));
  const rate=+u.goal? n1(Math.abs(+u.goal)*7/7700) : 0;   /* 7,700 kcal ≈ ไขมัน 1 กก. */
  el("tdee").innerHTML=`<div class="lastbox" data-nofold>
    🎯 กินได้วันละ <b style="color:var(--food);font-size:18px">${u.target.toLocaleString()}</b> kcal
    · โปรตีน <b>${u.pGoal}</b> ก. (${u.pkg} ก./กก.)
    ${+u.goal?`<br><span style="font-size:12px">${+u.goal<0?"ลด":"เพิ่ม"}ประมาณ <b>${rate}</b> กก./สัปดาห์ ถ้าทำได้สม่ำเสมอ</span>`:""}
  </div>
  <details class="fold" data-fold="tdeedoc"><summary>ตัวเลขนี้มาจากไหน</summary><div class="foldc"><div class="hint" data-nofold>
    <b>BMR ${u.bmr.toLocaleString()} kcal</b> — พลังงานที่ร่างกายใช้ตอนนอนเฉย ๆ ทั้งวัน คำนวณด้วยสูตร Mifflin-St Jeor
    จากเพศ/อายุ ${u.age} ปี/ส่วนสูง ${u.h} ซม./น้ำหนัก ${u.w} กก. (น้ำหนักดึงมาจากหน้าร่างกายอัตโนมัติ)<br><br>
    <b>TDEE ${u.tdee.toLocaleString()} kcal</b> — BMR × ${u.act} ตามระดับกิจกรรมที่เลือกไว้
    ${+u.tdeeReal>0?`<br><b>ใช้ค่าจริง ${u.tdeeUse.toLocaleString()} kcal</b> ที่คำนวณย้อนหลังจากน้ำหนักกับที่กินจริง — แม่นกว่าสูตร`:""}<br><br>
    <b>เป้าหมาย ${u.target.toLocaleString()} kcal</b> = ${u.tdeeUse.toLocaleString()} ${+u.goal<0?"−":"+"} ${Math.abs(+u.goal)}<br><br>
    การออกกำลังที่บันทึกไว้จะถูก<b>บวกเพิ่ม</b>ให้ในหน้าสรุปอีกที ไม่ได้รวมอยู่ในตัวคูณกิจกรรมนี้ — จะได้ไม่นับซ้ำ<br><br>
    BMI <b>${bmi}</b> (${bmi<18.5?"ผอม":bmi<23?"ปกติ":bmi<25?"ท้วม":bmi<30?"อ้วน":"อ้วนมาก"})
  </div></div></details>`;
}
el("uZsave").onclick=async()=>{
  S.user.zmodel=el("uZm").value; S.user.rhr=+el("uRhr").value||0;
  S.user.hrmax=+el("uHrmax").value||0; S.user.lthr=+el("uLthr").value||0;
  S.user.z2goal=+el("uZ2").value||150;
  if(S.user.zmodel==="lthr" && !S.user.lthr) return alert("ต้องใส่ค่า LTHR ก่อนถึงจะใช้โมเดลนี้ได้");
  if(S.user.zmodel==="hrr" && !S.user.rhr) return alert("ต้องใส่ชีพจรขณะพักก่อนถึงจะใช้ Karvonen ได้");
  if(S.user.zmodel==="fit" && !lt1()) return alert("โหมดนี้ต้องทดสอบหาเพดาน Zone 2 ของตัวเองก่อนครับ\n\nไปที่แท็บ 🏃 ออกกำลัง → เลื่อนลงล่างสุด → การ์ด \"🎯 หา Zone 2 จากความฟิตจริงของคุณ\"");
  drawZones(); exCalc(); render();
  await api({action:"user",user:userPayload()});
  alert("บันทึกแล้ว ✅ โซนหัวใจคำนวณใหม่เรียบร้อย");
};
/* ช่วงที่เป็นไปได้จริงของมนุษย์ — กันกรอกว่าง/พิมพ์ผิด แล้วเป้าแคลอรี่กลายเป็นเลขไร้สาระ */
const PROF={age:[10,100,"อายุ","ปี"], w:[25,300,"น้ำหนัก","กก."], h:[100,250,"ส่วนสูง","ซม."]};
function profErr(v){
  for(const k of ["age","w","h"]){
    const [lo,hi,name,unit]=PROF[k];
    const x=+v[k];
    if(!isFinite(x)||x<lo||x>hi) return `${name}ต้องอยู่ระหว่าง ${lo}–${hi} ${unit} (ใส่มา ${v[k]===""||!isFinite(x)?"ว่าง":v[k]})`;
  }
  return "";
}
el("uSave").onclick=async()=>{
  const nv={sex:el("uSex").value,age:+el("uAge").value,w:+el("uW").value,
            h:+el("uH").value,act:+el("uAct").value,goal:+el("uGoal").value};
  const err=profErr(nv);
  if(err){ alert("บันทึกไม่ได้ ❌\n\n"+err+"\n\nค่าเดิมยังอยู่เหมือนเดิม ไม่ได้ถูกแก้"); return; }
  Object.assign(S.user,nv);
  calcTdee();drawZones();exCalc();render();
  await api({action:"user",user:userPayload()});
  alert("บันทึกแล้ว ✅");
};
el("gasSave").onclick=async()=>{
  GAS_URL=el("gasUrl").value.trim(); PIN=el("gasPin").value.trim();
  if(!GAS_URL)return;
  setStatus("กำลังทดสอบ...");
  const j=await api({action:"ping"});
  if(j&&j.ok){ LS.set("gas",GAS_URL); LS.set("pin",PIN); quickShow(); alert("เชื่อมต่อสำเร็จ ✅ เครื่องนี้จำไว้แล้ว"); loadAll(); }
  else if(j&&j.error) alert("เชื่อมต่อได้ แต่ "+j.error+" ❌\nตรวจว่า PIN ตรงกับที่ตั้งไว้ใน Code.gs");
  else alert("ต่อไม่ได้ ❌ ตรวจว่า:\n1) ลิงก์ลงท้ายด้วย /exec\n2) Deploy แบบ Anyone (ทุกคน)");
};
function quickLink(){
  if(!GAS_URL)return "";
  const payload=btoa(unescape(encodeURIComponent(JSON.stringify({u:GAS_URL,p:PIN}))));
  return location.origin+location.pathname+"#s="+payload;
}
function quickShow(){
  el("quickWrap").style.display = GAS_URL? "block":"none";
  const t=el("tplState");
  if(t) t.innerHTML = TEMPLATE_URL
    ? '<span style="color:var(--move)">ตั้งค่าไว้แล้ว ✅</span>'
    : '<span style="color:var(--food)">ยังไม่ได้ตั้ง — หน้าต้อนรับจะให้ผู้รับก็อปโค้ดเองแทน</span>';
}
el("quickCopy").onclick=()=>{
  const L=quickLink(); if(!L)return;
  navigator.clipboard.writeText(L).then(()=>{el("quickMsg").innerHTML='<span style="color:var(--move)">คัดลอกแล้ว ✅ ส่งลิงก์นี้เข้า LINE ตัวเอง แล้วเปิดบนมือถือ</span>';})
  .catch(()=>{el("quickMsg").innerHTML='<span style="word-break:break-all">'+esc(L)+'</span>';});
};
el("gasClear").onclick=()=>{
  if(!confirm("ลบลิงก์และ PIN ออกจากเครื่องนี้? (ข้อมูลใน Google Sheets ไม่หาย)"))return;
  LS.set("gas",""); LS.set("pin",""); GAS_URL=""; PIN="";
  el("gasUrl").value=""; el("gasPin").value=""; location.reload();
};

/* ---------- แสดงผล ---------- */
let _ddc={};
let _first=null;                       /* วันแรกที่มีบันทึก — ล้างพร้อมกับแคชวัน */
/* ดัชนีแยกตามวัน — เดิม dayData() ไล่อ่านรายการทั้งหมดทุกครั้ง พอมีข้อมูลเป็นปี
   หน้าสถิติที่เรียก 365 วันจึงวนเป็นแสนรอบ ทำให้มือถือค้าง */
let _dix=null;
const _EMPTY=Object.freeze([]);
function clearDD(){_ddc={}; _first=null; _dix=null;}
function dixMake(list){
  const m=new Map();
  arr(list).forEach(x=>{
    if(!okRow(x)) return;
    const k=x.date; let a=m.get(k);
    if(!a) m.set(k,a=[]);
    a.push(x);
  });
  return m;
}
function dix(){
  if(_dix) return _dix;
  return _dix={ex:dixMake(S.ex), food:dixMake(S.food), sleep:dixMake(S.sleep), wo:dixMake(S.wo)};
}
/* ---------- โหลดของการเล่นเวท ----------
   สเกล "โหลด" ของแอปนี้คือ Edwards TRIMP = นาที × เลขโซน (Z1=1 … Z5=5)
   เช่น เดินเร็วโซน 2 สามสิบนาที = 60 ซึ่งเป็นเป้าหมายต่อวันพอดี

   ของเดิมคิดเวทเป็น "จำนวนเซ็ต × 2.5" ซึ่งเทียบกันไม่ได้เลยกับคาร์ดิโอ
   เล่นเวทหนัก 20 เซ็ตได้แค่ 50 → ต่ำกว่าเป้า 60 ทั้งที่เหนื่อยกว่าเดินเร็วครึ่งชั่วโมงมาก
   นี่คือสาเหตุที่วันรุ่งขึ้นระบบขึ้นว่า "เมื่อวานเบา" ทั้งที่ซ้อมหนัก

   สูตรใหม่แบ่งเป็นสองส่วนตามที่ร่างกายรับจริง
   1) เซ็ต × 3   — ปริมาณงานของกล้ามเนื้อ งานวิจัยฝั่งสร้างกล้าม (Schoenfeld 2017)
                   ใช้ "จำนวนเซ็ตที่ทำหนักจริง" เป็นหน่วยวัดปริมาณมาตรฐาน
   2) นาที × 0.8 — ค่าใช้จ่ายทางหัวใจของทั้งเซสชัน ชีพจรเฉลี่ยตอนเล่นเวทรวมพัก
                   อยู่ราวโซน 1–2 จึงให้น้ำหนักต่ำกว่าคาร์ดิโอชัดเจน
   ผลลัพธ์: เวท 18–20 เซ็ต 60 นาที ≈ 100–110 ใกล้เคียงปั่นโซน 2 หนึ่งชั่วโมง (120) — เทียบกันได้แล้ว

   ไม่ได้จับเวลา → ประมาณเซ็ตละ 3 นาทีรวมเวลาพัก
   จับเวลาไว้ยาวผิดปกติ (คุยเล่น/พักนาน) → ตัดเพดานที่เซ็ตละ 5 นาที กันโหลดพองลม */
function woLoad(w){
  const sets=Array.isArray(w&&w.sets)? w.sets.length : 0;
  if(!sets) return 0;
  const min=+w.min>0 ? Math.min(+w.min, sets*5) : sets*3;
  return sets*3 + min*0.8;
}
function dayData(d){
  if(_ddc[d]) return _ddc[d];
  const ix=dix();
  const ex=ix.ex.get(d)||_EMPTY, fd=ix.food.get(d)||_EMPTY;
  const sl=(ix.sleep.get(d)||_EMPTY)[0];
  const wo=ix.wo.get(d)||_EMPTY;
  const kOut=ex.reduce((a,b)=>a+(+b.kcal||0),0)+wo.reduce((a,b)=>a+(+b.kcal||0),0),
        min=ex.reduce((a,b)=>a+(+b.min||0),0)+wo.reduce((a,b)=>a+(+b.min||0),0);
  const kIn=fd.reduce((a,b)=>a+(+b.kcal||0),0);
  const pr=fd.reduce((a,b)=>a+(+b.protein||0),0), cb=fd.reduce((a,b)=>a+(+b.carb||0),0), ft=fd.reduce((a,b)=>a+(+b.fat||0),0);
  /* สารอาหารรายตัวคิดที่ nutRow() ที่เดียว — ยอดรวมของวันจึงตรงกับบรรทัดในรายการมื้อเสมอ
     โพแทสเซียมเก็บในชีตไม่ได้ (คอลัมน์ชีตคงที่) จึงคำนวณใหม่ตอนแสดงผลทุกครั้ง */
  const N=fd.map(nutRow);
  const sum=k=>N.reduce((a,x)=>a+x[k],0);
  const fb=sum("fiber"), na=sum("sodium"), sat=sum("sat"), sug=sum("sugar"), alc=sum("alc");
  const kk={mg:sum("pot"), lab:N.filter(x=>x.potLab).length};
  const vol=wo.reduce((a,b)=>a+(+b.vol||0),0);
  const load=ex.reduce((a,b)=>a+(+b.load|| (+b.min||0)*2 ),0)
           + wo.reduce((a,b)=>a+woLoad(b),0);
  return _ddc[d]={key:d,ex,fd,sl,wo,vol,load,kOut,min,kIn,pr,cb,ft,fb,na,sat,sug,alc,
                  pot:Math.round(kk.mg), potLab:kk.lab, hours:slHours(sl)};
}
/* คำแนะนำจากการเล่นเวท */
function woAdvice(list){
  list=arr(list).filter(w=>okRow(w)&&Array.isArray(w.sets));
  const out=[];
  list.forEach(w=>{
    const reps=w.sets.map(x=>+x[1]||0), wt=Math.max(...w.sets.map(x=>+x[0]||0));
    const avgRep=reps.reduce((a,b)=>a+b,0)/reps.length;
    if(wt>0 && reps.every(r=>r>=15))
      out.push(["⬆️",`<b>${esc(w.ex)}</b> ทำ 15+ ครั้งทุกเซ็ต — น้ำหนักเบาไปสำหรับสร้างกล้าม ลองเพิ่ม 5–10% แล้วคุมให้อยู่ 8–12 ครั้ง`]);
    else if(wt>0 && avgRep<=4)
      out.push(["🏋️",`<b>${esc(w.ex)}</b> ช่วง 1–4 ครั้ง = เน้นความแข็งแรงสูงสุด ถ้าเป้าคือขนาดกล้าม ให้เพิ่มเซ็ตที่ 6–12 ครั้งด้วย`]);
    // ค้างที่เดิม
    const hist=S.wo.filter(x=>x.ex===w.ex&&x.ts!==w.ts).sort((a,b)=>a.date<b.date?-1:1).slice(-2);
    if(hist.length===2 && hist.every(h=>h.top===w.top && Math.abs(h.vol-w.vol)<w.vol*0.05))
      out.push(["🔁",`<b>${esc(w.ex)}</b> ค้างที่ ${w.top} กก. มา 3 ครั้งติด — ลองเพิ่มน้ำหนักเล็กน้อย เพิ่มอีก 1 เซ็ต หรือทำช้าลงตอนลด`]);
  });
  const grp={}; list.forEach(w=>grp[w.group]=(grp[w.group]||0)+w.sets.length);
  Object.entries(grp).forEach(([g,n])=>{
    if(n<6) out.push(["📉",`กลุ่ม <b>${esc(g)}</b> วันนี้ ${n} เซ็ต — งานวิจัยแนะนำ 10–20 เซ็ต/สัปดาห์ต่อกลุ่ม ถ้าเล่นกลุ่มนี้สัปดาห์ละครั้งอาจยังน้อยไป`]);
  });
  return out.slice(0,4);
}
function weekAnalysis(){
  const days=period(S.date,7);
  let mod=0, vig=0, woSess=0, cardioSess=0, rest=0, z2=0;
  days.forEach(d=>{
    let has=false;
    d.ex.forEach(x=>{
      has=true; cardioSess++;
      const v=(+x.z4||0)+(+x.z5||0), m2=(+x.z2||0)+(+x.z3||0);
      if(v||m2){ vig+=v; mod+=m2; z2+=(+x.z2||0); }
      else { const p=+x.pct||0; if(p>=85) vig+=+x.min||0; else if(p>=60) mod+=+x.min||0; }
    });
    if(d.wo.length){has=true;woSess++;}
    if(!has) rest++;
  });
  const out=[];
  const modEq = mod + vig*2;                    // 1 นาทีหนัก ≈ 2 นาทีปานกลาง (เกณฑ์ WHO)
  if(modEq>=150) out.push(["✅",`คาร์ดิโอสัปดาห์นี้ <b>${mod} นาทีปานกลาง + ${vig} นาทีหนัก</b> = เทียบเท่า ${Math.round(modEq)} นาที ผ่านเกณฑ์ WHO (150–300 นาที/สัปดาห์) แล้ว`]);
  else out.push(["🏃",`คาร์ดิโอยัง<b>เบาไป</b> — ได้เทียบเท่า ${Math.round(modEq)}/150 นาที ขาดอีก <b>${Math.round(150-modEq)}</b> นาทีปานกลาง (หรือ ${Math.ceil((150-modEq)/2)} นาทีแบบหนัก)`]);
  if(vig===0 && mod>0) out.push(["⚡",`สัปดาห์นี้ยังไม่มีช่วงหนักเลย (Z4–Z5) — เติมสัก 1 ครั้ง 10–20 นาทีแบบสลับเร็ว-ช้า จะดัน VO2max ขึ้นได้เร็วกว่าคาร์ดิโอเบาอย่างเดียว`]);
  else if(vig>60) out.push(["⚠️",`ช่วงหนัก (Z4–Z5) รวม ${vig} นาที ถือว่าเยอะ — ส่วนใหญ่แนะนำ 20–40 นาที/สัปดาห์ ที่เหลือควรเป็น Zone 2 เพื่อให้ฟื้นตัวทัน`]);
  {const P=polar(7);
   if(P.tot>=30) out.push(["🫀",`การกระจายความหนัก: เบา <b>${P.pLow}%</b> · กลาง <b>${P.pMid}%</b> · หนัก <b>${P.pHigh}%</b> — ${polarVerdict(P)[2]}`]);}
  if(woSess<2) out.push(["🏋️",`เล่นเวท <b>${woSess} ครั้ง</b>/สัปดาห์ — คำแนะนำคือ 2–3 ครั้ง เพื่อรักษามวลกล้ามเนื้อ โดยเฉพาะตอนกำลังลดน้ำหนัก`]);
  else out.push(["✅",`เล่นเวท <b>${woSess} ครั้ง</b>/สัปดาห์ อยู่ในเกณฑ์ที่แนะนำ (2–3 ครั้ง)`]);
  if(rest===0) out.push(["😮‍💨",`7 วันนี้ไม่มีวันพักเลย — ร่างกายสร้างกล้ามเนื้อตอนพัก ควรมีวันพักจริงๆ 1–2 วัน/สัปดาห์`]);
  return out;
}
/* ================= Zone 2 & 80/20 (Polarized Training) =================
   อ้างอิงหลัก:
   • Seiler — โมเดล 3 โซน แบ่งด้วย LT1 (จุดแลคเตตขึ้นครั้งแรก) และ LT2 (จุดล้า)
     นักกีฬาความอดทนระดับโลกซ้อม "ต่ำกว่า LT1" ราว 75–80% ของเวลา
     และ "เหนือ LT2" ราว 15–20% โดยเลี่ยงโซนกลาง (grey zone) ให้เหลือ ~5%
   • San Millán — Zone 2 = หนักที่สุดเท่าที่แลคเตตยังอยู่ 1.5–2.0 mmol/L
     ตรงกับ ~65–75% HRmax และ "พูดเป็นประโยคเต็มได้โดยไม่หอบ"
   • Stöggl & Sperlich 2014 (RCT) — กลุ่ม polarized ดัน VO2max ได้มากที่สุด
   • ปริมาณ: 3–5 ชม./สัปดาห์คือระดับที่เห็นการปรับตัวของไมโทคอนเดรียชัดในคนทั่วไป
     เซสชันควรยาว 45–60 นาทีขึ้นไป (ต่ำกว่านั้นถือว่า "รักษาระดับ" มากกว่า "พัฒนา")  */

function z2Goal(){const g=+S.user.z2goal; return g>0?g:150;}

/* จัดประเภทเซสชันแบบ Seiler — ดูเจตนาหลักของเซสชัน ไม่ใช่นับนาทีดิบ */
function sessClass(z,pct){
  const tot=z.reduce((a,b)=>a+b,0), hard=z[3]+z[4], grey=z[2];
  if(tot>0){
    if(hard>=5 || hard>=tot*0.15) return "high";
    if(grey>=10 || grey>=tot*0.35) return "mid";
    return "low";
  }
  return pct>=85?"high":pct>=75?"mid":"low";
}

function polar(nDays){
  const days=period(S.date,nDays||7);
  let low=0, mid=0, high=0, est=0;
  const zt=[0,0,0,0,0], sess=[];
  days.forEach(d=>d.ex.forEach(x=>{
    const z=[1,2,3,4,5].map(i=>+x["z"+i]||0);
    const t=z.reduce((a,b)=>a+b,0), min=+x.min||0, pct=+x.pct||0;
    let L,M,H,z2;
    if(t>0){ L=z[0]+z[1]; M=z[2]; H=z[3]+z[4]; z2=z[1]; z.forEach((v,i)=>zt[i]+=v); }
    else {                                   // ไม่ได้แยกโซน → ประมาณจาก %HRmax เฉลี่ย
      const gi = pct>=90?4:pct>=80?3:pct>=70?2:pct>=60?1:0;
      zt[gi]+=min; est+=min;
      L=gi<=1?min:0; M=gi===2?min:0; H=gi>=3?min:0; z2=gi===1?min:0;
    }
    low+=L; mid+=M; high+=H;
    sess.push({date:d.key,type:x.type||"คาร์ดิโอ",min,z2,L,M,H,
      km:+x.km||0, hr:+x.hr||0, cls:sessClass(z,pct)});
  }));
  const tot=low+mid+high, pc=v=>tot?Math.round(v/tot*100):0;
  const sTot=sess.length;
  const cnt=c=>sess.filter(s=>s.cls===c).length;
  const z2S=sess.filter(s=>s.z2>=20);
  const goal=z2Goal()*((nDays||7)/7);
  return {n:nDays||7, low,mid,high,tot, pLow:pc(low), pMid:pc(mid), pHigh:pc(high),
    zt, est, sess, sTot, sLow:cnt("low"), sMid:cnt("mid"), sHigh:cnt("high"),
    sPLow: sTot?Math.round(cnt("low")/sTot*100):0,
    sPMid: sTot?Math.round(cnt("mid")/sTot*100):0,
    sPHigh: sTot?Math.round(cnt("high")/sTot*100):0,
    z2Min: zt[1], z2Sess: z2S.length,
    z2Full: sess.filter(s=>s.z2>=45).length,
    z2Long: sess.reduce((a,s)=>Math.max(a,s.z2),0),
    z2Avg: z2S.length?Math.round(zt[1]/z2S.length):0,
    goal: Math.round(goal), pGoal: goal? Math.round(zt[1]/goal*100):0};
}

function polarVerdict(P){
  if(P.tot<30) return ["📋","ข้อมูลยังน้อย",
    `บันทึกคาร์ดิโอพร้อมเวลาแยกโซนอีกสัก 2–3 ครั้ง แล้วระบบจะประเมินการกระจายความหนักให้`,"var(--dim)"];
  if(P.pMid>=25) return ["⚠️","ติดโซนกลางมากไป",
    `อยู่ Z3 ถึง ${P.pMid}% — โซนนี้เรียกว่า <b>grey zone</b> คือเหนื่อยพอตัวแต่ได้ผลกลางๆ ทั้งสองทาง ควรเหลือแค่ ~5% ลองดึงวันเบาให้เบาลงจริงๆ แล้วเก็บแรงไปดันวันหนักให้หนักจริง`,"var(--bad)"];
  if(P.pHigh<5) return ["⚡","ขาดของหนัก",
    `เบา ${P.pLow}% แต่ช่วงหนัก (Z4–Z5) มีแค่ ${P.pHigh}% — โมเดล 80/20 ต้องการของหนักราว 20% เติมอินเทอร์วัลสัก 1 ครั้ง/สัปดาห์ เช่น 5 เที่ยว × 3 นาที พัก 3 นาที`,"var(--food)"];
  if(P.pLow<70) return ["🔥","หนักเกินไป",
    `เบาแค่ ${P.pLow}% (ควรราว 80%) — ซ้อมหนักบ่อยเกินทำให้ฟื้นตัวไม่ทันและพัฒนาการหยุดนิ่ง ลองเปลี่ยน 1–2 วันเป็น Zone 2 ล้วน`,"var(--bad)"];
  if(P.pHigh>30) return ["🔥","สัดส่วนหนักเยอะ",
    `หนัก ${P.pHigh}% (เกิน 20–25%) — ระยะสั้นจะรู้สึกฟิตเร็ว แต่ระยะยาวเสี่ยงล้าสะสมและเจ็บ`,"var(--food)"];
  return ["✅","สัดส่วนกำลังดี",
    `เบา ${P.pLow}% · กลาง ${P.pMid}% · หนัก ${P.pHigh}% — ใกล้เคียงโมเดล 80/20 ที่นักกีฬาความอดทนระดับโลกใช้กัน`,"var(--move)"];
}

/* ความคุ้มของหัวใจ (Efficiency) — ความเร็วที่ทำได้ต่อการเต้น 1 ครั้ง
   ยิ่งสูงขึ้นแปลว่าฟิตขึ้น: วิ่งเร็วเท่าเดิมโดยหัวใจเต้นน้อยลง          */
function z2Eff(){
  const pick=(end,n)=>{
    const a=[];
    period(end,n).forEach(d=>d.ex.forEach(x=>{
      const z=[1,2,3,4,5].map(i=>+x["z"+i]||0);
      const km=+x.km||0, min=+x.min||0, hr=+x.hr||0;
      if(km>0&&min>0&&hr>0&&sessClass(z,+x.pct||0)==="low") a.push((km/(min/60))/hr*1000);
    }));
    return a;
  };
  const now=pick(S.date,28), prev=pick(shiftDate(S.date,-28),28);
  if(now.length<2) return null;
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const A=avg(now), B=prev.length>=2?avg(prev):null;
  return {now:n1(A), prev:B?n1(B):null, n:now.length, pct: B?Math.round((A-B)/B*100):null};
}

/* เวอร์ชันย่อสำหรับหน้าสรุป — เอาแค่ "สรุปว่าออก Zone 2 ไปเท่าไหร่" */
function polarMini(P){
  const V=polarVerdict(P), [zlo,zhi]=zoneBpm(1), g=z2Goal();
  const pg=g?Math.round(P.z2Min/g*100):0;
  const seg=(p,c,lb)=> p>=17?`<span style="background:${c};width:${p}%">${lb} ${p}%</span>`
                     : p>0?`<span style="background:${c};width:${p}%"></span>`:"";
  return `
  <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px;gap:8px">
    <span>Zone 2 สัปดาห์นี้ <span style="color:var(--dim);font-size:12px">(${zlo}–${zhi} bpm)</span></span>
    <b style="color:${pg>=100?"var(--move)":"var(--food)"};white-space:nowrap">${P.z2Min} / ${g} นาที</b>
  </div>
  <div class="bar" style="height:10px;margin-top:7px"><i style="background:${pg>=100?"var(--move)":"var(--acc)"};width:${Math.min(100,pg)}%"></i></div>
  <div class="remain">${P.z2Min>=g?`<b style="color:var(--move)">ถึงเป้า Zone 2 แล้ว</b> ✅`
    :`ขาดอีก <b style="color:var(--food)">${g-P.z2Min}</b> นาที ≈ ${Math.ceil((g-P.z2Min)/45)} เซสชัน`}
    · เต็มโดส (≥45 น.) ${P.z2Full} ครั้ง</div>
  ${P.tot?`<div class="polwrap" style="margin-bottom:4px">
    <div class="poltk" style="left:80%"><b>เป้า 80%</b></div>
    <div class="polbar">${seg(P.pLow,"#4ade80","เบา")}${seg(P.pMid,"#fbbf24","กลาง")}${seg(P.pHigh,"#f87171","หนัก")}</div>
  </div>
  <div class="mini">${V[0]} <b>${V[1]}</b> — เบา ${P.pLow}% · กลาง ${P.pMid}% · หนัก ${P.pHigh}%
    <br>ดูรายละเอียด วิธีทดสอบ และคำอธิบายทั้งหมดได้ที่แท็บ <b>🏃 ออกกำลัง</b></div>`
  :`<div class="mini">ยังไม่มีคาร์ดิโอในสัปดาห์นี้ — ดูวิธีเริ่ม Zone 2 ได้ที่แท็บ <b>🏃 ออกกำลัง</b></div>`}`;
}
/* บล็อก HTML ของ Zone 2 + 80/20 (ใช้ทั้งหน้าออกกำลังและหน้าสถิติ) */
function polarHTML(P,full,keyid){
  const V=polarVerdict(P);
  const [zlo,zhi]=zoneBpm(1);
  const eff=full?z2Eff():null;
  const seg=(p,c,lb)=> p>=17?`<span style="background:${c};width:${p}%">${lb} ${p}%</span>`
                     : p>0?`<span style="background:${c};width:${p}%"></span>`:"";
  /* ช่วงยาวกว่า 1 สัปดาห์ → เทียบเป็น "เฉลี่ยต่อสัปดาห์" จะอ่านง่ายกว่าตัวเลขสะสมดิบ */
  const wk = P.n/7, gw = z2Goal();
  const shown = wk>1.2 ? Math.round(P.z2Min/wk) : P.z2Min;
  const goal  = wk>1.2 ? gw : P.goal;
  const pg = goal? Math.round(shown/goal*100) : 0;
  return `
  <div class="z2r">
    <em>🫀</em>
    <div><b style="color:var(--move)">${zlo}–${zhi} <span style="font-size:13px;font-weight:400;color:var(--dim)">bpm</span></b>
      <small>คือ Zone 2 ของคุณ — เช็กระหว่างวิ่งด้วย <b>talk test</b>: พูดเป็นประโยคเต็มได้โดยไม่ต้องหยุดหายใจกลางประโยค ถ้าพูดได้แค่คำสั้นๆ แปลว่าเกินโซนไปแล้ว</small></div>
  </div>
  ${(()=>{const T=zoneTrust();
    if(zModel()==="fit"&&!T.stale) return `<div class="mini" style="margin-top:7px">🎯 ค่านี้มาจาก<b>การทดสอบของคุณเอง</b> (${LT1M[+S.user.lt1m]||"ค่าที่วัดไว้"} เมื่อ ${lt1Days()===0?"วันนี้":lt1Days()+" วันก่อน"}) ไม่ใช่สูตรอายุ</div>`;
    if(zModel()==="fit"&&T.stale) return `<div class="mini" style="margin-top:7px">⏰ ทดสอบครั้งล่าสุดผ่านมา <b>${lt1Days()} วัน</b> — พอฟิตขึ้นเพดาน Zone 2 จะขยับสูงขึ้น ควรทดสอบใหม่${full?"ด้านล่าง":"ที่แท็บ 🏃 ออกกำลัง"} ไม่งั้นจะซ้อมเบากว่าที่ควร</div>`;
    return `<div class="mini" style="margin-top:7px">⚠️ ค่านี้มาจาก<b>สูตรกลาง</b> (${modelName()}) ยังไม่ใช่ของคุณจริงๆ — งานวิจัยพบว่าจุด LT1 ของแต่ละคนต่างกันมากแม้ฟิตเท่ากัน
      <br>ทดสอบ 25 นาที${full?" ได้ที่การ์ด <b>🎯 หา Zone 2 จากความฟิตจริงของคุณ</b> ด้านล่างนี้":" ได้ที่แท็บ <b>🏃 ออกกำลัง</b> เลื่อนลงล่างสุด"} แล้วโซนทั้งหมดจะแม่นขึ้นทันที</div>`;})()}

  <div style="margin-top:13px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px;gap:8px">
      <span>Zone 2 ${wk>1.2?"เฉลี่ยต่อสัปดาห์":"สัปดาห์นี้"}</span>
      <b style="color:${pg>=100?"var(--move)":"var(--food)"};white-space:nowrap">${shown} / ${goal} นาที</b>
    </div>
    <div class="bar" style="height:10px;margin-top:7px"><i style="background:${pg>=100?"var(--move)":"var(--acc)"};width:${Math.min(100,pg)}%"></i></div>
    <div class="remain">${shown>=goal
      ? `<b style="color:var(--move)">ถึงเป้า Zone 2 แล้ว</b> ✅${pg>140?" — เกินเป้าเยอะ ลองเติมของหนักสัก 1 ครั้ง/สัปดาห์เพื่อดัน VO2max ด้วย":""}`
      : `ขาดอีก <b style="color:var(--food)">${goal-shown}</b> นาที/สัปดาห์ ≈ ${Math.ceil((goal-shown)/45)} เซสชัน (เซสชันละ 45 นาที)`}
      ${wk>1.2?`<span class="mini" style="display:block">รวมทั้งช่วง ${P.z2Min} นาที ใน ${P.n} วัน</span>`:""}</div>
  </div>

  ${full?subFold("z2sess"+(keyid||""),`📊 คุณภาพเซสชัน <span class="pill ${P.z2Full?"ok":"warn"}">เต็มโดส ${P.z2Full} ครั้ง</span>`,`
  <div class="z2g">
    <div><b style="color:var(--acc)">${P.z2Sess}</b><span>เซสชัน Z2<br>(≥20 นาที)</span></div>
    <div><b style="color:${P.z2Full?"var(--move)":"var(--dim)"}">${P.z2Full}</b><span>เซสชันเต็มโดส<br>(≥45 นาที)</span></div>
    <div><b>${P.z2Long}</b><span>ยาวสุด<br>(นาที)</span></div>
  </div>
  ${P.z2Sess&&!P.z2Full?`<div class="mini" style="margin-top:8px">⏱️ เซสชัน Z2 ยาวสุด ${P.z2Long} นาที — งานวิจัยมองว่า <b>45–60 นาทีขึ้นไป</b> คือช่วงที่กระตุ้นไมโทคอนเดรียได้เต็มที่ ต่ำกว่านั้นถือว่า "รักษาระดับ" มากกว่า "พัฒนา" (แต่ 30 นาทีก็ดีกว่าไม่ทำ)</div>`:""}`):`
  <div class="z2g">
    <div><b style="color:var(--acc)">${P.z2Sess}</b><span>เซสชัน Z2<br>(≥20 นาที)</span></div>
    <div><b style="color:${P.z2Full?"var(--move)":"var(--dim)"}">${P.z2Full}</b><span>เซสชันเต็มโดส<br>(≥45 นาที)</span></div>
    <div><b>${P.z2Long}</b><span>ยาวสุด<br>(นาที)</span></div>
  </div>`}

  <div style="margin-top:16px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px">
      <span>การกระจายความหนัก (80/20)</span>
      <span class="pill ${V[3]==="var(--move)"?"ok":V[3]==="var(--bad)"?"bad":"warn"}">${V[1]}</span>
    </div>
    <div class="polwrap">
      <div class="poltk" style="left:80%"><b>เป้า 80%</b></div>
      <div class="polbar">
        ${seg(P.pLow,"#4ade80","เบา")}${seg(P.pMid,"#fbbf24","กลาง")}${seg(P.pHigh,"#f87171","หนัก")}
      </div>
    </div>
    <div class="stglg">
      <span><i style="background:#4ade80"></i>เบา Z1–Z2 ${P.low} น.</span>
      <span><i style="background:#fbbf24"></i>กลาง Z3 ${P.mid} น.</span>
      <span><i style="background:#f87171"></i>หนัก Z4–Z5 ${P.high} น.</span>
    </div>
    <div class="ins" style="margin-top:8px"><div>${V[0]}</div><div>${V[2]}</div></div>
    ${P.sTot?`<div class="mini">นับแบบ <b>เซสชัน</b> (วิธีดั้งเดิมของ Seiler): เบา ${P.sLow} · กลาง ${P.sMid} · หนัก ${P.sHigh} จาก ${P.sTot} ครั้ง = <b>${P.sPLow}/${P.sPMid+P.sPHigh}</b>
      <br><span style="opacity:.85">นับแบบเวลาจะดูเบากว่าเสมอ เพราะวอร์มอัพ–คูลดาวน์ในวันหนักก็นับเป็นเวลาเบาด้วย ดูควบคู่กันทั้งสองตัวเลข</span></div>`:""}
    ${P.est?`<div class="mini">หมายเหตุ: มี ${P.est} นาทีที่ไม่ได้แยกโซน ระบบประมาณจาก %HRmax เฉลี่ยให้ — กรอกเวลาแยกโซนจะแม่นกว่า</div>`:""}
  </div>

  ${eff?`<div class="z2r" style="margin-top:14px">
    <em>${eff.pct===null?"📐":eff.pct>=3?"📈":eff.pct<=-3?"📉":"➖"}</em>
    <div><b style="color:${eff.pct===null?"var(--txt)":eff.pct>=3?"var(--move)":eff.pct<=-3?"var(--bad)":"var(--txt)"}">${
      eff.pct===null? `ดัชนี ${eff.now}`
        : eff.pct>=3? `ฟิตขึ้น ${eff.pct}%`
        : eff.pct<=-3? `ลดลง ${Math.abs(eff.pct)}%`
        : `ทรงตัว`}</b>
      <small><b>ความคุ้มของหัวใจ</b> — ความเร็วที่ทำได้ต่อการเต้น 1 ครั้ง วัดจาก ${eff.n} เซสชันเบาที่มีระยะทางใน 28 วันล่าสุด
      ${eff.pct===null?` · ยังไม่มีช่วงก่อนหน้าให้เทียบ อีก 4 สัปดาห์กลับมาดูใหม่`
        : ` (${eff.now} เทียบ ${eff.prev} ของ 28 วันก่อนหน้า)`}
      ${eff.pct===null?""
        : eff.pct>=3?` — วิ่ง/ปั่นได้เร็วขึ้นที่หัวใจเต้นเท่าเดิม นี่คือสัญญาณตรงที่สุดว่า Zone 2 กำลังได้ผล`
        : eff.pct<=-3?` — มักเกิดจากล้าสะสม นอนไม่พอ อากาศร้อน หรือขาดน้ำ ถ้าเป็นชั่วคราวไม่ต้องตกใจ`
        : ` — งานวิจัยมักเห็นการเปลี่ยนแปลงชัดที่ 8–12 สัปดาห์ ใจเย็นๆ`}</small></div>
  </div>`:""}`;
}

/* ================= แอลกอฮอล์: สรุปสัปดาห์ / เดือน / ปี =================
   1 ดื่มมาตรฐาน = แอลกอฮอล์บริสุทธิ์ 10 กรัม
   1 ฝา (30 มล.) ของเหล้า 35 ดีกรี = 8.3 กรัม ≈ 0.83 ดื่ม              */
const CAP_G=8.3;                                  // กรัมแอลกอฮอล์ต่อ 1 ฝา (อ้างอิง 35 ดีกรี)
function alcAgg(n,endDate){
  const days=period(endDate||S.date,n);
  let g=0, caps=0, dDays=0, items=0;
  days.forEach(d=>{
    let dg=0;
    d.fd.forEach(x=>{
      const a=(x.alc!==undefined&&x.alc!=="")? (+x.alc||0) : alcOf(x.name);
      if(a>0){ dg+=a; items++;
        if(/ฝา/.test(x.unit||"")) caps+=(+x.qty||0);
        else caps+=a/CAP_G;                        // แปลงเป็นฝาเทียบเท่า
      }
    });
    if(dg>0) dDays++;
    g+=dg;
  });
  return {n, g:n1(g), caps:n1(caps), kcal:Math.round(g*7.1), std:n1(g/10),
    dDays, dryDays:n-dDays, items,
    perWk:n1(g/n*7), capsWk:n1(caps/n*7), stdWk:n1(g/n*7/10)};
}
function alcHTML(){
  const N=rangeN();
  const A=alcAgg(N), P=alcAgg(N,shiftDate(S.date,-N));   // ช่วงที่เลือก + ช่วงก่อนหน้าเท่ากัน
  const dry=streak(d=>d.alc===0);
  /* ถ้าสตรีคยาวเท่ากับอายุการใช้แอปทั้งหมด แปลว่า "ยังไม่เคยบันทึกการดื่มเลย" ไม่ใช่ "เลิกดื่มมานาน" */
  const histN=histDays(), allDry = dry>0 && dry>=histN;
  const yr=Math.round(A.capsWk*52);                       // คาดการณ์ทั้งปีที่อัตรานี้
  const yrK=Math.round(A.kcal/N*365);
  const box=(t,big,unit,l1,l2,col)=>`<div class="abx">
    <span>${t}</span><b style="color:${col||"var(--food)"}">${big}</b><u>${unit}</u>
    <i>${l1}</i><i>${l2}</i></div>`;
  const lim=A.stdWk<=10;
  return `<div class="agrid">
    ${box(`ช่วงที่เลือก (${N} วัน)`,A.caps,"ฝา",`${A.std} ดื่มมาตรฐาน · ${A.g} ก.`,`${A.kcal.toLocaleString()} kcal · ดื่ม ${A.dDays}/${A.n} วัน`)}
    ${box("เฉลี่ยต่อสัปดาห์",A.capsWk,"ฝา",`${A.stdWk} ดื่มมาตรฐาน`,`เกณฑ์: ไม่เกิน 10 ดื่ม/สัปดาห์`,lim?"var(--move)":"var(--bad)")}
    ${box("ที่อัตรานี้ทั้งปี",yr,"ฝา",`≈ ${yrK.toLocaleString()} kcal/ปี`,`≈ ไขมัน ${n1(yrK/7700)} กก.`)}
  </div>
  <div class="ins" style="margin-top:11px"><div>${lim?"✅":"⚠️"}</div><div>
    ${N===7?"สัปดาห์นี้":`เฉลี่ย ${N} วันที่ผ่านมา`} <b>${A.capsWk} ฝา/สัปดาห์</b> = ${A.stdWk} ดื่มมาตรฐาน —
    ${lim?`ยังอยู่ในเกณฑ์ที่แนะนำ (ไม่เกิน 10 ดื่ม/สัปดาห์)`
         :`<b class="down">เกินเกณฑ์</b> ที่แนะนำอยู่ ${n1(A.stdWk-10)} ดื่ม/สัปดาห์`}</div></div>
  <div class="ins"><div>${A.g<=P.g?"📉":"📈"}</div><div>เทียบ ${N} วันก่อนหน้า:
    ${P.g>0? `${P.caps} ฝา → <b>${A.caps} ฝา</b> ${delta(A.g,P.g,false)}`
           : A.g>0? `ช่วงก่อนหน้าไม่มีบันทึกการดื่ม — ช่วงนี้ ${A.caps} ฝา` : `ไม่ได้ดื่มทั้งสองช่วง 👏`}</div></div>
  <div class="ins"><div>${dry>=3?"🌿":"🍺"}</div><div>${allDry
      ? `ยังไม่มีบันทึกการดื่มเลยตั้งแต่เริ่มใช้แอป (<b>${dry}</b> วัน)`
      : `ไม่ดื่มติดกัน <b>${dry}</b> วัน`} ·
    ในช่วงนี้มีวันปลอดเหล้า <b>${A.dryDays}/${A.n}</b> วัน${A.dryDays/A.n<0.65?" — ลองตั้งเป้าวันปลอดเหล้าสัก 3–4 วัน/สัปดาห์ ตับจะได้พัก":""}</div></div>
  <div class="ins"><div>😴</div><div>แอลกอฮอล์รบกวนหลับลึกและ REM แม้ดื่มไม่มาก —
    ถ้าคืนไหนดื่ม ลองเทียบคะแนนการนอนคืนนั้นดู จะเห็นผลชัด</div></div>
  <div class="mini" style="margin-top:9px">1 ฝา = 30 มล. ของเหล้า 35 ดีกรี (Regency) ≈ แอลกอฮอล์ ${CAP_G} ก.
    · รายการที่หน่วยไม่ใช่ "ฝา" ระบบแปลงเป็นฝาเทียบเท่าให้จากกรัมแอลกอฮอล์
    · ทุกตัวเลขในการ์ดนี้เปลี่ยนตามช่วงที่เลือกด้านบนสุด</div>`;
}

/* ---------- คะแนนความพร้อม (แนวเดียวกับ Whoop/Oura/Garmin) ---------- */
/* ---------- ความพร้อมวันนี้ ---------- */
/* 4 ข้อนี้อิงแบบประเมินความรู้สึกที่ใช้กับนักกีฬา (Hooper index) — 1 = แย่สุด 5 = ดีสุด */
const RDLB={
  f :["ล้ามาก","ล้า","พอกลางๆ","ค่อนข้างสด","สดชื่นเต็มที่"],
  s :["ปวดมาก","ปวด","ตึงนิดหน่อย","เกือบหาย","ไม่ปวดเลย"],
  st:["เครียดมาก","เครียด","กลางๆ","ค่อนข้างสบาย","สบายมาก"],
  m :["แย่มาก","ไม่ค่อยดี","เฉยๆ","ดี","ดีมาก"]
};
const RDQ=[["f","😮‍💨 ความล้าโดยรวม"],["s","💪 ปวดกล้ามเนื้อ"],["st","🧠 ความเครียด"],["m","🙂 อารมณ์"]];
function rdGet(d){ return (S.rd&&S.rd[d]) || {}; }
/* ค่าฐานของตัวเอง = มัธยฐานย้อนหลัง 7 วัน (ไม่นับวันนี้) ต้องมีอย่างน้อย 3 วันถึงจะเชื่อได้ */
function rdBase(key,d){
  const v=[];
  for(let i=1;i<=10 && v.length<7;i++){ const x=+rdGet(shiftDate(d,-i))[key]; if(x>0) v.push(x); }
  if(v.length<3) return null;
  v.sort((a,b)=>a-b);
  return v.length%2 ? v[(v.length-1)/2] : (v[v.length/2-1]+v[v.length/2])/2;
}
function readiness(){
  const d=dayData(S.date);
  const last7=period(S.date,7), last28=period(S.date,28);
  const f=[];

  /* 1) การนอนคืนล่าสุด — ใช้คะแนนคุณภาพเต็ม ไม่ใช่แค่จำนวนชั่วโมง */
  const ev=sleepEval(d.sl);
  const sSleep = ev? ev.score : (d.sl? Math.max(0,Math.min(100,Math.round((d.hours/8)*100))) : null);
  f.push({k:"การนอนคืนล่าสุด",v:sSleep,w:.28,
    txt: sSleep===null?"ยังไม่ได้บันทึก"
       : (ev?`คะแนนคุณภาพ ${ev.score} · หลับจริง ${ev.hrs} ชม.`:`${d.hours} ชม. (ยังไม่ได้ใส่ระยะการนอน)`)});

  /* 2) การนอน 7 คืน — ดูทั้งปริมาณ (หนี้) และคุณภาพเฉลี่ย */
  const slN=last7.filter(x=>x.hours>0);
  let sWeek=null, weekTxt="ยังไม่มีข้อมูล";
  if(slN.length){
    const debt=n1(slN.reduce((a,b)=>a+Math.max(0,7.5-b.hours),0));
    const qs=last7.map(x=>sleepEval(x.sl)).filter(Boolean).map(x=>x.score);
    const sDebt=Math.max(0,Math.round(100-debt*12));
    const sQual=qs.length? Math.round(qs.reduce((a,b)=>a+b,0)/qs.length) : null;
    sWeek = sQual===null ? sDebt : Math.round(sDebt*0.6 + sQual*0.4);
    weekTxt = `ขาดสะสม ${debt} ชม.` + (sQual!==null?` · คุณภาพเฉลี่ย ${sQual}/100`:" · ยังไม่มีคะแนนคุณภาพ")
            + ` (${slN.length}/7 คืน)`;
  }
  f.push({k:"การนอน 7 คืน",v:sWeek,w:.15,txt:weekTxt});

  /* 3) ความรู้สึกวันนี้ — งานวิจัยพบว่าตอบสนองไวกว่าตัวเลขจากอุปกรณ์ (Saw 2016) */
  const r=rdGet(S.date);
  const sub=["f","s","st","m"].map(k=>+r[k]).filter(x=>x>=1&&x<=5);
  let sSub=null, subTxt="ยังไม่ได้เช็ค — กดปุ่มด้านล่าง ใช้เวลา 20 วินาที";
  if(sub.length){
    const avg=sub.reduce((a,b)=>a+b,0)/sub.length;
    sSub=Math.round((avg-1)/4*100);
    const lab=[]; if(+r.f) lab.push("ล้า "+RDLB.f[r.f-1]); if(+r.s) lab.push("กล้ามเนื้อ "+RDLB.s[r.s-1]);
    if(+r.st) lab.push("เครียด "+RDLB.st[r.st-1]); if(+r.m) lab.push("อารมณ์ "+RDLB.m[r.m-1]);
    subTxt=lab.join(" · ");
  }
  f.push({k:"ความรู้สึกวันนี้",v:sSub,w:.22,txt:subTxt});

  /* 4) สมดุลการฝึก (ACWR) — ต้องมีประวัติซ้อมจริงในช่วง 21 วันก่อนหน้า
     ไม่งั้นสูตรจะได้ 28÷7 = 4.00 เป๊ะเสมอ ซึ่งเป็นผลทางคณิตศาสตร์ ไม่ใช่สัญญาณ */
  const acute=last7.reduce((a,b)=>a+b.load,0)/7;
  const chronic=last28.reduce((a,b)=>a+b.load,0)/28;
  const early=last28.slice(0,21).reduce((a,b)=>a+b.load,0);   /* วันที่ 8-28 ย้อนหลัง */
  const enough = early>=40 && chronic>3;
  const acwr = enough ? acute/chronic : null;
  let sLoad=null, loadTxt;
  if(acwr!==null){
    sLoad = acwr>1.5? 35 : acwr>1.3? 60 : acwr>=0.8? 100 : acwr>=0.5? 80 : 65;
    loadTxt = acwr>1.5?`ซ้อมหนักพุ่งเร็วเกินไป (${n1(acwr)}× ของฐาน) เสี่ยงบาดเจ็บ`
      : acwr>1.3?`เพิ่มโหลดค่อนข้างเร็ว (${n1(acwr)}× ของฐาน)`
      : acwr>=0.8?`โหลดสมดุลกับที่เคยทำ (${n1(acwr)}×)`
      : `ซ้อมน้อยกว่าฐานเดิม (${n1(acwr)}×) — เพิ่มได้`;
  }else{
    const left=Math.max(0,28-histDays());
    loadTxt = left>0 ? `กำลังสร้างฐาน — อีก ${left} วันจึงเทียบได้ (ต้องมีประวัติซ้อม 4 สัปดาห์)`
                     : "ยังซ้อมไม่สม่ำเสมอพอจะเทียบฐาน — ซ้อมต่อเนื่องอีกสักหน่อย";
  }
  f.push({k:"สมดุลการฝึก (7 วัน เทียบ 28 วัน)",v:sLoad,w:.15,txt:loadTxt});

  /* 5) ความหนักเมื่อวาน
     ถ้ายังไม่เคยบันทึกการออกกำลังเลย ไม่ใช่ว่า "เบา" แต่คือ "ไม่รู้"
     และที่สำคัญกว่านั้น: ตัวเลขโหลดคือ "สิ่งที่บันทึกไว้" ไม่ใช่ "สิ่งที่ร่างกายรู้สึก"
     ถ้าวันนี้เจ้าตัวตอบเองว่าล้าหรือปวด ห้ามเขียนสวนหน้าว่า "เบา ฟื้นตัวได้" เด็ดขาด
     ให้ยึดตามที่ร่างกายบอกก่อน แล้วบอกตรง ๆ ว่าตัวเลขกับความรู้สึกไม่ตรงกัน
     (เทียบกับเกณฑ์ต้องใช้ >= ไม่ใช่ > — ของเดิมโหลด 80 เป๊ะจะตกไปช่อง "เบา") */
  const y=dayData(shiftDate(S.date,-1));
  const everEx = arr(S.ex).length>0 || arr(S.wo).length>0;
  const yTrained = y.ex.length>0 || y.wo.length>0;
  const yL = Math.round(y.load);
  const sore=+r.s, tired=+r.f;                       /* 1 = แย่สุด, 5 = ดีสุด */
  const feltBad = (sore>=1&&sore<=2) || (tired>=1&&tired<=2);
  let sY, tY;
  if(!everEx){ sY=null; tY="ยังไม่เคยบันทึกการออกกำลังกาย"; }
  else if(y.load>=110){ sY=45; tY=`เมื่อวานหนักมาก (โหลด ${yL}) ควรผ่อน`; }
  else if(y.load>=80){ sY=70; tY=`เมื่อวานหนักพอควร (โหลด ${yL})`; }
  else if(feltBad){ sY=70;
    tY=`โหลดที่บันทึกไว้ไม่สูง (${yL}) แต่วันนี้คุณบอกว่า${(sore>=1&&sore<=2)?"ยังปวดกล้ามเนื้ออยู่":"ยังล้าอยู่"} — ยึดตามที่ร่างกายบอก`; }
  else if(!yTrained){ sY=100; tY="เมื่อวานไม่ได้ซ้อม ฟื้นตัวได้เต็มที่"; }
  else { sY=100; tY=`เมื่อวานเบา (โหลด ${yL}) ฟื้นตัวได้`; }
  f.push({k:"ความหนักเมื่อวาน",v:sY,w:.10,txt:tY});

  /* 6) สัญญาณตอนตื่น — ชีพจร/HRV เทียบกับค่าฐานของตัวเอง ไม่ใช่ค่ามาตรฐานคนอื่น */
  const parts=[], ptxt=[];
  const rhr=+r.rhr, bRhr=rdBase("rhr",S.date);
  if(rhr>0 && bRhr){
    const dv=rhr-bRhr;
    parts.push(dv<=0?100:dv<=3?85:dv<=6?65:dv<=10?45:30);
    ptxt.push(`ชีพจร ${rhr} (ฐาน ${n1(bRhr)}, ${dv>0?"+":""}${n1(dv)})`);
  }else if(rhr>0) ptxt.push(`ชีพจร ${rhr} — ยังไม่มีฐานเทียบ (ต้องวัด 3 วันขึ้นไป)`);
  const hrv=+r.hrv, bHrv=rdBase("hrv",S.date);
  if(hrv>0 && bHrv){
    const pc=(hrv-bHrv)/bHrv*100;
    parts.push(pc>=0?100:pc>=-10?80:pc>=-20?60:40);
    ptxt.push(`HRV ${hrv} (ฐาน ${n1(bHrv)}, ${pc>0?"+":""}${Math.round(pc)}%)`);
  }else if(hrv>0) ptxt.push(`HRV ${hrv} — ยังไม่มีฐานเทียบ`);
  f.push({k:"สัญญาณตอนตื่น",v: parts.length? Math.round(parts.reduce((a,b)=>a+b,0)/parts.length) : null,
    w:.10, txt: ptxt.length? ptxt.join(" · ") : "ยังไม่ได้วัดชีพจร/HRV ตอนตื่น (ไม่กรอกก็ได้)"});

  /* 7) แอลกอฮอล์เมื่อคืน — ดื่มเย็นวานนี้คือคืนที่เพิ่งผ่านมา
     ถ้าเมื่อวานไม่ได้บันทึกอาหารเลย ก็ไม่รู้ว่าดื่มหรือเปล่า อย่าเดาว่าไม่ดื่ม */
  const ag=y.alc||0;
  const knowAlc = y.fd.length>0 || ag>0;
  const sAl = !knowAlc? null : ag<=0?100: ag<=10?85: ag<=20?65: ag<=40?45:30;
  f.push({k:"แอลกอฮอล์เมื่อคืน",v:sAl,w:.10,
    txt: !knowAlc? "เมื่อวานไม่ได้บันทึกอาหาร เลยไม่รู้ว่าดื่มหรือเปล่า"
       : ag<=0?"ไม่ได้ดื่ม":`ดื่ม ${n1(ag)} ก. (${n1(ag/10)} ดื่มมาตรฐาน) — รบกวนหลับลึกและ REM`});

  /* ต้องมีสัญญาณจริงอย่างน้อย 1 อย่างถึงจะประเมินได้ — ไม่งั้น "ไม่มีข้อมูล" จะกลายเป็น "คะแนนเต็ม" */
  const core=[sSleep,sSub, f.find(x=>x.k==="สัญญาณตอนตื่น").v];
  if(!core.some(x=>x!==null)) return null;
  const use=f.filter(x=>x.v!==null);
  if(!use.length) return null;
  const tw=use.reduce((a,b)=>a+b.w,0);
  const score=Math.round(use.reduce((a,b)=>a+b.v*b.w,0)/tw);
  const weak=[...use].sort((a,b)=>a.v-b.v)[0];

  /* ธงเตือน (ไม่คิดคะแนน) — น้ำหนักหายเร็วผิดปกติมักแปลว่าขาดน้ำ */
  const flags=[];
  const bw=bodySorted().filter(x=>+x.w>0);
  const todayW=bw.find(x=>x.date===S.date);
  if(todayW){
    const prev=bw.filter(x=>x.date<S.date).slice(-7);
    if(prev.length>=3){
      const avg=prev.reduce((a,b)=>a+ +b.w,0)/prev.length;
      if(+todayW.w < avg*0.98) flags.push(`น้ำหนักต่ำกว่าค่าเฉลี่ย 7 วัน ${n1((1-todayW.w/avg)*100)}% — มักเป็นภาวะขาดน้ำ ดื่มน้ำให้พอก่อนซ้อม`);
    }
  }
  const verdict = score>=80?["พร้อมเต็มที่","ซ้อมหนักได้ตามแผน จะลองดัน PR วันนี้ก็ได้","var(--move)"]
    : score>=65?["พร้อมปานกลาง","ซ้อมได้ตามปกติ แต่อย่าเพิ่งดันสถิติ","var(--move)"]
    : score>=45?["ควรผ่อน","เอาแบบเบา–ปานกลางพอ เช่น Zone 2 หรือเวทเบาลง 20%","var(--food)"]
    : ["ควรพัก","วันนี้เน้นฟื้นตัว เดินเบาๆ ยืดเหยียด แล้วนอนให้เต็ม","var(--bad)"];
  return {score,f,verdict,weak,acwr,flags,filled:use.length,total:f.length};
}
/* ================= กล่องพับ =================
   - จำสถานะเปิด/ปิดที่ผู้ใช้เลือกไว้ (ต่อกล่อง)
   - คำอธิบายยาวๆ ที่ยังไม่ได้อยู่ในกล่องพับ จะถูกห่อให้อัตโนมัติ จะได้ไม่ต้องไล่แก้ทีละจุด */
const FOLDK="foldOpen";
function foldState(){ try{ return JSON.parse(LS.get(FOLDK)||"{}")||{}; }catch(e){ return {}; } }
function foldSet(k,open){ const o=foldState(); o[k]=open?1:0; LS.set(FOLDK,JSON.stringify(o)); }
function foldBind(d){
  if(d.dataset.bound) return;
  d.dataset.bound="1";
  const k=d.dataset.fold; if(!k) return;
  const st=foldState();
  if(st[k]!==undefined) d.open=!!st[k];
  /* บันทึกเฉพาะตอนที่ "ผู้ใช้" กดเอง — ถ้าโค้ดตั้งค่าเริ่มต้นให้ ห้ามจำว่าเป็นความตั้งใจของผู้ใช้
     ไม่งั้นค่าเริ่มต้นอัตโนมัติจะกลายเป็นการเลือกถาวร แล้วรายการที่มีน้อยจะไม่กางอีกเลย
     ผูกกับการ "คลิกที่หัวข้อ" ตรง ๆ แทน event toggle (ซึ่งยิงทีหลังและแยกไม่ออกว่าใครสั่ง) */
  const sm=d.querySelector("summary");
  if(sm) sm.addEventListener("click",()=>{ foldSet(k, !d.open); });
}
/* ตั้งค่าเริ่มต้นโดยโปรแกรม — ไม่ถูกจำเป็นความตั้งใจของผู้ใช้ */
function foldAuto(d,open){ d.open=open; }
/* ---------- ช่องเวลา/วันที่ ให้พอดีกล่องเสมอ ----------
   บน iOS ช่อง <input type=time> เป็นตัวควบคุมของระบบ ย่อด้วย width/max-width ไม่ได้
   ความกว้างขั้นต่ำของมันขึ้นกับขนาดตัวอักษร ถ้าผู้ใช้ตั้งตัวอักษรใหญ่ไว้ ช่องจะกว้างจนล้นการ์ด
   จึงวัดของจริงหลังวาดเสร็จ แล้วลดขนาดตัวอักษรทีละขั้นจนพอดี — ไม่ต้องเดาว่าเครื่องไหนกว้างเท่าไร */
/* ช่องเลือกเวลาแบบ ชั่วโมง : นาที — ไม่ใช้ <input type=time> ของระบบแล้ว
   เพราะบน iOS มันเป็นตัวควบคุมของระบบที่มี "ความกว้างขั้นต่ำ" ซึ่ง CSS สั่งย่อไม่ได้
   ไม่ว่าจะให้ที่ว่างเท่าไรก็ยังล้นการ์ดบนบางเครื่อง (แก้มาหลายรอบแล้วไม่จบ)
   ดรอปดาวน์สองช่องนี้เราคุมขนาดได้เอง จึงไม่มีทางล้น และบนมือถือกดแล้วยังขึ้นวงล้อให้เลือกเหมือนเดิม
   ค่าจริงเก็บใน <input type=hidden> ที่ใช้ id เดิม โค้ดส่วนอื่นจึงอ่าน .value ได้เหมือนเดิมทุกที่ */
function tpFill(sel,n){
  let h=""; for(let i=0;i<n;i++) h+=`<option value="${p2(i)}">${p2(i)}</option>`;
  sel.innerHTML=h;
}
function tpSync(w){
  const inp=el(w.dataset.for); if(!inp) return;
  const m=String(inp.value||"").match(/^(\d{1,2}):(\d{1,2})/);
  const hh=m?Math.min(23,+m[1]):0, mm=m?Math.min(59,+m[2]):0;
  w.querySelector(".tph").value=p2(hh);
  w.querySelector(".tpm").value=p2(mm);
}
function tpSyncAll(){ document.querySelectorAll(".tpick").forEach(tpSync); }
function tpInit(){
  document.querySelectorAll(".tpick").forEach(w=>{
    if(w.dataset.ready) return; w.dataset.ready="1";
    const inp=el(w.dataset.for); if(!inp) return;
    const h=w.querySelector(".tph"), m=w.querySelector(".tpm");
    tpFill(h,24); tpFill(m,60);
    const push=()=>{
      inp.value=h.value+":"+m.value;
      inp.dispatchEvent(new Event("input",{bubbles:true}));
      inp.dispatchEvent(new Event("change",{bubbles:true}));
    };
    h.onchange=push; m.onchange=push;
    tpSync(w);
  });
}
tpInit();   /* สร้างตัวเลือกให้ครบตั้งแต่ตอนโหลด ก่อนโค้ดส่วนอื่นจะไปตั้งค่าเวลา */
/* ช่องวันที่ยังเป็นของระบบอยู่ (ใช้ที่หัวจอที่เดียว) — เผื่อบางเครื่องกว้างเกิน ก็ย่อให้พอดี */
function fitTimeInputs(){
  tpSyncAll();
  document.querySelectorAll("input[type=date]").forEach(inp=>{
    const p=inp.parentElement; if(!p||!inp.offsetParent) return;
    inp.style.fontSize="";
    let fs=14, guard=0;
    while(inp.offsetWidth > p.clientWidth && fs>11 && guard++<8){ fs-=0.5; inp.style.fontSize=fs+"px"; }
  });
}
let _fitT=null;
function fitSoon(){ clearTimeout(_fitT); _fitT=setTimeout(()=>{try{fitTimeInputs();}catch(e){}},0); }
addEventListener("resize",fitSoon);
addEventListener("orientationchange",fitSoon);
/* คำอธิบายยาวเกิน 160 ตัวอักษร ที่ไม่ได้อยู่ในกล่องพับอยู่แล้ว → ห่อให้อัตโนมัติ
   เรียกซ้ำได้ปลอดภัย (ของที่ห่อแล้วจะถูกข้าม) จึงเรียกหลังวาดหน้าจอใหม่ได้ทุกครั้ง */
let _foldN=0;
function foldify(){
  let n=_foldN;
  document.querySelectorAll(".hint, .lastbox").forEach(el0=>{
    if(el0.closest("details")||el0.dataset.nofold) return;
    if((el0.textContent||"").replace(/\s+/g," ").trim().length<160) return;
    const d=document.createElement("details");
    d.className="fold"; d.dataset.fold="auto"+(++n); _foldN=n;
    const sm=document.createElement("summary");
    const head=el0.querySelector("b");
    sm.innerHTML=(head? esc(head.textContent.trim().slice(0,42)) : "คำอธิบาย")+' <span class="fn">แตะเพื่ออ่าน</span>';
    const box=document.createElement("div"); box.className="foldc";
    el0.parentNode.insertBefore(d,el0);
    box.appendChild(el0); d.appendChild(sm); d.appendChild(box);
  });
  document.querySelectorAll("details.fold").forEach(foldBind);
}
/* จำนวนรายการในหัวข้อที่พับได้ + ถ้ารายการเยอะจะปิดไว้ก่อน (ผู้ใช้เคยเลือกเองแล้วให้ยึดของผู้ใช้) */
function foldCount(id,n,unit){
  const lab=el("n-"+id); if(lab) lab.textContent = n? `(${n} ${unit})` : "(ยังไม่มี)";
  const d=document.querySelector(`details[data-fold="lst-${id}"]`);
  if(!d) return;
  foldBind(d);
  const k="lst-"+id;
  if(foldState()[k]===undefined) foldAuto(d, n>0 && n<=4);   /* ค่าเริ่มต้น: น้อยก็กาง เยอะก็พับ */
}
/* เขียน innerHTML เฉพาะตอนเนื้อหาเปลี่ยนจริง
   ถ้าเขียนทับทุกครั้งที่ render() กล่องพับที่ผู้ใช้เพิ่งกดจะถูกสร้างใหม่กลางคัน
   บนมือถือทำให้ภาพค้าง/เนื้อหาหายได้ และยังเปลืองแรงวาดโดยไม่จำเป็น */
const _htmlCache=new WeakMap();
function setHTML(node,html){
  if(!node) return false;
  if(_htmlCache.get(node)===html) return false;
  _htmlCache.set(node,html);
  node.innerHTML=html;
  return true;
}
/* ---------- สรุปสารอาหาร: เห็นตัวย่อครบทุกตัว กดคลี่ดูทีละตัว ----------
   ทุกสารอาหารถูกปฏิบัติเหมือนกันหมด ไม่มีตัวไหนถูกเน้นเป็นพิเศษ
   สีบอกสถานะ: เขียว = เข้าเกณฑ์ · ส้ม = เฉียด · แดง = หลุด */
function kShort(v){ return v>=10000? Math.round(v/1000)+"k" : v>=1000? n1(v/1000)+"k" : n1(v); }
/* การ์ดสารอาหารพร้อมกราฟแท่ง — หน้าตาเดิม แค่ย้ายไปอยู่ในกล่องพับ */
function ntile(icon,name,val,goal,unit,color,lowerBetter,extra,note){
  const pctv=Math.min(100,goal?val/goal*100:0);
  const diff=n1(Math.abs(goal-val));
  const st = lowerBetter ? (val<=goal*0.75?"ok":val<=goal?"warn":"bad")
                         : (val>=goal?"ok":val>=goal*0.6?"warn":"bad");
  const c = st==="ok"?"var(--move)":st==="warn"?"var(--food)":"var(--bad)";
  return `<div class="nt"><div class="h"><em>${icon}</em>${name}</div>
    <b>${n1(val).toLocaleString()} <span>/ ${goal.toLocaleString()} ${unit}</span></b>
    ${extra||`<div class="bar"><i style="background:${lowerBetter?c:color};width:${pctv}%"></i></div>`}
    <span class="st" style="color:${c}">${lowerBetter
      ? (val<=goal?`เหลืออีก ${diff.toLocaleString()} ${unit}`:`เกินมา ${diff.toLocaleString()} ${unit}`)
      : (val>=goal?`ครบแล้ว ✓`:`ขาดอีก ${diff.toLocaleString()} ${unit}`)}${note||""}</span></div>`;
}
/* ข้อความสัดส่วนไขมัน — เดิมเดาว่าเป็น "ของทอด/กะทิ" เสมอ ทั้งที่บางเมนูไม่มีสักอย่าง
   ตอนนี้ชี้เมนูจริงที่ให้ไขมันอิ่มตัวมากที่สุดของวัน และดูเพดาน WHO ควบคู่กับสัดส่วน */
function fatSplit(d,u){
  if(!d.ft) return {ok:null, msg:"ยังไม่มีข้อมูลไขมันวันนี้", pct:0};
  const pct=Math.round(d.sat/d.ft*100);
  const overCap = d.sat>u.satGoal;
  const ok = pct<=35 && !overCap;
  if(ok) return {ok:true, pct, msg:`สัดส่วนดี เน้นไขมันดีอยู่ (อิ่มตัว ${n1(d.sat)} จากเพดาน ${u.satGoal} ก.)`};
  const t=topSrc(d.fd,"sat",2).map(x=>`${esc(x.name)} ${n1(x.v)} ก.`).join(" · ");
  /* บอกให้ชัดว่า "สัดส่วนสูง" กับ "กินเกินเพดาน" คนละเรื่อง — ไม่งั้นกินชามเดียวก็เหมือนโดนดุว่าเกิน */
  const why = overCap
    ? `เกินเพดานวันละ ${u.satGoal} ก. (ตอนนี้ ${n1(d.sat)} ก.)`
    : `สัดส่วนอิ่มตัว ${pct}% สูงกว่าเกณฑ์ 35% แต่ยังไม่เกินเพดานวันละ ${u.satGoal} ก. (ตอนนี้ ${n1(d.sat)} ก.)`;
  return {ok:false, pct, msg: t? `${why} · ส่วนใหญ่มาจาก ${t}` : why};
}
function nutList(d,u,g,ratio,gkg,unsat){
  const wkAlc=period(S.date,7).reduce((a,b)=>a+b.alc,0);
  const dl=S.user.sex==="m"?20:10;
  const L=[
   {k:"pr", ic:"🍗", n:"โปรตีน",      ab:"P",  v:d.pr,  goal:u.pGoal,  un:"ก.", low:false, color:"var(--move)",
    note:u.w?` · <b>${gkg}</b> ก./กก.`:"",
    tip:`${u.w?`วันนี้ได้ <b>${gkg}</b> ก. ต่อน้ำหนักตัว 1 กก. — เป้าที่ตั้งไว้คือ ${u.pkg} ก./กก. ตามเป้าหมาย${(+u.goal<=-250)?"ลดน้ำหนัก (ต้องการมากขึ้นเพื่อรักษากล้ามเนื้อ)":(+u.goal>0)?"เพิ่มกล้ามเนื้อ":"รักษาน้ำหนัก"}<br><br>`:""}อ้างอิง ISSN 2017 / Helms 2014: ช่วงลดน้ำหนัก 1.8–2.7 ก./กก. · รักษา 1.4–1.8 ก./กก.`},
   {k:"cb", ic:"🍚", n:"คาร์โบไฮเดรต", ab:"C",  v:d.cb,  goal:u.cGoal,  un:"ก.", low:false, color:"var(--food)",
    tip:`ตั้งไว้ที่ 45% ของพลังงานทั้งวัน — เป็นตัวเลขกลาง ๆ ปรับได้ตามชนิดการฝึก ถ้าซ้อมหนักหรือวิ่งไกลจะต้องการมากกว่านี้`},
   {k:"ft", ic:"🥑", n:"ไขมันรวม",    ab:"F",  v:d.ft,  goal:u.fGoal,  un:"ก.", low:false, color:"var(--sleep)",
    extraTile:`<div class="nt"><div class="h"><em>⚖️</em>สัดส่วนไขมัน</div>
      <b style="font-size:15px">${d.ft?`อิ่มตัว ${fatSplit(d,u).pct}%`:"–"}</b>
      <span class="st" style="color:${fatSplit(d,u).ok===null?"var(--dim)":fatSplit(d,u).ok?"var(--move)":"var(--food)"}">
        ${fatSplit(d,u).msg}</span></div>`,
    extra:`<div class="fatsplit" title="อิ่มตัว/ไม่อิ่มตัว">
      <i style="background:var(--bad);width:${Math.min(100,d.ft?d.sat/u.fGoal*100:0)}%"></i>
      <i style="background:var(--move);width:${Math.min(100-Math.min(100,d.ft?d.sat/u.fGoal*100:0),unsat/u.fGoal*100)}%"></i></div>`,
    tip:d.ft?`แถบแดง = ไขมันอิ่มตัว ${n1(d.sat)} ก. · แถบเขียว = ไขมันไม่อิ่มตัว ${unsat} ก.<br>
      สัดส่วนอิ่มตัว <b>${fatSplit(d,u).pct}%</b> ของไขมันทั้งหมด — ${fatSplit(d,u).msg}`
      :`ยังไม่มีข้อมูลไขมันวันนี้`},
   {k:"sat",ic:"🧈", n:"ไขมันอิ่มตัว", ab:"อิ่มตัว", v:d.sat, goal:u.satGoal, un:"ก.", low:true, color:"var(--bad)",
    tip:`WHO แนะนำไม่เกิน 10% ของพลังงานทั้งวัน (= ${u.satGoal} ก. สำหรับเป้า ${u.target.toLocaleString()} kcal)<br><br>ตัวการหลักในอาหารไทย: กะทิ ของทอด หมูสามชั้น เนย ชีส ครีมเทียม`},
   {k:"sug",ic:"🍬", n:"น้ำตาล",      ab:"น้ำตาล", v:d.sug, goal:u.sugGoal, un:"ก.", low:true, color:"var(--bad)",
    tip:`นับเฉพาะ <b>น้ำตาลอิสระ</b> ตามนิยาม WHO — น้ำตาลที่เติมเข้าไป บวกน้ำผึ้ง ไซรัป และน้ำผลไม้คั้น<br>
      น้ำตาลในผลไม้ทั้งลูก ผัก และนมจืด <b>ไม่นับ</b><br><br>
      เพดาน 10% ของพลังงาน = ${u.sugGoal} ก. · ระดับที่ดีที่สุด 5% = ${u.sugIdeal} ก.`},
   {k:"fb", ic:"🥦", n:"ไฟเบอร์",     ab:"ใย", v:d.fb,  goal:u.fibGoal, un:"ก.", low:false, color:"#22c55e",
    tip:d.fb<u.fibGoal?`ขาดอีก ${n1(u.fibGoal-d.fb)} ก. ≈ ผักลวก ${Math.ceil((u.fibGoal-d.fb)/2.4)} ถ้วย หรือผลไม้ ${Math.ceil((u.fibGoal-d.fb)/2.5)} ผล<br><br>เกณฑ์ 14 ก. ต่อพลังงาน 1,000 kcal`:`ครบแล้ว — เกณฑ์คือ 14 ก. ต่อพลังงาน 1,000 kcal`},
   {k:"na", ic:"🧂", n:"โซเดียม",     ab:"Na", v:d.na,  goal:NA_LIMIT,  un:"มก.", low:true, color:"var(--bad)",
    note:ratio!==null?` · Na:K <b style="color:${ratio<=1?"var(--move)":ratio<=2?"var(--food)":"var(--bad)"}">${ratio}</b>`:"",
    tip:`เพดาน WHO 2,000 มก./วัน (≈ เกลือ 5 ก.)<br><br>ตัวการหลัก: น้ำซุปก๋วยเตี๋ยว น้ำปลา ซีอิ๊ว น้ำจิ้ม ผงปรุงรส ซุปก้อน ของหมักดอง อาหารสำเร็จรูป
      ${ratio!==null?`<br><br>อัตราส่วน <b>Na : K = ${ratio}</b> — ความดันขึ้นกับอัตราส่วนนี้มากกว่าโซเดียมเดี่ยว ๆ (INTERSALT, DASH) เป้าคือไม่เกิน 1`:""}`},
   {k:"pot",ic:"🍌", n:"โพแทสเซียม",   ab:"K",  v:d.pot, goal:K_GOAL,    un:"มก.", low:false, color:"#22c55e",
    tip:`WHO แนะนำอย่างน้อย ${K_GOAL.toLocaleString()} มก./วัน — โพแทสเซียมช่วยหักล้างผลของโซเดียมต่อความดัน<br><br>
      หาง่าย: ผักใบเขียว ฟักทอง มันเทศ กล้วย มะละกอ ส้ม ถั่ว ปลา น้ำมะพร้าว (ราว 400 มก. ต่อ 1 ถ้วย/1 ผล)
      ${d.fd.length?`<br><br><span style="opacity:.75">วันนี้ ${d.potLab}/${d.fd.length} เมนูใช้ค่าจากห้องแล็บ ที่เหลือเป็นค่าประมาณจากชนิดอาหาร</span>`:""}`},
   {k:"wa", ic:"💧", n:"น้ำดื่ม",      ab:"น้ำ", v:g,     goal:waterGoal(), un:"มล.", low:false, color:"var(--acc)",
    tip:`เป้าคำนวณจากน้ำหนักตัวและปริมาณการออกกำลังกายวันนี้`},
  ];
  if(d.alc||wkAlc) L.push({k:"alc", ic:"🍺", n:"แอลกอฮอล์", ab:"เหล้า", v:d.alc, goal:dl, un:"ก.", low:true, color:"var(--bad)",
    note:` · ≈ <b>${n1(d.alc/10)}</b> ดื่ม`,
    tip:`วันนี้ ${n1(d.alc)} ก. ≈ ${n1(d.alc/10)} ดื่มมาตรฐาน · เพดานต่อวัน ${dl} ก. (${S.user.sex==="m"?"ชาย 2":"หญิง 1"} ดื่ม)<br><br>
      สัปดาห์นี้รวม ${n1(wkAlc)} ก. ≈ ${n1(wkAlc/10)} ดื่ม ${wkAlc>100?"— เกินคำแนะนำสัปดาห์ละ 10 ดื่ม":""}`});
  L.forEach(x=>{
    x.st = x.low ? (x.v<=x.goal*0.75?"ok":x.v<=x.goal?"warn":"bad")
                 : (x.v>=x.goal?"ok":x.v>=x.goal*0.6?"warn":"bad");
    x.c  = x.st==="ok"?"var(--move)":x.st==="warn"?"var(--food)":"var(--bad)";
    x.diff = n1(Math.abs(x.goal-x.v));
    x.msg = x.low ? (x.v<=x.goal?`เหลืออีก ${kShort(x.goal-x.v)}`:`เกินมา ${kShort(x.v-x.goal)}`)
                  : (x.v>=x.goal?`ครบแล้ว ✓`:`ขาดอีก ${kShort(x.goal-x.v)}`);
  });
  return L;
}
function nutSummary(d,u,g,ratio,gkg,unsat){
  if(!d.fd.length && !g) return "";
  const L=nutList(d,u,g,ratio,gkg,unsat);
  /* สรุปแบบสั้น — เดิมโชว์ชิปครบ 9 ตัวทุกครั้ง ซึ่งซ้ำกับตารางข้างล่างและอ่านยาก
     "เกินเพดาน" กับ "ยังกินไม่ครบ" ต้องแยกกัน ตอนเช้าที่ยังไม่ได้กินอะไร ไม่ใช่การทำพลาด */
  const over  = L.filter(x=>x.low && x.v>x.goal);
  const shortL= L.filter(x=>!x.low && x.v<x.goal);
  const okN   = L.filter(x=>x.low ? x.v<=x.goal : x.v>=x.goal).length;
  const cut=(a,n)=>a.slice(0,n).map(x=>x.n).join(" · ")+(a.length>n?` +${a.length-n}`:"");
  const chips = over.length||shortL.length
    ? (over.length?`<span style="color:var(--bad);border-color:var(--bad)55">⚠️ เกินเพดาน: ${cut(over,3)}</span>`:"")
     +(shortL.length?`<span style="color:var(--dim)">ยังขาด: ${cut(shortL,4)}</span>`:"")
    : `<span style="color:var(--move);border-color:var(--move)55">เข้าเกณฑ์ครบทุกตัว ✅</span>`;
  /* แถวเดียวต่อหนึ่งสารอาหาร แบบเดียวกับตัวชี้วัดในการ์ดความพร้อม — อ่านง่ายกว่าตาราง 2 ช่อง
     ซ้าย: ไอคอน + ชื่อ + รายละเอียด · กลาง: กราฟแท่ง · ขวา: ตัวเลขที่กินไป */
  const rows=L.map(x=>{
    const pct=Math.min(100, x.goal? x.v/x.goal*100 : 0);
    const bar = x.extra
      ? `<span class="fb2 wide">${x.extra.replace('class="fatsplit"','class="fatsplit in"')}</span>`
      : `<span class="fb2 wide"><i style="width:${pct}%;background:${x.color||x.c}"></i></span>`;
    return `<div class="fbar nut">
      <span class="nl"><b>${x.ic} ${x.n}</b>
        <small><span style="color:${x.c}">${x.msg}</span>${x.note||""}</small></span>
      ${bar}
      <span class="nv"><b style="color:${x.c}">${n1(x.v).toLocaleString()}</b><i>/ ${x.goal.toLocaleString()} ${x.un}</i></span></div>`;
  }).join("");
  const fs0=fatSplit(d,u), fsc=fs0.ok?"var(--move)":"var(--food)";
  const fatRow = d.ft? `<div class="fbar nut">
      <span class="nl"><b>⚖️ สัดส่วนไขมัน</b><small>${fs0.msg}</small></span>
      <span class="fb2 wide"><i style="width:${Math.min(100,fs0.pct)}%;background:${fsc}"></i></span>
      <span class="nv"><b style="color:${fsc}">${fs0.pct}%</b><i>อิ่มตัว</i></span></div>` : "";
  const docs=L.map(x=>`<div class="nudoc"><b style="color:${x.c}">${x.ic} ${x.n}</b>
      <span>${kShort(x.v)} / ${kShort(x.goal)} ${x.un} · ${x.msg}</span><div>${x.tip}</div></div>`).join("");
  const body=`<div class="nutrows">${rows}${fatRow}</div>
    <details class="fold sub" data-fold="nutDoc"><summary>📖 เกณฑ์และคำแนะนำของแต่ละตัว</summary>
      <div class="foldc">${docs}</div></details>`;
  return `<div class="offchips">${chips}</div>
    ${subFold("nutTiles",`📊 สารอาหาร <span class="fn">เข้าเกณฑ์ ${okN}/${L.length}${over.length?` · เกินเพดาน ${over.length}`:""}</span>`, body)}`;
}
/* หัวข้อย่อยแบบ "เห็นสรุปเสมอ กดแล้วค่อยคลี่รายละเอียด"
   หัวข้อ (head) มีป้ายสถานะอยู่แล้ว จึงยังอ่านรู้เรื่องแม้ตอนพับ */
function subFold(key,head,body,openByDefault){
  return `<details class="fold sub"${openByDefault?" open":""} data-fold="${key}"><summary>${head}</summary><div class="foldc">${body}</div></details>`;
}
/* ---------- ฟอร์มเช็คความรู้สึก ---------- */
function rdDraw(){
  const r=rdGet(S.date);
  el("rdQs").innerHTML=RDQ.map(([k,label])=>`<div style="margin-top:11px">
    <label style="display:block">${label}</label>
    <div class="rdrow" data-k="${k}">${[1,2,3,4,5].map(i=>
      `<button type="button" data-v="${i}" class="${+r[k]===i?"on":""}">${i}<small>${esc(RDLB[k][i-1])}</small></button>`).join("")}</div>
  </div>`).join("");
  if(el("rdRhr")) el("rdRhr").value = +r.rhr>0 ? r.rhr : "";
  if(el("rdHrv")) el("rdHrv").value = +r.hrv>0 ? r.hrv : "";
  const done=RDQ.filter(([k])=>+r[k]>0).length;
  el("rdToggle").textContent = done? `📝 แก้ความรู้สึกวันนี้ (ตอบแล้ว ${done}/4)` : "📝 เช็คความรู้สึกวันนี้";
}
el("rdToggle").onclick=()=>{
  const b=el("rdForm"); const open=b.style.display==="none";
  b.style.display=open?"block":"none";
  if(open){ rdDraw(); b.scrollIntoView({behavior:"smooth",block:"nearest"}); }
};
el("rdQs").onclick=e=>{
  const btn=e.target.closest("button[data-v]"); if(!btn) return;
  const k=btn.closest(".rdrow").dataset.k, v=+btn.dataset.v;
  const cur={...rdGet(S.date)};
  if(+cur[k]===v) delete cur[k]; else cur[k]=v;          /* กดซ้ำ = ล้างคำตอบ */
  S.rd[S.date]=cur; rdDraw();
};
el("rdSave").onclick=async()=>{
  const cur={...rdGet(S.date)};
  const rhr=+el("rdRhr").value||0, hrv=+el("rdHrv").value||0;
  if(rhr>=20&&rhr<=200) cur.rhr=Math.round(rhr); else delete cur.rhr;
  if(hrv>=1&&hrv<=400)  cur.hrv=Math.round(hrv); else delete cur.hrv;
  if(Object.keys(cur).length) S.rd[S.date]=cur; else delete S.rd[S.date];
  saveNow(); el("rdForm").style.display="none"; render();
  await api({action:"user",user:userPayload()});
};
/* เส้นแนวโน้มน้ำหนัก (least squares) — คืนค่าเป็น กก./วัน
   ทำไมไม่เอาครั้งแรกลบครั้งสุดท้าย: น้ำหนักแกว่งวันต่อวันจากน้ำในตัว ±0.8 กก. ได้สบาย
   ถ้าจับแค่สองจุด ความแกว่งนั้นเดียวก็เพี้ยนได้ถึง 800 kcal/วัน
   ลากเส้นผ่านทุกจุดแทน ความแกว่งจะหักล้างกันเอง (หลักเดียวกับที่ MacroFactor ใช้) */
function wTrend(pts){
  const n=pts.length;
  if(n<2) return null;
  if(n===2) return pts[1].x===pts[0].x? null : (pts[1].y-pts[0].y)/(pts[1].x-pts[0].x);
  const mx=pts.reduce((a,b)=>a+b.x,0)/n, my=pts.reduce((a,b)=>a+b.y,0)/n;
  let num=0, den=0;
  pts.forEach(p=>{ num+=(p.x-mx)*(p.y-my); den+=(p.x-mx)*(p.x-mx); });
  return den>0 ? num/den : null;
}
/* TDEE จริง คิดย้อนจาก "กินไปเท่าไร" เทียบกับ "น้ำหนักขยับไปทางไหน"
   ต้องมีครบทั้งสองอย่าง — ชั่งน้ำหนักอย่างเดียวคำนวณไม่ได้ และบันทึกอาหารอย่างเดียวก็ไม่ได้
   จึงคืนเงื่อนไข "ทั้งชุด" พร้อมกัน ไม่ใช่บอกทีละข้อ ผู้ใช้จะได้เห็นว่ายังขาดอะไรบ้าง */
function adaptiveTDEE(){
  const N=21, days=period(S.date,N);
  const d0=days[0].key;
  const fd=days.filter(d=>d.kIn>0);
  const w=arr(S.body).filter(x=>+x.w>0 && x.date>=d0 && x.date<=S.date)
                     .sort((a,b)=>a.date<b.date?-1:1);
  const span=w.length>=2 ? dayDiff(w[0].date,w[w.length-1].date) : 0;
  const need=[
    {ok:fd.length>=8, t:"บันทึกอาหารอย่างน้อย 8 วัน ใน 21 วันล่าสุด", now:`ตอนนี้ ${fd.length} วัน`},
    {ok:w.length>=2,  t:"ชั่งน้ำหนักอย่างน้อย 2 ครั้ง ใน 21 วันล่าสุด", now:`ตอนนี้ ${w.length} ครั้ง`},
    {ok:span>=7,      t:"ครั้งแรกกับครั้งล่าสุดห่างกันอย่างน้อย 7 วัน",
     now: w.length>=2? `ตอนนี้ห่างกัน ${span} วัน` : "รอชั่งให้ครบ 2 ครั้งก่อน"}
  ];
  if(need.some(x=>!x.ok)) return {need};
  const rate=wTrend(w.map(x=>({x:dayDiff(d0,x.date), y:+x.w})));   /* กก./วัน */
  if(rate===null) return {need};
  const dW=rate*span;
  const avgIn=Math.round(fd.reduce((a,b)=>a+b.kIn,0)/fd.length);
  const avgOut=Math.round(days.reduce((a,b)=>a+b.kOut,0)/days.length);
  const real=Math.round(avgIn - rate*7700);           // TDEE จริง = กินเฉลี่ย − พลังงานที่หายไปกับน้ำหนัก
  /* ด่านความสมเหตุสมผล — คนบันทึกอาหารไม่ครบ (ลืมบางมื้อ) เป็นเรื่องปกติมาก
     ถ้าคิดออกมาต่ำกว่า BMR หรือสูงเกิน 1.7 เท่าของสูตร แปลว่าข้อมูลไม่ครบ ไม่ใช่ร่างกายเผาผลาญแบบนั้นจริง
     ห้ามเสนอเป็นเป้าหมายเด็ดขาด — เคยมีเคสระบบชงเป้า 274 kcal/วัน ซึ่งอันตราย */
  const lo=Math.round(S.user.bmr*0.9), hi=Math.round(S.user.tdee*1.7);
  if(real<lo || real>hi)
    return {suspect:true, real, avgIn, dW:n1(dW), span, days:fd.length, weighs:w.length, formula:S.user.tdee, lo, hi};
  return {real,avgIn,avgOut,dW:n1(dW),span,days:fd.length,weighs:w.length,formula:S.user.tdee};
}
function applyRealTdee(){
  const t=adaptiveTDEE(); if(!t||!t.real||t.suspect)return;
  S.user.tdeeReal=t.real; calcTdee(); render();
  api({action:"user",user:userPayload()});
  alert("ปรับเป้าหมายตาม TDEE จริงแล้ว ✅");
}
function clearRealTdee(){S.user.tdeeReal=0;calcTdee();render();
  api({action:"user",user:userPayload()});}
/* ตัวชี้วัดที่เลือกแสดงในแถบรายวันได้ — เก็บไว้ในเครื่อง */
const STRIPM={
  kcal :{n:"🍽️ แคลอรี่ที่กิน",c:"var(--food)",g:()=>S.user.target,   v:d=>d.kIn, u:"kcal",f:v=>Math.round(v).toLocaleString()},
  pro  :{n:"🥩 โปรตีน",      c:"var(--acc)", g:()=>S.user.pGoal,    v:d=>d.pr,  u:"ก.",  f:v=>Math.round(v)},
  load :{n:"🏃 โหลดการฝึก",   c:"var(--move)",g:()=>60,              v:d=>d.load,u:"",    f:v=>Math.round(v)},
  z2   :{n:"🫀 Zone 2",      c:"#4ade80",    g:()=>Math.round(z2Goal()/7), v:d=>d.ex.reduce((a,x)=>a+(+x.z2||0),0), u:"นาที", f:v=>Math.round(v)},
  sleep:{n:"😴 ชั่วโมงนอน",   c:"var(--sleep)",g:()=>8,              v:d=>d.hours,u:"ชม.",f:v=>n1(v)},
  fib  :{n:"🥦 ไฟเบอร์",      c:"#22c55e",   g:()=>S.user.fibGoal,  v:d=>d.fb,  u:"ก.",  f:v=>Math.round(v)},
  sug  :{n:"🍬 น้ำตาล",       c:"#e07b39",   g:()=>S.user.sugGoal,  v:d=>d.sug, u:"ก.",  f:v=>Math.round(v)},
  na   :{n:"🧂 โซเดียม",      c:"var(--bad)",g:()=>NA_LIMIT,        v:d=>d.na,  u:"มก.", f:v=>Math.round(v).toLocaleString()},
  water:{n:"💧 น้ำ",          c:"var(--acc)",g:()=>waterGoal(),     v:d=>S.water[d.key]||0, u:"มล.", f:v=>Math.round(v).toLocaleString()},
  alc  :{n:"🍺 แอลกอฮอล์",    c:"#b8543f",   g:()=>14,              v:d=>d.alc, u:"ก.",  f:v=>n1(v)}
};
const STRIPD=["kcal","pro","load","sleep","na"];
function stripSel(){
  const raw=LS.get("strip");
  if(!raw) return STRIPD.slice();
  const a=raw.split(",").filter(k=>STRIPM[k]);
  return a.length?a:STRIPD.slice();
}
function stripChips(){
  const sel=stripSel();
  el("stripChips").innerHTML=Object.entries(STRIPM).map(([k,m])=>
    `<div class="chip ${sel.includes(k)?"on":""}" data-s="${k}">${m.n}</div>`).join("");
  el("stripBtn").textContent=`⚙️ เลือกตัวชี้วัดที่จะดู (${sel.length}/${Object.keys(STRIPM).length})`;
  el("stripChips").querySelectorAll(".chip").forEach(c=>c.onclick=()=>{
    let a=stripSel(), k=c.dataset.s;
    a = a.includes(k) ? a.filter(x=>x!==k) : a.concat(k);
    if(!a.length) return;                       // ต้องเหลืออย่างน้อย 1 ตัว
    LS.set("strip",a.join(",")); const op=el("stripChips").style.display; stripChips();
    el("stripChips").style.display=op; weekStrip();});
}
el("stripBtn").onclick=()=>{const c=el("stripChips");
  c.style.display = c.style.display==="none" ? "flex" : "none";};
function weekStrip(){
  const N=rangeN(), all=period(S.date,N);
  const DW=["อา","จ","อ","พ","พฤ","ศ","ส"];
  /* ช่วงสั้น = แท่งละวัน · ช่วงยาว = จับกลุ่มแล้วเฉลี่ยต่อวัน (เหมือนกราฟด้านล่าง) */
  const daily = N<=16;
  let B = daily ? all.map(d=>({lbl:DW[new Date(d.key+"T00:00:00").getDay()],days:[d]})) : bucketize(all);
  if(!B.length) B=[{lbl:"-",days:[]}];
  const per = daily ? "" : " (เฉลี่ย/วัน)";
  const val = (b,fn)=>{const v=b.days.map(fn); return b.days.length>1 ? v.reduce((a,x)=>a+x,0)/b.days.length : v[0];};
  const html=stripSel().map(k=>{
    const r=STRIPM[k], goal=r.g()||1;
    const vals=B.map(b=>val(b,r.v)), mx=Math.max(goal,...vals)||1;
    const nz=all.map(r.v).filter(x=>x>0);
    const avg=nz.length?nz.reduce((a,b)=>a+b,0)/nz.length:0;
    return `<div class="wkrow">
      <div class="wkh"><b>${r.n}</b><span>เฉลี่ย <b style="color:${r.c}">${r.f(avg)}</b> ${r.u} · เป้า ${r.f(goal)}</span></div>
      <div class="wk" style="--wkn:${B.length}">${B.map((b,i)=>{
        const v=vals[i], h=Math.min(100,v/mx*100), last=i===B.length-1;
        return `<div class="wkc"><u>${B.length<=16?b.lbl:(i%Math.ceil(B.length/8)===0?b.lbl:"&nbsp;")}</u>
          <div class="wkb"><div class="goal" style="bottom:${Math.min(99,goal/mx*100)}%"></div>
          <i style="height:${h}%;background:${v?r.c:"transparent"};opacity:${last?1:.72}"></i></div></div>`}).join("")}</div>
    </div>`}).join("");
  const done=all.filter(x=>x.fd.length&&x.load>0&&x.sl).length;
  el("wkTitle").textContent=N+" วันล่าสุด";
  el("wkTag").textContent="ครบทั้ง 3 ด้าน "+done+"/"+N+" วัน";
  el("secWeek").innerHTML=html+`<div class="mini" style="margin-top:6px">เส้นประ = เป้าหมายต่อวัน · แท่งขวาสุดคือล่าสุด${per&&B[0].days.length?" · แท่งละ "+B[0].days.length+" วัน"+per:""}
    <br>อยากดูตัวอื่น (ไฟเบอร์ · น้ำตาล · Zone 2 · น้ำ · แอลกอฮอล์) กดปุ่ม ⚙️ ด้านบน</div>`;
}
function sortByTime(a){return arr(a).slice().sort((x,y)=>
  String(x.time||"99:99").localeCompare(String(y.time||"99:99")) || ((+x.ts||0)-(+y.ts||0)));}
function delta2(now,goal,unitTxt,moreIsBetter){
  const d=goal-now;
  if(moreIsBetter) return d>0
    ? `<span class="pill warn">ขาดอีก ${n1(d)} ${unitTxt}</span>`
    : `<span class="pill ok">ครบเป้าแล้ว ${d<0?"(เกิน "+n1(-d)+")":""}</span>`;
  return d>=0
    ? `<span class="pill ok">เหลืออีก ${n1(d)} ${unitTxt}</span>`
    : `<span class="pill bad">เกินมา ${n1(-d)} ${unitTxt}</span>`;
}

function render(){
  calcTdee(); clearDD(); saveLocal();
  const d=dayData(S.date), u=S.user, A=agg([d]);
  el("homeDate").textContent=thDate(S.date);
  const g=S.water[S.date]||0;
  const ev=sleepEval(d.sl);

  /* ---------- งบแคลอรี่วันนี้ ---------- */
  const budget = u.target - d.kIn + d.kOut;
  el("budget").innerHTML=`<div class="bud">
    <div><span>เป้าหมาย</span><b>${u.target.toLocaleString()}</b></div>
    <div class="op">−</div>
    <div><span>กินไป</span><b style="color:var(--food)">${d.kIn.toLocaleString()}</b></div>
    <div class="op">+</div>
    <div><span>เผาผลาญ</span><b style="color:var(--move)">${d.kOut.toLocaleString()}</b></div>
    <div class="op">=</div>
    <div class="res"><span>${budget>=0?"กินได้อีก":"เกินมา"}</span><b style="color:${budget>=0?"var(--move)":"var(--bad)"}">${Math.abs(budget).toLocaleString()}</b></div>
  </div>`;

  /* ---------- แถบรวม ---------- */
  el("dScore").textContent=A.score;
  {const c=2*Math.PI*42, v=Math.min(100,A.score)/100*c;
   el("scoreArc").setAttribute("stroke-dasharray",v+" "+(c-v));
   el("scoreArc").style.stroke=A.score>=75?"var(--move)":A.score>=50?"var(--food)":"var(--bad)";}
  el("dScore").style.color=A.score>=75?"var(--move)":A.score>=50?"var(--food)":"var(--bad)";
  /* ความยาวแถบ "อาหาร" ต้องเป็น "กินไปกี่ % ของเป้า" ไม่ใช่คะแนน
     ไม่งั้นเวลากินเกินเป้า แถบจะหดลง ซึ่งอ่านแล้วสวนความรู้สึกทันที
     เกินเป้าเมื่อไร แถบเต็มแล้วเปลี่ยนเป็นสีเตือน */
  const foodPct = u.target? Math.min(100, Math.round(d.kIn/u.target*100)) : 0;
  const foodCol = d.kIn>u.target ? "var(--bad)" : "var(--food)";
  el("dBars").innerHTML=[
    ["🍽️","อาหาร",A.sFood,d.kIn>u.target?`เกิน ${(d.kIn-u.target).toLocaleString()} kcal`:`เหลือ ${(u.target-d.kIn).toLocaleString()} kcal`,foodCol,foodPct],
    ["🏃","ออกกำลัง",A.sMove,d.load>=60?"ครบเป้าแล้ว ✓":`ขาด ${Math.max(0,Math.round(60-d.load))} โหลด`,"var(--move)"],
    /* เกณฑ์การนอนดูที่ "คะแนนคุณภาพ" ไม่ใช่จำนวนชั่วโมง — นอน 8 ชม. แต่ตื่น 5 ครั้งไม่ใช่การนอนที่ดี
       ชั่วโมงยังบอกไว้ข้าง ๆ เพราะเป็นตัวเลขที่คนคุ้นเคย */
    ["😴","นอน",A.sSleep,d.sl?`${A.sSleep}/100 · ${d.hours} ชม.${ev?"":" (ยังไม่ได้ใส่ระยะการนอน)"}`:"ยังไม่บันทึก","var(--sleep)"]
  ].map(b=>{ const w=Math.min(100,b[5]!==undefined?b[5]:b[2]);
    return `<div class="hb"><div class="l"><span>${b[0]} ${b[1]}</span><b style="color:${b[2]>=70?"var(--move)":b[2]>=40?"var(--food)":"var(--dim)"}">${b[3]}</b></div>
    <div class="bar"><i style="background:${b[4]};width:${w}%"></i></div></div>`}).join("");
  const miss=[!d.fd.length&&"อาหาร",!d.min&&"ออกกำลังกาย",!d.sl&&"การนอน"].filter(Boolean);
  el("dMsg").innerHTML = miss.length? `ยังไม่ได้บันทึก: <b>${miss.join(" · ")}</b>` : `บันทึกครบทั้ง 3 ด้านแล้ววันนี้ 🎉`;

  /* ---------- อาหาร ---------- */
  const left=u.target-d.kIn, unsat=n1(Math.max(0,d.ft-d.sat));
  /* โปรตีนต่อน้ำหนักตัว — ตัวเลขที่ใช้เทียบกับเกณฑ์สากลได้จริง */
  const gkg = u.w? n1(d.pr/u.w) : 0;

  /* อัตราส่วนโซเดียม:โพแทสเซียม — ตัวชี้วัดความดันที่ดีกว่าโซเดียมเดี่ยว ๆ */
  const ratio = naK(d.na,d.pot);

  setHTML(el("secFood"),`
    <div class="big"><b style="color:var(--food)">${d.kIn.toLocaleString()}</b><span>/ ${u.target.toLocaleString()} kcal</span></div>
    <div class="bar" style="height:11px;margin-top:9px"><i style="background:${left<0?"var(--bad)":"var(--food)"};width:${Math.min(100,d.kIn/u.target*100)}%"></i></div>
    <div class="remain">${left>=0?`เหลือกินได้อีก <b style="color:var(--move)">${left.toLocaleString()}</b> kcal`
      :`<b style="color:var(--bad)">เกินเป้ามา ${(-left).toLocaleString()}</b> kcal ≈ ต้องเดินเร็วเพิ่ม ${Math.round(-left/4)} นาที`}</div>

    ${nutSummary(d,u,g,ratio,gkg,unsat)}

    ${d.fd.length? subFold("homeMeals",`🍽️ ที่กินวันนี้ <span class="pill ok">${d.fd.length} รายการ</span>`, sortByTime(d.fd).map(x=>
      `<div class="meal"><div>${x.time?`<b style="color:var(--food)">${x.time}</b> `:""}${mealIcon(x.meal)} ${esc(x.name)}
        <small style="display:block;color:var(--dim);font-size:11px">${x.qty} × ${esc(unitOf(x))} · P${n1(x.protein)} C${n1(x.carb)} F${n1(x.fat)}${x.sodium>=700?` · <span style="color:var(--bad)">🧂 ${x.sodium}</span>`:x.sodium?` · 🧂 ${x.sodium}`:""}</small></div>
      <b style="color:var(--food);white-space:nowrap">${x.kcal} kcal</b></div>`).join(""), d.fd.length<=4) : ""}
    ${d.fd.length?"":`<div class="empty" style="margin-top:12px">ยังไม่ได้บันทึกอาหาร</div>`}`);

  /* ---------- ออกกำลังกาย ---------- */
  const zTot=[1,2,3,4,5].map(z=>d.ex.reduce((a,x)=>a+(+x["z"+z]||0),0));
  const zSum=zTot.reduce((a,b)=>a+b,0);
  const cMin=d.ex.reduce((a,x)=>a+(+x.min||0),0), cKcal=d.ex.reduce((a,x)=>a+(+x.kcal||0),0);
  const cLoad=d.ex.reduce((a,x)=>a+(+x.load||0),0), wLoad=Math.round(d.load-cLoad);
  const hrAvg=cMin? Math.round(d.ex.reduce((a,x)=>a+(+x.hr||0)*(+x.min||0),0)/cMin) : 0;
  const pctAvg=cMin? Math.round(d.ex.reduce((a,x)=>a+(+x.pct||0)*(+x.min||0),0)/cMin) : 0;
  const mainZ=zSum? ZONES[zTot.indexOf(Math.max(...zTot))] : null;
  const wSets=d.wo.reduce((a,b)=>a+b.sets.length,0);
  const adv=woAdvice(d.wo), wk=weekAnalysis(), P7=polar(7);
  if(el("mvPolar")) setHTML(el("mvPolar"),polarHTML(P7,true,"-mv"));
  setHTML(el("secMove"),`
    <div class="big"><b style="color:var(--move)">${Math.round(d.load)}</b><span>/ 60 โหลดการฝึกรวม</span></div>
    <div class="bar" style="height:10px;margin-top:9px"><i style="background:var(--move);width:${Math.min(100,d.load/60*100)}%"></i></div>
    <div class="remain">${d.load>=60?`<b style="color:var(--move)">ถึงเป้าวันนี้แล้ว</b> 💪`
      :`ขาดอีก <b style="color:var(--food)">${Math.round(60-d.load)}</b> โหลด ≈ เดินเร็ว ${Math.ceil((60-d.load)/2)} นาที หรือวิ่ง ${Math.ceil((60-d.load)/4)} นาที`}</div>
    <div class="mini" style="margin-top:6px">คาร์ดิโอ ${Math.round(cLoad)} + เวท ${wLoad}
      <small style="display:block;margin-top:2px">คาร์ดิโอ = นาที × ความหนัก (โซน 1–5) · เวท = เซ็ต × 3 + นาที × 0.8</small></div>

    ${subFold("mvCardio",`🏃 คาร์ดิโอ ${cMin?`<span class="pill ${pctAvg>=85?"bad":pctAvg>=70?"warn":"ok"}">${cMin} นาที · ${pctAvg}% HRmax</span>`:`<span class="pill warn">ยังไม่ได้ทำ</span>`}`,`
      ${cMin? `<div class="stat">
        <div class="s"><span>เวลา</span><b style="color:var(--move)">${cMin}</b><span>นาที · ${cKcal} kcal</span></div>
        <div class="s"><span>HR เฉลี่ย</span><b style="color:var(--acc)">${hrAvg||"–"}</b><span>bpm${mainZ?` · ส่วนใหญ่ ${mainZ[1]}`:""}</span></div>
      </div>
      ${zSum?`<div class="stg" style="margin-top:11px">${ZONES.map((z,idx)=>`<i style="background:${z[4]};width:${zTot[idx]/zSum*100}%"></i>`).join("")}</div>
        <div class="stglg">${ZONES.map((z,idx)=>zTot[idx]?`<span><i style="background:${z[4]}"></i>${z[1]} ${zTot[idx]}น.</span>`:"").join("")}</div>`:""}
      ${d.ex.map(x=>`<div class="meal"><div>${esc(x.type)}<small style="display:block;color:var(--dim);font-size:11px">${x.min} นาที${x.km?" · "+x.km+" กม.":""}${x.hr?" · HR ~"+x.hr:""}${x.fat?" · ไขมัน "+x.fat+"%":""}</small></div><b style="color:var(--move)">${x.kcal} kcal</b></div>`).join("")}`
      : `<div class="mini">วันนี้ยังไม่มีคาร์ดิโอ</div>`}`, !!cMin)}

    ${subFold("mvPolar",`🫀 Zone 2 &amp; 80/20 <span class="pill ${P7.pGoal>=100?"ok":"warn"}">7 วัน · ${P7.pGoal>=100?"ครบโดส":"ยังไม่ครบ"}</span>`, polarMini(P7))}

    ${subFold("mvWo",`🏋️ เวทเทรนนิ่ง ${d.wo.length?`<span class="pill ok">${d.wo.length} ท่า · ${wSets} เซ็ต</span>`:`<span class="pill warn">ยังไม่ได้ทำ</span>`}`,`
      ${d.wo.length? `<div class="stat">
        <div class="s"><span>ปริมาณรวม</span><b style="color:var(--move)">${Math.round(d.vol).toLocaleString()}</b><span>กก.·ครั้ง</span></div>
        <div class="s"><span>กลุ่มที่เล่น</span><b style="font-size:15px">${esc([...new Set(d.wo.map(x=>x.group))].join(" · "))}</b><span>&nbsp;</span></div>
      </div>
      ${d.wo.map(x=>`<div class="meal"><div style="display:flex;gap:8px;align-items:center"><div class="exi">${icon(exInfo(x.ex).pat,"#4ade80")}</div>
        <div>${esc(x.ex)}<small style="display:block;color:var(--dim);font-size:11px">${x.sets.map(y=>y[0]+"×"+y[1]).join(", ")}</small></div></div>
        <b style="color:var(--move)">${Math.round(x.vol)}</b></div>`).join("")}
      ${adv.length?`<div style="margin-top:10px">${adv.map(a=>`<div class="ins"><div>${a[0]}</div><div>${a[1]}</div></div>`).join("")}</div>`:""}`
      : `<div class="mini">วันนี้ยังไม่ได้เล่นเวท</div>`}`, d.wo.length>0)}

    ${subFold("mvWeek","📅 ภาพรวม 7 วันล่าสุด",
      wk.map(a=>`<div class="ins"><div>${a[0]}</div><div>${a[1]}</div></div>`).join(""))}`);

  /* ---------- การนอน ---------- */
  /* หัวการ์ดการนอนวัดที่ "คะแนนคุณภาพ" เมื่อมีระยะการนอน — ชั่วโมงอย่างเดียวบอกไม่ได้ว่านอนดีไหม
     ถ้ายังไม่ได้ใส่ระยะ ก็กลับไปวัดด้วยชั่วโมงตามเดิม */
  const slc = ev? (ev.score>=80?"var(--move)":ev.score>=65?"var(--food)":"var(--bad)") : "var(--sleep)";
  setHTML(el("secSleep"), d.sl? `
    <div class="big"><b style="color:${slc}">${ev?ev.score:d.hours}</b><span>${ev?`/ 100 คะแนน · หลับจริง ${d.hours} ชม.`:`ชม. · ${d.sl.bed} → ${d.sl.wake}`}</span></div>
    <div class="bar" style="height:10px;margin-top:9px"><i style="background:${slc};width:${Math.min(100,ev?ev.score:d.hours/8*100)}%"></i></div>
    <div class="remain">${ev?`${ev.msg}<br>`:""}${
      d.hours<7?`ขาดอีก <b style="color:var(--food)">${n1(7-d.hours)}</b> ชม. ถึงเกณฑ์ต่ำสุด (7 ชม.)`
      : d.hours>9?`นานกว่าเกณฑ์ ${n1(d.hours-9)} ชม.`:`<b style="color:var(--move)">อยู่ในเกณฑ์ 7–9 ชม.</b> ✅`}</div>
    ${ev? `<div class="stat" style="margin-top:13px">
        <div class="s"><span>ชั่วโมงที่หลับจริง</span><b style="color:${d.hours>=7&&d.hours<=9?"var(--move)":"var(--food)"}">${d.hours}</b><span>ชม. (เกณฑ์ 7–9)</span></div>
        <div class="s"><span>ประสิทธิภาพ</span><b style="color:${effCol(ev.eff)}">${ev.eff}</b><span>% (เกณฑ์ ≥85)</span></div>
      </div>${sleepHead(ev)}
      ${subFold("slStages",`🌙 ระยะการนอนแต่ละช่วง <span class="pill ${ev.grades.filter(x=>x.st!=="ok").length?"warn":"ok"}">${ev.grades.filter(x=>x.st==="ok").length}/${ev.grades.length} อยู่ในเกณฑ์</span>`,
        stageBar(ev)+stageGrades(ev)+`<div class="mini" style="margin-top:9px">${ev.msg}</div>`)}`
      : `<div class="mini" style="margin-top:10px">ยังไม่ได้ใส่ระยะการนอน — ใส่ที่แท็บ 😴 นอน แล้วระบบจะให้คะแนนคุณภาพอัตโนมัติ</div>`}`
    : `<div class="empty">ยังไม่ได้บันทึกการนอน</div>`);

  /* ---------- ร่างกาย ---------- */
  const bArr=bodySorted(), wArr=bArr.filter(x=>x.w>0), lw=wArr[wArr.length-1];
  const trend=wArr.length?ma7(wArr,wArr.length-1):null, prev=wArr.length>1?ma7(wArr,wArr.length-2):null;
  const waistA=bArr.filter(x=>x.waist>0), lwa=waistA[waistA.length-1];
  el("secBody").innerHTML = lw? `<div class="stat">
      <div class="s"><span>น้ำหนักล่าสุด</span><b>${n1(lw.w)}</b><span>กก. · ${thShort(lw.date)}</span></div>
      <div class="s"><span>เฉลี่ย 7 วัน</span><b style="color:var(--acc)">${trend}</b>
        <span>${prev?(trend>prev?"▲ +":"▼ ")+n1(trend-prev)+" กก.":"กก."}</span></div>
      ${lwa?`<div class="s"><span>รอบเอว</span><b>${lwa.waist}</b><span>ซม. · ${thShort(lwa.date)}</span></div>`:""}
      <div class="s"><span>รูป progress</span><b>${S.photo.length}</b><span>รูป</span></div>
    </div><div class="mini" style="margin-top:9px">ดูกราฟและสถิติทั้งหมดที่ปุ่ม 📊 ย้อนหลัง &amp; สถิติ ด้านบน</div>`
    : `<div class="empty">ยังไม่มีข้อมูลร่างกาย — บันทึกที่แท็บ ⚖️ ร่างกาย</div>`;

  /* ---------- รายการในแท็บอื่น ---------- */
  {const R=readiness();
   el("readyCard").style.display=R?"block":"none";
   if(R){
     el("secReady").innerHTML=`
      <div style="display:flex;align-items:center;gap:14px">
        <div class="hscore"><svg viewBox="0 0 100 100"><circle class="rbg2" cx="50" cy="50" r="42"/>
          <circle class="rfg2" cx="50" cy="50" r="42" style="stroke:${R.verdict[2]};stroke-dasharray:${(Math.min(100,R.score)/100*2*Math.PI*42).toFixed(1)} 999"/></svg>
          <div class="hsin"><b>${R.score}</b><span>/100</span></div></div>
        <div style="flex:1"><b style="font-size:17px;color:${R.verdict[2]}">${R.verdict[0]}</b>
          <div class="mini" style="margin-top:5px">${R.verdict[1]}</div></div>
      </div>
      ${R.flags.map(x=>`<div class="mini" style="margin-top:9px;color:var(--food)">⚠️ ${x}</div>`).join("")}
      <details class="fold" data-fold="rdetail"><summary>ตัวชี้วัด ${R.filled}/${R.total}<span class="fn">ฉุดสุด: ${esc(R.weak.k)}</span></summary>
      <div class="foldc"><div style="margin-top:4px">${R.f.map(x=>x.v===null
        ? `<div class="fbar" style="opacity:.55">
             <span style="flex:1">${x.k}<small style="display:block;color:var(--dim);font-size:11.5px">${x.txt}</small></span>
             <span class="fb2"></span><b style="width:32px;text-align:right;color:var(--dim);font-size:13px">—</b></div>`
        : `<div class="fbar">
             <span style="flex:1">${x.k}<small style="display:block;color:var(--dim);font-size:11.5px">${x.txt}</small></span>
             <span class="fb2"><i style="width:${x.v}%;background:${x.v>=75?"var(--move)":x.v>=50?"var(--food)":"var(--bad)"}"></i></span>
             <b style="width:32px;text-align:right">${x.v}</b></div>`).join("")}</div>
      <div class="mini" style="margin-top:9px">แก้ที่ <b>${esc(R.weak.k)}</b> คะแนนจะขึ้นเร็วสุด</div>
      </div></details>`;
     rdDraw();
   }}

  {const t=adaptiveTDEE();
   if(t && t.suspect){
     el("tdeeCard").style.display="block";
     el("secTdee").innerHTML=`<div class="warn" style="margin:0">⚠️ <b>ตัวเลขที่คำนวณได้ (${t.real.toLocaleString()} kcal/วัน) ดูไม่สมเหตุสมผล</b>
       — น่าจะบันทึกอาหารไม่ครบทุกมื้อ (เฉลี่ยที่บันทึก ${t.avgIn.toLocaleString()} kcal/วัน แต่น้ำหนัก ${t.dW>0?"+":""}${t.dW} กก.)
       <br>ระบบจึง<b>ไม่เอาตัวเลขนี้มาตั้งเป้า</b> — ลองบันทึกอาหารให้ครบทุกมื้อสัก 2–3 สัปดาห์แล้วค่าจะเข้าที่เอง</div>`;
   } else if(t && t.real){
     const diff=t.real-t.formula;
     el("tdeeCard").style.display="block";
     el("secTdee").innerHTML=`
      <div class="big"><b style="color:#8b5cf6">${t.real.toLocaleString()}</b><span>kcal/วัน (คำนวณจากข้อมูลจริง)</span></div>
      <div class="mini" style="margin-top:7px">จาก ${t.days} วันที่บันทึกอาหาร (เฉลี่ย ${t.avgIn.toLocaleString()} kcal)
        และน้ำหนัก ${t.dW>0?"+":""}${t.dW} กก. ใน ${t.span} วัน</div>
      <div class="stat" style="margin-top:12px">
        <div class="s"><span>สูตรคำนวณบอกว่า</span><b>${t.formula.toLocaleString()}</b><span>kcal</span></div>
        <div class="s"><span>ต่างจากของจริง</span><b style="color:${Math.abs(diff)>200?"var(--food)":"var(--move)"}">${diff>0?"+":""}${diff.toLocaleString()}</b><span>kcal</span></div>
      </div>
      ${Math.abs(diff)>150 && +u.tdeeReal!==t.real
        ? `<button class="btn" onclick="applyRealTdee()">ใช้ตัวเลขจริงนี้ตั้งเป้าหมาย (${(t.real+ +u.goal).toLocaleString()} kcal/วัน)</button>`
        : `<div class="mini" style="margin-top:10px">✅ เป้าหมายตอนนี้สอดคล้องกับข้อมูลจริงแล้ว</div>`}
      ${+u.tdeeReal>0?`<button class="btn ghost" onclick="clearRealTdee()">กลับไปใช้สูตรคำนวณ</button>`:""}
      <div class="mini" style="margin-top:9px">หลักการเดียวกับที่แอปอย่าง MacroFactor ใช้ — เชื่อน้ำหนักจริงมากกว่าสูตร เพราะร่างกายแต่ละคนเผาผลาญไม่เท่ากันและปรับตัวเมื่อลดน้ำหนัก</div>`;
   } else if(t && t.need){
     /* โชว์เงื่อนไขทั้งชุดพร้อมกัน — ของเดิมบอกทีละข้อ ผู้ใช้เลยไม่รู้ว่ายังขาดอะไรอีก
        และไม่รู้ด้วยว่าทำไมต้องชั่งน้ำหนัก จึงอธิบายหลักการไว้ตรงนี้เลย */
     el("tdeeCard").style.display="block";
     el("secTdee").innerHTML=`
      <div class="mini">TDEE จริงคิดย้อนจาก <b>ที่กินเข้าไป</b> เทียบกับ <b>น้ำหนักที่ขยับ</b>
        — ต้องมีครบทั้งสองอย่าง ขาดอย่างใดอย่างหนึ่งคำนวณไม่ได้เลย</div>
      <div style="margin-top:11px">${t.need.map(x=>`
        <div class="fbar" style="opacity:${x.ok?1:.7}">
          <span style="flex:1">${x.ok?"✅":"⬜️"} ${x.t}
            <small style="display:block;color:var(--dim);font-size:11.5px">${x.now}</small></span>
        </div>`).join("")}</div>
      <div class="lastbox">ระหว่างนี้แอปใช้ <b>สูตรคำนวณ ${(+u.tdee||0).toLocaleString()} kcal/วัน</b> ตั้งเป้าให้ก่อน
        ซึ่งใช้ได้อยู่แล้ว — ตัวเลขจากข้อมูลจริงจะมาแทนที่เมื่อครบเงื่อนไขข้างบน</div>`;
   } else el("tdeeCard").style.display="none";}

  renderFav(); renderMyFood(); waterShow(); backupInfo();
  foldCount("exList",d.ex.length,"รายการ");
  el("exList").innerHTML=d.ex.length?d.ex.map(x=>row(
    `${esc(x.type)} ${x.intensity?`<span class="tag">${esc(x.intensity)}</span>`:""}`,
    `${x.min} นาที${x.km?" · "+x.km+" กม.":""}${x.hr?" · HR "+x.hr:""}${x.pct?" · "+x.pct+"% HRmax":""}${x.load?" · โหลด "+x.load:""}${x.note?" · "+esc(x.note):""}`,
    `<span style="color:var(--move)">${x.kcal}</span><small style="display:block;color:var(--dim);font-weight:400">kcal</small>`,
    "ex",x.ts)).join(""):`<div class="empty">ยังไม่มีบันทึก</div>`;
  /* บรรทัดละเอียดของแต่ละมื้อ — ใช้ตัวเลขชุดเดียวกับยอดรวมของวัน (nutRow)
     ค่าที่เป็นการประมาณจากชนิดอาหารจะมีเครื่องหมาย ~ กำกับ ไม่ปนกับค่าที่วัดมาจริง */
  let anyEst=false;
  el("fList").innerHTML=d.fd.length?sortByTime(d.fd).map(x=>{
    const nr=nutRow(x), e=k=>{const est=nr.src[k]==="est"; if(est)anyEst=true; return est?"~":"";};
    const chip=(ic,lab,txt)=>`<span class="nch">${ic} ${lab?lab+" ":""}${txt}</span>`;
    const sodiumHot = nr.sodium>=700;
    if(!nr.potLab) anyEst=true;
    /* ทุกค่าเป็นชิปไอคอนชุดเดียวกันหมด — ใช้ไอคอนเดียวกับตารางสารอาหารหน้าสรุป
       (🍗 โปรตีน · 🍚 คาร์บ · 🥑 ไขมัน) จะได้จำง่าย ไม่ต้องแปลตัวย่อ */
    return row(
      `${x.time?`<b style="color:var(--food)">${x.time}</b> `:""}${esc(x.name)} <span class="tag">${mealIcon(x.meal)} ${esc(x.meal||"")}</span>`,
      `${x.qty} × ${esc(unitOf(x))}
       <span class="nchs">${
         chip("🍗","",`${n1(x.protein)} ก.`)+
         chip("🍚","",`${n1(x.carb)} ก.`)+
         chip("🥑","",`${n1(x.fat)} ก.`)+
         chip("🥦","",`${e("fiber")}${n1(nr.fiber)} ก.`)+
         `<span class="nch"${sodiumHot?' style="color:var(--bad)"':''}>🧂 ${e("sodium")}${Math.round(nr.sodium).toLocaleString()} มก.</span>`+
         chip("🧈","",`${e("sat")}${n1(nr.sat)} ก.`)+
         chip("🍬","",`${e("sugar")}${n1(nr.sugar)} ก.`)+
         chip("🍌","",`${nr.potLab?"":"~"}${nr.pot.toLocaleString()} มก.`)+
         (nr.alc?chip("🍺","",`${n1(nr.alc)} ก.`):"")+
         (nr.broth<1?`<span class="nch" style="color:var(--move)">🥣 ${nr.broth<=0.5?"ไม่ซดน้ำ":"ซดน้ำบ้าง"}</span>`:"")}</span>`,
      `<span style="color:var(--food)">${x.kcal}</span>`,"food",x.ts,true);
  }).join(""):`<div class="empty">ยังไม่มีบันทึก</div>`;
  el("fListNote").innerHTML = d.fd.length
    ? `<div class="mini" style="margin-top:9px;line-height:1.7">🍗 โปรตีน · 🍚 คาร์บ · 🥑 ไขมัน · 🥦 ใยอาหาร · 🧂 โซเดียม · 🧈 ไขมันอิ่มตัว · 🍬 น้ำตาล · 🍌 โพแทสเซียม${
        anyEst?`<br>~ = ค่าประมาณจากชนิดอาหาร (เมนูนั้นยังไม่มีค่าจริงในฐานข้อมูล) · ตัวเลขที่ไม่มี ~ คือค่าจริง`:""}</div>` : "";
  setTimeout(()=>{ try{ foldify(); tpInit(); fitTimeInputs(); }catch(e){} },0);   /* การ์ดที่วาดใหม่ต้องผูกกล่องพับและวัดช่องเวลาด้วย */
  foldCount("fList",d.fd.length,"รายการ");
  foldCount("sList",d.sl?1:0,"รายการ");
  el("sList").innerHTML=d.sl?row(`${d.sl.bed} → ${d.sl.wake}`,
    `${ev?"คะแนน "+ev.score+"/100 · ประสิทธิภาพ "+ev.eff+"% · หลับลึก "+ev.pct.deep+"% · REM "+ev.pct.rem+"%"+(ev.wakeups?" · ตื่น "+ev.wakeups+" ครั้ง":""):"ยังไม่ได้ใส่ระยะการนอน"}${d.sl.note?" · "+esc(d.sl.note):""}`,
    `<span style="color:var(--sleep)">${d.hours}</span><small style="display:block;color:var(--dim);font-weight:400">ชม.</small>`,"sleep",d.sl.ts)
    :`<div class="empty">ยังไม่มีบันทึก</div>`;
}
function row(title,sub,val,kind,ts,canEdit){
  return `<div class="item"><div class="m">${title}<small>${sub}</small></div><div class="v">${val}</div>
  ${canEdit?`<button class="edt" title="แก้ไข" onclick="editFood(${ts})">✎</button>`:""}
  <button class="del" onclick="del('${kind}',${ts})">✕</button></div>`;
}
async function del(kind,ts){
  if(!confirm("ลบรายการนี้?"))return;
  if(kind==="ex")S.ex=S.ex.filter(x=>x.ts!=ts);
  if(kind==="food")S.food=S.food.filter(x=>x.ts!=ts);
  if(kind==="sleep")S.sleep=S.sleep.filter(x=>x.ts!=ts);
  if(kind==="wo"){S.wo=S.wo.filter(x=>x.ts!=ts);renderWo();drawProg();}
  const sheet={ex:"Exercise",food:"Food",sleep:"Sleep",wo:"Workout"}[kind];
  saveNow(); render(); if(kind==="sleep") sleepFill();
  await api({action:"del",sheet:sheet,ts:ts});
}
function thDate(s){
  const [y,m,d]=String(s||"").split("-").map(Number);
  if(!d||isNaN(d)) return String(s||"-");
  const W=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสฯ","ศุกร์","เสาร์"];
  const dt=new Date(y,m-1,d);
  return `${W[dt.getDay()]} ${p2(d)}/${p2(m)}/${y+543}`;
}

/* ---------- กราฟ ---------- */
el("rangeChips").onclick=e=>{const c=e.target.closest(".chip");if(!c)return;
  el("rangeChips").querySelectorAll(".chip").forEach(x=>x.classList.remove("on"));c.classList.add("on");
  S.range=(c.dataset.d==="ytd"||c.dataset.d==="all")?c.dataset.d:+c.dataset.d;drawCharts();};
function firstDate(){
  const all=[...S.food,...S.ex,...S.sleep,...S.wo,...S.body,...Object.keys(S.water).map(d=>({date:d}))]
    .map(x=>x.date).filter(Boolean).sort();
  return all.length?all[0]:S.date;
}
function dayDiff(a,b){return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000);}
function rangeN(){
  let n;
  if(S.range==="ytd")      n=dayDiff(S.date.slice(0,4)+"-01-01",S.date)+1;
  else if(S.range==="all") n=Math.min(1095,dayDiff(firstDate(),S.date)+1);
  else                     n=+S.range;
  return (isFinite(n)&&n>=7) ? Math.round(n) : 30;      /* ข้อมูลวันที่เพี้ยนก็ต้องไม่พังทั้งหน้า */
}
function bucketize(days){
  const n=days.length, size = n<=45?1 : n<=210?7 : 30;
  if(size===1) return days.map(d=>({lbl:thTiny(d.key),days:[d]}));
  const out=[];
  for(let i=0;i<n;i+=size){
    const g=days.slice(i,i+size), [y,m]=g[0].key.split("-");
    out.push({lbl: size===7? thTiny(g[0].key) : (+m)+"/"+String(+y+543).slice(-2), days:g});
  }
  return out;
}
function bAvg(b,f){const v=b.days.map(f).filter(x=>x!==null&&x!==undefined);
  return v.length?Math.round(v.reduce((a,c)=>a+c,0)/v.length*10)/10:0;}
function bAvgNZ(b,f){const v=b.days.map(f).filter(x=>x>0);
  return v.length?Math.round(v.reduce((a,c)=>a+c,0)/v.length*10)/10:null;}
function thTiny(k){const [y,m,d]=String(k||"").split("-"); return d? (+d)+"/"+(+m) : "-";}   // แกนกราฟ — สั้นสุด

function shiftDate(base,off){
  const dt=new Date(base+"T00:00:00"); dt.setDate(dt.getDate()+off);
  return dt.getFullYear()+"-"+p2(dt.getMonth()+1)+"-"+p2(dt.getDate());
}
function period(endDate,n){
  const a=[];
  for(let i=n-1;i>=0;i--){const k=shiftDate(endDate,-i);const d=dayData(k);d.key=k;a.push(d);}
  return a;
}
function foodScore(kIn){
  const off=Math.abs(kIn-S.user.target)/S.user.target;   // ห่างจากเป้ากี่ %
  return Math.max(0,Math.round(100-Math.max(0,off-0.10)*150));  // ±10% ถือว่าเต็ม
}
/* คะแนนอาหารของ "วันที่ยังไม่จบ" — ห้ามตัดสินว่ากินน้อยไป เพราะยังกินต่อได้อีกทั้งวัน
   เช้า 11 โมง กินไป 379 จากเป้า 2,671 สูตรข้างบนจะได้ 0 คะแนน แถบเลยนิ่งสนิท
   ทั้งที่ความจริงคือ "เพิ่งเริ่มวัน" ไม่ใช่ "วันนี้พัง"
   วันนี้จึงวัดเป็น "เดินไปถึงไหนแล้ว" (กินไป ÷ เป้า) แถบจะขยับทุกครั้งที่บันทึก
   ส่วนกินเกินเป้ายังหักคะแนนเหมือนเดิม เพราะกินไปแล้วเอาคืนไม่ได้ ต่างจากกินยังไม่ครบ
   พอถึงวันรุ่งขึ้น วันนั้นก็กลับไปใช้เกณฑ์ "เข้าใกล้เป้าแค่ไหน" ตามปกติ */
function foodScoreDay(kIn,dateKey){
  const t=S.user.target||1;
  if(dateKey!==today() || kIn>t*1.10) return foodScore(kIn);
  return Math.max(0,Math.min(100,Math.round(kIn/t*100)));
}
function agg(days){
  const n=days.length,u=S.user;
  const fdDays=days.filter(d=>d.kIn>0), slDays=days.filter(d=>d.hours>0), exDays=days.filter(d=>d.min>0);
  const sum=k=>days.reduce((a,b)=>a+b[k],0);
  const o={n:n,
    kIn:sum("kIn"), kOut:sum("kOut"), min:sum("min"), pr:sum("pr"), cb:sum("cb"), ft:sum("ft"), fb:sum("fb"), na:sum("na"), sat:sum("sat"), sug:sum("sug"), alc:sum("alc"), pot:sum("pot"),
    avgSat: fdDays.length?n1(sum("sat")/fdDays.length):0,
    avgPot: fdDays.length?Math.round(sum("pot")/fdDays.length):0,
    avgCb : fdDays.length?Math.round(sum("cb")/fdDays.length):0,
    avgFt : fdDays.length?Math.round(sum("ft")/fdDays.length):0,
    avgAlc: fdDays.length?n1(sum("alc")/fdDays.length):0,
    avgIn: fdDays.length?Math.round(sum("kIn")/fdDays.length):0,
    avgOut: Math.round(sum("kOut")/n),
    avgMin: Math.round(sum("min")/n),
    avgPr: fdDays.length?Math.round(sum("pr")/fdDays.length):0,
    avgNa: fdDays.length?Math.round(sum("na")/fdDays.length):0,
    avgSug: fdDays.length?Math.round(sum("sug")/fdDays.length):0,
    avgFb: fdDays.length?Math.round(sum("fb")/fdDays.length):0,
    avgSleep: slDays.length?n1(slDays.reduce((a,b)=>a+b.hours,0)/slDays.length):0,
    exDays:exDays.length, fdDays:fdDays.length, slDays:slDays.length,
    vol: days.reduce((a,b)=>a+b.vol,0),
    woDays: days.filter(d=>d.wo.length>0).length,
    water: days.reduce((a,b)=>a+(S.water[b.key]||0),0)
  };
  o.avgWater = Math.round(o.water/n);
  // คะแนน 3 ด้าน
  o.load = days.reduce((a,d)=>a+d.load,0);
  o.sMove = Math.min(100, Math.round(o.load/(n*60)*100));   // เป้าโหลด 60/วัน
  o.sFood = fdDays.length ? Math.round(fdDays.reduce((a,d)=>a+foodScoreDay(d.kIn,d.key),0)/fdDays.length) : 0;
  /* คะแนนนอน: ถ้ากรอกระยะการนอนไว้ ใช้คะแนนคุณภาพเต็มรูปแบบ (ระยะหลับ + ประสิทธิภาพ + จำนวนครั้งที่ตื่น)
     ถ้ามีแค่เวลาเข้า–ออกนอน ก็ยังให้คะแนนจากจำนวนชั่วโมงเหมือนเดิม จะได้ไม่ลงโทษคนที่ไม่มีนาฬิกาวัด */
  o.sSleep = slDays.length ? Math.round(slDays.reduce((a,d)=>{
      const e=sleepEval(d.sl);
      return a + (e ? e.score : (d.hours>=7&&d.hours<=9?100:Math.max(0,100-Math.abs(d.hours-8)*18)));
    },0)/slDays.length) : 0;
  o.slQual = slDays.filter(d=>sleepEval(d.sl)).length;   /* กี่วันที่ใช้คะแนนคุณภาพเต็ม */
  o.score = Math.round((o.sMove+o.sFood+o.sSleep)/3);
  return o;
}
/* วันแรกที่มีบันทึกอะไรก็ได้ — ใช้เป็นขอบล่างของสตรีค
   ไม่งั้นสตรีคแบบ "ไม่ได้ทำอะไร" (เช่น ไม่ดื่มเหล้า) จะนับวันที่ยังไม่ได้ใช้แอปไปด้วย */
function firstDay(){
  if(_first!==null) return _first;
  let m="";
  const scan=a=>arr(a).forEach(x=>{ if(okDate(x) && (!m||x.date<m)) m=x.date; });
  scan(S.food); scan(S.ex); scan(S.wo); scan(S.sleep); scan(S.body);
  Object.keys(S.water&&typeof S.water==="object"?S.water:{})
    .forEach(k=>{ if(DATE_RE.test(k) && (!m||k<m)) m=k; });
  return _first=m;
}
/* จำนวนวันที่ใช้แอปมาแล้ว นับจากบันทึกแรกถึงวันที่กำลังดูอยู่ */
function histDays(){
  const first=firstDay();
  if(!first || first>S.date) return 0;
  const ms=new Date(S.date+"T00:00:00")-new Date(first+"T00:00:00");
  return Math.round(ms/86400000)+1;
}
function streak(test){
  const first=firstDay();
  if(!first) return 0;                   // ยังไม่เคยบันทึกอะไรเลย = ยังไม่มีสตรีค
  let c=0;
  for(let i=0;i<400;i++){
    const key=shiftDate(S.date,-i);
    if(key<first) break;                 // ย้อนเลยวันแรกที่เริ่มใช้แอปไปแล้ว หยุดนับ
    const d=dayData(key);
    if(i===0 && !test(d)) continue;      // วันนี้ยังไม่บันทึกก็ไม่ตัดสตรีค
    if(test(d)) c++; else break;
  }
  return c;
}
function delta(now,prev,higherBetter){
  if(!prev) return `<em class="flat">— ไม่มีข้อมูลเทียบ</em>`;
  const d=now-prev, pc=Math.round(d/prev*100);
  if(Math.abs(pc)<2) return `<em class="flat">≈ เท่าเดิม</em>`;
  const good = higherBetter===null ? null : (d>0)===higherBetter;
  const cls = good===null?"flat":good?"up":"down";
  return `<em class="${cls}">${d>0?"▲":"▼"} ${Math.abs(pc)}%</em>`;
}

function drawCharts(){
  const N=rangeN();
  const days=period(S.date,N), prev=period(shiftDate(S.date,-N),N);
  const A=agg(days), P=agg(prev), u=S.user;

  /* ---- วงแหวน 3 ด้าน ---- */
  [["r1",A.sMove,82],["r2",A.sFood,64],["r3",A.sSleep,46]].forEach(([id,pct,r])=>{
    const c=2*Math.PI*r, v=Math.min(100,pct)/100*c;
    el(id).setAttribute("stroke-dasharray",v+" "+(c-v));
  });
  el("scoreN").textContent=A.score;
  el("scoreN").style.color=A.score>=75?"var(--move)":A.score>=50?"var(--food)":"var(--bad)";
  el("lgMove").textContent=A.sMove+"%"; el("lgFood").textContent=A.sFood+"%"; el("lgSleep").textContent=A.sSleep+"%";
  const weak=[["ออกกำลังกาย",A.sMove],["การกิน",A.sFood],["การนอน",A.sSleep]].sort((a,b)=>a[1]-b[1])[0];
  el("scoreTxt").innerHTML = A.score>=80?`ภาพรวม <b style="color:var(--move)">ดีมาก</b> ทำต่อเนื่องแบบนี้เลย 💪`
    : A.score>=60?`ภาพรวม <b style="color:var(--move)">ค่อนข้างดี</b> จุดที่ควรดันเพิ่มคือ <b>${weak[0]}</b>`
    : A.score>=40?`ภาพรวม <b style="color:var(--food)">พอใช้</b> โฟกัสที่ <b>${weak[0]}</b> ก่อนเป็นอันดับแรก`
    : `ยังบันทึกน้อยหรือยังไม่เข้าเป้า — เริ่มจาก <b>${weak[0]}</b> ก่อนก็ได้`;

  /* ---- KPI ----
     โชว์ 6 ตัวหลักพอ ที่เหลือพับไว้ — กำแพงตัวเลข 14 ช่องอ่านแล้วไม่รู้จะมองตรงไหนก่อน */
  el("cmpLbl").textContent="เทียบ "+N+" วันก่อนหน้า";
  const KPIS=[
    ["กินเฉลี่ย/วัน",A.avgIn+" <small style='font-size:11px;color:#8b97ad'>kcal</small>",delta(A.avgIn,P.avgIn,null),"var(--food)"],
    ["เผาผลาญรวม",A.kOut+" <small style='font-size:11px;color:#8b97ad'>kcal</small>",delta(A.kOut,P.kOut,true),"var(--move)"],
    ["โหลดการฝึกรวม",Math.round(A.load)+" <small style='font-size:11px;color:#8b97ad'>หน่วย</small>",delta(A.load,P.load,true),"var(--move)"],
    ["ออกกำลังรวม",A.min+" <small style='font-size:11px;color:#8b97ad'>นาที</small>",delta(A.min,P.min,true),"var(--move)"],
    ["วันที่ออกกำลัง",A.exDays+" <small style='font-size:11px;color:#8b97ad'>/"+A.n+" วัน</small>",delta(A.exDays,P.exDays,true),"var(--move)"],
    ["นอนเฉลี่ย",A.avgSleep+" <small style='font-size:11px;color:#8b97ad'>ชม.</small>",delta(A.avgSleep,P.avgSleep,true),"var(--sleep)"],
    ["คืนที่บันทึก",A.slDays+" <small style='font-size:11px;color:#8b97ad'>/"+A.n+" คืน</small>",delta(A.slDays,P.slDays,true),"var(--sleep)"],
    ["โปรตีนเฉลี่ย",A.avgPr+" <small style='font-size:11px;color:#8b97ad'>/"+u.pGoal+" ก.</small>",delta(A.avgPr,P.avgPr,true),"var(--acc)"],
    ["ปริมาณเวทรวม",Math.round(A.vol).toLocaleString()+" <small style='font-size:11px;color:#8b97ad'>กก.·ครั้ง</small>",delta(A.vol,P.vol,true),"var(--move)"],
    ["วันเล่นเวท",A.woDays+" <small style='font-size:11px;color:#8b97ad'>/"+A.n+" วัน</small>",delta(A.woDays,P.woDays,true),"var(--move)"],
    ["โซเดียมเฉลี่ย",A.avgNa.toLocaleString()+" <small style='font-size:11px;color:#8b97ad'>/ 2,000 มก.</small>",delta(A.avgNa,P.avgNa,false),A.avgNa>NA_LIMIT?"var(--bad)":"var(--move)"],
    ["น้ำตาลเฉลี่ย",A.avgSug+" <small style='font-size:12px;color:var(--dim)'>/ "+u.sugGoal+" ก.</small>",delta(A.avgSug,P.avgSug,false),A.avgSug>u.sugGoal?"var(--bad)":"var(--move)"],
    ["ไฟเบอร์เฉลี่ย",A.avgFb+" <small style='font-size:11px;color:#8b97ad'>/ "+u.fibGoal+" ก.</small>",delta(A.avgFb,P.avgFb,true),"#22c55e"],
    ["น้ำเฉลี่ย",A.avgWater.toLocaleString()+" <small style='font-size:11px;color:#8b97ad'>มล./วัน</small>",delta(A.avgWater,P.avgWater,true),"var(--acc)"]
  ];
  const kTile=k=>`<div class="k"><span>${k[0]}</span><b style="color:${k[3]}">${k[1]}</b>${k[2]}</div>`;
  el("kpiGrid").innerHTML = KPIS.slice(0,6).map(kTile).join("")
    + `<details class="fold sub" data-fold="kpiMore" style="grid-column:1/-1">
        <summary>ดูตัวเลขที่เหลืออีก ${KPIS.length-6} ตัว</summary>
        <div class="foldc"><div class="kpi" style="margin-top:8px">${KPIS.slice(6).map(kTile).join("")}</div></div>
      </details>`;
  document.querySelectorAll('#kpiGrid details[data-fold]').forEach(foldBind);

  /* ---- สตรีค ---- */
  const stEx=streak(d=>d.min>0), stLog=streak(d=>d.kIn>0||d.min>0||d.hours>0), stSl=streak(d=>d.hours>=7);
  const best=days.reduce((a,b)=>b.min>a.min?b:a,days[0]);
  el("streaks").innerHTML=`
    <div class="s"><span>ออกกำลังติดกัน</span><b style="color:var(--move)">${stEx}</b><span>วัน</span></div>
    <div class="s"><span>บันทึกติดกัน</span><b style="color:var(--acc)">${stLog}</b><span>วัน</span></div>
    <div class="s"><span>นอนครบ 7 ชม.ติดกัน</span><b style="color:var(--sleep)">${stSl}</b><span>คืน</span></div>
    <div class="s"><span>วันที่ออกหนักสุด</span><b style="font-size:16px">${best&&best.min?thShort(best.key):"-"}</b><span>${best?best.min:0} นาที</span></div>`;

  stripChips(); weekStrip();
  renderBodyStats();

  /* ---- แอลกอฮอล์ ---- */
  el("alcTag").textContent=N+" วันล่าสุด";
  el("secAlc").innerHTML=alcHTML();

  /* ---- Zone 2 & 80/20 ---- */
  {const PP=polar(N);
   el("polTag").textContent = N+" วันล่าสุด";
   el("secPolar").innerHTML = PP.tot? polarHTML(PP,true,"-st")
     : `<div class="empty">ยังไม่มีคาร์ดิโอในช่วงนี้ — บันทึกที่แท็บ 🏃 ออกกำลังกาย แล้วใส่เวลาแยกโซนหัวใจ</div>`;}

  /* ---- ปฏิทิน ---- */
  const hd=days.slice(-Math.min(days.length,35));
  el("heat").innerHTML=hd.map(d=>`<div class="hc"><u>${(+d.key.slice(8))}</u><div>
    <i style="background:${d.min>0?"var(--move)":"var(--track)"}"></i>
    <i style="background:${d.kIn>0?"var(--food)":"var(--track)"}"></i>
    <i style="background:${d.hours>0?"var(--sleep)":"var(--track)"}"></i></div></div>`).join("");

  /* ---- ข้อสังเกต ---- */
  const ins=[];
  const exd=days.filter(d=>d.min>0&&d.hours>0), nod=days.filter(d=>d.min===0&&d.hours>0);
  if(exd.length>=2&&nod.length>=2){
    const a1=exd.reduce((a,b)=>a+b.hours,0)/exd.length, a2=nod.reduce((a,b)=>a+b.hours,0)/nod.length;
    if(Math.abs(a1-a2)>=0.4) ins.push(["😴",`วันที่ออกกำลังกาย นอนเฉลี่ย <b>${n1(a1)}</b> ชม. เทียบกับวันที่ไม่ออก <b>${n1(a2)}</b> ชม. — ${a1>a2?"ออกกำลังกายช่วยให้นอนดีขึ้น":"วันออกกำลังกลับนอนน้อยลง ลองเลี่ยงออกกำลังดึกดู"}`]);
  }
  if(A.slDays&&A.avgSleep<7) ins.push(["⚠️",`นอนเฉลี่ยแค่ <b>${A.avgSleep}</b> ชม./คืน ต่ำกว่าเกณฑ์ 7-9 ชม. — การนอนไม่พอทำให้หิวของหวานมากขึ้นและกล้ามฟื้นตัวช้า`]);
  if(A.fdDays){
    const diff=A.avgIn-u.target;
    const kg=n1(Math.abs(diff-A.avgOut)*7/7700);
    if(Math.abs(diff-A.avgOut)>200) ins.push([diff-A.avgOut>0?"📈":"📉",
      `กินเฉลี่ย ${A.avgIn} kcal เทียบเป้า ${u.target} kcal (เผาจากออกกำลังอีก ${A.avgOut}) — ถ้าคงแบบนี้ต่อ น้ำหนักจะ<b>${diff-A.avgOut>0?"เพิ่ม":"ลด"}ประมาณ ${kg} กก./สัปดาห์</b>`]);
  }
  if(A.fdDays&&A.avgNa>NA_LIMIT) ins.push(["🧂",`โซเดียมเฉลี่ย <b class="down">${A.avgNa.toLocaleString()} มก./วัน</b> เกินเกณฑ์ WHO (2,000 มก.) — กินเค็มเรื้อรังเพิ่มความดันและภาระไต ตัวการหลักคือน้ำซุป น้ำจิ้ม ของหมักดอง และอาหารสำเร็จรูป`]);
  else if(A.fdDays&&A.avgNa>NA_LIMIT*0.8) ins.push(["🧂",`โซเดียมเฉลี่ย ${A.avgNa.toLocaleString()} มก./วัน ใกล้เพดาน 2,000 มก. — ลองไม่ซดน้ำก๋วยเตี๋ยวจนหมดสัก 2–3 วัน/สัปดาห์`]);
  if(A.fdDays&&A.avgSug>u.sugGoal) ins.push(["🍬",`น้ำตาลเฉลี่ย <b class="down">${A.avgSug} ก./วัน</b> เกินเพดาน ${u.sugGoal} ก. — ตัวการมักเป็นเครื่องดื่มหวานและของหวาน ลองเปลี่ยนเป็นหวานน้อย/ไม่หวานสัก 3 วัน/สัปดาห์`]);
  {const wa=period(S.date,7).reduce((a,b)=>a+b.alc,0);
   if(wa>100) ins.push(["🍺",`แอลกอฮอล์สัปดาห์นี้ ${n1(wa)} ก. ≈ ${n1(wa/10)} ดื่มมาตรฐาน เกินคำแนะนำ (ไม่เกิน 10 ดื่ม/สัปดาห์) — แอลกอฮอล์ยังรบกวนการหลับลึกและ REM ด้วย`]);
   else if(wa>0) ins.push(["🍺",`แอลกอฮอล์สัปดาห์นี้ ${n1(wa)} ก. ≈ ${n1(wa/10)} ดื่ม ยังอยู่ในเกณฑ์ — แต่ถ้าดื่มคืนไหน ลองดูคะแนนการนอนคืนนั้นเทียบดู`]);}
  if(A.fdDays&&A.avgFb<u.fibGoal*0.7) ins.push(["🥦",`ไฟเบอร์เฉลี่ย ${A.avgFb} ก./วัน ต่ำกว่าเป้า ${u.fibGoal} ก. — เพิ่มผักลวก ผลไม้ หรือเปลี่ยนเป็นข้าวกล้อง`]);
  if(A.fdDays&&A.avgPr<u.pGoal*0.8) ins.push(["🥩",`โปรตีนเฉลี่ย ${A.avgPr} ก. ต่ำกว่าเป้า ${u.pGoal} ก. — เพิ่มไข่ อกไก่ ปลา หรือเวย์ จะช่วยรักษากล้ามเนื้อ`]);
  if(A.exDays>=Math.ceil(A.n*0.6)) ins.push(["🎉",`ออกกำลังกาย ${A.exDays} จาก ${A.n} วัน (${Math.round(A.exDays/A.n*100)}%) — สม่ำเสมอมาก เก่ง!`]);
  else if(A.exDays<A.n*0.3) ins.push(["🏃",`ออกกำลังแค่ ${A.exDays} จาก ${A.n} วัน — ลองเริ่มจากเดินเร็ววันละ 20 นาทีก่อนก็ได้`]);
  if(A.vol>0&&P.vol>0){const pc=Math.round((A.vol-P.vol)/P.vol*100);
    if(Math.abs(pc)>=8) ins.push(["🏋️",`ปริมาณเวทรวม ${Math.round(A.vol).toLocaleString()} กก.·ครั้ง ${pc>0?`<b class="up">เพิ่มขึ้น ${pc}%</b> จากช่วงก่อน — โหลดกำลังขึ้นดี`:`<b class="down">ลดลง ${Math.abs(pc)}%</b> จากช่วงก่อน — ถ้าไม่ได้ตั้งใจดีโหลด ลองเพิ่มเซ็ตหรือน้ำหนักดู`}`]);}
  if(A.avgWater<waterGoal()*0.8) ins.push(["💧",`ดื่มน้ำเฉลี่ย ${A.avgWater.toLocaleString()} มล./วัน — เป้าของคุณคือ ${waterGoal().toLocaleString()} มล. (~32 มล. ต่อน้ำหนักตัว 1 กก.)`]);
  if(A.fdDays<A.n*0.5) ins.push(["📝",`บันทึกอาหารแค่ ${A.fdDays} จาก ${A.n} วัน — ยิ่งบันทึกครบ ตัวเลขภาพรวมยิ่งแม่น`]);
  el("insight").innerHTML=ins.length?ins.map(i=>`<div class="ins"><div>${i[0]}</div><div>${i[1]}</div></div>`).join("")
    :`<div class="empty">บันทึกสัก 3-4 วันแล้วกลับมาดูใหม่ ระบบจะวิเคราะห์ให้</div>`;

  el("summary").innerHTML=`<div class="hint">
    เฉลี่ยกิน <b>${A.avgIn}</b> kcal/วัน (เป้า ${u.target}) จาก ${A.fdDays} วันที่บันทึก<br>
    ออกกำลังกาย <b>${A.exDays}</b>/${A.n} วัน · รวม <b>${A.min}</b> นาที · เผา <b>${A.kOut}</b> kcal<br>
    นอนเฉลี่ย <b>${A.avgSleep||"-"}</b> ชม./คืน (บันทึก ${A.slDays}/${A.n} คืน)<br>
    โซเดียมเฉลี่ย <b style="color:${A.avgNa>NA_LIMIT?"var(--bad)":"var(--move)"}">${A.avgNa.toLocaleString()}</b> มก./วัน (ไม่ควรเกิน 2,000) · ไฟเบอร์ <b>${A.avgFb}</b> ก.<br>
    โปรตีนเฉลี่ย <b>${A.avgPr}</b> ก./วัน (เป้า ${u.pGoal}) · น้ำ <b>${A.avgWater.toLocaleString()}</b> มล./วัน
  </div>`;

  const B=bucketize(days), lbl=B.map(b=>b.lbl);
  const per = B.length&&B[0].days.length>1 ? " (เฉลี่ย/วัน)" : "";
  mk("c1",{type:"line",data:{labels:lbl,datasets:[
    {label:"กินเข้า"+per,data:B.map(b=>bAvg(b,d=>d.kIn)),borderColor:cssv("--food"),backgroundColor:"rgba(251,191,36,.15)",fill:true,tension:.35,pointRadius:B.length>40?0:2},
    {label:"เผาผลาญ"+per,data:B.map(b=>bAvg(b,d=>d.kOut)),borderColor:cssv("--move"),backgroundColor:"rgba(74,222,128,.15)",fill:true,tension:.35,pointRadius:B.length>40?0:2}
  ]},options:{}});
  mk("c2",{type:"bar",data:{labels:lbl,datasets:[{label:"นาที"+per,data:B.map(b=>bAvg(b,d=>d.min)),backgroundColor:cssv("--move"),borderRadius:4}]},options:{}});
  mk("c3",{type:"bar",data:{labels:lbl,datasets:[{label:"ชั่วโมง"+per,data:B.map(b=>bAvgNZ(b,d=>d.hours)),backgroundColor:cssv("--sleep"),borderRadius:4}]},options:{}});
  {const capOf=d=>d.fd.reduce((a,x)=>{
      const g=(x.alc!==undefined&&x.alc!=="")?(+x.alc||0):alcOf(x.name);
      return a + (g>0 ? (/ฝา/.test(x.unit||"")? (+x.qty||0) : g/CAP_G) : 0);},0);
   const lb = B.length&&B[0].days.length>1 ? `ฝา (รวมต่อ ${B[0].days.length} วัน)` : "ฝา (ต่อวัน)";
   mk("c10",{type:"bar",data:{labels:lbl,datasets:[
     {label:lb,data:B.map(b=>n1(b.days.reduce((a,d)=>a+capOf(d),0))),backgroundColor:cssv("--food"),borderRadius:4}
   ]},options:{}});}
  {const zMin=(b,f)=>{const s=b.days.reduce((a,d)=>a+d.ex.reduce((x,e)=>x+f(e),0),0);
     return b.days.length>1?Math.round(s/b.days.length):s;};
   mk("c9",{type:"bar",data:{labels:lbl,datasets:[
     {label:"Zone 2"+per,data:B.map(b=>zMin(b,e=>+e.z2||0)),backgroundColor:"#4ade80",borderRadius:4},
     {label:"หนัก Z4–Z5"+per,data:B.map(b=>zMin(b,e=>(+e.z4||0)+(+e.z5||0))),backgroundColor:"#f87171",borderRadius:4}
   ]},options:{}});}
  /* โดนัท = พลังงานมาจากไหน (แอลกอฮอล์ให้ 7 kcal/ก. จึงต้องนับด้วยถ้ามี) */
  {const dl0=[["โปรตีน",n1(A.pr*4),cssv("--move")],["คาร์บ",n1(A.cb*4),cssv("--food")],
              ["ไขมัน",n1(A.ft*9),cssv("--sleep")],["แอลกอฮอล์",n1(A.alc*7),"#ef4444"]].filter(x=>x[1]>0);
   mk("c4",{type:"doughnut",data:{labels:dl0.map(x=>x[0]),
     datasets:[{data:dl0.map(x=>x[1]),backgroundColor:dl0.map(x=>x[2]),borderWidth:0}]},options:{}});}
  /* แถบคุณภาพ — สิ่งที่โดนัทสัดส่วนพลังงานบอกไม่ได้: ใยอาหาร โซเดียม น้ำตาลอิสระ ไขมันอิ่มตัว โพแทสเซียม */
  {const rr=A.avgNa&&A.avgPot? n1(A.avgNa/A.avgPot) : null;
   const QL=[
    {ic:"🍗",n:"โปรตีน",     v:A.avgPr, goal:u.pGoal,  un:"ก.",  low:false,col:"var(--move)"},
    {ic:"🥦",n:"ใยอาหาร",    v:A.avgFb, goal:u.fibGoal,un:"ก.",  low:false,col:"#22c55e"},
    {ic:"🍌",n:"โพแทสเซียม",  v:A.avgPot,goal:K_GOAL,   un:"มก.", low:false,col:"#22c55e"},
    {ic:"🧂",n:"โซเดียม",    v:A.avgNa, goal:NA_LIMIT, un:"มก.", low:true, col:"var(--bad)",
      note:rr!==null?` · Na:K <b style="color:${rr<=1?"var(--move)":rr<=2?"var(--food)":"var(--bad)"}">${rr}</b>`:""},
    {ic:"🍬",n:"น้ำตาลอิสระ", v:A.avgSug,goal:u.sugGoal,un:"ก.",  low:true, col:"var(--bad)"},
    {ic:"🧈",n:"ไขมันอิ่มตัว", v:A.avgSat,goal:u.satGoal,un:"ก.",  low:true, col:"var(--bad)"},
   ];
   if(A.avgAlc>0) QL.push({ic:"🍺",n:"แอลกอฮอล์",v:A.avgAlc,goal:S.user.sex==="m"?20:10,un:"ก.",low:true,col:"var(--bad)"});
   el("statNut").innerHTML = A.fdDays? `<div class="nutrows" style="margin-top:6px">${QL.map(x=>{
      const st = x.low ? (x.v<=x.goal*0.75?"ok":x.v<=x.goal?"warn":"bad")
                       : (x.v>=x.goal?"ok":x.v>=x.goal*0.6?"warn":"bad");
      const c  = st==="ok"?"var(--move)":st==="warn"?"var(--food)":"var(--bad)";
      const msg= x.low ? (x.v<=x.goal?`ต่ำกว่าเพดาน`:`เกินเพดาน ${kShort(x.v-x.goal)}`)
                       : (x.v>=x.goal?`ถึงเป้าแล้ว ✓`:`ขาดอีก ${kShort(x.goal-x.v)}`);
      return `<div class="fbar nut"><span class="nl"><b>${x.ic} ${x.n}</b>
          <small><span style="color:${c}">${msg}</span>${x.note||""}</small></span>
        <span class="fb2 wide"><i style="width:${Math.min(100,x.goal?x.v/x.goal*100:0)}%;background:${x.col}"></i></span>
        <span class="nv"><b style="color:${c}">${x.v.toLocaleString()}</b><i>/ ${x.goal.toLocaleString()} ${x.un}</i></span></div>`;
     }).join("")}</div>
     <div class="mini" style="margin-top:8px">เฉลี่ยจาก ${A.fdDays} วันที่บันทึกอาหาร · น้ำตาลอิสระตามนิยาม WHO (น้ำตาลในผลไม้ทั้งลูกและนมจืดไม่นับ)</div>`
    : `<div class="empty">ยังไม่มีวันที่บันทึกอาหารในช่วงนี้</div>`;}
  mk("c5",{type:"line",data:{labels:lbl,datasets:[
    {label:"ออกกำลัง (เป้า 30 น.)",data:B.map(b=>Math.round(bAvg(b,d=>Math.min(200,d.min/30*100)))),borderColor:cssv("--move"),tension:.35,pointRadius:B.length>40?0:2},
    {label:"การกิน (ใกล้เป้าแค่ไหน)",data:B.map(b=>bAvgNZ(b,d=>d.kIn?foodScore(d.kIn):null)),borderColor:cssv("--food"),tension:.35,pointRadius:B.length>40?0:2,spanGaps:true},
    {label:"การนอน (เป้า 8 ชม.)",data:B.map(b=>bAvgNZ(b,d=>d.hours?Math.round(d.hours/8*100):null)),borderColor:cssv("--sleep"),tension:.35,pointRadius:B.length>40?0:2,spanGaps:true}
  ]},suggestedMax:120,fmtY:v=>Math.round(v)+"%"});
}
function thShort(k){const [y,m,d]=String(k||"").split("-"); if(!d) return "-";
  return p2(+d)+"/"+p2(+m)+"/"+String(+y+543).slice(-2);}
function cssv(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}

/* ============================================================
   กราฟในตัว (SVG) — ไม่ต้องโหลดไลบรารีจากอินเทอร์เน็ต
   รองรับ: line / bar / doughnut / ผสม + แกนขวา
   ============================================================ */
function esc2(t){return String(t).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
function niceMax(v){
  if(v<=0)return 1;
  const p=Math.pow(10,Math.floor(Math.log10(v))), n=v/p;
  return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;
}
function mk(id,cfg){
  const host=el(id); if(!host)return;
  const W=340, H=cfg.h|| (cfg.type==="doughnut"?190:170);
  const ds=(cfg.data.datasets||[]).filter(d=>d&&d.data);
  const labels=cfg.data.labels||[];
  const dim=cssv("--dim"), line=cssv("--line"), txt=cssv("--txt");
  const legend = ds.filter(d=>d.label).map(d=>
    `<span><i style="background:${d.borderColor||d.backgroundColor||dim}"></i>${esc2(d.label)}</span>`).join("");

  /* ---------- โดนัท ---------- */
  if(cfg.type==="doughnut"){
    const vals=(ds[0].data||[]).map(v=>+v||0), tot=vals.reduce((a,b)=>a+b,0)||1;
    const cx=W/2, cy=H/2, R=Math.min(W,H)/2-12, r=R*0.58;
    let a0=-Math.PI/2, paths="";
    vals.forEach((v,i)=>{
      const a1=a0+v/tot*Math.PI*2, big=(a1-a0)>Math.PI?1:0;
      const x0=cx+R*Math.cos(a0), y0=cy+R*Math.sin(a0), x1=cx+R*Math.cos(a1), y1=cy+R*Math.sin(a1);
      const X0=cx+r*Math.cos(a1), Y0=cy+r*Math.sin(a1), X1=cx+r*Math.cos(a0), Y1=cy+r*Math.sin(a0);
      paths+=`<path d="M${x0} ${y0} A${R} ${R} 0 ${big} 1 ${x1} ${y1} L${X0} ${Y0} A${r} ${r} 0 ${big} 0 ${X1} ${Y1} Z"
        fill="${(ds[0].backgroundColor||[])[i]||dim}"/>`;
      a0=a1;
    });
    const lg=(cfg.data.labels||[]).map((l,i)=>
      `<span><i style="background:${(ds[0].backgroundColor||[])[i]||dim}"></i>${esc2(l)} ${Math.round(vals[i]/tot*100)}%</span>`).join("");
    host.innerHTML=`<div class="clg">${lg}</div><svg viewBox="0 0 ${W} ${H}">${paths}</svg>`;
    return;
  }

  /* ---------- เส้น/แท่ง ---------- */
  const padL=38, padR=ds.some(d=>d.yAxisID==="y1")?36:10, padT=8, padB=20;
  const iw=W-padL-padR, ih=H-padT-padB;
  const num=a=>a.map(v=>(v===null||v===undefined||v==="")?null:+v);
  const all=ds.filter(d=>d.yAxisID!=="y1").flatMap(d=>num(d.data)).filter(v=>v!==null);
  const all1=ds.filter(d=>d.yAxisID==="y1").flatMap(d=>num(d.data)).filter(v=>v!==null);
  let max=niceMax(Math.max(cfg.max||0,...(all.length?all:[1])));
  if(cfg.suggestedMax) max=Math.max(max,cfg.suggestedMax);
  /* fitY: ซูมแกน Y ให้พอดีข้อมูล — จำเป็นกับกราฟน้ำหนัก/รอบตัว
     (คนหนัก 75 กก. แกว่ง ±1.5 กก. ถ้าแกนเริ่มที่ 0 เส้นจะแบนสนิท มองเทรนด์ไม่เห็นเลย) */
  let minY=0;
  if(cfg.fitY && all.length){
    const lo=Math.min(...all), hi=Math.max(...all);
    const range=Math.max(hi-lo, Math.abs(hi)*0.02, 1);
    const inc=range<=2?0.5:range<=5?1:range<=12?2:range<=30?5:10;
    minY=Math.max(0, Math.floor((lo-range*0.15)/inc)*inc);
    max=Math.ceil((hi+range*0.15)/inc)*inc;
    if(max===minY) max=minY+inc;
  }
  const max1=niceMax(Math.max(...(all1.length?all1:[1])));
  const n=labels.length||1;
  const X=i=>padL+(n===1?iw/2:i*iw/(n-1));
  const Xb=i=>padL+(i+0.5)*iw/n;
  const Y=(v,m)=> m!==undefined ? padT+ih-(v/m)*ih
                                : padT+ih-((v-minY)/(max-minY))*ih;

  let g="",yl="";
  for(let k=0;k<=4;k++){
    const y=padT+ih-k*ih/4, v=minY+(max-minY)*k/4;
    g+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="${line}" stroke-width="1"/>`;
    yl+=`<text x="${padL-5}" y="${y+3.5}" fill="${dim}" font-size="9" text-anchor="end">${cfg.fmtY?cfg.fmtY(v):(v>=1000?Math.round(v/100)/10+"k":Math.round(v*10)/10)}</text>`;
  }
  if(all1.length) for(let k=0;k<=4;k++){
    const y=padT+ih-k*ih/4, v=max1*k/4;
    yl+=`<text x="${W-padR+5}" y="${y+3.5}" fill="${dim}" font-size="9">${v>=1000?Math.round(v/100)/10+"k":Math.round(v)}</text>`;
  }
  const step=Math.max(1,Math.ceil(n/7));
  let xl="";
  labels.forEach((l,i)=>{ if(i%step===0&&(n-1-i)>=step*0.85 || i===n-1)   /* กันป้ายท้ายทับป้ายก่อนหน้า */
    xl+=`<text x="${(ds.some(d=>(d.type||cfg.type)==="bar")?Xb(i):X(i))}" y="${H-6}" fill="${dim}" font-size="9" text-anchor="middle">${esc2(l)}</text>`; });

  let body="";
  const bars=ds.filter(d=>(d.type||cfg.type)==="bar");
  bars.forEach((d,bi)=>{
    const vals=num(d.data), m=d.yAxisID==="y1"?max1:max;
    const bw=iw/n*0.62/bars.length;
    vals.forEach((v,i)=>{ if(v===null||v<=0)return;
      const h=Math.max(1,(v/m)*ih), x=Xb(i)-(bars.length*bw)/2+bi*bw;
      body+=`<rect x="${x}" y="${padT+ih-h}" width="${bw}" height="${h}" rx="${Math.min(3,bw/2)}"
        fill="${d.backgroundColor||cssv("--move")}"/>`;});
  });
  ds.filter(d=>(d.type||cfg.type)!=="bar").forEach(d=>{
    /* แกนหลักส่ง m เป็น undefined เพื่อให้ใช้สเกล minY..max (รองรับ fitY) · แกนขวายังเริ่มที่ 0 ตามเดิม */
    const vals=num(d.data), m=d.yAxisID==="y1"?max1:undefined, useBar=bars.length>0;
    const px=i=>useBar?Xb(i):X(i);
    let pts=[],seg=[];
    vals.forEach((v,i)=>{ if(v===null){ if(seg.length)pts.push(seg); seg=[]; } else seg.push([px(i),Y(v,m)]); });
    if(seg.length)pts.push(seg);
    const col=d.borderColor||cssv("--acc");
    if(d.fill&&pts.length){
      pts.forEach(sg=>{ if(sg.length<2)return;
        body+=`<path d="M${sg[0][0]} ${padT+ih} L${sg.map(p=>p.join(" ")).join(" L")} L${sg[sg.length-1][0]} ${padT+ih} Z"
          fill="${col}" opacity=".13"/>`;});
    }
    pts.forEach(sg=>{
      if(sg.length===1) body+=`<circle cx="${sg[0][0]}" cy="${sg[0][1]}" r="3" fill="${col}"/>`;
      else body+=`<polyline points="${sg.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${col}"
        stroke-width="${d.borderWidth||2}" stroke-linejoin="round" stroke-linecap="round"/>`;
    });
    if(d.pointRadius!==0 && n<=31) pts.flat().forEach(pt=>{
      body+=`<circle cx="${pt[0]}" cy="${pt[1]}" r="${d.pointRadius||2.5}" fill="${col}"/>`;});
  });
  host.innerHTML=(legend?`<div class="clg">${legend}</div>`:"")+
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${g}${body}${yl}${xl}</svg>`;
}
/* ---------- เริ่ม ----------
   ลำดับสำคัญ: โหลดข้อมูลในเครื่อง "ก่อน" แล้ววาดครั้งเดียว
   ของเดิมวาดหน้าจอด้วยข้อมูลว่าง ๆ ก่อนหนึ่งรอบเต็ม แล้วค่อยโหลดข้อมูลจริงมาวาดใหม่อีกรอบ
   — เสียเวลาเปิดแอปไปเปล่า ๆ เกือบเท่าตัว */
const hadLocal=loadLocal();
setTime(nowHHMM()); fillUser(); render();
/* หน้าที่ยังไม่ได้เปิด (ออกกำลัง/นอน/ร่างกาย/ตั้งค่า) วาดถัดไปอีกเสี้ยววินาที — ผู้ใช้ยังกดไปไม่ทันอยู่แล้ว */
setTimeout(()=>{ try{ ltDraw(); drawZones(); exCalc(); sCalc(); sleepFill(); snapShow(); renderWo(); renderBody(); stPreview(); }catch(e){} },0);
/* รับค่าจากลิงก์ตั้งค่าอย่างเร็ว */
(function(){
  const h=location.hash||"";
  if(h.startsWith("#s=")){
    try{
      const j=JSON.parse(decodeURIComponent(escape(atob(h.slice(3)))));
      if(j.u){ LS.set("gas",j.u); LS.set("pin",j.p||""); }
      history.replaceState(null,"",location.pathname);
      setTimeout(()=>alert("ตั้งค่าจากลิงก์เรียบร้อย ✅ เชื่อมต่อ Google Sheets ให้แล้ว"),400);
    }catch(e){}
  }
})();
try{ if("scrollRestoration" in history) history.scrollRestoration="manual"; }catch(e){}
addEventListener("load",()=>setTimeout(()=>window.scrollTo(0,0),0));
addEventListener("pageshow",()=>window.scrollTo(0,0));
window.scrollTo(0,0);
setTimeout(()=>{ try{ foldify(); syncInfo(); }catch(e){} },0);
dayWatch();
/* ================= เพิ่มแอปลงหน้าจอโฮม =================
   ทำไมถึงสำคัญกับแอปนี้เป็นพิเศษ ไม่ใช่แค่ "ความสวย"
   1. Safari บน iPhone ล้างข้อมูลเว็บที่ไม่ได้เข้าเกิน 7 วันทิ้ง — แอปที่อยู่บนหน้าจอโฮมไม่โดนกฎนี้
   2. เปิดเต็มจอ ไม่มีแถบที่อยู่เว็บ และเปิดเร็วกว่าเพราะเบราว์เซอร์เก็บไฟล์ไว้ให้แล้ว
   3. ใช้ได้แม้เน็ตหลุด
   iPhone ไม่มีคำสั่งให้เว็บสั่งติดตั้งเองได้ ต้องบอกวิธีเป็นขั้น ๆ
   ส่วน Android/Chrome มี beforeinstallprompt ให้กดติดตั้งได้จริงในปุ่มเดียว จึงแยกทางกัน */
let _instEvt=null;
function isStandalone(){
  return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches
      || navigator.standalone===true;
}
function instPlat(){
  const ua=navigator.userAgent||"";
  if(/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)) return "ios";
  if(/Android/.test(ua)) return "android";
  return "desktop";
}
function instSteps(){
  const p=instPlat();
  if(p==="ios") return `<b>บน iPhone / iPad (ต้องเปิดด้วย Safari)</b>
    <ol style="margin:7px 0 0;padding-left:20px;line-height:1.9">
      <li>แตะปุ่ม <b>แชร์</b> <span style="font-size:15px">⬆️</span> ตรงแถบล่าง (หรือมุมขวาบน)</li>
      <li>เลื่อนลงหา <b>เพิ่มไปยังหน้าจอโฮม</b> (Add to Home Screen)</li>
      <li>แตะ <b>เพิ่ม</b> มุมขวาบน</li>
    </ol>
    <div class="mini" style="margin-top:8px">ถ้าเปิดอยู่ใน Chrome หรือในแอป LINE/Facebook จะไม่มีเมนูนี้
      — แตะ <b>…</b> แล้วเลือก <b>เปิดใน Safari</b> ก่อน</div>`;
  if(p==="android") return `<b>บน Android (Chrome)</b>
    <ol style="margin:7px 0 0;padding-left:20px;line-height:1.9">
      <li>แตะ <b>⋮</b> มุมขวาบน</li>
      <li>เลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></li>
      <li>แตะ <b>ติดตั้ง</b></li>
    </ol>`;
  return `<b>บนคอมพิวเตอร์</b>
    <ol style="margin:7px 0 0;padding-left:20px;line-height:1.9">
      <li>ดูที่ปลายช่องที่อยู่เว็บ จะมีไอคอน <b>⊕ ติดตั้ง</b></li>
      <li>กดแล้วเลือก <b>ติดตั้ง</b></li>
    </ol>
    <div class="mini" style="margin-top:8px">ถ้าจะใช้บนมือถือ เปิดลิงก์นี้ในมือถือแล้วทำตามขั้นตอนของเครื่องนั้น</div>`;
}
function instWhy(){
  return `<div class="mini" style="margin-top:9px;line-height:1.75">ทำไมควรทำ —
    Safari จะ<b>ลบข้อมูลเว็บที่ไม่ได้เปิดเกิน 7 วันทิ้ง</b> แต่แอปที่อยู่บนหน้าจอโฮมไม่โดนกฎนี้
    · เปิดเต็มจอ ไม่มีแถบที่อยู่เว็บ · เปิดเร็วขึ้น · ใช้ได้แม้เน็ตหลุด</div>`;
}
function instHTML(short){
  if(isStandalone())
    return `<div class="hint" data-nofold="1"><span style="color:var(--move)">✅ เพิ่มลงหน้าจอโฮมแล้ว</span>
      — ข้อมูลปลอดภัยจากการที่เบราว์เซอร์ล้างเว็บที่ไม่ได้เข้านาน ๆ</div>`;
  const btn = _instEvt ? `<button class="btn" style="margin-top:10px" onclick="instNow()">📲 ติดตั้งเดี๋ยวนี้</button>` : "";
  return `<div class="hint" data-nofold="1">${instSteps()}</div>${btn}${short?"":instWhy()}`;
}
async function instNow(){
  if(!_instEvt) return;
  const e=_instEvt; _instEvt=null;
  e.prompt(); try{ await e.userChoice; }catch(err){}
  instRefresh();
}
function instRefresh(){
  const box=el("instBox"); if(box) box.innerHTML=instHTML(false);
  const onb=el("onbInst"); if(onb) onb.innerHTML=instHTML(false);
  /* แถบชวนบนหน้าสรุป — ขึ้นเฉพาะคนที่ยังไม่ได้เพิ่ม และปิดแล้วไม่กวนอีก
     ไม่ขึ้นในการเปิดครั้งแรก เพราะตอนนั้นเขากำลังตั้งค่าอย่างอื่นอยู่ */
  const bar=el("instBar"); if(!bar) return;
  const opens=+LS.get("opens")||0;
  if(isStandalone() || LS.get("instHide") || opens<2){ bar.style.display="none"; return; }
  bar.style.display="block";
  bar.innerHTML=`<details class="fold" data-fold="instHow" style="margin:0 0 13px;border-color:var(--info-bd);background:var(--info-bg)">
    <summary style="color:var(--info-tx)">📲 เพิ่มแอปลงหน้าจอโฮม <span class="fn">แตะเพื่อดูวิธี</span></summary>
    <div class="foldc" style="color:var(--info-tx)">${instHTML(true)}
      <button class="btn ghost" style="margin-top:9px" onclick="LS.set('instHide','1');instRefresh()">ไม่ต้องแสดงอีก</button>
    </div></details>`;
  foldBind(bar.querySelector("details"));
}
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); _instEvt=e; instRefresh(); });
window.addEventListener("appinstalled",()=>{ _instEvt=null; instRefresh(); });
LS.set("opens", String((+LS.get("opens")||0)+1));
instRefresh();

(async()=>{ try{
  if(navigator.storage&&navigator.storage.persist){
    let ok=await navigator.storage.persisted();
    if(!ok) ok=await navigator.storage.persist();
    const est=(navigator.storage.estimate)?await navigator.storage.estimate():null;
    const used=est?Math.round(est.usage/1024):0;
    const b=el("persistInfo");
    if(b) b.innerHTML = (ok?'<span style="color:var(--move)">🔒 ขอสิทธิ์เก็บข้อมูลถาวรสำเร็จ</span> — เบราว์เซอร์จะไม่ลบข้อมูลนี้ทิ้งเอง'
      :'<span style="color:var(--food)">⚠️ ยังไม่ได้สิทธิ์เก็บถาวร</span> — ถ้าไม่เปิดแอปนานๆ บางเบราว์เซอร์ (โดยเฉพาะ Safari ที่ล้างข้อมูลเว็บที่ไม่ได้เข้า 7 วัน) อาจลบข้อมูลทิ้ง'
        + (isStandalone()? ' แต่ตอนนี้เพิ่มลงหน้าจอโฮมแล้ว จึงไม่โดนกฎนี้ ✅'
                         : ' <b>วิธีกัน: เพิ่มแอปลงหน้าจอโฮม</b> (ขั้นตอนอยู่ในกล่อง 📲 ด้านบน) แล้วสำรองไฟล์ไว้ด้วย'))
      + ` · ใช้พื้นที่ ${used.toLocaleString()} KB`;
  }
}catch(e){} })();
GAS_URL = GAS_URL || LS.get("gas");
PIN = PIN || LS.get("pin");
updateQueueBadge(); flushQueue();
el("gasUrl").value=GAS_URL; el("gasPin").value=PIN;
/* ================= คีย์เปิดใช้งาน (ออฟไลน์ทั้งหมด) =================
   คีย์ผูกกับ "ชื่อผู้ซื้อ" → 1 คน 1 คีย์ · คนที่ได้ไฟล์ต่อไปใช้ไม่ได้ถ้าไม่มีคีย์
   และถ้าเอาคีย์ไปแจกต่อ ชื่อผู้ซื้อจะโชว์อยู่ในแอปของคนที่รับไป (ตามรอยได้)  */
const B32="23456789ABCDEFGHJKLMNPQRSTUVWXYZ";       // ตัดตัวที่สับสน 0 O 1 I ออก
function licNorm(n){return String(n||"").trim().toLowerCase().replace(/\s+/g," ");}
function licHash(str){
  let a=0x811c9dc5, b=0x01000193;
  for(let i=0;i<str.length;i++){
    const c=str.charCodeAt(i);
    a=Math.imul((a^c)>>>0,16777619)>>>0;
    b=Math.imul((b+c*(i+7))>>>0 ^ (b>>>11), 2246822519)>>>0;
  }
  for(let r=0;r<96;r++){
    a=Math.imul((a^(b>>>15))>>>0,2654435761)>>>0;
    b=Math.imul((b^(a>>>13))>>>0,1597334677)>>>0;
  }
  return [a,b];
}
function licB32(n,len){let s="";for(let i=0;i<len;i++){s=B32[n&31]+s;n=Math.floor(n/32);}return s;}
function licMake(name,expDays){
  const e=expDays|0;
  const [a,b]=licHash(licNorm(name)+"|"+e+"|"+KEY_SALT);
  return licB32(e,4)+"-"+licB32(a%1048576,4)+"-"+licB32(b%1048576,4);
}
function licCheck(name,key){
  const k=String(key||"").toUpperCase().replace(/[^0-9A-Z]/g,"");
  if(k.length!==12) return {ok:false,why:"คีย์ต้องมี 12 ตัวอักษร (ไม่นับขีด)"};
  const clean=k.slice(0,4)+"-"+k.slice(4,8)+"-"+k.slice(8,12);
  let e=0; for(const ch of k.slice(0,4)){const i=B32.indexOf(ch); if(i<0) return {ok:false,why:"คีย์มีตัวอักษรที่ใช้ไม่ได้"}; e=e*32+i;}
  if(licMake(name,e)!==clean) return {ok:false,why:"ชื่อกับคีย์ไม่ตรงกัน — ตรวจตัวสะกดของชื่ออีกครั้ง"};
  if(e===0) return {ok:true,exp:0};
  const end=new Date(Date.UTC(2020,0,1)+e*864e5);
  const endK=end.toISOString().slice(0,10);
  if(endK < today()) return {ok:false,why:"คีย์นี้หมดอายุแล้วเมื่อ "+thShort(endK),exp:e,expired:true};
  return {ok:true,exp:e,endK};
}
function licSaved(){try{return JSON.parse(LS.get("lic")||"null");}catch(e){return null;}}
function licState(){
  if(!LICENSE_ON) return {on:false,ok:true};
  const v=licSaved();
  if(!v) return {on:true,ok:false};
  const r=licCheck(v.n,v.k);
  return {on:true,ok:r.ok,name:v.n,exp:r.exp,endK:r.endK,why:r.why};
}
function licShow(msg){
  el("lic").style.display="block"; window.scrollTo(0,0);
  el("licMsg").innerHTML = msg? `<span style="color:var(--bad)">${msg}</span>` : "";
  const v=licSaved(); if(v){el("licName").value=v.n; el("licKey").value=v.k;}
}
el("licGo").onclick=()=>{
  const n=el("licName").value.trim(), k=el("licKey").value.trim();
  if(!n) return el("licMsg").innerHTML='<span style="color:var(--bad)">ใส่ชื่อก่อนนะครับ</span>';
  const r=licCheck(n,k);
  if(!r.ok) return el("licMsg").innerHTML=`<span style="color:var(--bad)">${r.why}</span>`;
  LS.set("lic",JSON.stringify({n:n.replace(/\s+/g," "),k:k.toUpperCase()}));
  el("lic").style.display="none";
  licBadge();
  alert("เปิดใช้งานเรียบร้อย ✅"+(r.exp?"\nใช้ได้ถึง "+thShort(r.endK):"\nใช้ได้ตลอดไป"));
};
el("licExp").onclick=()=>el("expJson").click();
function gotoLt1(){
  document.querySelector("nav [data-p=move]").click();
  const c=el("modeSeg").querySelector('[data-m="cardio"]'); if(c) c.click();   // ต้องอยู่โหมดคาร์ดิโอถึงจะเห็นการ์ด
  setTimeout(()=>el("lt1Card").scrollIntoView({behavior:"smooth"}),260);
}
/* ---------- เริ่มระบบ ----------
   ต้องอยู่ "หลัง" บล็อกคีย์เปิดใช้งาน เพราะ licState() เรียกใช้ B32 ที่ประกาศด้วย const
   ถ้าวางไว้ก่อน จะเจอ "Cannot access 'B32' before initialization" แล้ว IIFE ตายเงียบ ๆ
   ผลคือ (1) ไฟล์ที่ขายไปจะไม่บล็อกคีย์หมดอายุ และ (2) การซิงก์ Google Sheets ไม่เริ่มทำงาน */
(async()=>{
  if(!GAS_URL && el("noUrlWarn")) el("noUrlWarn").style.display="block";
  {let st; try{ st=licState(); }catch(e){ st={on:LICENSE_ON,ok:false,why:"ตรวจคีย์ไม่ได้"}; }
   if(st.on && !st.ok){ licShow(st.why||""); return; }}
  if(GAS_URL){ bootSync(); }
  else if(!GAS_URL && !LS.get("skipSetup")){showOnboard();}
  else setStatus("เก็บในเครื่อง");
})();

function licBadge(){
  const st=licState(), av=el("aboutVer");
  if(!av) return;
  const who = st.on&&st.ok ? st.name : LICENSE;
  av.innerHTML=`เวอร์ชัน ${APP_VER}`
    + (who?`<br>ลิขสิทธิ์การใช้งาน: <b>${esc(who)}</b>`:"")
    + (st.on&&st.ok&&st.exp?`<br>ใช้ได้ถึง ${thShort(st.endK)}`:"");
}

/* ---------- หน้าตั้งค่าเริ่มต้นสำหรับผู้ใช้ใหม่ ---------- */
function showOnboard(){
  el("onb").style.display="block"; window.scrollTo(0,0);
  const T = TEMPLATE_URL;
  el("onbBody").innerHTML=`
    <div class="logo"><b><svg class="brand big" viewBox="0 0 512 512" aria-hidden="true"><g transform="rotate(-90 256 256)" fill="none" stroke-linecap="round" stroke-width="52"><circle cx="256" cy="256" r="176" stroke="currentColor" stroke-opacity=".16"/><circle cx="256" cy="256" r="106" stroke="currentColor" stroke-opacity=".16"/><circle cx="256" cy="256" r="176" stroke="var(--move)" stroke-dasharray="862 244" pathLength="1106"/><circle cx="256" cy="256" r="106" stroke="var(--food)" stroke-dasharray="416 250" pathLength="666"/></g></svg>${APP_NAME}</b><span>ติดตามการกิน ออกกำลังกาย การนอน และร่างกาย — ข้อมูลเป็นของคุณคนเดียว</span></div>

    <div class="step"><h3><i>✓</i> เริ่มใช้ได้เลย ไม่ต้องตั้งค่าก็ได้</h3>
      <div class="hint">แอปบันทึกข้อมูลลง<b>เครื่องนี้</b>ให้อัตโนมัติอยู่แล้ว กดปุ่มด้านล่างแล้วใช้ได้ทันที<br><br>
      การเชื่อม Google Sheets ด้านล่างเป็น<b>ตัวเลือกเสริม</b> สำหรับคนที่อยากให้ข้อมูลอยู่หลายเครื่อง ไม่หายถ้าล้างเบราว์เซอร์ และมีระบบสำรองอัตโนมัติทุกคืน — ทำทีหลังก็ได้ที่แท็บตั้งค่า</div>
      <button class="btn" onclick="LS.set('skipSetup','1');el('onb').style.display='none'">▶️ เริ่มใช้เลย (เก็บในเครื่อง)</button></div>

    <div class="step"><h3><i>📲</i> เพิ่มลงหน้าจอโฮมก่อน (สำคัญ)</h3>
      <div id="onbInst"></div></div>



    <div class="hint" style="text-align:center;margin:20px 0 12px;font-size:15px">
      — หรือเชื่อม Google Sheets ของตัวเอง (แนะนำ ใช้เวลา ~3 นาที) —</div>

    ${T?`
    <div class="step"><h3><i>1</i> คัดลอกไฟล์ต้นแบบ</h3>
      <div class="hint">กดปุ่มนี้ → หน้า Google จะถามว่า "ทำสำเนา" → กดยืนยัน<br>
      คุณจะได้ไฟล์ Google Sheets ของตัวเอง <b>พร้อมระบบครบทุกอย่างในไฟล์เดียว</b> ไม่ต้องก็อปโค้ดเอง</div>
      <button class="btn" onclick="window.open('${T}','_blank')">📄 เปิดไฟล์ต้นแบบ &amp; ทำสำเนา</button></div>

    <div class="step"><h3><i>2</i> กดเมนู "ตั้งค่าครั้งแรก"</h3>
      <div class="hint">ในไฟล์ที่เพิ่งทำสำเนา ดูแถบเมนูด้านบน จะมีเมนูชื่อ <b>💪 แอปสุขภาพ</b><br>
      (ถ้ายังไม่เห็น ให้รีเฟรชหน้าไฟล์ 1 ครั้ง)</div>
      <ol><li>กด <b>💪 แอปสุขภาพ → 1️⃣ ตั้งค่าครั้งแรก</b></li>
      <li>Google จะขออนุญาตสิทธิ์ → <b>Continue</b> → เลือกบัญชีตัวเอง</li>
      <li>ถ้าขึ้นเตือนสีเหลือง กด <b>Advanced</b> → <b>Go to ... (unsafe)</b> → <b>Allow</b>
        <br><span class="mini">(ไม่อันตราย เพราะเป็นสคริปต์ที่อยู่ในไฟล์ของคุณเอง)</span></li>
      <li>ระบบจะสร้างตารางให้ครบ + สุ่ม PIN ให้อัตโนมัติ</li></ol></div>

    <div class="step"><h3><i>3</i> Deploy (เปิดให้แอปเชื่อมได้)</h3>
      <div class="hint">หน้าต่างที่เด้งขึ้นมาจะบอกขั้นตอนนี้อยู่แล้ว ทำตามได้เลย</div>
      <ol><li>ในหน้าไฟล์ กด <b>ส่วนขยาย → Apps Script</b></li>
      <li>มุมขวาบน กด <b>Deploy → New deployment</b></li>
      <li>กดเฟือง ⚙️ ข้าง "Select type" → เลือก <b>Web app</b></li>
      <li><b>Who has access</b> → เลือก <b>Anyone</b> ← สำคัญมาก</li>
      <li>กด <b>Deploy</b> → อนุญาตสิทธิ์ (ถ้าถามอีกครั้ง)</li></ol></div>

    <div class="step"><h3><i>4</i> เชื่อมกับแอป</h3>
      <div class="hint"><b>วิธีง่ายสุด:</b> กลับไปที่ไฟล์ Sheets → เมนู <b>💪 แอปสุขภาพ → 3️⃣ 📲 รับลิงก์เชื่อมแอป</b>
      → กดคัดลอกลิงก์ → ส่งเข้า LINE ตัวเอง → แตะลิงก์บนมือถือ <b>เชื่อมให้อัตโนมัติ</b><br><br>
      หรือกรอกเองด้านล่างก็ได้</div>
      <label>ลิงก์ /exec</label>
      <input type="text" id="obUrl" placeholder="https://script.google.com/macros/s/.../exec">
      <label>PIN (ดูได้จากเมนู 🔑 ดู/เปลี่ยน PIN)</label>
      <input type="text" id="obPin" placeholder="เช่น 482913" inputmode="numeric">
      <button class="btn" onclick="obConnect()">เชื่อมต่อและเริ่มใช้งาน</button>
      <div id="obMsg" class="mini"></div></div>

    <div class="step"><h3><i>5</i> เปิดสำรองอัตโนมัติ (แนะนำ)</h3>
      <div class="hint">ในไฟล์ Sheets กด <b>💪 แอปสุขภาพ → ⏰ ตั้งสำรองอัตโนมัติทุกวัน</b> ครั้งเดียว<br>
      ระบบจะสำรองข้อมูลลงไดรฟ์ของคุณทุกคืน เก็บย้อนหลัง 30 ชุด กู้คืนได้ในคลิกเดียว</div></div>
    `:`
    <div class="step"><h3><i>1</i> สร้างไฟล์ Google Sheets</h3>
      <ol><li>กดปุ่มด้านล่างเพื่อเปิดไฟล์ใหม่</li><li>ตั้งชื่อว่า "ข้อมูลสุขภาพ"</li></ol>
      <button class="btn ghost" onclick="window.open('https://sheets.new','_blank')">เปิด Google Sheets ใหม่</button></div>

    <div class="step"><h3><i>2</i> ใส่โค้ดหลังบ้าน</h3>
      <ol><li>ในไฟล์ Sheets → เมนู <b>ส่วนขยาย (Extensions) → Apps Script</b></li>
      <li>ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดที่คัดลอกจากปุ่มนี้</li>
      <li>กดบันทึก (Ctrl+S) แล้วกลับมารีเฟรชหน้า Sheets</li>
      <li>จะเห็นเมนูใหม่ <b>💪 แอปสุขภาพ</b> → กด <b>1️⃣ ตั้งค่าครั้งแรก</b></li></ol>
      <button class="btn ghost" onclick="copyCode(this)">📋 คัดลอกโค้ด Apps Script</button></div>

    <div class="step"><h3><i>3</i> Deploy เป็น Web App</h3>
      <ol><li>กด <b>Deploy → New deployment</b></li>
      <li>เฟือง ⚙️ → <b>Web app</b></li>
      <li>Who has access: <b>Anyone</b> (สำคัญมาก)</li>
      <li><b>Deploy</b> → Authorize access → Advanced → Allow</li></ol></div>

    <div class="step"><h3><i>4</i> เชื่อมต่อ</h3>
      <div class="hint">ในไฟล์ Sheets กดเมนู <b>💪 แอปสุขภาพ → 3️⃣ 📲 รับลิงก์เชื่อมแอป</b> เพื่อคัดลอกลิงก์แบบกดทีเดียว หรือกรอกเองด้านล่าง</div>
      <label>ลิงก์ /exec</label>
      <input type="text" id="obUrl" placeholder="https://script.google.com/macros/s/.../exec">
      <label>PIN</label>
      <input type="text" id="obPin" placeholder="เช่น 482913" inputmode="numeric">
      <button class="btn" onclick="obConnect()">เชื่อมต่อและเริ่มใช้งาน</button>
      <div id="obMsg" class="mini"></div></div>
    `}

    <button class="btn ghost" onclick="LS.set('skipSetup','1');el('onb').style.display='none'">ข้ามไปก่อน — ใช้แบบเก็บในเครื่อง</button>
    <div class="hint" style="text-align:center;margin-top:9px">กลับมาเปิดหน้านี้ได้ทุกเมื่อที่ <b>⚙️ ตั้งค่า → 🔗 เชื่อม Google Sheets</b></div>
    <div class="hint" style="text-align:center;padding:0 10px;margin-top:10px">เวอร์ชัน ${APP_VER}</div>`;
  instRefresh();   /* เพิ่งเขียนทับ innerHTML ทั้งก้อน ช่อง "เพิ่มลงหน้าจอโฮม" จึงต้องเติมใหม่ */
}
function copyCode(btn){
  navigator.clipboard.writeText(GS_CODE).then(()=>{btn.textContent="✅ คัดลอกแล้ว — ไปวางใน Apps Script";})
  .catch(()=>{ const t=document.createElement("textarea");t.value=GS_CODE;document.body.appendChild(t);t.select();
    document.execCommand("copy");t.remove();btn.textContent="✅ คัดลอกแล้ว";});
}
async function obConnect(){
  GAS_URL=el("obUrl").value.trim(); PIN=el("obPin").value.trim();
  if(!GAS_URL){el("obMsg").innerHTML='<span style="color:var(--bad)">ใส่ลิงก์ก่อนนะ</span>';return;}
  el("obMsg").textContent="กำลังทดสอบ...";
  const j=await api({action:"ping"});
  if(j&&j.ok){ LS.set("gas",GAS_URL); LS.set("pin",PIN);
    el("obMsg").innerHTML='<span style="color:var(--move)">เชื่อมต่อสำเร็จ ✅</span>';
    el("gasUrl").value=GAS_URL; el("gasPin").value=PIN; quickShow();
    setTimeout(()=>{el("onb").style.display="none";loadAll();},700);
  } else el("obMsg").innerHTML='<span style="color:var(--bad)">'+(j&&j.error?j.error:"ต่อไม่ได้")+' — ตรวจว่าลิงก์ลงท้าย /exec, Deploy แบบ Anyone และ PIN ตรงกัน</span>';
}
el("showSetup").onclick=showOnboard;
{let tap=0,tmr=null;
 const av=el("aboutVer");
 licBadge();
 av.onclick=()=>{ clearTimeout(tmr); tmr=setTimeout(()=>tap=0,1200);
   if(++tap>=5){ tap=0; const c=el("ownerCard");
     c.style.display = c.style.display==="none" ? "block" : "none";
     if(c.style.display==="block"){
       el("licDev").innerHTML = LICENSE_ON
         ? '<span style="color:var(--move)">เปิดอยู่</span> — ไฟล์นี้ต้องใส่คีย์ก่อนใช้ (ไฟล์สำหรับขาย)'
         : '<span style="color:var(--food)">ปิดอยู่</span> — ใครเปิดก็ใช้ได้ทันที (ไฟล์ของคุณเอง)';
       c.scrollIntoView({behavior:"smooth"}); } } };}
el("syncNow").onclick=async()=>{
  if(!GAS_URL) return alert("ยังไม่ได้เชื่อม Google Sheets");
  const b=el("syncNow"); b.disabled=true; b.textContent="กำลังดึง...";
  try{ await loadAll(); } finally { b.disabled=false; b.textContent="🔄 ดึงข้อมูลจากชีตเดี๋ยวนี้"; syncInfo(); }
};
function syncInfo(){
  const b=el("syncInfo"); if(!b) return;
  const t=lastPullAt();
  b.textContent = t? "ดึงข้อมูลทั้งก้อนล่าสุด "+agoTxt(Date.now()-t)+" · ของที่บันทึกใหม่ส่งขึ้นทันทีอยู่แล้ว"
                   : "ยังไม่เคยดึงข้อมูลทั้งก้อน";
}
el("licClear").onclick=()=>{ if(confirm("ล้างคีย์ในเครื่องนี้? (ข้อมูลสุขภาพไม่หาย)")){LS.set("lic","");location.reload();} };
notiShow(); quickShow();
el("resetDev").onclick=()=>{
  if(!confirm("ล้างลิงก์และ PIN ออกจากเครื่องนี้? (ข้อมูลใน Google Sheets ไม่หาย)"))return;
  LS.set("gas","");LS.set("pin","");location.reload();
};

el("themeBtn").onclick=()=>{
  const t=(document.documentElement.getAttribute("data-theme")==="dark")?"light":"dark";
  LS.set("theme",t); applyTheme(t);
};
applyTheme(LS.get("theme")||"light");
/* ---------- ระบบอัปเดตเวอร์ชัน ----------
   บั๊กเดิม: เช็คแค่ event "updatefound" ซึ่งยิงเฉพาะตอนเวอร์ชันใหม่กำลังโหลด "ขณะเปิดแอปอยู่"
   ถ้าโหลดเสร็จตอนแอปถูกปิด (กรณีปกติที่สุดบนมือถือ) เปิดครั้งถัดไป event นี้ไม่ยิงอีกแล้ว
   ปุ่มอัปเดตเลยไม่ขึ้นเลย — ต้องเช็คสถานะ "รออยู่แล้ว" (reg.waiting) ตรง ๆ ทุกครั้งที่เปิดด้วย */
function swShowUpdate(){
  const b=el("updBar"); if(!b) return;
  b.style.display="block";
  b.innerHTML=`🔄 <b>มีแอปเวอร์ชันใหม่พร้อมใช้แล้ว</b> — ข้อมูลของคุณไม่หาย
    <button class="btn" style="margin-top:8px" onclick="saveNow();location.reload()">อัปเดตเดี๋ยวนี้</button>`;
}
let _swReg=null;
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  /* ตัวคุมหน้าเปลี่ยนไประหว่างใช้งาน = เวอร์ชันใหม่เพิ่งเข้ามาแทน (บางเครื่องติดตั้งไวจนดักสถานะไม่ทัน)
     แต่ถ้าเปลี่ยนจาก "ไม่มี → มี" คือการติดตั้งครั้งแรก ไม่ใช่การอัปเดต อย่าโชว์ */
  const hadCtl=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(hadCtl) swShowUpdate(); });
  navigator.serviceWorker.register("sw.js").then(reg=>{
    _swReg=reg;
    const track=nw=>{ if(!nw) return;
      nw.addEventListener("statechange",()=>{
        if(nw.state==="installed" && navigator.serviceWorker.controller) swShowUpdate();
      });
    };
    if(reg.waiting && navigator.serviceWorker.controller) swShowUpdate();  /* ตัวใหม่รอมาตั้งแต่ก่อนเปิด */
    track(reg.installing);                                                 /* กำลังโหลดพอดีตอนเปิด */
    reg.addEventListener("updatefound",()=>track(reg.installing));         /* เจอระหว่างใช้งาน */
    reg.update().catch(()=>{});                                            /* เช็คทันทีตอนเปิด ไม่รอครบชั่วโมง */
    setInterval(()=>reg.update().catch(()=>{}), 3600000);
  }).catch(()=>{});
}
/* ปุ่มเช็คเอง — ไม่พึ่งกลไก service worker อย่างเดียว แต่ไปอ่านเลขเวอร์ชันจากไฟล์จริงบนเว็บมาเทียบ
   (ผ่าน ?fresh ซึ่ง service worker ถูกสั่งให้วิ่งเน็ตตรง ไม่หยิบจากแคช) ชัวร์กว่าทุกวิธี */
async function checkUpdate(btn){
  if(btn){ btn.disabled=true; btn.textContent="กำลังเช็ค..."; }
  const done=(msg,ok)=>{ if(btn){ btn.disabled=false; btn.textContent="🔄 เช็คเวอร์ชันใหม่"; }
    const o=el("updChk"); if(o) o.innerHTML=`<span style="color:${ok?"var(--move)":"var(--food)"}">${msg}</span>`; };
  if(!location.protocol.startsWith("http")){ done("โหมดไฟล์ในเครื่อง — รับเวอร์ชันใหม่โดยรับไฟล์ใหม่มาแทนไฟล์เดิม",false); return; }
  try{
    if(_swReg) await _swReg.update().catch(()=>{});
    const res=await fetch("index.html?fresh="+Date.now(),{cache:"no-store"});
    const txt=await res.text();
    const m=txt.match(/app-ver" content="([\d.]+)"/)||txt.match(/APP_VER="([\d.]+)"/);
    if(!m){ done("อ่านเวอร์ชันจากเว็บไม่ได้",false); return; }
    if(m[1]===APP_VER){ done(`คุณใช้เวอร์ชันล่าสุดอยู่แล้ว (${APP_VER}) ✅`,true); }
    else { swShowUpdate(); done(`มีเวอร์ชัน ${m[1]} (ของคุณ ${APP_VER}) — กดปุ่มอัปเดตด้านบนสุดของหน้าสรุป`,false);
           window.scrollTo(0,0); }
  }catch(e){ done("เช็คไม่ได้ — อินเทอร์เน็ตอาจไม่พร้อม",false); }
}
