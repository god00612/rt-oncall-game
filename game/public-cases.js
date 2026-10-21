// What happens on the night, as data: the small calls and the patients.
//
// A bed is a short script of choices. Each option is something the RT could do at the bedside;
// the best one moves the case on, the others make the patient worse and explain why. Every option
// names how many minutes it takes, so a slow night shows on the clock.
//
// Written for respiratory therapists in training: ventilator terms are fine, but every case is
// made up and is not a clinical guideline. Anything clinical here should be checked by a senior
// RT or a physician before it ships -- see README.md (醫療內容).
//
// Cases made from real patients (his-crawler's case generator) must be de-identified first: no
// names, chart or admission numbers, real bed numbers or real dates. See README.md (去識別化).

// The calls that need nobody at the bed: two ring in the evening, two after lights out. The
// point is what it is like to be called, and woken, for each of them anyway. `visit` is the
// scripted scene if the RT goes to look (see CASES in game.js); `night` keeps one after dark.
export const PUBLIC_CALLS = [
  { id: 'neb', short: '吸入藥可以晚點給嗎', need: 'phone', bed: '03A', visit: 'v-neb',
    text: 'RT，{bed} 的 Berodual 是 q6h，晚上這劑剛好卡到洗澡，可以晚半小時給嗎？',
    phone: '可以，洗完澡再給，給完記錄時間', phoneReply: '怡君：「好，洗完我再叫你……啊不用叫你，我自己記。」',
    sleepNote: '沒回電話，怡君等洗完澡才給，晚了四十分鐘，沒事。' },
  { id: 'o2', short: '鼻導管血氧 99%', need: 'phone', bed: '04A', visit: 'v-o2',
    text: 'RT，{bed} 鼻導管 3 L，血氧一直 99%，可以調低一點嗎？',
    phone: '調到 2 L，維持血氧 92–96%，半小時後再看一次', phoneReply: '怡君：「好，2 L，半小時後我再量。」',
    sleepNote: '沒回電話，阿伯繼續吸 3 L，血氧 99%。不危險，只是氧氣給多了。' },
  { id: 'cough', short: '咳嗽叫了一下警報', need: 'none', bed: '07A', visit: 'v-cough', night: true,
    text: 'RT，跟你說一下，{bed} 剛剛咳嗽，呼吸器叫了一下 high pressure，我抽完痰就停了，現在都正常。',
    phone: '好，有再叫、或痰抽不出來再叫我', phoneReply: '小雯：「好，我會注意。」',
    sleepNote: '其實不回也沒事：抽完痰就好了，小雯只是照規定跟你報告。' },
  { id: 'mask', short: 'BiPAP 面罩壓得痛', need: 'phone', bed: '06B', visit: 'v-mask', night: true,
    text: 'RT，{bed} 的阿伯說 BiPAP 面罩壓得鼻樑好痛，可以拿掉一下嗎？',
    phone: '先在鼻樑貼人工皮、頭帶鬆一格，不要整個拿掉；還是很痛再叫我', phoneReply: '小雯：「好，我去貼。」',
    sleepNote: '沒回電話，阿伯自己把面罩拉歪，漏氣漏了一個小時，小雯重新幫他戴好。' },
];
// Two more just before the day shift, every night, around the morning's patient.
export const DAWN_CALLS = [
  { id: 'abg', short: '早上 ABG 正常', need: 'none', bed: '04B', visit: 'v-abg',
    text: 'RT，跟你報告一下，{bed} 早上六點的 ABG 出來了：pH 7.41、PaCO2 42、PaO2 96。',
    phone: '好，數值都正常，維持設定，交班時我會說', phoneReply: '怡君：「好～快交班了，你再躺一下。」',
    sleepNote: '其實不回也沒事：ABG 都正常，本來就可以等交班。' },
  { id: 'fam', short: '家屬問今天能不能拔管', need: 'phone', bed: '08A', visit: 'v-fam',
    text: 'RT，{bed} 的家屬一早就來了，想問今天可不可以試著拔管？',
    phone: '今天主治醫師查房評估後會跟家屬說明', phoneReply: '小雯：「好，我跟家屬說。」',
    sleepNote: '家屬在護理站等了半小時，小雯只好自己先安撫。' },
];
// The dead of night, every night: the humidifier fills the circuit with water.
export const DEEP_CALLS = [
  { id: 'water', short: '管路好多積水', need: 'phone', bed: '11A', visit: 'v-water',
    text: 'RT，{bed} 呼吸器管路裡好多積水，一直咕嚕咕嚕的，要怎麼處理？',
    phone: '把積水倒進集水杯排掉，倒的時候管路不要往病人那邊流', phoneReply: '佳穎：「好，我倒掉。」',
    sleepNote: '沒回電話，佳穎自己倒掉了。她做過很多次，沒事。' },
];
// what goes through the RT's head after hanging up, one at random
export const AFTER_PHONE = [
  '眼睛閉上了，腦袋還在想剛剛那床的波形。',
];

// Each bed below has the same shape:
//   id, bed, nurse, name, who        who the patient is and where
//   call, again                      the phone call, and the second one if the RT slept on it
//   phone, callWhy                   what an RT might say on the phone instead of coming, and why
//                                    this one needed someone at the bed; the nurse's second call says it
//   intro, introLate, late           what the nurse says at the bed; `late` is the state a
//                                    patient is found in after the RT slept on the call
//   extra, extraOk, extraWarn        the monitor's fourth reading (EXTRA in game.js, e.g. 'lung',
//                                    'cuff', 'rox'), and which of its words read as fine or as a worry
//   states                           the monitor; undefined keeps the last reading. `vent` is the
//                                    ventilator row: { label: value, ..., hi: [labels drawn in red] }
//   steps                            the questions (see below); the first is `first`
//   warn                             what happens at danger 3: the first sign it is going badly
//   arrest step + cprNext/cprLine    when danger reaches 5 the heart stops; compressions are the
//                                    last chance. A bed with no arrest step fails instead (fail).
//   results                          a line per outcome, for the end of the bed and the summary
//   option draw: true                the choice draws an ABG; its report is the labs below
//   labs                             rows of [項目, 結果, 單位, 參考值, H/L] and a note
//   card                             what to take home

