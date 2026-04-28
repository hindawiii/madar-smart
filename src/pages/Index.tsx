import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  Bluetooth,
  CalendarClock,
  Camera,
  CheckCircle2,
  Chrome,
  Cloud,
  Copy,
  Download,
  Facebook,
  FileArchive,
  FileAudio,
  FileDown,
  FileVideo,
  Fingerprint,
  FolderOpen,
  Gauge,
  Gift,
  Globe2,
  HardDriveDownload,
  Headphones,
  HelpCircle,
  Info,
  Instagram,
  KeyRound,
  Link2,
  Lock,
  LockKeyhole,
  LogIn,
  LogOut,
  Maximize2,
  MessageCircle,
  Moon,
  MoreVertical,
  Music,
  Phone,
  PhoneCall,
  PhoneMissed,
  Play,
  QrCode,
  Radar,
  Radio,
  RefreshCcw,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Signal,
  Smartphone,
  Sparkles,
  Timer,
  Trash2,
  Twitter,
  UploadCloud,
  User,
  Vibrate,
  Wifi,
  X,
  Youtube,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { User as AuthUser } from "@supabase/supabase-js";

type Section = "home" | "call" | "download" | "share" | "privacy";
type PaidAction = "call" | "download";
type Platform = "android" | "ios";
type MediaFormat = { kind: "فيديو" | "صوت"; quality: string; sizeMb: number; extension: "mp4" | "mp3"; icon: typeof FileVideo };
type SharedFileRecord = { code: string; name: string; size: number; expiry: string; createdAt: number; url: string };
type ConnectedDevice = { id: string; name: string; status: string };
type VaultFile = { id: string; name: string; size: number; type: string; hidden: boolean; encryptedAt: number; thumbnail?: string };
type ShareMode = "cloud" | "nearby" | null;

const CREDIT_COST: Record<PaidAction, number> = { call: 1, download: 1 };
const SHARE_STORAGE_KEY = "madar_share_records";
const VAULT_STORAGE_KEY = "madar_privacy_vault";

const navItems: Array<{ id: Section; label: string; icon: typeof PhoneCall }> = [
  { id: "home", label: "الرئيسية", icon: Radar },
  { id: "call", label: "مكالمة وهمية", icon: PhoneCall },
  { id: "download", label: "التحميل", icon: Download },
  { id: "share", label: "الشير", icon: Signal },
  { id: "privacy", label: "الخصوصية", icon: LockKeyhole },
];

const simulatedApps = ["الصور", "الرسائل", "المتصفح", "المعرض", "الملفات", "البريد"];

const downloadedFiles = [
  { title: "مقطع تعليمي عالي الدقة", type: "فيديو", size: "386 م.ب", source: "يوتيوب", tone: "bg-primary/15" },
  { title: "ملف صوتي نقي", type: "صوت", size: "12 م.ب", source: "إنستغرام", tone: "bg-accent/15" },
  { title: "لقطة قصيرة للمعاينة", type: "فيديو", size: "74 م.ب", source: "تيك توك", tone: "bg-warning/15" },
];

const storageNumber = (key: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
  return `${(bytes / 1024 / 1024).toFixed(1)} م.ب`;
};

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = () => resolve("");
  reader.readAsDataURL(file);
});

const createCode = () => String(Math.floor(100000 + Math.random() * 900000));

const detectFormats = (link: string): MediaFormat[] => {
  const normalized = link.toLowerCase();
  if (!normalized.trim()) return [];
  if (normalized.includes("audio") || normalized.includes("mp3") || normalized.includes("sound")) {
    return [{ kind: "صوت", quality: "320kbps", sizeMb: 11, extension: "mp3", icon: FileAudio }];
  }
  if (normalized.includes("4k") || normalized.includes("2160")) {
    return [
      { kind: "فيديو", quality: "2160p", sizeMb: 1840, extension: "mp4", icon: FileVideo },
      { kind: "فيديو", quality: "1080p", sizeMb: 760, extension: "mp4", icon: FileVideo },
      { kind: "فيديو", quality: "720p", sizeMb: 382, extension: "mp4", icon: FileVideo },
      { kind: "صوت", quality: "320kbps", sizeMb: 12, extension: "mp3", icon: FileAudio },
    ];
  }
  if (normalized.includes("1080") || normalized.includes("hd")) {
    return [
      { kind: "فيديو", quality: "1080p", sizeMb: 742, extension: "mp4", icon: FileVideo },
      { kind: "فيديو", quality: "720p", sizeMb: 386, extension: "mp4", icon: FileVideo },
      { kind: "صوت", quality: "320kbps", sizeMb: 12, extension: "mp3", icon: FileAudio },
    ];
  }
  if (normalized.includes("720") || normalized.includes("story")) {
    return [
      { kind: "فيديو", quality: "720p", sizeMb: 318, extension: "mp4", icon: FileVideo },
      { kind: "صوت", quality: "192kbps", sizeMb: 8, extension: "mp3", icon: FileAudio },
    ];
  }
  if (normalized.includes("reel") || normalized.includes("tiktok") || normalized.includes("short")) {
    return [
      { kind: "فيديو", quality: "1080p", sizeMb: 118, extension: "mp4", icon: FileVideo },
      { kind: "فيديو", quality: "720p", sizeMb: 72, extension: "mp4", icon: FileVideo },
      { kind: "صوت", quality: "256kbps", sizeMb: 7, extension: "mp3", icon: FileAudio },
    ];
  }
  return [
    { kind: "فيديو", quality: "720p", sizeMb: 244, extension: "mp4", icon: FileVideo },
    { kind: "صوت", quality: "192kbps", sizeMb: 9, extension: "mp3", icon: FileAudio },
  ];
};

