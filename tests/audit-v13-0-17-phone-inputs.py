from playwright.sync_api import sync_playwright
from pathlib import Path
import re, json
root=Path('/mnt/data/v13_0_17_work')
html=(root/'index.html').read_text()
# Browser sandbox blocks file/local navigation. Keep the real inline CSS/markup but suppress JS execution and external resources.
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html, flags=re.I)
html=re.sub(r'<script\b[^>]*/?>', '', html, flags=re.I)
html=re.sub(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>', '', html, flags=re.I)
results={}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width,height in [(393,852),(360,800),(1024,768)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_content(html, wait_until='domcontentloaded')
        # Add representative dynamically-created controls so the generic rule is checked for runtime UI too.
        page.evaluate('''() => {
          const host=document.createElement('div'); host.id='v13017DynamicFixture';
          host.innerHTML=`<input id="dynText" class="input" type="text"><input id="dynAmount" class="input" inputmode="decimal"><input id="dynDate" class="input" type="date"><input id="dynPassword" class="input" type="password"><select id="dynSelect" class="select"><option>One</option></select><textarea id="dynArea" class="textarea"></textarea><div id="dynEditable" contenteditable="true">Editable</div>`;
          document.body.append(host);
        }''')
        data=page.evaluate('''() => {
          const selector='input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), select, textarea, [contenteditable="true"]';
          const els=[...document.querySelectorAll(selector)];
          const rows=els.map((el,i)=>({
            tag:el.tagName.toLowerCase(), id:el.id||'', type:el.getAttribute('type')||'', cls:el.className||'', font:parseFloat(getComputedStyle(el).fontSize), height:parseFloat(getComputedStyle(el).height)||el.getBoundingClientRect().height
          }));
          const under=rows.filter(r=>r.font<16-0.01);
          const dyn=['dynText','dynAmount','dynDate','dynPassword','dynSelect','dynArea','dynEditable'].map(id=>{
            const el=document.getElementById(id); return {id,font:parseFloat(getComputedStyle(el).fontSize)};
          });
          const vp=document.querySelector('meta[name="viewport"]')?.getAttribute('content')||'';
          return {count:rows.length,minFont:rows.length?Math.min(...rows.map(r=>r.font)):null,under,dyn,viewport:vp,bodyOverflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth};
        }''')
        results[str(width)] = data
        page.close()
    browser.close()
(root/'audit_v13_0_17').mkdir(exist_ok=True)
(root/'audit_v13_0_17'/'phone-input-audit.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