// A man on day four of pneumonia whose tube fills with sputum. The point: Ppeak up with Pplat
// unchanged is resistance; a catheter that will not pass is a plug, and the answer is the bag.
export const SECRETION = {
  id: 'psecr', bed: '03C', nurse: '怡君', name: '林阿伯', who: '林阿伯 · 74 歲 · 肺炎插管第 4 天',
  short: '呼吸器一直叫 high pressure', late: 'worse', extra: 'lung', extraOk: ['粗囉音變少'],
  results: { stable: '林阿伯穩住了，Ppeak 回到 31', icu: '林阿伯救回來了，轉進加護病房' },
  labs: {
    rows: [['pH', 7.31, '', '7.35–7.45', 'L'], ['PaCO2', 52, 'mmHg', '35–45', 'H'], ['PaO2', 58, 'mmHg', '80–100', 'L'],
      ['HCO3', 25.8, 'mEq/L', '22–26'], ['SaO2', '89', '%', '95–100', 'L']],
    note: '急救後的 ABG：通氣和氧合都還不夠。痰栓清掉之後要再追一次，FiO2 依 SpO2 慢慢往下調。',
  },
  call: 'RT！{bed} 的林阿伯呼吸器一直叫 high pressure，咳得很厲害，血氧掉到 88%！',
  again: 'RT！{bed} 的林阿伯血氧剩 82%，嘴唇都紫了，你快來！',
  phone: '先幫他抽個痰，有變化再叫我',
  callWhy: 'high pressure 加上血氧掉，可能是痰、管路扭折、咬管，也可能是氣胸或支氣管痙攣。電話裡分不出來，要有人到床邊看波形、聽呼吸音。',
  intro: 'RT，這是林阿伯，74 歲，肺炎插管第四天。剛剛開始一直咳，呼吸器一直叫，我還沒抽痰。',
  introLate: 'RT 你終於來了！我抽了兩次都抽不太出來，血氧一直掉！',
  states: {
    start: { hr: 118, bp: [142, 80], spo2: 88, lung: null, mind: '清醒、躁動、一直咳',
      vent: { Mode: 'VC-AC', VT: 400, RR: 18, FiO2: '60%', PEEP: 12, Ppeak: 42, Pplat: 24, hi: ['Ppeak'] } },
    listened: { hr: 118, bp: [142, 80], spo2: 88, lung: '雙側粗囉音', mind: '清醒、躁動、一直咳' },
    worse: { hr: 132, bp: [150, 86], spo2: 82, lung: undefined, mind: '躁動、嘴唇發紫',
      vent: { Mode: 'VC-AC', VT: 400, RR: 18, FiO2: '60%', PEEP: 12, Ppeak: 46, Pplat: 25, hi: ['Ppeak'] } },
    plug: { hr: 138, bp: [156, 90], spo2: 76, lung: '幾乎聽不到', mind: '冒冷汗、嘴唇發紫',
      vent: { Mode: 'VC-AC', VT: 300, VTe: 180, RR: 18, FiO2: '60%', PEEP: 12, Ppeak: '50+', hi: ['VTe', 'Ppeak'] } },
    bagging: { hr: 120, bp: [138, 78], spo2: 86, lung: '慢慢聽得到了', mind: '用 Ambu 擠著，比較不掙扎',
      vent: { 通氣: 'Ambu', FiO2: '100%' } },
    cleared: { hr: 100, bp: [132, 76], spo2: 95, lung: '粗囉音變少', mind: '安靜下來，可以點頭',
      vent: { Mode: 'VC-AC', VT: 400, RR: 18, FiO2: '60%', PEEP: 12, Ppeak: 31, Pplat: 23 } },
    arrest: { hr: 0, bp: null, spo2: null, lung: undefined, mind: '沒有反應、摸不到脈搏', vent: { 通氣: 'Ambu', FiO2: '100%' } },
    rosc: { hr: 124, bp: [92, 56], spo2: 92, lung: '粗囉音變少', mind: '心跳回來了，還沒醒' },
  },
  steps: {
    first: {
      ask: 'Ppeak 42、Pplat 24，阿伯一直咳、血氧 88%。你先做什麼？',
      askWarn: '血氧剩 82%，Ppeak 還在升。你先做什麼？',
      options: [
        { id: 'look', text: '看波形、聽兩側呼吸音、檢查管路有沒有扭折或咬管', grade: 'best', min: 2, state: 'listened', next: 'suction',
          say: '兩側都是粗囉音，管路裡看得到黃痰在晃。Ppeak 和 Pplat 差了 18：是氣道阻力的問題。' },
        { id: 'fio2', text: 'FiO2 先調到 100%，再慢慢看', grade: 'ok', min: 2, state: 'worse',
          say: '血氧爬到 90%，又慢慢掉回去。呼吸器還在叫。',
          why: 'FiO2 可以暫時撐住血氧，但 high pressure 的原因還沒找。阻力上升先想痰、管路、咬管。' },
        { id: 'alarm', text: '把 high pressure 警報上限調高到 55', grade: 'bad', min: 1, state: 'worse',
          say: '警報安靜了，阿伯還在咳。',
          why: '調高警報上限不是處置，壓力過高會造成氣壓傷，也會把真正的問題藏起來。' },
      ],
    },
    suction: {
      ask: '管路裡有痰在晃。接下來？',
      options: [
        { id: 'suck', text: '先給 100% 氧氣，用密閉式抽痰管抽痰', grade: 'best', min: 4, state: 'cleared', next: 'after',
          say: '抽出一大坨黃稠痰。Ppeak 降回 31，血氧慢慢爬到 95%。' },
        { id: 'saline', text: '先從管子灌 10 cc 生理食鹽水再抽', grade: 'ok', min: 4, state: 'worse',
          say: '灌下去阿伯咳得更兇，血氧掉到 84%。',
          why: '常規灌生理食鹽水不會讓痰比較好抽，還可能讓血氧更掉、增加感染。先直接抽。' },
        { id: 'vt', text: 'VT 從 400 降到 300，壓力就會下來', grade: 'bad', min: 2, state: 'plug', next: 'plug',
          say: '壓力下來一點，可是痰還在。抽痰管伸進去……卡住了，放不下去！',
          why: '降 VT 只是把數字壓下去，通氣不夠，痰也還在。' },
      ],
    },
    plug: {
      ask: '抽痰管放不下去，Ppeak 爆表，VTe 只剩 180！你要？',
      options: [
        { id: 'bag', text: '拔離呼吸器，接 Ambu 100% 氧氣手壓，同時請護理師叫醫師', grade: 'best', min: 3, state: 'bagging', next: 'clear',
          say: 'Ambu 擠起來很緊。你換一根抽痰管再試，終於抽出一條痰栓。' },
        { id: 'peep', text: 'PEEP 加到 18 把肺撐開', grade: 'bad', min: 2, state: 'plug',
          say: '壓力更高了，VTe 還是 180。',
          why: '管子塞住時加 PEEP 送不進氣，問題在管子不是肺。' },
        { id: 'wait', text: '再等一下，可能是咳嗽的關係', grade: 'bad', min: 5, next: 'arrest',
          say: '……監視器上的心跳越來越慢，然後拉成一條線。' },
      ],
    },
    clear: {
      ask: '痰栓抽出來了，Ambu 擠起來鬆了。接下來？',
      options: [
        { id: 'back', text: '接回呼吸器，確認 Ppeak、VTe 回到原本，再聽一次呼吸音', grade: 'best', min: 3, state: 'cleared', next: 'after',
          say: 'Ppeak 31、VTe 390，兩側都聽得到呼吸音了。' },
        { id: 'stay', text: '繼續用 Ambu 擠到天亮', grade: 'ok', min: 10,
          say: '怡君：「RT……你要在這裡擠一整晚嗎？」',
          why: '呼吸器才能給穩定的 VT 和 PEEP。阻塞排除後就要接回去評估。' },
      ],
    },
    after: {
      ask: '阿伯穩下來了，Ppeak 31、血氧 95%。接下來？',
      options: [
        { id: 'plan', text: '檢查加濕器、跟護理師討論抽痰頻率，紀錄這次事件', grade: 'best', min: 5, next: 'done', outcome: 'stable',
          say: '加濕器的水快乾了，你加滿。怡君：「好，我把抽痰改成 q2h，有痰聲就叫你。」' },
        { id: 'leave', text: '好了，回去休息', grade: 'ok', min: 1,
          say: '你走到門口，怡君叫住你：「RT，他這兩天痰都好多耶……」',
          why: '痰這麼多要找原因：加濕夠不夠、抽痰頻率、要不要胸腔物理治療，不然今晚還會再來。' },
      ],
    },
    arrest: {
      ask: '阿伯沒有反應，摸不到脈搏！你要？',
      options: [
        { id: 'cpr', text: '廣播急救、開始壓胸，Ambu 100% 氧氣每 6 秒擠一下', grade: 'best', min: 0, cpr: true },
        { id: 'suck', text: '先繼續抽痰', grade: 'bad', min: 2,
          death: '沒有脈搏的時候，每拖一分鐘，救回來的機會就少很多。先壓胸，同時處理呼吸道。' },
      ],
    },
    rosc: {
      ask: '阿伯的心跳回來了，血壓 92/56。接下來？',
      options: [
        { id: 'icu', text: '接回呼吸器 FiO2 100%，抽 ABG，請醫師評估轉加護病房', grade: 'best', min: 15, next: 'done', outcome: 'icu', draw: true,
          say: '加護病房的護理師推床來接阿伯。你在呼吸治療紀錄上補完這一段，窗外天快亮了。' },
        { id: 'ward', text: '接回原本的設定，回護理站', grade: 'ok', min: 3,
          say: '怡君：「RT……他剛剛心跳停過耶。」',
          why: '剛急救回來，要高濃度氧氣、ABG 和醫師評估，不能直接回原本的設定。' },
      ],
    },
  },
  warn: { state: 'worse', line: '怡君：「RT！血氧剩 82%，呼吸器叫個不停！」', log: '林阿伯血氧掉到 82%' },
  arrestLine: '怡君：「RT！阿伯沒有脈搏了！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '壓了兩分鐘，換手時你抽出一大條痰栓。怡君：「RT！摸得到脈搏了！」',
  card: {
    title: '痰造成的 high pressure：記住四件事',
    points: [
      'Ppeak 升高、Pplat 沒變，是氣道阻力的問題：先想痰、管路扭折、咬管、支氣管痙攣。',
      '抽痰前先給高濃度氧氣，不要常規灌生理食鹽水。',
      '抽痰管放不下去、VTe 掉很多，就是痰栓：拔離呼吸器，改用 Ambu 手壓，同時叫人。',
      '痰多要找原因：加濕器夠不夠、抽痰頻率、需不需要胸腔物理治療。',
    ],
  },
};

