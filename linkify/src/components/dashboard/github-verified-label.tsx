/** Label status verifikasi GitHub kandidat untuk tampilan recruiter. */
export function GithubVerifiedLabel({ verified }: { verified?: boolean }) {
    return verified ? (
        <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-px text-micro font-semibold text-emerald-600">Terverifikasi</span>
    ) : (
        <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-px text-micro font-semibold text-amber-600">Belum diverifikasi</span>
    );
}
