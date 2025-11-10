# Changelog

## [1.5.0](https://github.com/s-stefanov/actual-mcp/compare/v1.4.0...v1.5.0) (2025-11-10)


### Features

* Add streamable HTTP transport for Codex (Trigger Release) ([#54](https://github.com/s-stefanov/actual-mcp/issues/54)) ([ec23551](https://github.com/s-stefanov/actual-mcp/commit/ec235517ad3a1d205fc31e02bbcd0800cb9b92ef))


### Bug Fixes

* correct repo url in README.md ([#42](https://github.com/s-stefanov/actual-mcp/issues/42)) ([41b4070](https://github.com/s-stefanov/actual-mcp/commit/41b4070e4c44394a15b15947a3b799de0d7e8ef4))

## [1.4.0](https://github.com/s-stefanov/actual-mcp/compare/v1.3.0...v1.4.0) (2025-10-18)


### Features

* Enhance transaction handling with enriched data and improved input parsing ([#39](https://github.com/s-stefanov/actual-mcp/issues/39)) ([74f1270](https://github.com/s-stefanov/actual-mcp/commit/74f12709ee9efef7840dec15bd1c1424cb09f5f2))
* Fix monthly summary with transfers calculations ([#41](https://github.com/s-stefanov/actual-mcp/issues/41)) ([af59c41](https://github.com/s-stefanov/actual-mcp/commit/af59c41d43ea3e85b10e475becc3f62273e8ebd0))

## [1.3.0](https://github.com/s-stefanov/actual-mcp/compare/v1.2.2...v1.3.0) (2025-10-09)


### Features

* Connect to actual budget server that has different encryption key ([#33](https://github.com/s-stefanov/actual-mcp/issues/33)) ([f828ad4](https://github.com/s-stefanov/actual-mcp/commit/f828ad4f56e73416ec82f5c55efd98bea315c196)), closes [#28](https://github.com/s-stefanov/actual-mcp/issues/28)
* Return id in get-transactions ([#34](https://github.com/s-stefanov/actual-mcp/issues/34)) ([e15bb33](https://github.com/s-stefanov/actual-mcp/commit/e15bb33866106954a904f9ce1ebccf76983c95ea)), closes [#32](https://github.com/s-stefanov/actual-mcp/issues/32)
* Update Actual to 25.10.0 ([#35](https://github.com/s-stefanov/actual-mcp/issues/35)) ([1bd89ea](https://github.com/s-stefanov/actual-mcp/commit/1bd89ea4dd3fb72e8641f8eff018f41b3d8db6a7))

## [1.2.2](https://github.com/s-stefanov/actual-mcp/compare/v1.2.1...v1.2.2) (2025-10-08)


### Bug Fixes

* docker publish to proper username ([#29](https://github.com/s-stefanov/actual-mcp/issues/29)) ([fa15085](https://github.com/s-stefanov/actual-mcp/commit/fa150857d528c730b5f6ad20a33ede230e886635))

## [1.2.1](https://github.com/s-stefanov/actual-mcp/compare/v1.2.0...v1.2.1) (2025-10-06)


### Bug Fixes

* use valid JSON Schema 2020-12 for rule value types ([#26](https://github.com/s-stefanov/actual-mcp/issues/26)) ([6ee4c7e](https://github.com/s-stefanov/actual-mcp/commit/6ee4c7e4c72e3b341a0acc261ffe231781acdbdf))

## [1.2.0](https://github.com/s-stefanov/actual-mcp/compare/v1.1.0...v1.2.0) (2025-09-05)


### Features

* New tools for categories, payees, and rules ([#18](https://github.com/s-stefanov/actual-mcp/issues/18)) ([fa9bbd2](https://github.com/s-stefanov/actual-mcp/commit/fa9bbd2752e2a04ef5cc82e752100f02b0af63f3))

## [1.1.0](https://github.com/s-stefanov/actual-mcp/compare/v1.0.2...v1.1.0) (2025-07-26)


### Features

* Add Vitest unit testing framework for src/core module ([#14](https://github.com/s-stefanov/actual-mcp/issues/14)) ([80d3d80](https://github.com/s-stefanov/actual-mcp/commit/80d3d8028fec938ed06f03b60b234be19b3881d1))
* create PR checks ([#16](https://github.com/s-stefanov/actual-mcp/issues/16)) ([b60ea97](https://github.com/s-stefanov/actual-mcp/commit/b60ea973ddffc9b93a32679beb61d616decb0455))
* ESLint Introduction. Typings and fixes ([#15](https://github.com/s-stefanov/actual-mcp/issues/15)) ([8f33ad8](https://github.com/s-stefanov/actual-mcp/commit/8f33ad88c91ab3636fa95a53337cc8cc952a5773))


### Bug Fixes

* update actual version to latest ([f4b18e1](https://github.com/s-stefanov/actual-mcp/commit/f4b18e13329bbf78ef498e1e200ea51dae3f9d88))
* update response type of accounts tool. test return is correct ([3dbe79a](https://github.com/s-stefanov/actual-mcp/commit/3dbe79a665a26acea6133812f36bf8a41ac60eae))

## [1.0.2](https://github.com/s-stefanov/actual-mcp/compare/v1.0.1...v1.0.2) (2025-07-02)


### Bug Fixes

* deployment steps ([66a0311](https://github.com/s-stefanov/actual-mcp/commit/66a0311dccfa8f1cdb47052c74e21f070c0e7863))

## [1.0.1](https://github.com/s-stefanov/actual-mcp/compare/v1.0.0...v1.0.1) (2025-07-01)


### Bug Fixes

* deployment ([1c57a9d](https://github.com/s-stefanov/actual-mcp/commit/1c57a9d980bbf5724121763372a30a202e961273))

## 1.0.0 (2025-07-01)


### Features

* get accounts tool ([#6](https://github.com/s-stefanov/actual-mcp/issues/6)) ([9008dbe](https://github.com/s-stefanov/actual-mcp/commit/9008dbe8a94e83b822f28a1c0190f281882b7fcc))
* github pipelines ([#9](https://github.com/s-stefanov/actual-mcp/issues/9)) ([e9ae9ff](https://github.com/s-stefanov/actual-mcp/commit/e9ae9ff2a53c19ba9065804c64fb257bfbc3a8f7))
* Refactoring of tools & types ([#5](https://github.com/s-stefanov/actual-mcp/issues/5)) ([af9d185](https://github.com/s-stefanov/actual-mcp/commit/af9d1850ca76315185f36331f758597f510a4528))


### Bug Fixes

* docker run with pre-compiled binaries ([#4](https://github.com/s-stefanov/actual-mcp/issues/4)) ([2171a0f](https://github.com/s-stefanov/actual-mcp/commit/2171a0f5ccb2cd1ecc29affb86fb9ae6e3710200))
