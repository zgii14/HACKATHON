"use client";

import { motion, useReducedMotion } from 'framer-motion';

interface AnimationContainerProps {
    children: React.ReactNode;
    delay?: number;
    reverse?: boolean;
    direction?: "up" | "down" | "left" | "right" | "scale";
    amount?: number;
    className?: string;
};

const AnimationContainer = ({ children, className, reverse, direction = "up", amount = 0.18, delay }: AnimationContainerProps) => {
    const reduced = useReducedMotion();

    const getInitial = () => {
        if (direction === "scale") return { opacity: 0, scale: 0.96 };
        if (direction === "left") return { opacity: 0, x: -20 };
        if (direction === "right") return { opacity: 0, x: 20 };
        if (direction === "down") return { opacity: 0, y: -20 };
        // up default, respect reverse legacy
        return { opacity: 0, y: reverse ? -20 : 20 };
    };

    const getWhileInView = () => {
        if (direction === "scale") return { opacity: 1, scale: 1 };
        if (direction === "left" || direction === "right") return { opacity: 1, x: 0 };
        return { opacity: 1, y: 0 };
    };

    return (
        <motion.div
            className={className}
            initial={getInitial()}
            whileInView={getWhileInView()}
            viewport={{ once: true, amount }}
            transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    )
};

export default AnimationContainer
