import React, { useState, useEffect } from "react";
import { 
  Sprout, Sparkles, User, LogOut, Bell, Shield, MapPin, 
  Droplets, TrendingUp, HelpCircle, Laptop, GraduationCap, ChevronRight, CheckCircle, Mail, Phone, Lock, Eye, EyeOff,
  Database
} from "lucide-react";
import { 
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "./firebase";
import { LanguageCode, UserProfile, NotificationItem, UserRole } from "./types";
import { UI_TRANSLATIONS, MOCK_WEATHER_DATA } from "./data";
import kisanLogo from "./assets/images/punjab_kisan_logo_1780814548713.png";

// Import modular panels
import WeatherWidget from "./components/WeatherWidget";
import CropDiseaseCard from "./components/CropDiseaseCard";
import SoilAnalyzer from "./components/SoilAnalyzer";
import LiveMandi from "./components/LiveMandi";
import GovSchemes from "./components/GovSchemes";
import FertilizerCalculator from "./components/FertilizerCalculator";
import WaterManager from "./components/WaterManager";
import PestAlertNetwork from "./components/PestAlertNetwork";
import OfficerDashboard from "./components/OfficerDashboard";
import ChatAssistant from "./components/ChatAssistant";
import SupabasePortal from "./components/SupabasePortal";
import { syncProfileToSupabase } from "./supabase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<LanguageCode>("pa"); // Default Punjabi language preference
  const [loading, setLoading] = useState(true);

  // Authentication states
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authRole, setAuthRole] = useState<UserRole>("farmer");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [userOtpInput, setUserOtpInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Active Modules Toggle (Bento Grid selector)
  const [activeModule, setActiveModule] = useState<string>("disease");

  // Notifications drawer state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Handle Firebase user lifecycle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Pull extra profile fields from Firestore
        try {
          const profileDoc = await getDoc(doc(db, "users", user.uid)).catch((err) => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          });
          if (profileDoc && profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            setProfile(data);
            setLanguage(data.language);
          } else {
            // Document does not exist yet (e.g. initial Google login)
            const fallbackProfile: UserProfile = {
              uid: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Farmer Friend",
              email: user.email || "",
              phone: user.phoneNumber || "",
              language: "pa",
              role: "farmer",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", user.uid), fallbackProfile).catch((err) => {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
            });
            setProfile(fallbackProfile);
          }
        } catch (e) {
          console.error("Profile synchronization error: ", e);
        }
      } else {
        setCurrentUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync profile dynamically to Supabase if it changes
  useEffect(() => {
    if (profile) {
      try {
        syncProfileToSupabase(profile);
      } catch (e) {
        console.warn("Supabase profile sync bypassed:", e);
      }
    }
  }, [profile]);

  // Listen to global push advisories in real-time from Firestore
  useEffect(() => {
    if (currentUser && !currentUser.uid?.startsWith("phone_") && auth.currentUser) {
      const q = query(
        collection(db, "notifications"),
        where("userId", "in", ["all", currentUser.uid])
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const items: NotificationItem[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as NotificationItem);
        });
        // Sort newest first
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setNotifications(items);
      }, (err) => {
        console.error("Notifications socket error:", err);
        try {
          handleFirestoreError(err, OperationType.GET, "notifications");
        } catch (_) {}
      });

      return () => unsub();
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  // Handle Google Login / Register
  const handleGoogleAuth = async () => {
    setAuthError("");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const user = cred.user;
      
      // Determine if profile exists in database
      const profileDoc = await getDoc(doc(db, "users", user.uid)).catch((err) => {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      });
      if (profileDoc && !profileDoc.exists()) {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || "Kisan Friend",
          email: user.email || "",
          phone: "",
          language,
          role: authRole, // Maps the chosen startup role from selector
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", user.uid), newProfile).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        });
        setProfile(newProfile);
      }
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  // Handle Email SignUp / Login
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    if (!authEmail || !authPassword) {
      setAuthError("Please fill in email and password credentials.");
      return;
    }

    try {
      if (isSignUp) {
        if (!authFullName) {
          setAuthError("Please input your full legal name.");
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const user = cred.user;
        const newProfile: UserProfile = {
          uid: user.uid,
          name: authFullName,
          email: authEmail,
          phone: authPhone,
          language,
          role: authRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, "users", user.uid), newProfile).catch((err) => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        });
        setProfile(newProfile);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  // Simulated OTP sender to allow full testing coverage
  const handleSendOtp = () => {
    if (!authPhone) {
      setAuthError("Please specify a valid mobile phone number.");
      return;
    }
    const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(simulatedCode);
    setOtpSent(true);
    setAuthError("");
    alert(`[Simulated Government OTP Gateway] Verification Code Sent to ${authPhone}: ${simulatedCode}`);
  };

  const handleVerifyOtp = async () => {
    if (userOtpInput === otpCode) {
      setAuthError("");
      const mockUid = "phone_" + Date.now();
      const mockProfile: UserProfile = {
        uid: mockUid,
        name: authFullName || "Kisan Mobile Friend",
        email: "",
        phone: authPhone,
        language,
        role: authRole,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Setup mock firebase authentication state
      setCurrentUser({
        uid: mockUid,
        email: "",
        displayName: mockProfile.name,
        phoneNumber: authPhone
      });
      setProfile(mockProfile);
      setOtpSent(false);
      setOtpCode("");
      setUserOtpInput("");
    } else {
      setAuthError("Invalid mobile verification OTP code. Try again.");
    }
  };

  const handleLanguageToggle = async (lang: LanguageCode) => {
    setLanguage(lang);
    if (currentUser && profile) {
      const updatedProfile = { ...profile, language: lang, updatedAt: new Date().toISOString() };
      setProfile(updatedProfile);
      try {
        await setDoc(doc(db, "users", currentUser.uid), updatedProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
      }
    }
  };

  const handleLogout = async () => {
    if (currentUser?.uid?.startsWith("phone_")) {
      setCurrentUser(null);
      setProfile(null);
    } else {
      await signOut(auth);
    }
    setActiveModule("disease");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-700 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 mt-4">Initializing Har Kisan Support Systems...</p>
      </div>
    );
  }

  // Render Login state if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-emerald-50 via-white to-emerald-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Dynamic Glowing background nodes */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-1 h-24 w-24 rounded-full flex items-center justify-center shadow-xl border-2 border-emerald-500 overflow-hidden transform hover:scale-105 transition-all duration-300">
              <img
                src={kisanLogo}
                alt="Government of Punjab Agriculture Department Logo"
                className="w-full h-full object-contain rounded-full"
                referrerPolicy="no-referrer"
                id="login-punjab-logo"
              />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-905 tracking-tight">
            {UI_TRANSLATIONS[language].title}
          </h2>
          <p className="mt-1.5 text-xs uppercase font-extrabold text-emerald-700 tracking-widest leading-relaxed">
            {UI_TRANSLATIONS[language].subtitle}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
          <div className="bg-white/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl border border-emerald-100/50 space-y-6">
            
            {/* Quick role toggle on the login page */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Farming Profile / Portal Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["farmer", "officer", "admin"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAuthRole(r)}
                    className={`py-2 border text-center font-bold rounded-xl text-xs transition-all cursor-pointer ${
                      authRole === r 
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-md" 
                        : "bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-605"
                    }`}
                  >
                    {r === "farmer" ? "Farmer" : r === "officer" ? "Govt Officer" : "Admin"}
                  </button>
                ))}
              </div>
            </div>

            {/* Error alerts */}
            {authError && (
              <div className="bg-red-50 text-red-650 border border-red-150 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
                ⚠️ {authError}
              </div>
            )}

            {/* Email Form */}
            {!otpSent ? (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="e.g. Gurmail Singh"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. kisan@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Access Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="6+ digit password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone (Emergency OTP)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={authPhone}
                        onChange={(e) => setAuthPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-650 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  {isSignUp ? "Create Account (ਰਜਿਸਟਰ ਕਰੋ)" : "Sign In Securely (ਪ੍ਰਵੇਸ਼ ਕਰੋ)"}
                </button>
              </form>
            ) : (
              /* Phone OTP verifying code sheet */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-70 block mb-1">Input 6-digit Validation OTP Code</label>
                  <input
                    type="text"
                    value={userOtpInput}
                    onChange={(e) => setUserOtpInput(e.target.value)}
                    placeholder="Enter code"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-extrabold"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOtpSent(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-655 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Confirm OTP
                  </button>
                </div>
              </div>
            )}

            {/* Phone OTP Simulation Trigger */}
            {!isSignUp && !otpSent && (
              <div className="border-t border-slate-150 pt-4 text-center">
                <span className="text-[10px] text-slate-450 uppercase font-bold tracking-widest block mb-2">
                  Or sign in via OTP
                </span>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="Mobile number for OTP"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Get OTP
                  </button>
                </div>
              </div>
            )}

            {/* Google sign-in */}
            <div className="border-t border-slate-150 pt-4">
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-2.5 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-slate-705"
              >
                {/* Embedded beautiful clean Google G icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.2-5.136 4.2-3.429 0-6.216-2.787-6.216-6.215 0-3.43 2.787-6.217 6.216-6.217 1.543 0 2.974.566 4.07 1.49l3.155-3.154C19.185 2.68 15.922 1.5 12.24 1.5 6.315 1.5 1.5 6.315 1.5 12.24s4.815 10.74 10.74 10.74c5.903 0 10.74-4.814 10.74-10.74a10.4 10.4 0 0 0-.24-2.24H12.24z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Toggle Sign-In/Sign-Up Mode Link */}
            <div className="text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError("");
                }}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-550 transition-colors"
              >
                {isSignUp 
                  ? "Already have an account? Sign In" 
                  : "New farmer? Click here to Register / Create Account"}
              </button>
            </div>

            {/* Quick Language Toggle on Login Area */}
            <div className="border-t border-slate-150 pt-4 flex justify-center gap-2">
              <button onClick={() => getLangSelector("pa")} className={`px-2 py-1 text-[10px] font-bold rounded ${language === "pa" ? "bg-emerald-100 text-emerald-805" : "text-slate-400"}`}>ਪੰਜਾਬੀ</button>
              <button onClick={() => getLangSelector("hi")} className={`px-2 py-1 text-[10px] font-bold rounded ${language === "hi" ? "bg-emerald-100 text-emerald-805" : "text-slate-400"}`}>हिन्दी</button>
              <button onClick={() => getLangSelector("en")} className={`px-2 py-1 text-[10px] font-bold rounded ${language === "en" ? "bg-emerald-100 text-emerald-805" : "text-slate-400"}`}>English</button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Master Dashboard layout if logged-in
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased overflow-x-hidden pb-12 relative">
      {/* Top Banner overlay decorative gradients */}
      <div className="absolute top-0 inset-x-0 h-[280px] bg-gradient-to-b from-emerald-800 via-emerald-950 to-slate-50 pointer-events-none"></div>
      
      {/* Navigation Header */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white p-0.5 h-12 w-12 rounded-full flex items-center justify-center shadow-md border-2 border-emerald-400 overflow-hidden">
            <img
              src={kisanLogo}
              alt="Government of Punjab Agriculture Department Logo"
              className="w-full h-full object-contain rounded-full"
              referrerPolicy="no-referrer"
              id="header-punjab-logo"
            />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight leading-none">
              {UI_TRANSLATIONS[language].title}
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-350 pt-0.5">
              {UI_TRANSLATIONS[language].subtitle}
            </p>
          </div>
        </div>

        {/* Action center nodes */}
        <div className="flex items-center gap-3">
          {/* Bell Icon Notification center */}
          <button
            onClick={() => setShowNotifDrawer(true)}
            className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition-all relative cursor-pointer"
            title="Welfare Advisories Notifications"
          >
            <Bell className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-emerald-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Profile pill layout */}
          <div className="hidden sm:flex items-center gap-2 bg-white/10 p-1.5 pr-3.5 border border-white/15 rounded-xl text-xs font-semibold backdrop-blur-sm">
            <div className="bg-emerald-705 p-1.5 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="font-bold leading-none">{profile?.name || "Kisan Friend"}</div>
              <span className="text-[8px] uppercase font-bold text-emerald-350 block pt-0.5">
                Role: {profile?.role || "Farmer"}
              </span>
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="p-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-md"
            title="Log out session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Sizing Area container */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 gap-6 flex-1">
        
        {/* Dynamic header row welcome state */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/10 backdrop-blur-md border border-white/15 p-5 rounded-3xl text-white shadow-xl">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 leading-none">
              <span>{UI_TRANSLATIONS[language].welcomeBack}</span>
              <span className="text-amber-300">{profile?.name || "Kisan Mitra"}</span>
            </h2>
            <p className="text-xs text-emerald-250 italic font-semibold mt-1">
              "Indian agrotech monitoring hubs are fully active over your district coordinates."
            </p>
          </div>

          {/* Language selector in-app */}
          <div className="flex items-center gap-1.5 bg-emerald-950/40 p-1.5 rounded-2xl border border-emerald-800 self-start md:self-auto shrink-0">
            <button
              onClick={() => handleLanguageToggle("pa")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                language === "pa" ? "bg-emerald-700 text-white shadow-md font-bold" : "text-emerald-200 hover:text-white"
              }`}
            >
              ਪੰਜਾਬੀ
            </button>
            <button
              onClick={() => handleLanguageToggle("hi")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                language === "hi" ? "bg-emerald-700 text-white shadow-md font-bold" : "text-emerald-200 hover:text-white"
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => handleLanguageToggle("en")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                language === "en" ? "bg-emerald-700 text-white shadow-md font-bold" : "text-emerald-200 hover:text-white"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Metereological Dashboard Row */}
        <WeatherWidget language={language} />

        {/* Navigation Tabs bento rail */}
        <div className="bg-white border border-slate-150 p-2 rounded-2xl flex flex-wrap gap-1 md:gap-1.5 relative select-none">
          {/* Diagnostic tab */}
          <button
            onClick={() => setActiveModule("disease")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "disease"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Disease Detector</span>
          </button>

          {/* Soil tab */}
          <button
            onClick={() => setActiveModule("soil")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "soil"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Soil Analyzer</span>
          </button>

          {/* Mandi tab */}
          <button
            onClick={() => setActiveModule("mandi")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "mandi"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Live Mandi</span>
          </button>

          {/* Schemes tab */}
          <button
            onClick={() => setActiveModule("schemes")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "schemes"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Govt Schemes</span>
          </button>

          {/* Fertilizer Dose planner */}
          <button
            onClick={() => setActiveModule("fertilizer")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "fertilizer"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Fertilizer bags</span>
          </button>

          {/* Water tab */}
          <button
            onClick={() => setActiveModule("water")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "water"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Droplets className="w-4 h-4 hover:animate-bounce" />
            <span>Irrigation Guide</span>
          </button>

          {/* Pest Alert tab */}
          <button
            onClick={() => setActiveModule("pest")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeModule === "pest"
                ? "bg-emerald-700 text-white shadow-md font-extrabold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Pest Outbreak warnings</span>
          </button>

          {/* Supabase Integration tab */}
          <button
            onClick={() => setActiveModule("supabase")}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-purple-100 ${
              activeModule === "supabase"
                ? "bg-purple-950 text-white shadow-md font-extrabold"
                : "bg-purple-50 hover:bg-purple-100 text-purple-900"
            }`}
          >
            <Database className="w-4 h-4 text-purple-600" />
            <span>Supabase Cloud</span>
          </button>

          {/* Officer Tab (Only Authorization check!) */}
          {(profile?.role === "officer" || profile?.role === "admin") && (
            <button
              onClick={() => setActiveModule("officer")}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200/50 ${
                activeModule === "officer"
                  ? "bg-emerald-950 text-white shadow-md font-extrabold"
                  : "bg-emerald-50 text-emerald-805 hover:bg-emerald-100/60"
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-650" />
              <span>Officer Hub</span>
            </button>
          )}
        </div>

        {/* Master active viewport card slots */}
        <div className="min-h-[450px]">
          {activeModule === "disease" && <CropDiseaseCard language={language} userId={currentUser.uid} />}
          {activeModule === "soil" && <SoilAnalyzer language={language} userId={currentUser.uid} />}
          {activeModule === "mandi" && <LiveMandi language={language} />}
          {activeModule === "schemes" && <GovSchemes language={language} />}
          {activeModule === "fertilizer" && <FertilizerCalculator language={language} />}
          {activeModule === "water" && <WaterManager language={language} />}
          {activeModule === "pest" && <PestAlertNetwork language={language} userId={currentUser.uid} />}
          {activeModule === "supabase" && (
            <SupabasePortal language={language} userId={currentUser.uid} userProfile={profile} />
          )}
          {activeModule === "officer" && (profile?.role === "officer" || profile?.role === "admin") && (
            <OfficerDashboard language={language} userId={currentUser.uid} />
          )}
        </div>

      </main>

      {/* Floating Sparkle AI Expert Conversational Chat Widget */}
      <ChatAssistant language={language} userId={currentUser.uid} />

      {/* Slide-out Welfare Advisory Notifications Drawer */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" onClick={() => setShowNotifDrawer(false)}></div>
          
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-emerald-100 animation-slide-in">
              {/* Header */}
              <div className="p-4 bg-emerald-800 text-white flex items-center justify-between border-b border-emerald-900 shadow-md">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-sm">Advisories & High Alarms</h3>
                </div>

                <button 
                  onClick={() => setShowNotifDrawer(false)}
                  className="p-1 px-2 hover:bg-emerald-650 border border-emerald-600 rounded-lg text-xs font-semibold cursor-pointer text-emerald-100"
                >
                  Close
                </button>
              </div>

              {/* Items listing */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-emerald-50/10 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 space-y-3 text-slate-400 font-semibold select-none">
                    <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 animate-pulse" />
                    <p className="text-xs">No active weather warnings or pest alerts reported for your coordinates today.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
                      {/* Alert type ticker */}
                      <span className={`absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-lg text-[8px] uppercase font-extrabold text-white ${
                        notif.type === "alert" ? "bg-red-500" : notif.type === "weather" ? "bg-amber-500" : "bg-emerald-600"
                      }`}>
                        {notif.type}
                      </span>

                      <h4 className="text-xs font-extrabold text-slate-805 pr-8 leading-tight">
                        {notif.title}
                      </h4>
                      <div className="text-[9px] text-slate-400 font-bold font-mono pt-0.5">{new Date(notif.createdAt).toLocaleDateString()}</div>
                      
                      <p className="text-xs text-slate-650 pt-2.5 leading-relaxed font-semibold">
                        {notif.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Selector handlers helper
  function getLangSelector(code: LanguageCode) {
    setLanguage(code);
  }

  function setPhoneInput(val: string) {
    setAuthPhone(val);
  }
}
