import React, { Component, useEffect, useRef, useState } from 'react';
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/react';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import App from "./App";
import "./index.css";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient();

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#065F46',
    colorBackground: 'transparent',
    colorText: '#1A2F23',
    colorTextSecondary: '#6B7280',
    colorInputBackground: '#F9F7F2',
    colorInputText: '#1A2F23',
    colorInputPlaceholder: '#9CA3AF',
    borderRadius: '14px',
    fontFamily: 'inherit',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none p-0 bg-transparent border-none',
    headerTitle: '!hidden',
    headerSubtitle: '!hidden',
    header: '!hidden',
    // Hide all social/OAuth buttons (Google, Apple, etc.)
    socialButtonsRoot: '!hidden',
    socialButtonsBlockButton: '!hidden',
    socialButtonsBlockButtonText: '!hidden',
    socialButtonsIconButton: '!hidden',
    // Hide the "or" divider between social and email form
    dividerRow: '!hidden',
    dividerText: '!hidden',
    // Hide "use another method" link
    alternativeMethodsBlockButton: '!hidden',
    formFieldAction: 'text-[#065F46] font-bold hover:text-[#047857]',
    formFieldInput: 'rounded-2xl border-2 border-[#E5E1D8] focus:border-[#065F46] bg-[#F9F7F2] text-sm h-12 px-4',
    formFieldLabel: 'text-xs font-black text-[#065F46] uppercase tracking-wider',
    formButtonPrimary: 'bg-[#065F46] hover:bg-[#047857] rounded-2xl h-12 text-sm font-black tracking-widest transition-all shadow-lg shadow-green-900/20',
    footerActionLink: 'text-[#065F46] font-bold hover:text-[#047857]',
    identityPreviewText: 'text-[#1A2F23]',
    formFieldSuccessText: 'text-green-700',
    formFieldErrorText: 'text-red-600 text-xs',
    alertText: 'text-sm',
    otpCodeFieldInput: 'rounded-xl border-2 border-[#E5E1D8] focus:border-[#065F46] bg-[#F9F7F2] font-black text-lg',
  },
};

function AuthPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #011c15 0%, #054130 30%, #065F46 60%, #033d2c 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Geometric zellige pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D9C5A0' fill-opacity='1'%3E%3Cpath d='M30 0L0 30L30 60L60 30L30 0zm0 10L50 30L30 50L10 30L30 10z'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }}/>

      {/* Top arch glow */}
      <div style={{
        position: 'absolute', top: 0, left: '-20%', right: '-20%', height: '300px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(217,197,160,0.08) 0%, transparent 70%)',
      }}/>

      {/* Bottom glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: '-20%', right: '-20%', height: '200px',
        background: 'radial-gradient(ellipse at 50% 100%, rgba(6,95,70,0.3) 0%, transparent 70%)',
      }}/>

      {/* Logo block */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid #D9C5A0',
          boxShadow: '0 0 0 6px rgba(217,197,160,0.12), 0 16px 48px rgba(0,0,0,0.4)',
          margin: '0 auto 1rem',
        }}>
          <img src="/logo_splash_new.png" alt="Bridge Safi"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }} />
        </div>

        <h1 style={{
          color: 'white', fontWeight: 900, fontSize: '1.6rem',
          letterSpacing: '0.45em', margin: 0, textShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}>
          BRIDGE
        </h1>
        <p style={{
          color: '#D9C5A0', fontSize: '0.62rem', letterSpacing: '0.2em',
          fontWeight: 700, margin: '4px 0 0', opacity: 0.9,
        }}>
          SAFI · MAROC · آسفي · ⵙⴰⴼⵉ
        </p>

        {/* Gold bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', margin: '14px 0 6px' }}>
          <div style={{ width: 36, height: 1, background: 'linear-gradient(to right, transparent, #D9C5A0)' }} />
          <div style={{ width: 5, height: 5, background: '#D9C5A0', transform: 'rotate(45deg)' }} />
          <div style={{ width: 36, height: 1, background: 'linear-gradient(to left, transparent, #D9C5A0)' }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem', letterSpacing: '0.18em', marginTop: 4 }}>
          Bienvenue · Welcome · أهلاً وسهلاً
        </p>
      </div>

      {/* Auth card */}
      <div style={{
        background: 'rgba(253,252,249,0.98)',
        borderRadius: 28,
        padding: '2rem 1.5rem 1.5rem',
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,197,160,0.25)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Top gold accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 3,
          background: 'linear-gradient(to right, transparent, #D9C5A0, transparent)',
          borderRadius: '0 0 4px 4px',
        }} />
        {children}
      </div>

      {/* Footer */}
      <p style={{
        color: 'rgba(255,255,255,0.2)', fontSize: '0.55rem',
        marginTop: '1.5rem', letterSpacing: '0.15em', textAlign: 'center',
        position: 'relative', zIndex: 1,
      }}>
        © 2026 BRIDGE SAFI · safi-bridge.ma · 🔒 Sécurisé
      </p>
    </div>
  );
}

function AuthCardHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #E5E1D8' }}>
      <h2 style={{ fontWeight: 900, fontSize: '1.2rem', color: '#1A2F23', margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
      <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '4px 0 0', fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

// ─── SHARED FORM STYLES ───────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: 14,
  border: '2px solid #E5E1D8', background: '#F9F7F2', color: '#1A2F23',
  fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const inpFocus: React.CSSProperties = { ...inp, border: '2px solid #065F46' };
const label: React.CSSProperties = {
  display: 'block', fontSize: '0.65rem', fontWeight: 900,
  color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6,
};
const btn: React.CSSProperties = {
  width: '100%', padding: '0.875rem', borderRadius: 14, border: 'none',
  background: '#065F46', color: 'white', fontWeight: 900, fontSize: '0.875rem',
  letterSpacing: '0.08em', cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 6px 20px rgba(6,95,70,0.25)', marginTop: 4,
};
const errStyle: React.CSSProperties = {
  background: '#FEE2E2', border: '1.5px solid #FCA5A5', borderRadius: 10,
  padding: '0.6rem 0.875rem', fontSize: '0.75rem', color: '#B91C1C', fontWeight: 600,
};

function FocusInput({ label: labelText, type = 'text', value, onChange, placeholder, autoComplete }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={label}>{labelText}</label>
      <input
        type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        style={focused ? inpFocus : inp}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── SIGN-IN PAGE (custom — email/phone + password, single screen) ─────────

// ─── FORGOT PASSWORD PAGE ─────────────────────────────────────────────────────

function ForgotPasswordPage() {
  const clerk = useClerk();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'identifier' | 'reset'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [resetStrategy, setResetStrategy] = useState<'reset_password_email_code' | 'reset_password_phone_code'>('reset_password_email_code');
  const [code, setCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Normalize Moroccan phone to E.164 (+212XXXXXXXXX)
  const normalizePhone = (v: string): string => {
    const digits = v.replace(/\D/g, '');
    if (digits.startsWith('212') && digits.length >= 11) return '+' + digits;
    if (digits.startsWith('0') && digits.length === 10) return '+212' + digits.slice(1);
    if (digits.length === 9) return '+212' + digits;
    return v.trim();
  };

  // Detect if input looks like a phone number
  const isPhone = (v: string) => {
    const d = v.trim().replace(/[\s\-().]/g, '');
    return /^(\.|00)?[0-9]{9,15}$/.test(d) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!identifier.trim()) { setError('Entrez votre adresse email.'); return; }
    if (isPhone(identifier)) {
      setError('La réinitialisation par SMS n\.est pas disponible. Entrez l\.adresse email associée à votre compte.');
      return;
    }
    setLoading(true); setError('');

    try {
      await clerk.client.signIn.create({ strategy: 'reset_password_email_code', identifier: identifier.trim() });
      setResetStrategy('reset_password_email_code');
      setStep('reset');
    } catch (err: any) {
      const msg = (err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('identifier') || msg.includes('no user')) {
        setError(`Aucun compte trouvé pour ${identifier.trim()}. Vérifiez votre adresse email.`);
      } else {
        setError('Erreur lors de l\.envoi du code. Réessayez dans quelques secondes.');
      }
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!code.trim()) { setError('Entrez le code reçu.'); return; }
    if (newPwd.length < 8) { setError('Mot de passe trop faible (8 caractères minimum).'); return; }
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true); setError('');
    try {
      const result = await clerk.client.signIn.attemptFirstFactor({
        strategy: resetStrategy,
        code: code.trim(),
        password: newPwd,
      } as any);
      if (result.status === 'complete') {
        localStorage.setItem('bridge_was_signed_in', '1');
        await clerk.setActive({ session: result.createdSessionId });
        navigate(basePath || '/');
      } else if (result.status === 'needs_second_factor') {
        setError('Vérification supplémentaire requise. Contactez le support Bridge.');
      } else {
        setError('Réinitialisation incomplète. Réessayez.');
      }
    } catch (err: any) {
      const msg = (err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || '').toLowerCase();
      if (msg.includes('incorrect') || msg.includes('invalid') || msg.includes('expired')) {
        setError('Code incorrect ou expiré. Demandez un nouveau code.');
      } else if (msg.includes('password')) {
        setError('Mot de passe trop faible. Choisissez-en un plus solide.');
      } else {
        setError('Erreur. Réessayez ou contactez le support.');
      }
    }
    setLoading(false);
  };

  if (step === 'reset') return (
    <AuthPageWrapper>
      <AuthCardHeader
        title="Nouveau mot de passe"
        sub={isPhone(identifier)
          ? `SMS envoyé au ${normalizePhone(identifier)} · Entrez le code reçu`
          : `Code envoyé à ${identifier.trim()} · Vérifiez vos emails`}
      />
      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column' }}>
        <FocusInput label="Code reçu (6 chiffres)" value={code} onChange={setCode}
          placeholder="123456" autoComplete="one-time-code" type="tel" />
        <FocusInput label="Nouveau mot de passe (8 car. min.)" type="password" value={newPwd}
          onChange={setNewPwd} placeholder="••••••••" autoComplete="new-password" />
        <FocusInput label="Confirmer le nouveau mot de passe" type="password" value={confirmPwd}
          onChange={setConfirmPwd} placeholder="••••••••" autoComplete="new-password" />
        {error && <div style={errStyle}>{error}</div>}
        <button type="submit" style={{...btn, opacity: loading ? 0.7 : 1}} disabled={loading}>
          {loading ? 'Mise à jour...' : 'Réinitialiser mon mot de passe →'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button onClick={() => { setStep('identifier'); setError(''); setCode(''); }}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.75rem', cursor: 'pointer' }}>
          ← Retour
        </button>
      </div>
    </AuthPageWrapper>
  );

  return (
    <AuthPageWrapper>
      <AuthCardHeader
        title="Mot de passe oublié"
        sub="Entrez votre adresse email pour recevoir un code de réinitialisation"
      />
      <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column' }}>
        <FocusInput label="Adresse email" value={identifier} onChange={setIdentifier}
          placeholder="email@example.com" autoComplete="email" type="email" />
        {error && <div style={errStyle}>{error}</div>}
        <button type="submit" style={{...btn, opacity: loading ? 0.7 : 1}} disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer le code →'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E5E1D8' }}>
        <button onClick={() => navigate('/sign-in')}
          style={{ background: 'none', border: 'none', color: '#065F46', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
          ← Retour à la connexion
        </button>
      </div>
    </AuthPageWrapper>
  );
}

// Factor state shared across sign-in steps
type FactorKind = 'first' | 'second';
type FactorStrategy = 'email_code' | 'phone_code' | 'totp' | string;

const STAY_KEY = 'bridge_stay_signed_in';

function SignInPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [staySignedIn, setStaySignedIn] = useState<boolean>(() => {
    const v = localStorage.getItem(STAY_KEY);
    return v === null ? true : v === 'true';
  });

  // Already signed in → go straight to the app
  useEffect(() => {
    if (isLoaded && isSignedIn) navigate(basePath || '/');
  }, [isLoaded, isSignedIn, navigate]);
  // What factor/strategy Clerk is waiting for
  const [factorKind, setFactorKind] = useState<FactorKind>('second');
  const [factorStrategy, setFactorStrategy] = useState<FactorStrategy>('email_code');
  const [factorDest, setFactorDest] = useState(''); // e.g. "khalidou@icloud.com" or "+212..."

  // Pick the best available factor from a list and return prep params
  const pickFactor = (factors: any[]): { strategy: FactorStrategy; dest: string; prepParams: any } | null => {
    // Priority: email_code > phone_code > totp
    const order: FactorStrategy[] = ['email_code', 'phone_code', 'totp'];
    for (const s of order) {
      const f = factors?.find((x: any) => x.strategy === s);
      if (!f) continue;
      const prepParams: any = { strategy: s };
      let dest = '';
      if (f.safeIdentifier) dest = f.safeIdentifier;
      if (f.emailAddressId) prepParams.emailAddressId = f.emailAddressId;
      if (f.phoneNumberId) prepParams.phoneNumberId = f.phoneNumberId;
      return { strategy: s, dest, prepParams };
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      const result = await clerk.client.signIn.create({
        identifier: identifier.trim(),
        password,
      });
      if (result.status === 'complete') {
        localStorage.setItem(STAY_KEY, String(staySignedIn));
        localStorage.setItem('bridge_was_signed_in', '1');
        await clerk.setActive({ session: result.createdSessionId });
        navigate(basePath || '/');
      } else if (result.status === 'needs_second_factor') {
        const picked = pickFactor((result as any).supportedSecondFactors || []);
        if (picked) {
          setFactorKind('second');
          setFactorStrategy(picked.strategy);
          setFactorDest(picked.dest);
          if (picked.strategy !== 'totp') {
            await clerk.client.signIn.prepareSecondFactor(picked.prepParams);
          }
        }
        setStep('otp');
      } else if (result.status === 'needs_first_factor') {
        const picked = pickFactor((result as any).supportedFirstFactors || []);
        if (picked) {
          setFactorKind('first');
          setFactorStrategy(picked.strategy);
          setFactorDest(picked.dest);
          if (picked.strategy !== 'totp') {
            await clerk.client.signIn.prepareFirstFactor(picked.prepParams);
          }
        }
        setStep('otp');
      } else {
        setError('Connexion incomplète. Contactez le support.');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || '';
      if (msg.toLowerCase().includes('password')) setError('Mot de passe incorrect.');
      else if (msg.toLowerCase().includes('identifier') || msg.toLowerCase().includes('not found')) setError('Compte introuvable. Vérifiez votre email ou téléphone.');
      else setError(msg || 'Identifiants incorrects. Réessayez.');
    }
    setLoading(false);
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      let result: any;
      if (factorKind === 'second') {
        result = await clerk.client.signIn.attemptSecondFactor({ strategy: factorStrategy as any, code });
      } else {
        result = await clerk.client.signIn.attemptFirstFactor({ strategy: factorStrategy as any, code });
      }
      if (result.status === 'complete') {
        localStorage.setItem(STAY_KEY, String(staySignedIn));
        localStorage.setItem('bridge_was_signed_in', '1');
        await clerk.setActive({ session: result.createdSessionId });
        navigate(basePath || '/');
      } else {
        setError('Code incorrect. Réessayez.');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || '';
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')) {
        setError('Code incorrect ou expiré. Réessayez.');
      } else {
        setError(msg || 'Code incorrect. Réessayez.');
      }
    }
    setLoading(false);
  };

  // Build the OTP subtitle based on where the code was sent
  const otpSub = factorStrategy === 'totp'
    ? 'Code depuis votre application authenticator (TOTP)'
    : factorStrategy === 'phone_code'
    ? `SMS envoyé au ${factorDest || 'votre téléphone'}`
    : `Email envoyé à ${factorDest || identifier.trim()}`;

  if (step === 'otp') return (
    <AuthPageWrapper>
      <AuthCardHeader title="Vérification · Verify" sub={otpSub} />
      <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column' }}>
        <FocusInput
          label={factorStrategy === 'totp' ? 'Code authenticator (6 chiffres)' : 'Code de vérification (6 chiffres)'}
          value={code} onChange={setCode} placeholder="123456"
          autoComplete="one-time-code" type="tel"
        />
        {error && <div style={errStyle}>{error}</div>}
        {/* Hint for totp */}
        {factorStrategy === 'totp' && (
          <p style={{ fontSize: '0.72rem', color: '#9CA3AF', textAlign: 'center', margin: '-4px 0 10px' }}>
            Ouvrez Google Authenticator ou Authy pour obtenir le code
          </p>
        )}
        <button type="submit" style={{...btn, opacity: loading ? 0.7 : 1}} disabled={loading}>
          {loading ? 'Vérification...' : 'Confirmer →'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.75rem', cursor: 'pointer' }}>
          ← Retour
        </button>
      </div>
    </AuthPageWrapper>
  );

  return (
    <AuthPageWrapper>
      <AuthCardHeader title="Connexion · Sign in" sub="Email · Téléphone · Mot de passe" />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <FocusInput label="Email ou numéro de téléphone" value={identifier} onChange={setIdentifier}
          placeholder="+212 6XX XXX XXX ou email@..." autoComplete="username" />
        <FocusInput label="Mot de passe" type="password" value={password} onChange={setPassword}
          placeholder="••••••••" autoComplete="current-password" />
        {error && (
          error.toLowerCase().includes('already signed in') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '6px 0' }}>
              <div style={{ ...errStyle, margin: 0 }}>{error}</div>
              <button
                type="button"
                onClick={() => { window.location.href = basePath + '/'; }}
                style={{
                  padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg,#059669 0%,#4ADE80 50%,#059669 100%)',
                  color: '#fff', fontSize: 15, fontWeight: 800,
                  boxShadow: '0 0 24px rgba(74,222,128,0.35)',
                }}>
                ← Retourner à l&apos;application
              </button>
            </div>
          ) : (
            <div style={errStyle}>{error}</div>
          )
        )}

        {/* Stay signed in checkbox */}
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',margin:'10px 0 2px',userSelect:'none'}}>
          <div onClick={()=>setStaySignedIn(v=>!v)} style={{
            width:20,height:20,borderRadius:6,border:`2px solid ${staySignedIn?'#065F46':'#D1D5DB'}`,
            background:staySignedIn?'#065F46':'white',
            display:'flex',alignItems:'center',justifyContent:'center',
            flexShrink:0,transition:'all 0.18s',cursor:'pointer',
          }}>
            {staySignedIn&&<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{fontSize:'0.78rem',color:'#374151',fontWeight:600,lineHeight:1.3}}>
            Rester connecté · Stay signed in
          </span>
        </label>

        <button type="submit" style={{...btn, opacity: loading ? 0.7 : 1, marginTop:14}} disabled={loading}>
          {loading ? 'Connexion...' : 'Connexion →'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button onClick={() => navigate('/forgot-password')}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>
          Mot de passe oublié ?
        </button>
      </div>
      <div style={{ textAlign: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E5E1D8' }}>
        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Pas encore de compte ? </span>
        <button onClick={() => navigate('/sign-up')}
          style={{ background: 'none', border: 'none', color: '#065F46', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
          Créer un compte
        </button>
      </div>
    </AuthPageWrapper>
  );
}

// ─── SIGN-UP PAGE (custom — name + email/phone + password, then OTP) ──────

const SIGNUP_LANGS = ['fr','en','ar','amz'] as const;
type SignUpLang = typeof SIGNUP_LANGS[number];

const SIGNUP_T: Record<SignUpLang, {
  title: string; sub: string; emailLabel: string; emailPh: string;
  passLabel: string; passPh: string; btnCreate: string; btnCreating: string;
  errEmail: string; errPhone: string; errPass: string; errId: string;
  alreadyHave: string; login: string;
  verifyTitle: string; verifySub: (id: string) => string; verifyLabel: string;
  btnVerify: string; btnVerifying: string; errCode: string; back: string;
  loadMsgs: string[];
}> = {
  fr: {
    title:'Créer un compte · Sign up', sub:'Email ou téléphone + mot de passe',
    emailLabel:'EMAIL OU NUMÉRO DE TÉLÉPHONE *', emailPh:'+212 6XX XXX XXX ou email@...',
    passLabel:'MOT DE PASSE * (8 CARACTÈRES MIN.)', passPh:'••••••••',
    btnCreate:'Créer mon compte →', btnCreating:'Création en cours...',
    errEmail:'Email invalide ou déjà utilisé.', errPhone:'Numéro invalide ou déjà utilisé.',
    errPass:'Mot de passe trop faible (8 caractères min.).', errId:'Email ou téléphone requis.',
    alreadyHave:'Déjà un compte ?', login:'Se connecter',
    verifyTitle:'Vérification · Verify', verifySub:(id)=>`Code envoyé à ${id}`,
    verifyLabel:'CODE DE VÉRIFICATION (6 CHIFFRES)', btnVerify:'Vérifier →', btnVerifying:'Vérification...',
    errCode:'Code incorrect ou expiré.', back:'← Retour',
    loadMsgs:['Bienvenue chez Bridge Safi 🇲🇦','Création de votre compte...','Préparation de vos services...','Presque prêt ✨','Connexion sécurisée 🔒'],
  },
  en: {
    title:'Create account · Créer un compte', sub:'Email or phone + password',
    emailLabel:'EMAIL OR PHONE NUMBER *', emailPh:'+212 6XX XXX XXX or email@...',
    passLabel:'PASSWORD * (MIN. 8 CHARACTERS)', passPh:'••••••••',
    btnCreate:'Create my account →', btnCreating:'Creating account...',
    errEmail:'Invalid or already used email.', errPhone:'Invalid or already used number.',
    errPass:'Password too weak (min. 8 characters).', errId:'Email or phone required.',
    alreadyHave:'Already have an account?', login:'Sign in',
    verifyTitle:'Verification · Vérification', verifySub:(id)=>`Code sent to ${id}`,
    verifyLabel:'VERIFICATION CODE (6 DIGITS)', btnVerify:'Verify →', btnVerifying:'Verifying...',
    errCode:'Wrong or expired code.', back:'← Back',
    loadMsgs:['Welcome to Bridge Safi 🇲🇦','Creating your account...','Setting up your services...','Almost ready ✨','Securing your connection 🔒'],
  },
  ar: {
    title:'إنشاء حساب · Sign up', sub:'البريد أو الهاتف + كلمة المرور',
    emailLabel:'البريد الإلكتروني أو رقم الهاتف *', emailPh:'+212 6XX XXX XXX أو email@...',
    passLabel:'كلمة المرور * (8 أحرف على الأقل)', passPh:'••••••••',
    btnCreate:'إنشاء حسابي ←', btnCreating:'جارٍ الإنشاء...',
    errEmail:'البريد غير صالح أو مستخدم مسبقاً.', errPhone:'الرقم غير صالح أو مستخدم مسبقاً.',
    errPass:'كلمة المرور ضعيفة (8 أحرف على الأقل).', errId:'البريد أو الهاتف مطلوب.',
    alreadyHave:'لديك حساب؟', login:'تسجيل الدخول',
    verifyTitle:'التحقق · Verify', verifySub:(id)=>`تم إرسال الرمز إلى ${id}`,
    verifyLabel:'رمز التحقق (6 أرقام)', btnVerify:'تحقق ←', btnVerifying:'جارٍ التحقق...',
    errCode:'الرمز خاطئ أو منتهي الصلاحية.', back:'رجوع →',
    loadMsgs:['أهلاً بك في Bridge Safi 🇲🇦','جارٍ إنشاء حسابك...','تجهيز خدماتك...','تقريباً جاهز ✨','تأمين اتصالك 🔒'],
  },
  amz: {
    title:'ⴰⵙⵏⴼⴰⵔ · Sign up', sub:'ⴰⵎⴻⵢⵍ ⵏⵖ ⵓⵟⵟⵓⵏ + ⵜⴰⴱⵔⴰⵜ',
    emailLabel:'ⴰⵎⴻⵢⵍ ⵏⵖ ⵓⵟⵟⵓⵏ *', emailPh:'+212 6XX XXX XXX ⵏⵖ email@...',
    passLabel:'ⵜⴰⴱⵔⴰⵜ * (8 ⵉⵙⴽⴽⵉⵏⴻⵏ)', passPh:'••••••••',
    btnCreate:'ⴰⵙⵏⴼⴰⵔ ⵏ ⵓⵎⵓⵔ ←', btnCreating:'ⵉⵙⴽⴽⴰ...',
    errEmail:'ⴰⵎⴻⵢⵍ ⵓⵔ ⵢⵓⴷⴼⴻⵏ.', errPhone:'ⵓⵟⵟⵓⵏ ⵓⵔ ⵢⵓⴷⴼⴻⵏ.',
    errPass:'ⵜⴰⴱⵔⴰⵜ ⵜⴰⵎⵥⵥⵢⴰⵏⵜ (8).', errId:'ⴰⵎⴻⵢⵍ ⵏⵖ ⵓⵟⵟⵓⵏ ⵉⵍⴰⵔ.',
    alreadyHave:'ⵎⴰⵛ ⵉⵍⵍⴰ ⵓⵎⵓⵔ?', login:'ⴽⵛⵎ',
    verifyTitle:'ⴰⵙⵉⵏⴼ · Verify', verifySub:(id)=>`ⴰⵙⵉⵏⴼ ⵉⵜⵜⵓⵙⴽⴰⵔ ${id}`,
    verifyLabel:'ⵓⵟⵟⵓⵏ ⵏ ⵓⵙⵉⵏⴼ (6)', btnVerify:'ⵙⵉⵏⴼ ←', btnVerifying:'ⵉⵙⴽⴽⴰ...',
    errCode:'ⵓⵟⵟⵓⵏ ⵓⵔ ⵢⵓⴷⴼⴻⵏ.', back:'← ⴰⵣⵣⵓⵍ',
    loadMsgs:['ⴰⵣⵓⵍ Bridge Safi 🇲🇦','ⵉⵙⴽⴽⴰ ⵓⵎⵓⵔ...','ⵜⵓⴷⴷⵓⵜ ⵏ ⵜⵎⵙⴽⴰⵔⵉⵏ...','ⴰⴽⴽⴰⴹ ⵢⵓⵙⴰ ✨','ⵜⵓⵜⵜⵔⴰ 🔒'],
  },
};

const LANG_FLAGS: Record<SignUpLang, string> = { fr:'🇫🇷', en:'🇬🇧', ar:'🇲🇦', amz:'ⵣ' };

function SignUpLoadingOverlay({ msgs, lang }: { msgs: string[]; lang: SignUpLang }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const t1 = setInterval(() => setMsgIdx(i => (i + 1) % msgs.length), 1400);
    const t2 = setInterval(() => setDotCount(d => d === 3 ? 1 : d + 1), 500);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [msgs]);
  const isRtl = lang === 'ar' || lang === 'amz';
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'linear-gradient(160deg, #011c15 0%, #054130 35%, #065F46 70%, #033d2c 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:32,
    }}>
      {/* Animated logo */}
      <div style={{ position:'relative', width:110, height:110 }}>
        {/* Spinning ring */}
        <div style={{
          position:'absolute', inset:-8,
          border:'3px solid transparent',
          borderTopColor:'#D9C5A0', borderRightColor:'rgba(217,197,160,0.3)',
          borderRadius:'50%',
          animation:'spin360 1.1s linear infinite',
        }}/>
        <div style={{
          position:'absolute', inset:-16,
          border:'2px solid transparent',
          borderBottomColor:'rgba(217,197,160,0.2)', borderLeftColor:'rgba(217,197,160,0.1)',
          borderRadius:'50%',
          animation:'spin360 1.9s linear infinite reverse',
        }}/>
        {/* Logo */}
        <div style={{
          width:110, height:110, borderRadius:'50%', overflow:'hidden',
          border:'3px solid #D9C5A0',
          boxShadow:'0 0 40px rgba(217,197,160,0.3), 0 0 80px rgba(6,95,70,0.4)',
        }}>
          <img src="/logo_splash_new.png" alt="Bridge"
            style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scale(1.2)' }}/>
        </div>
      </div>

      {/* Dots loader */}
      <div style={{ display:'flex', gap:10 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:10, height:10, borderRadius:'50%',
            background: i < dotCount ? '#D9C5A0' : 'rgba(217,197,160,0.2)',
            transition:'background 0.3s',
            boxShadow: i < dotCount ? '0 0 12px rgba(217,197,160,0.6)' : 'none',
          }}/>
        ))}
      </div>

      {/* Animated message */}
      <div style={{
        textAlign:'center', maxWidth:280, padding:'0 24px',
        direction: isRtl ? 'rtl' : 'ltr',
      }}>
        <p style={{
          color:'#D9C5A0', fontWeight:800, fontSize:'1rem',
          letterSpacing:'0.04em', margin:0,
          textShadow:'0 2px 12px rgba(0,0,0,0.4)',
          transition:'opacity 0.4s',
        }}>
          {msgs[msgIdx]}
        </p>
        <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.65rem', marginTop:8, letterSpacing:'0.15em' }}>
          BRIDGE SAFI · آسفي · ⵙⴰⴼⵉ
        </p>
      </div>

      <style>{`@keyframes spin360{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

function SignUpPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [lang, setLang] = useState<SignUpLang>(() => {
    try { const r = localStorage.getItem('bridge_nav_state'); if (r) { const p = JSON.parse(r); if (SIGNUP_LANGS.includes(p.lang)) return p.lang as SignUpLang; } } catch {}
    return 'fr';
  });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = SIGNUP_T[lang];
  const isRtl = lang === 'ar' || lang === 'amz';

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate(basePath || '/');
  }, [isLoaded, isSignedIn, navigate]);

  const isPhone = /^\.?[0-9\s]{7,}$/.test(identifier.trim());

  const fmtPhone = (v: string) => {
    let d = v.replace(/[^\.+]/g, '');
    if (!d.startsWith('+')) d = '+212' + d.replace(/^0/, '');
    return d;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!identifier.trim()) { setError(t.errId); return; }
    if (password.length < 8) { setError(t.errPass); return; }
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = { password };
      if (isPhone) params.phoneNumber = fmtPhone(identifier.trim());
      else params.emailAddress = identifier.trim();
      await clerk.client.signUp.create(params);
      if (isPhone) await clerk.client.signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      else await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('verify');
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || '';
      if (msg.toLowerCase().includes('email')) setError(t.errEmail);
      else if (msg.toLowerCase().includes('phone')) setError(t.errPhone);
      else if (msg.toLowerCase().includes('password')) setError(t.errPass);
      else setError(msg || t.errEmail);
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    try {
      const result = isPhone
        ? await clerk.client.signUp.attemptPhoneNumberVerification({ code })
        : await clerk.client.signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        navigate(basePath || '/');
      } else {
        setError(t.errCode);
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage || t.errCode);
    }
    setLoading(false);
  };

  /* Language selector shared component */
  const LangSelector = () => (
    <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:18 }}>
      {SIGNUP_LANGS.map(l => (
        <button key={l} onClick={() => setLang(l)} type="button" style={{
          padding:'5px 10px', borderRadius:10, border:'none', cursor:'pointer',
          fontWeight:900, fontSize:'0.7rem', letterSpacing:'0.05em',
          background: l === lang ? '#065F46' : '#E9EDE9',
          color: l === lang ? 'white' : '#6B7280',
          boxShadow: l === lang ? '0 3px 10px rgba(6,95,70,0.3)' : 'none',
          transition:'all 0.2s',
        }}>
          {LANG_FLAGS[l]} {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (loading) return <SignUpLoadingOverlay msgs={t.loadMsgs} lang={lang} />;

  if (step === 'verify') return (
    <AuthPageWrapper>
      <LangSelector />
      <AuthCardHeader
        title={t.verifyTitle}
        sub={t.verifySub(isPhone ? fmtPhone(identifier.trim()) : identifier.trim())}
      />
      <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', direction: isRtl ? 'rtl' : 'ltr' }}>
        <FocusInput label={t.verifyLabel} value={code} onChange={setCode}
          placeholder="123456" autoComplete="one-time-code" type="tel" />
        {error && <div style={errStyle}>{error}</div>}
        <button type="submit" style={btn}>
          {t.btnVerify}
        </button>
      </form>
      <div style={{ textAlign:'center', marginTop:'1rem' }}>
        <button onClick={() => { setStep('form'); setCode(''); setError(''); }}
          style={{ background:'none', border:'none', color:'#9CA3AF', fontSize:'0.75rem', cursor:'pointer' }}>
          {t.back}
        </button>
      </div>
    </AuthPageWrapper>
  );

  return (
    <AuthPageWrapper>
      <LangSelector />
      <AuthCardHeader title={t.title} sub={t.sub} />
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', direction: isRtl ? 'rtl' : 'ltr' }}>
        <FocusInput label={t.emailLabel} value={identifier} onChange={setIdentifier}
          placeholder={t.emailPh} autoComplete="username" />
        <FocusInput label={t.passLabel} type="password" value={password} onChange={setPassword}
          placeholder={t.passPh} autoComplete="new-password" />
        {error && <div style={errStyle}>{error}</div>}
        <button type="submit" style={btn}>
          {t.btnCreate}
        </button>
      </form>
      <div style={{ textAlign:'center', marginTop:'1.25rem', paddingTop:'1rem', borderTop:'1px solid #E5E1D8' }}>
        <span style={{ fontSize:'0.75rem', color:'#9CA3AF' }}>{t.alreadyHave} </span>
        <button onClick={() => navigate('/sign-in')}
          style={{ background:'none', border:'none', color:'#065F46', fontWeight:700, fontSize:'0.75rem', cursor:'pointer' }}>
          {t.login}
        </button>
      </div>
    </AuthPageWrapper>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ── Session keep-alive: renews the Clerk JWT every 4 min when
//    the user chose "Rester connecté", preventing inactivity sign-out ──────────
function SessionKeepAlive() {
  const clerk = useClerk();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn) return;
    const stay = localStorage.getItem(STAY_KEY);
    if (stay === 'false') return;

    const refresh = async () => {
      try {
        // Force a real JWT refresh (not just a touch)
        await clerk.session?.getToken({ skipCache: true });
      } catch { /* ignore */ }
    };

    refresh(); // immediate on mount

    // Refresh every 4 minutes (240s) — well within Clerk's 5-min inactivity window
    const interval = setInterval(refresh, 4 * 60_000);

    // Also refresh when user returns to the tab or app
    const onVisible = async () => { if (document.visibilityState === 'visible') await refresh(); };
    const onFocus = async () => refresh();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [isSignedIn, clerk]);

  return null;
}

// ─── GAME PAGE PLACEHOLDER ────────────────────────────────────────────────────

const GAME_LANGS = ['fr','en','ar','amz'] as const;
type GameLang = typeof GAME_LANGS[number];
const GAME_LANG_LABELS: Record<GameLang,string> = {fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};
const GAME_URL = 'https://bridge-safi.replit.app';
const GAME_TARGET = 60000;
const GAME_T = {
  fr:{
    back:'← Retour', playerId:'ID JOUEUR', diamonds:'MES DIAMANTS', playBtn:'🎮 JOUER MAINTENANT',
    rulesBtn:'📜 Règles du jeu', target:'OBJECTIF', progress:'PROGRESSION',
    days:'3 jours · 3h/jour', pts:'pts',
    howTitle:'🏆 COMMENT GAGNER ?',
    sec1Title:'⏱️ DURÉE DE JEU',
    sec1:'Jouez 3h/jour pendant 3 jours · Durée totale : 9h · Plus vous jouez, plus vous gagnez de 💎 !',
    sec2Title:'💎 DIAMANTS À RÉCOLTER',
    sec2:'Objectif : 60 000 💎 en 3 jours · Rythme : 6 000 💎/heure (3h × 3j = 54 000 💎) · +2 000 💎/jour bonus (1h en plus) = 60 000 💎 = livraison gratuite',
    sec3Title:'🐝 DIAMANTS MANQUANTS',
    sec3:'Objectif atteint → tout est offert 🎉 · Manque 200 💎 → vous payez 1 MAD · Calcul : diamants manquants ÷ 200 = MAD à payer',
    bonusTitle:'🎁 BONUS — LIVRAISON GRATUITE',
    bonusDesc:'Jouez 4h/jour (1h bonus) → +2 000 💎/jour → 60 000 💎 = livraison 100% GRATUITE 🎁 · Sinon le jeu s\.arrête net à 3h, revenez le lendemain',
  },
  en:{
    back:'← Back', playerId:'PLAYER ID', diamonds:'MY DIAMONDS', playBtn:'🎮 PLAY NOW',
    rulesBtn:'📜 Game Rules', target:'TARGET', progress:'PROGRESS',
    days:'3 days · 3h/day', pts:'pts',
    howTitle:'🏆 HOW TO WIN?',
    sec1Title:'⏱️ PLAY TIME',
    sec1:'Play 3h/day for 3 days · Total: 9h · The more you play, the more 💎 you earn!',
    sec2Title:'💎 DIAMONDS TO COLLECT',
    sec2:'Goal: 60,000 💎 in 3 days · Rate: 6,000 💎/hour (3h × 3j = 54,000 💎) · +2,000 💎/day bonus (1 extra hour) = 60,000 💎 = free delivery',
    sec3Title:'🐝 MISSING DIAMONDS',
    sec3:'Goal reached → everything is free 🎉 · Missing 200 💎 → you pay 1 MAD · Formula: missing ÷ 200 = MAD to pay',
    bonusTitle:'🎁 BONUS — FREE DELIVERY',
    bonusDesc:'Play 4h/day (1 bonus hour) → +2,000 💎/day → 60,000 💎 = 100% FREE delivery 🎁 · Otherwise the game stops at 3h, come back tomorrow',
  },
  ar:{
    back:'→ رجوع', playerId:'معرّف اللاعب', diamonds:'ماساتي', playBtn:'🎮 العب الآن',
    rulesBtn:'📜 قواعد اللعبة', target:'الهدف', progress:'التقدم',
    days:'3 أيام · 3 ساعات/يوم', pts:'نقطة',
    howTitle:'🏆 كيف تفوز؟',
    sec1Title:'⏱️ مدة اللعب',
    sec1:'العب 3 ساعات/يوم لمدة 3 أيام · المجموع: 9 ساعات · كلما لعبت أكثر، كسبت 💎 أكثر!',
    sec2Title:'💎 الماسات المطلوبة',
    sec2:'الهدف: 60 000 💎 في 3 أيام · 6 000 💎/ساعة (3س × 3أ = 54 000 💎) · +2 000 💎/يوم مكافأة (ساعة إضافية) = 60 000 💎 = توصيل مجاني',
    sec3Title:'🐝 الماسات الناقصة',
    sec3:'وصلت للهدف → كل شيء مجاني 🎉 · نقص 200 💎 → تدفع 1 درهم · الحساب: الناقص ÷ 200 = دراهم تُدفع',
    bonusTitle:'🎁 مكافأة — توصيل مجاني',
    bonusDesc:'العب 4 ساعات/يوم (ساعة إضافية) → +2 000 💎/يوم → 60 000 💎 = توصيل مجاني 100% 🎁 · وإلا توقف اللعبة عند 3 ساعات، عد غداً',
  },
  amz:{
    back:'← ⴰⵣⵣⵓⵍ', playerId:'ⴰⵏⴳⵔⴰⵡ', diamonds:'ⵉⴷⵢⴰⵎⴰⵏ ⵉⵏⵓ', playBtn:'🎮 ⵙⵖⵔ ⴷⴰⵖⵉ',
    rulesBtn:'📜 ⵜⵉⵖⵔⵉ', target:'ⴰⵎⵓⵟⵟⵓ', progress:'ⴰⵎⵙⵉⵡⴹ',
    days:'3 ⵡⴰⵙⵙⴰⵜⵏ · 3 ⵜⵉⵙⵙⵓⵜⵉⵏ/ⴰⵙⵙ', pts:'ⵜⵉⵏⵎⵍⴰⵏ',
    howTitle:'🏆 ⵎⴰⵎⴽ ⴰⴷ ⵜⴽⵙⵎ?',
    sec1Title:'⏱️ ⴰⵣⵎⵣ ⵏ ⵓⵣⵔⴰⵔ',
    sec1:'ⵣⵔ 3 ⵜⵉⵙⵙⵓⵜⵉⵏ/ⴰⵙⵙ · 3 ⵡⴰⵙⵙⴰⵜⵏ · ⴰⵎⵎⴰⵙ: 9 ⵜⵉⵙⵙⵓⵜⵉⵏ',
    sec2Title:'💎 ⵉⴷⵢⴰⵎⴰⵏ ⴰⴷ ⵜⴽⵛⵎⴷ',
    sec2:'ⴰⵎⵓⵟⵟⵓ: 60 000 💎 · 6 000 💎/ⵜⵉⵙⵙⵓⵜ · +2 000 💎/ⴰⵙⵙ ⴱⵓⵏⵓⵙ = ⴰⵣⵏⵏⵣ ⵉⵥⵍⵉ',
    sec3Title:'🐝 ⵉⴷⵢⴰⵎⴰⵏ ⵉⵔⵓⵔⵏ',
    sec3:'ⵡⴰⵅⵅⴰ ⴰⵎⵓⵟⵟⵓ → ⴽⵓⵍⵍⵓ ⵉⵥⵍⵉ 🎉 · 200 💎 ⵉⵔⵓⵔ → 1 ⴷⵔⵀⵎ · ⵓⵔ: ⵉⵔⵓⵔⵏ ÷ 200 = ⴷⵔⵀⵎ',
    bonusTitle:'🎁 ⴱⵓⵏⵓⵙ — ⴰⵣⵏⵏⵣ ⵉⵥⵍⵉ',
    bonusDesc:'ⵣⵔ 4 ⵜⵉⵙⵙⵓⵜⵉⵏ/ⴰⵙⵙ → +2 000 💎 → 60 000 💎 = ⴰⵣⵏⵏⵣ ⵉⵥⵍⵉ 100% 🎁',
  },
};

// ─── BRIDGE GAME RULES MODAL ──────────────────────────────────────────────────

function GameRulesModal({ lang, onClose }: { lang: GameLang; onClose: () => void }) {
  const isAR = lang === 'ar';
  const rules = {
    fr: {
      title: '📜 Règles du Jeu',
      subtitle: 'Bridge Shark — Comment gagner ?',
      sections: [
        {
          icon: '⏱️', title: 'Durée de jeu',
          points: [
            'Jouez autant que vous voulez, à votre rythme',
            'Objectif total : atteindre 60 000 💎',
            '🎁 Plus vous jouez, plus vous gagnez de 💎 !',
          ]
        },
        {
          icon: '💎', title: 'Diamants à récolter',
          points: [
            'Objectif : récolter 60 000 💎',
            '200 💎 = 1 MAD de réduction sur votre commande',
            '60 000 💎 = 300 MAD offerts !',
          ]
        },
        {
          icon: '💸', title: 'Diamants manquants',
          points: [
            'Si vous atteignez 60 000 💎 → tout est offert ! 🎉',
            'S\.il manque 200 💎 → vous payez 1 MAD',
            'S\.il manque 1 000 💎 → vous payez 5 MAD',
            'Calcul : diamants manquants ÷ 200 = MAD à payer',
          ]
        },
        {
          icon: '🚴', title: 'BONUS — Livraison gratuite',
          points: [
            'Atteignez 60 000 💎 → prochaine livraison 100% GRATUITE 🎁',
            'Chaque commande jouée booste vos diamants !',
          ]
        },
        {
          icon: '🎁', title: 'Comment utiliser vos gains',
          points: [
            '🛵 Un menu depuis Bridge Eats',
            '🚬 Un paquet de cigarettes via Bridge Tabac',
            '🌹 Une coupe de fleurs via Bridge Fleurs',
            'Échangez directement dans l\.application !',
          ]
        },
      ],
      example: '💡 Exemple : vous avez 58 000 💎 au lieu de 60 000 → il manque 2 000 💎 → vous payez seulement 10 MAD.',
      close: 'J\.ai compris ! 🦈',
    },
    en: {
      title: '📜 Game Rules',
      subtitle: 'Bridge Shark — How to win?',
      sections: [
        {
          icon: '⏱️', title: 'Playing time',
          points: [
            'Play at your own pace, whenever you want',
            'Total goal: reach 60,000 💎',
            '🎁 The more you play, the more 💎 you earn!',
          ]
        },
        {
          icon: '💎', title: 'Diamonds to collect',
          points: [
            'Goal: collect 60,000 💎',
            '200 💎 = 1 MAD discount on your order',
            '60,000 💎 = 300 MAD off!',
          ]
        },
        {
          icon: '💸', title: 'Missing diamonds',
          points: [
            'Reach 60,000 💎 → everything is free! 🎉',
            'Missing 200 💎 → you pay 1 MAD',
            'Missing 1,000 💎 → you pay 5 MAD',
            'Formula: missing diamonds ÷ 200 = MAD to pay',
          ]
        },
        {
          icon: '🚴', title: 'BONUS — Free delivery',
          points: [
            'Reach 60,000 💎 → next delivery 100% FREE 🎁',
            'Every order played boosts your diamonds!',
          ]
        },
        {
          icon: '🎁', title: 'How to use your winnings',
          points: [
            '🛵 A meal from Bridge Eats',
            '🚬 A pack of cigarettes from Bridge Tabac',
            '🌹 A bunch of flowers from Bridge Fleurs',
            'Redeem directly in the app!',
          ]
        },
      ],
      example: '💡 Example: you have 58,000 💎 instead of 60,000 → missing 2,000 💎 → you pay only 10 MAD.',
      close: 'Got it! 🦈',
    },
    ar: {
      title: '📜 قواعد اللعبة',
      subtitle: 'Bridge Shark — كيف تفوز؟',
      sections: [
        {
          icon: '⏱️', title: 'وقت اللعب',
          points: [
            'العب بالوتيرة التي تريدها، متى شئت',
            'الهدف الكلي : الوصول إلى 60 000 💎',
            '🎁 كلما لعبت أكثر، كسبت ماسات أكثر!',
          ]
        },
        {
          icon: '💎', title: 'الماسات المطلوبة',
          points: [
            'الهدف : جمع 60 000 💎',
            '200 💎 = 1 درهم خصم على طلبك',
            '60 000 💎 = 300 درهم مجاناً!',
          ]
        },
        {
          icon: '💸', title: 'الماسات الناقصة',
          points: [
            'حققت 60 000 💎 → كل شيء مجاني! 🎉',
            'ناقص 200 💎 → تدفع 1 درهم',
            'ناقص 1 000 💎 → تدفع 5 دراهم',
            'الحساب : الماسات الناقصة ÷ 200 = دراهم تُدفع',
          ]
        },
        {
          icon: '🚴', title: 'مكافأة — توصيل مجاني',
          points: [
            'اجمع 60 000 💎 → توصيلك التالي مجاني 100% 🎁',
            'كل طلب يلعبه يرفع رصيدك من الماسات!',
          ]
        },
        {
          icon: '🎁', title: 'كيف تستخدم مكاسبك',
          points: [
            '🛵 وجبة من Bridge Eats',
            '🚬 علبة سجائر من Bridge Tabac',
            '🌹 باقة ورد من Bridge Fleurs',
            'استبدل مباشرة من التطبيق!',
          ]
        },
      ],
      example: '💡 مثال : لديك 58 000 💎 بدلاً من 60 000 → ناقص 2 000 💎 → تد��ع 10 دراهم فقط.',
      close: 'فهمت! 🦈',
    },
    amz: {
      title: '📜 ⵜⵉⵖⵔⵉ ⵏ ⵓⵎⴽⵙⴰⵡ',
      subtitle: 'Bridge Shark',
      sections: [
        {
          icon: '⏱️', title: 'ⴰⵣⵎⵣ ⵏ ⵓⵎⴽⵙⴰⵡ',
          points: [
            'ⵙⵖⵔ ⵎⴰⵎⴽ ⵜⵔⵉⴷ, ⴰⵎⵎⴰⵙ ⵜⵔⵉⴷ',
            'ⴰⵎⵓⵟⵟⵓ : 60 000 💎',
            '🎁 ⴽⵓⵍⵍⵓ ⵉⵍⵎⵎⴰⵏ → ⵉⵍⵎⵎⴰⵏ ⵉⵏⵙ 💎!',
          ]
        },
        {
          icon: '💎', title: 'ⵉⴷⵢⴰⵎⴰⵏ ⵉⵍⴰⵎⵎⴰⵏ',
          points: [
            'ⴰⵎⵓⵟⵟⵓ : 60 000 💎',
            '200 💎 = 1 ⴷⵔⵀⵎ ⵙ ⵜⴼⴰⴷⴰ',
            '60 000 💎 = 300 ⴷⵔⵀⵎ ⵉⵍⵉ ⵖⵔⴰⵜⴽ!',
          ]
        },
        {
          icon: '💸', title: 'ⵉⴷⵢⴰⵎⴰⵏ ⵉⵍⵍⴰⵏ',
          points: [
            '60 000 💎 → ⴽⵓⵍⵍⵓ ⵢⵉⵍⵉ ⵖⵔⴰⵜⴽ! 🎉',
            'ⵢⵍⵍⴰ 200 💎 → 1 ⴷⵔⵀⵎ',
            'ⵢⵍⵍⴰ 1 000 💎 → 5 ⴷⵔⵀⵎ',
            'ⵓⵔ: ⵉⵔⵓⵔⵏ ÷ 200 = ⴷⵔⵀⵎ',
          ]
        },
        {
          icon: '🚴', title: 'ⴱⵓⵏⵓⵙ — ⴰⵣⵏⵏⵣ ⴱⵍⴰ ⴰⵣⵔⴼ',
          points: [
            '60 000 💎 → ⴰⵣⵏⵏⵣ ⵢⵉⵍⵉ ⵖⵔⴰⵜⴽ 100% 🎁',
            'ⴽⵓⵍⵍⵓ ⴰⵎⵔ ⵉⵙⵙⵓⴼⵖ 💎 ⵉⵢⴰⴹⵏⵉⵏ!',
          ]
        },
        {
          icon: '🎁', title: 'ⵎⴰⵎⴽ ⵜⵙⵖⵔⵙⴷ ⵉⵔⵏⵓⵜⵏ ⵏⵏⴽ',
          points: [
            '🛵 ⴰⵎⵏⵙⵉ ⵙ Bridge Eats',
            '🚬 ⵜⴰⴱⴰⵖⵓⵔⵜ ⵙ Bridge Tabac',
            '🌹 ⵉⵣⵓⵍⴰⵏ ⵙ Bridge Fleurs',
          ]
        },
      ],
      example: '💡 58 000 💎 ⴷⴳ 60 000 → ⵢⵍⵍⴰ 2 000 → 10 ⴷⵔⵀⵎ.',
      close: 'ⵙⵙⵉⵏⵖ! 🦈',
    },
  };

  const r = rules[lang];
  return (
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(6px)',display:'flex',flexDirection:'column',overflowY:'auto'}}
      onClick={onClose}>
      <div style={{maxWidth:420,width:'100%',margin:'auto',padding:'16px 12px'}} onClick={e=>e.stopPropagation()}>
        <div style={{background:'linear-gradient(160deg,#020c07 0%,#0A2218 60%,#0D2E1A 100%)',borderRadius:24,border:'2px solid rgba(74,222,128,0.3)',overflow:'hidden',boxShadow:'0 24px 80px rgba(0,0,0,0.7)'}}>
          {/* Header */}
          <div style={{padding:'24px 20px 16px',textAlign:'center',background:'linear-gradient(180deg,rgba(6,95,70,0.3) 0%,transparent 100%)'}}>
            <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',border:'2.5px solid #065F46',margin:'0 auto 12px',boxShadow:'0 0 30px rgba(6,95,70,0.5)'}}>
              <img src="/bridge-shark.png" alt="Bridge Shark" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top'}}/>
            </div>
            <h2 style={{color:'#fff',fontSize:20,fontWeight:900,margin:'0 0 4px',letterSpacing:1}}>{r.title}</h2>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,margin:0}}>{r.subtitle}</p>
          </div>

          {/* Rules sections */}
          <div style={{padding:'0 16px 8px',direction:isAR?'rtl':'ltr'}}>
            {r.sections.map((s, si) => (
              <div key={si} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'14px 16px',marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexDirection:isAR?'row-reverse':'row'}}>
                  <span style={{fontSize:20}}>{s.icon}</span>
                  <p style={{color:'#4ADE80',fontSize:12,fontWeight:900,margin:0,letterSpacing:0.5,textTransform:'uppercase'}}>{s.title}</p>
                </div>
                {s.points.map((p, pi) => (
                  <div key={pi} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:6,flexDirection:isAR?'row-reverse':'row'}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:'#FDE047',marginTop:5,flexShrink:0}}/>
                    <p dir="auto" style={{color:'rgba(255,255,255,0.8)',fontSize:13,margin:0,lineHeight:1.5}}>{p}</p>
                  </div>
                ))}
              </div>
            ))}

            {/* Example */}
            <div style={{background:'rgba(253,224,71,0.1)',border:'1px solid rgba(253,224,71,0.3)',borderRadius:14,padding:'12px 14px',marginBottom:16}}>
              <p dir="auto" style={{color:'#FDE047',fontSize:12,margin:0,lineHeight:1.6}}>{r.example}</p>
            </div>
          </div>

          {/* Close button */}
          <div style={{padding:'0 16px 20px'}}>
            <button onClick={onClose}
              style={{width:'100%',padding:'14px',borderRadius:16,background:'linear-gradient(135deg,#065F46,#059669)',border:'none',color:'#fff',fontSize:15,fontWeight:900,cursor:'pointer',boxShadow:'0 6px 24px rgba(6,95,70,0.5)',letterSpacing:0.5}}>
              {r.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GamePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [, navigate] = useLocation();

  const lang: GameLang = (() => {
    try {
      const raw = localStorage.getItem('bridge_nav_state');
      if (raw) { const p = JSON.parse(raw); if (GAME_LANGS.includes(p.lang)) return p.lang as GameLang; }
    } catch {}
    return 'fr';
  })();

  const isAR = lang === 'ar';

  if (!isLoaded) return null;

  // Not signed in — show lock screen (Bridge Eats login REQUIRED, no phone bypass)
  if (!isSignedIn) {
    const lockT = {
      fr: { title: 'CONNEXION BRIDGE EATS REQUISE', game: 'SAFI RUNNER', desc: 'Pour jouer, connecte-toi d\.abord sur Bridge Eats avec ton email et ton numéro. Tu seras automatiquement reconnu sur le jeu et tes diamants seront synchronisés.', connectBtn: '🛵 ME CONNECTER SUR BRIDGE EATS', note: '🔒 Bridge Eats gère la connexion. Tes 💎 sont liés à ton compte\.— joue depuis n\.importe quel appareil avec le même email.', signUpLink: 'Pas encore inscrit ? Créer un compte' },
      en: { title: 'BRIDGE EATS LOGIN REQUIRED', game: 'SAFI RUNNER', desc: 'To play, sign in to Bridge Eats first with your email and number. You\.ll be automatically recognized and your diamonds will sync.', connectBtn: '🛵 SIGN IN ON BRIDGE EATS', note: '🔒 Bridge Eats manages the login. Your 💎 are linked to your account\.— play from any device with the same email.', signUpLink: 'Not registered yet? Create an account' },
      ar: { title: 'تسجيل الدخول مطلوب', game: 'SAFI RUNNER', desc: 'للعب، سجّل دخولك أولاً على Bridge Eats. سيتم التعرف عليك تلقائياً وستتزامن ماساتك.', connectBtn: '🛵 تسجيل الدخول عبر Bridge Eats', note: '🔒 Bridge Eats يدير الاتصال. 💎 مرتبطة بحسابك.', signUpLink: 'ليس لديك حساب؟ أنشئ واحداً' },
      amz: { title: 'ⴰⵙⵉⵔⴳ BRIDGE EATS', game: 'SAFI RUNNER', desc: '💎 ⵔⴱⵓⵏⵜ ⵉ ⵓⵃⵙⴰⴱ ⵏⵏⴽ ⵖ Bridge Eats.', connectBtn: '🛵 ⴽⵛⵎ ⵖ BRIDGE EATS', note: '🔒 Bridge Eats ⵉⵙⵖⵉⵡⵙ ⴰⵙⵉⵔⴳ.', signUpLink: 'ⵓⵔ ⵜⵙⵖⵔⴷ ⴰⵔⴰ? ⵙⵏⴼⵍ ⵓⵃⵙⴰⴱ' },
    }[lang];
    return (
      <div dir={isAR ? 'rtl' : 'ltr'} style={{minHeight:'100dvh',background:'linear-gradient(180deg,#04110A 0%,#071C11 60%,#050F08 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px',gap:0}}>
        <div style={{width:'100%',maxWidth:360,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:28,padding:'36px 24px 28px',display:'flex',flexDirection:'column',alignItems:'center',gap:16,backdropFilter:'blur(12px)'}}>
          <div style={{fontSize:52,lineHeight:1}}>🔒</div>
          <p style={{color:'#4ADE80',fontSize:10,fontWeight:900,letterSpacing:'0.18em',margin:0,textAlign:'center',textTransform:'uppercase'}}>{lockT.title}</p>
          <p style={{color:'#fff',fontSize:22,fontWeight:900,letterSpacing:'0.12em',margin:0,textAlign:'center'}}>🦈 {lockT.game}</p>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:13,fontWeight:500,lineHeight:1.6,textAlign:'center',margin:0}}>{lockT.desc}</p>
          {/* SEUL accès : via Bridge Eats — aucune entrée par numéro seul */}
          <button onClick={()=>navigate('/sign-in')} style={{width:'100%',padding:'18px 0',borderRadius:18,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#059669 0%,#4ADE80 50%,#059669 100%)',color:'#fff',fontSize:15,fontWeight:900,letterSpacing:'0.04em',marginTop:4,boxShadow:'0 0 28px rgba(74,222,128,0.4)'}}>
            {lockT.connectBtn}
          </button>
          <p style={{color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:500,lineHeight:1.5,textAlign:'center',margin:0,whiteSpace:'pre-line'}}>{lockT.note}</p>
          <button onClick={()=>navigate('/sign-up')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,textDecoration:'underline',padding:'2px 0',marginTop:-4}}>
            {lockT.signUpLink}
          </button>
        </div>
      </div>
    );
  }

  // Signed in — fetch game token then show Safi Runner
  return <GameIframe userId={user.id} lang={lang} isAR={isAR} />;
}

/** Fetches a verified phone token then loads the game iframe */
function GameIframe({ userId, lang, isAR }: { userId: string; lang: GameLang; isAR: boolean }) {
  const [, navigate] = useLocation();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<'loading'|'ready'|'no_phone'|'error'>('loading');
  const [gameToken, setGameToken] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const diamondsCacheKey = `bridge_diamonds_cache_${userId}`;
  const [liveDiamonds, setLiveDiamonds] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(`bridge_diamonds_cache_${userId}`) || '0', 10) || 0; } catch { return 0; }
  });
  // Track balance at session start so we can add session earnings to it
  const sessionStartDiamonds = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Best available avatar: reactive state so it updates when photo changes
  const [avatarSrc, setAvatarSrc] = useState<string>(() => {
    try { return localStorage.getItem(`bridge_eats_avatar_${userId}`) || ''; } catch { return ''; }
  });

  // Sync avatar from localStorage when it changes (e.g. user just saved a new photo)
  useEffect(() => {
    const readAvatar = () => {
      try {
        const stored = localStorage.getItem(`bridge_eats_avatar_${userId}`) || '';
        setAvatarSrc(stored || user?.imageUrl || '');
      } catch { setAvatarSrc(user?.imageUrl || ''); }
    };
    readAvatar();
    window.addEventListener('storage', readAvatar);
    return () => window.removeEventListener('storage', readAvatar);
  }, [userId, user?.imageUrl]);

  const gameId = phone
    ? 'BR-' + phone.replace(/\D/g,'').slice(0,6) + ((playerName||'').trim()[0]||'?').toUpperCase()
    : 'BR-???????';

  // Wait until Clerk is loaded and user is signed in before fetching the game token
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setState('loading');
    getToken().then(token => {
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      return fetch('/api/game/token', { method: 'POST', credentials: 'include', headers: h });
    })
      .then(r => r.json())
      .then(data => {
        if (data.error === 'no_phone') { setState('no_phone'); return; }
        if (data.token && data.phone) {
          setGameToken(data.token);
          setPhone(data.phone);
          setPlayerName(data.name || '');
          setState('ready');
        } else setState('error');
      })
      .catch(() => setState('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isLoaded, isSignedIn]);

  // Send player profile (avatar + name + diamonds) to game after it loads
  const sendProfileToGame = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const cached = (() => { try { return parseInt(localStorage.getItem(diamondsCacheKey) || '0', 10) || 0; } catch { return 0; } })();
    // Record the balance at session start so we can add session earnings correctly
    sessionStartDiamonds.current = cached;
    iframe.contentWindow.postMessage({
      type: 'bridge_player',
      avatarUrl: avatarSrc,
      displayName: playerName,
      diamonds: cached,
    }, '*');
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.origin.includes('bridge-safi') && !event.origin.includes('replit')) return;
      const msg = event.data;
      if (!msg) return;

      // Game requests player info → send profile
      if (msg.type === 'request_player_info') { sendProfileToGame(); return; }

      const rawDiamonds: number | undefined =
        typeof msg.diamonds === 'number' ? msg.diamonds :
        typeof msg.score === 'number' ? msg.score :
        typeof msg.gems === 'number' ? msg.gems :
        typeof msg.points === 'number' ? msg.points :
        undefined;
      if (typeof rawDiamonds !== 'number' || rawDiamonds < 0 || !Number.isInteger(rawDiamonds)) return;

      // If game sends less than the session start, it started from 0 → add to existing balance.
      // If game sends more than session start, it incorporated our starting value → use directly.
      const sessionStart = sessionStartDiamonds.current;
      const diamonds = rawDiamonds < sessionStart
        ? sessionStart + rawDiamonds   // game reset to 0, add earned to previous balance
        : rawDiamonds;                 // game used our starting balance, value is already cumulative

      // Cache instantly for real-time sync with SharkDiamondWidget (user-specific key)
      try { localStorage.setItem(diamondsCacheKey, String(diamonds)); } catch {}
      setLiveDiamonds(diamonds);
      // Notify other tabs/widgets via storage event
      window.dispatchEvent(new StorageEvent('storage', { key: diamondsCacheKey, newValue: String(diamonds) }));

      getToken().then(token => {
        const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        return fetch('/api/game/diamonds', {
          method: 'POST', credentials: 'include',
          headers: { ...h, 'Content-Type': 'application/json' },
          body: JSON.stringify({ diamonds }),
        });
      }).catch(() => {});
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName, avatarSrc]);

  const noPhoneMsg = {
    fr: { title: 'NUMÉRO REQUIS', body: 'Pour jouer, tu dois d\.abord enregistrer ton numéro de téléphone dans ton profil Bridge.', btn: 'Aller à mon profil' },
    en: { title: 'PHONE REQUIRED', body: 'To play, you must first add your phone number to your Bridge profile.', btn: 'Go to my profile' },
    ar: { title: 'رقم الهاتف مطلوب', body: 'للعب، يجب عليك أولاً إضافة رقم هاتفك في ملفك الشخصي.', btn: 'الملف الشخصي' },
    amz: { title: 'AṬILIFUN ILAQ', body: 'Ad tsɣeṛḍ, ɛemmreɣ aṭilifun inek.', btn: 'Aḥsab inek' },
  }[lang];

  if (state === 'loading') return (
    <div style={{minHeight:'100dvh',background:'#04110A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:44,height:44,border:'3px solid rgba(74,222,128,0.3)',borderTop:'3px solid #4ADE80',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
      <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,fontWeight:700,letterSpacing:'0.1em'}}>{isAR?'تحميل...':lang==='en'?'Loading...':'Chargement...'}</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (state === 'no_phone') return (
    <div dir={isAR?'rtl':'ltr'} style={{minHeight:'100dvh',background:'linear-gradient(180deg,#04110A,#071C11)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'32px 20px'}}>
      <div style={{width:'100%',maxWidth:360,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:28,padding:'36px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:14,backdropFilter:'blur(12px)'}}>
        <div style={{fontSize:48}}>📵</div>
        <p style={{color:'#F87171',fontSize:10,fontWeight:900,letterSpacing:'0.18em',margin:0,textAlign:'center',textTransform:'uppercase'}}>{noPhoneMsg.title}</p>
        <p style={{color:'rgba(255,255,255,0.65)',fontSize:13,fontWeight:500,lineHeight:1.6,textAlign:'center',margin:0}}>{noPhoneMsg.body}</p>
        <button onClick={()=>navigate('/')} style={{width:'100%',padding:'16px 0',borderRadius:16,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#059669,#4ADE80)',color:'#fff',fontSize:14,fontWeight:900,marginTop:4}}>
          👤 {noPhoneMsg.btn}
        </button>
      </div>
    </div>
  );

  if (state === 'error') return (
    <div style={{minHeight:'100dvh',background:'#04110A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <p style={{color:'#F87171',fontSize:13,fontWeight:700}}>{isAR?'خطأ في التحميل':lang==='en'?'Failed to load game':'Erreur de chargement'}</p>
      <button onClick={()=>navigate('/')} style={{padding:'12px 24px',borderRadius:14,border:'none',background:'rgba(74,222,128,0.15)',color:'#4ADE80',fontSize:13,fontWeight:900,cursor:'pointer'}}>
        ← {isAR?'رجوع':lang==='en'?'Back':'Retour'}
      </button>
    </div>
  );

  const gameApiBase = window.location.origin;
  const saveUrl = `${gameApiBase}/api/game/diamonds/by-token`;
  // Use the server-side avatar endpoint — a stable HTTPS URL the game can always fetch.
  // Falls back to Clerk imageUrl if the user hasn't saved a custom photo yet.
  const serverAvatarUrl = `${window.location.origin}/api/profile/avatar/${encodeURIComponent(userId)}`;
  const avatarParam = `&avatarUrl=${encodeURIComponent(serverAvatarUrl)}`;
  const nameParam = playerName ? `&displayName=${encodeURIComponent(playerName)}` : '';
  const gameSrc = `${GAME_URL}/?phone=${encodeURIComponent(phone!)}&gameId=${encodeURIComponent(gameId)}&userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(gameToken!)}&verifyUrl=${encodeURIComponent(`${gameApiBase}/api/game/verify-token`)}&saveUrl=${encodeURIComponent(saveUrl)}&diamondsUrl=${encodeURIComponent(saveUrl)}&apiUrl=${encodeURIComponent(saveUrl)}${avatarParam}${nameParam}`;

  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'#000'}}>
      {/* Fullscreen iframe — no space stolen */}
      <iframe
        ref={iframeRef}
        src={gameSrc}
        style={{position:'absolute',inset:0,width:'100%',height:'100%',border:'none'}}
        allow="accelerometer; gyroscope"
        title="Safi Runner"
        onLoad={sendProfileToGame}
      />
      {/* Right-side controls — back arrow + avatar stacked, near the game's player circle */}
      <div style={{position:'absolute',right:10,bottom:120,zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:8,pointerEvents:'auto'}}>
        {/* Back button */}
        <button onClick={()=>navigate('/')}
          style={{width:36,height:36,borderRadius:'50%',border:'1.5px solid rgba(74,222,128,0.4)',
            background:'rgba(4,17,10,0.75)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
            color:'#4ADE80',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 2px 12px rgba(0,0,0,0.5)',lineHeight:1}}>
          ←
        </button>
        {/* Avatar */}
        {avatarSrc
          ? <img src={avatarSrc} alt="Profil" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',
              border:'2px solid rgba(74,222,128,0.6)',boxShadow:'0 2px 12px rgba(0,0,0,0.5)',flexShrink:0}}/>
          : <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(4,17,10,0.75)',
              backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',
              border:'2px solid rgba(74,222,128,0.4)',display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,boxShadow:'0 2px 12px rgba(0,0,0,0.5)',flexShrink:0}}>👤</div>
        }
      </div>
    </div>
  );
}

// ─── DRIVER GPS TRACKER PAGE ─────────────────────────────────────────────────
// Supports both delivery (ref starts with digit) and taxi (ref starts with TC-)

function DriverTrackerPage({ params }: { params?: { ref?: string } }) {
  const ref = params?.ref || '';
  const isTaxi = ref.startsWith('TC-');

  // Apply saved dark mode preference
  useEffect(() => {
    const dark = localStorage.getItem('bridge_dark') === '1';
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  // ── Delivery mode state ──
  const [status, setStatus] = useState<'asking'|'active'|'error'|'denied'>('asking');
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [lastSent, setLastSent] = useState<number|null>(null);
  const watchId = useRef<number|null>(null);

  // ── Taxi mode state ──
  const [taxiState, setTaxiState] = useState<'loading'|'pending'|'accepted'|'arrived'>('loading');
  const [bookingInfo, setBookingInfo] = useState<{customerName?:string;customerPhone?:string;clientAddress?:string;destination?:string;clientLat?:number;clientLng?:number}|null>(null);
  const [taxiCoords, setTaxiCoords] = useState<{lat:number;lng:number}|null>(null);
  const [taxiLastSent, setTaxiLastSent] = useState<number|null>(null);
  const taxiWatchId = useRef<number|null>(null);

  // ── Load taxi booking info ──
  useEffect(() => {
    if (!isTaxi) return;
    fetch(`/api/tracking/${ref}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.found) {
          setBookingInfo({ customerName: d.customerName, customerPhone: d.customerPhone, clientAddress: d.clientAddress, destination: d.destination, clientLat: d.clientLat, clientLng: d.clientLng });
          if (d.status === 'accepted') setTaxiState('accepted');
          else if (d.status === 'arrived') setTaxiState('arrived');
          else setTaxiState('pending');
        } else { setTaxiState('pending'); }
      })
      .catch(() => setTaxiState('pending'));
  }, [ref, isTaxi]);

  const pushTaxiPosition = async (lat: number, lng: number) => {
    try {
      await fetch(`/api/tracking/${ref}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      setTaxiLastSent(Date.now());
    } catch (_) {}
  };

  const startTaxiGPS = () => {
    if (!navigator.geolocation) return;
    taxiWatchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTaxiCoords({ lat, lng });
        pushTaxiPosition(lat, lng);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  };

  const handleAccept = async () => {
    await fetch(`/api/tracking/${ref}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    }).catch(() => {});
    setTaxiState('accepted');
    startTaxiGPS();
  };

  const handleArrived = async () => {
    await fetch(`/api/tracking/${ref}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'arrived' }),
    }).catch(() => {});
    if (taxiWatchId.current !== null) navigator.geolocation.clearWatch(taxiWatchId.current);
    setTaxiState('arrived');
  };

  // ── Delivery mode ──
  const [delivStatus, setDelivStatus] = useState<'received'|'preparing'|'on_way'|'delivered'>('received');

  const pushPosition = async (lat: number, lng: number) => {
    try {
      await fetch(`/api/tracking/${ref}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      setLastSent(Date.now());
    } catch (_) {}
  };

  const updateDelivStatus = async (newStatus: 'received'|'preparing'|'on_way'|'delivered') => {
    setDelivStatus(newStatus);
    try {
      await fetch(`/api/tracking/${ref}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (newStatus === 'delivered') {
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        await fetch(`/api/tracking/${ref}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isTaxi) return;
    if (!ref) { setStatus('error'); return; }
    if (!navigator.geolocation) { setStatus('error'); return; }
    // Set initial status to received when driver opens the page
    fetch(`/api/tracking/${ref}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'received' }),
    }).catch(() => {});
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setStatus('active');
        pushPosition(lat, lng);
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [ref, isTaxi]);

  const secsAgo = lastSent ? Math.round((Date.now() - lastSent) / 1000) : null;
  const taxiSecsAgo = taxiLastSent ? Math.round((Date.now() - taxiLastSent) / 1000) : null;

  // ── TAXI MODE UI ──
  if (isTaxi) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#78350F 0%,#1A2F23 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '360px', background: '#fff', borderRadius: '24px', padding: '28px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '8px' }}>🚖</div>
          <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#78350F', margin: '0 0 2px' }}>Bridge Taxi — Chauffeur</h1>
          <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 20px' }}>Course #{ref}</p>

          {taxiState === 'loading' && (
            <div style={{ padding: '20px', background: '#FEF3C7', borderRadius: '12px' }}>
              <p style={{ fontSize: '13px', color: '#B45309', fontWeight: '700' }}>⏳ Chargement de la course…</p>
            </div>
          )}

          {taxiState === 'pending' && bookingInfo && (
            <div>
              {/* Booking info card */}
              <div style={{ background: '#FEF3C7', borderRadius: '14px', padding: '14px', marginBottom: '16px', textAlign: 'left' }}>
                <p style={{ fontSize: '10px', fontWeight: '900', color: '#92400E', letterSpacing: '0.1em', marginBottom: '10px' }}>DÉTAILS DE LA COURSE</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px' }}>👤</span>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '800', color: '#1A2F23', margin: 0 }}>{bookingInfo.customerName || 'Client'}</p>
                      {bookingInfo.customerPhone && <a href={`tel:${bookingInfo.customerPhone}`} style={{ fontSize: '12px', color: '#78350F', fontWeight: '700', textDecoration: 'none' }}>{bookingInfo.customerPhone}</a>}
                    </div>
                  </div>
                  {bookingInfo.clientAddress && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '14px' }}>📍</span>
                      <div>
                        <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', fontWeight: '700' }}>DÉPART</p>
                        <p style={{ fontSize: '12px', color: '#1A2F23', margin: 0 }}>{bookingInfo.clientAddress}</p>
                        {bookingInfo.clientLat && bookingInfo.clientLng && (
                          <a href={`https://maps.google.com/?q=${bookingInfo.clientLat},${bookingInfo.clientLng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#3B82F6', fontWeight: '700' }}>Ouvrir dans Maps →</a>
                        )}
                      </div>
                    </div>
                  )}
                  {bookingInfo.destination && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '14px' }}>🏁</span>
                      <div>
                        <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', fontWeight: '700' }}>DESTINATION</p>
                        <p style={{ fontSize: '12px', color: '#1A2F23', margin: 0 }}>{bookingInfo.destination}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleAccept} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#065F46,#10B981)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.4)' }}>
                ✅ Accepter la course
              </button>
            </div>
          )}

          {taxiState === 'pending' && !bookingInfo && (
            <div style={{ padding: '20px', background: '#FEF3C7', borderRadius: '12px' }}>
              <p style={{ fontSize: '13px', color: '#B45309', fontWeight: '700' }}>📋 Course en attente</p>
              <p style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>Informations client non disponibles</p>
              <button onClick={handleAccept} style={{ marginTop: '12px', width: '100%', padding: '12px', background: '#065F46', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '900', cursor: 'pointer' }}>
                ✅ Accepter
              </button>
            </div>
          )}

          {taxiState === 'accepted' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#D1FAE5', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#065F46' }}>GPS EN DIRECT</span>
              </div>
              {bookingInfo?.destination && (
                <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', textAlign: 'left' }}>
                  <p style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '700', marginBottom: '2px' }}>DESTINATION</p>
                  <p style={{ fontSize: '13px', color: '#1D4ED8', fontWeight: '800', margin: 0 }}>🏁 {bookingInfo.destination}</p>
                </div>
              )}
              {taxiCoords && (
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
                  {taxiCoords.lat.toFixed(6)}, {taxiCoords.lng.toFixed(6)}
                </p>
              )}
              {taxiSecsAgo !== null && <p style={{ fontSize: '11px', color: '#10B981', marginBottom: '16px' }}>✓ Mis à jour il y a {taxiSecsAgo}s</p>}
              <button onClick={handleArrived} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#78350F,#F59E0B)', color: '#fff', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 16px rgba(120,53,15,0.4)' }}>
                🎯 Je suis arrivé !
              </button>
              <div style={{ marginTop: '12px', padding: '10px', background: '#FEF3C7', borderRadius: '10px' }}>
                <p style={{ fontSize: '11px', color: '#92400E', fontWeight: '700' }}>⚠️ Ne fermez pas cette page</p>
              </div>
            </div>
          )}

          {taxiState === 'arrived' && (
            <div style={{ background: '#EFF6FF', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</p>
              <p style={{ fontSize: '16px', fontWeight: '900', color: '#1D4ED8', marginBottom: '4px' }}>Course terminée !</p>
              <p style={{ fontSize: '12px', color: '#3B82F6' }}>Le client a été notifié de votre arrivée.</p>
            </div>
          )}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:1;transform:scale(1.3);}}`}</style>
      </div>
    );
  }

  // ── DELIVERY MODE UI ──
  return (
    <div style={{ minHeight: '100vh', background: '#F0FDF4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '360px', background: '#fff', borderRadius: '24px', padding: '32px 24px', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛵</div>
        <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#065F46', margin: '0 0 4px' }}>Bridge Safi — GPS Livreur</h1>
        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 24px' }}>Commande #{ref}</p>

        {status === 'asking' && (
          <div style={{ background: '#FEF3C7', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '14px', color: '#B45309', fontWeight: '700' }}>⏳ En attente de la localisation…</p>
            <p style={{ fontSize: '12px', color: '#92400E', marginTop: '4px' }}>Autorisez l'accès à votre position GPS</p>
          </div>
        )}

        {status === 'active' && delivStatus !== 'delivered' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#D1FAE5', borderRadius: '12px', padding: '10px 16px', marginBottom: '16px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#065F46' }}>GPS EN DIRECT</span>
              {secsAgo !== null && <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: 'auto' }}>il y a {secsAgo}s</span>}
            </div>

            {/* Status buttons */}
            <p style={{ fontSize: '10px', fontWeight: '900', color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: '10px', textTransform: 'uppercase' }}>Mettre à jour le statut</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {([
                { key: 'received',  label: '📋 Commande reçue',      bg: '#F0FDF4', border: '#86EFAC', color: '#065F46' },
                { key: 'preparing', label: '👨‍🍳 En préparation',       bg: '#FEF3C7', border: '#FDE68A', color: '#92400E' },
                { key: 'on_way',    label: '🛵 En chemin vers le client', bg: '#EFF6FF', border: '#93C5FD', color: '#1D4ED8' },
                { key: 'delivered', label: '✅ Livraison effectuée',  bg: '#065F46', border: '#065F46', color: '#fff'    },
              ] as {key:'received'|'preparing'|'on_way'|'delivered';label:string;bg:string;border:string;color:string}[]).map(s=>(
                <button key={s.key} onClick={()=>updateDelivStatus(s.key)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '12px',
                    background: delivStatus === s.key ? s.bg : '#F9FAFB',
                    border: `2px solid ${delivStatus === s.key ? s.border : '#E5E7EB'}`,
                    color: delivStatus === s.key ? s.color : '#9CA3AF',
                    fontSize: '13px', fontWeight: delivStatus === s.key ? '800' : '600',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    boxShadow: delivStatus === s.key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>

            {coords && (
              <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '8px', padding: '6px 8px', marginBottom: '8px' }}>
                📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
            <div style={{ padding: '10px 12px', background: '#FEF3C7', borderRadius: '10px' }}>
              <p style={{ fontSize: '11px', color: '#92400E', fontWeight: '700' }}>⚠️ Ne fermez pas cette page</p>
              <p style={{ fontSize: '10px', color: '#B45309', marginTop: '2px' }}>Laissez-la ouverte pendant toute la livraison</p>
            </div>
          </div>
        )}

        {status === 'active' && delivStatus === 'delivered' && (
          <div style={{ background: '#F0FDF4', borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</p>
            <p style={{ fontSize: '16px', fontWeight: '900', color: '#065F46', marginBottom: '4px' }}>Livraison terminée !</p>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>Le client a été notifié. Merci !</p>
          </div>
        )}

        {status === 'denied' && (
          <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '14px', color: '#DC2626', fontWeight: '700' }}>❌ Accès GPS refusé</p>
            <p style={{ fontSize: '12px', color: '#991B1B', marginTop: '4px' }}>Activez la localisation dans les paramètres de votre navigateur puis rechargez la page</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{ background: '#FEE2E2', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '14px', color: '#DC2626', fontWeight: '700' }}>❌ Lien invalide</p>
            <p style={{ fontSize: '12px', color: '#991B1B', marginTop: '4px' }}>Utilisez le lien envoyé par le restaurant</p>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:1;transform:scale(1.3);}}`}</style>
    </div>
  );
}

