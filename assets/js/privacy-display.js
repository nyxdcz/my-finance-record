"use strict";

/* In-session display privacy. Financial values stay unchanged in storage and memory. */
(function privacyDisplayBootstrap() {
  const STORAGE_PREFIX="simple-finance-privacy-display-v1";
  const MASK="₱•••••";
  const CURRENCY_PATTERN=/(?:₱|PHP\s*)[-+]?\s*\d[\d,]*(?:\.\d{1,2})?/giu;
  const CURRENCY_TEST=/(?:₱|PHP\s*)[-+]?\s*\d[\d,]*(?:\.\d{1,2})?/iu;
  const originalMoney=money;
  let hidden=false, observer=null, applying=false;
  function profileId(){return String(window.FinanceProfileArchitecture?.activeProfileId?.()||"default").replace(/[^a-zA-Z0-9_-]/g,"-");}
  function storageKey(){return `${STORAGE_PREFIX}:${profileId()}`;}
  function read(){try{return localStorage.getItem(storageKey())==="hidden";}catch{return false;}}
  function write(){try{localStorage.setItem(storageKey(),hidden?"hidden":"visible");}catch{}}
  function maskedText(value){return String(value||"").replace(CURRENCY_PATTERN,"Amount hidden");}
  function maskNode(root=document.body){
    if(!hidden||!root||applying)return; applying=true;
    try{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const parent=node.parentElement;if(!parent||parent.closest("script,style,template,input,textarea,select,option"))return NodeFilter.FILTER_REJECT;return CURRENCY_TEST.test(node.nodeValue||"")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
      const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{node.nodeValue=String(node.nodeValue||"").replace(CURRENCY_PATTERN,MASK);});
      root.querySelectorAll?.("[aria-label],[title],[aria-valuetext]").forEach(element=>["aria-label","title","aria-valuetext"].forEach(attribute=>{const value=element.getAttribute(attribute);if(value&&CURRENCY_TEST.test(value))element.setAttribute(attribute,maskedText(value));}));
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
    if(render&&typeof renderAll==="function")renderAll(true);
    if(hidden)queueMicrotask(()=>maskNode(document.body));
    window.dispatchEvent(new CustomEvent("finance:privacy-display-changed",{detail:{hidden}}));
  }
  function setHidden(value,{persist=true,render=true}={}){hidden=Boolean(value);if(persist)write();refresh({render});return hidden;}
  function toggle(){return setHidden(!hidden);}
  money=function privacyAwareMoney(value){return hidden?MASK:originalMoney(value);};
  function observe(){observer?.disconnect();observer=new MutationObserver(records=>{if(!hidden||applying)return;records.forEach(record=>{if(record.type==="characterData")maskNode(record.target.parentElement);record.addedNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)maskNode(node.parentElement);else if(node.nodeType===Node.ELEMENT_NODE)maskNode(node);});});});observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
  document.addEventListener("click",event=>{if(event.target.closest("#privacyDisplayToggle")){toggle();return;}if(hidden)queueMicrotask(()=>maskNode(document.body));},true);
  window.addEventListener("finance:page-changed",()=>{if(hidden)queueMicrotask(()=>maskNode(document.body));});
  window.addEventListener("finance:profile-changed",()=>setHidden(read(),{persist:false}));
  hidden=read();injectButton();observe();refresh({render:hidden});
  window.FinancePrivacyDisplay={storagePrefix:STORAGE_PREFIX,get storageKey(){return storageKey();},get hidden(){return hidden;},toggle,setHidden,mask:()=>maskNode(document.body)};
})();