// A man with ARDS on high PEEP whose right lung collapses in the night. The point: DOPE, a falling
// VTe on pressure control, and a tension pneumothorax is treated before the X-ray.
export const PNEUMO = {
  id: 'pptx', bed: '07B', nurse: '小雯', name: '張先生', who: '張先生 · 58 歲 · ARDS、PEEP 14', night: true,
  short: '半夜血氧和血壓一起掉', late: 'worse', extra: 'lung', extraOk: ['兩側都聽得到'],
  results: { stable: '張先生放好胸管，穩住了', icu: '張先生救回來了，醫師準備轉加護病房' },
  labs: {
    rows: [['pH', 7.28, '', '7.35–7.45', 'L'], ['PaCO2', 55, 'mmHg', '35–45', 'H'], ['PaO2', 62, 'mmHg', '80–100', 'L'],
      ['HCO3', 24.6, 'mEq/L', '22–26'], ['Lactate', 3.2, 'mmol/L', '0.5–2.2', 'H']],
    note: '氣胸處理後的 ABG：通氣還不夠，乳酸偏高表示剛剛灌流不好。跟醫師討論設定時，留意驅動壓（Pplat − PEEP）不要太高。',
  },
  call: 'RT！{bed} 張先生半夜血氧突然掉到 85%，血壓也在掉，呼吸器一直叫！',
  again: 'RT！{bed} 張先生血壓剩 70 幾，血氧 78%，醫師也在問你人呢！',
  phone: '先把 FiO2 調到 100%，我等一下過去',
  callWhy: '高 PEEP 的病人突然血氧和血壓一起掉，要先想張力性氣胸。要立刻到床邊，不是調 FiO2 等等看。',
  intro: 'RT，張先生，58 歲，ARDS，PEEP 14。剛剛翻身完沒多久，血氧就一直掉，血壓也低了。',
  introLate: 'RT！他血壓剩 70 幾，我已經叫醫師了！',
  states: {
    start: { hr: 128, bp: [86, 50], spo2: 85, lung: null, mind: '鎮靜中，胸口起伏左右不一樣',
      vent: { Mode: 'PC-AC', Pinsp: 22, PEEP: 14, FiO2: '70%', VTe: 250, Ppeak: 36, hi: ['VTe'] } },
    heard: { hr: 130, bp: [82, 48], spo2: 86, lung: '右側聽不到', mind: '右胸鼓起來、氣管偏左',
      vent: { 通氣: 'Ambu', FiO2: '100%', 手感: '很硬', hi: ['手感'] } },
    worse: { hr: 142, bp: [72, 40], spo2: 78, lung: undefined, mind: '頸靜脈怒張、冒冷汗',
      vent: { Mode: 'PC-AC', Pinsp: 22, PEEP: 14, FiO2: '100%', VTe: 180, Ppeak: 36, hi: ['VTe'] } },
    decomp: { hr: 112, bp: [104, 62], spo2: 92, lung: '右側回來了', mind: '胸口起伏對稱了',
      vent: { 通氣: 'Ambu', FiO2: '100%', 手感: '變軟了' } },
    stable: { hr: 104, bp: [112, 66], spo2: 95, lung: '兩側都聽得到', mind: '胸管接好了，起伏對稱',
      vent: { Mode: 'PC-AC', Pinsp: 20, PEEP: 12, FiO2: '80%', VTe: 400, Ppeak: 32 } },
    arrest: { hr: 0, bp: null, spo2: null, lung: undefined, mind: '沒有反應、摸不到脈搏' },
    rosc: { hr: 120, bp: [90, 54], spo2: 90, lung: '右側回來了', mind: '心跳回來了，還在鎮靜' },
  },
  steps: {
    first: {
      ask: '血氧 85%、血壓 86/50、VTe 從 420 掉到 250。你先做什麼？',
      askWarn: '血壓 72/40、血氧 78%。你先做什麼？',
      options: [
        { id: 'dope', text: '拔離呼吸器接 Ambu 100% 手壓，同時看管位、聽兩側呼吸音', grade: 'best', min: 2, state: 'heard', next: 'ptx',
          say: 'Ambu 擠起來很硬。管子刻度 23 cm 沒移位，抽痰管下得去。右邊聽不到呼吸音，氣管偏左。' },
        { id: 'fio2', text: 'FiO2 調到 100% 再觀察', grade: 'ok', min: 3, state: 'worse',
          say: '血氧沒有起色，血壓還在掉。',
          why: 'FiO2 撐不住張力性氣胸。呼吸器病人突然惡化，先拔離改用 Ambu，照 DOPE（移位、阻塞、氣胸、機器）一項一項排除。' },
        { id: 'peep', text: 'PEEP 從 14 加到 18 改善氧合', grade: 'bad', min: 2, state: 'worse',
          say: '血壓掉到 70 幾。',
          why: '如果是氣胸，加 PEEP 會讓胸內壓更高，血壓更掉。' },
      ],
    },
    ptx: {
      ask: '右側呼吸音消失、氣管偏左、血壓 82/48。下一步？',
      options: [
        { id: 'decomp', text: '張力性氣胸！請醫師立刻減壓，準備針頭減壓和胸管用物，你繼續 Ambu', grade: 'best', min: 5, state: 'decomp', next: 'after',
          say: '醫師衝進來，在右胸打下針頭，「噗」一聲，氣衝出來。Ambu 一下子變軟，血壓回到 104/62。' },
        { id: 'cxr', text: '先照床邊 X 光確認再說', grade: 'ok', min: 15, state: 'worse',
          say: '放射師推機器來要十幾分鐘，血壓一直掉。',
          why: '張力性氣胸是臨床診斷，血行動力不穩時不能等 X 光，要立刻減壓。' },
        { id: 'suck', text: '應該是痰，用力抽痰', grade: 'bad', min: 3, state: 'worse',
          say: '抽痰管順順地下去，幾乎沒有痰。',
          why: '抽痰管下得去、右邊沒呼吸音、血壓掉，這不是痰。' },
      ],
    },
    after: {
      ask: '醫師放好了胸管。接回呼吸器前要做什麼？',
      options: [
        { id: 'reset', text: '抽 ABG、看 VTe 和 Ppeak、胸管有沒有持續漏氣，跟醫師討論降 PEEP', grade: 'best', min: 10, state: 'stable', next: 'done', outcome: 'stable', draw: true,
          say: '胸管的水封瓶冒了幾個泡泡就停了。醫師同意 PEEP 降到 12、Pinsp 20。小雯：「RT，剛剛好險。」' },
        { id: 'same', text: '直接接回原本的設定就好', grade: 'ok', min: 2,
          say: '醫師：「等一下，先不要照原本的。」',
          why: '剛發生氣壓傷，要重新評估設定，注意持續漏氣，和醫師討論 PEEP 和驅動壓。' },
      ],
    },
    arrest: {
      ask: '張先生沒有脈搏了！你要？',
      options: [
        { id: 'cpr', text: '廣播急救、開始壓胸，請醫師立刻在右胸針頭減壓', grade: 'best', min: 0, cpr: true },
        { id: 'vent', text: '先調呼吸器設定', grade: 'bad', min: 2,
          death: '沒有脈搏要先壓胸。張力性氣胸造成的心跳停止，要同時減壓才救得回來。' },
      ],
    },
    rosc: {
      ask: '減壓後心跳回來了。接下來？',
      options: [
        { id: 'icu', text: 'Ambu 維持，醫師放胸管，抽 ABG，接回呼吸器後重新設定', grade: 'best', min: 15, state: 'stable', next: 'done', outcome: 'icu', draw: true,
          say: '胸管放好，你把呼吸器重新設過一遍。醫師開始聯絡加護病房。' },
        { id: 'old', text: '接回原本的設定，回護理站', grade: 'ok', min: 3,
          say: '小雯：「RT，他剛剛心跳停過耶，設定不用重看嗎？」',
          why: '剛急救回來，PEEP 和 FiO2 都要重新評估，不能照舊。' },
      ],
    },
  },
  warn: { state: 'worse', line: '小雯：「RT！血壓 72/40，血氧 78%！」', log: '張先生血壓掉到 72/40' },
  arrestLine: '小雯：「RT！張先生沒有脈搏了！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '醫師邊壓邊在右胸打下針頭，氣衝出來。小雯：「摸得到脈搏了！」',
  card: {
    title: '張力性氣胸：記住四件事',
    points: [
      '呼吸器病人突然惡化，先拔離改用 Ambu 手壓，再照 DOPE 排除：移位、阻塞、氣胸、機器。',
      '壓力控制模式下，肺變硬看不到壓力升高，看到的是 VTe 掉下來。',
      '單側呼吸音消失、氣管偏移、血壓掉：張力性氣胸是臨床診斷，不等 X 光，立刻減壓。',
      '高 PEEP、高驅動壓的病人要特別小心氣壓傷，翻身、抽痰後都要再看一次。',
    ],
  },
};

