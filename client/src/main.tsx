import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Dev-only accessibility audit (axe) - lazy import to avoid production bundle impact
// Vite exposes import.meta.env.MODE
// Using optional chaining to avoid TS declaration clashes
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') {
	// dynamic import to keep prod clean; ignore errors if package missing
	import("@axe-core/react").then(mod => {
		const axe = mod.default || (mod as any);
		// 1000ms debounce to allow initial render stabilization
		axe(React, { createRoot }, 1000, {
			rules: [
				// keep default; potential future rule customizations
			],
		});
	}).catch(() => {
		// silent fail – axe optional
	});
}

createRoot(document.getElementById("root")!).render(<App />);
