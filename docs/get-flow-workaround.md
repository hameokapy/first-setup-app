# Fetching posts with Axios, TanStack Query, and TanStack Router

This guide adds a real `/posts` page to the existing Vite application. The page uses
[JSONPlaceholder](https://jsonplaceholder.typicode.com/) while the feature is being built,
but keeps a parallel adapter ready for the
[Qik API](https://api.qik.gg/portal/docs).

The finished page will support:

- A shareable URL such as `/posts?page=2&limit=10&search=react`.
- Cached requests and route-level prefetching.
- A search input with a 300 ms debounce.
- Previous and next page controls.
- One UI that can switch between JSONPlaceholder and Qik through environment variables.

Qik currently returns `401 Unauthorized` and its public Swagger documentation does not
provide a usable frontend login flow. JSONPlaceholder is therefore the working API for
this tutorial. The Qik code will compile, but it must stay disabled until authentication
details are available.

## Why each library is used

- **Axios** sends HTTP requests. It knows the API base URL, converts a params object into a
  query string, passes cancellation signals, and runs shared response interceptors.
- **TanStack Query** owns server state. It caches responses, tracks pending and error
  states, retries eligible failures, and cancels requests that are no longer needed.
- **TanStack Router** owns URL state. It reads `page`, `limit`, and `search` from the URL,
  validates them, and asks Query to preload the data required by a route.

They are connected, but they do not replace one another:

```text
Browser URL
  → TanStack Router validates page/limit/search
  → TanStack Query creates a cache key
  → Axios serializes HTTP query params and sends the request
  → the API returns data
  → TanStack Query caches it
  → the route renders the UI
```

## Five similar terms that mean different things

The word “params” is used in several places. Keep these meanings separate:

| Name               | Example                         | Responsibility                                |
| ------------------ | ------------------------------- | --------------------------------------------- |
| Route path param   | `/posts/$postId`                | Identifies a dynamic Router path segment      |
| HTTP path param    | `/v1/post/:id` with `{ id: 1 }` | Replaces `:id` before Axios sends the request |
| URL search param   | `/posts?page=2`                 | Stores UI state in the browser URL            |
| Axios query param  | `{ _page: '2' }`                | Becomes `?_page=2` in the API request         |
| TanStack Query key | `['posts', source, params]`     | Identifies one cached response                |

For example:

```ts
axiosClient.get('/v1/post/:id', { include: 'categories' }, { id: 1 }, {})
```

Axios ultimately sends:

```text
GET /v1/post/1?include=categories
```

The endpoint string does not need to contain `?include=categories`. Axios creates that
part from its `params` config.

## Current project starting point

The project already has:

- A `QueryClient` and Router instance in `src/main.tsx`.
- `queryClient` available through the root Router context.
- An Axios wrapper in `src/lib/http-client.ts`.
- A status-aware Query retry policy.
- shadcn `Button`, `Card`, and `Input` components.
- Vitest and a working unit-test convention.

Do not create a second Router or Query client. The steps below extend the existing setup.

## Implementation steps

### 1. Correct the Router registration and mount the global toaster

#### Why this step is needed

TanStack Router registers the concrete `router` instance with TypeScript. The existing
module augmentation uses `route: typeof Router`, which does not register the application
router. The project can still typecheck, but route-specific type inference is not wired up
correctly.

The toaster is currently mounted only on the home page. A toast triggered while `/posts`
is active would therefore have no toaster to render it. Move it to the root layout.

#### Update `src/main.tsx`

Keep the current retry behavior and replace the file with:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { getErrorStatus } from '@/lib/handle-server-error'
import { routeTree } from '@/routeTree.gen.ts'

import '@/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = getErrorStatus(error)

        if (status && status >= 400 && status < 500) {
          return false
        }

        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
```

#### Update `src/routes/__root.tsx`

```tsx
import type { QueryClient } from '@tanstack/react-query'

import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import { Toaster } from '@/components/ui/sonner'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <div>404 - Not Found</div>,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster richColors />
    </>
  )
}
```

Remove the `Toaster` import and `<Toaster />` element from `src/routes/index.tsx`. The home
page should only render its own content.

#### What happens at runtime

There is still exactly one Router and one Query client. Every route renders inside
`RootLayout`, so the same toaster is available everywhere.

#### Checkpoint

```bash
pnpm typecheck
pnpm dev
```

Confirm that `/` still renders and an unknown URL still shows the 404 component.

### 2. Configure which posts API is active

#### Why this step is needed

Both APIs expose posts, but their base URLs and response formats differ. The application
will choose one adapter when Vite starts. The route and UI will not need to know which
backend is active.

#### Create `.env.example`

Use JSONPlaceholder as the documented default:

```dotenv
VITE_POSTS_SOURCE=jsonplaceholder
VITE_API_BASE_URL=https://jsonplaceholder.typicode.com
```

Copy those values into the ignored local `.env` file while following this tutorial.

The future Qik pair is:

```dotenv
VITE_POSTS_SOURCE=qik
VITE_API_BASE_URL=https://api.qik.gg/portal
```

The `/portal` prefix is required. `https://api.qik.gg/v1/post` is a different gateway path
and returns a plain 404 response that can look like a CORS problem in the browser.