// An old man extubated this morning, failing on high flow by evening. The point: ROX, and
// intubating early instead of turning the oxygen up and waiting.
export const HFNC = {
  id: 'phfnc', bed: '06A', nurse: '小雯', name: '黃阿公', who: '黃阿公 · 82 歲 · 心衰竭、今早拔管',
  short: 'HFNC 越調越高還是喘', late: 'worse', extra: 'rox', extraWarn: ['3.9'],
  results: { stable: '黃阿公重新插管，穩住了' },
  labs: {
    rows: [['pH', 7.33, '', '7.35–7.45', 'L'], ['PaCO2', 46, 'mmHg', '35–45', 'H'], ['PaO2', 88, 'mmHg', '80–100'],
      ['HCO3', 23.8, 'mEq/L', '22–26'], ['SaO2', '96', '%', '95–100']],
    note: '重新插管後的 ABG：氧合回來了，PaCO2 稍高。依 ABG 微調 RR，FiO2 慢慢往下降到 SpO2 92–96%。',
  },
  call: 'RT，{bed} 的黃阿公早上剛拔管，現在 HFNC 一直喘，FiO2 我調到 60% 了，血氧還是 88%。',
  again: 'RT！{bed} 阿公喘到講不出話，血氧 82%！',
  phone: 'FiO2 再調到 80%，半小時後再跟我說',
  callWhy: '拔管後 HFNC 越調越高還撐不住，要到床邊算 ROX、看呼吸費力，判斷要不要重新插管。電話裡加 FiO2 只是在拖。',
  intro: 'RT，黃阿公，82 歲，心衰竭，今天早上九點拔管。下午開始越來越喘。',
  introLate: 'RT 你來了……阿公喘到講不出話，一直想把鼻管拔掉。',
  states: {
    start: { hr: 118, bp: [152, 88], spo2: 88, rox: null, mind: '清醒，講話斷斷續續、用輔助肌在喘',
      vent: { 裝置: 'HFNC', Flow: '50 L', FiO2: '60%', RR: 38, hi: ['RR'] } },
    rox: { hr: 118, bp: [152, 88], spo2: 88, rox: '3.9', mind: '清醒，一句話只能講兩三個字' },
    worse: { hr: 130, bp: [160, 92], spo2: 82, rox: undefined, mind: '喘到講不出話、躁動',
      vent: { 裝置: 'HFNC', Flow: '50 L', FiO2: '80%', RR: 42, hi: ['RR', 'FiO2'] } },
    niv: { hr: 126, bp: [158, 90], spo2: 85, rox: undefined, mind: '戴 BiPAP 很躁動、一直拉面罩',
      vent: { 裝置: 'BiPAP', IPAP: 14, EPAP: 8, FiO2: '80%', RR: 36, hi: ['RR'] } },
    warned: { hr: 136, bp: [168, 96], spo2: 79, rox: undefined, mind: '意識變差、叫不太醒',
      vent: { 裝置: 'HFNC', Flow: '60 L', FiO2: '100%', RR: 44, hi: ['RR', 'FiO2'] } },
    tube: { hr: 104, bp: [134, 76], spo2: 96, rox: undefined, mind: '重新插管，鎮靜中',
      vent: { Mode: 'VC-AC', VT: 420, RR: 16, FiO2: '60%', PEEP: 8, Ppeak: 28 } },
  },
  steps: {
    first: {
      ask: 'HFNC 50 L、FiO2 60%、血氧 88%、RR 38。你先做什麼？',
      askWarn: '阿公喘到講不出話，血氧 82%。你先做什麼？',
      options: [
        { id: 'rox', text: '算 ROX，看呼吸費力和意識', grade: 'best', min: 2, state: 'rox', next: 'decide',
          say: 'ROX =（SpO2 / FiO2）/ RR =（88 / 0.6）/ 38 ≈ 3.9。阿公用輔助肌在喘，一句話只能講兩三個字。' },
        { id: 'more', text: 'FiO2 直接加到 80%，再看看', grade: 'ok', min: 15, state: 'worse',
          say: '血氧爬到 90%，阿公還是一樣喘。',
          why: '一直加 FiO2 只是讓數字好看。延遲插管和死亡率上升有關，先評估 HFNC 是不是已經失敗。' },
        { id: 'mask', text: '在 HFNC 外面再加一個非再吸入面罩', grade: 'bad', min: 5, state: 'worse',
          say: '阿公一直想把面罩撥開。',
          why: 'HFNC 的流量已經夠了，再加面罩幫助有限，也沒有處理呼吸衰竭。' },
      ],
    },
    decide: {
      ask: 'ROX 3.9（低於 3.85 附近）、還在用輔助肌喘。下一步？',
      options: [
        { id: 'intubate', text: '通知醫師評估重新插管，準備插管用物、Ambu 和呼吸器', grade: 'best', min: 20, state: 'tube', next: 'vent',
          say: '值班醫師來看過，同意重新插管。你在旁邊擠 Ambu、把呼吸器接好。' },
        { id: 'bipap', text: '改 BiPAP 試一小時', grade: 'ok', min: 30, state: 'niv',
          say: '阿公戴上 BiPAP 很不舒服，一直拉面罩。',
          why: '拔管後已經呼吸衰竭才用 NIV 救援，可能延誤插管（高碳酸血症、COPD 的病人另當別論）。' },
        { id: 'wait', text: '再觀察一小時看會不會好轉', grade: 'bad', min: 60, state: 'worse',
          say: '一個小時後，阿公更喘了。',
          why: 'HFNC 失敗的時候，越晚插管越危險。' },
      ],
    },
    vent: {
      ask: '重新插管、接上呼吸器。設定要注意什麼？',
      options: [
        { id: 'set', text: 'VT 用理想體重 6–8 mL/kg、PEEP 從 8 開始、FiO2 調到血氧 92–96%，抽 ABG、照 X 光確認管位', grade: 'best', min: 10, next: 'done', outcome: 'stable', draw: true,
          say: 'X 光管位在隆突上 4 公分。小雯：「阿公終於可以睡了。」' },
        { id: 'big', text: 'VT 設 700，讓他好好休息', grade: 'bad', min: 3,
          say: 'Ppeak 衝到 38。',
          why: 'VT 要用理想體重算，太大會造成呼吸器相關的肺傷害。' },
      ],
    },
  },
  warn: { state: 'warned', line: '小雯：「RT！阿公意識變差了，叫不太醒！」', log: '黃阿公意識變差' },
  fail: {
    title: '黃阿公錯過了插管時機',
    text: '最後在急救中插管，接下來的路比原本難走很多。HFNC 撐不住的時候，及早插管比硬撐安全。',
  },
  card: {
    title: 'HFNC 失敗：記住四件事',
    points: [
      'ROX =（SpO2 / FiO2）/ RR。用 HFNC 2、6、12 小時時，低於約 3.85 要積極考慮插管。',
      '一直加 FiO2 讓血氧好看，不代表病人變好；看呼吸次數、輔助肌、講話能不能成句。',
      '拔管後已經呼吸衰竭才改 NIV 救援，可能延誤插管。',
      '重新插管後，VT 用理想體重計算，抽 ABG、照 X 光確認管位。',
    ],
  },
};

