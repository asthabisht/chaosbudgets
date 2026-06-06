/* app.js — Co Chaos quote generator (deployable PWA) */

// ===== CONFIG =====
// review-enigma origin that serves the shared rate library at /api/rates
var API_BASE = "";        // e.g. "https://review-enigma.netlify.app"
// Python export service that returns the branded xlsx / client PDF (/generate).
// Leave "" to use the plain in-browser export only.
var EXPORT_BASE = "";     // e.g. "https://cochaos-export.onrender.com"

var E = window.ENGINE;
var STATE = { header:{client:"",event:"",job:""}, items:[], rates:E.DEFAULT_RATES.slice(), view:"internal" };
var CAT_COLOR = { av:"#5b7a99",scenic:"#5f8f76",activation:"#a8843f",giveaway:"#8273a8",entertainment:"#6471a0",staffing:"#7a828d" };
var CONF_COLOR = { high:"#2e9e5b",med:"#c0892e",low:"#d24b3e",manual:"#5b82d6" };
var $ = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); };
var aed = function(n){ return "AED "+Math.round(n||0).toLocaleString("en-AE"); };

/* ---- persistence ---- */
function save(){ try{ localStorage.setItem("cc_quote", JSON.stringify({header:STATE.header,items:STATE.items})); }catch(e){} }
function load(){
  try{ var q=JSON.parse(localStorage.getItem("cc_quote")||"null"); if(q){ STATE.header=q.header||STATE.header; STATE.items=q.items||[]; } }catch(e){}
  try{ var r=JSON.parse(localStorage.getItem("cc_rates")||"null"); if(r&&r.length){ STATE.rates=r; } }catch(e){}
}
function cacheRates(r){ try{ localStorage.setItem("cc_rates", JSON.stringify(r)); }catch(e){} }

/* ---- theme (persisted) ---- */
function setTheme(t){ document.body.setAttribute("data-theme",t); try{ localStorage.setItem("cc_theme",t); }catch(e){} $("themeBtn").textContent = t==="dark"?"☀":"☾"; }
function loadTheme(){ var t="light"; try{ t=localStorage.getItem("cc_theme")||"light"; }catch(e){} setTheme(t); }

/* ---- shared rate library ---- */
function syncRates(){
  var st=$("rateStatus"); if(st) st.innerHTML='<span class="dot" style="background:#c0892e"></span> syncing library…';
  fetch(API_BASE + "/api/rates", {cache:"no-store"})
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(Array.isArray(d) && d.length){ STATE.rates=d; cacheRates(d); render(); }
      var flagged=(STATE.rates||[]).filter(function(x){return (x.confidence||"")==="low";}).length;
      if(st) st.innerHTML='<span class="dot"></span> '+STATE.rates.length+' rates synced · '+flagged+' flagged for review';
    })
    .catch(function(){ if(st) st.innerHTML='<span class="dot" style="background:#d24b3e"></span> offline — using last synced rates ('+STATE.rates.length+')'; });
}

/* ---- editing ---- */
function addItem(){
  var it={ id:Date.now()+"_"+Math.random().toString(36).slice(2,6),
           item:$("fItem").value.trim(), qty:$("fQty").value||"1",
           w:$("fW").value, h:$("fH").value, unit:$("fUnit").value,
           days:$("fDays").value, duration:$("fDur").value };
  if(!it.item) return;
  STATE.items.push(it); save();
  ["fItem","fQty","fW","fH","fDays","fDur"].forEach(function(id){ $(id).value = id==="fQty"?"1":""; });
  $("fItem").focus(); render();
}
function updItem(id,patch){ STATE.items=STATE.items.map(function(x){ return x.id===id?Object.assign(x,patch):x; }); save(); render(); }
function delItem(id){ STATE.items=STATE.items.filter(function(x){ return x.id!==id; }); save(); render(); }

/* ---- render ---- */
function render(){
  $("hdrEvent").textContent = STATE.header.event || "New estimate";
  var sections=E.groupSections(STATE.items, STATE.rates), t=E.totals(sections), internal=STATE.view==="internal";
  var wrap=$("budget"); wrap.innerHTML="";
  if(!STATE.items.length){ wrap.innerHTML='<div class="empty">Add line items above to build the estimate.</div>'; $("totals").innerHTML=""; return; }
  sections.forEach(function(sec){
    var h='<div class="sec"><div class="sechead"><span><span class="tag" style="background:'+CAT_COLOR[sec.cat]+'"></span>'+esc(sec.title)+'</span><span class="mono acc">'+aed(sec.totalSell)+'</span></div>';
    sec.lines.forEach(function(L){
      h+='<div class="line" data-uid="'+L.it.id+'"><div class="lmain"><div class="lname">'+esc(L.it.item)+' <span class="pill" data-act="exp" style="color:'+CONF_COLOR[L.confidence]+';border-color:'+CONF_COLOR[L.confidence]+'55">'+String(L.confidence).toUpperCase()+'</span></div><div class="lsub mono">'+esc(L.supplier||"— supplier?")+(L.contact?(" · "+esc(L.contact)):"")+'</div></div>'+
      '<div class="ledit mono"><input data-act="qty" value="'+esc(L.it[L.driver==="day"?"days":"qty"]!=null?L.it[L.driver==="day"?"days":"qty"]:L.qcol)+'" title="'+(L.driver==="day"?"days":"qty")+'">'+(internal?('<input data-act="cost" value="'+esc(L.it.costOverride!=null?L.it.costOverride:L.unitCost)+'" title="unit buy">'):"")+'</div>'+
      '<div class="lfig mono">'+(internal?('<div class="cost">cost '+aed(L.totalCost)+'</div>'):"")+'<div class="sell">'+aed(L.totalSell)+'</div></div>'+
      '<button class="x" data-act="del">✕</button>'+
      '<div class="lbasis mono" style="display:none">'+esc(L.unitCost?aed(L.unitCost):"—")+' × '+L.qcol+' ('+esc(L.qnote)+') · +25% → '+aed(L.totalSell)+'<br>basis: '+esc(L.note)+'</div></div>';
    });
    h+='</div>'; wrap.insertAdjacentHTML("beforeend", h);
  });
  var tot='';
  if(internal) tot+=row("Total cost", aed(t.cost), "cost");
  tot+=row("Subtotal (sell)", aed(t.sell-t.mgmt));
  tot+=row("Management fee @15% (excl. staffing)", aed(t.mgmt));
  tot+=row("VAT @5%", aed(t.vat));
  if(internal) tot+=row("Profit", aed(t.profit)+" · "+(t.sell?Math.round(t.profit/t.sell*100):0)+"%","cost");
  tot+='<div class="grand"><span>Total inc. VAT</span><span class="acc">'+aed(t.grand)+'</span></div>';
  $("totals").innerHTML=tot;
}
function row(l,v,c){ return '<div class="trow"><span>'+esc(l)+'</span><span class="mono '+(c||"")+'">'+v+'</span></div>'; }

