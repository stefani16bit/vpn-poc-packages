# packages/ (submodule @vpn/*)

**Status:** mature

Repositório git próprio, consumido pelo `poc-vpn` **do Verdaccio**, nunca por
path relativo. Um `files` errado, um subpath faltando em `exports` ou uma
dependência declarada como dev funcionam perfeitamente dentro do workspace e
quebram só para o consumidor — instalar do registry faz o consumidor ser a
primeira coisa exercitada. Ver DEC-002.

| Pacote           | O que é                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `@vpn/ports`     | Interfaces `I*` + tokens `Symbol.for('vpn.*')`. **Zero dependência, zero import.**                          |
| `@vpn/contracts` | Schemas zod e vocabulário do wire: códigos de erro, lista de locales                                        |
| `@vpn/i18n`      | Traduções como objeto TS tipado, negociação de locale, tradutor                                             |
| `@vpn/testing`   | `/contracts` (suítes de conformidade, importa vitest) e `/fakes` (drivers `memory`, **não** importa vitest) |
| `@vpn/config`    | Preset de vitest e tsconfig base                                                                            |

## Camadas

`ports` não importa nada — o guard falha se qualquer `import` aparecer num
arquivo de porta. `contracts` é o vocabulário do wire e não conhece copy;
`i18n` depende de `contracts` (a lista de locales é um contrato cliente↔servidor,
a copy não é). `testing` depende de `ports`.

`pt-BR.ts` é a **fonte da verdade estrutural** dos locales: `LocaleMessages` é
um mapped type derivado dele, então `en.ts` não compila se faltar uma chave.
O teste de paridade em runtime cobre o inverso (chave a mais) e chave vazia.

## Decisões dentro de um fake

**`MemoryBillingProvider.createCheckout` devolve a `successUrl` que recebeu**, com
a sessão e o preço na query, em vez de um `memory://`. O fake é também o driver
`memory` que roda em desenvolvimento, e um esquema que nenhum navegador abre
transforma o botão de assinar em nada. A suíte de conformidade só exige que a URL
exista; o preço fica na query porque é por ele que o e2e prova que a seleção
mensal/anual chegou ao provider. Ver DEC-056.

## Fluxo de mudança

```
editar → bump da version → pnpm build && pnpm test
       → pnpm publish:local → pnpm consumer-check
       → no poc-vpn: atualizar o range e pnpm install
```

`consumer-check` instala os tarballs publicados **fora** do workspace e importa
com JS puro, sem build.

## Don't

- Não adicione dependência de runtime a `@vpn/ports`.
- Não importe vitest de nada sob `fakes/` — vira dependência de teste no grafo
  de produção, e o guard falha.
- Não use `pnpm link`.
- Não publique sem subir a version; o consumidor não veria a mudança.
- Não escreva bloco de comentário explicativo — os guards falham (DEC-013).
