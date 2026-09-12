// Os ids são fixos no código, nunca sorteados em execução: os dois celulares fazem o seed do mesmo
// catálogo compartilhado, e id gerado em cada aparelho duplicaria os 21 exercícios na nuvem.
//
// O nome diz o equipamento quando ele não é máquina, porque a tela não mostra isso em outro
// lugar. Máquina é o caso de 14 dos 21 e fica implícita: escrever "na máquina" em dois terços
// da lista só faz o olho procurar a diferença que não existe.
const TREINOS = {
  A: [
    { id: "7057e1b0-2f42-4605-b3d8-1da02b04d24f", nome: "Puxada frontal aberta no cabo",     aparelho: "4",     equipamento: "cabo",     series: 3, reps: 12, cod: 541,  grupos: ["costas"] },
    { id: "c289fd64-2819-4a42-863e-0fb7fe14ee43", nome: "Pull down supinado",                aparelho: "2",     equipamento: "maquina",  series: 3, reps: 12, cod: 1036, grupos: ["costas", "biceps"] },
    { id: "76d614e3-a9e5-45dc-8530-5b53b07e9461", nome: "Remada baixa aberta no cabo",       aparelho: "4",     equipamento: "cabo",     series: 3, reps: 12, cod: 268,  grupos: ["costas"] },
    { id: "5c0b7b51-9148-427a-8817-62a755d092f0", nome: "Crucifixo invertido no voador",     aparelho: "27",    equipamento: "maquina",  series: 3, reps: 12, cod: 1085, grupos: ["ombro", "costas"] },
    { id: "895b05a8-4c94-4fa4-ad69-69273ed3bd33", nome: "Remada articulada aberta",          aparelho: "5",     equipamento: "maquina",  series: 3, reps: 12, cod: 273,  grupos: ["costas"] },
    { id: "231f9a6f-65fd-434c-a62e-0f1787494fd4", nome: "Rosca direta com halteres",         aparelho: "em pé", equipamento: "halteres", series: 3, reps: 12, cod: 101,  grupos: ["biceps"] },
    // Fica na abreviação crua: ninguém confirmou se `CB I.` é cabo inferior, e chutar por extenso
    // seria afirmar na tela algo que não se sabe. Quem treina reconhece a sigla.
    { id: "b65648a8-199e-464d-be8e-78b5f2935c6f", nome: "Rosca direta W CB I.",              aparelho: "17",    equipamento: "cabo",     series: 3, reps: 12, cod: 119,  grupos: ["biceps"] }
  ],
  B: [
    { id: "473347d7-babd-41cf-a0fb-ac0222f6a3f4", nome: "Voador aberto",                     aparelho: "27",    equipamento: "maquina",  series: 3, reps: 12, cod: 1076, grupos: ["peito"] },
    { id: "7592bac6-7032-4405-ace3-f5f600227b15", nome: "Supino plano articulado",           aparelho: "47",    equipamento: "maquina",  series: 3, reps: 12, cod: 1113, grupos: ["peito", "triceps"] },
    { id: "25e0e4b7-e2c7-48af-b1f1-1c5b4a857570", nome: "Supino inclinado articulado",       aparelho: "13",    equipamento: "maquina",  series: 3, reps: 12, cod: 1053, grupos: ["peito", "ombro", "triceps"] },
    { id: "684b4ef1-c6cc-4dc9-ab1f-d3a18b331335", nome: "Crucifixo inclinado com halteres",  aparelho: "16/25", equipamento: "halteres", series: 3, reps: 12, cod: 200,  grupos: ["peito"] },
    { id: "0901767e-9ced-47c3-9e60-f50f788cf82f", nome: "Desenvolvimento aberto",            aparelho: "18",    equipamento: "maquina",  series: 3, reps: 12, cod: 579,  grupos: ["ombro", "triceps"] },
    { id: "f2645694-3b9f-45e3-937a-21cc152e54d6", nome: "Tríceps pulley com barra W",        aparelho: "17/40", equipamento: "cabo",     series: 3, reps: 12, cod: 333,  grupos: ["triceps"] },
    { id: "4cd63d78-9a69-4ec0-a70b-4c64d4b0f32e", nome: "Tríceps testa",                     aparelho: "50",    equipamento: "maquina",  series: 3, reps: 12, cod: 1242, grupos: ["triceps"] }
  ],
  C: [
    { id: "1866f756-f1dc-4814-8ad1-bd787bfde6c0", nome: "Extensão de pernas",                aparelho: "6",     equipamento: "maquina",  series: 3, reps: 12, cod: 63,   grupos: ["quadriceps"] },
    { id: "300c03dc-f287-4780-a0d7-0705750c1665", nome: "Flexão de pernas sentado",          aparelho: "30",    equipamento: "maquina",  series: 3, reps: 12, cod: 1101, grupos: ["posterior"] },
    { id: "8b5a088d-29a4-4b54-8fc9-7815d715291e", nome: "Leg press 45 graus",                aparelho: "8",     equipamento: "maquina",  series: 3, reps: 12, cod: 59,   grupos: ["quadriceps", "gluteo"] },
    { id: "80facbe0-ed5c-4bd0-89a6-f2e36b9f1a2e", nome: "Agachamento squat articulado",      aparelho: "49",    equipamento: "maquina",  series: 3, reps: 12, cod: 1125, grupos: ["quadriceps", "gluteo"] },
    { id: "9f32f7a1-bf59-4e24-8d15-3f5488f0d8d8", nome: "Abdução",                           aparelho: "37",    equipamento: "maquina",  series: 3, reps: 12, cod: 1104, grupos: ["gluteo"] },
    { id: "ae7d7ffa-4112-49f5-a9e3-20bd832061e0", nome: "Adução",                            aparelho: "21",    equipamento: "maquina",  series: 3, reps: 12, cod: 220,  grupos: ["adutor"] },
    { id: "435f82ad-c840-4ef7-9117-58127ca7e922", nome: "Panturrilha sentado com anilha",    aparelho: "step",  equipamento: "anilha",   series: 4, reps: 10, cod: 247,  grupos: ["panturrilha"] }
  ]
};

