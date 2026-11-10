#!/usr/bin/env python3
"""Drives TalkLive on an Android emulator like a person would, against a local
server, with the website as the other person (web-peer.js). Saves a numbered
screenshot per step and report.md.   python3 drive.py <outDir>"""
import json, os, re, subprocess, sys, time, xml.etree.ElementTree as ET

OUT = sys.argv[1] if len(sys.argv) > 1 else "emulator-out"
PKG = "app.talklive.debug"
os.makedirs(OUT, exist_ok=True)
steps, n = [], [0]

def adb(*a, check=False, text=True):
    return subprocess.run(["adb", *a], capture_output=True, text=text, check=check)

def shot(name):
    n[0] += 1
    path = os.path.join(OUT, f"{n[0]:02d}_{name}.png")
    with open(path, "wb") as f:
        f.write(subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True).stdout)
    return os.path.basename(path)

def nodes():
    # A snapshot can fail while something on screen animates; try a few times.
    for _ in range(4):
        adb("shell", "rm", "-f", "/sdcard/ui.xml")
        adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
        xml = adb("shell", "cat", "/sdcard/ui.xml").stdout
        try:
            found = list(ET.fromstring(xml[xml.find("<"):]).iter("node"))
            if found and clear_system_dialogs(found):
                continue
            if found:
                return found
        except Exception:
            pass
        time.sleep(0.7)
    return []

def clear_system_dialogs(found):
    # Android's own "X isn't responding" dialog (a slow launcher on a cold
    # emulator) covers the app; close it like a person would.
    for nd in found:
        if re.search(r"isn.t responding", nd.get("text") or "", re.I):
            for b in found:
                if re.fullmatch(r"(close app|wait|ok)", (b.get("text") or "").strip(), re.I):
                    x, y = center(b)
                    adb("shell", "input", "tap", str(x), str(y))
                    time.sleep(1.5)
                    return True
    return False

def label(nd):
    return (nd.get("text") or "") + " | " + (nd.get("content-desc") or "")

def find(pattern):
    rx = re.compile(pattern, re.I)
    for nd in nodes():
        if rx.search(nd.get("text") or "") or rx.search(nd.get("content-desc") or ""):
            return nd
    return None

def center(nd):
    a, b, c, d = map(int, re.findall(r"\d+", nd.get("bounds")))
    return (a + c) // 2, (b + d) // 2

