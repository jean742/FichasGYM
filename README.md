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
├── index.html          → esqueleto de todas as telas
├── manifest.json        → configuração do PWA (ícones, cores, nome)
├── service-worker.js    → cache offline (estratégia cache-first)
├── css/style.css        → design system completo (dark/light theme)
├── js/
│   ├── db.js             → camada IndexedDB (perfil, treinos, histórico...)
│   ├── exercises.js      → biblioteca de ~90 exercícios cadastrados
│   ├── timer.js           → cronômetro circular de descanso
│   ├── charts.js          → gráficos em Canvas puro
│   ├── ui.js              → toda a lógica de telas e interações
│   ├── pwa.js              → registro do service worker / instalação
│   └── app.js              → inicialização geral
├── icons/                → ícones do PWA (gerados, pode substituir pelos seus)
└── images/                → avatar e imagem placeholder dos exercícios
```

## O que já funciona

- Navegação entre 5 telas (Início, Treinos, Progresso, Calendário, Ajustes)
- Cadastro de treino por dia da semana, com biblioteca de ~113 exercícios
  pesquisável e filtrável (grupo muscular, equipamento, nível)
- **Pictogramas animados** (SVG, 100% original) em cada exercício mostrando
  o padrão de movimento (empurrar, puxar, agachar, dobradiça de quadril,
  rosca, extensão, elevação lateral, core, panturrilha, cardio) — mais
  o botão "Ver no YouTube" para quem quer a demonstração real em vídeo
- **Gerador automático de ficha de treino**: idade, peso, altura, objetivo,
  nível de experiência, local de treino (academia ou casa/calistenia) e
  dias/tempo disponíveis → gera a divisão de treino (split), escolhe os
  exercícios e sugere séries/repetições. Regenerar a ficha sempre reflete
  exatamente os dias selecionados (os demais dias da semana são esvaziados)
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
- 100% offline via Service Worker depois da primeira visita

## Próximos passos sugeridos (posso gerar se você quiser)

- Expandir a biblioteca de ~113 para 300+ exercícios
- Adicionar fotos/GIFs reais dos exercícios (precisaria que você forneça
  imagens próprias ou licenciadas — não posso reproduzir conteúdo de
  terceiros com direitos autorais)
- Gerar um QR Code real (atualmente mostra o link em texto) via um
  encoder leve embutido
- Editor de treino com arrastar-e-soltar para reordenar exercícios
- Suporte a múltiplos perfis/usuários no mesmo aparelho
- Opção "Casa com halteres" como nível intermediário entre calistenia
  pura e academia completa
