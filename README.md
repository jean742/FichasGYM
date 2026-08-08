# Gym Pro — App de Treino 100% Offline

Aplicativo de musculação completo (estilo Hevy / Strong / Alpha Progress),
feito em **HTML5 + CSS3 + JavaScript puro** — sem frameworks, sem build,
sem dependências externas. Funciona 100% offline como PWA.

## Como testar agora mesmo

Navegadores modernos bloqueiam `fetch`/IndexedDB/Service Worker quando
o arquivo é aberto direto como `file://`. Por isso, sirva a pasta com
qualquer servidor HTTP local simples:

```bash
cd gymapp
python3 -m http.server 8080
# depois abra http://localhost:8080 no navegador
```

Ou, se tiver Node instalado:
```bash
npx serve gymapp
```

## Como instalar no iPhone 15 (Safari)

1. Hospede a pasta em algum lugar acessível pelo iPhone (ex: Netlify,
   GitHub Pages, Vercel, ou um servidor na sua rede local).
2. Abra o link no **Safari** (precisa ser Safari, não Chrome, para o
   "Adicionar à Tela de Início" funcionar corretamente no iOS).
3. Toque no ícone de Compartilhar (□ com seta para cima).
4. Escolha **"Adicionar à Tela de Início"**.
5. Pronto — o app abre em tela cheia, sem barra de navegador, como
   um app nativo, e funciona offline depois da primeira visita.

## Estrutura

```
gymapp/
├── index.html            → esqueleto de todas as telas
├── manifest.json          → configuração do PWA (ícones, cores, nome)
├── service-worker.js      → cache offline (estratégia cache-first)
├── firestore.rules        → regras de segurança do Firestore (cole no console Firebase)
├── css/style.css          → design system completo (dark/light theme)
├── js/
│   ├── firebase-config.js  → chaves do SEU projeto Firebase (veja seção acima)
│   ├── auth.js              → login por e-mail/senha e Google
│   ├── db.js                 → roteador: escolhe db-local ou db-cloud automaticamente
│   ├── db-local.js           → camada IndexedDB (fallback 100% offline)
│   ├── db-cloud.js           → camada Firestore (sincronizada entre dispositivos)
│   ├── pictograms.js          → ícones animados SVG dos padrões de movimento
│   ├── exercises.js           → biblioteca de ~113 exercícios cadastrados
│   ├── generator.js            → gerador de fichas (split, exercícios, séries)
│   ├── program.js               → mesociclo, semanas, progressão automática de carga
│   ├── nutrition.js              → recomendações de cardio/proteína/água por objetivo
│   ├── timer.js                   → cronômetro circular de descanso
│   ├── charts.js                   → gráficos em Canvas puro
│   ├── ui.js                        → toda a lógica de telas e interações
│   ├── pwa.js                        → registro do service worker / instalação
│   └── app.js                         → inicialização geral + fluxo de login
├── icons/                  → ícones do PWA (gerados, pode substituir pelos seus)
└── images/                  → avatar e imagem placeholder dos exercícios
```

## Sincronização entre dispositivos (opcional)

Por padrão, o app funciona 100% local (IndexedDB) — cada aparelho tem seus
próprios dados. Se você quiser acompanhar o treino de qualquer aparelho
(celular, computador, etc.), dá pra ativar sincronização via **Firebase**
(gratuito para uso pessoal). O app detecta sozinho se está configurado —
sem configurar, continua funcionando local normalmente.

### Passo a passo