// ─── DISPATCH PAGE (livreur + chauffeur taxi) ─────────────────────────────────

type DispatchRole = 'choose' | 'eats' | 'taxi';

interface PendingOrder { id: number; ref: string; customerName: string; customerAddress: string; restaurantName: string | null; total: number; items: string; }
interface PendingTaxi { ref: string; customerName?: string; clientAddress?: string; destination?: string; clientLat?: number; clientLng?: number; }

async function registerPush(driverName: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch('/api/push/vapid-key');
    const { publicKey } = await keyRes.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
    const key = sub.getKey('p256dh');
    const auth = sub.getKey('auth');
    if (!key || !auth) return false;
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        },
        driverName,
      }),
    });
    return true;
  } catch { return false; }
}

function playAlarm() {
  try {
    const ctx = new AudioContext();
    const beep = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.8, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    };
    [0, 0.25, 0.5, 0.8, 1.05, 1.3].forEach((t, i) => beep(i % 2 === 0 ? 880 : 1100, t, 0.2));
  } catch {}
  try { navigator.vibrate?.([300, 150, 300, 150, 600, 200, 600]); } catch {}
}

function DispatchPage() {
  const [, navigate] = useLocation();
  const [role, setRole] = useState<DispatchRole>('choose');
  const [driverName, setDriverName] = useState(() => { try { return localStorage.getItem('bridge_driver_name') || ''; } catch { return ''; } });
  const [pushOk, setPushOk] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Eats state
  const [eatsOrders, setEatsOrders] = useState<PendingOrder[]>([]);
  const [activeEatsOrder, setActiveEatsOrder] = useState<PendingOrder | null>(null);
  const [eatsGPS, setEatsGPS] = useState<'idle' | 'active' | 'denied'>('idle');
  const [eatsCoords, setEatsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const eatsWatchId = useRef<number | null>(null);
  const eatsSeenIds = useRef<Set<number>>(new Set());
  const sseRef = useRef<EventSource | null>(null);

  // Taxi state
  const [taxiBookings, setTaxiBookings] = useState<PendingTaxi[]>([]);
  const [activeTaxi, setActiveTaxi] = useState<PendingTaxi | null>(null);
  const [taxiGPS, setTaxiGPS] = useState<'idle' | 'active' | 'denied'>('idle');
  const taxiWatchId = useRef<number | null>(null);
  const taxiSeenRefs = useRef<Set<string>>(new Set());

  const handleSetRole = async (r: 'eats' | 'taxi') => {
    const name = driverName.trim() || (r === 'taxi' ? 'Chauffeur' : 'Livreur');
    localStorage.setItem('bridge_driver_name', name);
    setRole(r);
    setPushLoading(true);
    const ok = await registerPush(name);
    setPushOk(ok);
    setPushLoading(false);
  };

  // ── GPS reporting to server (for smart dispatch proximity) ──
  // Reports driver position every 30s so the API knows who is nearby which restaurant
  const gpsReportRef = useRef<number | null>(null);
  const liveGPSRef = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (role === 'choose') return;
    // Get push subscription endpoint (needed as driver ID)
    let endpoint = '';
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) endpoint = sub.endpoint; })
      .catch(() => {});
    // Watch GPS
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        pos => { liveGPSRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
    // Report every 30s
    const report = () => {
      if (!endpoint || !liveGPSRef.current) return;
      fetch('/api/tracking/driver-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, lat: liveGPSRef.current.lat, lng: liveGPSRef.current.lng, driverName: driverName || undefined }),
      }).catch(() => {});
    };
    // Initial report after 3s (give time to get GPS fix)
    const initTimeout = setTimeout(report, 3000);
    gpsReportRef.current = window.setInterval(report, 30_000);
    return () => {
      clearTimeout(initTimeout);
      if (gpsReportRef.current !== null) clearInterval(gpsReportRef.current);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [role, driverName]);

  // ── EATS: SSE stream for new orders ──
  useEffect(() => {
    if (role !== 'eats') return;
    const es = new EventSource('/api/orders/stream?driverKey=BRIDGE-DRIVER-2025');
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'NEW_ORDER') {
          // Re-fetch pending orders
          fetchEatsOrders();
        }
      } catch {}
    };
    fetchEatsOrders();
    const iv = setInterval(fetchEatsOrders, 10000);
    return () => { es.close(); clearInterval(iv); if (eatsWatchId.current != null) navigator.geolocation.clearWatch(eatsWatchId.current); };
  }, [role]);

  const DKEY = 'BRIDGE-DRIVER-2025';
  const fetchEatsOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=pending', { cache: 'no-store', headers: { 'x-driver-key': DKEY } });
      if (!res.ok) return;
      const data = await res.json();
      const orders: PendingOrder[] = (data.orders || []).filter((o: any) => o.service === 'delivery' || o.service === 'eats');
      setEatsOrders(orders);
      // Ring alarm for new unseen orders
      const newOnes = orders.filter(o => !eatsSeenIds.current.has(o.id));
      if (newOnes.length > 0) {
        newOnes.forEach(o => eatsSeenIds.current.add(o.id));
        playAlarm();
      }
    } catch {}
  };

  const acceptEatsOrder = async (order: PendingOrder) => {
    setActiveEatsOrder(order);
    await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-driver-key': DKEY },
      body: JSON.stringify({ status: 'on_the_way', driverName: driverName || 'Livreur' }),
    }).catch(() => {});
  };

  const startEatsGPS = () => {
    if (!navigator.geolocation) { setEatsGPS('denied'); return; }
    if (!activeEatsOrder) return;
    const ref = activeEatsOrder.ref;
    eatsWatchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setEatsCoords({ lat, lng });
        setEatsGPS('active');
        fetch(`/api/tracking/${ref}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, driverName: driverName || 'Livreur' }),
        }).catch(() => {});
      },
      () => setEatsGPS('denied'),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  };

  const finishEatsDelivery = () => {
    if (eatsWatchId.current != null) navigator.geolocation.clearWatch(eatsWatchId.current);
    if (activeEatsOrder) fetch(`/api/tracking/${activeEatsOrder.ref}`, { method: 'DELETE' }).catch(() => {});
    if (activeEatsOrder) fetch(`/api/orders/${activeEatsOrder.id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-driver-key': DKEY },
      body: JSON.stringify({ status: 'delivered' }),
    }).catch(() => {});
    setActiveEatsOrder(null);
    setEatsGPS('idle');
    setEatsCoords(null);
    fetchEatsOrders();
  };

  // ── TAXI: poll for pending bookings ──
  useEffect(() => {
    if (role !== 'taxi') return;
    const poll = async () => {
      try {
        const res = await fetch('/api/tracking-pending', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const bookings: PendingTaxi[] = data.bookings || [];
        setTaxiBookings(bookings);
        const newOnes = bookings.filter(b => !taxiSeenRefs.current.has(b.ref));
        if (newOnes.length > 0) {
          newOnes.forEach(b => taxiSeenRefs.current.add(b.ref));
          playAlarm();
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => { clearInterval(iv); if (taxiWatchId.current != null) navigator.geolocation.clearWatch(taxiWatchId.current); };
  }, [role]);

  const acceptTaxi = async (booking: PendingTaxi) => {
    setActiveTaxi(booking);
    setTaxiBookings(prev => prev.filter(b => b.ref !== booking.ref));
    await fetch(`/api/tracking/${booking.ref}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted', driverName: driverName || 'Chauffeur' }),
    }).catch(() => {});
    // Start GPS immediately
    if (!navigator.geolocation) { setTaxiGPS('denied'); return; }
    taxiWatchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTaxiGPS('active');
        fetch(`/api/tracking/${booking.ref}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng, status: 'accepted', driverName: driverName || 'Chauffeur' }),
        }).catch(() => {});
      },
      () => setTaxiGPS('denied'),
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
  };

  const finishTaxi = async () => {
    if (taxiWatchId.current != null) navigator.geolocation.clearWatch(taxiWatchId.current);
    if (activeTaxi) await fetch(`/api/tracking/${activeTaxi.ref}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'arrived' }),
    }).catch(() => {});
    setActiveTaxi(null);
    setTaxiGPS('idle');
  };

  // ── UI ──
  const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 20, padding: '18px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: 12, border: '1.5px solid #E5E7EB' };

  // CHOOSE ROLE
  if (role === 'choose') {
    return (
      <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#020c07 0%,#071C11 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', overflow: 'hidden', border: '2px solid #059669', marginBottom: 16 }}>
          <img src="/logo_splash_new.png" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.2em', margin: '0 0 4px' }}>BRIDGE DISPATCH</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 28px', letterSpacing: '0.1em' }}>PANNEAU CHAUFFEUR / LIVREUR</p>

        <input
          value={driverName}
          onChange={e => setDriverName(e.target.value)}
          placeholder="Votre prénom (ex: Youssef)"
          style={{ width: '100%', maxWidth: 340, padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, marginBottom: 20, outline: 'none', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
          <button onClick={() => handleSetRole('eats')}
            style={{ padding: '18px 0', borderRadius: 18, border: 'none', background: 'linear-gradient(135deg,#059669,#4ADE80)', color: '#fff', fontSize: 18, fontWeight: 900, cursor: 'pointer', boxShadow: '0 0 24px rgba(74,222,128,0.35)' }}>
            🛵 Je suis Livreur Bridge Eats
          </button>
          <button onClick={() => handleSetRole('taxi')}
            style={{ padding: '18px 0', borderRadius: 18, border: 'none', background: 'linear-gradient(135deg,#B45309,#F59E0B)', color: '#fff', fontSize: 18, fontWeight: 900, cursor: 'pointer', boxShadow: '0 0 24px rgba(245,158,11,0.35)' }}>
            🚖 Je suis Chauffeur Taxi
          </button>
        </div>
        <button onClick={() => navigate('/')} style={{ marginTop: 24, color: 'rgba(255,255,255,0.4)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}>← Retour</button>
      </div>
    );
  }

  const isTaxi = role === 'taxi';
  const accent = isTaxi ? '#F59E0B' : '#059669';
  const accentLight = isTaxi ? '#FEF3C7' : '#D1FAE5';
  const accentDark = isTaxi ? '#B45309' : '#065F46';
  const icon = isTaxi ? '🚖' : '🛵';
  const label = isTaxi ? 'Taxi Confort' : 'Bridge Eats';

  return (
    <div style={{ minHeight: '100dvh', background: '#F0FDF4', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ background: accentDark, padding: '52px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', margin: '0 0 2px' }}>BRIDGE DISPATCH</p>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, margin: 0 }}>{icon} {driverName || label}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pushLoading && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>⏳</span>}
          {pushOk && <span style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 20, padding: '3px 10px', color: '#4ADE80', fontSize: 10, fontWeight: 900 }}>🔔 Notifs ON</span>}
          <button onClick={() => { setRole('choose'); setActiveEatsOrder(null); setActiveTaxi(null); }}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>⟵</button>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

        {/* ── EATS MODE ── */}
        {role === 'eats' && !activeEatsOrder && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>COMMANDES EN ATTENTE ({eatsOrders.length})</p>
            {eatsOrders.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 32, margin: '0 0 10px' }}>⏳</p>
                <p style={{ color: '#6B7280', fontSize: 14, fontWeight: 700, margin: 0 }}>En attente de commandes…</p>
                <p style={{ color: '#9CA3AF', fontSize: 11, margin: '4px 0 0' }}>La sonnette retentira automatiquement</p>
              </div>
            ) : eatsOrders.map(order => (
              <div key={order.id} style={{ ...cardStyle, borderColor: '#BBF7D0', borderWidth: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, margin: '0 0 2px', letterSpacing: '0.1em' }}>COMMANDE</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#059669', margin: 0 }}>{order.ref}</p>
                  </div>
                  <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 900, borderRadius: 20, padding: '4px 12px' }}>{order.total} MAD</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: '0 0 2px' }}>👤 {order.customerName}</p>
                {order.restaurantName && <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 2px' }}>🥘 {order.restaurantName}</p>}
                <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>📍 {order.customerAddress}</p>
                <button onClick={() => acceptEatsOrder(order)}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#4ADE80)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                  ✅ Accepter cette commande
                </button>
              </div>
            ))}
          </>
        )}

        {role === 'eats' && activeEatsOrder && (
          <>
            <div style={{ ...cardStyle, borderColor: '#BBF7D0', borderWidth: 2 }}>
              <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 8px' }}>COMMANDE ACCEPTÉE</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#059669', margin: '0 0 6px' }}>{activeEatsOrder.ref}</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: '0 0 2px' }}>👤 {activeEatsOrder.customerName}</p>
              {activeEatsOrder.restaurantName && <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 2px' }}>🥘 Récupérer chez : {activeEatsOrder.restaurantName}</p>}
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 16px' }}>📍 Livrer à : {activeEatsOrder.customerAddress}</p>

              {eatsGPS === 'idle' && (
                <button onClick={startEatsGPS}
                  style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#065F46,#059669)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                  📡 J'ai la commande — Démarrer GPS
                </button>
              )}

              {eatsGPS === 'active' && (
                <div style={{ background: '#D1FAE5', borderRadius: 12, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 900, color: '#065F46', margin: 0 }}>GPS EN DIRECT — Client vous suit</p>
                    {eatsCoords && <p style={{ fontSize: 10, color: '#6B7280', margin: '2px 0 0', fontFamily: 'monospace' }}>{eatsCoords.lat.toFixed(5)}, {eatsCoords.lng.toFixed(5)}</p>}
                  </div>
                </div>
              )}

              {eatsGPS === 'denied' && <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 10 }}>❌ GPS refusé — activez la localisation</p>}

              <button onClick={finishEatsDelivery}
                style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                ✅ Livraison terminée
              </button>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:1;transform:scale(1.3);}}`}</style>
          </>
        )}

        {/* ── TAXI MODE ── */}
        {role === 'taxi' && !activeTaxi && (
          <>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>COURSES EN ATTENTE ({taxiBookings.length})</p>
            {taxiBookings.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: 32, margin: '0 0 10px' }}>⏳</p>
                <p style={{ color: '#6B7280', fontSize: 14, fontWeight: 700, margin: 0 }}>En attente de courses…</p>
                <p style={{ color: '#9CA3AF', fontSize: 11, margin: '4px 0 0' }}>La sonnette retentira automatiquement</p>
              </div>
            ) : taxiBookings.map(booking => (
              <div key={booking.ref} style={{ ...cardStyle, borderColor: '#FDE68A', borderWidth: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, margin: '0 0 2px', letterSpacing: '0.1em' }}>COURSE TAXI</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#B45309', margin: 0 }}>{booking.ref}</p>
                  </div>
                  <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: 11, fontWeight: 900, borderRadius: 20, padding: '4px 10px' }}>NOUVEAU</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>👤 {booking.customerName || 'Client'}</p>
                {booking.clientAddress && <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 2px' }}>📍 Départ : {booking.clientAddress}</p>}
                {booking.destination && <p style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 800, margin: '0 0 12px' }}>🏁 Destination : {booking.destination}</p>}
                <button onClick={() => acceptTaxi(booking)}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#B45309,#F59E0B)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 16px rgba(180,83,9,0.3)' }}>
                  ✅ Accepter la course
                </button>
              </div>
            ))}
          </>
        )}

        {role === 'taxi' && activeTaxi && (
          <div style={{ ...cardStyle, borderColor: '#FDE68A', borderWidth: 2 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.1em', margin: '0 0 8px' }}>COURSE ACCEPTÉE</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#B45309', margin: '0 0 6px' }}>{activeTaxi.ref}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>👤 {activeTaxi.customerName || 'Client'}</p>
            {activeTaxi.clientAddress && <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 2px' }}>📍 Départ : {activeTaxi.clientAddress}</p>}
            {activeTaxi.destination && <p style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 800, margin: '0 0 14px' }}>🏁 Destination : {activeTaxi.destination}</p>}

            {taxiGPS === 'active' ? (
              <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
                <p style={{ fontSize: 12, fontWeight: 900, color: '#B45309', margin: 0 }}>GPS EN DIRECT — Client vous suit sur la carte</p>
              </div>
            ) : taxiGPS === 'denied' ? (
              <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 12 }}>❌ GPS refusé — activez la localisation</p>
            ) : (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>⏳ Démarrage GPS…</p>
            )}

            <button onClick={finishTaxi}
              style={{ width: '100%', padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
              🏁 Course terminée — Arrivé !
            </button>
            <style>{`@keyframes pulse{0%,100%{opacity:0.5;transform:scale(1);}50%{opacity:1;transform:scale(1.3);}}`}</style>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── BRIDGE AI ASSISTANT PAGE ────────────────────────────────────────────────

type AssistMsg = { role: 'user' | 'assistant'; content: string };

const ASSISTANT_T = {
  fr: {
    title: 'Bridge Assistant',
    subtitle: 'Votre conseiller IA 24/7',
    placeholder: 'Écrivez votre question...',
    send: 'Envoyer',
    thinking: 'Bridge IA réfléchit...',
    greeting: 'Bonjour ! 👋 Je suis votre assistant Bridge Safi. Comment puis-je vous aider aujourd\.hui ?',
    quickTitle: 'Questions fréquentes',
    q1: '📦 Suivre ma commande',
    q2: '🚚 Retard de livraison',
    q3: '💳 Problème de paiement',
    q4: '❓ Autre question',
    escalated: '🔔 Un responsable Bridge vous contacte sous 30 min',
    wa: '📱 Contacter via WhatsApp',
    back: '← Retour',
  },
  en: {
    title: 'Bridge Assistant',
    subtitle: 'Your AI advisor 24/7',
    placeholder: 'Write your question...',
    send: 'Send',
    thinking: 'Bridge AI is thinking...',
    greeting: 'Hello! 👋 I\.m your Bridge Safi assistant. How can I help you today?',
    quickTitle: 'Frequent questions',
    q1: '📦 Track my order',
    q2: '🚚 Delivery delay',
    q3: '💳 Payment issue',
    q4: '❓ Other question',
    escalated: '🔔 A Bridge manager will contact you within 30 min',
    wa: '📱 Contact via WhatsApp',
    back: '← Back',
  },
  ar: {
    title: 'مساعد بريدج',
    subtitle: 'مستشارك الذكي 24/7',
    placeholder: 'اكتب سؤالك...',
    send: 'إرسال',
    thinking: 'بريدج AI يفكر...',
    greeting: 'أهلاً! 👋 أنا مساعدك الذكي من Bridge Safi. كيف يمكنني مساعدتك اليوم؟',
    quickTitle: 'أسئلة شائعة',
    q1: '📦 تتبع طلبي',
    q2: '🚚 تأخر التوصيل',
    q3: '💳 مشكلة في الدفع',
    q4: '❓ سؤال آخر',
    escalated: '🔔 سيتصل بك مسؤول Bridge خلال 30 دقيقة',
    wa: '📱 تواصل عبر واتساب',
    back: '→ رجوع',
  },
  amz: {
    title: 'ⴰⵎⵙⴰⵡⴰⵍ Bridge',
    subtitle: 'ⴰⵎⵙⴰⵡⴰⵍ ⵏⵏⴽ 24/7',
    placeholder: 'ⴽⵜⴱ ⵓⵙⵉⴹⵏ ⵏⵏⴽ...',
    send: 'ⵥⵥⵍ',
    thinking: 'Bridge AI ⵉⵜⵜⴼⴽⴽⵉⵔ...',
    greeting: 'ⴰⵣⵓⵍ! 👋 ⵏⴽⴽ ⴰⵎⵙⴰⵡⴰⵍ ⵏⵏⴽ ⵏ Bridge Safi.',
    quickTitle: 'ⵉⵙⵙⵉⴹⵏⵏ ⵉⵎⵥⵍⴰⵢⵏ',
    q1: '📦 ⵙⵍⴳⵏ ⴰⵣⵏⵓⵥ ⵏⵏⵉ',
    q2: '🚚 ⴰⵃⵟⵟⵓ ⵏ ⵓⵣⵏⵉ',
    q3: '💳 ⴰⵎⴽⴽⵓⵙ ⵏ ⵓⵙⵓⵔⴼ',
    q4: '❓ ⴰⵙⵙⵉⴹ ⵢⴰⴹⵏ',
    escalated: '🔔 ⴰⵎⵙⵉⵡⵍ Bridge ⴰⴷ ⴽ ⵉⵙⵙⵏⵖ ⵖ 30 ⵜⵓⵙⴷⴰⵜⵉⵏ',
    wa: '📱 ⵙⵙⵏⵎⵍ ⵙ WhatsApp',
    back: '← ⴰⵣⵣⵓⵍ',
  },
};

type AssistLang = 'fr'|'en'|'ar'|'amz';
const ASSIST_LANGS: AssistLang[] = ['fr','en','ar','amz'];
// ─── RESTAURANT OWNER PAGE ────────────────────────────────────────────────────

const RESTO_RESTAURANTS = [
  "McDonald's Safi",
  "Bridge Pizza & Tacos",
  "Safi Seafood Palace",
  "Kebab Express Safi",
  "Burger Corner Safi",
];

type RestoOrder = {
  id: number; ref: string; customerName: string; customerPhone: string;
  customerAddress: string; items: unknown; total: number;
  deliveryMode: string; paymentMethod: string; status: string;
  createdAt: string; restaurantName: string | null;
};

function playAlert() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function statusLabel(s: string) {
  const m: Record<string,{label:string;color:string}> = {
    pending:   {label:'🟡 En attente',   color:'#F59E0B'},
    accepted:  {label:'🟢 Acceptée',     color:'#10B981'},
    preparing: {label:'🔵 En préparation',color:'#3B82F6'},
    ready:     {label:'✅ Prêt',         color:'#059669'},
    delivered: {label:'📦 Livrée',       color:'#6B7280'},
    refused:   {label:'❌ Refusée',      color:'#EF4444'},
    cancelled: {label:'🚫 Annulée',      color:'#EF4444'},
    on_the_way:{label:'🚴 En route',     color:'#8B5CF6'},
  };
  return m[s] || {label:s, color:'#9CA3AF'};
}

type RestoProfile = {
  phone: string; address: string; lat: string; lng: string; webhookUrl: string;
};

function RestaurantOwnerPage() {
  const [, navigate] = useLocation();
  const [restoName, setRestoName] = useState('');
  const [pin, setPin] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [orders, setOrders] = useState<RestoOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders'|'settings'>('orders');
  const [profile, setProfile] = useState<RestoProfile>({phone:'',address:'',lat:'',lng:'',webhookUrl:''});
  const [bridgeSecret, setBridgeSecret] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [copied, setCopied] = useState('');
  const seenRefs = useRef<Set<string>>(new Set());
  const pollRef = useRef<number|null>(null);

  // Restore session
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bridge_resto_session');
      if (saved) { const s = JSON.parse(saved); setRestoName(s.name); setPin(s.pin); setLoggedIn(true); }
    } catch {}
  }, []);

  const fetchOrders = async (name: string, p: string) => {
    try {
      const r = await fetch(`/api/orders/by-restaurant?name=${encodeURIComponent(name)}&pin=${encodeURIComponent(p)}`);
      if (!r.ok) return;
      const data = await r.json();
      const newOrders: RestoOrder[] = data.orders || [];
      const newPending = newOrders.filter(o => o.status === 'pending' && !seenRefs.current.has(o.ref));
      if (newPending.length > 0) { playAlert(); newPending.forEach(o => seenRefs.current.add(o.ref)); }
      newOrders.forEach(o => seenRefs.current.add(o.ref));
      setOrders(newOrders);
    } catch {}
  };

  const fetchProfile = async (name: string, p: string) => {
    try {
      const r = await fetch(`/api/restaurant/profile?name=${encodeURIComponent(name)}&pin=${encodeURIComponent(p)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.profile) {
        setProfile({
          phone:      data.profile.phone      ?? '',
          address:    data.profile.address    ?? '',
          lat:        data.profile.lat        != null ? String(data.profile.lat) : '',
          lng:        data.profile.lng        != null ? String(data.profile.lng) : '',
          webhookUrl: data.profile.webhookUrl ?? '',
        });
      }
      if (data.bridgeSecret) setBridgeSecret(data.bridgeSecret);
    } catch {}
  };

  const saveProfile = async () => {
    setProfileLoading(true); setProfileSaved(false);
    try {
      await fetch('/api/restaurant/profile', {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: restoName, pin,
          phone:      profile.phone      || null,
          address:    profile.address    || null,
          lat:        profile.lat        ? parseFloat(profile.lat)  : null,
          lng:        profile.lng        ? parseFloat(profile.lng)  : null,
          webhookUrl: profile.webhookUrl || null,
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch {}
    setProfileLoading(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  useEffect(() => {
    if (!loggedIn) return;
    fetchOrders(restoName, pin);
    fetchProfile(restoName, pin);
    pollRef.current = window.setInterval(() => fetchOrders(restoName, pin), 12000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loggedIn, restoName, pin]);

  const handleLogin = async () => {
    setLoginErr(''); setLoading(true);
    try {
      const r = await fetch(`/api/orders/by-restaurant?name=${encodeURIComponent(restoName)}&pin=${encodeURIComponent(pin)}`);
      if (r.status === 401) { setLoginErr('PIN incorrect — réessayez'); setLoading(false); return; }
      if (!r.ok) { setLoginErr('Erreur serveur'); setLoading(false); return; }
      localStorage.setItem('bridge_resto_session', JSON.stringify({name:restoName, pin}));
      const data = await r.json();
      const o: RestoOrder[] = data.orders || [];
      o.forEach(x => seenRefs.current.add(x.ref));
      setOrders(o); setLoggedIn(true);
    } catch { setLoginErr('Erreur de connexion'); }
    setLoading(false);
  };

  const updateStatus = async (ref: string, status: string) => {
    await fetch(`/api/orders/by-ref/${ref}/status`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({status, pin, restaurantName: restoName}),
    });
    setOrders(prev => prev.map(o => o.ref === ref ? {...o, status} : o));
  };

  const logout = () => {
    localStorage.removeItem('bridge_resto_session');
    setLoggedIn(false); setOrders([]); setPin(''); seenRefs.current.clear();
  };

  const pending = orders.filter(o => o.status === 'pending');
  const active  = orders.filter(o => ['accepted','preparing'].includes(o.status));
  const done    = orders.filter(o => ['ready','delivered','refused','cancelled','on_the_way'].includes(o.status));

  // ── LOGIN SCREEN ────────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <div style={{minHeight:'100dvh',background:'linear-gradient(135deg,#0A1A0F 0%,#0D2E1A 50%,#0A1A0F 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:'system-ui'}}>
      <div style={{fontSize:48,marginBottom:12}}>🍽️</div>
      <h1 style={{color:'#fff',fontSize:22,fontWeight:900,letterSpacing:'0.1em',margin:'0 0 4px',textAlign:'center'}}>ESPACE RESTAURATEURS</h1>
      <p style={{color:'rgba(255,255,255,0.4)',fontSize:12,fontWeight:600,margin:'0 0 28px',textAlign:'center'}}>Bridge Safi · Interface partenaire</p>

      <div style={{width:'100%',maxWidth:340,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,padding:'24px 20px',display:'flex',flexDirection:'column',gap:14}}>
        <div>
          <label style={{color:'rgba(255,255,255,0.5)',fontSize:10,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:6}}>Votre Restaurant</label>
          <select value={restoName} onChange={e=>setRestoName(e.target.value)}
            style={{width:'100%',padding:'13px 14px',borderRadius:14,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color: restoName?'#fff':'rgba(255,255,255,0.4)',fontSize:14,fontWeight:700,outline:'none',appearance:'none'}}>
            <option value="">-- Sélectionner --</option>
            {RESTO_RESTAURANTS.map(r=><option key={r} value={r} style={{background:'#1a2e1f',color:'#fff'}}>{r}</option>)}
          </select>
        </div>

        <div>
          <label style={{color:'rgba(255,255,255,0.5)',fontSize:10,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:6}}>Code PIN (4 chiffres)</label>
          <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
            placeholder="••••"
            style={{width:'100%',boxSizing:'border-box',padding:'13px 14px',borderRadius:14,background:'rgba(255,255,255,0.08)',border:`1px solid ${loginErr?'#EF4444':'rgba(255,255,255,0.15)'}`,color:'#fff',fontSize:22,fontWeight:900,letterSpacing:'0.5em',textAlign:'center',outline:'none'}}
            onKeyDown={e=>{if(e.key==='Enter')handleLogin();}}/>
          {loginErr && <p style={{color:'#F87171',fontSize:11,fontWeight:700,margin:'6px 0 0'}}>{loginErr}</p>}
        </div>

        <button onClick={handleLogin} disabled={!restoName||pin.length!==4||loading}
          style={{width:'100%',padding:'15px 0',borderRadius:14,border:'none',cursor:!restoName||pin.length!==4||loading?'not-allowed':'pointer',
            background:!restoName||pin.length!==4||loading?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#059669,#4ADE80)',
            color:!restoName||pin.length!==4||loading?'rgba(255,255,255,0.4)':'#fff',fontSize:15,fontWeight:900,letterSpacing:'0.05em'}}>
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>
      </div>

      <button onClick={()=>navigate('/')} style={{marginTop:20,background:'none',border:'none',color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:700,cursor:'pointer'}}>
        ← Retour à Bridge
      </button>
    </div>
  );

  // ── ORDER CARD ──────────────────────────────────────────────────────────────
  const OrderCard = ({o}: {o: RestoOrder}) => {
    const st = statusLabel(o.status);
    const items = Array.isArray(o.items) ? o.items as {name:string;qty:number;price:number}[] : [];
    const time = new Date(o.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
    return (
      <div style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${o.status==='pending'?'rgba(245,158,11,0.5)':o.status==='refused'?'rgba(239,68,68,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:18,padding:'14px 16px',marginBottom:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div>
            <span style={{color:'#D9C5A0',fontSize:11,fontWeight:900,letterSpacing:'0.1em'}}>{o.ref}</span>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:10,fontWeight:600,marginLeft:8}}>{time}</span>
          </div>
          <span style={{color:st.color,fontSize:10,fontWeight:900,background:`${st.color}18`,padding:'3px 8px',borderRadius:8}}>{st.label}</span>
        </div>

        <p style={{color:'#fff',fontSize:13,fontWeight:700,margin:'0 0 2px'}}>👤 {o.customerName} · 📞 {o.customerPhone}</p>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:600,margin:'0 0 8px'}}>📍 {o.customerAddress} · {o.deliveryMode==='collect'?'Click & Collect':'Livraison'}</p>

        {items.length>0 && (
          <div style={{background:'rgba(0,0,0,0.2)',borderRadius:10,padding:'8px 10px',marginBottom:10}}>
            {items.map((it,i)=>(
              <p key={i} style={{color:'rgba(255,255,255,0.75)',fontSize:11,fontWeight:600,margin:'0 0 2px'}}>
                × {it.qty} {it.name} — {it.price} MAD
              </p>
            ))}
          </div>
        )}

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: o.status==='pending'||o.status==='accepted'||o.status==='preparing'?10:0}}>
          <span style={{color:'#4ADE80',fontSize:14,fontWeight:900}}>💰 {o.total} MAD</span>
          <span style={{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:700}}>{o.paymentMethod==='cash'?'💵 Cash':o.paymentMethod==='card'?'💳 Carte':'💳'}</span>
        </div>

        {o.status==='pending' && (
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>updateStatus(o.ref,'accepted')}
              style={{flex:1,padding:'11px 0',borderRadius:12,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#059669,#4ADE80)',color:'#fff',fontSize:13,fontWeight:900}}>
              ✅ Accepter
            </button>
            <button onClick={()=>updateStatus(o.ref,'refused')}
              style={{flex:1,padding:'11px 0',borderRadius:12,cursor:'pointer',background:'rgba(239,68,68,0.2)',border:'1px solid rgba(239,68,68,0.5)',color:'#F87171',fontSize:13,fontWeight:900}}>
              ❌ Refuser
            </button>
          </div>
        )}
        {o.status==='accepted' && (
          <button onClick={()=>updateStatus(o.ref,'preparing')}
            style={{width:'100%',padding:'11px 0',borderRadius:12,cursor:'pointer',background:'rgba(59,130,246,0.2)',border:'1px solid rgba(59,130,246,0.5)',color:'#60A5FA',fontSize:13,fontWeight:900}}>
            👨‍🍳 En préparation
          </button>
        )}
        {o.status==='preparing' && (
          <button onClick={()=>updateStatus(o.ref,'ready')}
            style={{width:'100%',padding:'11px 0',borderRadius:12,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#059669,#4ADE80)',color:'#fff',fontSize:13,fontWeight:900}}>
            🔔 Commande Prête !
          </button>
        )}
      </div>
    );
  };

  // ── DASHBOARD SCREEN ────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100dvh',background:'linear-gradient(135deg,#0A1A0F 0%,#0D2E1A 50%,#0A1A0F 100%)',fontFamily:'system-ui',paddingBottom:30}}>
      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(4,17,10,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:20}}>🍽️</span>
        <div style={{flex:1}}>
          <p style={{color:'#fff',fontSize:13,fontWeight:900,margin:0,lineHeight:1}}>{restoName}</p>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:600,margin:0}}>Espace restaurateur</p>
        </div>
        {/* Open/Closed toggle */}
        <button onClick={()=>setIsOpen(p=>!p)}
          style={{padding:'7px 14px',borderRadius:20,cursor:'pointer',
            background: isOpen?'rgba(74,222,128,0.2)':'rgba(239,68,68,0.2)',
            border: `1px solid ${isOpen?'rgba(74,222,128,0.4)':'rgba(239,68,68,0.4)'}`,
            color: isOpen?'#4ADE80':'#F87171', fontSize:11,fontWeight:900}}>
          {isOpen?'🟢 OUVERT':'🔴 FERMÉ'}
        </button>
        <button onClick={logout} style={{padding:'7px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:700,cursor:'pointer'}}>
          Déco.
        </button>
      </div>

      {/* Tab navigation */}
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        {([['orders','📋 Commandes'],['settings','⚙️ Paramètres']] as const).map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)}
            style={{flex:1,padding:'12px 0',border:'none',cursor:'pointer',background:'transparent',
              color: activeTab===tab?'#4ADE80':'rgba(255,255,255,0.35)',
              fontSize:12,fontWeight:900,letterSpacing:'0.04em',
              borderBottom: activeTab===tab?'2px solid #4ADE80':'2px solid transparent',
              transition:'all 0.2s'}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── COMMANDES TAB ─────────────────────────────────────────── */}
      {activeTab==='orders' && (
        <div style={{padding:'14px 14px 0'}}>
          {/* Stats */}
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {[
              {label:'En attente', count:pending.length, color:'#F59E0B'},
              {label:'En cours',   count:active.length,  color:'#3B82F6'},
              {label:'Terminées',  count:done.length,     color:'#6B7280'},
            ].map(s=>(
              <div key={s.label} style={{flex:1,padding:'10px 0',textAlign:'center',background:'rgba(255,255,255,0.03)',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)'}}>
                <p style={{color:s.color,fontSize:20,fontWeight:900,margin:0}}>{s.count}</p>
                <p style={{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:700,margin:0,textTransform:'uppercase'}}>{s.label}</p>
              </div>
            ))}
          </div>

          <button onClick={()=>fetchOrders(restoName,pin)}
            style={{width:'100%',padding:'10px 0',borderRadius:14,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:700,cursor:'pointer',marginBottom:14}}>
            🔄 Actualiser les commandes
          </button>

          {pending.length>0 && (
            <>
              <p style={{color:'#F59E0B',fontSize:10,fontWeight:900,letterSpacing:'0.15em',textTransform:'uppercase',margin:'0 0 10px'}}>
                🟡 EN ATTENTE ({pending.length})
              </p>
              {pending.map(o=><OrderCard key={o.ref} o={o}/>)}
            </>
          )}
          {active.length>0 && (
            <>
              <p style={{color:'#60A5FA',fontSize:10,fontWeight:900,letterSpacing:'0.15em',textTransform:'uppercase',margin:'14px 0 10px'}}>
                👨‍🍳 EN COURS ({active.length})
              </p>
              {active.map(o=><OrderCard key={o.ref} o={o}/>)}
            </>
          )}
          {done.length>0 && (
            <>
              <p style={{color:'rgba(255,255,255,0.25)',fontSize:10,fontWeight:900,letterSpacing:'0.15em',textTransform:'uppercase',margin:'14px 0 10px'}}>
                📦 TERMINÉES ({done.length})
              </p>
              {done.map(o=><OrderCard key={o.ref} o={o}/>)}
            </>
          )}
          {orders.length===0 && (
            <div style={{textAlign:'center',paddingTop:40}}>
              <div style={{fontSize:48,marginBottom:12}}>🍽️</div>
              <p style={{color:'rgba(255,255,255,0.3)',fontSize:14,fontWeight:700}}>Aucune commande pour l'instant</p>
              <p style={{color:'rgba(255,255,255,0.2)',fontSize:12,fontWeight:600}}>Actualisation automatique toutes les 12 secondes</p>
            </div>
          )}
        </div>
      )}

      {/* ── PARAMÈTRES TAB ────────────────────────────────────────── */}
      {activeTab==='settings' && (
        <div style={{padding:'16px 14px 40px'}}>

          {/* Restaurant info */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'16px',marginBottom:16}}>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',margin:'0 0 14px'}}>📋 Informations</p>

            <div style={{marginBottom:12}}>
              <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',display:'block',marginBottom:6}}>Nom du restaurant</label>
              <div style={{padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:700}}>{restoName}</div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',display:'block',marginBottom:6}}>Téléphone WhatsApp</label>
              <input type="tel" value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))}
                placeholder="+212612345678"
                style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff',fontSize:13,fontWeight:600,outline:'none'}}/>
            </div>

            <div>
              <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',display:'block',marginBottom:6}}>Adresse</label>
              <input type="text" value={profile.address} onChange={e=>setProfile(p=>({...p,address:e.target.value}))}
                placeholder="Ex: 12 Rue Hassan II, Safi"
                style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff',fontSize:13,fontWeight:600,outline:'none'}}/>
            </div>
          </div>

          {/* GPS coordinates */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'16px',marginBottom:16}}>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:900,letterSpacing:'0.12em',textTransform:'uppercase',margin:'0 0 14px'}}>📍 Coordonnées GPS</p>
            <p style={{color:'rgba(255,255,255,0.3)',fontSize:11,fontWeight:600,margin:'0 0 12px'}}>Utilisées pour le dispatch intelligent des livreurs.</p>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}>
                <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',display:'block',marginBottom:6}}>Latitude</label>
                <input type="number" step="any" value={profile.lat} onChange={e=>setProfile(p=>({...p,lat:e.target.value}))}
                  placeholder="32.3012"
                  style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff',fontSize:13,fontWeight:600,outline:'none'}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.1em',textTransform:'uppercase',display:'block',marginBottom:6}}>Longitude</label>
                <input type="number" step="any" value={profile.lng} onChange={e=>setProfile(p=>({...p,lng:e.target.value}))}
                  placeholder="-9.2305"
                  style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff',fontSize:13,fontWeight:600,outline:'none'}}/>
              </div>
            </div>
          </div>

          {/* Integration / Webhook */}
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'16px',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:16}}>🔗</span>
              <p style={{color:'#fff',fontSize:13,fontWeight:900,margin:0}}>Pont d'intégration Eats</p>
            </div>
            <p style={{color:'rgba(255,255,255,0.35)',fontSize:11,fontWeight:600,margin:'0 0 14px'}}>Donnez ces informations à votre responsable Bridge Eats</p>
            <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:12,padding:'10px 12px',marginBottom:14}}>
              <p style={{color:'rgba(74,222,128,0.8)',fontSize:11,fontWeight:600,margin:0}}>Bridge Eats enverra automatiquement vos nouvelles commandes à cette URL en utilisant votre token secret. Dès qu'une commande arrive, l'alarme sonne et elle apparaît sur votre tableau de bord.</p>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:6}}>URL DU WEBHOOK (votre système)</label>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="url" value={profile.webhookUrl} onChange={e=>setProfile(p=>({...p,webhookUrl:e.target.value}))}
                  placeholder="https://votre-systeme.com/api/commandes"
                  style={{flex:1,padding:'11px 12px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#fff',fontSize:11,fontWeight:600,outline:'none'}}/>
                {profile.webhookUrl && (
                  <button onClick={()=>copyToClipboard(profile.webhookUrl,'wh')}
                    style={{padding:'11px 14px',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer',flexShrink:0}}>
                    {copied==='wh'?'✓':'⎘'}
                  </button>
                )}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:6}}>EN-TÊTE REQUIS</label>
              <div style={{padding:'11px 12px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',fontSize:12,fontWeight:700,fontFamily:'monospace'}}>X-Bridge-Token</div>
            </div>

            {bridgeSecret && (
              <div>
                <label style={{color:'rgba(255,255,255,0.45)',fontSize:10,fontWeight:800,letterSpacing:'0.12em',textTransform:'uppercase',display:'block',marginBottom:6}}>SECRET DU JETON</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <div style={{flex:1,padding:'11px 12px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',fontSize:11,fontWeight:700,fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {bridgeSecret}
                  </div>
                  <button onClick={()=>copyToClipboard(bridgeSecret,'secret')}
                    style={{padding:'11px 14px',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer',flexShrink:0}}>
                    {copied==='secret'?'✓':'⎘'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <button onClick={saveProfile} disabled={profileLoading}
            style={{width:'100%',padding:'15px 0',borderRadius:16,border:'none',cursor:profileLoading?'not-allowed':'pointer',
              background: profileSaved?'linear-gradient(135deg,#059669,#4ADE80)':profileLoading?'rgba(255,255,255,0.1)':'linear-gradient(135deg,#065F46,#059669)',
              color:'#fff',fontSize:15,fontWeight:900,letterSpacing:'0.05em',transition:'all 0.3s'}}>
            {profileSaved?'✅ Enregistré !':profileLoading?'Enregistrement...':'💾 Enregistrer le profil'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── END RESTAURANT OWNER PAGE ────────────────────────────────────────────────

const ASSIST_LANG_LABELS: Record<AssistLang,string> = {fr:'FR',en:'EN',ar:'AR',amz:'ⴰⵎⵣ'};

function BridgeAssistantPage() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<AssistLang>(()=>{
    try { const r = localStorage.getItem('bridge_nav_state'); if(r){const p=JSON.parse(r);if(ASSIST_LANGS.includes(p.lang)) return p.lang;} } catch{}
    return 'fr';
  });
  const t = ASSISTANT_T[lang];
  const isAR = lang==='ar';

  const [messages, setMessages] = useState<AssistMsg[]>([{ role:'assistant', content: ASSISTANT_T[lang].greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const BRIDGE_WA_NUMBER = '+212764794856';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  // Re-set greeting when language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role:'assistant', content: ASSISTANT_T[lang].greeting }];
      }
      return prev;
    });
  }, [lang]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AssistMsg = { role:'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/assistant/chat`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages: newMessages, lang }),
      });
      const data = await res.json() as { reply: string; isEscalation: boolean };
      setMessages(prev => [...prev, { role:'assistant', content: data.reply }]);
      if (data.isEscalation) setEscalated(true);
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content: '⚠️ Service temporairement indisponible. Réessayez dans quelques instants.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [t.q1, t.q2, t.q3, t.q4];

  return (
    <div dir={isAR?'rtl':'ltr'} style={{minHeight:'100dvh',background:'linear-gradient(160deg,#030712 0%,#0f172a 50%,#1e1b4b 100%)',display:'flex',flexDirection:'column',position:'relative',overflow:'hidden'}}>
      {/* Ambient glows */}
      <div style={{position:'absolute',top:-80,left:-80,width:300,height:300,borderRadius:'50%',background:'rgba(99,102,241,0.12)',filter:'blur(80px)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-60,right:-60,width:250,height:250,borderRadius:'50%',background:'rgba(14,165,233,0.1)',filter:'blur(70px)',pointerEvents:'none'}}/>

      {/* Header */}
      <div style={{position:'sticky',top:0,zIndex:50,background:'rgba(3,7,18,0.85)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(99,102,241,0.2)',padding:'14px 16px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:480,margin:'0 auto'}}>
          <button onClick={()=>navigate('/')} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#94a3b8',borderRadius:12,padding:'8px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            {t.back}
          </button>
          <div style={{textAlign:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:'#4ADE80',boxShadow:'0 0 8px #4ADE80'}}/>
              <p style={{color:'#fff',fontSize:15,fontWeight:900,margin:0,letterSpacing:0.5}}>{t.title}</p>
            </div>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:10,margin:0}}>{t.subtitle}</p>
          </div>
          <button onClick={()=>setLang(l=>{const i=ASSIST_LANGS.indexOf(l);return ASSIST_LANGS[(i+1)%ASSIST_LANGS.length];})}
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'#94a3b8',borderRadius:12,padding:'8px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            {ASSIST_LANG_LABELS[lang]}
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px',maxWidth:480,width:'100%',margin:'0 auto',boxSizing:'border-box'}}>

        {/* Quick actions (only when chat is at greeting) */}
        {messages.length <= 1 && (
          <div style={{marginBottom:16}}>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',textAlign:'center',marginBottom:10}}>{t.quickTitle}</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {quickQuestions.map((q,i) => (
                <button key={i} onClick={()=>sendMessage(q)}
                  style={{background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.3)',color:'rgba(255,255,255,0.8)',borderRadius:14,padding:'12px 10px',fontSize:12,fontWeight:600,cursor:'pointer',textAlign:'center',lineHeight:1.4}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div key={idx} style={{display:'flex',flexDirection:'column',alignItems:msg.role==='user'?(isAR?'flex-start':'flex-end'):(isAR?'flex-end':'flex-start'),marginBottom:12}}>
            {msg.role==='assistant' && (
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexDirection:isAR?'row-reverse':'row'}}>
                <div style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',border:'1px solid rgba(99,102,241,0.4)'}}>
                  <img src="/logo_splash_new.png" alt="Bridge" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                </div>
                <span style={{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:700}}>Bridge AI</span>
              </div>
            )}
            <div style={{
              maxWidth:'82%',
              background: msg.role==='user'
                ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                : 'rgba(255,255,255,0.07)',
              border: msg.role==='user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: msg.role==='user'
                ? isAR ? '18px 18px 18px 4px' : '18px 18px 4px 18px'
                : isAR ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              padding:'12px 14px',
              boxShadow: msg.role==='user' ? '0 4px 16px rgba(79,70,229,0.3)' : 'none',
            }}>
              <p style={{color:'#fff',fontSize:13,lineHeight:1.6,margin:0,whiteSpace:'pre-wrap'}}>{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <div style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',border:'1px solid rgba(99,102,241,0.4)'}}>
              <img src="/logo_splash_new.png" alt="Bridge" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'18px 18px 18px 4px',padding:'12px 16px',display:'flex',gap:6,alignItems:'center'}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:7,height:7,borderRadius:'50%',background:'#6366f1',animation:`dotBounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>
              ))}
            </div>
            <span style={{color:'rgba(255,255,255,0.35)',fontSize:10}}>{t.thinking}</span>
          </div>
        )}

        {/* Escalation alert */}
        {escalated && (
          <div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.4)',borderRadius:16,padding:'14px 16px',marginBottom:12,textAlign:'center'}}>
            <p style={{color:'#FDE047',fontSize:13,fontWeight:700,margin:'0 0 10px'}}>{t.escalated}</p>
            <a href={`https://wa.me/${BRIDGE_WA_NUMBER.replace('+','')}`} target="_blank" rel="noreferrer"
              style={{display:'inline-flex',alignItems:'center',gap:8,background:'#25d366',color:'#fff',borderRadius:12,padding:'10px 18px',fontSize:13,fontWeight:800,textDecoration:'none'}}>
              {t.wa}
            </a>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input bar */}
      <div style={{background:'rgba(3,7,18,0.9)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(99,102,241,0.2)',padding:'12px 16px',paddingBottom:'max(12px,env(safe-area-inset-bottom))'}}>
        <div style={{display:'flex',gap:10,maxWidth:480,margin:'0 auto',alignItems:'flex-end'}}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input);}}}
            placeholder={t.placeholder}
            rows={1}
            style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(99,102,241,0.3)',color:'#fff',borderRadius:16,padding:'12px 14px',fontSize:14,outline:'none',resize:'none',minHeight:46,maxHeight:120,lineHeight:1.5,fontFamily:'inherit'}}
          />
          <button
            onClick={()=>sendMessage(input)}
            disabled={loading||!input.trim()}
            style={{width:46,height:46,borderRadius:14,background:loading||!input.trim()?'rgba(79,70,229,0.3)':'linear-gradient(135deg,#4f46e5,#7c3aed)',border:'none',color:'#fff',fontSize:20,cursor:loading||!input.trim()?'default':'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',boxShadow:loading||!input.trim()?'none':'0 4px 14px rgba(79,70,229,0.4)'}}>
            {loading ? '⏳' : '↑'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%,80%,100%{transform:translateY(0);}
          40%{transform:translateY(-6px);}
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// ─── Error Boundary — attrape les crashes React silencieux ──────────────────
interface EBState { hasError: boolean; error: string }
class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, error: err?.message || 'Erreur inconnue' };
  }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error('[Bridge] App crash:', err, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 20px',
        background: 'linear-gradient(160deg,#030712,#020c07)',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: '#F87171', fontSize: 13, fontWeight: 900, letterSpacing: '0.12em', margin: '0 0 8px', textTransform: 'uppercase' }}>
          Erreur de l'application
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 28px', textAlign: 'center', maxWidth: 320 }}>
          {this.state.error}
        </p>
        <button
          onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}
          style={{
            padding: '14px 32px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#065F46,#4ADE80)', color: '#fff',
            fontSize: 14, fontWeight: 900, letterSpacing: '0.06em',
          }}>
          🔄 Recharger l'application
        </button>
      </div>
    );
  }
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <SessionKeepAlive />
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/forgot-password" component={ForgotPasswordPage} />
          <Route path="/game" component={GamePage} />
          <Route path="/assistant" component={BridgeAssistantPage} />
          <Route path="/dispatch" component={DispatchPage} />
          <Route path="/driver/:ref" component={DriverTrackerPage} />
          <Route path="/resto" component={RestaurantOwnerPage} />
          <Route component={App} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  </ErrorBoundary>
);
