import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BellRing,
  Bluetooth,
  Brush,
  Cloud,
  Copy,
  Download,
  Facebook,
  FileAudio,
  FileVideo,
  Gauge,
  Gift,
  Globe2,
  HardDriveDownload,
  History,
  Info,
  Link2,
  LogIn,
  Menu,
  Moon,
  Phone,
  PhoneCall,
  PhoneMissed,
  Radar,
  RefreshCcw,
  Search,
  Shield,
  Signal,
  Smartphone,
  Sparkles,
  Timer,
  Trash2,
  UploadCloud,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

type PaidAction = "call" | "download";
type Platform = "android" | "ios";

const CREDIT_COST: Record<PaidAction, number> = { call: 2, download: 3 };

const qualityRows = [
  { format: "MP4", quality: "2160p", size: "1.8 غ.ب", speed: "مرتفع" },
  { format: "MP4", quality: "1080p", size: "742 م.ب", speed: "متوازن" },
  { format: "MP4", quality: "720p", size: "386 م.ب", speed: "سريع" },
  { format: "MP3", quality: "320kbps", size: "12 م.ب", speed: "فوري" },
];

const callerResults = [
  { name: "مركز مداري", phone: "+966 55 240 7712", trust: "موثوق" },
  { name: "جهة غير محفوظة", phone: "+971 50 884 0911", trust: "متوسط" },
  { name: "مكالمة أعمال", phone: "+20 10 1188 4420", trust: "مرتفع" },
];

