/* ================================================================
   GYM PRO — exercises.js
   Biblioteca de exercícios cadastrados no app.
   Cada exercício segue a estrutura:
   {
     id, name, group, secondary, level, equipment,
     description, mistakes, tips, youtube, image
   }

   Observação: as imagens/gifs apontam para /images/exercicios/ —
   adicione os arquivos correspondentes nessa pasta (ou troque pelos
   seus próprios). Sem internet, o app usa um placeholder automático.
================================================================ */

const EXERCISE_GROUPS = [
  'Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps',
  'Pernas', 'Panturrilha', 'Abdômen', 'Cardio'
];

const EQUIPMENT_TYPES = [
  'Barra', 'Halteres', 'Máquina', 'Cabo/Polia', 'Peso Corporal', 'Kettlebell', 'Elástico'
];

const LEVELS = ['Iniciante', 'Intermediário', 'Avançado'];

/* ----------------------------------------------------------------
   Fábrica de exercícios — gera o objeto completo a partir de dados
   resumidos, garantindo que nenhum campo fique vazio e evitando
   duplicação de texto/estrutura entre os mais de 100 cadastros.
---------------------------------------------------------------- */
/* Vídeos demonstrativos curados manualmente (verificados) para os
   exercícios mais comuns — permitem reprodução EMBUTIDA no app.
   Para os demais exercícios (ainda sem vídeo curado), o botão abre
   uma busca no YouTube em nova aba. Isso evita embutir vídeos de
   terceiros sem verificar previamente se existem/funcionam. */
const CURATED_VIDEOS = {
  'peito-01': 'vIGvt-vgrvY',   // Supino Reto com Barra
  'pernas-01': 'kOgcM3NCYA0',  // Agachamento Livre com Barra
  'costas-09': 'N3O3gtNM7GY',  // Levantamento Terra
  'costas-01': 'oH-NrOccUOg',  // Barra Fixa (Pull-up)
  'costas-02': 'BOW9my4J_ek',  // Puxada Frontal no Pulley
  'ombro-01': 'dxQCyYawS-0'    // Desenvolvimento Militar com Barra
};

