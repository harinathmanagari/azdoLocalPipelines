# Slim stand-in for the Microsoft-hosted ubuntu-* agents.
#
# The hosted images are virtual machines with hundreds of preinstalled tools and are
# not published as containers. This image has only what most pipelines assume is
# there: git, curl, Node.js, Python, PowerShell and the Docker CLI. A pipeline that
# installs its own tools (UseNode@1 and friends) behaves the same on both.
# To use a fuller image instead, map the pool label under `images:` in .azp-local.yml.
ARG UBUNTU_VERSION=24.04
FROM ubuntu:${UBUNTU_VERSION}

ARG NODE_MAJOR=22
ARG INSTALL_POWERSHELL=true
ARG INSTALL_DOCKER_CLI=true

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    POWERSHELL_TELEMETRY_OPTOUT=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl wget git gnupg jq unzip zip xz-utils sudo file rsync openssh-client \
      python3 python3-pip python3-venv \
 && ln -sf /usr/bin/python3 /usr/local/bin/python \
 && rm -rf /var/lib/apt/lists/*

# Node.js: the newest release of the chosen major line. UseNode@1 can select another.
RUN set -eu; \
    case "$(dpkg --print-architecture)" in amd64) arch=x64 ;; arm64) arch=arm64 ;; *) echo "Unsupported architecture" >&2; exit 1 ;; esac; \
    base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"; \
    file="$(curl -fsSL "$base/SHASUMS256.txt" | grep -o "node-v[0-9.]*-linux-${arch}\.tar\.xz" | head -n 1)"; \
    curl -fsSL "$base/$file" -o /tmp/node.tar.xz; \
    curl -fsSL "$base/SHASUMS256.txt" | grep " $file\$" | sed "s| $file| /tmp/node.tar.xz|" | sha256sum -c -; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1; \
    rm /tmp/node.tar.xz; \
    node --version; npm --version

# PowerShell, from Microsoft's package feed. Not fatal when the feed has no build for this architecture.
RUN if [ "$INSTALL_POWERSHELL" = "true" ]; then \
      ( . /etc/os-release \
        && curl -fsSL "https://packages.microsoft.com/config/ubuntu/${VERSION_ID}/packages-microsoft-prod.deb" -o /tmp/ms.deb \
        && dpkg -i /tmp/ms.deb && rm /tmp/ms.deb \
        && apt-get update && apt-get install -y --no-install-recommends powershell \
        && rm -rf /var/lib/apt/lists/* \
        && pwsh -NoLogo -Command '$PSVersionTable.PSVersion.ToString()' ) \
      || echo "WARNING: PowerShell was not installed; pwsh steps will fail in this image."; \
    fi

# Docker CLI only. It is useful when the Docker socket is enabled for the workspace (off by default).
RUN if [ "$INSTALL_DOCKER_CLI" = "true" ]; then \
      ( install -m 0755 -d /etc/apt/keyrings \
        && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
        && . /etc/os-release \
        && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list \
        && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli \
        && rm -rf /var/lib/apt/lists/* ) \
      || echo "WARNING: The Docker CLI was not installed."; \
    fi

LABEL org.opencontainers.image.title="azp-local agent (ubuntu)" \
      org.opencontainers.image.description="Local stand-in for the Microsoft-hosted ubuntu agent image"