const Index = () => {
  const { toast } = useToast();
  const [credits, setCredits] = useState(8);
  const [trials, setTrials] = useState(3);
  const [darkMode, setDarkMode] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(true);
  const [platform, setPlatform] = useState<Platform>("android");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [callStatus, setCallStatus] = useState("جاهز للمزامنة الصوتية");
  const [detectedLink, setDetectedLink] = useState("https://social.example/reel/madar-demo");

  const creditLabel = useMemo(() => `${credits} اعتماد`, [credits]);

  const notify = (title: string, description: string) => toast({ title, description });

  const spendCredit = (action: PaidAction, successMessage: string) => {
    const cost = CREDIT_COST[action];
    if (trials > 0) {
      setTrials((current) => current - 1);
      notify("تم استخدام تجربة مجانية", `بقي لديك ${trials - 1} من أصل 3 تجارب.`);
      return true;
    }
    if (credits < cost) {
      notify("الرصيد غير كافٍ", "شاهد إعلان مكافأة قصيرًا للحصول على 5 اعتمادات فورًا.");
      return false;
    }
    setCredits((current) => current - cost);
    notify("تم خصم الاعتمادات", successMessage);
    return true;
  };

  const startCall = () => {
    if (!spendCredit("call", "تم تشغيل واجهة الاتصال ومزامنة الصوت بنجاح.")) return;
    setCallStatus("مكالمة واردة نشطة — الصوت متزامن");
  };

  const declineCall = () => {
    setCallStatus("تم الرفض — إعادة الاتصال التلقائي خلال 3 ثوانٍ");
    notify("إعادة الاتصال التلقائي", "سيتم تفعيل الرنين مجددًا وفق سيناريو الحماية المحدد.");
  };

  const startDownload = () => {
    if (!spendCredit("download", `بدأ تجهيز ملف ${selectedQuality} مع تقدير الحجم قبل التنزيل.`)) return;
    notify("بدأ التنزيل الآمن", wifiOnly ? "لن يبدأ النقل إلا عند توفر شبكة Wi‑Fi." : "تم السماح بالتنزيل عبر أي اتصال متاح.");
  };

  const rewardAd = () => {
    notify("بدأ إعلان المكافأة", "بعد 5 ثوانٍ ستضاف 5 اعتمادات إلى محفظتك.");
    window.setTimeout(() => {
      setCredits((current) => current + 5);
      toast({ title: "تمت إضافة المكافأة", description: "حصلت على 5 اعتمادات جديدة." });
    }, 5000);
  };

  const cleanCache = () => {
    setDetectedLink("");
    notify("تم تنظيف الذاكرة المؤقتة", "أُزيلت الروابط المؤقتة وملفات المعاينة بأمان.");
  };

  return (
    <main className="min-h-screen overflow-hidden bg-orbit font-cairo text-foreground">
      <div className="pointer-events-none fixed inset-0 orbit-grid opacity-60" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-4 z-30 flex items-center justify-between rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground shadow-gold">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">منصة ذكية موحدة</p>
              <h1 className="text-2xl font-black leading-none gold-text">مدار</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-4 py-2 text-sm font-bold sm:flex">
              <Sparkles className="h-4 w-4 text-primary" />
              {creditLabel}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="icon" aria-label="فتح الإعدادات">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 border-border/60 bg-popover/95 p-2 text-right backdrop-blur-xl">
                <DropdownMenuLabel className="flex items-center justify-between gap-3">
                  <span>الإعدادات والهوية</span>
                  <Shield className="h-4 w-4 text-primary" />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => notify("تسجيل Google", "تم تجهيز مسار تسجيل الدخول الاجتماعي للتفعيل الخلفي.")} className="justify-end gap-2">
                  Google <LogIn className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => notify("تسجيل Facebook", "سيتم ربط المزود عند تفعيل خدمة الهوية.")} className="justify-end gap-2">
                  Facebook <Facebook className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between rounded-md px-2 py-2 text-sm">
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                  <span className="flex items-center gap-2"><Moon className="h-4 w-4" /> الوضع الداكن</span>
                </div>
                <DropdownMenuItem onClick={cleanCache} className="justify-end gap-2">
                  تنظيف الذاكرة المؤقتة <Trash2 className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => notify("الخصوصية", "المشاركة المحلية تعمل دون رفع الملفات إلا عند اختيار السحابة.")} className="justify-end gap-2">
                  الخصوصية <Shield className="h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => notify("عن مدار", "تطبيق عربي احترافي قابل للتحويل لاحقًا إلى تطبيق جوال.")} className="justify-end gap-2">
                  عن التطبيق <Info className="h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-6">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">
                <BadgeCheck className="h-4 w-4 text-primary" /> واجهة عربية فصحى • زجاج داكن ذهبي
              </div>
              <div className="space-y-3">
                <h2 className="max-w-2xl text-4xl font-black leading-tight sm:text-6xl">
                  مركز ذكي للاتصال، التحميل، والمشاركة في <span className="gold-text">مدار واحد</span>
                </h2>
                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                  نظام اعتمادات واضح، ثلاث تجارب مجانية، ومشاركة مجانية عبر WebRTC أو السحابة مع رسائل مهنية جاهزة للمستخدم العربي.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={Sparkles} label="الرصيد" value={creditLabel} />
              <Metric icon={Gift} label="تجارب مجانية" value={`${trials}/3`} />
              <Metric icon={Wifi} label="نمط الشبكة" value={wifiOnly ? "Wi‑Fi" : "مرن"} />
            </div>

            <div className="glass-panel rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold">مكافأة الإعلانات</span>
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <p className="mb-4 text-sm leading-7 text-muted-foreground">شاهد إعلانًا مدته 5 ثوانٍ لتحصل على 5 اعتمادات. المشاركة الذكية مجانية دائمًا.</p>
              <Button variant="gold" className="w-full" onClick={rewardAd}>
                <Gift className="h-4 w-4" /> مشاهدة إعلان المكافأة
              </Button>
            </div>
          </aside>

          <section className="glass-panel relative rounded-3xl p-3 sm:p-5">
            <div className="absolute -left-8 top-12 hidden h-32 w-32 rounded-full bg-primary/20 blur-3xl lg:block" />
            <Tabs defaultValue="hub" className="relative z-10">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-2xl border border-border/50 bg-secondary/40 p-2">
                <TabsTrigger value="hub" className="gap-2 rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <PhoneCall className="h-4 w-4" /> الاتصال
                </TabsTrigger>
                <TabsTrigger value="media" className="gap-2 rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Download className="h-4 w-4" /> التحميل
                </TabsTrigger>
                <TabsTrigger value="share" className="gap-2 rounded-xl py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Signal className="h-4 w-4" /> المشاركة
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hub" className="mt-5">
                <CallHub platform={platform} setPlatform={setPlatform} callStatus={callStatus} startCall={startCall} declineCall={declineCall} />
              </TabsContent>
              <TabsContent value="media" className="mt-5">
                <MediaDownloader
                  detectedLink={detectedLink}
                  setDetectedLink={setDetectedLink}
                  selectedQuality={selectedQuality}
                  setSelectedQuality={setSelectedQuality}
                  wifiOnly={wifiOnly}
                  setWifiOnly={setWifiOnly}
                  startDownload={startDownload}
                />
              </TabsContent>
              <TabsContent value="share" className="mt-5">
                <SmartShare notify={notify} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </section>
    </main>
  );
};

