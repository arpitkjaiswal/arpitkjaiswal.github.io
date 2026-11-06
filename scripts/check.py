"""Dependency-free static integrity checks for the GitHub Pages source."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import struct
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.local = []
        self.fragments = []
        self.external = []
        self.h1 = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'h1': self.h1 += 1
        for key in ('src', 'href'):
            value = a.get(key, '')
            if value.startswith('#') and len(value) > 1:
                self.fragments.append(value[1:])
            elif value and not re.match(r'^(https?:|mailto:|data:)', value):
                self.local.append(value)
        if a.get('target') == '_blank':
            assert 'noopener' in a.get('rel',''), f'Missing noopener: {a}'

page = Page()
page.feed((ROOT / 'index.html').read_text())
assert page.h1 == 1, 'The page should have one primary heading.'
assert len(page.ids) == len(set(page.ids)), 'Duplicate HTML IDs.'
for fragment in page.fragments:
    assert fragment in page.ids, f'Missing internal anchor: {fragment}'
for asset in page.local:
    assert (ROOT / asset.split('?',1)[0]).is_file(), f'Missing local file: {asset}'
for file in ['script.js','projects.js',*(p.name for p in ROOT.glob('*.mjs'))]:
    subprocess.run(['node','--check',str(ROOT / file)], check=True)
result = subprocess.run(['node','-e', "const vm=require('node:vm'),fs=require('node:fs');const s={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),s);process.stdout.write(JSON.stringify(s.window.PORTFOLIO));", str(ROOT/'projects.js')], capture_output=True, text=True, check=True)
data = json.loads(result.stdout)
ids = set()
for project in data['projects']:
    assert project['id'] not in ids, 'Duplicate project ID.'
    ids.add(project['id'])
    assert re.fullmatch(r'[A-Za-z0-9_.-]+',project['repo']), 'Unsafe repository path.'
    assert project['categories'] and set(project['categories']) <= {'ai','systems','web','play'}
    for field in ('description','stage','detail','boundary','features','tags','updated'):
        assert project[field], f'Missing {field}: {project["name"]}'
    if 'art' in project: assert (ROOT / project['art']).is_file()
for svg in (ROOT/'assets').glob('*.svg'): ET.parse(svg)
ET.parse(ROOT/'favicon.svg')
png=(ROOT/'assets/social-card.png').read_bytes()
assert png[:8] == b'\x89PNG\r\n\x1a\n'
assert struct.unpack('>II',png[16:24]) == (1200,630)
for file in ('index.html','projects.js'):
    text=(ROOT/file).read_text().lower()
    assert 'edit me' not in text and 'add 2–3 lines here' not in text
print(f'PASS: JavaScript syntax, {len(data["projects"])} projects, SVG assets, PNG dimensions, local files, and internal links.')
