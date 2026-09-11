// Os ids são fixos no código, nunca sorteados em execução: os dois celulares semeiam o mesmo
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
    { id: "b65648a8-199e-464d-be8e-78b5f2935c6f", nome: "Rosca direta com barra W no cabo",  aparelho: "17",    equipamento: "cabo",     series: 3, reps: 12, cod: 119,  grupos: ["biceps"] }
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

const PERFIS = { sun: "Sun", shine: "Shine" };
