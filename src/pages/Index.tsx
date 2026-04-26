import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  Bluetooth,
  CalendarClock,
  CheckCircle2,
  ChevronUp,
  Chrome,
  Cloud,
  Copy,
  Download,
  Facebook,
  FileAudio,
  FileVideo,
  FolderOpen,
  Gauge,
  Gift,
  Globe2,
  HardDriveDownload,
  Info,
  Instagram,
  Link2,
  LogIn,
  Moon,
  MoreVertical,
  Music,
  Phone,
  PhoneCall,
  PhoneMissed,
  Play,
  Radar,
  RefreshCcw,
  Search,
  Settings,
  Share2,
  Shield,
  Signal,
  Smartphone,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
  Vibrate,
  Wifi,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

type Section = "call" | "download" | "share";
type PaidAction = "call" | "download";
type Platform = "android" | "ios";

const CREDIT_COST: Record<PaidAction, number> = { call: 1, download: 1 };

const qualityRows = [
  { format: "فيديو", quality: "2160p", size: "1.8 غ.ب", speed: "مرتفع", icon: FileVideo },
  { format: "فيديو", quality: "1080p", size: "742 م.ب", speed: "متوازن", icon: FileVideo },
  { format: "فيديو", quality: "720p", size: "386 م.ب", speed: "سريع", icon: FileVideo },
  { format: "صوت", quality: "320kbps", size: "12 م.ب", speed: "فوري", icon: FileAudio },
];

const downloadedFiles = [
  { title: "مقطع تعليمي عالي الدقة", type: "فيديو", size: "386 م.ب", source: "يوتيوب", tone: "from-primary/25" },
  { title: "ملف صوتي نقي", type: "صوت", size: "12 م.ب", source: "إنستغرام", tone: "from-accent/25" },
  { title: "لقطة قصيرة للمعاينة", type: "فيديو", size: "74 م.ب", source: "تيك توك", tone: "from-warning/25" },
];

const navItems: Array<{ id: Section; label: string; icon: typeof PhoneCall }> = [
  { id: "call", label: "مكالمة وهمية", icon: PhoneCall },
  { id: "download", label: "التحميل", icon: Download },
  { id: "share", label: "الشير", icon: Signal },
];

const storageNumber = (key: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
};