// A man with a tracheostomy whose cuff has gone soft. The point: VTi against VTe, and a cuff
// manometer, not a finger, sets the pressure.
export const CUFF = {
  id: 'pcuff', bed: '11B', nurse: '佳穎', name: '吳先生', who: '吳先生 · 56 歲 · 腦中風術後、氣切',
  short: '呼吸器一直叫 low VTe', late: 'worse', extra: 'cuff', extraOk: ['28 cmH2O'], extraWarn: ['12 cmH2O'],
  results: { stable: '吳先生的 cuff 補好了，VTe 回到 400' },
  labs: {
    rows: [['pH', 7.36, '', '7.35–7.45'], ['PaCO2', 47, 'mmHg', '35–45', 'H'], ['PaO2', 70, 'mmHg', '80–100', 'L'],
      ['HCO3', 26, 'mEq/L', '22–26'], ['SaO2', '93', '%', '95–100', 'L']],
    note: '漏氣時的 ABG：CO2 稍微滯留、氧合偏低。cuff 補好、VTe 回來之後，這些通常會跟著改善。',
  },
  call: 'RT，{bed} 吳先生呼吸器一直叫 low VTe，喉嚨聽得到漏氣聲，他還可以發出聲音。',
  again: 'RT！{bed} 吳先生血氧掉到 86%，呼吸器一直叫！',
  phone: '先把 PS 調高一點，我等一下過去',
  callWhy: '氣切病人突然漏氣、發得出聲音，可能是 cuff 消氣，也可能是套管移位。套管移位很危險，要有人到床邊確認。',
  intro: 'RT，吳先生，56 歲，腦中風術後長期呼吸器，氣切 8 號。剛剛翻身之後呼吸器就一直叫。',
  introLate: 'RT 你來了……他現在血氧 86%，呼吸器叫個不停。',
  states: {
    start: { hr: 96, bp: [128, 74], spo2: 93, cuff: null, mind: '清醒，可以發出聲音',
      vent: { Mode: 'PSV', PS: 10, PEEP: 5, FiO2: '30%', VTi: 420, VTe: 160, hi: ['VTe'] } },
    measured: { hr: 96, bp: [128, 74], spo2: 93, cuff: '12 cmH2O', mind: '清醒，可以發出聲音' },
    worse: { hr: 112, bp: [138, 80], spo2: 86, cuff: undefined, mind: '很喘、很焦躁',
      vent: { Mode: 'PSV', PS: 18, PEEP: 5, FiO2: '30%', VTi: 520, VTe: 150, hi: ['VTe'] } },
    fixed: { hr: 84, bp: [124, 72], spo2: 97, cuff: '28 cmH2O', mind: '清醒，發不出聲音了（cuff 封住了）',
      vent: { Mode: 'PSV', PS: 10, PEEP: 5, FiO2: '30%', VTi: 420, VTe: 400 } },
  },
  steps: {
    first: {
      ask: 'VTi 420、VTe 160，病人發得出聲音。你先做什麼？',
      askWarn: '血氧 86%，VTe 只剩 150。你先做什麼？',
      options: [
        { id: 'check', text: '確認氣切套管位置和固定帶，用 cuff 壓力計量壓力', grade: 'best', min: 2, state: 'measured', next: 'fix',
          say: '固定帶好好的，套管沒有往外滑，抽痰管下得去。cuff 壓力只有 12 cmH2O。' },
        { id: 'suck', text: '先抽痰', grade: 'ok', min: 3,
          say: '抽出一點口水，漏氣聲還在。',
          why: '清口腔分泌物是好習慣，但抽痰解決不了漏氣。先找漏氣的原因。' },
        { id: 'ps', text: 'PS 從 10 調到 18', grade: 'bad', min: 2, state: 'worse',
          say: 'VTi 變大了，VTe 還是一樣小，漏氣聲更大聲。',
          why: '加大壓力只會漏得更多，漏氣的原因還在。' },
      ],
    },
    fix: {
      ask: 'cuff 壓力 12 cmH2O，套管位置正常。接下來？',
      options: [
        { id: 'inflate', text: 'cuff 補氣到 25–30 cmH2O，再看 VTe', grade: 'best', min: 2, state: 'fixed', next: 'after',
          say: 'cuff 補到 28，漏氣聲消失，VTe 回到 400。' },
        { id: 'change', text: '立刻換一支新的氣切套管', grade: 'ok', min: 15,
          say: '佳穎：「現在換？他套管才換兩週耶……」',
          why: 'cuff 只是消氣不用換管。補氣後還一直漏，才要懷疑 cuff 破了。' },
        { id: 'hard', text: 'cuff 打到摸起來很硬為止', grade: 'bad', min: 2,
          say: '你捏著 pilot balloon，硬邦邦的。',
          why: 'cuff 壓力超過 30 cmH2O 會壓迫氣管黏膜，造成缺血、狹窄。要用壓力計。' },
      ],
    },
    after: {
      ask: 'VTe 回到 400 了。還要做什麼？',
      options: [
        { id: 'recheck', text: '一小時後再量一次 cuff 壓力，請護理師每班都量', grade: 'best', min: 3, next: 'done', outcome: 'stable',
          say: '佳穎：「好，我設一小時的提醒。」一小時後再量：27，沒有漏。' },
        { id: 'leave', text: '好了，不用再管', grade: 'ok', min: 1,
          say: '你走到門口，呼吸器好像又「嗶」了一聲。',
          why: 'cuff 可能是慢慢漏氣，過一陣子要再量。如果很快又消氣，要考慮 cuff 破損、換管。' },
      ],
    },
  },
  warn: { state: 'worse', line: '佳穎：「RT！他血氧掉到 86%，很喘！」', log: '吳先生血氧掉到 86%' },
  fail: {
    title: '吳先生撐不住了',
    text: '漏氣一直沒處理，通氣不夠，最後只好緊急換管。cuff 漏氣的處理其實很簡單，先量壓力就知道了。',
  },
  card: {
    title: 'cuff 漏氣：記住四件事',
    points: [
      'VTi 和 VTe 差很多、病人發得出聲音：氣體從 cuff 旁邊漏掉了。',
      '先確認套管位置和固定帶。套管移位比 cuff 消氣危險得多。',
      'cuff 壓力維持 25–30 cmH2O，用壓力計量，不要用手捏。',
      '補氣後很快又漏，要懷疑 cuff 破損，跟醫師討論換管。',
    ],
  },
};

