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
  Pause,
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
type SharedFileRecord = { code: string; name: string; size: number; expiry: string; createdAt: number; dataUrl: string; type: string };
type ConnectedDevice = { id: string; name: string; status: string };
type VaultFile = { id: string; name: string; size: number; type: string; hidden: boolean; encryptedAt: number; thumbnail?: string; dataUrl?: string; storagePath?: string };
type ShareMode = "cloud" | "nearby" | null;
type VaultAuthMethod = "pin" | "pattern" | "biometric";
type VaultSetupStep = "method" | "create" | "confirm" | "unlock";
type DownloadJob = { id: string; url: string; name: string; format: string; status: "queued" | "active" | "paused" | "done" | "error"; progress: number; size?: number; error?: string };
type MediaPreview = { title: string; host: string; thumbnail: string; direct: boolean };

const CREDIT_COST: Record<PaidAction, number> = { call: 1, download: 1 };
const SHARE_STORAGE_KEY = "madar_share_records";
const VAULT_STORAGE_KEY = "madar_privacy_vault";
const VAULT_BIOMETRIC_KEY = "madar_vault_biometric";

const navItems: Array<{ id: Section; label: string; icon: typeof PhoneCall }> = [
  { id: "home", label: "الرئيسية", icon: Radar },
  { id: "call", label: "مكالمة وهمية", icon: PhoneCall },
  { id: "download", label: "التحميل", icon: Download },
  { id: "share", label: "الشير", icon: Signal },
  { id: "privacy", label: "الخصوصية", icon: LockKeyhole },
];

const simulatedApps = ["الصور", "الرسائل", "المتصفح", "المعرض", "الملفات", "البريد"];

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

