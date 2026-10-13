#!/usr/bin/env python3
"""Schedule the weekly TalkLive emails as Resend broadcasts, one per region.

Resend only accepts a scheduled_at up to 30 days ahead, so this is run once a
week (by a routine) and schedules every week that has come within range and
is not scheduled yet. Safe to run any number of times: a broadcast whose name
already exists is skipped.

Each region gets the email at an evening hour in its main time zone (DST
handled by zoneinfo). Contacts are put into the region segments by country
from the dashboard's accounts export; anyone not placed (new or unknown
country) is in "General", which goes out on US Eastern time.

Needs RESEND_API_KEY (full access). Usage: python3 schedule.py [--dry-run]
"""
import datetime
import json
import os
import subprocess
import sys
import urllib.parse
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from emails import EMAILS  # noqa: E402

SITE = "https://talklive.app"
FROM = "Asad from TalkLive <info@talklive.app>"
REPLY_TO = "info@talklive.app"
WA = "https://wa.me/?text=" + urllib.parse.quote("Found this - tap once and you're talking to someone new. Free, no camera: https://talklive.app")
# (label, Resend segment id, time zone, local send time)
REGIONS = [
    ("Americas", "4923a840-9e60-4993-8de9-b61b03249573", "America/New_York", (19, 30)),
    ("Asia & Oceania", "763cdde4-185e-45c1-bfc5-a880f725a19e", "Asia/Kolkata", (20, 0)),
    ("Europe, Africa & Middle East", "efb355e5-1c27-44c8-9a52-9cf8b95dd5dc", "Europe/Berlin", (20, 0)),
]
HORIZON = datetime.timedelta(days=29)


def api(method, path, body=None):
    cmd = ["curl", "-sS", "-X", method, "https://api.resend.com" + path,
           "-H", "Authorization: Bearer " + os.environ["RESEND_API_KEY"],
           "-H", "Content-Type: application/json", "-w", "\n%{http_code}"]
    if body is not None:
        cmd += ["--data-binary", "@-"]
    r = subprocess.run(cmd, input=json.dumps(body, ensure_ascii=False).encode() if body is not None else None,
                       capture_output=True, check=False)
    out, code = r.stdout.decode().rsplit("\n", 1)
    return int(code), json.loads(out) if out.strip() else {}


def render(paras):
    links = {"{call}": f'<a href="{SITE}/call">talklive.app/call</a>',
             "{chat}": f'<a href="{SITE}/chat">talklive.app/chat</a>',
             "{wa}": f'<a href="{WA}">share on WhatsApp</a>'}
    html_p, text_p = [], []
    for p in paras:
        h = p
        for k, v in links.items():
            h = h.replace(k, v)
        html_p.append(f"<p>{h}</p>")
        text_p.append(p.replace("<br>", "\n").replace("{call}", SITE + "/call")
                      .replace("{chat}", SITE + "/chat").replace("{wa}", WA))
    html = ('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
            '<body><div style="max-width:560px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222">'
            + "".join(html_p)
            + '<p style="color:#888;font-size:12px">You\'re getting this because you have a TalkLive account. '
              '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888">Unsubscribe</a></p></div></body></html>')
    text = "\n\n".join(text_p) + "\n\n--\nYou're getting this because you have a TalkLive account.\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}"
    return html, text


def planned():
    for i, (day, subject, paras) in enumerate(EMAILS, 1):
        html, text = render(paras)
        y, m, d = map(int, day.split("-"))
        for label, seg, tz, (hh, mm) in REGIONS:
            at = datetime.datetime(y, m, d, hh, mm, tzinfo=ZoneInfo(tz)).astimezone(datetime.timezone.utc)
            yield {"segment_id": seg, "name": f"Weekly {i:02d} {day} - {label}", "from": FROM, "reply_to": REPLY_TO,
                   "subject": subject, "html": html, "text": text, "send": True,
                   "scheduled_at": at.strftime("%Y-%m-%dT%H:%M:%SZ")}, at


def existing_names():
    names, after = set(), None
    while True:
        q = "?limit=100" + (f"&after={after}" if after else "")
        code, d = api("GET", "/broadcasts" + q)
        if code != 200:
            sys.exit(f"listing broadcasts failed: {code} {d}")
        names.update(b.get("name") for b in d.get("data", []))
        if not d.get("has_more") or not d.get("data"):
            return names
        after = d["data"][-1]["id"]


def main():
    dry = "--dry-run" in sys.argv
    now = datetime.datetime.now(datetime.timezone.utc)
    have = existing_names()
    made = failed = 0
    for body, at in planned():
        if body["name"] in have or at <= now + datetime.timedelta(minutes=10) or at > now + HORIZON:
            continue
        if dry:
            print("would schedule", body["name"], body["scheduled_at"])
            continue
        code, d = api("POST", "/broadcasts", body)
        ok = code == 200 and d.get("id")
        made += bool(ok)
        failed += not ok
        print("scheduled" if ok else "FAILED", body["name"], body["scheduled_at"], d.get("id") or d)
    print(f"done: {made} scheduled, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
