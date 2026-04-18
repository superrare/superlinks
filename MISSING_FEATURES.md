# Missing Features — Old App vs New App

Component and structural differences between the old app (`juice-cli/packages/web/`) and the new app (`superlinks/`). These are **not copy/text changes** — they require building or porting actual UI components.

Organized by page. Items tagged with priority suggestions where obvious.

---

## Marketing Landing Page (`/`)

- [ ] **Developers section** — old has a full section: h2 "Completely configurable. Built for agents.", body copy about programmability, and an inline code sample showing SDK usage. New app has no equivalent.
- [ ] **Footer: GitHub link** — old links to `https://github.com/juice-cli/juice`. New footer omits it.
- [ ] **Footer: X / Twitter link** — old links to `https://x.com/juice_cli`. New footer omits it.

---

## Sidebar Navigation

- [ ] **Audience nav item** — old sidebar has "Audience" linking to `#/audience` (placeholder: "Coming soon"). New sidebar does not have it. Deferred — add when Audience feature is built.

---

## Account Settings (`/dashboard/settings`)

- [ ] **Theme toggle semantics** — old shows *current* mode label (e.g. "Dark" when in dark mode). New shows *target* mode (e.g. "Light" when in dark mode). This is a UX judgment call, not a bug. Decide which pattern to use.

---

## Dashboard Links / Editor (`/dashboard/links`)

- [ ] **Drag-to-reorder links** — old supports drag reordering of custom links. New does not.
- [ ] **Inline link editing** — old has Edit/Save/Cancel per link row. New only has Delete.
- [ ] **Enable/disable toggle per link** — old has ON/OFF toggle. New does not.
- [ ] **Icon picker integration** — old has "Change icon" / "Add icon or GIF" per link row opening a full icon picker modal. New has an `IconPicker` component at `app/components/shared/icon-picker.client.tsx` but it is **not imported or wired** anywhere.
- [ ] **Avatar upload** — old has "Change avatar" with file input. New preview uses initial-letter only.
- [ ] **Preview toolbar** — old preview panel has a URL bar and Save button. New has no toolbar.
- [ ] **Preview footer** — old preview shows "Create a profile on SuperLinks.me" + "Powered by SuperLinks.me". New omits.
- [ ] **Preview product sections** — old preview renders Apps and Shop product rows. New does not.

---

## Products (`/dashboard/products`)

- [ ] **Create Store form** — old has a store creation flow (name input + "Create Store" button). New auto-creates or expects store to exist.
- [ ] **Add Product form** — old has a full tab with Title, Description, Price, Content Type, File upload, "Upload & List". New has no product creation UI.
- [ ] **Posts tab** — old has a Posts tab with a composer ("What's on your mind?" + Post button) and post list with delete. New mentions posts in the subtitle but has no posts UI.
- [ ] **Product actions** — old has Edit (opens modal), Unlist/Relist, Delete with confirmation. New product list is read-only.
- [ ] **Edit Product modal** — old has a modal with title/price editing, Cancel/Save. New has none.
- [ ] **Tabs** — old has "Products", "Add Product", "Posts" tabs. New has no tabs.
- [ ] **Dynamic page heading** — old renders "My Store — {storefront name}". New shows static "Products". Requires storefront name in loader data.

---

## Insights (`/dashboard/insights`)

- [ ] **Refresh button** — old has a "Refresh" button in the page header. New does not (only shows Refresh on error).
- [ ] **Link click summary cards** — old shows aggregate click stats (24h / 7d / All time totals) as cards. New shows per-link rows only.
- [ ] **Link clicks table** — old has a table with columns Link, 24h, 7d, Total, Last click. New uses a card/row layout with a bar chart and "clicks" suffix.

---

## Earn (`/dashboard/earn`)

- [ ] **ETH balance display** — old shows both ETH and USDC balances. New shows USDC only.
- [ ] **Copy wallet address** — old has a "Copy" button for the wallet address with toast "Address copied". New shows truncated address but no copy button.
- [ ] **Send form** — old has a full Send card: recipient input, amount, ETH/USDC selector, Send button with validation. New has no send functionality.
- [ ] **Quick Stats card** — old has a "Quick Stats" section showing Stores, Purchases, Followers counts. New does not.
- [ ] **Basescan transaction links** — old links transactions to Basescan with "tx" link text. New has no explorer links.

