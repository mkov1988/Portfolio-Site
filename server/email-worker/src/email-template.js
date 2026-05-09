/**
 * Responsive HTML email for the house-calculator scenario report.
 *
 * Design constraints (Gmail / Apple Mail / Outlook):
 *   - Table-based layout. CSS grid/flex are not safe.
 *   - All styles inline or in a single <style> block in <head>.
 *   - System font stack (no @font-face).
 *   - Outlook needs explicit width="" attrs and align="" hints.
 *   - Use width: 100% + max-width on the inner table for fluid mobile.
 */

const COL_S1 = '#455CE9';
const COL_S2 = '#7c3aed';
const TEXT = '#1C1D20';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const BG = '#f6f7fb';

export function renderHouseScenarioEmail(payload, opts = {}) {
  const {
    portfolioUrl = 'https://www.mkalmykov.com',
    focusReaderUrl = 'https://www.mkalmykov.com/tools/focus-reader.html',
  } = opts;

  const { inputs, outputs } = payload;
  const winner = outputs.finalYear.winner;
  const winnerLabel = winner === 's2' ? inputs.s2.label : inputs.s1.label;
  const winnerColor = winner === 's2' ? COL_S2 : COL_S1;
  const winnerMonthly = winner === 's2'
    ? outputs.monthly.s2.principalAndInterest + outputs.monthly.s2.housingTotal - outputs.monthly.s2.principalAndInterest
    : outputs.monthly.s1.housingTotal;
  // Hero = total monthly housing for the WINNING strategy (P&I + tax + ins + maintenance).
  const heroMonthly = winner === 's2' ? outputs.monthly.s2.housingTotal : outputs.monthly.s1.housingTotal;
  const heroSub = `${winnerLabel} · ${inputs.loanTermYears}-year loan @ ${fmtPct(inputs.mortgageRatePct)}`;

  const subject = `Your house scenario: ${fmtMoney(heroMonthly)}/mo, +${fmtMoney(outputs.finalYear.advantageDollars)} at year ${outputs.finalYear.year}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<style>
  /* Client resets */
  body,table,td,p,a,h1,h2,h3,h4 { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table,td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
  body { margin:0; padding:0; width:100% !important; background:${BG}; }
  a { color:${COL_S1}; text-decoration:none; }
  /* Mobile */
  @media only screen and (max-width:600px) {
    .container { width:100% !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; padding:0 !important; }
    .stack + .stack { margin-top:16px !important; }
    .hero-num { font-size:38px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXT};">
  <!-- Preheader (hidden preview line in inbox listing) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BG};">
    Your saved scenario from the house calculator — payment, breakdown, and the 30-year picture.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
    <tr><td align="center" style="padding:32px 16px;">

      <!-- Outer container -->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">

        <!-- Brand header -->
        <tr><td class="px" style="padding:22px 32px;border-bottom:1px solid ${BORDER};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="left" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-weight:800;font-size:15px;letter-spacing:-0.01em;color:${TEXT};">
                <a href="${escapeAttr(portfolioUrl)}" style="color:${TEXT};text-decoration:none;">Michael Kalmykov</a>
                <span style="color:${MUTED};font-weight:500;">&nbsp;·&nbsp;House Calculator</span>
              </td>
              <td align="right" style="font-size:12px;color:${MUTED};">
                ${formatDate(payload.meta && payload.meta.capturedAt)}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Hero metric -->
        <tr><td class="px" style="padding:36px 32px 16px;text-align:center;">
          <div style="font-size:13px;font-weight:600;color:${MUTED};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">
            Estimated monthly payment
          </div>
          <div class="hero-num" style="font-size:52px;line-height:1.05;font-weight:800;letter-spacing:-0.025em;color:${TEXT};margin:0;">
            ${fmtMoney(heroMonthly)}
          </div>
          <div style="font-size:14px;color:${MUTED};margin:10px 0 0;">
            ${escapeHtml(heroSub)}
          </div>
          <div style="display:inline-block;margin-top:18px;padding:6px 14px;border-radius:999px;background:${winnerColor}1A;color:${winnerColor};font-size:12px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;">
            Recommended: ${escapeHtml(winnerLabel)}
          </div>
        </td></tr>

        <!-- Two-column: Inputs Used | Detailed Breakdown -->
        <tr><td class="px" style="padding:24px 32px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="stack" valign="top" width="50%" style="width:50%;padding-right:10px;">
                ${sectionCard('Inputs Used', inputsRows(inputs))}
              </td>
              <td class="stack" valign="top" width="50%" style="width:50%;padding-left:10px;">
                ${sectionCard('Monthly Breakdown', monthlyRows(outputs.monthly, winner))}
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Long-horizon comparison -->
        <tr><td class="px" style="padding:8px 32px 8px;">
          ${sectionCard(`At year ${outputs.finalYear.year}`, finalYearRows(outputs.finalYear, inputs))}
        </td></tr>

        <!-- Lifetime interest -->
        <tr><td class="px" style="padding:8px 32px 24px;">
          ${sectionCard('Lifetime interest paid', lifetimeRows(outputs, inputs))}
        </td></tr>

        <!-- Re-open CTA -->
        <tr><td class="px" align="center" style="padding:0 32px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" bgcolor="${COL_S1}" style="border-radius:8px;">
              <a href="${escapeAttr(payload.meta && payload.meta.pageUrl || portfolioUrl + '/tools/house-calculator.html')}"
                 style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                Open this scenario again →
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer / cross-promo -->
        <tr><td class="px" style="padding:24px 32px 28px;background:#0f1117;color:#cbd5e1;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;">
            <div style="font-weight:700;color:#ffffff;font-size:15px;margin:0 0 6px;">Stay focused while you save.</div>
            <div style="color:#94a3b8;margin:0 0 14px;">
              Big financial decisions take focus. <strong style="color:#e2e8f0;">Focus Reader</strong> is a free speed-reading tool I built — paste any article or upload a file and read 2–4× faster, distraction-free.
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="#ffffff" style="border-radius:8px;">
                <a href="${escapeAttr(focusReaderUrl)}"
                   style="display:inline-block;padding:10px 18px;font-size:13px;font-weight:700;color:#0f1117;text-decoration:none;border-radius:8px;">
                  Try Focus Reader →
                </a>
              </td></tr>
            </table>
          </div>
        </td></tr>

        <!-- Legal / unsubscribe -->
        <tr><td class="px" style="padding:18px 32px 22px;background:#0f1117;color:#64748b;border-top:1px solid #1f2937;font-size:11px;line-height:1.55;">
          You received this once because you requested a copy from the calculator.
          You're not on a mailing list — there's nothing to unsubscribe from.
          For educational use only; not financial advice.
          <br><a href="${escapeAttr(portfolioUrl)}" style="color:#94a3b8;text-decoration:underline;">${escapeHtml(stripScheme(portfolioUrl))}</a>
        </td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;

  return { html, subject };
}

export function renderHouseScenarioText(payload, opts = {}) {
  const { portfolioUrl = 'https://www.mkalmykov.com', focusReaderUrl = 'https://www.mkalmykov.com/tools/focus-reader.html' } = opts;
  const { inputs, outputs } = payload;
  const winner = outputs.finalYear.winner;
  const winnerLabel = winner === 's2' ? inputs.s2.label : inputs.s1.label;
  const heroMonthly = winner === 's2' ? outputs.monthly.s2.housingTotal : outputs.monthly.s1.housingTotal;

  return [
    `YOUR HOUSE SCENARIO`,
    `===================`,
    ``,
    `Estimated monthly payment: ${fmtMoney(heroMonthly)}`,
    `Strategy: ${winnerLabel}`,
    `${inputs.loanTermYears}-year loan @ ${fmtPct(inputs.mortgageRatePct)}`,
    ``,
    `INPUTS`,
    `------`,
    `Home price:       ${fmtMoney(inputs.homePrice)}`,
    `Total cash:       ${fmtMoney(inputs.totalCash)}`,
    `Mortgage rate:    ${fmtPct(inputs.mortgageRatePct)}`,
    `Loan term:        ${inputs.loanTermYears} years`,
    `Property tax:     ${fmtPct(inputs.propTaxPct)}/yr`,
    `Insurance:        ${fmtMoney(inputs.annualInsurance)}/yr`,
    `Maintenance:      ${fmtPct(inputs.maintenancePct)}/yr`,
    ``,
    `MONTHLY BREAKDOWN (winning strategy)`,
    `------------------------------------`,
    `P&I:           ${fmtMoney(winner === 's2' ? outputs.monthly.s2.principalAndInterest : outputs.monthly.s1.principalAndInterest)}`,
    `Property tax:  ${fmtMoney(outputs.monthly.propertyTax)}`,
    `Insurance:     ${fmtMoney(outputs.monthly.insurance)}`,
    `Maintenance:   ${fmtMoney(outputs.monthly.maintenance)}`,
    `TOTAL:         ${fmtMoney(heroMonthly)}`,
    ``,
    `AT YEAR ${outputs.finalYear.year}`,
    `-----------`,
    `Net wealth advantage of "${winnerLabel}": +${fmtMoney(outputs.finalYear.advantageDollars)}`,
    `Lifetime interest (S1/S2): ${fmtMoney(outputs.lifetimeInterest.s1)} / ${fmtMoney(outputs.lifetimeInterest.s2)}`,
    `Estimated payoff date: ${outputs.payoffDate}`,
    ``,
    `Re-open this scenario: ${(payload.meta && payload.meta.pageUrl) || portfolioUrl + '/tools/house-calculator.html'}`,
    ``,
    `--`,
    `Stay focused while you save. Try Focus Reader: ${focusReaderUrl}`,
    `${portfolioUrl}`,
    ``,
    `Educational use only — not financial advice.`,
  ].join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sectionCard(title, innerHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafbff;border:1px solid ${BORDER};border-radius:10px;margin:0 0 4px;">
    <tr><td style="padding:14px 16px 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">
      ${escapeHtml(title)}
    </td></tr>
    <tr><td style="padding:0 16px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:${TEXT};">
        ${innerHtml}
      </table>
    </td></tr>
  </table>`;
}

