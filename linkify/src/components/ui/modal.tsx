"use client";

import React from 'react'
import { useMediaQuery } from "usehooks-ts";
import { Dialog } from "./dialog";
import { Drawer } from "./drawer";

interface Props {
    children: React.ReactNode;
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onClose?: () => void;
}

const Modal = ({ children, isOpen, setIsOpen }: Props) => {

    const isDesktop = useMediaQuery("(max-width: 768px)");

    if (isDesktop) {
        return (
            <Dialog
                open={isOpen}
                onOpenChange={setIsOpen}
            >
                {children}
            </Dialog>
        )
    }

    return (
        <Drawer
            open={isOpen}
            onOpenChange={setIsOpen}
            direction="bottom"
        >
            {children}
        </Drawer>
    )
};

export default Modal
