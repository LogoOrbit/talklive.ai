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
FROM = "TalkLive <info@talklive.app>"
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


LINKS = {"call": SITE + "/call", "chat": SITE + "/chat", "wa": WA}
SIGN = "The TalkLive Team"
ACCENT = "#6c5ce7"
FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"


def render(preheader, emoji, headline, paras, cta, link):
    url = LINKS[link]
    body = "".join(f'<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#3d3d4e">{p}</p>' for p in paras)
    html = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f3f1ff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ff"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:{FONT}">
<tr><td align="center" style="padding:0 0 18px"><a href="{SITE}" style="text-decoration:none;font-size:22px;font-weight:800;color:{ACCENT};letter-spacing:-.3px">TalkLive</a></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:36px 30px;box-shadow:0 4px 24px rgba(108,92,231,.12)">
<div style="font-size:48px;line-height:1;text-align:center;margin:0 0 16px">{emoji}</div>
<h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:800;color:#1b1b2f;text-align:center">{headline}</h1>
{body}
<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:26px auto 8px"><tr>
<td align="center" style="border-radius:999px;background:{ACCENT}"><a href="{url}" style="display:inline-block;padding:15px 34px;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">{cta} &rarr;</a></td>
</tr></table>
<p style="margin:10px 0 0;font-size:13px;color:#9a98b0;text-align:center">Free &middot; No camera &middot; Skip anytime</p>
</td></tr>
<tr><td align="center" style="padding:22px 10px 0;font-size:14px;color:#6b6985">{SIGN} 💜</td></tr>
<tr><td align="center" style="padding:14px 10px 0;font-size:12px;line-height:1.5;color:#a9a7bd">You're getting this because you have a TalkLive account.<br><a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#a9a7bd">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>'''
    strip = lambda s: s.replace("<br>", "\n").replace("<b>", "").replace("</b>", "")
    text = (headline + "\n\n" + "\n\n".join(strip(p) for p in paras) + f"\n\n{cta}: {url}\n\n{SIGN}"
            "\n\n--\nYou're getting this because you have a TalkLive account.\nUnsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}")
    return html, text


def planned():
    for i, (day, subject, preheader, emoji, headline, paras, cta, link) in enumerate(EMAILS, 1):
        html, text = render(preheader, emoji, headline, paras, cta, link)
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
