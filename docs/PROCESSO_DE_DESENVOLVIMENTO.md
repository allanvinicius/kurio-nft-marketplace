# Processo de desenvolvimento

Usei o Claude Code ao longo de todo o desenvolvimento do KURIO. Escrevi o prompt abaixo a partir do [enunciado do desafio](../references/challenge-original.md) e das referências do Figma para orientar a implementação, definir os cenários de falha e organizar a validação.

<details>
<summary>Ver o prompt completo</summary>


# MASTER PROMPT — KURIO NFT MARKETPLACE
## Complete Frontend Engineering Challenge — Claude Code Web

### YOUR ROLE

Act as a Principal Frontend Engineer, Software Architect, UI Engineer, Accessibility Specialist, and QA Automation Engineer.

Your mission is to build **KURIO — NFT Marketplace**, a complete, production-quality React application based on the technical challenge and Figma designs attached to this conversation.

This is a real frontend engineering assessment, not a conceptual landing page, static prototype, or visual-only demonstration.

The final application must be visually faithful, fully interactive, responsive, accessible, robust under asynchronous failures, and thoroughly tested.

**The original challenge README is the authoritative source of truth.** This prompt provides implementation guidance and must never override explicit requirements in that document.

Do not prioritize visual polish at the expense of functional correctness, or functional completeness at the expense of visual fidelity.

Your objective is to deliver the strongest technically defensible implementation possible.

---

# 1. INPUT FILES — CLAUDE CODE

I am attaching two files directly to this conversation:

**File 1: `README.md`**

Contains the complete original frontend challenge, including:

- Required technologies.
- Screens and user flows.
- REST API requirements.
- Mocking requirements.
- Real-time communication.
- Authentication and session handling.
- Checkout consistency and idempotency.
- Accessibility.
- Playwright testing.
- Lighthouse targets.
- Evaluation criteria.
- Disqualification conditions.
- Delivery requirements.

**File 2: `images-figma-nft-challenge.zip`**

Contains 15 PNG files exported directly from the original Figma designs at 2x resolution.

These images represent the desktop and mobile screens of the KURIO marketplace.

Original Figma reference:

https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1

Figma Dev Mode and Figma MCP are not available.

## Mandatory attachment verification

Before implementing anything:

1. Identify whether both attached files are accessible inside your execution environment.
2. Read the entire original README.
3. Extract the ZIP using available workspace tools.
4. Enumerate all extracted files.
5. Inspect each PNG individually.
6. Identify the screen represented by each image.
7. Record which files were successfully inspected.
8. Report missing, inaccessible, or corrupted files.

Do not claim to have inspected an image unless its visual content was actually accessible.

If the chat attachments are not mounted in the execution workspace, explain the limitation and request the minimum necessary action, such as adding the files to the connected GitHub repository.

Do not invent the contents of inaccessible files.

## Repository organization

Once the files are accessible, organize the repository as follows:

```text
kurio-nft-marketplace/
├── references/
│   ├── challenge-original.md
│   └── figma/
│       └── [all 15 original PNG files]
├── public/
│   └── assets/
├── src/
├── tests/
├── docs/
├── README.md
├── ARCHITECTURE.md
├── DESIGN_SPEC.md
├── ASSETS_MANIFEST.md
└── IMPLEMENTATION_STATUS.md
```

Preserve the original challenge content in `references/challenge-original.md`.

The root `README.md` should eventually document the implemented solution.

Do not overwrite or discard the original requirements.

---

# 2. SOURCE OF TRUTH AND PRIORITIES

Use the following priority order:

1. Original technical challenge for functional requirements, mandatory technologies, evaluation criteria, and delivery conditions.
2. Original Figma PNG exports for visual appearance, layout, typography, proportions, and responsive compositions.
3. This master prompt for architecture, implementation process, and quality standards.
4. Official library documentation for API usage and compatibility.

If the visual design does not illustrate a required functional state, create that state using the same design language.

If the Figma does not provide a mobile frame for a particular screen, create a responsive interpretation that preserves all functionality.

Do not invent extra product features unrelated to the assessment.

Do not omit required features because they are not visually represented.

---

