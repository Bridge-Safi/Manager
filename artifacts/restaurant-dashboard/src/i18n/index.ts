import { ar as dateFnsAr, fr as dateFnsFr } from "date-fns/locale";

export type Lang = "fr" | "ar" | "ber";

export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "fr",  label: "FR",          dir: "ltr" },
  { code: "ar",  label: "ع",           dir: "rtl" },
  { code: "ber", label: "ⵜ",           dir: "ltr" },
];

export function dateFnsLocale(lang: Lang) {
  if (lang === "ar") return dateFnsAr;
  return dateFnsFr;
}

export interface T {
  /* layout */
  liveLabel: string;
  pendingCountLabel: (n: number) => string;
  testAlarm: string;
  navDashboard: string;
  navHistory: string;
  navSettings: string;

  /* dashboard */
  dashboardTitle: string;
  simulateBtn: string;
  simulateBtnShort: string;
  statOrders: string;
  statPending: string;
  statRevenue: string;
  statAvgDelay: string;
  colNew: string;
  colKitchen: string;
  colReady: string;
  emptyPending: string;
  emptyKitchen: string;
  emptyReady: string;
  tabNew: string;
  tabKitchen: string;
  tabReady: string;
  btnAccept: string;
  btnReject: string;
  btnMarkReady: string;
  readyIn: (min: number) => string;
  moreItems: (n: number) => string;
  acceptTitle: string;
  prepTimeLabel: string;
  cancelBtn: string;
  confirmBtn: string;
  rejectTitle: string;
  rejectConfirmMsg: string;
  toastAccepted: string;
  toastRejected: string;
  toastReady: string;
  toastSimulated: string;
  toastSimulatedDesc: string;
  prepSuffix: (min: number) => string;

  /* orders list */
  ordersTitle: string;
  tabAll: string;
  tabDelivered: string;
  tabRejected: string;
  searchPlaceholder: string;
  colOrder: string;
  colPlatform: string;
  colStatus: string;
  colTotal: string;
  noOrdersTitle: string;
  noOrdersHint: string;
  itemWord: (n: number) => string;

  /* status labels */
  statusPending: string;
  statusAccepted: string;
  statusReady: string;
  statusPickedUp: string;
  statusRejected: string;

  /* order detail */
  trackingTitle: string;
  rejectedBanner: string;
  rejectedDefault: string;
  articlesSectionTitle: (n: number) => string;
  subtotalLabel: string;
  totalLabel: string;
  clientLabel: string;
  timingLabel: string;
  receivedAt: string;
  acceptedAt: string;
  readyAt: string;
  prepEstimated: string;
  clientNote: string;
  deliveryMan: string;
  orderNotFound: string;
  btnMarkReadyShort: string;
  stepReceived: string;
  stepAccepted: string;
  stepReady: string;
  stepDelivered: string;

  /* alarm modal */
  alarmTitle: (n: number) => string;
  alarmSubtitle: string;
  alarmRejectAll: string;
  alarmAcceptAll: string;
  alarmAndMore: (n: number) => string;

  /* settings */
  settingsTitle: string;
  settingsSubtitle: string;
  restaurantSection: string;
  restaurantSectionSub: string;
  namePlaceholder: string;
  saveBtn: string;
  integrationTitle: string;
  integrationSubtitle: string;
  integrationInfo: string;
  labelWebhookUrl: string;
  labelHeader: string;
  labelToken: string;
  copyUrlTitle: string;
  copyTokenTitle: string;
  dangerTitle: string;
  dangerInfo: string;
  regenBtn: string;
  regenDialogTitle: string;
  regenDialogMsg: string;
  inProgress: string;
  toastNameSaved: string;
  toastLoadError: string;
  toastError: string;
  toastNewToken: string;
  toastNewTokenDesc: string;
}

