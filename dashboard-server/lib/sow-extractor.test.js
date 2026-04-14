/**
 * Unit tests for sow-extractor.
 * Tests the content-level and section-header filters against synthetic input.
 * Run with: node lib/sow-extractor.test.js
 */

const { _internal } = require('./sow-extractor');
const { isUnsafeParagraph, isSkipSectionHeader, isSafeSectionHeader } = _internal;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('FAIL:', message);
  }
}

// ==================== PRICING FILTER TESTS ====================

// Should BLOCK pricing content
assert(isUnsafeParagraph('The day rate is £850 per consultant.'), 'pricing: day rate with currency');
assert(isUnsafeParagraph('Total project cost: 45,000 GBP.'), 'pricing: total with currency code');
assert(isUnsafeParagraph('Payment terms are net 30 from receipt of invoice.'), 'pricing: net 30');
assert(isUnsafeParagraph('NBI will invoice monthly in arrears.'), 'pricing: invoice reference');
assert(isUnsafeParagraph('The blended rate for this engagement is $1,200 per day.'), 'pricing: blended rate');
assert(isUnsafeParagraph('Budget allocation: £50,000 for Phase 1.'), 'pricing: budget');
assert(isUnsafeParagraph('VAT will be added at prevailing UK rates.'), 'pricing: VAT');
assert(isUnsafeParagraph('Fees are subject to change with 30 days notice.'), 'pricing: fees keyword');
assert(isUnsafeParagraph('Payment due within 14 days of invoice date.'), 'pricing: payment due');
assert(isUnsafeParagraph('Not to exceed £75,000 without prior written approval.'), 'pricing: NTE');

// ==================== LEGAL FILTER TESTS ====================

assert(isUnsafeParagraph('All confidential information must be protected.'), 'legal: confidentiality');
assert(isUnsafeParagraph('NBI retains intellectual property rights in all deliverables.'), 'legal: IP rights');
assert(isUnsafeParagraph('The parties agree to indemnify each other for gross negligence.'), 'legal: indemnify + parties');
assert(isUnsafeParagraph('Limitation of liability capped at fees paid.'), 'legal: limitation of liability');
assert(isUnsafeParagraph('This agreement shall be governed by the laws of England and Wales.'), 'legal: governing law');
assert(isUnsafeParagraph('Termination for convenience requires 60 days written notice.'), 'legal: termination');
assert(isUnsafeParagraph('Any dispute shall be resolved by arbitration in London.'), 'legal: arbitration');
assert(isUnsafeParagraph('GDPR compliance is the responsibility of the client.'), 'legal: GDPR');
assert(isUnsafeParagraph('Whereas the Supplier wishes to provide services to the Client...'), 'legal: whereas');

// ==================== SHOULD ALLOW work content ====================

assert(!isUnsafeParagraph('The project will deliver a new customer onboarding flow.'), 'safe: deliverables');
assert(!isUnsafeParagraph('Phase 1 focuses on discovery and stakeholder interviews.'), 'safe: phase description');
assert(!isUnsafeParagraph('Team will include a Product Lead, a Senior Engineer, and a UX Designer.'), 'safe: team');
assert(!isUnsafeParagraph('Success criteria include improved activation and reduced time-to-value.'), 'safe: success criteria');
assert(!isUnsafeParagraph('Weekly standups will be held every Tuesday at 10am GMT.'), 'safe: communication');
assert(!isUnsafeParagraph('The milestone for the first prototype is end of week 4.'), 'safe: milestone date (no currency)');
assert(!isUnsafeParagraph('Dependencies include access to production analytics and design tokens.'), 'safe: dependencies');
assert(!isUnsafeParagraph('Acceptance will be confirmed via email from the nominated client lead.'), 'safe: acceptance');

// ==================== SECTION HEADER TESTS ====================

// SKIP section headers
assert(isSkipSectionHeader('3. Fees and Payment'), 'skip header: fees');
assert(isSkipSectionHeader('Pricing'), 'skip header: pricing');
assert(isSkipSectionHeader('5) Legal Terms'), 'skip header: legal');
assert(isSkipSectionHeader('Confidentiality'), 'skip header: confidentiality');
assert(isSkipSectionHeader('Intellectual Property'), 'skip header: IP');
assert(isSkipSectionHeader('Limitation of Liability'), 'skip header: liability');
assert(isSkipSectionHeader('Termination'), 'skip header: termination');
assert(isSkipSectionHeader('8. Insurance'), 'skip header: insurance');
assert(isSkipSectionHeader('Commercial Terms'), 'skip header: commercial');

// SAFE section headers
assert(isSafeSectionHeader('1. Scope of Work'), 'safe header: scope');
assert(isSafeSectionHeader('Deliverables'), 'safe header: deliverables');
assert(isSafeSectionHeader('2. Timeline'), 'safe header: timeline');
assert(isSafeSectionHeader('Team Structure'), 'safe header: team');
assert(isSafeSectionHeader('Approach and Methodology'), 'safe header: approach');
assert(isSafeSectionHeader('Assumptions'), 'safe header: assumptions');
assert(isSafeSectionHeader('Acceptance Criteria'), 'safe header: acceptance');
assert(isSafeSectionHeader('4. Milestones'), 'safe header: milestones');

// ==================== REGRESSION — false positives to watch ====================

// "Per day" without currency should NOT block (it's work cadence not pricing)
// ... but our current filter does catch "per day" with digits. Verify:
assert(!isUnsafeParagraph('The team will meet per day for a standup.'), 'per day without currency context');
// Our filter catches `per day.*[\d£$€]` so "per day standup" alone is safe.

// "Total" as in "total deliverables" without currency
assert(isUnsafeParagraph('Total project cost'), 'total caught (has "cost")');
// This is blocked because of "cost" - correct
assert(!isUnsafeParagraph('Complete the discovery phase.'), 'complete != total');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