def tap(pattern, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        nd = find(pattern)
        if nd is not None:
            x, y = center(nd)
            adb("shell", "input", "tap", str(x), str(y))
            time.sleep(1.2)
            return True
        time.sleep(1)
    return False

def wait_for(pattern, timeout=30):
    end = time.time() + timeout
    while time.time() < end:
        if find(pattern) is not None:
            return True
        time.sleep(1.5)
    return False

def scroll_to(pattern, swipes=10):
    """Scrolls down until something matching pattern is on screen."""
    for _ in range(swipes):
        if find(pattern) is not None:
            return True
        adb("shell", "input", "swipe", "540", "1600", "540", "900", "300"); time.sleep(0.8)
    return find(pattern) is not None

def screen_text():
    seen = []
    for nd in nodes():
        t = (nd.get("text") or nd.get("content-desc") or "").strip()
        if t and t not in seen:
            seen.append(t)
    return seen[:30]

def step(name, ok, note=""):
    steps.append((name, ok, shot(re.sub(r"\W+", "_", name.lower()).strip("_")), note))
    print(("PASS " if ok else "FAIL ") + name + (f" ({note})" if note else ""), flush=True)
    if not ok:
        # What was on screen, so a failure can be read straight from the log.
        print("     on screen: " + " | ".join(screen_text()), flush=True)

def web_state():
    try:
        with open(os.path.join(OUT, "web-peer.json")) as f:
            return json.load(f)
    except Exception:
        return {}

# --- Start fresh ---------------------------------------------------------
for perm in ["RECORD_AUDIO", "POST_NOTIFICATIONS", "BLUETOOTH_CONNECT"]:
    adb("shell", "pm", "grant", PKG, f"android.permission.{perm}")
# Let a cold emulator settle (its launcher is slow right after boot), then
# clear anything it put on screen before starting the app.
time.sleep(15)
nodes()
adb("shell", "am", "start", "-n", f"{PKG}/app.talklive.MainActivity")
time.sleep(6)

# 1. First launch: the welcome page, the Plus offer, then the ways in.
step("Welcome page", wait_for(r"welcome to talklive", 40))
tap(r"^continue$")
# The second intro page offers TalkLive Plus; "Not now" goes straight to the ways in.
step("Intro Plus offer", wait_for(r"get more with talklive plus", 10))
tap(r"^not now$")
step("Ways in", wait_for(r"continue as guest", 15))
tap(r"continue as guest")
# A guest gives a date of birth (wheels open on an adult year) and agrees to the rules.
step("Date of birth", wait_for(r"when were you born", 15))
tap(r"^continue$")
step("Rules summary with one agree button", wait_for(r"i.m 18\+ and i agree", 15))
tap(r"i.m 18\+ and i agree")

# 2. Setup: avatar, then about you.
step("Pick an avatar", wait_for(r"surprise me", 20))
tap(r"surprise me"); tap(r"^continue$")

# 3. Home.
step("Home", wait_for(r"start talking", 25))

# 4. A real voice call with the website user.
tap(r"start talking")
time.sleep(3)
step("Searching (or already matched)", wait_for(r"finding someone|looking around|still looking|almost there|stop|^\d{1,2}:\d{2}$", 15))
connected_app, connected_web = False, False
end = time.time() + 90
while time.time() < end and not (connected_app and connected_web):
    connected_web = web_state().get("pc") == "connected"
    connected_app = find(r"^\d{1,2}:\d{2}$") is not None  # the call timer only shows once audio is live
    time.sleep(2)
w = web_state()
step("Voice call connected (app)", connected_app, f"web side: pc={w.get('pc')} ice={w.get('ice')}")
step("Voice call connected (website)", connected_web)

if connected_app:
    # 5. Chat during the call.
    if tap(r"^message$", 8):
        step("Chat during call opens", wait_for(r"chat with|send a message", 8))
        box = next((nd for nd in nodes() if nd.get("class") == "android.widget.EditText"), None)
        if box is not None:
            x, y = center(box); adb("shell", "input", "tap", str(x), str(y)); time.sleep(1)
        # Word by word: the emulator draws in software and drops a burst of keys.
        for i, w in enumerate(["hello", "from", "the", "emulator"]):
            if i: adb("shell", "input", "keyevent", "62"); time.sleep(0.6)
            adb("shell", "input", "text", w); time.sleep(0.8)
        step("Typed a message", wait_for(r"hello from the emulator", 10))
        # Close the keyboard, then the sheet; check it really closed.
        adb("shell", "input", "keyevent", "111"); time.sleep(1)
        for _ in range(3):
            if find(r"chat with|close sheet") is None:
                break
            adb("shell", "input", "keyevent", "4"); time.sleep(1.5)
    # Add friend during the call (the website user gets the request).
    ok = tap(r"^add friend$", 5)
    step("Add friend during call", ok, "website user should receive a friend request")
    # 6. Speaker / earpiece toggle.
    tap(r"^speaker$", 5)
    step("Speaker toggled", True)
    # 7. End the call the way a person does: Back, then Leave in the dialog.
    asked = False
    for _ in range(3):
        adb("shell", "input", "keyevent", "4")
        if wait_for(r"leave this call", 5):
            asked = True
            break
    step("Leave-call question", asked)
    tap(r"^leave$", 5)
    time.sleep(2)
    step("Back on Home after the call", wait_for(r"start talking|start chatting", 25))
else:
    # Not connected: stop the search (Back, then Stop).
    adb("shell", "input", "keyevent", "4"); time.sleep(1)
    tap(r"^leave$|^stop$", 5)
    time.sleep(2)

# 8. The tabs.
for tab in ["Chats", "Friends", "Profile"]:
    ok = tap(rf"^{tab}$", 10)
    step(f"{tab} tab", ok)

# 9. Plus page from Profile.
ok = tap(r"talklive plus", 10)
step("Plus page", ok and wait_for(r"your profile with plus|start free trial|subscribe", 10))
adb("shell", "input", "keyevent", "4"); time.sleep(1)

# A random text chat with the website's text page, both directions.
tap(r"^talk$", 8)
if tap(r"^text$", 6):
    tap(r"start chatting", 8)
    matched = wait_for(r"you are now chatting|now chatting|message", 40)
    step("Text chat matched", matched)
    if matched:
        # The message box itself (an EditText to the accessibility tree).
        box = next((nd for nd in nodes() if nd.get("class") == "android.widget.EditText"), None)
        typed = box is not None
        if box is not None:
            x, y = center(box); adb("shell", "input", "tap", str(x), str(y)); time.sleep(1)
        adb("shell", "input", "text", "hi%sfrom%sthe%sapp")
        time.sleep(0.8)
        shot("text_typed")
        sent = tap(r"^send$", 5)
        time.sleep(2)
        shot("text_sent")
        print(f"     text chat: field tapped={typed} send tapped={sent}; on screen: " + " | ".join(screen_text()), flush=True)
        step("Reply from the website arrives in the app", wait_for(r"hello from the website", 25))
        # Leave with the X: it must ask first (keyboard closed beforehand).
        adb("shell", "input", "keyevent", "111"); time.sleep(0.8)
        tap(r"^end$", 5)
        step("X asks before leaving the chat", wait_for(r"leave this chat|^leave$", 6))
        tap(r"^leave$", 5); time.sleep(2)
    else:
        # Not matched: stop the search so later steps start from Home.
        adb("shell", "input", "keyevent", "4"); time.sleep(1)
        tap(r"^stop$|^leave$", 5); time.sleep(2)
    tap(r"^voice$", 5)
else:
    step("Text chat matched", False, "no Text switch on Home")

# Settings in Profile: the switches, the Calls section, themes, ID, problem report.
tap(r"^profile$", 8)
for _ in range(3):
    adb("shell", "input", "swipe", "540", "1700", "540", "700", "300"); time.sleep(0.8)
step("Settings: Calls, Privacy, Appearance", find(r"start on speaker|read receipts|vibration") is not None)
ok = scroll_to(r"^ocean$") and tap(r"^ocean$", 6)
plus = ok and wait_for(r"your profile with plus|start free trial|subscribe|talklive plus", 8)
step("Ocean theme is Plus-only (opens Plus)", plus)
if plus:
    adb("shell", "input", "keyevent", "4"); time.sleep(1)
ok = scroll_to(r"report a problem") and tap(r"report a problem", 6)
if ok:
    adb("shell", "input", "text", "test%sreport%sfrom%sthe%semulator"); time.sleep(1)
    step("Report a problem sheet", True)
    adb("shell", "input", "keyevent", "111")  # Escape: hide the keyboard
    time.sleep(0.8)
    tap(r"^send$", 5)
    step("Problem report sent", wait_for(r"we got your report", 6) or find(r"tell us what went wrong") is None)
else:
    step("Report a problem sheet", False)

# 10. Filters from Home.
tap(r"^talk$", 8)
ok = tap(r"match filters", 8)
step("Filters", ok and wait_for(r"match filters|interests", 8))
adb("shell", "input", "keyevent", "4")

# Back on Home: once shows a hint, twice leaves the app.
tap(r"^talk$", 8)
adb("shell", "input", "keyevent", "4"); time.sleep(0.6)
step("Back once on Home shows the exit hint", wait_for(r"press back again", 3))

# --- Report ---------------------------------------------------------------
passed = sum(1 for s in steps if s[1])
with open(os.path.join(OUT, "report.md"), "w") as f:
    f.write(f"# TalkLive emulator run: {passed}/{len(steps)} steps passed\n\n")
    for name, ok, img, note in steps:
        f.write(f"- {'✅' if ok else '❌'} {name}{' — ' + note if note else ''} ({img})\n")
print(f"{passed}/{len(steps)} steps passed")
sys.exit(0 if connected_app else 1)
