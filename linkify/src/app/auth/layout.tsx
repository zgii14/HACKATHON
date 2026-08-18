import { MaxWidthWrapper } from "@/components";
import { AppToastContainer } from "@/components/ui/app-toast";
import React from 'react';

interface Props {
    children: React.ReactNode
}

const MarketingLayout = ({ children }: Props) => {
    return (
        <MaxWidthWrapper>
            <AppToastContainer />
            <main className="mx-auto w-full relative">
                {children}
            </main>
        </MaxWidthWrapper>
    );
};

export default MarketingLayout
