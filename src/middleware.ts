import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// /api/session/upload and /api/avatar/upload must stay public: Vercel Blob's
// client-upload flow calls them a second time as a server-to-server
// "upload-completed" webhook (no Clerk session) after the file lands in
// storage. auth.protect() would 404 that callback before the route handler
// runs - see onUploadCompleted in each route - so addImageToSession /
// addImageToPlayer would never fire even though the blob itself uploaded
// fine. Each route already authenticates the browser-initiated call itself
// via auth() in onBeforeGenerateToken, and Vercel verifies the callback via
// a signed payload, so this doesn't weaken auth - it just lets the routes'
// own checks run instead of being pre-empted by the middleware.
const isPublicRoute = createRouteMatcher([
  '/',
  '/signin(.*)',
  '/signup(.*)',
  '/privacy',
  '/api/session/upload',
  '/api/avatar/upload',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
