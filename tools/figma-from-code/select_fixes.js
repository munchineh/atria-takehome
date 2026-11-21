// Picks the "Select" control inside each suggestion card by its tag (Creative, Ad copy, Landing page).
// mode 'list' reports the cards; mode 'apply' sets the duplicate-ad selection used by c01 to c03.
(mode) => {
  const isCtl=e=>/^(Select|Selected)$/.test((e.innerText||'').trim());
  const all=[...document.querySelectorAll('*')].filter(e=>isCtl(e) && !(e.parentElement && isCtl(e.parentElement)));
  const count=el=>all.filter(x=>el.contains(x)).length;
  const out=[];
  for (const b of all) {
    let c=b; while (c.parentElement && count(c.parentElement)===1) c=c.parentElement;
    const t=c.innerText; const kind=/Ad copy|Landing page/.test(t)?'ad':(/Creative/.test(t)?'creative':'?');
    const state=b.innerText.trim();
    out.push(kind+':'+state+':'+t.split('\n')[0].slice(0,60));
    if (mode==='apply') { if ((kind==='creative' && state==='Selected')||(kind==='ad' && state==='Select')) b.click(); }
  }
  return out;
}