#### Create `src/vite-env.d.ts`

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_POSTS_SOURCE?: 'jsonplaceholder' | 'qik'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

`VITE_POSTS_SOURCE` is optional because the source selector will safely default to
JSONPlaceholder when it is missing.

Never store a long-lived access token in a `VITE_*` variable. Vite embeds these variables
in browser JavaScript, so users can read them.

#### What happens at runtime

Vite reads the environment variables when the dev server starts. Changing `.env` while
the server is running requires a restart.

#### Checkpoint

Restart the dev server after changing `.env`. Keep the JSONPlaceholder pair active for
the remaining working checkpoints. Step 9 renders the resolved source name in the page,
so the environment choice will also be visible in the finished UI.

### 3. Add typed body and full-response Axios methods

#### Why this step is needed

Most API functions only need the JSON response body, so `get<T>` should continue returning
`response.data`. JSONPlaceholder is an exception: its total record count is stored in the
`X-Total-Count` response header. `getResponse<T>` provides an explicit way to read headers
without changing the existing `get<T>` contract.

The `...config` spread remains after `params` intentionally. It is an escape hatch that
allows a special call site to override the wrapper defaults later.

#### Replace `src/lib/http-client.ts`

```ts
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

import { getErrorStatus, handleApiError, handleSessionError } from '@/lib/handle-server-error'

type PathParams = Record<string, unknown>
type QueryParams = Record<string, unknown>

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/'

const http = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    const status = getErrorStatus(error)

    if (status === 401 && axios.isAxiosError(error) && !error.config?.url?.startsWith('/auth/')) {
      handleSessionError()
    }

    if (status === undefined || status >= 400) {
      handleApiError(error)
    }

    return Promise.reject(error)
  }
)

async function getResponse<T>(
  endpoint: string,
  queryParams: QueryParams,
  pathParams: PathParams,
  config: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const url = generateCompletedEndpoint(endpoint, pathParams)

  return http.get<T>(url, {
    params: queryParams,
    ...config,
  })
}

async function get<T>(
  endpoint: string,
  queryParams: QueryParams,
  pathParams: PathParams,
  config: AxiosRequestConfig
): Promise<T> {
  const response = await getResponse<T>(endpoint, queryParams, pathParams, config)
  return response.data
}

export const axiosClient = {
  get,
  getResponse,
}

function generateCompletedEndpoint(endpoint: string, params: PathParams): string {
  return endpoint.replace(/:([a-zA-Z0-9]+)/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `:${key}`
  })
}
```

Cancellation is checked before the global error handler. Without that check, a request
cancelled by a newer debounced search has no HTTP status and would incorrectly show the
generic “Something went wrong” toast.

These calls now have different return types:

```ts
const posts = await axiosClient.get<Array<{ id: number }>>('/posts', {}, {}, {})
// posts is Array<{ id: number }>

const response = await axiosClient.getResponse<Array<{ id: number }>>('/posts', {}, {}, {})
// response.data is Array<{ id: number }> and response.headers contains metadata
```

#### What happens at runtime

