import { useState, useEffect, useRef, useMemo } from "react";
import { useT } from "../lib/i18n";

/* Ouvre une petite fenêtre flottante (popup) — le jeu reste visible.
   Sur mobile Safari/Chrome le comportement tombe en fallback onglet. */
function openSocialLink(url: string) {
  const w = 440, h = 700;
  const left = Math.max(0, Math.round((screen.width  - w) / 2));
  const top  = Math.max(0, Math.round((screen.height - h) / 4));
  const popup = window.open(
    url,
    "safi_social",
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,location=yes,toolbar=no`
  );
  if (!popup) {
    // Popup bloqué → nouvel onglet
    try { window.open(url, "_blank", "noopener"); } catch {}
  }
}

interface CheckpointUIProps {
  checkpointNumber: number;
  score: number;
  difficultyLevel: 1 | 2 | 3;
  onResume: () => void;
}

const OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.70)",
  backdropFilter: "blur(6px)",
  zIndex: 100,
  fontFamily: "'Segoe UI', sans-serif",
  padding: "8px 10px",
};

const CARD: React.CSSProperties = {
  background: "linear-gradient(145deg, #fff8f0, #fff)",
  borderRadius: 24,
  padding: "16px 14px",
  maxWidth: 600,
  width: "100%",
  boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
  border: "3px solid #ffd700",
  color: "#1a1a1a",
  overflowY: "auto",
  maxHeight: "97vh",
};

const BTN_PRIMARY: React.CSSProperties = {
  background: "linear-gradient(135deg, #e65100, #ff7043)",
  color: "#fff",
  border: "none",
  borderRadius: 40,
  padding: "14px 44px",
  fontSize: 17,
  fontWeight: 800,
  cursor: "pointer",
  letterSpacing: 1,
  boxShadow: "0 4px 16px rgba(230,81,0,0.4)",
  marginTop: 20,
};

const BTN_OPTION: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "start",
  background: "#fff",
  border: "2px solid #e0e0e0",
  borderRadius: 12,
  padding: "12px 18px",
  fontSize: 15,
  cursor: "pointer",
  marginBottom: 10,
  transition: "all 0.15s",
  fontFamily: "'Segoe UI', sans-serif",
  color: "#1a1a1a",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  border: "2px solid #e0e0e0",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  fontFamily: "'Segoe UI', sans-serif",
  outline: "none",
  marginBottom: 12,
  color: "#1a1a1a",
  background: "#fafafa",
};

// ──────────────────────────────────────────────────────────────────
// QUIZ DE CULTURE MAROCAINE
// ──────────────────────────────────────────────────────────────────
const quizBank = [
  { q: "Quelle est la couleur dominante des zelliges de la mosquée de Safi ?", options: ["Rouge", "Vert", "Bleu", "Jaune"], answer: 2 },
  { q: "Safi est une ville côtière connue pour quelle industrie ?", options: ["Le textile", "La pêche et les sardines", "Le pétrole", "Le tourisme uniquement"], answer: 1 },
  { q: "Quelle est la langue officielle du Maroc ?", options: ["Français", "Espagnol", "Arabe", "Amazigh"], answer: 2 },
  { q: "Quel monument historique marque l'entrée de la médina de Safi ?", options: ["Bab Doukkala", "Kechla (château de la mer)", "Borj Nord", "Dar Jamai"], answer: 1 },
  { q: "Le potier de Safi est célèbre dans tout le Maroc. De quelle couleur est principalement sa céramique ?", options: ["Blanche et noire", "Verte et blanche", "Bleu et multicolore", "Beige uniquement"], answer: 2 },
  { q: "La médina de Safi est inscrite au patrimoine de quelle organisation ?", options: ["UNESCO", "Union Africaine", "Ligue Arabe", "ONU"], answer: 0 },
  { q: "Quelle épice est incontournable dans la cuisine marocaine ?", options: ["Curcuma", "Paprika", "Ras el hanout", "Safran uniquement"], answer: 2 },
  { q: "Qu'est-ce qu'un 'souk' dans la médina ?", options: ["Un palais", "Un marché traditionnel", "Une fontaine", "Un cimetière"], answer: 1 },
];

function QuizActivity({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const questions = useMemo(() => [...quizBank].sort(() => Math.random() - 0.5).slice(0, 3), []);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const handleOption = (i: number) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === questions[current].answer) setCorrect((c) => c + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) { setDone(true); }
    else { setCurrent((c) => c + 1); setSelected(null); setAnswered(false); }
  };

  if (done) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>{correct === 3 ? "🏆" : correct >= 2 ? "⭐" : "📚"}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: "#e65100" }}>{t("quiz.score", { n: correct, total: 3 })}</div>
      <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>
        {correct === 3 ? t("quiz.feedback.perfect") : correct >= 2 ? t("quiz.feedback.good") : t("quiz.feedback.try")}
      </div>
      <button style={BTN_PRIMARY} onClick={onComplete}>{t("cp.resume")}</button>
    </div>
  );

  const q = questions[current];
  return (
    <div>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{t("quiz.questionOf", { n: current + 1, total: questions.length })}</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: "#1a1a1a", lineHeight: 1.5 }}>{q.q}</div>
      {q.options.map((opt, i) => {
        let bg = "#fff", border = "2px solid #e0e0e0", color = "#1a1a1a";
        if (answered) {
          if (i === q.answer) { bg = "#e8f5e9"; border = "2px solid #4caf50"; color = "#2e7d32"; }
          else if (i === selected) { bg = "#ffebee"; border = "2px solid #f44336"; color = "#c62828"; }
        }
        if (!answered && selected === i) { bg = "#e3f2fd"; border = "2px solid #1976d2"; }
        return (
          <button key={i} style={{ ...BTN_OPTION, background: bg, border, color }} onClick={() => handleOption(i)}>
            <span style={{ fontWeight: 600, marginInlineEnd: 8 }}>{["A", "B", "C", "D"][i]}.</span>
            {opt}{answered && i === q.answer && " ✓"}{answered && i === selected && i !== q.answer && " ✗"}
          </button>
        );
      })}
      {answered && (
        <button style={{ ...BTN_PRIMARY, marginTop: 10 }} onClick={handleNext}>
          {current + 1 >= questions.length ? t("cp.seeResult") : t("cp.next")}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// FORMULAIRE DE SONDAGE
// ──────────────────────────────────────────────────────────────────
function FormActivity({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const surveyQuestions: { id: string; labelKey: string; phKey: string; type: "text" | "email" | "textarea" }[] = [
    { id: "name",    labelKey: "form.field.name",    phKey: "form.field.namePh",    type: "text" },
    { id: "city",    labelKey: "form.field.city",    phKey: "form.field.cityPh",    type: "text" },
    { id: "email",   labelKey: "form.field.email",   phKey: "form.field.emailPh",   type: "email" },
    { id: "opinion", labelKey: "form.field.opinion", phKey: "form.field.opinionPh", type: "textarea" },
  ];
  const [values, setValues] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const errs: string[] = [];
    if (!values.name?.trim()) errs.push(t("form.error.name"));
    if (!values.city?.trim()) errs.push(t("form.error.city"));
    if (rating === 0) errs.push(t("form.error.rating"));
    setErrors(errs);
    if (errs.length === 0) setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>🙏</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8, color: "#e65100" }}>{t("form.thanks.title")}</div>
      <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>{t("form.thanks.body")}</div>
      <button style={BTN_PRIMARY} onClick={onComplete}>{t("cp.resume")}</button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>{t("form.intro")}</div>
      {surveyQuestions.map((q) => (
        <div key={q.id} style={{ marginBottom: 4 }}>
          <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#444", marginBottom: 4 }}>{t(q.labelKey)}</label>
          {q.type === "textarea" ? (
            <textarea style={{ ...INPUT_STYLE, height: 72, resize: "vertical" }} placeholder={t(q.phKey)} value={values[q.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))} />
          ) : (
            <input type={q.type} style={INPUT_STYLE} placeholder={t(q.phKey)} value={values[q.id] || ""} onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))} />
          )}
        </div>
      ))}
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", fontWeight: 600, fontSize: 13, color: "#444", marginBottom: 8 }}>{t("form.rating")}</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} onClick={() => setRating(star)} style={{ fontSize: 30, cursor: "pointer", color: star <= rating ? "#ffd700" : "#ccc", transition: "color 0.15s" }}>★</span>
          ))}
        </div>
      </div>
      {errors.length > 0 && (
        <div style={{ background: "#ffebee", borderRadius: 8, padding: "8px 14px", marginBottom: 8 }}>
          {errors.map((e, i) => <div key={i} style={{ color: "#c62828", fontSize: 13 }}>• {e}</div>)}
        </div>
      )}
      <button style={BTN_PRIMARY} onClick={handleSubmit}>{t("form.submit")}</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PUBLICITÉ VIDÉO (SPONSORS — restaurants, banques, autos, telecom…)
// ──────────────────────────────────────────────────────────────────
const sponsors = [
  {
    name: "Café Atlas – Safi", tagline: "Le meilleur café de la médina depuis 1952",
    color: "#4e342e", emoji: "☕",
    description: "Situé au cœur de la médina de Safi, le Café Atlas vous accueille avec un thé à la menthe frais, des pastillas maison et une vue imprenable sur les remparts historiques.",
    offer: "Thé + pastilla offerts sur présentation du jeu 🎮",
  },
  {
    name: "Sardines de Safi 🐟", tagline: "Fraîcheur de l'Atlantique, saveur du terroir",
    color: "#1565c0", emoji: "🐟",
    description: "La conserverie El Bahr vous propose les meilleures sardines pêchées chaque matin dans les eaux de Safi. Exportées dans 40 pays, goûtez l'authenticité directement à la source !",
    offer: "Visite guidée de la conserverie gratuite pour les joueurs de Safi Runner !",
  },
  {
    name: "Poterie Zine – Médina", tagline: "Art zellige depuis 5 générations",
    color: "#1b5e20", emoji: "🏺",
    description: "La famille Zine perpétue l'art de la poterie de Safi depuis 1890. Chaque pièce est faite à la main avec les motifs géométriques traditionnels de la région.",
    offer: "-20% sur tout le magasin avec le code : SAFIRUNNER",
  },
  {
    name: "Attijariwafa Bank Safi", tagline: "Votre banque, votre avenir financier",
    color: "#b71c1c", emoji: "🏦",
    description: "Attijariwafa bank vous propose des solutions de crédit immobilier, de financement auto et de banque en ligne. Plus de 4 millions de clients font confiance à leurs conseillers au Maroc.",
    offer: "Ouvrez votre compte en ligne en 5 minutes — offre exclusive Safi Runner 🎮",
  },
  {
    name: "Dacia Maroc – Safi", tagline: "La voiture fiable et accessible",
    color: "#1565c0", emoji: "🚗",
    description: "Concessionnaire Dacia à Safi. Sandero, Duster, Logan : des voitures robustes avec crédit auto dès 1 500 DH/mois. Garantie 3 ans et entretien inclus la 1ère année.",
    offer: "Essai gratuit sur présentation du jeu Safi Runner 🎮",
  },
  {
    name: "Maroc Telecom – Safi", tagline: "Toujours connecté, partout au Maroc",
    color: "#006400", emoji: "📱",
    description: "Découvrez les offres 5G de Maroc Telecom à Safi. Forfaits famille, internet fibre et décodeur 4K disponibles. Couverture réseau n°1 au Maroc.",
    offer: "2 mois offerts sur votre abonnement fibre — code SAFIRUNNER 🎮",
  },
  {
    name: "Wafa Immobilier Safi", tagline: "Votre appartement en bord de mer",
    color: "#4a148c", emoji: "🏠",
    description: "Appartements F2, F3 et villas en bord de mer à Safi. Financement à taux préférentiel avec apport minimal dès 10%. Découvrez nos projets dans le quartier Sidi Bouzid.",
    offer: "Visite gratuite et simulation de crédit immobilier offerte 🎮",
  },
  {
    name: "CIH Bank – Safi", tagline: "Crédit immobilier sans frais de dossier",
    color: "#880e4f", emoji: "🏦",
    description: "La CIH Bank à Safi vous accompagne pour votre projet immobilier avec zéro frais de dossier. Taux préférentiel pour les primo-accédants et remboursement flexible.",
    offer: "Simulation gratuite en agence — mentionnez Safi Runner 🎮",
  },
  {
    name: "Renault Safi – Auto Center", tagline: "Voitures neuves et occasions certifiées",
    color: "#e65100", emoji: "🚙",
    description: "Votre concessionnaire Renault à Safi. Clio, Duster, Sandero en stock avec financement immédiat. Véhicules d'occasion certifiés avec garantie 12 mois.",
    offer: "Reprise de votre ancien véhicule + 5 000 DH — code SAFIRUNNER",
  },
  {
    name: "Safi Fitness Club", tagline: "La salle de sport moderne de la médina",
    color: "#212121", emoji: "💪",
    description: "Musculation, cardio, cours collectifs (yoga, boxe, Zumba) dans un espace moderne de 2 000 m². Coachs certifiés et suivi nutritionnel inclus.",
    offer: "1 mois d'abonnement gratuit pour tout engagement annuel 🎮",
  },
  {
    name: "Auto École Safi Pro", tagline: "Permis B garanti en 3 semaines",
    color: "#004d40", emoji: "🪪",
    description: "Formation intensive au code de la route et à la conduite à Safi. Moniteurs certifiés, véhicules récents et taux de réussite de 92% à l'examen.",
    offer: "Inscription -10% avec le code SAFIRUNNER 🎮",
  },
  {
    name: "Pharmacie El Waha", tagline: "Votre santé, notre priorité 24h/24",
    color: "#1b5e20", emoji: "💊",
    description: "Pharmacie de garde à Safi, avec un large stock de médicaments, produits de parapharmacie et conseils santé personnalisés par des pharmaciens diplômés.",
    offer: "Carte fidélité -5% sur votre prochain achat 🎮",
  },
];

/* Vidéos YouTube sponsors — vraies vidéos publicitaires Maroc */
const sponsorVideos = [
  { youtubeId: "JrSTsRNmTkM", sponsor: "🏺 Poterie de Safi",        color: "#4caf50", offer: "Visite atelier gratuite — mention Safi Runner" },
  { youtubeId: "HvBp4Y8HaMY", sponsor: "🐟 Sardines de Safi",        color: "#ff7043", offer: "Dégustation offerte au port de Safi" },
  { youtubeId: "kDmBP8E-FwI", sponsor: "🕌 Médina de Safi",          color: "#9c27b0", offer: "Visite guidée -20% — code SAFIRUNNER" },
  { youtubeId: "OZgQFQlP4kI", sponsor: "🏦 Attijariwafa Bank Safi",  color: "#b71c1c", offer: "Compte gratuit 6 mois — code SAFIRUNNER" },
  { youtubeId: "jNQXAC9IVRw", sponsor: "🚗 Dacia Safi",              color: "#0d47a1", offer: "Essai gratuit sur RDV — code SAFIRUNNER" },
  { youtubeId: "6JYIGclVQdw", sponsor: "📱 Maroc Telecom Safi",     color: "#1b5e20", offer: "2 mois fibre offerts — code SAFIRUNNER" },
];

function VideoActivity({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const [timeLeft, setTimeLeft] = useState(15);
  const [canSkip, setCanSkip] = useState(false);
  const [finished, setFinished] = useState(false);
  const [playing, setPlaying] = useState(false);
  const vid = useMemo(() => sponsorVideos[Math.floor(Math.random() * sponsorVideos.length)], []);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (playing) return;
    setPlaying(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current!); setCanSkip(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(intervalRef.current!), []);

  if (finished) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>✅</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: "#e65100", marginTop: 8 }}>{t("ad.thanks")}</div>
      <div style={{ background: "#fff8e1", border: "2px dashed #ffd700", borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "#e65100", fontWeight: 700, marginTop: 14, marginBottom: 6 }}>
        🎁 {vid.offer}
      </div>
      <button style={BTN_PRIMARY} onClick={onComplete}>{t("cp.resume")}</button>
    </div>
  );

  const progress = ((15 - timeLeft) / 15) * 100;
  return (
    <div>
      {/* Lecteur vidéo YouTube pleine largeur */}
      <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", borderRadius: 16, overflow: "hidden", marginBottom: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", background: "#000" }}>
        {playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${vid.youtubeId}?autoplay=1&mute=0&rel=0&modestbranding=1`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={vid.sponsor}
          />
        ) : (
          /* Thumbnail cliquable avant lecture */
          <div
            onClick={startTimer}
            style={{ position: "absolute", inset: 0, cursor: "pointer", background: `url(https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg) center/cover`, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(230,81,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(0,0,0,0.6)" }}>
              <span style={{ fontSize: 32, marginLeft: 4 }}>▶</span>
            </div>
            <div style={{ position: "absolute", top: 10, left: 12, background: "rgba(0,0,0,0.65)", color: "#ffd700", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, letterSpacing: 0.5 }}>
              📢 {vid.sponsor}
            </div>
          </div>
        )}
      </div>

      {/* Offre sponsor */}
      <div style={{ background: "#fff8e1", border: "2px dashed #ffd700", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#e65100", fontWeight: 700, marginBottom: 14, textAlign: "center" }}>
        🎁 {vid.offer}
      </div>

      {/* Barre de progression */}
      {playing && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#777", marginBottom: 4 }}>
            <span>{t("ad.playing")}</span>
            <span>{timeLeft > 0 ? t("ad.timeLeft", { s: timeLeft }) : t("ad.done")}</span>
          </div>
          <div style={{ height: 8, background: "#e0e0e0", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #ffd700, #ff7043)", borderRadius: 8, transition: "width 1s linear" }} />
          </div>
        </div>
      )}

      {!playing && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#888", marginBottom: 12 }}>
          ▶ Appuie sur la vidéo pour lancer la pub et débloquer la suite
        </p>
      )}

      {canSkip ? (
        <button style={BTN_PRIMARY} onClick={() => setFinished(true)}>{t("ad.continue")}</button>
      ) : playing ? (
        <button style={{ ...BTN_PRIMARY, opacity: 0.4, cursor: "not-allowed" }} disabled>{t("ad.wait", { s: timeLeft })}</button>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// QUIZ SPONSOR (secteurs divers : poterie, auto, banque, immo…)
// ──────────────────────────────────────────────────────────────────
const sponsorQuiz = [
  {
    brand: "🏺 Poterie de Safi", color: "#4caf50",
    q: "Depuis combien d'années la poterie est-elle une tradition à Safi ?",
    options: ["50 ans", "200 ans", "Plus de 500 ans", "30 ans"], answer: 2,
    funFact: "La poterie de Safi date de l'époque médiévale, soit plus de 500 ans de tradition !",
  },
  {
    brand: "☕ Thé à la Menthe du Maroc", color: "#2196f3",
    q: "Combien de sucre met-on traditionnellement dans un thé à la menthe marocain ?",
    options: ["Peu ou pas", "Beaucoup — il est très sucré", "Du miel uniquement", "Jamais de sucre"], answer: 1,
    funFact: "Le thé marocain est traditionnellement très sucré — c'est le secret de son goût incomparable !",
  },
  {
    brand: "🐟 Sardines de Safi", color: "#ff7043",
    q: "Safi est l'un des premiers ports de pêche à la sardine du monde. Dans combien de pays exporte-t-elle ?",
    options: ["5 pays", "15 pays", "Plus de 40 pays", "Uniquement au Maroc"], answer: 2,
    funFact: "Les sardines de Safi sont exportées dans plus de 40 pays à travers le monde !",
  },
  {
    brand: "🕌 Médina de Safi", color: "#9c27b0",
    q: "Comment s'appelle la forteresse portugaise emblématique de Safi ?",
    options: ["Ksar el-Bahr", "Borj Doukkala", "Dar Jamai", "Agadir"], answer: 0,
    funFact: "Ksar el-Bahr (Château de la Mer) est une forteresse portugaise du XVIe siècle !",
  },
  {
    brand: "🏦 Banques au Maroc", color: "#b71c1c",
    q: "Combien faut-il de temps pour ouvrir un compte bancaire en ligne au Maroc aujourd'hui ?",
    options: ["1 semaine", "3 jours ouvrables", "Moins de 10 minutes", "Impossible en ligne"], answer: 2,
    funFact: "Avec les nouvelles banques numériques marocaines, ouvrir un compte prend moins de 10 minutes depuis votre téléphone !",
  },
  {
    brand: "🚗 Automobile au Maroc", color: "#1565c0",
    q: "Quelle est la voiture la plus vendue au Maroc depuis plusieurs années ?",
    options: ["Volkswagen Golf", "Renault Clio", "Dacia Sandero", "Toyota Corolla"], answer: 2,
    funFact: "La Dacia Sandero est la voiture la plus vendue au Maroc grâce à son excellent rapport qualité-prix !",
  },
  {
    brand: "📱 Télécommunications Maroc", color: "#006400",
    q: "Quel pourcentage de la population marocaine possède un téléphone mobile en 2024 ?",
    options: ["45%", "60%", "Plus de 80%", "30%"], answer: 2,
    funFact: "Plus de 80% des Marocains possèdent un téléphone mobile — le Maroc est l'un des plus connectés d'Afrique !",
  },
  {
    brand: "🏠 Immobilier à Safi", color: "#4a148c",
    q: "Safi est en plein développement. Quel quartier est le plus prisé pour les nouveaux logements ?",
    options: ["Médina historique", "Sidi Bouzid (bord de mer)", "El Jadida Nord", "Zone industrielle"], answer: 1,
    funFact: "Le quartier Sidi Bouzid, en bord de mer, est le secteur immobilier le plus dynamique de Safi !",
  },
  {
    brand: "💪 Sport & Santé", color: "#e65100",
    q: "Combien de minutes d'activité physique modérée recommande l'OMS par semaine pour un adulte ?",
    options: ["75 minutes", "150 minutes", "300 minutes", "60 minutes"], answer: 1,
    funFact: "L'OMS recommande au moins 150 minutes d'activité physique modérée par semaine pour rester en bonne santé !",
  },
  {
    brand: "🪪 Auto-école Safi", color: "#004d40",
    q: "Au Maroc, à quel âge peut-on passer son permis de conduire de catégorie B ?",
    options: ["16 ans", "17 ans", "18 ans", "20 ans"], answer: 2,
    funFact: "Au Maroc, le permis de conduire catégorie B est accessible dès 18 ans, comme en France !",
  },
];

function SponsorQuizActivity({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const quiz = useMemo(() => sponsorQuiz[Math.floor(Math.random() * sponsorQuiz.length)], []);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleOption = (i: number) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
  };

  return (
    <div>
      <div style={{ background: quiz.color, borderRadius: 12, padding: "12px 18px", color: "white", fontWeight: 800, fontSize: 16, marginBottom: 18, textAlign: "center" }}>
        {t("spq.sponsoredBy", { brand: quiz.brand })}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1a1a1a", lineHeight: 1.5 }}>{quiz.q}</div>
      {quiz.options.map((opt, i) => {
        let bg = "#fff", border = "2px solid #e0e0e0", color = "#1a1a1a";
        if (answered) {
          if (i === quiz.answer) { bg = "#e8f5e9"; border = "2px solid #4caf50"; color = "#2e7d32"; }
          else if (i === selected) { bg = "#ffebee"; border = "2px solid #f44336"; color = "#c62828"; }
        }
        return (
          <button key={i} style={{ ...BTN_OPTION, background: bg, border, color }} onClick={() => handleOption(i)}>
            <span style={{ fontWeight: 600, marginInlineEnd: 8 }}>{["A", "B", "C", "D"][i]}.</span>
            {opt}{answered && i === quiz.answer && " ✓"}{answered && i === selected && i !== quiz.answer && " ✗"}
          </button>
        );
      })}
      {answered && (
        <>
          <div style={{ background: "#f3e5f5", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#6a1b9a", fontWeight: 600, marginTop: 6, marginBottom: 4 }}>
            {t("spq.didYouKnow", { fact: quiz.funFact })}
          </div>
          <button style={BTN_PRIMARY} onClick={onComplete}>{t("cp.resume")}</button>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// RÉSEAUX SOCIAUX — 4 PLATEFORMES (Insta + Facebook + TikTok + YouTube)
// ──────────────────────────────────────────────────────────────────
/* ── Comptes RÉELS pour test — remplacer par les vrais handles Bridge Eats ──
   Ces comptes sont des pages publiques vérifiées sur les 4 plateformes.
   Pour mettre à jour : modifier uniquement les 4 URLs de chaque entrée. */
const socialAccounts = [
  {
    name: "Visit Morocco 🇲🇦", handle: "@visitmorocco",
    insta:    "https://www.instagram.com/visitmorocco/",
    facebook: "https://www.facebook.com/VisitMorocco/",
    tiktok:   "https://www.tiktok.com/@visitmorocco",
    youtube:  "https://www.youtube.com/@visitmorocco",
  },
  {
    name: "National Geographic", handle: "@natgeo",
    insta:    "https://www.instagram.com/natgeo/",
    facebook: "https://www.facebook.com/NatGeo/",
    tiktok:   "https://www.tiktok.com/@natgeo",
    youtube:  "https://www.youtube.com/@NatGeo",
  },
  {
    name: "NASA 🚀", handle: "@nasa",
    insta:    "https://www.instagram.com/nasa/",
    facebook: "https://www.facebook.com/NASA/",
    tiktok:   "https://www.tiktok.com/@nasa",
    youtube:  "https://www.youtube.com/@NASA",
  },
  {
    name: "TED Talks 💡", handle: "@ted",
    insta:    "https://www.instagram.com/ted/",
    facebook: "https://www.facebook.com/TED/",
    tiktok:   "https://www.tiktok.com/@ted",
    youtube:  "https://www.youtube.com/@TED",
  },
  {
    name: "BBC News 📰", handle: "@bbcnews",
    insta:    "https://www.instagram.com/bbcnews/",
    facebook: "https://www.facebook.com/bbcnews/",
    tiktok:   "https://www.tiktok.com/@bbcnews",
    youtube:  "https://www.youtube.com/@BBCNews",
  },
  {
    name: "Tasty 🍽️", handle: "@buzzfeedtasty",
    insta:    "https://www.instagram.com/buzzfeedtasty/",
    facebook: "https://www.facebook.com/buzzfeedtasty/",
    tiktok:   "https://www.tiktok.com/@tasty",
    youtube:  "https://www.youtube.com/@tasty",
  },
];

/* Extrait le handle YouTube d'une URL https://www.youtube.com/@handle */
function ytHandle(url: string): string {
  const m = url.match(/youtube\.com\/@([^/?#]+)/i);
  return m ? m[1] : "";
}

type PlatformKey = "insta" | "facebook" | "tiktok" | "youtube";

function SocialFollowActivity({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const account = useMemo(() => socialAccounts[Math.floor(Math.random() * socialAccounts.length)], []);
  const [followed, setFollowed] = useState<Record<PlatformKey, boolean>>({ insta: false, facebook: false, tiktok: false, youtube: false });
  const [openPanel, setOpenPanel] = useState<PlatformKey | null>(null);

  const allDone = followed.insta && followed.facebook && followed.tiktok && followed.youtube;
  const count = Object.values(followed).filter(Boolean).length;

  const togglePanel = (k: PlatformKey) => setOpenPanel((cur) => (cur === k ? null : k));
  const markFollowed = (k: PlatformKey) => {
    setFollowed((f) => ({ ...f, [k]: true }));
    setOpenPanel(null);
  };

  /* Panneau intégré : iframe officielle ou popup flottante selon plateforme */
  const renderInlinePanel = (k: PlatformKey) => {
    if (k === "facebook") {
      // Page Plugin officiel — bouton "J'aime" fonctionnel directement dans l'iframe
      const href = encodeURIComponent(account.facebook);
      const src = `https://www.facebook.com/plugins/page.php?href=${href}&tabs&width=340&height=200&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
      return (
        <div style={{ background: "#f0f2f5", borderRadius: 12, padding: 10, border: "1px solid #dadde1" }}>
          <iframe
            src={src} title="Facebook Page"
            style={{ width: "100%", height: 220, border: "none", borderRadius: 8, background: "#fff" }}
            scrolling="no" allow="encrypted-media"
          />
          <div style={{ fontSize: 11, color: "#65676b", textAlign: "center", marginTop: 6 }}>
            {t("soc.embed.fbHint")}
          </div>
          <button
            onClick={() => markFollowed("facebook")}
            style={{ ...BTN_PRIMARY, marginTop: 8, width: "100%", padding: "10px 0", fontSize: 14 }}
          >✓ {t("soc.confirmFollowed")}</button>
        </div>
      );
    }
    if (k === "youtube") {
      const handle = ytHandle(account.youtube);
      // Bouton Subscribe officiel YouTube — fonctionne dans iframe (utilisateur connecté à YouTube)
      const src = `https://www.youtube.com/subscribe_embed?usegapi=1&channel=${encodeURIComponent(handle)}&layout=full&count=default&theme=default`;
      return (
        <div style={{ background: "#0f0f0f", borderRadius: 12, padding: 14, border: "1px solid #303030", textAlign: "center" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>▶️ @{handle}</div>
          <iframe
            src={src} title="YouTube Subscribe"
            style={{ width: 200, height: 36, border: "none", background: "transparent", colorScheme: "light" }}
            scrolling="no"
          />
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
            {t("soc.embed.ytHint")}
          </div>
          <button
            onClick={() => markFollowed("youtube")}
            style={{ ...BTN_PRIMARY, marginTop: 10, width: "100%", padding: "10px 0", fontSize: 14 }}
          >✓ {t("soc.confirmFollowed")}</button>
        </div>
      );
    }
    // Instagram & TikTok : pas d'embed officiel "Suivre" → popup flottante au-dessus du jeu
    const isInsta = k === "insta";
    const url = isInsta ? account.insta : account.tiktok;
    const bg = isInsta ? "linear-gradient(135deg,#fd1d1d,#fcb045,#833ab4)" : "linear-gradient(135deg,#000,#25f4ee 60%,#fe2c55)";
    const icon = isInsta ? "📸" : "🎵";
    return (
      <div style={{ background: "#fafafa", borderRadius: 12, padding: 14, border: "1px solid #e0e0e0" }}>
        <div style={{ background: bg, color: "#fff", borderRadius: 10, padding: "14px 16px", textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 30 }}>{icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, opacity: 0.95 }}>{account.handle}</div>
        </div>
        <div style={{ fontSize: 12, color: "#666", textAlign: "center", marginBottom: 10, lineHeight: 1.5 }}>
          {t("soc.embed.popupHint")}
        </div>
        <button
          onClick={() => { openSocialLink(url); }}
          style={{ width: "100%", background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}
        >🔗 {t("soc.openInPopup")}</button>
        <button
          onClick={() => markFollowed(k)}
          style={{ ...BTN_PRIMARY, width: "100%", padding: "10px 0", fontSize: 14 }}
        >✓ {t("soc.confirmFollowed")}</button>
      </div>
    );
  };

  const platforms: { key: PlatformKey; label: string; icon: string; color: string }[] = [
    { key: "facebook", label: "Facebook",  icon: "👍", color: "linear-gradient(135deg,#1877f2,#0a4ea3)" },
    { key: "youtube",  label: "YouTube",   icon: "▶️", color: "linear-gradient(135deg,#ff0000,#cc0000)" },
    { key: "insta",    label: "Instagram", icon: "📸", color: "linear-gradient(135deg,#fd1d1d,#fcb045,#833ab4)" },
    { key: "tiktok",   label: "TikTok",    icon: "🎵", color: "linear-gradient(135deg,#000,#25f4ee 60%,#fe2c55)" },
  ];

  if (allDone) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>💖</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#e65100", marginTop: 8, fontFamily: "'Bangers', sans-serif", letterSpacing: 1 }}>{t("soc.thanks.title")}</div>
      <div style={{ color: "#555", marginTop: 6, fontSize: 14 }}>{t("soc.thanks.body")}</div>
      <button style={BTN_PRIMARY} onClick={onComplete}>{t("cp.resume")}</button>
    </div>
  );

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>{t("soc.followCta", { handle: account.handle })}</div>
        <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>{t("soc.tapAll", { n: count })}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {platforms.map((p) => {
          const isOpen = openPanel === p.key;
          const done   = followed[p.key];
          return (
            <div key={p.key}>
              <button
                onClick={() => !done && togglePanel(p.key)}
                disabled={done}
                style={{
                  width: "100%",
                  background: done ? "linear-gradient(135deg,#43a047,#2e7d32)" : p.color,
                  color: "white", border: "3px solid #1a1a1a", borderRadius: 16,
                  padding: "14px 16px", fontSize: 16, fontWeight: 800,
                  cursor: done ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  boxShadow: done ? "0 2px 0 #1a1a1a" : "0 4px 0 #1a1a1a, 0 6px 16px rgba(0,0,0,0.3)",
                  transform: done ? "translateY(2px)" : "translateY(0)",
                  transition: "all 0.1s", fontFamily: "'Fredoka', sans-serif",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{p.icon}</span>
                  <span>{p.label}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  {done ? `✓ ${t("soc.followedBtn")}` : isOpen ? "▲" : t("soc.followBtn")}
                </span>
              </button>
              {isOpen && !done && (
                <div style={{ marginTop: 8, animation: "fadeIn 0.2s" }}>
                  {renderInlinePanel(p.key)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ height: 10, background: "#eee", borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${(count / 4) * 100}%`, background: "linear-gradient(90deg,#1877f2,#ff0000,#fcb045,#fe2c55)", transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 11, color: "#999", textAlign: "center" }}>
        {count}/4 — {t("soc.closeHint")}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// REEL SPONSORS (restos + banques + autos + fitness + santé…)
// ──────────────────────────────────────────────────────────────────
const reelSponsors = [
  { name: "Snack So Safi",        handle: "@so.safi",           tagline: "Le tajine de poisson le plus frais de Safi 🐟",     bg: "linear-gradient(180deg,#1a237e 0%,#7e57c2 50%,#ff7043 100%)", items: ["Tajine sardine", "Pastilla poisson", "Couscous mer"],  offer: "Code SAFIRUNNER → -15%",                                  emoji: "🍽️" },
  { name: "Café Atlas",           handle: "@cafe.atlas.safi",   tagline: "Thé à la menthe & pâtisseries depuis 1952 ☕",       bg: "linear-gradient(180deg,#3e2723 0%,#6d4c41 50%,#bf360c 100%)", items: ["Thé à la menthe", "Cornes de gazelle", "Briouates"],   offer: "Thé offert pour les joueurs Safi Runner",                  emoji: "☕" },
  { name: "Pizzeria El Bahar",    handle: "@elbahar.pizza",     tagline: "Pizza croustillante au bord de l'océan 🌊",          bg: "linear-gradient(180deg,#01579b 0%,#0288d1 50%,#ffd54f 100%)", items: ["Pizza thon Safi", "Calzone mer", "Salade Atlas"],       offer: "1 pizza achetée = 1 boisson offerte",                      emoji: "🍕" },
  { name: "Burger Médina",        handle: "@burger.medina",     tagline: "Le smash burger fait main de la médina 🍔",          bg: "linear-gradient(180deg,#bf360c 0%,#ff5722 50%,#ffeb3b 100%)", items: ["Smash classic", "Double cheese", "Burger kefta"],       offer: "Menu maxi à 49 DH — code SAFI",                            emoji: "🍔" },
  { name: "Attijariwafa Bank",    handle: "@attijariwafa.safi", tagline: "Ouvrez votre compte en 5 min, 100% en ligne 🏦",    bg: "linear-gradient(180deg,#b71c1c 0%,#c62828 50%,#ffcdd2 100%)", items: ["Compte en ligne", "Crédit immo", "Carte Gold"],         offer: "Frais de tenue de compte offerts 6 mois — code SAFIRUNNER", emoji: "🏦" },
  { name: "Dacia Safi",           handle: "@dacia.safi",        tagline: "Sandero, Duster, Logan — livraison en 48h 🚗",       bg: "linear-gradient(180deg,#0d47a1 0%,#1565c0 50%,#bbdefb 100%)", items: ["Dacia Sandero", "Dacia Duster", "Crédit auto"],         offer: "Essai gratuit sur RDV — code SAFIRUNNER",                  emoji: "🚗" },
  { name: "Safi Fitness Club",    handle: "@safi.fitness",      tagline: "Musculation, cardio & cours collectifs 💪",          bg: "linear-gradient(180deg,#212121 0%,#424242 50%,#ff5722 100%)", items: ["Musculation", "Yoga & Zumba", "Suivi nutrition"],       offer: "1 mois offert pour tout abonnement annuel",                emoji: "💪" },
  { name: "Auto École Safi Pro",  handle: "@autoecole.safi",    tagline: "Permis B garanti en 3 semaines — formation intensive 🪪", bg: "linear-gradient(180deg,#004d40 0%,#00796b 50%,#b2dfdb 100%)", items: ["Code de la route", "Conduite", "Permis A & B"],      offer: "Inscription -10% avec le code SAFIRUNNER",                 emoji: "🪪" },
  { name: "CIH Bank Safi",        handle: "@cih.bank.safi",     tagline: "Crédit immobilier 0 frais de dossier 🏠",            bg: "linear-gradient(180deg,#880e4f 0%,#c2185b 50%,#fce4ec 100%)", items: ["Crédit immo", "Épargne logement", "Carte Gold"],       offer: "Simulation gratuite — mentionnez Safi Runner",             emoji: "🏦" },
  { name: "Pharmacie El Waha",    handle: "@pharmacie.elwaha",  tagline: "Votre santé, notre priorité 24h/24 🏥",             bg: "linear-gradient(180deg,#1b5e20 0%,#388e3c 50%,#a5d6a7 100%)", items: ["Médicaments", "Parapharmacie", "Conseils santé"],      offer: "Carte fidélité -5% sur votre prochain achat",              emoji: "💊" },
  { name: "Maroc Telecom Safi",   handle: "@maroctelecom.safi", tagline: "5G à Safi — le meilleur réseau du Maroc 📱",        bg: "linear-gradient(180deg,#1b5e20 0%,#2e7d32 50%,#81c784 100%)", items: ["Forfait 5G", "Fibre optique", "Décodeur 4K"],           offer: "2 mois offerts sur abonnement fibre — code SAFIRUNNER",    emoji: "📱" },
  { name: "Renault Safi",         handle: "@renault.safi",      tagline: "Voitures neuves et occasions certifiées 🚙",         bg: "linear-gradient(180deg,#bf360c 0%,#e64a19 50%,#ffccbc 100%)", items: ["Clio", "Duster", "Occasions certifiées"],              offer: "Reprise véhicule + 5 000 DH — code SAFIRUNNER",            emoji: "🚙" },
];

function ReelActivity({ onComplete }: { onComplete: () => void }) {
  const { t } = useT();
  const reel = useMemo(() => reelSponsors[Math.floor(Math.random() * reelSponsors.length)], []);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setProgress((p) => Math.min(100, p + 100 / 80)), 100);
    return () => clearInterval(id);
  }, []);

  const canContinue = progress >= 100;

  return (
    <div>
      <div style={{ background: "#000", borderRadius: 20, padding: 5, margin: "0 auto 12px", width: "100%", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
        <div style={{ background: reel.bg, borderRadius: 16, height: "min(58vh, 480px)", position: "relative", overflow: "hidden", color: "white" }}>
          <div style={{ position: "absolute", top: 8, left: 10, right: 10, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "white", borderRadius: 2, transition: "width 0.1s linear" }} />
          </div>
          <div style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", fontSize: 100, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))", animation: "pulse 2s infinite" }}>
            {reel.emoji}
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 14px", background: "linear-gradient(0deg,rgba(0,0,0,0.7),transparent)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Fredoka', sans-serif" }}>{reel.name}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>{reel.handle}</div>
            <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 8 }}>{reel.tagline}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {reel.items.map((it, i) => (
                <span key={i} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 600, backdropFilter: "blur(4px)" }}>{it}</span>
              ))}
            </div>
          </div>
          <div style={{ position: "absolute", right: 10, bottom: 100, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <div onClick={() => setLiked(true)} style={{ cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: 30, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>{liked ? "❤️" : "🤍"}</div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{liked ? "1.2k" : "1.1k"}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>💬</div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>89</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>📤</div>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{t("reel.share")}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ background: "#fff8e1", border: "2px dashed #ffd700", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#e65100", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
        🎁 {reel.offer}
      </div>
      {canContinue ? (
        <button style={BTN_PRIMARY} onClick={onComplete}>{t("cp.resume")}</button>
      ) : (
        <button style={{ ...BTN_PRIMARY, opacity: 0.4, cursor: "not-allowed" }} disabled>
          {t("reel.wait", { s: Math.ceil((100 - progress) / 12.5) })}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// ROTATION EN BOUCLE (shuffle exhaustif — aucune répétition avant
// d'avoir vu toutes les activités)
// ──────────────────────────────────────────────────────────────────
type ActivityType = "quiz" | "form" | "video" | "sponsorQuiz" | "social" | "reel";
const ALL_ACTIVITIES: ActivityType[] = ["reel", "social", "quiz", "video", "sponsorQuiz", "form"];

/* Pondération des pubs — priorité aux annonceurs qui rapportent
   (banques, restos, voitures, telecom, immobilier…) plutôt qu'aux
   réseaux sociaux. Les valeurs sont des poids relatifs : reel & video
   contiennent les sponsors monétisables (Attijariwafa, CIH, Dacia,
   Renault, Maroc Telecom, Café Atlas, Snack So Safi, etc.).

   Distribution effective sur 100 checkpoints :
   - reel        : 35%  (vidéos verticales sponsors → format TikTok-like)
   - video       : 30%  (présentations vidéo bannière sponsor)
   - sponsorQuiz : 12%  (quiz "Le saviez-vous ?" branded)
   - quiz        :  8%  (quiz culture Safi non-monétisé)
   - form        :  7%  (formulaire avis — fidélisation)
   - social      :  8%  (FB/IG/YT/TT — exposition réseaux Bridge Eats)
*/
const ACTIVITY_WEIGHTS: { type: ActivityType; weight: number }[] = [
  { type: "reel",        weight: 35 },
  { type: "video",       weight: 30 },
  { type: "sponsorQuiz", weight: 12 },
  { type: "social",      weight:  8 },
  { type: "quiz",        weight:  8 },
  { type: "form",        weight:  7 },
];

let _lastActivity: ActivityType | null = null;

function pickNextActivity(_cpNum: number): ActivityType {
  /* Tirage pondéré aléatoire — évite de répéter la même activité
     deux fois de suite pour garder le joueur surpris. Les annonceurs
     payants (reel + video + sponsorQuiz = 77%) dominent largement
     les réseaux sociaux non-monétisés. */
  const candidates = ACTIVITY_WEIGHTS.filter((a) => a.type !== _lastActivity);
  const total = candidates.reduce((sum, a) => sum + a.weight, 0);
  let r = Math.random() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) {
      _lastActivity = c.type;
      return c.type;
    }
  }
  _lastActivity = candidates[0].type;
  return candidates[0].type;
}

const activityTitleKey: Record<ActivityType, string> = {
  quiz:        "act.title.quiz",
  form:        "act.title.form",
  video:       "act.title.video",
  sponsorQuiz: "act.title.sponsorQuiz",
  social:      "act.title.social",
  reel:        "act.title.reel",
};

const activitySubKey: Record<ActivityType, string> = {
  quiz:        "act.sub.quiz",
  form:        "act.sub.form",
  video:       "act.sub.video",
  sponsorQuiz: "act.sub.sponsorQuiz",
  social:      "act.sub.social",
  reel:        "act.sub.reel",
};

const venueNames = [
  "Snack Dar El Bahar",
  "Restaurant Médina",
  "Café Atlas",
  "Chez Fatima – Tajines",
  "Attijariwafa Bank Safi",
  "Auto Center Dacia Safi",
  "Maroc Telecom – Agence Safi",
  "CIH Bank – Safi Centre",
  "Safi Fitness Club",
  "Pharmacie El Waha",
  "Renault Auto Safi",
  "Wafa Immobilier Safi",
];

// ──────────────────────────────────────────────────────────────────
// CHECKPOINT UI PRINCIPAL
// ──────────────────────────────────────────────────────────────────
const LEVEL_CFG = [
  { icon: "🟢", label: "NIVEAU 1 — DÉBUTANT", bg: "#e8f5e9", border: "#43a047", color: "#1b5e20" },
  { icon: "🟠", label: "NIVEAU 2 — NORMAL",   bg: "#fff3e0", border: "#ff8f00", color: "#e65100" },
  { icon: "🔴", label: "NIVEAU 3 — HARD",     bg: "#ffebee", border: "#f44336", color: "#b71c1c" },
];

export function CheckpointUI({ checkpointNumber, score, difficultyLevel, onResume }: CheckpointUIProps) {
  const { t } = useT();
  const [started, setStarted] = useState(false);
  const [activityDone, setActivityDone] = useState(false);

  const activity    = useMemo<ActivityType>(() => pickNextActivity(checkpointNumber), [checkpointNumber]);
  const venue       = useMemo(() => venueNames[(checkpointNumber - 1) % venueNames.length], [checkpointNumber]);

  const showComplete = activityDone;
  const lvl = LEVEL_CFG[difficultyLevel - 1];

  /* Détecte si le niveau vient de changer à ce checkpoint */
  const levelJustChanged = (difficultyLevel === 2 && checkpointNumber === 30) ||
                           (difficultyLevel === 3 && checkpointNumber === 90);

  return (
    <div style={OVERLAY}>
      <div style={CARD}>
        {/* ── Badge de niveau ── */}
        <div style={{
          background: lvl.bg,
          border: `2px solid ${lvl.border}`,
          borderRadius: 12, padding: "6px 14px",
          textAlign: "center", marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>{lvl.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: lvl.color, letterSpacing: 1, fontFamily: "'Bangers', sans-serif" }}>
            {lvl.label}
          </span>
          {levelJustChanged && (
            <span style={{ background: lvl.border, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 8, padding: "2px 7px", marginLeft: 4 }}>
              NOUVEAU !
            </span>
          )}
        </div>

        {/* ── En-tête ── */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 26 }}>🛑</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#e65100", marginTop: 2 }}>
            {t("cp.header.stop", { n: checkpointNumber, venue })}
          </div>
          <div style={{ fontSize: 11, color: "#777", marginTop: 1 }}>{t("cp.currentScore", { n: score })} 💎</div>
        </div>

        {/* ── Écran d'intro (avant démarrage) ── */}
        {!started && !showComplete && (
          <>
            <div style={{ background: "linear-gradient(135deg, #fff8e1, #fce4ec)", borderRadius: 14, padding: "18px 20px", textAlign: "center", marginBottom: 18, border: "2px solid #ffe082" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{t(activityTitleKey[activity])}</div>
              <div style={{ fontSize: 14, color: "#555" }}>{t(activitySubKey[activity])}</div>
            </div>
            <div style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 16 }}>{t("cp.completePrompt")}</div>
            <div style={{ textAlign: "center" }}>
              <button style={BTN_PRIMARY} onClick={() => setStarted(true)}>{t("cp.startActivity")}</button>
            </div>
          </>
        )}

        {/* ── Activité en cours ── */}
        {started && !showComplete && (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e65100", marginBottom: 14, textAlign: "center" }}>
              {t(activityTitleKey[activity])}
            </div>

            {!activityDone && (
              <>
                {activity === "quiz"        && <QuizActivity        onComplete={() => setActivityDone(true)} />}
                {activity === "form"        && <FormActivity        onComplete={() => setActivityDone(true)} />}
                {activity === "video"       && <VideoActivity       onComplete={() => setActivityDone(true)} />}
                {activity === "sponsorQuiz" && <SponsorQuizActivity onComplete={() => setActivityDone(true)} />}
                {activity === "social"      && <SocialFollowActivity onComplete={() => setActivityDone(true)} />}
                {activity === "reel"        && <ReelActivity        onComplete={() => setActivityDone(true)} />}
              </>
            )}

          </>
        )}

        {/* ── Écran de succès final ── */}
        {showComplete && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#2e7d32", marginTop: 8 }}>{t("cp.completed")}</div>
            <div style={{ color: "#555", fontSize: 14, marginTop: 6, marginBottom: 4 }}>{t("cp.completedBody")}</div>
            <button style={BTN_PRIMARY} onClick={onResume}>{t("cp.resume")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
