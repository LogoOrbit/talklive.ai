# Selling TalkLive Plus on the website without Stripe (research, 2026-11-15)

Research only. No code was changed. Every factual claim has a link. Where a source was missing, conflicting or only a third-party blog, the text says so ("could not confirm").

## Answer in one paragraph

No provider found is a clean fit. TalkLive is random voice/text chat with strangers. Several merchant-of-record (MoR) providers name "dating" as prohibited, and one (Dodo) names random chat-matching explicitly, so the product category is the biggest risk, bigger than the country. Dodo does not accept Pakistan-based sellers at all, PayPal does not serve Pakistan, and Payoneer Checkout is Stripe-powered and limited to US/Hong Kong entities. The best realistic first choice is **Paddle**: Pakistan, India and Bangladesh are not on its unsupported-seller list, its prohibited list says "dating services/applications" but does not name random chat or social apps, and it is a full MoR with a subscription API and webhooks. Approval is uncertain, so ask Paddle in writing before building anything. The fallback is a **Pakistani gateway (Safepay)** if the owner has or can register a Pakistani business, but then the owner handles tax, and its subscription and international-card terms could not be confirmed from primary sources. Two other facts shape the plan. Google forbids the Android app from steering users to web checkout in most countries (US, UK, EEA and a few others have link-out programmes with fees), so the web checkout will mostly serve web visitors, not Android users. A web purchase can still unlock Plus in the Android app. Play Billing stays as it is.

## Comparison table

"MoR" = merchant of record (provider is the legal seller and handles VAT/GST/sales tax). "Not confirmed" means no primary source was found in this research.