# 3. DESIGN ANALYSIS BEFORE IMPLEMENTATION

Before writing UI components, perform a detailed visual analysis of every PNG.

Create `DESIGN_SPEC.md`.

Document:

- Screen inventory.
- Original image dimensions.
- Expected CSS dimensions based on the 2x export.
- Overall visual identity.
- Color palette.
- Typography.
- Font weights.
- Line heights.
- Spacing system.
- Grid structure.
- Container widths.
- Header dimensions.
- Navigation behavior.
- Card proportions.
- Button dimensions.
- Form controls.
- Border radii.
- Borders and shadows.
- Iconography.
- Image aspect ratios.
- Responsive differences.
- Shared components.
- Screen-specific components.
- Missing interactive states.

Do not assume that a 2880px-wide exported image represents a 2880px CSS viewport.

Account for the export scale when estimating measurements.

Distinguish verified visual measurements from estimates.

## Visual identity

Reproduce the KURIO design as closely as possible.

Preserve the dark visual identity, warm accent colors, typography, NFT imagery composition, hierarchy, and overall layout established by the provided references.

The actual PNGs must determine the final design tokens.

Do not replace the design with a generic marketplace template.

Do not introduce unrelated design trends such as glassmorphism, excessive gradients, decorative 3D scenes, or unnecessary animations.

Use the Figma exports as visual references, not as backgrounds or substitutes for actual React components.

## Visual verification

Where browser tooling is available:

- Render the implemented pages.
- Capture screenshots at matching viewport sizes.
- Compare against the Figma references.
- Identify differences in spacing, alignment, sizing, typography, and composition.
- Correct the differences iteratively.

Use Playwright screenshot comparisons where appropriate.

Do not claim pixel-perfect fidelity without visual verification.

---

# 4. ASSET MANAGEMENT

The attached ZIP contains full-screen PNG exports.

Individual NFT artwork, icons, logos, and font assets may be provided later.

**Do not block the functional implementation while waiting for these assets.**

Create a centralized asset manifest.

Suggested structure:

```text
public/assets/
├── brand/
├── nfts/
├── icons/
├── fonts/
└── placeholders/
```

Implement typed asset references where useful.

Create `ASSETS_MANIFEST.md` containing:

- Asset identifier.
- Expected filename.
- Intended usage.
- Recommended dimensions.
- Aspect ratio.
- Current status.
- Temporary replacement.
- Original asset availability.

Rules:

- Never use complete screen exports as page backgrounds.
- Never crop a complete screen to fake implemented UI components.
- Avoid random unrelated stock imagery.
- Use clearly identified temporary assets when originals are unavailable.
- Preserve intended image proportions.
- Prevent cumulative layout shift.
- Centralize asset paths.
- Allow original assets to replace temporary ones without architectural changes.

When original assets become available, replacing them should be a straightforward operation.

If a font is missing, choose a reasonable temporary alternative and document the visual difference.

Do not represent temporary assets as final.

---

# 5. REQUIRED TECHNOLOGY STACK

Use every technology required by the challenge.

| Responsibility | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build | Vite |
| Routing | TanStack Router |
| Server state | TanStack Query |
| HTTP | Axios |
| Data integration | REST APIs |
| Real-time | Socket.IO |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| Network mocking | MSW |
| E2E and visual testing | Playwright |
| Performance auditing | Lighthouse |

Vite is the preferred build tool.

Recommended supporting libraries, where justified:

- React Hook Form.
- Zod.
- decimal.js.
- Lucide React.
- Vitest.

Use current stable, compatible releases.

Verify actual package APIs before implementing.

Do not replace mandatory technologies.

Do not use React Router instead of TanStack Router.

Do not implement remote state management using only React Context.

Do not bypass Axios for application REST requests.

Do not place mock responses inside React components.

Do not replace Socket.IO with local event emitters.

Do not introduce a real blockchain integration.

---

# 6. PROJECT ARCHITECTURE

Build a maintainable, feature-oriented architecture.

Suggested structure:

```text
src/
├── app/
│   ├── providers/
│   ├── router/
│   └── styles/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/
│   ├── catalog/
│   ├── nft/
│   ├── favorites/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── profile/
│   └── wallets/
├── lib/
│   ├── api/
│   ├── query/
│   ├── socket/
│   ├── money/
│   └── utils/
├── mocks/
│   ├── handlers/
│   ├── fixtures/
│   ├── scenarios/
│   ├── persistence/
│   └── socket/
├── hooks/
├── types/
└── main.tsx

tests/
├── e2e/
├── visual/
├── fixtures/
└── helpers/

docs/
├── REST_API.md
├── SOCKET_EVENTS.md
└── TEST_SCENARIOS.md
```

Adjust this structure when necessary, but preserve clear responsibility boundaries.

## Engineering standards

- Enable strict TypeScript.
- Avoid `any`.
- Use typed API contracts.
- Separate domain logic from UI.
- Keep remote state in TanStack Query.
- Avoid unnecessary duplicated state.
- Use predictable error handling.
- Centralize monetary calculations.
- Isolate private user data.
- Keep components focused.
- Avoid excessive abstractions.
- Avoid unnecessary dependencies.

Do not build an overengineered framework around the challenge.

The architecture should be sophisticated enough to support the requirements while remaining understandable.

---

# 7. ROUTING AND URL STATE

Use TanStack Router.

Implement routes equivalent to:

```text
/
/nft/$nftId
/cart
/checkout
/orders/$orderId
/login
/register
/profile
/wallets
```

Support:

- Direct URL access.
- Browser history.
- Refresh.
- Invalid routes.
- Invalid resource identifiers.
- Protected routes.
- Authentication redirects.
- Return to the previous flow.

## Catalog URL state

Search, filters, sorting, and pagination must be represented in URL search parameters.

Example:

```text
/?search=art&category=3d&sort=price-asc&page=2
```

Filters must be combinable.

Changing filters must reset pagination.

Refresh and back/forward navigation must restore the correct catalog state.

API requests must reflect the active URL parameters.

Do not implement URL state as a decorative feature disconnected from API queries.

---

# 8. REQUIRED SCREENS

Implement every required screen.

## Home

Features:

- Featured NFTs.
- Catalog.
- Search.
- Filters.
- Sorting.
- Pagination.
- NFT navigation.
- Loading states.
- Empty results.
- Error handling.
- Background refresh.

## NFT details

Features:

- Direct access.
- Gallery.
- NFT information.
- Edition selection.
- Quantity selection.
- Availability.
- Price.
- Favorites.
- Add to cart.
- Purchase navigation.

Handle nonexistent NFTs, unavailable editions, quantity limits, and changing availability.

## Cart

Features:

- Add items.
- Change quantities.
- Remove items.
- Apply coupons.
- Remove coupons.
- Display subtotal.
- Display discounts.
- Display network fees.
- Display total.
- Persist after refresh.
- Merge guest cart after authentication.
- React to live price and inventory changes.

## Checkout

Features:

- Collector details.
- Wallet selection.
- Network selection.
- Simulated wallet connection.
- Review.
- Quote validation.
- Order submission.
- Pending payment.
- Confirmed payment.
- Rejected payment.
- Timeout recovery.

## Order confirmation

Features:

- Confirmed order information.
- Transaction reference.
- Purchased NFTs.
- Quantities.
- Fees.
- Discounts.
- Total.
- Immutable receipt snapshot.

## Login

Features:

- Validation.
- Authentication.
- API errors.
- Session recovery.
- Return to previous flow.

## Registration

Features:

- Account creation.
- Validation.
- Duplicate account handling.
- API errors.

## Collector profile

Features:

- Profile data.
- Edit details.
- Avatar.
- Change password.
- Validation.
- Persistence.

## Wallets

Features:

- Registered wallets.
- Add wallet.
- Edit wallet.
- Primary wallet.
- Secondary wallets.
- Validation.
- Persistence.

All screens must be responsive.

Profile, wallets, and confirmation must work on mobile even without dedicated Figma frames.

Editorial pages, support, activity, offers, and downloads are outside the challenge scope.

Out-of-scope actions must not falsely appear successful.

---

# 9. REST API CONTRACTS

Define and document all REST contracts.

