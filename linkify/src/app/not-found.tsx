import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search } from "lucide-react";
import Link from "next/link";

const NotFound = () => {
    return (
        <main className="min-h-screen flex items-center justify-center px-4 bg-background">
            <div className="text-center space-y-6 max-w-md">
                {/* Visual */}
                <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 animate-pulse" />
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl font-bold text-transparent bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text">
                            404
                        </span>
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Halaman tidak ditemukan
                    </h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        URL yang kamu kunjungi tidak ada atau sudah dipindahkan.
                        Tidak perlu khawatir — kamu bisa kembali ke jalur yang benar.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button asChild>
                        <Link href="/dashboard">
                            <Home className="w-4 h-4 mr-2" />
                            Ke Dashboard
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/jobs">
                            <Search className="w-4 h-4 mr-2" />
                            Browse Lowongan
                        </Link>
                    </Button>
                </div>

                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-3 h-3" />
                    Kembali ke halaman utama
                </Link>
            </div>
        </main>
    );
};

export default NotFound;