interface Env {
    API_URL: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env, params } = context;
    const url = new URL(request.url);

    // 1. Resolve Backend URL
    // Default to local Railway if not set (development fallback)
    const backendBase = env.API_URL || "http://127.0.0.1:8000";

    // Construct destination URL
    // context.params.route is an array of path segments
    const route = Array.isArray(params.route) ? params.route.join('/') : params.route;
    const destinationUrl = `${backendBase}/api/${route}${url.search}`;

    // 2. Caching Logic (Public Performance Data)
    // Only cache GET requests to /api/performance
    const isPerformanceRoute = route === "performance";
    const cache = caches.default;
    const cacheKey = new Request(destinationUrl, request);

    if (request.method === "GET" && isPerformanceRoute) {
        let response = await cache.match(cacheKey);
        if (response) {
            return response;
        }
    }

    // 3. Request Forwarding
    // Clone headers to modify them
    const headers = new Headers(request.headers);

    // Security: Ensure Host header matches backend (optional, but good practice)
    // headers.set("Host", new URL(backendBase).hostname);

    // Security: Inject CF Access details if available
    // (This proves the request came through Cloudflare Access)
    const cfAccessJwt = request.headers.get("Cf-Access-Jwt-Assertion");
    if (cfAccessJwt) {
        headers.set("X-CF-Access-Jwt", cfAccessJwt);
    }

    try {
        const backendResponse = await fetch(destinationUrl, {
            method: request.method,
            headers: headers,
            body: request.body,
            redirect: "follow",
        });

        // 4. Response Handling
        const responseHeaders = new Headers(backendResponse.headers);

        // Security: HSTS (Strict Transport Security)
        responseHeaders.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        responseHeaders.set("X-Content-Type-Options", "nosniff");
        responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

        const response = new Response(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: responseHeaders,
        });

        // Cache successful performance responses
        if (request.method === "GET" && isPerformanceRoute && backendResponse.ok) {
            // Cache for 60 seconds
            response.headers.set("Cache-Control", "public, max-age=60");
            context.waitUntil(cache.put(cacheKey, response.clone()));
        }

        return response;

    } catch (err) {
        // Handle Gateway Errors
        return new Response(JSON.stringify({ error: "Backend Unavailable", details: String(err) }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }
};
