"use server";

import { currentUser } from "@clerk/nextjs/server";

const getAuthStatus = async () => {
    const user = await currentUser();

    if (!user?.id || !user?.primaryEmailAddress?.emailAddress) {
        return { error: "User not found" };
    }

    return { success: true };
};

export default getAuthStatus;