1. **Criar o projeto**: acesse [console.firebase.google.com](https://console.firebase.google.com),
   clique em "Adicionar projeto", dê um nome (ex: "gym-pro") e siga o assistente
   (pode desativar o Google Analytics, não é necessário).

2. **Ativar o login por e-mail/senha e Google**: no menu lateral, vá em
   **Build → Authentication → Get started**. Na aba "Sign-in method",
   ative os provedores **"E-mail/senha"** e **"Google"** (no Google,
   basta escolher um e-mail de suporte do projeto e salvar).

   ⚠️ Só para o login com Google: vá em **Authentication → Settings →
   Authorized domains** e confirme que o domínio onde o app está
   hospedado está na lista (ex: `jean742.github.io`, se usar GitHub
   Pages). O `localhost` já vem autorizado por padrão. Sem isso, o
   botão "Continuar com Google" não funciona (o de e-mail/senha
   funciona normalmente sem esse passo).

3. **Criar o banco de dados**: no menu lateral, vá em
   **Build → Firestore Database → Create database**. Escolha
   **"Start in production mode"** e a região mais próxima de você
   (ex: `southamerica-east1` para o Brasil).

4. **Configurar as regras de segurança**: ainda no Firestore, vá na aba
   **"Regras"** (Rules) e substitua o conteúdo pelo que está no arquivo
   `firestore.rules` deste projeto — isso garante que cada pessoa só
   acesse os próprios dados. Clique em "Publicar".

5. **Registrar o app Web**: na página inicial do projeto (ícone de
   engrenagem → "Configurações do projeto"), role até "Seus apps" e
   clique no ícone `</>` (Web). Dê um apelido (ex: "gym-pro-web") e
   clique em "Registrar app". **Não** marque a opção de Firebase Hosting.

6. **Copiar as chaves**: o Firebase vai mostrar um bloco de código
   `firebaseConfig` com `apiKey`, `authDomain`, `projectId`, etc. Copie
   esses valores e cole no arquivo `js/firebase-config.js` do projeto,
   substituindo os textos "COLE_AQUI_...".

7. **Subir a alteração pro GitHub** (veja o passo a passo do GitHub
   Desktop mais acima nesta conversa, ou no seu repositório): commit +
   push do arquivo `js/firebase-config.js` alterado.

8. **Testar**: abra o app (pelo link do GitHub Pages, se tiver ativado,
   ou localmente). Uma tela de login vai aparecer — crie uma conta com
   e-mail e senha. Repita em outro aparelho com o mesmo e-mail/senha e
   confirme que os dados aparecem iguais.

### Notas importantes

- O plano gratuito do Firebase (Spark) é bem generoso para uso pessoal
  (50 mil leituras/dia, 20 mil escritas/dia) — não deve gerar cobrança
  para um único usuário.
- O arquivo `js/firebase-config.js` é seguro de deixar público no
  GitHub — essas chaves identificam o projeto, mas quem protege os
  dados de verdade são as regras de segurança do passo 4.
- O Firestore já vem com cache offline embutido: se a internet cair no
  meio de um treino, o app continua funcionando normalmente e sincroniza
  sozinho assim que a conexão voltar.
- Esqueceu a senha? A tela de login tem um link "Esqueci minha senha"
  que envia um e-mail de redefinição.

## O que já funciona

- **Sincronização entre dispositivos** (opcional, via Firebase): crie
  uma conta com e-mail/senha ou entre com Google, e acesse os mesmos
  treinos, histórico, água e recordes de qualquer aparelho. Login com
  Google já preenche nome e foto automaticamente. Sem configurar, o
  app funciona 100% local como antes — veja a seção acima para ativar
- **Foto de perfil**: toque na foto (ou no lápis) na tela Início para
  escolher uma imagem do aparelho — é redimensionada e comprimida
  automaticamente antes de salvar (sem precisar de servidor de imagens)
- Navegação entre 5 telas (Início, Treinos, Progresso, Calendário, Ajustes)
- Cadastro de treino por dia da semana, com biblioteca de ~113 exercícios
  pesquisável e filtrável (grupo muscular, equipamento, nível)
- **Pictogramas animados** (SVG, 100% original) em cada exercício mostrando
  o padrão de movimento (empurrar, puxar, agachar, dobradiça de quadril,
  rosca, extensão, elevação lateral, core, panturrilha, cardio)
- **Vídeo demonstrativo embutido**: para os exercícios mais comuns (Supino
  Reto, Agachamento Livre, Levantamento Terra, Barra Fixa, Puxada Frontal
  e Desenvolvimento Militar), clicar em "Assistir vídeo" toca o YouTube
  embutido logo abaixo, sem sair do app. Os demais exercícios abrem uma
  busca no YouTube em nova aba (ainda não têm vídeo curado/verificado —
  posso ir adicionando mais conforme você pedir)
- **Programa de treino com progressão real** (mesociclo de 5 semanas):
  ao gerar uma ficha, os exercícios escolhidos ficam **fixos** durante
  5 semanas — isso é o que permite comparar carga/reps de uma semana
  pra outra. Dentro de cada dia, os exercícios são ordenados seguindo
  lógica de treino (compostos como agachamento/supino/remada primeiro,
  isolados como rosca/elevação lateral por último). Toda semana, o
  app recalcula sozinho a carga sugerida de cada exercício com base no
  que você **realmente registrou** na sessão anterior: bateu a meta de
  reps em todas as séries → sugere subir a carga; não bateu → sugere
  repetir o peso. A 5ª semana de cada ciclo é automaticamente uma
  semana de recuperação (deload, com menos volume/carga). Card "Seu
  Programa" na tela Início mostra a semana atual e quanto falta para
  os exercícios serem renovados
- **Ficha de Treino Inteligente**: idade, peso, altura, objetivo, nível de
  experiência, local de treino (academia ou casa/calistenia) e dias/tempo
  disponíveis → gera a divisão de treino e escolhe os exercícios (evitando
  repetir os mesmos exercícios entre dias parecidos do split, ex: "Peito
  e Tríceps" e "Peito e Tríceps (B)" num split de 6 dias). Se você já tem
  um recorde registrado para um exercício sorteado, a ficha usa isso como
  ponto de partida em vez de deixar em branco. Gerar uma ficha nova sempre
  reflete exatamente os dias selecionados (os demais são esvaziados) e
  começa um novo mesociclo do zero
- **Nutrição, Água e Cardio** (card na Início + modal completo): a partir
  do peso e objetivo cadastrados, calcula automaticamente faixa de
  proteína diária (g/kg conforme o objetivo), meta de água (ml/kg + bônus
  para quem treina 5+ dias/semana), recomendação de cardio (tipo,
  frequência e duração — leve para hipertrofia/força, misto LISS+HIIT
  para emagrecimento, etc.) e dicas de estratégia alimentar. Inclui um
  rastreador de água do dia com botões +250ml/+500ml e barra de progresso,
  sincronizado entre a Início e o modal. Sempre com aviso de que são
  diretrizes gerais, não substituem nutricionista/médico
- Checklist de séries com peso/reps/RPE, cronômetro circular de descanso
  (com som via Web Audio API e vibração quando disponível)
- Conclusão de treino automática (quando todas as séries são marcadas)
  ou manual, com cálculo de volume, tempo e calorias estimadas
- Detecção automática de recorde pessoal por exercício ("Novo Recorde!")
- Dashboard com gráficos (volume semanal/mensal, peso corporal, grupo
  muscular mais treinado, evolução de carga) desenhados em `<canvas>`
- Calendário com dias treinados/perdidos/futuros e sequência (streak)
- Exportar/Importar backup em JSON, resetar dados, temas claro/escuro,
  6 cores de destaque
- 100% offline via Service Worker depois da primeira visita (a única
  exceção é o player de vídeo do YouTube, que precisa de internet)

## Próximos passos sugeridos (posso gerar se você quiser)

- Curar vídeos demonstrativos para mais exercícios (hoje são 6 dos ~113)
- Expandir a biblioteca de ~113 para 300+ exercícios
- Gerar um QR Code real (atualmente mostra o link em texto) via um
  encoder leve embutido
- Editor de treino com arrastar-e-soltar para reordenar exercícios
- Suporte a múltiplos perfis/usuários no mesmo aparelho
- Opção "Casa com halteres" como nível intermediário entre calistenia
  pura e academia completa
