# Khởi tạo Vite + React frontend codebase

## Vì sao chọn từng công nghệ

- **Vite**: khởi động dev server và HMR nhanh, cấu hình SPA gọn, plugin ecosystem tốt. Điểm cần lưu ý: Vite không tự cung cấp SSR/SEO như Next.js hoặc TanStack Start. Vite hiện yêu cầu Node.js 20.19+, 22.12+ hoặc bản mới tương thích. [Vite guide](https://vite.dev/guide/)
- **React + TypeScript**: React phù hợp với hệ sinh thái shadcn và TanStack; TypeScript giúp Router, API response và query key có type-safety xuyên suốt.
- **pnpm**: cài đặt nhanh, tiết kiệm dung lượng nhờ content-addressed store, kiểm soát dependency chặt và hỗ trợ workspace tốt.
- **Tailwind CSS v4**: tích hợp trực tiếp qua Vite plugin, không cần `tailwind.config.js` cho thiết lập cơ bản; cũng là nền styling chính thức của shadcn.
- **shadcn/ui + Radix**: component được copy vào source nên có toàn quyền sửa giao diện; Radix là nền accessibility trưởng thành và vẫn được shadcn hỗ trợ đầy đủ. Đổi lại, dự án tự chịu trách nhiệm bảo trì component đã copy. [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite)
- **TanStack Router file-based**: route có type-safety, cấu trúc thư mục phản ánh URL và hỗ trợ tự động code-splitting. Đổi lại, phải dùng Vite plugin và quản lý file sinh tự động `routeTree.gen.ts`. [TanStack file-based routing](https://tanstack.com/router/latest/docs/routing/file-based-routing)
- **Axios**: phù hợp khi cần một HTTP client dùng chung với `baseURL`, timeout, interceptors và chuẩn hóa lỗi. Với vài request đơn giản, native `fetch` có thể đủ.
- **TanStack Query**: quản lý server state như cache, deduplication, retry, invalidation và loading/error state. Nó không thay thế state UI cục bộ như modal hoặc form. [TanStack Query installation](https://tanstack.com/query/latest/docs/framework/react/installation)
- **ESLint + Prettier**: ESLint xử lý correctness và convention; Prettier chỉ định dạng. Dùng `eslint-config-prettier` để tắt các rule xung đột, và `eslint-plugin-perfectionist` để sắp xếp import. [Prettier installation](https://prettier.io/docs/install)
- **Alias `@/*`**: tránh chuỗi import `../../../`, giúp di chuyển file dễ hơn. Alias phải được khai báo đồng thời trong TypeScript, Vite và `components.json`.

## Các bước thực hiện

### 1. Tạo project

Thay `my-app` bằng tên dự án:

```bash
pnpm create vite@latest my-app --template react-ts
cd my-app
pnpm install
```

Kiểm tra project nguyên bản:

```bash
pnpm dev
```

### 2. Cài Tailwind CSS

```bash
pnpm add tailwindcss @tailwindcss/vite
```

Thay nội dung `src/index.css`:

```css
@import 'tailwindcss';
```

### 3. Cấu hình alias và Vite plugins

Thêm vào `compilerOptions` của cả `tsconfig.json` và `tsconfig.app.json`:

```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

Cài Router trước khi hoàn thiện `vite.config.ts`:

```bash
pnpm add @tanstack/react-router
pnpm add -D @tanstack/router-plugin
```

Cấu hình `vite.config.ts`:

```ts
import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // TanStack Router phải đứng trước React plugin.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

TanStack yêu cầu Router plugin đứng trước React plugin. [TanStack Router Vite setup](https://tanstack.com/router/latest/docs/installation/with-vite)

### 4. Khởi tạo shadcn

Alias và Tailwind phải hoàn tất trước bước này để CLI sinh đúng import paths:

```bash
pnpm dlx shadcn@latest init -t vite -b radix -p nova --css-variables --no-rtl
pnpm dlx shadcn@latest add button
```

Kiểm tra `components.json` có các alias:

```json
{
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Không dùng `add --all`; chỉ thêm component khi cần:

```bash
pnpm dlx shadcn@latest add card dialog input
```

### 5. Tạo TanStack Router

Tạo `src/routes/__root.tsx`:

```tsx
import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: () => <div>404 — Page not found</div>,
})
```

Tạo `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <Button>Hello world</Button>
    </main>
  )
}
```

Chạy `pnpm dev` một lần để plugin sinh `src/routeTree.gen.ts`. File này nên được commit, nhưng phải được ESLint và Prettier bỏ qua.

### 6. Thiết lập TanStack Query

```bash
pnpm add @tanstack/react-query axios
pnpm add -D @tanstack/react-query-devtools @tanstack/react-router-devtools
```

Tạo `src/lib/query-client.ts`:

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

Tạo `src/router.tsx`:

```tsx
import { createRouter } from '@tanstack/react-router'

import { queryClient } from '@/lib/query-client'
import { routeTree } from '@/routeTree.gen'

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

Thay `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

import { queryClient } from '@/lib/query-client'
import { router } from '@/router'

import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
```

Có thể xóa `src/App.tsx` và CSS mẫu của Vite sau khi xác nhận không còn import.

### 7. Tạo Axios client

Tạo `.env.example`:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

Copy thành `.env.local` và thay URL thật. Không commit `.env.local`.

Tạo `src/api/http.ts`:

```ts
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not configured')
}

export const http = axios.create({
  baseURL,
  timeout: 10_000,
})
```

Chỉ thêm interceptor authentication sau khi đã xác định cơ chế token/cookie. Không nên mặc định `withCredentials` hoặc tự refresh token khi backend chưa có contract rõ ràng.

Query function nên truyền `AbortSignal` từ TanStack Query cho Axios:

```ts
import { queryOptions } from '@tanstack/react-query'

import { http } from '@/api/http'

interface User {
  id: string
  name: string
}

export const usersQueryOptions = queryOptions({
  queryKey: ['users'],
  queryFn: async ({ signal }) => {
    const response = await http.get<User[]>('/users', { signal })
    return response.data
  },
})
```

Route loader có thể prefetch mà không tạo request trùng:

```ts
loader: ({ context }) =>
  context.queryClient.ensureQueryData(usersQueryOptions),
```

### 8. ESLint, Prettier và import ordering

Vite React TypeScript template đã có ESLint. Cài thêm:

```bash
pnpm add -D @tanstack/eslint-plugin-query @tanstack/eslint-plugin-router
pnpm add -D eslint-config-prettier eslint-plugin-perfectionist
pnpm add -D -E prettier
```

Trong `eslint.config.js`:

- Giữ lại các config React/TypeScript do Vite tạo.
- Thêm hai config TanStack.
- Thêm rule Perfectionist.
- Đặt `eslint-config-prettier` cuối cùng.

Phần cần thêm có dạng:

```js
import prettierConfig from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import pluginQuery from '@tanstack/eslint-plugin-query'
import pluginRouter from '@tanstack/eslint-plugin-router'

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'src/routeTree.gen.ts'],
  },

  ...pluginRouter.configs['flat/recommended'],
  ...pluginQuery.configs['flat/recommended'],

  // Các config React/TypeScript do Vite tạo đặt tại đây.

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      perfectionist,
    },
    rules: {
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          internalPattern: ['^@/'],
          newlinesBetween: 1,
          groups: [
            'type-import',
            ['value-builtin', 'value-external'],
            ['type-internal', 'value-internal'],
            ['type-parent', 'type-sibling', 'type-index'],
            ['value-parent', 'value-sibling', 'value-index'],
            'side-effect',
            'side-effect-style',
            'style',
            'unknown',
          ],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
        },
      ],
    },
  },

  prettierConfig,
]
```

Quy ước import sau khi auto-fix:

1. Type imports.
2. Node và third-party packages.
3. Alias `@/...`.
4. Relative imports.
5. Side-effect và CSS imports.

Perfectionist hỗ trợ natural sorting, custom groups và nhận biết alias nội bộ. Không cài thêm Prettier import-sorting plugin vì hai công cụ cùng sửa import sẽ xung đột. [Perfectionist sort-imports](https://perfectionist.dev/rules/sort-imports)

Tạo `.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Tạo `.prettierignore`:

```text
dist
coverage
node_modules
src/routeTree.gen.ts
```

Thêm scripts vào `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "typecheck": "tsc -b",
    "check": "pnpm lint && pnpm format:check && pnpm typecheck"
  }
}
```

## Kiểm tra hoàn tất

Chạy theo thứ tự:

```bash
pnpm lint:fix
pnpm format
pnpm check
pnpm build
pnpm dev
```

Tiêu chí đạt:

- `/` hiển thị shadcn Button.
- URL không tồn tại hiển thị trang 404.
- `src/routeTree.gen.ts` được sinh nhưng không bị lint/format.
- Import được chia đúng nhóm sau `pnpm lint:fix`.
- `@/components/...` hoạt động trong editor, TypeScript và runtime.
- `pnpm build` không có lỗi type hoặc bundling.
- QueryClient có thể truy cập từ cả React components và route loaders.

## Giả định đã chốt

- Dùng SPA, chưa cần SSR.
- TypeScript, TanStack Router file-based và shadcn trên Radix UI.
- Tailwind CSS v4.
- ESLint flat config + Prettier; import order do ESLint Perfectionist quản lý.
- Alias chuẩn là `@/* → src/*`.
- Axios chỉ có `baseURL` và timeout; authentication phụ thuộc API contract sau này.