---

## Public Creator Profile (`/:handle`)

- [ ] **Apps section** — old renders an "Apps" section for app-type products with rocket emoji. New does not filter or display apps separately.
- [ ] **Fundraisers section** — old renders a "Fundraisers" section with progress bar, supporter count, and "Support" button. New does not.
- [ ] **Edit profile button** — old shows "Edit profile" link for page owner (→ `/app.html#/links`). New has no owner detection or edit link.
- [ ] **QR / Share FAB buttons** — old renders floating action buttons with `aria-label="QR Code"` and `aria-label="Share"`. New has QR/Share modal components but **no trigger buttons** wired — modals look for `#lt-qr-btn` / `#lt-share-btn` IDs that don't exist in the page markup.
- [ ] **Video posts** — old renders `<video>` elements for video-type posts. New renders images only.
- [ ] **Checkout wiring** — old shop product buttons have `data-product-id`, `data-product-title`, `data-product-price` attributes. New product buttons have no data attributes, so the checkout modal cannot open.

---

## Share Modal

- [ ] **Facebook share button** — old has a Facebook share option. New omits it.
- [ ] **LinkedIn share button** — old has a LinkedIn share option. New omits it.

---

## Checkout Modal

- [ ] **Fundraiser checkout flow** — old has a full fundraiser variant: "Choose amount", donation presets, custom amount input, "Support — {amount} USDC". New has no fundraiser support.
- [ ] **Trust badges** — old step 0 shows "x402 protocol", "Instant delivery", "Gasless" badges. New omits.
- [ ] **Wallet card on confirm** — old confirm step shows Coinbase Wallet card (address, "Connected"), summary table (Product, Delivery "Instant download", Network "Base (L2)", Gas fee "Free (sponsored)", Total). New omits all.
- [ ] **Processing substeps** — old shows animated substeps: "Payment authorized", "Settling on Base", "Preparing download". New shows spinner only.
- [ ] **Basescan tx link on success** — old success step shows "View on Basescan" link. New omits.
- [ ] **Download / Open App button** — old success step has a download action. New omits.
- [ ] **In-modal error state** — old shows "Purchase failed: {message}" with "Try again" and "Cancel" buttons. New silently resets to step 0.

---

## Messages (`/dashboard/messages`)

- [ ] **Full messaging UI** — old has: inbox list with conversation previews, user search ("Search users..." + "New" button), chat view with message bubbles, composer ("Type a message..." + Send), back navigation, encrypted message placeholder "[Encrypted - view in CLI]", empty states ("No conversations yet", "No messages yet. Say hi!", "No users found"). New has heading only — the entire messaging surface is unbuilt.

---

## Admin (`/dashboard/admin`)

- [ ] **User table** — old renders a full admin table with columns: User, Email, Signed up, Last login, Views (24h), Views (7d), Views (total), Followers, Page ("View" links). New shows only the user count.
- [ ] **Loading state** — old shows "Checking access..." while verifying. New has no loading indicator.
- [ ] **Error state** — old shows "Failed to load users: {error}". New has no error handling.

---

## Docs (`/docs`)

- [ ] **Messaging section** — old has a full Messaging documentation section. New omits.
- [ ] **Social section content** — old has Social section content. New has the sidebar link but no matching `<section id="social">`.
- [ ] **Configuration section content** — old has Configuration section. New has sidebar link but no matching `<section id="configuration">`.
- [ ] **MCP tools table** — old has a table of available MCP tools with Tool/Description columns. New omits.
- [ ] **Footer** — old docs page has a footer with Home, Explore, GitHub, X/Twitter links. New has no footer.

---

## Discover (`/discover`)

- [ ] **Creators counter** — old has a "Creators" stat counter above the grid. New does not.
- [ ] **Rich creator cards** — old cards include banner image, avatar, bio, product count, follower count. New cards are simpler (initial letter, name, @slug, optional bio).

---

## Icon Picker (shared component)

- [ ] **Wire IconPicker to editor** — component exists at `app/components/shared/icon-picker.client.tsx` but is not imported or used anywhere. Old app wires it into link editing rows.
- [ ] **Icon picker title** — old title is "Choose icon or GIF"; new component title is "Choose an icon". Update when wiring.

---

## App Viewer (`/app/:id`)

- No significant component gaps identified.
