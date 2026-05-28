# Solune Hermes Runtime Image
#
# Based on the upstream hermes-webui single-container image (single-process mode
# runs both the WebUI server and the Hermes Agent in-process — avoids the
# tool-execution boundary issues seen with multi-container setups, ref upstream #681).
#
# We pin the upstream version and push to our own ECR registry so provisioning
# is deterministic. To update: bump HERMES_WEBUI_VERSION, rebuild, push.
#
# Build:
#   docker build --build-arg HERMES_WEBUI_VERSION=v0.51.150 -t solune/hermes-runtime:v0.51.150 .
#
# Push to ECR:
#   docker tag solune/hermes-runtime:v0.51.150 ${ECR_REGISTRY}/solune/hermes-runtime:v0.51.150
#   docker push ${ECR_REGISTRY}/solune/hermes-runtime:v0.51.150

ARG HERMES_WEBUI_VERSION=0.51.150
FROM ghcr.io/nesquena/hermes-webui:${HERMES_WEBUI_VERSION}

LABEL solune.component="hermes-runtime"
LABEL solune.base-image="ghcr.io/nesquena/hermes-webui"

# Bind all interfaces — security group enforces access (Solune ingress only).
# HERMES_WEBUI_PASSWORD must be injected at runtime via docker-compose env.
ENV HERMES_WEBUI_HOST=0.0.0.0
ENV HERMES_WEBUI_PORT=8787

EXPOSE 8787