const Index = () => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("download");
  const [credits, setCredits] = useState(() => storageNumber("madar_credits", 3));
  const [darkMode, setDarkMode] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [platform, setPlatform] = useState<Platform>("android");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [callStatus, setCallStatus] = useState("لوحة التحكم جاهزة");
  const [detectedLink, setDetectedLink] = useState("https://social.example/reel/madar-demo");
  const [browserUrl, setBrowserUrl] = useState("https://example.com");
  const [callDelay, setCallDelay] = useState("1");
  const [redialInterval, setRedialInterval] = useState("30");
  const [redialRetries, setRedialRetries] = useState("3");
  const [ringtone, setRingtone] = useState("نغمة النظام الهادئة");
  const [expiry, setExpiry] = useState("أسبوع واحد");

  useEffect(() => {
    window.localStorage.setItem("madar_credits", String(credits));
  }, [credits]);

  const activeIndex = navItems.findIndex((item) => item.id === activeSection);
  const creditLabel = useMemo(() => `${credits} رصيد`, [credits]);

  const notify = (title: string, description: string) => toast({ title, description });

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

  const startCall = async () => {
    if (!spendCredit("call", "تم تجهيز المكالمة الوهمية ومزامنة الرنين والاهتزاز.")) return;
    setCallStatus(`ستبدأ المكالمة بعد ${callDelay} دقيقة وفق ملف ${platform === "ios" ? "آي أو إس" : "أندرويد"}`);
    if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      notify("تعذر تفعيل ملء الشاشة", "يمكن تشغيل الواجهة داخل المتصفح مع بقاء عناصر التحكم متاحة.");
    }
  };

  const declineCall = () => {
    setCallStatus(`تم الرفض — معاودة الاتصال كل ${redialInterval} ثانية لعدد ${redialRetries} محاولات`);
    notify("تم تفعيل معاودة الاتصال", "سيعاد تشغيل الرنين حسب الإعدادات المحددة في لوحة التحكم.");
  };

  const startDownload = () => {
    if (!spendCredit("download", `بدأ تجهيز ملف بجودة ${selectedQuality} مع تقدير الحجم قبل الحفظ.`)) return;
    notify("بدأ التنزيل الآمن", wifiOnly ? "سيتم تعليق النقل حتى تتوفر شبكة Wi‑Fi مستقرة." : "تم السماح بالتنزيل عبر الاتصال المتاح حالياً.");
  };

  const rewardAd = () => {
    notify("بدأ إعلان المكافأة", "بعد 5 ثوانٍ ستضاف 5 أرصدة إضافية إلى حسابك.");
    window.setTimeout(() => {
      setCredits((current) => current + 5);
      toast({ title: "تمت إضافة المكافأة", description: "حصلت على 5 أرصدة إضافية بنجاح." });
    }, 5000);
  };

  const cleanCache = () => {
    window.localStorage.clear();
    setCredits(3);
    setDetectedLink("");
    setBrowserUrl("");
    notify("تم تشغيل ماسح الملفات المؤقتة", "أُزيلت بيانات التخزين المحلي وروابط الوسائط المؤقتة بأمان.");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-orbit font-cairo text-foreground">
      <div className="pointer-events-none fixed inset-0 orbit-grid opacity-60" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <Header credits={creditLabel} darkMode={darkMode} setDarkMode={setDarkMode} cleanCache={cleanCache} notify={notify} />

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[0.34fr_0.66fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="glass-panel rounded-2xl p-5">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-primary" /> واجهة عربية فصحى بالكامل
              </div>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                مدار <span className="gold-text">للأدوات الذكية</span>
              </h1>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                تطبيق فاخر يجمع المكالمة الوهمية، التحميل الذكي، والشير المجاني ضمن تجربة زجاجية داكنة قابلة للتجهيز لاحقاً لتطبيق جوال.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <Metric icon={Sparkles} label="الرصيد" value={creditLabel} />
              <Metric icon={Gift} label="للمستخدم الجديد" value="3 أرصدة" />
              <Metric icon={Wifi} label="الشير" value="مجاني" />
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold">نظام المكافآت</span>
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <p className="mb-4 text-sm leading-7 text-muted-foreground">شاهد إعلاناً لمدة 5 ثوانٍ لتحصل على 5 أرصدة إضافية. قسم الشير لا يستهلك الرصيد.</p>
              <Button variant="gold" className="w-full" onClick={rewardAd}>
                <Gift className="h-4 w-4" /> شاهد إعلاناً للحصول على 5 أرصدة إضافية
              </Button>
            </div>
          </aside>

          <section className="glass-panel min-h-[620px] rounded-3xl p-3 sm:p-5">
            {activeSection === "call" && (
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
                setRingtone={setRingtone}
              />
            )}
            {activeSection === "download" && (
              <DownloaderHub
                detectedLink={detectedLink}
                setDetectedLink={setDetectedLink}
                browserUrl={browserUrl}
                setBrowserUrl={setBrowserUrl}
                selectedQuality={selectedQuality}
                setSelectedQuality={setSelectedQuality}
                wifiOnly={wifiOnly}
                setWifiOnly={setWifiOnly}
                startDownload={startDownload}
                notify={notify}
              />
            )}
            {activeSection === "share" && <SmartShare notify={notify} expiry={expiry} setExpiry={setExpiry} />}
          </section>
        </section>
      </div>

      <FloatingNavigation activeSection={activeSection} setActiveSection={setActiveSection} activeIndex={activeIndex} />
    </main>
  );
};

