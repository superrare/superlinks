import { redirect } from "react-router";
import type { Route } from "./+types/discover-detail";

export const loader = async ({ params }: Route.LoaderArgs) => {
	throw redirect(`/${params.slug}`);
};