function buildExercise(id, name, group, secondary, level, equipment, youtubeQuery) {
  return {
    id,
    name,
    group,
    secondary,
    level,
    equipment,
    pattern: window.Pictograms ? window.Pictograms.inferPattern(name, group) : 'generic',
    description: `${name} é um exercício focado em ${group.toLowerCase()}, trabalhando também ${secondary.toLowerCase()}. Execute o movimento de forma controlada, respirando de forma constante (expire no esforço, inspire no retorno) e mantendo a postura estável do início ao fim da série.`,
    mistakes: `Usar carga excessiva perdendo a amplitude completa do movimento; balançar o corpo para gerar impulso; não controlar a fase excêntrica (descida); prender a respiração durante todo o movimento.`,
    tips: `Priorize a técnica antes da carga. Faça 1-2 séries de aquecimento com peso leve, mantenha o core contraído e busque uma amplitude de movimento completa para maximizar o recrutamento muscular.`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery || name)}`,
    videoId: CURATED_VIDEOS[id] || null,
    image: `images/exercicios/${id}.jpg`
  };
}

/* ----------------------------------------------------------------
   BASE DE DADOS — organizada por grupo muscular
---------------------------------------------------------------- */
const EXERCISE_DATA = [
  // ===================== PEITO =====================
  ['peito-01', 'Supino Reto com Barra', 'Peito', 'Tríceps, Ombro', 'Intermediário', 'Barra'],
  ['peito-02', 'Supino Inclinado com Barra', 'Peito', 'Ombro, Tríceps', 'Intermediário', 'Barra'],
  ['peito-03', 'Supino Declinado com Barra', 'Peito', 'Tríceps', 'Intermediário', 'Barra'],
  ['peito-04', 'Supino Reto com Halteres', 'Peito', 'Tríceps, Ombro', 'Iniciante', 'Halteres'],
  ['peito-05', 'Supino Inclinado com Halteres', 'Peito', 'Ombro', 'Iniciante', 'Halteres'],
  ['peito-06', 'Crucifixo Reto com Halteres', 'Peito', 'Ombro', 'Iniciante', 'Halteres'],
  ['peito-07', 'Crucifixo Inclinado com Halteres', 'Peito', 'Ombro', 'Intermediário', 'Halteres'],
  ['peito-08', 'Crossover no Cabo', 'Peito', 'Ombro', 'Intermediário', 'Cabo/Polia'],
  ['peito-09', 'Peck Deck (Voador)', 'Peito', 'Ombro', 'Iniciante', 'Máquina'],
  ['peito-10', 'Flexão de Braço', 'Peito', 'Tríceps, Core', 'Iniciante', 'Peso Corporal'],
  ['peito-11', 'Flexão com Pés Elevados', 'Peito', 'Ombro, Tríceps', 'Intermediário', 'Peso Corporal'],
  ['peito-12', 'Supino Máquina', 'Peito', 'Tríceps', 'Iniciante', 'Máquina'],
  ['peito-13', 'Paralelas (Mergulho para Peito)', 'Peito', 'Tríceps', 'Avançado', 'Peso Corporal'],
  ['peito-14', 'Pullover com Halteres', 'Peito', 'Costas, Tríceps', 'Intermediário', 'Halteres'],

  // ===================== COSTAS =====================
  ['costas-01', 'Barra Fixa (Pull-up)', 'Costas', 'Bíceps', 'Avançado', 'Peso Corporal'],
  ['costas-02', 'Puxada Frontal no Pulley', 'Costas', 'Bíceps', 'Iniciante', 'Cabo/Polia'],
  ['costas-03', 'Puxada Atrás da Nuca', 'Costas', 'Ombro', 'Intermediário', 'Cabo/Polia'],
  ['costas-04', 'Remada Curvada com Barra', 'Costas', 'Bíceps, Lombar', 'Intermediário', 'Barra'],
  ['costas-05', 'Remada Cavalinho (T-bar)', 'Costas', 'Bíceps', 'Intermediário', 'Barra'],
  ['costas-06', 'Remada Unilateral com Halteres', 'Costas', 'Bíceps', 'Iniciante', 'Halteres'],
  ['costas-07', 'Remada Baixa no Cabo', 'Costas', 'Bíceps', 'Iniciante', 'Cabo/Polia'],
  ['costas-08', 'Remada Máquina Articulada', 'Costas', 'Bíceps', 'Iniciante', 'Máquina'],
  ['costas-09', 'Levantamento Terra', 'Costas', 'Pernas, Glúteos', 'Avançado', 'Barra'],
  ['costas-10', 'Levantamento Terra Romeno', 'Costas', 'Posterior de Coxa, Glúteos', 'Intermediário', 'Barra'],
  ['costas-11', 'Hiperextensão Lombar', 'Costas', 'Glúteos', 'Iniciante', 'Peso Corporal'],
  ['costas-12', 'Pull-down com Corda', 'Costas', 'Bíceps', 'Iniciante', 'Cabo/Polia'],
  ['costas-13', 'Face Pull', 'Costas', 'Ombro Posterior', 'Iniciante', 'Cabo/Polia'],
  ['costas-14', 'Remada Invertida (Australian Pull-up)', 'Costas', 'Bíceps', 'Iniciante', 'Peso Corporal'],
  ['costas-15', 'Remada com Elástico', 'Costas', 'Bíceps', 'Iniciante', 'Elástico'],

  // ===================== OMBRO =====================
  ['ombro-01', 'Desenvolvimento Militar com Barra', 'Ombro', 'Tríceps', 'Intermediário', 'Barra'],
  ['ombro-02', 'Desenvolvimento com Halteres', 'Ombro', 'Tríceps', 'Iniciante', 'Halteres'],
  ['ombro-03', 'Desenvolvimento Arnold', 'Ombro', 'Tríceps', 'Intermediário', 'Halteres'],
  ['ombro-04', 'Elevação Lateral com Halteres', 'Ombro', '-', 'Iniciante', 'Halteres'],
  ['ombro-05', 'Elevação Frontal com Halteres', 'Ombro', '-', 'Iniciante', 'Halteres'],
  ['ombro-06', 'Elevação Lateral no Cabo', 'Ombro', '-', 'Intermediário', 'Cabo/Polia'],
  ['ombro-07', 'Crucifixo Invertido (Deltoide Posterior)', 'Ombro', 'Costas', 'Iniciante', 'Halteres'],
  ['ombro-08', 'Remada Alta com Barra', 'Ombro', 'Trapézio', 'Intermediário', 'Barra'],
  ['ombro-09', 'Encolhimento de Ombros (Shrug)', 'Ombro', 'Trapézio', 'Iniciante', 'Halteres'],
  ['ombro-10', 'Desenvolvimento Máquina', 'Ombro', 'Tríceps', 'Iniciante', 'Máquina'],
  ['ombro-11', 'Face Pull com Corda', 'Ombro', 'Costas', 'Iniciante', 'Cabo/Polia'],
  ['ombro-12', 'Flexão Pike (Ombro no Solo)', 'Ombro', 'Tríceps', 'Intermediário', 'Peso Corporal'],
  ['ombro-13', 'Elevação Lateral com Elástico', 'Ombro', '-', 'Iniciante', 'Elástico'],
  ['ombro-14', 'Pike Push-up com Pés Elevados', 'Ombro', 'Tríceps', 'Avançado', 'Peso Corporal'],

  // ===================== BÍCEPS =====================
  ['biceps-01', 'Rosca Direta com Barra', 'Bíceps', 'Antebraço', 'Iniciante', 'Barra'],
  ['biceps-02', 'Rosca Alternada com Halteres', 'Bíceps', 'Antebraço', 'Iniciante', 'Halteres'],
  ['biceps-03', 'Rosca Martelo', 'Bíceps', 'Antebraço', 'Iniciante', 'Halteres'],
  ['biceps-04', 'Rosca Scott (Banco Scott)', 'Bíceps', '-', 'Intermediário', 'Barra'],
  ['biceps-05', 'Rosca Concentrada', 'Bíceps', '-', 'Iniciante', 'Halteres'],
  ['biceps-06', 'Rosca no Cabo', 'Bíceps', 'Antebraço', 'Iniciante', 'Cabo/Polia'],
  ['biceps-07', 'Rosca 21', 'Bíceps', 'Antebraço', 'Avançado', 'Barra'],
  ['biceps-08', 'Rosca Inversa', 'Bíceps', 'Antebraço', 'Intermediário', 'Barra'],
  ['biceps-09', 'Rosca no Cabo Corda', 'Bíceps', 'Antebraço', 'Iniciante', 'Cabo/Polia'],
  ['biceps-10', 'Rosca com Elástico', 'Bíceps', 'Antebraço', 'Iniciante', 'Elástico'],
  ['biceps-11', 'Barra Fixa Supinada (Chin-up)', 'Bíceps', 'Costas', 'Avançado', 'Peso Corporal'],

  // ===================== TRÍCEPS =====================
  ['triceps-01', 'Tríceps Testa com Barra', 'Tríceps', '-', 'Intermediário', 'Barra'],
  ['triceps-02', 'Tríceps Corda no Cabo', 'Tríceps', '-', 'Iniciante', 'Cabo/Polia'],
  ['triceps-03', 'Tríceps Francês com Halteres', 'Tríceps', '-', 'Intermediário', 'Halteres'],
  ['triceps-04', 'Mergulho no Banco (Bench Dips)', 'Tríceps', 'Ombro', 'Iniciante', 'Peso Corporal'],
  ['triceps-05', 'Paralelas para Tríceps', 'Tríceps', 'Peito', 'Avançado', 'Peso Corporal'],
  ['triceps-06', 'Tríceps Coice (Kickback)', 'Tríceps', '-', 'Iniciante', 'Halteres'],
  ['triceps-07', 'Tríceps Barra na Polia (Pushdown)', 'Tríceps', '-', 'Iniciante', 'Cabo/Polia'],
  ['triceps-08', 'Supino Fechado', 'Tríceps', 'Peito', 'Intermediário', 'Barra'],
  ['triceps-09', 'Extensão de Tríceps Unilateral no Cabo', 'Tríceps', '-', 'Intermediário', 'Cabo/Polia'],
  ['triceps-10', 'Tríceps com Elástico', 'Tríceps', '-', 'Iniciante', 'Elástico'],

  // ===================== PERNAS =====================
  ['pernas-01', 'Agachamento Livre com Barra', 'Pernas', 'Glúteos, Core', 'Avançado', 'Barra'],
  ['pernas-02', 'Agachamento Frontal', 'Pernas', 'Core', 'Avançado', 'Barra'],
  ['pernas-03', 'Leg Press 45°', 'Pernas', 'Glúteos', 'Iniciante', 'Máquina'],
  ['pernas-04', 'Cadeira Extensora', 'Pernas', '-', 'Iniciante', 'Máquina'],
  ['pernas-05', 'Cadeira Flexora', 'Pernas', 'Posterior de Coxa', 'Iniciante', 'Máquina'],
  ['pernas-06', 'Mesa Flexora', 'Pernas', 'Posterior de Coxa', 'Iniciante', 'Máquina'],
  ['pernas-07', 'Afundo (Passada) com Halteres', 'Pernas', 'Glúteos', 'Intermediário', 'Halteres'],
  ['pernas-08', 'Passada Búlgara', 'Pernas', 'Glúteos', 'Avançado', 'Halteres'],
  ['pernas-09', 'Cadeira Adutora', 'Pernas', 'Adutores', 'Iniciante', 'Máquina'],
  ['pernas-10', 'Cadeira Abdutora', 'Pernas', 'Glúteos', 'Iniciante', 'Máquina'],
  ['pernas-11', 'Stiff com Barra', 'Pernas', 'Posterior de Coxa, Glúteos', 'Intermediário', 'Barra'],
  ['pernas-12', 'Agachamento Búlgaro', 'Pernas', 'Glúteos', 'Avançado', 'Halteres'],
  ['pernas-13', 'Agachamento Sumô', 'Pernas', 'Glúteos, Adutores', 'Intermediário', 'Halteres'],
  ['pernas-14', 'Elevação Pélvica (Hip Thrust)', 'Pernas', 'Glúteos', 'Intermediário', 'Barra'],
  ['pernas-15', 'Agachamento Goblet', 'Pernas', 'Core', 'Iniciante', 'Kettlebell'],
  ['pernas-16', 'Agachamento Livre (Peso Corporal)', 'Pernas', 'Glúteos', 'Iniciante', 'Peso Corporal'],
  ['pernas-17', 'Afundo sem Peso (Passada)', 'Pernas', 'Glúteos', 'Iniciante', 'Peso Corporal'],
  ['pernas-18', 'Agachamento Búlgaro (Peso Corporal)', 'Pernas', 'Glúteos', 'Intermediário', 'Peso Corporal'],
  ['pernas-19', 'Elevação Pélvica (Peso Corporal)', 'Pernas', 'Glúteos', 'Iniciante', 'Peso Corporal'],
  ['pernas-20', 'Agachamento Sumô (Peso Corporal)', 'Pernas', 'Adutores', 'Iniciante', 'Peso Corporal'],
  ['pernas-21', 'Agachamento Salto (Jump Squat)', 'Pernas', 'Panturrilha', 'Avançado', 'Peso Corporal'],
  ['pernas-22', 'Cadeira na Parede (Wall Sit)', 'Pernas', 'Core', 'Iniciante', 'Peso Corporal'],
  ['pernas-23', 'Passada Búlgara com Elástico', 'Pernas', 'Glúteos', 'Intermediário', 'Elástico'],

  // ===================== PANTURRILHA =====================
  ['pant-01', 'Panturrilha em Pé na Máquina', 'Panturrilha', '-', 'Iniciante', 'Máquina'],
  ['pant-02', 'Panturrilha Sentado', 'Panturrilha', '-', 'Iniciante', 'Máquina'],
  ['pant-03', 'Panturrilha no Leg Press', 'Panturrilha', '-', 'Iniciante', 'Máquina'],
  ['pant-04', 'Panturrilha Unilateral com Halteres', 'Panturrilha', '-', 'Intermediário', 'Halteres'],
  ['pant-05', 'Panturrilha no Step', 'Panturrilha', '-', 'Iniciante', 'Peso Corporal'],
  ['pant-06', 'Panturrilha em Pé sem Equipamento', 'Panturrilha', '-', 'Iniciante', 'Peso Corporal'],

  // ===================== ABDÔMEN =====================
  ['abdomen-01', 'Abdominal Supra (Crunch)', 'Abdômen', '-', 'Iniciante', 'Peso Corporal'],
  ['abdomen-02', 'Abdominal Infra (Elevação de Pernas)', 'Abdômen', '-', 'Intermediário', 'Peso Corporal'],
  ['abdomen-03', 'Prancha Isométrica', 'Abdômen', 'Core, Lombar', 'Iniciante', 'Peso Corporal'],
  ['abdomen-04', 'Prancha Lateral', 'Abdômen', 'Oblíquos', 'Intermediário', 'Peso Corporal'],
  ['abdomen-05', 'Abdominal Oblíquo (Bicicleta)', 'Abdômen', 'Oblíquos', 'Iniciante', 'Peso Corporal'],
  ['abdomen-06', 'Abdominal na Polia (Cable Crunch)', 'Abdômen', '-', 'Intermediário', 'Cabo/Polia'],
  ['abdomen-07', 'Elevação de Pernas na Barra Fixa', 'Abdômen', '-', 'Avançado', 'Peso Corporal'],
  ['abdomen-08', 'Roda Abdominal (Ab Wheel)', 'Abdômen', 'Core, Ombro', 'Avançado', 'Peso Corporal'],
  ['abdomen-09', 'Abdominal Máquina', 'Abdômen', '-', 'Iniciante', 'Máquina'],
  ['abdomen-10', 'Mountain Climber', 'Abdômen', 'Cardio', 'Intermediário', 'Peso Corporal'],

  // ===================== CARDIO =====================
  ['cardio-01', 'Esteira — Caminhada Inclinada', 'Cardio', 'Pernas', 'Iniciante', 'Máquina'],
  ['cardio-02', 'Esteira — Corrida', 'Cardio', 'Pernas', 'Intermediário', 'Máquina'],
  ['cardio-03', 'Bicicleta Ergométrica', 'Cardio', 'Pernas', 'Iniciante', 'Máquina'],
  ['cardio-04', 'Elíptico', 'Cardio', 'Corpo Todo', 'Iniciante', 'Máquina'],
  ['cardio-05', 'Pular Corda', 'Cardio', 'Panturrilha', 'Iniciante', 'Peso Corporal'],
  ['cardio-06', 'Burpee', 'Cardio', 'Corpo Todo', 'Avançado', 'Peso Corporal'],
  ['cardio-07', 'Polichinelo (Jumping Jack)', 'Cardio', 'Corpo Todo', 'Iniciante', 'Peso Corporal'],
  ['cardio-08', 'Remo Ergométrico', 'Cardio', 'Costas, Pernas', 'Intermediário', 'Máquina'],
  ['cardio-09', 'Escada (StairMaster)', 'Cardio', 'Pernas, Glúteos', 'Intermediário', 'Máquina'],
  ['cardio-10', 'Corda Naval (Battle Rope)', 'Cardio', 'Ombro, Core', 'Avançado', 'Peso Corporal']
];

/* Gera a lista final aplicando a fábrica de exercícios */
const EXERCISES = EXERCISE_DATA.map((row) => buildExercise(...row));

/* ----------------------------------------------------------------
   Helpers de busca / filtro reutilizados pelo ui.js
---------------------------------------------------------------- */
function findExerciseById(id) {
  return EXERCISES.find((ex) => ex.id === id) || null;
}

function searchExercises({ text = '', group = '', equipment = '', level = '' } = {}) {
  const query = text.trim().toLowerCase();
  return EXERCISES.filter((ex) => {
    const matchesText = !query || ex.name.toLowerCase().includes(query);
    const matchesGroup = !group || ex.group === group;
    const matchesEquipment = !equipment || ex.equipment === equipment;
    const matchesLevel = !level || ex.level === level;
    return matchesText && matchesGroup && matchesEquipment && matchesLevel;
  });
}

// Exposição global
window.EXERCISES = EXERCISES;
window.EXERCISE_GROUPS = EXERCISE_GROUPS;
window.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
window.LEVELS = LEVELS;
window.findExerciseById = findExerciseById;
window.searchExercises = searchExercises;
