import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

interface EditorLayoutProps {
	data: {
		storefronts: any;
		profile: any;
		links: any;
		ENV: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
	};
}

export const EditorLayout = ({ data }: EditorLayoutProps) => {
	const { profile, links: linksData } = data;
	const storefronts = (data.storefronts as any)?.storefronts ?? [];
	const storefront = storefronts[0];
	const existingLinks = (linksData as any)?.links ?? [];
	const fetcher = useFetcher();

	const [handle, setHandle] = useState(profile?.username ?? storefront?.slug ?? "");
	const [displayName, setDisplayName] = useState(profile?.display_name ?? storefront?.name ?? "");
	const [bio, setBio] = useState(storefront?.bio ?? "");
	const [website, setWebsite] = useState(storefront?.website ?? "");
	const [twitter, setTwitter] = useState(storefront?.twitter ?? "");
	const [telegram, setTelegram] = useState(storefront?.telegram ?? "");
	const [farcaster, setFarcaster] = useState(storefront?.farcaster ?? "");

	const [newLinkTitle, setNewLinkTitle] = useState("");
	const [newLinkUrl, setNewLinkUrl] = useState("");

	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data) {
			const result = fetcher.data as { ok?: boolean; error?: string };
			if (result.ok) {
				toast.success("Changes saved");
			} else if (result.error) {
				toast.error(result.error);
			}
		}
	}, [fetcher.state, fetcher.data]);

	const handleSaveProfile = () => {
		const formData = new FormData();
		formData.set("intent", "update-profile");
		formData.set("handle", handle);
		formData.set("display_name", displayName);
		formData.set("bio", bio);
		formData.set("website", website);
		formData.set("twitter", twitter);
		formData.set("telegram", telegram);
		formData.set("farcaster", farcaster);
		fetcher.submit(formData, { method: "post" });
	};

	const handleAddLink = () => {
		if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
		const formData = new FormData();
		formData.set("intent", "add-link");
		formData.set("title", newLinkTitle.trim());
		formData.set("url", newLinkUrl.trim());
		fetcher.submit(formData, { method: "post" });
		setNewLinkTitle("");
		setNewLinkUrl("");
	};

	const handleDeleteLink = (linkId: string) => {
		const formData = new FormData();
		formData.set("intent", "delete-link");
		formData.set("linkId", linkId);
		fetcher.submit(formData, { method: "post" });
	};

	if (!storefront) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-bold">Setting up your page...</h2>
					<p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
						Your storefront is being created. Refresh the page in a moment.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-8 lg:grid-cols-[1fr_320px]">
			<div>
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">My Links</h1>
						<p className="text-sm" style={{ color: "var(--text-secondary)" }}>
							superlinks.me/{storefront.slug}
						</p>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" asChild>
							<a href={`/${storefront.slug}`} target="_blank" rel="noopener noreferrer">
								View page
							</a>
						</Button>
						<Button size="sm" onClick={handleSaveProfile} disabled={fetcher.state !== "idle"}>
							{fetcher.state !== "idle" ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>

				<Tabs defaultValue="content">
					<TabsList>
						<TabsTrigger value="content">Content & Links</TabsTrigger>
						<TabsTrigger value="design">Design</TabsTrigger>
					</TabsList>

					<TabsContent value="content" className="mt-6 space-y-8">
						<section className="space-y-4">
							<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
								Profile
							</h2>
							<div className="space-y-3">
								<div>
									<Label htmlFor="handle">Handle</Label>
									<div className="mt-1 flex items-center overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
										<span className="bg-[var(--bg-surface)] px-3 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>superlinks.me/</span>
										<Input id="handle" className="border-0 shadow-none focus-visible:ring-0" value={handle} onChange={(e) => setHandle(e.target.value)} />
									</div>
								</div>
								<div>
									<Label htmlFor="displayName">Display Name</Label>
									<Input id="displayName" className="mt-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="bio">Bio</Label>
									<Textarea id="bio" className="mt-1" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
								</div>
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
								Social Links
							</h2>
							<div className="grid gap-3 sm:grid-cols-2">
								<div>
									<Label htmlFor="website">Website</Label>
									<Input id="website" className="mt-1" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="twitter">X / Twitter</Label>
									<Input id="twitter" className="mt-1" placeholder="@handle" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="telegram">Telegram</Label>
									<Input id="telegram" className="mt-1" placeholder="@handle" value={telegram} onChange={(e) => setTelegram(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="farcaster">Farcaster</Label>
									<Input id="farcaster" className="mt-1" placeholder="@handle" value={farcaster} onChange={(e) => setFarcaster(e.target.value)} />
								</div>
							</div>
						</section>

						<section className="space-y-4">
							<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
								Custom Links
							</h2>

							<div className="space-y-2">
								{existingLinks.map((link: any) => (
									<div
										key={link.id}
										className="flex items-center gap-3 rounded-lg border p-3"
										style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
									>
										<span className="w-8 text-center text-lg">{link.icon || "🔗"}</span>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium">{link.title}</div>
											<div className="truncate text-xs" style={{ color: "var(--text-tertiary)" }}>{link.url}</div>
										</div>
										<Button variant="ghost" size="sm" className="text-[var(--danger)]" onClick={() => handleDeleteLink(link.id)}>
											Delete
										</Button>
									</div>
								))}
							</div>

							<div className="flex gap-2">
								<div className="flex-1">
									<Label htmlFor="new-link-title" className="sr-only">Link title</Label>
									<Input id="new-link-title" placeholder="Title" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} />
								</div>
								<div className="flex-1">
									<Label htmlFor="new-link-url" className="sr-only">Link URL</Label>
									<Input id="new-link-url" placeholder="https://..." value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} />
								</div>
								<Button variant="outline" onClick={handleAddLink}>Add</Button>
							</div>
						</section>
					</TabsContent>

					<TabsContent value="design" className="mt-6">
						<section className="space-y-4">
							<h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
								Link Page Theme
							</h2>
							<p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
								Customize colors, fonts, and button styles for your public page.
							</p>
						</section>
					</TabsContent>
				</Tabs>
			</div>

			<aside className="hidden lg:block">
				<div className="sticky top-8">
					<div
						className="overflow-hidden rounded-[2rem] border p-6 shadow-lg"
						style={{ background: "var(--bg-elevated)", borderColor: "var(--border-subtle)", width: "280px", minHeight: "500px" }}
					>
						<div className="mx-auto mb-6 h-1.5 w-16 rounded-full" style={{ background: "var(--border)" }} />
						<div className="text-center">
							<div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-xl font-extrabold text-[var(--accent-text)]">
								{displayName.charAt(0).toUpperCase() || "S"}
							</div>
							<div className="text-sm font-bold">{displayName || "Your Name"}</div>
							<div className="text-xs" style={{ color: "var(--text-tertiary)" }}>@{handle || "handle"}</div>
							{bio && <div className="mx-auto mt-2 max-w-[200px] text-xs" style={{ color: "var(--text-secondary)" }}>{bio}</div>}
						</div>
						<div className="mt-5 space-y-2">
							{existingLinks.slice(0, 4).map((link: any) => (
								<div key={link.id} className="rounded-full border px-4 py-2.5 text-center text-xs font-medium" style={{ borderColor: "var(--border-subtle)" }}>
									{link.title}
								</div>
							))}
						</div>
					</div>
				</div>
			</aside>
		</div>
	);
};
