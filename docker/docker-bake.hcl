# Every pong image build uses this file. `pnpm build:docker` and CI both drive
# these targets, so a pin changed here changes both.

# Node pins. The Dockerfiles have no defaults for these, so this block is the
# only place to change them. To move to a new Node version:
#   1. Change NODE_VERSION, the DHI refs and the builder images.
#   2. Publish the bases: dispatch build-base-image.yml with push enabled.
#   3. Change the runtime images to the digests that step 2 published.
# The podman path of scripts/dockerize-pong.mjs reads these defaults as text.
# Keep each default a plain string.
variable "NODE_VERSION" { default = "26.13.0" }

variable "DHI_REF" {
  default = "dhi.io/node:26.13.0-alpine3.24-dev@sha256:3e61a81f5d83780aff01cb2d8f2251698bf3fe7d522bef71a9656fa93333b504"
}
variable "BUILDER_IMAGE" {
  default = "node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216"
}
variable "RUNTIME_IMAGE" {
  default = "pongio/base:26.13.0@sha256:f4db5ffdbde188b568911640907797830033f2af2eb06b700a2c252bde960695"
}

variable "DEBIAN_DHI_REF" {
  default = "dhi.io/node:26.13.0-debian13-dev@sha256:6c7e2d41ac2cad140e61f765740708f5ab19ac3e734b3d56e029923cb11be4fd"
}
variable "DEBIAN_BUILDER_IMAGE" {
  default = "node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072"
}
variable "DEBIAN_RUNTIME_IMAGE" {
  default = "pongio/base:26.13.0-debian@sha256:e21d4b26ba8bf56e9fed9e459fd347e9a030bda9dc0a0b82bed03c2e836fe52a"
}

# build-node-pc-image.yml publishes these.
variable "PC_BUILDER_IMAGE" {
  default = "pongio/node-pc:26.13.0-dev@sha256:05a717732c5499d22e39221e3e34f348a310bb03b3864a46a06ed7a7fad42cfc"
}
variable "PC_RUNTIME_IMAGE" {
  default = "pongio/node-pc:26.13.0@sha256:04d0ff20910be5ceb7cc78010318f4197e120d8806ef6e93162691ea1c70813d"
}

variable "PONG_VERSION" { default = "snapshot" }
variable "PONG_RELEASE_TYPE" { default = "dev" }

variable "IMAGE_BASE_NAME" { default = "pongio/pong" }
variable "IMAGE_TAG" { default = "local" }
variable "RUNNERS_IMAGE_BASE_NAME" { default = "pongio/runners" }

variable "PONG_TAGS" { default = "" }
variable "PONG_PC_TAGS" { default = "" }
variable "PONG_DEBIAN_TAGS" { default = "" }
variable "RUNNERS_TAGS" { default = "" }
variable "RUNNERS_DISTROLESS_TAGS" { default = "" }
variable "RUNNERS_DEBIAN_TAGS" { default = "" }
variable "BASE_TAGS" { default = "" }
variable "BASE_DEBIAN_TAGS" { default = "" }

variable "PLATFORMS" { default = "" }

function "tags" {
  params = [override, fallback]
  result = override != "" ? split(",", override) : [fallback]
}

target "_context" {
  context = "."
  # BAKE_LOCAL_PLATFORM gives the host platform. On macOS it reads
  # `darwin/arm64/v8`. These images are linux, so use the architecture only.
  platforms = PLATFORMS != "" ? split(",", PLATFORMS) : ["linux/${split("/", BAKE_LOCAL_PLATFORM)[1]}"]
}

target "_app" {
  inherits = ["_context"]
  args = {
    NODE_VERSION     = NODE_VERSION
    PONG_VERSION      = PONG_VERSION
    PONG_RELEASE_TYPE = PONG_RELEASE_TYPE
  }
}

target "pong" {
  inherits   = ["_app"]
  dockerfile = "docker/images/pong/Dockerfile"
  tags       = tags(PONG_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}")
  args = {
    BUILDER_IMAGE = BUILDER_IMAGE
    RUNTIME_IMAGE = RUNTIME_IMAGE
  }
}

target "pong-pc" {
  inherits = ["pong"]
  tags     = tags(PONG_PC_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}-pc")
  args = {
    BUILDER_IMAGE     = PC_BUILDER_IMAGE
    RUNTIME_IMAGE     = PC_RUNTIME_IMAGE
    IMAGE_DESCRIPTION = "Workflow Automation Tool (pointer-compressed variant, internal to pong Cloud, no support or stability guarantees)"
  }
}

target "pong-debian" {
  inherits   = ["_app"]
  dockerfile = "docker/images/pong/Dockerfile.debian"
  tags       = tags(PONG_DEBIAN_TAGS, "${IMAGE_BASE_NAME}:${IMAGE_TAG}-debian")
  args = {
    BUILDER_IMAGE = DEBIAN_BUILDER_IMAGE
    RUNTIME_IMAGE = DEBIAN_RUNTIME_IMAGE
  }
}

target "runners" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile"
  tags       = tags(RUNNERS_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}")
  args       = { NODE_IMAGE = BUILDER_IMAGE }
}

target "runners-debian" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile.debian"
  tags       = tags(RUNNERS_DEBIAN_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}-debian")
  args = {
    BUILDER_IMAGE = DEBIAN_BUILDER_IMAGE
    RUNTIME_IMAGE = DEBIAN_RUNTIME_IMAGE
  }
}

target "runners-distroless" {
  inherits   = ["_app"]
  dockerfile = "docker/images/runners/Dockerfile.distroless"
  tags       = tags(RUNNERS_DISTROLESS_TAGS, "${RUNNERS_IMAGE_BASE_NAME}:${IMAGE_TAG}-distroless")
}

target "base" {
  inherits   = ["_context"]
  dockerfile = "docker/images/pong-base/Dockerfile"
  args       = { DHI_REF = DHI_REF }
  tags       = tags(BASE_TAGS, "pongio/base:${NODE_VERSION}")
}

target "base-debian" {
  inherits   = ["_context"]
  dockerfile = "docker/images/pong-base/Dockerfile.debian"
  args       = { DHI_REF = DEBIAN_DHI_REF }
  tags       = tags(BASE_DEBIAN_TAGS, "pongio/base:${NODE_VERSION}-debian")
}

group "default" { targets = ["pong", "runners"] }
group "distroless" { targets = ["pong", "runners", "runners-distroless"] }
group "all" { targets = ["base", "pong", "runners", "runners-distroless"] }
group "release" { targets = ["pong", "pong-pc", "pong-debian", "runners", "runners-distroless", "runners-debian"] }
