# Changelog

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