const Header = ({
  credits,
  darkMode,
  setDarkMode,
  cleanCache,
  notify,
}: {
  credits: string;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  cleanCache: () => void;
  notify: (title: string, description: string) => void;
}) => (
  <header className="glass-panel sticky top-4 z-30 flex items-center justify-between rounded-2xl px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
        <Radar className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">تطبيق أدوات ذكية</p>
        <h2 className="text-2xl font-black leading-none gold-text">مدار</h2>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-sm font-bold sm:flex">
        <Sparkles className="h-4 w-4 text-primary" />
        {credits}
      </div>
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
            <SettingsRow icon={Chrome} title="تسجيل الدخول عبر Google" description="مسار اجتماعي جاهز للربط الآمن." action={() => notify("تسجيل Google", "تم تجهيز مسار تسجيل الدخول الاجتماعي للتفعيل الخلفي.")} />
            <SettingsRow icon={Facebook} title="تسجيل الدخول عبر Facebook" description="يمكن ربط المزود عند تفعيل الهوية." action={() => notify("تسجيل Facebook", "سيتم ربط المزود عند تفعيل خدمة الهوية.")} />
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

const FloatingNavigation = ({ activeSection, setActiveSection, activeIndex }: { activeSection: Section; setActiveSection: (section: Section) => void; activeIndex: number }) => (
  <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[min(92vw,31rem)] rounded-full border border-border/70 bg-glass/75 p-2 shadow-glass backdrop-blur-2xl">
    <div className="relative grid grid-cols-3 gap-1">
      <span className="absolute bottom-0 top-0 w-1/3 rounded-full bg-primary/15 transition-transform duration-300" style={{ transform: `translateX(${-activeIndex * 100}%)`, right: 0 }} />
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = activeSection === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`relative z-10 flex min-h-14 flex-col items-center justify-center gap-1 rounded-full text-xs font-bold transition-all duration-300 ${active ? "-translate-y-1 text-primary drop-shadow" : "text-muted-foreground"}`}
          >
            <Icon className={`h-5 w-5 transition-all ${active ? "drop-shadow" : ""}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

const Metric = ({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) => (
  <div className="glass-panel rounded-2xl p-4 transition-transform hover:-translate-y-1">
    <Icon className="mb-3 h-5 w-5 text-primary" />
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-black sm:text-xl">{value}</p>
  </div>
);

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
  setRingtone,
}: {
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  callStatus: string;
  startCall: () => void;
  declineCall: () => void;
  callDelay: string;
  setCallDelay: (value: string) => void;
  redialInterval: string;
  setRedialInterval: (value: string) => void;
  redialRetries: string;
  setRedialRetries: (value: string) => void;
  ringtone: string;
  setRingtone: (value: string) => void;
}) => (
  <div className="grid gap-5 lg:grid-cols-[1fr_0.86fr]">
    <div className="space-y-4">
      <SectionTitle icon={Phone} title="لوحة المكالمة الوهمية" subtitle="لوحة كاملة للتحكم في التوقيت، النظام، الرنين، والاهتزاز." />
      <Button variant="gold" size="lg" className="w-full" onClick={startCall}>
        <PhoneCall className="h-5 w-5" /> ابدأ المكالمة الآن
      </Button>
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
          <Button variant={platform === "ios" ? "gold" : "glass"} onClick={() => setPlatform("ios")}>آي أو إس</Button>
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
            <option>نغمة آي أو إس الكلاسيكية</option>
            <option>نغمة أندرويد الرسمية</option>
          </select>
          <Button variant="glass"><Music className="h-4 w-4" /> تحميل نغمة مخصصة</Button>
        </div>
      </ControlPanel>
    </div>
    <div className="mx-auto w-full max-w-sm">
      <div className={`relative min-h-[560px] overflow-hidden rounded-[2rem] border ${platform === "ios" ? "border-gold/70" : "border-accent/70"} bg-background/90 p-5 shadow-glass`}>
        <div className="mx-auto mb-8 h-6 w-24 rounded-full bg-secondary" />
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold animate-pulse-gold">
            <BellRing className="h-10 w-10" />
          </div>
          <p className="text-sm text-muted-foreground">مكالمة واردة</p>
          <h3 className="mt-2 text-3xl font-black">سارة الأعمال</h3>
          <p className="mt-1 text-sm text-muted-foreground" dir="ltr">+966 55 240 7712</p>
          <p className="mt-5 rounded-xl border border-border/50 bg-secondary/60 px-3 py-3 text-sm text-primary">{callStatus}</p>
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
  selectedQuality,
  setSelectedQuality,
  wifiOnly,
  setWifiOnly,
  startDownload,
  notify,
}: {
  detectedLink: string;
  setDetectedLink: (value: string) => void;
  browserUrl: string;
  setBrowserUrl: (value: string) => void;
  selectedQuality: string;
  setSelectedQuality: (value: string) => void;
  wifiOnly: boolean;
  setWifiOnly: (value: boolean) => void;
  startDownload: () => void;
  notify: (title: string, description: string) => void;
}) => (
  <div className="space-y-5">
    <SectionTitle icon={HardDriveDownload} title="قسم التحميل" subtitle="مركز تحميل داخلي، اكتشاف وسائط، ومعرض احترافي للملفات المحفوظة." />
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
              <Button variant="glass" size="icon" onClick={() => setDetectedLink("https://social.example/video/auto-detected")} aria-label="اكتشاف الحافظة"><Copy /></Button>
            </div>
            <div className="mt-4 rounded-2xl border border-border/50 bg-background/40 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold">المتصفح الداخلي</span>
                <Globe2 className="h-4 w-4 text-primary" />
              </div>
              <Input dir="ltr" value={browserUrl} onChange={(event) => setBrowserUrl(event.target.value)} placeholder="أدخل رابط الصفحة" className="bg-background/70" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { label: "فيسبوك", icon: Facebook, url: "https://facebook.com" },
                  { label: "يوتيوب", icon: Youtube, url: "https://youtube.com" },
                  { label: "إنستغرام", icon: Instagram, url: "https://instagram.com" },
                  { label: "تيك توك", icon: Play, url: "https://tiktok.com" },
                ].map((item) => (
                  <button key={item.label} onClick={() => setBrowserUrl(item.url)} className="rounded-xl border border-border/50 bg-secondary/40 p-3 text-xs font-bold transition-transform hover:-translate-y-1">
                    <item.icon className="mx-auto mb-2 h-5 w-5 text-primary" /> {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 min-h-36 rounded-xl border border-border/40 bg-gradient-glass p-4 text-sm text-muted-foreground">
                <div className="mb-3 flex items-center justify-between text-foreground"><span>معاينة الصفحة</span><MoreVertical className="h-4 w-4" /></div>
                تم رصد عنصر وسائط قابل للحفظ داخل الصفحة الحالية.
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-border/50 bg-secondary/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-black">مستشعر الوسائط</span>
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div className="grid gap-2">
              {qualityRows.map((row) => {
                const Icon = row.icon;
                return (
                  <button
                    key={`${row.format}-${row.quality}`}
                    onClick={() => setSelectedQuality(row.quality)}
                    className={`rounded-xl border p-3 text-right transition-all hover:-translate-y-0.5 ${selectedQuality === row.quality ? "border-primary bg-primary/15" : "border-border/50 bg-background/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-black">{row.format} • {row.quality}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">الحجم: {row.size} • السرعة: {row.speed}</p>
                  </button>
                );
              })}
            </div>
            <div className="my-4 flex items-center justify-between rounded-xl bg-background/50 p-3">
              <Switch checked={wifiOnly} onCheckedChange={setWifiOnly} />
              <span className="font-bold">التنزيل عبر Wi‑Fi فقط</span>
            </div>
            <button onClick={startDownload} className="absolute -bottom-5 left-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground shadow-gold transition-transform hover:-translate-y-1" aria-label="تنزيل ذهبي عائم">
              <ChevronUp className="absolute -top-3 h-4 w-4 text-primary" />
              <Download className="h-6 w-6" />
            </button>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="files" className="mt-5">
        <div className="grid gap-4 md:grid-cols-3">
          {downloadedFiles.map((file) => (
            <div key={file.title} className="overflow-hidden rounded-2xl border border-border/50 bg-secondary/30">
              <div className={`h-32 bg-gradient-to-br ${file.tone} to-background/30 p-4`}>
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

const SmartShare = ({ notify, expiry, setExpiry }: { notify: (title: string, description: string) => void; expiry: string; setExpiry: (value: string) => void }) => (
  <div className="space-y-5">
    <SectionTitle icon={Signal} title="الشير الذكي المجاني" subtitle="وحدة مجانية بالكامل للمشاركة المحلية عبر WebRTC أو المشاركة السحابية بروابط صالحة زمنياً." />
    <div className="grid gap-4 md:grid-cols-2">
      <ShareCard
        icon={Bluetooth}
        title="مشاركة محلية دون اتصال"
        description="قناة WebRTC مباشرة بين الأجهزة القريبة دون استهلاك أي رصيد. يتم إنشاء رمز اقتران آمن للجلسة."
        action="فتح غرفة محلية"
        onClick={() => notify("تم فتح غرفة محلية", "بانتظار اقتران الجهاز الآخر عبر رمز المشاركة الآمن.")}
      />
      <div className="rounded-2xl border border-border/50 bg-gradient-glass p-5 transition-transform hover:-translate-y-1">
        <Cloud className="mb-4 h-8 w-8 text-primary" />
        <h3 className="text-xl font-black">مشاركة سحابية عن بُعد</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">ارفع ملفاً وأنشئ رابطاً منظماً مع تحديد مدة الصلاحية قبل الإرسال.</p>
        <select value={expiry} onChange={(event) => setExpiry(event.target.value)} className="mt-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option>24 ساعة</option>
          <option>أسبوع واحد</option>
          <option>شهر واحد</option>
          <option>دائم</option>
        </select>
        <Button variant="glass" className="mt-4 w-full" onClick={() => notify("تم تجهيز الرابط", `سيتم إنشاء رابط مشاركة بصلاحية: ${expiry}.`)}>
          <Link2 className="h-4 w-4" /> إنشاء رابط سحابي
        </Button>
      </div>
    </div>
    <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusPill icon={Smartphone} label="جاهزية الأجهزة" value="متاحة" />
        <StatusPill icon={Globe2} label="المشاركة البعيدة" value="نشطة" />
        <StatusPill icon={UploadCloud} label="حالة الملفات" value="مستقرة" />
      </div>
    </div>
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

const ShareCard = ({ icon: Icon, title, description, action, onClick }: { icon: typeof Cloud; title: string; description: string; action: string; onClick: () => void }) => (
  <div className="rounded-2xl border border-border/50 bg-gradient-glass p-5 transition-transform hover:-translate-y-1">
    <Icon className="mb-4 h-8 w-8 text-primary" />
    <h3 className="text-xl font-black">{title}</h3>
    <p className="mt-2 min-h-20 text-sm leading-7 text-muted-foreground">{description}</p>
    <Button variant="glass" className="mt-5 w-full" onClick={onClick}>
      <Link2 className="h-4 w-4" /> {action}
    </Button>
  </div>
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
