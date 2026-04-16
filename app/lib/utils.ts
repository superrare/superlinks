import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const escapeHtml = (str: string): string => {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
};

export const timeAgo = (ts: string): string => {
	const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
	if (s < 60) return "just now";
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
};

export const shortAddr = (addr: string): string =>
	`${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const formatUsd = (amount: number): string =>
	`$${amount.toFixed(2)}`;