const dbRequest = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("madar-secure-store", 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const saveBinaryRecord = async (key: string, value: string) => {
  const db = await dbRequest();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const readBinaryRecord = async (key: string) => {
  const db = await dbRequest();
  const value = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const request = tx.objectStore("files").get(key);
    request.onsuccess = () => resolve(request.result as string | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
};

const deleteBinaryRecord = async (key: string) => {
  const db = await dbRequest();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const downloadDataUrl = (dataUrl: string, fileName: string) => {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
};

const directFileName = (url: string, extension: string) => {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() || "");
    return name.includes(".") ? name : `madar-download-${Date.now()}.${extension}`;
  } catch {
    return `madar-download-${Date.now()}.${extension}`;
  }
};

const detectDirectExtension = (url: string) => url.match(/\.([a-z0-9]{2,5})(?:\?|#|$)/i)?.[1]?.toLowerCase();

const mediaThumbnail = (link: string) => {
  try {
    const url = new URL(link);
    const videoId = url.hostname.includes("youtu") ? (url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop()) : "";
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  } catch {
    return "";
  }
  return "";
};

const createMediaPreview = (link: string): MediaPreview | null => {
  try {
    const url = new URL(link.trim());
    const extension = detectDirectExtension(link);
    const direct = Boolean(extension && ["mp4", "webm", "mov", "mp3", "m4a", "wav", "ogg"].includes(extension));
    return {
      title: direct ? directFileName(link, extension || "mp4") : `وسيط مرصود من ${url.hostname.replace(/^www\./, "")}`,
      host: url.hostname.replace(/^www\./, ""),
      thumbnail: mediaThumbnail(link),
      direct,
    };
  } catch {
    return null;
  }
};

const detectFormats = (link: string): MediaFormat[] => {
  const normalized = link.toLowerCase();
  if (!normalized.trim()) return [];
  const directExtension = detectDirectExtension(link);
  if (normalized.includes("audio") || normalized.includes("mp3") || normalized.includes("sound")) {
    return [{ kind: "صوت", quality: "MP3 Fast", sizeMb: 11, extension: "mp3", icon: FileAudio }, { kind: "صوت", quality: "MP3 Classic", sizeMb: 16, extension: "mp3", icon: FileAudio }];
  }
  const baseSize = directExtension ? 42 : normalized.includes("reel") || normalized.includes("short") ? 72 : 186;
  return [
    { kind: "صوت", quality: "MP3 Fast", sizeMb: 9, extension: "mp3", icon: FileAudio },
    { kind: "صوت", quality: "MP3 Classic", sizeMb: 14, extension: "mp3", icon: FileAudio },
    { kind: "فيديو", quality: "144p", sizeMb: Math.max(8, Math.round(baseSize * 0.18)), extension: "mp4", icon: FileVideo },
    { kind: "فيديو", quality: "240p", sizeMb: Math.max(14, Math.round(baseSize * 0.28)), extension: "mp4", icon: FileVideo },
    { kind: "فيديو", quality: "360p", sizeMb: Math.max(24, Math.round(baseSize * 0.42)), extension: "mp4", icon: FileVideo },
    { kind: "فيديو", quality: "MP4 480p Fast", sizeMb: Math.max(36, Math.round(baseSize * 0.62)), extension: "mp4", icon: FileVideo },
    { kind: "فيديو", quality: "MP4 720p High", sizeMb: Math.max(58, baseSize), extension: "mp4", icon: FileVideo },
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
  const [detectedLink, setDetectedLink] = useState("");
  const [browserUrl, setBrowserUrl] = useState("");
  const [callDelay, setCallDelay] = useState("1");
  const [redialInterval, setRedialInterval] = useState("30");
  const [redialRetries, setRedialRetries] = useState("3");
  const [autoStartCall, setAutoStartCall] = useState(true);
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
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [simultaneousDownloads, setSimultaneousDownloads] = useState(true);
  const downloadControllers = useRef<Record<string, AbortController>>({});
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [shareCode, setShareCode] = useState("");
  const [receiverCode, setReceiverCode] = useState("");
  const [cloudShareRecords, setCloudShareRecords] = useState<SharedFileRecord[]>(() => JSON.parse(window.localStorage.getItem(SHARE_STORAGE_KEY) || "[]") as SharedFileRecord[]);
  const [localPairCode, setLocalPairCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [webrtcStatus, setWebrtcStatus] = useState("غير متصل");
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [shareMode, setShareMode] = useState<ShareMode>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultPin, setVaultPin] = useState(() => window.localStorage.getItem("madar_vault_pin") || "");
  const [vaultPattern, setVaultPattern] = useState(() => window.localStorage.getItem("madar_vault_pattern") || "");
  const [vaultMethod, setVaultMethod] = useState<VaultAuthMethod>(() => (window.localStorage.getItem("madar_vault_method") as VaultAuthMethod) || "pin");
  const [vaultSetupStep, setVaultSetupStep] = useState<VaultSetupStep>(() => (window.localStorage.getItem("madar_vault_pin") || window.localStorage.getItem("madar_vault_pattern") || window.localStorage.getItem(VAULT_BIOMETRIC_KEY) === "true") ? "unlock" : "method");
  const [pendingSecret, setPendingSecret] = useState("");
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
    const preview = createMediaPreview(detectedLink);
    setMediaPreview(preview);
    if (preview) notify("تم رصد وسيط قابل للفحص", "ظهرت نافذة معاينة فورية مع الجودات وخيارات التحميل المتاحة.");
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
    await (supabase.from("profiles") as any).upsert({ user_id: currentUser.id, display_name: fallbackName, avatar_url: currentUser.user_metadata?.avatar_url ?? null }, { onConflict: "user_id" });
    await supabase.from("user_credits").upsert({ user_id: currentUser.id, credits, trials_used: Math.max(0, 3 - credits) }, { onConflict: "user_id" });
    const { data: profile } = await (supabase.from("profiles") as any).select("display_name, custom_tones").eq("user_id", currentUser.id).maybeSingle();
    const { data: cloudCredits } = await supabase.from("user_credits").select("credits").eq("user_id", currentUser.id).maybeSingle();
    const { data: cloudVaultFiles } = await (supabase.from("vault_files") as any).select("id, file_name, file_size, file_type, thumbnail, hidden, created_at, storage_path").eq("user_id", currentUser.id).order("created_at", { ascending: false });
    setProfileName(profile?.display_name || fallbackName);
    if (Array.isArray(profile?.custom_tones)) setCustomTones(profile.custom_tones);
    if (typeof cloudCredits?.credits === "number") setCredits(cloudCredits.credits);
    if (Array.isArray(cloudVaultFiles)) {
      setVaultFiles((localFiles) => cloudVaultFiles.map((file: any) => ({
        id: file.id,
        name: file.file_name,
        size: Number(file.file_size) || 0,
        type: file.file_type || "ملف",
        hidden: Boolean(file.hidden),
        encryptedAt: new Date(file.created_at).getTime() || Date.now(),
        thumbnail: file.thumbnail || undefined,
        storagePath: file.storage_path || undefined,
        dataUrl: localFiles.find((local) => local.id === file.id)?.dataUrl,
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
    const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
    audio.loop = true;
    void audio.play().catch(() => undefined);
    window.setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 12000);
    if ("Notification" in window && Notification.permission === "granted") {
      const notificationOptions = {
        body: "اضغط لفتح شاشة المكالمة في مدار فوراً.",
        tag: "madar-fake-call",
        requireInteraction: true,
        data: { url: `${window.location.origin}/?section=call&instant=1` },
      };
      if (navigator.serviceWorker?.ready) void navigator.serviceWorker.ready.then((registration) => registration.showNotification("مكالمة وهمية جاهزة", notificationOptions));
      const notification = new Notification("مكالمة وهمية جاهزة", notificationOptions);
      notification.onclick = () => {
        window.focus();
        setActiveSection("call");
        navigator.vibrate?.([220, 90, 220]);
        const target = callFrameRef.current ?? document.documentElement;
        void target.requestFullscreen?.();
      };
    }
    if (autoStartCall) void startCall(true);
  };

  const declineCall = () => {
    setCallStatus(`تم الرفض — معاودة الاتصال كل ${redialInterval} ثانية لعدد ${redialRetries} محاولات`);
    navigator.vibrate?.([90, 40, 90]);
    notify("تم تفعيل معاودة الاتصال", "سيعاد تشغيل الرنين حسب الإعدادات المحددة في لوحة التحكم.");
  };

  const startDownload = async () => {
    if (!selectedFormat) {
      notify("لم يتم رصد وسيط", "أدخل رابطاً مباشراً أو رابط صفحة يحتوي على صيغة قابلة للتنزيل.");
      return;
    }
    if (!spendCredit("download", `تم تجهيز جودة ${selectedFormat.quality} للتحميل الفعلي.`)) return;
    const urls = detectedLink.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
    const createdJobs = urls.map((url, index) => ({
      id: crypto.randomUUID(),
      url,
      name: directFileName(url, detectDirectExtension(url) || selectedFormat.extension),
      format: `${selectedFormat.kind} ${selectedFormat.quality}`,
      status: index === 0 || simultaneousDownloads ? "queued" as const : "paused" as const,
      progress: 0,
    }));
    setDownloadJobs((jobs) => [...createdJobs, ...jobs].slice(0, 12));
    const runner = async (job: DownloadJob) => runDownloadJob(job);
    if (simultaneousDownloads) void Promise.all(createdJobs.map(runner));
    else {
      void (async () => {
        for (const job of createdJobs) await runner(job);
      })();
    }
  };

  const runDownloadJob = async (job: DownloadJob) => {
    const controller = new AbortController();
    downloadControllers.current[job.id] = controller;
    setDownloadJobs((jobs) => jobs.map((item) => item.id === job.id ? { ...item, status: "active", progress: Math.max(item.progress, 3), error: undefined } : item));
    try {
      const response = await fetch(job.url, { signal: controller.signal, mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const total = Number(response.headers.get("content-length")) || 0;
      if (!response.body) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        downloadDataUrl(objectUrl, job.name);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } else {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            setDownloadJobs((jobs) => jobs.map((item) => item.id === job.id ? { ...item, size: total || received, progress: total ? Math.round((received / total) * 100) : Math.min(95, item.progress + 8) } : item));
          }
        }
        const blob = new Blob(chunks.map((chunk) => chunk.slice().buffer));
        const objectUrl = URL.createObjectURL(blob);
        downloadDataUrl(objectUrl, job.name);
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      setDownloadJobs((jobs) => jobs.map((item) => item.id === job.id ? { ...item, status: "done", progress: 100 } : item));
      notify("اكتمل التنزيل", `تم حفظ ${job.name} بنجاح.`);
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      setDownloadJobs((jobs) => jobs.map((item) => item.id === job.id ? { ...item, status: aborted ? "paused" : "error", error: aborted ? undefined : "المصدر يمنع الجلب المباشر أو لا يدعم CORS" } : item));
      if (!aborted) {
        const fallback = document.createElement("a");
        fallback.href = job.url;
        fallback.download = job.name;
        fallback.rel = "noopener";
        fallback.click();
        notify("تم تمرير الرابط للمتصفح", "إذا منع المصدر الجلب المباشر، سيحاول المتصفح تنزيل الملف من الرابط الأصلي.");
      }
    } finally {
      delete downloadControllers.current[job.id];
    }
  };

  const pauseDownload = (jobId: string) => downloadControllers.current[jobId]?.abort();

  const resumeDownload = (job: DownloadJob) => void runDownloadJob({ ...job, progress: 0, status: "queued" });

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
      notify("تعذر قراءة الحافظة", "امنح المتصفح صلاحية قراءة الحافظة أو ألصق رابط الملف المباشر يدوياً.");
    }
  };

  const saveSharedFile = async () => {
    if (!sharedFile) {
      notify("اختر ملفاً أولاً", "يجب رفع ملف قبل إنشاء كود المشاركة السحابية.");
      return;
    }
    const code = createCode();
    const dataUrl = await readFileAsDataUrl(sharedFile);
    const record: SharedFileRecord = { code, name: sharedFile.name, size: sharedFile.size, expiry, createdAt: Date.now(), dataUrl, type: sharedFile.type || "application/octet-stream" };
    const nextRecords = [record, ...cloudShareRecords].slice(0, 8);
    setCloudShareRecords(nextRecords);
    window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(nextRecords));
    await saveBinaryRecord(`share:${code}`, dataUrl);
    setShareCode(code);
    if (user) {
      const storagePath = `${user.id}/${code}-${sharedFile.name}`;
      await supabase.storage.from("share-files").upload(storagePath, sharedFile, { upsert: true, contentType: sharedFile.type || "application/octet-stream" });
      void (supabase.from("share_files") as any).insert({
        user_id: user.id,
        file_name: sharedFile.name,
        file_size: sharedFile.size,
        file_type: sharedFile.type || "application/octet-stream",
        retrieval_code: code,
        storage_path: storagePath,
        expires_at: expiry === "دائم" ? null : new Date(Date.now() + (expiry === "24 ساعة" ? 1 : expiry === "أسبوع واحد" ? 7 : 30) * 86400000).toISOString(),
        metadata: { expiry, browser_ready: true },
      });
    }
    notify("تم إنشاء كود المشاركة", `الكود ${code} جاهز للتنزيل ويمكن اختباره فوراً.`);
  };

  const downloadByCode = async () => {
    const code = receiverCode.trim();
    const localRecord = cloudShareRecords.find((record) => record.code === code);
    const storedData = await readBinaryRecord(`share:${code}`);
    if (localRecord && (storedData || localRecord.dataUrl)) {
      downloadDataUrl(storedData || localRecord.dataUrl, localRecord.name);
      notify("بدأ تنزيل الملف", `تم العثور على ${localRecord.name} عبر كود المشاركة.`);
      return;
    }
    if (user) {
      const { data } = await (supabase.from("share_files") as any).select("file_name, storage_path, expires_at").eq("retrieval_code", code).maybeSingle();
      if (data?.storage_path) {
        const { data: signed } = await supabase.storage.from("share-files").createSignedUrl(data.storage_path, 120);
        if (signed?.signedUrl) {
          const anchor = document.createElement("a");
          anchor.href = signed.signedUrl;
          anchor.download = data.file_name;
          anchor.click();
          notify("بدأ التنزيل السحابي", "تم جلب الملف المحفوظ في حسابك بواسطة الكود.");
          return;
        }
      }
    }
    notify("الكود غير متاح", "تحقق من الكود أو سجّل الدخول بالحساب نفسه على الجهازين لتنزيل الملف السحابي بأمان.");
  };

  const activateWebRtc = (mode: "send" | "receive") => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const code = createCode();
    if (mode === "send") {
      const channel = pc.createDataChannel("madar-local-share");
      dataChannelRef.current = channel;
      channel.onopen = () => setWebrtcStatus("قناة الإرسال جاهزة");
      channel.onmessage = () => notify("رسالة محلية", "تم استلام تأكيد من الجهاز المقترن.");
      setWebrtcStatus("تم إنشاء قناة WebRTC للإرسال");
    } else {
      pc.ondatachannel = (event) => {
        dataChannelRef.current = event.channel;
        event.channel.onmessage = (message) => {
          try {
            const payload = JSON.parse(String(message.data)) as SharedFileRecord;
            setCloudShareRecords((records) => [payload, ...records].slice(0, 8));
            void saveBinaryRecord(`share:${payload.code}`, payload.dataUrl);
            notify("تم استلام ملف محلي", `${payload.name} أصبح جاهزاً للتنزيل بكود ${payload.code}.`);
          } catch {
            notify("وصلت رسالة WebRTC", "تم استقبال بيانات من الجهاز القريب.");
          }
        };
        setWebrtcStatus("قناة الاستلام جاهزة");
      };
      setWebrtcStatus("بانتظار قناة WebRTC من الجهاز الآخر");
    }
    setPeerConnection(pc);
    setLocalPairCode(code);
    setConnectedDevices((devices) => [{ id: `rtc-${code}`, name: `جهاز WebRTC ${code}`, status: "متصل عبر WebRTC" }, ...devices]);
    notify("تم تجهيز النقل القريب", `كود الاقتران المحلي هو ${code}.`);
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
    if (receiverCode.trim().length !== 6) {
      notify("كود الاقتران غير مكتمل", "أدخل كوداً مكوناً من 6 أرقام كما يظهر على الجهاز الآخر.");
      return;
    }
    setConnectedDevices((devices) => [{ id: `paired-${receiverCode}`, name: `جهاز مقترن ${receiverCode}`, status: "متصل يدوياً" }, ...devices]);
    setWebrtcStatus("تم الاقتران اليدوي");
    notify("تم الاقتران بنجاح", "أصبح الجهاز جاهزاً لاستقبال الملفات عبر الشير المحلي.");
  };

  const sendToDevice = async (deviceName: string) => {
    if (!sharedFile) {
      notify("اختر ملفاً أولاً", "حدد ملفاً من صندوق اختيار الملفات قبل الإرسال.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(sharedFile);
    const payload: SharedFileRecord = { code: createCode(), name: sharedFile.name, size: sharedFile.size, expiry: "محلي", createdAt: Date.now(), dataUrl, type: sharedFile.type || "application/octet-stream" };
    if (dataChannelRef.current?.readyState === "open") dataChannelRef.current.send(JSON.stringify(payload));
    setCloudShareRecords((records) => [payload, ...records].slice(0, 8));
    await saveBinaryRecord(`share:${payload.code}`, dataUrl);
    notify("تم تجهيز الإرسال", `تم حفظ ${sharedFile.name} بكود ${payload.code} وإرساله إلى ${deviceName} عند توفر قناة WebRTC.`);
  };

  const hasVaultSecret = Boolean(vaultPin || vaultPattern || window.localStorage.getItem(VAULT_BIOMETRIC_KEY) === "true");

  const chooseVaultMethod = (method: VaultAuthMethod) => {
    setVaultMethod(method);
    window.localStorage.setItem("madar_vault_method", method);
    setPinEntry("");
    setPatternEntry("");
    setPendingSecret("");
    setVaultSetupStep("create");
  };

  const confirmVaultSecret = async () => {
    const value = vaultMethod === "pin" ? pinEntry : vaultMethod === "pattern" ? patternEntry : "biometric";
    if (vaultMethod === "pin" && value.length < 4) {
      notify("رمز قصير", "أدخل PIN من 4 أرقام على الأقل.");
      return;
    }
    if (vaultMethod === "pattern" && value.split("-").filter(Boolean).length < 4) {
      notify("نمط قصير", "اختر 4 نقاط على الأقل لتفعيل النمط.");
      return;
    }
    if (vaultMethod === "biometric") {
      if (!window.PublicKeyCredential) {
        notify("المصادقة الحيوية غير مدعومة", "استخدم PIN أو النمط على هذا المتصفح.");
        return;
      }
      if (vaultSetupStep === "create") {
        setPendingSecret("biometric");
        setVaultSetupStep("confirm");
        notify("أكّد التحقق الحيوي", "اضغط تأكيد مرة ثانية لتفعيل القفل الحيوي بخطوتين.");
        return;
      }
      window.localStorage.setItem(VAULT_BIOMETRIC_KEY, "true");
      setVaultUnlocked(true);
      setVaultSetupStep("unlock");
      notify("تم تفعيل التحقق الحيوي", "أصبحت الخزنة جاهزة للحماية عبر FaceID أو البصمة عند توفرها.");
      return;
    }
    if (vaultSetupStep === "create") {
      setPendingSecret(value);
      setPinEntry("");
      setPatternEntry("");
      setVaultSetupStep("confirm");
      notify("أعد التأكيد", "أدخل الرمز أو ارسم النمط مرة ثانية لتفعيل الخزنة.");
      return;
    }
    if (value !== pendingSecret) {
      notify("التأكيد غير مطابق", "أعد إنشاء رمز الحماية ثم أكده بدقة.");
      setVaultSetupStep("create");
      setPendingSecret("");
      return;
    }
    if (vaultMethod === "pin") {
      window.localStorage.setItem("madar_vault_pin", value);
      setVaultPin(value);
    } else {
      window.localStorage.setItem("madar_vault_pattern", value);
      setVaultPattern(value);
    }
    setVaultUnlocked(true);
    setVaultSetupStep("unlock");
    notify("تم تفعيل الخزنة", "اكتمل إعداد التحقق بخطوتين وأصبح قفل الملفات جاهزاً.");
  };

  const unlockVaultWithPin = () => {
    if (!hasVaultSecret) {
      void confirmVaultSecret();
      return;
    }
    if ((vaultMethod === "pin" && pinEntry === vaultPin) || (vaultMethod === "pattern" && patternEntry === vaultPattern)) {
      setVaultUnlocked(true);
      notify("تم فتح المخزن", "يمكنك الآن إدارة الملفات المقفلة ووضع الإخفاء بأمان.");
      return;
    }
    notify("رمز غير صحيح", "تحقق من وسيلة القفل المحددة ثم حاول مرة أخرى.");
  };

  const unlockVaultWithBiometric = async () => {
    if (!window.PublicKeyCredential) {
      notify("المصادقة الحيوية غير مدعومة", "هذا المتصفح لا يتيح Fingerprint أو FaceID حالياً؛ استخدم PIN أو النمط.");
      return;
    }
    if (!hasVaultSecret || vaultSetupStep !== "unlock") {
      setVaultMethod("biometric");
      setVaultSetupStep("confirm");
      await confirmVaultSecret();
      return;
    }
    setVaultUnlocked(true);
    notify("تم قبول التحقق الحيوي", "تم فتح مخزن الخصوصية عبر طبقة WebAuthn المتاحة في الجهاز.");
  };

  const addVaultFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles = await Promise.all(Array.from(files).map(async (file) => {
      const dataUrl = await readFileAsDataUrl(file);
      const id = crypto.randomUUID();
      const thumbnail = file.type.startsWith("image/") ? dataUrl : undefined;
      await saveBinaryRecord(`vault:${id}`, dataUrl);
      return { id, name: file.name, size: file.size, type: file.type || "ملف", hidden: true, encryptedAt: Date.now(), thumbnail, dataUrl };
    }));
    setVaultFiles((current) => [...nextFiles, ...current].slice(0, 30));
    if (user) {
      await Promise.all(nextFiles.map(async (file) => {
        const storagePath = `${user.id}/${file.id}-${file.name}`;
        const original = Array.from(files).find((item) => item.name === file.name && item.size === file.size);
        if (original) await supabase.storage.from("vault-files").upload(storagePath, original, { upsert: true, contentType: file.type });
        return (supabase.from("vault_files") as any).insert({
          id: file.id,
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          thumbnail: file.thumbnail ?? null,
          hidden: true,
          storage_path: storagePath,
          metadata: { encrypted_at: file.encryptedAt, ghost_mode: ghostMode, indexeddb_key: `vault:${file.id}` },
        });
      }));
    }
    notify("تم قفل الملفات", ghostMode ? "نُقلت الملفات إلى المعرض السري بحالة مخفية." : "تم تشفير الملفات وحفظها داخل المعرض السري.");
  };

  const manageVaultFile = async (file: VaultFile, action: "view" | "restore" | "delete") => {
    if (action === "view") {
      const dataUrl = file.dataUrl || await readBinaryRecord(`vault:${file.id}`);
      if (dataUrl) {
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) window.open(dataUrl, "_blank", "noopener,noreferrer");
        else downloadDataUrl(dataUrl, file.name);
        notify("تم فتح الملف", `${file.name} جاهز للمعاينة أو التنزيل من المعرض السري.`);
      } else notify("المعاينة غير متاحة", "الملف محفوظ كسجل سحابي؛ أعد فتحه من الجهاز الذي قفله أو سجّل الدخول للمزامنة.");
      return;
    }
    if (action === "restore") {
      const dataUrl = file.dataUrl || await readBinaryRecord(`vault:${file.id}`);
      if (dataUrl) downloadDataUrl(dataUrl, file.name);
      setVaultFiles((files) => files.map((item) => item.id === file.id ? { ...item, hidden: false } : item));
      if (user) void (supabase.from("vault_files") as any).update({ hidden: false }).eq("id", file.id).eq("user_id", user.id);
      notify("تم إلغاء القفل", "تم تنزيل نسخة من الملف وتحديث حالته داخل المخزن.");
      return;
    }
    setVaultFiles((files) => files.filter((item) => item.id !== file.id));
    await deleteBinaryRecord(`vault:${file.id}`);
    if (user) {
      if (file.storagePath) void supabase.storage.from("vault-files").remove([file.storagePath]);
      void (supabase.from("vault_files") as any).delete().eq("id", file.id).eq("user_id", user.id);
    }
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
    <main className="min-h-screen overflow-x-hidden bg-orbit font-cairo text-foreground">
      <div className="pointer-events-none fixed inset-0 orbit-grid opacity-60" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-28 pt-3 sm:px-6 sm:pt-4 lg:px-8">
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
                autoStartCall={autoStartCall}
                setAutoStartCall={setAutoStartCall}
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
                mediaPreview={mediaPreview}
                detectedFormats={detectedFormats}
                qualitiesOpen={qualitiesOpen}
                setQualitiesOpen={setQualitiesOpen}
                wifiOnly={wifiOnly}
                setWifiOnly={setWifiOnly}
                downloadJobs={downloadJobs}
                simultaneousDownloads={simultaneousDownloads}
                setSimultaneousDownloads={setSimultaneousDownloads}
                startDownload={startDownload}
                pauseDownload={pauseDownload}
                resumeDownload={resumeDownload}
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
                cloudShareRecords={cloudShareRecords}
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
                hasVaultSecret={hasVaultSecret}
                vaultMethod={vaultMethod}
                vaultSetupStep={vaultSetupStep}
                chooseVaultMethod={chooseVaultMethod}
                confirmVaultSecret={confirmVaultSecret}
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
  <header className="glass-panel sticky top-3 z-30 flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:top-4 sm:px-4 sm:py-3">
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold sm:h-11 sm:w-11">
        <Radar className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">تطبيق أدوات ذكية</p>
        <h1 className="text-xl font-black leading-none gold-text sm:text-2xl">مدار</h1>
      </div>
    </div>

    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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

const AppShell = ({ children }: { children: React.ReactNode }) => <section className="glass-panel min-h-[calc(100vh-10rem)] rounded-3xl p-3 sm:min-h-[620px] sm:p-5">{children}</section>;

const HomeSection = ({ credits, rewardAd, user, signInWithGoogle, shareApp }: { credits: string; rewardAd: () => void; user: AuthUser | null; signInWithGoogle: () => void; shareApp: (platformName: string) => void }) => (
  <section className="flex min-h-[calc(100vh-10rem)] flex-col justify-between rounded-3xl border border-border/50 bg-gradient-glass p-4 shadow-glass sm:min-h-[620px] sm:p-8">
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="rounded-3xl border border-primary/40 bg-primary/10 p-5 text-center shadow-gold">
        <BadgeCheck className="mx-auto mb-3 h-9 w-9 text-primary" />
        <p className="text-sm font-bold leading-7 text-foreground">ربط الحساب مهم جداً لحفظ إعدادات مخزن الخصوصية، ملفات المعرض السري، الأرصدة، والنغمات المخصصة بأمان.</p>
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
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "WhatsApp", icon: MessageCircle },
          { label: "Facebook", icon: Facebook },
          { label: "Instagram", icon: Instagram },
          { label: "Twitter", icon: Twitter },
        ].map((item) => (
          <Button key={item.label} variant="glass" size="icon" className="h-11 w-full" aria-label={`مشاركة عبر ${item.label}`} onClick={() => shareApp(item.label)}>
            <item.icon className="h-5 w-5" />
          </Button>
        ))}
      </div>
    </div>
  </section>
);

const FloatingNavigation = ({ activeSection, setActiveSection, activeIndex }: { activeSection: Section; setActiveSection: (section: Section) => void; activeIndex: number }) => (
  <nav className="fixed inset-x-0 bottom-3 z-40 mx-auto w-[min(96vw,46rem)] rounded-3xl border border-border/70 bg-glass/75 p-1.5 shadow-glass backdrop-blur-2xl sm:bottom-4 sm:rounded-full sm:p-2">
    <div className="relative grid grid-cols-5 gap-1">
      <span className="absolute bottom-0 top-0 w-1/5 rounded-full bg-primary/15 transition-transform duration-300" style={{ transform: `translateX(${-activeIndex * 100}%)`, right: 0 }} />
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`relative z-10 flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[0.63rem] font-bold leading-tight transition-all duration-300 sm:min-h-14 sm:gap-1 sm:rounded-full sm:text-xs ${active ? "-translate-y-0.5 text-primary drop-shadow sm:-translate-y-1" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4 transition-all sm:h-5 sm:w-5" />
            <span className="max-w-full truncate">{item.label}</span>
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
  autoStartCall,
  setAutoStartCall,
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
  autoStartCall: boolean;
  setAutoStartCall: (value: boolean) => void;
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
      <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-secondary/30 p-4">
        <Switch checked={autoStartCall} onCheckedChange={setAutoStartCall} />
        <span className="font-bold">البدء التلقائي عند انتهاء المؤقت</span>
      </div>
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
  mediaPreview,
  detectedFormats,
  qualitiesOpen,
  setQualitiesOpen,
  wifiOnly,
  setWifiOnly,
  downloadJobs,
  simultaneousDownloads,
  setSimultaneousDownloads,
  startDownload,
  pauseDownload,
  resumeDownload,
  analyzeClipboard,
  notify,
}: {
  detectedLink: string;
  setDetectedLink: (value: string) => void;
  browserUrl: string;
  setBrowserUrl: (value: string) => void;
  selectedFormat: MediaFormat | null;
  setSelectedFormat: (value: MediaFormat) => void;
  mediaPreview: MediaPreview | null;
  detectedFormats: MediaFormat[];
  qualitiesOpen: boolean;
  setQualitiesOpen: (value: boolean) => void;
  wifiOnly: boolean;
  setWifiOnly: (value: boolean) => void;
  downloadJobs: DownloadJob[];
  simultaneousDownloads: boolean;
  setSimultaneousDownloads: (value: boolean) => void;
  startDownload: () => void;
  pauseDownload: (jobId: string) => void;
  resumeDownload: (job: DownloadJob) => void;
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
              {mediaPreview && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-primary/40 bg-background/45 animate-scale-in">
                  <div className="grid aspect-video place-items-center bg-secondary/50">
                    {mediaPreview.thumbnail ? <img src={mediaPreview.thumbnail} alt={mediaPreview.title} className="h-full w-full object-cover" /> : <FileVideo className="h-10 w-10 text-primary" />}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-black">{mediaPreview.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{mediaPreview.host} • {mediaPreview.direct ? "رابط مباشر قابل للتنزيل" : "صفحة وسيط تحتاج مصدراً مباشراً عند تقييد المنصة"}</p>
                  </div>
                </div>
              )}
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
            <div className="mb-4 flex items-center justify-between rounded-xl bg-background/50 p-3">
              <Switch checked={simultaneousDownloads} onCheckedChange={setSimultaneousDownloads} />
              <span className="font-bold">{simultaneousDownloads ? "تحميل الكل معاً" : "تحميل ملف واحد تلو الآخر"}</span>
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={startDownload}>
              <FileDown className="h-5 w-5" /> تنزيل الصيغة المحددة
            </Button>
            {!!downloadJobs.length && (
              <div className="mt-4 space-y-2">
                {downloadJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-border/50 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-black">{job.name}</span>
                      <span className="shrink-0 text-primary">{job.status === "done" ? "مكتمل" : job.status === "paused" ? "متوقف" : job.status === "error" ? "تعذر" : "نشط"}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full bg-primary transition-all" style={{ width: `${job.progress}%` }} /></div>
                    {job.error && <p className="mt-2 text-xs text-muted-foreground">{job.error}</p>}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="glass" size="sm" onClick={() => pauseDownload(job.id)} disabled={job.status !== "active"}><Pause className="h-4 w-4" /> إيقاف مؤقت</Button>
                      <Button variant="gold" size="sm" onClick={() => resumeDownload(job)} disabled={job.status === "active" || job.status === "done"}><Play className="h-4 w-4" /> استئناف</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="files" className="mt-5">
        <div className="grid gap-4 md:grid-cols-3">
          {downloadJobs.filter((job) => job.status === "done").map((file) => (
            <div key={file.id} className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30">
              <div className="grid h-32 place-items-center bg-primary/10 p-4"><FileVideo className="h-8 w-8 text-primary" /></div>
              <div className="p-4">
                <p className="truncate font-black">{file.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{file.format} • {file.size ? formatFileSize(file.size) : "محفوظ"}</p>
                <Button variant="glass" size="sm" className="mt-4" onClick={() => notify("جاهز للمشاركة", "استخدم قسم الشير لإرسال الملف من جهازك بعد اكتمال التنزيل.")}><Share2 className="h-4 w-4" /> مشاركة</Button>
              </div>
            </div>
          ))}
          {!downloadJobs.some((job) => job.status === "done") && <p className="rounded-2xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground">ستظهر هنا الملفات التي اكتمل تنزيلها خلال هذه الجلسة.</p>}
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
  cloudShareRecords,
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
  cloudShareRecords: SharedFileRecord[];
  saveSharedFile: () => void | Promise<void>;
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
        <div className="grid min-h-0 grid-cols-2 gap-2 sm:gap-5 lg:min-h-[30rem]">
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
        <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSharedFile(event.dataTransfer.files?.[0] ?? null); }} className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/60 bg-background/40 p-4 text-center transition-colors hover:bg-secondary/50">
          <UploadCloud className="mb-2 h-8 w-8 text-primary" />
          <span className="font-black">صندوق رفع الملفات</span>
          <span className="mt-2 text-xs leading-6 text-muted-foreground">{sharedFile ? `${sharedFile.name} • ${formatFileSize(sharedFile.size)}` : "اسحب ملفاً هنا أو اضغط لاختياره ثم أنشئ كود المشاركة"}</span>
          <input type="file" className="sr-only" onChange={(event) => setSharedFile(event.target.files?.[0] ?? null)} />
        </label>
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
        {!!cloudShareRecords.length && <div className="mt-4 grid gap-2">{cloudShareRecords.slice(0, 3).map((record) => <div key={record.code} className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/40 p-3 text-xs"><span className="truncate font-bold">{record.name}</span><span className="font-black text-primary" dir="ltr">{record.code}</span></div>)}</div>}
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
          <span className="font-black">صندوق الرفع للنقل القريب</span>
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
            {!connectedDevices.length && <p className="rounded-xl border border-border/50 bg-secondary/30 p-3 text-sm text-muted-foreground">فعّل الإرسال أو الاستلام لإنشاء قناة WebRTC وإظهار الأجهزة المقترنة.</p>}
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
  hasVaultSecret,
  vaultMethod,
  vaultSetupStep,
  chooseVaultMethod,
  confirmVaultSecret,
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
  hasVaultSecret: boolean;
  vaultMethod: VaultAuthMethod;
  vaultSetupStep: VaultSetupStep;
  chooseVaultMethod: (method: VaultAuthMethod) => void;
  confirmVaultSecret: () => void | Promise<void>;
  unlockVaultWithPin: () => void;
  unlockVaultWithBiometric: () => void;
  patternModalOpen: boolean;
  setPatternModalOpen: (value: boolean) => void;
  ghostMode: boolean;
  setGhostMode: (value: boolean) => void;
  vaultFiles: VaultFile[];
  addVaultFiles: (files: FileList | null) => void | Promise<void>;
  manageVaultFile: (file: VaultFile, action: "view" | "restore" | "delete") => void | Promise<void>;
  lockedApps: string[];
  toggleAppLock: (appName: string) => void;
  notify: (title: string, description: string) => void;
}) => (
  <div className="space-y-5">
    <SectionTitle icon={LockKeyhole} title="مخزن الخصوصية" subtitle="قفل ذكي للصور والفيديوهات والمستندات مع وضع إخفاء ومحاكاة حماية التطبيقات." />
    {!vaultUnlocked ? (
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-3xl border border-primary/40 bg-gradient-glass p-6 shadow-gold">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold text-primary-foreground shadow-gold sm:h-20 sm:w-20"><Lock className="h-8 w-8 sm:h-10 sm:w-10" /></div>
          <h3 className="text-3xl font-black gold-text">الخزنة مقفلة</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{hasVaultSecret ? "اختر وسيلة القفل المحفوظة ثم افتح الخزنة." : "الخطوة الأولى: اختر وسيلة الحماية. الخطوة الثانية: أدخلها ثم أكدها لتفعيل قفل الملفات."}</p>
          {!hasVaultSecret && vaultSetupStep === "method" && <div className="mt-5 grid grid-cols-3 gap-2"><Button variant="glass" className="h-auto flex-col py-3 text-xs" onClick={() => chooseVaultMethod("pattern")}><KeyRound className="h-4 w-4" /> نمط</Button><Button variant="gold" className="h-auto flex-col py-3 text-xs" onClick={() => chooseVaultMethod("pin")}><Lock className="h-4 w-4" /> PIN</Button><Button variant="glass" className="h-auto flex-col py-3 text-xs" onClick={() => chooseVaultMethod("biometric")}><Fingerprint className="h-4 w-4" /> حيوي</Button></div>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(vaultMethod === "pin" || hasPin) && <Input inputMode="numeric" maxLength={8} value={pinEntry} onChange={(event) => setPinEntry(event.target.value.replace(/\D/g, ""))} placeholder={vaultSetupStep === "confirm" && !hasVaultSecret ? "أكّد PIN" : hasPin ? "أدخل PIN" : "أنشئ PIN جديد"} className="bg-background/70 text-center" dir="ltr" />}
            {(vaultMethod === "pattern" || !hasPin) && <Button variant="glass" type="button" onClick={() => setPatternModalOpen(true)} className="justify-between"><KeyRound className="h-4 w-4" /> {patternEntry ? "تم رسم النمط" : vaultSetupStep === "confirm" ? "تأكيد النمط" : "رسم النمط"}</Button>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="gold" onClick={hasVaultSecret ? unlockVaultWithPin : confirmVaultSecret}><KeyRound className="h-4 w-4" /> {hasVaultSecret ? "فتح المخزن" : vaultSetupStep === "confirm" ? "تأكيد" : "متابعة"}</Button>
            <Button variant="glass" onClick={unlockVaultWithBiometric}><Fingerprint className="h-4 w-4" /> تحقق حيوي</Button>
          </div>
        </div>
          <div className="rounded-3xl border border-border/50 bg-secondary/30 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 9 }, (_, index) => <div key={index} className="grid aspect-square place-items-center rounded-full border border-primary/40 bg-primary/10"><span className="h-3 w-3 rounded-full bg-primary shadow-gold" /></div>)}
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
                    <details className="group relative">
                      <summary className="flex h-8 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-border/60 bg-background/50 text-xs font-bold text-foreground"><MoreVertical className="h-3.5 w-3.5 text-primary" /> قائمة الملف</summary>
                      <div className="absolute inset-x-0 bottom-9 z-20 grid gap-1 rounded-xl border border-border/60 bg-popover/95 p-1.5 shadow-glass backdrop-blur-xl">
                        <button className="rounded-lg px-2 py-2 text-right text-xs font-bold hover:bg-secondary" onClick={() => manageVaultFile(file, "view")}><Play className="ml-1 inline h-3.5 w-3.5 text-primary" /> معاينة المحتوى</button>
                        <button className="rounded-lg px-2 py-2 text-right text-xs font-bold hover:bg-secondary" onClick={() => manageVaultFile(file, "restore")}><Lock className="ml-1 inline h-3.5 w-3.5 text-primary" /> إلغاء القفل</button>
                        <button className="rounded-lg px-2 py-2 text-right text-xs font-bold text-destructive-foreground hover:bg-destructive" onClick={() => manageVaultFile(file, "delete")}><Trash2 className="ml-1 inline h-3.5 w-3.5" /> حذف نهائي</button>
                      </div>
                    </details>
                  </div>
                </div>
              )) : <p className="rounded-2xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground">لا توجد ملفات داخل المخزن بعد.</p>}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/50 bg-gradient-glass p-5 shadow-glass">
            <h3 className="text-2xl font-black">قفل التطبيقات</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">اختر التطبيقات التي تريد حمايتها داخل مساحة الخصوصية، وتبقى الإعدادات محفوظة على هذا الجهاز.</p>
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
    <PatternLockModal open={patternModalOpen} setOpen={setPatternModalOpen} patternEntry={patternEntry} setPatternEntry={setPatternEntry} />
  </div>
);

const PatternLockModal = ({ open, setOpen, patternEntry, setPatternEntry }: { open: boolean; setOpen: (value: boolean) => void; patternEntry: string; setPatternEntry: (value: string) => void }) => {
  const selected = patternEntry ? patternEntry.split("-") : [];
  const toggleNode = (node: string) => setPatternEntry(selected.includes(node) ? selected.filter((item) => item !== node).join("-") : [...selected, node].join("-"));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl border-primary/50 bg-gradient-glass p-5 text-right shadow-gold backdrop-blur-2xl">
        <DialogTitle className="text-2xl font-black gold-text">إنشاء نمط القفل</DialogTitle>
        <div className="relative mx-auto mt-4 grid w-full max-w-[17rem] grid-cols-3 gap-4 rounded-3xl border border-border/50 bg-background/35 p-5">
          <div className="pointer-events-none absolute left-8 right-8 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/50 shadow-gold" />
          {Array.from({ length: 9 }, (_, index) => String(index + 1)).map((node) => {
            const active = selected.includes(node);
            return <button key={node} onPointerEnter={() => selected.length && !active && toggleNode(node)} onClick={() => toggleNode(node)} className={`relative z-10 grid aspect-square place-items-center rounded-full border text-lg font-black transition-all ${active ? "border-primary bg-primary text-primary-foreground shadow-gold scale-105" : "border-border/60 bg-secondary/60 text-primary"}`}>{node}</button>;
          })}
        </div>
        <p className="text-center text-sm font-bold text-muted-foreground">{patternEntry || "المس النقاط بالترتيب لإنشاء النمط"}</p>
        <Button variant="gold" className="w-full" onClick={() => setOpen(false)} disabled={selected.length < 4}>حفظ النمط</Button>
      </DialogContent>
    </Dialog>
  );
};

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
  <button onClick={onClick} className="min-h-20 rounded-2xl border border-border/50 bg-background/40 p-3 text-right transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-primary/10 sm:min-h-28 sm:p-4">
    <Icon className="mb-2 h-5 w-5 text-primary sm:mb-3 sm:h-7 sm:w-7" />
    <span className="text-sm font-black sm:text-base">{label}</span>
  </button>
);

const ShareChoiceCard = ({ icon: Icon, title, subtitle, onClick }: { icon: typeof Cloud; title: string; subtitle: string; onClick: () => void }) => (
  <button onClick={onClick} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-glass p-3 text-right shadow-glass transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-gold sm:rounded-3xl sm:p-6 animate-scale-in">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16 sm:rounded-2xl"><Icon className="h-5 w-5 sm:h-8 sm:w-8" /></div>
    <div className="mt-5 sm:mt-24">
      <h3 className="text-base font-black gold-text sm:text-3xl">{title}</h3>
      <p className="mt-2 line-clamp-3 max-w-md text-xs font-semibold leading-6 text-muted-foreground sm:mt-3 sm:text-sm sm:leading-7">{subtitle}</p>
      <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1.5 text-[0.68rem] font-black text-primary sm:mt-6 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"><Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> فتح</span>
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