const fr: T = {
  liveLabel: "En direct",
  pendingCountLabel: (n) => `${n} en attente`,
  testAlarm: "Tester l'alarme",
  navDashboard: "Tableau de bord",
  navHistory: "Historique",
  navSettings: "Paramètres",

  dashboardTitle: "Tableau de bord",
  simulateBtn: "Simuler une commande",
  simulateBtnShort: "Simuler",
  statOrders: "Commandes",
  statPending: "En attente",
  statRevenue: "Chiffre du jour",
  statAvgDelay: "Délai moyen",
  colNew: "Nouvelles commandes",
  colKitchen: "En cuisine",
  colReady: "Prêtes à partir",
  emptyPending: "Aucune commande en attente",
  emptyKitchen: "Aucune commande en cours",
  emptyReady: "Aucune commande prête",
  tabNew: "Nouvelles",
  tabKitchen: "En cuisine",
  tabReady: "Prêtes",
  btnAccept: "Accepter",
  btnReject: "Refuser",
  btnMarkReady: "Marquer comme prête",
  readyIn: (min) => `Prêt dans ~${min} min`,
  moreItems: (n) => `+${n} article(s)`,
  acceptTitle: "Accepter la commande",
  prepTimeLabel: "Temps de préparation estimé :",
  cancelBtn: "Annuler",
  confirmBtn: "Confirmer",
  rejectTitle: "Refuser la commande",
  rejectConfirmMsg: "Êtes-vous sûr de vouloir refuser cette commande ?",
  toastAccepted: "Commande acceptée",
  toastRejected: "Commande refusée",
  toastReady: "Commande prête !",
  toastSimulated: "Commande simulée",
  toastSimulatedDesc: "Une nouvelle commande a été créée.",
  prepSuffix: (min) => `Préparation : ${min} min`,

  ordersTitle: "Historique des commandes",
  tabAll: "Toutes",
  tabDelivered: "Livrées",
  tabRejected: "Refusées",
  searchPlaceholder: "Numéro, client, plateforme...",
  colOrder: "Commande",
  colPlatform: "Plateforme",
  colStatus: "Statut",
  colTotal: "Total",
  noOrdersTitle: "Aucune commande trouvée",
  noOrdersHint: "Modifiez les filtres ou la recherche",
  itemWord: (n) => `article${n > 1 ? "s" : ""}`,

  statusPending: "En attente",
  statusAccepted: "En cuisine",
  statusReady: "Prête",
  statusPickedUp: "Livrée",
  statusRejected: "Refusée",

  trackingTitle: "Suivi de la commande",
  rejectedBanner: "Commande refusée",
  rejectedDefault: "Refusée par le restaurant",
  articlesSectionTitle: (n) => `Articles · ${n} article${n > 1 ? "s" : ""}`,
  subtotalLabel: "Sous-total",
  totalLabel: "Total",
  clientLabel: "Client",
  timingLabel: "Timing",
  receivedAt: "Reçue le",
  acceptedAt: "Acceptée à",
  readyAt: "Prête à",
  prepEstimated: "Préparation estimée",
  clientNote: "Note du client",
  deliveryMan: "Livreur",
  orderNotFound: "Commande introuvable.",
  btnMarkReadyShort: "Marquer prête",
  stepReceived: "Reçue",
  stepAccepted: "Acceptée",
  stepReady: "Prête",
  stepDelivered: "Livrée",

  alarmTitle: (n) => `${n} COMMANDE${n > 1 ? "S" : ""} EN ATTENTE`,
  alarmSubtitle: "Acceptez ou refusez pour arrêter l'alarme.",
  alarmRejectAll: "TOUT REFUSER",
  alarmAcceptAll: "TOUT ACCEPTER",
  alarmAndMore: (n) => `...et ${n} de plus`,

  settingsTitle: "Paramètres & Intégration",
  settingsSubtitle: "Configurez votre restaurant et connectez Bridge Eats",
  restaurantSection: "Mon restaurant",
  restaurantSectionSub: "Nom affiché dans le tableau de bord",
  namePlaceholder: "Nom de votre restaurant",
  saveBtn: "Enregistrer",
  integrationTitle: "Intégration Bridge Eats",
  integrationSubtitle: "Donnez ces informations à votre responsable Bridge Eats",
  integrationInfo: "Bridge Eats enverra automatiquement vos nouvelles commandes à cette URL en utilisant votre token secret. Dès qu'une commande arrive, l'alarme sonne et elle apparaît sur votre tableau de bord.",
  labelWebhookUrl: "URL du Webhook",
  labelHeader: "Header requis",
  labelToken: "Token secret",
  copyUrlTitle: "Copier l'URL",
  copyTokenTitle: "Copier le token",
  dangerTitle: "Zone de danger",
  dangerInfo: "Regénérer le token invalidera immédiatement l'ancien. Bridge Eats devra être mis à jour avec le nouveau token.",
  regenBtn: "Regénérer le token",
  regenDialogTitle: "Regénérer le token ?",
  regenDialogMsg: "L'ancien token sera immédiatement invalidé. Vous devrez mettre à jour votre configuration Bridge Eats.",
  inProgress: "En cours...",
  toastNameSaved: "Nom mis à jour",
  toastLoadError: "Erreur de chargement",
  toastError: "Erreur",
  toastNewToken: "Nouveau token généré",
  toastNewTokenDesc: "Mettez à jour votre configuration Bridge Eats.",
};

