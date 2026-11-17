# Assistente Khan — Bookmarklet de resolução matemática

Painel que aparece **sobre a Khan Academy** ao clicar em um favorito do navegador.
Ele **não** se comunica com servidores de IA por conta própria e não consulta respostas ocultas da plataforma.

## Funcionalidades

- Selecionar texto na página, capturá-lo para um painel flutuante ou digitar manualmente.
- Mostrar resolução e resposta para contas aritméticas, frações, porcentagens e equações até o 2º grau.
- Copiar um pedido detalhado de resolução para colar no ChatGPT, para casos não suportados.
- Abrir o ChatGPT em nova aba, sem chave de API.

Exemplos suportados: `2 + 3 * 4`, `(2+3)*4`, `20% de 150`, `2x + 3 = 11`, `x² - 5x + 6 = 0` e `\\frac{1}{2}+\\frac{1}{4}`.

**Limitações:** o resolvedor é demonstrativo, não interpreta gráficos, imagens, desenhos geométricos, problemas por extenso nem todas as notações de fórmulas. Confira a resolução e digite a expressão matemática relevante quando necessário. A captura de seleção pode falhar se o exercício estiver dentro de um iframe de outro domínio. O carregamento do script remoto pode ser bloqueado pela CSP do site.

## Instalação pelo GitHub (recomendado)

1. Crie um repositório público chamado `assistente-khan` em sua conta no GitHub.
2. Envie **todos os arquivos desta pasta** para a raiz do repositório (`main`).
3. Vá a **Settings > Pages > Build and deployment > Source: Deploy from a branch > main > /(root) > Save**.
4. Abra `https://SEU_USUARIO.github.io/assistente-khan/`. A página disponibiliza um link chamado **Assistente Khan** para arrastar à barra de favoritos. Substitua `SEU_USUARIO` pelo nome real da sua conta.
5. No Chrome, mostre a barra de favoritos com `Ctrl+Shift+B`. Arraste o link **Assistente Khan** para a barra. Alternativamente, crie um favorito manualmente com o código de `bookmarklet-github.txt`, trocando `SEU_USUARIO` pelo nome correto.
6. Abra um exercício da Khan Academy. Selecione o enunciado (quando possível) e clique no favorito **Assistente Khan**. O painel abrirá sobre a página.

Quando atualizar `assistente-khan.js` no repositório, a versão carregada pelo favorito também será atualizada após a publicação no Pages, respeitando o cache do navegador.

## Alternativa que não depende do GitHub Pages

Se o site bloquear scripts externos por meio de sua política de segurança, copie a **única linha** do arquivo `bookmarklet-autocontido.txt` e cole no campo **URL** de um novo favorito. Ele contém o código completo, por isso é bastante longo, mas dispensa carregamento de outro domínio. Mesmo essa modalidade depende das permissões do navegador e da página.

## Uso

1. Selecione uma expressão ou cole diretamente no campo.
2. Clique em **Resolver com etapas** para cálculo local.
3. Se não for um cálculo suportado, clique em **Copiar pergunta para IA**, depois em **Abrir ChatGPT** e cole com `Ctrl+V`.
4. Para esconder o painel, clique no `×`; para reabrir, clique novamente no favorito.

## Privacidade e funcionamento

A modalidade local opera sem enviar a questão a qualquer servidor. O botão de cópia só envia o texto à área de transferência do seu navegador; o texto será compartilhado com o ChatGPT somente se você decidir colá-lo lá. Não há coleta automática de suas atividades.

Não há preenchimento automático, tentativa de extração de gabaritos ou envio de respostas pela plataforma Khan Academy.

## Testes realizados

O núcleo matemático foi verificado em 13 exemplos com Node.js, incluindo prioridades, porcentagem, frações, equações e raízes. Não houve teste de execução dentro de uma sessão real da Khan Academy; ajustes podem ser necessários conforme as políticas do site e do navegador.

Licença: MIT (uso educacional; código oferecido como está).
