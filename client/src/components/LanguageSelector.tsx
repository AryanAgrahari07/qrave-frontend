import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage, SupportedLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
    className?: string;
}

const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिंदी" },
    { code: "es", name: "Español" },
];

export function LanguageSelector({ className }: LanguageSelectorProps) {
    const { language, setLanguage } = useLanguage();

    return (
        <div className={`flex items-center gap-2 ${className || ""}`}>
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select
                value={language}
                onValueChange={(value) => setLanguage(value as SupportedLanguage)}
            >
                <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                    {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code} className="text-xs">
                            {lang.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
