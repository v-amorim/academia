// Ids are fixed in code, never generated at runtime: both phones seed the same shared catalog,
// and an id generated on each device would duplicate every exercise in the cloud.
//
// The name states the equipment when it is not a machine, because the screen shows that nowhere
// else. Machines are most of the list and stay implicit: writing "na máquina" on two thirds of
// the rows only makes the eye look for a difference that is not there.
const SUN_WORKOUTS = {
  A: [
    { id: "7057e1b0-2f42-4605-b3d8-1da02b04d24f", name: "Puxada frontal aberta no cabo",     station: "4",     equipment: "cable",     sets: 3, reps: 12, videoCode: 541,  muscles: ["back"] },
    { id: "c289fd64-2819-4a42-863e-0fb7fe14ee43", name: "Pull down supinado",                station: "2",     equipment: "machine",  sets: 3, reps: 12, videoCode: 1036, muscles: ["back", "biceps"] },
    { id: "76d614e3-a9e5-45dc-8530-5b53b07e9461", name: "Remada baixa aberta no cabo",       station: "4",     equipment: "cable",     sets: 3, reps: 12, videoCode: 268,  muscles: ["back"] },
    { id: "5c0b7b51-9148-427a-8817-62a755d092f0", name: "Crucifixo invertido no voador",     station: "27",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1085, muscles: ["shoulders", "back"] },
    { id: "895b05a8-4c94-4fa4-ad69-69273ed3bd33", name: "Remada articulada aberta",          station: "5",     equipment: "machine",  sets: 3, reps: 12, videoCode: 273,  muscles: ["back"] },
    { id: "231f9a6f-65fd-434c-a62e-0f1787494fd4", name: "Rosca direta com halteres",         station: "em pé", equipment: "dumbbells", sets: 3, reps: 12, videoCode: 101,  muscles: ["biceps"] },
    // Stays as the raw abbreviation: nobody confirmed that `CB I.` means low cable, and guessing the
    // full form would state on screen something unknown. Whoever trains recognizes the acronym.
    { id: "b65648a8-199e-464d-be8e-78b5f2935c6f", name: "Rosca direta W CB I.",              station: "17",    equipment: "cable",     sets: 3, reps: 12, videoCode: 119,  muscles: ["biceps"] }
  ],
  B: [
    { id: "473347d7-babd-41cf-a0fb-ac0222f6a3f4", name: "Voador aberto",                     station: "27",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1076, muscles: ["chest"] },
    { id: "7592bac6-7032-4405-ace3-f5f600227b15", name: "Supino plano articulado",           station: "47",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1113, muscles: ["chest", "triceps"] },
    { id: "25e0e4b7-e2c7-48af-b1f1-1c5b4a857570", name: "Supino inclinado articulado",       station: "13",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1053, muscles: ["chest", "shoulders", "triceps"] },
    { id: "684b4ef1-c6cc-4dc9-ab1f-d3a18b331335", name: "Crucifixo inclinado com halteres",  station: "16/25", equipment: "dumbbells", sets: 3, reps: 12, videoCode: 200,  muscles: ["chest"] },
    { id: "0901767e-9ced-47c3-9e60-f50f788cf82f", name: "Desenvolvimento aberto",            station: "18",    equipment: "machine",  sets: 3, reps: 12, videoCode: 579,  muscles: ["shoulders", "triceps"] },
    { id: "f2645694-3b9f-45e3-937a-21cc152e54d6", name: "Tríceps pulley com barra W",        station: "17/40", equipment: "cable",     sets: 3, reps: 12, videoCode: 333,  muscles: ["triceps"] },
    { id: "4cd63d78-9a69-4ec0-a70b-4c64d4b0f32e", name: "Tríceps testa",                     station: "50",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1242, muscles: ["triceps"] }
  ],
  C: [
    { id: "1866f756-f1dc-4814-8ad1-bd787bfde6c0", name: "Extensão de pernas",                station: "6",     equipment: "machine",  sets: 3, reps: 12, videoCode: 63,   muscles: ["quads"] },
    { id: "300c03dc-f287-4780-a0d7-0705750c1665", name: "Flexão de pernas sentado",          station: "30",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1101, muscles: ["hamstrings"] },
    { id: "8b5a088d-29a4-4b54-8fc9-7815d715291e", name: "Leg press 45 graus",                station: "8",     equipment: "machine",  sets: 3, reps: 12, videoCode: 59,   muscles: ["quads", "glutes"] },
    { id: "80facbe0-ed5c-4bd0-89a6-f2e36b9f1a2e", name: "Agachamento squat articulado",      station: "49",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1125, muscles: ["quads", "glutes"] },
    { id: "9f32f7a1-bf59-4e24-8d15-3f5488f0d8d8", name: "Abdução",                           station: "37",    equipment: "machine",  sets: 3, reps: 12, videoCode: 1104, muscles: ["glutes"] },
    { id: "ae7d7ffa-4112-49f5-a9e3-20bd832061e0", name: "Adução",                            station: "21",    equipment: "machine",  sets: 3, reps: 12, videoCode: 220,  muscles: ["adductors"] },
    { id: "435f82ad-c840-4ef7-9117-58127ca7e922", name: "Panturrilha sentado com anilha",    station: "step",  equipment: "plate",   sets: 4, reps: 10, videoCode: 247,  muscles: ["calves"] }
  ]
};

