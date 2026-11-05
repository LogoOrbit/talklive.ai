# TalkLive marketing set: one feature per image (1080x1920) + Play feature graphic (1024x500).
import os, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SRC='/home/user/talklive.ai/android-native/app/build/screenshots'
OUT='/home/user/talklive.ai/android-native/store-screenshots'
F='/home/user/talklive.ai/android-native/app/src/main/res/font/'
BOLD, MED = F+'pjs_800.ttf', F+'pjs_500.ttf'
for f in glob.glob(OUT+'/*.png'): os.remove(f)
W,H=1080,1920
PAL={ 'violet':((108,92,231),(14,165,233)), 'pink':((236,72,153),(139,92,246)), 'teal':((20,184,166),(59,130,246)),
      'orange':((249,115,22),(236,72,153)), 'gold':((242,193,78),(217,119,6)), 'green':((34,197,94),(14,165,233)), 'night':((30,41,99),(108,92,231)) }
SET=[
 ('07b_home_dark','violet','Talk to someone new','One tap. Voice only, no camera.'),
 ('33_call_live','teal','Real voices, real people','See their country, local time and language.'),
 ('19_text_chat','pink','Prefer typing?','Random text chats with emoji, GIFs and icebreakers.'),
 ('14_friends','green','Keep the good ones','Add friends and see who is online.'),
 ('16_chat','orange','Message friends anytime','Replies, reactions, GIFs and voice messages.'),
 ('17_incoming','teal','Call your friends','Ring them whenever they are online.'),
 (['23_game_ttt','24_game_dots'],'pink','Play while you talk','Tic Tac Toe and Dots and Boxes, live.'),
 ('10_animals','orange','Pick your avatar','Spirit animals and movie characters.'),
 ('13_profile','night','Make it yours','Streaks, passport, films, likes and invites.'),
 ('02_choose','violet','Safe by design','Nobody sees your name or number. Report in one tap.'),
 (['32_home_ja','28_home_ar','29_choose_hi'],'green','Speaks your language','17 languages, from Arabic to Japanese.'),
 ('30_plus','gold','Go further with Plus','Every filter, see who liked you, undo skips.'),
]
def gradient(w,h,a,b):
    top=Image.new('RGB',(1,2)); top.putpixel((0,0),a); top.putpixel((0,1),b)
    g=top.resize((w,h),Image.BILINEAR)
    # soft light blob for depth
    blob=Image.new('L',(w,h),0); ImageDraw.Draw(blob).ellipse((-w*0.3,-h*0.15,w*0.9,h*0.45),fill=70)
    return Image.composite(Image.new('RGB',(w,h),(255,255,255)),g,blob.filter(ImageFilter.GaussianBlur(140)))
def font(path,size,text,maxw,d):
    while size>18:
        f=ImageFont.truetype(path,size)
        if d.textlength(text,font=f)<=maxw: return f
        size-=2
    return ImageFont.truetype(path,size)
def phone(canvas,name,cx,y,h,angle=0):
    im=Image.open(f'{SRC}/{name}.png').convert('RGB')
    sh=h; sw=int(im.width*sh/im.height)
    scr=im.resize((sw,sh),Image.LANCZOS)
    pad=14; R=58
    body=Image.new('RGBA',(sw+2*pad,sh+2*pad),(0,0,0,0)); bd=ImageDraw.Draw(body)
    bd.rounded_rectangle((0,0,sw+2*pad-1,sh+2*pad-1),radius=R+pad,fill=(17,19,33,255))
    m=Image.new('L',(sw,sh),0); ImageDraw.Draw(m).rounded_rectangle((0,0,sw,sh),radius=R,fill=255)
    body.paste(scr,(pad,pad),m)
    if angle: body=body.rotate(angle,resample=Image.BICUBIC,expand=True)
    x=int(cx-body.width/2)
    shadow=Image.new('L',canvas.size,0)
    sm=body.split()[3].point(lambda v: 150 if v else 0)
    shadow.paste(sm,(x,y+24)); shadow=shadow.filter(ImageFilter.GaussianBlur(30))
    canvas.paste((0,0,0),(0,0),shadow)
    canvas.paste(body,(x,y),body)
for i,(name,pal,title,sub) in enumerate(SET,1):
    a,b=PAL[pal]; c=gradient(W,H,a,b); d=ImageDraw.Draw(c)
    f1=font(BOLD,92,title,W-110,d); f2=font(MED,44,sub,W-130,d)
    d.text((W/2,160),title,font=f1,fill='white',anchor='mm')
    d.text((W/2,252),sub,font=f2,fill=(255,255,255),anchor='mm')
    if isinstance(name,list) and len(name)==2:
        phone(c,name[0],W*0.32,420,1280,4); phone(c,name[1],W*0.68,520,1280,-4)
    elif isinstance(name,list):
        phone(c,name[0],W*0.25,560,1060,6); phone(c,name[2],W*0.75,560,1060,-6); phone(c,name[1],W*0.5,430,1200,0)
    else:
        phone(c,name,W/2,330,1530)
    c.save(f'{OUT}/{i:02d}_{(name if isinstance(name,str) else name[0]).split("_",1)[1]}.png')
# Play feature graphic 1024x500
a,b=PAL['violet']; g=gradient(1024,500,a,b); d=ImageDraw.Draw(g)
logo=Image.open('/home/user/talklive.ai/public/talklive-icon-512.png').convert('RGBA') if os.path.exists('/home/user/talklive.ai/public/talklive-icon-512.png') else None
x0=60
if logo:
    logo=logo.resize((96,96),Image.LANCZOS); g.paste(logo,(x0,70),logo)
d.text((x0+(116 if logo else 0),118),'TalkLive',font=ImageFont.truetype(BOLD,64),fill='white',anchor='lm')
d.text((x0,250),'Talk to someone new,',font=ImageFont.truetype(BOLD,50),fill='white',anchor='lm')
d.text((x0,312),'right now.',font=ImageFont.truetype(BOLD,50),fill='white',anchor='lm')
d.text((x0,392),'Free voice and text chats with people worldwide.',font=ImageFont.truetype(MED,24),fill='white',anchor='lm')
phone(g,'33_call_live',840,40,620,-8)
g=g.crop((0,0,1024,500)); g.save(f'{OUT}/feature_graphic_1024x500.png')
print(sorted(os.listdir(OUT)))
