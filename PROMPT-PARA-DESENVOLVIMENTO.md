# Prompt: aprimoramento do Assistente Khan Academy (versão 2)

Atue como desenvolvedor sênior de JavaScript, especialista em leitura semântica do DOM, acessibilidade, matemática simbólica e bookmarklets.

**Objetivo:** manter um bookmarklet que abra um painel na Khan Academy e **identifique automaticamente a questão atual**, sem que o usuário precise selecionar o enunciado.

## Requisitos

1. Ao abrir a sobreposição, detectar o exercício em andamento através de elementos visíveis, distinguindo a pergunta dos menus, dicas e soluções ocultas.
2. Identificar textos, fórmulas em KaTeX/MathML/LaTeX e alternativas visíveis de múltipla escolha.
3. Detectar mudanças dinâmicas na questão (MutationObserver com debounce) e atualizar o painel sem seleção manual.
4. Preservar o texto editado pelo usuário enquanto o exercício não mudar; incluir botão para forçar nova leitura.
5. Resolver localmente e passo a passo expressões aritméticas, porcentagens e equações de primeiro/segundo grau quando reconhecidas com confiança. Não inventar respostas para conteúdo não suportado.
6. Oferecer captura visual mediante autorização explícita da API `getDisplayMedia`, quando disponível, disponibilizando a imagem para envio manual ao ChatGPT, sem alegar OCR onde ele não existe.
7. Incluir botões para copiar enunciado + alternativas em um prompt e abrir o ChatGPT; sem chave de API, sem chamadas automáticas a servidores externos e sem bibliotecas pagas.
8. Interface simples, responsiva, em português brasileiro, com Shadow DOM, textos inseridos somente via `textContent`, sem `eval`, sem leitura de respostas ocultas e sem envio/preenchimento automático de exercícios.
9. Gerar `assistente-khan.js`, `index.html`, `bookmarklet-github.txt`, `bookmarklet-autocontido.txt` e `README.md` com instruções para GitHub Pages.
10. Testar no Chromium usando HTML simulado com KaTeX/MathML e alternativas, além de casos de leitura que falham de maneira segura, mudança de exercícios e preservação da edição manual.

**Limitações a declarar:** bookmarklets não possuem acesso universal a iframes de outro domínio, pixels de canvas ou respostas não presentes no DOM. A política de segurança do site pode bloquear carregamento remoto e captura. OCR requer mecanismo adicional, portanto não prometer reconhecimento de imagens só por capturá-las.