// Shine's plan, transcribed from the gym sheet on 2026-09-11. Lower back and abs joined the muscle
// list because of her. A slash in the station means "one or the other", as in Sun's plan.
const SHINE_WORKOUTS = {
  A: [
    { id: "5b000001-0000-4000-8000-000000000001", name: "Extensão de pernas",                 station: "6",     equipment: "machine", sets: 3, reps: 12, videoCode: 63,   muscles: ["quads"] },
    { id: "5b000002-0000-4000-8000-000000000002", name: "Flexão de pernas sentado",           station: "30",    equipment: "machine", sets: 3, reps: 12, videoCode: 1101, muscles: ["hamstrings"] },
    { id: "5b000003-0000-4000-8000-000000000003", name: "Leg press 45 graus",                 station: "8",     equipment: "machine", sets: 3, reps: 12, videoCode: 59,   muscles: ["quads", "glutes"] },
    { id: "5b000004-0000-4000-8000-000000000004", name: "Abdução",                            station: "37",    equipment: "machine", sets: 3, reps: 12, videoCode: 1104, muscles: ["glutes"] },
    { id: "5b000005-0000-4000-8000-000000000005", name: "Adução",                             station: "21",    equipment: "machine", sets: 3, reps: 12, videoCode: 220,  muscles: ["adductors"] },
    { id: "5b000006-0000-4000-8000-000000000006", name: "Agachamento hack",                   station: "50",    equipment: "machine", sets: 3, reps: 12, videoCode: 1230, muscles: ["quads", "glutes"] },
    { id: "5b000007-0000-4000-8000-000000000007", name: "Panturrilha livre em pé",            station: "em pé", equipment: "free",   sets: 3, reps: 12, videoCode: 248,  muscles: ["calves"] }
  ],
  B: [
    { id: "5b000008-0000-4000-8000-000000000008", name: "Flexão de pernas deitado",           station: "7",     equipment: "machine", sets: 3, reps: 12, videoCode: 1028, muscles: ["hamstrings"] },
    { id: "5b000009-0000-4000-8000-000000000009", name: "Agachamento sumô no belt squat",     station: "61",    equipment: "machine", sets: 3, reps: 12, videoCode: 1208, muscles: ["glutes", "quads"] },
    { id: "5b000010-0000-4000-8000-000000000010", name: "Elevação pélvica",                   station: "60",    equipment: "machine", sets: 3, reps: 12, videoCode: 1201, muscles: ["glutes"] },
    { id: "5b000011-0000-4000-8000-000000000011", name: "Glúteo em pé",                       station: "9",     equipment: "machine", sets: 3, reps: 12, videoCode: 250,  muscles: ["glutes"] },
    { id: "5b000012-0000-4000-8000-000000000012", name: "Glúteo em pé no cabo, insistência",  station: "17/40", equipment: "cable",    sets: 3, reps: 12, videoCode: 253,  muscles: ["glutes"] },
    { id: "5b000013-0000-4000-8000-000000000013", name: "Lombar a 45 graus",                  station: "35",    equipment: "machine", sets: 3, reps: 12, videoCode: 128,  muscles: ["lower-back"] },
    { id: "5b000014-0000-4000-8000-000000000014", name: "Flexão abdominal a 90 graus no banco", kind: "bodyweight", station: "chão", equipment: "free", sets: 3, reps: 12, videoCode: 138, muscles: ["abs"] }
  ],
  C: [
    { id: "5b000015-0000-4000-8000-000000000015", name: "Elevação lateral sentado",           station: "25",    equipment: "machine", sets: 3, reps: 12, videoCode: 600,  muscles: ["shoulders"] },
    { id: "5b000016-0000-4000-8000-000000000016", name: "Elevação frontal com anilha",        station: "anilha", equipment: "plate", sets: 3, reps: 12, videoCode: 762,  muscles: ["shoulders"] },
    { id: "5b000017-0000-4000-8000-000000000017", name: "Remada baixa com triângulo",         station: "4",     equipment: "cable",    sets: 3, reps: 12, videoCode: 497,  muscles: ["back"] },
    { id: "5b000018-0000-4000-8000-000000000018", name: "Pull down supinado",                 station: "2",     equipment: "machine", sets: 3, reps: 12, videoCode: 1036, muscles: ["back", "biceps"] },
    { id: "5b000019-0000-4000-8000-000000000019", name: "Remada articulada aberta supinada",  station: "5",     equipment: "machine", sets: 3, reps: 12, videoCode: 276,  muscles: ["back"] },
    { id: "5b000020-0000-4000-8000-000000000020", name: "Rosca direta em pé",                 station: "em pé", equipment: "free",   sets: 3, reps: 12, videoCode: 97,   muscles: ["biceps"] },
    { id: "5b000021-0000-4000-8000-000000000021", name: "Tríceps pulley",                     station: "17/40", equipment: "cable",    sets: 3, reps: 12, videoCode: 332,  muscles: ["triceps"] }
  ]
};

