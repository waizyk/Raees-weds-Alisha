from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen.canvas import Canvas
from pathlib import Path
import random

OUT = Path(__file__).with_name('Ace-Tech-Private-Wedding-Proposal.pdf')
PAGE_W, PAGE_H = A4
M = 18 * mm

BLACK = colors.HexColor('#050806')
PANEL = colors.HexColor('#0A100D')
PANEL_2 = colors.HexColor('#0E1712')
GREEN = colors.HexColor('#00F58A')
GREEN_2 = colors.HexColor('#65FFB3')
MUTED = colors.HexColor('#93A69B')
WHITE = colors.HexColor('#F2FFF8')
LINE = colors.HexColor('#1D3A2B')
SOFT = colors.HexColor('#BBD0C3')

pdfmetrics.registerFont(TTFont('DVSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVSansBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DVSerif', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DVMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DVMonoBold', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Kicker', fontName='DVMonoBold', fontSize=8, leading=11, textColor=GREEN, tracking=2.4, spaceAfter=5*mm, uppercase=True))
styles.add(ParagraphStyle(name='TitleDark', fontName='DVSansBold', fontSize=28, leading=32, textColor=WHITE, spaceAfter=5*mm))
styles.add(ParagraphStyle(name='H1Dark', fontName='DVSansBold', fontSize=22, leading=26, textColor=WHITE, spaceAfter=5*mm))
styles.add(ParagraphStyle(name='H2Dark', fontName='DVSansBold', fontSize=14, leading=18, textColor=GREEN_2, spaceBefore=2*mm, spaceAfter=3*mm))
styles.add(ParagraphStyle(name='H3Dark', fontName='DVMonoBold', fontSize=10, leading=14, textColor=WHITE, spaceAfter=2*mm))
styles.add(ParagraphStyle(name='BodyDark', fontName='DVSans', fontSize=9.1, leading=14, textColor=SOFT, spaceAfter=3*mm))
styles.add(ParagraphStyle(name='SmallDark', fontName='DVSans', fontSize=7.5, leading=11, textColor=MUTED, spaceAfter=2*mm))
styles.add(ParagraphStyle(name='MonoSmall', fontName='DVMono', fontSize=7.3, leading=10, textColor=GREEN_2))
styles.add(ParagraphStyle(name='Price', fontName='DVMonoBold', fontSize=23, leading=27, textColor=GREEN, alignment=TA_RIGHT))
styles.add(ParagraphStyle(name='CoverBrand', fontName='DVMonoBold', fontSize=34, leading=38, textColor=GREEN))
styles.add(ParagraphStyle(name='CoverTitle', fontName='DVSansBold', fontSize=30, leading=35, textColor=WHITE, spaceAfter=5*mm))
styles.add(ParagraphStyle(name='CoverSub', fontName='DVSerif', fontSize=15, leading=22, textColor=SOFT))
styles.add(ParagraphStyle(name='Footer', fontName='DVMono', fontSize=6.5, textColor=MUTED))
styles.add(ParagraphStyle(name='CenterSmall', fontName='DVSans', fontSize=8.5, leading=13, textColor=SOFT, alignment=TA_CENTER))


def matrix_background(c: Canvas, doc):
    c.saveState()
    c.setFillColor(BLACK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    rnd = random.Random(180 + doc.page)
    c.setFont('DVMono', 5.5)
    for x in range(7, int(PAGE_W), 18):
        if rnd.random() < .58:
            continue
        y0 = rnd.randint(60, int(PAGE_H)-40)
        length = rnd.randint(3, 13)
        for j in range(length):
            alpha = max(.025, .13 - j*.009)
            c.setFillAlpha(alpha)
            c.setFillColor(GREEN)
            c.drawString(x, y0-j*9, rnd.choice('0101ACEOPS<>/{}[]'))
    c.setFillAlpha(1)
    c.setStrokeColor(LINE)
    c.setLineWidth(.6)
    c.line(M, 14*mm, PAGE_W-M, 14*mm)
    c.setFont('DVMono', 6.5)
    c.setFillColor(MUTED)
    c.drawString(M, 9.5*mm, 'ACE//TECH  •  POWERED BY ACE OPS')
    c.drawRightString(PAGE_W-M, 9.5*mm, f'PRIVATE WEDDING PROPOSAL  •  {doc.page:02d}')
    c.restoreState()


def P(text, style='BodyDark'):
    return Paragraph(text, styles[style])


def bullets(items, style='BodyDark'):
    return [Paragraph(f'<font color="#00F58A">▸</font> {x}', styles[style]) for x in items]


def panel(flowables, widths=None, pad=12, border=LINE, bg=PANEL):
    t = Table([[flowables]], colWidths=widths or [PAGE_W-2*M])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg), ('BOX',(0,0),(-1,-1),.8,border),
        ('LEFTPADDING',(0,0),(-1,-1),pad), ('RIGHTPADDING',(0,0),(-1,-1),pad),
        ('TOPPADDING',(0,0),(-1,-1),pad), ('BOTTOMPADDING',(0,0),(-1,-1),pad),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    return t


