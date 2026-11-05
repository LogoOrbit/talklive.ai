#!/usr/bin/env bash
# Runs inside the emulator step: install the app, start the website user,
# record the screen, drive the app, collect everything into $OUT.
set -u
OUT="${OUT:-$GITHUB_WORKSPACE/emulator-out}"
mkdir -p "$OUT"
APK="$GITHUB_WORKSPACE/android-native/app/build/outputs/apk/debug/app-debug.apk"
adb wait-for-device
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb install -r -g "$APK"
# The other person: the website, searching for a voice call.
node "$GITHUB_WORKSPACE/android-native/tools/emulator/web-peer.js" http://localhost:5000 "$OUT" 300 > "$OUT/web-peer.log" 2>&1 &
# And one on the text chat page, for the text-chat part.
node "$GITHUB_WORKSPACE/android-native/tools/emulator/web-text-peer.js" http://localhost:5000 "$OUT" 480 > "$OUT/web-text-peer.log" 2>&1 &
# A video of the whole run (the emulator caps one file at 3 minutes).
adb shell screenrecord --time-limit 180 --bit-rate 4000000 /sdcard/run.mp4 &
REC=$!
sleep 3
python3 "$GITHUB_WORKSPACE/android-native/tools/emulator/drive.py" "$OUT"
STATUS=$?
sleep 2
kill $REC 2>/dev/null; sleep 3
adb pull /sdcard/run.mp4 "$OUT/run.mp4" || true
adb logcat -d -s CallManager:* TalkSocket:* AndroidRuntime:* org.webrtc.Logging:* > "$OUT/logcat.txt" || true
exit $STATUS