// A woman with COPD whose PaCO2 climbs while the breaths stack. The point: auto-PEEP, and that
// more rate makes it worse.
export const COPD = {
  id: 'pcopd', bed: '08C', nurse: '小雯', name: '李阿嬤', who: '李阿嬤 · 71 歲 · COPD 急性惡化',
  short: 'ABG 的 PaCO2 72', late: 'worse', extra: 'lung', extraOk: ['吐氣比較順'],
  results: { stable: '李阿嬤的 auto-PEEP 降下來了' },
  labs: {
    rows: [['pH', 7.31, '', '7.35–7.45', 'L'], ['PaCO2', 61, 'mmHg', '35–45', 'H'], ['PaO2', 78, 'mmHg', '80–100', 'L'],
      ['HCO3', 30, 'mEq/L', '22–26', 'H']],
    note: '調整後的 ABG：PaCO2 從 72 降到 61，pH 改善。COPD 病人 HCO3 已經代償，PaCO2 不用拉回 40。',
  },
  call: 'RT，{bed} 李阿嬤的 ABG 出來了，PaCO2 72，醫師叫我問你呼吸器要不要調。',
  again: 'RT！{bed} 阿嬤血壓掉到 88/50，醫師在問你剛剛有沒有調！',
  phone: 'RR 從 14 調到 24，CO2 就會排出去',
  callWhy: 'COPD 的 CO2 滯留，常常是吐氣時間不夠、air trapping。電話上直接加 RR，可能讓 auto-PEEP 更高、血壓掉。要到床邊看流量波形、量 auto-PEEP。',
  intro: 'RT，李阿嬤，71 歲，COPD 急性惡化插管第二天。ABG pH 7.25、PaCO2 72。',
  introLate: 'RT 你來了，阿嬤越來越喘，血壓也開始掉。',
  states: {
    start: { hr: 112, bp: [134, 78], spo2: 92, lung: null, mind: '清醒、很喘、一直想用力吐氣',
      vent: { Mode: 'VC-AC', VT: 450, RR: '14（實際 22）', Ti: '1.2 s', FiO2: '35%', PEEP: 5, Ppeak: 38, hi: ['Ppeak'] } },
    held: { hr: 112, bp: [134, 78], spo2: 92, lung: '兩側 wheezing、吐氣拖很長', mind: '清醒、很喘',
      vent: { Mode: 'VC-AC', VT: 450, RR: '14（實際 22）', Ti: '1.2 s', PEEP: 5, 'Total PEEP': 13, 'Auto-PEEP': 8, hi: ['Auto-PEEP'] } },
    worse: { hr: 126, bp: [88, 50], spo2: 89, lung: undefined, mind: '很喘、冒冷汗',
      vent: { Mode: 'VC-AC', VT: 450, RR: 24, Ti: '1.2 s', PEEP: 5, 'Auto-PEEP': 14, Ppeak: 44, hi: ['Auto-PEEP', 'Ppeak'] } },
    fixed: { hr: 100, bp: [130, 76], spo2: 94, lung: '吐氣比較順', mind: '比較不喘，可以點頭',
      vent: { Mode: 'VC-AC', VT: 450, RR: 14, Ti: '0.8 s', FiO2: '35%', PEEP: 5, 'Auto-PEEP': 3, Ppeak: 34 } },
  },
  steps: {
    first: {
      ask: 'PaCO2 72、Ppeak 38，流量波形在下一口氣開始前沒有回到零。你先做什麼？',
      askWarn: '血壓 88/50、Auto-PEEP 14。你先做什麼？',
      options: [
        { id: 'hold', text: '做 expiratory hold 量 auto-PEEP，聽呼吸音', grade: 'best', min: 3, state: 'held', next: 'adjust',
          say: 'Total PEEP 13，設定 PEEP 5：auto-PEEP 8。兩側都是 wheezing，吐氣拖很長。' },
        { id: 'rr', text: 'RR 從 14 調到 24，加快排 CO2', grade: 'bad', min: 5, state: 'worse',
          say: '幾分鐘後，血壓掉到 88/50。',
          why: '吐氣時間更短，air trapping 更嚴重，auto-PEEP 上升、靜脈回流變少，血壓就掉了。' },
        { id: 'vt', text: 'VT 調到 600', grade: 'bad', min: 5, state: 'worse',
          say: 'Ppeak 衝到 44，阿嬤更喘了。',
          why: 'VT 加大，要吐的氣更多，air trapping 跟著惡化。' },
      ],
    },
    adjust: {
      ask: 'auto-PEEP 8。要怎麼調？',
      options: [
        { id: 'ti', text: '提高吸氣流速、縮短 Ti，讓吐氣時間變長，並請醫師加開支氣管擴張劑', grade: 'best', min: 10, state: 'fixed', next: 'after', draw: true,
          say: 'Ti 從 1.2 秒縮到 0.8 秒，I:E 從 1:1.5 變成約 1:2.6。給完支氣管擴張劑，auto-PEEP 降到 3。' },
        { id: 'peep', text: 'PEEP 直接調到 15，跟 auto-PEEP 抵銷', grade: 'ok', min: 3,
          say: 'Ppeak 跟著往上爬。',
          why: '外加 PEEP 可以降低觸發功，但一般設在 auto-PEEP 的八成以內（這裡約 6）。調到 15 超過 total PEEP，肺會更過度充氣。' },
        { id: 'sedate', text: '請醫師加重鎮靜，讓她不要自己呼吸', grade: 'ok', min: 10,
          say: '阿嬤睡著了，auto-PEEP 還是 7。',
          why: '鎮靜可以減少呼吸費力，但沒有處理 air trapping 本身。先延長吐氣時間、治療支氣管痙攣。' },
      ],
    },
    after: {
      ask: 'auto-PEEP 降到 3，阿嬤比較不喘了。接下來？',
      options: [
        { id: 'slow', text: '兩小時後複驗 ABG，PaCO2 慢慢降就好，不用拉回 40', grade: 'best', min: 5, next: 'done', outcome: 'stable',
          say: '小雯：「好，我兩小時後抽。」阿嬤對你比了一個讚。' },
        { id: 'fast', text: '一路調到 PaCO2 降回 40 為止', grade: 'ok', min: 3,
          say: '小雯：「RT，她平常門診的 PaCO2 就 50 幾了耶。」',
          why: 'COPD 病人平常 PaCO2 就偏高，HCO3 也代償過了。一下降到 40 會造成代謝性鹼中毒，之後也更難脫離。' },
      ],
    },
  },
  warn: { state: 'worse', line: '小雯：「RT！阿嬤血壓掉到 88/50！」', log: '李阿嬤血壓掉到 88/50' },
  fail: {
    title: '李阿嬤血壓撐不住',
    text: 'auto-PEEP 越來越高、血壓一直掉，只好把呼吸器拔離讓她慢慢吐氣，再加升壓劑。阻塞性肺病調呼吸器，先給足吐氣時間。',
  },
  card: {
    title: 'auto-PEEP：記住四件事',
    points: [
      '流量波形在下一口氣前沒有回到零，就有 air trapping；用 expiratory hold 量 auto-PEEP。',
      'COPD 的 CO2 滯留不能單靠加 RR：吐氣時間更短，auto-PEEP 更高，血壓會掉。',
      '延長吐氣時間（提高流速、縮短 Ti、降 RR）並治療支氣管痙攣。',
      'COPD 病人的 PaCO2 目標看平常的基準，不用拉回 40。',
    ],
  },
};

