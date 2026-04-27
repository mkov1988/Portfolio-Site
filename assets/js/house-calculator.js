function initHouseCalculator() {

        // ═══════════════════════════════════════════════
        // GLOBALS
        // ═══════════════════════════════════════════════
        let netWealthChart, liquidityChart, compositionChart;

        // ═══════════════════════════════════════════════
        // THEME SETUP
        // ═══════════════════════════════════════════════
        const themeToggle = document.getElementById('themeToggle');
        // Scope theme to the calculator section so the dark mode toggle does not
        // bleed into the rest of the portfolio. Falls back to <html> for the
        // standalone calculator (which has no .calculator-section wrapper).
        const htmlEl = document.querySelector('.calculator-section') || document.documentElement;

        function updateChartColors() {
            const isDark = htmlEl.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#f9fafb' : '#1a1d23';
            const gridColor = isDark ? '#374151' : '#f0f1f3';
            const tooltipBg = isDark ? '#374151' : '#1a1d23';
            const tooltipColor = '#f9fafb';

            const updateOpts = (chart) => {
                if (!chart) return;
                chart.options.scales.x.grid.color = gridColor;
                chart.options.scales.x.ticks.color = textColor;
                if (chart.options.scales.y) {
                    chart.options.scales.y.grid.color = gridColor;
                    chart.options.scales.y.ticks.color = textColor;
                }
                chart.options.plugins.legend.labels.color = textColor;
                chart.options.plugins.tooltip.backgroundColor = tooltipBg;
                chart.options.plugins.tooltip.titleColor = tooltipColor;
                chart.options.plugins.tooltip.bodyColor = tooltipColor;
                chart.update('none');
            };

            updateOpts(netWealthChart);
            updateOpts(liquidityChart);
            updateOpts(compositionChart);
        }

        function setTheme(theme) {
            htmlEl.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
            if (typeof netWealthChart !== 'undefined' && netWealthChart) {
                updateChartColors();
            }
        }

        themeToggle.addEventListener('click', () => {
            const current = htmlEl.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });

        // Default to dark to match the calculator's hero header. User's manual
        // toggle is remembered via localStorage; system pref is intentionally
        // ignored so the page lands on a cohesive dark look on first visit.
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);

        // ═══════════════════════════════════════════════
        // MATH / OTHER GLOBALS
        // ═══════════════════════════════════════════════
        const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
        const fmtShort = (n) => {
            if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
            if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'k';
            return '$' + Math.round(n);
        };

        // ═══════════════════════════════════════════════
        // INPUT SYNC (slider <-> number)
        // ═══════════════════════════════════════════════
        const simplePairs = [
            ['homePrice', 'homePriceSlider'],
            ['totalCash', 'totalCashSlider'],
            ['mortgageRate', 'mortgageRateSlider'],
            ['grossReturn', 'grossReturnSlider'],
            ['loanTerm', 'loanTermSlider'],
            ['propTax', 'propTaxSlider'],
            ['insurance', 'insuranceSlider'],
            ['maintenance', 'maintenanceSlider'],
            ['divYield', 'divYieldSlider'],
            ['divTax', 'divTaxSlider'],
        ];

        simplePairs.forEach(([numId, sliderId]) => {
            const numEl = document.getElementById(numId);
            const sliderEl = document.getElementById(sliderId);
            numEl.addEventListener('input', () => {
                sliderEl.value = numEl.value;
                enforceConstraints(numId);
                recalculate();
            });
            sliderEl.addEventListener('input', () => {
                numEl.value = sliderEl.value;
                enforceConstraints(sliderId);
                recalculate();
            });
        });

        // Scenario 2 Special Logic
        const s2DownBox = document.getElementById('s2Down');
        const s2InvestBox = document.getElementById('s2Invest');
        const s2Slider = document.getElementById('s2DownSlider');

        const s2DownInput = document.getElementById('s2DownInput');
        const s2InvestInput = document.getElementById('s2InvestInput');

        [s2DownBox, s2InvestBox, s2Slider].forEach(el => {
            el.addEventListener('input', (e) => {
                enforceConstraints(e.target.id);
                recalculate();
            });
        });

        // Editable Scenario 2 inputs — sync to hidden fields then enforce
        s2DownInput.addEventListener('input', () => {
            s2DownBox.value = s2DownInput.value;
            enforceConstraints('s2Down');
            recalculate();
        });
        s2InvestInput.addEventListener('input', () => {
            s2InvestBox.value = s2InvestInput.value;
            enforceConstraints('s2Invest');
            recalculate();
        });

        function enforceConstraints(sourceId) {
            const totalCash = parseFloat(document.getElementById('totalCash').value) || 0;
            const homePrice = parseFloat(document.getElementById('homePrice').value) || 0;
            const maxDown = Math.min(totalCash, homePrice);

            // Adjust slider max to the lesser of homePrice or totalCash
            s2Slider.max = maxDown;

            let s2D = parseFloat(s2DownBox.value) || 0;
            let s2I = parseFloat(s2InvestBox.value) || 0;

            if (sourceId === 'totalCash' || sourceId === 'totalCashSlider' || sourceId === 'homePrice' || sourceId === 'homePriceSlider' || sourceId === 'init') {
                if (s2D > maxDown) {
                    s2D = maxDown;
                }
                s2I = totalCash - s2D;
            } else if (sourceId === 's2Down' || sourceId === 's2DownSlider') {
                s2D = parseFloat(sourceId === 's2Down' ? s2DownBox.value : s2Slider.value) || 0;
                s2D = Math.min(s2D, maxDown);
                s2I = totalCash - s2D;
            } else if (sourceId === 's2Invest') {
                s2I = Math.min(s2I, totalCash);
                s2D = totalCash - s2I;
                if (s2D > maxDown) {
                    s2D = maxDown;
                    s2I = totalCash - s2D;
                }
            }

            s2DownBox.value = s2D;
            s2Slider.value = s2D;
            s2InvestBox.value = s2I;

            // Update editable inputs with raw numeric values
            if (s2DownInput && document.activeElement !== s2DownInput) s2DownInput.value = s2D;
            if (s2InvestInput && document.activeElement !== s2InvestInput) s2InvestInput.value = s2I;

            // Enforce S1 Max Down
            const s1D = Math.min(homePrice, totalCash);
            document.getElementById('s1Down').value = s1D;
            const s1Display = document.getElementById('s1DownDisplay');
            if (s1Display) s1Display.textContent = fmt(s1D);
        }

        // Run once on load to sync everything correctly
        // ═══════════════════════════════════════════════
        // SLIDER FILL (blue track left of thumb)
        // ═══════════════════════════════════════════════
        function updateSliderFill(slider) {
            const min = parseFloat(slider.min) || 0;
            const max = parseFloat(slider.max) || 100;
            const val = parseFloat(slider.value) || 0;
            const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
            slider.style.setProperty('--slider-fill', pct + '%');
        }

        function initAllSliderFills() {
            document.querySelectorAll('input[type="range"]').forEach(updateSliderFill);
        }

        // Update fill on drag for any slider (including dynamically created ones)
        document.addEventListener('input', (e) => {
            if (e.target.type === 'range') updateSliderFill(e.target);
        });

        document.addEventListener("DOMContentLoaded", () => {
            enforceConstraints('init');
            initAllSliderFills();
        });

        // ═══════════════════════════════════════════════
        // ADVANCED TOGGLE
        // ═══════════════════════════════════════════════
        function toggleAdvanced() {
            const toggle = document.getElementById('advancedToggle');
            const body = document.getElementById('advancedBody');
            toggle.classList.toggle('open');
            body.classList.toggle('open');
        }

        // ═══════════════════════════════════════════════
        // TABS
        // ═══════════════════════════════════════════════
        function switchTab(tab) {
            document.getElementById('tab-charts').classList.toggle('active', tab === 'charts');
            document.getElementById('tab-data').classList.toggle('active', tab === 'data');
            document.getElementById('content-charts').classList.toggle('active', tab === 'charts');
            document.getElementById('content-data').classList.toggle('active', tab === 'data');
        }

        // ═══════════════════════════════════════════════
        // MATH ENGINE
        // ═══════════════════════════════════════════════
        function getInputs() {
            return {
                homePrice: parseFloat(document.getElementById('homePrice').value) || 0,
                totalCash: parseFloat(document.getElementById('totalCash').value) || 0,
                s1Down: parseFloat(document.getElementById('s1Down').value) || 0,
                s2Down: parseFloat(document.getElementById('s2Down').value) || 0,
                mortgageRate: (parseFloat(document.getElementById('mortgageRate').value) || 0) / 100,
                grossReturn: (parseFloat(document.getElementById('grossReturn').value) || 0) / 100,
                loanTerm: parseInt(document.getElementById('loanTerm').value) || 30,
                propTax: (parseFloat(document.getElementById('propTax').value) || 0) / 100,
                insurance: parseFloat(document.getElementById('insurance').value) || 0,
                maintenance: (parseFloat(document.getElementById('maintenance').value) || 0) / 100,
                divYield: (parseFloat(document.getElementById('divYield').value) || 0) / 100,
                divTax: (parseFloat(document.getElementById('divTax').value) || 0) / 100,
            };
        }

        function calcMonthlyPayment(principal, annualRate, termYears) {
            if (principal <= 0) return 0;
            if (annualRate <= 0) return principal / (termYears * 12);
            const r = annualRate / 12;
            const n = termYears * 12;
            return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        }

        function calcLoanBalance(principal, annualRate, termYears, monthsPaid) {
            if (principal <= 0) return 0;
            if (annualRate <= 0) return Math.max(0, principal - (principal / (termYears * 12)) * monthsPaid);
            const r = annualRate / 12;
            const n = termYears * 12;
            if (monthsPaid >= n) return 0;
            return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, monthsPaid)) / (Math.pow(1 + r, n) - 1);
        }

        function runModel(inputs) {
            const { homePrice, s1Down, s2Down, mortgageRate, grossReturn,
                loanTerm, propTax, insurance, maintenance, divYield, divTax } = inputs;

            // Tax drag
            const taxDrag = divYield * divTax;
            const netReturn = grossReturn - taxDrag;
            const monthlyReturn = netReturn / 12;

            // Loan amounts
            const s1Loan = Math.max(0, homePrice - s1Down);
            const s2Loan = Math.max(0, homePrice - s2Down);

            // Monthly P&I
            const s1PI = calcMonthlyPayment(s1Loan, mortgageRate, loanTerm);
            const s2PI = calcMonthlyPayment(s2Loan, mortgageRate, loanTerm);

            // Common monthly costs
            const monthlyPropTax = (homePrice * propTax) / 12;
            const monthlyIns = insurance / 12;
            const monthlyMnt = (homePrice * maintenance) / 12;
            const commonCosts = monthlyPropTax + monthlyIns + monthlyMnt;

            // Total monthly housing
            const s1Housing = s1PI + commonCosts;
            const s2Housing = s2PI + commonCosts;

            // The key insight: both scenarios spend the SAME total monthly amount
            // The higher-housing-cost scenario invests $0; the lower one invests the difference
            const maxHousing = Math.max(s1Housing, s2Housing);
            const s1Investment = maxHousing - s1Housing;
            const s2Investment = maxHousing - s2Housing;

            const s1StartVTSAX = Math.max(0, inputs.totalCash - s1Down);
            const s2StartVTSAX = Math.max(0, inputs.totalCash - s2Down);

            // Year-by-year simulation (monthly steps)
            const years = [];
            let s1VTSAX = s1StartVTSAX;
            let s2VTSAX = s2StartVTSAX;

            for (let year = 0; year <= loanTerm; year++) {
                const monthsPaid = year * 12;
                const s1LoanBal = calcLoanBalance(s1Loan, mortgageRate, loanTerm, monthsPaid);
                const s2LoanBal = calcLoanBalance(s2Loan, mortgageRate, loanTerm, monthsPaid);
                const s1Equity = homePrice - s1LoanBal;
                const s2Equity = homePrice - s2LoanBal;
                const s1Net = s1Equity + s1VTSAX;
                const s2Net = s2Equity + s2VTSAX;

                years.push({
                    year,
                    s1Loan: s1LoanBal,
                    s1VTSAX,
                    s1Net,
                    s2Loan: s2LoanBal,
                    s2VTSAX,
                    s2Net,
                    advantage: s2Net - s1Net,
                });

                // Compound for next year (12 months)
                if (year < loanTerm) {
                    for (let m = 0; m < 12; m++) {
                        s1VTSAX = s1VTSAX * (1 + monthlyReturn) + s1Investment;
                        s2VTSAX = s2VTSAX * (1 + monthlyReturn) + s2Investment;
                    }
                }
            }

            return {
                taxDrag, netReturn,
                s1Loan, s2Loan,
                s1PI, s2PI,
                monthlyPropTax, monthlyIns, monthlyMnt, commonCosts,
                s1Housing, s2Housing,
                s1Investment, s2Investment,
                s1StartVTSAX, s2StartVTSAX,
                years,
                loanTerm,
            };
        }

        // ═══════════════════════════════════════════════
        // UPDATE UI
        // ═══════════════════════════════════════════════
        function recalculate() {
            const inputs = getInputs();
            const model = runModel(inputs);
            const finalYear = model.years[model.years.length - 1];

            // Dynamic Title
            const advAmount = Math.abs(finalYear.advantage);
            const s2WinsCheck = finalYear.advantage >= 0;
            const winnerStrategy = s2WinsCheck
                ? 'minimized the down payment'
                : 'put the max down';
            document.getElementById('bottomLineTitle').textContent =
                `At year ${model.loanTerm}, you'd have ${fmt(advAmount)} more if you ${winnerStrategy}.`;

            // Scenario notes
            const s1Pct = inputs.homePrice > 0 ? ((inputs.s1Down / inputs.homePrice) * 100).toFixed(1) : '0';
            const s1Note = inputs.totalCash > inputs.homePrice ? `${s1Pct}% down — extra cash (${fmt(inputs.totalCash - inputs.s1Down)}) invested` : `${s1Pct}% down — 100% of cash goes to the house`;
            document.getElementById('s1PctNote').textContent = s1Note;

            // Net return note
            const taxDragPct = (model.taxDrag * 100).toFixed(2);
            const netReturnPct = (model.netReturn * 100).toFixed(2);
            const grossReturnPct = (inputs.grossReturn * 100).toFixed(2);
            document.getElementById('netReturnNote').textContent = `Net Return (after dividend taxes): ${netReturnPct}%`;

            // Tax drag box
            document.getElementById('taxDragDetail').innerHTML =
                `Net Return: ${netReturnPct}%<br>(${grossReturnPct}% gross − ${taxDragPct}% tax)`;

            // Bottom Line - determine winner
            const adv = finalYear.advantage; // adv = s2Net - s1Net
            const advAbs = Math.abs(adv);
            const s2Wins = adv >= 0;

            // Dynamic State Switching
            const s1ResultEl = document.getElementById('s1Result');
            const s2ResultEl = document.getElementById('s2Result');

            s1ResultEl.className = s2Wins ? 'scenario-result baseline' : 'scenario-result pro-tier winner';
            s2ResultEl.className = s2Wins ? 'scenario-result pro-tier winner' : 'scenario-result baseline';

            // HTML constructors for Footers and Badges
            const pctWinS1 = finalYear.s2Net > 0 ? ((advAbs / finalYear.s2Net) * 100).toFixed(1) : '0';
            const pctWinS2 = finalYear.s1Net > 0 ? ((advAbs / finalYear.s1Net) * 100).toFixed(1) : '0';

            const heroFooterHTML = (val, pct, winnerName) => `
                <div class="result-footer footer-hero">
                    <div class="footer-title">WEALTH ADVANTAGE</div>
                    <div class="footer-value">+${fmt(val)}</div>
                    <div class="footer-sub">${winnerName} ahead by ${pct}%</div>
                </div>
            `;

            const baselineFooterHTML = (val) => `
                <div class="result-footer footer-baseline">
                    <div class="footer-title">DIFFERENCE</div>
                    <div class="footer-value">-$${fmt(val).replace('$', '')}</div>
                    <div class="footer-sub">Leaves ${fmt(val)} on the table vs. the other strategy</div>
                </div>
            `;

            const badgeHTML = `<div class="winner-badge" id="winnerBadge">+${fmt(advAbs)} ahead</div>`;

            // Reset badges & Clear old static footers
            const existingBadges = document.querySelectorAll('.winner-badge');
            existingBadges.forEach(b => b.remove());
            const existingS1Footer = s1ResultEl.querySelector('.result-footer');
            if (existingS1Footer) existingS1Footer.remove();
            const existingS2Footer = s2ResultEl.querySelector('.result-footer');
            if (existingS2Footer) existingS2Footer.remove();

            // Inject new dynamic states
            if (s2Wins) {
                s2ResultEl.insertAdjacentHTML('afterbegin', badgeHTML);
                s1ResultEl.insertAdjacentHTML('beforeend', baselineFooterHTML(advAbs));
                s2ResultEl.insertAdjacentHTML('beforeend', heroFooterHTML(advAbs, pctWinS2, 'Scenario 2'));
            } else {
                s1ResultEl.insertAdjacentHTML('afterbegin', badgeHTML);
                s1ResultEl.insertAdjacentHTML('beforeend', heroFooterHTML(advAbs, pctWinS1, 'Scenario 1'));
                s2ResultEl.insertAdjacentHTML('beforeend', baselineFooterHTML(advAbs));
            }

            document.getElementById('s1Wealth').textContent = fmt(finalYear.s1Net);
            document.getElementById('s1EquityLabel').textContent = fmt(finalYear.s1Net - finalYear.s1VTSAX);
            document.getElementById('s1VtsaxLabel').textContent = fmt(finalYear.s1VTSAX);

            document.getElementById('s2Wealth').textContent = fmt(finalYear.s2Net);
            document.getElementById('s2EquityLabel').textContent = fmt(finalYear.s2Net - finalYear.s2VTSAX);
            document.getElementById('s2VtsaxLabel').textContent = fmt(finalYear.s2VTSAX);
            // Monthly Cash Flow
            document.getElementById('cf-s1-pi').textContent = fmt(model.s1PI);
            document.getElementById('cf-s1-tax').textContent = fmt(model.monthlyPropTax);
            document.getElementById('cf-s1-ins').textContent = fmt(model.monthlyIns);
            document.getElementById('cf-s1-mnt').textContent = fmt(model.monthlyMnt);
            document.getElementById('cf-s1-sub').textContent = fmt(model.s1Housing);
            document.getElementById('cf-s1-inv').textContent = fmt(model.s1Investment);
            document.getElementById('cf-s1-total').textContent = fmt(model.s1Housing + model.s1Investment);

            document.getElementById('cf-s2-pi').textContent = fmt(model.s2PI);
            document.getElementById('cf-s2-tax').textContent = fmt(model.monthlyPropTax);
            document.getElementById('cf-s2-ins').textContent = fmt(model.monthlyIns);
            document.getElementById('cf-s2-mnt').textContent = fmt(model.monthlyMnt);
            document.getElementById('cf-s2-sub').textContent = fmt(model.s2Housing);
            document.getElementById('cf-s2-inv').textContent = fmt(model.s2Investment);
            document.getElementById('cf-s2-total').textContent = fmt(model.s2Housing + model.s2Investment);

            // How It Works
            document.getElementById('hiwBody').innerHTML =
                `Both scenarios invest! Scenario 1 has less upfront to invest but <strong>${fmt(model.s1Investment)}/month</strong> available. ` +
                `Scenario 2 starts with <strong>${fmt(model.s2StartVTSAX)}</strong> to invest but only <strong>${fmt(model.s2Investment)}/month</strong> available.`;

            // Charts
            updateCharts(model);

            // Data table
            updateTable(model);

            // Update cross-link with contextual data
            const crossText = document.getElementById('mortgage-to-invest-text');
            if (crossText) {
                const investAmt = fmt(parseFloat(document.getElementById('s2Invest').value) || 0);
                crossText.textContent = `Explore how ${investAmt} grows across different fund types → Investment Growth Calculator`;
            }
        }

        // ═══════════════════════════════════════════════
        // CHARTS
        // ═══════════════════════════════════════════════
        function getCommonOpts() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Inter', size: 12 },
                        },
                    },
                    tooltip: {
                        backgroundColor: '#1a1d23',
                        titleFont: { family: 'Inter', weight: '600' },
                        bodyFont: { family: 'Inter', size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Year', font: { family: 'Inter', size: 12, weight: '500' } },
                        grid: { color: '#f0f1f3' },
                        ticks: { font: { family: 'Inter', size: 11 } },
                    },
                    y: {
                        title: { display: false },
                        grid: { color: '#f0f1f3' },
                        ticks: {
                            font: { family: 'Inter', size: 11 },
                            callback: (v) => fmtShort(v),
                        },
                    },
                },
                elements: {
                    point: { radius: 4, hoverRadius: 6, borderWidth: 2, backgroundColor: 'white' },
                    line: { borderWidth: 2.5, tension: 0.1 },
                },
            };
        }

        function initCharts() {
            // Net Wealth Chart
            netWealthChart = new Chart(document.getElementById('netWealthChart'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Scenario 1: Large Down',
                            data: [],
                            borderColor: '#3b82f6',
                            pointBorderColor: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.05)',
                            fill: false,
                        },
                        {
                            label: 'Scenario 2: Invest Difference',
                            data: [],
                            borderColor: '#8b5cf6',
                            pointBorderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139,92,246,0.05)',
                            fill: false,
                        },
                    ],
                },
                options: getCommonOpts(),
            });

            // Liquidity Chart
            liquidityChart = new Chart(document.getElementById('liquidityChart'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Scenario 1: Portfolio (Liquid)',
                            data: [],
                            borderColor: '#3b82f6',
                            pointBorderColor: '#3b82f6',
                            backgroundColor: 'rgba(59,130,246,0.08)',
                            fill: true,
                        },
                        {
                            label: 'Scenario 2: Portfolio (Liquid)',
                            data: [],
                            borderColor: '#8b5cf6',
                            pointBorderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139,92,246,0.08)',
                            fill: true,
                        },
                    ],
                },
                options: getCommonOpts(),
            });

            // Composition Chart (bar)
            compositionChart = new Chart(document.getElementById('compositionChart'), {
                type: 'bar',
                data: {
                    labels: ['Scenario 1', 'Scenario 2'],
                    datasets: [
                        {
                            label: 'Home Equity',
                            data: [0, 0],
                            backgroundColor: '#3b82f6',
                            borderRadius: 4,
                        },
                        {
                            label: 'Portfolio',
                            data: [0, 0],
                            backgroundColor: '#8b5cf6',
                            borderRadius: 4,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: { family: 'Inter', size: 12 },
                            },
                        },
                        tooltip: {
                            backgroundColor: '#1a1d23',
                            titleFont: { family: 'Inter', weight: '600' },
                            bodyFont: { family: 'Inter', size: 13 },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 12, weight: '600' } },
                        },
                        y: {
                            stacked: true,
                            grid: { color: '#f0f1f3' },
                            ticks: {
                                font: { family: 'Inter', size: 11 },
                                callback: (v) => fmtShort(v),
                            },
                        },
                    },
                },
            });
        }

        function updateCharts(model) {
            const labels = model.years.map(y => y.year);

            // Net Wealth
            netWealthChart.data.labels = labels;
            netWealthChart.data.datasets[0].data = model.years.map(y => y.s1Net);
            netWealthChart.data.datasets[1].data = model.years.map(y => y.s2Net);
            netWealthChart.update('none');

            // Liquidity
            liquidityChart.data.labels = labels;
            liquidityChart.data.datasets[0].data = model.years.map(y => y.s1VTSAX);
            liquidityChart.data.datasets[1].data = model.years.map(y => y.s2VTSAX);
            liquidityChart.update('none');

            // Composition
            const last = model.years[model.years.length - 1];
            const s1Equity = model.years[0] ? (getInputs().homePrice) : 0;
            compositionChart.data.datasets[0].data = [s1Equity, s1Equity];
            compositionChart.data.datasets[1].data = [last.s1VTSAX, last.s2VTSAX];
            compositionChart.update('none');
        }

        // Handle window resize dynamically ensuring canvases don't lock grid widths
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (netWealthChart) netWealthChart.resize();
                if (liquidityChart) liquidityChart.resize();
                if (compositionChart) compositionChart.resize();
            }, 100);
        });

        // ═══════════════════════════════════════════════
        // DATA TABLE
        // ═══════════════════════════════════════════════
        function updateTable(model) {
            const tbody = document.getElementById('dataTableBody');
            tbody.innerHTML = '';
            model.years.forEach(row => {
                if (row.year === 0) return; // skip year 0
                const tr = document.createElement('tr');
                if (row.year === model.loanTerm) tr.classList.add('highlight');
                const advClass = row.advantage >= 0 ? 'positive' : 'negative';
                tr.innerHTML = `
          <td>${row.year}</td>
          <td>${fmt(row.s1Loan)}</td>
          <td>${fmt(row.s1VTSAX)}</td>
          <td>${fmt(row.s1Net)}</td>
          <td>${fmt(row.s2Loan)}</td>
          <td>${fmt(row.s2VTSAX)}</td>
          <td>${fmt(row.s2Net)}</td>
          <td class="${advClass}">${(row.advantage >= 0 ? '+' : '-') + fmt(Math.abs(row.advantage))}</td>
        `;
                tbody.appendChild(tr);
            });
        }

        // ═══════════════════════════════════════════════
        // MORTGAGE RESET
        // ═══════════════════════════════════════════════
        const MORTGAGE_DEFAULTS = {
            homePrice: 750000, totalCash: 550000, mortgageRate: 8,
            grossReturn: 10, loanTerm: 30, propTax: 1.2,
            insurance: 1200, maintenance: 1, divYield: 1.8, divTax: 25,
        };

        document.getElementById('mortgageResetBtn').addEventListener('click', () => {
            for (const [key, val] of Object.entries(MORTGAGE_DEFAULTS)) {
                const numEl = document.getElementById(key);
                const sliderEl = document.getElementById(key + 'Slider');
                if (numEl) numEl.value = val;
                if (sliderEl) sliderEl.value = val;
            }
            // Reset Scenario 2 slider
            document.getElementById('s2DownSlider').value = 150000;
            document.getElementById('s2Down').value = 150000;
            document.getElementById('s2Invest').value = 400000;
            enforceConstraints('init');
            recalculate();
        });

        // ═══════════════════════════════════════════════
        // NUMBER FORMATTING (comma display)
        // ═══════════════════════════════════════════════
        function formatNumberInput(input) {
            // Only format dollar inputs (not percentage or year inputs)
            if (input.step && parseFloat(input.step) >= 100) {
                input.addEventListener('focus', function () {
                    // On focus, show raw number for editing
                    this.type = 'number';
                });
            }
        }

        // ═══════════════════════════════════════════════
        // CHART ACCESSIBILITY (mortgage charts)
        // ═══════════════════════════════════════════════
        function applyChartAccessibility() {
            // Add dashed line to Scenario 1 and distinct point styles
            if (netWealthChart) {
                netWealthChart.data.datasets[0].borderDash = [8, 4];
                netWealthChart.data.datasets[0].pointStyle = 'circle';
                netWealthChart.data.datasets[1].pointStyle = 'rectRot';
                netWealthChart.data.datasets[1].borderDash = [];
                netWealthChart.update('none');
            }
            if (liquidityChart) {
                liquidityChart.data.datasets[0].borderDash = [8, 4];
                liquidityChart.data.datasets[0].pointStyle = 'circle';
                liquidityChart.data.datasets[1].pointStyle = 'rectRot';
                liquidityChart.data.datasets[1].borderDash = [];
                liquidityChart.update('none');
            }
        }

        // ═══════════════════════════════════════════════
        // INVESTMENT GROWTH CALCULATOR
        // ═══════════════════════════════════════════════

        const FUND_CONFIG = {
            stock: {
                id: 'stock',
                label: 'Total US Stock Market',
                ticker: 'e.g. VTSAX / VTI',
                grossReturn: 0.102,
                expenseRatio: 0.0003,
                color: '--invest-stock',
                defaultOn: true,
            },
            sp500: {
                id: 'sp500',
                label: 'S&P 500 Index',
                ticker: 'e.g. VOO / FXAIX',
                grossReturn: 0.100,
                expenseRatio: 0.0003,
                color: '--invest-sp500',
                defaultOn: false,
            },
            intl: {
                id: 'intl',
                label: 'International Developed',
                ticker: 'e.g. VXUS / FZILX',
                grossReturn: 0.058,
                expenseRatio: 0.0006,
                color: '--invest-intl',
                defaultOn: false,
            },
            bonds: {
                id: 'bonds',
                label: 'US Bond Market',
                ticker: 'e.g. BND / VBTLX',
                grossReturn: 0.045,
                expenseRatio: 0.0003,
                color: '--invest-bonds',
                defaultOn: true,
            },
            target: {
                id: 'target',
                label: 'Target Date 2050',
                ticker: 'e.g. VFIFX',
                grossReturn: 0.082,
                expenseRatio: 0.0012,
                color: '--invest-target',
                defaultOn: false,
            },
            hysa: {
                id: 'hysa',
                label: 'High-Yield Savings',
                ticker: 'e.g. Marcus, SoFi',
                grossReturn: 0.045,
                expenseRatio: null,
                color: '--invest-hysa',
                defaultOn: true,
            },
        };

        // Investment calculator state
        let investSelectedFunds = Object.keys(FUND_CONFIG).filter(id => FUND_CONFIG[id].defaultOn);
        let investCustomRates = {};
        let investAnnualContribIncrease = 0;
        let investChart = null;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // ── Utility Functions ──
        function getCssVar(name) {
            // Reads from the same scope as theme state so chart colors track
            // the calculator-section overrides (not :root).
            return getComputedStyle(htmlEl).getPropertyValue(name).trim();
        }

        function hexToRgba(hex, alpha) {
            const h = hex.replace('#', '');
            if (h.length < 6) return `rgba(0,0,0,${alpha})`;
            const r = parseInt(h.substring(0, 2), 16);
            const g = parseInt(h.substring(2, 4), 16);
            const b = parseInt(h.substring(4, 6), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }

        function formatCurrency(value) {
            return '$' + Math.round(value).toLocaleString('en-US');
        }

        function formatCurrencyShort(value) {
            if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
            if (value >= 1_000) return '$' + Math.round(value / 1_000) + 'K';
            return '$' + Math.round(value);
        }

        function debounce(fn, ms) {
            let timer;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), ms);
            };
        }

        function animateValue(el, start, end, duration, formatter) {
            if (prefersReducedMotion || duration === 0) {
                el.textContent = formatter ? formatter(end) : end;
                return;
            }
            const startTime = performance.now();
            function tick(now) {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                const current = start + (end - start) * eased;
                el.textContent = formatter ? formatter(current) : Math.round(current);
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }

        // ── Calculation Engine ──
        function getNetReturn(fund, customRates) {
            const rate = customRates?.[fund.id]?.rate ?? fund.grossReturn;
            const er = customRates?.[fund.id]?.er ?? (fund.expenseRatio ?? 0);
            return rate - er;
        }

        function projectYearly(initialInvestment, monthlyContrib, years, annualNetReturn) {
            const r = annualNetReturn / 12;
            const results = [initialInvestment];
            for (let y = 1; y <= years; y++) {
                const n = y * 12;
                let fv;
                if (r === 0) {
                    fv = initialInvestment + monthlyContrib * n;
                } else {
                    const growth = Math.pow(1 + r, n);
                    fv = initialInvestment * growth + monthlyContrib * ((growth - 1) / r);
                }
                results.push(fv);
            }
            return results;
        }

        function projectYearlyEscalating(initialInvestment, monthlyContrib, years, annualNetReturn, annualContribIncrease) {
            const r = annualNetReturn / 12;
            let portfolioValue = initialInvestment;
            const results = [initialInvestment];
            for (let y = 1; y <= years; y++) {
                const effectiveMonthly = monthlyContrib * Math.pow(1 + annualContribIncrease, y - 1);
                for (let m = 0; m < 12; m++) {
                    portfolioValue = portfolioValue * (1 + r) + effectiveMonthly;
                }
                results.push(portfolioValue);
            }
            return results;
        }

        function contributionsYearly(initialInvestment, monthlyContrib, years, annualContribIncrease = 0) {
            const results = [initialInvestment];
            let cumulative = initialInvestment;
            for (let y = 1; y <= years; y++) {
                const effectiveMonthly = monthlyContrib * Math.pow(1 + annualContribIncrease, y - 1);
                cumulative += effectiveMonthly * 12;
                results.push(cumulative);
            }
            return results;
        }

        function computeInvestment(inputs, customRates) {
            const { initialInvestment, monthlyContrib, years, annualContribIncrease, selectedFunds } = inputs;
            const useEscalating = annualContribIncrease > 0;
            const contribs = contributionsYearly(initialInvestment, monthlyContrib, years, annualContribIncrease);

            const projections = {};
            for (const fundId of selectedFunds) {
                const fund = FUND_CONFIG[fundId];
                const netReturn = getNetReturn(fund, customRates);
                projections[fundId] = useEscalating
                    ? projectYearlyEscalating(initialInvestment, monthlyContrib, years, netReturn, annualContribIncrease)
                    : projectYearly(initialInvestment, monthlyContrib, years, netReturn);
            }

            let leadingFundId = selectedFunds[0];
            for (const fundId of selectedFunds) {
                if (projections[fundId]?.[years] > (projections[leadingFundId]?.[years] ?? 0)) {
                    leadingFundId = fundId;
                }
            }

            const leadingFinalValue = projections[leadingFundId]?.[years] ?? 0;
            const totalContributions = contribs[years];
            const totalGains = leadingFinalValue - totalContributions;
            const growthMultiple = totalContributions > 0 ? leadingFinalValue / totalContributions : 0;

            return { projections, contribs, leadingFundId, leadingFinalValue, totalContributions, totalGains, growthMultiple };
        }

        // ── Read Inputs ──
        function readInvestInputs() {
            return {
                initialInvestment: parseFloat(document.getElementById('invest-initial-num').value) || 0,
                monthlyContrib: parseFloat(document.getElementById('invest-monthly-num').value) || 0,
                years: parseInt(document.getElementById('invest-years-num').value) || 25,
                annualContribIncrease: investAnnualContribIncrease,
                selectedFunds: investSelectedFunds,
            };
        }

        // ── Fund Pills ──
        function renderFundPills(selectedFunds) {
            const container = document.getElementById('invest-pills');
            container.innerHTML = '';
            for (const [id, fund] of Object.entries(FUND_CONFIG)) {
                const isActive = selectedFunds.includes(id);
                const color = getCssVar(fund.color);

                const btn = document.createElement('button');
                btn.className = 'invest-pill' + (isActive ? ' active' : '');
                btn.dataset.fundId = id;
                if (isActive) {
                    btn.style.backgroundColor = color;
                    btn.style.borderColor = color;
                }

                const dot = document.createElement('span');
                dot.className = 'pill-dot';
                dot.style.backgroundColor = color;
                if (isActive) dot.style.backgroundColor = 'rgba(255,255,255,0.8)';

                btn.appendChild(dot);
                btn.appendChild(document.createTextNode(fund.label));
                btn.addEventListener('click', () => toggleFund(id));
                container.appendChild(btn);
            }
        }

        function toggleFund(fundId) {
            const idx = investSelectedFunds.indexOf(fundId);
            if (idx >= 0) {
                investSelectedFunds.splice(idx, 1);
            } else {
                investSelectedFunds.push(fundId);
            }
            renderFundPills(investSelectedFunds);
            renderAdvancedPanel();
            updateInvestment();
        }

        // ── Advanced Panel ──
        function renderAdvancedPanel() {
            const body = document.getElementById('invest-advanced-body');
            let html = '';

            // Contribution increase section
            html += `<div class="invest-contrib-section">
                <div class="input-group" style="margin-bottom:0.5rem;">
                    <label>Annual Contribution Increase<span class="tooltip-wrap"><span class="tooltip-icon">?</span><span class="tooltip-text">Setting this to 3% means your $500/mo becomes $515 in Year 2, $530 in Year 3, etc. This can add $300K+ over 25 years.</span></span></label>
                    <div class="input-row">
                        <input type="number" id="invest-contrib-increase-num" value="${(investAnnualContribIncrease * 100).toFixed(1)}" min="0" max="15" step="0.5" style="width:5rem;">
                        <span class="unit">%</span>
                    </div>
                    <input type="range" id="invest-contrib-increase" min="0" max="15" step="0.5" value="${(investAnnualContribIncrease * 100).toFixed(1)}">
                </div>
            </div>`;

            // Per-fund sliders
            if (investSelectedFunds.length > 0) {
                html += '<div style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.75rem;">Fund Assumptions</div>';
            }

            for (const fundId of investSelectedFunds) {
                const fund = FUND_CONFIG[fundId];
                const customRate = investCustomRates[fundId]?.rate ?? fund.grossReturn;
                const customER = investCustomRates[fundId]?.er ?? (fund.expenseRatio ?? 0);
                const netReturn = customRate - customER;
                const color = getCssVar(fund.color);

                html += `<div class="invest-fund-group">
                    <div class="invest-fund-group-header">
                        <span class="invest-fund-group-name">
                            <span class="pill-dot" style="background:${color};width:10px;height:10px;border-radius:50%;display:inline-block;"></span>
                            ${fund.label}
                        </span>
                        <span class="invest-net-return-badge" id="invest-net-${fundId}">Net Return: ${fund.expenseRatio !== null ? (netReturn * 100).toFixed(2) : (customRate * 100).toFixed(2)}%</span>
                    </div>
                    <div class="input-group" style="margin-bottom:0.75rem;">
                        <label>Annual Return</label>
                        <div class="input-row">
                            <input type="number" id="invest-rate-${fundId}-num" value="${(customRate * 100).toFixed(1)}" min="0" max="20" step="0.1" style="width:5rem;" data-fund="${fundId}" data-field="rate">
                            <span class="unit">%</span>
                        </div>
                        <input type="range" id="invest-rate-${fundId}" min="0" max="20" step="0.1" value="${(customRate * 100).toFixed(1)}" data-fund="${fundId}" data-field="rate">
                    </div>
                    <div class="input-group" style="margin-bottom:0;">
                        <label>Expense Ratio</label>
                        ${fund.expenseRatio !== null ? `
                        <div class="input-row">
                            <input type="number" id="invest-er-${fundId}-num" value="${(customER * 100).toFixed(2)}" min="0" max="3" step="0.01" style="width:5rem;" data-fund="${fundId}" data-field="er">
                            <span class="unit">%</span>
                        </div>
                        <input type="range" id="invest-er-${fundId}" min="0" max="3" step="0.01" value="${(customER * 100).toFixed(2)}" data-fund="${fundId}" data-field="er">
                        ` : `<div style="font-size:var(--text-sm);color:var(--text-secondary);padding:0.4rem 0;">N/A — savings accounts don't have expense ratios</div>`}
                    </div>
                </div>`;
            }

            html += `<button class="invest-reset-btn" id="invest-reset-btn">Reset to Defaults</button>`;
            body.innerHTML = html;
            body.querySelectorAll('input[type="range"]').forEach(updateSliderFill);

            // Wire up advanced panel events
            wireAdvancedEvents();
        }

        function wireAdvancedEvents() {
            // Contribution increase
            const contribNum = document.getElementById('invest-contrib-increase-num');
            const contribSlider = document.getElementById('invest-contrib-increase');
            if (contribNum && contribSlider) {
                contribNum.addEventListener('input', () => {
                    contribSlider.value = contribNum.value;
                    investAnnualContribIncrease = parseFloat(contribNum.value) / 100 || 0;
                    updateInvestment();
                });
                contribSlider.addEventListener('input', () => {
                    contribNum.value = contribSlider.value;
                    investAnnualContribIncrease = parseFloat(contribSlider.value) / 100 || 0;
                    updateInvestment();
                });
            }

            // Per-fund rate/ER sliders
            for (const fundId of investSelectedFunds) {
                const fund = FUND_CONFIG[fundId];
                // Rate
                const rateNum = document.getElementById(`invest-rate-${fundId}-num`);
                const rateSlider = document.getElementById(`invest-rate-${fundId}`);
                if (rateNum && rateSlider) {
                    rateNum.addEventListener('input', () => {
                        rateSlider.value = rateNum.value;
                        if (!investCustomRates[fundId]) investCustomRates[fundId] = {};
                        investCustomRates[fundId].rate = parseFloat(rateNum.value) / 100 || 0;
                        updateNetReturnBadge(fundId);
                        updateInvestment();
                    });
                    rateSlider.addEventListener('input', () => {
                        rateNum.value = rateSlider.value;
                        if (!investCustomRates[fundId]) investCustomRates[fundId] = {};
                        investCustomRates[fundId].rate = parseFloat(rateSlider.value) / 100 || 0;
                        updateNetReturnBadge(fundId);
                        updateInvestment();
                    });
                }
                // ER
                if (fund.expenseRatio !== null) {
                    const erNum = document.getElementById(`invest-er-${fundId}-num`);
                    const erSlider = document.getElementById(`invest-er-${fundId}`);
                    if (erNum && erSlider) {
                        erNum.addEventListener('input', () => {
                            erSlider.value = erNum.value;
                            if (!investCustomRates[fundId]) investCustomRates[fundId] = {};
                            investCustomRates[fundId].er = parseFloat(erNum.value) / 100 || 0;
                            updateNetReturnBadge(fundId);
                            updateInvestment();
                        });
                        erSlider.addEventListener('input', () => {
                            erNum.value = erSlider.value;
                            if (!investCustomRates[fundId]) investCustomRates[fundId] = {};
                            investCustomRates[fundId].er = parseFloat(erSlider.value) / 100 || 0;
                            updateNetReturnBadge(fundId);
                            updateInvestment();
                        });
                    }
                }
            }

            // Reset button — resets fund rates, ERs, AND contribution increase
            const resetBtn = document.getElementById('invest-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    investCustomRates = {};
                    investAnnualContribIncrease = 0;
                    renderAdvancedPanel();
                    updateInvestment();
                });
            }
        }

        function updateNetReturnBadge(fundId) {
            const fund = FUND_CONFIG[fundId];
            const badge = document.getElementById(`invest-net-${fundId}`);
            if (!badge) return;
            const rate = investCustomRates[fundId]?.rate ?? fund.grossReturn;
            const er = investCustomRates[fundId]?.er ?? (fund.expenseRatio ?? 0);
            if (fund.expenseRatio !== null) {
                badge.textContent = `Net Return: ${((rate - er) * 100).toFixed(2)}%`;
            } else {
                badge.textContent = `Rate: ${(rate * 100).toFixed(2)}%`;
            }
        }

        // ── Banner Update ──
        let lastBannerAmount = 0;
        let lastStatContribs = 0;
        let lastStatMultiple = 0;

        function updateInvestBanner(result, inputs) {
            const { leadingFundId, leadingFinalValue, totalContributions, totalGains, growthMultiple } = result;
            const { years, selectedFunds } = inputs;

            const bannerEl = document.getElementById('invest-banner');
            const amountEl = document.getElementById('invest-banner-amount');
            const yearsEl = document.getElementById('invest-banner-years');
            const fundEl = document.getElementById('invest-banner-fund');
            const gainsEl = document.getElementById('invest-banner-gains');
            const contribsEl = document.getElementById('invest-banner-contribs');
            const comparisonEl = document.getElementById('invest-banner-comparison');

            // Edge: no funds or no money
            if (selectedFunds.length === 0) {
                amountEl.textContent = '—';
                fundEl.textContent = 'Select a fund type above to see projected growth.';
                gainsEl.textContent = '';
                contribsEl.textContent = '';
                comparisonEl.textContent = '';
                bannerEl.style.borderLeftColor = getCssVar('--border');
                yearsEl.textContent = years;
                return;
            }

            if (inputs.initialInvestment === 0 && inputs.monthlyContrib === 0) {
                amountEl.textContent = '$0';
                fundEl.textContent = 'Enter an investment amount to see projections.';
                gainsEl.textContent = '';
                contribsEl.textContent = '';
                comparisonEl.textContent = '';
                bannerEl.style.borderLeftColor = getCssVar('--border');
                yearsEl.textContent = years;
                return;
            }

            const fund = FUND_CONFIG[leadingFundId];
            const color = getCssVar(fund.color);
            bannerEl.style.borderLeftColor = color;

            yearsEl.textContent = years;
            fundEl.textContent = `in ${fund.label}`;
            fundEl.style.color = color;
            gainsEl.textContent = `${formatCurrency(totalGains)} in estimated gains`;
            contribsEl.textContent = `${formatCurrency(totalContributions)} contributed`;

            // Animate banner amount
            animateValue(amountEl, lastBannerAmount, leadingFinalValue, 400, formatCurrency);
            lastBannerAmount = leadingFinalValue;

            // Input summary line
            const inputsEl = document.getElementById('invest-banner-inputs');
            if (inputsEl) {
                inputsEl.textContent = `Based on ${formatCurrency(inputs.initialInvestment)} initial + ${formatCurrency(inputs.monthlyContrib)}/mo over ${years} years`;
            }

            // HYSA comparison
            if (selectedFunds.includes('hysa') && leadingFundId !== 'hysa' && result.projections.hysa) {
                const hysaFinal = result.projections.hysa[years];
                comparisonEl.textContent = `vs. ${formatCurrency(hysaFinal)} projected in High-Yield Savings`;
            } else {
                comparisonEl.textContent = '';
            }
        }

        // ── Stat Cards Update ──
        function updateInvestStatCards(result, inputs) {
            const { leadingFundId, leadingFinalValue, totalContributions, totalGains, growthMultiple } = result;
            const { selectedFunds, initialInvestment, monthlyContrib, years, annualContribIncrease } = inputs;

            const contribsEl = document.getElementById('invest-stat-contribs');
            const multipleEl = document.getElementById('invest-stat-multiple');
            const fundNameEl = document.getElementById('invest-stat-fund-name');
            const initialLineEl = document.getElementById('invest-stat-initial-line');
            const monthlyLineEl = document.getElementById('invest-stat-monthly-line');
            const fvLineEl = document.getElementById('invest-stat-fv-line');
            const gainsLineEl = document.getElementById('invest-stat-gains-line');

            // Contributions card
            animateValue(contribsEl, lastStatContribs, totalContributions, 300, formatCurrency);
            lastStatContribs = totalContributions;

            initialLineEl.textContent = `${formatCurrency(initialInvestment)} initial`;
            if (annualContribIncrease > 0) {
                monthlyLineEl.textContent = `escalating from ${formatCurrency(monthlyContrib)}/mo (+${(annualContribIncrease * 100).toFixed(0)}%/yr)`;
            } else {
                monthlyLineEl.textContent = `+ ${formatCurrency(monthlyContrib)}/mo × ${years} years`;
            }

            // Returns card
            if (selectedFunds.length === 0) {
                multipleEl.textContent = '—';
                fundNameEl.textContent = '';
                fvLineEl.textContent = '';
                gainsLineEl.textContent = '';
                multipleEl.style.color = '';
                return;
            }

            const fund = FUND_CONFIG[leadingFundId];
            const color = getCssVar(fund.color);
            fundNameEl.textContent = fund.label;
            multipleEl.style.color = color;

            const multipleVal = growthMultiple;
            animateValue(multipleEl, lastStatMultiple, multipleVal, 300, (v) => v.toFixed(1) + '×');
            lastStatMultiple = multipleVal;

            fvLineEl.textContent = `${formatCurrency(leadingFinalValue)} projected value`;
            gainsLineEl.textContent = `${formatCurrency(totalGains)} estimated gains`;
        }

        // ── Chart ──
        function initInvestChart() {
            const ctx = document.getElementById('investChart').getContext('2d');
            investChart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 800,
                        easing: 'easeInOutQuart',
                    },
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 16,
                                font: { family: 'Inter', size: 13 },
                                filter: (legendItem) => {
                                    // Hide contributions from legend click (still visible)
                                    return true;
                                },
                            },
                            onClick: (e, legendItem, legend) => {
                                // Prevent toggling the contributions line
                                if (legendItem.datasetIndex === 0) return;
                                Chart.defaults.plugins.legend.onClick.call(legend, e, legendItem, legend);
                            },
                        },
                        tooltip: {
                            backgroundColor: htmlEl.getAttribute('data-theme') === 'dark' ? '#374151' : '#1a1d23',
                            titleFont: { family: 'Inter', weight: '600' },
                            bodyFont: { family: 'Inter', size: 13 },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                title: (items) => `Year ${items[0].label}`,
                                label: (item) => {
                                    if (item.dataset.isContributions) {
                                        return ` Contributions: ${formatCurrency(item.raw)}`;
                                    }
                                    return ` ${item.dataset.label}: ${formatCurrency(item.raw)}`;
                                },
                                afterBody: (items) => {
                                    const contribItem = items.find(i => i.dataset.isContributions);
                                    if (!contribItem) return [];
                                    const contribValue = contribItem.raw;
                                    return items
                                        .filter(i => !i.dataset.isContributions)
                                        .map(i => `  Gains (${i.dataset.label}): ${formatCurrency(i.raw - contribValue)}`);
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Year', font: { family: 'Inter', size: 12, weight: '500' }, color: getCssVar('--text-secondary') },
                            grid: { color: htmlEl.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                            ticks: { color: getCssVar('--text-secondary'), font: { family: 'Inter' } },
                        },
                        y: {
                            title: { display: true, text: 'Portfolio Value', font: { family: 'Inter', size: 12, weight: '500' }, color: getCssVar('--text-secondary') },
                            grid: { color: htmlEl.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                            ticks: {
                                color: getCssVar('--text-secondary'),
                                font: { family: 'Inter' },
                                callback: (v) => formatCurrencyShort(v),
                            },
                        },
                    },
                },
            });
        }

        function updateInvestChart(result, inputs) {
            if (!investChart) return;
            const { projections, contribs, leadingFundId } = result;
            const { years, selectedFunds } = inputs;
            const labels = Array.from({ length: years + 1 }, (_, i) => i);

            const datasets = [];

            // Contributions dataset
            datasets.push({
                label: 'Your Contributions',
                data: contribs,
                borderColor: getCssVar('--invest-contrib'),
                backgroundColor: 'transparent',
                borderDash: [8, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 4,
                order: 999,
                isContributions: true,
            });

            // Fund datasets
            for (const fundId of selectedFunds) {
                const fund = FUND_CONFIG[fundId];
                const color = getCssVar(fund.color);
                const isLeading = fundId === leadingFundId;

                datasets.push({
                    label: fund.label,
                    data: projections[fundId],
                    borderColor: color,
                    backgroundColor: isLeading ? hexToRgba(color, 0.06) : 'transparent',
                    fill: isLeading ? { target: 0, above: hexToRgba(color, 0.06) } : false,
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    order: isLeading ? 1 : 2,
                });
            }

            investChart.data.labels = labels;
            investChart.data.datasets = datasets;
            investChart.update('active');
        }

        // ── Data Table ──
        function renderInvestTable(result, inputs) {
            const { projections, contribs } = result;
            const { years, selectedFunds } = inputs;
            const table = document.getElementById('invest-data-table');

            // Header
            let headerHTML = '<thead><tr><th style="text-align:center;">Year</th><th>Your Contributions</th>';
            for (const id of selectedFunds) {
                headerHTML += `<th>${FUND_CONFIG[id].label} (Projected)</th>`;
            }
            headerHTML += '</tr></thead>';

            // Body
            let bodyHTML = '<tbody>';
            for (let y = 0; y <= years; y++) {
                const isFinal = y === years;
                bodyHTML += `<tr class="${isFinal ? 'final-row' : ''}">`;
                bodyHTML += `<td style="text-align:center;font-weight:600;color:var(--text-secondary);">${y}</td>`;
                bodyHTML += `<td class="contrib-col">${formatCurrency(contribs[y])}</td>`;
                for (const id of selectedFunds) {
                    bodyHTML += `<td>${formatCurrency(projections[id][y])}</td>`;
                }
                bodyHTML += '</tr>';
            }
            bodyHTML += '</tbody>';

            table.innerHTML = headerHTML + bodyHTML;
        }

        // ── Fee Card ──
        function renderFeeCard(result, inputs, customRates) {
            const card = document.getElementById('invest-fee-card');
            const body = document.getElementById('invest-fee-body');
            const advancedBody = document.getElementById('invest-advanced-body');

            if (!advancedBody.classList.contains('open')) {
                card.hidden = true;
                return;
            }

            const { leadingFundId } = result;
            const { years, selectedFunds, initialInvestment, monthlyContrib } = inputs;

            if (selectedFunds.length === 0) { card.hidden = true; return; }

            const fund = FUND_CONFIG[leadingFundId];
            if (fund.expenseRatio === null) { card.hidden = true; return; }

            const er = customRates?.[leadingFundId]?.er ?? (fund.expenseRatio ?? 0);
            const grossRate = customRates?.[leadingFundId]?.rate ?? fund.grossReturn;

            const fvGross = projectYearly(initialInvestment, monthlyContrib, years, grossRate)[years];
            const fvNet = projectYearly(initialInvestment, monthlyContrib, years, grossRate - er)[years];
            const feeCost = fvGross - fvNet;

            const isHighFee = er > 0.005;

            card.hidden = false;
            let html = `<p>At ${(er * 100).toFixed(2)}% annual fees, your estimated fee cost on ${fund.label} is <span class="fee-card-amount">${formatCurrency(feeCost)}</span> over ${years} years.</p>`;

            if (!isHighFee) {
                html += `<p style="margin-top:0.5rem;font-size:var(--text-sm);color:var(--text-secondary);">Low-cost index funds keep more of your money working.</p>`;
            }

            if (isHighFee) {
                const fvLowER = projectYearly(initialInvestment, monthlyContrib, years, grossRate - 0.0003)[years];
                const savings = fvLowER - fvNet;
                html += `<div class="fee-savings-callout">Switching to a 0.03% index fund could save you an estimated ${formatCurrency(savings)} over the same period.</div>`;
            }

            body.innerHTML = html;
        }

        // ── Main Update ──
        function updateInvestment() {
            const inputs = readInvestInputs();
            const result = computeInvestment(inputs, investCustomRates);

            updateInvestBanner(result, inputs);
            updateInvestStatCards(result, inputs);
            updateInvestChart(result, inputs);
            renderInvestTable(result, inputs);
            renderFeeCard(result, inputs, investCustomRates);
        }

        const debouncedInvestUpdate = debounce(updateInvestment, 16);

        // ── Wire Investment Inputs ──
        function wireInvestInputs() {
            const investPairs = [
                ['invest-initial-num', 'invest-initial'],
                ['invest-monthly-num', 'invest-monthly'],
                ['invest-years-num', 'invest-years'],
            ];

            investPairs.forEach(([numId, sliderId]) => {
                const numEl = document.getElementById(numId);
                const sliderEl = document.getElementById(sliderId);
                numEl.addEventListener('input', () => {
                    sliderEl.value = numEl.value;
                    debouncedInvestUpdate();
                });
                numEl.addEventListener('change', () => {
                    updateInvestment();
                });
                sliderEl.addEventListener('input', () => {
                    numEl.value = sliderEl.value;
                    debouncedInvestUpdate();
                });
                sliderEl.addEventListener('change', () => {
                    numEl.value = sliderEl.value;
                    updateInvestment();
                });
            });

            // Advanced toggle
            const advToggle = document.getElementById('invest-advanced-toggle');
            const advBody = document.getElementById('invest-advanced-body');
            advToggle.addEventListener('click', () => {
                advToggle.classList.toggle('open');
                advBody.classList.toggle('open');
                updateInvestment(); // re-render fee card visibility
            });

            // Hint click opens advanced
            const hint = document.getElementById('invest-hint-escalate');
            if (hint) {
                hint.addEventListener('click', () => {
                    if (!advBody.classList.contains('open')) {
                        advToggle.classList.add('open');
                        advBody.classList.add('open');
                    }
                    const contribSlider = document.getElementById('invest-contrib-increase');
                    if (contribSlider) contribSlider.focus();
                });
            }

            // Table toggle
            const tableToggle = document.getElementById('invest-table-toggle');
            const tableBody = document.getElementById('invest-table-body');
            tableToggle.addEventListener('click', () => {
                tableToggle.classList.toggle('open');
                tableBody.classList.toggle('open');
                tableToggle.setAttribute('aria-expanded', tableBody.classList.contains('open'));
                const label = tableToggle.querySelector('span:first-child');
                label.textContent = tableBody.classList.contains('open') ? 'Hide Breakdown' : 'Show Year-by-Year Breakdown';
            });
        }

        // ── Section Nav (fade switch) ──
        let activeSection = 'mortgage-calculator';

        function showSection(el) {
            el.classList.remove('section-hidden', 'section-fading-out');
        }

        function hideSection(el) {
            el.classList.add('section-hidden');
            el.classList.remove('section-fading-out');
        }

        // ── Shared State: bridge mortgage → investment values ──
        function syncMortgageToInvestment() {
            const s2Invest = parseFloat(document.getElementById('s2Invest').value) || 0;
            const grossReturn = parseFloat(document.getElementById('grossReturn').value) || 10;
            const loanTerm = parseInt(document.getElementById('loanTerm').value) || 30;

            // Pre-populate investment calculator with mortgage scenario values
            const initialEl = document.getElementById('invest-initial-num');
            const initialSlider = document.getElementById('invest-initial');
            const yearsEl = document.getElementById('invest-years-num');
            const yearsSlider = document.getElementById('invest-years');

            if (s2Invest > 0) {
                initialEl.value = s2Invest;
                initialSlider.value = Math.min(s2Invest, parseFloat(initialSlider.max));
            }
            yearsEl.value = loanTerm;
            yearsSlider.value = loanTerm;

            // Update the sync banner
            updateSyncBanner(s2Invest, grossReturn, loanTerm);

            updateInvestment();
        }

        function updateSyncBanner(amount, grossReturn, years) {
            const tooltipWrap = document.getElementById('invest-sync-tooltip');
            const tooltipText = document.getElementById('invest-sync-tooltip-text');
            if (!tooltipWrap || !tooltipText) return;
            if (amount > 0) {
                const fmtAmt = '$' + Math.round(amount).toLocaleString('en-US');
                tooltipText.textContent = `Pre-filled from your mortgage scenario: ${fmtAmt} initial investment over ${years} years.`;
                tooltipWrap.style.display = '';
            } else {
                tooltipWrap.style.display = 'none';
            }
        }

        function switchSection(sectionId) {
            if (sectionId === activeSection) return;

            const navBtns = document.querySelectorAll('.section-nav-btn');
            const mortgageEl = document.getElementById('mortgage-calculator');
            const investEl = document.getElementById('investment-calculator');
            const dividerEl = document.querySelector('.section-divider');
            const sectionLabel = document.getElementById('app-bar-section-label');

            navBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.section === sectionId);
            });

            // Update persistent section indicator in header
            if (sectionLabel) {
                sectionLabel.textContent = sectionId === 'investment-calculator'
                    ? 'Investment Growth Calculator'
                    : 'Mortgage vs. Invest';
            }

            // Sync shared state when navigating mortgage → investment
            if (sectionId === 'investment-calculator' && activeSection === 'mortgage-calculator') {
                syncMortgageToInvestment();
            }

            // Determine what's fading out and what's fading in
            const outEls = sectionId === 'investment-calculator'
                ? [mortgageEl]
                : [dividerEl, investEl];
            const inEls = sectionId === 'investment-calculator'
                ? [dividerEl, investEl]
                : [mortgageEl];

            // Fade out
            outEls.forEach(el => el.classList.add('section-fading-out'));

            setTimeout(() => {
                // Hide outgoing
                outEls.forEach(el => hideSection(el));
                // Show incoming
                inEls.forEach(el => showSection(el));
                if (typeof scroll !== 'undefined' && scroll.scrollTo) { scroll.scrollTo(0, {duration: 0, disableLerp: true}); } else { window.scrollTo({ top: 0, behavior: 'auto' }); }
            }, 350);

            activeSection = sectionId;
        }

        function initSectionNav() {
            const navBtns = document.querySelectorAll('.section-nav-btn');
            navBtns.forEach(btn => {
                btn.addEventListener('click', () => switchSection(btn.dataset.section));
            });

            // Start with investment section hidden
            const dividerEl = document.querySelector('.section-divider');
            const investEl = document.getElementById('investment-calculator');
            dividerEl.classList.add('section-hidden');
            investEl.classList.add('section-hidden');
        }

        // ── Update invest chart colors on theme toggle ──
        // Hook into the existing theme toggle button
        themeToggle.addEventListener('click', () => {
            if (investChart) {
                setTimeout(() => {
                    renderFundPills(investSelectedFunds);
                    updateInvestment();
                    updateInvestChartColors();
                }, 100);
            }
        });

        function updateInvestChartColors() {
            if (!investChart) return;
            const isDark = htmlEl.getAttribute('data-theme') === 'dark';
            const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            const textColor = isDark ? '#9ca3af' : '#5f6672';
            const tooltipBg = isDark ? '#374151' : '#1a1d23';

            investChart.options.scales.x.grid.color = gridColor;
            investChart.options.scales.x.ticks.color = textColor;
            investChart.options.scales.x.title.color = textColor;
            investChart.options.scales.y.grid.color = gridColor;
            investChart.options.scales.y.ticks.color = textColor;
            investChart.options.scales.y.title.color = textColor;
            investChart.options.plugins.tooltip.backgroundColor = tooltipBg;
            investChart.update('none');
        }

        // ── Init Investment Calculator ──
        function initInvestmentCalculator() {
            initInvestChart();
            renderFundPills(investSelectedFunds);
            renderAdvancedPanel();
            wireInvestInputs();
            initSectionNav();
            updateInvestment();
            updateInvestChartColors();
        }

        // ═══════════════════════════════════════════════
        // INIT
        // ═══════════════════════════════════════════════
        initCharts();
        updateChartColors(); // Apply theme colors to charts immediately
        recalculate();
        applyChartAccessibility(); // Dashed lines + distinct markers for colorblind accessibility
        initInvestmentCalculator();

    // Theme + email-capture hooks live below. Theme toggle is wired via the
    // existing #themeToggle button (see THEME SETUP near the top of this file);
    // we do not create a duplicate here.

    // Email capture hook
    const emailCapture = document.getElementById('emailCapture');
    if (emailCapture) {
        if (typeof recalculate === 'function') {
            const origRecalc = recalculate;
            recalculate = function() {
                origRecalc();
                emailCapture.style.display = 'block';
            };
        }
        if (typeof updateInvestment === 'function') {
            const origUpdate = updateInvestment;
            updateInvestment = function() {
                origUpdate();
                emailCapture.style.display = 'block';
            };
        }
    }

}