function row(label, value, opts = {}) {
  const valueColor = opts.color || TEXT;
  const weight = opts.bold ? '700' : '500';
  return `<tr>
    <td style="padding:5px 0;color:${MUTED};font-size:13px;">${escapeHtml(label)}</td>
    <td align="right" style="padding:5px 0;color:${valueColor};font-weight:${weight};font-variant-numeric:tabular-nums;">${value}</td>
  </tr>`;
}

function inputsRows(inputs) {
  return [
    row('Home price', fmtMoney(inputs.homePrice)),
    row('Down (max)', `${fmtMoney(inputs.s1.downPayment)} <span style="color:${MUTED};font-weight:500;">(${fmtPct(inputs.s1.downPaymentPct)})</span>`, { color: COL_S1 }),
    row('Down (min)', `${fmtMoney(inputs.s2.downPayment)} <span style="color:${MUTED};font-weight:500;">(${fmtPct(inputs.s2.downPaymentPct)})</span>`, { color: COL_S2 }),
    row('Loan term', `${inputs.loanTermYears} yrs`),
    row('Mortgage rate', fmtPct(inputs.mortgageRatePct)),
    row('Expected return', fmtPct(inputs.grossReturnPct)),
    row('Property tax', `${fmtPct(inputs.propTaxPct)}/yr`),
    row('Insurance', `${fmtMoney(inputs.annualInsurance)}/yr`),
  ].join('');
}

