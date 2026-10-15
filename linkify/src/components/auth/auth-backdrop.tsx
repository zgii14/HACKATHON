import { cn } from "@/utils";
import Image from "next/image";

const POSTERS = ["editorial", "developer", "professional", "maestro", "arcade"] as const;
const COLUMNS = 4;

/**
 * Latar halaman auth: mosaik poster portfolio GitHire, miring dan nyaris
 * transparan, memudar ke warna latar di tengah supaya form tetap terbaca.
 * Pesannya: ini yang akan kamu buat. Hanya 5 gambar unik (di-cache browser);
 * kolom bergeser pelan dan diam saat prefers-reduced-motion.
 */
export function AuthBackdrop() {
    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
            <div className="absolute left-1/2 top-1/2 grid w-[150vw] min-w-[1100px] -translate-x-1/2 -translate-y-1/2 -rotate-[8deg] grid-cols-4 gap-5 opacity-[0.16] saturate-[0.6]">
                {Array.from({ length: COLUMNS }, (_, column) => (
                    // Isi kolom digandakan supaya geseran -50% menyambung tanpa jeda.
                    <div key={column} className={cn("flex flex-col gap-5", column % 2 ? "auth-drift-reverse" : "auth-drift")}>
                        {[0, 1, 2, 3, 4, 5].map((row) => {
                            const poster = POSTERS[(column + row) % POSTERS.length];
                            return (
                                <div key={row} className="relative aspect-[16/10] overflow-hidden rounded-xl border border-foreground/10">
                                    <Image src={`/landing/portfolio-${poster}.webp`} alt="" fill sizes="400px" quality={60} className="object-cover object-top" />
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_50%,hsl(var(--background))_30%,hsl(var(--background)/0.55)_70%,transparent_100%)]" />
        </div>
    );
}
