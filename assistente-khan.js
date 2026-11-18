/*
 * Assistente Khan — painel independente, sem API paga.
 * Licença MIT. Não consulta gabaritos internos nem envia respostas à plataforma.
 * Detecta automaticamente o enunciado visível e resolve operações e equações compatíveis.
 * Não lê gabaritos internos e não preenche ou envia respostas à plataforma.
 */
(function () {
  'use strict';

  const EPS = 1e-10;
  const nearZero = (x) => Math.abs(x) < EPS;
  const format = (x) => {
    if (!Number.isFinite(x)) throw new Error('O resultado não é um número real finito.');
    if (nearZero(x)) x = 0;
    return Number(x.toPrecision(10)).toLocaleString('pt-BR', { maximumFractionDigits: 9 });
  };

  function normalize(input) {
    let s = String(input || '').trim();
    if (!s || s.length > 350) throw new Error('Digite uma expressão ou equação curta (até 350 caracteres).');
    s = s.replace(/\u2212/g, '-').replace(/[×·⋅]/g, '*').replace(/[÷]/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/\\(?:times|cdot)/g, '*').replace(/\\div/g, '/')
      .replace(/\\left|\\right/g, '')
      .replace(/\\(?:dfrac|tfrac|frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))')
      .replace(/\^\{([+-]?\d+)\}/g, '^$1')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'sqrt($1)')
      .replace(/√\s*\(/g, 'sqrt(').replace(/√\s*(\d+(?:[.,]\d+)?)/g, 'sqrt($1)')
      .replace(/\\pi|π/g, 'pi')
      .replace(/(?<=\d),(?=\d)/g, '.')
      .replace(/\s+/g, '');
    return s;
  }

  function add(a, b) { return a.map((v, i) => v + b[i]); }
  function subtract(a, b) { return a.map((v, i) => v - b[i]); }
  function mul(a, b) {
    const c = [0, 0, 0];
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
      if (nearZero(a[i]) || nearZero(b[j])) continue;
      if (i + j > 2) throw new Error('Potências acima de x² não são suportadas.');
      c[i + j] += a[i] * b[j];
    }
    return c;
  }
  function div(a, b) {
    if (!nearZero(b[1]) || !nearZero(b[2])) throw new Error('A variável não pode aparecer no denominador neste modo.');
    if (nearZero(b[0])) throw new Error('Divisão por zero.');
    return a.map((v) => v / b[0]);
  }
  function degree(p) { return nearZero(p[2]) ? (nearZero(p[1]) ? 0 : 1) : 2; }
  function polyLabel(p) {
    const items = [];
    for (let i = 2; i >= 0; i--) {
      const v = p[i];
      if (nearZero(v)) continue;
      const abs = Math.abs(v);
      const num = i > 0 && nearZero(abs - 1) ? '' : format(abs);
      const term = i === 2 ? `${num}x²` : i === 1 ? `${num}x` : format(abs);
      items.push({ sign: v < 0 ? '-' : '+', term });
    }
    if (!items.length) return '0';
    return items.map((it, i) => `${i === 0 ? (it.sign === '-' ? '-' : '') : ` ${it.sign} `}${it.term}`).join('');
  }

  function tokenize(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const remain = s.slice(i);
      const match = /^(?:\d+(?:\.\d+)?|\.\d+|sqrt|pi|x|[()+\-*/^])/.exec(remain);
      if (!match) throw new Error(`Símbolo não reconhecido perto de: "${remain.slice(0, 12)}".`);
      const value = match[0];
      if (/[\d]/.test(value[0]) || value[0] === '.') tokens.push({ type: 'number', value });
      else tokens.push({ type: value, value });
      i += value.length;
    }
    const expanded = [];
    for (const t of tokens) {
      const prev = expanded[expanded.length - 1];
      const right = t.type === '(' || t.type === 'x' || t.type === 'sqrt' || t.type === 'pi';
      const left = prev && ['number', 'x', ')', 'pi'].includes(prev.type);
      if (left && right) expanded.push({ type: '*', value: '*' });
      expanded.push(t);
    }
    return expanded;
  }

  function parseExpression(s) {
    const tokens = tokenize(s);
    let pos = 0;
    const current = () => tokens[pos] && tokens[pos].type;
    const consume = (type) => {
      if (current() !== type) throw new Error(`Esperado "${type}".`);
      return tokens[pos++];
    };
    const create = (p, steps = []) => ({ p, steps });
    const constant = (v) => create([v, 0, 0]);
    const op = (a, b, symbol, calc) => {
      const p = calc(a.p, b.p);
      let step = [];
      if (degree(a.p) === 0 && degree(b.p) === 0 && degree(p) === 0 && ['+', '-', '*', '/', '^'].includes(symbol)) {
        step = [`${format(a.p[0])} ${symbol} ${format(b.p[0])} = ${format(p[0])}`];
      }
      return create(p, [...a.steps, ...b.steps, ...step]);
    };
    function sum() {
      let v = product();
      while (current() === '+' || current() === '-') {
        const operator = tokens[pos++].type;
        v = op(v, product(), operator, operator === '+' ? add : subtract);
      }
      return v;
    }
    function product() {
      let v = unary();
      while (current() === '*' || current() === '/') {
        const operator = tokens[pos++].type;
        v = op(v, unary(), operator, operator === '*' ? mul : div);
      }
      return v;
    }
    function unary() {
      if (current() === '+') { pos++; return unary(); }
      if (current() === '-') {
        pos++;
        const value = unary();
        return create(value.p.map((x) => -x), value.steps);
      }
      return power();
    }
    function power() {
      let v = primary();
      if (current() === '^') {
        pos++;
        const e = unary();
        if (degree(e.p) !== 0 || !Number.isInteger(e.p[0]) || e.p[0] < 0 || e.p[0] > 12) {
          throw new Error('Use expoentes inteiros entre 0 e 12.');
        }
        const exponent = e.p[0];
        let result = [1, 0, 0];
        for (let i = 0; i < exponent; i++) result = mul(result, v.p);
        v = create(result, [...v.steps, ...e.steps, ...(degree(v.p) === 0 ? [`${format(v.p[0])} ^ ${exponent} = ${format(result[0])}`] : [])]);
      }
      return v;
    }
    function primary() {
      if (current() === 'number') return constant(Number(tokens[pos++].value));
      if (current() === 'pi') { pos++; return constant(Math.PI); }
      if (current() === 'x') { pos++; return create([0, 1, 0]); }
      if (current() === 'sqrt') {
        pos++;
        consume('(');
        const content = sum();
        consume(')');
        if (degree(content.p) !== 0 || content.p[0] < 0) throw new Error('Raiz quadrada apenas de valores numéricos não negativos.');
        const value = Math.sqrt(content.p[0]);
        return create([value, 0, 0], [...content.steps, `√${format(content.p[0])} = ${format(value)}`]);
      }
      if (current() === '(') {
        pos++;
        const v = sum();
        consume(')');
        return v;
      }
      throw new Error('Expressão incompleta ou mal formatada.');
    }
    if (!tokens.length) throw new Error('Digite a expressão.');
    const result = sum();
    if (pos !== tokens.length) throw new Error('Há caracteres sobrando na expressão.');
    return result;
  }

  function solve(raw) {
    const source = String(raw || '').trim();
    const s = normalize(source);
    const percent = /^([+-]?\d+(?:\.\d+)?)%de([+-]?\d+(?:\.\d+)?)$/i.exec(s);
    if (percent) {
      const rate = Number(percent[1]);
      const base = Number(percent[2]);
      return `Enunciado: ${source}\n\n1. Transforme a porcentagem em número decimal: ${format(rate)} ÷ 100 = ${format(rate / 100)}.\n2. Multiplique pelo valor-base: ${format(rate / 100)} × ${format(base)} = ${format(rate * base / 100)}.\n\nRESPOSTA: ${format(rate * base / 100)}`;
    }
    const sides = s.split('=');
    if (sides.length > 2) throw new Error('Insira somente uma equação de cada vez.');
    if (sides.length === 1) {
      const v = parseExpression(s);
      if (degree(v.p) !== 0) throw new Error('Para resolver uma expressão com x, informe uma equação que contenha "=".');
      const operations = v.steps.length ? v.steps.map((step, i) => `${i + 1}. ${step}`).join('\n') : '1. A expressão já está na forma simplificada.';
      return `Expressão: ${source}\n\n${operations}\n\nRESPOSTA: ${format(v.p[0])}`;
    }
    const left = parseExpression(sides[0]);
    const right = parseExpression(sides[1]);
    const p = subtract(left.p, right.p);
    if (degree(p) === 0) {
      const same = nearZero(p[0]);
      return `Equação: ${source}\n\n1. Lado esquerdo = ${format(left.p[0])}.\n2. Lado direito = ${format(right.p[0])}.\n\nRESPOSTA: ${same ? 'igualdade verdadeira' : 'igualdade falsa'}.`;
    }
    if (degree(p) === 1) {
      const a = p[1];
      const b = -p[0];
      const x = b / a;
      return `Equação: ${source}\n\n1. Simplifique cada lado:\n   Esquerda: ${polyLabel(left.p)}\n   Direita: ${polyLabel(right.p)}\n2. Reúna termos com x de um lado e números do outro:\n   (${format(left.p[1])} − ${format(right.p[1])})x = ${format(right.p[0])} − (${format(left.p[0])})\n   ${format(a)}x = ${format(b)}\n3. Divida ambos os lados por ${format(a)}:\n   x = ${format(b)} ÷ ${format(a)}\n\nRESPOSTA: x = ${format(x)}`;
    }
    const [c, b, a] = p;
    const delta = b * b - 4 * a * c;
    const heading = `Equação: ${source}\n\n1. Coloque tudo do mesmo lado:\n   ${polyLabel(p)} = 0\n2. Coeficientes: a = ${format(a)}, b = ${format(b)}, c = ${format(c)}.\n3. Calcule o discriminante:\n   Δ = b² − 4ac = (${format(b)})² − 4 × (${format(a)}) × (${format(c)}) = ${format(delta)}.\n`;
    if (delta < -EPS) return `${heading}\nRESPOSTA: não existem raízes reais (Δ negativo).`;
    if (nearZero(delta)) {
      const x = -b / (2 * a);
      return `${heading}4. Como Δ = 0, x = −b / (2a) = ${format(x)}.\n\nRESPOSTA: x = ${format(x)} (raiz dupla)`;
    }
    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
    const x2 = (-b - Math.sqrt(delta)) / (2 * a);
    return `${heading}4. Pela fórmula de Bhaskara, x = (−b ± √Δ) / (2a).\n   x₁ = ${format(x1)}\n   x₂ = ${format(x2)}\n\nRESPOSTA: x₁ = ${format(x1)}; x₂ = ${format(x2)}`;
  }

  // Identifica operações que podem ser calculadas localmente com segurança.
  function detectMathExpression(text, mathSnippets = []) {
    const items = [...mathSnippets, ...String(text || '').split(/\n+/)];
    const expressions = [];
    for (const item of items) {
      const source = String(item || '').replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
        .replace(/\\(?:displaystyle|quad|qquad|textstyle)\b/g, ' ')
        .replace(/\\text\{([^}]*)\}/g, '$1').trim();
      const percent = source.match(/\b([+-]?\d+(?:[.,]\d+)?)\s*%\s*de\s*([+-]?\d+(?:[.,]\d+)?)/i);
      if (percent) expressions.push(percent[0]);
      // Tenta extrair somente a região matemática em torno do sinal de igualdade.
      const allowed = /[0-9xXπ√²³.,+\-*/^()=\s×÷·⋅]/;
      for (let k = 0; k < source.length; k++) {
        if (source[k] !== '=') continue;
        let l = k - 1;
        while (l >= 0 && allowed.test(source[l]) && k - l < 95) l--;
        let r = k + 1;
        while (r < source.length && allowed.test(source[r]) && r - k < 95) r++;
        const eq = source.slice(l + 1, r).trim().replace(/[.,;?!\s]+$/, '');
        if (eq.length >= 3 && eq.length < 180 && /\d|x/i.test(eq)) expressions.push(eq);
      }
      // Expressões explícitas, sem palavras em volta.
      if (/^[\s\d xXπ√²³.,+\-*/^()%×÷·⋅\\{}a-zA-Z]+$/.test(source) && /[\dπx]/i.test(source) && /[+*/÷×^²%-]/.test(source) && source.length < 120) {
        expressions.push(source);
      }
      // Exemplo: "Quanto é 2 + 3 * 4?"
      const bare = source.match(/(?:^|[^\w])((?:\d+(?:[.,]\d+)?|\(\s*\d+\s*\))\s*[+*/×÷-]\s*(?:\d+(?:[.,]\d+)?|\(\s*\d+\s*\))(?:\s*[+*/×÷-]\s*\d+(?:[.,]\d+)?)*)/);
      if (bare) expressions.push(bare[1]);
    }
    for (const expr of expressions) {
      try {
        solve(expr);
        return expr;
      } catch (_) { /* A matemática é complexa demais para o resolvedor local. */ }
    }
    return '';
  }

  // Entrada de testes sem navegador; não é utilizada no site.
  if (typeof document === 'undefined') {
    globalThis.__khanTutorSolve = solve;
    globalThis.__khanTutorDetectMath = detectMathExpression;
    return;
  }

  if (window.__KHAN_TUTOR_OVERLAY__) {
    window.__KHAN_TUTOR_OVERLAY__.toggle();
    return;
  }

  // Não inspeciona respostas ocultas: apenas elementos visíveis, dentro da questão.
  const CONTAINERS = [
    '[data-test-id="problem-area"]', '[data-testid="problem-area"]',
    '[data-test-id="exercise-content"]', '[data-testid="exercise-content"]',
    '#problem-area', '#problem', '[data-testid*="question" i]',
    '[data-test-id*="question" i]', '[class*="question" i]',
    '[class*="problem" i]', '[class*="exercise-content" i]',
    '[role="main"]', 'main', 'article'
  ].join(',');
  const IGNORE = 'script,style,noscript,template,nav,footer,aside,[hidden],[aria-hidden="true"],#khan-tutor-overlay-root,[role="navigation"],[role="dialog"],[data-testid*="solution" i],[data-test-id*="solution" i],[data-testid*="hint" i],[data-test-id*="hint" i]';
  const normalizeSpace = (value) => String(value || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[ \t\r\f]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.matches && el.matches(IGNORE)) return false;
    if (el.closest && el.closest('#khan-tutor-overlay-root,[hidden],[aria-hidden="true"]')) return false;
    const css = window.getComputedStyle(el);
    if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse') return false;
    return !!(el.getClientRects && el.getClientRects().length);
  }
  function renderedText(node, math, depth = 0) {
    if (!node || depth > 65) return '';
    if (node.nodeType === 3) return node.nodeValue || '';
    if (node.nodeType !== 1) return '';
    const el = node;
    if (!visible(el)) return '';
    const tag = el.localName;
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return '';
    if (tag === 'br') return '\n';
    if (tag === 'img') return el.getAttribute('alt') || el.getAttribute('title') || '[imagem sem descrição]';
    if (tag === 'svg' || tag === 'canvas') return el.getAttribute('aria-label') || el.getAttribute('title') || '[gráfico ou figura]';
    if (tag === 'math' || (el.classList && (el.classList.contains('katex') || el.classList.contains('MathJax')))) {
      const tex = el.querySelector('annotation[encoding*="tex" i]');
      const display = normalizeSpace((tex && tex.textContent) || el.getAttribute('alttext') || el.getAttribute('aria-label') || el.textContent || '');
      if (display && math && !math.includes(display)) math.push(display);
      return display ? ` ${display} ` : '';
    }
    let str = '';
    for (const child of el.childNodes) str += renderedText(child, math, depth + 1);
    const block = /^(div|p|li|ul|ol|section|article|h[1-6]|tr|td|blockquote)$/.test(tag);
    return block ? `\n${str}\n` : str;
  }
  function nodeText(node, math) { return normalizeSpace(renderedText(node, math)).slice(0, 5200); }
  function findAnswers(root) {
    let scope = root;
    for (let i = 0; i < 4 && scope && scope.parentElement; i++) {
      const radio = scope.querySelectorAll('input[type="radio"], [role="radio"], [role="checkbox"], [data-testid*="choice" i], [data-test-id*="choice" i]').length;
      if (radio >= 2) break;
      if (scope.matches('main,[role="main"]')) break;
      scope = scope.parentElement;
    }
    if (!scope) return [];
    const selectors = 'label,[role="radio"],[role="checkbox"],[role="option"],[data-testid*="choice" i],[data-test-id*="choice" i],[class*="answer-choice" i]';
    const found = [];
    for (const el of scope.querySelectorAll(selectors)) {
      if (!visible(el)) continue;
      const choiceLike = el.matches('[role="radio"],[role="checkbox"],[role="option"],[data-testid*="choice" i],[data-test-id*="choice" i],[class*="answer-choice" i]');
      if (!choiceLike && !el.querySelector('input[type="radio"],input[type="checkbox"]')) continue;
      const val = nodeText(el, []);
      if (val && val.length < 350 && !found.includes(val)) found.push(val);
      if (found.length >= 12) break;
    }
    return found.length >= 2 ? found : [];
  }
  function extractPageQuestion() {
    const elements = [...document.querySelectorAll(CONTAINERS)];
    if (!elements.length) elements.push(document.body);
    const seen = new Set();
    const candidates = [];
    for (const el of elements.slice(0, 150)) {
      if (seen.has(el) || !visible(el) || el.closest('#khan-tutor-overlay-root')) continue;
      seen.add(el);
      if (el.matches('nav,header,footer,aside')) continue;
      const math = [];
      const text = nodeText(el, math);
      if (text.length < 8 || text.length > 5200) continue;
      const heading = `${el.id} ${String(el.className || '').slice(0, 100)} ${el.getAttribute('data-testid') || ''} ${el.getAttribute('data-test-id') || ''}`.toLowerCase();
      const dedicated = /question|problem-area|exercise-content|enunciado/.test(heading);
      const box = el.getBoundingClientRect();
      const inViewport = box.bottom >= 0 && box.top < innerHeight;
      const looksLikeQuestion = /[?¿]|resolv|encontre|calcule|determine|qual|quanto|selecione|escolha|complet|preencha|assinale|simplifiqu|expressão|equação/i.test(text);
      const hasChoices = !!el.querySelector('input[type="radio"], [role="radio"], [data-testid*="choice" i]');
      if (!dedicated && !looksLikeQuestion && !math.length && !hasChoices) continue;
      const score = (dedicated ? 52 : 0) + (inViewport ? 35 : -20)
        + (math.length ? 24 : 0) + (looksLikeQuestion ? 18 : 0)
        + (el.querySelector('input[type="radio"], [role="radio"]') ? 18 : 0)
        - (text.length > 2400 ? 35 : 0) - (text.length > 3800 ? 80 : 0)
        - (text.length < 20 ? 30 : 0)
        - (el.matches('main,[role="main"],article') ? 15 : 0);
      candidates.push({ el, score, text, math });
    }
    candidates.sort((a, b) => b.score - a.score || a.text.length - b.text.length);
    const best = candidates[0];
    if (!best || (best.score < 5 && !best.math.length)) return null;
    const options = findAnswers(best.el);
    const hasOptionsInside = options.length && options.some((opt) => best.text.includes(opt));
    let prompt = best.text;
    if (hasOptionsInside) {
      for (const opt of options) prompt = prompt.replace(opt, '');
      prompt = normalizeSpace(prompt);
    }
    const question = [prompt, options.length ? `Alternativas:\n${options.map((x, i) => `${String.fromCharCode(65 + i)}) ${x}`).join('\n')}` : ''].filter(Boolean).join('\n\n');
    const containsImage = !!best.el.querySelector('img,canvas,svg') || /\[(imagem|gráfico|figura)/i.test(question);
    return { question: question.slice(0, 4800), prompt: prompt.slice(0, 3800), math: best.math, options, containsImage, expression: detectMathExpression(prompt, best.math) };
  }

  let lastSelection = window.getSelection ? String(window.getSelection() || '').trim() : '';
  const selectionListener = () => {
    const current = window.getSelection ? String(window.getSelection() || '').trim() : '';
    if (current && current.length <= 4000) lastSelection = current;
  };
  document.addEventListener('selectionchange', selectionListener);

  const host = document.createElement('div');
  host.id = 'khan-tutor-overlay-root';
  host.style.cssText = 'position:fixed;right:14px;top:14px;width:min(440px,calc(100vw - 28px));z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; font-family: system-ui, -apple-system, Segoe UI, sans-serif; color-scheme: light; }
    * { box-sizing: border-box; }
    .shell { background: #fff; color: #243247; border: 1px solid #d5dfed; border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,.25); overflow: hidden; font: 14px/1.45 system-ui,sans-serif; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 13px 15px;
      background:#0b714f; color:#fff; }
    header strong { font-size: 15px; }
    header button { background:transparent; border:0; color:white; cursor:pointer; font-size: 21px; }
    main { padding: 14px; display: flex; flex-direction: column; gap: 9px; max-height: 78vh; overflow-y: auto; }
    label { font-size: 13px; font-weight: 700; }
    textarea { resize:vertical; min-height:85px; width:100%; padding:10px; border:1px solid #aab9cb;
      border-radius:9px; background:white; color:#172334; font:13px/1.5 system-ui,sans-serif; }
    .actions { display:flex; gap:7px; flex-wrap:wrap; }
    button { border:1px solid #a9bbce; border-radius:8px; padding:8px 10px; background:#f7fafc;
      color:#16374a; cursor:pointer; font:600 12px/1.3 system-ui,sans-serif; }
    button:hover { filter:brightness(.96); }
    button.primary { background:#0b714f; color:white; border-color:#0b714f; }
    pre { white-space:pre-wrap; overflow-wrap:anywhere; margin:0; font:13px/1.55 system-ui,sans-serif;
      background:#f5f8fc; border:1px solid #d8e3ee; border-radius:9px; padding:12px; min-height:65px; }
    .hint,.status { color:#56687c; font-size:12px; margin:0; }
    .status { min-height:16px; }
    .scan { font-size:12px; font-weight:700; border-radius:7px; padding:7px 9px;
      background:#eaf6f0; color:#11553f; }
    .toggle { display:flex; gap:8px; align-items:center; font-weight:500; }
    .toggle input { accent-color:#0b714f; }
  `;
  const shell = document.createElement('section');
  shell.className = 'shell';
  shell.setAttribute('role', 'region');
  shell.setAttribute('aria-label', 'Assistente de exercícios Khan');
  shell.innerHTML = `
    <header><strong>📗 Assistente Khan — leitura automática</strong><button id="close" title="Ocultar painel" aria-label="Ocultar painel">×</button></header>
    <main>
      <p id="scan" class="scan" aria-live="polite">Buscando a questão atual...</p>
      <label class="toggle"><input type="checkbox" id="auto" checked> Detectar automaticamente a próxima questão</label>
      <div class="actions"><button id="read" class="primary">🔎 Ler questão da página</button><button id="capture">Capturar seleção</button></div>
      <label for="question">Questão identificada (editável)</label>
      <textarea id="question" rows="5" placeholder="A questão aparecerá automaticamente aqui. Também é possível digitar ou colar."></textarea>
      <div class="actions"><button id="solve" class="primary">Resolver com etapas</button><button id="screen">📸 Capturar imagem da tela</button></div>
      <label for="answer">Resolução e resposta</label>
      <pre id="answer" aria-live="polite">Lendo a questão...</pre>
      <div class="actions"><button id="copy">Copiar questão para IA</button><button id="open">Abrir ChatGPT</button></div>
      <p class="hint">O texto e as alternativas visíveis são identificados automaticamente. Fórmulas simples podem ser resolvidas no próprio painel. Questões em imagem ou com gráficos podem exigir captura e envio manual ao ChatGPT. Nada é respondido no site automaticamente.</p>
      <p id="status" class="status" aria-live="polite"></p>
    </main>`;
  shadow.append(style, shell);
  (document.body || document.documentElement).appendChild(host);

  const $ = (selector) => shadow.querySelector(selector);
  const question = $('#question');
  const answer = $('#answer');
  const status = $('#status');
  const scan = $('#scan');
  let lastSignature = '';
  let manuallyEdited = false;
  let current = null;
  let scheduled = null;
  const message = (msg) => { status.textContent = msg; };
  const getPrompt = () => `Atue como tutor de matemática e outras disciplinas. Leia cuidadosamente o enunciado abaixo, inclusive todas as alternativas, resolva com etapas claras e justificadas e apresente a resposta final destacada. Verifique se a solução corresponde às alternativas e explique a escolha. Se houver informação visual ausente, peça a imagem, sem inventar dados.\n\nEXERCÍCIO:\n${question.value.trim()}`;
  const copyText = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fallback */ }
    }
    const old = question.value;
    question.value = text;
    question.focus(); question.select();
    const ok = document.execCommand && document.execCommand('copy');
    question.value = old;
    return !!ok;
  };
  function updateDetected(force = false) {
    if (!force && !$('#auto').checked) return;
    const found = extractPageQuestion();
    if (!found || found.question.length < 8) {
      if (force || !lastSignature) {
        scan.textContent = 'Não encontrei uma questão legível nesta página.';
        if (!question.value.trim()) answer.textContent = 'Abra uma atividade ou utilize “Capturar seleção”.';
      }
      return;
    }
    const signature = found.question;
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    current = found;
    question.value = found.question;
    manuallyEdited = false;
    scan.textContent = `Questão identificada ✓ ${found.options.length ? `— ${found.options.length} alternativas` : ''}${found.containsImage ? ' — contém conteúdo visual' : ''}`;
    if (found.expression) {
      try {
        answer.textContent = solve(found.expression);
        message('Expressão matemática reconhecida e resolvida localmente. Confira com o enunciado completo.');
      } catch (error) {
        answer.textContent = `Expressão identificada: ${found.expression}\n${error.message}`;
      }
    } else {
      answer.textContent = 'Enunciado detectado. Esta questão não se enquadra nos cálculos básicos resolvidos localmente. Para uma resolução completa, use “Copiar questão para IA” e abra o ChatGPT.';
      if (found.containsImage) answer.textContent += '\n\nHá conteúdo visual: use “Capturar imagem da tela” e envie a imagem ao ChatGPT para incluir esses dados.';
      message('Leitura realizada a partir dos elementos visíveis da página.');
    }
  }
  function readNow() { manuallyEdited = false; updateDetected(true); }
  function scheduleRead() {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(() => { scheduled = null; updateDetected(false); }, 550);
  }
  $('#read').addEventListener('click', readNow);
  $('#auto').addEventListener('change', (event) => {
    if (event.target.checked) readNow();
    else message('Atualização automática pausada; você pode editar a questão.');
  });
  question.addEventListener('input', () => { manuallyEdited = true; });
  $('#capture').addEventListener('click', () => {
    if (lastSelection) {
      question.value = lastSelection.slice(0, 4000); manuallyEdited = true;
      scan.textContent = 'Trecho selecionado manualmente';
      message('Seleção capturada. Clique em “Resolver com etapas” ou copie para IA.');
    } else message('Selecione o texto na Khan Academy e tente novamente.');
  });
  $('#solve').addEventListener('click', () => {
    const source = question.value.trim();
    const expr = detectMathExpression(source, !manuallyEdited && current ? current.math : []);
    try {
      answer.textContent = solve(expr || source);
      message(expr && expr !== source ? `Expressão resolvida: ${expr}` : 'Cálculo executado localmente no navegador.');
    } catch (err) {
      answer.textContent = `Não foi possível resolver automaticamente: ${err.message}\n\nPara problemas por extenso, gráficos ou exercícios complexos, use “Copiar questão para IA”.`;
      message('');
    }
  });
  $('#copy').addEventListener('click', async () => {
    if (!question.value.trim()) { message('Não há questão para copiar. Clique em “Ler questão da página”.'); return; }
    const copied = await copyText(getPrompt());
    message(copied ? 'Enunciado copiado. Cole no ChatGPT para obter a resolução.' : 'Não foi possível copiar automaticamente; selecione e copie manualmente.');
  });
  $('#open').addEventListener('click', () => { window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer'); });

  // Captura visual somente mediante permissão explícita; não compartilha imagens com servidor.
  $('#screen').addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      message('Captura de tela indisponível neste navegador ou página. Use a ferramenta de captura do Windows (Win + Shift + S).');
      return;
    }
    let stream;
    try {
      // Chamada imediata no clique: a API exige interação direta do usuário.
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      host.style.visibility = 'hidden';
      await new Promise((resolve) => setTimeout(resolve, 160));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!canvas.width || !canvas.height) throw new Error('Não foi possível obter uma imagem da tela.');
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Falha ao criar a imagem.');
      let copied = false;
      try {
        if (navigator.clipboard && navigator.clipboard.write && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          copied = true;
        }
      } catch (_) { /* A política do site pode impedir escrita na área de transferência. */ }
      if (!copied) {
        const address = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = address;
        link.download = 'questao-khan.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(address), 60000);
      }
      message(copied ? 'Imagem copiada! Abra o ChatGPT e cole com Ctrl+V. A captura não usa OCR.' : 'Imagem salva como questao-khan.png. Envie-a ao ChatGPT; a captura não usa OCR.');
    } catch (error) {
      message(error.name === 'NotAllowedError' ? 'Captura cancelada ou bloqueada pelo navegador.' : `Captura não concluída: ${error.message}`);
    } finally {
      host.style.visibility = '';
      if (stream) stream.getTracks().forEach((track) => track.stop());
    }
  });

  const toggle = () => { host.style.display = host.style.display === 'none' ? 'block' : 'none'; if (host.style.display === 'block') readNow(); };
  $('#close').addEventListener('click', toggle);
  const observer = new MutationObserver((changes) => {
    if (changes.every((change) => host.contains(change.target))) return;
    scheduleRead();
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });
  window.__KHAN_TUTOR_OVERLAY__ = {
    toggle, solve, read: readNow, extract: extractPageQuestion,
    destroy() {
      observer.disconnect();
      if (scheduled) clearTimeout(scheduled);
      document.removeEventListener('selectionchange', selectionListener);
      host.remove();
      delete window.__KHAN_TUTOR_OVERLAY__;
    }
  };
  // A leitura inicial acontece assim que o favorito é acionado.
  readNow();
})();