// A short workout with the three exercise kinds the app understands, so whoever opens the app for
// the first time sees a full screen without touching anyone's workout. The last two are born
// archived: they existed, left the list and remain in the history, which is the path the editor
// uses to remove an exercise without erasing what was lifted.
const EXAMPLE_WORKOUTS = {
  A: [
    { id: "e0000001-0000-4000-8000-000000000001", name: "Puxada frontal no cabo", station: "4", sets: 3, reps: 12, videoCode: 541, muscles: ["back"], accessory: "long-curved-bar" },
    { id: "e0000002-0000-4000-8000-000000000002", name: "Supino plano articulado", station: "47", sets: 3, reps: 12, videoCode: 1113, muscles: ["chest", "triceps"] },
    { id: "e0000003-0000-4000-8000-000000000003", name: "Flexão de braço", kind: "bodyweight", sets: 3, reps: 12, station: "livre", videoCode: 0, muscles: ["chest", "triceps"] },
    { id: "e0000004-0000-4000-8000-000000000004", name: "Esteira", kind: "time", unit: "km/h", sets: 1, reps: null, station: "livre", videoCode: 0, muscles: ["quads", "calves"] }
  ],
  B: [
    { id: "e0000005-0000-4000-8000-000000000005", name: "Leg press 45 graus", station: "8", sets: 3, reps: 12, videoCode: 59, muscles: ["quads", "glutes"] },
    { id: "e0000006-0000-4000-8000-000000000006", name: "Abdominal na prancha", kind: "bodyweight", sets: 3, reps: 15, station: "livre", videoCode: 0, muscles: ["quads"] },
    { id: "e0000007-0000-4000-8000-000000000007", name: "Bicicleta ergométrica", kind: "time", unit: "nível", sets: 1, reps: null, station: "livre", videoCode: 0, muscles: ["quads"] }
  ],
  // The example has one workout per existing letter, otherwise the empty workout's tab opens on a
  // blank list and the app looks broken.
  C: [
    { id: "e0000010-0000-4000-8000-000000000010", name: "Desenvolvimento aberto", station: "18", sets: 3, reps: 12, videoCode: 579, muscles: ["shoulders", "triceps"] },
    { id: "e0000011-0000-4000-8000-000000000011", name: "Rosca direta com halteres", station: "em pé", sets: 3, reps: 12, videoCode: 101, muscles: ["biceps"], accessory: "dumbbell" },
    { id: "e0000012-0000-4000-8000-000000000012", name: "Elevação de pernas na barra", kind: "bodyweight", sets: 3, reps: 10, station: "livre", videoCode: 0, muscles: ["quads"] }
  ]
};

const EXAMPLE_ARCHIVED = [
  { id: "e0000008-0000-4000-8000-000000000008", name: "Remada curvada com barra", station: "livre", sets: 3, reps: 10, videoCode: 0, muscles: ["back", "biceps"], accessory: "free-bar", workout: "A", archived: true },
  { id: "e0000009-0000-4000-8000-000000000009", name: "Elíptico", kind: "time", unit: "nível", sets: 1, reps: null, station: "livre", videoCode: 0, muscles: ["quads"], workout: "B", archived: true }
];

// The catalog belongs to whoever trains: each profile has its own plan, and the example has its
// own so it can be played with freely without touching anyone's real workout.
const PROFILES = { sun: "Sun", shine: "Shine", example: "Exemplo" };
const PLAN_OF = { sun: SUN_WORKOUTS, shine: SHINE_WORKOUTS, example: EXAMPLE_WORKOUTS };
const EXAMPLE_OWNER = ["example"];

// Each account's Firebase UID. Not a secret: the Firestore rules already carry them, and the rules
// are what protect. The admin has no profile of their own; they pick whose workout is on screen.
const ACCOUNTS = {
  admin: "AgQFNVKztZbn72zzti2EESvbzM83",
  sun: "SmKRdOOcHQaZc8lE16srwiFl81m1",
  shine: "CpJtwfknmbcjrkySbMmqfSsNYd22"
};
