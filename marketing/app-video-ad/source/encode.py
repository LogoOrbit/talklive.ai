# frames/*.jpg + mix.wav -> MP4 (1080x1920, 30 fps, H.264 + AAC, -14 LUFS, faststart)
import json, re, subprocess, sys
out = sys.argv[1] if len(sys.argv) > 1 else 'TalkLive-App-Ad.mp4'
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'mix.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
j = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', m, re.S)[-1])
af = ('loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:'
      'measured_thresh={input_thresh}:offset={target_offset}:linear=true').format(**j)
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-v', 'error', '-framerate', '30', '-i', 'frames/%05d.jpg', '-i', 'mix.wav', '-af', af,
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
                '-r', '30', '-g', '60', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out], check=True)
print('measured', j['input_i'], 'LUFS ->', out)
