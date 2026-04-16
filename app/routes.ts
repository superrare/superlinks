import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("login", "routes/login.tsx"),
	route("signup", "routes/signup.tsx"),
	route("auth/callback", "routes/auth-callback.tsx"),
	route("docs", "routes/docs.tsx"),
	route("discover", "routes/discover.tsx"),
	route("discover/:slug", "routes/discover-detail.tsx"),
	route("app/:id", "routes/app-viewer.tsx"),

	layout("routes/dashboard-layout.tsx", [
		route("dashboard", "routes/dashboard-index.tsx"),
		route("dashboard/links", "routes/dashboard-links.tsx"),
		route("dashboard/products", "routes/dashboard-products.tsx"),
		route("dashboard/insights", "routes/dashboard-insights.tsx"),
		route("dashboard/earn", "routes/dashboard-earn.tsx"),
		route("dashboard/messages", "routes/dashboard-messages.tsx"),
		route("dashboard/messages/:partnerId", "routes/dashboard-message.tsx"),
		route("dashboard/admin", "routes/dashboard-admin.tsx"),
		route("dashboard/settings", "routes/dashboard-settings.tsx"),
	]),

	route(":handle", "routes/creator-page.tsx"),
] satisfies RouteConfig;