const Metric = ({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) => (
  <div className="glass-panel rounded-2xl p-4 transition-transform hover:-translate-y-1">
    <Icon className="mb-3 h-5 w-5 text-primary" />
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-black">{value}</p>
  </div>
);

const CallHub = ({
  platform,
  setPlatform,
  callStatus,
  startCall,
  declineCall,
}: {
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  callStatus: string;
  startCall: () => void;
  declineCall: () => void;
}) => (
  <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
    <div className="space-y-4">
      <SectionTitle icon={Phone} title="مركز الاتصال الذكي" subtitle="واجهة وهمية واقعية مع إعادة اتصال تلقائي ومزامنة صوتية." />
      <div className="grid grid-cols-2 gap-2">
        <Button variant={platform === "android" ? "gold" : "glass"} onClick={() => setPlatform("android")}>Android</Button>
        <Button variant={platform === "ios" ? "gold" : "glass"} onClick={() => setPlatform("ios")}>iOS</Button>
      </div>
      <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-bold">بحث معرف المتصل</span>
          <Search className="h-4 w-4 text-primary" />
        </div>
        <div className="rounded-xl border border-border/40 bg-background/50 px-3 py-3 text-sm text-muted-foreground">اكتب رقمًا أو اسمًا للبحث الفوري</div>
        <div className="mt-3 space-y-2">
          {callerResults.map((result) => (
            <div key={result.phone} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm">
              <span className="text-primary">{result.trust}</span>
              <div className="text-left">
                <p className="font-bold">{result.name}</p>
                <p className="text-muted-foreground" dir="ltr">{result.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="mx-auto w-full max-w-xs">
      <div className={`relative overflow-hidden rounded-[2rem] border ${platform === "ios" ? "border-gold/70" : "border-accent/70"} bg-background/80 p-4 shadow-glass`}>
        <div className="mx-auto mb-6 h-6 w-24 rounded-full bg-secondary" />
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground animate-pulse-gold">
            <BellRing className="h-9 w-9" />
          </div>
          <p className="text-sm text-muted-foreground">مكالمة واردة</p>
          <h3 className="mt-2 text-2xl font-black">سارة الأعمال</h3>
          <p className="mt-1 text-sm text-muted-foreground" dir="ltr">+966 55 240 7712</p>
          <p className="mt-5 rounded-xl bg-secondary/60 px-3 py-2 text-sm text-primary">{callStatus}</p>
        </div>
        <div className="mt-8 flex justify-around">
          <Button variant="destructive" size="icon" onClick={declineCall} aria-label="رفض المكالمة"><PhoneMissed /></Button>
          <Button variant="success" size="icon" onClick={startCall} aria-label="بدء المكالمة"><PhoneCall /></Button>
        </div>
      </div>
    </div>
  </div>
);

const MediaDownloader = ({
  detectedLink,
  setDetectedLink,
  selectedQuality,
  setSelectedQuality,
  wifiOnly,
  setWifiOnly,
  startDownload,
}: {
  detectedLink: string;
  setDetectedLink: (value: string) => void;
  selectedQuality: string;
  setSelectedQuality: (value: string) => void;
  wifiOnly: boolean;
  setWifiOnly: (value: boolean) => void;
  startDownload: () => void;
}) => (
  <div className="space-y-5">
    <SectionTitle icon={HardDriveDownload} title="محمل الوسائط العالمي" subtitle="اكتشاف تلقائي للروابط، مصفوفة جودة، وتقدير حجم قبل التنزيل." />
    <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
      <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="glass" size="sm" onClick={() => setDetectedLink("https://social.example/video/auto-detected")}>محاكاة الحافظة</Button>
          <span className="flex items-center gap-2 font-bold"><Copy className="h-4 w-4 text-primary" /> اكتشاف الحافظة</span>
        </div>
        <div className="break-all rounded-xl border border-border/40 bg-background/50 p-3 text-sm text-muted-foreground" dir="ltr">
          {detectedLink || "لا يوجد رابط مكتشف حاليًا"}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {qualityRows.map((row) => (
            <button
              key={`${row.format}-${row.quality}`}
              onClick={() => setSelectedQuality(row.quality)}
              className={`rounded-xl border p-3 text-right transition-all hover:-translate-y-0.5 ${selectedQuality === row.quality ? "border-primary bg-primary/15" : "border-border/50 bg-secondary/30"}`}
            >
              <div className="flex items-center justify-between">
                {row.format === "MP4" ? <FileVideo className="h-4 w-4 text-primary" /> : <FileAudio className="h-4 w-4 text-primary" />}
                <span className="font-black">{row.format} • {row.quality}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">الحجم: {row.size} • السرعة: {row.speed}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4">
        <Gauge className="mb-4 h-7 w-7 text-primary" />
        <h3 className="text-xl font-black">منطق الشبكة</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">عند تفعيل Wi‑Fi فقط، يتم تعليق الملفات الكبيرة تلقائيًا حتى تتوفر شبكة آمنة.</p>
        <div className="my-5 flex items-center justify-between rounded-xl bg-background/50 p-3">
          <Switch checked={wifiOnly} onCheckedChange={setWifiOnly} />
          <span className="font-bold">التنزيل عبر Wi‑Fi فقط</span>
        </div>
        <Button variant="gold" className="w-full" onClick={startDownload}>
          <Download className="h-4 w-4" /> بدء التنزيل
        </Button>
      </div>
    </div>
  </div>
);

const SmartShare = ({ notify }: { notify: (title: string, description: string) => void }) => (
  <div className="space-y-5">
    <SectionTitle icon={Signal} title="المشاركة الذكية المجانية" subtitle="المحور الثالث مجاني: مشاركة محلية دون اتصال أو مشاركة سحابية للملفات البعيدة." />
    <div className="grid gap-4 md:grid-cols-2">
      <ShareCard
        icon={Bluetooth}
        title="مشاركة محلية P2P"
        description="WebRTC ينشئ قناة مباشرة بين الأجهزة القريبة دون استهلاك اعتمادات."
        action="فتح غرفة محلية"
        onClick={() => notify("تم فتح غرفة محلية", "بانتظار اقتران الجهاز الآخر عبر رمز المشاركة الآمن.")}
      />
      <ShareCard
        icon={Cloud}
        title="مشاركة سحابية عن بُعد"
        description="ارفع ملفًا بعيدًا وأنشئ رابطًا مؤقتًا مع صلاحية واضحة للمستلم."
        action="إنشاء رابط سحابي"
        onClick={() => notify("تم تجهيز الرابط", "سيظهر رابط المشاركة بعد اكتمال رفع الملف.")}
      />
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

const ShareCard = ({ icon: Icon, title, description, action, onClick }: { icon: typeof Cloud; title: string; description: string; action: string; onClick: () => void }) => (
  <div className="rounded-2xl border border-border/50 bg-gradient-glass p-5 transition-transform hover:-translate-y-1">
    <Icon className="mb-4 h-8 w-8 text-primary" />
    <h3 className="text-xl font-black">{title}</h3>
    <p className="mt-2 min-h-16 text-sm leading-7 text-muted-foreground">{description}</p>
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

export default Index;