def section_header(code, title, sub=None):
    out = [P(code.upper(), 'Kicker'), P(title, 'H1Dark')]
    if sub: out.append(P(sub, 'BodyDark'))
    out += [Spacer(1, 2*mm), HRFlowable(width='100%', color=LINE, thickness=.8, spaceAfter=5*mm)]
    return out


def package_card(name, tag, price, summary, features, accent=False):
    bg = colors.HexColor('#0B1912') if accent else PANEL
    border = GREEN if accent else LINE
    head = Table([
        [P(tag, 'Kicker'), P(price, 'Price')],
        [P(name, 'H1Dark'), ''],
    ], colWidths=[105*mm, 55*mm])
    head.setStyle(TableStyle([('SPAN',(0,1),(1,1)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))
    content = [head, P(summary, 'BodyDark'), Spacer(1, 2*mm)] + bullets(features, 'SmallDark')
    return panel(content, pad=14, border=border, bg=bg)


def terms_row(label, value):
    return [P(label, 'MonoSmall'), P(value, 'SmallDark')]

frame = Frame(M, 18*mm, PAGE_W-2*M, PAGE_H-31*mm, leftPadding=0, rightPadding=0, topPadding=5*mm, bottomPadding=3*mm)
doc = BaseDocTemplate(str(OUT), pagesize=A4, title='Ace Tech Private Wedding Proposal', author='Ace Tech by Ace Ops', subject='Custom wedding website proposal')
doc.addPageTemplates([PageTemplate(id='dark', frames=[frame], onPage=matrix_background)])
story = []

# Cover
story += [Spacer(1, 20*mm), P('ACE//TECH', 'CoverBrand'), P('POWERED BY ACE OPS', 'Kicker'), Spacer(1, 12*mm)]
story += [P('A private digital home<br/>for an unforgettable wedding.', 'CoverTitle')]
story += [P('Custom wedding experience proposal', 'CoverSub'), Spacer(1, 15*mm)]
cover_box = Table([
    [P('PREPARED FOR', 'MonoSmall'), P('Private Wedding Client', 'H2Dark')],
    [P('PROPOSAL DATE', 'MonoSmall'), P('26 September 2026', 'BodyDark')],
    [P('VALID UNTIL', 'MonoSmall'), P('10 October 2026', 'BodyDark')],
    [P('CONTACT', 'MonoSmall'), P('https.khan.sa@gmail.com', 'BodyDark')],
], colWidths=[45*mm, 110*mm])
cover_box.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PANEL),('BOX',(0,0),(-1,-1),1,GREEN),('INNERGRID',(0,0),(-1,-1),.4,LINE),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story += [cover_box, Spacer(1, 25*mm), P('ELEGANT EXPERIENCES. ENGINEERED PRECISELY.', 'Kicker'), PageBreak()]

# Executive overview
story += section_header('01 // The vision', 'Your wedding, translated into a private digital experience.', 'Ace Tech will design and configure a refined wedding platform that feels personal to the couple, effortless for guests and powerful behind the scenes.')
vision_cols = Table([
    [panel([P('FOR THE COUPLE','H3Dark'),P('A distinctive digital invitation and wedding home that reflects the couple’s identity, culture and celebration.','SmallDark')], widths=[79*mm], pad=10),
     panel([P('FOR THE GUESTS','H3Dark'),P('One simple link for the invitation, RSVP, event details, memories and family experience.','SmallDark')], widths=[79*mm], pad=10)],
    [panel([P('FOR THE HOSTS','H3Dark'),P('A secure private console for guest responses, seating, check-in, media and content management.','SmallDark')], widths=[79*mm], pad=10),
     panel([P('AFTER THE DAY','H3Dark'),P('A lasting, downloadable archive instead of a temporary collection of disconnected tools.','SmallDark')], widths=[79*mm], pad=10)],
], colWidths=[83*mm,83*mm], rowHeights=[37*mm,37*mm])
vision_cols.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),2),('RIGHTPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
story += [vision_cols, Spacer(1, 7*mm), panel([P('THE ACE TECH DIFFERENCE','H2Dark'),P('This is not a generic RSVP form placed behind a template. It is a coordinated guest journey: personalised invitation, controlled access, beautifully presented information and a private management system—all designed as one experience.','BodyDark')], pad=14, border=GREEN), PageBreak()]

# Deliverables
story += section_header('02 // Experience', 'What the complete wedding platform can include.')
feature_data = [
    ('PERSONALISED INVITATIONS','Exact guest names, invitation code, party limit, WhatsApp-ready delivery and a custom opening animation.'),
    ('SIMPLE RSVP','Accept or decline, party size and optional private message—without unnecessary email, meal or dietary forms.'),
    ('PRIVATE DETAILS','Venue and time can remain hidden until a guest verifies a valid personal invitation.'),
    ('HOST CONSOLE','Invitation creation, RSVP approval, response deletion, CSV exports, settings and secure Host accounts.'),
    ('SEATING & CHECK-IN','Family seating assignments, table planning and wedding-day party check-in.'),
    ('GUEST ALBUM','Invitation-only image and video uploads with Host approval before publication.'),
    ('FAMILY EXPERIENCE','Interactive family map with search, generations, spouses, children and private correction suggestions.'),
    ('PRIVACY CONTROL','Hosts choose whether private areas are visible to everyone, verified guests or Hosts only.'),
]
rows=[]
for i in range(0,len(feature_data),2):
    row=[]
    for title,desc in feature_data[i:i+2]:
        row.append(panel([P(title,'H3Dark'),P(desc,'SmallDark')], widths=[77*mm], pad=10))
    rows.append(row)
ft=Table(rows,colWidths=[83*mm,83*mm],rowHeights=[34*mm]*4)
ft.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),2),('RIGHTPADDING',(0,0),(-1,-1),2),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2)]))
story += [ft, Spacer(1,5*mm), P('Final functionality is confirmed during discovery. Features not listed in the selected package are quoted separately before work begins.','SmallDark'), PageBreak()]