`get<T>` calls `getResponse<T>`, waits for Axios, and unwraps `response.data`.
`getResponse<T>` leaves the full Axios response intact. Both methods use the same Axios
instance and response interceptor.

#### Checkpoint

```bash
pnpm typecheck
pnpm test:run
```

No existing caller should change behavior because `get` still resolves to the response
body.

### 4. Define the API-specific and shared post types

#### Why this step is needed

JSONPlaceholder calls the post text `body`; Qik calls it `excerpt`. Qik also wraps the
list in a pagination object, while JSONPlaceholder returns a bare array. The UI should not
contain conditions for these backend differences.

#### Create the feature folder

```bash
mkdir -p src/features/posts/api
```

#### Create `src/features/posts/api/types.ts`

```ts
export interface JsonPlaceholderPost {
  body: string
  id: number
  title: string
  userId: number
}

export interface QikPost {
  excerpt: string
  id: number
  title: string
}

export interface QikPaginatedResponse<T> {
  data: T[]
  limit: number
  message: unknown
  page: number
  statusCode: number
  total: number
}

export interface PostSummary {
  excerpt: string
  id: number
  title: string
}

export interface PostsListParams {
  limit: number
  page: number
  search: string
}

export interface PostsPage {
  items: PostSummary[]
  limit: number
  page: number
  total: number | null
}

export interface PostsApi {
  list: (params: PostsListParams, signal: AbortSignal) => Promise<PostsPage>
}

export type PostsSource = 'jsonplaceholder' | 'qik'
```

`PostsPage` is the feature contract. Everything above the API adapter—the Query options,
Router, and UI—will only work with this shape.

`total` is nullable because JSONPlaceholder may omit its count header. Qik provides total
inside its response body.

#### Checkpoint

```bash
pnpm typecheck
```

This step adds types only and should not cause a network request.

### 5. Build both API adapters

Each adapter performs three jobs:

1. Convert shared `PostsListParams` into the query names expected by its API.
2. Make the Axios request.
3. Convert the API response into `PostsPage`.

The small query and normalization functions are exported so they can be unit tested
without making real network requests.

#### JSONPlaceholder adapter

Create `src/features/posts/api/jsonplaceholder-posts.ts`:

```ts
import type {
  JsonPlaceholderPost,
  PostsApi,
  PostsListParams,
  PostsPage,
} from '@/features/posts/api/types'
import { axiosClient } from '@/lib/http-client'

export function createJsonPlaceholderQuery(params: PostsListParams): Record<string, string> {
  return {
    _limit: String(params.limit),
    _page: String(params.page),
    ...(params.search ? { q: params.search } : {}),
  }
}

export function normalizeJsonPlaceholderPosts(
  posts: JsonPlaceholderPost[],
  totalHeader: unknown,
  params: PostsListParams
): PostsPage {
  return {
    items: posts.map((post) => ({
      excerpt: post.body,
      id: post.id,
      title: post.title,
    })),
    limit: params.limit,
    page: params.page,
    total: parseTotalCount(totalHeader),
  }
}

export async function listJsonPlaceholderPosts(
  params: PostsListParams,
  signal: AbortSignal
): Promise<PostsPage> {
  const response = await axiosClient.getResponse<JsonPlaceholderPost[]>(
    '/posts',
    createJsonPlaceholderQuery(params),
    {},
    { signal }
  )

  return normalizeJsonPlaceholderPosts(response.data, response.headers['x-total-count'], params)
}

export const jsonPlaceholderPostsApi: PostsApi = {
  list: listJsonPlaceholderPosts,
}

function parseTotalCount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null
  }

  if (value === '') {
    return null
  }

  const total = Number(value)
  return Number.isFinite(total) && total >= 0 ? total : null
}
```

With `{ page: 2, limit: 10, search: 'react' }`, Axios sends:

```text
GET /posts?_limit=10&_page=2&q=react
```

Query-string order is not semantically important. `_page=2&_limit=10` and
`_limit=10&_page=2` mean the same thing.

#### Qik adapter

Create `src/features/posts/api/qik-posts.ts`:

