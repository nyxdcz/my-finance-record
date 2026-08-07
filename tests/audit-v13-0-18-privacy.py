from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json
root=Path('/mnt/data/v13_0_18_work')
html=(root/'index.html').read_text()
privacy=(root/'privacy-lock.js').read_text()
# Browser sandbox blocks local navigation. Keep actual markup/CSS, remove JS and external styles, then execute the real privacy module separately.
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html, flags=re.I)
html=re.sub(r'<script\b[^>]*/?>', '', html, flags=re.I)
html=re.sub(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>', '', html, flags=re.I)
results={}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width,height in [(1440,900),(1024,768),(393,852),(360,800)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html, wait_until='domcontentloaded')
        page.evaluate('''() => {
          window.__privacyNav=[];
          window.goToPage=(pageId)=>{ window.__privacyNav.push(pageId); document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===pageId)); };
          window.activateSettingsPanel=(panel)=>{ window.__privacyNav.push('settings:'+panel); };
          window.showToast=(message)=>{ window.__privacyToast=message; };
          // service worker/localStorage are unavailable on the opaque set_content origin; source checks cover storage non-mutation.
        }''')
        page.add_script_tag(content=privacy)
        page.wait_for_timeout(50)
        initial_pending=page.evaluate('''() => ({locked:document.body.classList.contains("finance-signed-out"),pending:document.body.classList.contains("finance-auth-pending"),underlying:getComputedStyle(document.querySelector("#money .page-heading")).display})''')
        page.evaluate('FinancePrivacyLock.setAuthenticated(false)')
        page.wait_for_timeout(20)
        locked=page.evaluate('''() => {
          const money=document.getElementById('money');
          const view=money.querySelector(':scope > .finance-privacy-lock-view');
          const underlying=money.querySelector('.page-heading');
          const sign=document.getElementById('privacySignInButton');
          const sync=document.getElementById('cloudSyncStatusButton');
          const add=document.getElementById('quickAddExpense');
          const test=document.createElement('button'); test.id='privacyMutationFixture'; test.textContent='Mutate'; let clicks=0; test.addEventListener('click',()=>clicks++); money.append(test); test.click();
          return {
            bodyLocked:document.body.classList.contains('finance-signed-out'),
            bodyPending:document.body.classList.contains('finance-auth-pending'),
            viewDisplay:getComputedStyle(view).display,
            underlyingDisplay:getComputedStyle(underlying).display,
            zeros:[...view.querySelectorAll('strong')].map(n=>n.textContent),
            signDisplay:getComputedStyle(sign).display,
            syncDisplay:getComputedStyle(sync).display,
            addDisplay:getComputedStyle(add).display,
            mutationClicks:clicks,
            toast:window.__privacyToast||''
          };
        }''')
        page.evaluate("FinancePrivacyLock.setAuthenticated(true,{email:'signed@example.com'})")
        page.wait_for_timeout(30)
        unlocked=page.evaluate('''() => ({
          bodySignedIn:document.body.classList.contains('finance-signed-in'),
          bodyLocked:document.body.classList.contains('finance-signed-out'),
          viewDisplay:getComputedStyle(document.querySelector('#money > .finance-privacy-lock-view')).display,
          underlyingDisplay:getComputedStyle(document.querySelector('#money .page-heading')).display,
          signDisplay:getComputedStyle(document.getElementById('privacySignInButton')).display
        })''')
        page.evaluate('''() => { const d=document.getElementById('accountDialog'); try{d.showModal()}catch(e){d.setAttribute('open','')} FinancePrivacyLock.setAuthenticated(false); }''')
        relocked=page.evaluate('''() => ({locked:document.body.classList.contains('finance-signed-out'),accountOpen:document.getElementById('accountDialog').open})''')
        results[str(width)]={'initialPending':initial_pending,'locked':locked,'unlocked':unlocked,'relocked':relocked}
        page.close()
    browser.close()
(root/'audit_v13_0_18').mkdir(exist_ok=True)
(root/'audit_v13_0_18'/'privacy-lock-audit.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))

# assertions
for width,data in results.items():
    i=data['initialPending']; l=data['locked']; u=data['unlocked']; r=data['relocked']
    assert i['locked'] and i['pending'] and i['underlying']=='none', f'{width}: startup auth-pending state exposed finance content'
    assert l['bodyLocked'] and not l['bodyPending'], f'{width}: signed-out state not resolved/locked'
    assert l['viewDisplay'] != 'none' and l['underlyingDisplay']=='none', f'{width}: sensitive page not replaced by privacy view'
    assert '₱0.00' in l['zeros'] and '0' in l['zeros'], f'{width}: zero-only summary missing'
    assert l['signDisplay']!='none' and l['syncDisplay']=='none' and l['addDisplay']=='none', f'{width}: topbar privacy actions wrong'
    assert l['mutationClicks']==0 and 'Sign in' in l['toast'], f'{width}: locked finance mutation was not blocked'
    assert u['bodySignedIn'] and not u['bodyLocked'] and u['viewDisplay']=='none' and u['underlyingDisplay']!='none', f'{width}: unlock failed'
    assert r['locked'] and not r['accountOpen'], f'{width}: re-lock did not close sensitive dialog'
print('V13.0.18 privacy browser audit passed.')

assert 'localStorage.setItem' not in privacy and 'localStorage.removeItem' not in privacy and 'localStorage.clear' not in privacy, 'privacy module must not modify finance storage'