| Provider | Seller in PK / IN / BD | MoR | Payout to seller | Fees | Subs + one-time | Category fit for random chat | Verdict |
|---|---|---|---|---|---|---|---|
| **Paddle** | Not on [unsupported list](https://www.paddle.com/support/countries-supported) (PK, IN, BD all absent). Payout to PK bank: not confirmed | Yes | Not confirmed for PK. Third-party blog: monthly payouts ([lilachbullock](https://www.lilachbullock.com/paddle-in-india/), weak source) | 5% + $0.50 per a [third-party guide](https://learnwithhasan.com/payment-gateways/country/pakistan/); not checked on Paddle's own page | Yes (Paddle Billing) | [AUP](https://paddle.com/support/aup/) bans "dating services/applications"; random chat not named; built "to serve software companies" | **First choice, uncertain approval** |
| **Lemon Squeezy** | Pakistan on bank-payout list per a [third-party summary](https://www.lilachbullock.com/lemon-squeezy-in-pakistan/); India payout restrictions [reported](https://dodopayments.com/blogs/lemonsqueezy-review) | Yes | Bank (1% fee non-US, $50 min, per third party); PayPal not available in PK | 5% + $0.50 ([third party](https://www.lilachbullock.com/lemon-squeezy-in-pakistan/)) | Yes | [Prohibits "Dating sites"](https://docs.lemonsqueezy.com/help/getting-started/prohibited-products) and "any products restricted by our payment processing partners" | Stripe-owned, in "maintenance mode" per a [competitor review](https://dodopayments.com/blogs/lemonsqueezy-review). Reject |
| **Dodo Payments** | Pakistan and Bangladesh **not** accepted; India accepted ([official list](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories.md)) | Yes | Only in listed countries | Not checked | Yes | [Prohibits](https://docs.dodopayments.com/miscellaneous/merchant-acceptance) "platforms for real-time person-to-person interactions, similar to random video- or chat-matching services" | Closed for PK/BD; TalkLive likely excluded even for India |
| **Polar** | PK, IN, BD all listed, but payouts go through **Stripe Connect Express** ([Polar](https://polar.sh/docs/merchant-of-record/supported-countries)) | Yes | Stripe Connect Express | Not checked | Yes | [AUP](https://polar.sh/docs/merchant-of-record/acceptable-use) (effective 2026-10-01) lists adult content as prohibited; dating/social chat not named (could not read the full list) | Conflicts with "no Stripe" rule |
| **Creem** | PK and BD supported with bank-partner restrictions (personal accounts only may apply); India supported ([Creem](https://docs.creem.io/merchant-of-record/supported-countries)) | Yes | Bank, Alipay, USDC; 7 EUR/USD or 1% minimum ([search summary](https://docs.creem.io/merchant-of-record/finance/payment-methods), not fully read) | Not checked | Yes | Prohibited list could not be fetched (404); a search summary says it lists dating sites and marketplaces | Unlikely for dating-adjacent; needs a written answer |
| **FastSpring** | PK, IN not on its [restricted-countries](https://fastspring.com/terms-use/restricted-countries) list; seller payout list not published (third party) | Yes | Not confirmed | Not confirmed | Yes | AUP not found | Sales-led onboarding; ask |
| **2Checkout / Verifone** | Not confirmed; [docs](https://docs.2checkout.com/docs/2checkout/Onboarding/Get-started-with-your-2Checkout-account/Restricted-countries-and-territories) page had no list | Yes | Not confirmed | Not confirmed | Yes | Prohibited list not found | Ask Verifone sales |
| **Payoneer Checkout** | "Provided by Stripe Inc. ... exclusively to US and Hong Kong entities"; wants a HK entity and over USD 20k/month ([Payoneer](https://www.payoneer.com/checkout/)) | Not stated | Payoneer | Not stated | Not stated | Not stated | Not usable (Stripe-powered, US/HK only) |
| **PayPal** | PK and BD not served ([May 2026 report](https://meatechwatch.com/2026/05/21/paypal-expands-into-another-south-asian-market-as-pakistan-continues-facing-global-payments-gap/), page not fetchable; also [WorldFirst](https://www.worldfirst.com/sasia/blog/business-banking-insights/paypal-alternatives/)) | No | n/a | n/a | n/a | PayPal AUP restricts dating services (search summary only; page returned 403) | Not available to a PK seller |
| **Gumroad** | Pakistan and India on bank-payout list per [third party](https://www.lilachbullock.com/gumroad-in-pakistan/); official [help](https://gumroad.com/help/article/13-getting-paid) says PayPal is the fallback | Not confirmed | Bank / PayPal | Not checked | Memberships not confirmed | Not checked | Not recommended: no confirmation of memberships, AUP, or tax handling |
| **Razorpay / Cashfree / PayU** | India only (Indian entity) | No (seller owns tax) | INR | Not checked | Razorpay: international recurring cards only for "eligible accounts", settled in INR ([Razorpay](https://razorpay.com/blog/international-subscriptions-india/)) | Prohibited lists not found (Razorpay's page 404) | Only if the owner is Indian. Cashfree/PayU not researched |
| **Safepay (PK)** | Pakistani merchants; SBP pilot licence and Cybersource per [Dawn](https://www.dawn.com/news/1705214) | No | PKR | 2.9% + Rs30 domestic, 3.2% + Rs30 international per an aggregator, unverified | Recurring claimed by a comparison article only | Website checklist exists ([help](https://safepay.helpscoutdocs.com/article/79-website-checklist)), contents not read | Fallback; tax is the owner's job |
| **PayFast PK, JazzCash, Easypaisa** | Pakistan | No | PKR | Not researched | Not researched | Not researched | Local buyers only; could not confirm anything |
| **SSLCommerz / bKash** | Bangladesh | No | BDT | Not researched | Not researched | Not researched | Could not confirm anything |
| **Crypto (NOWPayments, Coinbase Commerce)** | No source on either provider. Pakistan's regime is new ([Virtual Assets Act 2026, PVARA](https://profit.pakistantoday.com.pk/2026/04/15/sbp-opens-formal-banking-to-licensed-virtual-asset-service-providers/)); one guide says crypto payments for goods are generally not allowed for the public (could not verify) | No | Wallet | Not researched | Subscriptions are not natural | Not researched | Not recommended |
| **Carrier billing** | Not researched. No source found | n/a | n/a | n/a | n/a | n/a | Could not confirm; needs per-country aggregators |

## 1. Provider detail

### Category policy: how TalkLive would be classified

TalkLive is a random match-with-a-stranger voice/text chat for adults. Providers' own words:

- Paddle prohibits "Adult and other age-restricted content and services ... any material of a lewd and lascivious nature, dating services/applications" ([Paddle AUP](https://paddle.com/support/aup/)). It does not name social networks, chat or random matching. It also says it is "built to serve software companies" and its list is not exhaustive. A reviewer could treat "talk to strangers" as dating-adjacent. It could also treat it as consumer software with a safety policy. This cannot be resolved from the text.
- Dodo prohibits "Social matching and interaction services: platforms for real-time person-to-person interactions, similar to random video- or chat-matching services, matchmaking services, dating platforms, AI-generated relationship companions" ([Dodo](https://docs.dodopayments.com/miscellaneous/merchant-acceptance)). TalkLive fits this literally. (A search summary reported that other language versions of the page differ; the English page I fetched is the one quoted.)
- Lemon Squeezy prohibits "Dating sites" and "Any products restricted by our payment processing partners" ([LS](https://docs.lemonsqueezy.com/help/getting-started/prohibited-products)).
- PayPal's AUP restricts dating services (search summary of [PayPal AUP](https://www.paypal.com/us/webapps/mpp/ua/acceptableuse-full); my fetch returned 403, so exact wording is not confirmed).
- Polar's current policy ([effective 2026-10-01](https://polar.sh/docs/merchant-of-record/acceptable-use)) lists adult content as prohibited and "audio / music / chatbot generators" as restricted. It does not mention dating or social chat in what I could read. It also says Stripe's prohibited businesses apply, and Polar settles through Stripe.
- Creem: could not read its list. A search summary says it lists dating sites.
- FastSpring, 2Checkout/Verifone, Safepay, Razorpay, SSLCommerz: could not find the prohibited-business text.

Practical reading: adult-only random chat with moderation tools, an 18+ age gate and a safety page (/safety) is a "restricted/ask first" case at best, and a "dating-adjacent, rejected" case at worst. The honest way to apply is to describe the product accurately. Do not describe it as something else; a later review will find it and freeze the balance.

### Paddle
- Seller countries: "Paddle works with software businesses anywhere in the world with the exception of the unsupported countries listed below"; the list (Afghanistan, Cuba, Iran, Iraq, Russia, Syria, Venezuela and others) does not include Pakistan, India or Bangladesh ([Paddle](https://www.paddle.com/support/countries-supported)).
- Not confirmed: payout method to a Pakistani bank, payout currency, and minimums. The [supported-countries doc](https://developer.paddle.com/concepts/sell/supported-countries-locales) covers buyer countries only. Ask Paddle sales/support.
- MoR: yes (Paddle is the seller). I did not fetch Paddle's tax page in this research, so say "Paddle handles VAT/sales tax" only after confirming with them.
- Fees: 5% + $0.50 comes from a third-party guide only.
- Local methods for buyers in PK/IN/BD: not confirmed. Expect cards, PayPal and wallets that Paddle supports globally; check Paddle's payment-method list.

### Lemon Squeezy
- Stripe bought it in 2024 ([TechCrunch](https://techcrunch.com/2024/07/26/stripe-acquires-payment-processing-startup-lemon-squeezy/)). A competitor review says it is in maintenance mode, signups are open, and Stripe Managed Payments is the stated migration path (GA April 2026, access depends on business location) ([Dodo review](https://dodopayments.com/blogs/lemonsqueezy-review)). That is a competitor's claim.
- Whether a seller needs their own Stripe account: could not confirm. The third-party Pakistan summary lists bank payouts with no Stripe account mentioned ([source](https://www.lilachbullock.com/lemon-squeezy-in-pakistan/)). Either way it sits on Stripe, and it prohibits dating sites. Skip.

### Dodo, Polar, Creem
- Dodo: Pakistan merchants "not currently supported" ([Dodo blog, updated 2026-07-13](https://dodopayments.com/blogs/sell-software-from-pakistan)); the eligibility rule uses the country of the ID used for verification, and "Registering a company in a supported country does not by itself make an account eligible" ([official list](https://docs.dodopayments.com/miscellaneous/accepted-countries-and-territories.md)). India is on the list; Bangladesh appears only in a grandfathered list. TalkLive's category is excluded anyway.
- Polar: payouts via Stripe Connect Express in PK/IN/BD ([Polar](https://polar.sh/docs/merchant-of-record/supported-countries)). The owner would need a Stripe-hosted Connect account, which contradicts the "no Stripe dependency" requirement. Mention it only as a last-resort option if the owner relaxes that rule.
- Creem: Pakistan/Bangladesh payouts restricted by a bank partner ("only individual (personal) bank accounts" may be supported) ([Creem](https://docs.creem.io/merchant-of-record/supported-countries)). The prohibited list page 404'd.

### FastSpring, 2Checkout/Verifone
- Both are MoR and enterprise-leaning. I could not find official seller-country, fee or prohibited-category pages through the tools used. Treat as "ask sales". A third-party guide says FastSpring supports bank payouts in 90+ countries but does not publish the list ([search result](https://learnwithhasan.com/payment-gateways/fastspring/)).

### Payoneer Checkout, PayPal
- Payoneer Checkout: "provided by Stripe Inc. and/or its affiliates exclusively to US and Hong Kong entities" ([Payoneer](https://www.payoneer.com/checkout/)). Excluded.
- PayPal: a May 2026 report says PayPal launched in Sri Lanka on 15 May 2026 while Pakistan remains excluded ([MEA Tech Watch](https://meatechwatch.com/2026/05/21/paypal-expands-into-another-south-asian-market-as-pakistan-continues-facing-global-payments-gap/); the page returned 404 when I fetched it directly, so I rely on the search summary). Bangladesh: WorldFirst says PayPal cannot serve Pakistan and Bangladesh ([WorldFirst](https://www.worldfirst.com/sasia/blog/business-banking-insights/paypal-alternatives/)). India has PayPal, but I did not research Indian seller terms.

### India-only and local gateways
- Razorpay: international recurring card payments are for "eligible accounts", settled in INR ([Razorpay](https://razorpay.com/blog/international-subscriptions-india/)). Not an MoR, so GST and foreign VAT are the seller's problem. Cashfree and PayU: not researched.
- Safepay (Pakistan): SBP pilot licence for payment services and Cybersource tie-up for international card acceptance ([Dawn](https://www.dawn.com/news/1705214), [ProPakistani](https://propakistani.pk/2022/08/17/karachi-based-fintech-safepay-gets-sbp-approval-goes-live-with-visas-cybersource/)). Its website checklist exists. Recurring payments are claimed only by a comparison article; confirm with Safepay. Not an MoR.
- JazzCash, Easypaisa, PayFast, SSLCommerz, bKash: not researched in depth. Dodo's article says JazzCash/Easypaisa are "good for domestic payments but not built for global SaaS" ([Dodo, a competitor](https://dodopayments.com/blogs/sell-software-from-pakistan)). They could suit local PKR or BDT passes later but the buyer-side coverage is unknown.
- Crypto: Pakistan passed a Virtual Assets Act in 2026 and the central bank opened banking to licensed providers ([Profit, 2026-04-15](https://profit.pakistantoday.com.pk/2026/04/15/sbp-opens-formal-banking-to-licensed-virtual-asset-service-providers/)). Whether a Pakistani merchant may accept crypto as payment: could not confirm. Not recommended before legal advice.
- Carrier billing: no source found. Could not confirm.
- Using a relative's or third party's foreign Stripe account: a competitor article calls this "risky, likely against terms of service, and a tax-compliance problem" ([Dodo](https://dodopayments.com/blogs/sell-software-from-pakistan)). Do not.

## 2. Google Play policy

Quotes are from Google's [Payments policy FAQ page](https://support.google.com/googleplay/android-developer/answer/10281818) and [policy text](https://support.google.com/googleplay/android-developer/answer/9858738).

- Play Billing is required for in-app digital goods: "must use Google Play's billing system for those transactions unless Section 3, 8, or 9 applies."
- Anti-steering: "Within an app, developers may not lead users to a payment method other than Google Play's billing system", including "directly linking to a webpage that could lead to an alternate payment method" and "using language that encourages a user to purchase the digital item outside of the app." Administrative links are allowed "as long as the webpage does not eventually lead to an alternate payment method".
- Outside the app: "Outside of your app, you are free to communicate with your users about alternative purchase options." So the website, email, social and the store-independent pricing page can advertise the web price. The Android app itself cannot say "cheaper on the web" except under a programme below.
- Cross-platform entitlement: the page says "a user could log in when the app opens and access content paid for somewhere else" and "We do not require parity across platforms." Consumption-only is defined as an app where products or services "cannot be purchased" in the app. TalkLive sells in the app, so it is not consumption-only; the consumption-only carve-outs on linking do not apply to it. A web purchase unlocking Plus in the app is fine as an entitlement. The restriction is on how the app talks about buying. Caveat: the full text of Payments policy sections 3, 8 and 9 was not in the page I could read.
- Programmes (verify the live pages before relying on them):
  - US: [external content links programme](https://support.google.com/googleplay/android-developer/answer/16470497?hl=en), optional, US users only. It allows links to purchase in-app digital items on a browser or webview. Requirements include APIs, support, refunds. Reporting and fees from 2026-10-01; purchases within 24 hours of following a link count; subscriptions 10%, other rates 10% or 20% depending on install age. Developers outside the US can enroll to link US users.
  - UK/EEA: [billing choice programme](https://support.google.com/googleplay/android-developer/answer/17161464?hl=en) from 2026-06-30 (Australia and Japan from 2026-09-30). Requires offering Play Billing alongside, reporting to Google within 24 hours, refund and order-history links, and fees (10% subscriptions, 20% other on new installs for external links). The EEA also has the older External Offers programme; the page says Google Play Billing is not permitted when enrolled in it ([Appcharge, secondary](https://www.appcharge.com/blog/making-sense-of-google-payment-programs-ecl-billing-choice-level-up-and-the-global-model)).
  - India and South Korea: user choice billing (alternative billing inside the app) with a 4% fee reduction, per the Payments FAQ page above; the live 2026 fee after the June changes could not be confirmed. RevenueCat reads user choice billing as not authorising links to web checkout ([RevenueCat](https://www.revenuecat.com/blog/engineering/app-to-web-purchase-guidelines)). India is not in the billing choice country table.
  - Pakistan and Bangladesh: no programme found, so no in-app web link.
  - Epic v. Google context is covered by reports that the 2024 injunction remains ([search summary of ecorpit](https://ecorpit.com/google-play-catalog-access-program-third-party-stores-2026/)); secondary source.
- Net for product: keep the Android app free of web purchase links and "buy elsewhere" copy, except possibly a US-only linked flow later, which brings Google fees and reporting. Accept that web checkout serves web and desktop users.

## 3. Showing a struck-through original price

Show an anchor only if it is a price that was really charged.

- Google Play: I could not read the Deceptive Behavior text itself. A search summary of Google's [subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533) says offers must disclose price, billing frequency and trial conversion clearly. Google also rejects deceptive metadata. A fake "was" price in a store listing or in-app is a misleading claim by any reading; check the live [Deceptive Behavior policy](https://support.google.com/googleplay/android-developer/answer/9898842) before shipping.
- EU (Omnibus): Article 6a of Directive 98/6/EC, added by Directive 2019/2161, says "the prior price means the lowest price applied by the trader during a period of time not shorter than 30 days prior to the application of the price reduction" ([summary of the text](https://www.iubenda.com/en/blog/obligations-when-announcing-a-price-reduction-understanding-the-omnibus-directive)). The CJEU confirmed the reduction must be measured against that lowest price ([Baker McKenzie](https://globallitigationnews.bakermckenzie.com/2024/10/15/european-union-the-cjeu-confirms-that-a-price-reduction-must-be-calculated-based-on-the-lowest-price-in-the-last-30-days/)). I could not open the EUR-Lex text directly. Member states have exceptions that vary.
- US FTC: 16 CFR 233.1(a): a former price comparison is legitimate when the former price is "the actual, bona fide price at which the article was offered to the public on a regular basis" ([16 CFR 233.1](https://www.law.cornell.edu/cfr/text/16/233.1)). A price set only to make the discount look bigger does not qualify.
- Rule for the table in `pricing-table.json`: a struck-through price is allowed only if that exact price was shown to that country for at least 30 days before the discount started and during a period of regular sale. Otherwise show only the current price, or compare to a different thing (for example "monthly price x 12" for the yearly plan, labelled as such). Not researched: India, Pakistan and Bangladesh consumer-law rules on price claims.

## 4. Recommendation

**First choice: Paddle.**
- Why: not excluded by country; MoR (tax handled); subscription and one-time support with an API and webhooks; its AUP does not name random chat or social apps; no Stripe account for the seller.
- Realistic approval risk: **high or uncertain**, probably 50% or lower. The reasons are the "dating services/applications" line, the "software companies" positioning, and unknown Pakistan payout rules. I cannot give a measured probability; this is a judgement.
- Do first: email Paddle sales/support before building. Ask (1) is a random voice/text chat app with 18+ gating, moderation and reporting acceptable, (2) can a Pakistan-registered seller or individual receive payouts, in what currency and by what method, (3) fees and payout minimums, (4) does Paddle accept an individual (sole proprietor) in Pakistan. Keep the answer in writing.

**Fallback: Safepay** (or another SBP-licensed Pakistani gateway) for card payments from abroad, if the owner has a Pakistani business registration or NTN. Costs: owner handles tax and invoicing, buyer coverage is mostly cards, recurring billing is unconfirmed, and category approval (SBP and card-scheme rules) is unknown. Use passes (one-time) first, since they need no recurring-billing support.

**If the owner is Indian:** Razorpay with international cards enabled is a plausible fallback; India is on Dodo's list but the category excludes TalkLive. **If Bangladeshi:** Paddle (not on its unsupported list) and local gateways; Dodo is closed.

**Not recommended:** Lemon Squeezy (dating ban, Stripe-owned, maintenance mode), Dodo (category and country), Payoneer Checkout (Stripe, US/HK), PayPal (not in PK/BD), Polar (Stripe Connect), crypto (legal uncertainty), another person's Stripe account.

**Prepare for onboarding** (typical, not confirmed per provider): legal name and ID of the owner or company registration, business bank account details (IBAN/SWIFT), tax number (NTN), website with working /terms, /privacy, /pricing, /safety, /contact (TalkLive has all five), a clear refund and cancellation policy visible before payment, subscription terms (renewal, how to cancel), an age gate statement (18+), a description of moderation, reporting, and ban handling, and a support email that answers. Screenshots or a demo account for the reviewer. Do not call the app something else than it is.

**Cost and revenue reality:** Paddle at about 5% + $0.50 on a $1.99 pass is about 30% (third-party fee figure, check). Small passes are expensive on a MoR; weigh a minimum price for web, and keep honest anchors (section 3).

## 5. Integration sketch (first choice: Paddle Billing)

Sketch only. Paddle API field names below come from my general knowledge of Paddle Billing, not from pages fetched in this research; verify each in the [Paddle docs](https://developer.paddle.com) before coding.

**Existing pieces to reuse** (`server/index.js`, `server/play-billing.js`):
- `/billing/play/verify` checks `clientId` + `identityToken` (`validIdentityToken`), asks Google what a token really is, and applies it with `applyPlayPurchase` and `store.setPremium` / `store.revokePremium`, then `store.persistNow()` and `emitPremiumStatus`.
- `/billing/play/rtdn` is authenticated by a shared secret in the URL, re-checks with Google rather than trusting the message, and returns 2xx for unusable messages and 5xx to get retries.
- `playBilling.nextPremium` / `nextPassPremium` never shorten an active expiry, keep permanent grants, and revoke only what the same source granted. `store.data.playPurchases` and `playPassGrants` record who owns each token. `/premium-status` already syncs web and Android because both read the same profile.
- AUDIT.md C2 (Stripe): events arrive out of order, so `checkout.completed` after `invoice.paid` shortened a period, an old subscription's deletion revoked the new one, a revoke wiped manual grants, and duplicates were re-applied. Avoid every one of these.

**Checkout flow**
1. Pricing page (web) calls `POST /billing/web/checkout` with `clientId`, `identityToken` and a plan key (`plus_monthly`, `plus_yearly`, `pass_1d`, `pass_7d`, `pass_15d`). The server validates the identity token, maps the plan to a Paddle price id (kept server-side, with the per-country price from `pricing.js`), and creates a Paddle transaction with `custom_data: { clientId }`. Returning the transaction id means the browser cannot change the amount or the profile id.
2. Browser opens Paddle's overlay checkout with that transaction id (Paddle.js, client-side token). No card data touches TalkLive.
3. After success the page polls `/premium-status` (it already does this up to 11 times) and shows the date.

**Identifying the buyer without forcing sign-up**: the anonymous profile (`clientId` + `identityToken`) is already the key for Plus, so no account is needed. Paddle collects the buyer's email; store `email -> clientId` hashed or plain per the privacy policy so support can restore access if the browser data is lost. A purchase made for someone else's `clientId` is a gift and harmless. If the identity token is missing, refuse to create the transaction rather than guess.

**Webhook endpoint** `POST /billing/web/webhook` (raw body, not `express.json`, so the signature can be checked):
- Verify the `Paddle-Signature` header (timestamp plus HMAC-SHA256 of `ts:rawBody` with the endpoint secret) using `crypto.timingSafeEqual`, and reject timestamps older than a few minutes. Confirm the exact scheme in the docs.
- Handle only what you recognise; return 2xx for the rest and 5xx on a temporary failure so Paddle retries.

**Event mapping** (names to verify):

| Paddle event | Action |
|---|---|
| `transaction.completed` for a pass price | Grant N days once (idempotent by transaction id), via a `nextWebPassPremium` copy of `nextPassPremium` with source `web-pass` |
| `subscription.created` / `activated` / `updated` / `transaction.completed` for a subscription | Re-fetch the subscription from the API, take `current_billing_period.ends_at` and status, then grant until that time. Never shorten |
| `subscription.canceled` | Access continues to the period end if the API says so; revoke only if status is canceled and the end has passed or the API says ended |
| `subscription.past_due` / `paused` | Keep until the paid period ends, then stop (match the Play `decide` states) |
| `adjustment.created` / `updated` (refund or chargeback) | If approved and the adjustment covers the whole transaction: revoke the days of that pass or the subscription period; partial refund: log and decide by policy |

**Ordering and idempotency**
- As with Play, treat the webhook as a hint and re-read the object from Paddle's API; the result is the same whatever order events arrive in. This removes the C2 failure class.
- Keep `store.data.webEvents[event_id]` (bounded, expire after ~30 days) to drop duplicates; and `webTransactions[transaction_id] = { clientId, planKey }` (like `playPassGrants`) so a pass is granted once even if two events carry it.
- Store `subscriptionId` and `lastEventAt` on the premium record (new `source: 'web'`). Ignore an event older than `lastEventAt`. Revoke only if the subscription id matches. Never touch `play`, `play-pass`, referral or manual grants. Keep `nextPremium`'s rule that the longer expiry wins.
- Persist before answering (`store.persistNow()`, `whenPersisted`), then `emitPremiumStatus(clientId)`, as the Play path does.
- Overlap with Play: a user with both keeps the later expiry; if one source ends, do not revoke the other.

**Refunds and chargebacks**: handled through adjustments above. Add the refund policy text to /terms and /pricing, and a link to the provider's receipt/manage page (Google's billing-choice rules, if ever used, require order-history and refund links). A chargeback should also flag the profile for manual review in the admin dashboard.

**What needs the owner's credentials to test**: a Paddle sandbox account and a live account after approval, API keys (server), client-side token, webhook endpoint secret, price ids for 2 subscriptions and 3 passes (and per-country prices if used), the approved domain for checkout, and a public HTTPS URL for webhooks (the Fly app). Everything else, including signature checks, ordering and idempotency, can be unit-tested offline with fixture payloads, like the existing Play tests.

**Also decide before building**: whether web prices should differ from Play (the Play price table is separate; do not mention a web discount inside the Android app); how to show web-only prices on /pricing for Android visitors (the page is on the website, which is allowed, but check the page is not reachable from a link inside the app); and tax-inclusive display, which Paddle (as MoR) sets per country.

## Not confirmed (summary)

- Paddle payout method, currency and fees for a Pakistani seller, and whether an individual (not a company) is accepted.
- Whether Paddle would approve TalkLive's category.
- Prohibited lists for Creem, FastSpring, 2Checkout/Verifone, Safepay, Razorpay, SSLCommerz/bKash; exact PayPal AUP wording.
- Subscription support on Safepay, JazzCash, Easypaisa, PayFast, SSLCommerz, bKash; anything on Cashfree and PayU.
- Carrier billing and crypto processors for Pakistan.
- Current Google fee rates for India/Korea user choice billing and whether any link-out programme covers Pakistan or Bangladesh (none found).
- The Google Deceptive Behavior policy text and the EUR-Lex text were read only through summaries.
- Several fee figures are from third-party blogs, not the providers.
