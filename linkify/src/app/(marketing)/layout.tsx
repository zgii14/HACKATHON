import React from 'react';
import "@/styles/marketing.css";
import { Footer, Navbar } from "@/components";

interface Props {
    children: React.ReactNode
}

const MarketingLayout = ({ children }: Props) => {
    return (
        <div className="font-satoshi">
            <Navbar />
            <main id="home" className="mt-20 mx-auto w-full z-0 relative">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default MarketingLayout
