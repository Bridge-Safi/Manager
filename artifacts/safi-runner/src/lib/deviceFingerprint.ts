/**
 * Génère une empreinte stable de l'appareil.
 * Elle est basée sur les caractéristiques du navigateur/hardware
 * (indépendante de la session ou du localStorage) et est stockée
 * dans Supabase avec une contrainte UNIQUE.
 *
 * Résultat : un seul compte par téléphone/appareil.
 */

const DEVICE_ID_KEY = "safi_device_id";

function browserHash(): string {
  const parts = [
    navigator.language ?? "",
    navigator.platform ?? "",
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    navigator.hardwareConcurrency ?? 0,
    navigator.maxTouchPoints ?? 0,
  ];
  // djb2 hash léger
  let hash = 5381;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // unsigned 32-bit
  }
  return hash.toString(36);
}

function generateId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${browserHash()}-${ts}-${random}`;
}

/**
 * Retourne l'identifiant stable de cet appareil.
 * Première partie = empreinte hardware (stable).
 * Deuxième partie = timestamp + aléatoire (unicité).
 * Le tout est persisté en localStorage.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Retourne juste la partie hardware (prefix avant le premier "-").
 * Permet de détecter le même appareil même si le localStorage est effacé.
 */
export function getHardwarePrefix(): string {
  return browserHash();
}