# Package comparison
story += section_header('03 // Investment', 'Choose the level of experience and support.', 'All pricing is in South African rand. The Signature Experience is recommended for a fully customised private wedding.')
comparison = [
    [P('CAPABILITY','MonoSmall'),P('ESSENTIAL','MonoSmall'),P('SIGNATURE','MonoSmall'),P('BLACK LABEL','MonoSmall')],
    ['Custom styling','Template-tailored','Fully customised','Original art direction'],
    ['Invited guests','Up to 100','Up to 250','Up to 500'],
    ['Personal invitation + RSVP','Included','Included','Included'],
    ['Guest demo video','Included','Included','Included'],
    ['Host Console','Core','Complete','Complete + concierge'],
    ['Seating + check-in','—','Included','Included'],
    ['Guest media album','2 GB','10 GB','30 GB'],
    ['Interactive family map','—','Included','Included'],
    ['Hosting included','6 months','12 months','18 months + forever download'],
    ['Design revisions','2 rounds','3 rounds','5 rounds'],
    ['Investment','R 5,500','R 9,500','R 14,000*'],
]
ct=Table([[Paragraph(str(c), styles['SmallDark']) if not hasattr(c,'wrap') else c for c in row] for row in comparison], colWidths=[58*mm,35*mm,36*mm,39*mm], repeatRows=1)
ct.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),PANEL_2),('BACKGROUND',(2,1),(2,-1),colors.HexColor('#0B1912')),('BOX',(0,0),(-1,-1),.8,LINE),('INNERGRID',(0,0),(-1,-1),.35,LINE),('TEXTCOLOR',(0,0),(-1,-1),SOFT),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story += [ct, Spacer(1,6*mm), panel([P('RECOMMENDED // SIGNATURE EXPERIENCE','H2Dark'),P('The strongest balance of custom design, guest experience, Host control and long-term value for a private wedding client.','BodyDark')], pad=13, border=GREEN), PageBreak()]