```ts
import type {
  PostsApi,
  PostsListParams,
  PostsPage,
  QikPaginatedResponse,
  QikPost,
} from '@/features/posts/api/types'
import { axiosClient } from '@/lib/http-client'

export function createQikQuery(params: PostsListParams): Record<string, string> {
  return {
    limit: String(params.limit),
    page: String(params.page),
    ...(params.search ? { search: params.search } : {}),
  }
}

export function normalizeQikPosts(response: QikPaginatedResponse<QikPost>): PostsPage {
  return {
    items: response.data.map((post) => ({
      excerpt: post.excerpt,
      id: post.id,
      title: post.title,
    })),
    limit: response.limit,
    page: response.page,
    total: response.total,
  }
}

export async function listQikPosts(
  params: PostsListParams,
  signal: AbortSignal
): Promise<PostsPage> {
  const response = await axiosClient.get<QikPaginatedResponse<QikPost>>(
    '/v1/post',
    createQikQuery(params),
    {},
    { signal }
  )

  return normalizeQikPosts(response)
}

export const qikPostsApi: PostsApi = {
  list: listQikPosts,
}
```

With the same shared params, the Qik request would be:

```text
GET /v1/post?limit=10&page=2&search=react
```

#### Select the active adapter

Create `src/features/posts/api/posts-api.ts`:

```ts
import { jsonPlaceholderPostsApi } from '@/features/posts/api/jsonplaceholder-posts'
import { qikPostsApi } from '@/features/posts/api/qik-posts'
import type { PostsApi, PostsSource } from '@/features/posts/api/types'

const postsApis = {
  jsonplaceholder: jsonPlaceholderPostsApi,
  qik: qikPostsApi,
} satisfies Record<PostsSource, PostsApi>

export function resolvePostsSource(value: string | undefined): PostsSource {
  if (value === undefined || value === '' || value === 'jsonplaceholder') {
    return 'jsonplaceholder'
  }

  if (value === 'qik') {
    return 'qik'
  }

  throw new Error(`Unsupported VITE_POSTS_SOURCE: ${value}`)
}

export const postsSource = resolvePostsSource(import.meta.env.VITE_POSTS_SOURCE)
export const postsApi = postsApis[postsSource]
```

#### What happens at runtime

Only one adapter is selected for a running build. Both adapters compile, but the route
calls only `postsApi.list()`. The environment controls which concrete implementation that
reference points to.

#### Checkpoint

Keep `VITE_POSTS_SOURCE=jsonplaceholder`, then run:

```bash
pnpm typecheck
```

Do not switch to Qik yet. Its request is expected to fail with `401` until a real token is
available.

### 6. Create one reusable TanStack Query definition

#### Why this step is needed

The route loader and React component need the same query key and query function. Defining
them once prevents the loader from prefetching one cache entry while the component reads a
different entry.

#### Create `src/features/posts/queries.ts`

```ts
import { queryOptions } from '@tanstack/react-query'

import { postsApi, postsSource } from '@/features/posts/api/posts-api'
import type { PostsListParams } from '@/features/posts/api/types'

export function postsQueryOptions(params: PostsListParams) {
  return queryOptions({
    queryKey: ['posts', postsSource, params],
    queryFn: ({ signal }) => postsApi.list(params, signal),
  })
}
```

For example, these are different cache entries:

```ts
;['posts', 'jsonplaceholder', { page: 1, limit: 10, search: '' }][
  ('posts', 'jsonplaceholder', { page: 2, limit: 10, search: '' })
][('posts', 'qik', { page: 1, limit: 10, search: '' })]
```

The `AbortSignal` created by TanStack Query is passed through the adapter and Axios config.

#### What happens at runtime

If the same query key is requested while its data is still fresh, Query returns the cached
data. A changed page, search term, limit, or API source creates a different key and starts
a new request.

#### Checkpoint

```bash
pnpm typecheck
```

No request is sent yet because no component or loader calls these options.

### 7. Validate the `/posts` URL search state

#### Why this step is needed

Browser search params start as unknown values. Users can manually enter URLs such as
`?page=-1`, `?page=hello`, or `?limit=0`. Convert valid values to numbers and use safe
defaults for invalid values before the API or Query key sees them.

#### Create `src/features/posts/search.ts`

