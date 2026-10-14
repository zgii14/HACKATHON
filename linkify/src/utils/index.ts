// constants
import { LIST_ITEM_VARIANTS, CHILD_VARIANTS, FADE_IN_VARIANTS, MODAL_VARIANTS } from "./constants/animation";
import { APP_DOMAIN, APP_HOSTNAMES, APP_NAME } from "./constants/site";
import { DEFAULT_AVATAR_URL, PAGINATION_LIMIT, COMPANIES, PROCESS } from "./constants/misc";
import { PLANS, PRICING_FEATURES, WORKSPACE_LIMIT } from "./constants/pricing";
import { CANDIDATE_NAV_GROUPS, NAV_LINKS } from "./constants/nav-links";
// Font sengaja TIDAK diekspor dari barrel ini: banyak komponen client mengimpor "@/utils",
// dan CSS next/font lalu ditempel ke chunk mereka, bukan ke root layout. Impor dari
// "@/utils/constants/fonts" (hanya app/layout.tsx).

// functions
import { cn } from "./functions/cn";
import { isValidUrl } from "./functions/urls";
import { generateMetadata } from "./functions/metadata";
import { handleHashLinkClick, smoothScrollToHash } from "./functions/smooth-scroll";

export {
    // constants
    LIST_ITEM_VARIANTS,
    CHILD_VARIANTS,
    APP_DOMAIN,
    APP_HOSTNAMES,
    APP_NAME,
    DEFAULT_AVATAR_URL,
    FADE_IN_VARIANTS,
    MODAL_VARIANTS,
    PAGINATION_LIMIT,
    PLANS,
    PRICING_FEATURES,
    WORKSPACE_LIMIT,
    NAV_LINKS,
    CANDIDATE_NAV_GROUPS,
    COMPANIES,
    PROCESS,

    // functions
    cn,
    isValidUrl,
    generateMetadata,
    handleHashLinkClick,
    smoothScrollToHash,
};