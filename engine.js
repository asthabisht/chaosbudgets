/* engine.js — pricing engine + fully client-side branded exporters.
   Excel via xlsx-js-style (styled), PDF via jsPDF + autotable. No server needed.
   Works in browser (globals) and Node (module.exports) for testing. */
(function (root) {
  "use strict";

  var DEFAULT_RATES = [
    { keywords:"fridge magnet", category:"giveaway", driver:"piece", unit_cost:16, supplier:"tahadogifts", contact:"", confidence:"high", note:"NB budget, 7cm magnet" },
    { keywords:"badge|pin", category:"giveaway", driver:"piece", unit_cost:14, supplier:"tahadogifts", contact:"", confidence:"high", note:"NB budget badges" },
    { keywords:"sticker", category:"giveaway", driver:"piece", unit_cost:5.5, supplier:"One Print", contact:"", confidence:"high", note:"NB budget sticker" },
    { keywords:"tote|bag", category:"giveaway", driver:"piece", unit_cost:25, supplier:"tahadogifts", contact:"", confidence:"low", note:"placeholder — confirm" },
    { keywords:"cutout|logo|letter", category:"scenic", driver:"m2", unit_cost:370, supplier:"Bolt", contact:"", confidence:"med", note:"MDF 370/m2, anchor Bolt step&repeat" },
    { keywords:"step & repeat|backdrop|media wall|wall", category:"scenic", driver:"m2", unit_cost:370, supplier:"Bolt", contact:"", confidence:"high", note:"370/m2 anchor Bolt" },
    { keywords:"carpet|floor", category:"scenic", driver:"m2", unit_cost:45, supplier:"Bolt", contact:"", confidence:"high", note:"45/m2 Bolt carpet" },
    { keywords:"mirror", category:"scenic", driver:"m2", unit_cost:3900, supplier:"Bolt", contact:"", confidence:"high", note:"3900/m2 Bolt mirrors" },
    { keywords:"led|screen", category:"av", driver:"day", unit_cost:5105, supplier:"Naturals", contact:"", confidence:"med", note:"Naturals LED" },
    { keywords:"speaker|pa|audio|sound", category:"av", driver:"day", unit_cost:3800, supplier:"Naturals", contact:"", confidence:"high", note:"NB speakers/day" },
    { keywords:"dj|decks", category:"av", driver:"day", unit_cost:4260, supplier:"Naturals", contact:"", confidence:"high", note:"NB DJ/day" },
    { keywords:"photo booth|photobooth|360", category:"activation", driver:"day", unit_cost:1500, supplier:"Diamond", contact:"", confidence:"low", note:"activation/day placeholder" },
    { keywords:"boxing machine", category:"activation", driver:"day", unit_cost:3250, supplier:"Tilt Amusements", contact:"", confidence:"high", note:"NB budget" },
    { keywords:"host|hostess|promoter", category:"entertainment", driver:"show", unit_cost:770, supplier:"JAM", contact:"James Mistry", confidence:"high", note:"JAM hostess 110/hr x7" },
    { keywords:"band|musician|live music", category:"entertainment", driver:"show", unit_cost:6000, supplier:"Energie", contact:"", confidence:"low", note:"per-show rough est" },
    { keywords:"dancer|performer|act", category:"entertainment", driver:"show", unit_cost:350, supplier:"Energie", contact:"", confidence:"med", note:"talent/show est" },
    { keywords:"project manager", category:"staffing", driver:"day", unit_cost:2500, supplier:"Enigma", contact:"", confidence:"high", note:"crew 2500/day" },
    { keywords:"producer|executive producer", category:"staffing", driver:"day", unit_cost:3500, supplier:"Enigma", contact:"", confidence:"high", note:"crew 3500/day" },
    { keywords:"av technician", category:"staffing", driver:"day", unit_cost:1650, supplier:"Enigma", contact:"", confidence:"high", note:"crew designer/day" }
  ];
  var SECTIONS = [
    ["av","PRODUCTION - AV & BRANDING",false],["scenic","SCENIC & FABRICATION",false],
    ["activation","ACTIVATIONS",false],["giveaway","GIVEAWAYS",false],
    ["entertainment","ENTERTAINMENT & TALENT",false],["staffing","STAFFING",true]
  ];
  var UNIT = { mm:0.001, cm:0.01, m:1 };
  var GREEN="D7E4BD", BLUE="B9CDE5", FONT="Proxima Nova Regular";
  var ADDRESS="Unit 203, DSC Tower Dubai Studio City, Dubai, United Arab Emirates";
  var TC = {
    "TERMS & CONDITIONS":[
     "All items are on a rental basis and for a one time installation / dismantle, unless mentioned specifically. Elements and items proposed are subject to availability upon confirmation",
     "Final Costs will be based on final review and confirmation of all the requirements, detailed technical drawings, site visits and time available when the project is signed off by both parties",
     "The cost of the project will be incurred through the approved Purchase Order (PO). Any alterations to the requirements or scope will impact the initial costing and result in variations subject to mutual agreement",
     "A detailed project plan will be presented upon being awarded and will be updated when relevant, and in the circumstances of certain elements being not available - suitable replacement options will be suggested where possible based upon client approval",
     "Subject to venue h&s approvals and government jurisdictions, certain elements may need to be changed and subsequently modified in budget upon confirmation and approval",
     "Delays in approvals may affect the quality of the product and delivery time and the budget allocated for that line item, as such a deadline request may be placed in order to negate these effects",
     "Designs and Renders will be provided and up to 2 rounds of revisions are complimentary. Additional or new scope of work will be charged extra and based on agreed rates between the two parties"
    ],
    "BILLING AND PAYMENT":[
     "All costs based on final confirmation, detailed technical drawings and site visits. Terms of Payment will be as follows unless otherwise pre-agreed by the agency and client:",
     "50% - Advance Payment","50% - 30 Days Post Event"
    ],
    "CANCELLATION POLICY":[
     "If the client cancels or postpones the project after acceptance, then besides the below terms the agency reserves the right to charge a higher cancellation fee in the event the agency has paid 3rd party costs, manpower time and internal agency time which exceeds the % mentioned above and will be based on fair value and due diligence. The agency will also endeavour to reduce the charges of cancellation fee where possible for the client.",
     "A cancellation fee of 25% of the total quote is payable if the project is cancelled 1 month prior to the event",
     "A cancellation fee of 50% of the total quote is payable if the project is cancelled 2 weeks prior to the event",
     "A cancellation fee equalling to 100% of the total quote is payable if the project is cancelled 7 days before the event"
    ]
  };

  function num(v){ var n=parseFloat(v); return isNaN(n)?null:n; }
  function areaM2(it){ var w=num(it.w), h=num(it.h); if(w===null||h===null) return null; var f=UNIT[it.unit]||0.001; return +(w*f*h*f).toFixed(4); }
  function classify(name, rates){
    var n=(name||"").toLowerCase();
    for(var i=0;i<rates.length;i++){ var ks=String(rates[i].keywords).split("|");
      for(var j=0;j<ks.length;j++){ var k=ks[j].trim(); if(k && n.indexOf(k)>=0) return Object.assign({},rates[i]); } }
    return { category:"giveaway", driver:"piece", unit_cost:0, supplier:"", contact:"", confidence:"low", note:"unrecognised — set cost manually" };
  }
  function estimate(it, rates){
    var m=classify(it.item, rates), a=areaM2(it), qty=num(it.qty)||1;
    if(m.driver==="m2"){ var ar=a||1; m.unit_cost=+(+m.unit_cost*ar).toFixed(2); m.qcol=qty; m.qnote=ar+" m2 x rate"; }
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
  function today(){ return new Date().toLocaleDateString("en-GB"); }
  function money(n){ return (n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }

  /* ===================== STYLED INTERNAL XLSX ===================== */
  function buildWorkbook(XLSX, header, items, rates){
    var sections=groupSections(items, rates);
    var ws={}, merges=[], rows=[], MONEY='#,##0.00';
    function st(o){ var s={}; if(o.fill)s.fill={patternType:"solid",fgColor:{rgb:o.fill}}; 
      s.font={name:FONT,sz:o.sz||12,bold:!!o.bold,color:{rgb:o.color||"000000"}};
      s.alignment={horizontal:o.h||"general",vertical:o.v||"center",wrapText:!!o.wrap};
      if(o.border)s.border={bottom:{style:"thin",color:{rgb:o.border}}}; return s; }
    function put(r,c,v,o){ o=o||{}; var ref=XLSX.utils.encode_cell({r:r,c:c}); var cell;
      if(o.f!==undefined){ cell={t:"n",f:o.f}; } else if(typeof v==="number"){ cell={t:"n",v:v}; }
      else { cell={t:"s",v:(v==null?"":String(v))}; }
      if(o.z)cell.z=o.z; cell.s=st(o); ws[ref]=cell; }
    function merge(r,c1,c2){ merges.push({s:{r:r,c:c1},e:{r:r,c:c2}}); }
    function rh(r,h){ rows[r]={hpt:h}; }

    // header block (rows 5..8 = Excel 6..9), merged A:F, centered, bold
    var hb=["ENIGMA", header.event||"", (header.version||"Estimated Budget V1")+" - "+(header.date||today()), "Job Code - "+(header.job||"")];
    var r=5;
    hb.forEach(function(t){ put(r,0,t,{bold:true,h:"center",v:"center"}); merge(r,0,5); r++; });

    // column header row (Excel row 13 -> idx 12)
    r=12;
    var heads=["Item","Quantity","AED Unit BUY","AED Total BUY","AED Unit ","AED Total","Profit AED","Notes / Supplier"];
    heads.forEach(function(t,c){ var h=(c===0)?"left":(c===7?"center":"right");
      var o={bold:true,h:h,v:"center"}; if(c===2||c===3||c===6||c===7)o.fill=BLUE; put(12,c,t,o); });

    r=14; var subRows=[], exclRows=[];
    sections.forEach(function(sec){
      var sr=r, sr1=sr+1;
      for(var c=0;c<8;c++){ put(sr,c,(c===0?sec.title:(c===1?"SUB TOTAL":null)),
        {fill:GREEN,bold:true,h:(c===0?"left":(c===1?"right":(c===7?"center":"right"))),v:"center"}); }
      r=sr+1; var first1=sr+2;
      sec.lines.forEach(function(L){
        var er=r+1;
        put(r,0,L.it.item,{h:"left",v:"center"});
        put(r,1,L.qcol,{h:"right",v:"center"});
        put(r,2,L.unitCost,{fill:BLUE,h:"right",v:"center",z:MONEY});
        put(r,3,null,{fill:BLUE,h:"right",v:"center",z:MONEY,f:"C"+er+"*B"+er});
        put(r,4,null,{h:"right",v:"center",z:MONEY,f:"(C"+er+"*1.25)"});
        put(r,5,null,{h:"right",v:"center",z:MONEY,f:"E"+er+"*B"+er});
        put(r,6,null,{h:"right",v:"center",z:MONEY,f:"F"+er+"-D"+er});
        put(r,7,(L.confidence?("["+String(L.confidence).toUpperCase()+"] "):"")+(L.supplier||"")+(L.contact?(" · "+L.contact):""),{h:"left",v:"center"});
        r++;
      });
      var last1=r;
      put(sr,3,null,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY,f:"SUM(D"+first1+":D"+last1+")"});
      put(sr,5,null,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY,f:"SUM(F"+first1+":F"+last1+")"});
      put(sr,6,null,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY,f:"SUM(G"+first1+":G"+last1+")"});
      put(sr,7,null,{fill:GREEN,bold:true,h:"center",v:"center",z:"0%",f:"IF(F"+sr1+"=0,0,G"+sr1+"/F"+sr1+")"});
      subRows.push(sr1); if(!sec.excl)exclRows.push(sr1);
      r+=1;
    });
    // management fee
    var mr=r, mr1=mr+1;
    for(var c2=0;c2<8;c2++){ put(mr,c2,(c2===0?"MANAGEMENT FEE @15% - EXCLUDING STAFFING":(c2===1?1:null)),
      {fill:GREEN,bold:true,h:(c2===0?"left":"right"),v:"center",z:(c2>=2?MONEY:undefined)}); }
    put(mr,3,0,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY});
    put(mr,4,null,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY,f:"("+(exclRows.map(function(s){return "F"+s;}).join("+")||"0")+")*0.15"});
    put(mr,5,null,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY,f:"E"+mr1+"*B"+mr1});
    put(mr,6,null,{fill:GREEN,bold:true,h:"right",v:"center",z:MONEY,f:"F"+mr1+"-D"+mr1});
    r+=2;
    var allr=subRows.concat([mr1]), tr=r, tr1=tr+1;
    put(tr,0,"Total",{bold:true,h:"left",v:"center"});
    put(tr,3,null,{bold:true,h:"right",v:"center",z:MONEY,f:allr.map(function(s){return "D"+s;}).join("+")});
    put(tr,5,null,{bold:true,h:"right",v:"center",z:MONEY,f:allr.map(function(s){return "F"+s;}).join("+")});
    put(tr,6,null,{bold:true,h:"right",v:"center",z:MONEY,f:allr.map(function(s){return "G"+s;}).join("+")});
    r++; var vr=r, vr1=vr+1;
    put(vr,0,"VAT TOTAL at 5%",{bold:true,h:"left",v:"center"});
    put(vr,5,null,{bold:true,h:"right",v:"center",z:MONEY,f:"F"+tr1+"*0.05"});
    r++;
    put(r,0,"Total inclusive of VAT",{bold:true,h:"left",v:"center"});
    put(r,5,null,{bold:true,h:"right",v:"center",z:MONEY,f:"F"+tr1+"+F"+vr1});
    // ---- T&C ----
    r+=3;
    Object.keys(TC).forEach(function(hd){
      for(var c3=0;c3<8;c3++) put(r,c3,(c3===0?hd:null),{fill:"000000",bold:true,color:"FFFFFF",sz:11,h:"left",v:"center"});
      merge(r,0,7); rh(r,20); r++;
      TC[hd].forEach(function(cl){
        put(r,0,cl,{sz:10,h:"left",v:"top",wrap:true,border:"D9D9D9"});
        for(var c4=1;c4<8;c4++) put(r,c4,null,{border:"D9D9D9",sz:10});
        merge(r,0,5);
        var lines=Math.max(1, Math.ceil(cl.length/95)); rh(r, lines*13+6); r++;
      });
      r++;
    });
    ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:r+1,c:10}});
    ws["!cols"]=[{wch:81.2},{wch:14.5},{wch:19.7},{wch:16},{wch:17.3},{wch:15.7},{wch:18.7},{wch:57.3}];
    ws["!merges"]=merges; ws["!rows"]=rows;
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Estimated Budget"); return wb;
  }

  /* ===================== BRANDED CLIENT PDF ===================== */
  function buildClientPdf(jsPDFCtor, autoTableFn, header, items, rates, fontB64){
    var sections=groupSections(items,rates), t=totals(sections);
    var doc=new jsPDFCtor({unit:"pt",format:"a4"});
    var at=autoTableFn?function(o){autoTableFn(doc,o);}:function(o){doc.autoTable(o);};
    var FAM="helvetica", PN=false;
    if(fontB64){ try{ doc.addFileToVFS("PN.ttf",fontB64); doc.addFont("PN.ttf","ProximaNova","normal"); doc.addFont("PN.ttf","ProximaNova","bold"); FAM="ProximaNova"; PN=true; }catch(e){} }
    var W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight(), M=40;
    var GREENc=[215,228,189], DARK=[28,36,48], GREY=[138,138,138], LINE=[207,212,218];
    function bold(text,x,y,opt){ doc.setFont(FAM,"bold"); doc.text(text,x,y,opt||{});
      if(PN){ doc.text(text,x+0.35,y,opt||{}); } }   // faux-bold (double strike) when no bold weight
    function footer(){ doc.setFont(FAM,"normal"); doc.setFontSize(8); doc.setTextColor(138,138,138);
      doc.text(ADDRESS, W/2, H-24, {align:"center"}); doc.setTextColor(0,0,0); }
    // wordmark + centered title block (page 1)
    doc.setTextColor(28,36,48); doc.setFontSize(22); bold("ENIGMA", M, 62, {charSpace:5});
    doc.setFontSize(9.5); var ty=104;
    [ "ENIGMA", header.event||"", (header.version||"Estimated Budget V1")+" - "+(header.date||today()), "Job Code - "+(header.job||"") ]
      .forEach(function(line){ bold(line, W/2, ty, {align:"center"}); ty+=13; });
    doc.setFont(FAM,"normal"); doc.setFontSize(7.5); doc.setTextColor(138,138,138);
    doc.text("Estimated quote — auto-derived from historical supplier rates. Subject to confirmation & final scope.", W/2, ty+4, {align:"center"});
    doc.setTextColor(0,0,0);
    // table body
    var body=[], meta=[];
    sections.forEach(function(s){
      body.push([s.title,"SUB TOTAL","",money(s.totalSell)]); meta.push("sec");
      s.lines.forEach(function(L){ body.push([L.it.item, (""+L.qcol), money(L.unitSell), money(L.totalSell)]); meta.push("line"); });
    });
    body.push(["MANAGEMENT FEE @15% - EXCLUDING STAFFING","1",money(t.mgmt),money(t.mgmt)]); meta.push("sec");
    body.push(["Total","","",money(t.sell)]); meta.push("tot");
    body.push(["VAT TOTAL at 5%","","",money(t.vat)]); meta.push("tot");
    body.push(["Total inclusive of VAT","","",money(t.grand)]); meta.push("tot");
    at({
      startY: ty+18,
      head: [["Item","Quantity","AED Unit","AED Total"]],
      body: body, theme:"plain",
      styles:{ font:FAM, fontSize:8.2, textColor:DARK, cellPadding:{top:3,bottom:3,left:5,right:5} },
      headStyles:{ fontStyle:"bold", lineWidth:{bottom:0.8}, lineColor:DARK, halign:"left" },
      columnStyles:{ 0:{halign:"left",cellWidth:"auto"}, 1:{halign:"center",cellWidth:70}, 2:{halign:"right",cellWidth:75}, 3:{halign:"right",cellWidth:80} },
      margin:{left:M,right:M},
      didParseCell:function(d){ if(d.section!=="body")return; var m=meta[d.row.index];
        if(m==="sec"){ d.cell.styles.fillColor=GREENc; d.cell.styles.fontStyle="bold"; if(d.column.index===1)d.cell.styles.halign="center"; }
        else if(m==="tot"){ d.cell.styles.fontStyle="bold"; d.cell.styles.lineWidth={top:0.6}; d.cell.styles.lineColor=DARK; }
        else { d.cell.styles.lineWidth={bottom:0.4}; d.cell.styles.lineColor=LINE; } },
      didDrawPage:function(){ footer(); }
    });
    // T&C page
    doc.addPage(); footer(); var y=54;
    Object.keys(TC).forEach(function(hd){
      doc.setFillColor(28,36,48); doc.rect(M, y-11, W-2*M, 16, "F");
      doc.setFontSize(9); doc.setTextColor(255,255,255); bold(hd, M+5, y); doc.setTextColor(28,36,48); y+=18;
      doc.setFont(FAM,"normal"); doc.setFontSize(8.2);
      TC[hd].forEach(function(cl){
        var lines=doc.splitTextToSize(cl, W-2*M-4);
        if(y + lines.length*11 + 8 > H-46){ doc.addPage(); footer(); y=54; }
        doc.text(lines, M, y); y+=lines.length*11+5;
        doc.setDrawColor(207,212,218); doc.setLineWidth(0.4); doc.line(M, y-3, W-M, y-3); y+=7;
      });
      y+=8;
    });
    return doc;
  }

  var api={ DEFAULT_RATES:DEFAULT_RATES, SECTIONS:SECTIONS, num:num, areaM2:areaM2, classify:classify,
            estimate:estimate, computeLine:computeLine, groupSections:groupSections, totals:totals,
            buildWorkbook:buildWorkbook, buildClientPdf:buildClientPdf };
  if (typeof module!=="undefined" && module.exports) module.exports=api; else root.ENGINE=api;
})(typeof window!=="undefined"?window:this);
