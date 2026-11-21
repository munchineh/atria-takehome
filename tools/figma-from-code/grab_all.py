"""Capture DOM layout JSON (and a PNG) for every page-7 state.
usage: grab_all.py key1,key2,...   (default: all)"""
from pathlib import Path
HERE = Path(__file__).resolve().parent
import asyncio, sys, json, os
from playwright.async_api import async_playwright
B = 'https://atria-takehome.mancini-tan.workers.dev/?g=2'
OUT = str(HERE / 'states') + '/'
os.makedirs(OUT, exist_ok=True)
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
JS = open(HERE / 'extract.js').read()
AD = '#/ad/mm-1090245'
DUP = open(HERE / 'select_fixes.js').read()

async def snap(pg, key):
    await pg.evaluate("()=>{for(const e of document.querySelectorAll('.ant-message-notice, .ant-notification-notice, [role=alert], [role=status]')){if(/couldn.t be generated|sample image/i.test(e.innerText||''))e.remove()}}")
    await pg.wait_for_timeout(300)
    d = await pg.evaluate(JS, {})
    json.dump(d, open(OUT + key + '.json', 'w'))
    await pg.screenshot(path=OUT + key + '.png')
    print('saved', key, pg.url, flush=True)

async def park(pg):
    w = pg.viewport_size['width']
    await pg.mouse.move(w - 1, 600 if w > 500 else 830); await pg.wait_for_timeout(300)

async def page(b, route, w=1504, rm='reduce'):
    pg = await b.new_page(viewport={'width': w, 'height': 900 if w > 500 else 844}, reduced_motion=rm)
    await pg.goto(B + route); await pg.wait_for_timeout(3500); await park(pg)
    return pg

