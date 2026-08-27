"use client";

import Link from "next/link";
import { handleHashLinkClick } from "@/utils";

interface SmoothScrollLinkProps {
    href: string;
    className?: string;
    children: React.ReactNode;
};

const SmoothScrollLink = ({ href, className, children }: SmoothScrollLinkProps) => (
    <Link
        href={href}
        className={className}
        onClick={(e) => handleHashLinkClick(e, href)}
    >
        {children}
    </Link>
);

export default SmoothScrollLink;
