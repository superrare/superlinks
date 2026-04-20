import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router";
import {
	LinkIcon,
	PackageIcon,
	BarChart3Icon,
	WalletIcon,
	MessageSquareIcon,
	ShieldIcon,
	MenuIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

const SIDEBAR_KEY = "superlinks:sidebar-expanded";

interface SidebarNavProps {
	user: {
		email?: string;
		displayName?: string;
		avatarUrl?: string;
	};
}

const NAV_ITEMS = [
	{ href: "/dashboard/links", label: "My Links", icon: LinkIcon },
	{ href: "/dashboard/products", label: "Products", icon: PackageIcon },
	{ href: "/dashboard/insights", label: "Insights", icon: BarChart3Icon },
	{ href: "/dashboard/earn", label: "Earn", icon: WalletIcon },
	{ href: "/dashboard/messages", label: "Messages", icon: MessageSquareIcon },
	{ href: "/dashboard/admin", label: "Admin", icon: ShieldIcon },
];

const NavContent = ({
	expanded,
	onToggle,
	user,
	pathname,
}: {
	expanded: boolean;
	onToggle?: () => void;
	user: SidebarNavProps["user"];
	pathname: string;
}) => {
	const initial = (user.displayName ?? user.email ?? "U").charAt(0).toUpperCase();

	return (
		<div className="flex h-full flex-col">
			{expanded ? (
				<div className="mb-6 flex items-center justify-between">
					<Link
						to="/"
						className="flex items-center gap-2 px-3 py-2 text-lg font-extrabold tracking-tight"
					>
						<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent)] text-sm font-black text-[var(--accent-text)]">
							S
						</span>
						<span>SuperLinks.me</span>
					</Link>
					{onToggle && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0"
							onClick={onToggle}
							aria-label="Collapse menu"
							tabIndex={0}
						>
							<MenuIcon className="h-4 w-4" />
						</Button>
					)}
				</div>
			) : (
				<div className="mb-4 flex flex-col items-center gap-2">
					{onToggle && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={onToggle}
							aria-label="Expand menu"
							tabIndex={0}
						>
							<MenuIcon className="h-4 w-4" />
						</Button>
					)}
				</div>
			)}

			<nav className="flex flex-1 flex-col gap-1">
				{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
					const active = pathname.startsWith(href);
					return (
						<Link
							key={href}
							to={href}
							prefetch="intent"
							className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
								active
									? "bg-[var(--accent-subtle)] text-[var(--text)]"
									: "text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text)]"
							}`}
							aria-label={label}
						>
							<Icon className="h-5 w-5 shrink-0" />
							{expanded && <span>{label}</span>}
						</Link>
					);
				})}
			</nav>

			<Link
				to="/dashboard/settings"
				className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text)]"
				aria-label="Settings"
			>
				<Avatar className="h-7 w-7">
					{user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
					<AvatarFallback className="text-xs">{initial}</AvatarFallback>
				</Avatar>
				{expanded && (
					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium">{user.displayName ?? "Account"}</div>
						<div className="truncate text-xs text-[var(--text-tertiary)]">{user.email}</div>
					</div>
				)}
			</Link>
		</div>
	);
};

const readSidebarPref = (): boolean => {
	if (typeof window === "undefined") return true;
	const stored = localStorage.getItem(SIDEBAR_KEY);
	return stored === null ? true : stored === "1";
};

export const SidebarNav = ({ user }: SidebarNavProps) => {
	const [expanded, setExpanded] = useState(readSidebarPref);
	const { pathname } = useLocation();

	const handleToggle = useCallback(() => {
		setExpanded((prev) => {
			const next = !prev;
			localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
			return next;
		});
	}, []);

	useEffect(() => {
		localStorage.setItem(SIDEBAR_KEY, expanded ? "1" : "0");
	}, [expanded]);

	return (
		<>
			{/* Desktop sidebar */}
			<aside
				className={`app-nav hidden md:block ${expanded ? "expanded" : ""}`}
			>
				<div
					className="flex h-full flex-col rounded-3xl border p-3"
					style={{
						background: "var(--bg-elevated)",
						borderColor: "var(--border)",
						boxShadow: "var(--shadow-lg)",
					}}
				>
					<NavContent expanded={expanded} onToggle={handleToggle} user={user} pathname={pathname} />
				</div>
			</aside>

			{/* Mobile sheet */}
			<div className="fixed top-0 left-0 z-50 p-3 md:hidden">
				<Sheet>
					<SheetTrigger asChild>
						<Button variant="outline" size="icon" className="h-10 w-10" aria-label="Open menu">
							<MenuIcon className="h-5 w-5" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-64 p-4">
						<NavContent expanded user={user} pathname={pathname} />
					</SheetContent>
				</Sheet>
			</div>
		</>
	);
};