# Three package details
story += section_header('04 // Packages', 'Essential Wedding', 'A polished private wedding website for clients who need the core invitation and RSVP experience.')
story += [package_card('Essential Wedding','CORE EXPERIENCE','R 5,500','A refined starting point with the important guest-facing journey configured by Ace Tech.',[
    'Tailored colour, typography and couple details using one established design direction',
    'Personalised invitation links with names, codes and party limits',
    'Wedding details, proceedings and privacy-aware venue information',
    'Guest RSVP and core Host response management',
    'Simple guest demo video showing how to open the invitation and submit an RSVP',
    'Up to 100 invited guests and 2 GB guest media storage',
    'Six months of hosting, SSL and standard support',
    'Two consolidated design revision rounds',
])]
story += [Spacer(1,6*mm),P('Best for: intimate weddings, Nikah-only events and couples who need a professional digital alternative to forms and static invitation images.','BodyDark'),PageBreak()]

story += section_header('05 // Recommended', 'Signature Wedding Experience', 'A fully customised wedding platform with the planning and guest-management features that make the product exceptional.')
story += [package_card('Signature Wedding Experience','MOST POPULAR','R 9,500','Designed around the couple’s wedding identity and configured as a complete private celebration platform.',[
    'Custom visual direction across the invitation, public pages and Host Console',
    'Personalised WhatsApp-ready invitations and custom opening experience',
    'Complete RSVP approval, guest messages and page-specific CSV exports',
    'Simple customised guest demo video covering invitations, RSVP and key guest features',
    'Proceedings, private venue details, family seating and day-of check-in',
    'Moderated guest photo/video album with 10 GB storage',
    'Interactive family map with search, zoom, relationships and suggestions',
    'Up to 250 invited guests and authorised Host accounts',
    'Twelve months of hosting, three revision rounds and 30-day launch support',
],accent=True)]
story += [Spacer(1,6*mm),panel([P('PRIVATE CLIENT BONUS','H3Dark'),P('If accepted within the proposal-validity period, Ace Tech will include the first downloadable post-wedding archive and a custom RA-style couple monogram at no additional charge.','SmallDark')],pad=11,border=GREEN),PageBreak()]

story += section_header('06 // Bespoke', 'Black Label Wedding', 'For a high-touch celebration requiring original creative direction, expanded capacity and concierge implementation.')
story += [package_card('Black Label Wedding','CONCIERGE BUILD','R 14,000','A premium production for clients who want Ace Tech to manage the digital experience from concept through post-event handover.',[
    'Original design concept and advanced interaction direction',
    'Concierge guest-list import and invitation configuration',
    'Customised guest demo video plus a separate Host handover walkthrough video',
    'Up to 500 invited guests and a 30 GB media archive during the included hosting period',
    'Custom domain setup; first-year domain registration allowance up to R500',
    'Advanced planner/Host onboarding and rehearsal session',
    'Remote wedding-day technical support window',
    'Five consolidated design revision rounds',
    'Forever Download: the complete archive, including up to 30 GB of media, supplied as a downloadable copy to keep indefinitely',
    'Sixty-day priority post-event support and archive handover assistance',
])]
story += [Spacer(1,5*mm),panel([P('EARLY-BIRD BLACK LABEL // R 12,500','H2Dark'),P('Save R 1,500 when the signed agreement and booking deposit are received at least six calendar months before the confirmed wedding date. Subject to production availability and the scope remaining within the Black Label package.','SmallDark')],pad=10,border=GREEN),Spacer(1,3*mm),P('* Standard Black Label price is R 14,000. Physical event staffing, travel, paid messaging, ticketing, livestreaming and third-party licences are not included unless specifically added to the quotation.','SmallDark'),PageBreak()]

# Add-ons
story += section_header('07 // Optional upgrades', 'Build the exact service level required.', 'Add-ons may be selected before production or approved later through a written change request.')
addons = [
    ('Custom domain setup','R 650','Configuration and launch support. Domain registration/renewal charged at cost beyond any package allowance.'),
    ('Additional event or celebration day','R 1,500','A separate event page, schedule and venue block for multi-day celebrations.'),
    ('Guest list preparation and import','R 850','Cleanup and structured import of a supplied spreadsheet, up to 300 households.'),
    ('Additional 5 GB media storage','R 450','Added storage allocation for the active hosting period.'),
    ('Additional design revision round','R 750','One consolidated revision after the included rounds are complete.'),
    ('On-site check-in support','From R 3,500','Durban-area attendance support. Travel, accommodation and extra devices quoted separately.'),
    ('Digital archive renewal','R 650 / year','Optional continued online archive after included hosting ends; subject to standard storage limits. The Black Label downloadable archive remains the client’s to keep forever without renewal.'),
    ('Rush build / compressed lead time','+25%','Applies when booking fewer than six weeks before the wedding or where launch is required in fewer than 10 business days. Feasibility depends on scope and complete, approved content.'),
    ('WhatsApp Business API integration','Quoted separately','Meta template approval, conversation fees and third-party provider costs are excluded.'),
    ('Additional bespoke functionality','R 950 / hour','Used only after a written estimate and client approval.'),
]
at = Table([[P(a,'H3Dark'),P(b,'MonoSmall'),P(c,'SmallDark')] for a,b,c in addons], colWidths=[52*mm,29*mm,87*mm])
at.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PANEL),('BOX',(0,0),(-1,-1),.8,LINE),('INNERGRID',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('VALIGN',(0,0),(-1,-1),'TOP')]))
story += [at,PageBreak()]

