"use strict";

/* In-session display privacy. Financial values stay unchanged in storage and memory. */
(function privacyDisplayBootstrap() {
  const STORAGE_PREFIX="simple-finance-privacy-display-v1";
  const MASK="₱•••••";
  const REVEAL_HELP="Amount hidden. Hover or focus to reveal.";
  const CURRENCY_PATTERN=/(?:₱|PHP\s*)[-+]?\s*\d[\d,]*(?:\.\d{1,2})?/giu;
  const CURRENCY_TEST=/(?:₱|PHP\s*)[-+]?\s*\d[\d,]*(?:\.\d{1,2})?/iu;
  const TOKEN_OPEN="\u2063";
  const TOKEN_CLOSE="\u2064";
  const TOKEN_PATTERN=new RegExp(`${MASK}${TOKEN_OPEN}([\u200B\u200C]+)${TOKEN_CLOSE}`,"gu");
  const MASK_SELECTOR=".privacy-value-mask,.privacy-attribute-mask";
  const originalMoney=money;
  const tokenMoney=new Map();
  const originalValues=new WeakMap();
  const originalAttributes=new WeakMap();
  const fallbackTextNodes=new Set();
  let hidden=false, observer=null, applying=false, maskScheduled=false, nextTokenId=0;

  function profileId(){return String(window.FinanceProfileArchitecture?.activeProfileId?.()||"default").replace(/[^a-zA-Z0-9_-]/g,"-");}
  function storageKey(){return `${STORAGE_PREFIX}:${profileId()}`;}
  function read(){try{return localStorage.getItem(storageKey())==="hidden";}catch{return false;}}
  function write(){try{localStorage.setItem(storageKey(),hidden?"hidden":"visible");}catch{}}
  function encodeToken(id){return id.toString(2).replaceAll("0","\u200B").replaceAll("1","\u200C");}
  function expandTokens(value){return String(value||"").replace(TOKEN_PATTERN,(_match,token)=>tokenMoney.get(token)||MASK);}
  function maskedText(value){return expandTokens(value).replace(CURRENCY_PATTERN,"Amount hidden");}
  function isExcludedText(node){return Boolean(node.parentElement?.closest("script,style,template,input,textarea,select,option,.privacy-value-mask"));}
  function createMaskedValue(value){
    const span=document.createElement("span");
    span.className="privacy-value-mask";
    span.tabIndex=0;
    span.textContent=MASK;
    span.setAttribute("aria-label",REVEAL_HELP);
    span.title="Hover or focus to reveal";
    originalValues.set(span,value);
    return span;
  }
  function maskTextNode(node){
    if(!node?.parentElement||isExcludedText(node))return;
    const source=expandTokens(node.nodeValue||"");
    if(!CURRENCY_TEST.test(source)){
      if(source!==node.nodeValue)node.nodeValue=source;
      return;
    }
    if(node.parentElement.closest("svg")){
      fallbackTextNodes.add(node);
      originalValues.set(node,source);
      node.nodeValue=source.replace(CURRENCY_PATTERN,MASK);
      return;
    }
    const fragment=document.createDocumentFragment();
    let cursor=0;
    for(const match of source.matchAll(CURRENCY_PATTERN)){
      if(match.index>cursor)fragment.append(document.createTextNode(source.slice(cursor,match.index)));
      fragment.append(createMaskedValue(match[0]));
      cursor=match.index+match[0].length;
    }
    if(cursor<source.length)fragment.append(document.createTextNode(source.slice(cursor)));
    node.replaceWith(fragment);
  }
  function maskAttributes(root){
    const selector="[aria-label],[title],[aria-valuetext]";
    const elements=[];
    if(root.nodeType===Node.ELEMENT_NODE&&root.matches?.(selector))elements.push(root);
    root.querySelectorAll?.(selector).forEach(element=>elements.push(element));
    elements.forEach(element=>{
      if(element.closest(".privacy-value-revealed"))return;
      const saved=originalAttributes.get(element)||new Map();
      ["aria-label","title","aria-valuetext"].forEach(attribute=>{
        const current=element.getAttribute(attribute);
        if(!current)return;
        const expanded=expandTokens(current);
        if(!CURRENCY_TEST.test(expanded)){
          if(expanded!==current)element.setAttribute(attribute,expanded);
          return;
        }
        saved.set(attribute,expanded);
        element.setAttribute(attribute,maskedText(expanded));
      });
      if(saved.size){originalAttributes.set(element,saved);element.classList.add("privacy-attribute-mask");}
    });
  }
  function maskNode(root=document.body){
    if(!hidden||!root||applying)return;
    applying=true;
    try{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
        if(isExcludedText(node)||node.parentElement?.closest(".privacy-value-revealed"))return NodeFilter.FILTER_REJECT;
        const value=expandTokens(node.nodeValue||"");
        return CURRENCY_TEST.test(value)||value!==node.nodeValue?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
      }});
      const nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(maskTextNode);
      maskAttributes(root);
    } finally {applying=false;}
  }
  function scheduleMask(){
    if(!hidden||maskScheduled)return;
    maskScheduled=true;
    queueMicrotask(()=>{
      maskScheduled=false;
      maskNode(document.body);
      tokenMoney.clear();
    });
  }
  function reveal(element){
    if(!hidden||!element)return;
    applying=true;
    try{
      const value=originalValues.get(element);
      if(value!==undefined){element.textContent=value;element.setAttribute("aria-label",value);}
      const attributes=originalAttributes.get(element);
      attributes?.forEach((original,attribute)=>element.setAttribute(attribute,original));
      element.classList.add("privacy-value-revealed");
    } finally {applying=false;}
  }
  function conceal(element){
    if(!hidden||!element||element.matches(":hover")||element.contains(document.activeElement))return;
    applying=true;
    try{
      if(originalValues.has(element)){element.textContent=MASK;element.setAttribute("aria-label",REVEAL_HELP);}
      const attributes=originalAttributes.get(element);
      attributes?.forEach((original,attribute)=>element.setAttribute(attribute,maskedText(original)));
      element.classList.remove("privacy-value-revealed");
    } finally {applying=false;}
  }
  function restoreAll(){
    applying=true;
    try{
      document.querySelectorAll(".privacy-value-mask").forEach(element=>{
        const value=originalValues.get(element);
        if(value!==undefined)element.replaceWith(document.createTextNode(value));
      });
      document.querySelectorAll(".privacy-attribute-mask").forEach(element=>{
        originalAttributes.get(element)?.forEach((original,attribute)=>element.setAttribute(attribute,original));
        element.classList.remove("privacy-attribute-mask","privacy-value-revealed");
      });
      fallbackTextNodes.forEach(node=>{if(node.isConnected&&originalValues.has(node))node.nodeValue=originalValues.get(node);});
      fallbackTextNodes.clear();
      tokenMoney.clear();
    } finally {applying=false;}
  }
  function updateButton(){
    const button=document.getElementById("privacyDisplayToggle");if(!button)return;
    button.setAttribute("aria-pressed",String(hidden));button.setAttribute("aria-label",hidden?"Show monetary values":"Hide monetary values");button.querySelector("[data-privacy-label]").textContent=hidden?"Show values":"Hide values";
  }
  function injectButton(){
    if(document.getElementById("privacyDisplayToggle"))return;
    const panel=document.getElementById("topbarToolsPanel");if(!panel)return;
    const button=document.createElement("button");button.id="privacyDisplayToggle";button.type="button";button.className="topbar-tools-item privacy-display-toggle";button.setAttribute("role","menuitem");button.innerHTML='<span class="toolbar-icon" aria-hidden="true">◉</span><span><strong data-privacy-label>Hide values</strong><small>Mask money on this screen</small></span>';
    const search=panel.querySelector("[data-open-global-search],#topbarSearchButton");search?search.before(button):panel.append(button);updateButton();
  }
  function refresh({render=true}={}){
    document.documentElement.classList.toggle("finance-values-hidden",hidden);updateButton();
    if(!hidden)restoreAll();
    if(render&&typeof renderAll==="function")renderAll(true);
    if(hidden)scheduleMask();
    window.dispatchEvent(new CustomEvent("finance:privacy-display-changed",{detail:{hidden}}));
  }
  function setHidden(value,{persist=true,render=true}={}){hidden=Boolean(value);if(persist)write();refresh({render});return hidden;}
  function toggle(){return setHidden(!hidden);}
  money=function privacyAwareMoney(value){
    const formatted=originalMoney(value);
    if(!hidden)return formatted;
    const token=encodeToken(++nextTokenId);
    tokenMoney.set(token,formatted);
    scheduleMask();
    return `${MASK}${TOKEN_OPEN}${token}${TOKEN_CLOSE}`;
  };
  function observe(){observer?.disconnect();observer=new MutationObserver(()=>{if(hidden&&!applying)scheduleMask();});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","aria-valuetext"]});}
  function maskTarget(event){return event.target instanceof Element?event.target.closest(MASK_SELECTOR):event.target?.parentElement?.closest(MASK_SELECTOR);}
  document.addEventListener("pointerover",event=>{const target=maskTarget(event);if(target&&!target.contains(event.relatedTarget))reveal(target);},true);
  document.addEventListener("pointerout",event=>{const target=maskTarget(event);if(target&&!target.contains(event.relatedTarget))conceal(target);},true);
  document.addEventListener("focusin",event=>reveal(maskTarget(event)),true);
  document.addEventListener("focusout",event=>{const target=maskTarget(event);if(target)queueMicrotask(()=>conceal(target));},true);
  document.addEventListener("click",event=>{if(event.target.closest("#privacyDisplayToggle")){toggle();return;}if(hidden)scheduleMask();},true);
  window.addEventListener("finance:page-changed",scheduleMask);
  window.addEventListener("finance:profile-changed",()=>setHidden(read(),{persist:false}));
  hidden=read();injectButton();observe();refresh({render:hidden});
  window.FinancePrivacyDisplay={storagePrefix:STORAGE_PREFIX,get storageKey(){return storageKey();},get hidden(){return hidden;},toggle,setHidden,mask:()=>maskNode(document.body)};
})();
