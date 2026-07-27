# Changelog

# [1.21.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.20.0...v1.21.0) (2026-07-27)


### Features

* :sparkles: Implement chat functionality with ChatDrawer, ChatInput, and ChatMessageList components; add chat_messages table to database ([2473f07](https://github.com/ThishanTharuka/fpl-auction-hub/commit/2473f07e8fc4e98f30650807eacf5cfafaf57f9c))

# [1.20.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.19.1...v1.20.0) (2026-07-27)


### Bug Fixes

* :bug: Update TooltipTrigger component to use render prop for improved functionality ([38b1ab6](https://github.com/ThishanTharuka/fpl-auction-hub/commit/38b1ab63638d274c5ca6965182ad4598e10b6e32))


### Features

* :sparkles: Add TeamAvatar component and integrate avatar_url in participants data for enhanced team representation ([a5d01b5](https://github.com/ThishanTharuka/fpl-auction-hub/commit/a5d01b5d288cb68c9cdc61f3f8e2eda5a8d2a48c))
* :sparkles: Add Tooltip component and integrate it into Auctioneer and BidContent for enhanced user experience ([515527d](https://github.com/ThishanTharuka/fpl-auction-hub/commit/515527d50ec47ffbeab136d51eddbff8b6b86443))

## [1.19.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.19.0...v1.19.1) (2026-07-27)


### Bug Fixes

* :bug: Update motion library import from "motion/react" to "framer-motion" ([8a77be8](https://github.com/ThishanTharuka/fpl-auction-hub/commit/8a77be8adf84db8ba3536f81c8cd2a373ada559f))

# [1.19.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.18.3...v1.19.0) (2026-07-26)


### Features

* :sparkles: Implement FPL picks API integration and enhance TeamsClient with FPL team drawer ([7a6e47d](https://github.com/ThishanTharuka/fpl-auction-hub/commit/7a6e47d3da8e922cde2c81a7ff69b1933a86353f))

## [1.18.3](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.18.2...v1.18.3) (2026-07-26)


### Bug Fixes

* :sparkles: Add bid history and sold players display in BidContent component ([dd4f58b](https://github.com/ThishanTharuka/fpl-auction-hub/commit/dd4f58b0825f897287e44e25d8b902621c546944))

## [1.18.2](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.18.1...v1.18.2) (2026-07-25)


### Bug Fixes

* :zap: Refactor auction bid and lobby components to improve data handling and subscriptions ([0780279](https://github.com/ThishanTharuka/fpl-auction-hub/commit/0780279a8240acf253a8a67960a2dcb762670dee))

## [1.18.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.18.0...v1.18.1) (2026-07-25)


### Bug Fixes

* :bug: add row-level security policy for participants update and include auction results in realtime ([01bb54a](https://github.com/ThishanTharuka/fpl-auction-hub/commit/01bb54ac6f8836b6312e3d66e973b112fe841880))

# [1.18.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.17.0...v1.18.0) (2026-07-25)


### Features

* :sparkles: enhance bidding functionality with team budget tracker and real-time updates ([e3f2d84](https://github.com/ThishanTharuka/fpl-auction-hub/commit/e3f2d84ab5f9b4180c3b946ec555b6a840bf461d))

# [1.17.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.16.0...v1.17.0) (2026-07-25)


### Features

* :sparkles: update foreign key constraints for auction tables and add leagues to realtime ([dfc25d3](https://github.com/ThishanTharuka/fpl-auction-hub/commit/dfc25d39fef563b5522ad4b9e637cb4b88d3d3fb))

# [1.16.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.15.1...v1.16.0) (2026-07-25)


### Bug Fixes

* :sparkles: fix team claim deletion for rejected members and update UI layout ([cbacebc](https://github.com/ThishanTharuka/fpl-auction-hub/commit/cbacebca62746e2c7c479a5a8662065eb85cc545))


### Features

* :sparkles: add club count validation for bidding limits ([7b1e6d1](https://github.com/ThishanTharuka/fpl-auction-hub/commit/7b1e6d1e370ca121f7f7430e4306c83bbaf06348))
* :sparkles: add real-time updates for leagues in lobby content ([cd3806c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/cd3806c75ffaaf67b4582ba246008370a4d1bb72))

## [1.15.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.15.0...v1.15.1) (2026-07-25)


### Bug Fixes

* :bug: add cascading foreign key constraints ([8d6a974](https://github.com/ThishanTharuka/fpl-auction-hub/commit/8d6a9749eb3eb83e0509539c92986d946f1be9f2))

# [1.15.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.14.0...v1.15.0) (2026-07-25)


### Features

* :arrow_up: add delete league functionality with confirmation dialog ([1c632b0](https://github.com/ThishanTharuka/fpl-auction-hub/commit/1c632b09c9ae618038b96c3ea335c2d06937b041))

# [1.14.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.13.2...v1.14.0) (2026-07-24)


### Bug Fixes

* add tournament management features including tables, RLS policies, and RPCs ([9a74a65](https://github.com/ThishanTharuka/fpl-auction-hub/commit/9a74a652673c382de98bc6746843acde6fecaa7b))
* update auction start instructions to allow starting at any time ([84fbd2f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/84fbd2f1471a6fafb98f6054be1a58293b5c3387))
* update Supabase configuration and add .gitignore for local development ([2a1ef3f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/2a1ef3fab6a64a47593793f5887841a5952199f6))


### Features

* add team avatar and FPL manager ID to participants, including storage policies ([4a67957](https://github.com/ThishanTharuka/fpl-auction-hub/commit/4a6795771762a60510a5175bff9ad007305627e7))
* enhance league management by adding user-specific league and participant tracking ([a706350](https://github.com/ThishanTharuka/fpl-auction-hub/commit/a7063502284cec7eb9acd0a522c797886c1f1978))
* implement FPL data refresh functionality with new button and API integration ([37ec624](https://github.com/ThishanTharuka/fpl-auction-hub/commit/37ec6247ce6fb1a380146bcf1b04c627d9b15be3))

## [1.13.2](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.13.1...v1.13.2) (2026-06-13)


### Bug Fixes

* simplify auction start condition and update related message ([a980eab](https://github.com/ThishanTharuka/fpl-auction-hub/commit/a980eab44622e1f83b49d403ed36c33b88361ac0))
* update footer navigation styles and improve separator character ([f20a503](https://github.com/ThishanTharuka/fpl-auction-hub/commit/f20a503e872d3f8a29dab9cba4c7c56e9f6cc2fd))

## [1.13.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.13.0...v1.13.1) (2026-06-13)


### Bug Fixes

* prevent rendering Nav component for unauthenticated users on home page ([6b334bd](https://github.com/ThishanTharuka/fpl-auction-hub/commit/6b334bdd67233aa65955a404238c6481634a812e))

# [1.13.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.12.1...v1.13.0) (2026-06-13)


### Bug Fixes

* add visual representation to BentoItem and render in BentoGrid ([c1e9ceb](https://github.com/ThishanTharuka/fpl-auction-hub/commit/c1e9cebde2347e697975da2223783b33ccfc398b))
* adjust layout styles for LoginForm component ([c80e817](https://github.com/ThishanTharuka/fpl-auction-hub/commit/c80e8179fda0b9c2955f2378de263c97d3036fe5))
* update initial mode handling in LoginForm and enhance Home component layout ([2c1399f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/2c1399fd4edc7caa5c817fd06bfb3077af72bab9))


### Features

* add design documentation and implement background animation component ([4a5f50a](https://github.com/ThishanTharuka/fpl-auction-hub/commit/4a5f50a6607bb038abbaf22fc313fd9910cd60ba))
* implement BentoGrid component for enhanced auction tools display ([b029be7](https://github.com/ThishanTharuka/fpl-auction-hub/commit/b029be761b6643b020b36cd47586f642a291e62e))

## [1.12.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.12.0...v1.12.1) (2026-06-12)


### Bug Fixes

* add delete_user function to remove user from auth.users ([25a8f14](https://github.com/ThishanTharuka/fpl-auction-hub/commit/25a8f14035e77c03f0ec15815ab3ae0b24e7dbb6))

# [1.12.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.11.0...v1.12.0) (2026-06-12)


### Bug Fixes

* improve error handling for account deletion API and validate request origin ([cba128c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/cba128c53deddaa94f42d8edbfda0f047027f577))
* update main layout class for LoginForm to ensure proper height and overflow handling ([7914596](https://github.com/ThishanTharuka/fpl-auction-hub/commit/79145968e6f58ec4b82bcd5c8a92739b473a1271))


### Features

* add account deletion functionality and privacy/terms pages ([b28619f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/b28619f3642c4c81bf29417e0755f24ce8df025f))

# [1.11.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.10...v1.11.0) (2026-06-12)


### Bug Fixes

* remove unused POSITION_STAT object from players table ([bf4b31d](https://github.com/ThishanTharuka/fpl-auction-hub/commit/bf4b31d450f150d1eac722bd036b4315cc22e598))


### Features

* add Accordion component using Radix UI ([1ebd7bd](https://github.com/ThishanTharuka/fpl-auction-hub/commit/1ebd7bdfe3f95c8a2a3e73860224dc247f0e74e2))
* add error handling with toast notifications for export status ([90137f0](https://github.com/ThishanTharuka/fpl-auction-hub/commit/90137f0c7c99605c35a3a364c3300044449e95a4))
* enhance export button with loading states and improved UI feedback ([cb6610d](https://github.com/ThishanTharuka/fpl-auction-hub/commit/cb6610d573570193873dc1842e2830c3dbf353ce))
* enhance player export functionality with CSV download option and improved UI ([8529cf7](https://github.com/ThishanTharuka/fpl-auction-hub/commit/8529cf749ed18a54681fb8f7fe0005a1fa07b02a))
* enhance PlayersTableSkeleton with improved mobile layout and additional loading states ([b07515c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/b07515cc63091ade5d5458323fe0cdc897ba882a))
* integrate Google Sheets export functionality and add Google Client ID to environment ([0a7cc0c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/0a7cc0c32e57a2fa53b6279f656c52140dd9922b))
* replace dialog with drawer for export sheets functionality ([2bbded6](https://github.com/ThishanTharuka/fpl-auction-hub/commit/2bbded6d62deade15ab95493537032a5c78c74e0))

## [1.10.10](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.9...v1.10.10) (2026-06-09)


### Bug Fixes

* adjust layout and spacing in PlayersTable component ([4450584](https://github.com/ThishanTharuka/fpl-auction-hub/commit/4450584f26c4400df87885e85e1bc43b892f7373))

## [1.10.9](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.8...v1.10.9) (2026-06-08)


### Bug Fixes

* add pagination to ranked player list in IndexBuilderClient ([cb939e5](https://github.com/ThishanTharuka/fpl-auction-hub/commit/cb939e5903a238f58842f90bba1180f89b72ea7e))

## [1.10.8](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.7...v1.10.8) (2026-06-08)


### Bug Fixes

* update release message format to include [skip ci] tag ([7e82487](https://github.com/ThishanTharuka/fpl-auction-hub/commit/7e824873ab955c6de7da338e73bd5bbf94c9ec59))

## [1.10.7](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.6...v1.10.7) (2026-06-08)


### Bug Fixes

* update release message format to remove [skip ci] tag ([ebb93b7](https://github.com/ThishanTharuka/fpl-auction-hub/commit/ebb93b70a5c3ae628c272d1fc72089049e812f9b))

## [1.10.6](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.5...v1.10.6) (2026-06-08)


### Bug Fixes

* simplify version retrieval in footer component ([602cfe0](https://github.com/ThishanTharuka/fpl-auction-hub/commit/602cfe066c0fbefee33c40edfff62560d4a87df9))

## [1.10.5](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.4...v1.10.5) (2026-06-08)


### Bug Fixes

* update footer component to fetch latest version from GitHub API ([2104f32](https://github.com/ThishanTharuka/fpl-auction-hub/commit/2104f32d967a9d20b848d6cd987990f851b39c75))

## [1.10.4](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.3...v1.10.4) (2026-06-08)


### Bug Fixes

* add Vercel deployment trigger to release workflow ([9a7cb57](https://github.com/ThishanTharuka/fpl-auction-hub/commit/9a7cb57169773112f6903eac9d2f595899791218))

## [1.10.3](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.2...v1.10.3) (2026-06-08)


### Bug Fixes

* simplify version retrieval in footer component ([99c5dbd](https://github.com/ThishanTharuka/fpl-auction-hub/commit/99c5dbd149b6f613291402f3ad6f3d57a95e53a8))

## [1.10.2](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.1...v1.10.2) (2026-06-08)


### Bug Fixes

* enhance bid functionality with initial team data and improved loading states ([f5a73f8](https://github.com/ThishanTharuka/fpl-auction-hub/commit/f5a73f8cf3f0883de4ae7d2b5f4d8310d982bb8d))

## [1.10.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.10.0...v1.10.1) (2026-06-08)


### Bug Fixes

* add bid_increment_tiers column to leagues table ([8879349](https://github.com/ThishanTharuka/fpl-auction-hub/commit/88793493d739111ff0e1e43d9ee71d9fbac7a859))

# [1.10.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.9.0...v1.10.0) (2026-06-08)


### Bug Fixes

* add opencode configuration for MCP servers ([3008282](https://github.com/ThishanTharuka/fpl-auction-hub/commit/30082826f9a8a92795608efbb83c0349254e0d3e))


### Features

* add bid increment tiers functionality and editor component ([14f675d](https://github.com/ThishanTharuka/fpl-auction-hub/commit/14f675d454ddae82d5576f557a37173642d4a292))
* add Footer component with version and commit information ([325336b](https://github.com/ThishanTharuka/fpl-auction-hub/commit/325336bc76528d2022e786f7a8cf5da9bb05ffe7))

# [1.9.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.8.0...v1.9.0) (2026-06-07)


### Features

* implement auction lobby with real-time updates and loading states ([b3b735c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/b3b735c63d52e9b49a689855954e465ee81a4f60))

# [1.8.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.6...v1.8.0) (2026-06-06)


### Bug Fixes

* add buffer_per_player column to leagues and create revert migration ([c6082fb](https://github.com/ThishanTharuka/fpl-auction-hub/commit/c6082fbbfaac9354417acfb16b7052088e235952))
* enhance toast notifications for auction status updates and improve code formatting ([4503dae](https://github.com/ThishanTharuka/fpl-auction-hub/commit/4503dae2be9617bc6f524b92595570056174bebb))
* improve layout and accessibility of bid UI and player stats bar ([030c48f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/030c48fc1750078b2c0f194be165e6f3eca57938))


### Features

* enhance bidding logic with position requirements and base prices ([99f5eea](https://github.com/ThishanTharuka/fpl-auction-hub/commit/99f5eea1c784298727f23de5d78f335fc5efed38))
* integrate toast notifications for auction events and add Toaster component ([ae94560](https://github.com/ThishanTharuka/fpl-auction-hub/commit/ae94560893b0bccaef4568c7f1dccc9530f95aca))

## [1.7.6](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.5...v1.7.6) (2026-06-05)


### Bug Fixes

* add CI/CD pipeline and Vercel deployment checks to README ([e16dd98](https://github.com/ThishanTharuka/fpl-auction-hub/commit/e16dd9881a23e50055064308e397d3d3390a85a9))

## [1.7.5](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.4...v1.7.5) (2026-06-05)


### Bug Fixes

* remove Vercel notifications from verification steps in release workflow ([327a600](https://github.com/ThishanTharuka/fpl-auction-hub/commit/327a6006ec134ac7d32f71d13c7cbc39772e134a))

## [1.7.4](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.3...v1.7.4) (2026-06-05)


### Bug Fixes

* add statuses permission in release workflow ([a7cb34e](https://github.com/ThishanTharuka/fpl-auction-hub/commit/a7cb34ee3d056682d251dca1984c68f3b2d486aa))
* add Vercel notifications for type-check, lint, and test steps in release workflow ([0682fe7](https://github.com/ThishanTharuka/fpl-auction-hub/commit/0682fe7f42aa258715297d2186ce48a72a7a520d))

## [1.7.3](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.2...v1.7.3) (2026-06-05)


### Bug Fixes

* reorder jobs in release workflow to ensure verification steps run before release ([b83ae5c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/b83ae5ce2e7fde9668ead17c9d18999682a2cf93))

## [1.7.2](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.1...v1.7.2) (2026-06-05)


### Bug Fixes

* add non-null assertions for index_score and id in player tests ([1c1adbd](https://github.com/ThishanTharuka/fpl-auction-hub/commit/1c1adbd26f9f75232e103cb12107c56dcda96ce8))
* specify schema for get_server_time function and add search_path setting ([e3231ec](https://github.com/ThishanTharuka/fpl-auction-hub/commit/e3231ec065c31ca71d3d69aa57f495ebd065100c))
* update package-lock.json with new [@emnapi](https://github.com/emnapi) dependencies and electron-to-chromium version ([fedcfa5](https://github.com/ThishanTharuka/fpl-auction-hub/commit/fedcfa5ccd37d315bce06fe7bd9456a10299726f))

## [1.7.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.7.0...v1.7.1) (2026-06-05)


### Bug Fixes

* add database migrations for auction system including leagues, participants, auction results, and team formations ([203f371](https://github.com/ThishanTharuka/fpl-auction-hub/commit/203f371d369a7dbda8bc71da4c45bcfeaf906d97))

# [1.7.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.6.1...v1.7.0) (2026-06-04)


### Bug Fixes

* correctly manage loading state in AuthProvider ([840ba33](https://github.com/ThishanTharuka/fpl-auction-hub/commit/840ba33f4773106b692dcfa7ba5ca19c3c24d509))


### Features

* implement server clock for accurate time synchronization in auction and bid pages ([07b6b8f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/07b6b8fbbb6993d9344767a576a6cb2be2323a15))

## [1.6.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.6.0...v1.6.1) (2026-06-04)


### Bug Fixes

* add skeleton loading states and suspense for players, teams, and index builder pages ([765daa6](https://github.com/ThishanTharuka/fpl-auction-hub/commit/765daa6949b43fc23a18b46a3c05c684fbd7755c))

# [1.6.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.5.0...v1.6.0) (2026-06-04)


### Features

* implement caching mechanism for FPL data using Supabase ([33d3f2b](https://github.com/ThishanTharuka/fpl-auction-hub/commit/33d3f2bdf66edf33ef11d3cba7a56d48e59fe4ac))

# [1.5.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.4.0...v1.5.0) (2026-06-04)


### Bug Fixes

* optimize image loading and adjust dimensions across components ([c19ac3d](https://github.com/ThishanTharuka/fpl-auction-hub/commit/c19ac3d68b36e9af7cbe105b8a0a64b612dffacb))
* regenerate lockfile with optional deps ([18c425c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/18c425c25ab85aad5b37f2d59a61c3c8888e5508))
* sync package-lock.json ([0d1b9f2](https://github.com/ThishanTharuka/fpl-auction-hub/commit/0d1b9f28b464f943af47be4edd9fe83a392a1125))
* update image formats to WebP and adjust API fetch caching ([43d14c8](https://github.com/ThishanTharuka/fpl-auction-hub/commit/43d14c886b6d98f470dafdbea8db408d636d5c69))
* update main element styling for login form layout ([0ec0be3](https://github.com/ThishanTharuka/fpl-auction-hub/commit/0ec0be3d150c7de9c9d1575c7c3d8c63cb79e147))


### Features

* add FPL data fetching and processing logic ([f262a52](https://github.com/ThishanTharuka/fpl-auction-hub/commit/f262a520791226572928df06121b785756733fa9))
* add loading state and skeleton UI for TeamsClient component ([338957c](https://github.com/ThishanTharuka/fpl-auction-hub/commit/338957c4745ef813696f8f1e8268acace57dc5c0))
* add TeamsClient component for managing fantasy league teams and player auctions ([8438ebd](https://github.com/ThishanTharuka/fpl-auction-hub/commit/8438ebde1f145cbb06b8a2f2cba14224caedd6e3))
* implement NProgress for loading indicators and update dependencies ([3618cc0](https://github.com/ThishanTharuka/fpl-auction-hub/commit/3618cc07e6e45f7cc4da77406bfe9e3428c672c2))
* integrate Supabase client and enhance team member management in TeamsClient component ([de459f2](https://github.com/ThishanTharuka/fpl-auction-hub/commit/de459f2c1621bf577ea683224c6ef49cc76f1277))
* refactor player selection logic in PlayersTable and TeamsClient components ([447c22b](https://github.com/ThishanTharuka/fpl-auction-hub/commit/447c22b01e4bdd98d52d82ddc2bdc6925a2ea08d))

# [1.4.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.3.2...v1.4.0) (2026-06-03)


### Bug Fixes

* adjust timer input range and improve player nomination UI ([aef5eb8](https://github.com/ThishanTharuka/fpl-auction-hub/commit/aef5eb8d963ddc7a570acf3724b07ba06a0bb704))


### Features

* update login page background and navigation logo ([f4e9d56](https://github.com/ThishanTharuka/fpl-auction-hub/commit/f4e9d56d810819abf3c2aae5b100dca0f7bf3032))

## [1.3.2](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.3.1...v1.3.2) (2026-06-03)


### Bug Fixes

* update changelog configuration for consistent header formatting ([92e643f](https://github.com/ThishanTharuka/fpl-auction-hub/commit/92e643f176ee1ab72081bbed7d0226231f49396e))

## [1.3.1](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.3.0...v1.3.1) (2026-06-03)

### Bug Fixes

* correct changelog header formatting for version 1.3.0 ([3bad83a](https://github.com/ThishanTharuka/fpl-auction-hub/commit/3bad83aff0b04c31d80d967af641cc0fd2e95726))

## [1.3.0](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.2.2...v1.3.0) (2026-06-03)

### Features

* add initial opencode configuration for Supabase integration ([e00c7f7](https://github.com/ThishanTharuka/fpl-auction-hub/commit/e00c7f755a49d0c8633ccae1a74da578d5f76cd0))
* add loading and error handling for player images and crests in PlayerStatsBar and PlayersPage ([34febf1](https://github.com/ThishanTharuka/fpl-auction-hub/commit/34febf16a2359d23f03e1910418ff6528b60faf8))
* enhance LeagueSettingsPanel with mobile open state management and integrate with AuctionLobbyPage ([b4a513a](https://github.com/ThishanTharuka/fpl-auction-hub/commit/b4a513a79060e113b7fb77f57cb2ecb99c624649))
* enhance loading state with skeleton screens in AuctionLobbyPage and AuctionBrowsePage ([c6ce5ec](https://github.com/ThishanTharuka/fpl-auction-hub/commit/c6ce5ec1049a7601e107b2f89c1aebecf08ac735))
* enhance TeamsPage with formation management and player position updates ([f709061](https://github.com/ThishanTharuka/fpl-auction-hub/commit/f709061b8dc8b83c644634e30b114e1fab606b6b))
* implement league settings panel and integrate with auction lobby ([eac9568](https://github.com/ThishanTharuka/fpl-auction-hub/commit/eac956880e62a70564d8da115c7f79923cb153d2))

## [1.2.2](https://github.com/ThishanTharuka/fpl-auction-hub/compare/v1.2.1...v1.2.2) (2026-06-03)

### Bug Fixes

* add initial changelog for version 0.1.0 ([a7d0a3b](https://github.com/ThishanTharuka/fpl-auction-hub/commit/a7d0a3be1c84bf85004c7b64128b6a2319fd3092))
