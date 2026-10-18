'use strict';
/*
 * The commerce half of TalkLive's structured data.
 *
 * October 2026: the app node is now a Service (scripts/migrate-schema.js), so
 * its free offer is a plain Offer (freeOffer below). What follows is why the
 * merchant fields existed, and they still apply to any Product node.
 *
 * Every page carries a `WebApplication` node whose `offers` advertises the
 * free tier at $0. Google reads any price-bearing offer as a merchant listing
 * and validates it against the Product/Offer rules, which is why Search
 * Console kept filing "Merchant listings" warnings against a site that sells
 * nothing: `brand` resolved to a bare `{"@id": ...}` publisher reference
 * ("Invalid object type for field brand"), and the offer carried neither
 * `hasMerchantReturnPolicy` nor `shippingDetails`.
 *
 * The fix is to describe what TalkLive actually is rather than to invent
 * retail facts:
 *
 *   - brand            an explicit Brand object instead of a cross-node
 *                      reference Google declines to resolve.
 *   - shippingDetails  $0, delivered in zero days, everywhere. That is not a
 *                      placeholder - it is literally true of a page you open
 *                      in a browser.
 *   - hasMerchantReturnPolicy
 *                      MerchantReturnNotPermitted, linked to /refund. Nothing
 *                      is charged for the free tier, so there is nothing to
 *                      return; the refund policy that does exist covers
 *                      Premium, which is not on sale.
 *
 * Deliberately absent: `aggregateRating` and `review`. Search Console lists
 * both under "Improve item appearance", but TalkLive collects free-text
 * feedback only - there is no rating data anywhere in this codebase. Writing
 * star ratings we do not have would be fabricated review content and is a
 * manual-action risk, so those two warnings stay open until real ratings
 * exist. See SEO.md.
 */

const { COUNTRIES } = require('./geo');

const SITE = 'https://talklive.app';

// The countries TalkLive publishes localized pages for. The app itself works
// anywhere with a browser, but schema.org has no "worldwide" value for these
// fields, so the served-country list is the honest stand-in - and it stays in
// step with the geo cluster instead of drifting as its own hand-kept array.
const SERVED_COUNTRIES = COUNTRIES.map(c => c.code).sort();

const BRAND = { '@type': 'Brand', name: 'TalkLive' };

// A browser app has no parcel: no fee, no handling, no transit.
const DIGITAL_SHIPPING = {
  '@type': 'OfferShippingDetails',
  shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'USD' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: SERVED_COUNTRIES },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
  },
};

const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: SERVED_COUNTRIES,
  returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
  merchantReturnLink: `${SITE}/refund`,
};

// The properties every Offer on the site needs to be a complete merchant
// listing. Spread after the offer's own fields so a page that already names
// its offer or sets a different URL keeps what it has.
function merchantOfferFields() {
  return {
    availability: 'https://schema.org/InStock',
    url: `${SITE}/`,
    hasMerchantReturnPolicy: JSON.parse(JSON.stringify(RETURN_POLICY)),
    shippingDetails: JSON.parse(JSON.stringify(DIGITAL_SHIPPING)),
  };
}

// The free-tier offer as it appears on generated pages. It hangs off the
// TalkLive Service node (see scripts/migrate-schema.js), and Google only runs
// merchant-listing checks on Product-like nodes, so the shipping and return
// fields above are not needed on it; they cost ~2.5KB of country codes on
// every page that carried them. merchantOfferFields() stays for any Product
// or rated app node that ever appears.
function freeOffer() {
  return {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Core random voice and text matching',
    availability: 'https://schema.org/InStock',
    url: `${SITE}/`,
  };
}

module.exports = { SERVED_COUNTRIES, BRAND, merchantOfferFields, freeOffer };
