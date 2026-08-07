/* ================================================================
   GYM PRO — nutrition.js
   Recomendações gerais de cardio, alimentação, água e proteína,
   calculadas a partir do peso e objetivo cadastrados no perfil.

   IMPORTANTE: são diretrizes gerais de referência (baseadas em
   práticas comuns de nutrição esportiva), não uma prescrição
   individualizada. O app sempre deixa isso explícito na tela e
   recomenda acompanhamento profissional (nutricionista/médico)
   para casos específicos, restrições alimentares ou condições
   de saúde — este app não substitui esse acompanhamento.
================================================================ */

const Nutrition = (() => {

  /* ----------------------------------------------------------------
     Diretrizes por objetivo. Faixas de proteína em g/kg/dia seguem
     recomendações comuns de nutrição esportiva (ex: posicionamentos
     da ISSN para população treinada). Água usa a referência geral
     de ~35 ml/kg/dia como ponto de partida.
  ---------------------------------------------------------------- */
  const GUIDELINES = {
    hipertrofia: {
      label: 'Hipertrofia',
      proteinRange: [1.6, 2.2],
      waterMlPerKg: 35,
      calorieStrategy: 'Superávit calórico leve a moderado (cerca de 300–500 kcal acima da sua manutenção), para dar "combustível" ao ganho de massa muscular sem acumular gordura em excesso.',
      mealTips: [
        'Distribua a proteína em 3–5 refeições ao longo do dia, em vez de concentrar tudo em uma só',
        'Priorize carboidratos de qualidade perto do treino (antes e depois) para ter energia e recuperar o glicogênio muscular',
        'Não corte gorduras boas (azeite, oleaginosas, abacate) — elas ajudam na produção hormonal'
      ],
      cardio: {
        type: 'Leve (LISS)',
        frequency: '2x por semana',
        duration: '15–20 min',
        description: 'Cardio leve após o treino de força ou em dias separados, só para manter a saúde cardiovascular sem "roubar" energia da recuperação muscular. Evite cardio longo/intenso demais, que pode atrapalhar o ganho de massa.'
      }
    },
    emagrecimento: {
      label: 'Emagrecimento',
      proteinRange: [1.8, 2.4],
      waterMlPerKg: 35,
      calorieStrategy: 'Déficit calórico moderado (cerca de 400–600 kcal abaixo da sua manutenção) — um déficit muito agressivo tende a causar perda de massa muscular e efeito sanfona. Uma perda de ~0,5 a 1% do peso corporal por semana costuma ser um ritmo sustentável.',
      mealTips: [
        'Mantenha a proteína alta em cada refeição — isso ajuda a preservar massa muscular durante o déficit e dá mais saciedade',
        'Priorize alimentos com maior volume e fibra (vegetais, frutas) para saciar com menos calorias',
        'Reduza líquidos calóricos (refrigerante, suco industrializado, álcool), que somam calorias sem saciar'
      ],
      cardio: {
        type: 'Misto (LISS + HIIT)',
        frequency: '4–5x por semana',
        duration: '25–40 min',
        description: 'Combine 2–3 sessões de cardio contínuo moderado (LISS) com 1–2 sessões intervaladas (HIIT) por semana. O HIIT é eficiente em pouco tempo; o LISS é mais fácil de recuperar e pode ser feito com mais frequência.'
      }
    },
    forca: {
      label: 'Força',
      proteinRange: [1.6, 2.2],
      waterMlPerKg: 35,
      calorieStrategy: 'Calorias de manutenção ou leve superávit — o foco é ter energia suficiente para treinos intensos e recuperar bem entre as sessões, sem o objetivo primário ser mudar a composição corporal.',
      mealTips: [
        'Coma uma refeição com carboidrato 2–3h antes do treino para ter energia nos levantamentos pesados',
        'Não treine em jejum prolongado se o objetivo é desempenho máximo em cargas altas',
        'Priorize sono e recuperação tanto quanto a alimentação — força depende muito de recuperação do sistema nervoso'
      ],
      cardio: {
        type: 'Mínimo (LISS)',
        frequency: '1–2x por semana',
        duration: '10–15 min',
        description: 'Cardio bem leve, só para saúde cardiovascular geral e recuperação ativa. Excesso de cardio pode interferir na recuperação e no ganho de força — mantenha curto e opcional.'
      }
    },
    resistencia: {
      label: 'Resistência',
      proteinRange: [1.2, 1.6],
      waterMlPerKg: 40,
      calorieStrategy: 'Calorias de manutenção, com atenção especial aos carboidratos — eles são o principal combustível para atividades de resistência prolongadas.',
      mealTips: [
        'Reponha carboidratos logo após treinos longos para acelerar a recuperação do glicogênio',
        'Em treinos com mais de 60–90 min, considere hidratação com eletrólitos, não só água pura',
        'Não negligencie a proteína mesmo com o foco em resistência — ela ajuda na recuperação dos tecidos'
      ],
      cardio: {
        type: 'Contínuo + intervalado',
        frequency: '4–6x por semana',
        duration: '30–60 min',
        description: 'A maior parte dos treinos deve ser em intensidade moderada (consegue conversar frases curtas), com 1–2 sessões mais intensas/intervaladas por semana para melhorar o limiar.'
      }
    },
    saude: {
      label: 'Saúde Geral',
      proteinRange: [0.8, 1.2],
      waterMlPerKg: 30,
      calorieStrategy: 'Calorias de manutenção, com foco em qualidade e variedade alimentar mais do que em números exatos — priorize alimentos minimamente processados.',
      mealTips: [
        'Monte o prato com metade de vegetais/frutas, um quarto de proteína e um quarto de carboidrato integral como referência simples',
        'Reduza o consumo de ultraprocessados e açúcar de adição no dia a dia',
        'Coma com regularidade — pular refeições costuma levar a compensações depois'
      ],
      cardio: {
        type: 'Moderado (LISS)',
        frequency: '5x por semana',
        duration: '30 min',
        description: 'Segue a recomendação geral da OMS de ~150 min/semana de atividade aeróbica moderada — pode ser caminhada rápida, bike, natação, o que for sustentável pra sua rotina.'
      }
    }
  };

  /* ----------------------------------------------------------------
     Calcula o plano completo a partir do perfil salvo (peso + objetivo).
     Retorna null se não houver peso cadastrado (não dá pra calcular
     proteína/água sem isso).
  ---------------------------------------------------------------- */
  function computePlan(profile) {
    const guideline = GUIDELINES[profile?.goal] || GUIDELINES.hipertrofia;
    const weight = profile?.weight || null;

    const proteinMin = weight ? Math.round(weight * guideline.proteinRange[0]) : null;
    const proteinMax = weight ? Math.round(weight * guideline.proteinRange[1]) : null;

    let waterMl = weight ? Math.round(weight * guideline.waterMlPerKg) : null;
    // Ajuste extra para quem treina com alta frequência (mais suor/perda hídrica)
    if (waterMl && profile?.weekDaysGoal >= 5) waterMl += 500;

    return {
      goalLabel: guideline.label,
      weight,
      proteinMin,
      proteinMax,
      waterMl,
      waterLiters: waterMl ? Math.round(waterMl / 100) / 10 : null,
      calorieStrategy: guideline.calorieStrategy,
      mealTips: guideline.mealTips,
      cardio: guideline.cardio
    };
  }

  return { GUIDELINES, computePlan };
})();

window.Nutrition = Nutrition;