// A ficha da Shine, transcrita da folha da academia em 2026-09-11. Lombar e abdômen entraram na
// lista de grupos por ela. Barra no aparelho é "um ou outro", como na ficha do Sun.
const TREINOS_SHINE = {
  A: [
    { id: "5b000001-0000-4000-8000-000000000001", nome: "Extensão de pernas",                 aparelho: "6",     equipamento: "maquina", series: 3, reps: 12, cod: 63,   grupos: ["quadriceps"] },
    { id: "5b000002-0000-4000-8000-000000000002", nome: "Flexão de pernas sentado",           aparelho: "30",    equipamento: "maquina", series: 3, reps: 12, cod: 1101, grupos: ["posterior"] },
    { id: "5b000003-0000-4000-8000-000000000003", nome: "Leg press 45 graus",                 aparelho: "8",     equipamento: "maquina", series: 3, reps: 12, cod: 59,   grupos: ["quadriceps", "gluteo"] },
    { id: "5b000004-0000-4000-8000-000000000004", nome: "Abdução",                            aparelho: "37",    equipamento: "maquina", series: 3, reps: 12, cod: 1104, grupos: ["gluteo"] },
    { id: "5b000005-0000-4000-8000-000000000005", nome: "Adução",                             aparelho: "21",    equipamento: "maquina", series: 3, reps: 12, cod: 220,  grupos: ["adutor"] },
    { id: "5b000006-0000-4000-8000-000000000006", nome: "Agachamento hack",                   aparelho: "50",    equipamento: "maquina", series: 3, reps: 12, cod: 1230, grupos: ["quadriceps", "gluteo"] },
    { id: "5b000007-0000-4000-8000-000000000007", nome: "Panturrilha livre em pé",            aparelho: "em pé", equipamento: "livre",   series: 3, reps: 12, cod: 248,  grupos: ["panturrilha"] }
  ],
  B: [
    { id: "5b000008-0000-4000-8000-000000000008", nome: "Flexão de pernas deitado",           aparelho: "7",     equipamento: "maquina", series: 3, reps: 12, cod: 1028, grupos: ["posterior"] },
    { id: "5b000009-0000-4000-8000-000000000009", nome: "Agachamento sumô no belt squat",     aparelho: "61",    equipamento: "maquina", series: 3, reps: 12, cod: 1208, grupos: ["gluteo", "quadriceps"] },
    { id: "5b000010-0000-4000-8000-000000000010", nome: "Elevação pélvica",                   aparelho: "60",    equipamento: "maquina", series: 3, reps: 12, cod: 1201, grupos: ["gluteo"] },
    { id: "5b000011-0000-4000-8000-000000000011", nome: "Glúteo em pé",                       aparelho: "9",     equipamento: "maquina", series: 3, reps: 12, cod: 250,  grupos: ["gluteo"] },
    { id: "5b000012-0000-4000-8000-000000000012", nome: "Glúteo em pé no cabo, insistência",  aparelho: "17/40", equipamento: "cabo",    series: 3, reps: 12, cod: 253,  grupos: ["gluteo"] },
    { id: "5b000013-0000-4000-8000-000000000013", nome: "Lombar a 45 graus",                  aparelho: "35",    equipamento: "maquina", series: 3, reps: 12, cod: 128,  grupos: ["lombar"] },
    { id: "5b000014-0000-4000-8000-000000000014", nome: "Flexão abdominal a 90 graus no banco", tipo: "corpo", aparelho: "chão", equipamento: "livre", series: 3, reps: 12, cod: 138, grupos: ["abdomen"] }
  ],
  C: [
    { id: "5b000015-0000-4000-8000-000000000015", nome: "Elevação lateral sentado",           aparelho: "25",    equipamento: "maquina", series: 3, reps: 12, cod: 600,  grupos: ["ombro"] },
    { id: "5b000016-0000-4000-8000-000000000016", nome: "Elevação frontal com anilha",        aparelho: "anilha", equipamento: "anilha", series: 3, reps: 12, cod: 762,  grupos: ["ombro"] },
    { id: "5b000017-0000-4000-8000-000000000017", nome: "Remada baixa com triângulo",         aparelho: "4",     equipamento: "cabo",    series: 3, reps: 12, cod: 497,  grupos: ["costas"] },
    { id: "5b000018-0000-4000-8000-000000000018", nome: "Pull down supinado",                 aparelho: "2",     equipamento: "maquina", series: 3, reps: 12, cod: 1036, grupos: ["costas", "biceps"] },
    { id: "5b000019-0000-4000-8000-000000000019", nome: "Remada articulada aberta supinada",  aparelho: "5",     equipamento: "maquina", series: 3, reps: 12, cod: 276,  grupos: ["costas"] },
    { id: "5b000020-0000-4000-8000-000000000020", nome: "Rosca direta em pé",                 aparelho: "em pé", equipamento: "livre",   series: 3, reps: 12, cod: 97,   grupos: ["biceps"] },
    { id: "5b000021-0000-4000-8000-000000000021", nome: "Tríceps pulley",                     aparelho: "17/40", equipamento: "cabo",    series: 3, reps: 12, cod: 332,  grupos: ["triceps"] }
  ]
};

