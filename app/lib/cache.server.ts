const DEFAULT_TTL = 3600;

const getCache = () => (caches as unknown as { default: Cache }).default;

export const getCachedResponse = async (url: string): Promise<Response | undefined> => {
	const cache = getCache();
	const cacheKey = new Request(url);
	const cached = await cache.match(cacheKey);
	return cached;
};

export const putCachedResponse = async (
	url: string,
	response: Response,
	ttl = DEFAULT_TTL,
): Promise<void> => {
	const cache = getCache();
	const cacheKey = new Request(url);
	const cloned = response.clone();
	const headers = new Headers(cloned.headers);
	headers.set("Cache-Control", `public, max-age=${ttl}`);

	const cachedResponse = new Response(cloned.body, {
		status: cloned.status,
		headers,
	});

	await cache.put(cacheKey, cachedResponse);
};

export const invalidateCache = async (url: string): Promise<boolean> => {
	const cache = getCache();
	const cacheKey = new Request(url);
	return cache.delete(cacheKey);
};
