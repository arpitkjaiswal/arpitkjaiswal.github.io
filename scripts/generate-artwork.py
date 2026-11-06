"""Rebuild the portfolio's original SVG project illustrations. No dependencies."""
from pathlib import Path
import math

OUT = Path(__file__).resolve().parents[1] / 'assets'
OUT.mkdir(exist_ok=True)

def svg(name, bg, body, defs=''):
    text = f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440"><defs>{defs}<pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0v32" fill="none" stroke="#fff" stroke-opacity=".035"/></pattern></defs><rect width="720" height="440" fill="{bg}"/><rect width="720" height="440" fill="url(#grid)"/>{body}</svg>'''
    (OUT / name).write_text(text)

def label(x,y,text,color='#ffffff70',size=9):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="monospace" font-size="{size}" letter-spacing="1.5">{text}</text>'

# LEXA: a desktop companion, its state, and a voice waveform.
body='''<ellipse cx="360" cy="378" rx="174" ry="20" fill="#000" opacity=".25"/><path d="M110 354h500" stroke="#c5b6f4" stroke-opacity=".15"/>
<rect x="150" y="103" width="420" height="255" rx="13" fill="#221c35" stroke="#ddcfff" stroke-opacity=".2"/>
<path d="M150 136h420" stroke="#ddcfff" stroke-opacity=".12"/>
<circle cx="168" cy="119" r="3" fill="#ee8e9f"/><circle cx="181" cy="119" r="3" fill="#edc983"/><circle cx="194" cy="119" r="3" fill="#a7cc95"/>
<rect x="170" y="153" width="90" height="186" rx="5" fill="#171323"/>
<rect x="181" y="169" width="62" height="6" rx="3" fill="#bca4f7" opacity=".4"/><rect x="181" y="185" width="44" height="4" rx="2" fill="#bca4f7" opacity=".14"/>
<rect x="181" y="209" width="55" height="4" rx="2" fill="#bca4f7" opacity=".14"/><rect x="181" y="225" width="38" height="4" rx="2" fill="#bca4f7" opacity=".14"/>
<rect x="282" y="273" width="202" height="37" rx="8" fill="#bca4f7" opacity=".08"/>
<circle cx="382" cy="212" r="101" fill="url(#glow)"/>
<path d="M330 191c0-34 25-57 56-57s56 23 56 57v38c0 21-16 38-38 38h-37c-21 0-37-17-37-38z" fill="url(#pet)" stroke="#ded1ff" stroke-opacity=".5"/>
<path d="m340 158-8-21 29 10m51 0 27-10-7 24" fill="#bca4f7" stroke="#e5d9ff" stroke-opacity=".6"/>
<rect x="345" y="187" width="82" height="48" rx="22" fill="#2b1f47"/>
<ellipse cx="365" cy="207" rx="5" ry="7" fill="#e5d8ff"/><ellipse cx="407" cy="207" rx="5" ry="7" fill="#e5d8ff"/>
<path d="M379 220q7 7 14 0" fill="none" stroke="#c5b3f3" stroke-width="2" stroke-linecap="round"/>
<circle cx="350" cy="222" r="5" fill="#f49fc0" opacity=".45"/><circle cx="422" cy="222" r="5" fill="#f49fc0" opacity=".45"/>
<path d="M314 291h9m4-8v16m5-21v26m6-18v10m6-24v38m6-28v18m6-12v7m6-23v37m6-29v19m6-15v10m6-24v36m6-27v19m6-11v6m6-21v34m6-28v22m6-15v6m6-15v23m6-14v4h12" fill="none" stroke="#bca4f7" stroke-width="2" stroke-linecap="round"/>
<rect x="444" y="165" width="139" height="34" rx="17" fill="#d4ff63" transform="rotate(7 444 165)"/>
<circle cx="461" cy="183" r="3" fill="#263817"/>
'''
body+=label(472,187,'HELLO, HUMAN.','#273518',8)+label(283,331,'BUDDY / DESKTOP COMPANION','#c5b6f4',8)+label(168,89,'VOICE. MEMORY. A LITTLE PERSONALITY.','#b9a9df90',9)
svg('lexa.svg','#21192f',body,'''<radialGradient id="glow"><stop stop-color="#bca4f7" stop-opacity=".25"/><stop offset="1" stop-color="#bca4f7" stop-opacity="0"/></radialGradient><linearGradient id="pet" x2="1" y2="1"><stop stop-color="#ddceff"/><stop offset="1" stop-color="#8264bd"/></linearGradient>''')

# TerraMind: topographic field contours and a real conceptual memory graph.
body='<circle cx="593" cy="77" r="110" fill="#d4ff63" opacity=".035"/>'
for i in range(12):
    y=159+i*20
    body+=f'<path d="M-40 {y} Q150 {y-112} 325 {y-3} T770 {y-46}" fill="none" stroke="#adc97a" stroke-opacity="{.07+i*.006}" stroke-width="1"/>'
body+='''<path d="m102 282 147-85 157 79-151 90Z" fill="#4e6432" stroke="#9db470" stroke-opacity=".45"/>
<path d="m102 282 153 84v19l-153-85Z" fill="#2c3d20"/><path d="m255 366 151-90v18l-151 91Z" fill="#3c5027"/>
<path d="m119 280 137 71m-119-81 137 72m-119-82 137 73m-119-83 137 73m-119-83 136 73m-118-83 134 73m-116-83 133 73" fill="none" stroke="#b5cd7e" stroke-width="2" stroke-opacity=".4"/>
<path d="M256 284V164m0 0 99-49m-99 49-98-53m197 4 103 70m-300-74-41 70m341 4 83-52" stroke="#ceef96" stroke-opacity=".35" fill="none" stroke-dasharray="3 4"/>
<circle cx="256" cy="165" r="26" fill="#293c22" stroke="#d4ff63" stroke-width="1.5"/>
<path d="M244 171c0-16 17-23 25-22 1 13-5 25-21 23m1-4 12-11" fill="none" stroke="#d4ff63" stroke-width="1.5"/>
<circle cx="355" cy="115" r="7" fill="#9bbf6d"/><circle cx="158" cy="111" r="5" fill="#cbdba4"/>
<circle cx="458" cy="185" r="6" fill="#d4ff63"/><circle cx="117" cy="181" r="4" fill="#9bbf6d"/>
<circle cx="541" cy="133" r="4" fill="#cbdba4"/>
<rect x="443" y="224" width="165" height="108" rx="8" fill="#1c2a19" stroke="#99b776" stroke-opacity=".35"/>
<path d="M457 258h136" stroke="#99b776" stroke-opacity=".18"/>
<path d="m458 300 24-13 20 7 24-23 24 7 25-12 19 3" fill="none" stroke="#d4ff63" stroke-width="1.6"/>
<circle cx="526" cy="271" r="3" fill="#d4ff63"/>
'''
body+=label(457,246,'FIELD MEMORY','#c9dfb0',8)+label(458,319,'SOIL / WEATHER / NOTES','#91aa7c',7)+label(370,114,'WEATHER','#a9bc93',8)+label(104,96,'SOIL','#a9bc93',8)+label(468,184,'SEASON','#a9bc93',8)+label(183,401,'A FIELD THAT REMEMBERS.','#c6d4b580',9)
svg('terramind.svg','#1c291a',body)

# AegisVault: an exploded vault, gated access and a linked audit trail.
body='''<circle cx="346" cy="217" r="155" fill="url(#vaultglow)"/>
<ellipse cx="352" cy="347" rx="152" ry="24" fill="#000" opacity=".14"/>
<path d="m230 274 123-66 128 66-124 71Z" fill="#153d46" stroke="#75dce5" stroke-opacity=".2"/>
<path d="m230 274 127 71v18l-127-71Z" fill="#11323a"/><path d="m357 345 124-71v18l-124 71Z" fill="#1b4853"/>
<path d="m230 230 123-66 128 66-124 71Z" fill="#1c525c" fill-opacity=".65" stroke="#75dce5" stroke-opacity=".4"/>
<path d="m230 230 127 71v14l-127-71Z" fill="#163c44"/><path d="m357 301 124-71v14l-124 71Z" fill="#245d68"/>
<path d="m230 185 123-67 128 67-124 71Z" fill="url(#vaulttop)" stroke="#a1eef0" stroke-opacity=".6"/>
<path d="m230 185 127 71v14l-127-71Z" fill="#24515a"/><path d="m357 256 124-71v14l-124 71Z" fill="#377783"/>
<path d="m353 154-26 13v18l29 17 29-17v-18Z" fill="#102b35" stroke="#b7f2f0" stroke-width="1.2"/>
<path d="M342 166v-9c0-18 25-18 25-4v10" fill="none" stroke="#b7f2f0" stroke-width="3"/>
<circle cx="355" cy="181" r="3" fill="#a2eee8"/>
<path d="M230 185h-63v56m314-11h57v-75" fill="none" stroke="#75dce5" stroke-opacity=".3" stroke-dasharray="3 4"/>
<circle cx="167" cy="247" r="5" fill="#d4ff63"/><circle cx="538" cy="148" r="5" fill="#75dce5"/>
<rect x="100" y="263" width="134" height="30" rx="4" fill="#153640" stroke="#75dce5" stroke-opacity=".25"/>
<rect x="478" y="99" width="133" height="29" rx="4" fill="#153640" stroke="#75dce5" stroke-opacity=".25"/>
<path d="M442 342h30m8 0h30m8 0h30" stroke="#75dce5" stroke-opacity=".35"/>
<circle cx="439" cy="342" r="3" fill="#75dce5"/><circle cx="477" cy="342" r="3" fill="#75dce5"/><circle cx="515" cy="342" r="3" fill="#75dce5"/><circle cx="553" cy="342" r="3" fill="#75dce5"/>
'''
body+=label(114,282,'POLICY / ALLOW','#c4ecc7',8)+label(491,118,'ENCRYPTED','#a1e2e4',8)+label(278,391,'TRUST IS A DESIGN DECISION.','#8ac1c480',9)+label(450,365,'AUDIT CHAIN','#75dce580',7)
svg('aegisvault.svg','#12252e',body,'''<radialGradient id="vaultglow"><stop stop-color="#75dce5" stop-opacity=".1"/><stop offset="1" stop-color="#75dce5" stop-opacity="0"/></radialGradient><linearGradient id="vaulttop" x2="1" y2="1"><stop stop-color="#387681"/><stop offset="1" stop-color="#1e4957"/></linearGradient>''')

# TalentOS: an evidence map, not fake candidate scores or usage analytics.
body='''<circle cx="556" cy="261" r="140" fill="#ffae7b" opacity=".025"/>
<rect x="115" y="102" width="490" height="250" rx="12" fill="#2b241f" stroke="#d8aa89" stroke-opacity=".25"/>
<path d="M115 141h490M259 141v211" stroke="#d8aa89" stroke-opacity=".15"/>
<circle cx="135" cy="122" r="3" fill="#d19578"/><circle cx="148" cy="122" r="3" fill="#d4b78a"/><circle cx="161" cy="122" r="3" fill="#b6c890"/>
<rect x="132" y="158" width="109" height="43" rx="5" fill="#ffae7b" fill-opacity=".1"/>
<circle cx="148" cy="179" r="7" fill="#ffae7b" fill-opacity=".4"/><path d="M164 176h59m-59 8h40" stroke="#dfb396" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>
<circle cx="148" cy="224" r="7" fill="#dfb396" fill-opacity=".15"/><path d="M164 221h59m-59 8h40" stroke="#dfb396" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/>
<circle cx="148" cy="267" r="7" fill="#dfb396" fill-opacity=".15"/><path d="M164 264h59m-59 8h40" stroke="#dfb396" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/>
<rect x="281" y="160" width="302" height="46" rx="5" fill="#231d19"/>
<path d="M296 180h105m-105 10h63" stroke="#e7b58d" stroke-opacity=".38" stroke-width="4" stroke-linecap="round"/>
<rect x="488" y="174" width="77" height="19" rx="4" fill="#d4ff63" fill-opacity=".16"/>
<rect x="283" y="230" width="79" height="66" rx="6" fill="#ffae7b" fill-opacity=".08" stroke="#ffae7b" stroke-opacity=".2"/>
<rect x="392" y="230" width="79" height="66" rx="6" fill="#ffae7b" fill-opacity=".08" stroke="#ffae7b" stroke-opacity=".2"/>
<rect x="501" y="230" width="79" height="66" rx="6" fill="#ffae7b" fill-opacity=".08" stroke="#ffae7b" stroke-opacity=".2"/>
<path d="M362 263h30m79 0h30" stroke="#e9ae7f" stroke-opacity=".45" stroke-dasharray="2 3"/>
<path d="m309 259 8 8 15-15m88 7 8 8 15-15m88 7 8 8 15-15" stroke="#efbb96" stroke-width="2" fill="none" stroke-linecap="round"/>
<rect x="335" y="319" width="191" height="4" rx="2" fill="#d4b192" opacity=".16"/>
'''
body+=label(302,286,'RESUME','#c7ab93',7)+label(406,286,'EVIDENCE','#c7ab93',7)+label(516,286,'REVIEW','#c7ab93',7)+label(496,187,'INSPECT','#d4ff63',7)+label(285,123,'TALENTOS / CANDIDATE WORKSPACE','#c7ab93',8)+label(207,390,'EVIDENCE BEFORE ASSUMPTIONS.','#d9b49a80',9)
svg('talentos.svg','#2b211b',body)

# Documents: visible citations connect an answer to its underlying passage.
body='''<rect x="156" y="100" width="228" height="252" rx="9" fill="#513144" stroke="#c990ac" stroke-opacity=".18" transform="rotate(-11 270 230)"/>
<rect x="178" y="96" width="228" height="252" rx="9" fill="#58364a" stroke="#c990ac" stroke-opacity=".22" transform="rotate(-5 292 222)"/>
<rect x="199" y="99" width="228" height="252" rx="9" fill="#e5c9d6"/>
<path d="M223 127h80m-80 14h153" stroke="#714e64" stroke-width="5" stroke-linecap="round" opacity=".7"/>
<path d="M224 172h173m-173 12h157m-157 12h166m-166 12h124" stroke="#977387" stroke-width="3" stroke-linecap="round" opacity=".5"/>
<rect x="218" y="228" width="183" height="41" rx="3" fill="#c59eb4"/>
<path d="M225 242h163m-163 12h143" stroke="#6b485e" stroke-width="3" stroke-linecap="round" opacity=".6"/>
<path d="M224 291h171m-171 12h153m-153 12h133" stroke="#977387" stroke-width="3" stroke-linecap="round" opacity=".5"/>
<path d="M401 249h35v-49h34" fill="none" stroke="#f59bc1" stroke-dasharray="3 4"/>
<circle cx="401" cy="249" r="4" fill="#78435f"/>
<rect x="438" y="155" width="182" height="147" rx="8" fill="#32212e" stroke="#e5b1cb" stroke-opacity=".35"/>
<rect x="452" y="169" width="46" height="20" rx="4" fill="#f59bc1" fill-opacity=".15"/>
<path d="M453 212h148m-148 11h139m-139 11h125m-125 11h143" stroke="#c69bb2" stroke-width="3" stroke-linecap="round" opacity=".4"/>
<rect x="453" y="266" width="93" height="19" rx="4" fill="#f59bc1" fill-opacity=".1"/>
'''
body+=label(458,183,'[ 1 ]','#f4c2dc',9)+label(460,279,'VIEW SOURCE','#dbadc5',7)+label(462,139,'FOLLOW THE EVIDENCE','#cc9bb680',8)+label(206,391,'ANSWERS WITH A PAPER TRAIL.','#d7a3bf80',9)+label(222,336,'SOURCE DOCUMENT','#76566c',7)
svg('documents.svg','#2b1c29',body)

# Orbit Warden: entirely procedural, matching the spirit of the actual game.
body='<circle cx="360" cy="207" r="119" fill="url(#spaceglow)"/>'
for i in range(75):
    x=(i*137.5)%720;y=(i*83.3)%440
    body+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{.6+(i%4)*.25:.1f}" fill="#d5c9ed" opacity="{.18+(i%5)*.1:.2f}"/>'
body+='''<circle cx="360" cy="207" r="94" fill="none" stroke="#bca4f7" stroke-opacity=".2"/>
<ellipse cx="360" cy="207" rx="160" ry="55" fill="none" stroke="#bca4f7" stroke-opacity=".2" transform="rotate(-23 360 207)"/>
<ellipse cx="360" cy="207" rx="176" ry="60" fill="none" stroke="#75dce5" stroke-opacity=".1" transform="rotate(26 360 207)"/>
<path d="m360 127 24 75 31 47-43-16-12 19-12-19-43 16 31-47Z" fill="#b9a5eb" stroke="#e0d1ff" stroke-width="1.5"/>
<path d="m360 150 10 58-10 20-10-20Z" fill="#3e3461"/>
<path d="m345 238 15 67 15-67-15 15Z" fill="url(#flame)"/>
<path d="m317 208-18 36 35-19m69-17 18 36-35-19" fill="#725b9f" stroke="#a48dcd"/>
<path d="M360 98V76m-8 12V65m16 12V56" stroke="#75dce5" stroke-width="2" stroke-linecap="round"/>
<path d="m206 135 13-9 15 8-3 20-18 6-15-11Zm281 160 20-13 19 9 4 23-20 13-21-12Z" fill="#302841" stroke="#9f89c6" stroke-opacity=".5"/>
<path d="m513 128 11-17 11 17 16 7-17 9-10 16-10-16-16-9Z" fill="#f59bc1" fill-opacity=".7"/>
<path d="M144 318h80m272 0h80" stroke="#bca4f7" stroke-opacity=".25"/>
<rect x="144" y="318" width="46" height="3" fill="#75dce5"/>
'''
body+=label(278,368,'ORBIT WARDEN','#ddd3ef',13)+label(249,390,'A LITTLE CONTROLLED COSMIC CHAOS.','#b9a3d580',8)+label(144,308,'SHIELD','#75dce580',7)+label(509,308,'SECTOR / 01','#bca4f780',7)
svg('orbit-warden.svg','#1d192d',body,'''<radialGradient id="spaceglow"><stop stop-color="#a475e4" stop-opacity=".22"/><stop offset="1" stop-color="#a475e4" stop-opacity="0"/></radialGradient><linearGradient id="flame" x2="0" y2="1"><stop stop-color="#75dce5"/><stop offset="1" stop-color="#75dce5" stop-opacity="0"/></linearGradient>''')

(OUT / 'social-card.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0b0d11"/><g font-family="Arial,sans-serif"><text x="80" y="100" fill="#d4ff63" font-size="25">ARPIT KUMAR JAISWAL / SOFTWARE DEVELOPER</text><text x="75" y="270" fill="#f3f1eb" font-size="115" letter-spacing="-6">Curiosity,</text><text x="75" y="390" fill="#f3f1eb" font-size="115" letter-spacing="-6">made real<tspan fill="#d4ff63">.</tspan></text><text x="80" y="530" fill="#9b9fa9" font-size="23">AI. Thoughtful systems. Creative code. MIT Manipal.</text></g><circle cx="1010" cy="270" r="116" fill="none" stroke="#d4ff63" stroke-width="1" opacity=".6"/><ellipse cx="1010" cy="270" rx="155" ry="40" fill="none" stroke="#75dce5" transform="rotate(-30 1010 270)"/><circle cx="1130" cy="200" r="6" fill="#d4ff63"/></svg>''')
print('Generated six project illustrations and a social card.')