# Process
story += section_header('08 // Delivery', 'A clear route from consultation to launch.')
process = [
    ('01','DISCOVERY','Wedding style, cultural requirements, guest journey, privacy needs and package selection.'),
    ('02','CONTENT','Client supplies approved wording, event details, guest list, photographs and family information.'),
    ('03','DESIGN','Ace Tech presents the chosen direction and applies consolidated revision feedback.'),
    ('04','CONFIGURE','Invitations, Hosts, RSVP, proceedings, privacy, seating and media settings are prepared.'),
    ('05','TEST','Mobile, desktop, invitation, RSVP, access and export workflows are tested before approval.'),
    ('06','LAUNCH','The wedding site goes live and invitation links are released to guests.'),
]
pt = Table([[P(n,'Price'),P(t,'H3Dark'),P(d,'SmallDark')] for n,t,d in process], colWidths=[18*mm,42*mm,108*mm])
pt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PANEL),('BOX',(0,0),(-1,-1),.8,LINE),('INNERGRID',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
story += [pt,Spacer(1,6*mm),panel([P('ESTIMATED DELIVERY','H2Dark'),P('<b>Essential:</b> 1–2 weeks &nbsp;&nbsp; <b>Signature:</b> 2–3 weeks &nbsp;&nbsp; <b>Black Label:</b> 3–4 weeks', 'BodyDark'),P('Timelines begin only after the deposit, discovery and all minimum required content are received. Client approval delays, new scope and third-party delays extend the delivery date accordingly.','SmallDark'),Spacer(1,3*mm),P('<b>PLANNING BUFFER:</b> Reserve the project 8–12 weeks before the wedding. A standard build should kick off no later than 6 weeks before the wedding, with target public launch 2–3 weeks before the event. Bookings inside the six-week window are treated as rush work and attract the stated surcharge, subject to availability.','SmallDark')],pad=12,border=GREEN),PageBreak()]

# Terms
story += section_header('09 // Commercial terms', 'Transparent terms protect the client and the project.')
terms = [
    terms_row('PAYMENT','50% booking deposit is payable to reserve production capacity. The remaining 50% is payable after final client approval and before the website is made publicly accessible or guest invitations are released. Ace Tech is not obliged to launch until cleared payment is received.'),
    terms_row('VALIDITY','Standard proposal pricing is valid until 10 October 2026 and may be revised thereafter. The early-bird mechanism remains subject to written quotation validity, eligibility and production availability.'),
    terms_row('EARLY BIRD','The Black Label early-bird package price is R 12,500, a saving of R 1,500 from the R 14,000 standard price. Eligibility requires the signed agreement and cleared 50% booking deposit to be received at least six calendar months before the confirmed wedding date. The wedding date must be disclosed before acceptance. The offer cannot be combined with another discount and excludes add-ons, rush fees and third-party costs.'),
    terms_row('CURRENCY','All prices are in ZAR. VAT, if legally applicable, will be shown on the invoice.'),
    terms_row('CONTENT','The client supplies accurate names, dates, venue details, photographs and guest information with permission to use them.'),
    terms_row('REVISIONS','A revision round is one consolidated written feedback submission. New scope is quoted separately.'),
    terms_row('CANCELLATION','If the client cancels before public launch, Ace Tech may retain 50% of the booking deposit (equal to 25% of the total package price) and all approved third-party costs; the balance of the deposit will be refunded. Once the website has launched or invitation links have been released, 100% of the booking deposit is earned and non-refundable. Any delivered work, approved variations and third-party costs remain payable.'),
    terms_row('NON-DELIVERY','If Ace Tech fails to deliver the agreed core website by the written contractual delivery date, the booking deposit will be refunded, provided the failure was not caused by client delay, incomplete or late content, approval delays, requested variations, third-party service failure, force majeure or another circumstance beyond Ace Tech’s reasonable control.'),
    terms_row('RUSH & BUFFER','Standard projects should be reserved 8–12 weeks before the wedding and commence no later than 6 weeks before it. A shorter lead time or launch required in fewer than 10 business days is rush work, subject to availability and a 25% surcharge unless a different written fee is agreed.'),
    terms_row('PRIVACY','Ace Tech will use reasonable technical safeguards. The client controls guest-list accuracy, consent and authorised Host access.'),
    terms_row('THIRD PARTIES','Domain, payment, Meta/WhatsApp, SMS and other provider fees are excluded unless explicitly stated.'),
    terms_row('OWNERSHIP','The client owns supplied content and exported event data. Ace Tech retains its platform, reusable components and underlying source code.'),
    terms_row('FOREVER DOWNLOAD','Black Label includes a downloadable post-wedding archive containing the completed website and up to 30 GB of included media. Once supplied, the client may download, copy and retain that archive indefinitely. This forever benefit applies to the downloadable copy only and does not include perpetual online storage, domain renewal or permanent hosting. The client is responsible for keeping backup copies after handover.'),
    terms_row('ARCHIVE','Black Label includes 18 months of online hosting. Its 30 GB allocation applies during that included hosting period and is then supplied as part of the downloadable archive. After included hosting ends, any continued online availability is optional and subject to the applicable renewal fee, storage limits and third-party service availability.'),
]
terms_style = TableStyle([('BACKGROUND',(0,0),(-1,-1),PANEL),('BOX',(0,0),(-1,-1),.8,LINE),('INNERGRID',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'TOP')])
tt=Table(terms[:7],colWidths=[35*mm,133*mm])
tt.setStyle(terms_style)
story += [tt,PageBreak()]
story += section_header('09 // Commercial terms continued', 'Delivery, privacy and ownership protections.')
tt2=Table(terms[7:],colWidths=[35*mm,133*mm])
tt2.setStyle(terms_style)
story += [tt2,Spacer(1,5*mm),panel([P('BINDING ACCEPTANCE','H3Dark'),P('These commercial terms, the accepted proposal, the final statement of work and the invoice together form the agreement between the client and Ace Tech. By signing below or paying the booking deposit, the client confirms acceptance and intends to be legally bound. If documents conflict, the signed statement of work takes priority. Nothing in these terms excludes rights that cannot lawfully be excluded under South African law.','SmallDark')],pad=10,border=GREEN),PageBreak()]

# Close
story += [Spacer(1,12*mm),P('10 // NEXT STEP','Kicker'),P('Let’s create something<br/>your guests will remember.', 'CoverTitle'),P('Recommended selection: Signature Wedding Experience<br/><font color="#00F58A">Early-bird Black Label: R 12,500 when booked 6+ months before the wedding.</font>', 'CoverSub'),Spacer(1,10*mm)]
nextbox=panel([
    P('TO RESERVE THE PROJECT','H2Dark'),
    P('1. Confirm the preferred package and optional upgrades.<br/>2. Approve the final statement of work.<br/>3. Pay the 50% booking deposit.<br/>4. Schedule the private discovery session.','BodyDark'),
    Spacer(1,3*mm),P('CONTACT ACE TECH','H3Dark'),P('https.khan.sa@gmail.com','H2Dark'),
],pad=16,border=GREEN,bg=colors.HexColor('#0B1912'))
story += [nextbox,Spacer(1,12*mm)]
sig=Table([
    [P('CLIENT ACCEPTANCE','MonoSmall'),P('ACE TECH','MonoSmall')],
    [P('Name: ______________________________','BodyDark'),P('Representative: _______________________','BodyDark')],
    [P('Signature: ___________________________','BodyDark'),P('Signature: ____________________________','BodyDark')],
    [P('Date: _______________________________','BodyDark'),P('Date: _________________________________','BodyDark')],
],colWidths=[84*mm,84*mm])
sig.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PANEL),('BOX',(0,0),(-1,-1),.8,LINE),('INNERGRID',(0,0),(-1,-1),.35,LINE),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
story += [sig,Spacer(1,10*mm),P('PRIVATE & CONFIDENTIAL  //  PREPARED FOR DISCUSSION PURPOSES','Kicker')]

doc.build(story)
print(OUT)