/* ---- export ---- */
function buildPayload(){
  var sections=E.groupSections(STATE.items, STATE.rates).map(function(sec){
    return { title:sec.title, excl:sec.excl, lines:sec.lines.map(function(L){
      return { item:L.it.item, qty:L.qcol, unitBuy:L.unitCost, supplier:L.supplier||"", contact:L.contact||"", note:L.note||"", confidence:L.confidence||"" };
    })};
  });
  return { header:{ client:STATE.header.client, event:STATE.header.event, job:STATE.header.job, version:"Estimated Budget V1", date:"" }, sections:sections };
}
function downloadBlob(blob, name){ var u=URL.createObjectURL(blob); var a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },4000); }
function busy(btn,on,label){ btn.disabled=on; btn.textContent = on?"Generating…":label; }
function serverExport(format, filename){
  var p=buildPayload(); p.format=format; p.filename=filename;
  return fetch(EXPORT_BASE + "/generate", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p)})
    .then(function(r){ if(!r.ok) throw new Error("export failed"); return r.blob(); })
    .then(function(b){ downloadBlob(b, filename + (format==="pdf"?".pdf":".xlsx")); });
}
function plainXlsx(filename){ var wb=E.buildWorkbook(XLSX, STATE.header, STATE.items, STATE.rates); XLSX.writeFile(wb, filename+".xlsx"); }

/* ---- events ---- */
["client","event","job"].forEach(function(k){ var el=$("h_"+k); el.value=STATE.header[k]||""; el.addEventListener("input",function(){ STATE.header[k]=el.value; save(); render(); }); });
$("addBtn").addEventListener("click", addItem);
$("fItem").addEventListener("keydown", function(e){ if(e.key==="Enter") addItem(); });
["internal","client"].forEach(function(v){ $("v_"+v).addEventListener("click", function(){ STATE.view=v; $("v_internal").classList.toggle("on",v==="internal"); $("v_client").classList.toggle("on",v==="client"); render(); }); });
$("themeBtn").addEventListener("click", function(){ setTheme(document.body.getAttribute("data-theme")==="dark"?"light":"dark"); });
$("rateStatus").addEventListener("click", syncRates);

$("exportXlsx").addEventListener("click", function(){
  if(!STATE.items.length) return;
  var fn="Estimated_Budget_"+((STATE.header.job||"CoChaos").replace(/\s+/g,"_"));
  if(EXPORT_BASE){ busy(this,true); var b=this;
    serverExport("xlsx",fn).catch(function(){ plainXlsx(fn); }).then(function(){ busy(b,false,"Export Excel"); });
  } else { plainXlsx(fn); }
});
$("exportPdf").addEventListener("click", function(){
  if(!STATE.items.length) return;
  var fn="Estimated_Quote_"+((STATE.header.job||"CoChaos").replace(/\s+/g,"_"));
  if(EXPORT_BASE){ busy(this,true); var b=this;
    serverExport("pdf",fn).catch(function(){ window.print(); }).then(function(){ busy(b,false,"PDF"); });
  } else { window.print(); }
});

$("budget").addEventListener("click", function(e){
  var act=e.target.getAttribute("data-act"); if(!act) return;
  var lineEl=e.target.closest(".line"); if(!lineEl) return; var uid=lineEl.getAttribute("data-uid");
  if(act==="del") delItem(uid);
  if(act==="exp"){ var b=lineEl.querySelector(".lbasis"); b.style.display = b.style.display==="none"?"block":"none"; }
});
$("budget").addEventListener("change", function(e){
  var act=e.target.getAttribute("data-act"); if(!act) return;
  var lineEl=e.target.closest(".line"); var uid=lineEl.getAttribute("data-uid");
  var it=STATE.items.filter(function(x){return x.id===uid;})[0]; if(!it) return;
  if(act==="qty"){ var L=E.computeLine(it,STATE.rates); updItem(uid, L.driver==="day"?{days:e.target.value}:{qty:e.target.value}); }
  if(act==="cost") updItem(uid,{costOverride:e.target.value});
});

load(); loadTheme(); render(); syncRates();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(function(){}); }