```ts
import type { PostsListParams } from '@/features/posts/api/types'

export const DEFAULT_POSTS_LIMIT = 10
export const DEFAULT_POSTS_PAGE = 1

export function parsePostsSearch(search: Record<string, unknown>): PostsListParams {
  return {
    limit: readPositiveInteger(search.limit, DEFAULT_POSTS_LIMIT),
    page: readPositiveInteger(search.page, DEFAULT_POSTS_PAGE),
    search: typeof search.search === 'string' ? search.search.trim() : '',
  }
}

function readPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return fallback
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
```

Examples:

| Input                  | Normalized result                         |
| ---------------------- | ----------------------------------------- |
| `?page=2&limit=5`      | `{ page: 2, limit: 5, search: '' }`       |
| `?page=-1&limit=hello` | `{ page: 1, limit: 10, search: '' }`      |
| `?search=%20react%20`  | `{ page: 1, limit: 10, search: 'react' }` |

#### Checkpoint

```bash
pnpm typecheck
```

The parser is a pure function and will be covered by unit tests later.

### 8. Create the `/posts` route and prove the data flow

#### Why this step is split from the final UI

Render the normalized data first. This confirms that the Router loader, Query cache, Axios
adapter, and API all work before adding search and pagination interactions.

#### Create `src/routes/posts.tsx`

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { postsQueryOptions } from '@/features/posts/queries'
import { parsePostsSearch } from '@/features/posts/search'

export const Route = createFileRoute('/posts')({
  validateSearch: parsePostsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(postsQueryOptions(deps)),
  pendingComponent: () => <main className="p-6">Loading posts...</main>,
  errorComponent: ({ error }) => <main className="p-6">Could not load posts: {error.message}</main>,
  component: PostsPage,
})

function PostsPage() {
  const search = Route.useSearch()
  const { data } = useSuspenseQuery(postsQueryOptions(search))

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Posts</h1>
      <pre className="overflow-auto rounded-lg border p-4">{JSON.stringify(data, null, 2)}</pre>
    </main>
  )
}
```

Start the dev server once after adding the file so the Router plugin regenerates
`src/routeTree.gen.ts`:

```bash
pnpm dev
```

Then visit:

```text
http://localhost:5173/posts?page=2&limit=5
```

#### What happens at runtime

1. Router calls `parsePostsSearch`.
2. `loaderDeps` exposes the normalized values to the loader.
3. The loader calls `ensureQueryData` before rendering the page.
4. The component calls `useSuspenseQuery` with the same options.
5. Because the loader already filled that cache entry, the component reuses it instead of
   sending a duplicate request.

#### Checkpoint

In the Network tab, confirm one request similar to:

```text
https://jsonplaceholder.typicode.com/posts?_limit=5&_page=2
```

The rendered object should contain five items, `page: 2`, `limit: 5`, and `total: 100`.

### 9. Replace the debug output with the working UI

#### Why this step is needed

The data flow is now proven. The final component can concentrate on user interaction:
cards, page navigation, and debounced search.

#### Replace `src/routes/posts.tsx`

```tsx
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { postsSource } from '@/features/posts/api/posts-api'
import { postsQueryOptions } from '@/features/posts/queries'
import { parsePostsSearch } from '@/features/posts/search'

export const Route = createFileRoute('/posts')({
  validateSearch: parsePostsSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(postsQueryOptions(deps)),
  pendingComponent: () => <main className="p-6">Loading posts...</main>,
  errorComponent: ({ error }) => <main className="p-6">Could not load posts: {error.message}</main>,
  component: PostsPage,
})

function PostsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(postsQueryOptions(search))

  const totalPages = data.total === null ? null : Math.max(1, Math.ceil(data.total / search.limit))
  const canGoNext =
    totalPages === null ? data.items.length === search.limit : search.page < totalPages

  const handleSearch = useCallback(
    (nextSearch: string) => {
      void navigate({
        replace: true,
        search: (previous) => ({
          ...previous,
          page: 1,
          search: nextSearch,
        }),
      })
    },
    [navigate]
  )

  function goToPage(page: number) {
    void navigate({
      search: (previous) => ({
        ...previous,
        page,
      }),
    })
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Posts</h1>
        <p className="text-sm text-muted-foreground">
          Active API: <strong>{postsSource}</strong>
        </p>
      </header>

      <PostsSearchInput key={search.search} initialValue={search.search} onSearch={handleSearch} />

      {data.items.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-muted-foreground">No posts found.</p>
      ) : (
        <div className="grid gap-4">
          {data.items.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>Post #{post.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <nav className="flex items-center justify-between" aria-label="Posts pagination">
        <Button
          type="button"
          variant="outline"
          disabled={search.page <= 1}
          onClick={() => goToPage(Math.max(1, search.page - 1))}
        >
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Page {search.page}
          {totalPages === null ? '' : ` of ${totalPages}`}
        </span>

        <Button
          type="button"
          variant="outline"
          disabled={!canGoNext}
          onClick={() => goToPage(search.page + 1)}
        >
          Next
        </Button>
      </nav>
    </main>
  )
}

interface PostsSearchInputProps {
  initialValue: string
  onSearch: (value: string) => void
}

function PostsSearchInput({ initialValue, onSearch }: PostsSearchInputProps) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (value === initialValue) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onSearch(value.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [initialValue, onSearch, value])

  return (
    <Input
      type="search"
      value={value}
      aria-label="Search posts"
      placeholder="Search posts..."
      onChange={(event) => setValue(event.target.value)}
    />
  )
}
```

`key={search.search}` remounts the input if browser Back or Forward navigation restores a
different search term. That keeps the local draft synchronized with the URL without a
second synchronization effect.

The search navigation uses `replace: true`, so each debounced keystroke does not create a
new browser-history entry. Page navigation uses the default push behavior, which makes
Back and Forward useful between pages.

When total is unavailable, the Next button remains enabled only when the current response
contains a full page. When total is available, the exact page count is used.

#### Checkpoint

Verify these behaviors in the browser:

1. Type quickly. Only the value after a 300 ms pause updates the URL.
2. Search resets the page to 1.
3. Previous and Next update `page` without losing `limit` or `search`.
4. Refreshing the page preserves the same search and pagination state.
5. Back and Forward restore earlier page values.
6. Cancelled requests do not show an error toast.

### 10. Understand why Qik stays disabled

The Qik adapter uses the same `PostsApi` contract, Query options, route, and UI. Enabling it
would only require changing the environment pair and restarting Vite:

```dotenv
VITE_POSTS_SOURCE=qik
VITE_API_BASE_URL=https://api.qik.gg/portal
```

At present, the correct URL reaches the Qik application but returns `401 Unauthorized`.
The exposed Swagger schema describes bearer JWT security but does not expose a frontend
login operation that can provide that token.

Do not solve this by:

- Hard-coding a token in source or a `VITE_*` variable.
- Guessing a login URL.
- Adding `Access-Control-Allow-Origin` to Axios request headers.
- Using `no-cors`, which would make the response unreadable.
- Removing the existing 401 session handling just to make the request appear different.

Before enabling Qik, obtain these details from the backend team:

1. Login endpoint, request body, and response schema.
2. Whether the frontend receives a bearer token or an HttpOnly cookie.
3. Access-token lifetime and refresh behavior.
4. Where session state is expected to live.
5. Required roles or permissions for `GET /v1/post`.
6. Expected behavior after a 401 and whether `/login` is the correct frontend route.

Once that contract exists, add authentication to the shared Axios instance. The route,
Query options, adapters, and UI should not need structural changes.

## Unit tests

The project already uses Vitest, so no new test dependency is required.

### Test URL search normalization

Create `src/features/posts/search.unit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { parsePostsSearch } from '@/features/posts/search'

describe('parsePostsSearch', () => {
  it('parses valid URL search values', () => {
    expect(parsePostsSearch({ limit: '5', page: '2', search: ' react ' })).toEqual({
      limit: 5,
      page: 2,
      search: 'react',
    })
  })

  it('uses defaults for invalid pagination values', () => {
    expect(parsePostsSearch({ limit: 'hello', page: '-1' })).toEqual({
      limit: 10,
      page: 1,
      search: '',
    })
  })
})
```

### Test JSONPlaceholder query and response mapping

Create `src/features/posts/api/jsonplaceholder-posts.unit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  createJsonPlaceholderQuery,
  normalizeJsonPlaceholderPosts,
} from '@/features/posts/api/jsonplaceholder-posts'