// Um treino curto, com os três tipos de exercício que o app entende, para quem abre o app pela
// primeira vez ver a tela cheia sem mexer no treino de ninguém. Os dois últimos nascem arquivados:
// existiram, saíram da lista e continuam no histórico, que é o caminho que a fase 4 vai usar para
// remover exercício sem apagar o que foi levantado.
const TREINOS_EXEMPLO = {
  A: [
    { id: "e0000001-0000-4000-8000-000000000001", nome: "Puxada frontal no cabo", aparelho: "4", series: 3, reps: 12, cod: 541, grupos: ["costas"] },
    { id: "e0000002-0000-4000-8000-000000000002", nome: "Supino plano articulado", aparelho: "47", series: 3, reps: 12, cod: 1113, grupos: ["peito", "triceps"] },
    { id: "e0000003-0000-4000-8000-000000000003", nome: "Flexão de braço", tipo: "corpo", series: 3, reps: 12, aparelho: "livre", cod: 0, grupos: ["peito", "triceps"] },
    { id: "e0000004-0000-4000-8000-000000000004", nome: "Esteira", tipo: "tempo", unidade: "km/h", series: 1, reps: null, aparelho: "40", cod: 0, grupos: ["quadriceps", "panturrilha"] }
  ],
  B: [
    { id: "e0000005-0000-4000-8000-000000000005", nome: "Leg press 45 graus", aparelho: "8", series: 3, reps: 12, cod: 59, grupos: ["quadriceps", "gluteo"] },
    { id: "e0000006-0000-4000-8000-000000000006", nome: "Abdominal na prancha", tipo: "corpo", series: 3, reps: 15, aparelho: "livre", cod: 0, grupos: ["quadriceps"] },
    { id: "e0000007-0000-4000-8000-000000000007", nome: "Bicicleta ergométrica", tipo: "tempo", unidade: "nível", series: 1, reps: null, aparelho: "41", cod: 0, grupos: ["quadriceps"] }
  ],
  // O exemplo tem um treino por letra que existe, senão a aba do treino vazio abre numa lista
  // sem nada e parece que o app quebrou.
  C: [
    { id: "e0000010-0000-4000-8000-000000000010", nome: "Desenvolvimento aberto", aparelho: "18", series: 3, reps: 12, cod: 579, grupos: ["ombro", "triceps"] },
    { id: "e0000011-0000-4000-8000-000000000011", nome: "Rosca direta com halteres", aparelho: "em pé", series: 3, reps: 12, cod: 101, grupos: ["biceps"] },
    { id: "e0000012-0000-4000-8000-000000000012", nome: "Elevação de pernas na barra", tipo: "corpo", series: 3, reps: 10, aparelho: "livre", cod: 0, grupos: ["quadriceps"] }
  ]
};

