from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path('/mnt/data/v13_0_18_work')
html=(root/'index.html').read_text(); privacy=(root/'privacy-lock.js').read_text()
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html, flags=re.I)
html=re.sub(r'<script\b[^>]*/?>', '', html, flags=re.I)
html=re.sub(r'<link\b[^>]*rel=["\']stylesheet["\'][^>]*>', '', html, flags=re.I)
out=root/'audit_v13_0_18'; out.mkdir(exist_ok=True)
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
  for name,w,h in [('macbook1440-signed-out',1440,900),('iphone393-signed-out',393,852)]:
    page=browser.new_page(viewport={'width':w,'height':h})
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate("window.goToPage=()=>{};window.activateSettingsPanel=()=>{};window.showToast=()=>{}")
    page.add_script_tag(content=privacy)
    page.evaluate("FinancePrivacyLock.setAuthenticated(false)")
    page.wait_for_timeout(30)
    page.screenshot(path=str(out/f'{name}.png'), full_page=True)
    page.close()
  browser.close()
