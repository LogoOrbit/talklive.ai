# App frames (android-native/app/build/adframes) -> full phone screens -> ui_jpg/*.jpg
import glob, os, subprocess, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
camp = os.path.join(here, '../../play-store-campaign/source')
src = os.path.join(here, '../../../android-native/app/build/adframes')
subprocess.run(['node', os.path.join(camp, 'sysbars.js')], check=True)
subprocess.run([sys.executable, os.path.join(camp, 'make_screens.py'), src, os.path.join(here, 'ui'), camp], check=True, stdout=subprocess.DEVNULL)
os.makedirs(os.path.join(here, 'ui_jpg'), exist_ok=True)
for f in glob.glob(os.path.join(here, 'ui', '*.png')):
    Image.open(f).convert('RGB').save(os.path.join(here, 'ui_jpg', os.path.basename(f)[:-4] + '.jpg'), quality=93, subsampling=0)
print('ui_jpg ready')
