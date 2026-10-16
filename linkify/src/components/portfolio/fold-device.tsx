"use client";

import { motion, transform, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { cn } from "@/utils/functions/cn";
import { buildScreens, buildTrack, giantNameSize, type FoldNav, type FoldScreen } from "./fold-portfolio-config";
import { CallScreen, DISPLAY, HeroScreen, ListScreen, LockScreen, ProjectScreen, SkillsScreen, StatsScreen, WorkIntroScreen, type SceneProps } from "./fold-scenes";

type StageProps = Omit<SceneProps, "compact" | "onNavigate"> & { bezel: string };

function Screen({ screen, props }: { screen: FoldScreen; props: SceneProps }) {
    if (screen.id === "hero") return <HeroScreen {...props} />;
    if (screen.id === "stats") return <StatsScreen {...props} />;
    if (screen.id === "work") return <WorkIntroScreen {...props} />;
    if (screen.id === "project") {
        const project = props.portfolio.content.projects[screen.index];
        return project ? <ProjectScreen project={project} index={screen.index} copy={props.copy} compact={props.compact} /> : null;
    }
    if (screen.id === "skills") return <SkillsScreen {...props} />;
    if (screen.id === "experience" || screen.id === "education" || screen.id === "certifications") return <ListScreen {...props} kind={screen.id} />;
    return <CallScreen {...props} />;
}

/** Nav aktif = nav terakhir yang dimulai pada atau sebelum layar `index`. */
function navAt(screens: FoldScreen[], index: number): FoldNav {
    let nav: FoldNav = "home";
    for (let cursor = 0; cursor <= index && cursor < screens.length; cursor += 1) nav = screens[cursor].nav ?? nav;
    return nav;
}

/** Progres scroll halaman → langkah track, nav aktif, dan lompat ke layar. Dipakai tablet dan HP. */
function useFoldScroll(portfolio: StageProps["portfolio"]) {
    const screens = useMemo(() => buildScreens(portfolio), [portfolio]);
    const strip = useMemo(() => screens.filter((screen) => screen.id !== "call"), [screens]);
    const track = useMemo(() => buildTrack(strip.length), [strip.length]);
    const navItems = useMemo(() => screens.filter((screen) => screen.nav), [screens]);

    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
    const t = useTransform(scrollYProgress, [0, 1], [0, track.steps]);
    const [foldStart] = track.fold;
    const stripIndex = useTransform(t, track.stripInput, track.stripOutput);
    const stripY = useTransform(stripIndex, (value) => `${(-value * 100) / strip.length}%`);

    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [activeNav, setActiveNav] = useState<FoldNav>("home");
    useMotionValueEvent(t, "change", (value) => {
        setOpen(value > 0.9 && value < foldStart + 0.2);
        setClosing(value >= foldStart + 0.2);
        // Hitung dari `value` langsung: motion value turunan belum tentu sudah diperbarui di sini.
        setActiveNav(value >= foldStart + 0.3 ? "contact" : navAt(strip, Math.round(transform(value, track.stripInput, track.stripOutput))));
    });

    const goTo = (nav: FoldNav) => {
        const node = ref.current;
        if (!node) return;
        const step =
            nav === "contact"
                ? track.steps
                : track.restStep(
                      Math.max(
                          0,
                          strip.findIndex((screen) => screen.nav === nav),
                      ),
                  );
        const distance = node.offsetHeight - window.innerHeight;
        const top = node.getBoundingClientRect().top + window.scrollY + (step / track.steps) * distance;
        window.scrollTo({ top, behavior: "smooth" });
    };

    return { strip, track, navItems, ref, t, stripY, open, closing, activeNav, goTo };
}

/** Kontainer setinggi track + panggung sticky. Satu langkah = satu tinggi layar. */
function ScrollStage({ stageRef, steps, children }: { stageRef: RefObject<HTMLDivElement>; steps: number; children: ReactNode }) {
    return (
        <div ref={stageRef} className="relative" style={{ height: `${(steps + 1) * 100}svh` }}>
            <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden">{children}</div>
        </div>
    );
}

function DeviceEntrance({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className={cn("relative", className)}
        >
            {children}
        </motion.div>
    );
}

function GiantName({ name, opacity, scale }: { name: string; opacity: MotionValue<number>; scale?: MotionValue<number> }) {
    return (
        // Pembungkus statis memegang posisi; transform framer di elemen dalam tidak menimpanya.
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <motion.p style={{ opacity, scale, fontSize: `${giantNameSize(name)}vw` }} className={cn("whitespace-nowrap text-center leading-[0.8] text-[#111111]", DISPLAY)}>
                {name}
            </motion.p>
        </div>
    );
}

function Strip({ strip, stripY, sceneProps }: { strip: FoldScreen[]; stripY: MotionValue<string>; sceneProps: SceneProps }) {
    return (
        <motion.div style={{ y: stripY, height: `${strip.length * 100}%` }} className="flex flex-col">
            {strip.map((screen, index) => (
                <div key={screen.id === "project" ? `project-${screen.index}` : screen.id} className="relative w-full" style={{ height: `${100 / strip.length}%` }}>
                    <Screen screen={screen} props={sceneProps} />
                    {index === 0 && <StatusBar />}
                </div>
            ))}
        </motion.div>
    );
}

type DockProps = { navItems: FoldScreen[]; activeNav: FoldNav; goTo: (nav: FoldNav) => void; copy: SceneProps["copy"]; compact?: boolean };

function Dock({ navItems, activeNav, goTo, copy, compact }: DockProps) {
    if (navItems.length < 2) return null;
    return (
        <nav
            className={cn(
                "absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-0.5 whitespace-nowrap rounded-full bg-[#111111]/75 p-1 font-medium text-white backdrop-blur-md",
                compact ? "text-[11.5px]" : "text-[13px]",
            )}
            aria-label={copy.nav.home}
        >
            {navItems.map((screen) => {
                const nav = screen.nav as FoldNav;
                const active = nav === activeNav;
                return (
                    <button
                        key={nav}
                        type="button"
                        onClick={() => goTo(nav)}
                        className={cn("relative rounded-full py-1.5 transition-colors", compact ? "px-2.5" : "px-3.5", active ? "text-[#111111]" : "text-white/80 hover:text-white")}
                        aria-current={active ? "true" : undefined}
                    >
                        {active && <motion.span layoutId="fold-dock-active" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                        <span className="relative">{copy.nav[nav]}</span>
                    </button>
                );
            })}
        </nav>
    );
}

/**
 * Desktop/tablet: device sticky. Belahan kiri berputar di engsel (sisi belakangnya layar kunci/panggilan),
 * strip layar bergeser vertikal, lalu device terlipat lagi ke layar panggilan. Semua transform.
 */
export function FoldStage(props: StageProps) {
    const { portfolio, copy, bezel } = props;
    const { strip, track, navItems, ref, t, stripY, open, activeNav, goTo } = useFoldScroll(portfolio);
    const [foldStart, foldEnd] = track.fold;

    const panelRotate = useTransform(t, [0, 1, foldStart, foldEnd], [-180, 0, 0, -180]);
    // Sudut kiri belahan kanan membulat saat terlipat agar tidak mengintip di balik panel.
    const seamOuter = useTransform(t, [0, 0.9, foldStart + 0.1, foldEnd], [46, 0, 0, 46]);
    const seamInner = useTransform(seamOuter, (value) => Math.max(0, value - 10));
    const deviceX = useTransform(t, [0, 1, foldStart, foldEnd], ["-25%", "0%", "0%", "-25%"]);
    const contentOpacity = useTransform(t, [0.72, 0.95, foldStart + 0.05, foldStart + 0.28], [0, 1, 1, 0]);
    const callOpacity = useTransform(t, [foldStart + 0.3, foldStart + 0.32], [0, 1]);
    const lockOpacity = useTransform(callOpacity, (value) => 1 - value);
    const nameOpacity = useTransform(t, [0, 0.55, foldStart + 0.4, foldEnd], [1, 0, 0, 1]);
    const nameScale = useTransform(t, [0, 0.55], [1, 1.08]);
    const phoneShadow = useTransform(contentOpacity, (value) => 1 - value);

    const sceneProps: SceneProps = { ...props, onNavigate: goTo };
    const frame: CSSProperties = { backgroundColor: bezel };

    return (
        <ScrollStage stageRef={ref} steps={track.steps}>
            <GiantName name={portfolio.content.name || "Portfolio"} opacity={nameOpacity} scale={nameScale} />
            <DeviceEntrance className="mt-6">
                <motion.div style={{ x: deviceX, width: "min(1040px, 92vw)", height: "min(640px, calc(100svh - 170px))", perspective: 2600 }} className="relative">
                    {/* Bayangan lantai: selebar HP saat terlipat, selebar tablet saat terbuka. */}
                    <motion.div style={{ opacity: phoneShadow }} className="absolute -bottom-10 left-[56%] right-[6%] h-10 rounded-[50%] bg-black/25 blur-2xl" aria-hidden="true" />
                    <motion.div style={{ opacity: contentOpacity }} className="absolute -bottom-10 left-[12%] right-[12%] h-10 rounded-[50%] bg-black/25 blur-2xl" aria-hidden="true" />
                    {/* Belahan kanan (diam) */}
                    <motion.div
                        className="absolute inset-y-0 right-0 w-1/2 rounded-r-[46px] p-[10px] pl-0 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]"
                        style={{ ...frame, borderTopLeftRadius: seamOuter, borderBottomLeftRadius: seamOuter }}
                    >
                        <motion.div className="size-full rounded-r-[36px] bg-[#fafafa]" style={{ borderTopLeftRadius: seamInner, borderBottomLeftRadius: seamInner }} />
                    </motion.div>
                    {/* Belahan kiri: berputar di engsel tengah */}
                    <motion.div style={{ rotateY: panelRotate, transformOrigin: "100% 50%", transformStyle: "preserve-3d" }} className="absolute inset-y-0 left-0 z-10 w-1/2">
                        <div className="absolute inset-0 rounded-l-[46px] p-[10px] pr-0 [backface-visibility:hidden]" style={frame}>
                            <div className="size-full rounded-l-[36px] bg-[#fafafa]" />
                        </div>
                        <div className="absolute inset-0 rounded-[46px] p-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={frame}>
                            <div className="relative size-full overflow-hidden rounded-[36px]">
                                <motion.div style={{ opacity: lockOpacity }} className="absolute inset-0">
                                    <LockScreen {...sceneProps} />
                                </motion.div>
                                <motion.div style={{ opacity: callOpacity }} className="absolute inset-0">
                                    <CallScreen {...sceneProps} />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div style={{ opacity: contentOpacity }} className="absolute inset-y-[10px] left-1/2 z-[5] w-px bg-black/10" aria-hidden="true" />

                    {/* Isi layar lebar */}
                    <motion.div
                        style={{ opacity: contentOpacity }}
                        className={cn("absolute inset-[10px] z-20 overflow-hidden rounded-[36px] bg-[#fafafa]", !open && "pointer-events-none")}
                        aria-hidden={!open}
                    >
                        <Strip strip={strip} stripY={stripY} sceneProps={sceneProps} />
                        <Dock navItems={navItems} activeNav={activeNav} goTo={goTo} copy={copy} />
                    </motion.div>
                </motion.div>
            </DeviceEntrance>
        </ScrollStage>
    );
}

/**
 * Mobile: HP potret sticky. Layar kunci berayun keluar seperti pintu (engsel kiri), isi bergeser di layar HP,
 * lalu layar panggilan berayun masuk di akhir. Tanpa unfold: layar terlalu sempit untuk tablet.
 */
export function FoldPhone(props: StageProps) {
    const { portfolio, copy, bezel } = props;
    const { strip, track, navItems, ref, t, stripY, open, closing, activeNav, goTo } = useFoldScroll(portfolio);
    const [foldStart, foldEnd] = track.fold;

    const lockRotate = useTransform(t, [0, 0.9], [0, -105]);
    const lockOpacity = useTransform(t, [0.55, 0.9], [1, 0]);
    const callRotate = useTransform(t, [foldStart + 0.1, foldEnd - 0.1], [-105, 0]);
    const callOpacity = useTransform(t, [foldStart + 0.1, foldStart + 0.45], [0, 1]);
    const nameOpacity = useTransform(t, [0, 0.5, foldStart + 0.4, foldEnd], [1, 0, 0, 1]);

    const sceneProps: SceneProps = { ...props, compact: true, onNavigate: goTo };

    return (
        <ScrollStage stageRef={ref} steps={track.steps}>
            <GiantName name={portfolio.content.name || "Portfolio"} opacity={nameOpacity} />
            <DeviceEntrance className="mt-4">
                <div
                    className="relative rounded-[44px] p-[9px] shadow-[0_30px_60px_-28px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: bezel, width: "min(400px, 86vw)", height: "min(780px, calc(100svh - 128px))" }}
                >
                    <div className="relative size-full overflow-hidden rounded-[35px] bg-[#fafafa] [perspective:1600px]">
                        <div className={cn("absolute inset-0 z-0", !open && "pointer-events-none")} aria-hidden={!open}>
                            <Strip strip={strip} stripY={stripY} sceneProps={sceneProps} />
                            <Dock navItems={navItems} activeNav={activeNav} goTo={goTo} copy={copy} compact />
                        </div>
                        <motion.div
                            style={{ rotateY: lockRotate, opacity: lockOpacity, transformOrigin: "0% 50%" }}
                            className={cn("absolute inset-0 z-10", (open || closing) && "pointer-events-none")}
                        >
                            <LockScreen {...sceneProps} />
                        </motion.div>
                        <motion.div style={{ rotateY: callRotate, opacity: callOpacity, transformOrigin: "0% 50%" }} className={cn("absolute inset-0 z-10", !closing && "pointer-events-none")}>
                            <CallScreen {...sceneProps} />
                        </motion.div>
                    </div>
                </div>
            </DeviceEntrance>
        </ScrollStage>
    );
}

function StatusBar() {
    return (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end px-7 pt-4 text-[12px] font-semibold text-[#111111]" aria-hidden="true">
            <span className="flex items-center gap-1.5">
                5G
                <span className="relative h-2.5 w-5 rounded-[3px] border border-current p-[1.5px]">
                    <span className="block h-full w-3/4 rounded-[1px] bg-current" />
                </span>
            </span>
        </div>
    );
}
