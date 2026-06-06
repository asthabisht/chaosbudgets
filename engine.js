/* engine.js — pricing engine + Excel builder.
   Works in the browser (globals) and in Node (module.exports) for testing. */
(function (root) {
  "use strict";

  // Fallback library — used only until /api/rates responds the first time.
  var DEFAULT_RATES = [
    { keywords:"fridge magnet", category:"giveaway", driver:"piece", unit_cost:16, supplier:"tahadogifts", contact:"", email:"", confidence:"high", note:"NB budget, 7cm magnet" },
    { keywords:"badge|pin", category:"giveaway", driver:"piece", unit_cost:14, supplier:"tahadogifts", contact:"", email:"", confidence:"high", note:"NB budget badges" },
    { keywords:"sticker", category:"giveaway", driver:"piece", unit_cost:5.5, supplier:"One Print", contact:"", email:"", confidence:"high", note:"NB budget sticker" },
    { keywords:"tote|bag", category:"giveaway", driver:"piece", unit_cost:25, supplier:"tahadogifts", contact:"", email:"", confidence:"low", note:"placeholder — confirm" },
    { keywords:"cutout|logo|letter", category:"scenic", driver:"m2", unit_cost:370, supplier:"Bolt", contact:"", email:"", confidence:"med", note:"MDF 370/m², anchor Bolt step&repeat" },
    { keywords:"step & repeat|backdrop|media wall|wall", category:"scenic", driver:"m2", unit_cost:370, supplier:"Bolt", contact:"", email:"", confidence:"high", note:"370/m² anchor Bolt" },
    { keywords:"carpet|floor", category:"scenic", driver:"m2", unit_cost:45, supplier:"Bolt", contact:"", email:"", confidence:"high", note:"45/m² Bolt carpet" },
    { keywords:"mirror", category:"scenic", driver:"m2", unit_cost:3900, supplier:"Bolt", contact:"", email:"", confidence:"high", note:"3900/m² Bolt mirrors" },
    { keywords:"led|screen", category:"av", driver:"day", unit_cost:5105, supplier:"Naturals", contact:"", email:"", confidence:"med", note:"Naturals LED" },
    { keywords:"speaker|pa|audio|sound", category:"av", driver:"day", unit_cost:3800, supplier:"Naturals", contact:"", email:"", confidence:"high", note:"NB budget speakers/day" },
    { keywords:"dj|decks", category:"av", driver:"day", unit_cost:4260, supplier:"Naturals", contact:"", email:"", confidence:"high", note:"NB budget DJ/day" },
    { keywords:"photo booth|photobooth|360", category:"activation", driver:"day", unit_cost:1500, supplier:"Diamond", contact:"", email:"", confidence:"low", note:"activation/day placeholder" },
    { keywords:"boxing machine", category:"activation", driver:"day", unit_cost:3250, supplier:"Tilt Amusements", contact:"", email:"", confidence:"high", note:"NB budget" },
    { keywords:"host|hostess|promoter", category:"entertainment", driver:"show", unit_cost:770, supplier:"JAM", contact:"James Mistry", email:"", confidence:"high", note:"JAM hostess 110/hr x7" },
    { keywords:"band|musician|live music", category:"entertainment", driver:"show", unit_cost:6000, supplier:"Energie", contact:"", email:"", confidence:"low", note:"per-show rough est" },
    { keywords:"dancer|performer|act", category:"entertainment", driver:"show", unit_cost:350, supplier:"Energie", contact:"", email:"", confidence:"med", note:"talent/show est" },
    { keywords:"project manager", category:"staffing", driver:"day", unit_cost:2500, supplier:"Enigma", contact:"", email:"", confidence:"high", note:"crew 2500/day" },
    { keywords:"producer|executive producer", category:"staffing", driver:"day", unit_cost:3500, supplier:"Enigma", contact:"", email:"", confidence:"high", note:"crew 3500/day" },
    { keywords:"av technician", category:"staffing", driver:"day", unit_cost:1650, supplier:"Enigma", contact:"", email:"", confidence:"high", note:"crew 1650/day" },
    { keywords:"designer", category:"staffing", driver:"day", unit_cost:2000, supplier:"Enigma", contact:"", email:"", confidence:"med", note:"crew designer/day" }
  ];

  var SECTIONS = [
    ["av","PRODUCTION - AV & BRANDING",false],["scenic","SCENIC & FABRICATION",false],
    ["activation","ACTIVATIONS",false],["giveaway","GIVEAWAYS",false],
    ["entertainment","ENTERTAINMENT & TALENT",false],["staffing","STAFFING",true]
  ];
  var UNIT = { mm:0.001, cm:0.01, m:1 };

  function num(v){ var n=parseFloat(v); return isNaN(n)?null:n; }
  function areaM2(it){ var w=num(it.w), h=num(it.h); if(w===null||h===null) return null; var f=UNIT[it.unit]||0.001; return +(w*f*h*f).toFixed(4); }
  function classify(name, rates){
    var n=(name||"").toLowerCase();
    for(var i=0;i<rates.length;i++){ var ks=String(rates[i].keywords).split("|");
      for(var j=0;j<ks.length;j++){ var k=ks[j].trim(); if(k && n.indexOf(k)>=0) return Object.assign({},rates[i]); } }
    return { category:"giveaway", driver:"piece", unit_cost:0, supplier:"", contact:"", email:"", confidence:"low", note:"unrecognised — set cost manually" };
  }
  function estimate(it, rates){
    var m=classify(it.item, rates), a=areaM2(it), qty=num(it.qty)||1;
    if(m.driver==="m2"){ var ar=a||1; m.unit_cost=+(+m.unit_cost*ar).toFixed(2); m.qcol=qty; m.qnote=ar+" m² × rate"; }
    else if(m.driver==="day"){ var d=num(it.days)||qty; m.qcol=d; m.qnote=d+" day(s)"; }
    else if(m.driver==="show"){ m.qcol=qty; m.qnote="per show"+(it.duration?(" · "+it.duration+"h"):""); }
    else { m.qcol=qty; m.qnote="per piece"; }
    if(it.costOverride!==undefined && it.costOverride!=="" && num(it.costOverride)!==null){ m.unit_cost=num(it.costOverride); m.confidence="manual"; m.note="manual override"; }
    m.unit_cost=+m.unit_cost; return m;
  }
  function computeLine(it, rates){
    var e=estimate(it, rates), uc=e.unit_cost||0, q=e.qcol||1;
    var tc=uc*q, us=uc*1.25, ts=us*q;
    e.unitCost=uc; e.qcol=q; e.totalCost=tc; e.unitSell=us; e.totalSell=ts; e.profit=ts-tc; e.it=it; return e;
  }
  function groupSections(items, rates){
    var by={}; items.forEach(function(it){ var L=computeLine(it,rates); (by[L.category]=by[L.category]||[]).push(L); });
    return SECTIONS.filter(function(s){return by[s[0]];}).map(function(s){
      var lines=by[s[0]];
      return { cat:s[0], title:s[1], excl:s[2], lines:lines,
        totalCost:lines.reduce(function(a,l){return a+l.totalCost;},0),
        totalSell:lines.reduce(function(a,l){return a+l.totalSell;},0) };
    });
  }
  function totals(sections){
    var mgmtBase=sections.filter(function(s){return !s.excl;}).reduce(function(a,s){return a+s.totalSell;},0);
    var mgmt=mgmtBase*0.15;
    var cost=sections.reduce(function(a,s){return a+s.totalCost;},0);
    var sell=sections.reduce(function(a,s){return a+s.totalSell;},0)+mgmt;
    var vat=sell*0.05;
    return { mgmt:mgmt, cost:cost, sell:sell, vat:vat, grand:sell+vat, profit:sell-cost };
  }

  // ---- Excel builder (Enigma template, live formulas) ----
  function buildWorkbook(XLSX, header, items, rates){
    var sections=groupSections(items, rates);
    var ws={}, money="#,##0.00", pct="0%";
    function set(r,c,cell){ ws[XLSX.utils.encode_cell({r:r,c:c})]=cell; }
    function put(r,c,v,o){ o=o||{}; var cell; if(o.f){cell={t:"n",f:o.f};} else if(typeof v==="number"){cell={t:"n",v:v};} else {cell={t:"s",v:String(v==null?"":v)};} if(o.z)cell.z=o.z; set(r,c,cell); }
    var r=0;
    ["ENIGMA", header.event||"", "Estimated Quote V1 - "+new Date().toLocaleDateString("en-GB"),
     "Job Code - "+(header.job||""), "Client - "+(header.client||"")].forEach(function(t){ put(r,0,t); r++; });
    r++; put(r,0,"⚠ ESTIMATED QUOTE — auto-derived from historical supplier rates. Subject to confirmation & final scope."); r+=2;
    ["Item","Quantity","AED Unit BUY","AED Total BUY","AED Unit","AED Total","Profit AED","Notes / Supplier","Contact","Email","Basis / Confidence"]
      .forEach(function(h,c){ put(r,c,h); }); r++;
    var subRows=[], exclRows=[];
    sections.forEach(function(sec){
      var secR=r; put(secR,0,sec.title); put(secR,1,"SUB TOTAL"); r++;
      var first=r+1;
      sec.lines.forEach(function(L){
        var er=r+1;
        put(r,0,L.it.item); put(r,1,L.qcol);
        put(r,2,L.unitCost,{z:money});
        put(r,3,null,{f:"C"+er+"*B"+er,z:money});
        put(r,4,null,{f:"C"+er+"*1.25",z:money});
        put(r,5,null,{f:"E"+er+"*B"+er,z:money});
        put(r,6,null,{f:"F"+er+"-D"+er,z:money});
        put(r,7,L.supplier||""); put(r,8,L.contact||""); put(r,9,L.email||"");
        put(r,10,"["+String(L.confidence).toUpperCase()+"] "+L.note);
        r++;
      });
      var last=r, sr=secR+1;
      put(secR,3,null,{f:"SUM(D"+first+":D"+last+")",z:money});
      put(secR,5,null,{f:"SUM(F"+first+":F"+last+")",z:money});
      put(secR,6,null,{f:"SUM(G"+first+":G"+last+")",z:money});
      put(secR,7,null,{f:"IF(F"+sr+"=0,0,G"+sr+"/F"+sr+")",z:pct});
      subRows.push(sr); if(!sec.excl) exclRows.push(sr); r++;
    });
    var mr=r+1;
    put(r,0,"MANAGEMENT FEE @15% - EXCLUDING STAFFING"); put(r,1,1); put(r,3,0,{z:money});
    put(r,4,null,{f:"SUM("+(exclRows.map(function(s){return "F"+s;}).join("+")||"0")+")*0.15",z:money});
    put(r,5,null,{f:"E"+mr+"*B"+mr,z:money}); put(r,6,null,{f:"F"+mr+"-D"+mr,z:money}); r+=2;
    var all=subRows.concat([mr]), tr=r+1;
    put(r,0,"Total");
    put(r,3,null,{f:all.map(function(s){return "D"+s;}).join("+"),z:money});
    put(r,5,null,{f:all.map(function(s){return "F"+s;}).join("+"),z:money});
    put(r,6,null,{f:all.map(function(s){return "G"+s;}).join("+"),z:money}); r++;
    var vr=r+1; put(r,0,"VAT TOTAL at 5%"); put(r,5,null,{f:"F"+tr+"*0.05",z:money}); r++;
    put(r,0,"Total inclusive of VAT"); put(r,5,null,{f:"F"+tr+"+F"+vr,z:money}); r++;
    ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:r+1,c:10}});
    ws["!cols"]=[{wch:52},{wch:11},{wch:14},{wch:14},{wch:13},{wch:13},{wch:14},{wch:18},{wch:16},{wch:22},{wch:46}];
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Estimated Quote"); return wb;
  }

  var api={ DEFAULT_RATES:DEFAULT_RATES, SECTIONS:SECTIONS, num:num, areaM2:areaM2, classify:classify,
            estimate:estimate, computeLine:computeLine, groupSections:groupSections, totals:totals, buildWorkbook:buildWorkbook };
  if (typeof module!=="undefined" && module.exports) module.exports=api; else root.ENGINE=api;
})(typeof window!=="undefined"?window:this);
