/*
 * Assistente Khan — painel independente, sem API paga.
 * Licença MIT. Não consulta gabaritos internos nem envia respostas à plataforma.
 * Use em exercícios de matemática: operações, porcentagens, equações lineares e quadráticas.
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

  // Entrada de testes sem navegador; não é utilizada no site.
  if (typeof document === 'undefined') {
    globalThis.__khanTutorSolve = solve;
    return;
  }

  if (window.__KHAN_TUTOR_OVERLAY__) {
    window.__KHAN_TUTOR_OVERLAY__.toggle();
    return;
  }

  let lastSelection = window.getSelection ? String(window.getSelection() || '').trim() : '';
  const selectionListener = () => {
    const current = window.getSelection ? String(window.getSelection() || '').trim() : '';
    if (current && current.length <= 3000) lastSelection = current;
  };
  document.addEventListener('selectionchange', selectionListener);

  const host = document.createElement('div');
  host.id = 'khan-tutor-overlay-root';
  host.style.cssText = 'position:fixed;right:14px;top:14px;width:min(420px,calc(100vw - 28px));z-index:2147483647;';
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
    main { padding: 14px; display: flex; flex-direction: column; gap: 10px; max-height: 78vh; overflow-y: auto; }
    label { font-size: 13px; font-weight: 700; }
    textarea { resize:vertical; min-height:88px; width:100%; padding:10px; border:1px solid #aab9cb;
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
  `;
  const shell = document.createElement('section');
  shell.className = 'shell';
  shell.setAttribute('role', 'region');
  shell.setAttribute('aria-label', 'Assistente de exercícios Khan');
  shell.innerHTML = `
    <header><strong>📗 Assistente de exercícios</strong><button id="close" title="Ocultar painel" aria-label="Ocultar painel">×</button></header>
    <main>
      <p class="hint">Selecione o enunciado na página antes de abrir o favorito, ou cole a questão abaixo.</p>
      <label for="question">Enunciado / expressão</label>
      <textarea id="question" placeholder="Ex.: 2x + 3 = 11, x² - 5x + 6 = 0 ou 20% de 150"></textarea>
      <div class="actions"><button id="capture">Capturar seleção</button><button id="solve" class="primary">Resolver com etapas</button></div>
      <label for="answer">Resolução e resposta</label>
      <pre id="answer" aria-live="polite">Digite uma expressão para começar.</pre>
      <div class="actions"><button id="copy">Copiar pergunta para IA</button><button id="open">Abrir ChatGPT</button></div>
      <p class="hint">Modo local: contas, porcentagens e equações até 2º grau. Para geometria, gráficos e textos, copie a questão para a IA e confira a resposta.</p>
      <p id="status" class="status" aria-live="polite"></p>
    </main>`;
  shadow.append(style, shell);
  (document.body || document.documentElement).appendChild(host);

  const $ = (selector) => shadow.querySelector(selector);
  const question = $('#question');
  const answer = $('#answer');
  const status = $('#status');
  if (lastSelection) question.value = lastSelection.slice(0, 3000);
  const message = (msg) => { status.textContent = msg; };
  const getPrompt = () => `Atue como tutor de matemática e outras disciplinas. Resolva o exercício a seguir com etapas claras e justificadas, apresente a resposta final destacada e confira o resultado. Se o enunciado estiver incompleto ou depender de imagem, explique quais dados faltam sem inventar.\n\nEXERCÍCIO:\n${question.value.trim()}`;
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
  $('#capture').addEventListener('click', () => {
    if (lastSelection) { question.value = lastSelection.slice(0, 3000); message('Texto selecionado capturado.'); }
    else message('Primeiro selecione o enunciado na página, ou cole aqui.');
  });
  $('#solve').addEventListener('click', () => {
    try { answer.textContent = solve(question.value); message('Cálculo executado localmente no navegador.'); }
    catch (err) { answer.textContent = `Não foi possível resolver automaticamente: ${err.message}\n\nPara outros tipos de questões, use “Copiar pergunta para IA”.`; message(''); }
  });
  $('#copy').addEventListener('click', async () => {
    if (!question.value.trim()) { message('Cole ou capture o enunciado primeiro.'); return; }
    const copied = await copyText(getPrompt());
    message(copied ? 'Pergunta copiada. Cole no ChatGPT para receber a resolução.' : 'A cópia automática falhou. Selecione o enunciado e copie manualmente.');
  });
  $('#open').addEventListener('click', () => { window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer'); });
  const toggle = () => { host.style.display = host.style.display === 'none' ? 'block' : 'none'; };
  $('#close').addEventListener('click', toggle);
  window.__KHAN_TUTOR_OVERLAY__ = { toggle, solve, destroy() { document.removeEventListener('selectionchange', selectionListener); host.remove(); delete window.__KHAN_TUTOR_OVERLAY__; } };
})();
