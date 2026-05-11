import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { useUser, useClerk, useAuth } from '@clerk/react';
import { useLocation } from 'wouter';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const courierIcon = L.divIcon({
  className: '',
  html: `<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#065F46,#047857);border:3px solid #D9C5A0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(6,95,70,0.4);font-size:18px;">🛵</div>`,
  iconSize: [38, 38], iconAnchor: [19, 19],
});
const restaurantIcon = L.divIcon({
  className: '',
  html: `<div style="width:34px;height:34px;border-radius:50%;background:#D9C5A0;border:3px solid #065F46;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,0.2);font-size:16px;">🥘</div>`,
  iconSize: [34, 34], iconAnchor: [17, 17],
});

// ── Dark mode context ────────────────────────────────────────────────────────
const DARK_KEY = 'bridge_dark';
interface DarkCtxValue { dark: boolean; toggle: () => void }
const DarkModeCtx = createContext<DarkCtxValue>({ dark: false, toggle: () => {} });
export function useDark() { return useContext(DarkModeCtx); }

function useAuthHeaders() {
  const { getToken } = useAuth();
  return useCallback(async (): Promise<HeadersInit> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);
}

function DarkToggle({ size = 44 }: { size?: number }) {
  const { dark, toggle } = useDark();
  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Mode clair' : 'Mode sombre'}
      className="rounded-full flex items-center justify-center font-black transition-all active:scale-90 hover:scale-110"
      style={{
        background: 'var(--c-card)', border: '2.5px solid #D9C5A0',
        color: '#065F46', boxShadow: '0 4px 20px rgba(6,95,70,0.15)',
        height: size, width: size, fontSize: size * 0.42,
      }}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

// ─── DELIVERY ZONE ────────────────────────────────────────────────────────────

const DELIVERY_ZONE: [number,number][] = [
  [32.3080,-9.2570], // McDonald's (côte nord-ouest)
  [32.3200,-9.2450], // Remontée nord
  [32.3280,-9.2280], // Ijnnane nord
  [32.3270,-9.2050], // Ijnnane nord-est
  [32.3160,-9.1820], // R206 est
  [32.3020,-9.1700], // Lamia nord
  [32.2880,-9.1750], // Lamia / R204
  [32.2720,-9.1950], // Azib Draï
  [32.2580,-9.2120], // Azib Draï sud
  [32.2420,-9.2310], // Descente sud
  [32.2200,-9.2480], // P2303 / Route Nsa
  [32.2100,-9.2600], // Pointe sud-ouest
  [32.2350,-9.2720], // Côte sud
  [32.2600,-9.2700], // Bordeaux / côte
  [32.2820,-9.2650], // Korten
  [32.3050,-9.2590], // Retour McDonald's
];

function pointInPolygon(lat:number, lng:number, poly:[number,number][]): boolean {
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [xi,yi]=poly[i]; const [xj,yj]=poly[j];
    if(((yi>lng)!==(yj>lng))&&(lat<(xj-xi)*(lng-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}

const clientPinIcon = L.divIcon({
  className:'',
  html:`<div style="width:32px;height:32px;border-radius:50%;background:#4F46E5;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(79,70,229,0.5);font-size:15px;">📍</div>`,
  iconSize:[32,32],iconAnchor:[16,16],
});

function MapClickLayer({onPick}:{onPick:(lat:number,lng:number,inside:boolean)=>void}) {
  useMapEvents({
    click(e){
      const inside=pointInPolygon(e.latlng.lat,e.latlng.lng,DELIVERY_ZONE);
      onPick(e.latlng.lat,e.latlng.lng,inside);
    }
  });
  return null;
}

// Reverse geocoding via Nominatim — returns a short readable address
async function reverseGeocode(lat:number,lng:number):Promise<string> {
  try {
    const res=await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      {headers:{'User-Agent':'BridgeSafi/1.0'}}
    );
    if(!res.ok) return '';
    const d=await res.json();
    const a=d.address||{};
    const parts=[
      a.house_number,
      a.road||a.pedestrian||a.footway||a.path,
      a.neighbourhood||a.suburb||a.quarter||a.city_district,
    ].filter(Boolean);
    return parts.length>=2 ? parts.join(' ') : (d.display_name||'').split(',').slice(0,2).join(',').trim();
  } catch(_){return '';}
}

// Draggable pin marker — updates when dragged
function DraggablePin({pos,onDragEnd}:{pos:[number,number];onDragEnd:(lat:number,lng:number)=>void}) {
  const markerRef=useRef<L.Marker|null>(null);
  return (
    <Marker
      position={pos}
      icon={clientPinIcon}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend(){
          const m=markerRef.current;
          if(m){const {lat,lng}=m.getLatLng();onDragEnd(lat,lng);}
        }
      }}
    />
  );
}

function DeliveryMap({onSet,onAddress,pin}:{
  onSet:(coords:string,inside:boolean)=>void;
  onAddress:(addr:string)=>void;
  pin:[number,number]|null;
}) {
  const [geocoding,setGeocoding]=useState(false);

  const handlePick=async(lat:number,lng:number)=>{
    const inside=pointInPolygon(lat,lng,DELIVERY_ZONE);
    onSet(`${lat.toFixed(5)},${lng.toFixed(5)}`,inside);
    setGeocoding(true);
    const addr=await reverseGeocode(lat,lng);
    setGeocoding(false);
    if(addr) onAddress(addr);
  };

  return (
    <div className="relative mb-3">
      <MapContainer center={[32.2994,-9.2372]} zoom={13}
        style={{height:220,borderRadius:14,zIndex:0}} scrollWheelZoom={false}
        maxBounds={[[32.18,-9.265],[32.36,-9.13]]} maxBoundsViscosity={1.0} minZoom={12}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'/>
        <Polygon positions={DELIVERY_ZONE} pathOptions={{color:'#065F46',fillColor:'#2ecc71',fillOpacity:0.18,weight:2,dashArray:'6,4'}}/>
        <MapClickLayer onPick={handlePick}/>
        {pin&&<DraggablePin pos={pin} onDragEnd={handlePick}/>}
      </MapContainer>
      {geocoding&&(
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5"
          style={{background:'rgba(6,95,70,0.85)',backdropFilter:'blur(4px)',zIndex:1000}}>
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"/>
          Adresse en cours…
        </div>
      )}
    </div>
  );
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

// URL du site livreur Bridge Logistique (où arrivent toutes les commandes)
const DRIVER_APP_URL = 'https://406ae05e-3483-4224-927f-5b1b34d56fb4-00-1ym1ya1fn7mhc.worf.replit.dev';
// ⬇ URL encodée dans le QR de paiement — à remplacer par le lien de votre banque
const BRIDGE_QR_PAY_URL = 'https://safi-bridge.ma/pay';

type Lang = 'fr' | 'en' | 'ar' | 'amz';
type ML   = Record<Lang, string>;

interface OptionChoice { id: string; names: ML; price: number; }
interface OptionGroup  { id: string; names: ML; type: 'radio'|'checkbox'; required: boolean; choices: OptionChoice[]; }
interface MenuItem     { id: string; names: ML; price: number; photo: string; safi?: boolean; options?: OptionGroup[]; }
interface MenuCategory { id: string; emoji: string; names: ML; items: MenuItem[]; }
interface Restaurant   {
  id: string; name: string; tagline: ML; logo: string; cover: string;
  cuisine: ML; rating: number; deliveryTime: string; minOrder: number;
  tags: string[];
  categories: MenuCategory[];
}

interface CartItem {
  cartId: string; restaurantId: string; restaurantName: string;
  item: MenuItem; qty: number;
  selectedOptions: Record<string, string[]>;
  extraPrice: number; totalPerUnit: number;
}

interface UserProfile { name:string; address:string; phone:string; email:string; cardNumber:string; cardExpiry:string; cardName:string; paymentMethod?:'card'|'paypal'; paypalEmail?:string; onboardingComplete?:boolean; avatar?:string; }

// ─── BRIDGE ID — identifiant universel partagé partout ────────────────────────
// Formule : BR- + 6 premiers chiffres du téléphone + 1ère lettre du prénom
export function getBridgeId(phone: string|undefined|null, name?: string|undefined|null): string {
  const digits = (phone||'').replace(/\D/g,'').slice(0,6);
  if (digits.length < 1) return 'BR-???????';
  const letter = (name||'').trim().replace(/^(\.).*/,'$1').toUpperCase() || '?';
  return `BR-${digits}${letter}`;
}

// ─── PROFILE STORAGE ──────────────────────────────────────────────────────────

const PROFILE_KEY_PREFIX = 'bridge_eats_profile_';
const PROFILE_KEY_LEGACY = 'bridge_eats_profile'; // old generic key — migrated once
const AVATAR_KEY_PREFIX  = 'bridge_eats_avatar_';  // separate key so large base64 never inflates profile JSON
const emptyProfile = (): UserProfile => ({ name:'', address:'', phone:'', email:'', cardNumber:'', cardExpiry:'', cardName:'', paymentMethod:'card', paypalEmail:'', onboardingComplete:true });

function profileKey(userId: string) { return `${PROFILE_KEY_PREFIX}${userId}`; }
function avatarKey(userId: string)  { return `${AVATAR_KEY_PREFIX}${userId}`; }

// Compress a base64 image to ≤200×200 JPEG — prevents localStorage quota errors
function compressAvatarDataUrl(dataUrl: string, quality = 0.72, maxPx = 220): Promise<string> {
  return new Promise(resolve => {
    if (!dataUrl?.startsWith('data:')) { resolve(dataUrl); return; }
    if (dataUrl.length < 80_000) { resolve(dataUrl); return; } // already small enough
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ── Card type detection ────────────────────────────────────────────────────────
type CardType = 'visa'|'mastercard'|'unknown';
function detectCard(n:string): CardType {
  const d=n.replace(/\D/g,'');
  if(/^4/.test(d)) return 'visa';
  if(/^5[1-5]/.test(d)||(/^2[2-7]/.test(d)&&parseInt(d.slice(0,4),10)>=2221&&parseInt(d.slice(0,4),10)<=2720)) return 'mastercard';
  return 'unknown';
}
function isValidCardType(_n:string):boolean { return true; }
function luhnCheck(_n:string):boolean{ return true; }
function isRealCard(n:string):boolean{
  const d=n.replace(/\D/g,'');
  return d.length>=13&&d.length<=19;
}
const PROMO_CODES:Record<string,number>={
  'BRIDGE10':10,'BIENVENUE':15,'SAFI5':5,'FLEURS20':20,'CADEAUX12':12,'BRIDGE20':20
};
const DELIVERY_FEE = 12;   // MAD — frais livraison de base (affiché au client)
const KM_RATE      = 1;    // MAD/km — silencieux, non affiché au client
const RESTAURANT_LAT = 32.2994; // Centre-ville Safi (point de départ calcul distance)
const RESTAURANT_LNG = -9.2372;
const SERVICE_FEE  = 5;    // MAD — frais service optionnel

function haversineKm(lat1:number,lng1:number,lat2:number,lng2:number):number{
  const R=6371,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// SVG logos inline (tiny)
const VisaLogo=()=>(
  <svg viewBox="0 0 60 20" width="44" height="15" fill="none">
    <text x="0" y="16" fontFamily="Arial" fontWeight="900" fontSize="18" fill="white" letterSpacing="-1">VISA</text>
  </svg>
);
const MastercardLogo=()=>(
  <svg viewBox="0 0 38 24" width="38" height="24">
    <circle cx="14" cy="12" r="12" fill="#EB001B"/>
    <circle cx="24" cy="12" r="12" fill="#F79E1B"/>
    <path d="M19 4.8a12 12 0 0 1 0 14.4A12 12 0 0 1 19 4.8z" fill="#FF5F00"/>
  </svg>
);

// Read profile from localStorage without the avatar field (avatar lives in its own key)
function readProfileFromStorage(key: string): UserProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    const { avatar: _av, ...rest } = raw; // strip avatar — stored separately
    return { ...emptyProfile(), ...rest };
  } catch { return emptyProfile(); }
}

// Read avatar from its own key (avoids inflating profile JSON and hitting quota)
function readAvatarFromStorage(aKey: string): string {
  try { return localStorage.getItem(aKey) || ''; } catch { return ''; }
}

// Write profile without avatar to main key, avatar to its own key
function writeProfileToStorage(key: string, aKey: string, p: UserProfile) {
  try {
    const { avatar, ...rest } = p;
    localStorage.setItem(key, JSON.stringify(rest));
    if (avatar) localStorage.setItem(aKey, avatar);
  } catch (e: unknown) {
    // If quota still hit (e.g. other data), remove avatar and retry
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      try { localStorage.removeItem(aKey); } catch {}
    }
  }
}

function useProfile(userId?: string) {
  const key  = userId ? profileKey(userId) : null;
  const aKey = userId ? avatarKey(userId)  : null;
  const { getToken } = useAuth();

  // Show localStorage data instantly while server loads (good UX)
  const [profile, setProfileState] = useState<UserProfile>(() => {
    if (!key || !aKey) return emptyProfile();
    const p = readProfileFromStorage(key);
    p.avatar = readAvatarFromStorage(aKey);
    // Migration: if old profile has a large avatar embedded, move it to the avatar key
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      if (raw.avatar && !localStorage.getItem(aKey)) {
        compressAvatarDataUrl(raw.avatar).then(compressed => {
          try {
            localStorage.setItem(aKey, compressed);
            const { avatar: _av, ...rest } = raw;
            localStorage.setItem(key, JSON.stringify(rest));
          } catch {}
        });
        p.avatar = raw.avatar; // use it in state immediately
      }
    } catch {}
    return p;
  });

  // Always fetch from server when userId is available — server is source of truth.
  // Avatar is loaded from its own localStorage key (never from server).
  useEffect(() => {
    if (!key || !aKey) { setProfileState(emptyProfile()); return; }

    // Show cached data immediately while server responds
    const cached = readProfileFromStorage(key);
    cached.avatar = readAvatarFromStorage(aKey);
    setProfileState(cached);

    let cancelled = false;
    const loadFromServer = async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (cancelled) return;
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
        try {
          const token = await getToken();
          if (!token) continue;
          const r = await fetch('/api/profile', {
            credentials: 'include',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!r.ok) continue;
          const d = await r.json();
          if (cancelled) return;
          if (d && (d.name || d.phone || d.address)) {
            // Merge server fields (name/phone/address) with local cache
            const local = readProfileFromStorage(key);
            let localAvatar = readAvatarFromStorage(aKey);
            // If no avatar in localStorage, try fetching from server (handles new device / cache cleared)
            if (!localAvatar && userId) {
              try {
                const ar = await fetch(`/api/profile/avatar/${userId}`, { credentials: 'include' });
                if (ar.ok && ar.headers.get('content-type')?.startsWith('image/')) {
                  const blob = await ar.blob();
                  const reader = new FileReader();
                  localAvatar = await new Promise<string>(res => {
                    reader.onload = () => res(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  try { localStorage.setItem(aKey, localAvatar); } catch {}
                }
              } catch { /* best-effort */ }
            }
            const merged: UserProfile = {
              ...emptyProfile(),
              ...local,
              name:    d.name    || local.name    || '',
              phone:   d.phone   || local.phone   || '',
              address: d.address || local.address || '',
              onboardingComplete: !!(d.name || d.phone || local.name || local.phone),
              avatar: localAvatar,
            };
            setProfileState(merged);
            writeProfileToStorage(key, aKey, merged);
          }
          return;
        } catch { /* retry */ }
      }
    };
    loadFromServer();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const saveProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    if (key && aKey) writeProfileToStorage(key, aKey, p);
  }, [key, aKey]);

  return { profile, saveProfile };
}

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const T = {
  fr: {
    appName:'Bridge Safi', zone:'Safi, Maroc',
    heroSub:'Vos restaurants préférés, livrés chez vous',
    restaurantsTitle:'Nos Restaurants', nearYou:'Près de vous · Safi',
    openNow:'Ouvert', minOrder:'Min.', delivMin:'min',
    menuTitle:'Notre Menu', addToCart:'Ajouter', close:'Fermer', back:'← Retour',
    customize:'Personnaliser', required:'Requis', optional:'Optionnel',
    addWithOptions:'Ajouter au panier', totalLabel:'Total',
    cartTitle:'Votre Panier', cartEmpty:'Votre panier est vide', total:'Total',
    checkout:'Commander', checkoutTitle:'Vos coordonnées',
    nameLabel:'Votre prénom', addrLabel:'Adresse à Safi', phoneLabel:'Numéro de téléphone', emailLabel:'Adresse e-mail',
    namePh:'Ex: Mohamed', addrPh:'Ex: Plateau, Av. Hassan II, Safi', phonePh:'06 00 00 00 00', emailPh:'exemple@email.com',
    fillAll:'Merci de remplir tous les champs', continueBtn:'Continuer →',
    payModeTitle:'Mode de Paiement',
    cashOption:'Paiement à la livraison', cashOptionDesc:'Payez en espèces à la réception · Gratuit',
    cardOption:'Paiement par Carte Bancaire', cardOptionDesc:'Visa / Mastercard · CMI · Sécurisé',
    cardFormTitle:'Données de Carte', cardNumberLabel:'Numéro de carte',
    cardExpiryLabel:"Date d'expiration", cardCVVLabel:'CVV', cardNameLabel:'Nom sur la carte',
    cardNumberPh:'1234 5678 9012 3456', cardExpiryPh:'MM/AA', cardCVVPh:'123', cardNamePh:'MOHAMED ALAMI',
    payNow:'Payer maintenant 🔒', confirmWhatsApp:'Confirmer la commande 🚀',
    successTitle:'Commande Confirmée ! 🎉', successSub:'Votre commande a bien été reçue.',
    trackingLabel:'Numéro de suivi', deliveryEta:'Livraison estimée dans 18–25 min', newOrder:'Nouvelle commande',
    autoFilled:'Rempli depuis votre profil ✓',
    delivOption:'🚚 Livraison à domicile', delivOptionDesc:'Livré chez vous · Zone Safi',
    collectOption:'🏪 Click & Collect', collectOptionDesc:'Retrait au restaurant · +2.99 MAD',
    collectAddress:'Adresse retrait : Plateau, Safi (le restaurant vous contacte)',
    profileTitle:'Mon Profil', profileSub:'Vos informations enregistrées',
    profileSave:'Enregistrer le profil', profileSaved:'Profil enregistré ✓',
    savedPayment:'Carte bancaire enregistrée', signOut:'🚪 Se déconnecter',
    gameId:'ID Joueur', gamePts:'pts', gameTitle:'Bridge Game',
    errName:'Entrez votre prénom et nom (ex: Mohamed Alaoui)',
    errPhone:'Numéro invalide (ex: +212 612 345 678 ou 0612345678)',
    errCard:'Numéro de carte invalide (16 chiffres requis)',
    errCardType:'Carte non acceptée — Visa ou Mastercard uniquement',
    errLuhn:'Numéro de carte invalide — vérifiez les chiffres',
    promoLabel:'Code promo / Cadeau', promoPh:'Ex : BRIDGE10', promoApply:'Appliquer',
    promoOk:(d:number)=>`-${d} MAD appliqué 🎉`, promoErr:'Code invalide ou déjà utilisé',
    diamondsSection:'💎 Mes Diamants Bridge', diamondsAvail:(n:number)=>`${n} pts disponibles (= ${Math.floor(n/200)} MAD)`,
    diamondsUse:'Convertir en réduction', diamondsNone:'Aucun diamant pour l\.instant — jouez !',
    discountRow:(d:number)=>`Réduction appliquée : -${d} MAD`,
    deliveryFeeRow:'Frais de livraison',
    serviceFeeRow:'Frais de service',
    serviceFeeToggle:'Ajouter frais de service',
    serviceFeeDesc:'Contribution pour le maintien de la plateforme',
    errExpiry:'Date invalide (format MM/AA, non expirée)',
    errCardName:'Nom du titulaire requis (comme sur la carte)',
    paymentTabCard:'💳 Carte', paymentTabPaypal:'🅿️ PayPal',
    paypalEmailLabel:'Email PayPal', paypalPh:'exemple@paypal.com',
    errPaypal:'Adresse email PayPal invalide',
    savedPaypalLabel:'PayPal enregistré',
    changePwd:'🔑 Changer le mot de passe', currentPwd:'Mot de passe actuel',
    newPwd:'Nouveau mot de passe (8 car. min.)', confirmPwd:'Confirmer le nouveau mot de passe',
    pwdChanged:'Mot de passe modifié ✓', pwdMismatch:'Les mots de passe ne correspondent pas.',
    pwdWeak:'Mot de passe trop faible (8 caractères min.).', pwdWrong:'Mot de passe actuel incorrect.',
    pwdSave:'Mettre à jour le mot de passe',
    trackTitle:'Suivi GPS en Direct', trackZone:'SAFI · PLATEAU', trackLive:'EN DIRECT',
    stages:['Reçue','En préparation','En chemin','Livrée'],
    stagesSub:['Commande confirmée',"Le chef s'affaire",'Votre livreur arrive','Bon appétit !'],
    orderStatus:'Statut de votre commande', orderNum:'Commande #BE-2847',
    eta:'Arrivée estimée', courierName:'Livreur Bridge',
    contactTitle:"Besoin d'aide ?", contactSub:'Notre équipe est disponible 7j/7',
    whatsapp:'WhatsApp Business', phone:'Appeler', email:'Email', hours:'Horaires', hoursVal:'8h00 – 23h00',
    navHome:'Accueil', navTrack:'Suivi', navContact:'Contact', navCart:'Panier',
    footer:'© 2026 Bridge Safi · safi-bridge.ma', plateau:'Plateau · Centre-Ville · Bouzidi',
    safiExcl:'Spécialité Safi', selected:'Sélectionné ✓',
    waMsgHeader:'🛍️ Nouvelle commande Bridge Safi\.\.📦 Articles:\.',
    waMsgFooter:(total:number,name:string,addr:string,phone:string)=>`\.💰 Total: ${total} MAD\.\.👤 Nom: ${name}\.📍 Adresse: ${addr}, Safi\.📞 Tél: ${phone}\.\.Merci de confirmer ma commande ! 🙏`,
    chooseService:'Choisissez votre service',
    deliverySub:'Livraison rapide', taxiSub:'Confort & style', fleursSub:'Fleurs & cadeaux',
    pharmaeSub:'De nuit & de jour 🌙',
    taxiSoon:'Service disponible très bientôt',
    taxiDesc:'Bridge Taxi Confort — trajets premium à Safi, en toute élégance.',
    taxiBook:'Réserver sur WhatsApp Business',
    tabacSub:'Livraison & retrait',
    tabacSoon:'Bientôt disponible',
    tabacDesc:'Bridge Tabac — cigarettes, boissons & produits premium au cœur de Safi.',
    tabacBook:'Envoyer via WhatsApp Business',
    tabacCollectAddress:'Adresse retrait : Plateau, Safi (la boutique vous contacte)',
    tabacSend:'Envoyer la commande 🚀',
    paymentCash:'💵 Paiement : Espèces à la livraison',
    paymentCard:'💳 Paiement : Carte Bancaire',
    sslBadge:'256-bit SSL · Paiement 100% sécurisé',
    cardHolderLabel:'👤 Titulaire',
    onboardTitle:'Complétez votre profil',
    onboardSub:'Quelques infos pour une expérience fluide',
    onboardSkip:'Passer pour l\.instant',
    onboardSave:'Enregistrer et continuer',
    onboardPhone:'📱 Numéro de téléphone', onboardPhoneSub:'Pour le livreur',
    onboardAddr:'📍 Adresse de livraison', onboardAddrSub:'Votre adresse à Safi',
    onboardCard:'💳 Carte bancaire', onboardCardSub:'Paiement rapide & sécurisé',
    onboardId:'🪪 Identité', onboardIdSub:'Vérification du compte',
    onboardCardNum:'Numéro de carte', onboardCardExp:'Date d\.expiration', onboardCardHolder:'Nom sur la carte',
    onboardIdNote:'Fonctionnalité disponible prochainement. Votre compte est actif.',
    qrOption:'Paiement QR Code 📲', qrOptionDesc:'Scannez le QR · Virement bancaire instantané',
    qrModalTitle:'Scanner pour payer', qrModalSub:'Ouvrez votre appli bancaire et scannez le QR',
    qrAmountLabel:'Montant à régler', qrPaid:'J\.ai payé ✅', qrCancel:'Annuler',
    qrNote:'Le virement est instantané · Bridge Safi',
    hubServices:'Services', hubServicesSub:'Eats · Taxi · Tabac · Fleurs · Pharmacie',
    hubGame:'Jouer & Gagner', hubGameSub:'Récoltez des diamants 💎 → menus offerts',
    hubWelcome:'Bienvenue',
  },
  en: {
    appName:'Bridge Safi', zone:'Safi, Morocco',
    heroSub:'Your favourite restaurants, delivered to you',
    restaurantsTitle:'Our Restaurants', nearYou:'Near you · Safi',
    openNow:'Open', minOrder:'Min.', delivMin:'min',
    menuTitle:'Our Menu', addToCart:'Add', close:'Close', back:'← Back',
    customize:'Customize', required:'Required', optional:'Optional',
    addWithOptions:'Add to cart', totalLabel:'Total',
    cartTitle:'Your Cart', cartEmpty:'Your cart is empty', total:'Total',
    checkout:'Order Now', checkoutTitle:'Your Details',
    nameLabel:'Your name', addrLabel:'Address in Safi', phoneLabel:'Phone number', emailLabel:'Email address',
    namePh:'e.g. Mohamed', addrPh:'e.g. Plateau, Av. Hassan II, Safi', phonePh:'06 00 00 00 00', emailPh:'example@email.com',
    fillAll:'Please fill in all fields', continueBtn:'Continue →',
    payModeTitle:'Payment Method',
    cashOption:'Cash on Delivery', cashOptionDesc:'Pay cash upon receipt · Free',
    cardOption:'Pay by Credit Card', cardOptionDesc:'Visa / Mastercard · CMI · Secured',
    cardFormTitle:'Card Details', cardNumberLabel:'Card number',
    cardExpiryLabel:'Expiry date', cardCVVLabel:'CVV', cardNameLabel:'Name on card',
    cardNumberPh:'1234 5678 9012 3456', cardExpiryPh:'MM/YY', cardCVVPh:'123', cardNamePh:'MOHAMED ALAMI',
    payNow:'Pay now 🔒', confirmWhatsApp:'Confirm order 🚀',
    successTitle:'Order Confirmed! 🎉', successSub:'Your order has been received.',
    trackingLabel:'Tracking number', deliveryEta:'Estimated delivery in 18–25 min', newOrder:'New order',
    autoFilled:'Pre-filled from your profile ✓',
    delivOption:'🚚 Home Delivery', delivOptionDesc:'Delivered to you · Safi zone',
    collectOption:'🏪 Click & Collect', collectOptionDesc:'Pick up at restaurant · +2.99 MAD',
    collectAddress:'Pick-up address: Plateau, Safi (restaurant will contact you)',
    profileTitle:'My Profile', profileSub:'Your saved information',
    profileSave:'Save profile', profileSaved:'Profile saved ✓', savedPayment:'Saved credit card', signOut:'🚪 Sign out',
    gameId:'Player ID', gamePts:'pts', gameTitle:'Bridge Game',
    errName:'Enter your first and last name (e.g. Mohamed Alaoui)',
    errPhone:'Invalid number (e.g. +212 612 345 678 or 0612345678)',
    errCard:'Invalid card number (16 digits required)',
    errCardType:'Card not accepted — Visa or Mastercard only',
    errLuhn:'Invalid card number — please check the digits',
    promoLabel:'Promo code / Gift', promoPh:'E.g.: BRIDGE10', promoApply:'Apply',
    promoOk:(d:number)=>`-${d} MAD applied 🎉`, promoErr:'Invalid or already used code',
    diamondsSection:'💎 My Bridge Diamonds', diamondsAvail:(n:number)=>`${n} pts available (= ${Math.floor(n/200)} MAD)`,
    diamondsUse:'Convert to discount', diamondsNone:'No diamonds yet — play to earn!',
    discountRow:(d:number)=>`Discount applied: -${d} MAD`,
    deliveryFeeRow:'Delivery fee',
    serviceFeeRow:'Service fee',
    serviceFeeToggle:'Add service fee',
    serviceFeeDesc:'Contribution to platform maintenance',
    errExpiry:'Invalid date (MM/YY format, not expired)',
    errCardName:'Cardholder name required (as on the card)',
    paymentTabCard:'💳 Card', paymentTabPaypal:'🅿️ PayPal',
    paypalEmailLabel:'PayPal Email', paypalPh:'example@paypal.com',
    errPaypal:'Invalid PayPal email address',
    savedPaypalLabel:'PayPal saved',
    changePwd:'🔑 Change password', currentPwd:'Current password',
    newPwd:'New password (min. 8 chars)', confirmPwd:'Confirm new password',
    pwdChanged:'Password updated ✓', pwdMismatch:'Passwords do not match.',
    pwdWeak:'Password too weak (8 characters min.).', pwdWrong:'Current password is incorrect.',
    pwdSave:'Update password',
    trackTitle:'Live GPS Tracking', trackZone:'SAFI · PLATEAU', trackLive:'LIVE',
    stages:['Received','Preparing','On the way','Delivered'],
    stagesSub:['Order confirmed','Chef is cooking','Courier en route','Enjoy your meal!'],
    orderStatus:'Your order status', orderNum:'Order #BE-2847',
    eta:'Estimated arrival', courierName:'Bridge Driver',
    contactTitle:'Need help?', contactSub:'Our team is available 7 days a week',
    whatsapp:'WhatsApp Business', phone:'Call us', email:'Email', hours:'Hours', hoursVal:'8:00 AM – 11:00 PM',
    navHome:'Home', navTrack:'Track', navContact:'Contact', navCart:'Cart',
    footer:'© 2026 Bridge Safi · safi-bridge.ma', plateau:'Plateau · City Center · Bouzidi',
    safiExcl:'Safi Special', selected:'Selected ✓',
    waMsgHeader:'🛍️ New Bridge Safi order\.\.📦 Items:\.',
    waMsgFooter:(total:number,name:string,addr:string,phone:string)=>`\.💰 Total: ${total} MAD\.\.👤 Name: ${name}\.📍 Address: ${addr}, Safi\.📞 Phone: ${phone}\.\.Please confirm my order! 🙏`,
    chooseService:'Choose your service',
    deliverySub:'Fast delivery', taxiSub:'Comfort & style', fleursSub:'Flowers & gifts',
    pharmaeSub:'Night & day 🌙',
    taxiSoon:'Service coming soon',
    taxiDesc:'Bridge Taxi Confort — premium rides in Safi, in pure elegance.',
    taxiBook:'Book on WhatsApp Business',
    tabacSub:'Delivery & pick-up',
    tabacSoon:'Coming soon',
    tabacDesc:'Bridge Tabac — cigarettes, drinks & premium products in Safi.',
    tabacBook:'Send via WhatsApp Business',
    tabacCollectAddress:'Pick-up address: Plateau, Safi (the shop will contact you)',
    tabacSend:'Send order 🚀',
    paymentCash:'💵 Payment: Cash on delivery',
    paymentCard:'💳 Payment: Credit Card',
    sslBadge:'256-bit SSL · 100% Secure Payment',
    cardHolderLabel:'👤 Cardholder',
    onboardTitle:'Complete your profile',
    onboardSub:'A few details for a smooth experience',
    onboardSkip:'Skip for now',
    onboardSave:'Save & continue',
    onboardPhone:'📱 Phone number', onboardPhoneSub:'For your delivery rider',
    onboardAddr:'📍 Delivery address', onboardAddrSub:'Your address in Safi',
    onboardCard:'💳 Bank card', onboardCardSub:'Fast & secure payment',
    onboardId:'🪪 Identity', onboardIdSub:'Account verification',
    onboardCardNum:'Card number', onboardCardExp:'Expiry date', onboardCardHolder:'Name on card',
    onboardIdNote:'Coming soon. Your account is already active.',
    qrOption:'QR Code Payment 📲', qrOptionDesc:'Scan QR · Instant bank transfer',
    qrModalTitle:'Scan to pay', qrModalSub:'Open your banking app and scan the QR code',
    qrAmountLabel:'Amount to pay', qrPaid:'I have paid ✅', qrCancel:'Cancel',
    qrNote:'Instant transfer · Bridge Safi',
    hubServices:'Services', hubServicesSub:'Eats · Taxi · Tabac · Flowers · Pharmacy',
    hubGame:'Play & Win', hubGameSub:'Collect diamonds 💎 → free menus',
    hubWelcome:'Welcome',
  },
  ar: {
    appName:'بريدج سافي', zone:'آسفي، المغرب',
    heroSub:'مطاعمك المفضلة، نوصلها إليك',
    restaurantsTitle:'مطاعمنا', nearYou:'قريب منك · آسفي',
    openNow:'مفتوح', minOrder:'أدنى', delivMin:'دقيقة',
    menuTitle:'قائمة الطعام', addToCart:'أضف', close:'إغلاق', back:'→ رجوع',
    customize:'تخصيص', required:'مطلوب', optional:'اختياري',
    addWithOptions:'أضف إلى السلة', totalLabel:'المجموع',
    cartTitle:'سلة الطلبات', cartEmpty:'السلة فارغة', total:'المجموع',
    checkout:'اطلب الآن', checkoutTitle:'بياناتك',
    nameLabel:'اسمك', addrLabel:'عنوانك في آسفي', phoneLabel:'رقم الهاتف', emailLabel:'البريد الإلكتروني',
    namePh:'مثال: يوسف', addrPh:'مثال: الهضبة، ش. الحسن الثاني، آسفي', phonePh:'06 00 00 00 00', emailPh:'مثال@email.com',
    fillAll:'يرجى ملء جميع الحقول', continueBtn:'متابعة →',
    payModeTitle:'طريقة الدفع',
    cashOption:'الدفع عند الاستلام', cashOptionDesc:'ادفع نقداً عند استلام طلبك · مجاني',
    cardOption:'الدفع ببطاقة بنكية', cardOptionDesc:'Visa / Mastercard · CMI · آمن',
    cardFormTitle:'بيانات البطاقة', cardNumberLabel:'رقم البطاقة',
    cardExpiryLabel:'تاريخ الانتهاء', cardCVVLabel:'CVV', cardNameLabel:'الاسم على البطاقة',
    cardNumberPh:'1234 5678 9012 3456', cardExpiryPh:'MM/AA', cardCVVPh:'123', cardNamePh:'MOHAMED ALAMI',
    payNow:'ادفع الآن 🔒', confirmWhatsApp:'تأكيد الطلب 🚀',
    successTitle:'تم تأكيد الطلب! 🎉', successSub:'تم استلام طلبك بنجاح.',
    trackingLabel:'رقم التتبع', deliveryEta:'التوصيل المتوقع خلال 18–25 دقيقة', newOrder:'طلب جديد',
    autoFilled:'مُعبَّأ من ملفك الشخصي ✓',
    delivOption:'🚚 التوصيل للمنزل', delivOptionDesc:'يوصل إليك · منطقة آسفي',
    collectOption:'🏪 Click & Collect', collectOptionDesc:'الاستلام من المطعم · +2.99 MAD',
    collectAddress:'عنوان الاستلام : الهضبة، آسفي (سيتصل بك المطعم)',
    profileTitle:'ملفي الشخصي', profileSub:'معلوماتك المحفوظة',
    profileSave:'حفظ الملف الشخصي', profileSaved:'تم الحفظ ✓', savedPayment:'بطاقة بنكية محفوظة', signOut:'🚪 تسجيل الخروج',
    gameId:'معرّف اللاعب', gamePts:'نقاط', gameTitle:'Bridge Game',
    errName:'أدخل اسمك الكامل (مثال: محمد العلوي)',
    errPhone:'رقم غير صالح (مثال: 212612345678+ أو 0612345678)',
    errCard:'رقم البطاقة غير صالح (مطلوب 16 رقماً)',
    errCardType:'البطاقة غير مقبولة — Visa أو Mastercard فقط',
    errLuhn:'رقم البطاقة غير صالح — تحقق من الأرقام',
    promoLabel:'رمز ترويجي / هدية', promoPh:'مثال: BRIDGE10', promoApply:'تطبيق',
    promoOk:(d:number)=>`تم تطبيق -${d} MAD 🎉`, promoErr:'الرمز غير صالح أو مستخدم',
    diamondsSection:'💎 ماساتي Bridge', diamondsAvail:(n:number)=>`${n} نقطة (= ${Math.floor(n/200)} MAD)`,
    diamondsUse:'تحويل إلى خصم', diamondsNone:'لا توجد نقاط بعد — العب لتكسبها!',
    discountRow:(d:number)=>`الخصم المطبق: -${d} MAD`,
    deliveryFeeRow:'رسوم التوصيل',
    serviceFeeRow:'رسوم الخدمة',
    serviceFeeToggle:'إضافة رسوم الخدمة',
    serviceFeeDesc:'مساهمة في صيانة المنصة',
    errExpiry:'تاريخ غير صالح (صيغة MM/AA وغير منتهية)',
    errCardName:'اسم حامل البطاقة مطلوب',
    paymentTabCard:'💳 بطاقة', paymentTabPaypal:'🅿️ PayPal',
    paypalEmailLabel:'بريد PayPal الإلكتروني', paypalPh:'example@paypal.com',
    errPaypal:'عنوان البريد الإلكتروني لـ PayPal غير صالح',
    savedPaypalLabel:'PayPal محفوظ',
    changePwd:'🔑 تغيير كلمة المرور', currentPwd:'كلمة المرور الحالية',
    newPwd:'كلمة مرور جديدة (8 أحرف على الأقل)', confirmPwd:'تأكيد كلمة المرور الجديدة',
    pwdChanged:'تم تغيير كلمة المرور ✓', pwdMismatch:'كلمتا المرور غير متطابقتين.',
    pwdWeak:'كلمة المرور ضعيفة (8 أحرف على الأقل).', pwdWrong:'كلمة المرور الحالية غير صحيحة.',
    pwdSave:'تحديث كلمة المرور',
    trackTitle:'تتبع GPS مباشر', trackZone:'آسفي · الهضبة', trackLive:'مباشر',
    stages:['مستلمة','قيد التحضير','في الطريق','تم التوصيل'],
    stagesSub:['تم تأكيد الطلب','الطاهي يعمل','المندوب في الطريق','بالهناء والشفاء!'],
    orderStatus:'حالة طلبك', orderNum:'الطلب #BE-2847',
    eta:'وقت الوصول المتوقع', courierName:'سائق بريدج',
    contactTitle:'هل تحتاج مساعدة؟', contactSub:'فريقنا متاح 7 أيام في الأسبوع',
    whatsapp:'واتساب بيزنس', phone:'اتصل بنا', email:'البريد الإلكتروني',
    hours:'ساعات العمل', hoursVal:'8:00 ص – 11:00 م',
    navHome:'الرئيسية', navTrack:'تتبع', navContact:'تواصل', navCart:'السلة',
    footer:'© 2026 بريدج سافي · safi-bridge.ma', plateau:'الهضبة · وسط المدينة · بوزيدي',
    safiExcl:'تخصص آسفي', selected:'تم الاختيار ✓',
    waMsgHeader:'🛍️ طلب جديد من بريدج إيتس\.\.📦 الطلبات:\.',
    waMsgFooter:(total:number,name:string,addr:string,phone:string)=>`\.💰 المجموع: ${total} MAD\.\.👤 الاسم: ${name}\.📍 العنوان: ${addr}، آسفي\.📞 الهاتف: ${phone}\.\.أرجو تأكيد طلبي! 🙏`,
    chooseService:'اختر خدمتك',
    deliverySub:'توصيل سريع', taxiSub:'راحة وأناقة', fleursSub:'ورود وهدايا',
    pharmaeSub:'ليلاً ونهاراً 🌙',
    taxiSoon:'الخدمة قادمة قريباً',
    taxiDesc:'بريدج تاكسي كونفور — رحلات مميزة في آسفي بأناقة.',
    taxiBook:'احجز عبر واتساب بيزنس',
    tabacSub:'توصيل واستلام',
    tabacSoon:'قريباً',
    tabacDesc:'بريدج طباق — سجائر، مشروبات ومنتجات مميزة في آسفي.',
    tabacBook:'إرسال عبر واتساب بيزنس',
    tabacCollectAddress:'عنوان الاستلام : الهضبة، آسفي (ستتصل بك البوتيك)',
    tabacSend:'إرسال الطلب 🚀',
    paymentCash:'💵 الدفع: نقداً عند الاستلام',
    paymentCard:'💳 الدفع: بطاقة بنكية',
    sslBadge:'256-bit SSL · دفع آمن 100%',
    cardHolderLabel:'👤 حامل البطاقة',
    onboardTitle:'أكمل ملفك الشخصي',
    onboardSub:'بعض المعلومات لتجربة سلسة',
    onboardSkip:'تخطي الآن',
    onboardSave:'حفظ ومتابعة',
    onboardPhone:'📱 رقم الهاتف', onboardPhoneSub:'للتواصل مع المندوب',
    onboardAddr:'📍 عنوان التوصيل', onboardAddrSub:'عنوانك في آسفي',
    onboardCard:'💳 بطاقة بنكية', onboardCardSub:'دفع سريع وآمن',
    onboardId:'🪪 الهوية', onboardIdSub:'التحقق من الحساب',
    onboardCardNum:'رقم البطاقة', onboardCardExp:'تاريخ الانتهاء', onboardCardHolder:'الاسم على البطاقة',
    onboardIdNote:'قريباً. حسابك مفعّل.',
    qrOption:'الدفع بـ QR Code 📲', qrOptionDesc:'امسح الـ QR · تحويل بنكي فوري',
    qrModalTitle:'امسح للدفع', qrModalSub:'افتح تطبيق بنكك وامسح رمز QR',
    qrAmountLabel:'المبلغ المطلوب', qrPaid:'دفعت ✅', qrCancel:'إلغاء',
    qrNote:'التحويل فوري · Bridge Safi',
    hubServices:'الخدمات', hubServicesSub:'إيتس · تاكسي · تاباك · زهور · صيدلية',
    hubGame:'العب واربح', hubGameSub:'اجمع الماسات 💎 ← وجبات مجانية',
    hubWelcome:'مرحباً',
  },
  amz: {
    appName:'ⴱⵔⵉⴷⵊ ⵉⵢⵜⵙ', zone:'ⵙⴰⴼⵉ, ⵍⵎⵖⵔⵉⴱ',
    heroSub:'ⵉⵎⵣⴷⴰⵖⵏ ⵏⵏⴽ ⵉⵃⵎⵍⵏ, ⴷ ⵜⴰⵖⵔⵎⵜ ⵏⵏⴽ',
    restaurantsTitle:'ⵉⵎⵣⴷⴰⵖⵏ ⴰⵏⵏⵖ', nearYou:'ⵉⵇⵇⴰⵏ ⵖⵉⴽ · ⵙⴰⴼⵉ',
    openNow:'ⵉⵍⵍⴰ', minOrder:'ⴰⵎⵓ', delivMin:'ⵜⵉⵎⵉⵏⵉⵜ',
    menuTitle:'ⵍⵉⵙⵜⴰ ⴰⵏⵏⵖ', addToCart:'ⵔⵏⵓ', close:'ⵔⴳⵍ', back:'← ⵓⵣⵣⵍ',
    customize:'ⵙⵏⴼⵍ', required:'ⵉⵍⵍⴰ', optional:'ⴰⵎⴰⵣⴰⵔ',
    addWithOptions:'ⵔⵏⵓ ⵖ ⵜⵓⴽⴽⵙⴰ', totalLabel:'ⴰⵎⵎⴰⵙ',
    cartTitle:'ⵜⵓⴽⴽⵙⴰ', cartEmpty:'ⵜⵓⴽⴽⵙⴰ ⵉⵔⵉⵔⵉ', total:'ⴰⵎⵎⴰⵙ',
    checkout:'ⵔⵏⵓ ⴰⴷ', checkoutTitle:'ⵉⵙⴼⴰⵡⵏ ⵏⵏⴽ',
    nameLabel:'ⵉⵙⵎ ⵏⵏⴽ', addrLabel:'ⵜⴰⵙⵓⵏⵜ ⵖ ⵙⴰⴼⵉ', phoneLabel:'ⴰⵏⵓⵎⵔ ⵏ ⵓⵙⵓⵍ', emailLabel:'ⵉⵎⴰⵢⵍ',
    namePh:'ⴰⵎ: ⵢⵓⵙⴼ', addrPh:'ⴰⵎ: ⴰⴱⵍⴰⵟⵓ, ⵙⴰⴼⵉ', phonePh:'06 00 00 00 00', emailPh:'mail@email.com',
    fillAll:'ⵎⵍⴰ ⵉⵍⵉⵙ ⴽⵓⵍⵍⵓ ⵉⴳⵎⴰⵎⵏ', continueBtn:'ⵙⴷⴷⵉⴷ →',
    payModeTitle:'ⴰⵏⴰⵡ ⵏ ⵓⵙⵙⴼⵍⵍⴷ',
    cashOption:'ⴰⴷⵔⵉⵎ ⵎⵎⵉ ⵢⴰⵙⵍⵎⴷ', cashOptionDesc:'ⵙⵙⴼⵍⵍⴷ ⵙ ⵓⴷⵔⵉⵎ · ⵉⵥⵍⵉ',
    cardOption:'ⵜⴰⴽⴰⵔⴷⵜ ⵏ ⵓⵣⵔⴰⴼ', cardOptionDesc:'Visa / Mastercard · CMI · ⴰⵎⵣⵡⴰⵔⵓ',
    cardFormTitle:'ⵉⵙⴼⴰⵡⵏ ⵏ ⵜⴽⴰⵔⴷⵜ', cardNumberLabel:'ⴰⵏⵓⵎⵔ ⵏ ⵜⴽⴰⵔⴷⵜ',
    cardExpiryLabel:'ⴰⵙⵙ ⵏ ⵓⵙⵓⵔⴼ', cardCVVLabel:'CVV', cardNameLabel:'ⵉⵙⵎ ⵖ ⵜⴽⴰⵔⴷⵜ',
    cardNumberPh:'1234 5678 9012 3456', cardExpiryPh:'MM/AA', cardCVVPh:'123', cardNamePh:'MOHAMED ALAMI',
    payNow:'ⵙⵙⴼⵍⵍⴷ ⴷⵉⵖ 🔒', confirmWhatsApp:'ⵙⵛⴷ ⵉⴽⴽⵉⵏ 🚀',
    successTitle:'ⵜⵜⵓⵙⵛⴷⵃ ⵜⴰⵖⵓⵍⵜ! 🎉', successSub:'ⵜⵜⵓⵙⵔⵖ ⵜⴰⵖⵓⵍⵜ ⵏⵏⴽ.',
    trackingLabel:'ⴰⵏⵓⵎⵔ ⵏ ⵓⵙⴽⵍⵙ', deliveryEta:'ⴰⵙⵍⵎⴷ ⵖ 18–25 ⵜⵉⵎⵉⵏⵉⵜⵉⵏ', newOrder:'ⵜⴰⵖⵓⵍⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ',
    autoFilled:'ⵉⵜⵜⵓⵎⵍⴰ ⵙⴳ ⵓⵎⵍⵉ ⵏⵏⴽ ✓',
    delivOption:'🚚 ⴰⵙⵙⵓⴼⵖ ⵙ ⵓⴽⴰⵎⴰⵢ', delivOptionDesc:'ⵉⵜⵜⵓⴽⵛⵎ ⵖⵉⴽ · ⵙⴰⴼⵉ',
    collectOption:'🏪 Click & Collect', collectOptionDesc:'ⴰⵔⵣⵣⵓ ⴳ ⵓⵣⵉⴳⵣ · +2.99 MAD',
    collectAddress:'ⵜⴰⵏⵙⴰ ⵏ ⵓⵔⵣⵣⵓ : ⴰⴱⵍⴰⵟⵓ, ⵙⴰⴼⵉ',
    profileTitle:'ⴰⵎⵍⵉ ⵏⵓ', profileSub:'ⵉⵙⴼⴰⵡⵏ ⵏⵏⴽ ⵉⵜⵜⵓⵙⵎⴷⵏ',
    profileSave:'ⵙⵎⴷ ⴰⵎⵍⵉ', profileSaved:'ⵜⵜⵓⵙⵎⴷ ✓', savedPayment:'ⵜⴰⴽⴰⵔⴷⵜ ⵉⵜⵜⵓⵙⵎⴷⵏ', signOut:'🚪 ⴼⴼⵖ',
    gameId:'ⴰⵡⵏⴰⴽ', gamePts:'ⵜⵉⵏⵓⴹⵉⵡⵉⵏ', gameTitle:'Bridge Game',
    errName:'ⵙⵎⴷ ⵉⵙⵎ ⵏⵏⴽ ⴰⵎⴰⵜⴰⵢ (ex: Mohamed Alaoui)',
    errPhone:'ⴰⵏⵎⵔ ⵓⵔ ⵉⵙⵀⵡⴰ (ex: +212 612 345 678)',
    errCard:'ⵜⴰⴽⴰⵔⴷⵜ ⵓⵔ ⵜⵙⵀⵡⴰ (16 ⵉⵏⵎⵎⴰⵔⵏ)',
    errCardType:'ⵜⴰⴽⴰⵔⴷⵜ ⵓⵔ ⵜⵜⵓⵇⴱⵍ — Visa ⵏⵖ Mastercard',
    errLuhn:'ⴰⵏⵓⵎⵔ ⵏ ⵜⴰⴽⴰⵔⴷⵜ ⵓⵔ ⵉⵍⵓⵍ — ⵅⵛⵎ ⵉⵎⵔⴰⵡⵏ',
    promoLabel:'ⴰⵙⵉⴼⴼⴰⵖ / ⵜⵉⵡⵍⴰⴼⵜ', promoPh:'ⴰⵎⴷⵢⴰ: BRIDGE10', promoApply:'ⵙⴱⴷⴷ',
    promoOk:(d:number)=>` -${d} MAD ⵜⵓⵙⵉⵏ 🎉`, promoErr:'ⴰⵙⵉⴼⴼⴰⵖ ⵓⵔ ⵉⵍⵓⵍ',
    diamondsSection:'💎 ⵉⵎⴰⵙⵙⵏ ⵉⵏⵓ Bridge', diamondsAvail:(n:number)=>`${n} ⵏⵇⴰⵟ (= ${Math.floor(n/200)} MAD)`,
    diamondsUse:'ⵙⴱⴷⴷ ⵖ ⵜⵙⵇⵇⵉⵎⵜ', diamondsNone:'ⵓⵔ ⵉⵍⵍⴰ ⵉⵎⴰⵙ — ⵉⵍⵓ !',
    discountRow:(d:number)=>`ⵜⴰⵙⵇⵇⵉⵎⵜ: -${d} MAD`,
    deliveryFeeRow:'ⵉⵎⵙⴽⴰⵔⵏ ⵏ ⵓⵙⵙⵓⴼⵖ',
    serviceFeeRow:'ⵉⵎⵙⴽⴰⵔⵏ ⵏ ⵓⵙⵙⵉⵍⵓ',
    serviceFeeToggle:'ⵔⵏⵓ ⵉⵎⵙⴽⴰⵔⵏ ⵏ ⵓⵙⵙⵉⵍⵓ',
    serviceFeeDesc:'ⵜⴰⵙⴽⵉⵡⵉⵏⵜ ⵏ ⵜⵏⵙⴽⵉⵡⵜ',
    errExpiry:'ⴰⵣⵎⵣ ⵓⵔ ⵉⵙⵀⵡⴰ (MM/AA)',
    errCardName:'ⵉⵙⵎ ⵏ ⵓⵎⵙⴽⴽⵉ ⵉⵍⵍⴰ',
    paymentTabCard:'💳 ⵜⴰⴽⴰⵔⴷⵜ', paymentTabPaypal:'🅿️ PayPal',
    paypalEmailLabel:'ⵉⵎⵉⵍ PayPal', paypalPh:'example@paypal.com',
    errPaypal:'ⵉⵎⵉⵍ PayPal ⵓⵔ ⵉⵙⵀⵡⴰ',
    savedPaypalLabel:'PayPal ⵉⵜⵜⵓⵙⵎⴷ',
    changePwd:'🔑 ⵙⵏⴼⵍ ⵜⴰⴱⵔⵉⴷⵜ', currentPwd:'ⵜⴰⴱⵔⵉⴷⵜ ⵜⴰⵎⵣⵡⴰⵔⵓⵜ',
    newPwd:'ⵜⴰⴱⵔⵉⴷⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ (8 ⵉⵙⴽⴽⵉⵍⵏ)', confirmPwd:'ⵙⵙⴽⴷⵃ ⵜⴰⴱⵔⵉⴷⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ',
    pwdChanged:'ⵜⵜⵓⵙⵏⴼⵍ ✓', pwdMismatch:'ⵜⵉⴱⵔⵉⴷⵉⵏ ⵓⵔ ⵏⵎⵎⴰⵍⵏ.',
    pwdWeak:'ⵜⴰⴱⵔⵉⴷⵜ ⵓⵔ ⵜⵙⵀⵡⴰ (8 ⵉⵙⴽⴽⵉⵍⵏ).', pwdWrong:'ⵜⴰⴱⵔⵉⴷⵜ ⵜⴰⵎⵣⵡⴰⵔⵓⵜ ⵓⵔ ⵜⵙⵀⵡⴰ.',
    pwdSave:'ⵙⵙⴽⴷⵃ ⵜⴰⴱⵔⵉⴷⵜ',
    trackTitle:'ⴰⵙⴽⵍⵙ GPS', trackZone:'ⵙⴰⴼⵉ · ⴰⴱⵍⴰⵟⵓ', trackLive:'ⴷⴷⴰⵡ',
    stages:['ⵜⵜⵓⵙⵔⵖⴰ','ⵜⴻⵜⵜⵓⵙⴽⴰⵔ','ⵖ ⵓⵣⵔⵉⵔⵉ','ⵜⵜⵓⵙⵍⵎⴷ'],
    stagesSub:['ⵜⵜⵓⵙⵛⴷⵃ ⵜⴰⵖⵓⵍⵜ','ⴰⵎⵓⵙⵙⵓ ⵉⵜⵜⵓⵙⴽⴰⵔ','ⴰⵎⵥⵍⵉ ⵉⵜⵜⴰⵡⵙ','ⵜⵙⴼⵓⵍⵍⵓ!'],
    orderStatus:'ⴰⵙⵉⵡⴷ ⵏ ⵜⴰⵖⵓⵍⵜ', orderNum:'ⵜⴰⵖⵓⵍⵜ #BE-2847',
    eta:'ⴰⴽⵓⴷ ⵏ ⵓⵙⵍⵎⴷ', courierName:'ⴰⵎⵥⵍⵉ Bridge',
    contactTitle:'ⵜⵙⵔⴰ ⵜⵉⵡⵉⵙⵉ?', contactSub:'ⴰⴳⵔⴰⵡ ⴰⵏⵏ ⵉⵍⵍⴰ 7 ⵓⵙⵙⴰⵏ',
    whatsapp:'WA Business', phone:'ⵙⵓⵍ', email:'ⵉⵎⴰⵢⵍ',
    hours:'ⵜⴰⵙⵔⴰⵜ', hoursVal:'8:00 – 23:00',
    navHome:'ⵜⴰⵣⵡⴰⵔⵜ', navTrack:'ⴰⵙⴽⵍⵙ', navContact:'ⴰⵎⵢⴰⵡⴰⴹ', navCart:'ⴰⵙⵡⵉⵔ',
    footer:'© 2026 ⴱⵔⵉⴷⵊ ⵙⴰⴼⵉ · safi-bridge.ma', plateau:'ⴰⴱⵍⴰⵟⵓ · ⵓⵍⵍⴰ ⵏ ⵜⵎⴷⵉⵏⵜ · ⴱⵓⵣⵉⴷⵉ',
    safiExcl:'ⵏ ⵙⴰⴼⵉ', selected:'ⵉⵜⵜⵓⴼⵔⴰ ✓',
    waMsgHeader:'🛍️ ⵜⴰⵖⵓⵍⵜ ⵜⴰⵎⴰⵢⵏⵓⵜ ⵏ ⴱⵔⵉⴷⵊ ⵉⵢⵜⵙ\.\.📦 ⵉⵙⴽⴰⵔⵏ:\.',
    waMsgFooter:(total:number,name:string,addr:string,phone:string)=>`\.💰 ⴰⵎⵎⴰⵙ: ${total} MAD\.\.👤 ⵉⵙⵎ: ${name}\.📍 ⵜⴰⵙⵓⵏⵜ: ${addr}, ⵙⴰⴼⵉ\.📞 ⴰⵙⵓⵍ: ${phone}\.\.ⵙⵛⴷ ⵜⴰⵖⵓⵍⵜ ⵉⵏⵓ! 🙏`,
    chooseService:'ⴼⵔ ⵜⴰⵎⵙⴽⴰⵔⵜ',
    deliverySub:'ⴰⵙⵙⵓⴼⵖ ⵣⵔⵉⵔⵉ', taxiSub:'ⵓⵏⵍⵍⵉ ⴷ ⵓⵙⵏⴼⵍ', fleursSub:'ⵉⵣⵓⵍⴰⵏ ⴷ ⵉⵡⴰⵔⴳⵉⵡⵏ',
    pharmaeSub:'ⵉⴹ ⴷ ⵡⴰⵙⵙ 🌙',
    taxiSoon:'ⵜⴰⵎⵙⴽⴰⵔⵜ ⵜⴰⵖ ⴷ ⵓⴳⵉⵏ',
    taxiDesc:'ⴱⵔⵉⴷⵊ ⵜⴰⴽⵙⵉ — ⵜⵉⵔⴰⵡⵉⵏ ⵜⵉⴼⵓⵍⴽⵉⵏ ⵖ ⵙⴰⴼⵉ.',
    taxiBook:'ⵙⵇⵇⵔ ⵙ WhatsApp Business',
    tabacSub:'ⴰⵙⵙⵓⴼⵖ ⴷ ⵓⵔⵣⵣⵓ',
    tabacSoon:'ⵜⴰⵖ ⴷ ⵓⴳⵉⵏ',
    tabacDesc:'ⴱⵔⵉⴷⵊ ⵟⴱⴰⵇ — ⵜⵉⴳⴰⵔ, ⵉⵙⵡⵉⵡⵏ ⴷ ⵉⵙⴽⴰⵔⵏ ⵉⴼⵓⵍⴽⵉⵏ ⵖ ⵙⴰⴼⵉ.',
    tabacBook:'ⵙⵙⵉⴼⵍ ⵙ WhatsApp Business',
    tabacCollectAddress:'ⵜⴰⵏⵙⴰ ⵏ ⵓⵔⵣⵣⵓ : ⴰⴱⵍⴰⵟⵓ, ⵙⴰⴼⵉ',
    tabacSend:'ⵙⵙⵉⴼⵍ ⵜⴰⵖⵓⵍⵜ 🚀',
    paymentCash:'💵 ⴰⴷⴼⴰⵏ: ⴰⴷⵔⵉⵎ ⵎⵎⵉ ⵢⴰⵙⵍⵎⴷ',
    paymentCard:'💳 ⴰⴷⴼⴰⵏ: ⵜⴰⴽⴰⵔⴷⵜ',
    sslBadge:'256-bit SSL · ⴰⴷⴼⴰⵏ ⵉⵣⴷⵉⴳⵏ 100%',
    cardHolderLabel:'👤 ⴰⵎⵙⴽⴽⵉ',
    onboardTitle:'ⵙⵎⴷ ⴰⵎⵍⵉ ⵏⵏⴽ',
    onboardSub:'ⵉⵙⴼⴰⵡⵏ ⵏ ⵜⵎⵓⵔⵉ ⵏⵏⴽ',
    onboardSkip:'ⵙⵎⴰⵍ ⴰⵙⵙⴰ',
    onboardSave:'ⵙⵎⴷ ⴷ ⴽⵛⵎ',
    onboardPhone:'📱 ⵓⵟⵟⵓⵏ ⵏ ⵜⵙⵍⵍⴰⵢⵜ', onboardPhoneSub:'ⵉ ⵓⵙⴽⵍⴰ',
    onboardAddr:'📍 ⵜⴰⵏⵙⴰ ⵏ ⵓⵣⵣⵏⵣ', onboardAddrSub:'ⵜⴰⵏⵙⴰ ⵏⵏⴽ ⵙ ⵙⴰⴼⵉ',
    onboardCard:'💳 ⵜⴰⴽⴰⵔⴷⵜ ⵏ ⵓⵙⵔⴰⵡ', onboardCardSub:'ⴰⴷⴼⴰⵏ ⴰⵣⴷⵉⴳ',
    onboardId:'🪪 ⵜⵉⵎⵙⵙⵉⵔⴰ', onboardIdSub:'ⵜⴰⵙⵍⵎⴷⵜ ⵏ ⵓⵃⵙⴰⴱ',
    onboardCardNum:'ⵓⵟⵟⵓⵏ ⵏ ⵜⴰⴽⴰⵔⴷⵜ', onboardCardExp:'ⴰⵙⴽⵓ ⵏ ⵓⵙⵎⵙⵉⵡⴷ', onboardCardHolder:'ⵉⵙⵎ ⵖⴼ ⵜⴰⴽⴰⵔⴷⵜ',
    onboardIdNote:'ⵉⵍⴻⵍⵍⵉ ⴰⵙⵙ. ⵓⵃⵙⴰⴱ ⵏⵏⴽ ⵉⵜⵜⵓⵙⵎⴷ.',
    qrOption:'ⴰⵣⵔⴼ QR 📲', qrOptionDesc:'ⵙⵃⵓ QR · ⴰⵙⵎⴰⵡ ⵏ ⵓⵙⵉⴷⴼ ⵉⵎⵉⵙⵙⵓ',
    qrModalTitle:'ⵙⵃⵓ ⵉⵍⵍⵉ ⵜⵥⵖ', qrModalSub:'ⵙⵉⵡⵍ ⵉⴱⵔⵉⴷ ⵏ ⵓⴱⴰⵏⴽ ⵏⵏⴽ',
    qrAmountLabel:'ⴰⵣⵔⴼ ⵉⵍⴰⵎⵎⴰⵏ', qrPaid:'ⵥⵖⵖ ✅', qrCancel:'ⴽⵛⵎ',
    qrNote:'ⴰⵙⵎⴰⵡ ⵉⵙⵔⵓⵙ · Bridge Safi',
    hubServices:'ⵉⵙⵙⵓⵜⵓⵔⵏ', hubServicesSub:'ⵉⵜⵙ · ⵜⴰⴽⵙⵉ · ⵜⴰⴱⴰⴽ · ⵉⵥⵓⵍⴰⵏ · ⵜⵉⵙⵙⵏⵜⵉⵜ',
    hubGame:'ⴰⵎⵢⴰⴳⵓ · ⴳⵓⵍⵉ', hubGameSub:'ⵙⵎⵓⵏ ⵉⵎⴰⵙⵙⵏ 💎 → ⵉⵎⵏⵙⵉ ⴰⵎⵙⵜⵓ',
    hubWelcome:'ⵎⵔⵓⵃⴱⴰ',
  },
};

// ─── OPTION GROUPS ────────────────────────────────────────────────────────────

const OPT = {
  pizzaSize: ():OptionGroup => ({ id:'size', names:{fr:'Taille',en:'Size',ar:'الحجم',amz:'ⴰⵎⵔⴰⵡ'}, type:'radio', required:true, choices:[
    {id:'30',names:{fr:'30 cm',en:'30 cm',ar:'30 سم',amz:'30 cm'},price:0},
    {id:'40',names:{fr:'40 cm (+15 MAD)',en:'40 cm (+15 MAD)',ar:'40 سم (+15)',amz:'40 cm (+15)'},price:15},
  ]}),
  pizzaSauce: ():OptionGroup => ({ id:'sauce_pizza', names:{fr:'Sauce',en:'Sauce',ar:'الصلصة',amz:'ⴰⵙⴰⴽ'}, type:'radio', required:true, choices:[
    {id:'tomate',names:{fr:'Tomate',en:'Tomato',ar:'طماطم',amz:'ⴰⵎⵥⵢⴰⵏ'},price:0},
    {id:'blanche',names:{fr:'Blanche (crème)',en:'White (cream)',ar:'بيضاء (كريمة)',amz:'ⴰⵎⵍⵍⴰⵍ'},price:0},
    {id:'bbq',names:{fr:'BBQ',en:'BBQ',ar:'باربيكيو',amz:'BBQ'},price:0},
  ]}),
  pizzaExtras: ():OptionGroup => ({ id:'extras_pizza', names:{fr:'Suppléments',en:'Extras',ar:'إضافات',amz:'ⵉⴼⵙⵙⴰⵢⵏ'}, type:'checkbox', required:false, choices:[
    {id:'xcheese',names:{fr:'Extra Fromage (+10 MAD)',en:'Extra Cheese (+10 MAD)',ar:'جبن إضافي (+10)',amz:'ⴰⴼⵔⵓⵎⴰⵊ (+10)'},price:10},
    {id:'xmeat',names:{fr:'Extra Viande (+15 MAD)',en:'Extra Meat (+15 MAD)',ar:'لحم إضافي (+15)',amz:'ⴰⴽⵙⵓⵎ (+15)'},price:15},
    {id:'xolives',names:{fr:'Extra Olives (+5 MAD)',en:'Extra Olives (+5 MAD)',ar:'زيتون إضافي (+5)',amz:'ⵜⵉⵣⵉⵡⵉⵏ (+5)'},price:5},
  ]}),
  tacosSauce: ():OptionGroup => ({ id:'sauce_tacos', names:{fr:'Sauce',en:'Sauce',ar:'الصلصة',amz:'ⴰⵙⴰⴽ'}, type:'radio', required:true, choices:[
    {id:'alg',names:{fr:'Algérienne',en:'Algerian',ar:'جزائرية',amz:'ⵜⴰⵣⵣⴰⵢⵔⵉⵜ'},price:0},
    {id:'mayo',names:{fr:'Mayonnaise',en:'Mayo',ar:'مايونيز',amz:'ⵎⴰⵢⵓ'},price:0},
    {id:'piq',names:{fr:'Piquante',en:'Spicy',ar:'حارة',amz:'ⵜⴰⵇⵇⵓⵍⵜ'},price:0},
    {id:'harissa',names:{fr:'Harissa',en:'Harissa',ar:'هريسة',amz:'ⵀⴰⵔⵉⵙⴰ'},price:0},
    {id:'bbq',names:{fr:'BBQ',en:'BBQ',ar:'باربيكيو',amz:'BBQ'},price:0},
  ]}),
  tacosExtras: ():OptionGroup => ({ id:'extras_tacos', names:{fr:'Suppléments',en:'Extras',ar:'إضافات',amz:'ⵉⴼⵙⵙⴰⵢⵏ'}, type:'checkbox', required:false, choices:[
    {id:'xcheese',names:{fr:'Extra Fromage (+10 MAD)',en:'Extra Cheese (+10 MAD)',ar:'جبن إضافي (+10)',amz:'ⴰⴼⵔⵓⵎⴰⵊ (+10)'},price:10},
    {id:'xmeat',names:{fr:'Extra Viande (+15 MAD)',en:'Extra Meat (+15 MAD)',ar:'لحم إضافي (+15)',amz:'ⴰⴽⵙⵓⵎ (+15)'},price:15},
    {id:'xsauce',names:{fr:'Double Sauce (+5 MAD)',en:'Double Sauce (+5 MAD)',ar:'صلصة مضاعفة (+5)',amz:'ⵙⴰⵙ (+5)'},price:5},
  ]}),
  kebabBread: ():OptionGroup => ({ id:'bread', names:{fr:'Pain',en:'Bread',ar:'الخبز',amz:'ⴰⵖⵔⵓⵎ'}, type:'radio', required:true, choices:[
    {id:'baguette',names:{fr:'Baguette',en:'Baguette',ar:'باغيت',amz:'ⴱⴰⴳⵉⵜ'},price:0},
    {id:'rond',names:{fr:'Pain Rond',en:'Round Bread',ar:'خبز دائري',amz:'ⴰⵖⵔⵓⵎ ⴰⴳⴰⵢⵢⵓⵔ'},price:0},
  ]}),
  kebabSauce: ():OptionGroup => ({ id:'sauce_kebab', names:{fr:'Sauce',en:'Sauce',ar:'الصلصة',amz:'ⴰⵙⴰⴽ'}, type:'radio', required:true, choices:[
    {id:'alg',names:{fr:'Algérienne',en:'Algerian',ar:'جزائرية',amz:'ⵜⴰⵣⵣⴰⵢⵔⵉⵜ'},price:0},
    {id:'mayo',names:{fr:'Mayonnaise',en:'Mayo',ar:'مايونيز',amz:'ⵎⴰⵢⵓ'},price:0},
    {id:'piq',names:{fr:'Piquante',en:'Spicy',ar:'حارة',amz:'ⵜⴰⵇⵇⵓⵍⵜ'},price:0},
    {id:'harissa',names:{fr:'Harissa',en:'Harissa',ar:'هريسة',amz:'ⵀⴰⵔⵉⵙⴰ'},price:0},
  ]}),
  kebabSalad: ():OptionGroup => ({ id:'salad', names:{fr:'Garniture',en:'Toppings',ar:'الإضافات',amz:'ⵉⵙⵓⵎⵙⵏ'}, type:'checkbox', required:false, choices:[
    {id:'tomate',names:{fr:'Tomate',en:'Tomato',ar:'طماطم',amz:'ⴰⵎⵥⵢⴰⵏ'},price:0},
    {id:'oignon',names:{fr:'Oignon',en:'Onion',ar:'بصل',amz:'ⵜⵉⴱⵙⵍⵉⵏ'},price:0},
    {id:'cornichon',names:{fr:'Cornichon',en:'Pickle',ar:'مخلل',amz:'ⵍⵎⵅⵍⵍ'},price:0},
    {id:'salade',names:{fr:'Salade Verte',en:'Lettuce',ar:'خس',amz:'ⵓⵍⵓⴼ'},price:0},
  ]}),
  burgerCooking: ():OptionGroup => ({ id:'cooking', names:{fr:'Cuisson',en:'Cooking',ar:'الطهي',amz:'ⴰⵙⵙⵓⵜⵔ'}, type:'radio', required:true, choices:[
    {id:'bc',names:{fr:'Bien cuit',en:'Well done',ar:'مطبوخ جيداً',amz:'ⵉⵜⵜⵓⵙⵙⵓⵜⵔ'},price:0},
    {id:'ap',names:{fr:'À point',en:'Medium',ar:'متوسط',amz:'ⴰⵎⵎⴰⵙ'},price:0},
  ]}),
  burgerExtras: ():OptionGroup => ({ id:'extras_burger', names:{fr:'Suppléments',en:'Extras',ar:'إضافات',amz:'ⵉⴼⵙⵙⴰⵢⵏ'}, type:'checkbox', required:false, choices:[
    {id:'xcheese',names:{fr:'Extra Fromage (+10 MAD)',en:'Extra Cheese (+10 MAD)',ar:'جبن إضافي (+10)',amz:'ⴰⴼⵔⵓⵎⴰⵊ (+10)'},price:10},
    {id:'xmeat',names:{fr:'Double Steak (+20 MAD)',en:'Double Steak (+20 MAD)',ar:'ستيك مزدوج (+20)',amz:'ⵙⵜⵉⴽ (+20)'},price:20},
    {id:'egg',names:{fr:'Oeuf (+8 MAD)',en:'Egg (+8 MAD)',ar:'بيضة (+8)',amz:'ⵜⴰⵍⵖⴰ (+8)'},price:8},
  ]}),
  burgerSauce: ():OptionGroup => ({ id:'sauce_burger', names:{fr:'Sauce(s)',en:'Sauce(s)',ar:'الصلصة',amz:'ⴰⵙⴰⴽ'}, type:'checkbox', required:false, choices:[
    {id:'ketchup',names:{fr:'Ketchup',en:'Ketchup',ar:'كاتشاب',amz:'ⴽⵉⵜⵛⵓⴱ'},price:0},
    {id:'mayo',names:{fr:'Mayo',en:'Mayo',ar:'مايونيز',amz:'ⵎⴰⵢⵓ'},price:0},
    {id:'bbq',names:{fr:'BBQ',en:'BBQ',ar:'باربيكيو',amz:'BBQ'},price:0},
    {id:'mustard',names:{fr:'Moutarde',en:'Mustard',ar:'خردل',amz:'ⵜⴰⵎⵓⵙⵜⴰⵔⴷ'},price:0},
  ]}),
  drinkFlavor: ():OptionGroup => ({ id:'flavor', names:{fr:'Saveur',en:'Flavor',ar:'النكهة',amz:'ⴰⵥⵡⴰⵏ'}, type:'radio', required:true, choices:[
    {id:'cola',names:{fr:'Coca-Cola',en:'Coca-Cola',ar:'كوكا كولا',amz:'ⴽⵓⵍⴰ'},price:0},
    {id:'fanta',names:{fr:'Fanta Orange',en:'Fanta Orange',ar:'فانتا برتقال',amz:'ⴼⴰⵏⵜⴰ'},price:0},
    {id:'sprite',names:{fr:'Sprite',en:'Sprite',ar:'سبرايت',amz:'ⵙⴱⵔⵉⵜ'},price:0},
    {id:'citron',names:{fr:'7up Citron',en:'7up Lemon',ar:'7up ليمون',amz:'7up'},price:0},
  ]}),
  drinkSize: ():OptionGroup => ({ id:'size_drink', names:{fr:'Format',en:'Size',ar:'الحجم',amz:'ⴰⵎⵔⴰⵡ'}, type:'radio', required:true, choices:[
    {id:'25',names:{fr:'Petite 25cl',en:'Small 25cl',ar:'صغيرة 25cl',amz:'ⴰⵎⵥⵢⴰⵏ 25cl'},price:0},
    {id:'50',names:{fr:'Moyenne 50cl (+5 MAD)',en:'Medium 50cl (+5 MAD)',ar:'متوسطة 50cl (+5)',amz:'ⴰⵎⵎⴰⵙ 50cl (+5)'},price:5},
    {id:'1l',names:{fr:'Grande 1L (+10 MAD)',en:'Large 1L (+10 MAD)',ar:'كبيرة 1L (+10)',amz:'ⵜⴰⵎⵇⵇⵔⴰⵏⵜ 1L (+10)'},price:10},
  ]}),
};

// ─── RESTAURANT DATA ──────────────────────────────────────────────────────────

// ─── McDONALD'S OPTION GROUPS ─────────────────────────────────────────────────

const MCD = {
  menuSize: ():OptionGroup => ({ id:'menu_size', names:{fr:'Format du Menu',en:'Menu Size',ar:'حجم الوجبة',amz:'ⴰⵎⵔⴰⵡ'}, type:'radio', required:true, choices:[
    {id:'medium',names:{fr:'Menu Medium',en:'Medium Meal',ar:'وجبة وسط',amz:'ⵎⵉⴷⵢⵓⵎ'},price:0},
    {id:'maxi',  names:{fr:'Menu Large (+7 MAD)',en:'Large Meal (+7 MAD)',ar:'وجبة كبيرة (+7)',amz:'ⵎⴰⴽⵙⵉ (+7)'},price:7},
  ]}),
  menuDrink: ():OptionGroup => ({ id:'menu_drink', names:{fr:'Boisson',en:'Drink',ar:'المشروب',amz:'ⴰⵙⵡ'}, type:'radio', required:true, choices:[
    {id:'cola',   names:{fr:'Coca-Cola',      en:'Coca-Cola',      ar:'كوكا كولا',   amz:'ⴽⵓⵍⴰ'},       price:0},
    {id:'fanta',  names:{fr:'Fanta Orange',   en:'Fanta Orange',   ar:'فانتا برتقال',amz:'ⴼⴰⵏⵜⴰ'},      price:0},
    {id:'sprite', names:{fr:'Sprite',         en:'Sprite',         ar:'سبرايت',      amz:'ⵙⴱⵔⵉⵜ'},      price:0},
    {id:'7up',    names:{fr:'7UP',            en:'7UP',            ar:'7UP',          amz:'7UP'},          price:0},
    {id:'nestea', names:{fr:'Nestea',         en:'Nestea',         ar:'نيستي',        amz:'ⵏⵉⵙⵜⵉ'},      price:0},
    {id:'eau',    names:{fr:'Eau Minérale',   en:'Still Water',    ar:'ماء معدني',   amz:'ⴰⵎⴰⵏ'},        price:0},
  ]}),
  removals: ():OptionGroup => ({ id:'removals', names:{fr:'Retirer (optionnel)',en:'Remove (optional)',ar:'إزالة (اختياري)',amz:'ⵙⵔⵔⵓ'}, type:'checkbox', required:false, choices:[
    {id:'no_pickle', names:{fr:'Sans cornichons',  en:'No pickles',   ar:'بدون خيار',     amz:'ⵓⵔ ⵉⴼⵔⵓⵔⵏ'},  price:0},
    {id:'no_onion',  names:{fr:'Sans oignons',     en:'No onions',    ar:'بدون بصل',      amz:'ⵓⵔ ⵜⵉⴱⵙⵍⵉⵏ'}, price:0},
    {id:'no_salad',  names:{fr:'Sans salade',      en:'No lettuce',   ar:'بدون خس',       amz:'ⵓⵔ ⵓⵍⵓⴼ'},    price:0},
    {id:'no_tomato', names:{fr:'Sans tomate',      en:'No tomato',    ar:'بدون طماطم',    amz:'ⵓⵔ ⴰⵎⵥⵢⴰⵏ'},   price:0},
    {id:'no_sauce',  names:{fr:'Sans sauce',       en:'No sauce',     ar:'بدون صلصة',     amz:'ⵓⵔ ⴰⵙⴰⴽ'},    price:0},
    {id:'no_cheese', names:{fr:'Sans fromage',     en:'No cheese',    ar:'بدون جبن',      amz:'ⵓⵔ ⴰⴼⵔⵓⵎⴰⵊ'}, price:0},
  ]}),
  dipSauce: ():OptionGroup => ({ id:'dip', names:{fr:'Sauce Dip',en:'Dipping Sauce',ar:'صلصة التغميس',amz:'ⴰⵙⴰⴽ'}, type:'radio', required:true, choices:[
    {id:'ketchup',  names:{fr:'Ketchup',       en:'Ketchup',       ar:'كاتشاب',     amz:'ⴽⵉⵜⵛⵓⴱ'},    price:0},
    {id:'bbq',      names:{fr:'Barbecue',      en:'BBQ',           ar:'باربيكيو',   amz:'BBQ'},          price:0},
    {id:'honey',    names:{fr:'Miel-Moutarde', en:'Honey Mustard', ar:'عسل خردل',   amz:'ⴰⵎⵎⵉⵙ'},      price:0},
    {id:'curry',    names:{fr:'Sauce Curry',   en:'Curry Sauce',   ar:'كاري',       amz:'ⴽⴰⵔⵉ'},       price:0},
    {id:'sweet',    names:{fr:'Sweet Chili',   en:'Sweet Chili',   ar:'تشيلي حلو',  amz:'ⵜⵛⵉⵍⵉ'},     price:0},
  ]}),
  nuggetsQty: ():OptionGroup => ({ id:'nuggets_qty', names:{fr:'Nombre de pièces',en:'Number of pieces',ar:'عدد القطع',amz:'ⴰⵏⵓⵎⵔ'}, type:'radio', required:true, choices:[
    {id:'6', names:{fr:'6 pièces',en:'6 pieces',ar:'6 قطع',amz:'6'},price:0},
    {id:'9', names:{fr:'9 pièces (+15 MAD)',en:'9 pieces (+15 MAD)',ar:'9 قطع (+15)',amz:'9 (+15)'},price:15},
    {id:'20',names:{fr:'20 pièces (+55 MAD)',en:'20 pieces (+55 MAD)',ar:'20 قطع (+55)',amz:'20 (+55)'},price:55},
  ]}),
  happyMealDessert: ():OptionGroup => ({ id:'hm_dessert', names:{fr:'Dessert',en:'Dessert',ar:'الحلوى',amz:'ⴰⵎⴰⴳⵓ'}, type:'radio', required:true, choices:[
    {id:'icecream',names:{fr:'Glace Vanille',   en:'Vanilla Ice Cream', ar:'بوظة فانيلا', amz:'ⵜⴰⵍⴰⵢⵜ'},price:0},
    {id:'apple',   names:{fr:'Apple Pie',       en:'Apple Pie',         ar:'فطيرة التفاح', amz:'ⴰⴱⵍⴰ'},   price:0},
    {id:'mcflurry',names:{fr:'McFlurry Oreo',   en:'McFlurry Oreo',     ar:'ماك فلوري أوريو',amz:'ⵎⴽⴼⵍⵓⵔⵉ'},price:5},
  ]}),
  happyMealToy: ():OptionGroup => ({ id:'hm_toy', names:{fr:'Jouet Happy Meal',en:'Happy Meal Toy',ar:'لعبة وجبة الأطفال',amz:'ⴰⵣⴰⵡⴰⵏ'}, type:'radio', required:true, choices:[
    {id:'boy',  names:{fr:'Garçon',en:"Boy's toy",ar:'ولد',amz:'ⴰⵣⴰⵡⴰⵏ ⵏ ⵢⵉⵖⵔⵎ'},price:0},
    {id:'girl', names:{fr:'Fille', en:"Girl's toy",ar:'بنت',amz:'ⴰⵣⴰⵡⴰⵏ ⵏ ⵜⴼⴰⵜ'}, price:0},
  ]}),
  drinkSize: ():OptionGroup => ({ id:'drink_size', names:{fr:'Format',en:'Size',ar:'الحجم',amz:'ⴰⵎⵔⴰⵡ'}, type:'radio', required:true, choices:[
    {id:'s', names:{fr:'Small (30cl)',   en:'Small (30cl)',   ar:'صغير (30cl)',  amz:'ⴰⵎⵥⵢⴰⵏ'},  price:0},
    {id:'m', names:{fr:'Medium (50cl)', en:'Medium (50cl)', ar:'وسط (50cl)',   amz:'ⴰⵎⵎⴰⵙ (+5)'},price:5},
    {id:'l', names:{fr:'Large (1L)',    en:'Large (1L)',     ar:'كبير (1L +10)',amz:'ⵜⴰⵎⵇⵇⵔⴰⵏⵜ (+10)'},price:10},
  ]}),
  drinkIce: ():OptionGroup => ({ id:'ice', names:{fr:'Glaçons',en:'Ice',ar:'الثلج',amz:'ⴰⵎⴽⵙⴰ'}, type:'radio', required:false, choices:[
    {id:'with_ice',  names:{fr:'Avec glaçons',  en:'With ice',    ar:'مع ثلج',     amz:'ⵙ ⵓⵎⴽⵙⴰ'},   price:0},
    {id:'no_ice',    names:{fr:'Sans glaçons',  en:'Without ice', ar:'بدون ثلج',   amz:'ⵓⵔ ⵓⵎⴽⵙⴰ'},  price:0},
  ]}),
};

const MCDO_COVER   = '/mcdo_cover.jpg';
const MCDO_BIGMAC  = '/mcdo_burger.jpg';
const MCDO_CHICKEN = 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80';
const MCDO_CRISPY  = 'https://images.unsplash.com/photo-1596956470007-2bf6095e7e16?w=600&q=80';
const MCDO_CHEESE  = 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80';
const MCDO_FISH    = 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80';
const MCDO_SIGN    = 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80';
const MCDO_NUGGETS = 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80';
const MCDO_WINGS   = 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80';
const MCDO_FRIES   = 'https://images.unsplash.com/photo-1576107232684-1279f55e14cf?w=600&q=80';
const MCDO_WEDGES  = 'https://images.unsplash.com/photo-1630431341973-02e1b662ec35?w=600&q=80';
const MCDO_HAPPY   = 'https://images.unsplash.com/photo-1619881589316-24831c9e0b2d?w=600&q=80';
const MCDO_MCFLURRY= 'https://images.unsplash.com/photo-1576039638882-cc2ca1d23c4f?w=600&q=80';
const MCDO_SUNDAE  = 'https://images.unsplash.com/photo-1614088685112-0a760b71a3c8?w=600&q=80';
const MCDO_PIE     = 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80';
const MCDO_MILK    = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80';
const MCDO_COOKIE  = 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&q=80';
const MCDO_COLA    = 'https://images.unsplash.com/photo-1574914629385-46448b488c3c?w=600&q=80';
const MCDO_JUICE   = 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&q=80';
const MCDO_COFFEE  = 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&q=80';
const MCDO_WATER   = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80';

const RESTAURANTS: Restaurant[] = [
  // ─── McDONALD'S SAFI (Featured · Pinned #1) ──────────────────────────────
  {
    id:'mcdonalds-safi',
    name:"McDonald's Safi",
    tagline:{fr:'Le goût que vous aimez, livré à Safi',en:'The taste you love, delivered in Safi',ar:'الطعم الذي تحبه، يُوصَّل إليك في آسفي',amz:'ⴰⵥⵡⴰⵏ ⵉⵃⵎⵍⵏ, ⴷ ⵙⴰⴼⵉ'},
    logo:'🍟',
    cover: MCDO_COVER,
    cuisine:{fr:'Burgers · Menus · Fast Food',en:'Burgers · Meals · Fast Food',ar:'برغر · وجبات · فاست فود',amz:'ⴱⵓⵔⴳⵔ · ⵎⵉⵏⵓ'},
    tags:['burger','fast-food'],
    rating:4.5, deliveryTime:'20–30', minOrder:49,
    categories:[
      {
        id:'menus', emoji:'🥡',
        names:{fr:'Menus',en:'Meals',ar:'الوجبات الكاملة',amz:'ⵉⵎⵏⵓⵏ'},
        items:[
          {id:'mc1',names:{fr:'Menu Big Mac',en:'Big Mac Meal',ar:'وجبة بيج ماك',amz:'ⴱⵉⴳ ⵎⴰⴽ ⵎⵉⵏⵓ'},price:69,photo:MCDO_BIGMAC,options:[MCD.menuSize(),MCD.menuDrink(),MCD.removals()]},
          {id:'mc2',names:{fr:'Menu McChicken',en:'McChicken Meal',ar:'وجبة ماك تشيكن',amz:'ⵎⴽⵜⵛⵉⴽⵏ ⵎⵉⵏⵓ'},price:67,photo:MCDO_CHICKEN,options:[MCD.menuSize(),MCD.menuDrink(),MCD.removals()]},
          {id:'mc3',names:{fr:'Menu Double Cheeseburger',en:'Double Cheeseburger Meal',ar:'وجبة دبل تشيزبرغر',amz:'ⴷⴱⵍ ⵛⵉⵣⴱⵓⵔⴳⵔ ⵎⵉⵏⵓ'},price:56,photo:MCDO_CHEESE,options:[MCD.menuSize(),MCD.menuDrink(),MCD.removals()]},
          {id:'mc4',names:{fr:'Menu Filet-O-Fish',en:'Filet-O-Fish Meal',ar:'وجبة فيليه أو فيش',amz:'ⴼⵉⵍⵉⵜ ⵎⵉⵏⵓ'},price:62,photo:MCDO_FISH,options:[MCD.menuSize(),MCD.menuDrink(),MCD.removals()]},
          {id:'mc5',names:{fr:'Menu Grand Chicken Classic',en:'Grand Chicken Classic Meal',ar:'وجبة غراند تشيكن كلاسيك',amz:'ⴳⵔⴰⵏⴷ ⵛⵉⴽⵏ ⵎⵉⵏⵓ'},price:81,photo:MCDO_CRISPY,options:[MCD.menuSize(),MCD.menuDrink(),MCD.removals()]},
          {id:'mc6',names:{fr:'Menu McNuggets 9 pcs',en:'9 McNuggets Meal',ar:'وجبة ماك نجتس 9 قطع',amz:'ⵏⴳⵜⵙ 9 ⵎⵉⵏⵓ'},price:66,photo:MCDO_NUGGETS,options:[MCD.menuSize(),MCD.menuDrink(),MCD.dipSauce()]},
          {id:'mc7',names:{fr:'Menu Signature Smoky BBQ',en:'Signature Smoky BBQ Meal',ar:'وجبة سيغنيتشر سموكي',amz:'ⵙⵉⴳⵏⵉⵜⵛⵔ ⵎⵉⵏⵓ'},price:99,photo:MCDO_SIGN,options:[MCD.menuDrink(),MCD.removals()]},
        ],
      },
      {
        id:'sandwiches', emoji:'🍔',
        names:{fr:'Sandwiches',en:'Sandwiches',ar:'الساندويشات',amz:'ⵉⵙⵙⴰⵏⴷⵡⵉⵜⵛⵏ'},
        items:[
          {id:'ms1',names:{fr:'Big Mac',en:'Big Mac',ar:'بيج ماك',amz:'ⴱⵉⴳ ⵎⴰⴽ'},price:52,photo:MCDO_BIGMAC,options:[MCD.removals()]},
          {id:'ms2',names:{fr:'McChicken',en:'McChicken',ar:'ماك تشيكن',amz:'ⵎⴽⵜⵛⵉⴽⵏ'},price:50,photo:MCDO_CHICKEN,options:[MCD.removals()]},
          {id:'ms3',names:{fr:'Double Cheeseburger',en:'Double Cheeseburger',ar:'دبل تشيزبرغر',amz:'ⴷⴱⵍ ⵛⵉⵣⴱⵓⵔⴳⵔ'},price:33,photo:MCDO_CHEESE,options:[MCD.removals()]},
          {id:'ms4',names:{fr:'Cheeseburger',en:'Cheeseburger',ar:'تشيزبرغر',amz:'ⵛⵉⵣⴱⵓⵔⴳⵔ'},price:19,photo:MCDO_CHEESE,options:[MCD.removals()]},
          {id:'ms5',names:{fr:'Chicken Burger',en:'Chicken Burger',ar:'برغر دجاج',amz:'ⵛⵉⴽⵏ ⴱⵓⵔⴳⵔ'},price:19,photo:MCDO_CHICKEN,options:[MCD.removals()]},
          {id:'ms6',names:{fr:'Filet-O-Fish',en:'Filet-O-Fish',ar:'فيليه أو فيش',amz:'ⴼⵉⵍⵉⵜ'},price:45,photo:MCDO_FISH,options:[MCD.removals()]},
          {id:'ms7',names:{fr:'Grand Chicken Classic',en:'Grand Chicken Classic',ar:'غراند تشيكن كلاسيك',amz:'ⴳⵔⴰⵏⴷ ⵛⵉⴽⵏ'},price:64,photo:MCDO_CRISPY,options:[MCD.removals()]},
          {id:'ms8',names:{fr:'Grand Chicken Special',en:'Grand Chicken Special',ar:'غراند تشيكن سبيشال',amz:'ⴳⵔⴰⵏⴷ ⵛⵉⴽⵏ ⵙⴱⵉⵛⴰⵍ'},price:69,photo:MCDO_CRISPY,options:[MCD.removals()]},
          {id:'ms9',names:{fr:'Signature Smoky BBQ',en:'Signature Smoky BBQ',ar:'سيغنيتشر سموكي BBQ',amz:'ⵙⵉⴳⵏⵉⵜⵛⵔ ⴱⴱⵇ'},price:82,photo:MCDO_SIGN,options:[MCD.removals()]},
        ],
      },
      {
        id:'nuggets_wings', emoji:'🍗',
        names:{fr:'Nuggets & Wings',en:'Nuggets & Wings',ar:'نجتس والأجنحة',amz:'ⵏⴳⵜⵙ ⴷ ⵉⴱⵓⵔⵎⴰⵏ'},
        items:[
          {id:'mnw1',names:{fr:'McNuggets 6 pcs',en:'6 McNuggets',ar:'ماك نجتس 6 قطع',amz:'ⵏⴳⵜⵙ 6'},price:39,photo:MCDO_NUGGETS,options:[MCD.dipSauce()]},
          {id:'mnw2',names:{fr:'McNuggets 9 pcs',en:'9 McNuggets',ar:'ماك نجتس 9 قطع',amz:'ⵏⴳⵜⵙ 9'},price:49,photo:MCDO_NUGGETS,options:[MCD.dipSauce()]},
          {id:'mnw3',names:{fr:'Chicken Wings 4 pcs',en:'4 Chicken Wings',ar:'أجنحة دجاج 4 قطع',amz:'ⵉⴱⵓⵔⵎⴰⵏ 4'},price:32,photo:MCDO_WINGS,options:[MCD.dipSauce()]},
          {id:'mnw4',names:{fr:'Chicken Wings 6 pcs',en:'6 Chicken Wings',ar:'أجنحة دجاج 6 قطع',amz:'ⵉⴱⵓⵔⵎⴰⵏ 6'},price:44,photo:MCDO_WINGS,options:[MCD.dipSauce()]},
          {id:'mnw5',names:{fr:'Mixed Box Nuggets & Wings',en:'Mixed Nuggets & Wings Box',ar:'صندوق مشكل نجتس وأجنحة',amz:'ⴱⵓⴽⵙ ⵎⵉⴽⵙ'},price:75,photo:MCDO_NUGGETS,options:[MCD.dipSauce()]},
        ],
      },
      {
        id:'happy_meal', emoji:'🎉',
        names:{fr:'Happy Meal',en:'Happy Meal',ar:'هابي ميل',amz:'ⵀⴰⴱⵉ ⵎⵉⵍ'},
        items:[
          {id:'mhm1',names:{fr:'Happy Meal Cheeseburger',en:'Cheeseburger Happy Meal',ar:'هابي ميل تشيزبرغر',amz:'ⵀⴰⴱⵉ ⵎⵉⵍ ⵛⵉⵣ'},price:35,photo:MCDO_HAPPY,options:[MCD.menuDrink(),MCD.happyMealDessert(),MCD.happyMealToy()]},
          {id:'mhm2',names:{fr:'Happy Meal Chicken Burger',en:'Chicken Burger Happy Meal',ar:'هابي ميل برغر دجاج',amz:'ⵀⴰⴱⵉ ⵎⵉⵍ ⵛⵉⴽⵏ'},price:35,photo:MCDO_HAPPY,options:[MCD.menuDrink(),MCD.happyMealDessert(),MCD.happyMealToy()]},
          {id:'mhm3',names:{fr:'Happy Meal McNuggets',en:'McNuggets Happy Meal',ar:'هابي ميل ماك نجتس',amz:'ⵀⴰⴱⵉ ⵎⵉⵍ ⵏⴳⵜⵙ'},price:35,photo:MCDO_NUGGETS,options:[MCD.menuDrink(),MCD.dipSauce(),MCD.happyMealDessert(),MCD.happyMealToy()]},
        ],
      },
      {
        id:'sides', emoji:'🍟',
        names:{fr:'Accompagnements',en:'Sides',ar:'المشتهيات',amz:'ⵉⵙⴳⵓⵎⴰⵏ'},
        items:[
          {id:'msi1',names:{fr:'Frites Small',en:'Small Fries',ar:'بطاطس صغير',amz:'ⴼⵔⵉⵜⵙ ⵙⵎⴰⵍ'},price:18,photo:MCDO_FRIES},
          {id:'msi2',names:{fr:'Frites Medium',en:'Medium Fries',ar:'بطاطس وسط',amz:'ⴼⵔⵉⵜⵙ ⵎⵉⴷⵢⵓⵎ'},price:24,photo:MCDO_FRIES},
          {id:'msi3',names:{fr:'Frites Large',en:'Large Fries',ar:'بطاطس كبير',amz:'ⴼⵔⵉⵜⵙ ⵍⴰⵔⵊ'},price:29,photo:MCDO_FRIES},
          {id:'msi4',names:{fr:'Potato Wedges',en:'Potato Wedges',ar:'قطع البطاطا',amz:'ⴱⵓⵍⵉⵢⵢⴰ'},price:26,photo:MCDO_WEDGES},
        ],
      },
      {
        id:'desserts_mcd', emoji:'🍨',
        names:{fr:'Desserts',en:'Desserts',ar:'الحلويات',amz:'ⵉⵎⴰⴳⴰⵏ'},
        items:[
          {id:'mde1',names:{fr:'McFlurry Oreo',en:'McFlurry Oreo',ar:'ماك فلوري أوريو',amz:'ⵎⴽⴼⵍⵓⵔⵉ ⵓⵔⵉⵢⵓ'},price:32,photo:MCDO_MCFLURRY},
          {id:'mde2',names:{fr:'McFlurry KitKat',en:'McFlurry KitKat',ar:'ماك فلوري كيت كات',amz:'ⵎⴽⴼⵍⵓⵔⵉ ⴽⵉⵜⴽⴰⵜ'},price:32,photo:MCDO_MCFLURRY},
          {id:'mde3',names:{fr:'McFlurry Smarties',en:'McFlurry Smarties',ar:'ماك فلوري سمارتيز',amz:'ⵎⴽⴼⵍⵓⵔⵉ ⵙⵎⴰⵔⵜⵉⵣ'},price:32,photo:MCDO_MCFLURRY},
          {id:'mde4',names:{fr:'Sundae Chocolat',en:'Chocolate Sundae',ar:'سانداي شوكولاتة',amz:'ⵙⴰⵏⴷⴰⵢ ⵛⵓⴽⵓⵍⴰ'},price:22,photo:MCDO_SUNDAE},
          {id:'mde5',names:{fr:'Sundae Caramel',en:'Caramel Sundae',ar:'سانداي كراميل',amz:'ⵙⴰⵏⴷⴰⵢ ⴽⴰⵔⴰⵎⵉⵍ'},price:22,photo:MCDO_SUNDAE},
          {id:'mde6',names:{fr:'Sundae Fraise',en:'Strawberry Sundae',ar:'سانداي فراولة',amz:'ⵙⴰⵏⴷⴰⵢ ⵜⴰⴽⵍⵉⵎⵜ'},price:22,photo:MCDO_SUNDAE},
          {id:'mde7',names:{fr:'Apple Pie',en:'Apple Pie',ar:'فطيرة التفاح',amz:'ⴰⴱⵍⴰ ⴱⵉ'},price:16,photo:MCDO_PIE},
          {id:'mde8',names:{fr:'Milkshake Vanille',en:'Vanilla Milkshake',ar:'ميلكشيك فانيلا',amz:'ⵎⵉⵍⴽⵛⵉⴽ ⴼⴰⵏⵉⵍⴰ'},price:25,photo:MCDO_MILK},
          {id:'mde9',names:{fr:'Milkshake Chocolat',en:'Chocolate Milkshake',ar:'ميلكشيك شوكولا',amz:'ⵎⵉⵍⴽⵛⵉⴽ ⵛⵓⴽⵓⵍⴰ'},price:25,photo:MCDO_MILK},
          {id:'mde10',names:{fr:'Milkshake Fraise',en:'Strawberry Milkshake',ar:'ميلكشيك فراولة',amz:'ⵎⵉⵍⴽⵛⵉⴽ ⵜⴰⴽⵍⵉⵎⵜ'},price:25,photo:MCDO_MILK},
          {id:'mde11',names:{fr:'Cookie',en:'Cookie',ar:'كوكي',amz:'ⴽⵓⴽⵉ'},price:18,photo:MCDO_COOKIE},
        ],
      },
      {
        id:'drinks_mcd', emoji:'🥤',
        names:{fr:'Boissons',en:'Drinks',ar:'المشروبات',amz:'ⴰⵙⵡ'},
        items:[
          {id:'mdr1',names:{fr:'Coca-Cola',en:'Coca-Cola',ar:'كوكا كولا',amz:'ⴽⵓⵍⴰ'},price:17,photo:MCDO_COLA,options:[MCD.drinkSize(),MCD.drinkIce()]},
          {id:'mdr2',names:{fr:'Fanta Orange',en:'Fanta Orange',ar:'فانتا برتقال',amz:'ⴼⴰⵏⵜⴰ'},price:17,photo:MCDO_COLA,options:[MCD.drinkSize(),MCD.drinkIce()]},
          {id:'mdr3',names:{fr:'Sprite',en:'Sprite',ar:'سبرايت',amz:'ⵙⴱⵔⵉⵜ'},price:17,photo:MCDO_COLA,options:[MCD.drinkSize(),MCD.drinkIce()]},
          {id:'mdr4',names:{fr:'Jus d\.Orange',en:'Orange Juice',ar:'عصير برتقال',amz:'ⵜⴰⵎⵓⵖⵓⵏⵜ'},price:22,photo:MCDO_JUICE},
          {id:'mdr5',names:{fr:'Café Espresso',en:'Espresso',ar:'إسبريسو',amz:'ⵇⴰⵀⵡⴰ'},price:15,photo:MCDO_COFFEE},
          {id:'mdr6',names:{fr:'Eau Sidi Ali',en:'Sidi Ali Water',ar:'سيدي علي',amz:'ⴰⵎⴰⵏ ⵙⵉⴷⵉ ⵄⵍⵉ'},price:10,photo:MCDO_WATER},
        ],
      },
    ],
  },
  // ─── OTHER RESTAURANTS ────────────────────────────────────────────────────
  {
    id:'bridge-pizza',
    name:'Bridge Pizza & Tacos',
    tagline:{fr:'Pizzas artisanales & Tacos généreux',en:'Artisan pizzas & generous tacos',ar:'بيتزا حرفية وتاكو كريم',amz:'ⴱⵉⵜⵣⴰ ⵏ ⵓⵣⵣⵓⵔⵉ ⴷ ⵜⴰⴽⵓⵙ'},
    logo:'🍕', cover:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=80',
    cuisine:{fr:'Pizzas · Tacos · Italien',en:'Pizzas · Tacos · Italian',ar:'بيتزا · تاكو · إيطالي',amz:'ⴱⵉⵜⵣⴰ · ⵜⴰⴽⵓⵙ'},
    tags:['pizza','tacos'],
    rating:4.8, deliveryTime:'20–30', minOrder:35,
    categories:[
      { id:'appetizers', emoji:'🥗', names:{fr:'Entrées',en:'Appetizers',ar:'مقبلات',amz:'ⵉⴼⵔⴰⵏ'}, items:[
        {id:'ap1',names:{fr:'Salade Marocaine',en:'Moroccan Salad',ar:'سلطة مغربية',amz:'ⵜⴰⵙⴰⵍⴰⴷⵜ'},price:25,photo:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'},
        {id:'ap2',names:{fr:'Soupe Harira',en:'Harira Soup',ar:'حريرة',amz:'ⵜⴰⵎⵔⵜ ⵏ ⵔⵔⴱⵉⵄ'},price:20,photo:'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80'},
        {id:'ap3',names:{fr:'Frites Maison',en:'Homemade Fries',ar:'بطاطس مقلية',amz:'ⴱⵓⵍⵉⵢⵢⴰ'},price:15,photo:'https://images.unsplash.com/photo-1576107232684-1279f55e14cf?w=400&q=80'},
      ]},
      { id:'pizzas', emoji:'🍕', names:{fr:'Pizzas',en:'Pizzas',ar:'بيتزا',amz:'ⴱⵉⵜⵣⴰ'}, items:[
        {id:'pz1',safi:true,names:{fr:'Pizza Fruits de Mer Safi',en:'Safi Seafood Pizza',ar:'بيتزا فواكه البحر آسفي',amz:'ⴱⵉⵜⵣⴰ ⵙⴰⴼⵉ'},price:65,photo:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',options:[OPT.pizzaSize(),OPT.pizzaSauce(),OPT.pizzaExtras()]},
        {id:'pz2',names:{fr:'Pizza Kefta Marocaine',en:'Moroccan Kefta Pizza',ar:'بيتزا الكفتة المغربية',amz:'ⴱⵉⵜⵣⴰ ⵏ ⴽⴼⵜⴰ'},price:55,photo:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',options:[OPT.pizzaSize(),OPT.pizzaSauce(),OPT.pizzaExtras()]},
        {id:'pz3',names:{fr:'Pizza 4 Fromages',en:'4 Cheese Pizza',ar:'بيتزا 4 أجبان',amz:'ⴱⵉⵜⵣⴰ 4 ⵉⴼⵔⵓⵎⴰⵊⵏ'},price:50,photo:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',options:[OPT.pizzaSize(),OPT.pizzaSauce(),OPT.pizzaExtras()]},
        {id:'pz4',names:{fr:'Pizza Végétarienne',en:'Vegetarian Pizza',ar:'بيتزا خضروات',amz:'ⴱⵉⵜⵣⴰ ⵏ ⵉⴷⴳⴰⵏ'},price:45,photo:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',options:[OPT.pizzaSize(),OPT.pizzaSauce(),OPT.pizzaExtras()]},
      ]},
      { id:'tacos', emoji:'🌮', names:{fr:'Tacos',en:'Tacos',ar:'تاكو',amz:'ⵜⴰⴽⵓⵙ'}, items:[
        {id:'tc1',names:{fr:'Tacos Poulet Fromage',en:'Chicken Cheese Tacos',ar:'تاكو دجاج وجبن',amz:'ⵜⴰⴽⵓⵙ ⵏ ⴰⵢⵢⵓⵣ'},price:40,photo:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',options:[OPT.tacosSauce(),OPT.tacosExtras()]},
        {id:'tc2',names:{fr:'Tacos Viande Hachée',en:'Ground Beef Tacos',ar:'تاكو اللحم المفروم',amz:'ⵜⴰⴽⵓⵙ ⵏ ⴰⴽⵙⵓⵎ'},price:45,photo:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',options:[OPT.tacosSauce(),OPT.tacosExtras()]},
        {id:'tc3',safi:true,names:{fr:'Tacos Crevettes Safi',en:'Safi Shrimp Tacos',ar:'تاكو جمبري آسفي',amz:'ⵜⴰⴽⵓⵙ ⵏ ⵜⵖⵍⵍⴰ ⵙⴰⴼⵉ'},price:55,photo:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',options:[OPT.tacosSauce(),OPT.tacosExtras()]},
        {id:'tc4',names:{fr:'Tacos Végétarien',en:'Vegetarian Tacos',ar:'تاكو خضروات',amz:'ⵜⴰⴽⵓⵙ ⵏ ⵉⴷⴳⴰⵏ'},price:35,photo:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',options:[OPT.tacosSauce(),OPT.tacosExtras()]},
      ]},
      { id:'desserts', emoji:'🍰', names:{fr:'Desserts',en:'Desserts',ar:'حلويات',amz:'ⵉⵎⴰⴳⴰⵏ'}, items:[
        {id:'ds1',names:{fr:'Tiramisu',en:'Tiramisu',ar:'تيراميسو',amz:'ⵜⵉⵔⴰⵎⵉⵙⵓ'},price:30,photo:'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80'},
        {id:'ds2',names:{fr:'Crème Brûlée',en:'Crème Brûlée',ar:'كريم بروليه',amz:'ⴽⵔⵉⵎ ⴱⵔⵓⵍⵉ'},price:28,photo:'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400&q=80'},
      ]},
      { id:'drinks', emoji:'🥤', names:{fr:'Boissons',en:'Drinks',ar:'مشروبات',amz:'ⴰⵙⵡ'}, items:[
        {id:'dr1',names:{fr:'Soda',en:'Soda',ar:'صودا',amz:'ⵙⵓⴷⴰ'},price:10,photo:'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',options:[OPT.drinkFlavor(),OPT.drinkSize()]},
        {id:'dr2',names:{fr:'Jus de Fruits',en:'Fruit Juice',ar:'عصير فواكه',amz:'ⵜⴰⵎⵓⵖⵓⵏⵜ ⵏ ⵉⵎⴷⵔⵉⵙⵏ'},price:15,photo:'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80'},
        {id:'dr3',names:{fr:'Eau Minérale',en:'Water',ar:'ماء معدني',amz:'ⴰⵎⴰⵏ'},price:5,photo:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80'},
      ]},
    ],
  },
  {
    id:'safi-seafood',
    name:'Safi Seafood Palace',
    tagline:{fr:'Les trésors de la mer d\.Atlantique',en:'Atlantic Ocean seafood treasures',ar:'كنوز المحيط الأطلسي',amz:'ⵉⵙⴰⵙ ⵏ ⵡⴰⵟⵍⴰⵙ'},
    logo:'🦞', cover:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=700&q=80',
    cuisine:{fr:'Poissons · Fruits de mer · Marocain',en:'Fish · Seafood · Moroccan',ar:'سمك · بحريات · مغربي',amz:'ⵉⵙⴰⵙ · ⵎⴰⵕⵕⵓⴽⵉ'},
    tags:['seafood'],
    rating:4.9, deliveryTime:'25–35', minOrder:40,
    categories:[
      { id:'appetizers', emoji:'🥗', names:{fr:'Entrées',en:'Appetizers',ar:'مقبلات',amz:'ⵉⴼⵔⴰⵏ'}, items:[
        {id:'sap1',safi:true,names:{fr:'Soupe de Poisson Safi',en:'Safi Fish Soup',ar:'شوربة السمك آسفي',amz:'ⵜⴰⵎⵔⵜ ⵏ ⵉⵙⵍⵎ'},price:35,photo:'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80'},
        {id:'sap2',names:{fr:'Salade de Crevettes',en:'Shrimp Salad',ar:'سلطة جمبري',amz:'ⵜⴰⵙⴰⵍⴰⴷⵜ ⵏ ⵜⵖⵍⵍⴰ'},price:40,photo:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'},
        {id:'sap3',safi:true,names:{fr:'Sardines Froides Safi',en:'Safi Cold Sardines',ar:'سردين بارد آسفي',amz:'ⵙⵔⴷⵉⵏ ⵏ ⵙⴰⴼⵉ'},price:30,photo:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80'},
      ]},
      { id:'seafood', emoji:'🦞', names:{fr:'Fruits de Mer',en:'Seafood',ar:'بحريات آسفي',amz:'ⵉⵙⴰⵙ ⵏ ⵙⴰⴼⵉ'}, items:[
        {id:'sf1',safi:true,names:{fr:'Chraime de Safi',en:'Safi Chraime Fish',ar:'شرايم آسفي',amz:'ⵛⵔⴰⵉⵎ ⵏ ⵙⴰⴼⵉ'},price:55,photo:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80'},
        {id:'sf2',safi:true,names:{fr:'Tajine de Sole',en:'Sole Fish Tajine',ar:'طاجين السمك المفلطح',amz:'ⵟⴰⵊⵉⵏ ⵏ ⵜⴰⵙⵓⵍⵜ'},price:70,photo:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'},
        {id:'sf3',names:{fr:'Brochettes de Crevettes',en:'Shrimp Skewers',ar:'أسياخ الجمبري',amz:'ⴱⵔⵓⵛⵜ ⵏ ⵜⵖⵍⵍⴰ'},price:65,photo:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80'},
        {id:'sf4',safi:true,names:{fr:'Sardines Grillées Safi',en:'Grilled Safi Sardines',ar:'السردين المشوي آسفي',amz:'ⵙⵔⴷⵉⵏ ⵖ ⵜⴼⵓⵏⴰⵙⵜ'},price:40,photo:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80'},
        {id:'sf5',names:{fr:'Calamars Grillés',en:'Grilled Calamari',ar:'حبار مشوي',amz:'ⵜⴰⵍⵓⵜ ⵜⴰⵎⵥⵥⵓⵢⵜ'},price:60,photo:'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80'},
      ]},
      { id:'mains', emoji:'🍽️', names:{fr:'Plats',en:'Main Courses',ar:'أطباق رئيسية',amz:'ⵉⴽⵙⵓⴳⴰⵏ'}, items:[
        {id:'mn1',names:{fr:'Riz aux Fruits de Mer',en:'Seafood Rice',ar:'أرز بحريات',amz:'ⴰⵔⵣ ⵏ ⵉⵙⴰⵙ'},price:55,photo:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'},
        {id:'mn2',safi:true,names:{fr:'Couscous Poisson Safi',en:'Safi Fish Couscous',ar:'كسكس سمك آسفي',amz:'ⴽⵙⴽⵙ ⵏ ⵉⵙⵍⵎ ⵏ ⵙⴰⴼⵉ'},price:65,photo:'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80'},
      ]},
      { id:'desserts', emoji:'🍰', names:{fr:'Desserts',en:'Desserts',ar:'حلويات',amz:'ⵉⵎⴰⴳⴰⵏ'}, items:[
        {id:'sds1',names:{fr:'Pastilla au Lait',en:'Milk Pastilla',ar:'بسطيلة باللبن',amz:'ⴱⵙⵟⵉⵍⴰ'},price:35,photo:'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80'},
        {id:'sds2',names:{fr:'Fruits de Saison',en:'Seasonal Fruits',ar:'فواكه الموسم',amz:'ⵉⵎⴷⵔⵉⵙⵏ'},price:25,photo:'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80'},
      ]},
      { id:'drinks', emoji:'🥤', names:{fr:'Boissons',en:'Drinks',ar:'مشروبات',amz:'ⴰⵙⵡ'}, items:[
        {id:'sdr1',names:{fr:'Thé à la Menthe',en:'Mint Tea',ar:'أتاي بالنعناع',amz:'ⴰⵜⴰⵢ ⵏ ⵜⵉⵔⴼⴰⵙ'},price:10,photo:'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=80'},
        {id:'sdr2',names:{fr:'Jus Maison',en:'House Juice',ar:'عصير منزلي',amz:'ⵜⴰⵎⵓⵖⵓⵏⵜ'},price:20,photo:'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80'},
        {id:'sdr3',names:{fr:'Eau Minérale',en:'Water',ar:'ماء معدني',amz:'ⴰⵎⴰⵏ'},price:5,photo:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80'},
      ]},
    ],
  },
  {
    id:'kebab-express',
    name:'Kebab Express Safi',
    tagline:{fr:'Sandwichs généreux & grillades au feu de bois',en:'Generous sandwiches & wood-fired grills',ar:'ساندويشات سخية ومشاوي',amz:'ⵙⴰⵏⴷⵡⵉⵜⵛ ⴷ ⵉⵣⵎⵎ���ⵡⵏ'},
    logo:'🌯', cover:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=700&q=80',
    cuisine:{fr:'Kebab · Sandwichs · Grillades',en:'Kebab · Sandwiches · Grills',ar:'كباب · ساندويش · مشاوي',amz:'ⴽⴱⴰⴱ · ⵙⴰⵏⴷⵡⵉⵜⵛ'},
    tags:['kebab'],
    rating:4.7, deliveryTime:'15–25', minOrder:30,
    categories:[
      { id:'appetizers', emoji:'🥗', names:{fr:'Entrées',en:'Appetizers',ar:'مقبلات',amz:'ⵉⴼⵔⴰⵏ'}, items:[
        {id:'kap1',names:{fr:'Frites Maison',en:'Homemade Fries',ar:'بطاطس مقلية',amz:'ⴱⵓⵍⵉⵢⵢⴰ'},price:15,photo:'https://images.unsplash.com/photo-1576107232684-1279f55e14cf?w=400&q=80'},
        {id:'kap2',names:{fr:'Soupe Harira',en:'Harira Soup',ar:'حريرة',amz:'ⵜⴰⵎⵔⵜ ⵏ ⵔⵔⴱⵉⵄ'},price:20,photo:'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80'},
        {id:'kap3',names:{fr:'Salade Fraîche',en:'Fresh Salad',ar:'سلطة طازجة',amz:'ⵜⴰⵙⴰⵍⴰⴷⵜ'},price:22,photo:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'},
      ]},
      { id:'kebabs', emoji:'🌯', names:{fr:'Kebabs & Sandwichs',en:'Kebabs & Sandwiches',ar:'كباب وساندويشات',amz:'ⴽⴱⴰⴱ'}, items:[
        {id:'kb1',names:{fr:'Sandwich Kefta Grillé',en:'Grilled Kefta Sandwich',ar:'ساندويش الكفتة المشوية',amz:'ⵙⴰⵏⴷⵡⵉⵜⵛ ⵏ ⴽⴼⵜⴰ'},price:35,photo:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',options:[OPT.kebabBread(),OPT.kebabSauce(),OPT.kebabSalad()]},
        {id:'kb2',names:{fr:'Wrap Poulet Chermoula',en:'Chermoula Chicken Wrap',ar:'راب دجاج بالشرمولة',amz:'ⵡⵔⴰⴱ ⵏ ⴰⵢⵢⵓⵣ ⵛⵔⵎⵓⵍⴰ'},price:40,photo:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',options:[OPT.kebabBread(),OPT.kebabSauce(),OPT.kebabSalad()]},
        {id:'kb3',names:{fr:'Panini Merguez',en:'Merguez Panini',ar:'باني مرقاز',amz:'ⴱⴰⵏⵉⵏⵉ ⵏ ⵎⵔⴳⵣ'},price:35,photo:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',options:[OPT.kebabBread(),OPT.kebabSauce(),OPT.kebabSalad()]},
        {id:'kb4',names:{fr:'Assiette Kebab Mixte',en:'Mixed Kebab Plate',ar:'طبق كباب مشكل',amz:'ⵜⴰⵍⴼⵉⵙⵜ ⵏ ⴽⴱⴰⴱ'},price:75,photo:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',options:[OPT.kebabSauce(),OPT.kebabSalad()]},
        {id:'kb5',names:{fr:'Sandwich Poulet Rôti',en:'Roast Chicken Sandwich',ar:'ساندويش دجاج مشوي',amz:'ⵙⴰⵏⴷⵡⵉⵜⵛ ⵏ ⴰⵢⵢⵓⵣ'},price:38,photo:'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&q=80',options:[OPT.kebabBread(),OPT.kebabSauce(),OPT.kebabSalad()]},
      ]},
      { id:'desserts', emoji:'🍰', names:{fr:'Pâtisseries',en:'Pastries',ar:'حلويات',amz:'ⵉⵎⴰⴳⴰⵏ'}, items:[
        {id:'kds1',names:{fr:'Baklava',en:'Baklava',ar:'بقلاوة',amz:'ⴱⵇⵍⴰⵡⴰ'},price:25,photo:'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80'},
        {id:'kds2',names:{fr:'Cornes de Gazelle',en:'Gazelle Horns',ar:'قرون الغزال',amz:'ⵜⵉⴼⵉⵔⴰⵙ ⵏ ⴰⵖⵢⵓⵍ'},price:20,photo:'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80'},
      ]},
      { id:'drinks', emoji:'🥤', names:{fr:'Boissons',en:'Drinks',ar:'مشروبات',amz:'ⴰⵙⵡ'}, items:[
        {id:'kdr1',names:{fr:'Soda',en:'Soda',ar:'صودا',amz:'ⵙⵓⴷⴰ'},price:10,photo:'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',options:[OPT.drinkFlavor(),OPT.drinkSize()]},
        {id:'kdr2',names:{fr:'Jus Frais',en:'Fresh Juice',ar:'عصير طازج',amz:'ⵜⴰⵎⵓⵖⵓⵏⵜ'},price:15,photo:'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80'},
        {id:'kdr3',names:{fr:'Eau',en:'Water',ar:'ماء',amz:'ⴰⵎⴰⵏ'},price:5,photo:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80'},
      ]},
    ],
  },
  {
    id:'burger-corner',
    name:'Burger Corner Safi',
    tagline:{fr:'Burgers XXL & milkshakes gourmands',en:'XXL burgers & indulgent milkshakes',ar:'برغر XXL وميلكشيك شهي',amz:'ⴱⵓⵔⴳⵔ XXL ⴷ ⵎⵉⵍⴽⵛⵉⴽ'},
    logo:'🍔', cover:'https://images.unsplash.com/photo-1550547660-d9450f859349?w=700&q=80',
    cuisine:{fr:'Burgers · Américain · Fast Food',en:'Burgers · American · Fast Food',ar:'برغر · أمريكي',amz:'ⴱⵓⵔⴳⵔ · ⴰⵎⵉⵔⵉⴽⴰⵏⵉ'},
    tags:['burger','fast-food'],
    rating:4.6, deliveryTime:'20–30', minOrder:35,
    categories:[
      { id:'appetizers', emoji:'🥗', names:{fr:'Entrées',en:'Appetizers',ar:'مقبلات',amz:'ⵉⴼⵔⴰⵏ'}, items:[
        {id:'bap1',names:{fr:'Nuggets de Poulet (6 pcs)',en:'Chicken Nuggets (6 pcs)',ar:'نجتس دجاج (6 قطع)',amz:'ⵏⴳⵜⵙ ⵏ ⴰⵢⵢⵓⵣ'},price:25,photo:'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80'},
        {id:'bap2',names:{fr:'Onion Rings',en:'Onion Rings',ar:'حلقات البصل',amz:'ⵜⵉⴱⵙⵍⵉⵏ'},price:20,photo:'https://images.unsplash.com/photo-1576107232684-1279f55e14cf?w=400&q=80'},
        {id:'bap3',names:{fr:'Frites Maison',en:'Homemade Fries',ar:'بطاطس مقلية',amz:'ⴱⵓⵍⵉⵢⵢⴰ'},price:15,photo:'https://images.unsplash.com/photo-1576107232684-1279f55e14cf?w=400&q=80'},
      ]},
      { id:'burgers', emoji:'🍔', names:{fr:'Burgers',en:'Burgers',ar:'برغر',amz:'ⴱⵓⵔⴳⵔ'}, items:[
        {id:'bg1',names:{fr:'Bridge Spécial',en:'Bridge Special',ar:'برغر بريدج الخاص',amz:'ⴱⵓⵔⴳⵔ ⴱⵔⵉⴷⵊ'},price:55,photo:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',options:[OPT.burgerCooking(),OPT.burgerExtras(),OPT.burgerSauce()]},
        {id:'bg2',names:{fr:'Double Fromage',en:'Double Cheeseburger',ar:'برغر بجبن مزدوج',amz:'ⴱⵓⵔⴳⵔ ⵙⵉⵏ ⵉⴼⵔⵓⵎⴰⵊⵏ'},price:65,photo:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',options:[OPT.burgerCooking(),OPT.burgerExtras(),OPT.burgerSauce()]},
        {id:'bg3',names:{fr:'Chicken Burger Chermoula',en:'Chermoula Chicken Burger',ar:'برغر دجاج شرمولة',amz:'ⴱⵓⵔⴳⵔ ⵏ ⴰⵢⵢⵓⵣ ⵛⵔⵎⵓⵍⴰ'},price:50,photo:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',options:[OPT.burgerCooking(),OPT.burgerExtras(),OPT.burgerSauce()]},
        {id:'bg4',names:{fr:'Burger Kefta Marocain',en:'Moroccan Kefta Burger',ar:'برغر الكفتة المغربية',amz:'ⴱⵓⵔⴳⵔ ⵏ ⴽⴼⵜⴰ'},price:55,photo:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',options:[OPT.burgerCooking(),OPT.burgerExtras(),OPT.burgerSauce()]},
        {id:'bg5',names:{fr:'Végétarien Délice',en:'Veggie Burger',ar:'برغر نباتي',amz:'ⴱⵓⵔⴳⵔ ⵏ ⵉⴷⴳⴰⵏ'},price:45,photo:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',options:[OPT.burgerCooking(),OPT.burgerExtras(),OPT.burgerSauce()]},
      ]},
      { id:'salads', emoji:'🥗', names:{fr:'Salades',en:'Salads',ar:'سلطات',amz:'ⵜⵓⴼⴽⵉⵡⵉⵏ'}, items:[
        {id:'bsl1',names:{fr:'Salade César',en:'Caesar Salad',ar:'سلطة سيزر',amz:'ⵙⵉⵣⴰⵔ'},price:30,photo:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'},
        {id:'bsl2',names:{fr:'Coleslaw Maison',en:'Homemade Coleslaw',ar:'كول سلو منزلي',amz:'ⴽⵓⵍⵙⵍⵓ'},price:20,photo:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80'},
      ]},
      { id:'desserts', emoji:'🍰', names:{fr:'Desserts',en:'Desserts',ar:'حلويات',amz:'ⵉⵎⴰⴳⴰⵏ'}, items:[
        {id:'bds1',names:{fr:'Milkshake (Vanille/Choco/Fraise)',en:'Milkshake (Vanilla/Choco/Strawberry)',ar:'ميلكشيك (فانيلا/شوكولا/فراولة)',amz:'ⵎⵉⵍⴽⵛⵉⴽ'},price:30,photo:'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80'},
        {id:'bds2',names:{fr:'Sundae Glacé',en:'Ice Cream Sundae',ar:'سانديه بوظة',amz:'ⵙⴰⵏⴷⵉ'},price:25,photo:'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80'},
      ]},
      { id:'drinks', emoji:'🥤', names:{fr:'Boissons',en:'Drinks',ar:'مشروبات',amz:'ⴰⵙⵡ'}, items:[
        {id:'bdr1',names:{fr:'Soda',en:'Soda',ar:'صودا',amz:'ⵙⵓⴷⴰ'},price:10,photo:'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',options:[OPT.drinkFlavor(),OPT.drinkSize()]},
        {id:'bdr2',names:{fr:'Jus Pressé',en:'Fresh Juice',ar:'عصير طازج',amz:'ⵜⴰⵎⵓⵖⵓⵏⵜ'},price:15,photo:'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80'},
        {id:'bdr3',names:{fr:'Eau Minérale',en:'Water',ar:'ماء معدني',amz:'ⴰⵎⴰⵏ'},price:5,photo:'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&q=80'},
      ]},
    ],
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fontClass(lang: Lang) {
  if (lang==='amz') return 'font-tifinagh';
  if (lang==='ar')  return 'font-arabic';
  return '';
}
function GoldDivider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{background:'var(--c-border)'}}/>
      <div className="w-3 h-3 rotate-45 flex-shrink-0" style={{background:'#D9C5A0'}}/>
      <div className="flex-1 h-px" style={{background:'var(--c-border)'}}/>
    </div>
  );
}

function AdSlot({className=''}:{className?:string}) {
  return (
    <div className={`px-5 pt-3 pb-2 ${className}`} id="bridge-ad-slot">
      <div className="rounded-2xl flex flex-col items-center justify-center gap-1.5 py-5"
        style={{border:'1.5px dashed #D9C5A0',background:'linear-gradient(135deg,rgba(253,252,249,0.9),rgba(247,243,235,0.7))',minHeight:88}}>
        {/* PUB_CONTENT_START */}
        <span style={{fontSize:22}}>📢</span>
        <p className="text-[9px] font-black tracking-[0.18em] uppercase" style={{color:'#C9BFB2'}}>Espace Publicitaire</p>
        <p className="text-[8px] font-semibold" style={{color:'#D9C5A0'}}>contact@safi-bridge.ma</p>
        {/* PUB_CONTENT_END */}
      </div>
    </div>
  );
}
function Field({label,value,onChange,placeholder,type='text',lang,error,errorMsg,required:req}:{label:string;value:string;onChange:(v:string)=>void;placeholder:string;type?:string;lang:Lang;error?:boolean;errorMsg?:string;required?:boolean}) {
  const fClass=fontClass(lang);
  return (
    <div className="mb-4">
      <label className={`block text-xs font-black mb-1.5 ${fClass}`} style={{color:'#065F46'}}>
        {label}{req&&<span style={{color:'#DC2626',marginLeft:3}}>*</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all ${fClass}`}
        style={{background:error?'#FEF2F2':'var(--c-input)',border:`2px solid ${error?'#FCA5A5':'var(--c-border)'}`,color:'var(--c-text)'}}
        onFocus={e=>{e.currentTarget.style.borderColor='#065F46';}}
        onBlur={e=>{e.currentTarget.style.borderColor=error?'#FCA5A5':'#E5E1D8';}}/>
      {error&&errorMsg&&<p style={{color:'#DC2626',fontSize:10,fontWeight:700,marginTop:4,marginBottom:0}}>⚠ {errorMsg}</p>}
    </div>
  );
}

// ─── ADDRESS AUTOCOMPLETE (Photon / OSM) ──────────────────────────────────────

function AddressAutocomplete({label,value,onChange,placeholder,lang,error,nationwide}:{
  label:string; value:string; onChange:(v:string)=>void;
  placeholder:string; lang:Lang; error?:boolean; nationwide?:boolean;
}) {
  const fClass=fontClass(lang);
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const wrapRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(wrapRef.current&&!wrapRef.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  const fetchSuggestions=(q:string)=>{
    if(q.length<2){setSuggestions([]);setOpen(false);return;}
    if(timerRef.current)clearTimeout(timerRef.current);
    timerRef.current=setTimeout(async()=>{
      setLoading(true);
      try{
        // Nominatim — Maroc complet si nationwide, sinon borné à Safi
        const safiBox=nationwide?'':'&viewbox=-9.35,32.42,-9.10,32.15&bounded=1';
        const query=nationwide?q:q+' Safi';
        const url=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=ma${safiBox}&limit=7&addressdetails=1&accept-language=fr`;
        const res=await fetch(url,{headers:{'Accept-Language':'fr'}});
        const data:any[]=await res.json();
        const items=data.map((f:any)=>{
          const a=f.address||{};
          const city=a.city||a.town||a.village||'';
          const parts=[
            a.road||a.pedestrian||a.footway||'',
            a.house_number||'',
            a.suburb||a.quarter||a.neighbourhood||'',
            city,
          ].filter(Boolean);
          return parts.join(', ') || f.display_name?.split(',').slice(0,3).join(', ');
        }).filter(Boolean);
        const unique=[...new Set(items)] as string[];
        setSuggestions(unique);
        setOpen(unique.length>0);
      }catch{setSuggestions([]);}
      finally{setLoading(false);}
    },380);
  };

  return(
    <div className="mb-4 relative" ref={wrapRef}>
      <label className={`block text-xs font-black mb-1.5 ${fClass}`} style={{color:'#065F46'}}>{label}</label>
      <div className="relative">
        <input type="text" value={value} autoComplete="off"
          onChange={e=>{onChange(e.target.value);fetchSuggestions(e.target.value);}}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all ${fClass}`}
          style={{background:error?'#FEF2F2':'var(--c-input)',border:`2px solid ${error?'#FCA5A5':'var(--c-border)'}`,color:'var(--c-text)',paddingRight:'40px'}}
          onFocus={e=>{e.currentTarget.style.borderColor='#065F46';}}
          onBlur={e=>{e.currentTarget.style.borderColor=error?'#FCA5A5':'var(--c-border)';}}/>
        {loading
          ?<div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 animate-spin" style={{borderColor:'#065F46',borderTopColor:'transparent'}}/>
          :value&&<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
              onClick={()=>{onChange('');setSuggestions([]);setOpen(false);}}>✕</button>
        }
      </div>
      {open&&suggestions.length>0&&(
        <div className="absolute z-[200] w-full mt-1 rounded-xl overflow-hidden"
          style={{background:'var(--c-bg)',border:'1.5px solid var(--c-border)',boxShadow:'0 8px 28px rgba(0,0,0,0.13)'}}>
          {suggestions.map((s,i)=>(
            <button key={i} type="button"
              className={`w-full text-left px-4 py-3 text-xs font-medium transition-colors active:bg-green-50 hover:bg-green-50 ${fClass}`}
              style={{color:'var(--c-text)',borderBottom:i<suggestions.length-1?'1px solid #F3F4F6':'none'}}
              onMouseDown={()=>{onChange(s);setOpen(false);setSuggestions([]);}}>
              <span className="mr-1.5" style={{color:'#065F46'}}>📍</span>{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RESTAURANT CARD (Home) ───────────────────────────────────────────────���───

function RestaurantCard({r,lang,t,onClick,compact=false}:{r:Restaurant;lang:Lang;t:typeof T.fr;onClick:()=>void;compact?:boolean}) {
  const fClass=fontClass(lang);
  const isFeatured = r.id === 'mcdonalds-safi';
  if(compact){
    return(
      <button onClick={onClick}
        className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-95"
        style={{background:'var(--c-bg)',border:`1.5px solid ${isFeatured?'#D9C5A0':'#E5E1D8'}`,boxShadow:'0 4px 14px rgba(0,0,0,0.08)'}}>
        <div className="relative h-28 overflow-hidden">
          <img src={r.cover} alt={r.name} className="w-full h-full object-cover" loading="lazy"/>
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(4,55,38,0.9) 0%,rgba(4,55,38,0.05) 60%,transparent 100%)'}}/>
          <div className="absolute top-2 left-2 w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{background:'rgba(253,252,249,0.95)',backdropFilter:'blur(8px)',boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
            {r.logo}
          </div>
          {isFeatured&&(
            <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{background:'#D9C5A0'}}>
              <span className="text-[9px]">⭐</span>
              <span className="text-[9px] font-black" style={{color:'#065F46'}}>#1</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
            <h3 className={`font-black text-white text-xs leading-tight mb-0.5 ${fClass}`}>{r.name}</h3>
            <p className={`text-white/65 text-[10px] leading-tight line-clamp-1 ${fClass}`}>{r.tagline[lang]}</p>
          </div>
        </div>
        <div className="px-2.5 py-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-[10px] font-black" style={{color:'var(--c-text)'}}>{r.rating}</span>
            <div className="w-0.5 h-0.5 rounded-full mx-0.5" style={{background:'#D9C5A0'}}/>
            <span className="text-[10px]" style={{color:'#6B7280'}}>⏱{r.deliveryTime}{t.delivMin}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full flex-shrink-0" style={{background:'#F0FDF4'}}>
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-[9px] font-black" style={{color:'#065F46'}}>{t.openNow}</span>
          </div>
        </div>
      </button>
    );
  }
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden transition-all active:scale-95 hover:shadow-2xl"
      style={{background:'var(--c-bg)',border:`1.5px solid ${isFeatured?'#D9C5A0':'#E5E1D8'}`,boxShadow:isFeatured?'0 6px 24px rgba(217,197,160,0.35)':'0 4px 16px rgba(0,0,0,0.07)'}}>
      <div className="relative h-44 overflow-hidden">
        <img src={r.cover} alt={r.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" loading="lazy"/>
        <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(4,55,38,0.85) 0%,rgba(4,55,38,0.1) 55%,transparent 100%)'}}/>
        <div className="absolute top-3 left-3 w-12 h-12 rounded-2xl flex items-center justify-center text-3xl"
          style={{background:'rgba(253,252,249,0.95)',backdropFilter:'blur(8px)',boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
          {r.logo}
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {isFeatured&&(
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{background:'#D9C5A0'}}>
              <span className="text-[10px]">⭐</span>
              <span className="text-[10px] font-black" style={{color:'#065F46'}}>Safi #1</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{background:'rgba(253,252,249,0.95)',backdropFilter:'blur(8px)'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
            <span className="text-[10px] font-black" style={{color:'#065F46'}}>{t.openNow}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-black text-white text-base leading-tight mb-0.5">{r.name}</h3>
          <p className={`text-white/70 text-xs ${fClass}`}>{r.tagline[lang]}</p>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-xs font-black" style={{color:'var(--c-text)'}}>{r.rating}</span>
          </div>
          <div className="w-1 h-1 rounded-full" style={{background:'#D9C5A0'}}/>
          <span className="text-xs" style={{color:'#6B7280'}}>⏱ {r.deliveryTime} {t.delivMin}</span>
          <div className="w-1 h-1 rounded-full" style={{background:'#D9C5A0'}}/>
          <span className="text-xs" style={{color:'#6B7280'}}>{t.minOrder} {r.minOrder} MAD</span>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'#F0FDF4'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </button>
  );
}

// ─── ITEM OPTIONS MODAL ───────────────────────────────────────────────────────

function ItemOptionsModal({item,lang,t,onClose,onAdd}:{
  item:MenuItem; lang:Lang; t:typeof T.fr;
  onClose:()=>void; onAdd:(selected:Record<string,string[]>,extra:number)=>void;
}) {
  const fClass=fontClass(lang); const isAR=lang==='ar';
  const [selected,setSelected]=useState<Record<string,string[]>>({});
  const [errors,setErrors]=useState<Set<string>>(new Set());

  const toggle=(groupId:string,choiceId:string,type:'radio'|'checkbox')=>{
    setSelected(prev=>{
      const cur=prev[groupId]||[];
      if(type==='radio') return {...prev,[groupId]:[choiceId]};
      const next=cur.includes(choiceId)?cur.filter(x=>x!==choiceId):[...cur,choiceId];
      return {...prev,[groupId]:next};
    });
    setErrors(e=>{const n=new Set(e);n.delete(groupId);return n;});
  };

  const extraPrice=()=>{
    if(!item.options) return 0;
    return item.options.reduce((sum,g)=>{
      const sel=selected[g.id]||[];
      return sum+g.choices.filter(c=>sel.includes(c.id)).reduce((s,c)=>s+c.price,0);
    },0);
  };

  const handleAdd=()=>{
    const missing=new Set<string>();
    (item.options||[]).forEach(g=>{if(g.required&&(!selected[g.id]||selected[g.id].length===0))missing.add(g.id);});
    if(missing.size>0){setErrors(missing);return;}
    onAdd(selected,extraPrice());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end modal-overlay" style={{background:'rgba(10,30,20,0.65)',backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div className="w-full max-w-md mx-auto rounded-t-3xl modal-sheet" style={{background:'var(--c-bg)',maxHeight:'90vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        {/* Item header */}
        <div className="relative h-44 rounded-t-3xl overflow-hidden flex-shrink-0">
          <img src={item.photo} alt={item.names[lang]} className="w-full h-full object-cover"/>
          <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(4,55,38,0.8) 0%,transparent 55%)'}}/>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{background:'rgba(255,255,255,0.4)'}}/>
          <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center font-black" style={{background:'rgba(253,252,249,0.9)',color:'#6B7280',fontSize:16}}>✕</button>
          {item.safi&&<span className="absolute top-4 left-4 text-[9px] font-black px-2 py-1 rounded-full" style={{background:'#D9C5A0',color:'#065F46'}}>★ Safi</span>}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className={`font-black text-white text-lg leading-tight ${fClass}`}>{item.names[lang]}</p>
            <p className="text-white/80 font-black text-sm">{item.price} MAD</p>
          </div>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{direction:isAR?'rtl':'ltr'}}>
          {(!item.options||item.options.length===0)?(
            <div className="py-4 text-center">
              <p className={`text-sm font-bold ${fClass}`} style={{color:'#9CA3AF'}}>{t.customize}</p>
            </div>
          ):item.options.map(group=>(
            <div key={group.id} className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className={`font-black text-sm ${fClass}`} style={{color:'#065F46'}}>{group.names[lang]}</p>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${fClass}`}
                  style={{background:group.required?'#FEF3C7':'#F0FDF4',color:group.required?'#B45309':'#065F46'}}>
                  {group.required?t.required:t.optional}
                </span>
              </div>
              {errors.has(group.id)&&(
                <p className="text-[10px] font-bold mb-2" style={{color:'#DC2626'}}>⚠ {t.fillAll}</p>
              )}
              <div className="grid gap-2">
                {group.choices.map(choice=>{
                  const sel=(selected[group.id]||[]).includes(choice.id);
                  return (
                    <button key={choice.id} onClick={()=>toggle(group.id,choice.id,group.type)}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                      style={{background:sel?'#F0FDF4':'var(--c-input)',border:`1.5px solid ${errors.has(group.id)?'#FCA5A5':sel?'#065F46':'var(--c-border)'}`}}>
                      <div className={`flex-shrink-0 flex items-center justify-center transition-all ${group.type==='radio'?'w-5 h-5 rounded-full':'w-5 h-5 rounded-md'}`}
                        style={{border:`2px solid ${sel?'#065F46':'#D1D5DB'}`,background:sel?'#065F46':'transparent'}}>
                        {sel&&<div className={`bg-white ${group.type==='radio'?'w-2 h-2 rounded-full':'w-2.5 h-2.5 rounded-sm'} flex items-center justify-center`}>
                          {group.type==='checkbox'&&<svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#065F46" strokeWidth="2.5"><path d="M1 6l4 4 6-8"/></svg>}
                        </div>}
                      </div>
                      <span className={`flex-1 text-sm font-bold ${fClass}`} style={{color:sel?'#065F46':'#1A2F23'}}>{choice.names[lang]}</span>
                      {choice.price>0&&<span className="text-xs font-black flex-shrink-0" style={{color:'#B45309'}}>+{choice.price}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add button */}
        <div className="px-5 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--c-border)'}}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-black ${fClass}`} style={{color:'#6B7280'}}>{t.totalLabel}</span>
            <span className="text-xl font-black" style={{color:'#065F46'}}>{item.price+extraPrice()} MAD</span>
          </div>
          <button onClick={handleAdd}
            className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
            style={{background:'linear-gradient(135deg,#4F46E5,#6366F1)',boxShadow:'0 6px 20px rgba(79,70,229,0.35)'}}>
            {t.addWithOptions} · {item.price+extraPrice()} MAD
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RESTAURANT PAGE ──────────────────────────────────────────────────────────

function RestaurantPage({restaurant,lang,t,onBack,onAddToCart}:{
  restaurant:Restaurant; lang:Lang; t:typeof T.fr;
  onBack:()=>void; onAddToCart:(ci:CartItem)=>void;
}) {
  const [activeCategory,setActiveCategory]=useState(restaurant.categories[0]?.id||'');
  const [optionsItem,setOptionsItem]=useState<MenuItem|null>(null);
  const fClass=fontClass(lang); const isAR=lang==='ar';

  const activeCat=restaurant.categories.find(c=>c.id===activeCategory);

  const handleAddItem=(item:MenuItem,selected:Record<string,string[]>,extra:number)=>{
    const cartItem:CartItem={
      cartId:`${item.id}-${Date.now()}`,
      restaurantId:restaurant.id,
      restaurantName:restaurant.name,
      item, qty:1,
      selectedOptions:selected,
      extraPrice:extra,
      totalPerUnit:item.price+extra,
    };
    onAddToCart(cartItem);
    setOptionsItem(null);
  };

  return (
    <div>
      {/* Restaurant hero */}
      <section className="relative mx-5 mb-5 rounded-3xl overflow-hidden" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.12)'}}>
        <img src={restaurant.cover} alt={restaurant.name} className="w-full h-52 object-cover"/>
        <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(4,55,38,0.9) 0%,rgba(4,55,38,0.2) 55%,transparent 100%)'}}/>
        <button onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-full font-black text-sm transition-all active:scale-90"
          style={{background:'rgba(253,252,249,0.92)',backdropFilter:'blur(8px)',color:'#065F46'}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {t.back}
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{background:'rgba(253,252,249,0.95)',backdropFilter:'blur(8px)'}}>
              {restaurant.logo}
            </div>
            <div>
              <h2 className="font-black text-white text-lg leading-tight">{restaurant.name}</h2>
              <p className={`text-white/70 text-xs ${fClass}`}>{restaurant.cuisine[lang]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3" style={{direction:'ltr'}}>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{background:'rgba(253,252,249,0.15)'}}>
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-white text-xs font-black">{restaurant.rating}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{background:'rgba(253,252,249,0.15)'}}>
              <span className="text-white text-xs">⏱</span>
              <span className="text-white text-xs font-black">{restaurant.deliveryTime} min</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{background:'rgba(253,252,249,0.15)'}}>
              <span className="text-white text-xs font-black">{t.minOrder} {restaurant.minOrder} MAD</span>
            </div>
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div className="flex gap-2 px-5 mb-5 overflow-x-auto hide-scrollbar pb-1" style={{direction:isAR?'rtl':'ltr'}}>
        {restaurant.categories.map(cat=>{const active=activeCategory===cat.id; return(
          <button key={cat.id} onClick={()=>setActiveCategory(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-[11px] transition-all active:scale-95 ${fClass}`}
            style={{background:active?'#065F46':'#FDFCF9',color:active?'#FDFCF9':'#065F46',border:`2px solid ${active?'#065F46':'#D9C5A0'}`,boxShadow:active?'0 4px 14px rgba(6,95,70,0.25)':'none'}}>
            <span>{cat.emoji}</span><span>{cat.names[lang]}</span>
          </button>
        );})}
      </div>

      {/* Items grid */}
      {activeCat&&(
        <div className="px-5 grid grid-cols-2 gap-3 mb-6" style={{direction:isAR?'rtl':'ltr'}}>
          {activeCat.items.map(item=>(
            <button key={item.id} onClick={()=>setOptionsItem(item)}
              className="text-left rounded-2xl overflow-hidden transition-all active:scale-95 hover:shadow-xl"
              style={{background:'var(--c-bg)',border:'1.5px solid var(--c-border)',boxShadow:'0 3px 12px rgba(0,0,0,0.07)'}}>
              <div className="relative h-28 overflow-hidden">
                <img src={item.photo} alt={item.names[lang]} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" loading="lazy"/>
                <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.15) 0%,transparent 60%)'}}/>
                {item.safi&&<span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{background:'#D9C5A0',color:'#065F46'}}>{t.safiExcl}</span>}
                {item.options&&item.options.length>0&&(
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{background:'rgba(79,70,229,0.9)'}}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill="white"/></svg>
                    <span className="text-white text-[8px] font-black">{t.customize}</span>
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className={`text-[11px] font-black leading-tight mb-2 line-clamp-2 ${fClass}`} style={{color:'var(--c-text)'}}>{item.names[lang]}</p>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black" style={{color:'#065F46'}}>{item.price} MAD</span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-base" style={{background:'#4F46E5',flexShrink:0}}>+</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AdSlot />

      {optionsItem&&(
        <ItemOptionsModal item={optionsItem} lang={lang} t={t} onClose={()=>setOptionsItem(null)}
          onAdd={(sel,extra)=>handleAddItem(optionsItem,sel,extra)}/>
      )}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

const CUISINE_FILTERS = [
  {id:'all',    emoji:'⭐', label:{fr:'Tout',       en:'All',      ar:'الكل',    amz:'ⴽⵓⵍⵍ'}},
  {id:'burger', emoji:'🍔', label:{fr:'Burger',     en:'Burger',   ar:'برغر',    amz:'ⴱⵓⵔⴳⵔ'}},
  {id:'pizza',  emoji:'🍕', label:{fr:'Pizza',      en:'Pizza',    ar:'بيتزا',   amz:'ⴱⵉⵜⵣⴰ'}},
  {id:'kebab',  emoji:'🌯', label:{fr:'Kebab',      en:'Kebab',    ar:'كباب',    amz:'ⴽⴱⴰⴱ'}},
  {id:'tacos',  emoji:'🌮', label:{fr:'Tacos',      en:'Tacos',    ar:'تاكو',    amz:'ⵜⴰⴽⵓⵙ'}},
  {id:'seafood',emoji:'🦞', label:{fr:'Mer',        en:'Seafood',  ar:'بحريات',  amz:'ⵉⵙⴰⵙ'}},
  {id:'fast-food',emoji:'🍟',label:{fr:'Fast Food', en:'Fast Food',ar:'فاست فود',amz:'ⴼⴰⵙⵜ'}},
] as const;

type FilterId = typeof CUISINE_FILTERS[number]['id'];

function HomePage({lang,t,onSelectRestaurant}:{lang:Lang;t:typeof T.fr;onSelectRestaurant:(r:Restaurant)=>void}) {
  const fClass=fontClass(lang);
  const [activeFilter,setActiveFilter]=useState<FilterId>('all');

  const filtered = activeFilter==='all'
    ? RESTAURANTS
    : RESTAURANTS.filter(r=>r.tags.includes(activeFilter));

  return (
    <div>
      {/* Hero banner */}
      <section className="relative mx-5 mb-5 rounded-3xl overflow-hidden" style={{boxShadow:'0 8px 32px rgba(6,95,70,0.18)'}}>
        <img src="/cover-eats.jpeg" alt="Bridge Safi" className="w-full h-52 object-cover" style={{objectPosition:'center 30%'}}/>
        <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(4,55,38,0.92) 0%,rgba(4,55,38,0.25) 60%,transparent 100%)'}}/>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full inline-block mb-2" style={{background:'#D9C5A0',color:'#065F46'}}>SAFI · آسفي · ⵙⴰⴼⵉ</span>
          <h2 className={`text-xl font-black text-white leading-tight mb-1 ${fClass}`}>{t.restaurantsTitle}</h2>
          <p className="text-white/75 text-xs">{t.heroSub}</p>
        </div>
      </section>

      {/* Category filter chips */}
      <div className="mb-4" style={{overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        <div className="flex gap-2 px-4" style={{width:'max-content'}}>
          {CUISINE_FILTERS.map(f=>{
            const isActive=activeFilter===f.id;
            return (
              <button
                key={f.id}
                onClick={()=>setActiveFilter(f.id as FilterId)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 select-none ${fClass}`}
                style={isActive
                  ? {background:'#065F46',color:'#FDFCF9',boxShadow:'0 4px 14px rgba(6,95,70,0.35)',transform:'scale(1.06)'}
                  : {background:'#F0EDE6',color:'#374151',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}
                }
              >
                <span style={{fontSize:'15px',lineHeight:1}}>{f.emoji}</span>
                <span>{f.label[lang]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Near you label */}
      <div className="px-5 mb-3 flex items-center gap-2">
        <span className="text-base">📍</span>
        <p className={`text-[11px] font-black uppercase tracking-widest ${fClass}`} style={{color:'#065F46'}}>{t.nearYou}</p>
        {activeFilter!=='all' && (
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:'#D9C5A0',color:'#065F46'}}>
            {filtered.length} resto{filtered.length>1?'s':''}
          </span>
        )}
      </div>

      {/* Restaurant cards — 2-column grid, featured full-width */}
      {filtered.length===0
        ? (
          <div className="mx-5 py-10 flex flex-col items-center gap-3 rounded-2xl" style={{background:'#F0EDE6'}}>
            <span style={{fontSize:'40px'}}>🍽️</span>
            <p className={`text-sm font-semibold text-center ${fClass}`} style={{color:'#374151'}}>
              {lang==='fr'?'Aucun restaurant dans cette catégorie'
               :lang==='en'?'No restaurants in this category'
               :lang==='ar'?'لا يوجد مطعم في هذه الفئة'
               :'ⵓⵔ ⵍⵍⵉ ⵉⵎⵟⵟⴰⵡⵏ'}
            </p>
          </div>
        )
        : (
          <div className="tv-grid px-4 grid grid-cols-2 gap-3 mb-6">
            {filtered.map(r=>{
              const isFeatured=r.id==='mcdonalds-safi' && activeFilter==='all';
              return(
                <div key={r.id} className={isFeatured?'col-span-2':''}>
                  <RestaurantCard r={r} lang={lang} t={t} onClick={()=>onSelectRestaurant(r)} compact={!isFeatured}/>
                </div>
              );
            })}
          </div>
        )
      }
      <AdSlot />
    </div>
  );
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────

function ProfileModal({lang,profile,onSave,onClose}:{lang:Lang;profile:UserProfile;onSave:(p:UserProfile)=>void;onClose:()=>void}) {
  const t=T[lang]; const fClass=fontClass(lang); const isAR=lang==='ar';
  const getAuthHeaders=useAuthHeaders();
  const [form,setForm]=useState<UserProfile>({...profile});
  const [saved,setSaved]=useState(false);
  const avatarInputRef=useRef<HTMLInputElement>(null);
  const handleAvatarChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      if(typeof ev.target?.result!=='string') return;
      const img=new Image();
      img.onload=()=>{
        const MAX=220;
        const scale=Math.min(1, MAX/Math.max(img.width,img.height));
        const w=Math.round(img.width*scale);
        const h=Math.round(img.height*scale);
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d')!.drawImage(img,0,0,w,h);
        const compressed=canvas.toDataURL('image/jpeg',0.72);
        setForm(f=>({...f,avatar:compressed}));
        // Save immediately to the dedicated avatar key so it persists without saving the whole form
        if(user?.id) { try { localStorage.setItem(avatarKey(user.id), compressed); } catch {} }
      };
      img.src=ev.target.result as string;
    };
    reader.readAsDataURL(file);
  };
  const { signOut } = useClerk();
  const [, navigate] = useLocation();
  const { user } = useUser();
  const [errs,setErrs]=useState<Record<string,boolean>>({});
  const [phoneTaken,setPhoneTaken]=useState(false);
  const [payTab,setPayTab]=useState<'card'|'paypal'>(profile.paymentMethod==='paypal'?'paypal':'card');

  // Game ID basé sur le téléphone + première lettre du prénom
  const gameId = getBridgeId(form.phone, form.name);

  // Diamond points from server (anti-cheat)
  const [gamePoints, setGamePoints] = useState(0);
  const [gameTotalEarned, setGameTotalEarned] = useState(0);
  useEffect(() => {
    if (!user?.id) return;
    getAuthHeaders().then(h=>fetch('/api/game/diamonds', { credentials: 'include', headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && typeof d.diamonds === 'number') setGamePoints(d.diamonds);
        if (d && typeof d.totalEarned === 'number') setGameTotalEarned(d.totalEarned);
      })
      .catch(() => {}));
  }, [user?.id, getAuthHeaders]);

  // ── Validation helpers ──────────────────────────────────────────────────────
  const validateName=(v:string)=>v.trim().length>=3&&/\s/.test(v.trim());
  const validatePhone=(v:string)=>{const d=v.replace(/\D/g,'');return (d.length===9&&/^[67]/.test(d))||(d.length===10&&/^0[67]/.test(d))||(d.length===12&&/^212[67]/.test(d));};
  const validateCard=(v:string)=>isRealCard(v);
  const validatePaypal=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const validateExpiry=(v:string)=>{
    const m=v.match(/^(\.{2})\.(\.{2})$/);
    if(!m) return false;
    const mo=parseInt(m[1],10),yr=parseInt(m[2],10)+2000;
    const now=new Date(); const ny=now.getFullYear(),nm=now.getMonth()+1;
    return mo>=1&&mo<=12&&(yr>ny||(yr===ny&&mo>=nm));
  };
  const validateCardName=(v:string)=>v.trim().length>=2;

  // ── Change-password state ────────────────────────────────────────────────────
  const [pwdOpen,setPwdOpen]=useState(false);
  const [currentPwd,setCurrentPwd]=useState('');
  const [newPwd,setNewPwd]=useState('');
  const [confirmPwd,setConfirmPwd]=useState('');
  const [pwdLoading,setPwdLoading]=useState(false);
  const [pwdErr,setPwdErr]=useState('');
  const [pwdOk,setPwdOk]=useState(false);

  const handleChangePwd=async()=>{
    if(pwdLoading) return;
    if(newPwd.length<8){setPwdErr(t.pwdWeak);return;}
    if(newPwd!==confirmPwd){setPwdErr(t.pwdMismatch);return;}
    setPwdLoading(true);setPwdErr('');
    try{
      await user!.updatePassword({currentPassword:currentPwd,newPassword:newPwd,signOutOfOtherSessions:false});
      setPwdOk(true);setCurrentPwd('');setNewPwd('');setConfirmPwd('');
      setTimeout(()=>{setPwdOk(false);setPwdOpen(false);},2500);
    }catch(err:any){
      const msg=err?.errors?.[0]?.longMessage||err?.errors?.[0]?.message||'';
      if(msg.toLowerCase().includes('incorrect')||msg.toLowerCase().includes('current')) setPwdErr(t.pwdWrong);
      else if(msg.toLowerCase().includes('password')) setPwdErr(t.pwdWeak);
      else setPwdErr(msg||t.pwdWrong);
    }
    setPwdLoading(false);
  };

  const handleSave=async()=>{
    const e:Record<string,boolean>={};
    setPhoneTaken(false);
    if(!validateName(form.name))       e.name=true;
    if(!validatePhone(form.phone))     e.phone=true;
    // Payment fields are optional — only validate if user has started filling them in
    if(payTab==='card' && form.cardNumber.replace(/\D/g,'').length>0){
      if(!validateCard(form.cardNumber)) e.card=true;
      if(form.cardExpiry && !validateExpiry(form.cardExpiry)) e.expiry=true;
      if(form.cardName && !validateCardName(form.cardName)) e.cardName=true;
    } else if(payTab==='paypal' && (form.paypalEmail||'').trim().length>0){
      if(!validatePaypal(form.paypalEmail||'')) e.paypal=true;
    }
    setErrs(e);
    if(Object.keys(e).length>0) return;
    try{
      const _ah=await getAuthHeaders();
      const r=await fetch('/api/profile/sync',{
        method:'POST',credentials:'include',
        headers:{..._ah,'Content-Type':'application/json'},
        body:JSON.stringify({phone:form.phone.trim(),name:form.name.trim(),address:(form.address||'').trim()}),
      });
      if(!r.ok){const d=await r.json().catch(()=>({error:''}));if(d.error==='phone_taken'){setPhoneTaken(true);setErrs({...e,phone:true});return;}}
    }catch{ /* server indisponible — sauvegarde locale uniquement */ }

    // Also save avatar to server so the game can fetch it via a stable HTTPS URL
    if(form.avatar && user) {
      (async()=>{
        try{
          const _ah2=await getAuthHeaders();
          await fetch('/api/profile/sync',{
            method:'POST',credentials:'include',
            headers:{..._ah2,'Content-Type':'application/json'},
            body:JSON.stringify({
              phone:form.phone.trim(),name:form.name.trim(),
              address:(form.address||'').trim(),avatar:form.avatar
            }),
          });
        }catch{ /* best-effort — local avatar still works */ }
        // Also upload to Clerk profile so user.imageUrl reflects the new photo
        try{
          if(form.avatar && form.avatar.startsWith('data:')){
            const blob=await fetch(form.avatar).then(r=>r.blob());
            const file=new File([blob],'profile.jpg',{type:'image/jpeg'});
            await user.setProfileImage({file});
          }
        }catch{ /* best-effort */ }
      })();
    }

    onSave({...form, paymentMethod:payTab});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };
  const handleSignOut=async()=>{
    try {
      localStorage.removeItem('bridge_was_signed_in');
      localStorage.removeItem(PROFILE_KEY_LEGACY);
      // Ne pas effacer le profil personnel (bridge_eats_profile_userId) — il reste pour la prochaine connexion du même utilisateur
    } catch {}
    await signOut();
    navigate('/sign-in');
    onClose();
  };
  const set=(k:keyof UserProfile)=>(v:string)=>setForm(f=>({...f,[k]:v}));
  const fmtCard=(v:string)=>v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtExp=(v:string)=>{const d=v.replace(/\D/g,'').slice(0,4);return d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d;};

  return (
    <div className="fixed inset-0 z-50 modal-overlay" style={{background:'rgba(10,30,20,0.55)',backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm h-full overflow-y-auto"
        style={{background:'var(--c-bg)',boxShadow:'-8px 0 40px rgba(0,0,0,0.15)',animation:'slideInRight 0.28s cubic-bezier(0.34,1,0.64,1)'}} onClick={e=>e.stopPropagation()}>
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{background:'var(--c-nav)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--c-border)'}}>
          {/* Left: avatar + profile title */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-shrink-0" onClick={()=>avatarInputRef.current?.click()} style={{cursor:'pointer'}}>
              <div style={{width:46,height:46,borderRadius:'50%',overflow:'hidden',border:'2.5px solid #D9C5A0',boxShadow:'0 2px 10px rgba(6,95,70,0.18)',background:'#F0EBE1',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {form.avatar
                  ?<img src={form.avatar} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<span style={{fontSize:22}}>👤</span>
                }
              </div>
              <div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#065F46,#059669)',border:'1.5px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>📷</div>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{display:'none'}}/>
            </div>
            <div className="min-w-0">
              <p className={`font-black text-sm leading-tight ${fClass}`} style={{color:'#065F46'}}>{t.profileTitle}</p>
              <p className={`text-[10px] mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{t.profileSub}</p>
            </div>
          </div>
          {/* Center: shark mascot + game ID + points — tap to open game */}
          <button
            onClick={()=>{ onClose(); navigate('/game'); }}
            className="flex flex-col items-center gap-0.5 flex-shrink-0 active:scale-95 transition-transform"
            style={{background:'none',border:'none',cursor:'pointer',padding:'2px 4px',borderRadius:12}}>
            <div className="relative">
              <div style={{width:46,height:46,borderRadius:'50%',overflow:'hidden',border:'2.5px solid #065F46',boxShadow:'0 2px 12px rgba(6,95,70,0.4)',background:'#F0EBE1',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {(form.avatar||user?.imageUrl)
                  ?<img src={form.avatar||user!.imageUrl} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  :<span style={{fontSize:22}}>👤</span>
                }
              </div>
              <span style={{position:'absolute',bottom:-3,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(90deg,#065F46,#047857)',color:'#fff',fontSize:7,fontWeight:900,padding:'1px 6px',borderRadius:8,whiteSpace:'nowrap',letterSpacing:0.5,boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}>
                {t.gameTitle}
              </span>
            </div>
            <span style={{fontSize:9,fontWeight:900,color:'#065F46',letterSpacing:0.5,marginTop:5}}>{gameId}</span>
            <div style={{display:'flex',alignItems:'center',gap:3,background:'#FEF9C3',border:'1px solid #FDE047',borderRadius:8,padding:'2px 7px'}}>
              <span style={{fontSize:12}}>💎</span>
              <span style={{fontSize:9,fontWeight:900,color:'#92400E'}}>{gamePoints} {t.gamePts}</span>
            </div>
          </button>
          {/* Right: close button */}
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0" style={{background:'#F3F4F6',color:'#6B7280',fontSize:14}}>✕</button>
        </div>
        <div className="px-5 py-5" style={{direction:isAR?'rtl':'ltr'}}>

          <div className="rounded-2xl p-4 mb-5" style={{background:errs.name||errs.phone?'#FFF5F5':'#F0FDF4',border:`1px solid ${errs.name||errs.phone?'#FCA5A5':'#BBF7D0'}`,transition:'all 0.2s'}}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${fClass}`} style={{color:'#065F46'}}>👤 {t.nameLabel}</p>
            <Field label={t.nameLabel} value={form.name} onChange={v=>{set('name')(v);if(errs.name&&validateName(v))setErrs(e=>({...e,name:false}));}} placeholder={t.namePh} lang={lang} required error={errs.name} errorMsg={t.errName}/>
            <Field label={t.addrLabel} value={form.address} onChange={set('address')} placeholder={t.addrPh} lang={lang}/>
            <Field label={t.phoneLabel} value={form.phone} onChange={v=>{set('phone')(v);if(errs.phone&&validatePhone(v)){setErrs(e=>({...e,phone:false}));setPhoneTaken(false);}}} placeholder={t.phonePh} type="tel" lang={lang} required error={errs.phone} errorMsg={phoneTaken?(lang==='ar'?'هذا الرقم مستخدم بحساب آخر':lang==='en'?'Number already linked to another account':'Numéro déjà utilisé par un autre compte'):t.errPhone}/>
            <Field label={t.emailLabel} value={form.email||''} onChange={set('email')} placeholder={t.emailPh} type="email" lang={lang}/>
          </div>
          {/* ── Payment section (optional) ───────────────────────── */}
          <div className="rounded-2xl p-4 mb-5" style={{
            background: payTab==='paypal'
              ? (errs.paypal?'#FFF5F5':'#EFF6FF')
              : (errs.card||errs.expiry||errs.cardName?'#F5F3FF':'#EEF2FF'),
            border:`1px solid ${payTab==='paypal'
              ? (errs.paypal?'#FCA5A5':'#BFDBFE')
              : (errs.card||errs.expiry||errs.cardName?'#C4B5FD':'#C7D2FE')}`,
            transition:'all 0.2s'}}>
            {/* Optional badge */}
            <div className="flex items-center justify-between mb-3">
              <p className={`text-[10px] font-black uppercase tracking-widest ${fClass}`} style={{color:'#4F46E5'}}>💳 {t.payModeTitle}</p>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${fClass}`} style={{background:'#F0FDF4',color:'#065F46',border:'1px solid #BBF7D0'}}>
                {lang==='ar'?'اختياري':lang==='en'?'Optional':lang==='amz'?'ⵉⵅⵜⵉⵢⴰⵔⵉ':'Facultatif'}
              </span>
            </div>
            <p className={`text-[10px] mb-3 ${fClass}`} style={{color:'#9CA3AF'}}>
              {lang==='ar'?'يمكنك الدفع نقداً عند التسليم بدون بطاقة':lang==='en'?'You can always pay cash on delivery — no card needed':lang==='amz'?'Tzemreḍ ad tsessefleḍ s udrimen':'Tu peux toujours payer en espèces à la livraison — aucune carte requise'}
            </p>
            {/* Tab switcher */}
            <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{background:'rgba(0,0,0,0.05)'}}>
              {(['card','paypal'] as const).map(tab=>(
                <button key={tab} onClick={()=>{setPayTab(tab);setErrs({});}}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${fClass}`}
                  style={{
                    background: payTab===tab?'white':'transparent',
                    color: payTab===tab?(tab==='paypal'?'#003087':'#4F46E5'):'#9CA3AF',
                    boxShadow: payTab===tab?'0 2px 8px rgba(0,0,0,0.1)':'none',
                    border:'none',cursor:'pointer',
                  }}>
                  {tab==='card'?t.paymentTabCard:t.paymentTabPaypal}
                </button>
              ))}
            </div>

            {payTab==='card'&&(<>
              {/* Visual card preview */}
              {(()=>{const ct=detectCard(form.cardNumber); const digits=form.cardNumber.replace(/\D/g,''); const valid=digits.length===16&&ct!=='unknown'; return valid?(
                <div className="rounded-2xl p-4 mb-4 relative overflow-hidden" style={{
                  background: ct==='visa'
                    ? 'linear-gradient(135deg,#1A1A6E,#003087,#1A478A)'
                    : 'linear-gradient(135deg,#EB001B,#FF5F00,#F79E1B)',
                  minHeight:108}}>
                  <div className="absolute inset-0 opacity-10" style={{backgroundImage:'repeating-linear-gradient(45deg,white 0,white 1px,transparent 0,transparent 50%)',backgroundSize:'8px 8px'}}/>
                  {/* Top row: brand + logo */}
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-white/70 text-[10px] font-bold tracking-widest">💳 BRIDGE</p>
                    {ct==='visa'?<VisaLogo/>:<MastercardLogo/>}
                  </div>
                  <p className="text-white font-black text-base tracking-widest mb-3">{fmtCard(form.cardNumber)}</p>
                  <div className="flex justify-between items-end">
                    <div><p className="text-white/50 text-[9px] font-bold">NAME</p><p className="text-white text-[11px] font-bold">{form.cardName||'—'}</p></div>
                    <div className="text-right"><p className="text-white/50 text-[9px] font-bold">EXPIRES</p><p className="text-white text-[11px] font-bold">{form.cardExpiry||'—'}</p></div>
                  </div>
                </div>
              ):null;})()}
              {/* Accepted cards hint */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold" style={{color:'#6B7280'}}>Accepté :</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black" style={{background:'#003087',color:'white'}}>VISA</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black" style={{background:'linear-gradient(90deg,#EB001B,#F79E1B)',color:'white'}}>MC</span>
              </div>
              <Field label={t.cardNumberLabel} value={fmtCard(form.cardNumber)}
                onChange={v=>{const raw=v.replace(/\s/g,'').slice(0,16);set('cardNumber')(raw);if(errs.card&&validateCard(raw))setErrs(e=>({...e,card:false}));}}
                placeholder={t.cardNumberPh} type="tel" lang={lang} required
                error={errs.card}
                errorMsg={form.cardNumber.replace(/\D/g,'').length===16&&!isValidCardType(form.cardNumber)?t.errCardType:t.errCard}/>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.cardExpiryLabel} value={form.cardExpiry}
                  onChange={v=>{const f=fmtExp(v);set('cardExpiry')(f);if(errs.expiry&&validateExpiry(f))setErrs(e=>({...e,expiry:false}));}}
                  placeholder={t.cardExpiryPh} type="tel" lang={lang} required error={errs.expiry} errorMsg={t.errExpiry}/>
                <Field label={t.cardCVVLabel} value={form.cardNumber?'•••':''} onChange={()=>{}} placeholder={t.cardCVVPh} type="password" lang={lang}/>
              </div>
              <Field label={t.cardNameLabel} value={form.cardName}
                onChange={v=>{set('cardName')(v.toUpperCase());if(errs.cardName&&validateCardName(v))setErrs(e=>({...e,cardName:false}));}}
                placeholder={t.cardNamePh} lang={lang} required error={errs.cardName} errorMsg={t.errCardName}/>
            </>)}

            {payTab==='paypal'&&(<>
              {/* PayPal saved indicator */}
              {form.paypalEmail&&validatePaypal(form.paypalEmail)&&(
                <div className="flex items-center gap-3 rounded-xl p-3 mb-4" style={{background:'#003087',color:'white'}}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                    <path d="M20.067 8.478c.492.315.844.825.983 1.39.49 2.003-.993 3.895-3.25 4.385-.21.045-.425.067-.64.067H15.26l-.472 3H12l1.98-12H17.8c1.337 0 2.012.635 2.267 1.158z" fill="#009CDE"/>
                    <path d="M8.5 7H12.8c1.337 0 2.013.635 2.267 1.158.492.315.844.825.983 1.39.49 2.003-.993 3.895-3.25 4.385-.21.045-.425.067-.64.067H10.26l-.472 3H7L9 5h-.5z" fill="#012169"/>
                    <path d="M4 10H8.3c1.337 0 2.012.635 2.267 1.158.492.315.844.825.983 1.39.49 2.003-.993 3.895-3.25 4.385-.21.045-.425.067-.64.067H5.76l-.472 3H2.5L4.5 8H4z" fill="#003087"/>
                  </svg>
                  <div>
                    <p style={{fontSize:9,opacity:0.7,fontWeight:700,letterSpacing:'0.08em'}}>PAYPAL</p>
                    <p style={{fontSize:13,fontWeight:900}}>{form.paypalEmail}</p>
                  </div>
                </div>
              )}
              <Field label={t.paypalEmailLabel} value={form.paypalEmail||''} type="email"
                onChange={v=>{set('paypalEmail')(v);if(errs.paypal&&validatePaypal(v))setErrs(e=>({...e,paypal:false}));}}
                placeholder={t.paypalPh} lang={lang} required error={errs.paypal} errorMsg={t.errPaypal}/>
              <p style={{fontSize:10,color:'#6B7280',margin:'-4px 0 4px',fontWeight:600}}>
                🔒 PayPal · Paiement sécurisé · Aucune carte requise
              </p>
            </>)}
          </div>
          {/* ── Bridge Game Stats ───────────────────────────────── */}
          <div className="rounded-2xl p-4 mb-5" style={{background:'linear-gradient(135deg,#052e16,#064e3b)',border:'1.5px solid #065F46',boxShadow:'0 4px 20px rgba(6,95,70,0.25)'}}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-[10px] font-black uppercase tracking-widest ${fClass}`} style={{color:'#4ADE80'}}>🦈 Bridge Game</p>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${fClass}`} style={{background:'rgba(74,222,128,0.15)',color:'#4ADE80',border:'1px solid rgba(74,222,128,0.3)'}}>{gameId}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
                <p className={`text-[9px] font-bold uppercase tracking-wide mb-1 ${fClass}`} style={{color:'rgba(255,255,255,0.5)'}}>
                  {lang==='ar'?'الرصيد الحالي':lang==='en'?'Current balance':lang==='amz'?'ⵜⵉⵏⵓⴹⵉⵡⵉⵏ':'Solde actuel'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span style={{fontSize:18}}>💎</span>
                  <span className={`text-lg font-black ${fClass}`} style={{color:'#FCD34D'}}>{gamePoints.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
                <p className={`text-[9px] font-bold uppercase tracking-wide mb-1 ${fClass}`} style={{color:'rgba(255,255,255,0.5)'}}>
                  {lang==='ar'?'المجموع الكلي':lang==='en'?'Total earned':lang==='amz'?'ⴰⵎⵎⴰⵙ':'Total cumulé'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span style={{fontSize:18}}>💎</span>
                  <span className={`text-lg font-black ${fClass}`} style={{color:'#4ADE80'}}>{gameTotalEarned.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <button onClick={()=>{ onClose(); navigate('/game'); }}
              className={`w-full mt-3 py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 ${fClass}`}
              style={{background:'linear-gradient(135deg,#4ADE80,#059669)',color:'#052e16',border:'none',cursor:'pointer',boxShadow:'0 4px 12px rgba(74,222,128,0.3)'}}>
              🎮 {lang==='ar'?'العب الآن':lang==='en'?'Play now':lang==='amz'?'ⴰⴳⵏ ⴷⴷⴰⵡ':'Jouer maintenant'}
            </button>
          </div>

          {/* ── Change password accordion ───────────────────────── */}
          <div className="rounded-2xl mb-5 overflow-hidden" style={{border:'1px solid var(--c-border)'}}>
            <button onClick={()=>{setPwdOpen(o=>!o);setPwdErr('');}}
              className={`w-full flex items-center justify-between px-4 py-3.5 ${fClass}`}
              style={{background:'var(--c-input)',border:'none',cursor:'pointer'}}>
              <span className="font-black text-sm" style={{color:'var(--c-text)'}}>{t.changePwd}</span>
              <span style={{color:'#9CA3AF',fontSize:18,transform:pwdOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>⌄</span>
            </button>
            {pwdOpen&&(
              <div className="px-4 pb-4 pt-1" style={{background:'var(--c-input)',borderTop:'1px solid var(--c-border)'}}>
                <Field label={t.currentPwd} value={currentPwd} onChange={setCurrentPwd} placeholder="••••••••" type="password" lang={lang}/>
                <Field label={t.newPwd} value={newPwd} onChange={setNewPwd} placeholder="••••••••" type="password" lang={lang}/>
                <Field label={t.confirmPwd} value={confirmPwd} onChange={setConfirmPwd} placeholder="••••••••" type="password" lang={lang}/>
                {pwdErr&&<p className="text-xs font-semibold mb-3 px-1" style={{color:'#B91C1C'}}>{pwdErr}</p>}
                <button onClick={handleChangePwd}
                  className={`w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
                  style={{background:pwdOk?'#059669':'#065F46',opacity:pwdLoading?0.7:1}}>
                  {pwdOk?t.pwdChanged:pwdLoading?'...' : t.pwdSave}
                </button>
              </div>
            )}
          </div>

          <button onClick={handleSave}
            className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
            style={{background:saved?'#059669':'linear-gradient(135deg,#065F46,#047857)',boxShadow:'0 6px 20px rgba(6,95,70,0.3)'}}>
            {saved?t.profileSaved:t.profileSave}
          </button>
          <button onClick={handleSignOut}
            className={`w-full py-3.5 mt-3 rounded-2xl font-black text-sm transition-all active:scale-95 ${fClass}`}
            style={{background:'#FEF2F2',color:'#DC2626',border:'1.5px solid #FECACA'}}>
            {t.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QR PAY MODAL ─────────────────────────────────────────────────────────────

function QRPayModal({lang,amount,onConfirm,onClose}:{lang:Lang;amount?:number;onConfirm:()=>void;onClose:()=>void;}){
  const isAR=lang==='ar';
  const fClass=lang==='amz'?'font-tifinagh':'';
  const t=T[lang];
  const qrSrc=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(BRIDGE_QR_PAY_URL)}&color=065F46&bgcolor=FDFCF9&margin=12&qzone=2`;
  return(
    <div className="fixed inset-0 z-[200] flex items-end justify-center" style={{background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)'}}>
      <div className="w-full max-w-sm rounded-t-3xl pb-safe" style={{background:'var(--c-bg)',boxShadow:'0 -8px 40px rgba(0,0,0,0.35)'}}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{background:'var(--c-border)'}}/></div>
        <div className={`px-6 pt-2 pb-6 ${isAR?'text-right':''}`} style={{direction:isAR?'rtl':'ltr'}}>
          <p className={`font-black text-xl mb-1 ${fClass}`} style={{color:'var(--c-text)'}}>{t.qrModalTitle}</p>
          <p className={`text-sm mb-5 ${fClass}`} style={{color:'#6B7280'}}>{t.qrModalSub}</p>
          {/* QR CODE */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl" style={{background:'#FDFCF9',boxShadow:'0 4px 24px rgba(0,0,0,0.12)',border:'2.5px solid #065F46'}}>
              <img src={qrSrc} alt="QR Code paiement Bridge Safi" width={200} height={200} style={{display:'block',borderRadius:8}}
                onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>
              {/* Fallback si QR ne charge pas */}
              <div className="flex items-center justify-center" style={{width:200,height:200,display:'none'}}>
                <div style={{fontSize:64}}>📱</div>
              </div>
            </div>
            {/* Badge montant */}
            {amount!=null&&amount>0&&(
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{background:'#065F46'}}>
                <span className={`font-black text-white text-base ${fClass}`}>{t.qrAmountLabel} : {amount.toFixed(2)} MAD</span>
              </div>
            )}
          </div>
          {/* Instructions steps */}
          <div className="rounded-2xl p-4 mb-5" style={{background:'var(--c-input)',border:'1.5px solid var(--c-border)'}}>
            {[
              lang==='ar'?'١. افتح تطبيق بنكك':lang==='en'?'1. Open your banking app':lang==='amz'?'1. ⵙⵉⵡⵍ ⵜⴰⵙⵏⵖⵎⵙⵜ':'1. Ouvrez votre appli bancaire',
              lang==='ar'?'٢. اضغط "دفع بالـ QR"':lang==='en'?'2. Tap "QR Pay"':lang==='amz'?'2. ⵙⵃⵓ QR':'2. Appuyez sur "Payer QR"',
              lang==='ar'?'٣. امسح رمز QR أعلاه':lang==='en'?'3. Scan the QR code above':lang==='amz'?'3. ⵙⵃⵓ ⵉ QR':'3. Scannez le QR ci-dessus',
              lang==='ar'?'٤. أكد التحويل في بنكك':lang==='en'?'4. Confirm payment in your bank':lang==='amz'?'4. ⵙⵡⵓⵔ ⵉ ⵓⴱⴰⵏⴽ':'4. Confirmez dans votre banque',
            ].map((step,i)=>(
              <div key={i} className={`flex items-center gap-3 ${i<3?'mb-2':''} ${isAR?'flex-row-reverse':''}`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#065F46'}}>
                  <span style={{fontSize:10,color:'white',fontWeight:900}}>{i+1}</span>
                </div>
                <p className={`text-xs font-semibold ${fClass}`} style={{color:'var(--c-text)'}}>{step}</p>
              </div>
            ))}
          </div>
          <p className={`text-[10px] text-center mb-4 ${fClass}`} style={{color:'#9CA3AF'}}>{t.qrNote}</p>
          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all ${fClass}`}
              style={{background:'var(--c-input)',border:'1.5px solid var(--c-border)',color:'var(--c-text)'}}>
              {t.qrCancel}
            </button>
            <button onClick={onConfirm}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm text-white active:scale-95 transition-all ${fClass}`}
              style={{background:'#065F46',boxShadow:'0 6px 20px rgba(6,95,70,0.35)'}}>
              {t.qrPaid}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED PAYMENT OPTIONS ────────────────────────────────────────────────────

type PayMethodType='cash'|'card'|'qr'|'apple'|'google'|null;

function SharedPaymentOptions({lang,amount,selected,onSelect,showCash=true,showCard=false,onWalletPay}:{
  lang:Lang; amount?:number; selected:PayMethodType; onSelect:(m:PayMethodType)=>void;
  showCash?:boolean; showCard?:boolean; onWalletPay:(type:'apple'|'google')=>void;
}){
  const t=T[lang]; const isAR=lang==='ar'; const fClass=lang==='amz'?'font-tifinagh':'';
  return(
    <div style={{direction:isAR?'rtl':'ltr'}}>
      {/* Apple Pay + Google Pay */}
      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${fClass}`} style={{color:'#6B7280'}}>
        ⚡ {lang==='ar'?'دفع سريع':lang==='en'?'Express pay':lang==='amz'?'ⵉⵙⵙⵉⴼⵍ ⴰⵣⵔⴼ':'Paiement rapide'}
      </p>
      <div className="flex gap-3 mb-3">
        <button onClick={()=>onWalletPay('apple')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-black text-sm text-white active:scale-95 transition-all ${fClass}`}
          style={{background:'#000',boxShadow:'0 4px 14px rgba(0,0,0,0.25)'}}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.27.06 2.15.64 2.88.68.93-.21 1.82-.8 3.07-.68 1.52.13 2.66.72 3.4 1.82-3.14 1.87-2.37 5.98.65 7.04zm-3.77-13.97c-.39 1.73-2.22 3.03-3.68 2.95-.24-1.65 1.4-3.1 3.68-2.95z"/></svg>
          <span>Pay</span>
        </button>
        <button onClick={()=>onWalletPay('google')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-black text-sm active:scale-95 transition-all ${fClass}`}
          style={{background:'var(--c-card)',border:'1.5px solid var(--c-border)',boxShadow:'0 4px 14px rgba(0,0,0,0.06)'}}>
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 10.2v3.6h5c-.2 1.1-.8 2-1.7 2.7l2.7 2.1C19.7 17 21 14.8 21 12c0-.6-.1-1.2-.2-1.8H12z" fill="#4285F4"/><path d="M5.3 14.3l-.6.5-2.3 1.8C4 19.3 7.7 21.5 12 21.5c3 0 5.5-1 7.3-2.7l-2.7-2.1c-1 .7-2.2 1-3.6 1-2.8 0-5.1-1.9-5.9-4.4H5.3z" fill="#34A853"/><path d="M2.4 7.4C1.8 8.6 1.5 9.8 1.5 12s.3 3.4 1 4.6l2.9-2.3C5.1 13.5 5 12.8 5 12s.1-1.5.4-2.3L2.4 7.4z" fill="#FBBC05"/><path d="M12 5.5c1.6 0 3 .5 4.2 1.5l2.5-2.5C16.8 2.9 14.6 2 12 2 7.7 2 4 4.2 2.4 7.4l2.9 2.3C6.2 7.1 8.9 5.5 12 5.5z" fill="#EA4335"/></svg>
          <span style={{fontWeight:900,fontSize:12,color:'#3C4043'}}>Pay</span>
        </button>
      </div>
      {/* Divider */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px" style={{background:'var(--c-border)'}}/>
        <span className={`text-[11px] font-bold ${fClass}`} style={{color:'#9CA3AF'}}>{lang==='ar'?'أو':lang==='en'?'or':lang==='amz'?'ⵏⵖ':'ou'}</span>
        <div className="flex-1 h-px" style={{background:'var(--c-border)'}}/>
      </div>
      {/* QR Code */}
      <button onClick={()=>onSelect(selected==='qr'?null:'qr')}
        className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-2.5 text-left transition-all active:scale-95"
        style={{background:selected==='qr'?'#ECFDF5':'var(--c-card)',border:`2px solid ${selected==='qr'?'#059669':'var(--c-border)'}`}}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{background:selected==='qr'?'#D1FAE5':'var(--c-input)'}}>📲</div>
        <div className="flex-1 text-left">
          <p className={`font-black text-sm ${fClass}`} style={{color:selected==='qr'?'#065F46':'var(--c-text)'}}>{t.qrOption}</p>
          <p className={`text-xs mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{t.qrOptionDesc}</p>
        </div>
        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
          style={{borderColor:selected==='qr'?'#059669':'#D1D5DB',background:selected==='qr'?'#059669':'transparent'}}>
          {selected==='qr'&&<div className="w-2 h-2 rounded-full bg-white"/>}
        </div>
      </button>
      {/* Cash */}
      {showCash&&(
        <button onClick={()=>onSelect(selected==='cash'?null:'cash')}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-2.5 text-left transition-all active:scale-95"
          style={{background:selected==='cash'?'#F0FDF4':'var(--c-card)',border:`2px solid ${selected==='cash'?'#16A34A':'var(--c-border)'}`}}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{background:selected==='cash'?'#DCFCE7':'var(--c-input)'}}>🤝</div>
          <div className="flex-1 text-left">
            <p className={`font-black text-sm ${fClass}`} style={{color:selected==='cash'?'#065F46':'var(--c-text)'}}>{t.cashOption}</p>
            <p className={`text-xs mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{t.cashOptionDesc}</p>
          </div>
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{borderColor:selected==='cash'?'#16A34A':'#D1D5DB',background:selected==='cash'?'#16A34A':'transparent'}}>
            {selected==='cash'&&<div className="w-2 h-2 rounded-full bg-white"/>}
          </div>
        </button>
      )}
      {/* Card */}
      {showCard&&(
        <button onClick={()=>onSelect(selected==='card'?null:'card')}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-2.5 text-left transition-all active:scale-95"
          style={{background:selected==='card'?'#E0E7FF':'var(--c-card)',border:`2px solid ${selected==='card'?'#4F46E5':'var(--c-border)'}`}}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{background:selected==='card'?'#E0E7FF':'var(--c-input)'}}>💳</div>
          <div className="flex-1 text-left">
            <p className={`font-black text-sm ${fClass}`} style={{color:selected==='card'?'#4F46E5':'var(--c-text)'}}>{t.cardOption}</p>
            <p className={`text-xs mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{t.cardOptionDesc}</p>
          </div>
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
            style={{borderColor:selected==='card'?'#4F46E5':'#D1D5DB',background:selected==='card'?'#4F46E5':'transparent'}}>
            {selected==='card'&&<div className="w-2 h-2 rounded-full bg-white"/>}
          </div>
        </button>
      )}
    </div>
  );
}

// ─── CHECKOUT DRAWER ──────────────────────────────────────────────────────────

type CheckoutStep='cart'|'form'|'payment'|'card'|'success';

function CheckoutDrawer({cart,lang,onClose,onQty,profile,onClearCart,restaurantName,onOrderSuccess,serviceFeeThreshold=70,serviceFeeAmount=SERVICE_FEE}:{
  cart:CartItem[]; lang:Lang; onClose:()=>void;
  onQty:(cartId:string,delta:number)=>void;
  profile:UserProfile; onClearCart:()=>void; restaurantName?:string;
  onOrderSuccess?:(ref:string)=>void;
  serviceFeeThreshold?:number; serviceFeeAmount?:number;
}) {
  const { isSignedIn, user } = useUser();
  const getAuthHeaders=useAuthHeaders();
  const [, navigate] = useLocation();
  const t=T[lang]; const isAR=lang==='ar'; const fClass=fontClass(lang);
  const [delivMode,setDelivMode]=useState<'delivery'|'collect'>('delivery');
  const baseTotal=cart.reduce((s,i)=>s+i.totalPerUnit*i.qty,0);
  const collectFee=delivMode==='collect'?2.99:0;
  // Promo codes
  const [promoInput,setPromoInput]=useState('');
  const [promoDiscount,setPromoDiscount]=useState(0);
  const [promoMsg,setPromoMsg]=useState('');
  const [promoIsErr,setPromoIsErr]=useState(false);
  const [usedPromos]=useState(new Set<string>());
  const applyPromo=()=>{
    const code=promoInput.trim().toUpperCase();
    if(!code)return;
    if(usedPromos.has(code)){setPromoMsg(t.promoErr);setPromoIsErr(true);return;}
    const disc=PROMO_CODES[code];
    if(!disc){setPromoMsg(t.promoErr);setPromoIsErr(true);return;}
    usedPromos.add(code);
    setPromoDiscount(d=>d+disc);
    setPromoMsg(t.promoOk(disc));setPromoIsErr(false);setPromoInput('');
  };
  // Game diamonds → MAD (fetched from server, anti-cheat)
  const [gamePts,setGamePts]=useState(0);
  useEffect(()=>{
    if(!user?.id) return;
    getAuthHeaders().then(h=>fetch('/api/game/diamonds',{credentials:'include',headers:h})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d&&typeof d.diamonds==='number')setGamePts(d.diamonds);})
      .catch(()=>{}));
  },[user?.id,getAuthHeaders]);
  // 1 000 💎 = 5 MAD → 200 💎 = 1 MAD
  const maxPtsMAD=Math.floor(gamePts/200);
  const [ptsUsed,setPtsUsed]=useState(0);
  const usePts=(mad:number)=>{
    const clamped=Math.min(mad,maxPtsMAD);
    setPtsUsed(clamped);
    // Deduct server-side when order is confirmed (see sendOrderToAPI)
  };
  const [serviceFeeEnabled,setServiceFeeEnabled]=useState(false);
  const isServiceFeeForced=baseTotal<serviceFeeThreshold;
  const serviceFee=(isServiceFeeForced||serviceFeeEnabled)?serviceFeeAmount:0;
  const [step,setStep]=useState<CheckoutStep>('cart');
  const [name,setName]=useState(profile.name);
  const [addr,setAddr]=useState(profile.address);
  const [phone,setPhone]=useState(profile.phone);
  const [err,setErr]=useState('');
  const [gpsCoords,setGpsCoords]=useState('');
  // Distance km — silencieux, jamais affiché au client
  const distanceKm=useMemo(()=>{
    if(!gpsCoords)return 0;
    const [lat,lng]=gpsCoords.split(',').map(Number);
    if(isNaN(lat)||isNaN(lng))return 0;
    return Math.round(haversineKm(RESTAURANT_LAT,RESTAURANT_LNG,lat,lng)*10)/10;
  },[gpsCoords]);
  const kmSurcharge=delivMode==='delivery'?Math.ceil(distanceKm)*KM_RATE:0;
  const deliveryFeeBase=delivMode==='delivery'?DELIVERY_FEE:0; // affiché
  const deliveryFee=deliveryFeeBase+kmSurcharge;               // réel
  const totalDiscount=promoDiscount+ptsUsed;
  const total=Math.max(0,Math.round((baseTotal+collectFee+deliveryFee+serviceFee-totalDiscount)*100)/100);
  const [mapPin,setMapPin]=useState<[number,number]|null>(null);
  const [outsideZone,setOutsideZone]=useState(false);
  const [payMethod,setPayMethod]=useState<PayMethodType>(null);
  const [showQRModal,setShowQRModal]=useState(false);
  const [cardNum,setCardNum]=useState('');
  const [cardExp,setCardExp]=useState(profile.cardExpiry);
  const [cardCVV,setCardCVV]=useState('');
  const [cardName,setCardName]=useState(profile.cardName);
  const [orderRef]=useState(`BE-${Math.floor(1000+Math.random()*9000)}`);
  const [collectCode]=useState(`CC-${Math.floor(1000+Math.random()*9000)}`);
  const [cardErr,setCardErr]=useState('');

  const handleSuccess=()=>{
    localStorage.setItem('bridge_last_ref',orderRef);
    onOrderSuccess?.(orderRef);
    setStep('success');
  };

  const handleWalletPay=async(type:'apple'|'google')=>{
    const payLabel=type==='apple'?'Apple Pay':'Google Pay';
    const methods=type==='apple'
      ?[{supportedMethods:'https://apple.com/apple-pay',data:{version:3,merchantIdentifier:'merchant.ma.safi-bridge',merchantCapabilities:['supports3DS'],supportedNetworks:['visa','masterCard'],countryCode:'MA'}}]
      :[{supportedMethods:'https://google.com/pay',data:{apiVersion:2,apiVersionMinor:0,merchantInfo:{merchantName:'Bridge Safi'},allowedPaymentMethods:[{type:'CARD',parameters:{allowedAuthMethods:['PAN_ONLY','CRYPTOGRAM_3DS'],allowedCardNetworks:['MASTERCARD','VISA']},tokenizationSpecification:{type:'PAYMENT_GATEWAY',parameters:{gateway:'example',gatewayMerchantId:'bridge-safi'}}}]}}];
    const details={total:{label:`Bridge Safi${restaurantName?' · '+restaurantName:''}`,amount:{currency:'MAD',value:String(total)}}};
    try{
      if(typeof PaymentRequest==='undefined') throw new Error('unsupported');
      const pr=new PaymentRequest(methods,details);
      const canMake=await pr.canMakePayment().catch(()=>false);
      if(!canMake) throw new Error('unavailable');
      const response=await pr.show();
      await response.complete('success');
      sendOrderToAPI(payLabel);
      sendOrderToDriverApp(payLabel);
      handleSuccess();
    }catch(e:unknown){
      const msg=e instanceof Error?e.message:'';
      if(msg!=='AbortError'&&msg!==''){
        // Wallet non disponible sur cet appareil → fallback carte
        setPayMethod('card');
        setStep('card');
      }
    }
  };

  const autoFilled=!!(profile.name||profile.address||profile.phone);

  const sendOrderToAPI=async(paymentMethod:string)=>{
    try{
      const items=cart.map(i=>({name:i.item.names['fr'],qty:i.qty,price:i.totalPerUnit,options:Object.entries(i.selectedOptions).flatMap(([,ids])=>ids)}));
      await fetch('/api/orders',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          ref:orderRef,
          service:'delivery',
          customerName:name.trim(),
          customerPhone:phone.trim(),
          customerAddress:delivMode==='collect'?`Click & Collect — ${addr.trim()||'Plateau, Safi'}`:addr.trim(),
          items,
          total:Math.round(total*100)/100,
          deliveryMode:delivMode,
          paymentMethod,
          restaurantName:restaurantName||null,
          collectCode:delivMode==='collect'?collectCode:null,
        }),
      });
      // Deduct diamonds server-side if used
      if(ptsUsed>0){
        const diamondsToSpend=ptsUsed*200; // 200 💎 = 1 MAD (1 000 💎 = 5 MAD)
        getAuthHeaders().then(h=>fetch('/api/game/diamonds/spend',{
          method:'POST',credentials:'include',
          headers:{...h,'Content-Type':'application/json'},
          body:JSON.stringify({spend:diamondsToSpend}),
        }).then(r=>r.ok?r.json():null).then(d=>{
          if(d&&typeof d.diamonds==='number'){
            const ck=`bridge_diamonds_cache_${user?.id||'anon'}`;
            try{localStorage.setItem(ck,String(d.diamonds));}catch{}
            window.dispatchEvent(new StorageEvent('storage',{key:ck,newValue:String(d.diamonds)}));
          }
        }).catch(()=>{}));
      }
    }catch(_){/* silent */}
  };

  // Envoie la commande directement au site livreur Bridge Logistique
  const sendOrderToDriverApp=async(paymentMethod:string)=>{
    try{
      const itemsList=cart.map(i=>{
        const opts=Object.entries(i.selectedOptions).flatMap(([,ids])=>ids);
        return `${i.item.names['fr']} x${i.qty}${opts.length>0?` (${opts.join(', ')})`:''}`;
      }).join(' | ');
      const payLabel=paymentMethod==='cash'?'Espèces à la livraison':'Carte bancaire (payé)';
      const navLink=gpsCoords
        ?` | GPS: https://maps.google.com/?q=${gpsCoords}`
        :addr.trim()?` | Maps: https://maps.google.com/?q=${encodeURIComponent(addr.trim()+', Safi, Maroc')}`:'';
      const collectLine=delivMode==='collect'?`\.🏪 Click & Collect — CODE CLIENT : ${collectCode}`:'';
      const kmLine=delivMode==='delivery'&&distanceKm>0?`\.📏 Distance: ~${distanceKm} km | Frais km: +${kmSurcharge} MAD (total livraison: ${deliveryFee} MAD)`:'';
      const notes=`🛒 ${itemsList}\.💰 Total client: ${total} MAD\.💳 ${payLabel}${navLink}${collectLine}${kmLine}`;
      const driverTrackUrl=`${window.location.origin}/driver/${orderRef}`;
      const r=await fetch(`${DRIVER_APP_URL}/api/deliveries`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          trackingNumber:orderRef,
          customerName:name.trim(),
          customerPhone:phone.trim(),
          pickupAddress:restaurantName?`${restaurantName} — Safi`:"McDonald's Safi",
          deliveryAddress:delivMode==='collect'
            ?`🏪 Click & Collect — CODE : ${collectCode}${addr.trim()?` (${addr.trim()})`:''}`
            :`${addr.trim()}, Safi, Maroc`,
          priority:'normal',
          notes,
          collectCode:delivMode==='collect'?collectCode:undefined,
          driverTrackUrl,
        }),
      });
      if(!r.ok) console.warn('[Bridge→Livreur] non-OK',r.status,await r.text().catch(()=>''));
    }catch(e){console.warn('[Bridge→Livreur] envoi échoué',e);}
  };

  const fmtCard=(v:string)=>v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const fmtExp=(v:string)=>{const d=v.replace(/\D/g,'').slice(0,4);return d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d;};

  const STEP_BACK:Partial<Record<CheckoutStep,CheckoutStep>>={form:'cart',payment:'form',card:'payment'};

  return (
    <div className="fixed inset-0 z-50 flex items-end modal-overlay" style={{background:'rgba(10,30,20,0.6)',backdropFilter:'blur(4px)'}} onClick={step==='success'?undefined:onClose}>
      <div className="w-full max-w-md mx-auto rounded-t-3xl modal-sheet" style={{background:'var(--c-bg)',maxHeight:'92vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3 flex-shrink-0" style={{borderBottom:'1px solid var(--c-border)'}}>
          {step!=='cart'&&step!=='success'&&(
            <button onClick={()=>setStep(STEP_BACK[step]!)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'#F3F4F6',color:'#065F46',fontSize:14,fontWeight:900}}>←</button>
          )}
          <p className={`font-black text-sm flex-1 ${fClass}`} style={{color:'#065F46'}}>
            {step==='cart'?`🛒 ${t.cartTitle}`:step==='form'?`📋 ${t.checkoutTitle}`:step==='payment'?`💳 ${t.payModeTitle}`:step==='card'?`🔒 ${t.cardFormTitle}`:`✅`}
          </p>
          {step!=='success'&&<button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'#F3F4F6',color:'#6B7280',fontSize:16,fontWeight:900}}>✕</button>}
        </div>
        {/* Progress */}
        {step!=='success'&&(
          <div className="flex items-center justify-center gap-2 py-2 flex-shrink-0">
            {(['cart','form','payment'] as CheckoutStep[]).map((s,i)=>(
              <div key={s} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full transition-all" style={{background:['cart','form','payment','card','success'].indexOf(step)>=i?'#065F46':'#E5E1D8',transform:step===s?'scale(1.4)':'scale(1)'}}/>
                {i<2&&<div className="w-6 h-px" style={{background:'var(--c-border)'}}/>}
              </div>
            ))}
          </div>
        )}

        {/* CART */}
        {step==='cart'&&(
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3" style={{direction:isAR?'rtl':'ltr'}}>
              {cart.length===0?(
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="text-6xl mb-3">🛒</span>
                  <p className={`text-sm font-bold ${fClass}`} style={{color:'#9CA3AF'}}>{t.cartEmpty}</p>
                  <AdSlot className="w-full mt-4" />
                </div>
              ):cart.map(ci=>(
                <div key={ci.cartId} className="py-3" style={{borderBottom:'1px solid #F3F4F6'}}>
                  <div className="flex items-center gap-3">
                    <img src={ci.item.photo} alt={ci.item.names[lang]} className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black truncate ${fClass}`} style={{color:'var(--c-text)'}}>{ci.item.names[lang]}</p>
                      <p className="text-[10px]" style={{color:'#9CA3AF'}}>{ci.restaurantName}</p>
                      <p className="text-xs font-bold mt-0.5" style={{color:'#065F46'}}>{ci.totalPerUnit*ci.qty} MAD</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={()=>onQty(ci.cartId,-1)} className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm" style={{background:'#F3F4F6',color:'#6B7280'}}>−</button>
                      <span className="text-sm font-black w-4 text-center" style={{color:'var(--c-text)'}}>{ci.qty}</span>
                      <button onClick={()=>onQty(ci.cartId,+1)} className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm text-white" style={{background:'#4F46E5'}}>+</button>
                    </div>
                  </div>
                  {/* Selected options summary */}
                  {Object.keys(ci.selectedOptions).length>0&&(
                    <div className="mt-1.5 ml-15 flex flex-wrap gap-1 pl-[60px]">
                      {Object.values(ci.selectedOptions).flat().map((id,i)=>(
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{background:'#F0FDF4',color:'#065F46',border:'1px solid #BBF7D0'}}>{id}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {cart.length>0&&(
              <div className="px-5 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--c-border)'}}>
                <div className="flex justify-between items-center mb-4">
                  <span className={`font-black text-sm ${fClass}`} style={{color:'#6B7280'}}>{t.total}</span>
                  <span className="font-black text-xl" style={{color:'#065F46'}}>{total} MAD</span>
                </div>
                <button onClick={()=>{
                  if(!isSignedIn){onClose();navigate('/sign-in');}
                  else setStep('form');
                }} className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
                  style={{background:'linear-gradient(135deg,#065F46,#047857)',boxShadow:'0 6px 20px rgba(6,95,70,0.3)'}}>
                  {isSignedIn ? `${t.checkout} →` : `🔒 Se connecter pour commander`}
                </button>
              </div>
            )}
          </>
        )}

        {/* FORM */}
        {step==='form'&&(
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{direction:isAR?'rtl':'ltr'}}>
              {/* Delivery mode selector */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {([
                  {key:'delivery'as const,label:t.delivOption,desc:t.delivOptionDesc,color:'#065F46',selBg:'#D1FAE5',bg:'#F0FDF4'},
                  {key:'collect'as const,label:t.collectOption,desc:t.collectOptionDesc,color:'#B45309',selBg:'#FEF3C7',bg:'#FFFBEB'},
                ]).map(opt=>(
                  <button key={opt.key} onClick={()=>{setDelivMode(opt.key);setErr('');if(opt.key==='collect'&&payMethod==='cash')setPayMethod(null);}}
                    className="flex flex-col items-start p-3 rounded-2xl text-left transition-all active:scale-95"
                    style={{background:delivMode===opt.key?opt.selBg:opt.bg,border:`2px solid ${delivMode===opt.key?opt.color:'#E5E1D8'}`}}>
                    <p className={`font-black text-xs leading-tight mb-0.5 ${fClass}`} style={{color:opt.color}}>{opt.label}</p>
                    <p className={`text-[10px] leading-tight ${fClass}`} style={{color:'#9CA3AF'}}>{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Click & Collect info box */}
              {delivMode==='collect'&&(
                <div className="flex items-start gap-2 px-3 py-3 rounded-xl mb-4" style={{background:'#FEF3C7',border:'1px solid #FDE68A'}}>
                  <span className="text-lg flex-shrink-0">🏪</span>
                  <div>
                    <p className={`text-[11px] font-black mb-1 ${fClass}`} style={{color:'#B45309'}}>Click & Collect — +2.99 MAD</p>
                    <p className={`text-[10px] ${fClass}`} style={{color:'#92400E'}}>
                      {lang==='ar'?'ستحصل على رمز استلام بعد الطلب — أعطه للمطعم':
                       lang==='amz'?'ⴰⵏⵓⵎⵔ ⵏ ⵓⵔⵣⵣⵓ ⵉⵍⴰ ⵖ ⵓⵙⵙⵓⵎⵔ · ⴰⴼⴽ ⴰⵙ ⵉ ⵓⵣⵉⴳⵣ':
                       lang==='en'?'A pickup code will appear after ordering — show it to the restaurant':
                       'Un code de retrait s\.affiche après commande — donnez-le au restaurateur'}
                    </p>
                  </div>
                </div>
              )}

              {autoFilled&&(
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
                  <span>✨</span>
                  <p className={`text-[10px] font-bold ${fClass}`} style={{color:'#065F46'}}>{t.autoFilled}</p>
                </div>
              )}

              {/* Delivery map (hidden in collect mode) */}
              {delivMode==='delivery'&&(<>
                <p className={`text-[10px] font-black uppercase tracking-wider mb-2 ${fClass}`} style={{color:'#065F46'}}>
                  {lang==='ar'?'📍 انقر أو اسحب الدبوس لتحديد عنوانك':lang==='amz'?'📍 ⵙⵜⵜⵉ ⵏⵖ ⵔⴽⵙ ⵜⴰⵙⵓⵏⵜ ⵖ ⵓⵙⴽⴽⵉⵍ':lang==='en'?'📍 Tap or drag the pin to set your address':'📍 Touchez ou glissez le 📍 pour remplir votre adresse'}
                </p>
                <DeliveryMap
                  pin={mapPin}
                  onSet={(coords,inside)=>{
                    const parts=coords.split(',');
                    setMapPin([parseFloat(parts[0]),parseFloat(parts[1])]);
                    setGpsCoords(coords);
                    setOutsideZone(!inside);
                  }}
                  onAddress={(a)=>{setAddr(a);setErr('');}}
                />
                {outsideZone&&mapPin&&(
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{background:'#FEF2F2',border:'1px solid #FECACA'}}>
                    <span>⚠️</span>
                    <p className={`text-[10px] font-bold ${fClass}`} style={{color:'#DC2626'}}>
                      {lang==='ar'?'هذه المنطقة خارج نطاق التوصيل. يمكنك اختيار الاستلام من المطعم.':lang==='amz'?'ⵜⴰⵙⵓⵏⵜ ⴰⴷ ⵓⵔ ⵜⵍⵍⵉ ⵖ ⵜⴰⵙⵓⵏⵜ ⵏ ⵓⵙⵙⵓⴼⵖ.':'Zone non couverte par la livraison. Vous pouvez choisir le Click & Collect.'}
                    </p>
                  </div>
                )}
                {mapPin&&!outsideZone&&(
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
                    <span>✅</span>
                    <p className={`text-[10px] font-bold ${fClass}`} style={{color:'#065F46'}}>
                      {lang==='ar'?'موقعك في منطقة التوصيل ✓':lang==='amz'?'ⵜⴰⵙⵓⵏⵜ ⵏⵏⴽ ⵖ ⵜⴰⵙⵓⵏⵜ ⵏ ⵓⵙⵙⵓⴼⵖ ✓':'Votre position est dans la zone de livraison ✓'}
                    </p>
                  </div>
                )}
              </>)}

              <Field label={t.nameLabel} value={name} onChange={v=>{setName(v);setErr('');}} placeholder={t.namePh} lang={lang} error={!!err&&!name.trim()}/>
              {delivMode==='delivery'&&(
                <AddressAutocomplete label={t.addrLabel} value={addr} onChange={v=>{setAddr(v);setErr('');}} placeholder={t.addrPh} lang={lang} error={!!err&&!addr.trim()}/>
              )}
              <Field label={t.phoneLabel} value={phone} onChange={v=>{setPhone(v);setErr('');}} placeholder={t.phonePh} type="tel" lang={lang} error={!!err&&!phone.trim()}/>
              {err&&<p className="text-xs font-bold -mt-2 mb-3" style={{color:'#DC2626'}}>{err}</p>}
            </div>
            <div className="px-5 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--c-border)'}}>
              <button onClick={()=>{
                const needAddr=delivMode==='delivery';
                if(!name.trim()||(needAddr&&!addr.trim())||!phone.trim()){setErr(t.fillAll);return;}
                setErr('');setStep('payment');
              }}
                className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
                style={{background:'linear-gradient(135deg,#065F46,#047857)',boxShadow:'0 6px 20px rgba(6,95,70,0.3)'}}>
                {t.continueBtn}
              </button>
            </div>
          </>
        )}

        {/* PAYMENT CHOICE */}
        {step==='payment'&&(
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="rounded-2xl p-3 mb-5" style={{background:'var(--c-input)',border:'1px solid var(--c-border)'}}>
                {cart.map(i=>(
                  <div key={i.cartId} className="flex justify-between text-xs py-0.5">
                    <span className={`font-bold truncate mr-2 ${fClass}`} style={{color:'var(--c-text)'}}>{i.item.names[lang]} ×{i.qty}</span>
                    <span className="font-black flex-shrink-0" style={{color:'#065F46'}}>{i.totalPerUnit*i.qty} MAD</span>
                  </div>
                ))}
                {/* Frais de livraison */}
                {delivMode==='delivery'&&(
                  <div className="flex justify-between text-xs pt-1 pb-0.5">
                    <span className={`font-bold ${fClass}`} style={{color:'#4F46E5'}}>🛵 {t.deliveryFeeRow}</span>
                    <span className="font-bold" style={{color:'#4F46E5'}}>+{deliveryFeeBase} MAD</span>
                  </div>
                )}
                {/* Click & Collect */}
                {delivMode==='collect'&&(
                  <div className="flex justify-between text-xs pt-1 pb-0.5">
                    <span className={`font-bold ${fClass}`} style={{color:'#B45309'}}>🏪 Click & Collect</span>
                    <span className="font-bold" style={{color:'#B45309'}}>+2.99 MAD</span>
                  </div>
                )}
                {/* Frais de service */}
                {(isServiceFeeForced||serviceFeeEnabled)&&(
                  <div className="flex justify-between text-xs pt-0.5 pb-0.5">
                    <span className={`font-bold ${fClass}`} style={{color:'#7C3AED'}}>⚙️ {t.serviceFeeRow}</span>
                    <span className="font-bold" style={{color:'#7C3AED'}}>+{serviceFeeAmount} MAD</span>
                  </div>
                )}
                {/* Réductions */}
                {totalDiscount>0&&(
                  <div className="flex justify-between text-xs pt-1 pb-0.5">
                    <span className={`font-bold ${fClass}`} style={{color:'#059669'}}>{t.discountRow(totalDiscount)}</span>
                    <span className="font-bold" style={{color:'#059669'}}>-{totalDiscount} MAD</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mt-2 pt-2" style={{borderTop:'1px solid var(--c-border)'}}>
                  <span className={`font-black ${fClass}`} style={{color:'#065F46'}}>{t.total}</span>
                  <span className="font-black" style={{color:'#065F46'}}>{total} MAD</span>
                </div>

                {/* Toggle / badge frais de service */}
                {isServiceFeeForced?(
                  <div className="flex items-center gap-2 mt-3 pt-2 rounded-xl px-3 py-2" style={{borderTop:'1px dashed #E5E1D8',background:'#F5F3FF'}}>
                    <span className="text-base">⚙️</span>
                    <div className="flex-1">
                      <p className={`text-[10px] font-black ${fClass}`} style={{color:'#7C3AED'}}>
                        {lang==='ar'?`رسوم الخدمة إلزامية (أقل من ${serviceFeeThreshold} د.م.)`:lang==='en'?`Service fee required (order under ${serviceFeeThreshold} MAD)`:lang==='amz'?`ⵉⵎⵙⴽⴰⵔⵏ ⵉⵍⴰⵎⵎⴰⵏ (ⴰⴷⴷⴰⴷ ⴷⴰⵜ ${serviceFeeThreshold} MAD)`:`Frais de service obligatoires (commande < ${serviceFeeThreshold} MAD)`}
                      </p>
                      <p className={`text-[9px] mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{t.serviceFeeDesc}</p>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{background:'#7C3AED',color:'white'}}>
                      {lang==='ar'?'إلزامي':lang==='en'?'Required':lang==='amz'?'ⵉⵍⴰⵎⵎⴰⵏ':'Obligatoire'}
                    </span>
                  </div>
                ):(
                  <div className="flex items-center justify-between mt-3 pt-2" style={{borderTop:'1px dashed #E5E1D8'}}>
                    <div className="flex-1 mr-3">
                      <p className={`text-[10px] font-black ${fClass}`} style={{color:'#7C3AED'}}>⚙️ {t.serviceFeeToggle} (+{serviceFeeAmount} MAD)</p>
                      <p className={`text-[9px] mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{t.serviceFeeDesc}</p>
                    </div>
                    <button onClick={()=>setServiceFeeEnabled(v=>!v)}
                      className="flex-shrink-0 rounded-full transition-all duration-300"
                      style={{width:44,height:24,background:serviceFeeEnabled?'#7C3AED':'#E5E1D8',padding:2,position:'relative'}}>
                      <span className="block rounded-full bg-white transition-all duration-300"
                        style={{width:20,height:20,transform:serviceFeeEnabled?'translateX(20px)':'translateX(0)',boxShadow:'0 1px 4px rgba(0,0,0,0.2)'}}/>
                    </button>
                  </div>
                )}
              </div>

              {/* ── Promo Code ── */}
              <div className="rounded-2xl p-4 mb-3" style={{background:'#FFFBEB',border:'1.5px solid #FDE68A'}}>
                <p className={`font-black text-[11px] mb-2 ${fClass}`} style={{color:'#92400E'}}>🎁 {t.promoLabel}</p>
                <div className="flex gap-2">
                  <input
                    value={promoInput} onChange={e=>setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={e=>e.key==='Enter'&&applyPromo()}
                    placeholder={t.promoPh}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold outline-none ${fClass}`}
                    style={{background:'var(--c-card)',border:'1.5px solid #FDE68A',color:'#92400E',direction:isAR?'rtl':'ltr'}}
                  />
                  <button onClick={applyPromo}
                    className="px-4 py-2 rounded-xl font-black text-xs text-white transition-all active:scale-95"
                    style={{background:'#B45309',boxShadow:'0 3px 10px rgba(180,83,9,0.3)'}}>
                    {t.promoApply}
                  </button>
                </div>
                {promoMsg&&<p className={`text-[10px] font-bold mt-1.5 ${fClass}`} style={{color:promoIsErr?'#DC2626':'#059669'}}>{promoMsg}</p>}
              </div>

              {/* ── Diamonds → MAD ── */}
              <div className="rounded-2xl p-4 mb-3" style={{background:'linear-gradient(135deg,#0A1A12,#0D2E1A)',border:'1px solid rgba(74,222,128,0.3)'}}>
                <p className="font-black text-[11px] mb-1" style={{color:'#D9C5A0'}}>
                  {t.diamondsSection}
                </p>
                {gamePts>0?(
                  <>
                    <p className="text-[10px] mb-2" style={{color:'rgba(255,255,255,0.6)'}}>{t.diamondsAvail(gamePts)}</p>
                    {ptsUsed>0?(
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold" style={{color:'#4ADE80'}}>✓ -{ptsUsed} MAD {lang==='ar'?'مطبق':lang==='en'?'applied':'appliqué'}</span>
                        <button onClick={()=>setPtsUsed(0)} className="text-[9px] font-bold px-2 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)'}}>✕</button>
                      </div>
                    ):(
                      <div className="flex gap-2 flex-wrap">
                        {[1,2,5,maxPtsMAD].filter((v,i,a)=>v>0&&a.indexOf(v)===i&&v<=maxPtsMAD).map(mad=>(
                          <button key={mad} onClick={()=>usePts(mad)}
                            className="px-3 py-1 rounded-xl font-black text-[10px] text-white transition-all active:scale-95"
                            style={{background:'rgba(74,222,128,0.2)',border:'1px solid rgba(74,222,128,0.5)',color:'#4ADE80'}}>
                            -{mad} MAD
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ):(
                  <p className="text-[10px]" style={{color:'rgba(255,255,255,0.4)'}}>{t.diamondsNone}</p>
                )}
              </div>

              <SharedPaymentOptions
                lang={lang} amount={total} selected={payMethod}
                onSelect={setPayMethod} showCash={delivMode==='delivery'} showCard
                onWalletPay={handleWalletPay}
              />
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-3" style={{background:'var(--c-input)'}}>
                <span>🔒</span><p className="text-[10px]" style={{color:'#9CA3AF'}}>{t.sslBadge}</p>
              </div>
            </div>
            <div className="px-5 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--c-border)'}}>
              <button
                onClick={()=>{
                  if(!payMethod)return;
                  if(payMethod==='cash'){sendOrderToAPI('cash');sendOrderToDriverApp('cash');handleSuccess();}
                  else if(payMethod==='qr'){sendOrderToAPI('QR Code');setShowQRModal(true);}
                  else{setStep('card');}
                }}
                disabled={!payMethod}
                className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
                style={{
                  background:!payMethod?'#E5E1D8':payMethod==='cash'?'#16A34A':payMethod==='qr'?'#065F46':'#4F46E5',
                  boxShadow:payMethod?`0 6px 20px ${payMethod==='cash'?'rgba(22,163,74,0.3)':payMethod==='qr'?'rgba(6,95,70,0.3)':'rgba(79,70,229,0.3)'}`:'none',
                  cursor:payMethod?'pointer':'not-allowed',
                }}>
                {payMethod==='card'?`${t.cardFormTitle} →`:payMethod==='cash'?`✅ ${t.continueBtn}`:payMethod==='qr'?`📲 ${t.qrModalTitle}`:t.continueBtn}
              </button>
            </div>
            {showQRModal&&<QRPayModal lang={lang} amount={total} onClose={()=>setShowQRModal(false)} onConfirm={async()=>{
              setShowQRModal(false);
              try{
                const h=await getAuthHeaders();
                await fetch(`/api/orders/${orderRef}/confirm-payment`,{method:'POST',credentials:'include',headers:{...h,'Content-Type':'application/json'}});
              }catch(_){}
              sendOrderToDriverApp('QR Code');
              handleSuccess();
            }}/>}
          </>
        )}

        {/* CARD FORM */}
        {step==='card'&&(
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{direction:isAR?'rtl':'ltr'}}>
              {(()=>{
                const ct=detectCard(cardNum);
                const cardBg=ct==='visa'
                  ?'linear-gradient(135deg,#1A1A6E,#003087,#1A478A)'
                  :ct==='mastercard'
                  ?'linear-gradient(135deg,#7B0000,#B71C1C,#C62828)'
                  :'linear-gradient(135deg,#374151,#1F2937)';
                return(
                  <div className="rounded-2xl p-5 mb-5 relative overflow-hidden" style={{background:cardBg,minHeight:120}}>
                    <div className="absolute inset-0 opacity-10" style={{backgroundImage:'repeating-linear-gradient(45deg,white 0,white 1px,transparent 0,transparent 50%)',backgroundSize:'8px 8px'}}/>
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-white/60 text-[10px] font-bold">💳 BRIDGE</p>
                      {ct==='visa'?<VisaLogo/>:ct==='mastercard'?<MastercardLogo/>:<span style={{fontSize:18}}>💳</span>}
                    </div>
                    <p className="text-white font-black text-base tracking-widest mb-3">{cardNum?fmtCard(cardNum):'•••• •••• •••• ••••'}</p>
                    <div className="flex justify-between items-end">
                      <div><p className="text-white/40 text-[9px]">CARDHOLDER</p><p className="text-white text-xs font-bold">{cardName||'—'}</p></div>
                      <div className="text-right"><p className="text-white/40 text-[9px]">EXPIRES</p><p className="text-white text-xs font-bold">{cardExp||'—'}</p></div>
                    </div>
                  </div>
                );
              })()}
              {profile.cardNumber&&(
                <button onClick={()=>{setCardNum(profile.cardNumber);setCardExp(profile.cardExpiry);setCardName(profile.cardName);}}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 w-full text-left ${fClass}`} style={{background:'#EEF2FF',border:'1px solid #C7D2FE'}}>
                  <span>✨</span><p className="text-[11px] font-bold" style={{color:'#4F46E5'}}>{t.autoFilled}</p>
                </button>
              )}
              <Field label={t.cardNumberLabel} value={fmtCard(cardNum)} onChange={v=>setCardNum(v.replace(/\s/g,''))} placeholder={t.cardNumberPh} type="tel" lang={lang}/>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.cardExpiryLabel} value={cardExp} onChange={v=>setCardExp(fmtExp(v))} placeholder={t.cardExpiryPh} type="tel" lang={lang}/>
                <Field label={t.cardCVVLabel} value={cardCVV} onChange={v=>setCardCVV(v.slice(0,3))} placeholder={t.cardCVVPh} type="password" lang={lang} error={!!cardErr&&cardCVV.length<3}/>
              </div>
              <Field label={t.cardNameLabel} value={cardName} onChange={v=>setCardName(v.toUpperCase())} placeholder={t.cardNamePh} lang={lang}/>
              {cardErr&&<p className="text-xs font-bold -mt-2 mb-3" style={{color:'#DC2626'}}>{cardErr}</p>}
            </div>
            <div className="px-5 py-4 flex-shrink-0" style={{borderTop:'1px solid var(--c-border)'}}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span>🔒</span><p className="text-[10px]" style={{color:'#9CA3AF'}}>{t.sslBadge} · PCI DSS</p>
              </div>
              <button onClick={()=>{
                if(!isValidCardType(cardNum)){setCardErr(t.errCardType);return;}
                if(!isRealCard(cardNum)){setCardErr(t.errLuhn);return;}
                if(!cardCVV||cardCVV.length<3){setCardErr(t.fillAll);return;}
                setCardErr('');
                sendOrderToAPI('card');
                sendOrderToDriverApp('card');
                handleSuccess();
              }}
                className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
                style={{background:'#4F46E5',boxShadow:'0 6px 20px rgba(79,70,229,0.35)'}}>
                {t.payNow} — {total} MAD
              </button>
            </div>
          </>
        )}

        {/* SUCCESS */}
        {step==='success'&&(
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl" style={{background:'linear-gradient(135deg,#F0FDF4,#D1FAE5)',border:'3px solid #BBF7D0'}}>✅</div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-lg">🎉</div>
            </div>
            <h2 className={`text-xl font-black mb-2 ${fClass}`} style={{color:'#065F46'}}>{t.successTitle}</h2>
            <p className={`text-sm mb-6 ${fClass}`} style={{color:'#6B7280'}}>{t.successSub}</p>
            <div className="w-full rounded-2xl p-4 mb-4" style={{background:'#F0FDF4',border:'1.5px solid #BBF7D0'}}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${fClass}`} style={{color:'#065F46'}}>{t.trackingLabel}</p>
              <p className="text-2xl font-black tracking-widest" style={{color:'#065F46'}}>{orderRef}</p>
            </div>
            {delivMode==='collect'?(
              <div className="w-full rounded-2xl p-4 mb-4" style={{background:'#FEF3C7',border:'2px dashed #F59E0B'}}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{color:'#92400E'}}>
                  🏪 Code de retrait
                </p>
                <p className="text-3xl font-black tracking-[0.25em] mb-2" style={{color:'#B45309'}}>{collectCode}</p>
                <p className="text-[11px] font-semibold" style={{color:'#78350F'}}>
                  Montrez ce code au restaurateur — il prépare votre commande
                </p>
              </div>
            ):(
              <div className="w-full rounded-2xl p-3 mb-4" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                  <p className={`text-xs font-bold ${fClass}`} style={{color:'#059669'}}>{t.deliveryEta}</p>
                </div>
              </div>
            )}
            <button onClick={()=>{onClearCart();onClose();}}
              className={`w-full py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${fClass}`}
              style={{background:'linear-gradient(135deg,#065F46,#047857)',boxShadow:'0 6px 20px rgba(6,95,70,0.3)'}}>
              {t.newOrder} 🍽️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRACKING PAGE ────────────────────────────────────────────────────────────

// Component that pans the map to a new center
function MapPanner({center}:{center:[number,number]}) {
  const map=useMap();
  useEffect(()=>{map.panTo(center,{animate:true,duration:1});},[center,map]);
  return null;
}

function TrackingPage({lang,t,orderRef}:{lang:Lang;t:typeof T.fr;orderRef:string}) {
  const [activeStage,setActiveStage]=useState(0);
  const [realPos,setRealPos]=useState<{lat:number;lng:number}|null>(null);
  const [lastSeen,setLastSeen]=useState<number|null>(null);
  const isAR=lang==='ar'; const fClass=fontClass(lang);
  const displayRef=orderRef||t.orderNum;

  // Poll real GPS position + status every 3 seconds
  useEffect(()=>{
    if(!orderRef) return;
    const poll=async()=>{
      try{
        const res=await fetch(`/api/tracking/${orderRef}`,{cache:'no-store'});
        if(res.ok){
          const data=await res.json();
          if(data.found){
            setRealPos({lat:data.lat,lng:data.lng});
            setLastSeen(data.updatedAt);
            // Map driver status to stage number
            const stageMap:{[k:string]:number}={received:0,preparing:1,on_way:2,delivered:3};
            if(data.status&&stageMap[data.status]!==undefined) setActiveStage(stageMap[data.status]);
          } else setRealPos(null);
        }
      }catch(_){}
    };
    poll();
    const iv=setInterval(poll,3000);
    return()=>clearInterval(iv);
  },[orderRef]);

  const isLive=realPos&&lastSeen&&(Date.now()-lastSeen<15000); // stale after 15s
  // Static center of Safi when no real GPS yet
  const SAFI_CENTER:[number,number]=[32.2994,-9.2372];
  const courierPos:[number,number]=realPos?[realPos.lat,realPos.lng]:SAFI_CENTER;
  const mapCenter:[number,number]=courierPos;

  // Live courier icon (pulsing green dot)
  const liveIcon=L.divIcon({
    html:`<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#059669,#065F46);border:3px solid #D9C5A0;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(5,150,105,0.25),0 4px 16px rgba(6,95,70,0.5);font-size:18px;animation:pulse 1.5s ease-in-out infinite;">🛵</div>`,
    className:'',iconSize:[36,36],iconAnchor:[18,18],
  });

  // Stale icon (grey)
  const staleIcon=L.divIcon({
    html:`<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#9CA3AF,#6B7280);border:3px solid #D9C5A0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:16px;">🛵</div>`,
    className:'',iconSize:[34,34],iconAnchor:[17,17],
  });

  const secsAgo=lastSeen?Math.round((Date.now()-lastSeen)/1000):null;

  return (
    <div className="px-5">
      {/* Order status card */}
      <div className="rounded-3xl p-4 mb-5" style={{background:'var(--c-bg)',border:'1.5px solid var(--c-border)',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
        <div className="flex items-center justify-between mb-1">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${fClass}`} style={{color:'#9CA3AF'}}>{t.orderStatus}</p>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{background:isLive?'#D1FAE5':'#FEF3C7',color:isLive?'#065F46':'#B45309'}}>
            <span className={`w-1.5 h-1.5 rounded-full ${isLive?'bg-emerald-500 animate-pulse':'bg-yellow-500'} inline-block`}/>
            {isLive?t.trackLive:realPos?'⚠️ Signal faible':'📡 En attente GPS'}
          </span>
        </div>
        <p className={`font-black text-sm ${fClass}`} style={{color:'#065F46'}}>{displayRef}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-base">⏱️</span>
          <p className="text-sm font-bold" style={{color:'var(--c-text)'}}>{t.eta}: <span style={{color:'#065F46'}}>{isLive?'📡 GPS en direct':'En attente du livreur'}</span></p>
        </div>
      </div>

      {/* Stages */}
      <div className="rounded-3xl p-5 mb-5" style={{background:'var(--c-bg)',border:'1.5px solid var(--c-border)',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
        <div className="relative mb-6">
          <div className="absolute top-4 h-0.5" style={{left:isAR?'auto':'12%',right:isAR?'12%':'auto',width:'76%',background:'var(--c-border)'}}/>
          <div className="absolute top-4 h-0.5 transition-all duration-700" style={{left:isAR?'auto':'12%',right:isAR?'12%':'auto',width:`${(activeStage/3)*76}%`,background:'linear-gradient(to right,#065F46,#059669)'}}/>
          <div className={`flex justify-between relative ${isAR?'flex-row-reverse':''}`}>
            {t.stages.map((stage,i)=>(
              <div key={i} className="flex flex-col items-center" style={{width:'25%'}}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition-all ${i===activeStage?'pulse-active':''}`}
                  style={{background:i<=activeStage?'#065F46':'#E5E1D8',color:i<=activeStage?'white':'#9CA3AF',border:i===activeStage?'3px solid #D9C5A0':'3px solid transparent',boxShadow:i===activeStage?'0 4px 16px rgba(6,95,70,0.35)':'none',zIndex:1}}>
                  {i<activeStage?'✓':['📋','👨‍🍳','🛵','✅'][i]}
                </div>
                <p className={`text-[9px] font-black uppercase tracking-tight mt-2 text-center leading-tight ${fClass}`} style={{color:i<=activeStage?'#065F46':'#9CA3AF'}}>{stage}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl p-3 flex items-center gap-3" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
          <div className="text-2xl">{['📋','👨‍🍳','🛵','✅'][activeStage]}</div>
          <div>
            <p className={`text-sm font-black ${fClass}`} style={{color:'#065F46'}}>{t.stages[activeStage]}</p>
            <p className="text-xs mt-0.5" style={{color:'#6B7280'}}>{t.stagesSub[activeStage]}</p>
          </div>
        </div>
      </div>

      {/* Live GPS Map */}
      <div className="rounded-3xl overflow-hidden mb-4" style={{border:`2px solid ${isLive?'#059669':'#E5E1D8'}`}}>
        {isLive&&(
          <div className="px-3 py-1.5 flex items-center gap-2" style={{background:'#065F46'}}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <span className="text-white text-[10px] font-black tracking-wide">GPS EN DIRECT</span>
            {secsAgo!==null&&<span className="text-white/60 text-[9px] ml-auto">il y a {secsAgo}s</span>}
          </div>
        )}
        <div className="h-[512px]">
          <MapContainer center={mapCenter} zoom={16} style={{height:'100%',width:'100%'}} zoomControl attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"/>
            <Marker position={[32.3010,-9.2420]} icon={restaurantIcon}><Popup>🥘 Bridge Safi</Popup></Marker>
            {realPos&&(
              <Marker position={courierPos} icon={isLive?liveIcon:staleIcon}>
                <Popup>🛵 Livreur — position réelle</Popup>
              </Marker>
            )}
            <MapPanner center={mapCenter}/>
          </MapContainer>
        </div>
        <div className="px-4 py-3 flex items-center justify-between" style={{background:'var(--c-bg)'}}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{background:isLive?'#D1FAE5':'#F3F4F6'}}>🛵</div>
            <div>
              <p className="text-xs font-bold" style={{color:'#065F46'}}>{t.courierName}</p>
              <p className="text-[10px]" style={{color:'#9CA3AF'}}>
                {isLive?'📡 GPS en direct':realPos?'⚠️ Signal perdu':t.trackZone}
              </p>
            </div>
          </div>
          {isLive&&(
            <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{background:'#F0FDF4'}}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
              <span className="text-[10px] font-black" style={{color:'#065F46'}}>EN DIRECT</span>
            </div>
          )}
        </div>
      </div>

      {/* GPS status info */}
      {orderRef&&!isLive&&(
        <div className="rounded-2xl p-3 mb-5 flex items-start gap-2" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
          <span className="text-base flex-shrink-0">📡</span>
          <p className="text-[10px]" style={{color:'#065F46'}}>
            Le livreur recevra automatiquement son lien GPS dans l'application — sa position apparaîtra ici dès qu'il démarre.
          </p>
        </div>
      )}
      <AdSlot />
    </div>
  );
}

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────

function ContactPage({lang,t}:{lang:Lang;t:typeof T.fr}) {
  const isAR=lang==='ar'; const fClass=fontClass(lang);
  const arrow=(<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="2.5" style={{transform:isAR?'scaleX(-1)':'',flexShrink:0}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
  return (
    <div className="px-5">
      <div className="rounded-3xl overflow-hidden mb-5 relative" style={{border:'1.5px solid var(--c-border)'}}>
        <img src="/logo.jpeg" className="w-full h-32 object-cover" alt="Bridge Safi"/>
        <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(4,55,38,0.85) 0%,transparent 55%)'}}/>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className={`text-white font-black text-lg ${fClass}`}>{t.contactTitle}</p>
          <p className="text-white/70 text-xs">{t.contactSub}</p>
        </div>
      </div>
      {[
        {href:'https://wa.me/212764794856',bg:'#DCFCE7',border:'#86EFAC',iconBg:'#25D366',icon:(
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.124 1.532 5.859L.036 23.671l5.979-1.567A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.374l-.359-.214-3.728.977 1-3.647-.234-.374A9.818 9.818 0 112 12c0-5.422 4.396-9.818 9.818-9.818 5.421 0 9.818 4.396 9.818 9.818 0 5.421-4.397 9.818-9.818 9.818z"/></svg>
        ),label:t.whatsapp,sub:'+212 7 64 79 48 56'},
        {href:'tel:+212764794856',bg:'#FDFCF9',border:'#E5E1D8',iconBg:'#F0FDF4',iconBorder:'#BBF7D0',icon:<span className="text-xl">📞</span>,label:t.phone,sub:'+212 7 64 79 48 56'},
        {href:'mailto:contact@safi-bridge.ma',bg:'#FDFCF9',border:'#E5E1D8',iconBg:'#FEF9EE',iconBorder:'#FDE68A',icon:<span className="text-xl">✉️</span>,label:t.email,sub:'contact@safi-bridge.ma'},
      ].map((item,i)=>(
        <a key={i} href={item.href} target={item.href.startsWith('http')?'_blank':undefined} rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-2xl mb-3 transition-all active:scale-95"
          style={{background:item.bg,border:`1.5px solid ${item.border}`,textDecoration:'none'}}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{background:item.iconBg,border:(item as any).iconBorder?`2px solid ${(item as any).iconBorder}`:undefined}}>{item.icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`font-black text-sm ${fClass}`} style={{color:'#065F46'}}>{item.label}</p>
            <p className="text-xs" style={{color:'#6B7280'}}>{item.sub}</p>
          </div>{arrow}
        </a>
      ))}
      <div className="flex items-center gap-4 p-4 rounded-2xl mb-3" style={{background:'#FEF9EE',border:'1.5px solid #FDE68A'}}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#FEF3C7'}}><span className="text-xl">🕐</span></div>
        <div><p className={`font-black text-sm ${fClass}`} style={{color:'#B45309'}}>{t.hours}</p><p className="text-xs font-bold mt-0.5" style={{color:'#92400E'}}>{t.hoursVal}</p></div>
      </div>
      <GoldDivider/>
      <div className="rounded-2xl p-4 text-center mb-4" style={{background:'var(--c-input)',border:'1px solid var(--c-border)'}}>
        <p className="text-xl mb-1">📍</p>
        <p className={`font-black text-sm ${fClass}`} style={{color:'#065F46'}}>{t.zone}</p>
        <p className={`text-xs mt-1 ${fClass}`} style={{color:'#9CA3AF'}}>{t.plateau}</p>
      </div>
    </div>
  );
}

// ─── BRIDGE PHARMACIE PAGE ────────────────────────────────────────────────────

function PharmaciePage({onBack,lang,profile}:{onBack:()=>void;lang:Lang;profile:UserProfile}) {
  const fClass=fontClass(lang); const isAR=lang==='ar';
  const [,navigatePharm]=useLocation();
  const msgs:{fr:string;en:string;ar:string;amz:string}={
    fr:'Bridge Pharmacie sera lancé très bientôt.\.Livraison de médicaments & produits parapharmacie,\.de jour comme de nuit à Safi.',
    en:'Bridge Pharmacie launching very soon.\.Medication & parapharmacy delivery,\.day and night in Safi.',
    ar:'سيُطلق بريدج فارماسي قريباً جداً.\.توصيل الأدوية ومستلزمات الصيدلية،\.ليلاً ونهاراً في آسفي.',
    amz:'Bridge Pharmacie ⵜⴰⵖ ⴷ ⵓⴳⵉⵏ.\.ⴰⵙⵙⵓⴼⵖ ⵏ ⵉⵙⵙⴰⵏ ⴷ ⵉⵙⴽⵉⵔⵏ,\.ⵉⴹ ⴷ ⵡⴰⵙⵙ ⵖ ⵙⴰⴼⵉ.',
  };
  return(
    <div className={`min-h-screen flex flex-col items-center justify-center ${fClass}`}
      dir={isAR?'rtl':'ltr'}
      style={{background:'linear-gradient(160deg,#060818 0%,#0C0E2B 40%,#1E1B4B 70%,#0F172A 100%)',padding:24,position:'relative',overflow:'hidden'}}>
      {/* Stars background */}
      {Array.from({length:30}).map((_,i)=>(
        <div key={i} style={{position:'absolute',borderRadius:'50%',background:'#fff',
          width:Math.random()*2+1,height:Math.random()*2+1,
          top:`${Math.random()*100}%`,left:`${Math.random()*100}%`,
          opacity:Math.random()*0.6+0.2,
          animation:`pulse2 ${(Math.random()*3+2).toFixed(1)}s ease-in-out infinite`,
          animationDelay:`${(Math.random()*3).toFixed(1)}s`,
        }}/>
      ))}
      {/* Back button */}
      <button onClick={onBack}
        style={{position:'absolute',top:20,left:isAR?'auto':20,right:isAR?20:'auto',background:'rgba(255,255,255,0.08)',border:'1.5px solid rgba(255,255,255,0.15)',borderRadius:50,padding:'10px 18px',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',backdropFilter:'blur(12px)',zIndex:10,display:'flex',alignItems:'center',gap:6}}>
        <span style={{fontSize:16}}>←</span>
        {lang==='ar'?'رجوع':lang==='en'?'Back':lang==='amz'?'ⴰⴷⴷⵓ':'Retour'}
      </button>
      {/* Shark diamond widget top-right */}
      <div style={{position:'absolute',top:16,right:isAR?'auto':16,left:isAR?16:'auto',zIndex:10}}>
        <SharkDiamondWidget onNavigate={()=>navigatePharm('/game')} profile={profile}/>
      </div>
      {/* Content */}
      <div style={{textAlign:'center',maxWidth:320,zIndex:1}}>
        {/* Night moon illustration */}
        <div style={{marginBottom:28,position:'relative',display:'inline-block'}}>
          <div style={{width:100,height:100,borderRadius:'50%',background:'linear-gradient(135deg,#1E1B4B,#312E81)',border:'2px solid rgba(165,180,252,0.4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 40px rgba(99,102,241,0.5)',margin:'0 auto'}}>
            <span style={{fontSize:52}}>💊</span>
          </div>
          <div style={{position:'absolute',top:-8,right:-8,background:'rgba(99,102,241,0.3)',borderRadius:'50%',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(165,180,252,0.4)'}}>
            <span style={{fontSize:16}}>🌙</span>
          </div>
        </div>
        <p style={{color:'rgba(165,180,252,0.6)',fontSize:10,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',margin:'0 0 8px'}}>Bridge Services</p>
        <h1 style={{color:'#fff',fontSize:26,fontWeight:900,margin:'0 0 6px',letterSpacing:'0.04em'}}>Bridge Pharmacie</h1>
        {/* EN ATTENTE badge */}
        <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(239,68,68,0.15)',border:'1.5px solid rgba(239,68,68,0.4)',borderRadius:50,padding:'6px 16px',marginBottom:24}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block',animation:'pulse2 1.4s ease-in-out infinite'}}/>
          <span style={{color:'#FCA5A5',fontSize:11,fontWeight:900,letterSpacing:'0.15em'}}>EN ATTENTE</span>
        </div>
        <p style={{color:'rgba(199,210,254,0.75)',fontSize:14,lineHeight:1.7,margin:'0 0 32px',whiteSpace:'pre-line'}}>{msgs[lang]}</p>
        {/* Feature previews */}
        {[
          {icon:'🌙',fr:'Disponible la nuit',en:'Available at night',ar:'متاح ليلاً',amz:'ⴰⵙⵙⵓⴼⵖ ⵉⴹ'},
          {icon:'🚚',fr:'Livraison express',en:'Express delivery',ar:'توصيل سريع',amz:'ⴰⵙⵙⵓⴼⵖ ⵣⵔⵉⵔⵉ'},
          {icon:'💊',fr:'Médicaments & para',en:'Meds & parapharmacy',ar:'أدوية ومستلزمات',amz:'ⵉⵙⵙⴰⵏ ⴷ ⵉⵙⴽⵉⵔⵏ'},
        ].map(f=>(
          <div key={f.icon} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'12px 16px',marginBottom:10,textAlign:isAR?'right':'left'}}>
            <span style={{fontSize:22,flexShrink:0}}>{f.icon}</span>
            <span style={{color:'rgba(199,210,254,0.85)',fontSize:13,fontWeight:600}}>{f[lang]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SERVICE SELECT PAGE ──────────────────────────────────────────────────────

function ServiceSelectPage({onSelect,lang,cycleLang,profile,saveProfile}:{onSelect:(s:'delivery'|'taxi'|'tabac'|'fleurs'|'pharmacie')=>void;lang:Lang;cycleLang:()=>void;profile:UserProfile;saveProfile:(p:UserProfile)=>void}) {
  const [pressed,setPressed]=useState<'delivery'|'taxi'|'tabac'|'fleurs'|'pharmacie'|null>(null);
  const [showProfile,setShowProfile]=useState(false);
  const [,navigate]=useLocation();
  const { user } = useUser();
  const getAuthHeaders=useAuthHeaders();
  const t=T[lang]; const fClass=fontClass(lang); const isAR=lang==='ar';
  const LANG_LABELS:Record<Lang,string>={fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};
  const choose=(s:'delivery'|'taxi'|'tabac'|'fleurs'|'pharmacie')=>{setPressed(s);setTimeout(()=>onSelect(s),320);};
  // Avatar: custom upload > Clerk photo > initials
  const avatarSrc=profile.avatar||user?.imageUrl||null;
  const initials=(profile.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  // Diamonds fetch
  const [diamonds,setDiamonds]=useState(0);
  useEffect(()=>{
    if(!user?.id) return;
    getAuthHeaders().then(h=>fetch('/api/game/diamonds',{credentials:'include',headers:h})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d&&typeof d.diamonds==='number')setDiamonds(d.diamonds);})
      .catch(()=>{}));
  },[user?.id,getAuthHeaders]);
  return(
    <div className={`fixed inset-0 flex flex-col z-40 ${isAR?'rtl':'ltr'}`}
      style={{background:'var(--c-bg)',overflowY:'auto'}}>
      {/* Background watermark */}
      <div className="fixed inset-0 opacity-[0.04] pointer-events-none" style={{backgroundImage:'url(/image_1.png)',backgroundSize:'cover',backgroundPosition:'center'}}/>

      {/* ── TOP BAR ── */}

      {/* Profile button + Bridge ID + Diamonds — LEFT */}
      <div className={`absolute top-3 z-50 flex flex-col items-center gap-1 ${isAR?'right-3':'left-3'}`}>
        <button onClick={()=>setShowProfile(true)}
          style={{width:40,height:40,borderRadius:'50%',overflow:'hidden',border:'2.5px solid #D9C5A0',background:'#F0EBE1',boxShadow:'0 4px 14px rgba(6,95,70,0.15)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
          {avatarSrc
            ?<img src={avatarSrc} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            :<span style={{fontSize:13,fontWeight:900,color:'#065F46',lineHeight:1}}>{initials}</span>
          }
        </button>
        <div style={{background:'rgba(6,95,70,0.12)',border:'1px solid rgba(6,95,70,0.3)',borderRadius:6,padding:'2px 5px'}}>
          <span style={{fontSize:7,fontWeight:900,color:'#065F46',letterSpacing:'0.06em'}}>
            {getBridgeId(profile.phone, profile.name)}
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:3,background:'#FEF9C3',border:'1px solid #FDE047',borderRadius:8,padding:'2px 6px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
          <span style={{fontSize:10}}>💎</span>
          <span style={{fontSize:8,fontWeight:900,color:'#92400E'}}>{diamonds.toLocaleString()}</span>
        </div>
      </div>

      {/* Language + Dark toggle — RIGHT */}
      <div className={`absolute top-5 z-50 flex items-center gap-2 ${isAR?'left-5':'right-5'}`}>
        <DarkToggle size={38}/>
        <button onClick={cycleLang}
          className={`rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 hover:scale-110 px-3 ${lang==='amz'?'font-tifinagh':''}`}
          style={{background:'var(--c-card)',border:'2.5px solid #D9C5A0',color:'#065F46',boxShadow:'0 4px 20px rgba(6,95,70,0.15)',height:'38px',fontSize:'13px'}}>
          {LANG_LABELS[lang]}
        </button>
      </div>

      <div className="relative flex flex-col items-center w-full max-w-sm mx-auto pt-20 pb-8 px-2">
        {/* Title — Glassmorphism moderne */}
        <div style={{position:'relative',textAlign:'center',marginBottom:8}}>
          {/* Glow derrière le titre */}
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:220,height:60,background:'radial-gradient(ellipse,rgba(5,150,105,0.28) 0%,transparent 70%)',filter:'blur(18px)',pointerEvents:'none'}}/>
          <h1 style={{
            fontSize:'2.6rem',fontWeight:900,letterSpacing:'0.45em',
            background:'linear-gradient(160deg,#059669 0%,#065F46 55%,#044434 100%)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            backgroundClip:'text',
            filter:'drop-shadow(0 2px 14px rgba(5,150,105,0.4))',
            margin:0,lineHeight:1.1,position:'relative',
          }}>BRIDGE</h1>
        </div>
        {/* Badge localisation style glass */}
        <div style={{
          display:'inline-flex',alignItems:'center',gap:6,
          background:'linear-gradient(135deg,rgba(6,95,70,0.1),rgba(180,83,9,0.07))',
          border:'1px solid rgba(217,197,160,0.6)',
          borderRadius:20,padding:'4px 14px',
          backdropFilter:'blur(10px)',marginBottom:6,
        }}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:'0.12em',color:'#065F46'}}>SAFI</span>
          <span style={{color:'#D9C5A0',fontSize:10}}>·</span>
          <span style={{fontSize:10,fontWeight:700,color:'#B45309'}}>آسفي</span>
          <span style={{color:'#D9C5A0',fontSize:10}}>·</span>
          <span style={{fontSize:10,fontWeight:700,color:'#065F46'}}>ⵙⴰⴼⵉ</span>
        </div>
        {/* Séparateur lumineux */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20,marginTop:4}}>
          <div style={{width:40,height:1,background:'linear-gradient(to right,transparent,#D9C5A0)'}}/>
          <div style={{width:6,height:6,borderRadius:'50%',background:'linear-gradient(135deg,#34D399,#B45309)',boxShadow:'0 0 8px rgba(5,150,105,0.6)'}}/>
          <div style={{width:40,height:1,background:'linear-gradient(to left,transparent,#D9C5A0)'}}/>
        </div>
        {/* Sous-titre dans glass pill */}
        <div style={{
          background:'linear-gradient(135deg,rgba(6,95,70,0.08),rgba(217,197,160,0.12))',
          border:'1px solid rgba(217,197,160,0.4)',
          borderRadius:12,padding:'5px 16px',
          backdropFilter:'blur(8px)',marginBottom:24,
        }}>
          <p className={`text-[10px] font-black tracking-[0.18em] uppercase ${fClass}`} style={{color:'#6B7280',margin:0}}>{t.chooseService}</p>
        </div>

        {/* 2×2 service grid — Glassmorphism iOS 18 */}
        {(()=>{
          const topItems=[
            {key:'delivery' as const, label:'Bridge Eats',  sub:t.deliverySub, emoji:'🛵',
             pending:false, active:true,
             grad:'linear-gradient(145deg,#064E3B 0%,#065F46 45%,#059669 100%)',
             glow:'rgba(5,150,105,0.55)', border:'rgba(52,211,153,0.45)'},
            {key:'taxi'     as const, label:'Bridge Taxi',  sub:t.taxiSub,     emoji:'🚖',
             pending:true,
             grad:'linear-gradient(145deg,#78350F 0%,#B45309 55%,#F59E0B 100%)',
             glow:'rgba(245,158,11,0.45)', border:'rgba(251,191,36,0.45)'},
          ];
          const botItems=[
            {key:'fleurs'   as const, label:'Bridge Fleurs',sub:t.fleursSub,   emoji:'🌹',
             pending:false, active:true,
             grad:'linear-gradient(145deg,#831843 0%,#DB2777 55%,#F472B6 100%)',
             glow:'rgba(219,39,119,0.5)', border:'rgba(244,114,182,0.45)'},
            {key:'tabac'    as const, label:'Bridge Tabac', sub:t.tabacSub,    emoji:'🚬',
             pending:true,
             grad:'linear-gradient(145deg,#1C0A00 0%,#7D4F2E 55%,#A0623A 100%)',
             glow:'rgba(125,79,46,0.5)', border:'rgba(160,98,58,0.4)'},
          ];
          const renderCard=(item:{key:'delivery'|'taxi'|'fleurs'|'tabac'|'pharmacie';label:string;sub:string;emoji:string;pending?:boolean;grad:string;glow:string;border:string})=>{
            const isPressed=pressed===item.key;
            return(
              <button key={item.key} onClick={()=>choose(item.key)}
                style={{
                  background:'none',border:'none',cursor:'pointer',padding:0,
                  transform:isPressed?'scale(0.94)':'scale(1)',
                  transition:'transform 0.2s cubic-bezier(.34,1.56,.64,1)',
                  opacity:item.pending?0.78:1,
                }}>
                <div style={{
                  background: item.grad,
                  borderRadius:24,
                  border:`1.5px solid ${isPressed?'rgba(255,255,255,0.55)':item.border}`,
                  boxShadow: isPressed
                    ? `0 0 0 3px ${item.glow},0 16px 40px ${item.glow},inset 0 1px 0 rgba(255,255,255,0.25)`
                    : `0 8px 32px ${item.glow},inset 0 1px 0 rgba(255,255,255,0.2)`,
                  padding:'22px 12px 16px',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:8,
                  position:'relative',overflow:'hidden',
                  transition:'box-shadow 0.25s,border-color 0.25s',
                  minHeight:140,
                }}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'55%',background:'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0) 100%)',borderRadius:'24px 24px 60% 60%',pointerEvents:'none'}}/>
                  {item.pending&&(
                    <div style={{position:'absolute',top:10,right:isAR?'auto':10,left:isAR?10:'auto',background:'rgba(239,68,68,0.92)',borderRadius:20,padding:'3px 10px',display:'flex',alignItems:'center',gap:5,backdropFilter:'blur(6px)'}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'#FCA5A5',display:'inline-block',animation:'pulse2 1.4s ease-in-out infinite'}}/>
                      <span style={{color:'#fff',fontSize:9,fontWeight:900,letterSpacing:'0.1em'}}>EN ATTENTE</span>
                    </div>
                  )}
                  <span style={{fontSize:44,lineHeight:1,filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'}}>{item.emoji}</span>
                  <p style={{color:'#fff',fontSize:13,fontWeight:900,letterSpacing:'0.08em',margin:0,textShadow:'0 1px 4px rgba(0,0,0,0.4)',textAlign:'center'}}>{item.label}</p>
                  <p style={{color:'rgba(255,255,255,0.75)',fontSize:10,fontWeight:600,margin:0,textAlign:'center'}}>{item.sub}</p>
                </div>
              </button>
            );
          };
          return(
            <div style={{display:'flex',flexDirection:'column',gap:'16px',width:'100%',maxWidth:320,padding:'0 4px'}}>
              {/* Row 1: Eats + Taxi */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                {topItems.map(renderCard)}
              </div>
              {/* Row 2: Bridge Pharmacie — full width, centered */}
              {(()=>{
                const isPh=pressed==='pharmacie';
                return(
                  <button onClick={()=>choose('pharmacie')} style={{background:'none',border:'none',cursor:'pointer',padding:0,transform:isPh?'scale(0.97)':'scale(1)',transition:'transform 0.2s cubic-bezier(.34,1.56,.64,1)',opacity:0.82}}>
                    <div style={{
                      background:'linear-gradient(145deg,#0C0E2B 0%,#1E1B4B 35%,#312E81 65%,#1D4ED8 100%)',
                      borderRadius:24,border:`1.5px solid ${isPh?'rgba(255,255,255,0.5)':'rgba(99,102,241,0.5)'}`,
                      boxShadow:isPh?'0 0 0 3px rgba(99,102,241,0.5),0 16px 40px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.2)':'0 8px 32px rgba(30,27,75,0.7),inset 0 1px 0 rgba(255,255,255,0.15)',
                      padding:'18px 20px',display:'flex',alignItems:'center',gap:16,position:'relative',overflow:'hidden',
                    }}>
                      <div style={{position:'absolute',top:0,left:0,right:0,height:'55%',background:'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0) 100%)',borderRadius:'24px 24px 60% 60%',pointerEvents:'none'}}/>
                      {/* Night stars decoration */}
                      <div style={{position:'absolute',top:8,right:16,fontSize:10,opacity:0.5}}>✨</div>
                      <div style={{position:'absolute',top:14,right:32,fontSize:7,opacity:0.3}}>★</div>
                      <div style={{position:'absolute',top:5,right:48,fontSize:8,opacity:0.4}}>✦</div>
                      <div style={{background:'rgba(255,255,255,0.1)',borderRadius:16,padding:'10px 12px',flexShrink:0}}>
                        <span style={{fontSize:36,lineHeight:1,filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'}}>💊</span>
                      </div>
                      <div style={{textAlign:'left',flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <p style={{color:'#fff',fontSize:14,fontWeight:900,letterSpacing:'0.06em',margin:0,textShadow:'0 1px 4px rgba(0,0,0,0.5)'}}>Bridge Pharmacie</p>
                          <span style={{background:'rgba(239,68,68,0.85)',borderRadius:20,padding:'2px 8px',display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                            <span style={{width:5,height:5,borderRadius:'50%',background:'#FCA5A5',display:'inline-block',animation:'pulse2 1.4s ease-in-out infinite'}}/>
                            <span style={{color:'#fff',fontSize:8,fontWeight:900,letterSpacing:'0.1em'}}>EN ATTENTE</span>
                          </span>
                        </div>
                        <p style={{color:'rgba(255,255,255,0.8)',fontSize:11,fontWeight:700,margin:'0 0 2px'}}>🌙 Ouverte la nuit · 💊 Disponible 24h/24</p>
                        <p style={{color:'rgba(255,255,255,0.5)',fontSize:10,margin:0}}>{t.pharmaeSub}</p>
                      </div>
                    </div>
                  </button>
                );
              })()}
              {/* Row 3: Fleurs + Tabac */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                {botItems.map(renderCard)}
              </div>
            </div>
          );
        })()}

        {/* ── GAME BANNER — entre grille et pub ─────────────────────────────── */}
        <button onClick={()=>navigate('/game')}
          className="w-full mt-7 transition-all active:scale-95"
          style={{background:'linear-gradient(135deg,#071A10,#0D3020)',border:'1.5px solid rgba(74,222,128,0.35)',borderRadius:20,padding:'14px 18px',boxShadow:'0 6px 28px rgba(6,95,70,0.45)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,textAlign:'left'}}>
          {/* Shark avatar */}
          <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',border:'2px solid #D9C5A0',flexShrink:0,boxShadow:'0 0 16px rgba(74,222,128,0.4)'}}>
            <img src="/bridge-shark.png" alt="Bridge Game" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>
          </div>
          {/* Text */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
              <span style={{color:'#D9C5A0',fontSize:9,fontWeight:900,letterSpacing:'0.22em'}}>BRIDGE</span>
              <span style={{background:'rgba(74,222,128,0.2)',border:'1px solid rgba(74,222,128,0.6)',borderRadius:5,padding:'1px 6px',color:'#4ADE80',fontSize:8,fontWeight:900,letterSpacing:'0.14em'}}>GAME</span>
            </div>
            <p style={{color:'#FDE047',fontSize:12,fontWeight:800,margin:'0 0 2px',lineHeight:1.3}}>💎 Gagnez des diamants</p>
            <p style={{color:'rgba(255,255,255,0.45)',fontSize:10,margin:0}}>Chaque commande = points → menus offerts</p>
          </div>
          {/* Arrow */}
          <span style={{color:'#4ADE80',fontSize:18,flexShrink:0,fontWeight:900}}>›</span>
        </button>

        {/* ── AD SLOT — place de publicité ───────────────────────────────────── */}
        <div id="ad-slot" className="w-full mt-5">
          <div className="rounded-2xl overflow-hidden" style={{border:'1.5px dashed #D9C5A0',background:'rgba(253,252,249,0.7)',minHeight:90,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {/* PUB_CONTENT_START */}
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{color:'#C9BFB2'}}>Espace Publicitaire</p>
            {/* PUB_CONTENT_END */}
          </div>
        </div>

      </div>

      <WAButton/>
      {showProfile&&<ProfileModal lang={lang} profile={profile} onSave={saveProfile} onClose={()=>setShowProfile(false)}/>}
    </div>
  );
}

// ─── WHATSAPP SUPPORT BUTTON ──────────────────────────────────────────────────

// ─── PWA INSTALL BANNER ───────────────────────────────────────────────────────
const PWA_DISMISSED_KEY = 'bridge_pwa_banner_dismissed';

const PWA_LABELS = {
  fr: { title: 'Installer Bridge Safi', sub: 'Accès rapide depuis votre écran d\.accueil', btn: 'Installer', ios: 'Appuyez sur', iosThen: 'puis "Sur l\.écran d\.accueil"', later: 'Plus tard' },
  en: { title: 'Install Bridge Safi', sub: 'Quick access from your home screen', btn: 'Install', ios: 'Tap', iosThen: 'then "Add to Home Screen"', later: 'Later' },
  ar: { title: 'تثبيت Bridge Safi', sub: 'وصول سريع من شاشتك الرئيسية', btn: 'تثبيت', ios: 'اضغط على', iosThen: 'ثم "إضافة إلى الشاشة الرئيسية"', later: 'لاحقاً' },
  amz: { title: 'Aẓẓl Bridge Safi', sub: 'Anefrar usrid seg umagrad', btn: 'Aẓẓl', ios: 'Smḍl', iosThen: 'akd "Qqen i tafyirt"', later: 'Zdat' },
};

function PWAInstallBanner({ lang }: { lang: Lang }) {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const deferredPrompt = useRef<any>(null);
  const l = PWA_LABELS[lang];

  useEffect(() => {
    // Already installed → don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Already dismissed → don't show
    if (localStorage.getItem(PWA_DISMISSED_KEY)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS: show after 4s (no beforeinstallprompt on Safari)
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(PWA_DISMISSED_KEY, '1'); } catch {}
  };

  const install = async () => {
    if (isIOS) { setShowIOSGuide(true); return; }
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') dismiss();
    deferredPrompt.current = null;
  };

  if (!show) return null;
  const isAR = lang === 'ar';

  return (
    <div className="modal-overlay fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
      <div
        className="modal-sheet pointer-events-auto w-full max-w-md mx-auto mb-0 rounded-t-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg,#064E3B 0%,#065F46 60%,#047857 100%)',
          boxShadow: '0 -16px 60px rgba(6,95,70,0.55)',
          border: '1.5px solid rgba(52,211,153,0.35)',
          borderBottom: 'none',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 36, height: 4, borderRadius: 9, background: 'rgba(255,255,255,0.25)' }} />
        </div>

        <div className={`px-5 pb-6 pt-2 ${isAR ? 'rtl' : 'ltr'}`}>
          {!showIOSGuide ? (
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(217,197,160,0.5)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                <img src="/logo_bridge_512.png" alt="Bridge" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm leading-tight truncate">{l.title}</p>
                <p className="text-white/70 text-xs mt-0.5 leading-tight">{l.sub}</p>
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={install}
                  className="font-black text-xs px-4 py-2 rounded-2xl transition-all active:scale-95"
                  style={{ background: '#D9C5A0', color: '#065F46', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
                >
                  {l.btn}
                </button>
                <button
                  onClick={dismiss}
                  className="font-black text-xs px-3 py-2 rounded-2xl transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            /* iOS guide */
            <div className="text-center py-2">
              <p className="text-white font-black text-sm mb-3">{l.title}</p>
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                <span className="text-white/80 text-xs">{l.ios}</span>
                <span className="text-2xl">⎋</span>
                <span className="text-white/80 text-xs">{l.iosThen}</span>
              </div>
              <div className="flex gap-2 justify-center">
                <span className="text-3xl">➕</span>
              </div>
              <button
                onClick={dismiss}
                className="mt-4 font-bold text-xs px-6 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
              >
                {l.later}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WAButton() {
  const msg = encodeURIComponent('Bonjour Bridge Safi, j\.ai besoin d\.aide 🙏');
  return (
    <a
      href={`https://wa.me/212764794856?text=${msg}`}
      target="_blank" rel="noopener noreferrer"
      title="Support WhatsApp"
      style={{
        position:'fixed',bottom:88,right:16,zIndex:60,
        width:46,height:46,borderRadius:'50%',
        background:'#25D366',
        boxShadow:'0 4px 16px rgba(37,211,102,0.45)',
        display:'flex',alignItems:'center',justifyContent:'center',
        transition:'transform 0.15s',
        textDecoration:'none',
      }}
      onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.12)')}
      onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.124 1.532 5.859L.036 23.671l5.979-1.567A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    </a>
  );
}

// ─── TAXI TRACKING MAP ─────────────────────────────────────────────────────────

function TaxiTrackingMap({driverPos,clientPos}:{driverPos:{lat:number;lng:number}|null;clientPos:{lat:number;lng:number}|null}) {
  const center = driverPos ?? clientPos ?? {lat:32.2994,lng:-9.2372};
  const taxiIcon = L.divIcon({className:'',html:'<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">🚖</div>',iconSize:[34,34],iconAnchor:[17,17]});
  const clientIcon = L.divIcon({className:'',html:'<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📍</div>',iconSize:[30,30],iconAnchor:[15,30]});
  function Recenter({pos}:{pos:{lat:number;lng:number}}) {
    const map=useMap();
    useEffect(()=>{ map.setView([pos.lat,pos.lng],15); },[pos.lat,pos.lng]);
    return null;
  }
  return (
    <MapContainer center={[center.lat,center.lng]} zoom={15} style={{width:'100%',height:'100%',borderRadius:0}} zoomControl={false} attributionControl={false}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
      {driverPos&&<><Marker position={[driverPos.lat,driverPos.lng]} icon={taxiIcon}/><Recenter pos={driverPos}/></>}
      {clientPos&&<Marker position={[clientPos.lat,clientPos.lng]} icon={clientIcon}/>}
    </MapContainer>
  );
}

// ─── TAXI PAGE ────────────────────────────────────────────────────────────────

// ─── SHARK DIAMOND WIDGET ────────────────────────────────────────────────────
function SharkDiamondWidget({onNavigate,profile}:{onNavigate:()=>void;profile:UserProfile}) {
  const {user}=useUser();
  const getAuthHeaders=useAuthHeaders();
  const cacheKey=`bridge_diamonds_cache_${user?.id||'anon'}`;
  // Initialise from user-specific localStorage cache for instant display, then confirm with server
  const [gems,setGems]=useState<number>(()=>{
    try{return parseInt(localStorage.getItem(`bridge_diamonds_cache_${user?.id||'anon'}`)||'0',10)||0;}catch{return 0;}
  });
  const bridgeId=getBridgeId(profile.phone, profile.name);
  const avatarSrc=profile.avatar||user?.imageUrl||null;

  // Fetch authoritative count from server — always override local cache for this user
  useEffect(()=>{
    if(!user?.id) return;
    getAuthHeaders().then(h=>fetch('/api/game/diamonds',{credentials:'include',headers:h})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(d&&typeof d.diamonds==='number'){
          setGems(d.diamonds);
          try{localStorage.setItem(cacheKey,String(d.diamonds));}catch{}
        }
      })
      .catch(()=>{}));
  },[user?.id,getAuthHeaders,cacheKey]);

  // Listen for real-time updates from the game (via storage event dispatched in GameIframe)
  useEffect(()=>{
    const onStorage=(e:StorageEvent)=>{
      if(e.key===cacheKey&&e.newValue){
        const n=parseInt(e.newValue,10);
        if(!isNaN(n)&&n>=0) setGems(n);
      }
    };
    window.addEventListener('storage',onStorage);
    return()=>window.removeEventListener('storage',onStorage);
  },[cacheKey]);
  return(
    <button onClick={onNavigate} title={`${bridgeId} — Bridge Game`}
      style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'2px 4px',borderRadius:12}}>
      <div style={{width:32,height:32,borderRadius:'50%',overflow:'hidden',border:'2px solid #D9C5A0',boxShadow:'0 2px 10px rgba(6,95,70,0.35)',background:'#F0EBE1',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {avatarSrc
          ?<img src={avatarSrc} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          :<span style={{fontSize:14}}>👤</span>
        }
      </div>
      <div style={{display:'flex',alignItems:'center',gap:2,background:'rgba(254,252,232,0.95)',border:'1px solid #FDE047',borderRadius:8,padding:'1px 5px'}}>
        <span style={{fontSize:9}}>💎</span>
        <span style={{fontSize:8,fontWeight:900,color:'#92400E'}}>{gems.toLocaleString()}</span>
      </div>
      <span style={{fontSize:7,fontWeight:900,color:'#065F46',letterSpacing:'0.08em',opacity:0.8}}>{bridgeId}</span>
    </button>
  );
}

function TaxiPage({onBack,lang,cycleLang,profile,saveProfile}:{
  onBack:()=>void; lang:Lang; cycleLang:()=>void;
  profile:UserProfile; saveProfile:(p:UserProfile)=>void;
}) {
  const [showProfile,setShowProfile]=useState(false);
  const [activeTab,setActiveTab]=useState<0|1>(0);
  const isAR=lang==='ar'; const isAMZ=lang==='amz'; const fClass=fontClass(lang);
  const pillStyle:React.CSSProperties={
    background:'var(--c-card)',border:'2.5px solid #D9C5A0',color:'#065F46',
    boxShadow:'0 4px 20px rgba(6,95,70,0.15)',height:'44px',minWidth:'44px',
  };
  const LANG_LABELS:Record<Lang,string>={fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};

  // ── Booking form state ──
  const [name,setName]=useState(profile.name??'');
  const [phone,setPhone]=useState(profile.phone??'');
  const [destination,setDestination]=useState('');
  const [clientPos,setClientPos]=useState<{lat:number;lng:number}|null>(null);
  const [clientAddress,setClientAddress]=useState(profile.address??'');
  const [gettingGPS,setGettingGPS]=useState(false);
  const [sending,setSending]=useState(false);
  const [bookingRef,setBookingRef]=useState<string>(()=>{
    try{return localStorage.getItem('bridge_taxi_ref')||'';}catch{return '';}
  });
  const [formErr,setFormErr]=useState('');
  const [taxiPayMethod,setTaxiPayMethod]=useState<PayMethodType>(null);
  const [showTaxiQR,setShowTaxiQR]=useState(false);
  const {user:taxiUser}=useUser();
  const getAuthHeaders=useAuthHeaders();
  const [,navigateTaxi]=useLocation();
  const [taxiGems,setTaxiGems]=useState(0);
  const [taxiGemMAD,setTaxiGemMAD]=useState(0);
  const maxTaxiGemMAD=Math.floor(taxiGems/200);
  useEffect(()=>{
    if(!taxiUser?.id) return;
    getAuthHeaders().then(h=>fetch('/api/game/diamonds',{credentials:'include',headers:h})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d&&typeof d.diamonds==='number')setTaxiGems(d.diamonds);})
      .catch(()=>{}));
  },[taxiUser?.id,getAuthHeaders]);

  // ── Tracking state ──
  const [trackData,setTrackData]=useState<{found:boolean;lat?:number;lng?:number;status?:string;driverName?:string;eta?:number;clientLat?:number;clientLng?:number}|null>(null);
  const trackIntervalRef=useRef<number|null>(null);

  const getClientGPS=()=>{
    if(!navigator.geolocation){setClientAddress('GPS non disponible');return;}
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(async pos=>{
      const {latitude:lat,longitude:lng}=pos.coords;
      setClientPos({lat,lng});
      setGettingGPS(false);
      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const d=await r.json();
        setClientAddress(d.display_name?.split(',').slice(0,3).join(', ')||`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }catch{setClientAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);}
    },()=>{setGettingGPS(false);setClientAddress('Saisissez votre adresse manuellement');},{enableHighAccuracy:true,timeout:8000});
  };

  const handleTaxiWalletPay=async(type:'apple'|'google')=>{
    if(!name.trim()||!phone.trim()||!destination.trim()){setFormErr('*');return;}
    const payLabel=type==='apple'?'Apple Pay':'Google Pay';
    const methods=type==='apple'
      ?[{supportedMethods:'https://apple.com/apple-pay',data:{version:3,merchantIdentifier:'merchant.ma.safi-bridge',merchantCapabilities:['supports3DS'],supportedNetworks:['visa','masterCard'],countryCode:'MA'}}]
      :[{supportedMethods:'https://google.com/pay',data:{apiVersion:2,apiVersionMinor:0,merchantInfo:{merchantName:'Bridge Safi'},allowedPaymentMethods:[{type:'CARD',parameters:{allowedAuthMethods:['PAN_ONLY','CRYPTOGRAM_3DS'],allowedCardNetworks:['MASTERCARD','VISA']},tokenizationSpecification:{type:'PAYMENT_GATEWAY',parameters:{gateway:'example',gatewayMerchantId:'bridge-safi'}}}]}}];
    const details={total:{label:'Bridge Taxi · Safi',amount:{currency:'MAD',value:'0'}}};
    try{
      if(typeof PaymentRequest==='undefined') throw new Error('unsupported');
      const pr=new PaymentRequest(methods,details);
      const canMake=await pr.canMakePayment().catch(()=>false);
      if(!canMake) throw new Error('unavailable');
      const response=await pr.show();
      await response.complete('success');
      setTaxiPayMethod(type);
      await handleBook(payLabel);
    }catch{setTaxiPayMethod('cash');}
  };

  const handleBook=async(payLabel?:string)=>{
    if(!name.trim()||!phone.trim()||!destination.trim()){setFormErr('*');return;}
    setSending(true); setFormErr('');
    const ref='TC-'+Math.floor(1000+Math.random()*9000);
    const driverTrackUrl=`${window.location.origin}/driver/${ref}`;
    const pickup=clientAddress||'Safi, Maroc';
    const payInfo=payLabel?payLabel:taxiPayMethod==='qr'?'QR Code':taxiPayMethod==='cash'?'Espèces':taxiPayMethod==='apple'?'Apple Pay':taxiPayMethod==='google'?'Google Pay':'À définir';
    try{
      await fetch(`/api/tracking/${ref}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({clientLat:clientPos?.lat,clientLng:clientPos?.lng,clientAddress:pickup,destination:destination.trim(),customerName:name.trim(),customerPhone:phone.trim()}),
      }).catch(()=>{});
      await fetch(`${DRIVER_APP_URL}/api/deliveries`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          trackingNumber:ref,
          customerName:name.trim(),
          customerPhone:phone.trim(),
          pickupAddress:pickup,
          deliveryAddress:destination.trim(),
          priority:'urgent',
          notes:`🚖 BRIDGE TAXI\.📍 Départ: ${pickup}\.🏁 Destination: ${destination.trim()}\.👤 ${name.trim()} — ${phone.trim()}\.💳 Paiement: ${payInfo}\.🔗 GPS: ${driverTrackUrl}`,
          driverTrackUrl,
          type:'taxi',
        }),
      }).catch(()=>{});
    }finally{setSending(false);}
    if(taxiGemMAD>0){getAuthHeaders().then(h=>fetch('/api/game/diamonds/spend',{method:'POST',credentials:'include',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({spend:taxiGemMAD*200})}).then(r=>r.ok?r.json():null).then(d=>{if(d&&typeof d.diamonds==='number'){const ck=`bridge_diamonds_cache_${taxiUser?.id||'anon'}`;try{localStorage.setItem(ck,String(d.diamonds));}catch{}window.dispatchEvent(new StorageEvent('storage',{key:ck,newValue:String(d.diamonds)}));}}).catch(()=>{}));}
    localStorage.setItem('bridge_taxi_ref',ref);
    setBookingRef(ref);
    if(taxiPayMethod==='qr') setShowTaxiQR(true);
    else setActiveTab(1);
  };

  // Poll tracking when on suivi tab
  useEffect(()=>{
    if(activeTab!==1||!bookingRef) return;
    const poll=async()=>{
      try{
        const r=await fetch(`/api/tracking/${bookingRef}`);
        if(r.ok){const d=await r.json();setTrackData(d);}
        else setTrackData({found:false});
      }catch{setTrackData(null);}
    };
    poll();
    trackIntervalRef.current=window.setInterval(poll,3000);
    return()=>{if(trackIntervalRef.current)clearInterval(trackIntervalRef.current);};
  },[activeTab,bookingRef]);

  const driverPos=(trackData?.found&&trackData.lat&&trackData.lng&&trackData.status==='accepted')?{lat:trackData.lat,lng:trackData.lng}:null;
  const mapClientPos=trackData?.clientLat&&trackData?.clientLng?{lat:trackData.clientLat,lng:trackData.clientLng}:clientPos;

  const statusColor={waiting:'#F59E0B',accepted:'#10B981',arrived:'#3B82F6'}[trackData?.status||'waiting']||'#9CA3AF';
  const statusLabel={
    waiting:{fr:'En attente d\.un chauffeur…',en:'Waiting for a driver…',ar:'بانتظار سائق…',amz:'ⵔⴰⴷ ⵢⴰⵙ ⵓⵙⵔⴰⵜⵏ…'},
    accepted:{fr:'Chauffeur en route 🚖',en:'Driver on the way 🚖',ar:'السائق في الطريق 🚖',amz:'ⴰⵎⴰⵏ ⵖ ⵓⵣⵣⵓⵍ 🚖'},
    arrived:{fr:'Votre chauffeur est arrivé ! 🎉',en:'Your driver has arrived! 🎉',ar:'وصل سائقك! 🎉',amz:'ⵢⵓⵙ ⵓⵙⵔⴰⵜⵏ ⵉⵏⴽ! 🎉'},
  }[trackData?.status||'']?.[lang]||'';

  const navItems=[
    {label:{fr:'Réserver',en:'Book',ar:'احجز',amz:'ⵙⵖⵏ'},icon:'🚖'},
    {label:{fr:'Suivi',en:'Track',ar:'تتبع',amz:'ⴰⵙⴽⵍⵙ'},icon:'📍'},
  ];



  const inputStyle:React.CSSProperties={
    width:'100%',borderRadius:12,border:'1.5px solid var(--c-border)',padding:'12px 14px',
    fontSize:14,fontFamily:'system-ui,sans-serif',background:'var(--c-bg)',color:'var(--c-text)',
    outline:'none',boxSizing:'border-box' as const,
  };
  const labelStyle:React.CSSProperties={fontSize:11,fontWeight:800,letterSpacing:'0.12em',color:'#78350F',textTransform:'uppercase',marginBottom:4,display:'block'};

  return(
    <div className={`min-h-screen overflow-x-hidden ${isAR?'rtl':'ltr'}`} style={{background:'var(--c-bg)',color:'var(--c-text)'}}>
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'url(/image_1.png)',backgroundSize:'cover',backgroundPosition:'center'}}/>

      {/* ── Top-left: back ── */}
      <div className={`fixed top-5 z-50 ${isAR?'right-5':'left-5'}`}>
        <button onClick={onBack}
          className="flex items-center gap-0.5 px-1.5 rounded-full transition-all active:scale-90 hover:scale-110"
          style={{...pillStyle,height:'24px',minWidth:'unset'}}>
          <span style={{fontSize:'9px',lineHeight:1}}>🛵</span>
          <span style={{fontSize:'8px',color:'#D9C5A0',fontWeight:900}}>|</span>
          <span style={{fontSize:'9px',lineHeight:1}}>🚬</span>
          <span style={{fontSize:'8px',color:'#D9C5A0',fontWeight:900}}>|</span>
          <span style={{fontSize:'9px',lineHeight:1}}>🌹</span>
          <span style={{fontSize:'8px',lineHeight:1,color:'#9CA3AF'}}>←</span>
        </button>
      </div>

      {/* ── Top-right: profile + lang ── */}
      <div className={`fixed top-5 z-50 flex items-center gap-2 ${isAR?'left-5':'right-5'}`}>
        <button onClick={()=>setShowProfile(true)}
          className="rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 hover:scale-110 relative"
          style={{...pillStyle,width:'44px',padding:0,overflow:'hidden'}}>
          {profile.avatar
            ?<img src={profile.avatar} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            :<span style={{fontSize:'18px'}}>👤</span>
          }
          {profile.name&&<span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style={{background:'#10B981'}}/>}
        </button>
        <button onClick={cycleLang}
          className={`rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 hover:scale-110 px-3 ${isAMZ?'font-tifinagh':''}`}
          style={{...pillStyle,fontSize:'13px'}}>
          {LANG_LABELS[lang]}
        </button>
        <SharkDiamondWidget onNavigate={()=>navigateTaxi('/game')} profile={profile}/>
        <DarkToggle/>
      </div>

      {/* ── Main Content ── */}
      <div className="relative flex flex-col pb-28 max-w-sm mx-auto w-full">

        {/* ── Tab bar ── */}
        <div className="flex border-b sticky top-0 z-30" style={{background:'var(--c-nav)',backdropFilter:'blur(12px)',borderColor:'#E5E1D8'}}>
          {navItems.map((tab,i)=>(
            <button key={i} onClick={()=>setActiveTab(i as 0|1)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${isAMZ?'font-tifinagh':''}`}
              style={{borderBottom:activeTab===i?'2.5px solid #78350F':'2.5px solid transparent',color:activeTab===i?'#78350F':'#9CA3AF'}}>
              <span className="text-lg">{tab.icon}</span>
              <span style={{fontSize:10,fontWeight:900,letterSpacing:'0.1em',textTransform:'uppercase'}}>{tab.label[lang]}</span>
            </button>
          ))}
        </div>

        {/* ── TAB 0: Réserver ── */}
        {activeTab===0&&(
          <div className="px-5 pt-5 flex flex-col gap-4">
            <div style={{background:'linear-gradient(135deg,#78350F,#92400E)',borderRadius:20,padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:32}}>🚖</span>
              <div>
                <p style={{color:'#FDE68A',fontSize:13,fontWeight:900,letterSpacing:'0.1em'}}>BRIDGE TAXI LUXE</p>
                <p style={{color:'rgba(253,230,138,0.7)',fontSize:11}}>Réservation instantanée · Safi</p>
              </div>
            </div>

            {/* Pickup GPS */}
            <div>
              <AddressAutocomplete
                label={`📍 ${lang==='ar'?'نقطة الانطلاق':lang==='amz'?'ⴰⵙⵔⵓ':lang==='en'?'Pickup location':'Point de départ'}`}
                value={clientAddress}
                onChange={setClientAddress}
                placeholder={lang==='ar'?'Rechercher une adresse à Safi':lang==='en'?'Search an address in Safi':'Rechercher une adresse à Safi'}
                lang={lang}/>
              <button onClick={getClientGPS}
                className="w-full rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 mb-1"
                style={{background:'#78350F',color:'white',border:'none',padding:'9px 14px',fontSize:12,fontWeight:900,cursor:'pointer',marginTop:-8}}>
                {gettingGPS
                  ?<><span style={{fontSize:13,animation:'spin 1s linear infinite'}}>⟳</span>{lang==='ar'?'يتم التحديد…':lang==='en'?'Detecting…':'Détection GPS…'}</>
                  :<><span style={{fontSize:16}}>🎯</span>{lang==='ar'?'تحديد موقعي':lang==='en'?'Detect my location':'Détecter ma position GPS'}</>
                }
              </button>
              {clientPos&&<p style={{fontSize:10,color:'#10B981',marginTop:2,fontWeight:700}}>✓ GPS · {clientPos.lat.toFixed(4)}, {clientPos.lng.toFixed(4)}</p>}
            </div>

            {/* Destination */}
            <div>
              <AddressAutocomplete
                label={`🏁 ${lang==='ar'?'الوجهة':lang==='amz'?'ⴰⵎⵎⴰⵙ':lang==='en'?'Destination':'Destination'}`}
                value={destination}
                onChange={setDestination}
                placeholder={lang==='ar'?'وجهتك (أي مكان بالمغرب)':lang==='en'?'Where to? (anywhere in Morocco)':'Destination (partout au Maroc)'}
                lang={lang}
                nationwide/>
            </div>

            {/* Name */}
            <div>
              <label style={labelStyle}>👤 {lang==='ar'?'الاسم':lang==='amz'?'ⵉⵙⵎ':lang==='en'?'Your name':'Votre nom'}</label>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder={lang==='ar'?'اسمك':lang==='en'?'Full name':'Nom complet'}
                style={inputStyle}/>
            </div>

            {/* Phone */}
            <div>
              <label style={labelStyle}>📞 {lang==='ar'?'الهاتف':lang==='amz'?'ⵜⵉⵍⵉⴼⵓⵏ':lang==='en'?'Phone':'Téléphone'}</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel"
                placeholder="+212 6XX XXX XXX"
                style={inputStyle}/>
            </div>

            {formErr&&<p style={{color:'#DC2626',fontSize:12,fontWeight:700}}>
              {lang==='ar'?'يرجى ملء جميع الحقول':lang==='en'?'Please fill all fields':'Veuillez remplir tous les champs'}
            </p>}

            {/* 💎 Diamond reduction — Taxi */}
            {maxTaxiGemMAD>0&&(
              <div className="rounded-2xl p-4" style={{background:'#FEFCE8',border:'1.5px solid #FDE047'}}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{color:'#92400E'}}>
                  💎 {lang==='ar'?'خصم بالماسات':lang==='en'?'Diamond discount':lang==='amz'?'ⵙⵙⵎⵔⵙ ⵉⵎⴰⵙⵙⵏ':'Réduction Diamants'}
                </p>
                <p className="text-xs mb-2" style={{color:'#78350F',fontWeight:600}}>
                  {taxiGems.toLocaleString()} 💎 = {maxTaxiGemMAD} MAD {lang==='ar'?'متاح':lang==='en'?'available':'disponible'}
                </p>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={maxTaxiGemMAD} value={taxiGemMAD}
                    onChange={e=>setTaxiGemMAD(Number(e.target.value))}
                    className="flex-1" style={{accentColor:'#F59E0B'}}/>
                  <span className="font-black text-sm" style={{color:'#065F46',minWidth:52}}>-{taxiGemMAD} MAD</span>
                </div>
              </div>
            )}
            {/* ── Mode de paiement ── */}
            <div className="rounded-2xl p-4" style={{background:'var(--c-card)',border:'1.5px solid var(--c-border)'}}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${lang==='amz'?'font-tifinagh':''}`} style={{color:'#78350F'}}>
                💳 {lang==='ar'?'طريقة الدفع':lang==='en'?'Payment method':lang==='amz'?'ⴰⵣⵔⴼ':'Mode de paiement'}
              </p>
              <SharedPaymentOptions
                lang={lang} selected={taxiPayMethod}
                onSelect={setTaxiPayMethod} showCash showCard={false}
                onWalletPay={handleTaxiWalletPay}
              />
            </div>

            <button onClick={()=>{
                if(!taxiPayMethod){setFormErr('*pay');return;}
                if(taxiPayMethod==='qr'){handleBook();}
                else handleBook();
              }} disabled={sending}
              className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{background:sending?'#9CA3AF':'linear-gradient(135deg,#78350F,#F59E0B)',boxShadow:sending?'none':'0 6px 20px rgba(120,53,15,0.4)',cursor:sending?'wait':'pointer',border:'none',fontSize:15}}>
              {sending?'⏳ Envoi…':'🚖 '+(lang==='ar'?'احجز الآن':lang==='amz'?'ⵙⵖⵏ':lang==='en'?'Book Now':'Réserver maintenant')}
            </button>
            {showTaxiQR&&<QRPayModal lang={lang} onClose={()=>{setShowTaxiQR(false);setActiveTab(1);}} onConfirm={()=>{setShowTaxiQR(false);setActiveTab(1);}}/>}

            {bookingRef&&(
              <div style={{background:'#D1FAE5',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>✅</span>
                <div>
                  <p style={{fontSize:12,fontWeight:900,color:'#065F46'}}>Course #{bookingRef}</p>
                  <p style={{fontSize:11,color:'#059669'}}>
                    {lang==='ar'?'انتقل إلى تتبع مباشر':lang==='en'?'Switch to Live Track':'Suivez votre chauffeur →'}
                  </p>
                </div>
                <button onClick={()=>setActiveTab(1)} style={{marginLeft:'auto',background:'#059669',color:'white',border:'none',borderRadius:10,padding:'6px 12px',fontSize:12,fontWeight:900,cursor:'pointer'}}>📍</button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 1: Suivi ── */}
        {activeTab===1&&(
          <div className="flex flex-col">
            {!bookingRef?(
              <div style={{padding:'40px 20px',textAlign:'center'}}>
                <p style={{fontSize:40,marginBottom:12}}>🚖</p>
                <p style={{fontWeight:900,color:'#78350F',marginBottom:6}}>
                  {lang==='ar'?'لا يوجد حجز':lang==='en'?'No booking yet':'Aucune réservation'}
                </p>
                <p style={{fontSize:12,color:'#9CA3AF',marginBottom:20}}>
                  {lang==='ar'?'احجز أولاً لتتبع سيارتك':lang==='en'?'Book first to track your taxi':'Réservez d\.abord pour suivre votre taxi'}
                </p>
                <button onClick={()=>setActiveTab(0)} style={{background:'#78350F',color:'white',border:'none',borderRadius:12,padding:'10px 24px',fontWeight:900,cursor:'pointer'}}>
                  🚖 {lang==='ar'?'احجز الآن':lang==='en'?'Book Now':'Réserver'}
                </button>
              </div>
            ):(
              <>
                {/* Status card */}
                <div style={{margin:'16px 20px 0',background:'var(--c-card)',borderRadius:16,padding:'14px 16px',boxShadow:'0 2px 16px rgba(0,0,0,0.08)',border:`2px solid ${statusColor}20`}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:statusColor,flexShrink:0,animation:'pulse 1.5s infinite'}}/>
                    <p style={{fontWeight:900,color:statusColor,fontSize:13}}>
                      {statusLabel||{fr:'En attente…',en:'Waiting…',ar:'في الانتظار…',amz:'ⵔⴰⴷ…'}[lang]}
                    </p>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <p style={{fontSize:11,color:'#9CA3AF'}}>Réf: <strong style={{color:'var(--c-text)'}}>{bookingRef}</strong></p>
                    {trackData?.driverName&&<p style={{fontSize:11,color:'#065F46',fontWeight:700}}>🚗 {trackData.driverName}</p>}
                    {trackData?.eta&&<p style={{fontSize:11,color:'#78350F',fontWeight:900}}>⏱ {trackData.eta} min</p>}
                  </div>
                  {trackData?.status==='arrived'&&(
                    <div style={{marginTop:10,background:'#EFF6FF',borderRadius:10,padding:'8px 12px',textAlign:'center'}}>
                      <p style={{fontWeight:900,color:'#1D4ED8',fontSize:13}}>🎉 {lang==='ar'?'وصل سائقك!':lang==='en'?'Driver arrived!':'Votre chauffeur est là !'}</p>
                    </div>
                  )}
                </div>

                {/* Live map */}
                <div style={{margin:'12px 20px',borderRadius:20,overflow:'hidden',height:420,boxShadow:'0 4px 24px rgba(0,0,0,0.12)',position:'relative'}}>
                  <TaxiTrackingMap driverPos={driverPos} clientPos={mapClientPos}/>
                  {/* Overlay badge */}
                  <div style={{position:'absolute',top:10,left:10,background:'rgba(13,17,23,0.85)',backdropFilter:'blur(8px)',borderRadius:12,padding:'4px 10px',display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:statusColor,animation:'pulse 1.2s infinite'}}/>
                    <span style={{color:'#FDE68A',fontSize:9,fontWeight:900,letterSpacing:'0.12em'}}>🚖 LIVE GPS</span>
                  </div>
                  {!driverPos&&trackData?.status!=='accepted'&&(
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(13,17,23,0.5)',backdropFilter:'blur(4px)'}}>
                      <div style={{textAlign:'center',padding:20}}>
                        <p style={{fontSize:36,marginBottom:8}}>🔍</p>
                        <p style={{color:'#FDE68A',fontWeight:900,fontSize:13}}>
                          {lang==='ar'?'نبحث عن سائق':lang==='en'?'Finding your driver…':'Recherche d\.un chauffeur…'}
                        </p>
                        <p style={{color:'rgba(255,255,255,0.5)',fontSize:11,marginTop:4}}>Mise à jour toutes les 3s</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cancel / refresh */}
                <div style={{display:'flex',gap:10,padding:'0 20px 8px'}}>
                  <button onClick={()=>{setBookingRef('');localStorage.removeItem('bridge_taxi_ref');setActiveTab(0);}}
                    style={{flex:1,background:'#FEE2E2',color:'#DC2626',border:'none',borderRadius:12,padding:'10px 0',fontWeight:900,fontSize:12,cursor:'pointer'}}>
                    ✕ {lang==='ar'?'إلغاء':lang==='en'?'Cancel':'Annuler'}
                  </button>
                  <button onClick={()=>{if(trackIntervalRef.current)clearInterval(trackIntervalRef.current);setActiveTab(1);}}
                    style={{flex:1,background:'#D1FAE5',color:'#065F46',border:'none',borderRadius:12,padding:'10px 0',fontWeight:900,fontSize:12,cursor:'pointer'}}>
                    ↺ {lang==='ar'?'تحديث':lang==='en'?'Refresh':'Actualiser'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Bottom nav (hidden on TV/large screens) ── */}
      <nav className="tv-hide-on-tv fixed bottom-0 inset-x-0 z-40"
        style={{background:'var(--c-nav)',backdropFilter:'blur(20px)',borderTop:'1px solid var(--c-border)'}}>
        <div className="max-w-md mx-auto flex">
          {navItems.map((tab,i)=>(
            <button key={i} onClick={()=>setActiveTab(i as 0|1)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-90 ${isAMZ?'font-tifinagh':''}`}
              style={{color:activeTab===i?'#78350F':'#9CA3AF'}}>
              <span className="text-xl">{tab.icon}</span>
              <span style={{fontSize:10,fontWeight:900,letterSpacing:'0.1em',textTransform:'uppercase'}}>{tab.label[lang]}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-[9px] pb-2" style={{color:'#C9BFB2'}}>© 2026 Bridge Safi · safi-bridge.ma</p>
      </nav>

      <WAButton/>
      {showProfile&&<ProfileModal lang={lang} profile={profile} onSave={saveProfile} onClose={()=>setShowProfile(false)}/>}
    </div>
  );
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────

// ─── PROFILE ONBOARDING SCREEN ────────────────────────────────────────────────

function ProfileOnboardingScreen({lang,profile,saveProfile,onDone}:{
  lang:Lang; profile:UserProfile;
  saveProfile:(p:UserProfile)=>void; onDone:()=>void;
}) {
  const t=T[lang]; const fClass=fontClass(lang); const isAR=lang==='ar';
  const [phone,setPhone]=useState(profile.phone||'');
  const [address,setAddress]=useState(profile.address||'');
  const completedCount=[phone,address].filter(Boolean).length;
  const total=2;
  const getAuthHeaders=useAuthHeaders();

  const handleSave=async()=>{
    const updated={...profile,phone,address,onboardingComplete:true};
    saveProfile(updated);
    try{
      const h=await getAuthHeaders();
      await fetch('/api/profile/sync',{
        method:'POST',credentials:'include',
        headers:{...h,'Content-Type':'application/json'},
        body:JSON.stringify({phone:phone.trim(),name:profile.name.trim(),address:address.trim()}),
      });
    }catch{}
    onDone();
  };
  const handleSkip=()=>{
    saveProfile({...profile,onboardingComplete:true});
    onDone();
  };

  return (
    <div className={`min-h-screen flex flex-col ${isAR?'rtl':'ltr'}`}
      style={{background:'linear-gradient(160deg,#011c15 0%,#054130 30%,#065F46 60%,#033d2c 100%)'}}>

      {/* Background zellige pattern */}
      <div style={{position:'fixed',inset:0,opacity:0.04,
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D9C5A0'%3E%3Cpath d='M30 0L0 30L30 60L60 30L30 0zm0 10L50 30L30 50L10 30L30 10z'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize:'60px 60px',pointerEvents:'none'}}/>

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-5">
        <div style={{width:68,height:68,borderRadius:'50%',overflow:'hidden',
          border:'3px solid #D9C5A0',
          boxShadow:'0 0 0 6px rgba(217,197,160,0.12),0 12px 40px rgba(0,0,0,0.4)',
          marginBottom:14}}>
          <img src="/logo_splash_new.png" alt="Bridge" style={{width:'100%',height:'100%',objectFit:'cover',transform:'scale(1.2)'}}/>
        </div>
        <h2 className={`font-black text-white text-2xl tracking-tight ${fClass}`} style={{margin:0}}>{t.onboardTitle}</h2>
        <p className={`text-xs mt-1 ${fClass}`} style={{color:'rgba(217,197,160,0.8)'}}>{t.onboardSub}</p>

        {/* Progress bar */}
        <div style={{display:'flex',gap:8,marginTop:18,alignItems:'center'}}>
          {Array.from({length:total},(_,i)=>(
            <div key={i} style={{
              width:i<completedCount?32:10,height:8,borderRadius:4,
              background:i<completedCount?'#D9C5A0':'rgba(255,255,255,0.15)',
              transition:'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }}/>
          ))}
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.58rem',marginLeft:4,fontWeight:700}}>
            {completedCount}/{total}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="relative z-10 flex-1 px-4 pb-8" style={{maxWidth:460,margin:'0 auto',width:'100%'}}>
        <div style={{
          background:'var(--c-bg)',border:'2px solid #E5E1D8',borderRadius:20,padding:16,marginBottom:14,
          boxShadow:'0 6px 24px rgba(6,95,70,0.08)'
        }}>
          <Field label={t.onboardPhone} value={phone} onChange={setPhone}
            placeholder="06 00 00 00 00" type="tel" lang={lang}/>
        </div>

        <div style={{
          background:'var(--c-bg)',border:'2px solid #E5E1D8',borderRadius:20,padding:16,marginBottom:14,
          boxShadow:'0 6px 24px rgba(6,95,70,0.08)'
        }}>
          <AddressAutocomplete label={t.onboardAddr} value={address} onChange={setAddress}
            placeholder="Ex: Plateau, Av. Hassan II, Safi" lang={lang}/>
        </div>

        <div style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(217,197,160,0.2)',borderRadius:16,padding:'14px 16px',marginBottom:16,display:'flex',gap:12,alignItems:'center'}}>
          <div style={{fontSize:22,flexShrink:0}}>💳 🪪</div>
          <div>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.72rem',margin:0,fontWeight:700}}>
              Carte & identité dans votre profil
            </p>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:'0.62rem',margin:'3px 0 0'}}>
              Ajoutez-les plus tard depuis l’icône 👤
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <button onClick={handleSave}
          className={`w-full font-black text-sm tracking-wider ${fClass}`}
          style={{height:54,borderRadius:18,
            background:completedCount===total
              ?'linear-gradient(135deg,#D9C5A0,#C9B48C)'
              :'rgba(217,197,160,0.35)',
            color:completedCount===total?'#1A2F23':'rgba(255,255,255,0.6)',
            border:`2px solid ${completedCount===total?'transparent':'rgba(217,197,160,0.3)'}`,
            cursor:'pointer',
            boxShadow:completedCount===total?'0 8px 32px rgba(217,197,160,0.3)':'none',
            transition:'all 0.3s',marginBottom:10}}>
          {completedCount===total?`✓ ${t.onboardSave}`:`${t.onboardSave} (${completedCount}/${total})`}
        </button>

      </div>
    </div>
  );
}

function SplashScreen() {
  const [progress,setProgress]=useState(0);
  const [phase,setPhase]=useState(0); // 0-3 cycling through services
  const services=[
    {icon:'🛵',label:'Bridge Eats',color:'#4ADE80'},
    {icon:'🚖',label:'Bridge Taxi',color:'#FDE047'},
    {icon:'🚬',label:'Bridge Tabac',color:'#FB923C'},
    {icon:'🌹',label:'Bridge Fleurs',color:'#F472B6'},
  ];
  useEffect(()=>{const iv=setInterval(()=>setProgress(p=>Math.min(p+1.6,100)),50);return()=>clearInterval(iv);},[]);
  useEffect(()=>{const iv=setInterval(()=>setPhase(p=>(p+1)%4),900);return()=>clearInterval(iv);},[]);
  const svc=services[phase];

  return (
    <div style={{position:'fixed',inset:0,zIndex:50,overflow:'hidden',
      background:'linear-gradient(160deg,#030712 0%,#020c07 40%,#0d1117 100%)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>

      <style>{`
        @keyframes splashRing1{0%,100%{transform:scale(1);opacity:0.5;}50%{transform:scale(1.15);opacity:0.15;}}
        @keyframes splashRing2{0%,100%{transform:scale(1);opacity:0.3;}50%{transform:scale(1.25);opacity:0.08;}}
        @keyframes splashRing3{0%,100%{transform:scale(1);opacity:0.15;}50%{transform:scale(1.35);opacity:0.04;}}
        @keyframes splashLogoFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
        @keyframes splashOrbit1{0%{transform:rotate(0deg) translateX(118px) rotate(0deg);}100%{transform:rotate(360deg) translateX(118px) rotate(-360deg);}}
        @keyframes splashOrbit2{0%{transform:rotate(90deg) translateX(118px) rotate(-90deg);}100%{transform:rotate(450deg) translateX(118px) rotate(-450deg);}}
        @keyframes splashOrbit3{0%{transform:rotate(180deg) translateX(118px) rotate(-180deg);}100%{transform:rotate(540deg) translateX(118px) rotate(-540deg);}}
        @keyframes splashOrbit4{0%{transform:rotate(270deg) translateX(118px) rotate(-270deg);}100%{transform:rotate(630deg) translateX(118px) rotate(-630deg);}}
        @keyframes splashLetterIn{0%{opacity:0;transform:translateY(24px);}100%{opacity:1;transform:translateY(0);}}
        @keyframes splashGlow{0%,100%{box-shadow:0 0 40px rgba(6,95,70,0.6),0 0 80px rgba(6,95,70,0.2);}50%{box-shadow:0 0 60px rgba(6,95,70,0.9),0 0 120px rgba(6,95,70,0.35),0 0 200px rgba(6,95,70,0.1);}}
        @keyframes splashBarShimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
        @keyframes splashServiceFade{0%{opacity:0;transform:translateY(6px);}20%,80%{opacity:1;transform:translateY(0);}100%{opacity:0;transform:translateY(-6px);}}
        @keyframes splashStarPulse{0%,100%{opacity:0.6;transform:scale(1);}50%{opacity:1;transform:scale(1.4);}}
        @keyframes splashMeshMove{0%{transform:translateX(0) translateY(0);}50%{transform:translateX(-20px) translateY(-10px);}100%{transform:translateX(0) translateY(0);}}
      `}</style>

      {/* Animated mesh background */}
      <div style={{position:'absolute',inset:0,opacity:0.06,animation:'splashMeshMove 8s ease-in-out infinite',
        backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.8) 1px,transparent 0)',
        backgroundSize:'32px 32px',pointerEvents:'none'}}/>

      {/* Ambient light blobs */}
      <div style={{position:'absolute',top:'15%',left:'10%',width:280,height:280,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(6,95,70,0.18) 0%,transparent 70%)',filter:'blur(40px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'20%',right:'5%',width:220,height:220,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(217,197,160,0.12) 0%,transparent 70%)',filter:'blur(50px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:'60%',left:'30%',width:160,height:160,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(74,222,128,0.08) 0%,transparent 70%)',filter:'blur(30px)',pointerEvents:'none'}}/>

      {/* Star particles */}
      {[[8,'12%','18%',0],[5,'85%','25%',0.4],[6,'20%','75%',0.8],[4,'75%','70%',0.2],[7,'50%','10%',0.6],[4,'35%','88%',1.1]].map(([s,l,t,d],i)=>(
        <div key={i} style={{position:'absolute',left:l as string,top:t as string,width:s as number,height:s as number,
          borderRadius:'50%',background:'rgba(255,255,255,0.7)',
          animation:`splashStarPulse ${1.5+Number(d)}s ease-in-out ${d}s infinite`}}/>
      ))}

      {/* Center content */}
      <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center'}}>

        {/* Logo + orbiting service icons */}
        <div style={{position:'relative',width:200,height:200,marginBottom:32}}>

          {/* Ring 3 — outermost */}
          <div style={{position:'absolute',inset:-44,borderRadius:'50%',border:'1px solid rgba(6,95,70,0.25)',
            animation:'splashRing3 3s ease-in-out infinite 0.6s'}}/>
          {/* Ring 2 */}
          <div style={{position:'absolute',inset:-22,borderRadius:'50%',border:'1px solid rgba(6,95,70,0.4)',
            animation:'splashRing2 3s ease-in-out infinite 0.3s'}}/>
          {/* Ring 1 — innermost */}
          <div style={{position:'absolute',inset:-8,borderRadius:'50%',border:'1.5px solid rgba(217,197,160,0.35)',
            animation:'splashRing1 3s ease-in-out infinite'}}/>

          {/* Orbiting service icons */}
          {[
            {icon:'🛵',anim:'splashOrbit1',delay:'0s'},
            {icon:'🚖',anim:'splashOrbit2',delay:'0s'},
            {icon:'🚬',anim:'splashOrbit3',delay:'0s'},
            {icon:'🌹',anim:'splashOrbit4',delay:'0s'},
          ].map((o,i)=>(
            <div key={i} style={{position:'absolute',top:'50%',left:'50%',width:0,height:0}}>
              <div style={{position:'absolute',transform:`rotate(${i*90}deg) translateX(118px) rotate(-${i*90}deg)`,
                animation:`${o.anim} 8s linear infinite ${o.delay}`,
                width:36,height:36,marginLeft:-18,marginTop:-18,
                background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',
                borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:16,backdropFilter:'blur(4px)'}}>
                {o.icon}
              </div>
            </div>
          ))}

          {/* Logo circle */}
          <div style={{position:'absolute',inset:0,borderRadius:'50%',overflow:'hidden',
            border:'3px solid #D9C5A0',
            animation:'splashLogoFloat 4s ease-in-out infinite, splashGlow 4s ease-in-out infinite'}}>
            <img src="/logo_splash_new.png" alt="Bridge"
              style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',transform:'scale(1.22)'}}/>
          </div>

          {/* Premium badge */}
          <div style={{position:'absolute',bottom:-10,left:'50%',transform:'translateX(-50%)',
            background:'linear-gradient(135deg,#065F46,#059669)',
            borderRadius:999,padding:'4px 12px',
            boxShadow:'0 4px 16px rgba(6,95,70,0.5)',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#4ADE80',boxShadow:'0 0 6px #4ADE80'}}/>
            <span style={{color:'#fff',fontSize:9,fontWeight:900,letterSpacing:'0.2em'}}>BRIDGE SAFI</span>
          </div>
        </div>

        {/* Brand letters with staggered animation */}
        <div style={{display:'flex',gap:6,marginBottom:10}}>
          {'BRIDGE'.split('').map((letter,i)=>(
            <span key={i} style={{
              fontSize:36,fontWeight:900,letterSpacing:2,
              color:'#fff',
              textShadow:'0 0 30px rgba(6,95,70,0.8)',
              animation:`splashLetterIn 0.5s ease-out ${i*0.07}s both`,
              display:'inline-block',
            }}>{letter}</span>
          ))}
        </div>

        {/* Location tags */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:24}}>
          {['SAFI','MAROC','آسفي','ⵙⴰⴼⵉ'].map((city,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:9,fontWeight:800,letterSpacing:'0.2em',color:'#D9C5A0'}}>{city}</span>
              {i<3 && <div style={{width:3,height:3,borderRadius:'50%',background:'#065F46'}}/>}
            </div>
          ))}
        </div>

        {/* Active service indicator */}
        <div key={phase} style={{
          display:'flex',alignItems:'center',gap:8,
          background:'rgba(255,255,255,0.04)',border:`1px solid ${svc.color}40`,
          borderRadius:999,padding:'6px 16px',marginBottom:28,
          animation:'splashServiceFade 0.9s ease-in-out both',
        }}>
          <span style={{fontSize:14}}>{svc.icon}</span>
          <span style={{color:svc.color,fontSize:11,fontWeight:800,letterSpacing:'0.1em'}}>{svc.label}</span>
          <div style={{width:6,height:6,borderRadius:'50%',background:svc.color,boxShadow:`0 0 8px ${svc.color}`}}/>
        </div>

        {/* Progress bar */}
        <div style={{width:220,position:'relative',marginBottom:8}}>
          <div style={{height:3,borderRadius:999,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
            <div style={{
              height:'100%',borderRadius:999,
              width:`${progress}%`,
              background:'linear-gradient(90deg,#065F46,#4ADE80,#D9C5A0)',
              backgroundSize:'200% 100%',
              animation:'splashBarShimmer 1.5s linear infinite',
              transition:'width 0.08s linear',
            }}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{color:'rgba(255,255,255,0.2)',fontSize:8,fontWeight:700,letterSpacing:'0.25em'}}>CHARGEMENT</span>
            <span style={{color:'rgba(255,255,255,0.35)',fontSize:8,fontWeight:900}}>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

type Page = 'home'|'restaurant'|'tracking'|'contact';
const LANG_CYCLE:Lang[]=['fr','en','ar','amz'];
const LANG_LABELS:Record<Lang,string>={fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};

const NAV_KEY='bridge_nav_state';
// ─── FLEURS PAGE ──────────────────────────────────────────────────────────────

const FLEURS_CATALOG = [
  {id:'f1', img:'/fleurs/fl_01.png', emoji:'🌹', names:{fr:'Bouquet Roses Mixtes',en:'Mixed Roses Bouquet',ar:'باقة ورود مشكلة',amz:'ⴰⵥⴰⵡⴰⵏ ⵏ ⵉⴳⵍⴰⴷ'},          price:0, cat:'bouquet'},
  {id:'f2', img:'/fleurs/fl_02.png', emoji:'🤍', names:{fr:'Bouquet Blanc & Rose',en:'White & Pink Bouquet',ar:'باقة بيضاء وردية',amz:'ⴰⵥⴰⵡⴰⵏ ⴰⵎⵍⵍⴰⵍ'},         price:0, cat:'bouquet'},
  {id:'f3', img:'/fleurs/fl_03.png', emoji:'🌸', names:{fr:'Bouquet Roses Roses',en:'Pink Roses Bouquet',ar:'باقة ورود وردية',amz:'ⴰⵥⴰⵡⴰⵏ ⵏ ⵉⴳⵍⴰⴷ ⵉⵡⵔⵉⵖⵏ'},   price:0, cat:'bouquet'},
  {id:'f4', img:'/fleurs/fl_05.png', emoji:'💐', names:{fr:'Grand Bouquet Luxe',en:'Luxury Large Bouquet',ar:'باقة فاخرة كبيرة',amz:'ⴰⵥⴰⵡⴰⵏ ⴰⵎⵇⵔⴰⵏ'},         price:0, cat:'bouquet'},
  {id:'f5', img:'/fleurs/fl_08.png', emoji:'🌷', names:{fr:'Bouquet Lavande & Blanc',en:'Lavender & White Bouquet',ar:'باقة بنفسجية بيضاء',amz:'ⴰⵥⴰⵡⴰⵏ ⴰⵣⴳⵣⴰⵡ'},price:0, cat:'bouquet'},
  {id:'f6', img:'/fleurs/fl_09.png', emoji:'🌹', names:{fr:'Bouquet Roses Bordeaux',en:'Dark Red Roses Bouquet',ar:'باقة ورود عنابية',amz:'ⴰⵥⴰⵡⴰⵏ ⴰⵣⴳⴳⴰⵖ'},      price:0, cat:'bouquet'},
  {id:'f7', img:'/fleurs/fl_07.png', emoji:'❤️', names:{fr:'Coffret Cœur Roses',en:'Heart Rose Box',ar:'علبة قلب ورود',amz:'ⴰⵙⴷⴰⵙ ⵏ ⵓⵍ'},                    price:0, cat:'coffret'},
  {id:'f8', img:'/fleurs/fl_11.png', emoji:'🎁', names:{fr:'Box Roses Élégance',en:'Roses Elegance Box',ar:'علبة ورود أناقة',amz:'ⴰⵙⴷⴰⵙ ⵏ ⵉⴳⵍⴰⴷ'},              price:0, cat:'coffret'},
  {id:'f9', img:'/fleurs/fl_12.png', emoji:'🎀', names:{fr:'Box Prestige Nœud Or',en:'Gold Bow Prestige Box',ar:'علبة فاخرة بنيفة ذهبية',amz:'ⴰⵙⴷⴰⵙ ⵏ ⵓⵔ'},    price:0, cat:'coffret'},
  {id:'f10',img:'/fleurs/fl_04.png', emoji:'🍫', names:{fr:'Arrangement Ferrero & Roses',en:'Ferrero & Roses Arrangement',ar:'تنسيق فريرو وورود',amz:'ⴰⵔⴰⵜⵉⴱ ⵏ ⵉⴳⵍⴰⴷ'}, price:0, cat:'arrangement'},
  {id:'f11',img:'/fleurs/fl_06.png', emoji:'🍫', names:{fr:'Bouquet Ferrero Rocher',en:'Ferrero Rocher Bouquet',ar:'باقة فريرو روشيه',amz:'ⴰⵥⴰⵡⴰⵏ ⵏ ⵉⵡⵙⴽⵉⵡⵏ'},   price:0, cat:'arrangement'},
  {id:'f12',img:'/fleurs/fl_10.png', emoji:'💙', names:{fr:'Arrangement Roses Bleues',en:'Blue Roses Arrangement',ar:'تنسيق ورود زرقاء',amz:'ⴰⵔⴰⵜⵉⴱ ⵏ ⵉⴳⵍⴰⴷ ⵉⵣⵣⴳⴳⴰⵏ'},price:0,cat:'arrangement'},
];
const FLEURS_CATS=[
  {id:'bouquet',    label:{fr:'Bouquets',en:'Bouquets',ar:'باقات',amz:'ⵉⵥⴰⵡⴰⵏⵏ'}},
  {id:'coffret',    label:{fr:'Coffrets',en:'Boxes',ar:'صناديق',amz:'ⵉⵙⴷⴰⵙⵏ'}},
  {id:'arrangement',label:{fr:'Arrangements',en:'Arrangements',ar:'تنسيقات',amz:'ⵉⵔⴰⵜⵉⴱⵏ'}},
];

function FleurPage({onBack,lang,cycleLang,profile,saveProfile,onOrderSuccess}:{
  onBack:()=>void; lang:Lang; cycleLang:()=>void;
  profile:UserProfile; saveProfile:(p:UserProfile)=>void;
  onOrderSuccess?:(ref:string)=>void;
}) {
  const [,navigateFleur]=useLocation();
  const [showProfile,setShowProfile]=useState(false);
  const [activeCat,setActiveCat]=useState('bouquet');
  const [cart,setCart]=useState<{id:string;qty:number}[]>([]);
  const [showCheckout,setShowCheckout]=useState(false);
  const [tab,setTab]=useState<'home'|'shop'|'track'>('home');
  const [lastRef,setLastRef]=useState<string>(()=>localStorage.getItem('bridge_fleurs_last_ref')||'');
  const [trackStage,setTrackStage]=useState(0);
  const [fleursLastSeen,setFleursLastSeen]=useState<number|null>(null);
  const isAR=lang==='ar'; const isAMZ=lang==='amz'; const fClass=fontClass(lang);
  const LANG_LABELS:Record<Lang,string>={fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};
  const pillStyle:React.CSSProperties={
    background:'var(--c-card)',border:'2.5px solid #D9C5A0',color:'#065F46',
    boxShadow:'0 4px 20px rgba(6,95,70,0.15)',height:'44px',minWidth:'44px',
  };
  const addItem=(id:string)=>setCart(c=>{const ex=c.find(x=>x.id===id);return ex?c.map(x=>x.id===id?{...x,qty:x.qty+1}:x):[...c,{id,qty:1}];});
  const removeItem=(id:string)=>setCart(c=>{const ex=c.find(x=>x.id===id);if(!ex)return c;if(ex.qty===1)return c.filter(x=>x.id!==id);return c.map(x=>x.id===id?{...x,qty:x.qty-1}:x);});
  const cartTotal=cart.reduce((s,ci)=>{const p=FLEURS_CATALOG.find(f=>f.id===ci.id);return s+(p?p.price*ci.qty:0);},0);
  const cartCount=cart.reduce((s,ci)=>s+ci.qty,0);
  const visibleItems=FLEURS_CATALOG.filter(f=>f.cat===activeCat);

  const drawerCart:CartItem[]=cart.map(ci=>{
    const p=FLEURS_CATALOG.find(f=>f.id===ci.id)!;
    return {
      cartId:ci.id,restaurantId:'rayhana-fleurs',restaurantName:'Rayhana Fleurs',
      item:{id:ci.id,names:p.names,price:p.price,photo:'',safi:false,options:[]},
      qty:ci.qty,extraPrice:0,totalPerUnit:p.price,selectedOptions:{},
    };
  });
  const handleQty=(cartId:string,delta:number)=>{ if(delta>0) addItem(cartId); else removeItem(cartId); };

  const trackStages=lang==='ar'
    ?['تم تأكيد الطلب','جاري التحضير','في الطريق إليك','تم التسليم']
    :lang==='en'
    ?['Order confirmed','Preparing your order','On the way','Delivered']
    :['Commande confirmée','Préparation en cours','En route','Livré 🌹'];

  // Poll tracking status for Fleurs orders every 4 seconds
  useEffect(()=>{
    if(!lastRef) return;
    const poll=async()=>{
      try{
        const res=await fetch(`/api/tracking/${lastRef}`,{cache:'no-store'});
        if(res.ok){
          const data=await res.json();
          if(data.found){
            setFleursLastSeen(data.updatedAt);
            const stageMap:{[k:string]:number}={received:0,preparing:1,on_way:2,delivered:3};
            if(data.status&&stageMap[data.status]!==undefined) setTrackStage(stageMap[data.status]);
          }
        }
      }catch(_){}
    };
    poll();
    const iv=setInterval(poll,4000);
    return()=>clearInterval(iv);
  },[lastRef]);

  const pinkGrad='linear-gradient(135deg,#9D174D,#DB2777)';
  const pinkGlow='0 4px 16px rgba(219,39,119,0.35)';

  return(
    <div className={`min-h-screen flex flex-col ${isAR?'rtl':'ltr'}`} style={{background:'#FFF5F7',color:'var(--c-text)'}}>
      <div className="fixed inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse at 50% 0%,rgba(219,39,119,0.07) 0%,transparent 60%)'}}/>

      {/* Top nav */}
      <div className={`fixed top-5 z-50 ${isAR?'right-5':'left-5'}`}>
        <button onClick={onBack}
          className="flex items-center gap-0.5 px-1.5 rounded-full transition-all active:scale-90"
          style={{...pillStyle,height:'24px',minWidth:'unset'}}>
          <span style={{fontSize:'9px'}}>🛵</span><span style={{fontSize:'8px',color:'#D9C5A0',fontWeight:900}}>|</span>
          <span style={{fontSize:'9px'}}>🚖</span><span style={{fontSize:'8px',color:'#D9C5A0',fontWeight:900}}>|</span>
          <span style={{fontSize:'9px'}}>🚬</span><span style={{fontSize:'8px',color:'#9CA3AF'}}>←</span>
        </button>
      </div>
      <div className={`fixed top-5 z-50 flex items-center gap-2 ${isAR?'left-5':'right-5'}`}>
        <button onClick={()=>setShowProfile(true)}
          className="rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 relative"
          style={{...pillStyle,width:'44px',padding:0,overflow:'hidden'}}>
          {profile.avatar
            ?<img src={profile.avatar} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            :<span style={{fontSize:'18px'}}>👤</span>
          }
          {profile.name&&<span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style={{background:'#EC4899'}}/>}
        </button>
        <button onClick={cycleLang}
          className={`rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 px-3 ${isAMZ?'font-tifinagh':''}`}
          style={{...pillStyle,fontSize:'13px'}}>
          {LANG_LABELS[lang]}
        </button>
        <SharkDiamondWidget onNavigate={()=>navigateFleur('/game')} profile={profile}/>
        <DarkToggle/>
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-32">

        {/* ── HOME TAB ── */}
        {tab==='home'&&(
          <div>
            {/* Header */}
            <div className="pt-20 px-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-3 mb-1">
                <span className="text-4xl">🌹</span>
                <div>
                  <h1 className="font-black tracking-[0.3em] text-xl" style={{color:'#9D174D'}}>BRIDGE</h1>
                  <p className="font-black text-sm tracking-[0.2em]" style={{color:'#DB2777'}}>FLEURS</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2 mb-1">
                <div className="w-8 h-px" style={{background:'#FBCFE8'}}/>
                <div className="w-1.5 h-1.5 rotate-45" style={{background:'#F9A8D4'}}/>
                <div className="w-8 h-px" style={{background:'#FBCFE8'}}/>
              </div>
              <p className={`text-[10px] font-black tracking-widest uppercase ${fClass}`} style={{color:'#EC4899'}}>
                {lang==='ar'?'ورود وهدايا · سافي':lang==='en'?'Flowers & Gifts · Safi':lang==='amz'?'ⵉⵣⵓⵍⴰⵏ · ⵙⴰⴼⵉ':'Fleurs & Cadeaux · Safi'}
              </p>
            </div>
            {/* Boutique badge */}
            <div className="flex flex-col items-center mx-5 mb-5">
              {/* Logo cercle */}
              <div style={{
                width:88,height:88,borderRadius:'50%',
                background:'linear-gradient(135deg,#FCE7F3,#FBCFE8)',
                border:'3px solid #F9A8D4',
                boxShadow:'0 0 0 6px rgba(249,168,212,0.18), 0 8px 32px rgba(219,39,119,0.22)',
                overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',
                marginBottom:10,
              }}>
                <img src="/logo_splash_new.png" alt="Rayhana Fleurs"
                  style={{width:'100%',height:'100%',objectFit:'cover',
                    filter:'sepia(0.3) saturate(1.2) hue-rotate(280deg) brightness(1.05)'}}/>
              </div>
              {/* Nom boutique */}
              <p className="font-black text-base tracking-wide" style={{color:'#9D174D',marginBottom:2}}>Rayhana Fleurs</p>
              <div className="flex items-center gap-2 mb-1">
                <div style={{width:28,height:1,background:'linear-gradient(to right,transparent,#F9A8D4)'}}/>
                <span style={{fontSize:7,fontWeight:900,letterSpacing:'0.18em',color:'#EC4899'}}>SAFI · آسفي · ⵙⴰⴼⵉ</span>
                <div style={{width:28,height:1,background:'linear-gradient(to left,transparent,#F9A8D4)'}}/>
              </div>
              <span style={{
                background:'linear-gradient(135deg,#9D174D,#DB2777)',
                borderRadius:20,padding:'3px 14px',
                color:'#fff',fontSize:9,fontWeight:900,letterSpacing:'0.15em',
                boxShadow:'0 4px 12px rgba(219,39,119,0.3)',
              }}>🌹 Partenaire Bridge Officiel</span>
            </div>
            {/* Quick CTA cards */}
            <div className="grid grid-cols-2 gap-3 px-5 mb-5">
              <button onClick={()=>setTab('shop')}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{background:pinkGrad,boxShadow:pinkGlow}}>
                <span style={{fontSize:28}}>🛍️</span>
                <span className="text-white font-black text-[11px] tracking-wide">{lang==='ar'?'تصفح المتجر':lang==='en'?'Shop Now':'Commander'}</span>
              </button>
              <button onClick={()=>setTab('track')}
                className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{background:'var(--c-card)',border:'1.5px solid #FBCFE8',boxShadow:'0 4px 16px rgba(219,39,119,0.08)'}}>
                <span style={{fontSize:28}}>📦</span>
                <span className="font-black text-[11px] tracking-wide" style={{color:'#9D174D'}}>{lang==='ar'?'تتبع طلبي':lang==='en'?'Track Order':'Suivi commande'}</span>
              </button>
            </div>
            {/* Featured items */}
            <div className="px-5">
              <p className="font-black text-[11px] tracking-widest uppercase mb-3" style={{color:'#9D174D'}}>
                {lang==='ar'?'⭐ المميزة':lang==='en'?'⭐ Featured':'⭐ En vedette'}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth:'none'}}>
                {FLEURS_CATALOG.slice(0,4).map(item=>(
                  <div key={item.id} className="flex-shrink-0 rounded-2xl overflow-hidden"
                    style={{width:130,background:'var(--c-card)',border:'1.5px solid #FCE7F3',boxShadow:'0 4px 14px rgba(219,39,119,0.07)'}}>
                    <div className="flex items-center justify-center overflow-hidden" style={{height:90,background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)'}}>
                      {item.img
                        ? <img src={item.img} alt={item.names.fr} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                        : <span style={{fontSize:36}}>{item.emoji}</span>}
                    </div>
                    <div className="p-2">
                      <p className="font-black text-[10px] leading-tight mb-1" style={{color:'#831843'}}>{item.names[lang]}</p>
                      <p className="font-black text-xs" style={{color:'#DB2777'}}>{item.price>0?`${item.price} MAD`:lang==='ar'?'السعر عند الطلب':'Sur demande'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SHOP TAB ── */}
        {tab==='shop'&&(
          <div>
            <div className="pt-20 px-5 pb-3">
              <p className="font-black text-base tracking-wide" style={{color:'#9D174D'}}>🌹 Bridge Fleurs · {lang==='ar'?'آسفي':lang==='en'?'Safi':'Safi'}</p>
              <p className="text-[10px] font-semibold" style={{color:'#EC4899',marginTop:1}}>by Rayhana Fleurs</p>
            </div>
            {/* Category tabs */}
            <div className={`flex gap-2 px-5 mb-4 ${isAR?'flex-row-reverse':''}`}>
              {FLEURS_CATS.map(cat=>(
                <button key={cat.id} onClick={()=>setActiveCat(cat.id)}
                  className="flex-1 py-2 rounded-2xl font-black text-[11px] transition-all active:scale-95"
                  style={{
                    background:activeCat===cat.id?pinkGrad:'white',
                    color:activeCat===cat.id?'white':'#9D174D',
                    border:`1.5px solid ${activeCat===cat.id?'transparent':'#FBCFE8'}`,
                    boxShadow:activeCat===cat.id?pinkGlow:'none',
                  }}>
                  {cat.label[lang]}
                </button>
              ))}
            </div>
            {/* Product grid */}
            <div className="px-5">
              <div className="grid grid-cols-2 gap-3">
                {visibleItems.map(item=>{
                  const inCart=cart.find(c=>c.id===item.id);
                  return(
                    <div key={item.id} className="rounded-2xl overflow-hidden" style={{background:'var(--c-card)',border:'1.5px solid #FCE7F3',boxShadow:'0 4px 16px rgba(219,39,119,0.08)'}}>
                      <div className="flex items-center justify-center overflow-hidden" style={{height:110,background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)'}}>
                        {item.img
                          ? <img src={item.img} alt={item.names.fr} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
                          : <span style={{fontSize:44}}>{item.emoji}</span>}
                      </div>
                      <div className="p-3">
                        <p className={`font-black text-[11px] leading-tight mb-1 ${fClass}`} style={{color:'#831843'}}>{item.names[lang]}</p>
                        <p className="font-black text-sm" style={{color:'#DB2777'}}>{item.price>0?`${item.price} MAD`:lang==='ar'?'السعر عند الطلب':'Sur demande'}</p>
                        {!inCart?(
                          <button onClick={()=>addItem(item.id)}
                            className="w-full mt-2 py-1.5 rounded-xl font-black text-[11px] text-white transition-all active:scale-95"
                            style={{background:pinkGrad,boxShadow:pinkGlow}}>
                            + Ajouter
                          </button>
                        ):(
                          <div className="flex items-center justify-between mt-2">
                            <button onClick={()=>removeItem(item.id)}
                              className="w-8 h-8 rounded-full font-black text-lg flex items-center justify-center transition-all active:scale-90"
                              style={{background:'#FCE7F3',color:'#DB2777'}}>−</button>
                            <span className="font-black text-sm" style={{color:'#9D174D'}}>{inCart.qty}</span>
                            <button onClick={()=>addItem(item.id)}
                              className="w-8 h-8 rounded-full font-black text-lg flex items-center justify-center text-white transition-all active:scale-90"
                              style={{background:pinkGrad}}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TRACK TAB ── */}
        {tab==='track'&&(
          <div className="pt-20 px-5">
            <p className="font-black text-base tracking-wide mb-5" style={{color:'#9D174D'}}>📦 {lang==='ar'?'تتبع الطلب':lang==='en'?'Order Tracking':'Suivi de commande'}</p>
            {!lastRef?(
              <div className="rounded-3xl p-8 text-center" style={{background:'var(--c-card)',border:'1.5px solid #FCE7F3',boxShadow:'0 4px 20px rgba(219,39,119,0.08)'}}>
                <span style={{fontSize:48}}>🌸</span>
                <p className="font-black text-sm mt-3 mb-1" style={{color:'#9D174D'}}>
                  {lang==='ar'?'لا توجد طلبات بعد':lang==='en'?'No orders yet':'Aucune commande en cours'}
                </p>
                <p className="text-[11px]" style={{color:'#9CA3AF'}}>
                  {lang==='ar'?'اطلب الآن وتابع هنا':lang==='en'?'Order now and track here':'Passez une commande pour la suivre ici'}
                </p>
                <button onClick={()=>setTab('shop')}
                  className="mt-4 px-6 py-2.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95"
                  style={{background:pinkGrad,boxShadow:pinkGlow}}>
                  {lang==='ar'?'تسوق الآن':lang==='en'?'Shop Now':'Commander maintenant'}
                </button>
              </div>
            ):(
              <div>
                {/* Ref badge */}
                <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{background:'var(--c-card)',border:'1.5px solid #FCE7F3',boxShadow:'0 4px 16px rgba(219,39,119,0.08)'}}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{color:'#9CA3AF'}}>
                      {lang==='ar'?'رقم الطلب':lang==='en'?'Order ref':'Référence'}
                    </p>
                    <p className="font-black text-sm mt-0.5" style={{color:'#9D174D'}}>#{lastRef}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'linear-gradient(135deg,#FCE7F3,#FBCFE8)'}}>
                    <span style={{fontSize:20}}>🌹</span>
                  </div>
                </div>
                {/* Stages */}
                <div className="rounded-2xl p-4 mb-4" style={{background:'var(--c-card)',border:'1.5px solid #FCE7F3',boxShadow:'0 4px 16px rgba(219,39,119,0.08)'}}>
                  <p className="font-black text-[10px] uppercase tracking-widest mb-4" style={{color:'#9CA3AF'}}>
                    {lang==='ar'?'حالة الطلب':lang==='en'?'Order status':'Statut de la commande'}
                  </p>
                  {trackStages.map((stage,i)=>(
                    <div key={i} className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm transition-all"
                        style={{
                          background:i<=trackStage?pinkGrad:'#F3F4F6',
                          color:i<=trackStage?'white':'#9CA3AF',
                          boxShadow:i===trackStage?pinkGlow:'none',
                        }}>
                        {i<trackStage?'✓':['📋','💐','🛵','✅'][i]}
                      </div>
                      <div className="flex-1">
                        <p className={`text-[11px] font-black ${fClass}`} style={{color:i<=trackStage?'#9D174D':'#9CA3AF'}}>{stage}</p>
                        {i===trackStage&&<p className="text-[9px]" style={{color:'#EC4899'}}>● En cours…</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {/* ETA card */}
                <div className="rounded-2xl p-4 flex items-center gap-3" style={{background:'linear-gradient(135deg,#FDF2F8,#FCE7F3)',border:'1px solid #FBCFE8'}}>
                  <span style={{fontSize:24}}>⏱️</span>
                  <div>
                    <p className="font-black text-sm" style={{color:'#9D174D'}}>
                      {lang==='ar'?'وقت التسليم المتوقع':lang==='en'?'Estimated delivery':'Livraison estimée'}
                    </p>
                    <p className="text-[11px]" style={{color:'#DB2777'}}>{lang==='ar'?'جاري التتبع…':lang==='en'?'Tracking in progress…':'Suivi en cours…'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart bar (shop tab only) */}
      {cartCount>0&&tab==='shop'&&(
        <div className="fixed bottom-20 left-0 right-0 px-5 z-40">
          <button onClick={()=>setShowCheckout(true)}
            className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-between px-5 transition-all active:scale-95"
            style={{background:pinkGrad,boxShadow:'0 8px 24px rgba(219,39,119,0.4)'}}>
            <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-xs font-black">{cartCount}</span>
            <span>{lang==='ar'?'عرض السلة':lang==='en'?'View Cart':'Voir le panier'}</span>
            <span>{cartTotal} MAD</span>
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex" style={{background:'var(--c-card)',borderTop:'1.5px solid #FCE7F3',boxShadow:'0 -4px 20px rgba(219,39,119,0.08)'}}>
        {([
          {id:'home',emoji:'🏠',label:{fr:'Accueil',en:'Home',ar:'الرئيسية',amz:'ⴰⵡⵡⵓⵔ'}},
          {id:'shop',emoji:'🌹',label:{fr:'Boutique',en:'Shop',ar:'المتجر',amz:'ⴰⵙⵡⵉⵔ'}},
          {id:'track',emoji:'📦',label:{fr:'Suivi',en:'Track',ar:'تتبع',amz:'ⴰⵙⴽⵍⵙ'}},
        ] as {id:'home'|'shop'|'track';emoji:string;label:Record<Lang,string>}[]).map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-all"
            style={{background:'none',border:'none',cursor:'pointer'}}>
            <span style={{fontSize:20,filter:tab===t.id?'none':'grayscale(1) opacity(0.5)'}}>{t.emoji}</span>
            <span className="text-[9px] font-black tracking-wide"
              style={{color:tab===t.id?'#DB2777':'#9CA3AF'}}>{t.label[lang]}</span>
            {tab===t.id&&<div className="w-4 h-0.5 rounded-full mt-0.5" style={{background:pinkGrad}}/>}
          </button>
        ))}
      </div>

      <WAButton/>
      {showProfile&&<ProfileModal lang={lang} profile={profile} onSave={p=>{saveProfile(p);setShowCheckout(false);}} onClose={()=>setShowProfile(false)}/>}
      {showCheckout&&(
        <CheckoutDrawer
          cart={drawerCart} lang={lang}
          onClose={()=>setShowCheckout(false)}
          onQty={handleQty}
          profile={profile}
          onClearCart={()=>{setCart([]);setShowCheckout(false);}}
          restaurantName="Rayhana Fleurs"
          serviceFeeThreshold={40} serviceFeeAmount={6}
          onOrderSuccess={ref=>{
            setCart([]);setShowCheckout(false);
            setLastRef(ref);
            try{localStorage.setItem('bridge_fleurs_last_ref',ref);}catch{}
            setTrackStage(0);setTab('track');
            onOrderSuccess?.(ref);
          }}
        />
      )}
    </div>
  );
}

// ─── TABAC PAGE ───────────────────────────────────────────────────────────────

function TabacPage({onBack,lang,cycleLang,profile,saveProfile,onOrderSuccess}:{
  onBack:()=>void; lang:Lang; cycleLang:()=>void;
  profile:UserProfile; saveProfile:(p:UserProfile)=>void;
  onOrderSuccess?:(ref:string)=>void;
}) {
  const [showProfile,setShowProfile]=useState(false);
  const [delivMode,setDelivMode]=useState<'delivery'|'collect'>('delivery');
  const [name,setName]=useState(profile.name??'');
  const [addr,setAddr]=useState(profile.address??'');
  const [phone,setPhone]=useState(profile.phone??'');
  const [err,setErr]=useState('');
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [orderRef]=useState(()=>`TB-${Math.floor(1000+Math.random()*9000)}`);
  const [tabacPayMethod,setTabacPayMethod]=useState<PayMethodType>(null);
  const [showTabacQR,setShowTabacQR]=useState(false);
  const {user:tabacUser}=useUser();
  const getAuthHeadersTabac=useAuthHeaders();
  const [,navigateTabac]=useLocation();
  const [tabacGems,setTabacGems]=useState(0);
  const [tabacGemMAD,setTabacGemMAD]=useState(0);
  const maxTabacGemMAD=Math.floor(tabacGems/200);
  useEffect(()=>{
    if(!tabacUser?.id) return;
    getAuthHeadersTabac().then(h=>fetch('/api/game/diamonds',{credentials:'include',headers:h})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(d&&typeof d.diamonds==='number')setTabacGems(d.diamonds);})
      .catch(()=>{}));
  },[tabacUser?.id,getAuthHeadersTabac]);

  const isAR=lang==='ar'; const isAMZ=lang==='amz'; const fClass=fontClass(lang);
  const t=T[lang];
  const pillStyle:React.CSSProperties={
    background:'var(--c-card)',border:'2.5px solid #D9C5A0',color:'#065F46',
    boxShadow:'0 4px 20px rgba(6,95,70,0.15)',height:'44px',minWidth:'44px',
  };
  const LANG_LABELS:Record<Lang,string>={fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};

  const WA_SVG=<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.124 1.532 5.859L.036 23.671l5.979-1.567A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>;

  const handleTabacWalletPay=async(type:'apple'|'google')=>{
    if(!name.trim()||!phone.trim()||(delivMode==='delivery'&&!addr.trim())){setErr('*');return;}
    const payLabel=type==='apple'?'Apple Pay':'Google Pay';
    const methods=type==='apple'
      ?[{supportedMethods:'https://apple.com/apple-pay',data:{version:3,merchantIdentifier:'merchant.ma.safi-bridge',merchantCapabilities:['supports3DS'],supportedNetworks:['visa','masterCard'],countryCode:'MA'}}]
      :[{supportedMethods:'https://google.com/pay',data:{apiVersion:2,apiVersionMinor:0,merchantInfo:{merchantName:'Bridge Safi'},allowedPaymentMethods:[{type:'CARD',parameters:{allowedAuthMethods:['PAN_ONLY','CRYPTOGRAM_3DS'],allowedCardNetworks:['MASTERCARD','VISA']},tokenizationSpecification:{type:'PAYMENT_GATEWAY',parameters:{gateway:'example',gatewayMerchantId:'bridge-safi'}}}]}}];
    const details={total:{label:'Bridge Tabac · Safi',amount:{currency:'MAD',value:'0'}}};
    try{
      if(typeof PaymentRequest==='undefined') throw new Error('unsupported');
      const pr=new PaymentRequest(methods,details);
      const canMake=await pr.canMakePayment().catch(()=>false);
      if(!canMake) throw new Error('unavailable');
      const response=await pr.show();
      await response.complete('success');
      setTabacPayMethod(type);
      await handleSend(payLabel);
    }catch{setTabacPayMethod('cash');}
  };

  const handleSend=async(payLabel?:string)=>{
    if(!name.trim()||!phone.trim()||(delivMode==='delivery'&&!addr.trim())){
      setErr('*');return;
    }
    setSending(true);
    const deliveryAddress=delivMode==='delivery'?`${addr.trim()}, Safi, Maroc`:t.tabacCollectAddress;
    const driverTrackUrl=`${window.location.origin}/driver/${orderRef}`;
    const payInfo=payLabel?payLabel:tabacPayMethod==='qr'?'QR Code':tabacPayMethod==='cash'?'Espèces':tabacPayMethod==='apple'?'Apple Pay':tabacPayMethod==='google'?'Google Pay':'Espèces';
    try {
      await fetch('/api/orders/inbound',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-bridge-secret':'bridge-safi-8b269bba03fd8c0205116f3f'}, 
        body:JSON.stringify({
          customerName:name.trim(),customerPhone:phone.trim(),
          deliveryAddress,pickupAddress:'Bridge Tabac — Safi',
          items:[{name:'🚬 Commande Bridge Tabac',qty:1,price:0}],
          total:0,source:'Bridge Tabac',paymentMethod:payInfo,
        }),
      }).catch(()=>{});
      await fetch(`${DRIVER_APP_URL}/api/deliveries`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          trackingNumber:orderRef,
          customerName:name.trim(),customerPhone:phone.trim(),
          pickupAddress:'Bridge Tabac — Safi',
          deliveryAddress,
          priority:'normal',
          notes:`🚬 Commande Bridge Tabac\.💳 ${payInfo}\.👤 ${name.trim()} — ${phone.trim()}`,
          driverTrackUrl,
        }),
      }).catch(()=>{});
    } finally { setSending(false); }
    if(tabacGemMAD>0){getAuthHeadersTabac().then(h=>fetch('/api/game/diamonds/spend',{method:'POST',credentials:'include',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({spend:tabacGemMAD*200})}).then(r=>r.ok?r.json():null).then(d=>{if(d&&typeof d.diamonds==='number'){const ck=`bridge_diamonds_cache_${tabacUser?.id||'anon'}`;try{localStorage.setItem(ck,String(d.diamonds));}catch{}window.dispatchEvent(new StorageEvent('storage',{key:ck,newValue:String(d.diamonds)}));}}).catch(()=>{}));}
    localStorage.setItem('bridge_last_ref',orderRef);
    setSent(true);
    onOrderSuccess?.(orderRef);
  };

  const inputCls=`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all ${fClass}`;
  const inputStyle=(hasErr:boolean):React.CSSProperties=>({
    background:'#F9F6F0',border:`1.5px solid ${hasErr?'#EF4444':'#E5E1D8'}`,color:'var(--c-text)',
  });

  return(
    <div className={`min-h-screen flex flex-col ${isAR?'rtl':'ltr'}`} style={{background:'var(--c-bg)',color:'var(--c-text)'}}>
      {/* Header */}
      <div className={`fixed top-5 z-50 ${isAR?'right-5':'left-5'}`}>
        <button onClick={onBack}
          className="flex items-center gap-0.5 px-1.5 rounded-full transition-all active:scale-90 hover:scale-110"
          style={{...pillStyle,height:'24px',minWidth:'unset'}}>
          <span style={{fontSize:'9px',lineHeight:1}}>🛵</span>
          <span style={{fontSize:'8px',color:'#D9C5A0',fontWeight:900}}>|</span>
          <span style={{fontSize:'9px',lineHeight:1}}>🚖</span>
          <span style={{fontSize:'8px',color:'#D9C5A0',fontWeight:900}}>|</span>
          <span style={{fontSize:'9px',lineHeight:1}}>🌹</span>
          <span style={{fontSize:'8px',lineHeight:1,color:'#9CA3AF'}}>←</span>
        </button>
      </div>
      <div className={`fixed top-5 z-50 flex items-center gap-2 ${isAR?'left-5':'right-5'}`}>
        <button onClick={cycleLang}
          className={`rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 hover:scale-110 px-3 ${isAMZ?'font-tifinagh':''}`}
          style={{...pillStyle,fontSize:'13px'}}>
          {LANG_LABELS[lang]}
        </button>
        <button onClick={()=>setShowProfile(true)}
          className="rounded-full flex items-center justify-center font-black text-xl transition-all active:scale-90 hover:scale-110 relative"
          style={{...pillStyle,width:'44px',padding:0,overflow:'hidden'}}>
          {profile.avatar
            ?<img src={profile.avatar} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            :<span style={{fontSize:'18px'}}>👤</span>
          }
          {profile.name&&<span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style={{background:'#10B981'}}/>}
        </button>
        <SharkDiamondWidget onNavigate={()=>navigateTabac('/game')} profile={profile}/>
        <DarkToggle/>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center px-5 pt-24 pb-12 max-w-sm mx-auto w-full">
        <h1 className={`font-black text-xl tracking-wider mb-0.5 ${fClass}`} style={{color:'#7D4F2E'}}>BRIDGE TABAC</h1>
        <p className="text-[10px] tracking-widest font-bold mb-5" style={{color:'#B45309'}}>SAFI · MAROC · آسفي · ⵙⴰⴼⵉ</p>

        {/* Mode selector */}
        <div className="flex gap-2 w-full mb-5">
          {([
            {key:'delivery'as const, label:t.delivOption, desc:t.delivOptionDesc, color:'#065F46', selBg:'#D1FAE5', bg:'#F0FDF4'},
            {key:'collect'as const,  label:t.collectOption, desc:t.collectOptionDesc, color:'#B45309', selBg:'#FEF3C7', bg:'#FFFBEB'},
          ]).map(opt=>{
            const sel=delivMode===opt.key;
            return(
              <button key={opt.key} onClick={()=>{setDelivMode(opt.key);setErr('');}}
                className={`flex-1 rounded-2xl p-3 text-left transition-all duration-200 active:scale-95 ${isAR?'text-right':''}`}
                style={{background:sel?opt.selBg:opt.bg,border:`2px solid ${sel?opt.color:'#E5E1D8'}`}}>
                <p className={`font-black text-[11px] leading-tight ${fClass}`} style={{color:opt.color}}>{opt.label}</p>
                <p className={`text-[9px] mt-0.5 ${fClass}`} style={{color:'#9CA3AF'}}>{opt.desc}</p>
                {sel&&<div className="mt-1.5 w-3 h-3 rounded-full flex items-center justify-center" style={{background:opt.color}}>
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="white"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                </div>}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="w-full flex flex-col gap-3 mb-5">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${fClass}`} style={{color:'#065F46'}}>👤 {t.nameLabel}</p>
            <input className={inputCls} style={inputStyle(!!err&&!name.trim())}
              placeholder={t.namePh} value={name} onChange={e=>{setName(e.target.value);setErr('');}}/>
          </div>
          {delivMode==='delivery'&&(
            <AddressAutocomplete
              label={`📍 ${t.addrLabel}`}
              value={addr}
              onChange={v=>{setAddr(v);setErr('');}}
              placeholder={t.addrPh}
              lang={lang}
              error={!!err&&!addr.trim()}/>
          )}
          {delivMode==='collect'&&(
            <div className="rounded-xl px-4 py-3" style={{background:'#FEF3C7',border:'1.5px solid #FDE68A'}}>
              <p className={`text-[10px] font-medium ${fClass}`} style={{color:'#92400E'}}>🏪 {t.tabacCollectAddress}</p>
            </div>
          )}
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${fClass}`} style={{color:'#065F46'}}>📞 {t.phoneLabel}</p>
            <input className={inputCls} style={inputStyle(!!err&&!phone.trim())}
              placeholder={t.phonePh} value={phone} type="tel"
              onChange={e=>{setPhone(e.target.value);setErr('');}}/>
          </div>
          {err&&<p className={`text-xs font-bold ${fClass}`} style={{color:'#EF4444'}}>⚠️ {lang==='ar'?'يرجى ملء جميع الحقول المطلوبة':lang==='en'?'Please fill in all required fields':lang==='amz'?'ⵔⵏⵓ ⵉⵙⵡⵓⵔⵉⵡⵏ ⵉⵍⴰⵎⵎⴰⵏ':'Veuillez remplir tous les champs requis'}</p>}
        </div>

        {/* Success screen overlay */}
        {sent&&(
          <div className="rounded-3xl p-6 text-center" style={{background:'#F0FDF4',border:'2px solid #059669',boxShadow:'0 8px 32px rgba(5,150,105,0.18)'}}>
            <div className="text-5xl mb-3">✅</div>
            <p className={`font-black text-base mb-1 ${fClass}`} style={{color:'#065F46'}}>
              {lang==='ar'?'تم إرسال طلبك!':lang==='en'?'Order placed!':lang==='amz'?'ⵜⵓⴷⴷⵙ ⵜⴰⵖⵓⵍⵜ ⵉⵏⵓ!':'Commande envoyée !'}
            </p>
            <p className="text-2xl font-black tracking-[0.25em] my-2" style={{color:'#B45309'}}>{orderRef}</p>
            <p className={`text-[11px] mb-4 ${fClass}`} style={{color:'#6B7280'}}>
              {lang==='ar'?'سيتصل بك الليبرور قريباً':lang==='en'?'The driver will contact you soon':lang==='amz'?'ⴰⵙⵙⵉⵍⵓ ⴰⴷ ⵉⵙⵓⵙ ⵅⵅⵉⵏ':'Le livreur vous contactera bientôt'}
            </p>
            <button onClick={()=>onOrderSuccess?.(orderRef)}
              className={`w-full py-3 rounded-2xl font-black text-sm text-white active:scale-95 transition-all ${fClass}`}
              style={{background:'#065F46',boxShadow:'0 4px 14px rgba(6,95,70,0.35)'}}>
              📍 {lang==='ar'?'متابعة الطلب':lang==='en'?'Track order':lang==='amz'?'ⴰⵙⴽⵍⵙ ⵏ ⵓⵎⵢⴰⵡⴰ':'Suivre ma commande'}
            </button>
          </div>
        )}

        {/* 💎 Diamond reduction — Tabac */}
        {!sent&&maxTabacGemMAD>0&&(
          <div className="w-full rounded-2xl p-4" style={{background:'#FEFCE8',border:'1.5px solid #FDE047'}}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${fClass}`} style={{color:'#92400E'}}>
              💎 {lang==='ar'?'خصم بالماسات':lang==='en'?'Diamond discount':lang==='amz'?'ⵙⵙⵎⵔⵙ ⵉⵎⴰⵙⵙⵏ':'Réduction Diamants'}
            </p>
            <p className={`text-xs mb-2 ${fClass}`} style={{color:'#78350F',fontWeight:600}}>
              {tabacGems.toLocaleString()} 💎 = {maxTabacGemMAD} MAD {lang==='ar'?'متاح':lang==='en'?'available':'disponible'}
            </p>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={maxTabacGemMAD} value={tabacGemMAD}
                onChange={e=>setTabacGemMAD(Number(e.target.value))}
                className="flex-1" style={{accentColor:'#065F46'}}/>
              <span className="font-black text-sm" style={{color:'#065F46',minWidth:52}}>-{tabacGemMAD} MAD</span>
            </div>
          </div>
        )}
        {/* ── Mode de paiement ── */}
        {!sent&&(
          <div className="rounded-2xl p-4" style={{background:'var(--c-card)',border:'1.5px solid var(--c-border)'}}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${fClass}`} style={{color:'#065F46'}}>
              💳 {lang==='ar'?'طريقة الدفع':lang==='en'?'Payment method':lang==='amz'?'ⴰⵣⵔⴼ':'Mode de paiement'}
            </p>
            <SharedPaymentOptions
              lang={lang} selected={tabacPayMethod}
              onSelect={setTabacPayMethod} showCash showCard={false}
              onWalletPay={handleTabacWalletPay}
            />
          </div>
        )}

        {/* Send button */}
        {!sent&&(
          <button onClick={()=>{
              if(tabacPayMethod==='qr'){handleSend().then(()=>setShowTabacQR(true));}
              else handleSend();
            }} disabled={sending}
            className={`w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-all ${fClass}`}
            style={{background:sending?'#9CA3AF':'#065F46',boxShadow:sending?'none':'0 6px 20px rgba(6,95,70,0.3)',cursor:sending?'not-allowed':'pointer'}}>
            {sending?(
              <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"/>{lang==='ar'?'جارٍ الإرسال…':lang==='en'?'Sending…':lang==='amz'?'ⵉⵙⵙⵉⴼⵍ…':'Envoi en cours…'}</>
            ):(
              <><span>🛵</span>{t.tabacSend}</>
            )}
          </button>
        )}
        {showTabacQR&&<QRPayModal lang={lang} onClose={()=>setShowTabacQR(false)} onConfirm={()=>setShowTabacQR(false)}/>}
      </div>

      <WAButton/>
      {showProfile&&<ProfileModal lang={lang} profile={profile} onSave={saveProfile} onClose={()=>setShowProfile(false)}/>}
    </div>
  );
}

// ─── HUB PAGE — écran principal (2 grands boutons) ───────────────────────────

function HubPage({onServices,lang,cycleLang,profile,saveProfile}:{
  onServices:()=>void; lang:Lang; cycleLang:()=>void;
  profile:UserProfile; saveProfile:(p:UserProfile)=>void;
}) {
  const [,navigate]=useLocation();
  const {user}=useUser();
  const {dark}=useDark();
  const t=T[lang]; const fClass=fontClass(lang); const isAR=lang==='ar';
  const LANG_LABELS:Record<Lang,string>={fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};
  const avatarSrc=profile.avatar||user?.imageUrl||null;
  const firstName=(profile.name||user?.firstName||'').split(' ')[0];
  const initials=(profile.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const [pressedServices,setPressedServices]=useState(false);
  const [pressedGame,setPressedGame]=useState(false);
  const [showProfileModal,setShowProfileModal]=useState(false);

  return (
    <div className={`fixed inset-0 overflow-y-auto flex flex-col ${isAR?'rtl':'ltr'}`}
      style={{background: dark
        ? 'linear-gradient(160deg,#020c07 0%,#030712 50%,#050a10 100%)'
        : 'linear-gradient(160deg,#f0fdf4 0%,#fefce8 50%,#f0fdf4 100%)'}}>

      <style>{`
        @keyframes hubFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
        @keyframes hubGlow{0%,100%{box-shadow:0 0 40px rgba(6,95,70,0.5),0 0 80px rgba(6,95,70,0.15);}50%{box-shadow:0 0 70px rgba(6,95,70,0.8),0 0 140px rgba(6,95,70,0.25);}}
        @keyframes hubStarPulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:1;transform:scale(1.5);}}
        @keyframes hubGemSpin{0%{transform:rotate(-12deg);}50%{transform:rotate(12deg);}100%{transform:rotate(-12deg);}}
        @keyframes hubFadeIn{0%{opacity:0;transform:translateY(18px);}100%{opacity:1;transform:translateY(0);}}
        @keyframes hubShimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
      `}</style>

      {/* Ambient blobs */}
      {dark&&<>
        <div style={{position:'fixed',top:'8%',left:'5%',width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(6,95,70,0.16) 0%,transparent 70%)',filter:'blur(48px)',pointerEvents:'none'}}/>
        <div style={{position:'fixed',bottom:'15%',right:'5%',width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(217,197,160,0.1) 0%,transparent 70%)',filter:'blur(55px)',pointerEvents:'none'}}/>
        <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(74,222,128,0.04) 0%,transparent 70%)',filter:'blur(60px)',pointerEvents:'none'}}/>
      </>}

      {/* Star particles (dark only) */}
      {dark&&[[7,'12%','15%',0],[4,'88%','22%',0.5],[5,'18%','78%',0.9],[4,'80%','75%',0.3],[6,'50%','8%',0.7]].map(([s,l,tp,d],i)=>(
        <div key={i} style={{position:'fixed',left:l as string,top:tp as string,width:s as number,height:s as number,borderRadius:'50%',background:'rgba(255,255,255,0.65)',animation:`hubStarPulse ${1.5+Number(d)}s ease-in-out ${d}s infinite`,pointerEvents:'none'}}/>
      ))}

      {/* ── TOP BAR ── */}
      <div className={`fixed top-4 z-50 ${isAR?'right-4':'left-4'}`}>
        <button onClick={()=>setShowProfileModal(true)}
          style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',border:'2.5px solid #D9C5A0',background:'#F0EBE1',boxShadow:'0 4px 14px rgba(6,95,70,0.18)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
          {avatarSrc
            ?<img src={avatarSrc} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            :<span style={{fontSize:14,fontWeight:900,color:'#065F46'}}>{initials}</span>
          }
        </button>
      </div>
      <div className={`fixed top-4 z-50 flex items-center gap-2 ${isAR?'left-4':'right-4'}`}>
        <DarkToggle size={38}/>
        <button onClick={cycleLang}
          className={`rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 px-3 ${lang==='amz'?'font-tifinagh':''}`}
          style={{background:'var(--c-card)',border:'2.5px solid #D9C5A0',color:'#065F46',boxShadow:'0 4px 20px rgba(6,95,70,0.15)',height:'38px',fontSize:'13px'}}>
          {LANG_LABELS[lang]}
        </button>
      </div>

      {/* ── CENTER CONTENT ── */}
      <div className="flex flex-col items-center w-full max-w-sm mx-auto pt-20 pb-10 px-5 flex-1 justify-center min-h-screen">

        {/* Logo */}
        <div style={{position:'relative',marginBottom:24,animation:'hubFloat 4s ease-in-out infinite, hubGlow 4s ease-in-out infinite',borderRadius:'50%',overflow:'hidden',width:96,height:96,border:'3px solid #D9C5A0'}}>
          <img src="/logo_splash_new.png" alt="Bridge" style={{width:'100%',height:'100%',objectFit:'cover',transform:'scale(1.18)'}}/>
        </div>

        {/* Welcome */}
        {firstName&&(
          <div style={{animation:'hubFadeIn 0.5s ease-out 0.1s both',marginBottom:6}}>
            <p className={`text-xs font-black tracking-widest uppercase ${fClass}`} style={{color:'#B45309',textAlign:'center'}}>
              {t.hubWelcome}, {firstName} 👋
            </p>
          </div>
        )}

        {/* BRIDGE title */}
        <div style={{animation:'hubFadeIn 0.5s ease-out 0.2s both',marginBottom:6,textAlign:'center',position:'relative'}}>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:200,height:60,background:'radial-gradient(ellipse,rgba(5,150,105,0.25) 0%,transparent 70%)',filter:'blur(16px)',pointerEvents:'none'}}/>
          <h1 style={{fontSize:'2.8rem',fontWeight:900,letterSpacing:'0.5em',background:'linear-gradient(160deg,#059669 0%,#065F46 55%,#044434 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',margin:0,lineHeight:1,position:'relative'}}>BRIDGE</h1>
        </div>

        {/* Safi badge */}
        <div style={{animation:'hubFadeIn 0.5s ease-out 0.3s both',display:'inline-flex',alignItems:'center',gap:6,background:'linear-gradient(135deg,rgba(6,95,70,0.1),rgba(180,83,9,0.07))',border:'1px solid rgba(217,197,160,0.6)',borderRadius:20,padding:'4px 16px',backdropFilter:'blur(10px)',marginBottom:28}}>
          <span style={{fontSize:10,fontWeight:800,letterSpacing:'0.12em',color:'#065F46'}}>SAFI</span>
          <span style={{color:'#D9C5A0',fontSize:10}}>·</span>
          <span style={{fontSize:10,fontWeight:700,color:'#B45309'}}>آسفي</span>
          <span style={{color:'#D9C5A0',fontSize:10}}>·</span>
          <span style={{fontSize:10,fontWeight:700,color:'#065F46',fontFamily:'inherit'}}>ⵙⴰⴼⵉ</span>
        </div>

        {/* ── 2 BIG BUTTONS ── */}
        <div style={{display:'flex',flexDirection:'column',gap:18,width:'100%',animation:'hubFadeIn 0.5s ease-out 0.4s both'}}>

          {/* SERVICES BUTTON */}
          <button
            onClick={()=>{setPressedServices(true);setTimeout(onServices,280);}}
            style={{
              background:pressedServices
                ?'linear-gradient(145deg,#044434,#065F46,#059669)'
                :'linear-gradient(145deg,#064E3B 0%,#065F46 45%,#059669 100%)',
              borderRadius:28,border:'1.5px solid rgba(52,211,153,0.45)',
              boxShadow:pressedServices
                ?'0 0 0 4px rgba(5,150,105,0.4),0 20px 50px rgba(5,150,105,0.6),inset 0 1px 0 rgba(255,255,255,0.25)'
                :'0 10px 40px rgba(5,150,105,0.5),inset 0 1px 0 rgba(255,255,255,0.2)',
              padding:'28px 24px',cursor:'pointer',
              transform:pressedServices?'scale(0.96)':'scale(1)',
              transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              position:'relative',overflow:'hidden',textAlign:'center',
            }}>
            {/* Glass shine */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0) 100%)',borderRadius:'28px 28px 60% 60%',pointerEvents:'none'}}/>
            {/* Icons row */}
            <div style={{display:'flex',justifyContent:'center',gap:12,marginBottom:14}}>
              {['🛵','🚖','🌹','🚬','💊'].map((ic,i)=>(
                <span key={i} style={{fontSize:28,filter:'drop-shadow(0 4px 10px rgba(0,0,0,0.3))',display:'inline-block',animation:`hubFloat ${3+i*0.4}s ease-in-out ${i*0.2}s infinite`}}>{ic}</span>
              ))}
            </div>
            <p style={{color:'#fff',fontSize:22,fontWeight:900,letterSpacing:'0.1em',margin:'0 0 6px',textShadow:'0 2px 8px rgba(0,0,0,0.4)'}} className={fClass}>{t.hubServices}</p>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:11,fontWeight:600,margin:0}} className={fClass}>{t.hubServicesSub}</p>
          </button>

          {/* GAME BUTTON */}
          <button
            onClick={()=>{setPressedGame(true);setTimeout(()=>navigate('/game'),280);}}
            style={{
              background:pressedGame
                ?'linear-gradient(145deg,#0a1f12,#0f2d1c,#193d28)'
                :'linear-gradient(145deg,#071A10 0%,#0D3020 50%,#142E1E 100%)',
              borderRadius:28,border:'1.5px solid rgba(74,222,128,0.4)',
              boxShadow:pressedGame
                ?'0 0 0 4px rgba(74,222,128,0.3),0 20px 50px rgba(6,95,70,0.5),inset 0 1px 0 rgba(255,255,255,0.2)'
                :'0 10px 40px rgba(6,95,70,0.4),inset 0 1px 0 rgba(255,255,255,0.12)',
              padding:'28px 24px',cursor:'pointer',
              transform:pressedGame?'scale(0.96)':'scale(1)',
              transition:'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              position:'relative',overflow:'hidden',textAlign:'center',
            }}>
            {/* Glass shine */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:'50%',background:'linear-gradient(180deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0) 100%)',borderRadius:'28px 28px 60% 60%',pointerEvents:'none'}}/>
            {/* Shark image + gem icon */}
            <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:16,marginBottom:14}}>
              <div style={{width:64,height:64,borderRadius:'50%',overflow:'hidden',border:'2px solid #D9C5A0',boxShadow:'0 0 20px rgba(74,222,128,0.5)',flexShrink:0}}>
                <img src="/bridge-shark.png" alt="Game" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <span style={{fontSize:32,animation:'hubGemSpin 3s ease-in-out infinite',display:'inline-block',filter:'drop-shadow(0 0 12px rgba(253,224,71,0.7))'}}>💎</span>
                <div style={{background:'rgba(74,222,128,0.18)',border:'1px solid rgba(74,222,128,0.5)',borderRadius:6,padding:'2px 8px'}}>
                  <span style={{color:'#4ADE80',fontSize:9,fontWeight:900,letterSpacing:'0.18em'}}>BRIDGE GAME</span>
                </div>
              </div>
            </div>
            <p style={{color:'#FDE047',fontSize:22,fontWeight:900,letterSpacing:'0.06em',margin:'0 0 6px',textShadow:'0 2px 12px rgba(253,224,71,0.4)'}} className={fClass}>{t.hubGame}</p>
            <p style={{color:'rgba(255,255,255,0.6)',fontSize:11,fontWeight:600,margin:0}} className={fClass}>{t.hubGameSub}</p>
          </button>
        </div>

        {/* Footer */}
        <p style={{color:'#9CA3AF',fontSize:9,textAlign:'center',marginTop:24,letterSpacing:'0.15em'}}>© 2026 BRIDGE SAFI · safi-bridge.ma</p>
      </div>

      <WAButton/>
      {showProfileModal&&<ProfileModal lang={lang} profile={profile} onSave={saveProfile} onClose={()=>setShowProfileModal(false)}/>}
    </div>
  );
}

function loadNav() {
  try {
    const raw=localStorage.getItem(NAV_KEY);
    if(!raw) return null;
    return JSON.parse(raw) as {lang:Lang;service:'none'|'delivery'|'taxi'|'tabac'|'fleurs'|'pharmacie';page:Page;restaurantId:string|null};
  } catch { return null; }
}

export default function App() {
  const saved = loadNav();
  const { isLoaded, isSignedIn, user } = useUser();
  const [, navigate] = useLocation();

  // ── Dark mode ──────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem(DARK_KEY) === '1'; } catch { return false; }
  });
  const toggleDark = useCallback(() => setIsDark(d => {
    const next = !d;
    try { localStorage.setItem(DARK_KEY, next ? '1' : '0'); } catch {}
    return next;
  }), []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const [lang,setLang]         = useState<Lang>(saved?.lang??'fr');
  const [page,setPage]         = useState<Page>(saved?.page??'home');
  // splashDone becomes true after 3s; we also wait for Clerk to load
  const [splashDone,setSplashDone] = useState(false);
  const [mode,setMode]             = useState<'hub'|'services'>('hub');
  const [service,setService]       = useState<'none'|'delivery'|'taxi'|'tabac'|'fleurs'|'pharmacie'>(saved?.service??'none');
  const [cart,setCart]         = useState<CartItem[]>([]);
  const [showCart,setShowCart] = useState(false);
  const [showProfile,setShowProfile] = useState(false);
  const [showDriver,setShowDriver] = useState(false);
  const [lastOrderRef,setLastOrderRef] = useState<string>(()=>localStorage.getItem('bridge_last_ref')||'');
  const [selectedRestaurant,setSelectedRestaurant] = useState<Restaurant|null>(
    saved?.restaurantId ? (RESTAURANTS.find(r=>r.id===saved.restaurantId)??null) : null
  );
  const {profile,saveProfile}  = useProfile(user?.id);

  // Splash timer — 3 seconds
  useEffect(()=>{
    const t=setTimeout(()=>setSplashDone(true),1500);
    return()=>clearTimeout(t);
  },[]);

  // Redirect to sign-in only after Clerk fully loaded + splash done + grace delay
  // Avoids false redirects while session is restoring from cookies/localStorage
  useEffect(()=>{
    if(!isLoaded) return;
    if(isSignedIn){
      try { localStorage.setItem('bridge_was_signed_in','1'); } catch {}
      return;
    }
    // Short grace period so Clerk can restore session from cookies (max 2.5s)
    const t = setTimeout(()=>{
      if(!isSignedIn) navigate('/sign-in');
    }, 2500);
    return () => clearTimeout(t);
  },[isLoaded,isSignedIn]);

  // Persist nav state on every relevant change
  useEffect(()=>{
    try {
      localStorage.setItem(NAV_KEY,JSON.stringify({
        lang, service, page,
        restaurantId: selectedRestaurant?.id ?? null,
      }));
    } catch {}
  },[lang,service,page,selectedRestaurant]);

  // ── Auto-sync Clerk user data → profile (email + name si vide) ──────────────
  useEffect(()=>{
    if(!user) return;
    const clerkEmail = user.primaryEmailAddress?.emailAddress || '';
    const clerkPhone = user.primaryPhoneNumber?.phoneNumber || '';
    const clerkName  = [user.firstName, user.lastName].filter(Boolean).join(' ');
    let updated = false;
    const patch: Partial<UserProfile> = {};
    if (clerkEmail && !profile.email) { patch.email = clerkEmail; updated = true; }
    if (clerkPhone && !profile.phone) { patch.phone = clerkPhone; updated = true; }
    if (clerkName  && !profile.name)  { patch.name  = clerkName;  updated = true; }
    if (updated) saveProfile({ ...profile, ...patch });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user?.id]);

  const t=T[lang]; const isAR=lang==='ar'; const isAMZ=lang==='amz'; const fClass=fontClass(lang);
  const cycleLang=()=>setLang(l=>LANG_CYCLE[(LANG_CYCLE.indexOf(l)+1)%LANG_CYCLE.length]);

  const addToCart=(ci:CartItem)=>setCart(prev=>{
    const found=prev.find(x=>x.cartId===ci.cartId||
      (x.item.id===ci.item.id&&JSON.stringify(x.selectedOptions)===JSON.stringify(ci.selectedOptions)));
    if(found) return prev.map(x=>x.cartId===found.cartId?{...x,qty:x.qty+1}:x);
    return [...prev,ci];
  });

  const adjustQty=(cartId:string,delta:number)=>setCart(prev=>
    prev.flatMap(i=>{if(i.cartId!==cartId)return[i];const q=i.qty+delta;return q>0?[{...i,qty:q}]:[];})
  );

  const clearCart=()=>setCart([]);
  const cartCount=cart.reduce((s,i)=>s+i.qty,0);

  const handleSelectRestaurant=(r:Restaurant)=>{setSelectedRestaurant(r);setPage('restaurant');};
  const handleBack=()=>{setPage('home');setSelectedRestaurant(null);};

  const TABS:Page[]=['home','tracking','contact'];

  // ── Stable dark context value (must be before any conditional return) ──
  const dv = useMemo(() => ({ dark: isDark, toggle: toggleDark }), [isDark, toggleDark]);
  const handleOrderSuccess=(ref:string)=>{setLastOrderRef(ref);setService('none');setPage('tracking');};

  // Show splash while timer running OR Clerk still loading OR session not yet confirmed
  const showSplash = !splashDone || !isLoaded || !isSignedIn;
  if(showSplash) return <SplashScreen/>;

  // Profile onboarding after first sign-in
  if(!profile.onboardingComplete) return (
    <DarkModeCtx.Provider value={dv}>
      <ProfileOnboardingScreen
        lang={lang}
        profile={profile}
        saveProfile={saveProfile}
        onDone={()=>saveProfile({...profile,onboardingComplete:true})}
      />
    </DarkModeCtx.Provider>
  );

  if(mode==='hub') return <DarkModeCtx.Provider value={dv}><HubPage onServices={()=>setMode('services')} lang={lang} cycleLang={cycleLang} profile={profile} saveProfile={saveProfile}/><PWAInstallBanner lang={lang}/></DarkModeCtx.Provider>;

  const backToHub=()=>{setMode('hub');setService('none');};
  if(service==='none') return <DarkModeCtx.Provider value={dv}><ServiceSelectPage onSelect={s=>setService(s)} lang={lang} cycleLang={cycleLang} profile={profile} saveProfile={saveProfile}/><PWAInstallBanner lang={lang}/></DarkModeCtx.Provider>;
  if(service==='taxi') return <DarkModeCtx.Provider value={dv}><TaxiPage onBack={()=>setService('none')} lang={lang} cycleLang={cycleLang} profile={profile} saveProfile={saveProfile}/></DarkModeCtx.Provider>;
  if(service==='tabac') return <DarkModeCtx.Provider value={dv}><TabacPage onBack={()=>setService('none')} lang={lang} cycleLang={cycleLang} profile={profile} saveProfile={saveProfile} onOrderSuccess={handleOrderSuccess}/></DarkModeCtx.Provider>;
  if(service==='fleurs') return <DarkModeCtx.Provider value={dv}><FleurPage onBack={()=>setService('none')} lang={lang} cycleLang={cycleLang} profile={profile} saveProfile={saveProfile} onOrderSuccess={handleOrderSuccess}/></DarkModeCtx.Provider>;
  if(service==='pharmacie') return <DarkModeCtx.Provider value={dv}><PharmaciePage onBack={backToHub} lang={lang} profile={profile}/></DarkModeCtx.Provider>;

  // Pill button style (shared between lang + profile)
  const pillStyle:React.CSSProperties={
    background:'var(--c-card)',border:'2.5px solid #D9C5A0',color:'#065F46',
    boxShadow:'0 4px 20px rgba(6,95,70,0.15)',height:'44px',minWidth:'44px',
  };

  return (
  <DarkModeCtx.Provider value={dv}>
    <div className={`min-h-screen overflow-x-hidden ${isAR?'rtl':'ltr'}`} style={{color:'var(--c-text)'}}>

      {/* ── Top-left: Services back + Driver ── */}
      <div className={`fixed top-5 z-50 flex items-center gap-2 ${isAR?'right-5':'left-5'}`}>
        <button onClick={()=>setService('none')}
          className="flex items-center gap-0.5 px-1.5 rounded-full transition-all active:scale-90 hover:scale-110"
          style={{...pillStyle, height:'24px', minWidth:'unset'}}>
          <span style={{fontSize:'9px', lineHeight:1}}>🚬</span>
          <span style={{fontSize:'8px', color:'#D9C5A0', fontWeight:900}}>|</span>
          <span style={{fontSize:'9px', lineHeight:1}}>🚖</span>
          <span style={{fontSize:'8px', color:'#D9C5A0', fontWeight:900}}>|</span>
          <span style={{fontSize:'9px', lineHeight:1}}>🌹</span>
          <span style={{fontSize:'8px', lineHeight:1, color:'#9CA3AF'}}>←</span>
        </button>
        <button onClick={()=>setShowDriver(true)}
          className="flex items-center gap-1 px-2 rounded-full transition-all active:scale-90 hover:scale-110 font-black text-[10px]"
          style={{...pillStyle, height:'24px', minWidth:'unset', color:'#065F46'}}>
          <span style={{fontSize:'11px'}}>🛵</span>
        </button>
      </div>

      {/* ── Top-right: Profile + Language ── */}
      <div className={`fixed top-5 z-50 flex items-center gap-2 ${isAR?'left-5':'right-5'}`}>
        <button onClick={()=>setShowProfile(true)}
          className="rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 hover:scale-110 relative"
          style={{...pillStyle,width:'44px',padding:0,overflow:'hidden'}}>
          {profile.avatar
            ?<img src={profile.avatar} alt="Profil" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            :<span style={{fontSize:'18px'}}>👤</span>
          }
          {profile.name&&<span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white" style={{background:'#10B981'}}/>}
        </button>
        <button onClick={cycleLang}
          className={`rounded-full flex items-center justify-center font-black text-sm transition-all active:scale-90 hover:scale-110 px-3 ${isAMZ?'font-tifinagh':''}`}
          style={{...pillStyle,fontSize:'13px'}}>
          {LANG_LABELS[lang]}
        </button>
        <DarkToggle/>
      </div>


      {/* ── Header ── */}
      <header className="relative pt-14 pb-4 flex flex-col items-center"
        style={{borderBottom:'1px solid var(--c-border)',background:'var(--c-nav-soft)',backdropFilter:'blur(14px)'}}>
        <img src="/logo.jpeg" alt="Bridge" className="h-14 w-14 rounded-full object-cover"
          style={{border:'2.5px solid #D9C5A0',boxShadow:'0 4px 16px rgba(6,95,70,0.15)'}}/>
        <h1 className="mt-2 text-[11px] font-black tracking-[0.45em] uppercase" style={{color:'#065F46'}}>
          {isAMZ?'ⴱⵔⵉⴷⵊ':isAR?'بريدج':'Bridge'}
        </h1>
        <p className={`text-[9px] tracking-widest mt-0.5 ${fClass}`} style={{color:'#B45309'}}>{t.zone}</p>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-md mx-auto pt-5 pb-28">
        {page==='home'&&<HomePage lang={lang} t={t} onSelectRestaurant={handleSelectRestaurant}/>}
        {page==='restaurant'&&selectedRestaurant&&(
          <RestaurantPage restaurant={selectedRestaurant} lang={lang} t={t} onBack={handleBack} onAddToCart={addToCart}/>
        )}
        {page==='tracking'&&<TrackingPage lang={lang} t={t} orderRef={lastOrderRef}/>}
        {page==='contact'&&<ContactPage lang={lang} t={t}/>}
      </main>

      {/* ── Bottom nav (hidden on TV/large screens) ── */}
      <nav className="tv-hide-on-tv fixed bottom-0 inset-x-0 z-40"
        style={{background:'var(--c-nav)',backdropFilter:'blur(20px)',borderTop:'1px solid var(--c-border)'}}>
        <div className="max-w-md mx-auto flex">
          {([
            {id:'home' as Page,label:t.navHome,icon:'🏠'},
            {id:'tracking' as Page,label:t.navTrack,icon:'📍'},
          ]).map(tab=>(
            <button key={tab.id} onClick={()=>{setPage(tab.id);if(tab.id==='home')setSelectedRestaurant(null);}}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all">
              <span className="text-xl transition-transform" style={{transform:page===tab.id&&!(page==='home'&&selectedRestaurant)?'scale(1.15)':'scale(1)'}}>{tab.icon}</span>
              <span className={`text-[10px] font-black uppercase tracking-wide ${fClass}`} style={{color:page===tab.id&&!(tab.id==='home'&&selectedRestaurant&&page==='restaurant')?'#065F46':'#9CA3AF'}}>{tab.label}</span>
              {page===tab.id&&tab.id!=='home'&&<div className="w-5 h-0.5 rounded-full" style={{background:'#065F46'}}/>}
              {tab.id==='home'&&page!=='restaurant'&&page==='home'&&<div className="w-5 h-0.5 rounded-full" style={{background:'#065F46'}}/>}
            </button>
          ))}
          {/* Panier — 3e onglet */}
          <button onClick={()=>setShowCart(true)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all active:scale-90 relative">
            <span className="text-xl relative">
              🛒
              {cartCount>0&&(
                <span className="absolute -top-1 -right-2 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center" style={{background:'#4F46E5'}}>{cartCount}</span>
              )}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wide ${fClass}`} style={{color:cartCount>0?'#4F46E5':'#9CA3AF'}}>
              {t.navCart||'Panier'}
            </span>
          </button>
        </div>
        <p className="text-center text-[9px] pb-2" style={{color:'#C9BFB2'}}>{t.footer}</p>
      </nav>

      <WAButton/>
      <PWAInstallBanner lang={lang}/>
      {showCart&&<CheckoutDrawer cart={cart} lang={lang} onClose={()=>setShowCart(false)} onQty={adjustQty} profile={profile} onClearCart={clearCart} restaurantName={selectedRestaurant?.name} onOrderSuccess={ref=>{setLastOrderRef(ref);setPage('tracking');setShowCart(false);}}/>}
      {showProfile&&<ProfileModal lang={lang} profile={profile} onSave={saveProfile} onClose={()=>setShowProfile(false)}/>}

      {showDriver&&(
        <div className="fixed inset-0 z-50 flex items-end" style={{background:'rgba(10,30,20,0.7)',backdropFilter:'blur(6px)'}} onClick={()=>setShowDriver(false)}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl p-6" style={{background:'var(--c-bg)',boxShadow:'0 -20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#065F46,#047857)'}}>🛵</div>
              <div>
                <p className="font-black text-sm" style={{color:'#065F46'}}>Bridge Logistique</p>
                <p className="text-xs" style={{color:'#9CA3AF'}}>Portail livreurs · Tableau de bord</p>
              </div>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{color:'#6B7280'}}>
              Accès réservé aux livreurs Bridge. Gérez vos livraisons, suivez vos commandes en temps réel.
            </p>
            <a href={DRIVER_APP_URL} target="_blank" rel="noopener noreferrer"
              className="block w-full py-3.5 rounded-2xl text-center font-black text-sm text-white"
              style={{background:'linear-gradient(135deg,#065F46,#047857)',boxShadow:'0 6px 20px rgba(6,95,70,0.3)'}}>
              Ouvrir l'app livreur →
            </a>
            <button onClick={()=>setShowDriver(false)} className="block w-full mt-3 py-3 rounded-2xl text-center text-xs font-bold" style={{color:'#9CA3AF',background:'#F3F4F6'}}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  </DarkModeCtx.Provider>
  );
}
