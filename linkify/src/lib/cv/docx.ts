"use client";

import { toast } from "react-toastify";

export type CvDocxInput = {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    linkedin: string;
    githubUrl: string;
    summary: string;
    education: { institution: string; location: string; major: string; degree: string; period: string; gpa: string }[];
    workExperience: { company: string; role: string; location: string; period: string; bullets: string[] }[];
    orgExperience: { organization: string; role: string; location: string; period: string; bullets: string[] }[];
    training: { title: string; provider: string; location: string; period: string; bullets: string[] }[];
    softSkills: string;
    hardSkills: string;
    languages: string;
    certifications: string[];
};

export async function generateWordCV(input: CvDocxInput): Promise<void> {
    const {
        fullName,
        phone,
        email,
        address,
        linkedin,
        githubUrl,
        summary,
        education,
        workExperience,
        orgExperience,
        training,
        softSkills,
        hardSkills,
        languages,
        certifications,
    } = input;

    // lazy load docx + file-saver
    const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        AlignmentType,
        convertInchesToTwip,
        Table,
        TableRow,
        TableCell,
        WidthType,
        BorderStyle,
    } = await import("docx");
    const { saveAs } = await import("file-saver");

    const FONT = "Times New Roman";
    const SIZE_NAME = 32;
    const SIZE_SECTION = 22;
    const SIZE_BODY = 20;

    const borderNone = {
        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    };

    const createSectionHeader = (title: string) =>
        new Paragraph({
            heading: "Heading 1" as any,
            border: {
                bottom: {
                    color: "A0A0A0",
                    space: 3,
                    style: BorderStyle.SINGLE,
                    size: 6,
                },
            },
            spacing: { before: 180, after: 80 },
            children: [
                new TextRun({
                    text: title.toUpperCase(),
                    font: FONT,
                    size: SIZE_SECTION,
                    bold: true,
                    color: "1D1D1F",
                }),
            ],
        });

    const elements: any[] = [];

    elements.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
                new TextRun({
                    text: fullName || "NAMA LENGKAP",
                    font: FONT,
                    size: SIZE_NAME,
                    bold: true,
                }),
            ],
        })
    );

    const contactParts = [phone?.trim(), email?.trim(), linkedin?.trim(), githubUrl?.trim()].filter(Boolean);

    elements.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
                new TextRun({
                    text: contactParts.join("  |  "),
                    font: FONT,
                    size: SIZE_BODY,
                }),
            ],
        })
    );

    if (address) {
        elements.push(
            new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 180 },
                children: [new TextRun({ text: address, font: FONT, size: SIZE_BODY })],
            })
        );
    }

    if (summary) {
        elements.push(
            new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: 120 },
                children: [new TextRun({ text: summary, font: FONT, size: SIZE_BODY })],
            })
        );
    }

    if (education.length > 0) {
        elements.push(createSectionHeader("Pendidikan"));
        education.forEach((edu) => {
            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: borderNone,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        spacing: { after: 20 },
                                        children: [
                                            new TextRun({
                                                text: `${edu.institution} – ${edu.location}`,
                                                font: FONT,
                                                size: SIZE_BODY,
                                                bold: true,
                                            }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60 },
                                        children: [
                                            new TextRun({
                                                text: `${edu.degree}, ${edu.major}` + (edu.gpa ? `, IPK: ${edu.gpa}` : ""),
                                                font: FONT,
                                                size: SIZE_BODY,
                                                italics: true,
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [new TextRun({ text: edu.period, font: FONT, size: SIZE_BODY })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            });
            elements.push(table);
        });
    }

    if (workExperience.length > 0) {
        elements.push(createSectionHeader("Pengalaman Kerja"));
        workExperience.forEach((work) => {
            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: borderNone,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        spacing: { after: 20 },
                                        children: [
                                            new TextRun({
                                                text: `${work.company} – ${work.location}`,
                                                font: FONT,
                                                size: SIZE_BODY,
                                                bold: true,
                                            }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60 },
                                        children: [
                                            new TextRun({ text: work.role, font: FONT, size: SIZE_BODY, italics: true }),
                                        ],
                                    }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [new TextRun({ text: work.period, font: FONT, size: SIZE_BODY })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            });
            elements.push(table);
            (work.bullets || []).filter(Boolean).forEach((b) => {
                if (!b.trim()) return;
                elements.push(
                    new Paragraph({
                        bullet: { level: 0 },
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: b.trim(), font: FONT, size: SIZE_BODY })],
                    })
                );
            });
        });
    }

    if (orgExperience.length > 0) {
        elements.push(createSectionHeader("Pengalaman Organisasi"));
        orgExperience.forEach((org) => {
            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: borderNone,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        spacing: { after: 20 },
                                        children: [
                                            new TextRun({
                                                text: `${org.organization} – ${org.location}`,
                                                font: FONT,
                                                size: SIZE_BODY,
                                                bold: true,
                                            }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60 },
                                        children: [new TextRun({ text: org.role, font: FONT, size: SIZE_BODY, italics: true })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [new TextRun({ text: org.period, font: FONT, size: SIZE_BODY })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            });
            elements.push(table);
            (org.bullets || []).filter(Boolean).forEach((b) => {
                if (!b.trim()) return;
                elements.push(
                    new Paragraph({
                        bullet: { level: 0 },
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: b.trim(), font: FONT, size: SIZE_BODY })],
                    })
                );
            });
        });
    }

    if (training.length > 0) {
        elements.push(createSectionHeader("Pelatihan"));
        training.forEach((t) => {
            const table = new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: borderNone,
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                width: { size: 70, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        spacing: { after: 20 },
                                        children: [
                                            new TextRun({
                                                text: `${t.title} – ${t.location}`,
                                                font: FONT,
                                                size: SIZE_BODY,
                                                bold: true,
                                            }),
                                        ],
                                    }),
                                    new Paragraph({
                                        spacing: { after: 60 },
                                        children: [new TextRun({ text: t.provider, font: FONT, size: SIZE_BODY, italics: true })],
                                    }),
                                ],
                            }),
                            new TableCell({
                                width: { size: 30, type: WidthType.PERCENTAGE },
                                borders: borderNone,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [new TextRun({ text: t.period, font: FONT, size: SIZE_BODY })],
                                    }),
                                ],
                            }),
                        ],
                    }),
                ],
            });
            elements.push(table);
            (t.bullets || []).filter(Boolean).forEach((b) => {
                if (!b.trim()) return;
                elements.push(
                    new Paragraph({
                        bullet: { level: 0 },
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: b.trim(), font: FONT, size: SIZE_BODY })],
                    })
                );
            });
        });
    }

    const hasSkills = softSkills || hardSkills || languages;
    if (hasSkills) {
        elements.push(createSectionHeader("Keahlian"));
        if (softSkills) {
            elements.push(
                new Paragraph({
                    spacing: { before: 30, after: 30 },
                    children: [
                        new TextRun({ text: "Soft Skills: ", font: FONT, size: SIZE_BODY, bold: true }),
                        new TextRun({ text: softSkills, font: FONT, size: SIZE_BODY }),
                    ],
                })
            );
        }
        if (hardSkills) {
            elements.push(
                new Paragraph({
                    spacing: { before: 30, after: 30 },
                    children: [
                        new TextRun({ text: "Hard Skills: ", font: FONT, size: SIZE_BODY, bold: true }),
                        new TextRun({ text: hardSkills, font: FONT, size: SIZE_BODY }),
                    ],
                })
            );
        }
        if (languages) {
            elements.push(
                new Paragraph({
                    spacing: { before: 30, after: 30 },
                    children: [
                        new TextRun({ text: "Language: ", font: FONT, size: SIZE_BODY, bold: true }),
                        new TextRun({ text: languages, font: FONT, size: SIZE_BODY }),
                    ],
                })
            );
        }
    }

    if (certifications.length > 0) {
        const filtered = certifications.filter(Boolean).map((c) => c.trim()).filter(Boolean);
        if (filtered.length > 0) {
            elements.push(createSectionHeader("Sertifikat"));
            filtered.forEach((cert) => {
                elements.push(
                    new Paragraph({
                        bullet: { level: 0 },
                        spacing: { before: 20, after: 20 },
                        children: [new TextRun({ text: cert, font: FONT, size: SIZE_BODY })],
                    })
                );
            });
        }
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: FONT },
                    paragraph: { spacing: { line: 276 } },
                },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            right: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1),
                        },
                    },
                },
                children: elements,
            },
        ],
    });

    try {
        const blob = await Packer.toBlob(doc);
        const filename = `CV-${fullName.replace(/\s+/g, "-") || "Resume"}.docx`;
        saveAs(blob, filename);
        toast.success("CV profesional berhasil diunduh sebagai .docx!");
    } catch (e) {
        toast.error("Gagal mendownload berkas CV.");
        console.error(e);
        throw e;
    }
}
