import { currentUser } from "@clerk/nextjs/server";
import LandingRedesign from "@/components/landing/landing-redesign";

const HomePage = async () => {
    const user = await currentUser();

    return (
        <LandingRedesign
            portfolioHref={user ? "/dashboard/portfolio" : "/auth/sign-in"}
            jobsHref={user ? "/dashboard/jobs" : "/auth/sign-in"}
        />
    );
};

export default HomePage;
