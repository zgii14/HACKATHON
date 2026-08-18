import Swal from "sweetalert2";

const VIOLET = "hsl(262.1, 83.3%, 57.8%)"; // --primary GitHire
const ROSE = "#e11d48"; // destructive

/**
 * Dialog konfirmasi aksi destruktif (SweetAlert2), ter-theme GitHire.
 * Return true kalau user klik konfirmasi.
 */
export async function confirmDestructive({
    title,
    text,
    confirmText = "Ya, lanjut",
    cancelText = "Batal",
}: {
    title: string;
    text?: string;
    confirmText?: string;
    cancelText?: string;
}): Promise<boolean> {
    const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");

    const result = await Swal.fire({
        title,
        text,
        icon: "warning",
        theme: isDark ? "dark" : "light",
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: ROSE,
        cancelButtonColor: VIOLET,
        reverseButtons: true,
        focusCancel: true,
    });

    return result.isConfirmed;
}