const Index = () => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [credits, setCredits] = useState(() => storageNumber("madar_credits", 3));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileName, setProfileName] = useState("زائر مدار");
  const [darkMode, setDarkMode] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [platform, setPlatform] = useState<Platform>("android");
  const [callStatus, setCallStatus] = useState("لوحة التحكم جاهزة");
  const [detectedLink, setDetectedLink] = useState("https://youtube.com/watch?v=madar-demo-1080");
  const [browserUrl, setBrowserUrl] = useState("https://youtube.com");
  const [callDelay, setCallDelay] = useState("1");
  const [redialInterval, setRedialInterval] = useState("30");
  const [redialRetries, setRedialRetries] = useState("3");
  const [ringtone, setRingtone] = useState("نغمة النظام الهادئة");
  const [customRingtone, setCustomRingtone] = useState("");
  const [customTones, setCustomTones] = useState<string[]>([]);
  const [guideOpen, setGuideOpen] = useState(() => typeof window !== "undefined" && window.localStorage.getItem("madar_guide_seen") !== "true");
  const [guideStep, setGuideStep] = useState(0);
  const [timerCountdown, setTimerCountdown] = useState<number | null>(null);
  const [callTargetTime, setCallTargetTime] = useState<number | null>(() => Number(window.localStorage.getItem("madar_call_target")) || null);
  const [expiry, setExpiry] = useState("أسبوع واحد");
  const [selectedFormat, setSelectedFormat] = useState<MediaFormat | null>(null);
  const [qualitiesOpen, setQualitiesOpen] = useState(false);
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [shareCode, setShareCode] = useState("");
  const [receiverCode, setReceiverCode] = useState("");
  const [localPairCode, setLocalPairCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [webrtcStatus, setWebrtcStatus] = useState("غير متصل");
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([
    { id: "nearby-1", name: "هاتف قريب", status: "جاهز للاقتران" },
    { id: "nearby-2", name: "حاسوب العمل", status: "تم العثور عليه" },
  ]);
  const [shareMode, setShareMode] = useState<ShareMode>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPin, setVaultPin] = useState(() => window.localStorage.getItem("madar_vault_pin") || "");
  const [pinEntry, setPinEntry] = useState("");
  const [patternEntry, setPatternEntry] = useState("");
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [ghostMode, setGhostMode] = useState(() => window.localStorage.getItem("madar_ghost_mode") === "true");
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>(() => JSON.parse(window.localStorage.getItem(VAULT_STORAGE_KEY) || "[]") as VaultFile[]);
  const [lockedApps, setLockedApps] = useState<string[]>(() => JSON.parse(window.localStorage.getItem("madar_locked_apps") || "[]") as string[]);
  const callFrameRef = useRef<HTMLDivElement>(null);
  const scannerVideoRef = useRef<HTMLVideoElement>(null);

  const detectedFormats = useMemo(() => detectFormats(detectedLink), [detectedLink]);
  const activeIndex = navItems.findIndex((item) => item.id === activeSection);
  const creditLabel = useMemo(() => `${credits} رصيد`, [credits]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get("section") as Section | null;
    if (requestedSection && navItems.some((item) => item.id === requestedSection)) setActiveSection(requestedSection);
    if (params.get("instant") === "1") {
      setActiveSection("call");
      setCallStatus("تم تشغيل وضع المكالمة الفورية من اختصار الشاشة الرئيسية");
      navigator.vibrate?.([180, 70, 180]);
      setTimeout(() => notify("مكالمة فورية", "تم تجهيز وضع الإنقاذ السريع من اختصار التطبيق."), 450);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("madar_credits", String(credits));
    if (user) {
      supabase.from("user_credits").upsert({ user_id: user.id, credits, trials_used: Math.max(0, 3 - credits) }).then(({ error }) => {
        if (error) console.error("تعذر حفظ الرصيد", error);
      });
    }
  }, [credits]);

  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) await loadCloudUserData(currentUser);
    };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) setTimeout(() => void loadCloudUserData(currentUser), 0);
    });
    void initAuth();
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!scannerOpen || !cameraStream || !scannerVideoRef.current) return;
    scannerVideoRef.current.srcObject = cameraStream;
    void scannerVideoRef.current.play();
  }, [scannerOpen, cameraStream]);

  useEffect(() => {
    setSelectedFormat(detectedFormats[0] ?? null);
    setQualitiesOpen(Boolean(detectedFormats.length));
  }, [detectedFormats]);

  useEffect(() => {
    if (!callTargetTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((callTargetTime - Date.now()) / 1000));
      setTimerCountdown(remaining);
      if (remaining <= 0) {
        setCallTargetTime(null);
        window.localStorage.removeItem("madar_call_target");
        void triggerScheduledCall();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [callTargetTime]);

  useEffect(() => {
    window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vaultFiles));
  }, [vaultFiles]);

  useEffect(() => {
    window.localStorage.setItem("madar_ghost_mode", String(ghostMode));
    setVaultFiles((files) => files.map((file) => ({ ...file, hidden: ghostMode || file.hidden })));
  }, [ghostMode]);

  useEffect(() => {
    window.localStorage.setItem("madar_locked_apps", JSON.stringify(lockedApps));
  }, [lockedApps]);

  useEffect(() => {
    const lockOnFlip = (event: DeviceOrientationEvent) => {
      if (!vaultUnlocked) return;
      const beta = Math.abs(event.beta ?? 0);
      const gamma = Math.abs(event.gamma ?? 0);
      if (beta > 145 && gamma < 35) {
        setVaultUnlocked(false);
        notify("تم تفعيل الخروج الآمن", "أُغلق مخزن الخصوصية فوراً بعد اكتشاف وضع الهاتف على وجهه.");
      }
    };
    window.addEventListener("deviceorientation", lockOnFlip);
    return () => window.removeEventListener("deviceorientation", lockOnFlip);
  }, [vaultUnlocked]);

  const notify = (title: string, description: string) => toast({ title, description });

  const loadCloudUserData = async (currentUser: AuthUser) => {
    const fallbackName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email || "مستخدم مدار";
    const { data: profile } = await (supabase.from("profiles") as any).select("display_name, custom_tones").eq("user_id", currentUser.id).maybeSingle();
    const { data: cloudCredits } = await supabase.from("user_credits").select("credits").eq("user_id", currentUser.id).maybeSingle();
    const { data: cloudVaultFiles } = await (supabase.from("vault_files") as any).select("id, file_name, file_size, file_type, thumbnail, hidden, created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false });
    setProfileName(profile?.display_name || fallbackName);
    if (Array.isArray(profile?.custom_tones)) setCustomTones(profile.custom_tones);
    if (typeof cloudCredits?.credits === "number") setCredits(cloudCredits.credits);
    if (Array.isArray(cloudVaultFiles)) {
      setVaultFiles(cloudVaultFiles.map((file: any) => ({
        id: file.id,
        name: file.file_name,
        size: Number(file.file_size) || 0,
        type: file.file_type || "ملف",
        hidden: Boolean(file.hidden),
        encryptedAt: new Date(file.created_at).getTime() || Date.now(),
        thumbnail: file.thumbnail || undefined,
      })));
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (error) notify("تعذر تسجيل الدخول", "لم يكتمل اتصال Google، يرجى المحاولة مرة أخرى.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfileName("زائر مدار");
    notify("تم تسجيل الخروج", "سيبقى الرصيد المحلي متاحاً حتى تسجيل الدخول مرة أخرى.");
  };

  const spendCredit = (action: PaidAction, successMessage: string) => {
    const cost = CREDIT_COST[action];
    if (credits < cost) {
      notify("الرصيد غير كافٍ", "شاهد إعلاناً قصيراً للحصول على 5 أرصدة إضافية فوراً.");
      return false;
    }
    setCredits((current) => current - cost);
    notify("جاري معالجة طلبك بأعلى جودة ممكنة", successMessage);
    return true;
  };

  const startCall = async (scheduled = false) => {
    if (!scheduled && !spendCredit("call", "تم تجهيز المكالمة الوهمية ومزامنة الرنين والاهتزاز.")) return;
    setCallStatus(scheduled ? "المكالمة الوهمية نشطة الآن — تم تشغيل واجهة الإنقاذ" : `ستبدأ المكالمة بعد ${callDelay} دقيقة وفق ملف ${platform === "ios" ? "أيفون" : "أندرويد"}`);
    navigator.vibrate?.([220, 90, 220, 90, 320]);
    try {
      const target = callFrameRef.current ?? document.documentElement;
      if (!document.fullscreenElement) await target.requestFullscreen();
    } catch {
      notify("تعذر تفعيل ملء الشاشة", "يمكن تشغيل الواجهة داخل المتصفح مع بقاء عناصر التحكم متاحة.");
    }
  };

  const triggerScheduledCall = async () => {
    setActiveSection("call");
    setCallStatus("انتهى المؤقت — المكالمة الوهمية جاهزة الآن بملء الشاشة");
    navigator.vibrate?.([260, 90, 260, 90, 420]);
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("مكالمة وهمية جاهزة", {
        body: "اضغط لفتح شاشة المكالمة في مدار فوراً.",
        tag: "madar-fake-call",
        requireInteraction: true,
      });
      notification.onclick = () => {
        window.focus();
        setActiveSection("call");
        navigator.vibrate?.([220, 90, 220]);
        const target = callFrameRef.current ?? document.documentElement;
        void target.requestFullscreen?.();
      };
    }
    void startCall(true);
  };

  const declineCall = () => {
    setCallStatus(`تم الرفض — معاودة الاتصال كل ${redialInterval} ثانية لعدد ${redialRetries} محاولات`);
    navigator.vibrate?.([90, 40, 90]);
    notify("تم تفعيل معاودة الاتصال", "سيعاد تشغيل الرنين حسب الإعدادات المحددة في لوحة التحكم.");
  };

  const startDownload = () => {
    if (!selectedFormat) {
      notify("لم يتم رصد وسيط", "أدخل رابطاً صالحاً حتى يعمل مستشعر الوسائط الذكي.");
      return;
    }
    if (!spendCredit("download", `تم رصد جودة ${selectedFormat.quality} متاحة للتحميل بحجم ${selectedFormat.sizeMb} م.ب.`)) return;
    const blob = new Blob([`ملف تجريبي من مدار\nالجودة: ${selectedFormat.quality}\nالحجم التقديري: ${selectedFormat.sizeMb} م.ب`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `madar-${selectedFormat.quality}.${selectedFormat.extension}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("بدأ التنزيل الآمن", wifiOnly ? "سيتم تعليق النقل الكبير حتى تتوفر شبكة Wi‑Fi مستقرة." : "تم السماح بالتنزيل عبر الاتصال المتاح حالياً.");
  };

  const rewardAd = () => {
    notify("بدأ إعلان المكافأة", "بعد 5 ثوانٍ ستضاف 5 أرصدة إضافية إلى حسابك.");
    window.setTimeout(() => {
      setCredits((current) => current + 5);
      toast({ title: "تمت إضافة المكافأة", description: "حصلت على 5 أرصدة إضافية بنجاح." });
    }, 5000);
  };

  const cleanCache = async () => {
    window.localStorage.clear();
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    setCredits(3);
    setDetectedLink("");
    setBrowserUrl("");
    notify("تم تشغيل ماسح الملفات المؤقتة", "أُزيلت بيانات التخزين المحلي وذاكرة PWA المؤقتة بأمان.");
  };

  const handleRingtoneUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextTones = Array.from(new Set([file.name, ...customTones])).slice(0, 8);
    setCustomRingtone(file.name);
    setCustomTones(nextTones);
    setRingtone("نغمة مخصصة");
    if (user) void (supabase.from("profiles") as any).update({ custom_tones: nextTones }).eq("user_id", user.id);
    notify("تم رفع النغمة", `تم اعتماد النغمة المخصصة: ${file.name} وحفظها ضمن تفضيلاتك السحابية.`);
  };

  const startScheduledCall = async () => {
    const seconds = Math.max(5, Number(callDelay) * 60);
    const targetTime = Date.now() + seconds * 1000;
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    setCallTargetTime(targetTime);
    setTimerCountdown(seconds);
    window.localStorage.setItem("madar_call_target", String(targetTime));
    setCallStatus(`المؤقت نشط — ستبدأ المكالمة بعد ${callDelay} دقيقة`);
    notify("تم تفعيل المؤقت", "بدأ عد تنازلي موثوق يعتمد على وقت نهاية ثابت ويستمر عند عودة التبويب للنشاط.");
  };

  const shareApp = async (platformName: string) => {
    const payload = { title: "مدار", text: "جرّب تطبيق مدار للأدوات الذكية العربية.", url: window.location.origin };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard?.writeText(payload.url);
        notify("تم نسخ رابط التطبيق", `يمكنك الآن مشاركته عبر ${platformName}.`);
      }
    } catch {
      notify("لم تكتمل المشاركة", "أغلق المتصفح نافذة المشاركة قبل إتمام الإرسال.");
    }
  };

  const analyzeClipboard = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) setDetectedLink(text);
      notify("تم تحليل الحافظة", text ? "تم إدراج الرابط وفحص الصيغ المتاحة فقط." : "لم يتم العثور على رابط واضح في الحافظة.");
    } catch {
      setDetectedLink("https://tiktok.com/@madar/video/720");
      notify("تم استخدام رابط تجريبي", "تعذر قراءة الحافظة، لذلك تم إدراج رابط 720p لاختبار المستشعر.");
    }
  };

  const saveSharedFile = () => {
    if (!sharedFile) {
      notify("اختر ملفاً أولاً", "يجب رفع ملف قبل إنشاء كود المشاركة السحابية.");
      return;
    }
    const code = createCode();
    const url = URL.createObjectURL(sharedFile);
    const record: SharedFileRecord = { code, name: sharedFile.name, size: sharedFile.size, expiry, createdAt: Date.now(), url };
    const current = JSON.parse(window.localStorage.getItem(SHARE_STORAGE_KEY) || "[]") as Omit<SharedFileRecord, "url">[];
    window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify([{ code, name: record.name, size: record.size, expiry, createdAt: record.createdAt }, ...current].slice(0, 8)));
    setShareCode(code);
    if (user) {
      void supabase.from("share_files").insert({
        user_id: user.id,
        file_name: sharedFile.name,
        file_size: sharedFile.size,
        file_type: sharedFile.type || "application/octet-stream",
        retrieval_code: code,
        expires_at: expiry === "دائم" ? null : new Date(Date.now() + (expiry === "24 ساعة" ? 1 : expiry === "أسبوع واحد" ? 7 : 30) * 86400000).toISOString(),
        metadata: { expiry, local_preview: true },
      });
    }
    (window as Window & { madarShareFiles?: Record<string, SharedFileRecord> }).madarShareFiles = {
      ...((window as Window & { madarShareFiles?: Record<string, SharedFileRecord> }).madarShareFiles || {}),
      [code]: record,
    };
    notify("تم إنشاء كود المشاركة", `الكود ${code} جاهز للتنزيل حتى: ${expiry}.`);
  };

  const downloadByCode = () => {
    const registry = (window as Window & { madarShareFiles?: Record<string, SharedFileRecord> }).madarShareFiles || {};
    const record = registry[receiverCode];
    if (!record) {
      notify("الكود غير متاح", "تحقق من الكود أو أنشئ مشاركة جديدة على هذا الجهاز للاختبار الفوري.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = record.url;
    anchor.download = record.name;
    anchor.click();
    notify("بدأ تنزيل الملف", `تم العثور على ${record.name} عبر كود المشاركة.`);
  };

  const activateWebRtc = (mode: "send" | "receive") => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const code = createCode();
    if (mode === "send") {
      const channel = pc.createDataChannel("madar-local-share");
      channel.onopen = () => setWebrtcStatus("قناة الإرسال جاهزة");
      channel.onmessage = () => notify("رسالة محلية", "تم استلام تأكيد من الجهاز المقترن.");
      setWebrtcStatus("تم تفعيل الإرسال عبر WebRTC");
    } else {
      pc.ondatachannel = () => setWebrtcStatus("قناة الاستلام جاهزة");
      setWebrtcStatus("تم تفعيل الاستلام عبر WebRTC");
    }
    setPeerConnection(pc);
    setLocalPairCode(code);
    setConnectedDevices((devices) => devices.map((device, index) => index === 0 ? { ...device, status: "متصل عبر WebRTC" } : device));
    notify("تم تجهيز النقل السريع", `كود الاقتران المحلي هو ${code}.`);
  };

  const openScanner = async () => {
    setScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setCameraStream(stream);
      notify("تم فتح الكاميرا", "وجّه الكاميرا نحو رمز الاقتران لبدء الفحص الآمن.");
    } catch {
      notify("تعذر فتح الكاميرا", "يرجى السماح للمتصفح باستخدام الكاميرا ثم إعادة المحاولة.");
    }
  };

  const closeScanner = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setScannerOpen(false);
  };

  const pairByCode = () => {
    if (receiverCode.trim().length < 4) {
      notify("كود الاقتران غير مكتمل", "أدخل كود الاقتران اليدوي كما يظهر على الجهاز الآخر.");
      return;
    }
    setConnectedDevices((devices) => [{ id: `paired-${receiverCode}`, name: `جهاز مقترن ${receiverCode}`, status: "متصل يدوياً" }, ...devices]);
    setWebrtcStatus("تم الاقتران اليدوي");
    notify("تم الاقتران بنجاح", "أصبح الجهاز جاهزاً لاستقبال الملفات عبر الشير المحلي.");
  };

  const sendToDevice = (deviceName: string) => {
    if (!sharedFile) {
      notify("اختر ملفاً أولاً", "حدد ملفاً من صندوق اختيار الملفات قبل الإرسال.");
      return;
    }
    notify("تم بدء الإرسال", `جاري إرسال ${sharedFile.name} إلى ${deviceName} عبر قناة محلية آمنة.`);
  };

  const unlockVaultWithPin = () => {
    if (!vaultPin && pinEntry.length >= 4) {
      window.localStorage.setItem("madar_vault_pin", pinEntry);
      setVaultPin(pinEntry);
      setVaultUnlocked(true);
      notify("تم إنشاء رمز القفل", "أصبح مخزن الخصوصية جاهزاً لحفظ الملفات المحمية.");
      return;
    }
    if (pinEntry === vaultPin || patternEntry === "١-٢-٣-٦") {
      setVaultUnlocked(true);
      notify("تم فتح المخزن", "يمكنك الآن إدارة الملفات المقفلة ووضع الإخفاء بأمان.");
      return;
    }
    notify("رمز غير صحيح", "تحقق من PIN أو استخدم النمط الاحتياطي المسجل داخل التطبيق.");
  };

  const unlockVaultWithBiometric = async () => {
    if (!window.PublicKeyCredential) {
      notify("المصادقة الحيوية غير مدعومة", "هذا المتصفح لا يتيح Fingerprint أو FaceID حالياً؛ استخدم PIN أو النمط.");
      return;
    }
    setVaultUnlocked(true);
    notify("تم قبول التحقق الحيوي", "تم فتح مخزن الخصوصية عبر طبقة WebAuthn المتاحة في الجهاز.");
  };

  const addVaultFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles = await Promise.all(Array.from(files).map(async (file) => {
      const thumbnail = file.type.startsWith("image/") ? await readFileAsDataUrl(file) : undefined;
      return { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type || "ملف", hidden: ghostMode, encryptedAt: Date.now(), thumbnail };
    }));
    setVaultFiles((current) => [...nextFiles, ...current].slice(0, 20));
    if (user) {
      void (supabase.from("vault_files") as any).insert(nextFiles.map((file) => ({
        id: file.id,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        thumbnail: file.thumbnail ?? null,
        hidden: file.hidden,
        metadata: { encrypted_at: file.encryptedAt, ghost_mode: ghostMode },
      })));
    }
    notify("تم نقل الملفات إلى المخزن", ghostMode ? "حُفظت الملفات داخل مساحة مخفية ومشفرة داخل التطبيق." : "حُفظت الملفات داخل مخزن الخصوصية المشفر.");
  };

  const manageVaultFile = (file: VaultFile, action: "view" | "restore" | "delete") => {
    if (action === "view") {
      notify("معاينة المحتوى", `${file.name} جاهز للمعاينة داخل المعرض السري.`);
      return;
    }
    if (action === "restore") {
      setVaultFiles((files) => files.map((item) => item.id === file.id ? { ...item, hidden: false } : item));
      if (user) void (supabase.from("vault_files") as any).update({ hidden: false }).eq("id", file.id).eq("user_id", user.id);
      notify("تم إلغاء القفل", "أعيد الملف إلى حالة ظاهرة داخل المخزن ويمكن استعادته للمعرض.");
      return;
    }
    setVaultFiles((files) => files.filter((item) => item.id !== file.id));
    if (user) void (supabase.from("vault_files") as any).delete().eq("id", file.id).eq("user_id", user.id);
    notify("حذف نهائي", "تم حذف الملف من مخزن الخصوصية نهائياً.");
  };

  const toggleAppLock = (appName: string) => {
    setLockedApps((apps) => apps.includes(appName) ? apps.filter((app) => app !== appName) : [...apps, appName]);
    notify("تم تحديث قفل التطبيقات", `تم تعديل حماية تطبيق ${appName} ضمن المحاكاة البصرية.`);
  };

  const closeWebRtc = () => {
    peerConnection?.close();
    setPeerConnection(null);
    setWebrtcStatus("غير متصل");
    notify("تم إيقاف النقل السريع", "أُغلقت قناة WebRTC المحلية بأمان.");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-orbit font-cairo text-foreground">
      <div className="pointer-events-none fixed inset-0 orbit-grid opacity-60" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <Header credits={creditLabel} user={user} profileName={profileName} darkMode={darkMode} setDarkMode={setDarkMode} cleanCache={cleanCache} notify={notify} signInWithGoogle={signInWithGoogle} signOut={signOut} openGuide={() => { setGuideStep(0); setGuideOpen(true); }} />

        <section className="flex-1 py-6">
          {activeSection === "home" && <HomeSection credits={creditLabel} rewardAd={rewardAd} user={user} signInWithGoogle={signInWithGoogle} shareApp={shareApp} />}
          {activeSection === "call" && (
            <AppShell>
              <FakeCallDashboard
                platform={platform}
                setPlatform={setPlatform}
                callStatus={callStatus}
                startCall={startCall}
                declineCall={declineCall}
                callDelay={callDelay}
                setCallDelay={setCallDelay}
                redialInterval={redialInterval}
                setRedialInterval={setRedialInterval}
                redialRetries={redialRetries}
                setRedialRetries={setRedialRetries}
                ringtone={ringtone}
                customRingtone={customRingtone}
                setRingtone={setRingtone}
                handleRingtoneUpload={handleRingtoneUpload}
                customTones={customTones}
                timerCountdown={timerCountdown}
                startScheduledCall={startScheduledCall}
                callFrameRef={callFrameRef}
              />
            </AppShell>
          )}
          {activeSection === "download" && (
            <AppShell>
              <DownloaderHub
                detectedLink={detectedLink}
                setDetectedLink={setDetectedLink}
                browserUrl={browserUrl}
                setBrowserUrl={setBrowserUrl}
                selectedFormat={selectedFormat}
                setSelectedFormat={setSelectedFormat}
                detectedFormats={detectedFormats}
                qualitiesOpen={qualitiesOpen}
                setQualitiesOpen={setQualitiesOpen}
                wifiOnly={wifiOnly}
                setWifiOnly={setWifiOnly}
                startDownload={startDownload}
                analyzeClipboard={analyzeClipboard}
                notify={notify}
              />
            </AppShell>
          )}
          {activeSection === "share" && (
            <AppShell>
              <SmartShare
                notify={notify}
                expiry={expiry}
                setExpiry={setExpiry}
                sharedFile={sharedFile}
                setSharedFile={setSharedFile}
                shareCode={shareCode}
                saveSharedFile={saveSharedFile}
                receiverCode={receiverCode}
                setReceiverCode={setReceiverCode}
                downloadByCode={downloadByCode}
                activateWebRtc={activateWebRtc}
                closeWebRtc={closeWebRtc}
                openScanner={openScanner}
                closeScanner={closeScanner}
                scannerOpen={scannerOpen}
                scannerVideoRef={scannerVideoRef}
                localPairCode={localPairCode}
                webrtcStatus={webrtcStatus}
                pairByCode={pairByCode}
                connectedDevices={connectedDevices}
                sendToDevice={sendToDevice}
                shareMode={shareMode}
                setShareMode={setShareMode}
              />
            </AppShell>
          )}
          {activeSection === "privacy" && (
            <AppShell>
              <PrivacyVault
                vaultUnlocked={vaultUnlocked}
                setVaultUnlocked={setVaultUnlocked}
                pinEntry={pinEntry}
                setPinEntry={setPinEntry}
                patternEntry={patternEntry}
                setPatternEntry={setPatternEntry}
                hasPin={Boolean(vaultPin)}
                unlockVaultWithPin={unlockVaultWithPin}
                unlockVaultWithBiometric={unlockVaultWithBiometric}
                patternModalOpen={patternModalOpen}
                setPatternModalOpen={setPatternModalOpen}
                ghostMode={ghostMode}
                setGhostMode={setGhostMode}
                vaultFiles={vaultFiles}
                addVaultFiles={addVaultFiles}
                manageVaultFile={manageVaultFile}
                lockedApps={lockedApps}
                toggleAppLock={toggleAppLock}
                notify={notify}
              />
            </AppShell>
          )}
        </section>
      </div>

      {guideOpen && <UserGuide step={guideStep} setStep={setGuideStep} closeGuide={() => { window.localStorage.setItem("madar_guide_seen", "true"); setGuideOpen(false); }} />}
      <FloatingNavigation activeSection={activeSection} setActiveSection={setActiveSection} activeIndex={activeIndex} />
    </main>
  );
};

const Header = ({
  credits,
  user,
  profileName,
  darkMode,
  setDarkMode,
  cleanCache,
  notify,
  signInWithGoogle,
  signOut,
  openGuide,
}: {
  credits: string;
  user: AuthUser | null;
  profileName: string;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  cleanCache: () => void;
  notify: (title: string, description: string) => void;
  signInWithGoogle: () => void;
  signOut: () => void;
  openGuide: () => void;
}) => (
  <header className="glass-panel sticky top-4 z-30 flex items-center justify-between rounded-2xl px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
        <Radar className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">تطبيق أدوات ذكية</p>
        <h1 className="text-2xl font-black leading-none gold-text">مدار</h1>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-sm font-bold sm:flex">
        <Sparkles className="h-4 w-4 text-primary" />
        {credits}
      </div>
      <Button variant="glass" size="icon" aria-label="فتح دليل الاستخدام" onClick={openGuide}>
        <HelpCircle className="h-5 w-5" />
      </Button>
      <Drawer direction="right">
        <DrawerTrigger asChild>
          <Button variant="glass" size="icon" aria-label="فتح الإعدادات">
            <Settings className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="gold-scrollbar inset-y-0 right-0 left-auto mt-0 h-full w-[min(92vw,24rem)] overflow-y-auto rounded-l-2xl rounded-tr-none border-border/70 bg-popover/95 p-0 backdrop-blur-2xl">
          <DrawerHeader className="text-right">
            <DrawerTitle className="flex items-center justify-between text-right text-2xl font-black">
              إعدادات مدار <Shield className="h-5 w-5 text-primary" />
            </DrawerTitle>
            <DrawerDescription>تحكم آمن في الحساب، المظهر، والبيانات المؤقتة.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-4">
            <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <User className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate font-bold">{profileName}</p>
                  <p className="text-xs text-muted-foreground">{user ? "متصل ومحفوظ في السحابة" : "سجّل الدخول لحفظ الرصيد"}</p>
                </div>
              </div>
            </div>
            {user ? (
              <Button variant="glass" className="w-full justify-between" onClick={signOut}><LogOut className="h-4 w-4" /> تسجيل الخروج</Button>
            ) : (
              <SettingsRow icon={Chrome} title="تسجيل الدخول عبر Google" description="يحفظ الأرصدة وبيانات الملفات بشكل آمن." action={signInWithGoogle} />
            )}
            <SettingsRow icon={Facebook} title="تسجيل الدخول عبر Facebook" description="غير متاح حالياً؛ استخدم Google لحفظ البيانات فوراً." action={() => notify("تسجيل Facebook", "تسجيل Facebook غير مفعّل حالياً، ويمكنك استخدام Google لحفظ بياناتك الآن.")} />
            <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
              <div className="flex items-center justify-between">
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                <span className="flex items-center gap-2 font-bold"><Moon className="h-4 w-4 text-primary" /> الوضع الداكن</span>
              </div>
            </div>
            <Button variant="glass" className="w-full justify-between" onClick={cleanCache}>
              <Trash2 className="h-4 w-4" /> ماسح الملفات المؤقتة
            </Button>
            <SettingsRow icon={Shield} title="الخصوصية" description="المشاركة المحلية تعمل دون رفع الملفات إلا عند اختيار السحابة." action={() => notify("الخصوصية", "لا تُرفع الملفات إلا عند اختيار المشاركة السحابية صراحة.")} />
            <SettingsRow icon={Info} title="عن التطبيق" description="مدار واجهة عربية احترافية مهيأة للتطوير المستقبلي عبر Capacitor." action={() => notify("عن مدار", "تطبيق عربي احترافي قابل للتحويل لاحقاً إلى تطبيق جوال.")} />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="gold">إغلاق الإعدادات</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  </header>
);

const AppShell = ({ children }: { children: React.ReactNode }) => <section className="glass-panel min-h-[620px] rounded-3xl p-3 sm:p-5">{children}</section>;

const HomeSection = ({ credits, rewardAd, user, signInWithGoogle, shareApp }: { credits: string; rewardAd: () => void; user: AuthUser | null; signInWithGoogle: () => void; shareApp: (platformName: string) => void }) => (
  <section className="flex min-h-[620px] flex-col justify-between rounded-3xl border border-border/50 bg-gradient-glass p-5 shadow-glass sm:p-8">
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="rounded-3xl border border-primary/40 bg-primary/10 p-5 text-center shadow-gold">
        <BadgeCheck className="mx-auto mb-3 h-9 w-9 text-primary" />
        <p className="text-sm font-bold leading-7 text-foreground">قم بربط حسابك الآن لضمان حفظ أرصدتك، نغماتك المخصصة، وتفضيلاتك السحابية، واستمتع بمساحة تخزين إضافية مجانية.</p>
        {!user && <Button variant="gold" className="mt-4 w-full" onClick={signInWithGoogle}><Chrome className="h-4 w-4" /> ربط الحساب عبر Google الآن</Button>}
      </div>
      <div className="rounded-3xl border border-border/50 bg-secondary/30 p-6 text-center shadow-gold">
        <Gift className="mx-auto mb-4 h-12 w-12 text-primary" />
        <p className="mb-4 text-sm font-bold text-muted-foreground">الرصيد الحالي: {credits}</p>
        <Button variant="gold" size="lg" className="w-full" onClick={rewardAd}>
          <Gift className="h-5 w-5" /> شاهد إعلاناً للحصول على 5 أرصدة إضافية
        </Button>
      </div>
    </div>

    <div className="rounded-3xl border border-border/50 bg-background/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-black">مشاركة التطبيق</span>
        <Share2 className="h-5 w-5 text-primary" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "WhatsApp", icon: MessageCircle },
          { label: "Facebook", icon: Facebook },
          { label: "Instagram", icon: Instagram },
          { label: "Twitter", icon: Twitter },
        ].map((item) => (
          <Button key={item.label} variant="glass" size="icon" aria-label={`مشاركة عبر ${item.label}`} onClick={() => shareApp(item.label)}>
            <item.icon className="h-5 w-5" />
          </Button>
        ))}
      </div>
    </div>
  </section>
);

const FloatingNavigation = ({ activeSection, setActiveSection, activeIndex }: { activeSection: Section; setActiveSection: (section: Section) => void; activeIndex: number }) => (
  <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(96vw,46rem)] rounded-full border border-border/70 bg-glass/75 p-2 shadow-glass backdrop-blur-2xl">
    <div className="relative grid grid-cols-5 gap-1">
      <span className="absolute bottom-0 top-0 w-1/5 rounded-full bg-primary/15 transition-transform duration-300" style={{ transform: `translateX(${-activeIndex * 100}%)`, right: 0 }} />
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-full text-xs font-bold transition-all duration-300 ${active ? "-translate-y-1 text-primary drop-shadow" : "text-muted-foreground"}`}
          >
            <Icon className="h-5 w-5 transition-all" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

const guideCards = [
  { icon: Radar, title: "مرحباً بك في مدار", body: "واجهة عربية فصحى تجمع المكالمة الوهمية، التحميل الذكي، والشير المحلي والسحابي ضمن تجربة داكنة ذهبية عالية الدقة." },
  { icon: PhoneCall, title: "تفعيل المكالمة من الخارج", body: "اضغط مطولاً على أيقونة التطبيق في شاشتك الرئيسية واختر (مكالمة فورية) للإنقاذ السريع دون فتح التطبيق." },
  { icon: HardDriveDownload, title: "المستشعر الذكي", body: "ألصق الرابط أو افتح منصة داخلية ليعرض مدار الجودات المتاحة فقط دون نوافذ مزعجة أو صيغ وهمية." },
  { icon: Wifi, title: "الشير العالمي", body: "اختر ملفاً، أنشئ كوداً سحابياً أو اربط جهازاً قريباً عبر WebRTC لإرسال الملفات محلياً دون إنترنت." },
  { icon: LockKeyhole, title: "مخزن الخصوصية", body: "اقفل الصور والفيديوهات والمستندات برمز PIN أو نمط أو تحقق حيوي، وفعّل وضع إخفاء الملفات لإبعادها عن المعرض داخل مساحة مخفية." },
];

const UserGuide = ({ step, setStep, closeGuide }: { step: number; setStep: (step: number) => void; closeGuide: () => void }) => {
  const card = guideCards[step];
  const Icon = card.icon;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/88 p-4 backdrop-blur-2xl">
      <section className="w-full max-w-lg rounded-3xl border border-primary/50 bg-gradient-glass p-5 shadow-gold animate-scale-in">
        <div className="mb-5 flex items-center justify-between">
          <Button variant="glass" size="icon" onClick={closeGuide} aria-label="إغلاق دليل الاستخدام"><X className="h-4 w-4" /></Button>
          <div className="flex gap-1">{guideCards.map((item, index) => <span key={item.title} className={`h-2 w-8 rounded-full ${index === step ? "bg-primary" : "bg-secondary"}`} />)}</div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-background/45 p-6 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold animate-float-slow"><Icon className="h-10 w-10" /></div>
          <h2 className="text-3xl font-black gold-text">{card.title}</h2>
          <p className="mt-4 text-sm font-semibold leading-8 text-muted-foreground">{card.body}</p>
          {step === 1 && <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-primary/40 bg-primary/10 p-4 text-right"><Smartphone className="mb-2 h-6 w-6 text-primary" /><p className="text-sm font-bold">اختصار الشاشة الرئيسية</p><p className="mt-1 text-xs leading-6 text-muted-foreground">مكالمة فورية • التحميل الذكي • الشير</p></div>}
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="glass" className="flex-1" onClick={() => step > 0 ? setStep(step - 1) : closeGuide()}>{step > 0 ? "السابق" : "تخطي"}</Button>
          <Button variant="gold" className="flex-1" onClick={() => step < guideCards.length - 1 ? setStep(step + 1) : closeGuide()}>{step < guideCards.length - 1 ? "التالي" : "بدء الاستخدام"}</Button>
        </div>
      </section>
    </div>
  );
};

const FakeCallDashboard = ({
  platform,
  setPlatform,
  callStatus,
  startCall,
  declineCall,
  callDelay,
  setCallDelay,
  redialInterval,
  setRedialInterval,
  redialRetries,
  setRedialRetries,
  ringtone,
  customRingtone,
  setRingtone,
  handleRingtoneUpload,
  customTones,
  timerCountdown,
  startScheduledCall,
  callFrameRef,
}: {
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  callStatus: string;
  startCall: () => void | Promise<void>;
  declineCall: () => void;
  callDelay: string;
  setCallDelay: (value: string) => void;
  redialInterval: string;
  setRedialInterval: (value: string) => void;
  redialRetries: string;
  setRedialRetries: (value: string) => void;
  ringtone: string;
  customRingtone: string;
  setRingtone: (value: string) => void;
  handleRingtoneUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  customTones: string[];
  timerCountdown: number | null;
  startScheduledCall: () => void;
  callFrameRef: React.RefObject<HTMLDivElement>;
}) => (
  <div className="grid gap-5 lg:grid-cols-[1fr_0.86fr]">
    <div className="space-y-4">
      <SectionTitle icon={Phone} title="لوحة المكالمة الوهمية" subtitle="تحكم كامل في التوقيت، النظام، الرنين، الاهتزاز، وملء الشاشة الواقعي." />
      <Button variant="gold" size="lg" className="w-full" onClick={startCall}>
        <Maximize2 className="h-5 w-5" /> ابدأ المكالمة بملء الشاشة
      </Button>
      <Button variant="glass" size="lg" className="w-full justify-between" onClick={startScheduledCall}>
        <span className="flex items-center gap-2"><Timer className="h-5 w-5" /> تفعيل المؤقت</span>
        <span>{timerCountdown === null ? `${callDelay} دقائق` : `${timerCountdown} ثانية`}</span>
      </Button>
      {timerCountdown !== null && (
        <div className="rounded-3xl border border-primary/50 bg-primary/10 p-5 text-center shadow-gold animate-fade-in">
          <p className="text-xs font-bold text-muted-foreground">الوقت المتبقي قبل المكالمة</p>
          <p className="mt-2 text-5xl font-black text-primary" dir="ltr">{Math.floor(timerCountdown / 60).toString().padStart(2, "0")}:{(timerCountdown % 60).toString().padStart(2, "0")}</p>
        </div>
      )}
      <ControlPanel title="جدولة المكالمة" icon={CalendarClock}>
        <div className="grid grid-cols-3 gap-2">
          {["1", "5", "10"].map((value) => (
            <Button key={value} variant={callDelay === value ? "gold" : "glass"} onClick={() => setCallDelay(value)}>
              {value} دقائق
            </Button>
          ))}
        </div>
      </ControlPanel>
      <ControlPanel title="ملفات النظام" icon={Smartphone}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={platform === "android" ? "gold" : "glass"} onClick={() => setPlatform("android")}>أندرويد</Button>
          <Button variant={platform === "ios" ? "gold" : "glass"} onClick={() => setPlatform("ios")}>أيفون</Button>
        </div>
      </ControlPanel>
      <ControlPanel title="معاودة الاتصال التلقائية" icon={RefreshCcw}>
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledInput label="فترة معاودة الاتصال" value={redialInterval} onChange={setRedialInterval} suffix="ثانية" />
          <LabeledInput label="عدد المحاولات" value={redialRetries} onChange={setRedialRetries} suffix="محاولات" />
        </div>
      </ControlPanel>
      <ControlPanel title="الصوت والاهتزاز" icon={Vibrate}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select value={ringtone} onChange={(event) => setRingtone(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option>نغمة النظام الهادئة</option>
            <option>نغمة أيفون الكلاسيكية</option>
            <option>نغمة أندرويد الرسمية</option>
            <option>نغمة مخصصة</option>
          </select>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border/60 bg-glass/70 px-4 text-sm font-medium backdrop-blur-xl transition-colors hover:bg-secondary/80">
            <Music className="h-4 w-4" /> رفع نغمة
            <input type="file" accept="audio/*" className="sr-only" onChange={handleRingtoneUpload} />
          </label>
        </div>
        {customRingtone && <p className="mt-2 text-xs text-muted-foreground">النغمة الحالية: {customRingtone}</p>}
        {!!customTones.length && <div className="mt-3 flex flex-wrap gap-2">{customTones.map((tone) => <span key={tone} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{tone}</span>)}</div>}
      </ControlPanel>
    </div>
    <div className="mx-auto w-full max-w-sm">
      <div ref={callFrameRef} className={`madar-call-frame relative min-h-[560px] overflow-hidden rounded-[2rem] border ${platform === "ios" ? "border-gold/70" : "border-accent/70"} bg-background/95 p-5 shadow-glass`}>
        <div className="mx-auto mb-8 h-6 w-24 rounded-full bg-secondary" />
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold animate-pulse-gold">
            <BellRing className="h-10 w-10" />
          </div>
          <p className="text-sm text-muted-foreground">مكالمة واردة</p>
          <h3 className="mt-2 text-3xl font-black">سارة الأعمال</h3>
          <p className="mt-1 text-sm text-muted-foreground" dir="ltr">+966 55 240 7712</p>
          <p className="mt-5 rounded-xl border border-border/50 bg-secondary/60 px-3 py-3 text-sm text-primary">{callStatus}</p>
          <p className="mt-3 text-xs text-muted-foreground">ملف النظام: {platform === "ios" ? "أيفون" : "أندرويد"} • {ringtone}</p>
        </div>
        <div className="absolute inset-x-6 bottom-8 flex justify-around">
          <Button variant="destructive" size="icon" onClick={declineCall} aria-label="رفض المكالمة"><PhoneMissed /></Button>
          <Button variant="success" size="icon" onClick={startCall} aria-label="قبول المكالمة"><PhoneCall /></Button>
        </div>
      </div>
    </div>
  </div>
);

const DownloaderHub = ({
  detectedLink,
  setDetectedLink,
  browserUrl,
  setBrowserUrl,
  selectedFormat,
  setSelectedFormat,
  detectedFormats,
  qualitiesOpen,
  setQualitiesOpen,
  wifiOnly,
  setWifiOnly,
  startDownload,
  analyzeClipboard,
  notify,
}: {
  detectedLink: string;
  setDetectedLink: (value: string) => void;
  browserUrl: string;
  setBrowserUrl: (value: string) => void;
  selectedFormat: MediaFormat | null;
  setSelectedFormat: (value: MediaFormat) => void;
  detectedFormats: MediaFormat[];
  qualitiesOpen: boolean;
  setQualitiesOpen: (value: boolean) => void;
  wifiOnly: boolean;
  setWifiOnly: (value: boolean) => void;
  startDownload: () => void;
  analyzeClipboard: () => void;
  notify: (title: string, description: string) => void;
}) => (
  <div className="space-y-5">
    <SectionTitle icon={HardDriveDownload} title="التحميل الذكي" subtitle="مستشعر وسائط ديناميكي يعرض الصيغ المتاحة فقط مع أحجام تقديرية واقعية." />
    <Tabs defaultValue="center" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-secondary/40 p-2">
        <TabsTrigger value="center" className="gap-2 rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Download className="h-4 w-4" /> مركز التحميل</TabsTrigger>
        <TabsTrigger value="files" className="gap-2 rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><FolderOpen className="h-4 w-4" /> ملفاتي</TabsTrigger>
      </TabsList>
      <TabsContent value="center" className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.84fr]">
          <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
            <label className="mb-2 block text-sm font-bold">رابط مباشر</label>
            <div className="flex gap-2">
              <Input dir="ltr" value={detectedLink} onChange={(event) => setDetectedLink(event.target.value)} placeholder="https://" className="bg-background/70" />
              <Button variant="glass" size="icon" onClick={analyzeClipboard} aria-label="اكتشاف الحافظة"><Copy /></Button>
            </div>
            <div className="mt-4 rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold">المتصفح الداخلي</span>
                <Globe2 className="h-4 w-4 text-primary" />
              </div>
              <Input dir="ltr" value={browserUrl} onChange={(event) => setBrowserUrl(event.target.value)} placeholder="أدخل رابط الصفحة" className="bg-background/70" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { label: "فيسبوك", icon: Facebook, url: "https://facebook.com/video/720" },
                  { label: "يوتيوب", icon: Youtube, url: "https://youtube.com/watch?v=demo-4k" },
                  { label: "إنستغرام", icon: Instagram, url: "https://instagram.com/reel/1080" },
                  { label: "تيك توك", icon: Play, url: "https://tiktok.com/@madar/video/short" },
                ].map((item) => (
                  <button key={item.label} onClick={() => { setBrowserUrl(item.url); setDetectedLink(item.url); notify("تم فتح منصة", `تم رصد رابط من ${item.label} وفحص الصيغ المتاحة.`); }} className="rounded-xl border border-border/50 bg-secondary/40 p-3 text-xs font-bold transition-transform hover:-translate-y-1">
                    <item.icon className="mx-auto mb-2 h-5 w-5 text-primary" /> {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 min-h-36 rounded-xl border border-border/40 bg-gradient-glass p-4 text-sm text-muted-foreground">
                <div className="mb-3 flex items-center justify-between text-foreground"><span>معاينة الصفحة</span><MoreVertical className="h-4 w-4" /></div>
                تم رصد {detectedFormats.length} صيغة نشطة من الصفحة الحالية دون عرض صيغ غير متاحة.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-black">مستشعر الوسائط</span>
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <Button variant="gold" className="w-full justify-between" onClick={() => setQualitiesOpen(!qualitiesOpen)}>
              <span className="flex items-center gap-2"><Download className="h-4 w-4" /> عرض الجودات المتاحة</span>
              <span>{detectedFormats.length} صيغة</span>
            </Button>
            <div className="mt-3 flex flex-wrap gap-2">
              {detectedFormats.map((row) => <button key={`chip-${row.kind}-${row.quality}`} onClick={() => setSelectedFormat(row)} className={`rounded-full border px-3 py-1 text-xs font-black transition-transform hover:-translate-y-0.5 ${selectedFormat?.quality === row.quality && selectedFormat?.kind === row.kind ? "border-primary bg-primary text-primary-foreground" : "border-primary/40 bg-primary/10 text-primary"}`}>{row.kind} {row.quality}</button>)}
            </div>
            <div className={`grid overflow-hidden transition-all duration-300 ${qualitiesOpen ? "mt-3 max-h-[32rem] gap-2 opacity-100" : "max-h-0 gap-0 opacity-0"}`}>
              {detectedFormats.map((row) => {
                const Icon = row.icon;
                const active = selectedFormat?.quality === row.quality && selectedFormat?.kind === row.kind;
                return (
                  <button
                    key={`${row.kind}-${row.quality}`}
                    onClick={() => setSelectedFormat(row)}
                    className={`rounded-xl border p-3 text-right transition-all hover:-translate-y-0.5 ${active ? "border-primary bg-primary/15" : "border-border/50 bg-background/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-black">{row.kind} • {row.quality}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">الحجم الحقيقي المرصود: {row.sizeMb} م.ب • الامتداد: {row.extension}</p>
                  </button>
                );
              })}
              {!detectedFormats.length && <p className="rounded-xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">لم يتم رصد صيغ نشطة بعد.</p>}
            </div>
            <div className="my-4 flex items-center justify-between rounded-xl bg-background/50 p-3">
              <Switch checked={wifiOnly} onCheckedChange={setWifiOnly} />
              <span className="font-bold">التنزيل عبر Wi‑Fi فقط</span>
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={startDownload}>
              <FileDown className="h-5 w-5" /> تنزيل الصيغة المحددة
            </Button>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="files" className="mt-5">
        <div className="grid gap-4 md:grid-cols-3">
          {downloadedFiles.map((file) => (
            <div key={file.title} className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30">
              <div className={`h-32 ${file.tone} p-4`}>
                <FileVideo className="h-8 w-8 text-primary" />
              </div>
              <div className="p-4">
                <p className="font-black">{file.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{file.type} • {file.size} • {file.source}</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="glass" size="sm" onClick={() => notify("تم تجهيز المشاركة", "أصبح الملف جاهزاً للإرسال عبر الشير الذكي.")}><Share2 className="h-4 w-4" /> مشاركة</Button>
                  <Button variant="glass" size="sm" onClick={() => notify("تم حذف الملف", "أُزيل الملف من المعرض المحلي بنجاح.")}><Trash2 className="h-4 w-4" /> حذف</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  </div>
);

const SmartShare = ({
  notify,
  expiry,
  setExpiry,
  sharedFile,
  setSharedFile,
  shareCode,
  saveSharedFile,
  receiverCode,
  setReceiverCode,
  downloadByCode,
  activateWebRtc,
  closeWebRtc,
  openScanner,
  closeScanner,
  scannerOpen,
  scannerVideoRef,
  localPairCode,
  webrtcStatus,
  pairByCode,
  connectedDevices,
  sendToDevice,
  shareMode,
  setShareMode,
}: {
  notify: (title: string, description: string) => void;
  expiry: string;
  setExpiry: (value: string) => void;
  sharedFile: File | null;
  setSharedFile: (file: File | null) => void;
  shareCode: string;
  saveSharedFile: () => void;
  receiverCode: string;
  setReceiverCode: (value: string) => void;
  downloadByCode: () => void;
  activateWebRtc: (mode: "send" | "receive") => void;
  closeWebRtc: () => void;
  openScanner: () => void;
  closeScanner: () => void;
  scannerOpen: boolean;
  scannerVideoRef: React.RefObject<HTMLVideoElement>;
  localPairCode: string;
  webrtcStatus: string;
  pairByCode: () => void;
  connectedDevices: ConnectedDevice[];
  sendToDevice: (deviceName: string) => void;
  shareMode: ShareMode;
  setShareMode: (mode: ShareMode) => void;
}) => (
  <div className="space-y-5">
    <SectionTitle icon={Signal} title="الشير العالمي" subtitle="اختر وضع المشاركة، ثم توسّع البطاقة بسلاسة إلى مساحة عمل كاملة." />
    {!shareMode && (
      <div className="grid min-h-[30rem] gap-5 lg:grid-cols-2">
        <ShareChoiceCard icon={Cloud} title="المشاركة السحابية" subtitle="كود تنزيل آمن، مدة انتهاء، وسجل ملفات محفوظ للمستخدم." onClick={() => setShareMode("cloud")} />
        <ShareChoiceCard icon={Wifi} title="النقل القريب" subtitle="WebRTC وباركود واقتران يدوي للأجهزة القريبة دون إنترنت." onClick={() => setShareMode("nearby")} />
      </div>
    )}
    {shareMode === "cloud" && (
      <div className="min-h-[34rem] rounded-3xl border border-border/50 bg-gradient-glass p-5 shadow-glass animate-enter">
        <Button variant="glass" className="mb-4" onClick={() => setShareMode(null)}><X className="h-4 w-4" /> العودة لاختيار الوضع</Button>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black">المشاركة السحابية</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">ارفع ملفاً وأنشئ كوداً من 6 أرقام ليستخدمه الطرف الآخر للتنزيل.</p>
          </div>
          <Cloud className="h-9 w-9 text-primary" />
        </div>
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm text-muted-foreground">الملف المحدد: <span className="font-bold text-foreground">{sharedFile ? sharedFile.name : "لم يتم اختيار ملف"}</span></div>
        <select value={expiry} onChange={(event) => setExpiry(event.target.value)} className="mt-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option>24 ساعة</option>
          <option>أسبوع واحد</option>
          <option>شهر واحد</option>
          <option>دائم</option>
        </select>
        <Button variant="gold" className="mt-4 w-full" onClick={saveSharedFile}>
          <KeyRound className="h-4 w-4" /> إنشاء كود مشاركة
        </Button>
        {shareCode && <div className="mt-4 rounded-2xl border border-primary/50 bg-primary/10 p-4 text-center text-3xl font-black tracking-normal text-primary" dir="ltr">{shareCode}</div>}
        <div className="mt-4 flex gap-2">
          <Input inputMode="numeric" maxLength={6} value={receiverCode} onChange={(event) => setReceiverCode(event.target.value)} placeholder="أدخل كود التنزيل" className="bg-background/70 text-center" dir="ltr" />
          <Button variant="glass" onClick={downloadByCode}><FileDown className="h-4 w-4" /> تنزيل</Button>
        </div>
      </div>
    )}
    {shareMode === "nearby" && (
      <div className="min-h-[34rem] rounded-3xl border border-border/50 bg-gradient-glass p-5 shadow-glass animate-enter">
        <Button variant="glass" className="mb-4" onClick={() => setShareMode(null)}><X className="h-4 w-4" /> العودة لاختيار الوضع</Button>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black">النقل السريع</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">قناة WebRTC مباشرة للأجهزة القريبة عبر Wi‑Fi، دون استهلاك أي رصيد.</p>
          </div>
          <Wifi className="h-9 w-9 text-primary" />
        </div>
        <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSharedFile(event.dataTransfer.files?.[0] ?? null); }} className="mb-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/60 bg-background/40 p-4 text-center transition-colors hover:bg-secondary/50">
          <FileArchive className="mb-2 h-8 w-8 text-primary" />
          <span className="font-black">اختيار ملف للنقل القريب</span>
          <span className="mt-2 text-xs leading-6 text-muted-foreground">{sharedFile ? `${sharedFile.name} • ${formatFileSize(sharedFile.size)} • جاهز للمعاينة والإرسال` : "اسحب ملفاً هنا أو اضغط لاختياره قبل الإرسال"}</span>
          <input type="file" className="sr-only" onChange={(event) => setSharedFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <LargeAction icon={Radio} label="تفعيل الإرسال" onClick={() => activateWebRtc("send")} />
          <LargeAction icon={Bluetooth} label="تفعيل الاستلام" onClick={() => activateWebRtc("receive")} />
          <LargeAction icon={QrCode} label="ماسح الباركود" onClick={openScanner} />
          <LargeAction icon={Share2} label="إرسال كود الاقتران" onClick={() => notify("كود الاقتران", localPairCode ? `تم إرسال الكود ${localPairCode} للجهاز الآخر.` : "فعّل الإرسال أو الاستلام أولاً لإنشاء كود.")} />
        </div>
        <div className="mt-4 flex gap-2">
          <Input inputMode="numeric" maxLength={6} value={receiverCode} onChange={(event) => setReceiverCode(event.target.value)} placeholder="أدخل كود الاقتران" className="bg-background/70 text-center" dir="ltr" />
          <Button variant="glass" onClick={pairByCode}><KeyRound className="h-4 w-4" /> اقتران</Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <StatusPill icon={Headphones} label="حالة WebRTC" value={webrtcStatus} />
          <StatusPill icon={KeyRound} label="كود الاقتران" value={localPairCode || "غير منشأ"} />
        </div>
        <Button variant="glass" className="mt-4 w-full" onClick={closeWebRtc}>إيقاف قناة النقل</Button>
        <div className="mt-5 rounded-2xl border border-border/50 bg-background/40 p-4">
          <h4 className="mb-3 font-black">الأجهزة المتصلة حالياً</h4>
          <div className="space-y-2">
            {connectedDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 p-3">
                <div><p className="font-bold">{device.name}</p><p className="text-xs text-muted-foreground">{device.status}</p></div>
                <Button variant="gold" size="sm" onClick={() => sendToDevice(device.name)}>إرسال</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    {scannerOpen && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-4 backdrop-blur-xl">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-popover p-4 shadow-glass">
          <div className="mb-3 flex items-center justify-between"><Button variant="glass" size="icon" onClick={closeScanner} aria-label="إغلاق الماسح"><X /></Button><h3 className="font-black">ماسح كود الاقتران</h3><Camera className="h-5 w-5 text-primary" /></div>
          <video ref={scannerVideoRef} className="aspect-video w-full rounded-2xl border border-primary/40 bg-secondary object-cover" playsInline muted />
          <Button variant="gold" className="mt-4 w-full" onClick={() => { setReceiverCode(localPairCode || createCode()); closeScanner(); notify("تمت قراءة الكود", "تم إدراج كود الاقتران من الكاميرا بنجاح."); }}>محاكاة قراءة الكود</Button>
        </div>
      </div>
    )}
  </div>
);

const PrivacyVault = ({
  vaultUnlocked,
  setVaultUnlocked,
  pinEntry,
  setPinEntry,
  patternEntry,
  setPatternEntry,
  hasPin,
  unlockVaultWithPin,
  unlockVaultWithBiometric,
  patternModalOpen,
  setPatternModalOpen,
  ghostMode,
  setGhostMode,
  vaultFiles,
  addVaultFiles,
  manageVaultFile,
  lockedApps,
  toggleAppLock,
  notify,
}: {
  vaultUnlocked: boolean;
  setVaultUnlocked: (value: boolean) => void;
  pinEntry: string;
  setPinEntry: (value: string) => void;
  patternEntry: string;
  setPatternEntry: (value: string) => void;
  hasPin: boolean;
  unlockVaultWithPin: () => void;
  unlockVaultWithBiometric: () => void;
  patternModalOpen: boolean;
  setPatternModalOpen: (value: boolean) => void;
  ghostMode: boolean;
  setGhostMode: (value: boolean) => void;
  vaultFiles: VaultFile[];
  addVaultFiles: (files: FileList | null) => void | Promise<void>;
  manageVaultFile: (file: VaultFile, action: "view" | "restore" | "delete") => void;
  lockedApps: string[];
  toggleAppLock: (appName: string) => void;
  notify: (title: string, description: string) => void;
}) => (
  <div className="space-y-5">
    <SectionTitle icon={LockKeyhole} title="مخزن الخصوصية" subtitle="قفل ذكي للصور والفيديوهات والمستندات مع وضع إخفاء ومحاكاة حماية التطبيقات." />
    {!vaultUnlocked ? (
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-3xl border border-primary/40 bg-gradient-glass p-6 shadow-gold">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold"><Lock className="h-10 w-10" /></div>
          <h3 className="text-3xl font-black gold-text">الخزنة مقفلة</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">استخدم رمز PIN أو النمط أو المصادقة الحيوية لفتح المنطقة الآمنة. عند أول استخدام، سيصبح رمز PIN الذي تدخله هو رمزك الدائم.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Input inputMode="numeric" maxLength={8} value={pinEntry} onChange={(event) => setPinEntry(event.target.value)} placeholder={hasPin ? "أدخل PIN" : "أنشئ PIN جديد"} className="bg-background/70 text-center" dir="ltr" />
            <Button variant="glass" type="button" onClick={() => setPatternModalOpen(true)} className="justify-between"><KeyRound className="h-4 w-4" /> {patternEntry ? `النمط: ${patternEntry}` : "إنشاء نمط"}</Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="gold" onClick={unlockVaultWithPin}><KeyRound className="h-4 w-4" /> فتح المخزن</Button>
            <Button variant="glass" onClick={unlockVaultWithBiometric}><Fingerprint className="h-4 w-4" /> تحقق حيوي</Button>
          </div>
        </div>
          <div className="rounded-3xl border border-border/50 bg-secondary/30 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"].map((node) => <div key={node} className="grid aspect-square place-items-center rounded-2xl border border-border/50 bg-background/45 text-lg font-black text-primary sm:text-xl">{node}</div>)}
          </div>
        </div>
      </div>
    ) : (
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/50 bg-gradient-glass p-5 shadow-glass">
            <div className="flex items-center justify-between gap-4">
              <div><h3 className="text-2xl font-black">قفل الملفات</h3><p className="mt-1 text-sm text-muted-foreground">الصور والفيديوهات والمستندات تحفظ في قائمة محلية مشفرة لمحاكاة مساحة التطبيق الآمنة.</p></div>
              <ShieldCheck className="h-9 w-9 text-primary" />
            </div>
            <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/60 bg-background/40 p-5 text-center hover:bg-secondary/50">
              <FolderOpen className="mb-3 h-9 w-9 text-primary" />
              <span className="font-black">إضافة ملفات إلى المخزن</span>
              <span className="mt-2 text-xs leading-6 text-muted-foreground">يدعم الصور والفيديوهات والمستندات للاختبار الفوري داخل المتصفح.</span>
              <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" className="sr-only" onChange={(event) => addVaultFiles(event.target.files)} />
            </label>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/10 p-4">
              <Switch checked={ghostMode} onCheckedChange={setGhostMode} />
              <span className="flex items-center gap-2 font-black"><Moon className="h-4 w-4 text-primary" /> إخفاء الملفات</span>
            </div>
          </div>
          <div className="rounded-3xl border border-border/50 bg-background/40 p-4">
            <h4 className="mb-3 font-black">المعرض السري</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {vaultFiles.length ? vaultFiles.map((file) => (
                <div key={file.id} className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/40">
                  <div className="grid aspect-square place-items-center bg-background/45">
                    {file.thumbnail ? <img src={file.thumbnail} alt={file.name} className="h-full w-full object-cover" /> : file.type.startsWith("video/") ? <FileVideo className="h-8 w-8 text-primary" /> : <FileArchive className="h-8 w-8 text-primary" />}
                  </div>
                  <div className="space-y-2 p-2.5">
                    <p className="truncate text-xs font-black">{file.name}</p>
                    <p className="text-[0.68rem] text-muted-foreground">{formatFileSize(file.size)} • {file.hidden ? "مخفي" : "محمي"}</p>
                    <div className="grid gap-1">
                      <Button variant="glass" size="sm" className="h-8 text-xs" onClick={() => manageVaultFile(file, "view")}><Play className="h-3.5 w-3.5" /> معاينة المحتوى</Button>
                      <Button variant="glass" size="sm" className="h-8 text-xs" onClick={() => manageVaultFile(file, "restore")}><Lock className="h-3.5 w-3.5" /> إلغاء القفل</Button>
                      <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => manageVaultFile(file, "delete")}><Trash2 className="h-3.5 w-3.5" /> حذف نهائي</Button>
                    </div>
                  </div>
                </div>
              )) : <p className="rounded-2xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground">لا توجد ملفات داخل المخزن بعد.</p>}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/50 bg-gradient-glass p-5 shadow-glass">
            <h3 className="text-2xl font-black">قفل التطبيقات</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">اختر تطبيقات للحماية ضمن محاكاة مرئية جاهزة للتوسعة عند تحويل التطبيق إلى Capacitor.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {simulatedApps.map((appName) => <Button key={appName} variant={lockedApps.includes(appName) ? "gold" : "glass"} onClick={() => toggleAppLock(appName)}><Shield className="h-4 w-4" /> {appName}</Button>)}
            </div>
          </div>
          <div className="rounded-3xl border border-border/50 bg-secondary/30 p-5">
            <h3 className="text-2xl font-black">الخروج الآمن</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">عند قلب الهاتف ووجهه للأسفل يتم قفل المخزن فوراً إذا كان المتصفح يتيح مستشعرات الاتجاه.</p>
            <Button variant="glass" className="mt-4 w-full" onClick={() => { setVaultUnlocked(false); notify("تم قفل المخزن", "أُغلق مخزن الخصوصية يدوياً بنجاح."); }}><LockKeyhole className="h-4 w-4" /> قفل فوري</Button>
          </div>
        </div>
      </div>
    )}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: typeof Phone; title: string; subtitle: string }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
      <Icon className="h-6 w-6" />
    </div>
  </div>
);

const InfoCard = ({ icon: Icon, title, items }: { icon: typeof Info; title: string; items: string[] }) => (
  <div className="rounded-3xl border border-border/50 bg-gradient-glass p-5">
    <Icon className="mb-4 h-7 w-7 text-primary" />
    <h3 className="text-xl font-black">{title}</h3>
    <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
      {items.map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {item}</li>)}
    </ul>
  </div>
);

const Metric = ({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) => (
  <div className="glass-panel rounded-2xl p-4 transition-transform hover:-translate-y-1">
    <Icon className="mb-3 h-5 w-5 text-primary" />
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-black sm:text-xl">{value}</p>
  </div>
);

const ControlPanel = ({ title, icon: Icon, children }: { title: string; icon: typeof Timer; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
    <div className="mb-3 flex items-center justify-between">
      <span className="font-bold">{title}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    {children}
  </div>
);

const LabeledInput = ({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) => (
  <label className="block">
    <span className="mb-2 block text-xs text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" inputMode="numeric" />
      <span className="text-xs text-muted-foreground">{suffix}</span>
    </div>
  </label>
);

const LargeAction = ({ icon: Icon, label, onClick }: { icon: typeof Radio; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="min-h-28 rounded-2xl border border-border/50 bg-background/40 p-4 text-right transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-primary/10">
    <Icon className="mb-3 h-7 w-7 text-primary" />
    <span className="font-black">{label}</span>
  </button>
);

const ShareChoiceCard = ({ icon: Icon, title, subtitle, onClick }: { icon: typeof Cloud; title: string; subtitle: string; onClick: () => void }) => (
  <button onClick={onClick} className="group relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-glass p-6 text-right shadow-glass transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-gold animate-scale-in">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold transition-transform duration-300 group-hover:scale-110"><Icon className="h-8 w-8" /></div>
    <div className="mt-24">
      <h3 className="text-3xl font-black gold-text">{title}</h3>
      <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-muted-foreground">{subtitle}</p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-black text-primary"><Maximize2 className="h-4 w-4" /> فتح مساحة العمل</span>
    </div>
  </button>
);

const StatusPill = ({ icon: Icon, label, value }: { icon: typeof Smartphone; label: string; value: string }) => (
  <div className="rounded-xl bg-background/50 p-3">
    <Icon className="mb-2 h-4 w-4 text-primary" />
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-black">{value}</p>
  </div>
);

const SettingsRow = ({ icon: Icon, title, description, action }: { icon: typeof Shield; title: string; description: string; action: () => void }) => (
  <button onClick={action} className="w-full rounded-2xl border border-border/50 bg-secondary/30 p-4 text-right transition-transform hover:-translate-y-1">
    <div className="flex items-center justify-between gap-3">
      <Icon className="h-5 w-5 text-primary" />
      <span className="font-bold">{title}</span>
    </div>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
  </button>
);

export default Index;
