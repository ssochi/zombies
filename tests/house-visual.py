"""Optional real-browser scene regression. pip install playwright; playwright install chromium.
Run from any directory: python3 tests/house-visual.py
CHROME_BIN may point to an existing Chromium installation. No network server is needed.
This exercises the house renderer, NOT the complete combat simulation.
"""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'house-refresh'
ROOMS = ['house_ground', 'house_landing', 'house_master', 'house_child',
         'house_wc', 'house_bath', 'house_utility', 'house_roof']


def preview_html():
    def inline(match):
        source = (ROOT / match[1]).read_text(encoding='utf-8')
        return '<script>' + source.replace('</script', '<\\/script') + '</script>'
    return re.sub(r'<script src="([^"]+)"></script>', inline,
                  (ROOT / 'house-preview.html').read_text(encoding='utf-8'))


def frame(page, time):
    return page.evaluate('(t)=>{housePreview.setTime(t);return document.querySelector("#scene").toDataURL();}', time)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    html = preview_html()
    errors = []
    with sync_playwright() as p:
        options = {'headless': True}
        if os.environ.get('CHROME_BIN'):
            options['executable_path'] = os.environ['CHROME_BIN']
        browser = p.chromium.launch(**options)
        try:
            page = browser.new_page(viewport={'width': 1320, 'height': 900})
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.set_content(html, wait_until='load')
            for room in ROOMS:
                page.evaluate('(r)=>housePreview.selectRoom(r)', room)
                first = frame(page, 1.2)
                assert first == frame(page, 1.2), f'{room}: nondeterministic pixels'
                assert first != frame(page, 3.1), f'{room}: no visible animation'
                frame(page, 2.4)
                page.locator('#scene').screenshot(path=str(OUT / f'{room}.png'))
            page.evaluate('housePreview.selectRoom("house_ground");document.querySelector("#camera").value=520;')
            frame(page, 2.4)
            page.locator('#scene').screenshot(path=str(OUT / 'house_kitchen.png'))
            page.emulate_media(reduced_motion='reduce')
            for room in ROOMS:
                page.evaluate('(r)=>housePreview.selectRoom(r)', room)
                assert frame(page, 0) == frame(page, 12), f'{room}: reduced motion ignored'
            # Interaction remains available even when ambience is frozen.
            page.evaluate('housePreview.selectRoom("house_ground")')
            before = frame(page, 0)
            page.locator('#doors').click()
            assert before != frame(page, 0), 'door toggle did not update pixels'
            mobile = browser.new_page(viewport={'width': 390, 'height': 844},
                                      is_mobile=True, has_touch=True)
            mobile.on('pageerror', lambda e: errors.append(str(e)))
            mobile.set_content(html, wait_until='load')
            mobile.locator('[data-room="house_child"]').click()
            frame(mobile, 2.4)
            assert not mobile.evaluate('document.documentElement.scrollWidth>innerWidth'), 'mobile overflow'
            mobile.screenshot(path=str(OUT / 'mobile-preview.png'))
            assert not errors, errors
            report = {'rooms': 8, 'deterministic_pixels': True, 'visible_animation': True,
                      'reduced_motion': True, 'door_toggle': True, 'mobile_width': 390,
                      'mobile_overflow': False, 'page_errors': errors,
                      'scope': 'house renderer only; full-game npm test not run by this script'}
            (OUT / 'result.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
            print(json.dumps(report, indent=2))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
