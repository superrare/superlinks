import { create } from "zustand";

interface EditorState {
	isDirty: boolean;
	activeTab: "content" | "design";
	draggedLinkId: string | null;
	setDirty: (dirty: boolean) => void;
	setActiveTab: (tab: "content" | "design") => void;
	setDraggedLinkId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
	isDirty: false,
	activeTab: "content",
	draggedLinkId: null,
	setDirty: (dirty) => set({ isDirty: dirty }),
	setActiveTab: (tab) => set({ activeTab: tab }),
	setDraggedLinkId: (id) => set({ draggedLinkId: id }),
}));
