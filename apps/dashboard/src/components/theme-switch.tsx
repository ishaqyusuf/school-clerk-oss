"use client";

import { Button } from "@school-clerk/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const ThemeSwitch = () => {
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!mounted) {
		return <div className="h-9 w-9" />;
	}

	const isDark = resolvedTheme === "dark";
	const nextTheme = isDark ? "light" : "dark";

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={`Switch to ${nextTheme} theme`}
			title={`Switch to ${nextTheme} theme`}
			onClick={() => setTheme(nextTheme)}
			className="h-9 w-9 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
		>
			{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</Button>
	);
};