const params = {
  limit: 10,
  page: 2,
  search: 'react',
}

describe('JSONPlaceholder posts adapter', () => {
  it('maps shared params to JSONPlaceholder query names', () => {
    expect(createJsonPlaceholderQuery(params)).toEqual({
      _limit: '10',
      _page: '2',
      q: 'react',
    })
  })

  it('maps response data and reads the total header', () => {
    expect(
      normalizeJsonPlaceholderPosts(
        [{ body: 'Post body', id: 1, title: 'Post title', userId: 7 }],
        '100',
        params
      )
    ).toEqual({
      items: [{ excerpt: 'Post body', id: 1, title: 'Post title' }],
      limit: 10,
      page: 2,
      total: 100,
    })
  })

  it('uses null when the total header is missing', () => {
    expect(normalizeJsonPlaceholderPosts([], undefined, params).total).toBeNull()
  })
})
```

### Test Qik query and response mapping

Create `src/features/posts/api/qik-posts.unit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createQikQuery, normalizeQikPosts } from '@/features/posts/api/qik-posts'

describe('Qik posts adapter', () => {
  it('maps shared params to Qik query names', () => {
    expect(createQikQuery({ limit: 10, page: 2, search: 'react' })).toEqual({
      limit: '10',
      page: '2',
      search: 'react',
    })
  })

  it('maps the Qik pagination envelope', () => {
    expect(
      normalizeQikPosts({
        data: [{ excerpt: 'Qik excerpt', id: 1, title: 'Qik title' }],
        limit: 10,
        message: 'Success',
        page: 2,
        statusCode: 200,
        total: 30,
      })
    ).toEqual({
      items: [{ excerpt: 'Qik excerpt', id: 1, title: 'Qik title' }],
      limit: 10,
      page: 2,
      total: 30,
    })
  })
})
```

### Test source selection

Create `src/features/posts/api/posts-api.unit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { resolvePostsSource } from '@/features/posts/api/posts-api'

describe('resolvePostsSource', () => {
  it('defaults a missing source to JSONPlaceholder', () => {
    expect(resolvePostsSource(undefined)).toBe('jsonplaceholder')
    expect(resolvePostsSource('')).toBe('jsonplaceholder')
  })

  it('accepts the supported source names', () => {
    expect(resolvePostsSource('jsonplaceholder')).toBe('jsonplaceholder')
    expect(resolvePostsSource('qik')).toBe('qik')
  })

  it('rejects an unknown source', () => {
    expect(() => resolvePostsSource('other')).toThrow('Unsupported VITE_POSTS_SOURCE: other')
  })
})
```

Run the unit tests:

```bash
pnpm test:run
```

These tests do not contact either remote API. They test the deterministic transformations
around the network boundary.

## Final verification

Run the complete project validation:

```bash
pnpm validate
```

Then run the app and complete this checklist:

- `/posts` loads JSONPlaceholder posts.
- The Network URL contains `_page`, `_limit`, and `q` when search is present.
- Only one request is made for the loader/component pair.
- Each page and search combination creates a distinct Query cache entry.
- Search updates after 300 ms and resets to page 1.
- Previous and Next preserve the rest of the URL search state.
- Refresh, Back, and Forward restore the expected state.
- Rapid search changes do not display cancellation error toasts.
- The default environment never sends a Qik request.
- All unit tests, lint checks, formatting checks, typechecks, and the production build pass.

## Assumptions and known limits

- This is a client-rendered Vite SPA; SSR is not part of this guide.
- JSONPlaceholder is a fake API. Its write operations do not persist real data.
- Qik remains intentionally blocked until its authentication contract is available.
- The environment selects one API per running build; this guide does not add an in-app
  provider switch.
- The shared UI uses only the post fields common to both working models: `id`, `title`, and
  `excerpt`.
- Detail routes and mutations are intentionally deferred until the list flow is complete.