// A man with pulmonary oedema, ten minutes after the rate went up and a paralytic went in. The
// point: on pressure control the tidal volume is the machine plus the patient's own pull (Pmus);
// take the pull away and only what the stiff lung gives back is left. Made from a real night,
// de-identified, and reviewed by the RT who brought it.
export const PMUS = {
  id: 'ppmus', bed: '04C', nurse: '怡君', name: '陳先生', who: '陳先生 · 40 多歲 · 肺水腫插管',
  short: '剛調完呼吸器，VT 掉到 100 多', late: 'worse', extra: 'lung',
  results: { stable: '陳先生改成 VC 後 MV 回來了' },
  labs: {
    rows: [['pH', 7.29, '', '7.35–7.45', 'L'], ['PaCO2', 64, 'mmHg', '35–45', 'H'], ['PaO2', 86, 'mmHg', '80–100'],
      ['HCO3', 30.1, 'mEq/L', '22–26', 'H']],
    note: '改成 VC 後的 ABG：PaCO2 從 102 往下降了，pH 回到 7.29。肌鬆中的病人 MV 完全靠機器給，接下來還要再追一次。',
  },
  call: 'RT，{bed} 陳先生呼吸器一直叫 VT low，VT 掉到 100 多。你剛剛調完設定才十分鐘耶。',
  again: 'RT！{bed} 陳先生 ABG 出來了，PaCO2 102、pH 7.14！',
  phone: '剛調完還不穩，先把 VT low 警報下限調低一點',
  callWhy: 'VT 一下子少了三分之二，要到床邊分清楚是漏氣、阻塞、肺變硬，還是病人自己不吸了。把警報調低只會把問題藏起來。',
  intro: 'RT，陳先生，40 多歲，肺水腫插管。你剛把 RR 調到 28、Pinsp 調到 28，醫師也剛開了肌鬆 3 mL/hr。十分鐘後 VT 就掉到 160 幾。',
  introLate: 'RT 你終於來了，ABG PaCO2 102，醫師在問怎麼回事。',
  states: {
    start: { hr: 112, bp: [118, 70], spo2: 96, lung: null, mind: '打了肌鬆，沒有自發呼吸',
      vent: { Mode: 'PC-AC', Pinsp: 28, PEEP: 12, 'RR set/total': '28/28', Ti: '0.7 s', VTi: 168, VTe: 164, MV: 4.6, Ppeak: 29, hi: ['VTi', 'VTe', 'MV'] } },
    compare: { hr: 112, bp: [118, 70], spo2: 96, lung: '兩側 crackles，左右對稱', mind: '打了肌鬆，胸廓起伏很小但對稱',
      vent: { Mode: 'PC-AC', Pinsp: 28, PEEP: 12, 'RR set/total': '28/28', VTi: 168, VTe: 164, MV: 4.6, Cstat: 11.4, R: 13.6, hi: ['VTi', 'VTe', 'MV', 'Cstat'] } },
    worse: { hr: 124, bp: [104, 62], spo2: 92, lung: undefined, mind: '打了肌鬆，皮膚潮紅、冒汗',
      vent: { Mode: 'PC-AC', Pinsp: 28, PEEP: 12, 'RR set/total': '28/28', VTe: 168, MV: 4.8, Cstat: 9.9, hi: ['VTe', 'MV', 'Cstat'] } },
    vc: { hr: 104, bp: [116, 68], spo2: 95, lung: '兩側 crackles', mind: '打了肌鬆，胸廓起伏變大了',
      vent: { Mode: 'VC-AC', VT: 230, RR: 28, PEEP: 12, FiO2: '100%', MV: 6.4, Pplat: 29 } },
  },
  steps: {
    first: {
      ask: 'VT 從 527 掉到 168，MV 只剩 4.6。你先做什麼？',
      askWarn: 'PaCO2 102、pH 7.14，VT 還是 168。你先做什麼？',
      options: [
        { id: 'look', text: '先看病人：胸廓起伏、呼吸音、血氧，再比較 VTi 和 VTe', grade: 'best', min: 2, state: 'compare', next: 'why',
          say: '血氧 96%。兩側胸廓起伏都很小，但左右對稱；呼吸音兩側都是 crackles。VTi 168、VTe 164：幾乎一樣。' },
        { id: 'suck', text: '肺水腫一定是泡沫痰，先抽痰', grade: 'ok', min: 4,
          say: '抽出一點點稀稀的痰，VT 還是 168。',
          why: 'Ppeak 沒有升高，不像痰塞住。抽痰前先看病人、看數據，再決定。' },
        { id: 'alarm', text: '把 VT low 警報下限調低', grade: 'bad', min: 1, state: 'worse',
          say: '警報安靜了。兩個多小時後，ABG 出來：PaCO2 102。',
          why: '警報是在告訴你 MV 不夠。調低警報不會讓 CO2 排出去。' },
      ],
    },
    why: {
      ask: 'VTi 和 VTe 差不多，Cstat 11、R 13.6，Ppeak 沒變。VT 為什麼掉？',
      options: [
        { id: 'pmus', text: '肌鬆讓病人的 Pmus 消失：之前的 527 有一大半是病人自己吸的，現在只剩機器那一份', grade: 'best', min: 2, next: 'fix',
          say: '調整前 set RR 12、total RR 21，病人在用力吸。PC 模式下，VT 是機器的驅動壓加上病人的 Pmus。打了肌鬆之後只剩機器：Evita 的 Pinsp 是絕對壓力，驅動壓 28 − 12 = 16，乘上 Cstat 約 11，剛好約 170 mL。' },
        { id: 'leak', text: 'cuff 漏氣', grade: 'bad', min: 3,
          say: '你量了 cuff：24，沒問題。',
          why: 'VTi 168、VTe 164 幾乎一樣，氣沒有漏掉，是送進去的就只有這麼多。' },
        { id: 'ti', text: 'Ti 從 0.9 縮到 0.7，氣來不及送進去', grade: 'ok', min: 2,
          say: '你看了流量波形：吸氣末流量已經回到零。',
          why: '時間常數 τ = R × C ≈ 13.6 × 0.011 ≈ 0.15 秒，0.7 秒大約是 4.5 τ，吸氣時間夠。' },
      ],
    },
    fix: {
      ask: '病人已經沒有自發呼吸，MV 只剩 4.6。怎麼處理？',
      options: [
        { id: 'vc', text: '改 VC-AC，VT 用 PBW 5.5–6 mL/kg（約 230–250），確認 Pplat ≤ 30，30 分鐘後追 ABG', grade: 'best', min: 10, state: 'vc', next: 'after', draw: true,
          say: 'VT 230、RR 28，MV 回到 6.4，Pplat 29。現在 MV 不再靠病人自己吸了。' },
        { id: 'pinsp', text: 'Pinsp 加到 40，把 VT 拉回 500', grade: 'ok', min: 3,
          say: 'Ppeak 衝到 40，警報又響了。',
          why: 'Cstat 只有 11，VT 500 要驅動壓 45，Pplat 早就超過 30。目標是 PBW 6 mL/kg 左右，不是回到原本的 527：那個 527 本來就太大了。' },
        { id: 'wait', text: '肌鬆剛上，等一下就會穩', grade: 'bad', min: 60, state: 'worse',
          say: '一個小時後，VT 還是 168，病人開始冒汗。',
          why: 'MV 只剩原本的一半，PaCO2 會一路往上衝。真實的那一晚，2.7 小時後 PaCO2 102、pH 7.14。' },
      ],
    },
    after: {
      ask: '改成 VC 230 之後，Pplat 29、MV 6.4。接下來？',
      options: [
        { id: 'follow', text: '追 ABG，和醫師討論 RM 和 PEEP titration，留意 Pplat 和血壓', grade: 'best', min: 5, next: 'done', outcome: 'stable',
          say: '怡君：「好，我半小時後抽 ABG。」你在交班單寫上：肌鬆中，PC 已改 VC，Pplat 目標 ≤ 30。' },
        { id: 'leave', text: '設定好了，回去休息', grade: 'ok', min: 1,
          say: '怡君：「RT，他還在打肌鬆耶，ABG 不用追嗎？」',
          why: '剛換模式又在用肌鬆，要追 ABG 確認 PaCO2。順應性這麼差，PEEP 和 Pplat 也要持續評估。' },
      ],
    },
  },
  warn: { state: 'worse', line: '怡君：「RT！ABG 出來了，PaCO2 102、pH 7.14！」', log: '陳先生 PaCO2 102、pH 7.14' },
  fail: {
    title: '陳先生的 CO2 一路往上衝',
    text: 'MV 只剩一半，PaCO2 衝到 102、pH 7.14，最後要加 RR、加壓力，再改成 VC 才救回來。PC 模式下打了肌鬆，VT 會掉到只剩機器那一份。',
  },
  card: {
    title: 'PC 模式下打了肌鬆：記住四件事',
    points: [
      'PC 模式下，VT = 機器的驅動壓（Pinsp − PEEP）加上病人自己吸氣的力量（Pmus）。',
      '病人用力吸時，看起來漂亮的 VT 可能其實太大（這個案例是 12.5 mL/kg PBW），有病人自己造成肺傷害（P-SILI）的風險。',
      '打了鎮靜或肌鬆後，Pmus 不見了，VT 會掉到只剩機器那一份；要重新評估 Pinsp，或改 VC 確保 MV。',
      'Dräger 的 Pinsp 是絕對壓力，驅動壓要減掉 PEEP。調完設定或給藥 10–15 分鐘內，追 VT、MV 和 ABG。',
    ],
  },
};

// the beds a night draws from (普通班 four to six a night, 大爛班 six to eight, never more than are
// listed here); `night: true` marks a bed whose call says 半夜, which game.js only rings after 23:30
export const PUBLIC_CASES = [SECRETION, PNEUMO, HFNC, CUFF, COPD, PMUS];

// CPR: chest compressions to a beat. 30 compressions at 100–120 a minute, judged on exactly the
// range the screen gives; the rate is the median of the presses after the first two, so a
// hesitant start or one stray press is forgiven.
export const CPR = { presses: 30, slowest: 100, fastest: 120, maxGap: 2.5 };