function monthlyRows(monthly, winner) {
  const w = winner === 's2' ? monthly.s2 : monthly.s1;
  return [
    row('P&I', fmtMoney(w.principalAndInterest)),
    row('Property tax', fmtMoney(monthly.propertyTax)),
    row('Insurance', fmtMoney(monthly.insurance)),
    row('Maintenance', fmtMoney(monthly.maintenance)),
    row('Housing subtotal', fmtMoney(w.housingTotal), { bold: true }),
    row('Invested / month', fmtMoney(w.invested), { color: winner === 's2' ? COL_S2 : COL_S1 }),
    row('Total monthly', fmtMoney(w.total), { bold: true }),
  ].join('');
}

function finalYearRows(finalYear, inputs) {
  return [
    row(`${inputs.s1.label}`, fmtMoney(finalYear.s1NetWealth), { color: COL_S1, bold: true }),
    row(`  · home equity`, fmtMoney(finalYear.s1Equity)),
    row(`  · invested`, fmtMoney(finalYear.s1Invested)),
    row(`${inputs.s2.label}`, fmtMoney(finalYear.s2NetWealth), { color: COL_S2, bold: true }),
    row(`  · home equity`, fmtMoney(finalYear.s2Equity)),
    row(`  · invested`, fmtMoney(finalYear.s2Invested)),
    row(`Advantage`, `+${fmtMoney(finalYear.advantageDollars)}`, { bold: true, color: finalYear.winner === 's2' ? COL_S2 : COL_S1 }),
  ].join('');
}

function lifetimeRows(outputs, inputs) {
  return [
    row(`${inputs.s1.label}`, fmtMoney(outputs.lifetimeInterest.s1), { color: COL_S1 }),
    row(`${inputs.s2.label}`, fmtMoney(outputs.lifetimeInterest.s2), { color: COL_S2 }),
    row(`Estimated payoff`, escapeHtml(outputs.payoffDate)),
  ].join('');
}

function fmtMoney(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}
function fmtPct(n) {
  if (typeof n !== 'number' || !isFinite(n)) return '0%';
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}%`;
}
function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
function stripScheme(url) { return String(url).replace(/^https?:\/\//, ''); }