const ar: T = {
  liveLabel: "مباشر",
  pendingCountLabel: (n) => `${n} في الانتظار`,
  testAlarm: "اختبار المنبّه",
  navDashboard: "لوحة التحكم",
  navHistory: "السجل",
  navSettings: "الإعدادات",

  dashboardTitle: "لوحة التحكم",
  simulateBtn: "محاكاة طلب",
  simulateBtnShort: "محاكاة",
  statOrders: "الطلبات",
  statPending: "في الانتظار",
  statRevenue: "رقم اليوم",
  statAvgDelay: "متوسط الوقت",
  colNew: "طلبات جديدة",
  colKitchen: "في المطبخ",
  colReady: "جاهزة للتسليم",
  emptyPending: "لا توجد طلبات منتظرة",
  emptyKitchen: "لا توجد طلبات قيد التحضير",
  emptyReady: "لا توجد طلبات جاهزة",
  tabNew: "جديدة",
  tabKitchen: "المطبخ",
  tabReady: "جاهزة",
  btnAccept: "قبول",
  btnReject: "رفض",
  btnMarkReady: "تحديد كجاهز",
  readyIn: (min) => `جاهز خلال ~${min} دقيقة`,
  moreItems: (n) => `+${n} منتج(ات)`,
  acceptTitle: "قبول الطلب",
  prepTimeLabel: "وقت التحضير المقدّر:",
  cancelBtn: "إلغاء",
  confirmBtn: "تأكيد",
  rejectTitle: "رفض الطلب",
  rejectConfirmMsg: "هل أنت متأكد من رفض هذا الطلب؟",
  toastAccepted: "تم قبول الطلب",
  toastRejected: "تم رفض الطلب",
  toastReady: "الطلب جاهز!",
  toastSimulated: "طلب تجريبي",
  toastSimulatedDesc: "تم إنشاء طلب جديد.",
  prepSuffix: (min) => `التحضير: ${min} دقيقة`,

  ordersTitle: "سجل الطلبات",
  tabAll: "الكل",
  tabDelivered: "مسلّمة",
  tabRejected: "مرفوضة",
  searchPlaceholder: "الرقم، العميل، المنصة...",
  colOrder: "الطلب",
  colPlatform: "المنصة",
  colStatus: "الحالة",
  colTotal: "المجموع",
  noOrdersTitle: "لم يتم العثور على طلبات",
  noOrdersHint: "عدّل المرشحات أو البحث",
  itemWord: (n) => `منتج${n > 1 ? "" : ""}`,

  statusPending: "في الانتظار",
  statusAccepted: "في المطبخ",
  statusReady: "جاهز",
  statusPickedUp: "تم التسليم",
  statusRejected: "مرفوض",

  trackingTitle: "تتبع الطلب",
  rejectedBanner: "تم رفض الطلب",
  rejectedDefault: "رُفض من طرف المطعم",
  articlesSectionTitle: (n) => `المنتجات · ${n} منتج`,
  subtotalLabel: "المجموع الجزئي",
  totalLabel: "المجموع الكلي",
  clientLabel: "العميل",
  timingLabel: "التوقيت",
  receivedAt: "استُلم في",
  acceptedAt: "قُبل في",
  readyAt: "جاهز في",
  prepEstimated: "وقت التحضير المقدّر",
  clientNote: "ملاحظة العميل",
  deliveryMan: "السائق",
  orderNotFound: "الطلب غير موجود.",
  btnMarkReadyShort: "جاهز",
  stepReceived: "مستلَم",
  stepAccepted: "مقبول",
  stepReady: "جاهز",
  stepDelivered: "مسلَّم",

  alarmTitle: (n) => `${n} طلب${n > 1 ? "ات" : ""} في الانتظار`,
  alarmSubtitle: "اقبل أو ارفض لإيقاف المنبّه.",
  alarmRejectAll: "رفض الكل",
  alarmAcceptAll: "قبول الكل",
  alarmAndMore: (n) => `...و ${n} آخر`,

  settingsTitle: "الإعدادات والتكامل",
  settingsSubtitle: "أعدّ مطعمك واربطه بـ Bridge Eats",
  restaurantSection: "مطعمي",
  restaurantSectionSub: "الاسم المعروض في لوحة التحكم",
  namePlaceholder: "اسم مطعمك",
  saveBtn: "حفظ",
  integrationTitle: "تكامل Bridge Eats",
  integrationSubtitle: "أعطِ هذه المعلومات لمسؤول Bridge Eats",
  integrationInfo: "سيرسل Bridge Eats تلقائيًا طلباتك الجديدة إلى هذا الرابط باستخدام الرمز السري. بمجرد وصول الطلب، تُدق المنبّه ويظهر في لوحة التحكم.",
  labelWebhookUrl: "رابط Webhook",
  labelHeader: "الترويسة المطلوبة",
  labelToken: "الرمز السري",
  copyUrlTitle: "نسخ الرابط",
  copyTokenTitle: "نسخ الرمز",
  dangerTitle: "منطقة الخطر",
  dangerInfo: "إعادة توليد الرمز ستُلغي الرمز القديم فورًا. يجب تحديث إعدادات Bridge Eats.",
  regenBtn: "إعادة توليد الرمز",
  regenDialogTitle: "إعادة توليد الرمز؟",
  regenDialogMsg: "سيُلغى الرمز القديم فورًا. يجب تحديث إعدادات Bridge Eats.",
  inProgress: "جارٍ...",
  toastNameSaved: "تم حفظ الاسم",
  toastLoadError: "خطأ في التحميل",
  toastError: "خطأ",
  toastNewToken: "تم توليد رمز جديد",
  toastNewTokenDesc: "حدّث إعدادات Bridge Eats.",
};