async def run(b, keys):
    K = lambda *ks: any(k in keys for k in ks)
    if K('a01'):
        pg = await page(b, '#/'); await snap(pg, 'a01')
        if K('pop'):
            await pg.close(); pg = await page(b, '#/', rm='no-preference'); await pg.wait_for_timeout(1500)
            row = pg.locator('tr', has_text='Feeling squishy?').first
            await row.locator('td').nth(3).get_by_text('D', exact=True).first.hover(); await pg.wait_for_timeout(1500)
            print('popovers', await pg.evaluate("()=>[...document.querySelectorAll('.ant-popover')].filter(e=>getComputedStyle(e).visibility!=='hidden').length")); await snap(pg, 'pop')
            await park(pg)
        if K('notif'):
            await pg.locator('.bell-btn').first.click(); await pg.wait_for_timeout(1200); await snap(pg, 'notif')
        await pg.close()
    if K('a02', 'd02'):
        pg = await page(b, AD); await snap(pg, 'a02')
        if K('d02'):
            await pg.get_by_text('History', exact=True).first.click(); await pg.wait_for_timeout(1500); await park(pg); await snap(pg, 'd02')
        await pg.close()
    if K('a04', 'a05', 'a06'):
        pg = await page(b, AD)
        await pg.get_by_text('Continue', exact=True).first.click(); await pg.wait_for_timeout(1500); await park(pg); await snap(pg, 'a04')
        await pg.get_by_text('Generate 8 creatives', exact=True).first.click(); await pg.wait_for_timeout(14000); await park(pg); await snap(pg, 'a05')
        await pg.wait_for_timeout(30000); await park(pg); await snap(pg, 'a06')
        await pg.close()
    if K('a07'):
        pg = await page(b, '#/ad/mm-1086424/variations?round=job-1086424'); await snap(pg, 'a07'); await pg.close()
    if K('a08', 'a09', 'a10'):
        pg = await page(b, '#/creation/mm-1090247/job-1090247-different-1/edit'); await snap(pg, 'a08')
        if K('a09', 'a10'):
            await pg.get_by_text('Make the product bigger', exact=True).first.click(); await pg.wait_for_timeout(600)
            # Live image generation needs the Gemini key, so the generated result is shown with the prototype's own
            # mapping (x05c -> e03 for "Make the product bigger") and the Save button in its enabled state.
            await pg.evaluate("""()=>{const im=[...document.querySelectorAll('img')].filter(i=>/x05c-/.test(i.src)).sort((a,b)=>b.width-a.width)[0]; if(im){im.src=im.src.replace(/x05c-[^/]+\.webp/,'e03-BFrXx5Wo.webp'); im.srcset='';}
              const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Save version'); if(b){b.removeAttribute('disabled'); b.classList.remove('ant-btn-disabled'); b.style.cssText='background:#f66c30;color:#fff;border-color:#f66c30';}}""")
            await pg.wait_for_timeout(1500); await park(pg); await snap(pg, 'a09')
            await pg.evaluate("""()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='Save version'); if(b){b.setAttribute('disabled',''); b.style.cssText='';}
              const t=document.querySelector('textarea'); if(t){} }""")
            await pg.wait_for_timeout(500); await park(pg); await snap(pg, 'a10')
        await pg.close()
    if K('b01'):
        pg = await page(b, '#/ad/mm-1086424?failed=job-1086424'); await snap(pg, 'b01'); await pg.close()
    if K('c01', 'c02', 'c03'):
        pg = await page(b, AD); await pg.evaluate(DUP, 'apply'); await pg.wait_for_timeout(1000); await park(pg); await snap(pg, 'c01')
        await pg.get_by_text('Continue', exact=True).first.click(); await pg.wait_for_timeout(1800); await park(pg); await snap(pg, 'c02')
        await pg.get_by_role('button', name='Create ad').first.click(); await pg.wait_for_timeout(1300); await park(pg); await snap(pg, 'c03')
        await pg.close()
    if K('d03'):
        pg = await page(b, AD)
        el = pg.get_by_text('Compare all', exact=True).first
        await el.scroll_into_view_if_needed(); await pg.mouse.move(900, 500); await pg.mouse.wheel(0, 250); await pg.wait_for_timeout(1500); await park(pg); await snap(pg, 'd03')
        await pg.close()
    if K('d04'):
        pg = await page(b, '#/creation/mm-1090247/job-1090247-different-0'); await snap(pg, 'd04'); await pg.close()
    if K('e01'):
        pg = await page(b, '#/creation'); await snap(pg, 'e01'); await pg.close()
    if K('f01'):
        pg = await page(b, '#/creation/ads'); await snap(pg, 'f01'); await pg.close()
    if K('f02'):
        pg = await page(b, '#/creation/ads/mm-1090245'); await snap(pg, 'f02'); await pg.close()
    if K('typo'):
        pg = await page(b, '#/ad/mm-1090247/variations/job-1090247-different-2')
        await pg.get_by_text('Change text', exact=True).first.click(); await pg.wait_for_timeout(1000)
        await pg.get_by_text('Edit text', exact=True).first.click(); await pg.wait_for_timeout(1200); await park(pg); await snap(pg, 'typo'); await pg.close()
    if K('ov'):
        pg = await page(b, '#/overview'); await snap(pg, 'ov'); await pg.close()
    if K('ph_radar', 'ph_notif'):
        pg = await page(b, '#/', 390); await snap(pg, 'ph_radar')
        if K('ph_notif'):
            await pg.locator('.bell-btn').first.click(); await pg.wait_for_timeout(1300); await snap(pg, 'ph_notif')
        await pg.close()
    if K('ph_ad'):
        pg = await page(b, AD, 390); await snap(pg, 'ph_ad'); await pg.close()

async def main():
    keys = sys.argv[1].split(',') if len(sys.argv) > 1 else ['a01', 'pop', 'notif', 'a02', 'd02', 'a04', 'a07', 'a08', 'a09', 'a10', 'b01', 'c01', 'd03', 'd04', 'e01', 'f01', 'f02', 'typo', 'ov', 'ph_radar', 'ph_notif', 'ph_ad']
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        await run(b, keys)
        await b.close()
asyncio.run(main())
