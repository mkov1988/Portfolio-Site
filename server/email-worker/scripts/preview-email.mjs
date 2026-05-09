// Render the email template to ./preview.html so you can iterate on
// the design without spinning up the worker or sending real mail.
//
//   node scripts/preview-email.mjs

import { renderHouseScenarioEmail } from '../src/email-template.js';
import { writeFileSync } from 'node:fs';

const sample = {
  meta: {
    source: 'house-calculator',
    capturedAt: new Date().toISOString(),
    pageUrl: 'https://www.mkalmykov.com/tools/house-calculator.html',
  },
  inputs: {
    homePrice: 1500000,
    totalCash: 550000,
    loanTermYears: 30,
    mortgageRatePct: 6.5,
    grossReturnPct: 10,
    propTaxPct: 1.2,
    annualInsurance: 1800,
    maintenancePct: 1,
    divYieldPct: 1.8,
    divTaxPct: 25,
    s1: { label: 'Max Down Payment', downPayment: 550000, downPaymentPct: 36.67, loanAmount: 950000 },
    s2: { label: 'Min Down + Invest the Rest', downPayment: 150000, downPaymentPct: 10, loanAmount: 1350000, upfrontInvested: 400000 },
  },
  outputs: {
    netReturnPct: 9.55,
    monthly: {
      propertyTax: 1500, insurance: 150, maintenance: 1250,
      s1: { principalAndInterest: 6004, housingTotal: 8904, invested: 1683, total: 10587 },
      s2: { principalAndInterest: 8531, housingTotal: 11431, invested: 0, total: 11431 },
    },
    lifetimeInterest: { s1: 1211440, s2: 1721180 },
    payoffDate: '2056-05-05',
    finalYear: {
      year: 30,
      s1NetWealth: 5944580, s2NetWealth: 7690467,
      s1Equity: 1500000, s2Equity: 1500000,
      s1Invested: 4444580, s2Invested: 6190467,
      winner: 's2',
      advantageDollars: 1745887,
    },
  },
};

const { html, subject } = renderHouseScenarioEmail(sample, {
  portfolioUrl: 'https://www.mkalmykov.com',
  focusReaderUrl: 'https://www.mkalmykov.com/tools/focus-reader.html',
});

writeFileSync(new URL('../preview.html', import.meta.url), html);
console.log('Subject:', subject);
console.log('Wrote preview.html');