const ber: T = {
  liveLabel: "Aqdec",
  pendingCountLabel: (n) => `${n} igemmen`,
  testAlarm: "Tirmit n tazuzt",
  navDashboard: "Amkan n useqdec",
  navHistory: "Amazray",
  navSettings: "Isntaln",

  dashboardTitle: "Amkan n useqdec",
  simulateBtn: "Rnu asenteṃ",
  simulateBtnShort: "Rnu",
  statOrders: "Isenteṃmen",
  statPending: "Igemmen",
  statRevenue: "Asfu n wass",
  statAvgDelay: "Azal amzwaru",
  colNew: "Isenteṃmen imaynutn",
  colKitchen: "Deg tetturt",
  colReady: "Ilulnen",
  emptyPending: "Ula d yan ur igeṃṃ",
  emptyKitchen: "Ula d yan deg tetturt",
  emptyReady: "Ula d yan ilul",
  tabNew: "Imaynutn",
  tabKitchen: "Tetturt",
  tabReady: "Ilulnen",
  btnAccept: "Qbel",
  btnReject: "Drs",
  btnMarkReady: "Ssntiṃ ilul",
  readyIn: (min) => `Ilul ~${min} tsdditin`,
  moreItems: (n) => `+${n} anebdu`,
  acceptTitle: "Qbel asenteṃ",
  prepTimeLabel: "Azal n ussnfl:",
  cancelBtn: "Sefsex",
  confirmBtn: "Snmmer",
  rejectTitle: "Drs asenteṃ",
  rejectConfirmMsg: "Tebɣiḍ ad tdrsed asenteṃ-a?",
  toastAccepted: "Asenteṃ ittwaqbel",
  toastRejected: "Asenteṃ ittuwers",
  toastReady: "Asenteṃ ilul!",
  toastSimulated: "Asenteṃ n tirmit",
  toastSimulatedDesc: "Yettwarna asenteṃ amaynut.",
  prepSuffix: (min) => `Assnfl: ${min} tsdditin`,

  ordersTitle: "Amazray n isenteṃmen",
  tabAll: "Merra",
  tabDelivered: "Ittufsaren",
  tabRejected: "Ittudrsn",
  searchPlaceholder: "Uṭṭun, amgur, tanekra...",
  colOrder: "Asenteṃ",
  colPlatform: "Tanekra",
  colStatus: "Addad",
  colTotal: "Asarag",
  noOrdersTitle: "Ula d yan ur yettwafin",
  noOrdersHint: "Snfel imsizdayen neɣ anadi",
  itemWord: (n) => `anebdu${n > 1 ? "ten" : ""}`,

  statusPending: "Igemmen",
  statusAccepted: "Deg tetturt",
  statusReady: "Ilul",
  statusPickedUp: "Ittufs",
  statusRejected: "Ittuders",

  trackingTitle: "Ansuf n usenteṃ",
  rejectedBanner: "Asenteṃ ittuwers",
  rejectedDefault: "Ittuwers seg taddart",
  articlesSectionTitle: (n) => `Inebduten · ${n} anebdu`,
  subtotalLabel: "Asarag amzwaru",
  totalLabel: "Asarag ummid",
  clientLabel: "Amgur",
  timingLabel: "Azman",
  receivedAt: "Yettwassn ass",
  acceptedAt: "Ittwaqbel i",
  readyAt: "Ilul i",
  prepEstimated: "Azal n ussnfl",
  clientNote: "Tamaɣunt n umgur",
  deliveryMan: "Aslkan",
  orderNotFound: "Asenteṃ ur yettwafen.",
  btnMarkReadyShort: "Ssntiṃ ilul",
  stepReceived: "Yettwassn",
  stepAccepted: "Ittwaqbel",
  stepReady: "Ilul",
  stepDelivered: "Ittufs",

  alarmTitle: (n) => `${n} ASENTEṂ${n > 1 ? "EN" : ""} IGEMMEN`,
  alarmSubtitle: "Qbel neɣ drs ad tsefsxeḍ tazuzt.",
  alarmRejectAll: "DRS MERRA",
  alarmAcceptAll: "QBEL MERRA",
  alarmAndMore: (n) => `...d ${n} nniḍen`,

  settingsTitle: "Isntaln & Asqqamu",
  settingsSubtitle: "Sntel taddart-inek u qqu Bridge Eats",
  restaurantSection: "Taddart-iw",
  restaurantSectionSub: "Isem deg umkan n useqdec",
  namePlaceholder: "Isem n taddart-inek",
  saveBtn: "Sekles",
  integrationTitle: "Asqqamu n Bridge Eats",
  integrationSubtitle: "Aker talɣut-a i umsnalti n Bridge Eats",
  integrationInfo: "Bridge Eats ad issiweḍ s wudem awurman isenteṃmen-inek imaynutn ɣer URL-a s useqdec n token-inek asusligen. Ticki d-yuɣal wasenteṃ, tazuzt tessawel u d-itban deg umkan n useqdec.",
  labelWebhookUrl: "URL n Webhook",
  labelHeader: "Header iḥettem",
  labelToken: "Token asusligen",
  copyUrlTitle: "Nɣel URL",
  copyTokenTitle: "Nɣel token",
  dangerTitle: "Amazir n lxeṭṭ",
  dangerInfo: "Asirew n token ad yessefsex aqdim ticki d-yuli. Ilaq ad tesnefleḍ Bridge Eats s token amaynut.",
  regenBtn: "Sirew token amaynut",
  regenDialogTitle: "Sirew token?",
  regenDialogMsg: "Token aqdim ad yettwasefseḫ ticki d-yuli. Ilaq ad tesnefleḍ Bridge Eats.",
  inProgress: "Iteddu...",
  toastNameSaved: "Isem yettwasekles",
  toastLoadError: "Tuccḍa deg uḥraz",
  toastError: "Tuccḍa",
  toastNewToken: "Token amaynut yettwarna",
  toastNewTokenDesc: "Snifel Bridge Eats s token amaynut.",
};

export const translations: Record<Lang, T> = { fr, ar, ber };
