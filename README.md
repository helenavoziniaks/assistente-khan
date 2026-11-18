# Assistente Khan — leitura automática da questão (bookmarklet)

**Versão 2 — com detecção automática do exercício em andamento.**

O favorito abre um painel flutuante sobre a Khan Academy. Assim que o painel aparece, tenta **ler automaticamente a questão atual** a partir dos elementos **visíveis** da página, sem exigir que você selecione o enunciado.

## O que mudou

- **Leitura automática:** identifica o enunciado visível, inclusive fórmulas matemáticas renderizadas em KaTeX/MathML e alternativas de múltipla escolha representadas no HTML.
- **Próxima questão:** acompanha alterações no conteúdo da página e atualiza o painel quando surgir outro exercício, sem precisar reabrir o favorito.
- **Resposta imediata para matemática simples:** se identificar uma operação, porcentagem ou equação de 1º/2º grau suportada, mostra o cálculo e a resposta automaticamente.
- **Botão “Ler questão da página”:** força uma nova leitura, útil quando algum conteúdo não for reconhecido.
- **Botão “Capturar imagem da tela”:** pede autorização para capturar uma aba/janela/tela, copia a imagem para a área de transferência quando permitido ou salva um PNG. É útil para **enviar manualmente ao ChatGPT** quando a questão depende de um desenho, imagem ou gráfico.
- **Campo editável:** você pode corrigir texto reconhecido incorretamente, colar uma expressão ou desativar a atualização automática.
- **Botão de cópia para IA:** copia um pedido estruturado, incluindo enunciado e alternativas, para colar no ChatGPT.

Não é necessário contratar API, instalar extensão ou informar senha.

**Importante:** a leitura automática interpreta o **DOM/HTML visível**. Não é reconhecimento óptico de caracteres (OCR): imagens, textos desenhados em canvas, gráficos e conteúdos de iframes de outro domínio **podem não ser interpretados**. O botão de captura **não faz OCR**; ele apenas disponibiliza a imagem para você enviar ao ChatGPT. Nem toda questão de texto livre pode ser resolvida pelo motor matemático local.

## Instalar no GitHub Pages

1. No GitHub, entre no repositório `assistente-khan` (crie-o, se ainda não existir).
2. **Substitua** os arquivos antigos do repositório pelos desta versão, sobretudo `assistente-khan.js` e `index.html`.
3. Se necessário, habilite **Settings → Pages → Deploy from a branch → main → /(root) → Save**.
4. Abra `https://SEU_USUARIO.github.io/assistente-khan/` e arraste **Assistente Khan** para a barra de favoritos (no Chrome, `Ctrl+Shift+B` mostra essa barra).
5. Abra uma **atividade** em `https://pt.khanacademy.org/` ou `https://www.khanacademy.org/` e clique no favorito. A questão atual será lida assim que o painel abrir.
6. Se você já tinha o favorito apontando para o **mesmo repositório e caminho do JS**, normalmente não precisa recriá-lo: depois da publicação, atualize a página da Khan Academy com `Ctrl+F5` e clique novamente no favorito. Feche ou recarregue a aba para substituir uma instância antiga que já esteja aberta.

**Se o site bloquear o script hospedado no GitHub:** use a linha inteira de `bookmarklet-autocontido.txt` no campo **URL** de um favorito manual. Esse arquivo foi regenerado e já inclui o novo leitor automático.

## Como usar

1. Clique em **Assistente Khan** enquanto estiver na questão.
2. Veja o enunciado identificado no campo **Questão identificada**.
3. Em operações e equações simples, confira a resolução que já aparece no painel.
4. Em questões complexas, clique em **Copiar questão para IA**, depois em **Abrir ChatGPT**, e cole o texto (`Ctrl+V`).
5. Para imagens e gráficos, clique em **Capturar imagem da tela**, autorize a captura na caixa de diálogo do navegador e cole a imagem no ChatGPT ou envie o PNG salvo.
6. Se a captura automática não encontrar a questão, use **Ler questão da página** ou **Capturar seleção**.

**Atenção:** a API de captura exige autorização explícita e pode ser bloqueada pelas permissões do site ou navegador. Escolha somente a aba/janela que deseja capturar e evite incluir informações privadas na imagem.

## Restrições e privacidade

O script lê apenas conteúdo visível ao usuário e próximo da área de exercício. Não procura gabaritos ocultos, não envia respostas, não altera pontuações, não automatiza a realização das tarefas e não compartilha os dados automaticamente com nenhum servidor. A captura de imagem é iniciada somente mediante clique e permissão do usuário. O navegador pode executar o script em contextos onde essas funcionalidades sejam restringidas.

## Arquivos

- `assistente-khan.js`: resolvedor, detector automático de DOM, observação de mudanças e painel.
- `index.html`: página GitHub Pages com link para arrastar aos favoritos.
- `bookmarklet-github.txt`: alternativa de favorito curto (trocar `SEU_USUARIO`).
- `bookmarklet-autocontido.txt`: alternativa de favorito independente de carregamento externo.
- `PROMPT-PARA-DESENVOLVIMENTO.md`: especificação do projeto.
- `.nojekyll` e `LICENSE`: auxiliares para publicação.

**Teste realizado:** navegador Chromium local em página HTML simulada, com detecção de equação escrita em KaTeX/MathML, leitura de alternativas, resolução automática, atualização após mudar a questão e preservação de edição manual. **Ainda não testado numa conta real da Khan Academy:** a estrutura do site e suas políticas podem exigir ajustes.
