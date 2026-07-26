const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const assistant = document.getElementById('assistant');
const assistantBtn = document.getElementById('assistant-btn');
const assistantPanel = document.getElementById('assistant-panel');
let panelOpenedOnce = false;

function setMenu(open) {
    if (!assistant) return;

    assistant.classList.toggle('is-open', open);
    assistantBtn.setAttribute('aria-expanded', String(open));
    assistantBtn.setAttribute('aria-label', open ? 'Fechar menu de seções' : 'Abrir menu de seções');

    if (open && !panelOpenedOnce && !reduceMotion) {
        panelOpenedOnce = true;
        scrambleWithin(assistantPanel);
    }
}

if (assistantBtn) {
    assistantBtn.addEventListener('click', function () {
        setMenu(assistantBtn.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (assistantBtn.getAttribute('aria-expanded') !== 'true') return;

        setMenu(false);
        assistantBtn.focus();
    });

    document.addEventListener('click', function (e) {
        if (assistantBtn.getAttribute('aria-expanded') !== 'true') return;
        if (assistant.contains(e.target)) return;

        setMenu(false);
    });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;

        e.preventDefault();

        const top = targetElement.getBoundingClientRect().top + window.pageYOffset - 16;

        window.scrollTo({
            top: top,
            behavior: 'smooth'
        });

        setMenu(false);
    });
});

const themeButton = document.getElementById('theme-toggle');
const THEME_LABELS = { light: 'Tema claro', dark: 'Tema escuro' };
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return darkQuery.matches ? 'dark' : 'light';
}

function updateThemeButton(theme) {
    if (!themeButton) return;

    const other = theme === 'dark' ? 'light' : 'dark';
    const label = THEME_LABELS[theme] + '. Alternar para o ' + THEME_LABELS[other].toLowerCase() + '.';

    themeButton.setAttribute('aria-label', label);
    themeButton.setAttribute('title', label);

    const icon = themeButton.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-sun', theme === 'light');
        icon.classList.toggle('fa-moon', theme === 'dark');
    }

    const labelEl = themeButton.querySelector('.theme-toggle-label');
    if (labelEl) labelEl.textContent = THEME_LABELS[theme];
}

if (themeButton) {
    updateThemeButton(currentTheme());

    themeButton.addEventListener('click', function () {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', next);
        try {
            localStorage.setItem('theme', next);
        } catch (e) {}

        updateThemeButton(next);
    });

    darkQuery.addEventListener('change', function () {
        if (!document.documentElement.hasAttribute('data-theme')) updateThemeButton(currentTheme());
    });
}

const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id]');

if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;

            navLinks.forEach(function (link) {
                link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (section) {
        observer.observe(section);
    });
}

const REVEAL_SELECTOR = '.hero-name, .hero-role, .hero-tagline, .hero-photo, .section-title, .card, .project-card, .site-footer';
const SCRAMBLE_SELECTOR = [
    '.assistant-title', '.nav-link',
    '.hero-name', '.hero-role', '.hero-tagline', '.btn',
    '.section-title', '.lead', '.card-title',
    '.tile h3', '.tile p',
    '.skill-name', '.skill-tag',
    '.project-body h3', '.project-body p', '.chip',
    '.timeline-role', '.timeline-org', '.timeline-period', '.timeline-desc', '.timeline-desc li',
    '.contact-heading', '#contato p', '.contact-item span', '.label', '.doc-link',
    '.site-footer p'
].join(', ');
const SCRAMBLE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789<>/\\|{}[]#$%&*+=';

const revealTargets = document.querySelectorAll(REVEAL_SELECTOR);
const scrambled = new WeakSet();
const jobs = [];
let running = false;

function showAll() {
    revealTargets.forEach(function (el) {
        el.classList.add('is-visible');
    });
}

function randomChar() {
    return SCRAMBLE_CHARS.charAt(Math.floor(Math.random() * SCRAMBLE_CHARS.length));
}

function tick() {
    for (let i = jobs.length - 1; i >= 0; i--) {
        if (!jobs[i]()) jobs.splice(i, 1);
    }

    if (jobs.length) {
        requestAnimationFrame(tick);
    } else {
        running = false;
    }
}

function directTextNodes(el) {
    const out = [];

    for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes[i];
        if (node.nodeType === 3 && node.nodeValue.trim()) out.push(node);
    }

    return out;
}

function makeJob(node, delay) {
    const original = node.nodeValue;
    const parent = node.parentNode;
    const block = document.createElement('span');
    const words = [];

    block.className = 'scramble-block';

    original.split(/(\s+)/).forEach(function (part) {
        if (!part) return;

        if (!part.trim()) {
            block.appendChild(document.createTextNode(part));
            return;
        }

        const wrap = document.createElement('span');
        const real = document.createElement('span');
        const ghost = document.createElement('span');

        wrap.className = 'scramble-word';
        real.className = 'scramble-real';
        real.textContent = part;
        ghost.className = 'scramble-ghost';
        ghost.setAttribute('aria-hidden', 'true');

        wrap.appendChild(real);
        wrap.appendChild(ghost);
        block.appendChild(wrap);

        const plan = [];
        for (let i = 0; i < part.length; i++) {
            const start = delay + Math.floor(Math.random() * 16);
            plan.push({ start: start, end: start + 10 + Math.floor(Math.random() * 20) });
        }

        words.push({ text: part, real: real, ghost: ghost, plan: plan, done: false });
    });

    if (!words.length) return null;

    parent.replaceChild(block, node);

    let frame = 0;

    return function () {
        let pending = false;

        for (let w = 0; w < words.length; w++) {
            const word = words[w];
            if (word.done) continue;

            let out = '';
            let resolved = 0;

            for (let i = 0; i < word.text.length; i++) {
                const p = word.plan[i];

                if (frame >= p.end) {
                    out += word.text[i];
                    resolved++;
                } else if (frame >= p.start) {
                    out += randomChar();
                } else {
                    out += ' ';
                }
            }

            if (resolved === word.text.length) {
                word.done = true;
                word.real.classList.remove('scramble-real');
                if (word.ghost.parentNode) word.ghost.parentNode.removeChild(word.ghost);
            } else {
                word.ghost.textContent = out;
                pending = true;
            }
        }

        frame++;
        if (pending) return true;

        if (block.parentNode === parent) parent.replaceChild(document.createTextNode(original), block);
        return false;
    };
}

function scrambleWithin(root) {
    const targets = [];

    if (root.matches(SCRAMBLE_SELECTOR)) targets.push(root);
    root.querySelectorAll(SCRAMBLE_SELECTOR).forEach(function (el) {
        targets.push(el);
    });

    targets.forEach(function (el, index) {
        if (scrambled.has(el)) return;
        scrambled.add(el);

        const delay = Math.min(index * 3, 45);

        directTextNodes(el).forEach(function (node) {
            const job = makeJob(node, delay);
            if (job) jobs.push(job);
        });
    });

    if (jobs.length && !running) {
        running = true;
        requestAnimationFrame(tick);
    }
}

try {
    if (reduceMotion || !('IntersectionObserver' in window) || !revealTargets.length) {
        showAll();
    } else {
        const revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
                scrambleWithin(entry.target);
            });
        }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

        revealTargets.forEach(function (el) {
            revealObserver.observe(el);
        });
    }
} catch (err) {
    showAll();
}
