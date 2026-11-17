# Prompt: Assistente Khan Academy por bookmarklet

Atue como desenvolvedor sênior de JavaScript, com foco em interfaces sobrepostas a páginas web e acessibilidade.

**Objetivo:** desenvolver um bookmarklet que o usuário consiga armazenar na barra de favoritos e acionar enquanto estuda na Khan Academy. O programa deve exibir um painel flutuante independente, sem alterar o site original.

## Requisitos funcionais

1. Criar painel flutuante, responsivo, em português do Brasil, sobre a página, com botão de fechar e possibilidade de reabrir pelo favorito.
2. Permitir capturar texto que o usuário selecionou na página e também colar ou digitar manualmente um exercício.
3. Resolver localmente exercícios matemáticos básicos, com **etapas do cálculo e resposta final**, incluindo operações, frações aritméticas, potências, porcentagens e equações de 1º e 2º graus.
4. Nunca inventar uma resposta para formatos não suportados. Exibir aviso claro em exercícios com gráficos, imagens, geometria ou enunciados complexos.
5. Oferecer um botão para copiar um prompt com o enunciado e pedir ao ChatGPT a resolução detalhada e a checagem da resposta. Abrir o ChatGPT em outra aba, sem presumir uma integração automática ou uso de API.
6. Não ler gabaritos ocultos, não tentar contornar restrições da Khan Academy, não preencher automaticamente respostas nem enviar tarefas.
7. Não exigir login adicional, chave de API, servidores próprios, assinaturas nem bibliotecas pagas.

## Requisitos técnicos e de segurança

- Usar JavaScript puro e `Shadow DOM` para evitar conflitos de estilos.
- Usar `textContent` ao exibir conteúdo inserido pelo usuário, evitando injeção de HTML.
- Não usar `eval`, `new Function` ou scraping de dados privados.
- Ler apenas o texto selecionado pelo usuário, e não coletar o conteúdo completo da página.
- Permitir a publicação do código em um repositório GitHub Pages.
- Incluir um bookmarklet curto que carrega o script hospedado no GitHub Pages e uma versão autocontida como alternativa caso a Política de Segurança de Conteúdo (CSP) do site bloqueie o carregamento externo.
- Incluir `README.md` com instalação passo a passo no Chrome, exemplos e limitações.
- Testar os cálculos em expressões com sinais, parênteses, multiplicação implícita, variáveis e discriminante negativo.

## Entregáveis

Entregue arquivos `assistente-khan.js`, `index.html`, `bookmarklet-github.txt`, `bookmarklet-autocontido.txt` e `README.md`. Deixe claro o que funciona sem IA e o que precisa ser enviado manualmente a uma IA para obter a resolução.