Suggested endpoints:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/session
POST   /api/auth/logout

GET    /api/nfts
GET    /api/nfts/:id

GET    /api/favorites
POST   /api/favorites
DELETE /api/favorites/:id

GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id

POST   /api/quotes

POST   /api/orders
GET    /api/orders/:id

GET    /api/profile
PATCH  /api/profile
PATCH  /api/profile/password

GET    /api/wallets
POST   /api/wallets
PATCH  /api/wallets/:id
```

These endpoints are initial suggestions, not a replacement for the original requirements.

Document the final contracts in `docs/REST_API.md`.

Define typed request and response structures.

Support appropriate errors:

- 400 validation error.
- 401 invalid or expired session.
- 403 forbidden.
- 404 resource not found.
- 409 conflict.
- 5xx transient failure.

All application REST calls must pass through Axios.

All simulated REST responses must come from MSW handlers.

Do not hardcode business responses in components or hooks.

---

# 10. MOCK SERVICE WORKER

MSW must provide a coherent simulated backend.

The mock layer must maintain consistent state across:

- NFTs.
- Inventory.
- Users.
- Sessions.
- Favorites.
- Carts.
- Coupons.
- Quotes.
- Orders.
- Profiles.
- Wallets.

Persist mock state as necessary to support refresh.

Provide deterministic reset functionality.

## Fixtures

Create enough NFTs to meaningfully exercise filtering, sorting, and pagination.

Provide at least two fictional users.

Implement deterministic scenarios for:

- Success.
- Empty results.
- Variable latency.
- Out-of-order responses.
- Network failure.
- HTTP errors.
- Expired session.
- Unauthorized access.
- Registration conflict.
- Validation errors.
- Invalid coupon.
- Expired coupon.
- Price changes.
- Inventory exhaustion.
- Timeout after order creation.
- Confirmed payment.
- Rejected payment.

Make scenarios configurable and reproducible.

Expose development-only scenario controls when useful.

The mock layer must also work in the deployed demonstration build.

Do not rely on a private backend.

---

# 11. AUTHENTICATION AND SESSION

Implement authentication through the simulated REST API.

Required flows:

- Register.
- Login.
- Logout.
- Retrieve session.
- Restore session after refresh.
- Handle expiration.
- Switch users.
- Recover checkout after authentication.

Do not store plaintext passwords.

Use fictional credentials.

Document the limitations of the mock authentication model.

## Session isolation

On logout or user switch:

- Cancel private requests.
- Clear private query cache.
- Disconnect session-specific subscriptions.
- Prevent old responses from updating the new session.
- Clear private state belonging to the previous user.

Guest cart data may be preserved when appropriate.

No user should see another user's favorites, orders, profile, or wallets.

Protected routes must enforce authentication.

If a session expires during checkout, preserve enough context to resume safely after login.

---

# 12. TANSTACK QUERY

Use TanStack Query for remote state and mutations.

Implement:

- Typed query keys.
- Parameter-specific cache entries.
- User-specific private cache isolation.
- Background refresh.
- Loading states.
- Error states.
- Retry policies.
- Query cancellation.
- Cache invalidation.
- Optimistic updates.
- Rollback.
- Socket-driven reconciliation.

At least one mutation must use optimistic updates with rollback.

Favorites are a suitable candidate.

Ensure old responses do not overwrite newer state.

Document:

- Stale times.
- Garbage collection.
- Retry decisions.
- Invalidation strategy.
- Reconnection strategy.
- Session cleanup.

---

# 13. FINANCIAL PRECISION

All ETH amounts must travel through API contracts as decimal strings.

Do not use ordinary floating-point arithmetic for monetary calculations.

Use `decimal.js` or an equivalent precise decimal strategy.

Quantities must be integers.

The API quote is authoritative for final checkout values.

The cart and checkout must consistently display:

- Subtotal.
- Discount.
- Network fee.
- Total.

The receipt must preserve the exact transaction snapshot.

Later NFT price changes must not alter completed orders.

---

# 14. CART CONSISTENCY

Implement a fully functional cart.

Requirements:

- Add NFTs.
- Update quantities.
- Remove items.
- Enforce stock limits.
- Enforce edition availability.
- Persist after refresh.
- Merge guest and authenticated carts.
- Apply and remove coupons.
- Display authoritative quote totals.
- Handle live price changes.
- Handle live stock changes.

Do not silently remove items after a failed checkout.

After a confirmed purchase, remove only the purchased quantities.

If inventory becomes insufficient, clearly explain the issue and require user action.

---

# 15. CHECKOUT AND IDEMPOTENCY

Checkout correctness is critical.

Before confirming an order:

1. Verify the authenticated session.
2. Validate collector information.
3. Validate wallet selection.
4. Validate network selection.
5. Revalidate inventory.
6. Revalidate prices.
7. Revalidate coupons.
8. Revalidate fees.
9. Obtain an authoritative quote.
10. Require explicit confirmation.

If any value changes, the user must review and confirm the new quote.

## Idempotent order creation

Every order attempt must use an idempotency key.

Repeated clicks must not create duplicate orders.

Retries after timeout must reuse the same key and payload.

The same key and payload must recover the same order.

The same key with different content must produce a conflict.

Preserve the identity of uncertain attempts across refresh and reconnect.

Do not generate a new order automatically because the first request timed out.

## Payment states

Support:

- Pending.
- Confirmed.
- Rejected.

Confirmed and rejected orders are terminal.

Only confirmed orders may display the success confirmation.

Pending orders require a recovery and status interface.

Rejected orders require appropriate feedback.

---

# 16. SOCKET.IO REAL-TIME INTEGRATION

Use `socket.io-client` in the application.

Implement at minimum:

```text
nft.updated
order.updated
```

Investigate MSW-compatible Socket.IO transport, including `@mswjs/socket.io-binding`.

Use a real Socket.IO-compatible event path.

Do not simulate socket behavior through direct React state updates, custom browser events, or callbacks pretending to be socket messages.

## Event contracts

Events must include:

- Stable event ID.
- Event type.
- Resource ID.
- Resource version.
- Relevant payload.
- Session identity when applicable.

Implement:

- Duplicate event detection.
- Stale event rejection.
- Version ordering.
- Session isolation.
- Subscription cleanup.
- Reconnection.
- REST reconciliation.

## Required NFT scenario

1. User adds an NFT to the cart.
2. NFT price or availability changes.
3. The mock emits `nft.updated`.
4. The Socket.IO client receives the event.
5. Catalog, details, and cart reflect the change.
6. Accessible feedback informs the user.
7. Checkout rejects the stale quote.
8. User must review the new quote.

## Required order scenario

1. User submits an order.
2. Order becomes pending.
3. Connection is interrupted.
4. User refreshes or reconnects.
5. Application retrieves order status through REST.
6. State is reconciled.
7. No duplicate purchase occurs.
8. Final confirmed or rejected status is displayed.

Verify that the selected transport works in the actual demonstration environment.

A local-only implementation that fails after deployment is insufficient.

If the proposed library is incompatible, investigate another protocol-compatible solution and document its limitations.

---

# 17. FORMS AND VALIDATION

Use accessible, typed forms.

React Hook Form and Zod are recommended.

Implement:

- Required fields.
- Format validation.
- Password validation.
- Confirmation validation.
- Wallet address validation.
- API error mapping.
- Disabled states.
- Submission feedback.
- Focus management.

Do not rely solely on browser-native validation.

Associate error messages with their fields.

Preserve user input when an operation fails.

---

# 18. RESPONSIVENESS

Validate at least:

- 390px.
- 768px.
- 1440px.

Reproduce the supplied desktop and mobile references.

Use genuine responsive layouts.

Do not simply scale down desktop pages.

Check:

- Header and navigation.
- Mobile menus.
- NFT cards.
- Search and filters.
- Product gallery.
- Quantity controls.
- Cart.
- Checkout.
- Forms.
- Modals.
- Drawers.
- Profile.
- Wallets.
- Order confirmation.

Avoid horizontal overflow.

Preserve all important functionality on mobile.

---

# 19. LOADING AND FEEDBACK

Implement shimmer skeletons for data-dependent components, including:

- Catalog.
- NFT details.
- Cart summary.

Maintain stable layout dimensions.

Respect `prefers-reduced-motion`.

Implement:

- Initial loading.
- Background updating.
- Empty results.
- Network errors.
- Validation errors.
- Retry actions.
- Success feedback.
- Real-time change notifications.

Do not show misleading success messages before operations are confirmed.

---

# 20. ACCESSIBILITY

Implement:

- Semantic HTML.
- Keyboard navigation.
- Visible focus.
- Dialog focus trapping.
- Focus restoration.
- Accessible drawers.
- Form labels.
- Associated errors.
- Image alternatives.
- Readable contrast.
- Non-color-only status indicators.
- Accessible mutation feedback.
- Accessible real-time notifications.
- Reduced-motion support.
- Zoom compatibility.

Use shadcn/ui accessibility primitives appropriately.

Adapt their visual styles to KURIO.

Document accessibility-related deviations from Figma.

---

# 21. PLAYWRIGHT E2E TESTING

Build executable Playwright tests covering all challenge scenarios.

Required coverage:

1. Search, combined filters, sorting, pagination, and history restoration.
2. Direct NFT detail access and missing resources.
3. Registration, login, session expiration, logout, and user switching.
4. Favorites with failed mutations and rollback.
5. Cart quantities, removal, coupons, persistence, and guest merge.
6. Complete purchase through confirmed receipt.
7. Rejected payment.
8. Repeated clicks and idempotency.
9. Timeout after order creation and recovery.
10. Profile, avatar, password, and wallet management.
11. Live price and availability updates through Socket.IO.
12. Duplicate and stale events.
13. Disconnection and pending order recovery.
14. Keyboard navigation and dialog focus.
15. Form validation.
16. Skeletons under slow network conditions.
17. Network failure and retry behavior.

Use Chromium for main desktop and mobile flows.

Each test must start from isolated deterministic state.

Control time, latency, and event emission where necessary.

Do not use arbitrary sleeps when observable conditions can be awaited.

## Visual regression

Implement visual regression tests for:

- Home.
- NFT details.
- Cart.
- Checkout.

Version stable baseline screenshots.

Use deterministic fixtures.

Configure:

- HTML reports.
- Failure traces.
- Failure screenshots.

Tests must observe real UI behavior.

REST behavior must pass through MSW handlers.

Real-time tests must pass through the Socket.IO client.

Do not fake successful tests.

---

# 22. LIGHTHOUSE

Audit the optimized production build.

Pages:

- Home.
- NFT details.

Profiles:

- Desktop.
- Mobile.

Targets:

| Category | Target |
|---|---|
| Performance | >= 90 |
| Accessibility | >= 95 |
| Best Practices | >= 95 |
| SEO | >= 90 |

Run three measurements per page and profile.

Report the median of each category.

Record:

- LCP.
- CLS.
- TBT.
- Tool versions.
- Runtime environment.
- Audit configuration.
- Execution conditions.

Generate HTML and JSON reports.

Optimize actual application behavior.

Do not remove required content or functionality merely to inflate scores.

If targets cannot be reached, document the measured results and causes.

Do not invent Lighthouse scores.

---

# 23. PERFORMANCE STRATEGY

Apply appropriate optimizations:

- Route-level code splitting.
- Lazy loading.
- Image optimization.
- Font optimization.
- Stable image dimensions.
- Minimal layout shifts.
- Efficient React rendering.
- Query caching.
- Request cancellation.
- Avoidance of unnecessary dependencies.
- Appropriate bundle splitting.

Preserve visual fidelity.

Do not introduce performance-heavy animations without a clear design requirement.

GSAP, Three.js, and WebGL are not required.

Do not add them merely to make the project appear more sophisticated.

---

# 24. DEVELOPMENT AND MOCK CONFIGURATION

Provide commands equivalent to:

```bash
npm install
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm run test:e2e
npm run test:visual
npm run lighthouse
```

Use one package manager consistently.

Commit the lockfile.

Configure mock activation explicitly.

Provide reproducible scenario selection and reset.

Document test credentials and environment variables.

Do not require private production services.

---

# 25. DEPLOYMENT

Prepare deployment to Vercel.

Requirements:

- Optimized production build.
- Working client-side routing.
- Refresh without route failures.
- Accessible local assets.
- Active mock APIs in demonstration mode.
- Functional simulated checkout.
- Functional real-time events.
- No private backend dependency.
- No real payment gateway.
- No real blockchain connection.

The deployed application must correspond to the submitted repository.

Verify the published URL if deployment permissions are available.

If deployment requires user authentication or approval, prepare the configuration and clearly report the remaining action.

Never claim deployment success without verification.

---

# 26. DOCUMENTATION

Create:

```text
README.md
ARCHITECTURE.md
DESIGN_SPEC.md
ASSETS_MANIFEST.md
IMPLEMENTATION_STATUS.md
docs/REST_API.md
docs/SOCKET_EVENTS.md
docs/TEST_SCENARIOS.md
```

The README must document:

- Project overview.
- Stack.
- Setup.
- Environment variables.
- Mock credentials.
- Development commands.
- Build.
- Preview.
- Test commands.
- Mock scenarios.
- Reset procedures.
- Lighthouse.
- Deployment.
- Known limitations.

`ARCHITECTURE.md` must explain:

- Architectural decisions.
- Data flow.
- API contracts.
- Session policy.
- Cart persistence.
- Financial precision.
- Idempotency.
- Cache strategy.
- Socket.IO integration.
- Reconnection and reconciliation.
- UX decisions.
- Figma deviations.

Write project documentation and progress reports in Brazilian Portuguese.

Keep identifiers, code, and API names in conventional technical English.

---

# 27. IMPLEMENTATION TRACKING

Create `IMPLEMENTATION_STATUS.md`.

Track every requirement from the original challenge.

For each item, record:

- Requirement.
- Status.
- Relevant files.
- Validation evidence.
- Remaining issues.

Allowed statuses:

- Not started.
- In progress.
- Implemented.
- Verified.
- Blocked.

Only mark an item `Verified` after actual validation.

Maintain this file throughout the implementation.

If a session ends or context becomes limited, use it to preserve continuity.

Include the current phase, completed work, blockers, and next actions.

Do not restart the project unnecessarily in subsequent sessions.

---

# 28. IMPLEMENTATION PHASES

Execute the following phases.

## Phase 1 — Discovery

- Verify attachments.
- Read original requirements.
- Extract and inspect Figma PNGs.
- Inventory screens.
- Identify visual tokens.
- Identify missing assets.
- Define architecture.
- Create requirement checklist.

Deliver:

- `DESIGN_SPEC.md`
- `ARCHITECTURE.md`
- `ASSETS_MANIFEST.md`
- `IMPLEMENTATION_STATUS.md`

## Phase 2 — Foundation

- Initialize Vite.
- Configure React and TypeScript.
- Configure Tailwind.
- Configure shadcn/ui.
- Configure TanStack Router.
- Configure TanStack Query.
- Configure Axios.
- Configure code quality tooling.
- Define design tokens.

Validate the initial build.

## Phase 3 — UI Implementation

Build:

- Global layout.
- Header.
- Navigation.
- Home.
- NFT details.
- Cart.
- Checkout.
- Confirmation.
- Login.
- Registration.
- Profile.
- Wallets.
- Responsive layouts.
- Skeletons.
- Empty and error states.

Use the PNGs throughout development.

## Phase 4 — REST and Business Logic

Implement:

- Typed contracts.
- Fixtures.
- MSW handlers.
- Persistence.
- Authentication.
- Favorites.
- Cart.
- Coupons.
- Quotes.
- Orders.
- Profile.
- Wallets.
- Error scenarios.

Validate the functional flows.

## Phase 5 — Real-Time Integration

Implement:

- Socket.IO-compatible mock transport.
- `nft.updated`.
- `order.updated`.
- Event versioning.
- Duplicate detection.
- Session isolation.
- Reconnection.
- REST reconciliation.
- Pending order recovery.

Validate the required scenarios.

## Phase 6 — Automated Testing

- Configure Playwright.
- Implement E2E tests.
- Implement visual regression.
- Execute desktop and mobile flows.
- Fix failures.
- Rerun affected tests.
- Generate reports.

## Phase 7 — Quality and Delivery

- Accessibility review.
- Responsive verification.
- Performance optimization.
- Lighthouse audits.
- Documentation review.
- Production build.
- Deployment preparation.
- Final requirement audit.

Do not mark phases complete solely because files were created.

Verify their functionality.

---

# 29. DISQUALIFICATION PREVENTION

The original challenge defines disqualification conditions.

Treat the following as critical blockers:

- Missing effective use of mandatory technologies.
- Visual-only implementation of major flows.
- Purchase confirmation without a simulated backend response.
- Exposure of private data between users.
- Real-time events simulated directly in the UI.
- Missing executable E2E tests.

Before final delivery, audit each condition explicitly.

A polished interface does not compensate for a disqualifying implementation.

---

# 30. QUALITY CONTROL

After each meaningful implementation phase:

1. Run available type checks.
2. Run lint.
3. Run relevant tests.
4. Run the build.
5. Inspect failures.
6. Correct the root causes.
7. Update the implementation tracker.

Do not suppress TypeScript errors to pass the build.

Do not disable failing tests without justification.

Do not modify assertions merely to hide defects.

Do not fabricate performance reports or test results.

Do not report unexecuted checks as successful.

---

# 31. CLAUDE CODE WEB EXECUTION RULES

You are working in Claude Code Web.

Use the available repository, terminal, file editing, and execution capabilities.

Before making assumptions about the environment:

- Verify available commands.
- Verify installed dependencies.
- Verify access to attached files.
- Verify browser testing capabilities.
- Verify network restrictions.
- Verify deployment permissions.

If browser automation is unavailable, implement the tests and document that execution remains pending.

If external network access is restricted, use installed dependencies and available documentation where possible.

Do not invent successful execution.

Make meaningful commits or prepare reviewable changes according to the repository workflow.

Keep the project reproducible.

Do not introduce secrets into source control.

Do not perform destructive repository operations without a valid reason.

---

# 32. DEFINITION OF DONE

The project is complete only when:

1. Every required screen exists.
2. Desktop and mobile layouts work.
3. Functional flows are implemented.
4. REST APIs operate through Axios and MSW.
5. Authentication and session recovery work.
6. Cart persistence and precision rules are respected.
7. Checkout revalidation works.
8. Idempotency prevents duplicate orders.
9. Socket.IO events update application state correctly.
10. Reconnection and recovery work.
11. User data remains isolated.
12. Playwright tests are executable.
13. Visual regression baselines are provided.
14. Lighthouse audits are executed where tooling permits.
15. Documentation is complete.
16. Production build succeeds.
17. Deployment is verified or its remaining external blocker is documented.
18. All disqualification conditions have been checked.

Missing final NFT assets should be documented as a visual-fidelity limitation, not used as a reason to abandon functional development.

Do not claim final pixel-perfect fidelity until original assets and visual comparisons are available.

---

# 33. FINAL REPORT

At the end, provide a concise report in Brazilian Portuguese covering:

- Implemented screens.
- Completed features.
- Architecture.
- API mocking.
- Socket.IO behavior.
- Authentication and checkout.
- Test execution results.
- Lighthouse results.
- Build status.
- Deployment status.
- Remaining limitations.
- Missing assets.
- Any unmet original requirements.

Clearly distinguish:

- Implemented.
- Verified.
- Pending.
- Blocked.

Include actual commands executed and their results.

Never present intended behavior as tested behavior.

---

# 34. START NOW

Begin by verifying access to the two attached files:

- `README.md`
- `images-figma-nft-challenge.zip`

Read the original challenge completely.

Extract and inspect every PNG.

Create the architecture, design specification, asset manifest, and implementation tracker.

Then implement the complete KURIO NFT Marketplace in structured phases.

Continue autonomously through implementation, testing, correction, and delivery preparation whenever the environment allows.

Do not stop after creating a plan.

Do not stop after implementing the homepage.

Do not replace complex requirements with visual approximations.

Do not ignore the original challenge's disqualification conditions.

**Build the complete, functional, responsive, accessible, and testable NFT marketplace.**
</details>
