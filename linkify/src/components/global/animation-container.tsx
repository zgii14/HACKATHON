"use client";

import { motion, useReducedMotion } from 'framer-motion';

interface AnimationContainerProps {
    children: React.ReactNode;
    delay?: number;
    reverse?: boolean;
    className?: string;
};

const AnimationContainer = ({ children, className, reverse, delay }: AnimationContainerProps) => {
    const reduced = useReducedMotion();

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: reverse ? -20 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: reduced ? 0 : 0.65, delay: reduced ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    )
};

export default AnimationContainer
