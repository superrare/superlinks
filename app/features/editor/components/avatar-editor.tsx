import { useRef, useCallback } from "react";
import { PencilIcon } from "lucide-react";

interface AvatarEditorProps {
	avatarUrl?: string | null;
	displayName: string;
	onFileSelect: (file: File, previewUrl: string) => void;
	previewUrl?: string | null;
}

export const AvatarEditor = ({
	avatarUrl,
	displayName,
	onFileSelect,
	previewUrl,
}: AvatarEditorProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const initial = (displayName || "S").charAt(0).toUpperCase();
	const src = previewUrl ?? avatarUrl;

	const handleEditClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = () => {
				onFileSelect(file, reader.result as string);
			};
			reader.readAsDataURL(file);

			e.target.value = "";
		},
		[onFileSelect],
	);

	return (
		<div className="mb-6 flex items-center">
			<div className="relative shrink-0">
				<button
					type="button"
					className="flex h-[88px] w-[88px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-[3px] text-3xl font-bold"
					style={{
						borderColor: "var(--border)",
						background: src ? `url(${src}) center/cover no-repeat` : "var(--bg-surface)",
						color: src ? "transparent" : "var(--text)",
					}}
					onClick={handleEditClick}
					aria-label="Change avatar"
					tabIndex={0}
				>
					{!src && initial}
				</button>
				<button
					type="button"
					className="absolute right-0.5 bottom-0.5 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
					style={{
						background: "var(--accent)",
						color: "var(--accent-text)",
						borderColor: "var(--bg)",
					}}
					onClick={handleEditClick}
					aria-label="Change avatar"
					tabIndex={0}
				>
					<PencilIcon className="h-3.5 w-3.5" />
				</button>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
					aria-hidden="true"
				/>
			</div>
		</div>
	);
};
