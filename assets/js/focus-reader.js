/* ── Focus Reader ──────────────────────────────────────────────────────
   Vanilla-JS port of the React Focus Reader app
   (C:\Users\Michael\Desktop\Focus Reader). Same engine, same five views,
   same keyboard shortcuts. No PDF/EPUB, no book library.

   Self-initializes when the #focus-reader root is in the DOM. Re-entry
   guarded via a data-fr-ready flag so Barba's multi-fire `once` hook
   doesn't double-bind.
   ─────────────────────────────────────────────────────────────────── */
(function () {
    'use strict';

    const DEFAULTS = {
        WPM: 300,
        FONT_SIZE: 56,
        SENTENCE_START_MULTIPLIER: 1.8,
        SENTENCE_START_OFFSET: 500,
        LINE_START_MULTIPLIER: 1.5,
        ORP_PERCENTAGE: 0.3,
        WPM_MIN: 100,
        WPM_MAX: 1000,
        WPM_STEP: 50,
        TRAIL_COUNT: 5,
        SENTENCE_FADE_MS: 150,
    };

    const SAMPLE_TEXTS = [
        {
            label: 'Shakespeare — Hamlet',
            text: `To be, or not to be: that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune, Or to take Arms against a Sea of troubles, And by opposing end them: to dye, to sleepe No more; and by a sleepe, to say we end The Heart-ake, and the thousand Naturall shockes That Flesh is heyre too? 'Tis a consummation Devoutly to be wish'd. To dye, to sleepe, To sleepe, perchance to Dreame; I, there's the rub, For in that sleepe of death, what dreames may come, When we have shufflel'd off this mortall coile, Must give us pawse. There's the respect That makes Calamity of so long life: For who would beare the Whips and Scornes of time, The Oppressors wrong, the proud mans Contumely, The pangs of dispriz'd Love, the Lawes delay, The insolence of Office, and the Spurnes That patient merit of the unworthy takes, When he himselfe might his Quietus make With a bare Bodkin? Who would Fardles beare, To grunt and sweat under a weary life, But that the dread of something after death, The undiscover'd Country, from whose Borne No Traveller returnes, puzzles the will, And makes us rather beare those ills we have, Than flye to others that we know not of? Thus Conscience does make Cowards of us all, And thus the native hew of Resolution Is sicklied o'er, with the pale cast of Thought, And enterprises of great pith and moment, With this regard their Currents turne awry, And lose the name of Action.`,
        },
        {
            label: 'Marcus Aurelius — Meditations',
            text: `Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful, arrogant, deceitful, envious, unsocial. All these things happen to them by reason of their ignorance of what is good and evil. But I who have seen the nature of the good that it is beautiful, and of the bad that it is ugly, and the nature of him who does wrong, that it is akin to me, not only of the same blood or seed, but that it participates in the same intelligence and the same portion of the divinity, I can neither be injured by any of them, for no one can fix on me what is ugly, nor can I be angry with my kinsman, nor hate him. For we are made for co-operation, like feet, like hands, like eyelids, like the rows of the upper and lower teeth. To act against one another then is contrary to nature; and it is acting against one another to be vexed and to turn away. Whatever this is that I am, it is a little flesh and breath, and the ruling part. Throw away thy books; no longer distract thyself: it is not allowed; but as if thou wast now dying, despise the flesh; it is blood and bones and a network, a contexture of nerves, veins, and arteries. See the breath also, what kind of a thing it is, air, and not always the same, but every moment sent out and again sucked in. The third then is the ruling part: consider thus: Thou art an old man; no longer let this be a slave, no longer be pulled by the strings like a puppet to unsocial movements, no longer be either dissatisfied with thy present lot, or shrink from the future.`,
        },
        {
            label: 'Carl Sagan — Pale Blue Dot',
            text: `Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives. The aggregate of our joy and suffering, thousands of confident religions, ideologies, and economic doctrines, every hunter and forager, every hero and coward, every creator and destroyer of civilization, every king and peasant, every young couple in love, every mother and father, hopeful child, inventor and explorer, every teacher of morals, every corrupt politician, every "superstar," every "supreme leader," every saint and sinner in the history of our species lived there—on a mote of dust suspended in a sunbeam. The Earth is a very small stage in a vast cosmic arena. Think of the rivers of blood spilled by all those generals and emperors so that, in glory and triumph, they could become the momentary masters of a fraction of a dot. Think of the endless cruelties visited by the inhabitants of one corner of this pixel on the scarcely distinguishable inhabitants of some other corner, how frequent their misunderstandings, how eager they are to kill one another, how fervent their hatreds. Our posturings, our imagined self-importance, the delusion that we have some privileged position in the Universe, are challenged by this point of pale light. Our planet is a lonely speck in the great enveloping cosmic dark. In our obscurity, in all this vastness, there is no hint that help will come from elsewhere to save us from ourselves. The Earth is the only world known so far to harbor life. There is nowhere else, at least in the near future, to which our species could migrate. Visit, yes. Settle, not yet. Like it or not, for the moment the Earth is where we make our stand. It has been said that astronomy is a humbling and character-building experience. There is perhaps no better demonstration of the folly of human conceits than this distant image of our tiny world. To me, it underscores our responsibility to deal more kindly with one another, and to preserve and cherish the pale blue dot, the only home we've ever known.`,
        },
        {
            label: 'Mary Shelley — Frankenstein',
            text: `I am by birth a Genevese, and my family is one of the most distinguished of that republic. My ancestors had been for many years counsellors and syndics, and my father had filled several public situations with honour and reputation. He was respected by all who knew him for his integrity and indefatigable attention to public business. He passed his younger days perpetually occupied by the affairs of his country; a variety of circumstances had prevented his marrying early, nor was it until the decline of life that he became a husband and the father of a family. As the circumstances of his marriage illustrate his character, I cannot refrain from relating them. One of his most intimate friends was a merchant who, from a flourishing state, fell, through numerous mischances, into poverty. This man, whose name was Beaufort, was of a proud and unbending disposition, and could not bear to live in poverty and oblivion in the same country where he had formerly been distinguished for his rank and magnificence. Having paid his debts, therefore, in the most honourable manner, he retreated with his daughter to the town of Lucerne, where he lived unknown and in wretchedness. My father loved Beaufort with the truest friendship, and was deeply grieved by his retreat in these unfortunate circumstances. He bitterly deplored the false pride which led his friend to a conduct so little worthy of the affection that united them. He lost no time in endeavouring to seek him out, with the hope of persuading him to begin the world again through his credit and assistance.`,
        },
        {
            label: 'Oscar Wilde — Dorian Gray',
            text: `The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac, or the more delicate perfume of the pink-flowering thorn. From the corner of the divan of Persian saddle-bags on which he was lying, smoking, as was his custom, innumerable cigarettes, Lord Henry Wotton could just catch the gleam of the honey-sweet and honey-coloured blossoms of a laburnum, whose tremulous branches seemed hardly able to bear the burden of a beauty so flamelike as theirs. And now and then the fantastic shadows of birds in flight flitted across the long tussore-silk curtains that were stretched in front of the huge window, producing a kind of momentary Japanese effect, and making him think of those pallid, jade-faced painters of Tokyo who, through the medium of an art that is necessarily immobile, seek to convey the sense of swiftness and motion. The sullen murmur of the bees shouldering their way through the long unmown grass, or circling with monotonous insistence round the dusty gilt horns of the straggling woodbine, seemed to make the stillness more oppressive. The dim roar of London was like the bourdon note of a distant organ.`,
        },
    ];

    /* ── TEXT PROCESSING ───────────────────────────────────────────── */

    function getFocalIndex(word) {
        const len = word.length;
        if (len <= 1) return 0;
        if (len <= 3) return 1;
        if (len <= 5) return 1;
        if (len <= 9) return 2;
        if (len <= 13) return 3;
        return Math.floor(len * DEFAULTS.ORP_PERCENTAGE);
    }

    function splitWord(word) {
        const clean = (word || '').trim();
        if (!clean) return { before: '', focal: '', after: '' };
        const idx = getFocalIndex(clean);
        return {
            before: clean.slice(0, idx),
            focal: clean[idx] || '',
            after: clean.slice(idx + 1),
        };
    }

    const REGEX_SENTENCE_END = /[.!?]$/;
    const REGEX_MINOR = /[,]$/;
    const REGEX_SUB = /[;:]$/;

    function getDelayMultiplier(word) {
        if (word === '[P]') return 5.0;
        let m = 1.0;
        if (word.length > 8) m += 0.2;
        if (word.length > 12) m += 0.3;
        if (REGEX_SENTENCE_END.test(word)) m = 3.0;
        else if (REGEX_MINOR.test(word)) m = 2.0;
        else if (REGEX_SUB.test(word)) m += 0.5;
        return m;
    }

    function wpmToDelay(wpm) {
        return 60000 / wpm;
    }

    function parseText(text) {
        // Convert blank lines to explicit paragraph markers, then split.
        const normalized = text.trim().replace(/\n\s*\n/g, ' [P] ');
        const rawTokens = normalized.split(/\s+/).filter(Boolean);

        const tokens = [];
        const sentences = [];
        const paragraphs = [];

        let sentenceIdx = 0;
        let paragraphIdx = 0;
        let curSentence = [];
        let curParagraph = [];

        function finalizeSentence() {
            if (curSentence.length === 0) return;
            curSentence[curSentence.length - 1].isSentenceEnd = true;
            sentences.push(curSentence);
            curSentence = [];
            sentenceIdx++;
        }

        function finalizeParagraph() {
            if (curParagraph.length === 0) return;
            curParagraph[curParagraph.length - 1].isParagraphEnd = true;
            paragraphs.push(curParagraph);
            curParagraph = [];
            paragraphIdx++;
        }

        rawTokens.forEach(rawWord => {
            if (rawWord === '[P]') {
                finalizeSentence();
                finalizeParagraph();
                return;
            }
            const isSentenceEnd = REGEX_SENTENCE_END.test(rawWord);
            const token = {
                id: tokens.length,
                word: rawWord,
                clean: rawWord.replace(/[.,!?;:]/g, ''),
                sentenceIndex: sentenceIdx,
                paragraphIndex: paragraphIdx,
                delayMultiplier: getDelayMultiplier(rawWord),
                isSentenceStart: curSentence.length === 0,
                isSentenceEnd,
                isParagraphEnd: false,
            };
            tokens.push(token);
            curSentence.push(token);
            curParagraph.push(token);
            if (isSentenceEnd) finalizeSentence();
        });

        finalizeSentence();
        finalizeParagraph();

        return { tokens, sentences, paragraphs };
    }

    /* ── RSVP ENGINE ───────────────────────────────────────────────── */

    function createEngine({ onTick, onComplete }) {
        const state = {
            tokens: [],
            wpm: DEFAULTS.WPM,
            currentIndex: 0,
            isPlaying: false,
            visMode: 'rsvp',
            lineStartIndices: new Set(),
            rafId: null,
            lastTime: 0,
            accumulated: 0,
        };

        function emit() {
            onTick({
                currentIndex: state.currentIndex,
                currentToken: state.tokens[state.currentIndex] || null,
                isPlaying: state.isPlaying,
                progress: state.tokens.length > 1
                    ? (state.currentIndex / (state.tokens.length - 1)) * 100
                    : 0,
            });
        }

        function calculateWordDelay(token, baseDelay) {
            let multiplier = token.delayMultiplier;
            let extra = 0;
            const inSentenceMode = state.visMode === 'sentence';
            if (token.isSentenceStart && inSentenceMode) {
                multiplier *= DEFAULTS.SENTENCE_START_MULTIPLIER;
                extra += DEFAULTS.SENTENCE_START_OFFSET;
            } else if (inSentenceMode && state.lineStartIndices.has(token.id)) {
                multiplier *= DEFAULTS.LINE_START_MULTIPLIER;
            }
            return (baseDelay * multiplier) + extra;
        }

        function tick(timestamp) {
            if (!state.lastTime) state.lastTime = timestamp;
            const delta = timestamp - state.lastTime;
            state.lastTime = timestamp;
            state.accumulated += delta;

            const token = state.tokens[state.currentIndex];
            if (!token) {
                state.isPlaying = false;
                emit();
                onComplete && onComplete();
                return;
            }

            const baseDelay = wpmToDelay(state.wpm);
            const wordDelay = calculateWordDelay(token, baseDelay);

            if (state.accumulated >= wordDelay) {
                state.accumulated = 0;
                if (state.currentIndex < state.tokens.length - 1) {
                    state.currentIndex++;
                    emit();
                    state.rafId = requestAnimationFrame(tick);
                } else {
                    state.isPlaying = false;
                    emit();
                    onComplete && onComplete();
                }
            } else {
                state.rafId = requestAnimationFrame(tick);
            }
        }

        function play() {
            if (!state.tokens.length || state.currentIndex >= state.tokens.length - 1) return;
            if (state.isPlaying) return;
            state.isPlaying = true;
            state.lastTime = 0;
            state.accumulated = 0;
            state.rafId = requestAnimationFrame(tick);
            emit();
        }

        function pause() {
            if (!state.isPlaying) return;
            state.isPlaying = false;
            if (state.rafId) cancelAnimationFrame(state.rafId);
            state.rafId = null;
            emit();
        }

        function toggle() {
            state.isPlaying ? pause() : play();
        }

        function seek(idx) {
            const clamped = Math.max(0, Math.min(idx, state.tokens.length - 1));
            state.currentIndex = clamped;
            state.accumulated = 0;
            emit();
        }

        function reset() {
            pause();
            state.currentIndex = 0;
            state.accumulated = 0;
            emit();
        }

        function skipToSentence(direction) {
            if (direction === -1) {
                for (let i = state.currentIndex - 1; i >= 0; i--) {
                    if (state.tokens[i] && state.tokens[i].isSentenceStart) { seek(i); return; }
                }
                seek(0);
            } else {
                for (let i = state.currentIndex + 1; i < state.tokens.length; i++) {
                    if (state.tokens[i] && state.tokens[i].isSentenceStart) { seek(i); return; }
                }
                seek(state.tokens.length - 1);
            }
        }

        function snapshot() {
            return {
                currentIndex: state.currentIndex,
                currentToken: state.tokens[state.currentIndex] || null,
                isPlaying: state.isPlaying,
                progress: state.tokens.length > 1
                    ? (state.currentIndex / (state.tokens.length - 1)) * 100
                    : 0,
            };
        }

        return {
            getState: snapshot,
            setTokens(tokens) {
                pause();
                state.tokens = tokens;
                state.currentIndex = 0;
                state.accumulated = 0;
                emit();
            },
            setWpm(wpm) {
                state.wpm = Math.max(DEFAULTS.WPM_MIN, Math.min(DEFAULTS.WPM_MAX, wpm));
            },
            setVisMode(mode) {
                state.visMode = mode;
                if (mode !== 'sentence') state.lineStartIndices = new Set();
            },
            setLineStartIndices(set) { state.lineStartIndices = set; },
            play, pause, toggle, seek, reset, skipToSentence,
        };
    }

    /* ── DISPLAY RENDERERS ─────────────────────────────────────────── */

    // Generic: render the focal-letter-centered word into a frame. Used by
    // RSVP, Trail, and Hybrid views which all share the same word visual.
    function renderRSVPWord(els, token) {
        const word = token ? token.word : '';
        const { before, focal, after } = splitWord(word);
        els.before.textContent = before;
        els.focal.textContent = focal || (word ? '' : '·');
        els.after.textContent = after;

        // Position before/after spans relative to the measured focal width.
        // Layout-thrash-safe: we measure once after writing, in the same frame.
        requestAnimationFrame(() => {
            const focalRect = els.focal.getBoundingClientRect();
            const half = focalRect.width / 2;
            els.before.style.right = `calc(50% + ${half}px)`;
            els.after.style.left = `calc(50% + ${half}px)`;
        });
    }

    function applyFontSize(els, fontSize) {
        // Apply to the frame containing the word; spans inherit.
        if (els.frame) els.frame.style.fontSize = `${fontSize}px`;
    }

    // Trail view: ghost words fanning out from the focal word
    function renderTrail({ frame, leftEl, rightEl, wordEls }, tokens, currentIndex, fontSize) {
        const token = tokens[currentIndex];
        renderRSVPWord(wordEls, token);

        // Build ghost lists
        const left = [];
        const right = [];
        for (let i = 1; i <= DEFAULTS.TRAIL_COUNT; i++) {
            const opacity = Math.max(0.04, 1 - i * 0.2);
            const li = currentIndex - i;
            if (li >= 0) left.unshift({ word: tokens[li].word, opacity });
            const ri = currentIndex + i;
            if (ri < tokens.length) right.push({ word: tokens[ri].word, opacity });
        }

        const ghostFontSize = fontSize * 0.82;

        // Left ghosts (rendered RTL so nearest is closest to center)
        leftEl.innerHTML = '';
        // Reverse so DOM order pushes nearest-to-center against the right edge
        [...left].reverse().forEach(g => {
            const span = document.createElement('span');
            span.className = 'fr-trail-ghost';
            span.style.opacity = g.opacity;
            span.style.fontSize = `${ghostFontSize}px`;
            span.textContent = g.word;
            leftEl.appendChild(span);
        });

        rightEl.innerHTML = '';
        right.forEach(g => {
            const span = document.createElement('span');
            span.className = 'fr-trail-ghost';
            span.style.opacity = g.opacity;
            span.style.fontSize = `${ghostFontSize}px`;
            span.textContent = g.word;
            rightEl.appendChild(span);
        });

        // Position ghost columns flush against the focal word.
        // We measure after the focal letter has rendered.
        requestAnimationFrame(() => {
            const focalRect = wordEls.focal.getBoundingClientRect();
            const beforeRect = wordEls.before.getBoundingClientRect();
            const afterRect = wordEls.after.getBoundingClientRect();
            const half = focalRect.width / 2;
            const beforeWidth = beforeRect.width || 0;
            const afterWidth = afterRect.width || 0;

            leftEl.style.right = `calc(50% + ${half}px)`;
            leftEl.style.marginRight = `${beforeWidth + 8}px`;

            rightEl.style.left = `calc(50% + ${half}px)`;
            rightEl.style.marginLeft = `${afterWidth + 8}px`;
        });
    }

    // Paragraph: full paragraph with active-word highlight + auto-scroll
    function renderParagraph(container, paragraphTokens, currentIndex, fontSize, onWordClick, opts) {
        opts = opts || {};
        const small = !!opts.small;
        const displaySize = small
            ? Math.max(18, Math.min(fontSize * 0.4, 28))
            : Math.max(24, Math.min(fontSize * 0.6, 48));
        container.style.fontSize = `${displaySize}px`;

        // Diff is overkill for prototype size — re-render words.
        // Instead, build once per paragraph swap, then update classes only.
        const cachedFirstId = parseInt(container.dataset.firstId || '-1', 10);
        const newFirstId = paragraphTokens.length > 0 ? paragraphTokens[0].id : -1;

        if (cachedFirstId !== newFirstId) {
            container.innerHTML = '';
            container.dataset.firstId = String(newFirstId);
            paragraphTokens.forEach(token => {
                const span = document.createElement('span');
                span.className = 'fr-word';
                span.dataset.tokenId = String(token.id);
                span.textContent = token.word;
                span.addEventListener('click', () => onWordClick && onWordClick(token.id));
                container.appendChild(span);
            });
        }

        // Update classes based on current index
        let activeEl = null;
        for (const span of container.children) {
            const tid = parseInt(span.dataset.tokenId, 10);
            span.classList.remove('is-active', 'is-passed');
            if (tid === currentIndex) {
                span.classList.add('is-active');
                activeEl = span;
            } else if (tid < currentIndex) {
                span.classList.add('is-passed');
            }
        }

        // Auto-scroll active word to vertical center
        if (activeEl) {
            const cRect = container.getBoundingClientRect();
            const eRect = activeEl.getBoundingClientRect();
            const diff = (eRect.top + eRect.height / 2) - (cRect.top + cRect.height / 2);
            if (Math.abs(diff) > 2) {
                container.scrollBy({
                    top: diff,
                    behavior: cachedFirstId !== newFirstId ? 'auto' : 'smooth',
                });
            }
        }
    }

    // Sentence view: one sentence at a time, fade transition between sentences
    function renderSentence(container, sentenceTokens, currentIndex, fontSize, onWordClick, onLineBreaksChange) {
        const displaySize = Math.max(24, Math.min(fontSize * 0.8, 56));
        container.style.fontSize = `${displaySize}px`;

        const cachedFirstId = parseInt(container.dataset.firstId || '-1', 10);
        const newFirstId = sentenceTokens.length > 0 ? sentenceTokens[0].id : -1;

        if (cachedFirstId !== newFirstId) {
            // Fade out, swap, fade in
            container.style.opacity = '0';
            setTimeout(() => {
                container.innerHTML = '';
                container.dataset.firstId = String(newFirstId);
                sentenceTokens.forEach(token => {
                    const span = document.createElement('span');
                    span.className = 'fr-word in-sentence';
                    span.dataset.tokenId = String(token.id);
                    span.textContent = token.word;
                    span.addEventListener('click', () => onWordClick && onWordClick(token.id));
                    container.appendChild(span);
                });
                applyClassesAndDetectLines();
                requestAnimationFrame(() => {
                    container.style.opacity = '1';
                });
            }, DEFAULTS.SENTENCE_FADE_MS);
            return;
        }

        applyClassesAndDetectLines();

        function applyClassesAndDetectLines() {
            for (const span of container.children) {
                const tid = parseInt(span.dataset.tokenId, 10);
                span.classList.remove('is-active', 'is-passed');
                if (tid === currentIndex) span.classList.add('is-active');
                else if (tid < currentIndex) span.classList.add('is-passed');
            }
            // Detect line starts (used by engine to slow down at line breaks)
            if (!onLineBreaksChange) return;
            requestAnimationFrame(() => {
                const indices = new Set();
                let lastTop = -1;
                for (const span of container.children) {
                    const rect = span.getBoundingClientRect();
                    if (lastTop === -1) {
                        lastTop = rect.top;
                        indices.add(parseInt(span.dataset.tokenId, 10));
                    } else if (rect.top > lastTop + (fontSize * 0.5)) {
                        indices.add(parseInt(span.dataset.tokenId, 10));
                        lastTop = rect.top;
                    }
                }
                onLineBreaksChange(indices);
            });
        }
    }

    /* ── INPUT VIEW WIRING ─────────────────────────────────────────── */

    function initInputView(root, onSubmit) {
        const dropzone = root.querySelector('#fr-dropzone');
        const textarea = root.querySelector('#fr-textarea');
        const wordCount = root.querySelector('#fr-word-count');
        const fileInput = root.querySelector('#fr-file-input');
        const startBtn = root.querySelector('#fr-start-btn');
        const samplesGrid = root.querySelector('#fr-samples-grid');

        function updateWordCount() {
            const text = textarea.value.trim();
            const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
            wordCount.textContent = `${count} word${count === 1 ? '' : 's'}`;
            wordCount.hidden = count === 0;
            startBtn.disabled = count === 0;
        }

        textarea.addEventListener('input', updateWordCount);

        // Drag and drop
        dropzone.addEventListener('dragover', e => {
            e.preventDefault();
            dropzone.classList.add('dragging');
        });
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragging');
        });
        dropzone.addEventListener('drop', e => {
            e.preventDefault();
            dropzone.classList.remove('dragging');
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) handleFile(file);
        });

        fileInput.addEventListener('change', e => {
            const file = e.target.files && e.target.files[0];
            if (file) handleFile(file);
        });

        function handleFile(file) {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            if (ext === 'txt') {
                const reader = new FileReader();
                reader.onload = ev => {
                    // Populate the textarea so the user can preview what they
                    // just dropped and confirm via "Start Reading".
                    textarea.value = String(ev.target.result || '');
                    updateWordCount();
                    textarea.scrollTop = 0;
                    pulseStartButton();
                };
                reader.readAsText(file);
            } else if (ext === 'pdf' || ext === 'epub') {
                textarea.value = `[${ext.toUpperCase()} support coming soon: ${file.name}]`;
                updateWordCount();
            }
        }

        // Sample chips — populate the textarea so the user can preview the
        // text and confirm via "Start Reading". Mirrors the drag-drop flow.
        SAMPLE_TEXTS.forEach(sample => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'fr-sample-chip';
            btn.textContent = sample.label;
            btn.dataset.sampleId = sample.label;
            btn.addEventListener('click', () => {
                textarea.value = sample.text;
                updateWordCount();
                // Mark the loaded sample so the user knows which one is staged.
                samplesGrid.querySelectorAll('.fr-sample-chip')
                    .forEach(c => c.classList.toggle('is-loaded', c === btn));
                // Reset scroll inside the textarea so the user sees the start.
                textarea.scrollTop = 0;
                // Draw the eye to Start Reading — same "where did my action go?"
                // pattern as the wizard's spotlight on landed values.
                pulseStartButton();
            });
            samplesGrid.appendChild(btn);
        });

        // Clear sample selection when the user manually edits the text.
        textarea.addEventListener('input', () => {
            samplesGrid.querySelectorAll('.fr-sample-chip.is-loaded')
                .forEach(c => c.classList.remove('is-loaded'));
        });

        function pulseStartButton() {
            if (startBtn.disabled) return;
            startBtn.classList.remove('fr-pulse');
            // Force reflow so the animation restarts on repeated triggers.
            void startBtn.offsetWidth;
            startBtn.classList.add('fr-pulse');
        }

        startBtn.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text) onSubmit(text);
        });

        updateWordCount();
    }

    /* ── MAIN INIT ─────────────────────────────────────────────────── */

    function initFocusReader() {
        const root = document.getElementById('focus-reader');
        if (!root) return;
        if (root.dataset.frReady === 'true') return;
        root.dataset.frReady = 'true';

        // Element references
        const inputView = root.querySelector('[data-view-pane="input"]');
        const readingView = root.querySelector('[data-view-pane="reading"]');
        const visBtns = root.querySelectorAll('.fr-vis-btn');
        const displays = {
            rsvp: root.querySelector('[data-display="rsvp"]'),
            trail: root.querySelector('[data-display="trail"]'),
            sentence: root.querySelector('[data-display="sentence"]'),
            paragraph: root.querySelector('[data-display="paragraph"]'),
            hybrid: root.querySelector('[data-display="hybrid"]'),
        };

        // RSVP word elements (the three modes that use centered word layout)
        const rsvpEls = {
            frame: displays.rsvp.querySelector('.fr-rsvp-frame'),
            before: root.querySelector('#fr-rsvp-before'),
            focal: root.querySelector('#fr-rsvp-focal'),
            after: root.querySelector('#fr-rsvp-after'),
        };
        const trailWordEls = {
            frame: displays.trail.querySelector('.fr-trail-frame'),
            before: root.querySelector('#fr-trail-before'),
            focal: root.querySelector('#fr-trail-focal'),
            after: root.querySelector('#fr-trail-after'),
        };
        const trailEls = {
            frame: displays.trail.querySelector('.fr-trail-frame'),
            leftEl: root.querySelector('#fr-trail-left'),
            rightEl: root.querySelector('#fr-trail-right'),
            wordEls: trailWordEls,
        };
        const hybridWordEls = {
            frame: displays.hybrid.querySelector('.fr-rsvp-frame'),
            before: root.querySelector('#fr-hybrid-before'),
            focal: root.querySelector('#fr-hybrid-focal'),
            after: root.querySelector('#fr-hybrid-after'),
        };

        const sentenceContainer = root.querySelector('#fr-sentence-container');
        const paragraphContainer = root.querySelector('#fr-paragraph-container');
        const hybridParagraphContainer = root.querySelector('#fr-hybrid-paragraph');

        const playBtn = root.querySelector('#fr-play-btn');
        const playIcon = playBtn.querySelector('.fr-icon-play');
        const pauseIcon = playBtn.querySelector('.fr-icon-pause');
        const resetBtn = root.querySelector('#fr-reset-btn');
        const prevBtn = root.querySelector('#fr-prev-btn');
        const nextBtn = root.querySelector('#fr-next-btn');
        const wpmDownBtn = root.querySelector('#fr-wpm-down');
        const wpmUpBtn = root.querySelector('#fr-wpm-up');
        const wpmDisplay = root.querySelector('#fr-wpm-display');
        const fontSizeInput = root.querySelector('#fr-font-size');
        const progressEl = root.querySelector('#fr-progress');
        const progressFill = root.querySelector('#fr-progress-fill');
        const wordPositionEl = root.querySelector('#fr-word-position');
        const progressPctEl = root.querySelector('#fr-progress-pct');
        const backBtn = root.querySelector('#fr-back-btn');

        // App state (held outside engine since engine doesn't manage UI)
        let parsedText = null;
        let visMode = 'rsvp';
        let fontSize = DEFAULTS.FONT_SIZE;
        let wpm = DEFAULTS.WPM;

        const engine = createEngine({
            onTick: state => {
                renderActiveDisplay(state);
                updateControls(state);
            },
        });

        function setView(view) {
            root.dataset.view = view;
            inputView.hidden = view !== 'input';
            readingView.hidden = view !== 'reading';
        }

        function setVisMode(mode) {
            visMode = mode;
            engine.setVisMode(mode);
            visBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.vis === mode));
            Object.entries(displays).forEach(([k, el]) => { el.hidden = k !== mode; });
            // Force re-render at current state
            renderActiveDisplay(engine.getState());
        }

        function getCurrentParagraphTokens(state) {
            if (!parsedText || !state.currentToken) return [];
            return parsedText.paragraphs[state.currentToken.paragraphIndex] || [];
        }

        function getCurrentSentenceTokens(state) {
            if (!parsedText || !state.currentToken) return [];
            return parsedText.sentences[state.currentToken.sentenceIndex] || [];
        }

        function renderActiveDisplay(state) {
            if (!parsedText) return;
            const token = state.currentToken;

            if (visMode === 'rsvp' || visMode === 'hybrid') {
                applyFontSize(rsvpEls, fontSize);
                renderRSVPWord(rsvpEls, token);
            }
            if (visMode === 'hybrid') {
                applyFontSize(hybridWordEls, fontSize);
                renderRSVPWord(hybridWordEls, token);
                renderParagraph(
                    hybridParagraphContainer,
                    getCurrentParagraphTokens(state),
                    state.currentIndex,
                    fontSize,
                    engine.seek,
                    { small: true },
                );
            }
            if (visMode === 'trail') {
                applyFontSize(trailWordEls, fontSize);
                renderTrail(trailEls, parsedText.tokens, state.currentIndex, fontSize);
            }
            if (visMode === 'paragraph') {
                renderParagraph(
                    paragraphContainer,
                    getCurrentParagraphTokens(state),
                    state.currentIndex,
                    fontSize,
                    engine.seek,
                );
            }
            if (visMode === 'sentence') {
                renderSentence(
                    sentenceContainer,
                    getCurrentSentenceTokens(state),
                    state.currentIndex,
                    fontSize,
                    engine.seek,
                    indices => engine.setLineStartIndices(indices),
                );
            }
        }

        function updateControls(state) {
            const total = parsedText ? parsedText.tokens.length : 0;
            wordPositionEl.textContent = `Word ${Math.min(state.currentIndex + 1, total)} of ${total}`;
            progressPctEl.textContent = `${Math.round(state.progress)}%`;
            progressFill.style.width = `${state.progress}%`;
            playIcon.hidden = state.isPlaying;
            pauseIcon.hidden = !state.isPlaying;
            playBtn.setAttribute('aria-label', state.isPlaying ? 'Pause' : 'Play');
        }

        function startReading(text) {
            parsedText = parseText(text);
            engine.setTokens(parsedText.tokens);
            engine.setWpm(wpm);
            setView('reading');
            setVisMode(visMode);
            // Bring the entire reading view (header + display + controls)
            // into the viewport. The pane is sized to fit within ~100svh, so
            // we center it with equal margin top/bottom.
            //
            // We use a manual rAF tween rather than scrollIntoView/scrollTo
            // because the site's smooth-scroll layer can swallow declarative
            // animated scrolls. Per-frame imperative scrolls always land.
            scrollPaneIntoView(readingView || root);
        }

        function backToInput() {
            engine.pause();
            setView('input');
        }

        /**
         * Smoothly scroll so the given element is centered in the viewport.
         *
         * The site shell runs Locomotive Scroll in smooth mode, which moves
         * the page via CSS transform — window.scrollTo is a no-op there. So we
         * drive Locomotive's own scrollTo when its instance is available
         * (exposed as window.locoScroll), and fall back to a manual
         * window.scrollTo tween only when the page scrolls natively.
         *
         * The settle delay lets the [data-view] toggle + layout commit before
         * we measure, and lets Locomotive re-measure the now-shorter document.
         */
        function scrollPaneIntoView(pane) {
            if (!pane) return;

            setTimeout(() => {
                const loco = window.locoScroll;

                if (loco && typeof loco.scrollTo === 'function') {
                    // Locomotive caches element offsets; the view swap changed
                    // document height, so re-measure before targeting.
                    if (typeof loco.update === 'function') loco.update();
                    setTimeout(() => {
                        const vh = window.innerHeight;
                        const paneH = pane.getBoundingClientRect().height;
                        // Negative offset shifts the target down from the top
                        // edge, centering it when it is shorter than the vh.
                        const centerOffset = -Math.max(16, (vh - paneH) / 2);
                        loco.scrollTo(pane, { offset: centerOffset, duration: 700 });
                    }, 60);
                    return;
                }

                // Native-scroll fallback: manual tween (Locomotive in non-smooth
                // mode, or instance not ready). Per-tick imperative scrolls land
                // where declarative smooth scrolls get intercepted.
                const rect = pane.getBoundingClientRect();
                const vh = window.innerHeight;
                const offset = Math.max(16, (vh - rect.height) / 2);
                const start = window.scrollY;
                const target = Math.max(0, start + rect.top - offset);
                if (Math.abs(target - start) < 4) return;
                const duration = 650;
                const t0 = performance.now();
                (function step() {
                    const t = Math.min(1, (performance.now() - t0) / duration);
                    const eased = 0.5 - Math.cos(Math.PI * t) / 2;
                    window.scrollTo(0, start + (target - start) * eased);
                    if (t < 1) setTimeout(step, 16);
                })();
            }, 32);
        }

        // Wire input view
        initInputView(root, startReading);

        // Wire reading view
        backBtn.addEventListener('click', backToInput);

        visBtns.forEach(btn => {
            btn.addEventListener('click', () => setVisMode(btn.dataset.vis));
        });

        playBtn.addEventListener('click', () => engine.toggle());
        resetBtn.addEventListener('click', () => engine.reset());
        prevBtn.addEventListener('click', () => engine.skipToSentence(-1));
        nextBtn.addEventListener('click', () => engine.skipToSentence(1));

        function setWpm(newWpm) {
            wpm = Math.max(DEFAULTS.WPM_MIN, Math.min(DEFAULTS.WPM_MAX, newWpm));
            engine.setWpm(wpm);
            wpmDisplay.textContent = String(wpm);
        }
        wpmDownBtn.addEventListener('click', () => setWpm(wpm - DEFAULTS.WPM_STEP));
        wpmUpBtn.addEventListener('click', () => setWpm(wpm + DEFAULTS.WPM_STEP));
        setWpm(DEFAULTS.WPM);

        fontSizeInput.addEventListener('input', e => {
            fontSize = Number(e.target.value);
            renderActiveDisplay(engine.getState());
        });

        progressEl.addEventListener('click', e => {
            if (!parsedText) return;
            const rect = progressEl.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            engine.seek(Math.floor(pct * parsedText.tokens.length));
        });

        // Keyboard shortcuts (only active when reading)
        document.addEventListener('keydown', e => {
            if (root.dataset.view !== 'reading') return;
            if (e.target instanceof HTMLTextAreaElement) return;
            if (e.target instanceof HTMLInputElement) return;
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    engine.toggle();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    engine.skipToSentence(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    engine.skipToSentence(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setWpm(wpm + DEFAULTS.WPM_STEP);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setWpm(wpm - DEFAULTS.WPM_STEP);
                    break;
                case 'Escape':
                    backToInput();
                    break;
            }
        });
    }

    // Self-init: try immediately, also re-try after Barba's `once` fires
    // (the index-new.js hooks call our function by name).
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFocusReader);
    } else {
        initFocusReader();
    }
    window.initFocusReader = initFocusReader;
})();