const ARQUIVADOS_EXEMPLO = [
  { id: "e0000008-0000-4000-8000-000000000008", nome: "Remada curvada com barra", aparelho: "livre", series: 3, reps: 10, cod: 0, grupos: ["costas", "biceps"], letra: "A", arquivado: true },
  { id: "e0000009-0000-4000-8000-000000000009", nome: "Elíptico", tipo: "tempo", unidade: "nível", series: 1, reps: null, aparelho: "44", cod: 0, grupos: ["quadriceps"], letra: "B", arquivado: true }
];

// O catálogo é de quem treina: cada perfil tem a sua ficha, e o Exemplo tem a dele para poder
// ser mexido à vontade sem tocar no treino de verdade de ninguém.
const PERFIS = { sun: "Sun", shine: "Shine", example: "Exemplo" };
const FICHA_DE = { sun: TREINOS, shine: TREINOS_SHINE, example: TREINOS_EXEMPLO };
const DONO_DO_EXEMPLO = ["example"];

// UID de cada conta no Firebase. Não é segredo: a regra do Firestore já os carrega, e é ela
// quem protege. O admin não tem perfil próprio, ele escolhe de quem é o treino na tela.
const CONTAS = {
  admin: "AgQFNVKztZbn72zzti2EESvbzM83",
  sun: "SmKRdOOcHQaZc8lE16srwiFl81m1",
  shine: "CpJtwfknmbcjrkySbMmqfSsNYd22"
};
